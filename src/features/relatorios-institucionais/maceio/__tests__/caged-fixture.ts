import {CAGED_UFS,CAGED_SECTORS,CAGED_VERSION,cagedPeriods,type CagedReport,type CagedRow} from '../caged';
export function cagedFixture(end='2026-05',coverageStart='2017-01',stress=false):CagedReport {
  const rows:CagedRow[]=[],completePeriods=cagedPeriods(end).filter(p=>p.slice(0,4)>=coverageStart.slice(0,4));
  for(const period of completePeriods){
    const sums=new Map<string,number>();
    CAGED_UFS.filter(uf=>uf!=='BR').forEach((uf,i)=>{
      let total=0;CAGED_SECTORS.filter(s=>s!=='total').forEach((sector,k)=>{
        const scale=stress?(period.length===4?500+(Number(period.slice(0,4))-2017)*50:20+(Number(period.slice(0,4))-2025)*5):1;
        const balance=(uf==='AL'&&sector==='construction'?-10:stress&&uf==='AL'&&sector==='manufacturing'&&period==='2026'?-300:i+k+1)*scale;
        total+=balance;sums.set(sector,(sums.get(sector)??0)+balance);rows.push({period,uf,sector,balance});
      });rows.push({period,uf,sector:'total',balance:total});
    });
    for(const sector of CAGED_SECTORS)rows.push({period,uf:'BR',sector,balance:sector==='total'?[...sums.values()].reduce((a,b)=>a+b,0):sums.get(sector)!});
  }
  return {version:CAGED_VERSION,end,snapshotVersion:'a'.repeat(64),publishedThrough:'2026-09',coverageStart,loadedAt:'2026-11-17T12:00:00Z',source:'MTE · CAGED antigo / Novo Caged · com ajustes',completePeriods,rows};
}
