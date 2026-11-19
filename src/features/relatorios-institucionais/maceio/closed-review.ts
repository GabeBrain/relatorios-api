import { MACEIO_PRODUCT_FIELDS, maceioHorizontalProduct } from './classification';
import { marketMonth, normalizeMarketText } from './market';
import { maceioCities, maceioPeriod, type MaceioSelection } from './model';
import type { MaceioMarketSlidesData } from './market-slides-data';
import type { MarketRow } from './market';

export interface MaceioProductReviewProject {
  city:string;id:string;name:string;reason:string;values:string[];release:string;
  evidence:{observations:number;bedrooms:string[];areas:string[];garages:string[];hint:'houses'|'lots'|'mixed'|'insufficient'};
}

/** Explicitly requested identifying list, kept separate from the aggregate diagnostic. */
export function buildMaceioClosedReview(selection: MaceioSelection, data: MaceioMarketSlidesData | null) {
  const end = maceioPeriod(selection).end.slice(0, 7), cities = maceioCities(selection.periodicity);
  const sources = data?.end === end ? data.horizontal ?? [] : [];
  const missingCities: string[] = [];
  const projects: MaceioProductReviewProject[] = [];
  const automaticProjects: MaceioProductReviewProject[] = [];
  const seen = new Set<string>();
  const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  for (const city of cities) {
    const matches = sources.filter(source => source.metric === 'details' && normalizeMarketText(source.city) === normalizeMarketText(city));
    if (matches.length !== 1 || !matches[0].complete) missingCities.push(city);
    for (const source of matches) for (const building of source.rows) {
      if (normalizeMarketText(building.city) !== normalizeMarketText(city) || building.state !== 'AL' || normalizeMarketText(building.building_type) !== 'horizontal') continue;
      if (maceioHorizontalProduct(building)) continue;
      const automatic=Boolean(maceioHorizontalProduct(building,end));
      const values=MACEIO_PRODUCT_FIELDS.map(field=>text(building[field]));
      const reason=automatic?'Condomínio de Casas/Sobrados por quartos positivos na competência':values.some(Boolean)?'Rótulos sem correspondência com o tipo de produto':'Campos de produto não informados';
      const release = marketMonth(building.release_date);
      if (release && release > end) continue;
      const id = text(building.building_id ?? building.id), name = text(building.name) || text(building.building_name) || 'Nome não informado';
      const key = id ? `${normalizeMarketText(city)}/${id}` : '';
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      const observations=(Array.isArray(building.typologies_history)?building.typologies_history as MarketRow[]:[]).filter(row=>row&&marketMonth(row.period)===end);
      const labels=(field:string)=>[...new Set(observations.map(row=>text(row[field])).filter(Boolean))].sort();
      const bedrooms=labels('number_bedroom'),numbers=bedrooms.map(value=>/^\d+(?:\.\d+)?$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):null);
      const hasBedrooms=numbers.some(value=>value!==null&&value>0),hasZero=numbers.includes(0);
      (automatic?automaticProjects:projects).push({ city, id, name, reason, values, release: release ?? 'Não informada',
        evidence:{observations:observations.length,bedrooms,areas:labels('private_area'),garages:labels('garage'),hint:hasBedrooms?(hasZero?'mixed':'houses'):hasZero?'lots':'insufficient'} });
    }
  }
  projects.sort((a, b) => a.city.localeCompare(b.city, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
  automaticProjects.sort((a,b)=>a.city.localeCompare(b.city,'pt-BR')||a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id));
  // Quote every cell, escape quotes and neutralize spreadsheet formulas from source strings.
  const cell = (value: string) => `"${(/^\s*[=+@\-\t\r\n]/.test(value) ? "'" : '') + value.replace(/"/g, '""')}"`;
  const complete = missingCities.length === 0;
  const rows = projects.map(project => [end, complete ? 'Completa' : 'Parcial', project.city, project.id, project.name, project.reason, ...project.values, project.release]);
  const csv = '\uFEFF' + [['Referência', 'Coleta', 'Município', 'ID', 'Empreendimento', 'Motivo da conferência', ...MACEIO_PRODUCT_FIELDS, 'Lançamento'], ...rows].map(row => row.map(cell).join(';')).join('\r\n');
  return { complete, missingCities, count: projects.length, csv, projects,automaticProjects };
}

export type MaceioClosedReview = ReturnType<typeof buildMaceioClosedReview>;
