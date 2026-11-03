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
  let verifiedZeroWithoutNeighborhood=0;
  for (const building of byId.values()) {
    const label=`Empreendimento ${String(building.building_id??building.id).slice(0,40)}`;
    if (normalize(building.city) !== 'sao paulo' || normalize(building.state ?? building.uf) !== 'sp' || normalize(building.building_type) !== 'vertical') return block('A coleta de bairros contém empreendimento fora de São Paulo/SP vertical.');
    const release = monthOf(building.release_date);
    const day = String(building.release_date ?? '').slice(0,10);
    if (!release || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day) return block('Há empreendimento sem data de lançamento válida.');
    const eligible = report.monthly.map(row => row.month).filter(month => month >= release);
    if (!eligible.length) continue;
    const hasNeighborhood=typeof building.neighborhood==='string'&&!!building.neighborhood.trim();
    const missing:string[]=[];
    if(!(SP_API_PATTERNS as readonly string[]).includes(String(building.standard)))missing.push('padrão ausente ou não reconhecido');
    if(!Array.isArray(building.typologies_history))missing.push('históricos por tipologia ausentes ou em formato inválido');
    else if(!building.typologies_history.length)missing.push('históricos por tipologia sem registros');
    if(missing.length)return block(`${label}: ${missing.join('; ')}. O ranking aguarda a fonte completa, sem descartar este registro.`);
    const histories=building.typologies_history as unknown[];
    const seen = new Map<string, string>(), observed = new Set<string>(), typologyMonths=new Map<string,Set<string>>();
    let units=0,hasMovement=false;
    for (const raw of histories) {
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
      observed.add(month); units += value;hasMovement ||= value!==0;
      const covered=typologyMonths.get(id)??new Set<string>();covered.add(month);typologyMonths.set(id,covered);
      monthly.set(month, (monthly.get(month) ?? 0) + value);
      patterns.set(String(building.standard), (patterns.get(String(building.standard)) ?? 0) + value);
    }
    if (eligible.some(month => !observed.has(month))) return block(`${label}: faltam vendas identificadas nas competências ${eligible.filter(month=>!observed.has(month)).join(', ')}. Ausência não representa zero.`);
    if(!hasNeighborhood){
      if(hasMovement)return block(`${label}: bairro ausente ou inválido e há vendas ou distratos no período. O ranking aguarda a localização dessas vendas.`);
      if([...typologyMonths.values()].some(months=>eligible.some(month=>!months.has(month))))return block(`${label}: histórico incompleto por tipologia. Não foi comprovada venda zero em todos os meses; o bairro permanece necessário.`);
      verifiedZeroWithoutNeighborhood++;
      continue;
    }
    const neighborhood=(building.neighborhood as string).trim().replace(/\s+/g,' '),key=normalize(neighborhood);
    const grouped=groups.get(key)??{neighborhood,units:0};grouped.units+=units;
    groups.set(key, grouped);
  }
  const all = [...groups.values()], cityTotal = all.reduce((sum, row) => sum + row.units, 0);
  if ((!all.length&&!verifiedZeroWithoutNeighborhood) || !Number.isSafeInteger(cityTotal) || all.some(row => !Number.isSafeInteger(row.units))) return block('Não foi possível apurar um total válido de vendas por bairro. O ranking aguarda a fonte completa.');
  // Report each independent comparison: monthly and pattern margins are not a month/pattern cross-tab.
  const differences: string[] = [], patternDifferences: string[] = [];
  const compare = (target: string[], label: string, actual: number, expected: number) => {
    if (actual === expected) return;
    const delta = actual - expected;
    target.push(`${label}: empreendimentos ${actual}; municipal ${expected}; diferença ${delta > 0 ? '+' : ''}${delta} unidade(s)`);
  };
  compare(differences, `Total de ${report.quarter}`, cityTotal, report.metrics.sales!);
  for (const row of report.monthly) compare(differences, `Mês ${row.month}`, monthly.get(row.month) ?? 0, row.sales);
  for (const row of report.patterns.rows) compare(patternDifferences, `Padrão ${row.group}`, patterns.get(row.group) ?? 0, row.sales);
  if (differences.length) return block(`As vendas por bairro não coincidem com os totais municipais. ${[...differences,...patternDifferences].join('. ')}. Comparação de sold_in_period dos históricos com liquid_sales municipal, no período selecionado. O ranking aguarda reconciliação; nenhuma diferença foi atribuída automaticamente a distratos.`);
  const shares = cityTotal > 0 && all.every(row => row.units >= 0);
  const rows = all.sort((a,b) => b.units - a.units || a.neighborhood.localeCompare(b.neighborhood, 'pt-BR')).slice(0,10).map(row => ({ ...row, share: shares ? row.units / cityTotal * 100 : null }));
  const topTotal = rows.reduce((sum,row) => sum + row.units, 0);
  // Pattern classification is not a dimension of this neighborhood ranking.
  const warnings = patternDifferences.length ? [`A distribuição por padrão difere entre os históricos dos empreendimentos e a série municipal. ${patternDifferences.join('. ')}. O ranking por bairro usa os históricos identificados, com total do trimestre e de cada mês reconciliados; a causa da diferença de classificação não foi confirmada.`] : [];
  return { status: 'ready', issues: [], warnings, rows, cityTotal, topTotal, topShare: shares ? topTotal / cityTotal * 100 : null,verifiedZeroWithoutNeighborhood };
}
