import { historyFingerprint } from '@/features/panorama-secovi-fiergs/domain/building-history';
import { insertBuilding } from '@/features/panorama-secovi-fiergs/domain/building-source';
import { isSpMunicipalPreview, monthOf, type SpPreview } from './model';
import type { SpLaunchNeighborhoods } from './neighborhoods';
import { SP_API_PATTERNS } from './segments';

export const blockedSpSalesNeighborhoods = (message: string): SpLaunchNeighborhoods => ({ status: 'blocked', issues: [message], rows: [], cityTotal: null, topTotal: null, topShare: null });
const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
/** Complete register + identified monthly flows; never infer sales from stock differences. */
export function buildSpSalesNeighborhoods(buildings: Record<string, unknown>[], report: SpPreview): SpLaunchNeighborhoods {
  const block = blockedSpSalesNeighborhoods;
  if (!isSpMunicipalPreview(report) || !report.monthly?.length || report.patterns?.status !== 'ready' || !buildings.length) return block('Confira primeiro o período municipal e a coleta completa dos empreendimentos.');
  const byId = new Map<string, Record<string, unknown>>();
  try { for (const building of buildings) insertBuilding(byId, { ...building, __panoramaSource: building.__panoramaSource ?? { source: 'building-with-history' } }); } catch { return block('Há empreendimentos repetidos com conteúdos conflitantes ou sem identidade.'); }
  const groups = new Map<string, { neighborhood: string; units: number }>(), monthly = new Map<string, number>(), patterns = new Map<string, number>();
  for (const building of byId.values()) {
    if (normalize(building.city) !== 'sao paulo' || normalize(building.state ?? building.uf) !== 'sp' || normalize(building.building_type) !== 'vertical') return block('A coleta de bairros contém empreendimento fora de São Paulo/SP vertical.');
    const release = monthOf(building.release_date);
    const day = String(building.release_date ?? '').slice(0,10);
    if (!release || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day) return block('Há empreendimento sem data de lançamento válida.');
    const eligible = report.monthly.map(row => row.month).filter(month => month >= release);
    if (!eligible.length) continue;
    if (typeof building.neighborhood !== 'string' || !building.neighborhood.trim() || !Array.isArray(building.typologies_history) || !(SP_API_PATTERNS as readonly string[]).includes(String(building.standard))) return block('Faltam bairro, padrão ou históricos identificados. O ranking não usa somente os registros preenchidos.');
    const neighborhood = building.neighborhood.trim().replace(/\s+/g, ' '), key = normalize(neighborhood);
    const grouped = groups.get(key) ?? { neighborhood, units: 0 }, seen = new Map<string, string>(), observed = new Set<string>();
    for (const raw of building.typologies_history) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return block('Há registro histórico inválido.');
      const row = raw as Record<string, unknown>, month = monthOf(row.period);
      if (!month) return block('Há histórico sem competência válida.');
      if (!eligible.includes(month)) continue;
      const id = String(row.typology_id ?? '').trim(), identity = `${id}/${month}`, fingerprint = historyFingerprint(row);
      if (!id) return block('Há tipologia sem identidade para deduplicar as vendas.');
      if (seen.has(identity)) { if (seen.get(identity) !== fingerprint) return block('Há vendas conflitantes para a mesma tipologia e competência.'); continue; }
      seen.set(identity, fingerprint);
      const value = typeof row.sold_in_period === 'number' || typeof row.sold_in_period === 'string' && row.sold_in_period.trim() ? Number(row.sold_in_period) : NaN;
      if (!Number.isSafeInteger(value)) return block('Há venda mensal ausente ou inválida. Ausência não representa zero.');
      observed.add(month); grouped.units += value;
      monthly.set(month, (monthly.get(month) ?? 0) + value);
      patterns.set(String(building.standard), (patterns.get(String(building.standard)) ?? 0) + value);
    }
    if (eligible.some(month => !observed.has(month))) return block('Há empreendimento sem cobertura de vendas em todos os meses elegíveis.');
    groups.set(key, grouped);
  }
  const all = [...groups.values()], cityTotal = all.reduce((sum, row) => sum + row.units, 0);
  if (!all.length || !Number.isSafeInteger(cityTotal) || all.some(row => !Number.isSafeInteger(row.units)) || cityTotal !== report.metrics.sales || report.monthly.some(row => (monthly.get(row.month) ?? 0) !== row.sales) || report.patterns.rows.some(row => (patterns.get(row.group) ?? 0) !== row.sales)) return block('As vendas por bairro não coincidem com os totais municipais por mês e padrão. O ranking aguarda reconciliação.');
  const shares = cityTotal > 0 && all.every(row => row.units >= 0);
  const rows = all.sort((a,b) => b.units - a.units || a.neighborhood.localeCompare(b.neighborhood, 'pt-BR')).slice(0,10).map(row => ({ ...row, share: shares ? row.units / cityTotal * 100 : null }));
  const topTotal = rows.reduce((sum,row) => sum + row.units, 0);
  return { status: 'ready', issues: [], rows, cityTotal, topTotal, topShare: shares ? topTotal / cityTotal * 100 : null };
}
