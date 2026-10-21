import type {Ir} from '../audit/ir';
import type {Finding} from '../audit/model';
import type {CrossTableRef} from './cross-table';

const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
type Metric='propriedade'|'verticalização'|'renda';
interface Fact {metric:Metric; scope:string; value:number; slide:number; evidence:string; sha?:string; year:string}
function metric(s:string):Metric|null {
  const t=norm(s);
  if(/propriedade|^propri[oa]s?$/.test(t))return 'propriedade';
  if(/verticalizacao|^apartamentos?$/.test(t))return 'verticalização';
  if(/renda.*(?:media|domiciliar)|renda media/.test(t))return 'renda';
  return null;
}
function scope(s:string):string|null {
  const t=norm(s);
  // Nunca igualar anel a acumulado ou comparar duas zonas só pela distância final.
  if(/\b(?:de|entre)\s*\d/.test(t))return null;
  const hits=[...t.matchAll(/(?:ate\s*)?(\d+(?:[.,]\d+)?)\s*km\b/g)];
  if(hits.length===1)return `até ${hits[0][1].replace(',','.')} km`;
  return null;
}
function value(s:string):number|null {
  const matches=[...s.matchAll(/(?:R\$\s*([\d.]+(?:,\d+)?))|([\d.]+(?:,\d+)?)\s*%/g)];
  if(matches.length!==1)return null;
  const x=Number((matches[0][1]??matches[0][2]).replace(/\./g,'').replace(',','.'));
  return Number.isFinite(x)?x:null;
}
function facts(ir:Ir,refs:CrossTableRef[]):Fact[] {
  const out:Fact[]=[];
  for(const s of ir.slides) {
    const m=metric(s.titulo??'');if(!m)continue;
    const years=[...new Set((`${s.titulo ?? ''} ${s.textos.join(' ')}`.match(/\b20\d{2}\b/g)??[]))];
    for(const text of s.textos) {
      const sc=scope(text),v=value(text);
      if(sc&&v!==null)out.push({metric:m,scope:sc,value:v,slide:s.n,evidence:text,year:years.length===1?years[0]:''});
    }
  }
  for(const r of refs) {
    if(r.unstable)continue;
    const years=[...new Set((`${r.titulo} ${r.table.title}`.match(/\b20\d{2}\b/g)??[]))];
    for(const row of r.table.rows) {
      const m=metric(String(row[0]??''));if(!m)continue;
      r.table.columns.forEach((col,i)=>{
        const sc=scope(col),v=row[i];
        // Percentual de propriedade/verticalização não é contagem absoluta.
        if(m!=='renda' && (r.table.colKinds?.[i]!=='share' && !/%|percentual|participacao/.test(norm(col)) || /absolut/.test(norm(col))))return;
        if(m==='renda' && r.table.colKinds?.[i]==='count')return;
        if(sc&&typeof v==='number'&&Number.isFinite(v))out.push({metric:m,scope:sc,value:v,slide:r.slide,evidence:`${row[0]} · ${col}: ${v}`,year:years.length===1?years[0]:'',sha:r.source==='vision'?r.sha1:undefined});
      });
    }
  }
  return out;
}

