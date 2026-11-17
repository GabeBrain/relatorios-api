// Mount inside the existing Empresas/Empregados proxy; reuse its HMAC and BQ transport.
export const CAGED_VERSION = 'mte-caged-v1';
export const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO NI BR'.split(' ');
export const SECTORS = ['total','construction','agriculture','services','commerce','manufacturing','other'];
export function parseCagedRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(key=>!['end','version'].includes(key)) || payload.version!==CAGED_VERSION || typeof payload.end!=='string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(payload.end) || payload.end<'2020-01' || payload.end>'2100-12') return null;
  return {end:payload.end};
}
export function cagedSql(table) {
  if (!/^[a-z][a-z0-9-]+\.[a-zA-Z_]\w*\.caged_mte_snapshots$/.test(table??'')) throw new Error('caged_not_configured');
  return `WITH chosen AS (
    SELECT snapshot_version, published_through, coverage_start, loaded_at
    FROM \`${table}\` WHERE query_version = 'mte-caged-v1'
    ORDER BY published_through DESC, loaded_at DESC, snapshot_version DESC LIMIT 1
  ), periods AS (
    SELECT CAST(y AS STRING) period, DATE(y,1,1) start_date,
      IF(y=EXTRACT(YEAR FROM @end_date), @end_date, DATE(y,12,1)) end_date
    FROM UNNEST(GENERATE_ARRAY(EXTRACT(YEAR FROM @end_date)-9,EXTRACT(YEAR FROM @end_date))) y
    UNION ALL SELECT FORMAT_DATE('%Y-%m', @end_date), @end_date, @end_date
    UNION ALL SELECT FORMAT_DATE('%Y-%m', DATE_SUB(@end_date,INTERVAL 1 YEAR)), DATE_SUB(@end_date,INTERVAL 1 YEAR), DATE_SUB(@end_date,INTERVAL 1 YEAR)
  )
  SELECT c.snapshot_version, CAST(c.published_through AS STRING) published_through,
    CAST(c.coverage_start AS STRING) coverage_start, CAST(c.loaded_at AS STRING) loaded_at,
    p.period, d.uf, d.sector, SUM(d.balance) balance, COUNT(DISTINCT d.month) months_observed,
    DATE_DIFF(p.end_date,p.start_date,MONTH)+1 months_required
  FROM chosen c CROSS JOIN periods p JOIN \`${table}\` d ON d.snapshot_version=c.snapshot_version
    AND d.query_version='mte-caged-v1' AND d.month BETWEEN p.start_date AND p.end_date
  GROUP BY 1,2,3,4,5,6,7,10`;
}
export function normalizeCaged(rows, end) {
  if (!Array.isArray(rows) || !rows.length || rows.length>2500) throw new Error('caged_empty');
  const first=rows[0], version=first.snapshot_version, through=String(first.published_through??'').slice(0,7), start=String(first.coverage_start??'').slice(0,7);
  if (!/^[a-f0-9]{64}$/.test(version??'') || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(through) || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(start) || start>through) throw new Error('caged_contract');
  const expected=Array.from({length:10},(_,i)=>String(Number(end.slice(0,4))-9+i)).concat([`${Number(end.slice(0,4))-1}${end.slice(4)}`,end]);
  const seen=new Set(), result=[];
  for (const r of rows) {
    const key=`${r.period}/${r.uf}/${r.sector}`, balance=Number(r.balance), observed=Number(r.months_observed), required=Number(r.months_required);
    const expectedMonths=r.period.includes('-')?1:r.period===end.slice(0,4)?Number(end.slice(5)):12;
    if (r.snapshot_version!==version || r.published_through!==first.published_through || r.coverage_start!==first.coverage_start || !expected.includes(r.period) || !UFS.includes(r.uf) || !SECTORS.includes(r.sector) || r.balance===null || r.balance==='' || !Number.isSafeInteger(balance) || !Number.isInteger(observed) || observed<1 || observed>required || required!==expectedMonths || seen.has(key)) throw new Error('caged_contract');
    if(observed===required){seen.add(key); result.push({period:r.period,uf:r.uf,sector:r.sector,balance});}
  }
  const completePeriods=expected.filter(period=>UFS.every(uf=>SECTORS.every(sector=>seen.has(`${period}/${uf}/${sector}`))));
  // Remove partial periods as a whole. Never sum incomplete months or UF grids.
  const completeRows=result.filter(row=>completePeriods.includes(row.period));
  return {version:CAGED_VERSION,end,snapshotVersion:version,publishedThrough:through,coverageStart:start,completePeriods,
    rows:completeRows,source:'MTE · CAGED antigo / Novo Caged · com ajustes',loadedAt:String(first.loaded_at)};
}
export function createCagedHandler({verifySignature,hmacSecret,query,table,nowMs=Date.now}) {
  const cache=new Map(); let inFlight=0;
  return async function handle(request,response) {
    if (new URL(request.url,'http://localhost').pathname!=='/v1/caged-mte') return false;
    const reply=(status,data)=>{response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(data));return true;};
    if (request.method!=='POST') return reply(405,{error:'method_not_allowed'});
    let body='';for await(const chunk of request){body+=chunk;if(Buffer.byteLength(body)>2048)return reply(413,{error:'body_too_large'});}
    const check=verifySignature({secret:hmacSecret,timestamp:request.headers['x-quanti-timestamp'],signature:request.headers['x-quanti-signature'],body,now:nowMs()});
    if(!check.ok)return reply(check.reason==='not_configured'?503:401,{error:check.reason});
    let scope;try{scope=parseCagedRequest(JSON.parse(body));}catch{return reply(400,{error:'invalid_caged_request'});}
    if(!scope)return reply(400,{error:'invalid_caged_request'});
    const previous=cache.get(scope.end);
    // Cache is bounded and expires, so new immutable source versions become visible.
    if(previous&&previous.until>nowMs())return reply(200,{report:previous.report});
    if(inFlight>=2)return reply(429,{error:'caged_busy'});
    inFlight++;
    try {
      const result=await query(cagedSql(table),[{name:'end_date',type:'DATE',value:`${scope.end}-01`}]);
      const report=normalizeCaged(result.rows,scope.end);
      if(cache.size>=24)cache.delete(cache.keys().next().value);
      cache.set(scope.end,{until:nowMs()+15*60*1000,report});
      return reply(200,{report});
    }catch{return reply(502,{error:'caged_unavailable'});}finally{inFlight--;}
  };
}
