import { buildLaunchModel, periodToQuarter, quarterKey, safeNumber } from '../lib/launches';
import type { LaunchRecord, MethodStatus, PanoramaReportModel, PanoramaScope, Quarter, ReportMarketBlock, Segment } from '../types';
type SourceResult = { rows: Record<string, unknown>[]; available: boolean; source: string };
function segment(value: unknown): Segment | null { const raw = String(value ?? '').toLowerCase(); return raw.includes('vertical') ? 'Vertical' : raw.includes('horizontal') || raw.includes('casa') ? 'Horizontal' : null; }
function canonical(scope: PanoramaScope): Quarter[] { const end = quarterKey(scope.endQuarter); return Array.from({ length: 17 }, (_, i) => { const v = end - 16 + i; return `${((v - 1) % 4) + 1}T${Math.floor((v - 1) / 4)}` as Quarter; }); }
function marketBlock(scope: PanoramaScope, source: SourceResult, field: string, unit: ReportMarketBlock['unit'], formula: string): ReportMarketBlock {
  const values = new Map<string, number>(); const groups = new Map<string, { vertical: number; horizontal: number }>(); const periods = canonical(scope);
  for (const row of source.rows) { const quarter = periodToQuarter(row.period); const type = segment(row.building_type ?? row.type); if (!quarter || !type || !periods.includes(quarter)) continue; const value = safeNumber(row[field]) ?? 0; const key = `${quarter}:${type}`; values.set(key, (values.get(key) ?? 0) + value); const label = String(row.pattern ?? row.standard ?? row.group ?? row.typology ?? row.typology_name ?? 'Total'); const group = groups.get(label) ?? { vertical: 0, horizontal: 0 }; group[type.toLowerCase() as 'vertical' | 'horizontal'] += value; groups.set(label, group); }
  const status = source.available ? (source.rows.length ? 'ready' : 'partial') : 'unavailable';
  return { series: periods.map((quarter) => { const vertical = values.get(`${quarter}:Vertical`) ?? 0; const horizontal = values.get(`${quarter}:Horizontal`) ?? 0; return { quarter, vertical, horizontal, total: vertical + horizontal, methodStatus: 'open_method' as MethodStatus, dataStatus: status, source: source.source }; }), byGroup: [...groups].map(([label, v]) => ({ label, ...v, total: v.vertical + v.horizontal })).sort((a, b) => b.total - a.total), unit, methodStatus: 'open_method', dataStatus: status, source: source.source, formula };
}
export function buildPanoramaReportModel(scope: PanoramaScope, records: LaunchRecord[], sources: { sales: SourceResult; stock: SourceResult; ivv: SourceResult; ticket: SourceResult; meter: SourceResult }): PanoramaReportModel {
  const launches = buildLaunchModel(records);
  return { scope, generatedAt: new Date().toISOString(), launches,
    sales: { units: marketBlock(scope, sources.sales, 'liquid_sales', 'count', 'Soma de vendas líquidas por período, segmento e padrão.'), vgv: marketBlock(scope, sources.sales, 'vgv_liquid_sales', 'brl_millions', 'Soma de VGV vendido da API.') },
    stock: { units: marketBlock(scope, sources.stock, 'stock', 'count', 'Soma de estoque por período, segmento e padrão.'), vgv: marketBlock(scope, sources.stock, 'vgv_stock', 'brl_millions', 'Soma de VGV de estoque da API.') },
    ivv: marketBlock(scope, sources.ivv, 'ivv', 'percent', 'IVV retornado por segmento; percentuais não são somados.'),
    prices: { ticket: marketBlock(scope, sources.ticket, 'medium_price', 'brl_millions', 'Preço médio retornado pela API.'), meter: marketBlock(scope, sources.meter, 'medium_price_meter', 'brl_sqm', 'Preço médio por m² retornado pela API.') },
    locations: records.filter((row) => row.latitude !== null && row.latitude !== undefined && row.longitude !== null && row.longitude !== undefined).map((row) => ({ name: row.name ?? 'Empreendimento', segment: row.segment, latitude: row.latitude!, longitude: row.longitude! })),
    source: 'GeoBrain API', dataState: records.length ? (launches.warnings.length ? 'partial' : 'ready') : 'unavailable', openMethodologies: ['Os valores disponíveis nas APIs são exibidos; universos, VGV lançado, IVV por área e agregações seguem em validação metodológica.'] };
}
