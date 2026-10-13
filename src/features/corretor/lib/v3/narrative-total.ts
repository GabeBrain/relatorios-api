import type { Ir } from '../audit/ir';
import type { Finding } from '../audit/model';
import type { CrossTableRef } from './cross-table';

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const integer = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 ? v : null;
  if (typeof v !== 'string' || !/^\s*\d+(?:\.\d{3})*\s*$/.test(v)) return null;
  return Number(v.replace(/\./g, '').trim());
};

/** Comparação dirigida: conclusão municipal de novos domicílios × projeção do mesmo slide. */
export function narrativeTotalFindings(ir: Ir, refs: CrossTableRef[]): Finding[] {
  const out: Finding[] = [];
  for (const slide of ir.slides) {
    const text = (slide.textos ?? []).join('\n');
    const matches = [...text.matchAll(/Até\s+(\d{4})\s+são\s+esperad[oa]s?\s+novos\s+([\d.]+)\s+domicílios\s+em\s+([^\n.!?]+)[.!?]?/gi)];
    for (const match of matches) {
      const year = Number(match[1]), declared = integer(match[2]);
      const city = norm(match[3].replace(/\s*[-–]\s*[A-Z]{2}\s*$/i, ''));
      if (!city || declared === null) continue;
      const candidates: Array<{ value: number; ref: CrossTableRef }> = [];
      for (const ref of refs.filter(r => r.slide === slide.n && (r.source === 'ir' || r.reliable))) {
        if (/populacao|habitantes/.test(norm(`${ref.titulo} ${ref.table.title}`))) continue;
        if (!/domicilios/.test(norm(`${slide.titulo ?? ''} ${ref.titulo} ${ref.table.title}`))) continue;
        const cityColumns = ref.table.columns.map((c,i) => norm(String(c)) === city ? i : -1).filter(i=>i>=0);
        if (cityColumns.length !== 1) continue;
        const yearColumn = ref.table.columns.findIndex(c => /^(ano|anos)$/.test(norm(String(c))));
        if (yearColumn < 0) continue;
        const rows = ref.table.rows.filter(row => /^\s*\d{4}\s*$|^\s*\d\.\d{3}\s*$/.test(String(row[yearColumn] ?? '')));
        const years = rows.map(row => integer(row[yearColumn]));
        if (years.length < 2 || years.at(-1) !== year || !years.every((y,i)=>y !== null && (!i || y === years[i-1]!+1))) continue;
        const totals = [...ref.table.rows, ...(ref.table.totals ? [ref.table.totals] : [])].filter(row => norm(String(row[yearColumn] ?? '')) === 'total');
        const values = [...new Set(totals.map(row=>integer(row[cityColumns[0]])).filter((v):v is number=>v!==null))];
        if (values.length === 1) candidates.push({value:values[0],ref});
      }
      const values = [...new Set(candidates.map(c=>c.value))];
      if (values.length !== 1 || Math.abs(values[0]-declared) <= 1) continue;
      const ref = candidates[0].ref;
      out.push({ id:`narrative-total-${slide.n}-${year}-${city}`, type:'COHERENCE', section:'SOCIO', slideRef:`s${slide.n}`,
        title:'Conclusão diverge do total de domicílios da tabela', detail:`${match[0]} — a tabela da mesma cidade e janela até ${year} informa ${values[0].toLocaleString('pt-BR')} novos domicílios, mas a conclusão cita ${declared.toLocaleString('pt-BR')}.`,
        ok:false, confidence:2, origem:'DET', evidenceSha1:ref.source === 'vision' ? ref.sha1 : undefined,
        viz:{kind:'sidebyside',leftLabel:'Conclusão',rightLabel:'Total municipal da tabela',rows:[{label:'Novos domicílios',left:declared,right:values[0],mismatch:true}]},
      });
    }
  }
  return [...new Map(out.map(f=>[f.id,f])).values()];
}
