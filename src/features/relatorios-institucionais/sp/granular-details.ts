import { shiftQuarter } from '@/features/panorama-secovi-fiergs/domain/quarters';
import { historyFingerprint } from '@/features/panorama-secovi-fiergs/domain/building-history';
import { isSpMunicipalPreview, monthOf, type SpPreview } from './model';
import { priorMonth, quarterMonths } from './temporal';
import { shiftSpMonth } from './project-trends';
import { SP_API_PATTERNS } from './segments';
import { buildSpMarketDetails, type SpMarketDetails } from './market-details';

export const SP_PRICE_STANDARDS = ['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo'] as const;
export const SP_PRICE_DETAIL_SLIDES = [51,53,54,55,56,57,58,59,61,62] as const;
export const SP_DETAIL_SLIDES = [...SP_PRICE_DETAIL_SLIDES,63,64,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80] as const;
export const SP_AREA_LABELS = ['Até 34m² (MCMV)', 'Até 34m² (DPA)', '35–39m² (MCMV)', '35–39m² (DPA)', '40–44m²', '45–49m²', '50–59m²', '60–69m²', '70–84m²', '85–99m²', '100–150m²', '151–200m²', '201–250m²', '251m² ou mais'] as const;
export function spAreaBand(area: number, mcmv: boolean): number | null {
  if (!Number.isFinite(area) || area <= 0) return null;
  if (area < 35) return mcmv ? 0 : 1;
  if (area < 40) return mcmv ? 2 : 3;
  return [45,50,60,70,85,100,151,201,251,Infinity].findIndex(limit => area < limit) + 4;
}
export interface SpPriceValue { units: number; ticket: number | null; meter: number | null; issues: string[] }
export interface SpPricePoint { label: string; month: string; value: number | null; variation: number | null; issue?: string }
export interface SpAreaRow { label: string; openingStock: number; stock: number; launches: number; sales: number; stockShare: number | null; launchShare: number | null; salesShare: number | null; ivv: number | null }
export interface SpGranularDetails {
  status: 'ready' | 'blocked'; issues: string[];
  prices: { series: Record<number, SpPricePoint[]>; annualChanges: Record<number, number | null>; standards: (SpPriceValue & { group: string })[]; overall: SpPriceValue };
  area: { status: 'ready' | 'blocked'; issues: string[]; rows: SpAreaRow[]; total: SpAreaRow | null };
  market?: SpMarketDetails;
}
export const blockedSpGranularDetails = (message: string): SpGranularDetails => ({ status: 'blocked', issues: [message], prices: { series: {}, annualChanges: {}, standards: [], overall: { units: 0, ticket: null, meter: null, issues: [message] } }, area: { status: 'blocked', issues: [message], rows: [], total: null } });
export interface SpObservation { project: string; month: string; standard: string; bedrooms: number | null; area: number | null; stock: number | null; sales: number | null; qty: number | null; price: number | null; meter: number | null; release: string; sold: number | null; stage: unknown }
type Observation = SpObservation;
interface Frame { rows: Observation[]; issues: Set<string> }
const numeric = (raw: unknown, signed = false, integer = false): number | null => {
  if (typeof raw !== 'number' && (typeof raw !== 'string' || !raw.trim())) return null;
  const value = Number(raw);
  return Number.isFinite(value) && (signed || value >= 0) && (!integer || Number.isSafeInteger(value)) ? value : null;
};
const normalize = (raw: unknown) => String(raw ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const change = (now: number | null, before: number | null) => now !== null && before !== null && before > 0 ? (now - before) / before * 100 : null;

class DetailBuilder {
  frames = new Map<string, Frame>();
  buildings = new Map<string, Record<string, unknown>>();
  issues = new Set<string>();
  validations = new Map<string,string|null>();
  quarters: { label: SpPreview['quarter']; month: string }[];
  constructor(readonly report: SpPreview) {
    this.quarters = Array.from({ length: 14 }, (_, i) => {
      const label = shiftQuarter(report.quarter, i - 13);
      return { label, month: i === 13 ? report.throughMonth! : quarterMonths(label)[2] };
    });
    for (const month of [...this.quarters.map(row => row.month), shiftSpMonth(report.throughMonth!, -12), priorMonth(report.monthly![0].month), ...report.monthly!.map(row => row.month)]) this.frames.set(month, { rows: [], issues: new Set() });
  }
  ingest(building: Record<string, unknown>) {
    const id = String(building.building_id ?? building.id ?? '').trim();
    const previous = this.buildings.get(id);
    if (!id) { this.issues.add('Há empreendimento sem identidade.'); return; }
    if (previous) {
      const content = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith('__panorama')));
      if (historyFingerprint(content(previous)) !== historyFingerprint(content(building))) this.issues.add('Há empreendimento duplicado com conteúdo conflitante.');
      return;
    }
    this.buildings.set(id, building);
    const day = String(building.release_date ?? '').slice(0,10), release = monthOf(building.release_date);
    if (normalize(building.city) !== 'sao paulo' || normalize(building.state ?? building.uf) !== 'sp' || normalize(building.building_type) !== 'vertical' || !release || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0,10) !== day) { this.issues.add('Há empreendimento sem escopo ou data de lançamento válidos.'); return; }
    if (release > this.report.throughMonth!) return;
    const standard = String(building.standard);
    if (!(SP_API_PATTERNS as readonly string[]).includes(standard) || !Array.isArray(building.typologies_history)) { this.issues.add('Faltam padrão reconhecido ou históricos por tipologia.'); return; }
    const observed = new Set<string>(), seen = new Map<string,string>();
    for (const raw of building.typologies_history) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { this.issues.add('Há registro histórico inválido.'); continue; }
      const row = raw as Record<string,unknown>, month = monthOf(row.period);
      if (!month) { this.issues.add('Há histórico sem competência válida.'); continue; }
      const frame = this.frames.get(month);
      if (!frame || month < release) continue;
      observed.add(month);
      const typology = String(row.typology_id ?? '').trim(), identity = `${month}/${typology}`, fingerprint = historyFingerprint(row);
      if (!typology) { frame.issues.add('Há tipologia sem identidade.'); continue; }
      if (seen.has(identity)) { if (seen.get(identity) !== fingerprint) frame.issues.add('Há tipologia repetida com valores conflitantes.'); continue; }
      seen.set(identity, fingerprint);
      const price = numeric(row.price), area = numeric(row.private_area), explicitMeter = row.price_private_area;
      const meter = area === null || area <= 0 ? null : explicitMeter === null || explicitMeter === undefined || explicitMeter === '' ? price !== null ? price / area : null : numeric(explicitMeter);
      frame.rows.push({ project: id, month, standard, bedrooms: numeric(row.number_bedroom, false, true), area, stock: numeric(row.typology_stock, false, true), sales: numeric(row.sold_in_period, true, true), qty: numeric(row.qty, false, true), price, meter, release, sold: numeric(row.sold,false,true), stage: row.building_status });
    }
    for (const [month, frame] of this.frames) if (month >= release && !observed.has(month)) frame.issues.add('Há empreendimento sem fotografia na competência necessária.');
  }
  validate(month: string): string | null {
    if (this.validations.has(month)) return this.validations.get(month)!;
    const result = this.validateFrame(month); this.validations.set(month,result); return result;
  }
  validateFrame(month: string): string | null {
    if (this.issues.size) return [...this.issues][0];
    const frame = this.frames.get(month)!;
    if (frame.issues.size) return [...frame.issues][0];
    if (frame.rows.some(row => row.stock === null)) return 'Há estoque ausente ou inválido na fotografia.';
    const expected = month === this.report.throughMonth ? this.report.patterns!.rows.map(row => ({ group: row.group, value: row.stock })) : this.report.stockSeries?.status === 'ready' ? this.report.stockSeries.observations!.filter(row => row.month === month).map(row => ({ group: row.group, value: row.value })) : [];
    if (expected.length !== SP_API_PATTERNS.length) return 'A série municipal de oferta não comprovou esta competência.';
    if (expected.some(row => frame.rows.filter(item => item.standard === row.group).reduce((sum,item) => sum + item.stock!,0) !== row.value)) return 'As tipologias não somam o estoque municipal por padrão nesta competência.';
    return null;
  }
  price(month: string, filter: (row: Observation) => boolean = () => true): SpPriceValue {
    const problem = this.validate(month);
    if (problem) return { units: 0, ticket: null, meter: null, issues: [problem] };
    const rows = this.frames.get(month)!.rows.filter(row => row.stock! > 0 && filter(row)), units = rows.reduce((sum,row) => sum + row.stock!,0);
    const weighted = (field: 'price' | 'meter') => {
      if (!units || rows.some(row => row[field] === null || row[field]! <= 0)) return null;
      const total = rows.reduce((sum,row) => sum + row.stock! * row[field]!,0);
      return Number.isFinite(total) && total <= Number.MAX_SAFE_INTEGER / 100 ? total / units : null;
    };
    const ticket = weighted('price'), meter = weighted('meter');
    return { units, ticket, meter, issues: !units ? ['Sem unidades em oferta para calcular o preço.'] : ticket === null || meter === null ? ['Há oferta sem preço ou área privativa válidos para esta média.'] : [] };
  }
  finish(): SpGranularDetails {
    if (!this.buildings.size || this.issues.size) return blockedSpGranularDetails([...this.issues][0] ?? 'A coleção de empreendimentos não foi comprovada.');
    const series: Record<number,SpPricePoint[]> = {}, annualChanges: Record<number,number|null> = {};
    for (const number of [53,54,55,56,57,58,59]) {
      const bedroom = ({ 54:1,55:1,56:2,57:2,58:3,59:4 } as Record<number,number>)[number], excludeMcmv = number === 55 || number === 57;
      const filter = (row: Observation) => (!bedroom || row.bedrooms === bedroom) && (!excludeMcmv || row.standard !== 'Econômico');
      const value = (month: string) => {
        const price = this.price(month, filter);
        if (bedroom && this.frames.get(month)!.rows.some(row => row.stock! > 0 && row.bedrooms === null)) return { ...price, meter: null, issues: ['Há oferta sem número de dormitórios para validar o recorte.'] };
        return price;
      };
      const all = this.quarters.map(row => ({ ...row, price: value(row.month) }));
      series[number] = all.slice(1).map((row,i) => ({ label: row.label, month: row.month, value: row.price.meter, variation: change(row.price.meter, all[i].price.meter), issue: row.price.meter === null ? row.price.issues[0] : undefined }));
      annualChanges[number] = change(all.at(-1)!.price.meter, value(shiftSpMonth(this.report.throughMonth!, -12)).meter);
    }
    return { status: 'ready', issues: [], prices: { series, annualChanges, standards: SP_PRICE_STANDARDS.map(group => ({ group, ...this.price(this.report.throughMonth!, row => row.standard === group) })), overall: this.price(this.report.throughMonth!) }, area: this.area(), market: buildSpMarketDetails(this.frames.get(this.report.throughMonth!)!.rows, [...this.buildings.values()], this.report, this.validate(this.report.throughMonth!)) };
  }
  area(): SpGranularDetails['area'] {
    const blocked = (message: string): SpGranularDetails['area'] => ({ status: 'blocked', issues: [message], rows: [], total: null });
    const opening = priorMonth(this.report.monthly![0].month), closing = this.report.throughMonth!;
    for (const month of [opening, ...this.report.monthly!.map(row => row.month)]) { const issue = this.validate(month); if (issue) return blocked(issue); }
    const rows: SpAreaRow[] = SP_AREA_LABELS.map(label => ({ label, openingStock:0, stock:0, launches:0, sales:0, stockShare:null, launchShare:null, salesShare:null, ivv:null }));
    const byPattern = new Map<string,{ sales:number; launches:number }>();
    for (const month of [opening, ...this.report.monthly!.map(row => row.month)]) {
      let monthlySales = 0, monthlyLaunches = 0;
      for (const item of this.frames.get(month)!.rows) {
        const launch = month !== opening && item.release === month;
        if (month !== opening && (item.sales === null || launch && item.qty === null)) return blocked('Faltam vendas mensais ou quantidades no mês de lançamento.');
        const needsArea = (month === opening || month === closing) && item.stock! !== 0 || month !== opening && item.sales !== 0 || launch && item.qty !== 0;
        const band = item.area !== null ? spAreaBand(item.area, item.standard === 'Econômico') : null;
        if (needsArea && band === null) return blocked('Há unidades ou vendas sem área privativa válida. Nenhuma faixa é presumida.');
        if (band === null) continue;
        if (month === opening) rows[band].openingStock += item.stock!;
        if (month === closing) rows[band].stock += item.stock!;
        if (month !== opening) {
          rows[band].sales += item.sales!; monthlySales += item.sales!;
          const pattern = byPattern.get(item.standard) ?? { sales:0, launches:0 }; pattern.sales += item.sales!;
          if (launch) { rows[band].launches += item.qty!; monthlyLaunches += item.qty!; pattern.launches += item.qty!; }
          byPattern.set(item.standard, pattern);
        }
      }
      if (month !== opening) { const expected = this.report.monthly!.find(row => row.month === month)!; if (monthlySales !== expected.sales || monthlyLaunches !== expected.launches) return blocked('As vendas ou os lançamentos por área não somam os totais municipais de cada mês.'); }
    }
    if (this.report.patterns!.rows.some(row => (byPattern.get(row.group)?.sales ?? 0) !== row.sales || (byPattern.get(row.group)?.launches ?? 0) !== row.launches)) return blocked('Os fluxos por área divergem dos padrões municipais.');
    const total = { ...rows[0], label:'Total', openingStock:0, stock:0, launches:0, sales:0 };
    for (const row of rows) for (const field of ['openingStock','stock','launches','sales'] as const) total[field] += row[field];
    if (total.openingStock !== this.report.monthly![0].openingStock || total.stock !== this.report.metrics.stock || total.launches !== this.report.metrics.launches || total.sales !== this.report.metrics.sales || [total,...rows].some(row => ['openingStock','stock','launches','sales'].some(field => !Number.isSafeInteger(row[field as keyof SpAreaRow])))) return blocked('Os totais por área não reconciliaram com o município.');
    for (const row of [...rows,total]) {
      row.stockShare = total.stock > 0 ? row.stock / total.stock * 100 : null;
      row.launchShare = total.launches > 0 ? row.launches / total.launches * 100 : null;
      row.salesShare = total.sales > 0 && rows.every(value => value.sales >= 0) ? row.sales / total.sales * 100 : null;
      row.ivv = row.openingStock + row.launches > 0 ? row.sales / (row.openingStock + row.launches) * 100 : null;
    }
    return { status:'ready', issues:[], rows, total };
  }
}
function create(report: SpPreview) {
  return isSpMunicipalPreview(report) && report.monthly?.length && report.patterns?.status === 'ready' ? new DetailBuilder(report) : null;
}
export function buildSpGranularDetails(buildings: Record<string,unknown>[], report: SpPreview): SpGranularDetails {
  const builder = create(report); if (!builder) return blockedSpGranularDetails('Confira primeiro o período e os padrões municipais.');
  buildings.forEach(building => builder.ingest(building)); return builder.finish();
}
export async function buildSpGranularDetailsAsync(buildings: Record<string,unknown>[], report: SpPreview, options: { signal: AbortSignal; onProgress?: (message:string) => void }): Promise<SpGranularDetails> {
  const builder = create(report); if (!builder) return blockedSpGranularDetails('Confira primeiro o período e os padrões municipais.');
  for (let i=0;i<buildings.length;i++) {
    if (options.signal.aborted) throw new DOMException('Processamento cancelado.','AbortError');
    builder.ingest(buildings[i]);
    if (i % 20 === 0) { options.onProgress?.(`Conferindo áreas e preços: ${i+1} de ${buildings.length} empreendimentos…`); await new Promise(done => setTimeout(done,0)); }
  }
  if (options.signal.aborted) throw new DOMException('Processamento cancelado.','AbortError');
  return builder.finish();
}
