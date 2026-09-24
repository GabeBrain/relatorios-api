import type { Finding } from '../audit/model';
import type { Ir, IrSlide } from '../audit/ir';
import type { Fonte, FonteBloco, FonteItem } from './fonte';

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

function householdTotalFindings(ir: Ir, fonte: Fonte): Finding[] {
  const block = socioBlock(fonte, 'domicilios_por_tipo');
  const total = block?.total;
  if (!block || !total?.recortes) return [];
  const findings: Finding[] = [];
  for (const slide of ir.slides.filter((s) => normalize(s.titulo ?? '').includes('variacao anual dos domicilios'))) {
    const claims = slide.textos.flatMap((text) => {
      const match = text.match(/^\s*([\d.]+)\s+dom\./i);
      return match ? [{ raw: match[1], value: Number(match[1].replace(/\./g, '')) }] : [];
    });
    const used = new Set<number>();
    for (const [scope, values] of Object.entries(total.recortes)) {
      if (!slide.textos.some((text) => normalize(text) === normalize(scope))) continue;
      const expected = values.absoluto;
      if (typeof expected !== 'number') continue;
      const exact = claims.findIndex((claim, index) => !used.has(index) && claim.value === Math.round(expected));
      if (exact >= 0) { used.add(exact); continue; }
      const candidates = claims.map((claim, index) => ({ claim, index, delta: Math.abs(claim.value - expected) / Math.max(expected, 1) }))
        .filter((candidate) => !used.has(candidate.index) && candidate.delta <= 0.001)
        .sort((a, b) => a.delta - b.delta);
      // Só associa se houver um candidato próximo e inequivocamente melhor.
      if (candidates.length !== 1 && (candidates.length < 2 || candidates[0].delta === candidates[1].delta)) continue;
      const chosen = candidates[0];
      used.add(chosen.index);
      findings.push(sourceFinding({
        slide, recorte: scope, shown: `${chosen.claim.raw} dom.`, expected: `${pt(expected)} dom.`,
        block, item: total, suffix: 'domicilios',
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
  return [...verticalizationFindings(ir, fonte), ...householdTotalFindings(ir, fonte)];
}
