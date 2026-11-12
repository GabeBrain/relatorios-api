import originals from './references.json';

export const FORTALEZA_ROUTE = '/rebrain/relatorios-institucionais/fortaleza';
export const FORTALEZA_CITIES = ['Fortaleza', 'Aquiraz', 'Caucaia', 'Eusébio', 'Maracanaú'] as const;
export type Periodicity = 'monthly' | 'quarterly';
export type Territory = 'city' | 'capital-rm';
export interface FortalezaSelection {
  uf: string;
  city: string;
  territory: Territory;
  periodicity: Periodicity;
  year: number;
  position: number;
}
export interface ReferenceSlide {
  number: number;
  title: string;
  kind: string;
  charts: number;
  tables: number;
  pictures: number;
}
export const FORTALEZA_REFERENCES = originals;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');

export function fortalezaScope(selection: FortalezaSelection, authorizedCities: string[]) {
  const requested = selection.territory === 'capital-rm' ? [...FORTALEZA_CITIES] : [selection.city];
  const supported = selection.uf === 'CE' && requested.every(city => FORTALEZA_CITIES.some(value => normalize(value) === normalize(city)));
  const missing = requested.filter(city => !authorizedCities.some(value => normalize(value) === normalize(city)));
  // Keep the provider spelling when a canonical city is authorized. Never add an unmonitored city.
  const cities = requested.map(city => authorizedCities.find(value => normalize(value) === normalize(city)) ?? city);
  return { supported, missing, cities, valid: supported && !missing.length && Boolean(selection.city) };
}

export function fortalezaPeriod(selection: Pick<FortalezaSelection, 'periodicity' | 'year' | 'position'>) {
  const { year, position, periodicity } = selection;
  const limit = periodicity === 'monthly' ? 12 : 4;
  if (!Number.isInteger(year) || year < 2021 || year > 9999 || !Number.isInteger(position) || position < 1 || position > limit) {
    throw new Error('Selecione um período válido.');
  }
  const first = periodicity === 'monthly' ? position : (position - 1) * 3 + 1;
  const last = periodicity === 'monthly' ? position : first + 2;
  const month = (value: number) => `${year}-${String(value).padStart(2, '0')}`;
  const lastDay = new Date(Date.UTC(year, last, 0)).getUTCDate();
  const opening = first === 1 ? `${year - 1}-12` : month(first - 1);
  return {
    label: periodicity === 'monthly' ? `${String(position).padStart(2, '0')}/${year}` : `${position}º trimestre de ${year}`,
    start: `${month(first)}-01`, end: `${month(last)}-${lastDay}`, opening,
    months: Array.from({ length: last - first + 1 }, (_, index) => month(first + index)),
  };
}

export interface FortalezaBlueprint {
  status: 'structure-only';
  createdAt: string;
  selection: FortalezaSelection;
  cities: string[];
  period: ReturnType<typeof fortalezaPeriod>;
  reference: typeof originals[number];
  pages: (ReferenceSlide & { status: 'source-pending' | 'editorial-pending' })[];
}

/** Local composition only: no market data, network calls or report export. */
export async function prepareFortalezaBlueprint(
  selection: FortalezaSelection,
  authorizedCities: string[],
  options: { signal?: AbortSignal; onProgress?: (completed: number, total: number) => void; yieldControl?: () => Promise<void> } = {},
): Promise<FortalezaBlueprint> {
  const scope = fortalezaScope(selection, authorizedCities);
  if (!scope.valid) throw new Error('Selecione um município do estudo autorizado pelo seu acesso. O conjunto completo exige os cinco municípios.');
  const period = fortalezaPeriod(selection);
  const reference = originals[selection.periodicity === 'quarterly' ? 0 : 1];
  const pages: FortalezaBlueprint['pages'] = [];
  const check = () => { if (options.signal?.aborted) throw new DOMException('Preparação cancelada.', 'AbortError'); };
  check();
  for (const slide of reference.slides) {
    check();
    pages.push({ ...slide, status: slide.kind === 'analytical' ? 'source-pending' : 'editorial-pending' });
    if (pages.length % 10 === 0 || pages.length === reference.slides.length) {
      options.onProgress?.(pages.length, reference.slides.length);
      await (options.yieldControl ?? (() => new Promise<void>(resolve => setTimeout(resolve, 0))))();
    }
  }
  check();
  return { status: 'structure-only', createdAt: new Date().toISOString(), selection: { ...selection }, cities: scope.cities, period, reference, pages };
}
