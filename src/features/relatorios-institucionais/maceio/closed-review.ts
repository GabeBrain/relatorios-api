import { MACEIO_PRODUCT_FIELDS, maceioHorizontalProduct } from './classification';
import { marketMonth, normalizeMarketText } from './market';
import { maceioCities, maceioPeriod, type MaceioSelection } from './model';
import type { MaceioMarketSlidesData } from './market-slides-data';

/** Explicitly requested identifying list, kept separate from the aggregate diagnostic. */
export function buildMaceioClosedReview(selection: MaceioSelection, data: MaceioMarketSlidesData | null) {
  const end = maceioPeriod(selection).end.slice(0, 7), cities = maceioCities(selection.periodicity);
  const sources = data?.end === end ? data.horizontal ?? [] : [];
  const missingCities: string[] = [];
  const projects: { city: string; id: string; name: string; reason: string; values: string[]; release: string }[] = [];
  const seen = new Set<string>();
  const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  for (const city of cities) {
    const matches = sources.filter(source => source.metric === 'details' && normalizeMarketText(source.city) === normalizeMarketText(city));
    if (matches.length !== 1 || !matches[0].complete) missingCities.push(city);
    for (const source of matches) for (const building of source.rows) {
      if (normalizeMarketText(building.city) !== normalizeMarketText(city) || building.state !== 'AL' || normalizeMarketText(building.building_type) !== 'horizontal') continue;
      if (maceioHorizontalProduct(building)) continue;
      const values=MACEIO_PRODUCT_FIELDS.map(field=>text(building[field]));
      const reason=values.some(Boolean)?'Rótulos sem correspondência com o tipo de produto':'Campos de produto não informados';
      const release = marketMonth(building.release_date);
      if (release && release > end) continue;
      const id = text(building.building_id ?? building.id), name = text(building.name) || text(building.building_name) || 'Nome não informado';
      const key = id ? `${normalizeMarketText(city)}/${id}` : '';
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      projects.push({ city, id, name, reason, values, release: release ?? 'Não informada' });
    }
  }
  projects.sort((a, b) => a.city.localeCompare(b.city, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
  // Quote every cell, escape quotes and neutralize spreadsheet formulas from source strings.
  const cell = (value: string) => `"${(/^\s*[=+@\-\t\r\n]/.test(value) ? "'" : '') + value.replace(/"/g, '""')}"`;
  const complete = missingCities.length === 0;
  const rows = projects.map(project => [end, complete ? 'Completa' : 'Parcial', project.city, project.id, project.name, project.reason, ...project.values, project.release]);
  const csv = '\uFEFF' + [['Referência', 'Coleta', 'Município', 'ID', 'Empreendimento', 'Motivo da conferência', ...MACEIO_PRODUCT_FIELDS, 'Lançamento'], ...rows].map(row => row.map(cell).join(';')).join('\r\n');
  return { complete, missingCities, count: projects.length, csv };
}

export type MaceioClosedReview = ReturnType<typeof buildMaceioClosedReview>;
