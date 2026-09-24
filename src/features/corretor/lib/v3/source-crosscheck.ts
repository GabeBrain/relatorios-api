import type { Finding } from '../audit/model';
import type { Ir, IrSlide } from '../audit/ir';
import type { Fonte, FonteBloco, FonteItem } from './fonte';
import type { ExtractedTableRef } from './ia-vision';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const pt = (value: number, digits = 0) => value.toLocaleString('pt-BR', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});

const provenance = (block: FonteBloco, item: FonteItem) =>
  `${block.arquivo} › ${block.aba} › linha ${item.linha}`;

const socioBlock = (fonte: Fonte, table: string) =>
  fonte.blocos.find((block) => block.papel === 'socio' && block.tabela === table);

interface LabeledPercent { label: string; value: number }
function labeledPercents(slide: IrSlide): LabeledPercent[] {
  const out: LabeledPercent[] = [];
  for (const text of slide.textos) {
    const match = text.match(/^\s*(-?[\d.,]+)\s*%\s*[\r\n]+\s*(.+?)\s*$/s);
    if (!match) continue;
    const parsed = Number(match[1].replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(parsed)) out.push({ label: match[2], value: parsed });
  }
  return out;
}

function sourceFinding(args: {
  slide: IrSlide; recorte: string; shown: string; expected: string;
  block: FonteBloco; item: FonteItem; suffix: string;
}): Finding {
  const { slide, recorte, shown, expected, block, item, suffix } = args;
  const origin = provenance(block, item);
  return {
    id: `source-${slide.n}-${normalize(block.tabela)}-${normalize(recorte)}-${suffix}`,
    type: 'SOURCE_CROSSCHECK', section: 'SOCIO', slideRef: `s${slide.n}`,
    title: `Valor diverge da planilha-fonte — ${recorte}`,
    detail: `O slide mostra ${shown}, enquanto a fonte registra ${expected}. Origem: ${origin}.`,
    confidence: 1, origem: 'DET',
    viz: {
      kind: 'sidebyside', leftLabel: `Slide ${slide.n}`, rightLabel: origin,
      rows: [{ label: recorte, left: shown, right: expected, mismatch: true }],
    },
  };
}

function verticalizationFindings(ir: Ir, fonte: Fonte): Finding[] {
  const block = socioBlock(fonte, 'domicilios_por_tipo');
  const apartment = block?.itens?.find((item) => normalize(item.rotulo ?? '') === 'apartamento');
  if (!block || !apartment?.recortes) return [];
  const findings: Finding[] = [];
  for (const slide of ir.slides.filter((s) => normalize(s.titulo ?? '').includes('indice de verticalizacao'))) {
    for (const claim of labeledPercents(slide)) {
      const matches = Object.entries(apartment.recortes).filter(([scope]) => normalize(scope) === normalize(claim.label));
      if (matches.length !== 1) continue; // ambiguidade ou recorte não coberto: abstém
      const [scope, values] = matches[0];
      const ratio = values['%'];
      if (typeof ratio !== 'number') continue;
      const expected = ratio * 100;
      // Compara na precisão publicada: 5,16% vira 5,2% quando o deck mostra uma casa.
      const roundedExpected = Number(expected.toFixed(1));
      if (Math.abs(claim.value - roundedExpected) < 0.001) continue;
      findings.push(sourceFinding({
        slide, recorte: scope, shown: `${pt(claim.value, 1)}%`, expected: `${pt(expected, 2)}%`,
        block, item: apartment, suffix: 'percentual',
      }));
    }
  }
  return findings;
}

function currentSeriesValue(item: FonteItem): number | null {
  const values = item.numeros ?? [];
  // O extrator preserva a série da planilha e repete o valor-base antes das
  // taxas. A repetição adjacente é uma âncora observada nos três pacotes.
  for (let index = 1; index < values.length; index++) {
    if (typeof values[index] === 'number' && values[index] === values[index - 1]) return values[index] as number;
  }
  return null;
}

function populationSeriesFindings(ir: Ir, fonte: Fonte): Finding[] {
  const findings: Finding[] = [];
  for (const slide of ir.slides) {
    const title = normalize(slide.titulo ?? '');
    const tableName = title.includes('variacao anual dos domicilios')
      ? 'domicilios' : title.includes('variacao anual da populacao') ? 'populacao' : null;
    if (!tableName) continue;
    const blocks = fonte.blocos.filter((block) => block.papel === 'populacao' && block.tabela === tableName);
    if (blocks.length !== 1 || !blocks[0].itens) continue;
    const block = blocks[0];
    const expectedUnit = tableName === 'domicilios' ? 'dom.' : 'hab.';
    const claims = slide.textos.flatMap((text) => {
      const match = text.match(/^\s*([\d.]+)\s+(dom\.|hab\.)/i);
      return match ? [{ raw: match[1], unit: match[2].toLowerCase(), value: Number(match[1].replace(/\./g, '')) }] : [];
    });
    const used = new Set<number>();
    for (const item of block.itens) {
      const scope = item.rotulo ?? '';
      const expected = currentSeriesValue(item);
      if (!scope || expected === null) continue;
      const exact = claims.findIndex((claim, index) => !used.has(index) && claim.value === Math.round(expected));
      if (exact >= 0) {
        used.add(exact);
        if (claims[exact].unit !== expectedUnit) {
          findings.push(sourceFinding({
            slide, recorte: scope, shown: `${claims[exact].raw} ${claims[exact].unit}`,
            expected: `${pt(expected)} ${expectedUnit}`, block, item, suffix: `unidade-${tableName}`,
          }));
        }
        continue;
      }
      const candidates = claims.map((claim, index) => ({ claim, index, delta: Math.abs(claim.value - expected) / Math.max(expected, 1) }))
        .filter((candidate) => !used.has(candidate.index) && candidate.delta <= 0.001)
        .sort((a, b) => a.delta - b.delta);
      // Só associa se houver um candidato próximo e inequivocamente melhor.
      if (candidates.length !== 1 && (candidates.length < 2 || candidates[0].delta === candidates[1].delta)) continue;
      const chosen = candidates[0];
      used.add(chosen.index);
      findings.push(sourceFinding({
        slide, recorte: scope, shown: `${chosen.claim.raw} ${chosen.claim.unit}`, expected: `${pt(expected)} ${expectedUnit}`,
        block, item, suffix: tableName,
      }));
    }
  }
  return findings;
}

