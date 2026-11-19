import { normalizeMarketText } from './market';

/** Grouping explicitly confirmed by Lucas on 17/11/2026, for both editions. */
export function maceioPatternFamily(value: unknown): string | null {
  const raw = normalizeMarketText(value);
  return ({ compacto: 'Compactos', compactos: 'Compactos', economico: 'MCMV', mcmv: 'MCMV',
    standard: 'Médio Padrão', medio: 'Médio Padrão', 'medio-alto': 'Médio Padrão', 'medio padrao': 'Médio Padrão',
    alto: 'Luxo', luxo: 'Luxo' } as Record<string, string>)[raw] ?? null;
}

export const MACEIO_PRODUCT_FIELDS = ['building_subtype', 'subtype', 'product_type', 'horizontal_type', 'work', 'standard'] as const;

/** Only the ten projects identified by Lucas on 19/11/2026. Never a global de-para. */
export const MACEIO_CONFIRMED_CLOSED_HOUSES: Readonly<Record<string,string>> = {
  '7980':'Barra de São Miguel',
  '12692':'Maceió',
  '20502':'Maceió',
  '7984':'Marechal Deodoro',
  '425':'Marechal Deodoro',
  '28486':'Marechal Deodoro',
  '21639':'Marechal Deodoro',
  '21640':'Marechal Deodoro',
  '422':'Marechal Deodoro',
  '28491':'Rio Largo',
};

/** Analyst confirmation relayed by Lucas on 18/11/2026; exclusion wins over other labels. */
export function maceioExcludedHorizontal(building: Record<string, unknown>): boolean {
  return MACEIO_PRODUCT_FIELDS.some(field => ['condominio de chacara', 'condominio de chacaras'].includes(normalizeMarketText(building[field])));
}

/** Explicit product labels only. Price standards do not identify a product. */
export function maceioHorizontalProduct(building: Record<string, unknown>): string {
  if (maceioExcludedHorizontal(building)) return 'Condomínio de Chácaras';
  const values = MACEIO_PRODUCT_FIELDS.map(field => building[field]);
  for (const value of values) {
    const name = normalizeMarketText(value);
    const product = ({ 'condominio de casas': 'Condomínio de Casas', 'condominio de casas/sobrados': 'Condomínio de Casas',
      'loteamento fechado': 'Loteamento Fechado', 'loteamento aberto': 'Loteamento Aberto',
      'condominio de chacaras': 'Condomínio de Chácaras' } as Record<string, string>)[name];
    if (product) return product;
  }
  const city=MACEIO_CONFIRMED_CLOSED_HOUSES[String(building.building_id??building.id??'').trim()];
  if(city && normalizeMarketText(building.building_type)==='horizontal'
    && normalizeMarketText(building.state??building.uf)==='al'
    && normalizeMarketText(building.city)===normalizeMarketText(city)
    && values.some(value=>normalizeMarketText(value)==='fechado'))return 'Condomínio de Casas';
  return '';
}