/** Cruzamentos conservadores com as evidências já disponíveis. Nenhuma inferência de verdade. */
export function semanticReviewFindings(ir:Ir,refs:CrossTableRef[]):Finding[] {
  const out:Finding[]=[],fs=facts(ir,refs),seen=new Set<string>();
  for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++) {
    const a=fs[i],b=fs[j];
    if(a.slide===b.slide||a.metric!==b.metric||a.scope!==b.scope||a.year&&b.year&&a.year!==b.year)continue;
    const tolerance=a.metric==='renda'?1:0.15;
    if(Math.abs(a.value-b.value)<=tolerance)continue;
    const id=`semantic-${a.metric}-${a.scope}-${Math.min(a.slide,b.slide)}-${Math.max(a.slide,b.slide)}`;
    if(seen.has(id))continue;seen.add(id);
    out.push({id,type:'COHERENCE',section:'SOCIO',slideRef:`s${a.slide} × s${b.slide}`,ok:false,confidence:3,origem:a.sha||b.sha?'IA_visao':'DET',evidenceSha1:a.sha??b.sha,
      title:`Valores de ${a.metric} diferentes entre páginas`,
      detail:`${a.scope}: s${a.slide} informa ${a.value.toLocaleString('pt-BR')} e s${b.slide} informa ${b.value.toLocaleString('pt-BR')}. Confira se indicador, período e denominador são os mesmos antes de corrigir.`,
      viz:{kind:'sidebyside',leftLabel:`s${a.slide} · ${a.evidence}`,rightLabel:`s${b.slide} · ${b.evidence}`,rows:[{label:`${a.metric} · ${a.scope}`,left:a.value,right:b.value,mismatch:true}]}});
  }
  for(const s of ir.slides) {
    if(!/domicilio/.test(norm(s.titulo??'')))continue;
    for(const t of s.textos.filter(t=>/\d[\d.,]*\s*hab\./i.test(t))) {
      out.push({id:`semantic-unit-${s.n}`,type:'COHERENCE',section:'SOCIO',slideRef:`s${s.n}`,title:'Unidade de habitantes em página de domicílios',
        detail:'O título trata de domicílios, mas este trecho usa “hab.”. Confira o indicador e a unidade na fonte; o valor não foi corrigido automaticamente.',ok:false,confidence:3,origem:'DET',viz:{kind:'text',evidence:t}});break;
    }
  }
  return out;
}

/** Categorias explicitamente visíveis em outro bloco da MESMA imagem, sem fabricar números. */
export function categoryCoverageFindings(refs:CrossTableRef[]):{findings:Finding[]; replacedSumIds:Set<string>} {
  const findings:Finding[]=[],replacedSumIds=new Set<string>();
  for(const ref of refs) {
    if(ref.source!=='vision'||ref.unstable||!ref.table.totals||!/vaga|garag/.test(norm(`${ref.titulo} ${ref.table.title}`)))continue;
    const own=new Set(ref.table.rows.map(r=>norm(String(r[0]??''))));
    const peers=refs.filter(r=>r!==ref&&r.source==='vision'&&r.sha1===ref.sha1&&!r.unstable);
    const missing=[...new Set(peers.flatMap(r=>r.table.rows.map(row=>String(row[0]??''))).filter(label=>/rotativ/.test(norm(label))&&!own.has(norm(label))))];
    if(!missing.length)continue;
    const differences=ref.table.columns.flatMap((c,i)=>{
      if(ref.table.colKinds?.[i]!=='count')return [];
      const total=ref.table.totals?.[i],values=ref.table.rows.map(r=>r[i]);
      if(typeof total!=='number'||!values.every(x=>typeof x==='number'))return [];
      const residual=total-(values as number[]).reduce((a,b)=>a+b,0);
      return residual>0?[`${c}: ${residual.toLocaleString('pt-BR')} fora das linhas visíveis`]:[];
    });
    if(!differences.length)continue;
    if(ref.sumFindingId)replacedSumIds.add(ref.sumFindingId);
    findings.push({id:`category-coverage-${ref.slide}-${ref.table.title}`,type:'COHERENCE',section:'LACUNAS',slideRef:`s${ref.slide}`,title:'Categoria presente em outro bloco e ausente nas contagens',
      detail:`“${missing.join('”, “')}” aparece em outro bloco da mesma imagem, mas não nas linhas de “${ref.table.title}”. ${differences.join('; ')}. Confira a categoria omitida; não se atribuiu o resíduo automaticamente.`,ok:false,confidence:3,origem:'IA_visao',evidenceSha1:ref.sha1,viz:{kind:'table',table:ref.table}});
  }
  return {findings,replacedSumIds};
}
