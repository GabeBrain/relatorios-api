// Corretor v0.67 — raios acumulados (“Até 1 km ⊂ Até 2 km ⊂ Até 3 km”) contêm uns
// aos outros: um valor ABSOLUTO não pode diminuir quando o raio cresce. Em
// Rolândia (out/2026) a planilha de condição de ocupação tinha 4.924 alugados em
// 2 km e 4.833 em 3 km, e o slide repetiu — soma e fonte batiam, o erro passava.

import type { Finding } from '../audit/model';
import type { CrossTableRef } from './cross-table';
import type { Fonte } from './fonte';

const RADIUS_RX = /at[ée]\s*(\d+(?:[.,]\d+)?)\s*km/i;
// Recorte em anel (“de 1 a 2 km”, “1–2 km”) não é acumulado: fica fora.
const RING_RX = /\bde\s*\d+(?:[.,]\d+)?\s*(?:km)?\s*(?:a|at[ée]|-|–)\s*\d/i;
// Abaixo disso, arredondamento da projeção pesa mais que a geometria.
const MIN_BASE = 10;
const TOLERANCE = 0.01;

interface Violation { rotulo: string; inner: string; outer: string; innerValue: number; outerValue: number }

const sectionOf = (secao: string | null | undefined): Finding['section'] => {
  const s = (secao ?? '').toUpperCase();
  return (['SOCIO', 'MERCADO', 'LACUNAS', 'ABSORCAO'].includes(s) ? s : 'GLOBAL') as Finding['section'];
};
const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');
const km = (label: string) => Number(RADIUS_RX.exec(label)![1].replace(',', '.'));

function firstViolation(rotulo: string, series: { label: string; value: number }[]): Violation | null {
  const sorted = [...series].sort((a, b) => km(a.label) - km(b.label));
  for (let i = 1; i < sorted.length; i++) {
    const inner = sorted[i - 1], outer = sorted[i];
    if (km(inner.label) === km(outer.label) || inner.value < MIN_BASE) continue;
    if (outer.value < inner.value * (1 - TOLERANCE)) {
      return { rotulo, inner: inner.label, outer: outer.label, innerValue: inner.value, outerValue: outer.value };
    }
  }
  return null;
}

const describe = (v: Violation) =>
  `«${v.rotulo}»: ${v.outer.trim()} tem ${fmt(v.outerValue)}, menos que os ${fmt(v.innerValue)} de ${v.inner.trim()}`;

function tableViolation(ref: CrossTableRef): Violation | null {
  // Cabeçalho agrupado (“Até 2 km” sobre Absoluto + %) com linha de 11 valores:
  // o índice da coluna não aponta para o número certo — no CJ isso acusava 14 × 14.
  if (ref.table.rows.some((row) => row.length !== ref.table.columns.length)) return null;
  const cols = ref.table.columns.map((c, i) => ({ c: String(c ?? ''), i }))
    .filter(({ c, i }) => RADIUS_RX.test(c) && !RING_RX.test(c) && !c.includes('%') && [undefined, 'count'].includes(ref.table.colKinds?.[i]));
  if (new Set(cols.map(({ c }) => km(c))).size < 2) return null;
  for (const row of ref.table.rows) {
    // Só o trecho do raio: o cabeçalho pode vir “Absoluto | Até 1 km” ou “Até 1 km | Absoluto”.
    const series = cols.flatMap(({ c, i }) => (typeof row[i] === 'number' ? [{ label: RADIUS_RX.exec(c)![0], value: row[i] as number }] : []));
    const v = series.length >= 2 ? firstViolation(String(row[0] ?? ''), series) : null;
    if (v) return v;
  }
  return null;
}

function fonteViolations(fonte: Fonte): { bloco: Fonte['blocos'][number]; v: Violation }[] {
  const out: { bloco: Fonte['blocos'][number]; v: Violation }[] = [];
  for (const bloco of fonte.blocos ?? []) {
    for (const item of bloco.itens ?? []) {
      const series = Object.entries(item.recortes ?? {})
        .filter(([label]) => RADIUS_RX.test(label) && !RING_RX.test(label))
        .flatMap(([label, values]) => {
          const abs = Object.entries(values ?? {}).find(([k, n]) => !k.includes('%') && typeof n === 'number');
          return abs ? [{ label, value: abs[1] as number }] : [];
        });
      const v = series.length >= 2 ? firstViolation(item.rotulo ?? '', series) : null;
      if (v) { out.push({ bloco, v }); break; }
    }
  }
  return out;
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.005);

export function nestedRadiiFindings(refs: CrossTableRef[], fonte?: Fonte | null): Finding[] {
  const fromSource = fonte ? fonteViolations(fonte) : [];
  const usedSource = new Set<number>();
  const out: Finding[] = [];
  for (const ref of refs) {
    const v = tableViolation(ref);
    if (!v) continue;
    const same = fromSource.findIndex((s) => close(s.v.innerValue, v.innerValue) && close(s.v.outerValue, v.outerValue));
    if (same >= 0) usedSource.add(same);
    const origin = same >= 0 ? ` A planilha ${fromSource[same].bloco.arquivo} › ${fromSource[same].bloco.aba} tem os mesmos valores — o erro vem da fonte.` : '';
    out.push({
      id: `nested-radii-s${ref.slide}`,
      type: 'VALUE_PLAUSIBILITY',
      section: sectionOf(ref.secao),
      slideRef: `s${ref.slide}`,
      title: 'Raio maior com valor menor que o raio interno',
      detail: `${describe(v)}. Os raios são acumulados (um contém o outro), então o valor absoluto não pode diminuir.${origin}`,
      ok: false,
      confidence: 2,
      origem: ref.source === 'vision' ? 'IA_visao' : 'DET',
      evidenceSha1: ref.source === 'vision' ? ref.sha1 : undefined,
      viz: { kind: 'text', evidence: describe(v) },
    });
  }
  fromSource.forEach(({ bloco, v }, i) => {
    if (usedSource.has(i)) return;
    out.push({
      id: `nested-radii-fonte-${bloco.aba}-${i}`,
      type: 'VALUE_PLAUSIBILITY',
      section: 'GLOBAL',
      slideRef: '—',
      title: 'Planilha com raio maior menor que o raio interno',
      detail: `${bloco.arquivo} › ${bloco.aba}: ${describe(v)}. Os raios são acumulados, então o valor absoluto não pode diminuir — confira a extração da base antes de usar esses números.`,
      ok: false,
      confidence: 2,
      origem: 'DET',
      viz: { kind: 'text', evidence: describe(v) },
    });
  });
  return out;
}
