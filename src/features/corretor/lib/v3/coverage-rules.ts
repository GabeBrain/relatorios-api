// WS3, WS7 e WS8 — presença/cobertura determinística. Esses checks não fazem
// nova IA: usam Ata, IR e tabelas que o passe de visão já trouxe do cache.

import type { Ir } from '../audit/ir';
import { toAuditSection } from '../audit/ir';
import type { Cell, Finding } from '../audit/model';
import type { AtaData } from './ia-ata';
import type { CrossTableRef } from './cross-table';

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const words = (s: string) => normalize(s).match(/[a-z]{4,}/g) ?? [];
const textOf = (ir: Ir) => ir.slides.map((s) => ({ n: s.n, section: toAuditSection(s.secao_canonica), text: normalize(`${s.titulo ?? ''}\n${(s.textos ?? []).join('\n')}`) }));
const num = (v: Cell): v is number => typeof v === 'number' && Number.isFinite(v);

/** WS3: checklist da Ata. Match exige ao menos duas palavras relevantes no mesmo slide. */
export function ataCoverageFindings(ir: Ir, ata: AtaData | null): Finding[] {
  if (!ata) return [];
  const items = [...(ata.pedidos_analista ?? []), ...(ata.duvidas_cliente ?? [])].filter(Boolean);
  if (ata.produto) items.push('Produto proposto');
  if (!items.length) return [];
  const slides = textOf(ir);
  const checklist = items.map((item) => {
    const keys = words(item).filter((word) => !['trazer', 'analise', 'cliente', 'necessario', 'possivel', 'qual'].includes(word));
    const hit = slides.find((slide) => keys.length > 0 && keys.filter((key) => slide.text.includes(key)).length >= Math.min(2, keys.length));
    return { label: item, status: hit ? 'ok' as const : 'missing' as const, slide: hit?.n };
  });
  // Produto proposto é uma regra canônica: título/seção explícita, não só número em tabela.
  const product = checklist.find((item) => item.label === 'Produto proposto');
  if (product) {
    const hit = slides.find((slide) => /produto\s+proposto|produto\s+pretendido/.test(slide.text));
    product.status = hit ? 'ok' : 'missing'; product.slide = hit?.n;
  }
  const missing = checklist.filter((item) => item.status === 'missing');
  return [{
    id: 'ata-coverage', type: 'ATA_COVERAGE', section: 'ATA', slideRef: 'ata',
    title: `Cobertura dos pedidos da ata (${items.length - missing.length}/${items.length})`,
    detail: missing.length ? `Conferir itens sem evidência textual: ${missing.map((m) => `“${m.label}”`).join('; ')}.` : 'Todos os pedidos da ata têm evidência textual no estudo.',
    ok: missing.length === 0,
    viz: { kind: 'text', checklist: checklist.map((item) => ({ label: item.slide ? `${item.label} (s${item.slide})` : item.label, status: item.status })) },
  }];
}

/** WS7: fonte só falta quando há dado no slide e nem IR nem imagem confirmou-a. */
export function sourceFindingsFromVision(ir: Ir, sourceSlides: number[]): Finding[] {
  const visible = new Set(sourceSlides);
  return ir.slides.filter((slide) => {
    const numericSection = ['SOCIO', 'ABSORCAO', 'LACUNAS'].includes((slide.secao_canonica ?? '').toUpperCase());
    const hasData = (slide.tabelas?.length ?? 0) > 0 || (slide.graficos?.length ?? 0) > 0 || (slide.n_imagens ?? 0) > 0;
    return numericSection && hasData && (slide.fontes?.length ?? 0) === 0 && !visible.has(slide.n);
  }).slice(0, 25).map((slide) => ({
    id: `src-${slide.n}`, type: 'SOURCE_MISSING' as const, section: toAuditSection(slide.secao_canonica), slideRef: `s${slide.n}`,
    title: 'Dado sem fonte identificada', detail: 'Não há FONTE/ELABORAÇÃO no texto extraído nem nas imagens analisadas. Verificar antes de corrigir.', ok: false,
    viz: { kind: 'text' as const, location: slide.titulo ?? undefined },
  }));
}

/** WS7/8: notas obrigatórias, exclusões e métricas recorrentes da consolidada. */
export function requiredAndExclusionFindings(ir: Ir, tables: CrossTableRef[]): Finding[] {
  const out: Finding[] = [];
  const slides = textOf(ir);
  const absorption = slides.filter((s) => s.section === 'ABSORCAO');
  if (absorption.length && !absorption.some((s) => /desconsidera.*(?:segunda|2).*(?:moradia)|(?:segunda|2).*moradia.*desconsidera/.test(s.text))) {
    out.push({ id: 'required-second-home', type: 'REQUIRED_NOTE', section: 'ABSORCAO', slideRef: absorption.map((s) => `s${s.n}`).join(', '), title: 'Nota de segunda moradia ausente', detail: 'A análise de absorção deve informar a desconsideração de segunda moradia.', ok: false, viz: { kind: 'text' } });
  }
  const lacunas = slides.filter((s) => s.section === 'LACUNAS');
  if (lacunas.length && !lacunas.some((s) => /garden/.test(s.text) && /duplex/.test(s.text) && /cobertura/.test(s.text))) {
    out.push({ id: 'exclusion-lacunas', type: 'EXCLUSION_RULE', section: 'LACUNAS', slideRef: lacunas.map((s) => `s${s.n}`).join(', '), title: 'Nota de exclusões das lacunas ausente', detail: 'A nota de lacunas deve explicar a exclusão de Gardens, Duplex e Coberturas.', ok: false, viz: { kind: 'text' } });
  }
  for (const ref of tables.filter((r) => /consolid/.test(normalize(`${r.titulo ?? ''} ${r.table.title}`)))) {
    const labels = `${ref.table.columns.join(' ')} ${ref.table.rows.map((row) => String(row[0] ?? '')).join(' ')}`;
    if (!/m[eé]dia.*r\$\/?m|r\$\/?m.*m[eé]dia/.test(labels) || !/estoque/.test(labels)) {
      out.push({ id: `required-consolidada-${ref.slide}`, type: 'REQUIRED_NOTE', section: 'MERCADO', slideRef: `s${ref.slide}`, title: 'Consolidada sem média R$/m² ou total de estoque', detail: 'A consolidada deve exibir média de R$/m² e total de estoque para leitura completa.', ok: false, viz: { kind: 'text' }, evidenceSha1: ref.source === 'vision' ? ref.sha1 : undefined });
    }
    const stock = ref.table.columns.findIndex((column) => /estoque/.test(normalize(column)));
    const vso = ref.table.columns.findIndex((column) => /vso|vendid.*m[eê]s/.test(normalize(column)));
    if (stock >= 0 && vso >= 0) ref.table.rows.forEach((row, index) => {
      if (num(row[stock]) && row[stock] === 0 && num(row[vso]) && row[vso] !== 0) out.push({
        id: `vso-zero-${ref.slide}-${index}`, type: 'VALUE_PLAUSIBILITY', section: 'MERCADO', slideRef: `s${ref.slide}`,
        title: 'VSO mensal com estoque zero', detail: `«${row[0] ?? 'Linha'}» tem estoque zero e VSO/vendas-mês preenchido; verificar.`, ok: false,
        viz: { kind: 'table', table: ref.table, badRows: [index] }, evidenceSha1: ref.source === 'vision' ? ref.sha1 : undefined,
      });
    });
  }
  return out;
}