/**
 * Compara apenas métricas com mapeamento semântico explícito. Ausência ou
 * ambiguidade não vira acusação; ampliar cobertura exige nova regra + fixture real.
 */
export function sourceCrosscheckFindings(ir: Ir, fonte: Fonte): Finding[] {
  return [...verticalizationFindings(ir, fonte), ...populationSeriesFindings(ir, fonte)];
}

const offerTableFromTitle = (title: string): string | null => {
  const value = normalize(title);
  if (/por padrao/.test(value)) return 'padrao';
  if (/por ano/.test(value)) return 'ano';
  if (/por tipologia/.test(value)) return 'tipologia';
  return null;
};

const comparableScope = (value: string) => normalize(value)
  .replace(/^ate /, '').replace(/^z i /, '').replace(/ total$/, '').trim();

function slideScope(slide: IrSlide, blocks: FonteBloco[]): FonteBloco | null {
  const labels = slide.textos.map(comparableScope).filter(Boolean);
  const matches = blocks.filter((block) => {
    if (!block.recorte) return false;
    const source = comparableScope(block.recorte);
    return labels.some((label) => label === source || label.endsWith(` ${source}`));
  });
  return matches.length === 1 ? matches[0] : null;
}

const columnIndex = (columns: string[], patterns: RegExp[]) =>
  columns.findIndex((column) => patterns.some((pattern) => pattern.test(normalize(column))));

/**
 * Cruza as tabelas/gráficos lidos pela visão com oferta por padrão, ano e
 * tipologia. Exige título, recorte, rótulo e colunas reconhecíveis; se qualquer
 * elo faltar, não produz achado.
 */
export function sourceCrosscheckVisionFindings(
  ir: Ir, fonte: Fonte, refs: ExtractedTableRef[],
): Finding[] {
  const findings: Finding[] = [];
  for (const ref of refs) {
    const slide = ir.slides.find((item) => item.n === ref.slide);
    if (!slide) continue;
    const tableName = offerTableFromTitle(`${slide.titulo ?? ''} ${ref.titulo ?? ''}`);
    if (!tableName) continue;
    const blocks = fonte.blocos.filter((block) => block.papel === 'oferta' && block.tabela === tableName);
    const block = slideScope(slide, blocks);
    if (!block?.itens) continue;
    const labelCol = columnIndex(ref.table.columns, [/padrao/, /ano/, /tipologia/, /categoria/, /faixa/]);
    const launchedCol = columnIndex(ref.table.columns, [/oferta lancada/, /lancadas?/, /o l/]);
    const currentCol = columnIndex(ref.table.columns, [/oferta atual/, /oferta final/, /estoque/, /o a/, /o f/]);
    if (labelCol < 0 || (launchedCol < 0 && currentCol < 0)) continue;

    const sourceByLabel = new Map<string, FonteItem[]>();
    for (const item of block.itens) {
      const key = normalize(item.rotulo ?? '');
      if (!key) continue;
      sourceByLabel.set(key, [...(sourceByLabel.get(key) ?? []), item]);
    }
    ref.table.rows.forEach((row, rowIndex) => {
      const label = String(row[labelCol] ?? '');
      const candidates = sourceByLabel.get(normalize(label)) ?? [];
      if (candidates.length !== 1) return;
      const item = candidates[0];
      for (const metric of [
        { key: 'oferta_lancada', column: launchedCol, label: 'Oferta lançada' },
        { key: 'oferta_atual', column: currentCol, label: 'Oferta atual' },
      ]) {
        if (metric.column < 0) continue;
        const shown = row[metric.column];
        const expected = item.valores?.[metric.key];
        if (typeof shown !== 'number' || typeof expected !== 'number' || Math.abs(shown - expected) <= 0.5) continue;
        const origin = provenance(block, item);
        findings.push({
          id: `source-vision-${ref.slide}-${normalize(tableName)}-${normalize(block.recorte ?? '')}-${normalize(label)}-${metric.key}`,
          type: 'SOURCE_CROSSCHECK', section: 'MERCADO', slideRef: `s${ref.slide}`,
          title: `${metric.label} diverge da planilha — ${label}`,
          detail: `A leitura do slide mostra ${pt(shown)}, enquanto a fonte registra ${pt(expected)}. Origem: ${origin}.`,
          confidence: 2, origem: 'IA_visao', evidenceSha1: ref.sha1,
          viz: {
            kind: 'sidebyside', leftLabel: `Slide ${ref.slide} · linha ${rowIndex + 1}`, rightLabel: origin,
            rows: [{ label: `${label} · ${metric.label}`, left: shown, right: expected, mismatch: true }],
          },
        });
      }
    });
  }
  return findings;
}
