import ceilings from './mcmv-ceilings-2026.json';
import type { RawBuilding } from './api';

const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** Classificação local pelo teto municipal fornecido, sem substituir o padrão cadastral. */
export function mcmvBand(building: RawBuilding, average: number | null): string {
  if (normalize(building.building_type) !== 'vertical'
    || !['economico', 'standard'].includes(normalize(building.standard))
    || average === null || !Number.isFinite(average) || average <= 0) return '';
  const ceiling = (ceilings as Record<string, number>)[`${normalize(building.state)}|${normalize(building.city)}`];
  if (ceiling === undefined) return '';
  const cents = Math.round(average * 100);
  const band = cents <= ceiling * 100 ? 2 : cents <= 40_000_000 ? 3 : cents <= 60_000_000 ? 4 : null;
  return band === null ? '' : `${String(building.standard).trim()} - Faixa ${band}`;
}

export const MCMV_HELP = 'Faixa MCMV: somente empreendimentos Verticais de padrão Econômico ou Standard. Usa sempre a média ponderada pela oferta lançada (somente tipologias Padrão), com o último fechamento de cada tipologia no mês/trimestre analisado, independente das opções gerais de média e VGV. No tabular, a faixa corresponde ao período da linha; no horizontal, a faixa final e as faixas históricas ficam ao lado de Padrão. Faixa 2: até o teto da UF/município no JSON de referência 2026, também aplicado aos períodos históricos; Faixa 3: teto + R$ 0,01 até R$ 400.000,00; Faixa 4: R$ 400.000,01 até R$ 600.000,00. Acima disso, sem município correspondente ou sem média válida, fica vazio. O padrão original é preservado. Calculado somente em Gerar relatório, após a coleta completa.';
