// Corretor v3 — reconciliação no nível do DECK, depois da visão. Uma leitura de
// imagem isolada erra; o deck inteiro tem redundância (o mesmo cabeçalho em
// várias páginas, as mesmas faixas em várias quebras). Estas regras usam essa
// redundância para separar erro do estudo de erro de leitura. Funções puras.
// Origem: triagem manual de Campos do Jordão (set/2026), 22 FPs em 38 achados.

import { binsFromColumns, rowLabels } from '../audit/engine';
import type { Bin, Finding } from '../audit/model';
import type { ExtractedTableRef } from './ia-vision';

const flat = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function deckLabels(tables: ExtractedTableRef[]): string[] {
  return tables.flatMap((t) => [...t.table.columns, ...rowLabels(t.table), t.table.title]).map(flat).filter(Boolean);
}

/**
 * Erro de digitação só é do ESTUDO se o rótulo nunca aparece escrito certo no
 * deck. "Abaxo" no s54 e "Abaixo" no s53 (mesmo cabeçalho, página seguinte) é
 * letra mal lida. "Arté" do SJC aparecia igual em todos os slides: continua.
 */
function dropMisreadTypos(findings: Finding[], labels: string[]): Finding[] {
  return findings.flatMap((f) => {
    if (f.type !== 'SPELLING' || !f.id.startsWith('iavis-labeltypo') || f.viz?.kind !== 'table') return [f];
    const rows = f.viz.table.rows.filter((row) => {
      const text = String(row[1] ?? ''), reason = String(row[2] ?? '');
      const wrong = text.trim().split(/\s+/)[0] ?? '';
      const fix = reason.match(/de «(.+?)»\s*$/)?.[1];
      if (!fix) return true;
      const corrected = flat(text.replace(wrong, fix));
      return !labels.some((l) => l.includes(corrected));
    });
    if (!rows.length) return [];
    if (rows.length === f.viz.table.rows.length) return [f];
    return [{ ...f, viz: { ...f.viz, table: { ...f.viz.table, rows }, badRows: rows.map((_, i) => i) }, detail: rows.map((r) => String(r[2])).join('; ') + '.' }];
  });
}

/**
 * Furo de faixa lido por imagem é descartado quando OUTRA tabela do deck tem uma
 * faixa começando dentro do furo: a coluna existe, a leitura é que a pulou (s49
 * sem "36.511,01 a 37.253" que os s50–s56 mostram; s87 sem "13.001 a 14.000"
 * que o s88 mostra). Se o estudo tiver mesmo faixas diferentes entre quebras,
 * o cruzamento de faixas entre tabelas continua acusando.
 */
function dropMisreadGaps(findings: Finding[], tables: ExtractedTableRef[]): Finding[] {
  const allBins: { slide: number; bin: Bin }[] = tables.flatMap((t) =>
    [...binsFromColumns(t.table.columns), ...binsFromColumns(rowLabels(t.table))].map((bin) => ({ slide: t.slide, bin })));
  return findings.filter((f) => {
    if (f.type !== 'BINNING_RULE' || f.viz?.kind !== 'binrange' || !/^Furo/.test(f.viz.gapDescription ?? f.detail)) return true;
    const g = f.viz.gapAfterIndex ?? -1;
    const prev = f.viz.bins[g], cur = f.viz.bins[g + 1];
    if (!prev || !cur || prev.to === null) return true;
    const filled = allBins.some(({ bin }) => bin.from > prev.to! && bin.from < cur.from);
    return !filled;
  });
}

/** Chave numérica do problema: o par de faixas, não o texto lido (que varia). */
function binKey(f: Finding): string {
  if (f.viz?.kind !== 'binrange') return flat(f.detail);
  const g = f.viz.gapAfterIndex ?? -1;
  const a = f.viz.bins[g], b = f.viz.bins[g + 1];
  return a && b ? `${a.from}-${a.to}|${b.from}-${b.to}` : flat(f.detail);
}

/** O mesmo problema de faixa em várias páginas/slides vira um achado só. */
function mergeRepeatedBins(findings: Finding[]): Finding[] {
  const groups = new Map<string, Finding[]>();
  const out: Finding[] = [];
  for (const f of findings) {
    if (f.type !== 'BINNING_RULE') { out.push(f); continue; }
    const key = binKey(f);
    const g = groups.get(key);
    if (g) { g.push(f); continue; }
    groups.set(key, [f]);
    out.push(f);
  }
  return out.map((f) => {
    if (f.type !== 'BINNING_RULE') return f;
    const g = groups.get(binKey(f)) ?? [f];
    if (g.length < 2) return f;
    const slides = g.map((x) => x.slideRef).join(', ');
    return { ...f, detail: `${f.detail} O mesmo cabeçalho se repete em ${g.length} slides (${slides}).` };
  });
}

/**
 * Somas que a própria regra classificou como leitura insegura (totais não
 * alinhados, margens incoerentes, leituras discordantes) não viram N achados:
 * viram UM aviso de cobertura com os slides. O analista sabe o que não foi
 * conferido, sem uma lista de “Verificar” que é, na prática, ruído da leitura.
 */
function summarizeUnsafeSums(findings: Finding[]): Finding[] {
  // Só leitura INSEGURA entra no resumo. Soma rebaixada por nota de exclusão
  // declarada no slide continua como achado próprio: ali a leitura é boa e a
  // diferença tem explicação provável que o analista precisa ver.
  const unsafe = findings.filter((f) => (f.type === 'ABSOLUTE_SUM' || f.type === 'PERCENTAGE_SUM') && f.evidenceSha1 && f.confidence === 3
    && !(f.viz?.kind === 'table' && f.viz.omittedBand)
    && ((f.viz?.kind === 'table' && (f.viz.unaligned || f.viz.incoherentReading || f.viz.stitchedReading)) || /discordam entre si/.test(f.detail)));
  if (!unsafe.length) return findings;
  const keep = findings.filter((f) => !unsafe.includes(f));
  const slides = [...new Set(unsafe.map((f) => f.slideRef))].sort((a, b) => (parseInt(a.slice(1)) || 0) - (parseInt(b.slice(1)) || 0));
  keep.push({
    id: 'vision-unsafe-sums',
    type: 'IMAGE_NOT_READ',
    section: 'GLOBAL',
    slideRef: slides[0] ?? '—',
    title: `Tabelas-imagem sem conferência segura (${slides.length} slide${slides.length > 1 ? 's' : ''})`,
    detail: `A leitura destas tabelas não permitiu conferir as somas com segurança (totais não alinhados às colunas, leituras discordantes ou incoerentes): ${slides.join(', ')}. Não é acusação de erro; confira manualmente se forem críticas.`,
    ok: false,
    confidence: 3,
    origem: 'IA_visao',
    viz: { kind: 'text', evidence: slides.join(', ') },
  });
  return keep;
}

export function reconcileDeckFindings(findings: Finding[], tables: ExtractedTableRef[]): Finding[] {
  const labels = deckLabels(tables);
  return summarizeUnsafeSums(mergeRepeatedBins(dropMisreadGaps(dropMisreadTypos(findings, labels), tables)));
}
