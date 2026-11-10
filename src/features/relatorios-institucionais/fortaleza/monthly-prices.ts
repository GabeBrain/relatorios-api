import { FORTALEZA_CITIES,fortalezaPeriod,type FortalezaSelection } from './model';
import { marketMonth,normalizeMarketText } from './market';
import { readMonthlyNumber } from './monthly-market';
import { historyFingerprint } from '@/features/panorama-secovi-fiergs/domain/building-history';
export type PriceProduct = 'vertical'|'houses'|'closed-lots'|'open-lots';
export interface PriceObservation { project:string; typology:string; product:PriceProduct; units:number; meter:number|null; category:string|null }
export interface PriceFrame { rows:PriceObservation[]; issues:string[]; productIssues:Partial<Record<PriceProduct,string[]>> }
export interface PriceSource { city:string; segment:'Vertical'|'Horizontal'; complete:boolean; records:Record<string,unknown>[]; frames:Record<string,PriceFrame>; issue:string|null; requests:number; startedAt:string; finishedAt:string }
export interface PriceCollection { scopeKey:string; months:string[]; sources:PriceSource[]; issues:string[] }
export interface PricePoint { month:string; label:string; value:number|null; units:number }
export interface PriceSlideData { status:'ready'|'blocked'; issue:string|null; warnings:string[]; series:{ label:string; points:PricePoint[] }[]; cities?:{ city:string; value:number; units:number }[]; average?:number; changes:{ month:number|null; year:number|null }[]; sourceKeys:string[] }
export const priceSourceKey = (source:Pick<PriceSource,'city'|'segment'>) => `${source.city}/${source.segment}/histórico-preços`;
export const priceSourceHasIssues = (source:PriceSource) => !source.complete || Object.values(source.frames).some(frame => frame.issues.length>0 || Object.values(frame.productIssues).some(issues=>issues.length>0) || frame.rows.some(row=>row.units>0&&row.meter===null));
export function priceMonths(selection:FortalezaSelection) {
  const closing = Number(fortalezaPeriod(selection).end.slice(5,7));
  return Array.from({ length:13 },(_,index) => new Date(Date.UTC(selection.year,closing-13+index,1)).toISOString().slice(0,7));
}
export function productOf(building:Record<string,unknown>):PriceProduct|null {
  if (normalizeMarketText(building.building_type) === 'vertical') return 'vertical';
  const labels = [building.building_subtype,building.subtype,building.product_type,building.horizontal_type,building.standard].map(normalizeMarketText);
  if (labels.includes('loteamento fechado')) return 'closed-lots';
  if (labels.includes('loteamento aberto')) return 'open-lots';
  if (labels.some(label => ['condominio de casas/sobrados','condominio de casas e sobrados','condominio de casas','casas em condominio fechado','casas em condominio','economico','compacto','standard','medio','medio-alto','alto','luxo'].includes(label))) return 'houses';
  return null;
}
/** Historical unit prices only. Root prices/stock never fill a missing historical snapshot. */
export function normalizePriceFrames(source:PriceSource,months:string[]):Record<string,PriceFrame> {
  const frames = Object.fromEntries(months.map(month => [month,{ rows:[],issues:[],productIssues:{} } as PriceFrame]));
  const allIssue = (issue:string) => months.forEach(month => frames[month].issues.push(issue));
  const productIssue = (month:string,product:PriceProduct,issue:string) => { (frames[month].productIssues[product] ??= []).push(issue); };
  const projects = new Map<string,string>();
  for (const building of source.records) {
    const id = String(building.building_id ?? building.id ?? '').trim(), release = marketMonth(building.release_date);
    if (!id || !release || normalizeMarketText(building.city) !== normalizeMarketText(source.city) || normalizeMarketText(building.state ?? building.uf) !== 'ce' || normalizeMarketText(building.building_type) !== normalizeMarketText(source.segment)) { allIssue('Há empreendimento sem identidade, data ou recorte válido.'); continue; }
    const fingerprint = historyFingerprint(Object.fromEntries(Object.entries(building).filter(([key]) => !key.startsWith('__panorama'))));
    if (projects.has(id)) { if (projects.get(id) !== fingerprint) allIssue(`Empreendimento ${id}: cadastro duplicado conflitante.`); continue; }
    projects.set(id,fingerprint);
    if (release > months.at(-1)!) continue;
    if ([building.building_subtype,building.subtype,building.product_type,building.standard].map(normalizeMarketText).some(label => ['condominio de chacaras','terreno','loteamento comercial'].includes(label))) continue;
    const product = productOf(building);
    if (!product) { allIssue(`Empreendimento ${id}: produto não identificado para preços.`); continue; }
    if (!Array.isArray(building.typologies_history)) { months.filter(month => month >= release).forEach(month => productIssue(month,product,`Empreendimento ${id}: histórico por tipologia ausente.`)); continue; }
    const metadata = new Map<string,string|null>();
    for (const raw of Array.isArray(building.typologies) ? building.typologies : []) {
      if (raw && typeof raw === 'object') { const value = raw as Record<string,unknown>; metadata.set(String(value.id ?? value.typology_id ?? ''),typeof value.type_of_typology === 'string' ? value.type_of_typology : null); }
    }
    const seen = new Map<string,string>(), observed = new Set<string>();
    for (const raw of building.typologies_history) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { months.forEach(month => productIssue(month,product,`Empreendimento ${id}: linha histórica inválida.`)); continue; }
      const row = raw as Record<string,unknown>, month = marketMonth(row.period);
      if (!month) { months.forEach(month => productIssue(month,product,`Empreendimento ${id}: competência inválida.`)); continue; }
      if (!frames[month] || month < release) continue;
      observed.add(month);
      const typology = String(row.typology_id ?? '').trim(), identity = `${month}/${typology}`, signature = historyFingerprint(row);
      if (!typology) { productIssue(month,product,`Empreendimento ${id}: tipologia sem ID.`); continue; }
      if (seen.has(identity)) { if (seen.get(identity) !== signature) productIssue(month,product,`Empreendimento ${id}: tipologia/mês conflitante.`); continue; }
      seen.set(identity,signature);
      const units = readMonthlyNumber(row.typology_stock,false,true), explicit = row.price_private_area;
      const price = readMonthlyNumber(row.price), area = readMonthlyNumber(row.private_area);
      const meter = explicit === null || explicit === undefined || explicit === '' ? price !== null && area !== null && area > 0 ? price / area : null : readMonthlyNumber(explicit);
      const category = typeof row.type_of_typology === 'string' && row.type_of_typology.trim() ? row.type_of_typology : metadata.get(typology) ?? null;
      if (units === null) { productIssue(month,product,`Empreendimento ${id}: estoque histórico ausente ou inválido.`); continue; }
      frames[month].rows.push({ project:id,typology,product,units,meter:meter !== null && meter > 0 ? meter : null,category });
    }
    for (const month of months) if (month >= release && !observed.has(month)) productIssue(month,product,`Empreendimento ${id}: fotografia ${month} ausente. Não usamos o cadastro atual como substituto.`);
  }
  return frames;
}
const blockPrice = (issue:string):PriceSlideData => ({ status:'blocked',issue,warnings:[],series:[],changes:[],sourceKeys:[] });
function framePrice(source:PriceSource,month:string,product:PriceProduct,excludeSpecial:boolean) {
  const frame = source.frames[month];
  if (!source.complete || !frame) throw new Error(source.issue ?? `${source.city}: fonte de preços não concluída.`);
  if (frame.issues.length) throw new Error(`${source.city}: ${frame.issues[0]}`);
  if (frame.productIssues[product]?.length) throw new Error(`${source.city}: ${frame.productIssues[product]![0]}`);
  let weighted = 0,units = 0;
  for (const row of frame.rows.filter(row => row.product === product && row.units > 0)) {
    if (excludeSpecial) {
      if (!row.category) throw new Error(`${source.city}: tipo de tipologia ausente; não foi possível aplicar as exclusões do slide40.`);
      if (/\b(coberturas?|lajes?|duplex|gardens?)\b/.test(normalizeMarketText(row.category))) continue;
    }
    if (row.meter === null) throw new Error(`${source.city}: há unidade ofertada sem preço/m² histórico válido.`);
    weighted += row.meter * row.units; units += row.units;
  }
  if (!Number.isSafeInteger(units) || !Number.isFinite(weighted) || Math.abs(weighted) > Number.MAX_SAFE_INTEGER / 100) throw new Error('O cálculo de preços excede a precisão segura.');
  return { value:units ? weighted / units : null,units,weighted };
}
/** Candidate weighting: average of each available unit's R$/m², weighted by historical positive stock. */
export function buildPriceSlide(page:number,collection:PriceCollection|null,selection:FortalezaSelection,cities:string[]):PriceSlideData {
  const rm = page >= 40 && page <= 43, required = rm ? FORTALEZA_CITIES.filter(city => city !== 'Fortaleza') : ['Fortaleza'];
  if (![37,38,40,41,42,43].includes(page)) return blockPrice('Slide sem contrato de preço.');
  if (required.some(city => !cities.some(value => normalizeMarketText(value) === normalizeMarketText(city)))) return blockPrice('O recorte não inclui todos os municípios desta análise.');
  const months = priceMonths(selection), sourceKeys:string[] = [];
  const getSource = (city:string,segment:'Vertical'|'Horizontal') => {
    const matches = collection?.sources.filter(source => normalizeMarketText(source.city) === normalizeMarketText(city) && source.segment === segment) ?? [];
    if (matches.length !== 1 || !matches[0].complete) throw new Error(`${city}/${segment}: histórico de preços não concluído.`);
    const source = matches[0]; if (!sourceKeys.includes(priceSourceKey(source))) sourceKeys.push(priceSourceKey(source)); return source;
  };
  try {
    if (rm) {
      const product:PriceProduct = ({ 40:'vertical',41:'houses',42:'closed-lots',43:'open-lots' } as const)[page as 40|41|42|43];
      const bars = required.map(city => ({ city,...framePrice(getSource(city,page === 40 ? 'Vertical' : 'Horizontal'),months.at(-1)!,product,page === 40) }));
      if (bars.some(bar => bar.value === null)) return blockPrice('Há município sem oferta positiva elegível. O preço não é preenchido com zero.');
      const units = bars.reduce((sum,bar) => sum + bar.units,0), weighted = bars.reduce((sum,bar) => sum + bar.weighted,0);
      if (!Number.isSafeInteger(units) || !Number.isFinite(weighted) || weighted > Number.MAX_SAFE_INTEGER / 100) return blockPrice('A média regional excede a precisão segura.');
      return { status:'ready',issue:null,warnings:[],series:[],cities:bars.map(bar => ({ city:bar.city,value:bar.value!,units:bar.units })),average:weighted/units,changes:[],sourceKeys };
    }
    const products:PriceProduct[] = page === 37 ? ['vertical'] : ['houses','closed-lots'];
    const source = getSource('Fortaleza',page === 37 ? 'Vertical' : 'Horizontal');
    const series = products.map(product => ({ label:({ vertical:'Residencial Vertical',houses:'Condomínio de Casas', 'closed-lots':'Loteamento Fechado','open-lots':'Loteamento Aberto' })[product],points:months.map(month => ({ month,label:`${new Intl.DateTimeFormat('pt-BR',{ month:'short',timeZone:'UTC' }).format(new Date(`${month}-01T00:00:00Z`)).replace('.','')}/${month.slice(2,4)}`,...framePrice(source,month,product,false) })) }));
    if (series.some(line => line.points.some(point => point.value === null))) return blockPrice('Há mês sem oferta positiva elegível. A série de preços não usa zero para informação ausente.');
    const change = (now:number,before:number) => before > 0 ? (now-before)/before*100 : null;
    return { status:'ready',issue:null,warnings:[],series,changes:series.map(line => ({ month:change(line.points.at(-1)!.value!,line.points.at(-2)!.value!),year:change(line.points.at(-1)!.value!,line.points[0].value!) })),sourceKeys };
  } catch (error) { return blockPrice(error instanceof Error ? error.message : 'Não foi possível conferir os preços históricos.'); }
}
