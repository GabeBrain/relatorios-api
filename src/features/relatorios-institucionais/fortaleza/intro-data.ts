import { httpRequest, type HttpResponse, type RequestOptions } from '@/lib/http-client';
import { requestWithRetry } from '@/features/panorama-secovi-fiergs/lib/request-with-retry';
import { insertBuilding, readBuildingPage } from '@/features/panorama-secovi-fiergs/domain/building-source';
import { fortalezaPeriod, fortalezaScope, type FortalezaSelection } from './model';
import { marketMonth, normalizeMarketText } from './market';

export interface IntroProject { id: string; name: string; date: string; developer: string; city: string; neighborhood: string; type: string; standard: string; chartEligible: boolean | null }
export interface IntroData { status: 'ready' | 'blocked'; projects: IntroProject[]; issues: string[]; requests: number; startedAt: string; finishedAt: string }
export interface IntroBin { label: string; capital: number; rm: number; total: number }
export function buildIntroProject(raw: Record<string, unknown>): IntroProject {
  const type = String(raw.building_type ?? '');
  const subtype = [raw.rawSubtype, raw.rawType, raw.building_subtype, raw.standard, raw.product_type].map(normalizeMarketText).join(' ');
  const horizontal = normalizeMarketText(type) === 'horizontal';
  const chartEligible = !horizontal ? true : /loteamento|chacara/.test(subtype) ? false : /condominio (de )?(casas|sobrados)|casas em condominio/.test(subtype) ? true : null;
  const incorporators = Array.isArray(raw.incorporators) ? raw.incorporators.map(value => value && typeof value === 'object' ? String((value as Record<string, unknown>).name ?? '') : '').filter(Boolean) : [];
  const date = String(raw.release_date ?? '').slice(0, 10);
  if (!marketMonth(date)) throw new Error('Há empreendimento sem data de lançamento válida.');
  return { id: String(raw.building_id ?? raw.id), name: String(raw.name ?? '').trim(), date, developer: incorporators.join(' / ') || String(raw.builder_name ?? ''), city: String(raw.city ?? ''), neighborhood: String(raw.neighborhood ?? ''), type, standard: String(raw.standard ?? ''), chartEligible };
}
export async function fetchFortalezaIntro(selection: FortalezaSelection, authorized: string[], options: {
  token: string; signal?: AbortSignal; onProgress?: (message: string) => void;
  request?: (options: RequestOptions) => Promise<HttpResponse<Record<string, unknown>>>;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}): Promise<IntroData> {
  const scope = fortalezaScope(selection, authorized), startedAt = new Date().toISOString();
  const output: IntroData = { status: 'blocked', projects: [], issues: [], requests: 0, startedAt, finishedAt: '' };
  const check = () => { if (options.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError'); };
  if (!scope.valid || !options.token) return { ...output, issues: ['Confirme o acesso a todos os municípios antes dos slides iniciais.'], finishedAt: new Date().toISOString() };
  const request = options.request ?? (value => httpRequest<Record<string, unknown>>(value));
  const all = new Map<string, Record<string, unknown>>();
  try {
    for (const city of scope.cities) for (const type of ['Vertical', 'Horizontal', 'Comercial']) {
      const distinct = new Map<string, Record<string, unknown>>(); let total: number | null = null, last: number | null = null, received = 0;
      for (let page = 1; page <= 5; page++) {
        check(); options.onProgress?.(`${city} · cadastro ${type.toLowerCase()} · página ${page}`);
        const response = await requestWithRetry(async () => { check(); output.requests++; return request({ url: 'https://geobrain.com.br/public-api/building', query: { city, uf: 'CE', type, page, per_page: 100 }, headers: { Authorization: `Bearer ${options.token}` }, includeAuth: false, signal: options.signal, timeoutMs: 20_000, cache: 'no-store' }); }, { attempts: 2, signal: options.signal, sleep: options.sleep });
        check();
        if (!response.ok || !response.data) throw new Error('O cadastro não respondeu ou não autorizou a consulta.');
        const payload = readBuildingPage(response.data, { city, uf: 'CE' }, page, 'fortaleza-building');
        if (payload.total === null || payload.lastPage > 5 || payload.buildings.length > 100 || (last !== null && (last !== payload.lastPage || total !== payload.total))) throw new Error('O cadastro não confirmou cobertura estável dentro do limite curto de cinco páginas.');
        total ??= payload.total; last ??= payload.lastPage;
        if (page < last && !payload.buildings.length) throw new Error('Há página intermediária vazia no cadastro.');
        for (const building of payload.buildings) {
          if (normalizeMarketText(building.city) !== normalizeMarketText(city) || normalizeMarketText(building.state ?? building.uf) !== 'ce' || normalizeMarketText(building.building_type) !== normalizeMarketText(type)) throw new Error('O cadastro retornou município ou segmento fora do recorte.');
          insertBuilding(distinct, building);
        }
        received += payload.buildings.length;
        if (page === last) {
          if (received !== total || distinct.size !== total) throw new Error('O cadastro não comprovou todos os IDs distintos.');
          for (const building of distinct.values()) {
            const key = `${normalizeMarketText(city)}/${String(building.building_id ?? building.id)}`;
            if (all.has(key)) throw new Error('Um empreendimento apareceu em mais de um segmento.');
            all.set(key, building);
          }
          break;
        }
      }
    }
    output.projects = [...all.values()].map(buildIntroProject).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
    output.status = 'ready';
    if (output.projects.some(project => project.chartEligible === null)) output.issues.push('Há horizontais sem identificação explícita de casas/sobrados ou loteamentos; o gráfico de empreendimentos permanece indisponível.');
    output.issues.push('O cadastro é a fotografia atual; amostra histórica e empresas pesquisadas não são deduzidas desse total.');
    output.issues.push('Listas e séries são prévias do cadastro atual: datas de início de vendas, fases e exclusões históricas ainda precisam de conferência. Zero no catálogo não comprova ausência de lançamento no passado.');
  } catch (error) {
    check(); output.projects = [];
    output.issues = [error instanceof Error && !/token|password|bearer|private|https?:/i.test(error.message) ? error.message : 'Não foi possível conferir o cadastro dos slides iniciais.'];
  }
  output.finishedAt = new Date().toISOString(); return output;
}
export function introLaunchLists(data: IntroData | null, selection: FortalezaSelection) {
  if (data?.status !== 'ready') return { capital: [], rm: [] };
  const end = fortalezaPeriod(selection).end;
  const projects = data.projects.filter(project => project.date >= `${selection.year}-01-01` && project.date <= end);
  return { capital: projects.filter(project => normalizeMarketText(project.city) === 'fortaleza'), rm: projects.filter(project => normalizeMarketText(project.city) !== 'fortaleza') };
}
export function introBins(data: IntroData | null, selection: FortalezaSelection): { history: IntroBin[]; accumulated: IntroBin[] } | null {
  if (data?.status !== 'ready' || selection.territory !== 'capital-rm' || data.projects.some(project => project.chartEligible === null)) return null;
  const endMonth = selection.periodicity === 'monthly' ? selection.position : selection.position * 3;
  const count = (start: string, end: string, label: string): IntroBin => {
    const values = data.projects.filter(project => project.chartEligible && project.date >= start && project.date <= end);
    const capital = values.filter(project => normalizeMarketText(project.city) === 'fortaleza').length;
    return { label, capital, rm: values.length - capital, total: values.length };
  };
  const history: IntroBin[] = [];
  const window = (year: number, position: number) => {
    const first = selection.periodicity === 'monthly' ? position : position * 3 - 2;
    const last = selection.periodicity === 'monthly' ? position : position * 3;
    return { start: `${year}-${String(first).padStart(2, '0')}-01`, end: new Date(Date.UTC(year, last, 0)).toISOString().slice(0, 10) };
  };
  const size = selection.periodicity === 'monthly' ? 25 : 9;
  for (let offset = size - 1; offset >= 0; offset--) {
    const date = new Date(Date.UTC(selection.year, endMonth - 1 - offset * (selection.periodicity === 'monthly' ? 1 : 3), 1));
    const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1, position = selection.periodicity === 'monthly' ? month : Math.ceil(month / 3);
    const period = window(year, position);
    const label = selection.periodicity === 'monthly' ? `${new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '')}/${String(year).slice(2)}` : `${position}T/${year}`;
    history.push(count(period.start, period.end, label));
  }
  const accumulated = [selection.year - 1, selection.year].map(year => {
    const period = window(year, selection.position);
    const last = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, endMonth - 1, 1))).replace('.', '');
    return count(`${year}-01-01`, period.end, selection.periodicity === 'quarterly' && endMonth === 6 ? `1S ${year}` : `Jan-${last}/${year}`);
  });
  return { history, accumulated };
}
