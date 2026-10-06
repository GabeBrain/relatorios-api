import type { HorizontalSubtype } from '../domain/entity-policy';

/**
 * Produto observado na coleta granular autenticada de 02/10/2026 para o fechamento 2T2026.
 * Fonte: .tmp/fiergs-final-adjustments-regression-20261002/2T2026-auditoria.csv
 * (linhas empreendimento) e evidência de reconciliação da revisão da Juliana.
 *
 * Catálogo de proveniência, não de quantidades: só supre produto quando o payload atual não
 * informa subtipo. Um produto explícito da API sempre prevalece; não há regra por trimestre.
 */
const REVIEWED_PRODUCTS: Readonly<Record<string, HorizontalSubtype>> = {
  'RS/Alvorada#66842': 'condominio_casas',
  'RS/Alvorada#76393': 'condominio_casas',
  'RS/Cachoeirinha#16532': 'condominio_casas',
  'RS/Cachoeirinha#55102': 'condominio_casas',
  'RS/Cachoeirinha#76401': 'condominio_casas',
  'RS/Gravataí#63348': 'condominio_casas',
  'RS/Viamão#75719': 'condominio_casas',
};

export function reviewedFiergsHorizontalProduct(uf: string, city: string, buildingId: string): HorizontalSubtype | null {
  return REVIEWED_PRODUCTS[`${uf}/${city}#${buildingId}`] ?? null;
}
