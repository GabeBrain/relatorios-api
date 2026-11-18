import { normalizeMarketText } from './market';

/** Grouping explicitly confirmed by Lucas on 17/11/2026, for both editions. */
export function maceioPatternFamily(value: unknown): string | null {
  const raw = normalizeMarketText(value);
  return ({ compacto: 'Compactos', compactos: 'Compactos', economico: 'MCMV', mcmv: 'MCMV',
    standard: 'Médio Padrão', medio: 'Médio Padrão', 'medio-alto': 'Médio Padrão', 'medio padrao': 'Médio Padrão',
    alto: 'Luxo', luxo: 'Luxo' } as Record<string, string>)[raw] ?? null;
}

/** Explicit product labels only. Price standards do not identify a product. */
export function maceioHorizontalProduct(building: Record<string, unknown>): string {
  const values = [building.building_subtype, building.subtype, building.product_type, building.horizontal_type, building.work, building.standard];
  for (const value of values) {
    const name = normalizeMarketText(value);
    const product = ({ 'condominio de casas': 'Condomínio de Casas', 'condominio de casas/sobrados': 'Condomínio de Casas',
      'loteamento fechado': 'Loteamento Fechado', 'loteamento aberto': 'Loteamento Aberto',
      'condominio de chacaras': 'Condomínio de Chácaras' } as Record<string, string>)[name];
    if (product) return product;
  }
  return '';
}
