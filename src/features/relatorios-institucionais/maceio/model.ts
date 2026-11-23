import originals from './references.json';

export const MACEIO_ROUTE = '/rebrain/relatorios-institucionais/maceio';
export const MACEIO_UF = 'AL';
/** Recorte comprovado no slide 7 de cada original: a edição mensal (maio/2026) inclui Coqueiro Seco; a trimestral (junho/2T2026) não. */
export const MACEIO_CITIES_MONTHLY = ['Maceió', 'Pilar', 'Marechal Deodoro', 'Paripueira', 'Rio Largo', 'Barra de São Miguel', 'Coqueiro Seco'] as const;
export const MACEIO_CITIES_QUARTERLY = ['Maceió', 'Pilar', 'Marechal Deodoro', 'Paripueira', 'Rio Largo', 'Barra de São Miguel'] as const;
export type Periodicity = 'monthly' | 'quarterly';
export type Territory = 'city' | 'capital-rm';
export interface MaceioSelection {
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
export const MACEIO_REFERENCES = originals;
export function maceioReference(periodicity: Periodicity) {
  const id = periodicity === 'monthly' ? 'maio-2026-mensal' : 'junho-2t2026-trimestral';
  const reference = originals.find(item => item.id === id);
  if (!reference) throw new Error('Referência do modelo Maceió não encontrada.');
  return reference;
}
export function maceioCities(periodicity: Periodicity): readonly string[] {
  return periodicity === 'monthly' ? MACEIO_CITIES_MONTHLY : MACEIO_CITIES_QUARTERLY;
}
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('pt-BR');

export function maceioScope(selection: MaceioSelection, authorizedCities: string[]) {
  const study = maceioCities(selection.periodicity);
  const requested = selection.territory === 'capital-rm' ? [...study] : [selection.city];
  const supported = selection.uf === MACEIO_UF && requested.every(city => study.some(value => normalize(value) === normalize(city)));
  const missing = requested.filter(city => !authorizedCities.some(value => normalize(value) === normalize(city)));
  // Keep the provider spelling when a canonical city is authorized. Never add an unmonitored city.
  const cities = requested.map(city => authorizedCities.find(value => normalize(value) === normalize(city)) ?? city);
  return { supported, missing, cities, valid: supported && !missing.length && Boolean(selection.city) };
}

export function maceioPeriod(selection: Pick<MaceioSelection, 'periodicity' | 'year' | 'position'>) {
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

/** Titles follow the selected edition; original titles remain in provenance. */
export function maceioSlideTitle(page:number,selection:MaceioSelection){
  const original=maceioReference(selection.periodicity).slides[page-1]?.title??'';
  const month=maceioPeriod(selection).end.slice(0,7),date=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`));
  return original.replace(/\bRAKING\b/g,'RANKING')
    .replace(/\b[1-4]T\s*20\d{2}\b/gi,`${selection.position}T${selection.year}`)
    .replace(/\b(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*\/?\s*20\d{2}\b/gi,date);
}

/** Calendar closure in the study's timezone; not a claim of source coverage. */
export function maceioPeriodIsClosed(selection:Pick<MaceioSelection,'periodicity'|'year'|'position'>,now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',timeZone:'America/Sao_Paulo'}).formatToParts(now);
  const current=`${parts.find(part=>part.type==='year')!.value}-${parts.find(part=>part.type==='month')!.value}`;
  return maceioPeriod(selection).end.slice(0,7)<current;
}

export interface MaceioBlueprint {
  status: 'structure-only';
  createdAt: string;
  selection: MaceioSelection;
  cities: string[];
  period: ReturnType<typeof maceioPeriod>;
  reference: typeof originals[number];
  pages: (ReferenceSlide & { status: 'source-pending' | 'editorial-pending' })[];
}

/** Local composition only: no market data, network calls or report export. */
export async function prepareMaceioBlueprint(
  selection: MaceioSelection,
  authorizedCities: string[],
  options: { signal?: AbortSignal; onProgress?: (completed: number, total: number) => void; yieldControl?: () => Promise<void> } = {},
): Promise<MaceioBlueprint> {
  const scope = maceioScope(selection, authorizedCities);
  if (!scope.valid) {
    const total = maceioCities(selection.periodicity).length;
    throw new Error(`Selecione um município do estudo autorizado pelo seu acesso. O conjunto completo exige os ${total} municípios da edição.`);
  }
  const period = maceioPeriod(selection);
  const reference = maceioReference(selection.periodicity);
  const pages: MaceioBlueprint['pages'] = [];
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
