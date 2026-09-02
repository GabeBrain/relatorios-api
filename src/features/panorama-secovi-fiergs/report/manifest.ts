import type { MethodStatus } from '../types';
import { buildMapTilePlan, type GeographicPoint } from '../lib/map-tiles';

export type PanoramaVisualFamily = 'cover' | 'static' | 'divider' | 'summary' | 'comparison-table' | 'trend-chart' | 'market-table' | 'participation' | 'price' | 'matrix' | 'narrative' | 'map' | 'closing';
export type CityComparisonKind = 'sales' | 'market' | 'availability';
export interface ReportPageDefinition { page: number; referenceSlide: number; sectionId: string; title: string; intention: string; visualFamily: PanoramaVisualFamily; contractKeys: string[]; methodologyStatus: MethodStatus | 'not_applicable'; cityComparison?: CityComparisonKind; }
export interface PanoramaSection { id: string; label: string; start: number; end: number; }

const SECTION_LABELS: Record<string, string> = {
  about: 'Sobre o SECOVI-SP', launches: 'Análise de Lançamentos', sales: 'Análise de Vendas',
  market: 'Análise Geral do Mercado', vertical: 'Análise do Mercado Residencial Vertical',
  horizontal: 'Análise do Mercado Residencial Horizontal', vgv: 'Análise do VGV Geral',
  observations: 'Análises e Observações Sobre o Mercado', location: 'Localização dos Empreendimentos',
  consultants: 'Consultores do Estudo',
};

function sectionIdForReference(referenceSlide: number): string {
  if (referenceSlide <= 10) return 'about';
  if (referenceSlide <= 19) return 'launches';
  if (referenceSlide <= 27) return 'sales';
  if (referenceSlide <= 29) return 'market';
  if (referenceSlide <= 46) return 'vertical';
  if (referenceSlide <= 49) return 'horizontal';
  if (referenceSlide <= 51) return 'vgv';
  if (referenceSlide <= 54) return 'observations';
  if (referenceSlide === 55 || referenceSlide === 56) return 'location';
  return 'consultants';
}

type Definition = [string, string, PanoramaVisualFamily, string[], MethodStatus | 'not_applicable'];
const pages: Definition[] = [
  ['Pesquisa de mercado','Capa de pesquisa','cover',[],'not_applicable'],['Piracicaba','Capa municipal','cover',[],'not_applicable'],['Visão, missão e valores','Institucional','static',[],'not_applicable'],['Panorama imobiliário de {cidade}','Abertura da praça','cover',[],'not_applicable'],['Sumário','Orientação de leitura','summary',[],'not_applicable'],['Sobre o SECOVI-SP','Abertura institucional','divider',[],'not_applicable'],['Sobre o SECOVI-SP','Institucional','static',[],'not_applicable'],['Política da qualidade','Institucional','static',[],'not_applicable'],['Objetivos','Abertura','divider',[],'not_applicable'],['Objetivos do estudo','Objetivos editoriais','static',[],'not_applicable'],
  ['Análise de lançamentos','Abertura de bloco','divider',[],'not_applicable'],['Lançamentos por trimestre','Tabela comparativa','comparison-table',['launch.projects','launch.units','launch.vgv'],'reconciled'],['Lançamentos por ano','Tabela anual','comparison-table',['launch.projects','launch.units','launch.vgv'],'reconciled'],['Empreendimentos por trimestre e tipo','Série de empreendimentos','trend-chart',['launch.projects'],'reconciled'],['Empreendimentos verticais por padrão','Série por padrão','trend-chart',['launch.projects'],'reconciled'],['Unidades lançadas por trimestre e tipo','Série de unidades','trend-chart',['launch.units'],'reconciled'],['Unidades verticais por padrão','Série por padrão','trend-chart',['launch.units'],'reconciled'],['VGV lançado por trimestre e tipo','Série de VGV','trend-chart',['launch.vgv'],'open_method'],['VGV vertical por padrão','Série por padrão','trend-chart',['launch.vgv'],'open_method'],
  ['Análise de vendas','Abertura de bloco','divider',[],'not_applicable'],['Vendas por trimestre','Tabela comparativa','comparison-table',['sales.units','sales.vgv'],'assumed'],['Vendas por ano','Tabela anual','comparison-table',['sales.units','sales.vgv'],'assumed'],['Unidades vendidas por trimestre e tipo','Série de vendas','trend-chart',['sales.units'],'assumed'],['VGV vendido por trimestre e tipo','Série de VGV vendido','trend-chart',['sales.vgv'],'assumed'],['Unidades verticais vendidas por padrão','Série por padrão','trend-chart',['sales.units'],'assumed'],['VGV vertical vendido por padrão','Série por padrão','trend-chart',['sales.vgv'],'assumed'],['Oferta, lançamentos, vendas e IVV por área útil','Matriz de mercado','matrix',['ivv'],'reconciled'],
  ['Análise geral do mercado','Abertura de bloco','divider',[],'not_applicable'],['Mercado: vertical, horizontal e total','Resumo executivo','matrix',['stock.units','availability'],'assumed'],['Mercado residencial vertical','Abertura de bloco','divider',[],'not_applicable'],['Oferta lançada e final por padrão','Tabela de estoque','market-table',['stock.units','availability'],'assumed'],['Participação da oferta por padrão','Participação','participation',['stock.units'],'assumed'],['Oferta por coorte de lançamento','Coortes','market-table',['cohorts'],'open_method'],['Oferta por tipologia','Tipologias','market-table',['stock.units'],'assumed'],['Participação da oferta por tipologia','Participação','participation',['stock.units'],'assumed'],['Ticket, área e R$/m² por tipologia','Indicadores de preço','price',['prices'],'open_method'],['Preço por m² por tipologia','Gráfico de preço','price',['prices'],'open_method'],['Ticket, área e R$/m² por padrão','Indicadores de preço','price',['prices'],'open_method'],['Preço por m² por padrão','Gráfico de preço','price',['prices'],'open_method'],['Preço por m² ao longo do tempo','Série de preço','trend-chart',['prices'],'open_method'],['Oferta por ano e padrão','Matriz de coorte','matrix',['cohorts'],'open_method'],['Participação por ano e padrão','Participação','participation',['cohorts'],'open_method'],['Tempo de mercado e maturidade por padrão','Maturidade','market-table',['maturity'],'open_method'],['Participação por maturidade e padrão','Participação','participation',['maturity'],'open_method'],['Tempo de mercado e maturidade por tipologia','Maturidade','market-table',['maturity'],'open_method'],['Participação por maturidade e tipologia','Participação','participation',['maturity'],'open_method'],
  ['Mercado residencial horizontal','Abertura de bloco','divider',[],'not_applicable'],['Oferta horizontal por coorte','Coortes','market-table',['cohorts'],'open_method'],['Ticket, área e R$/m² horizontal','Indicadores de preço','price',['prices'],'open_method'],['VGV geral','Abertura de bloco','divider',[],'not_applicable'],['VGV ofertado, disponível e vendido por padrão','Matriz de VGV','matrix',['stock.vgv'],'open_method'],['Análises e observações','Abertura de bloco','divider',[],'not_applicable'],['Análise de mercado','Narrativa orientada por dados','narrative',['narrative.facts'],'assumed'],['Análise de mercado','Narrativa orientada por dados','narrative',['narrative.facts'],'assumed'],['Localização dos empreendimentos','Abertura de bloco','divider',[],'not_applicable'],['Mapa de empreendimentos verticais','Visualização geográfica','map',['locations'],'open_method'],['Consultores do estudo','Abertura','divider',[],'not_applicable'],['Créditos','Equipe e fontes','static',[],'not_applicable'],['Brain Inteligência Estratégica','Encerramento','closing',[],'not_applicable'],['Panorama imobiliário','Encerramento','closing',[],'not_applicable'],['Obrigado','Encerramento','closing',[],'not_applicable'],['Fontes, premissas e rastreabilidade','Encerramento técnico','closing',[],'not_applicable'],
];

// A lâmina institucional de visão/missão/valores (referência 3) ocupa a posição 6 no deck final.
// `page` é sempre a posição de saída; `referenceSlide` mantém a identidade editorial original.
const outputReferenceSlides = [1, 2, 4, 5, 6, 7, 3, 8, 9, 10, ...Array.from({ length: 52 }, (_, index) => index + 11)]
  // Apenas a referência 60 é encerramento V2: 61 e 62 são cópias do mesmo fundo.
  // A referência 56 (mapa) voltou ao livro: JG-39 exige que ela exista quando carrega e que
  // desapareça junto com o divisor 55 quando não carrega — nunca um divisor órfão sem mapa.
  .filter((referenceSlide) => ![1, 4, 61, 62].includes(referenceSlide));

const baseManifest = (): ReportPageDefinition[] => outputReferenceSlides.map((referenceSlide, index) => {
  const page = index + 1;
  const [title, intention, visualFamily, contractKeys, methodologyStatus] = pages[referenceSlide - 1];
  return { page, referenceSlide, sectionId: sectionIdForReference(referenceSlide), title, intention, visualFamily, contractKeys, methodologyStatus };
});

const comparisonDefinitions: Omit<ReportPageDefinition, 'page'>[] = [
  { referenceSlide: 0, sectionId: 'market', title: 'Unidades vendidas por cidade', intention: 'Comparativo municipal de vendas', visualFamily: 'comparison-table', contractKeys: ['cityComparisons.sales'], methodologyStatus: 'reconciled', cityComparison: 'sales' },
  { referenceSlide: 0, sectionId: 'market', title: 'Análise geral do mercado por cidade', intention: 'Comparativo municipal de oferta e disponibilidade', visualFamily: 'comparison-table', contractKeys: ['cityComparisons.market'], methodologyStatus: 'reconciled', cityComparison: 'market' },
  { referenceSlide: 0, sectionId: 'market', title: 'Disponibilidade por padrão e cidade', intention: 'Comparativo municipal de disponibilidade vertical', visualFamily: 'comparison-table', contractKeys: ['cityComparisons.availabilityByStandard'], methodologyStatus: 'reconciled', cityComparison: 'availability' },
];

/** Comparativos entram somente quando todas as cidades do recorte foram coletadas. */
export function createPanoramaReportManifest(options: boolean | { includeCityComparisons?: boolean; includeHorizontal?: boolean; includeMap?: boolean } = false): ReportPageDefinition[] {
  const resolved = typeof options === 'boolean' ? { includeCityComparisons: options } : options;
  const output = baseManifest().filter((page) => (resolved.includeHorizontal !== false || ![47, 48, 49].includes(page.referenceSlide)) && (resolved.includeMap !== false || ![55, 56].includes(page.referenceSlide)));
  if (resolved.includeCityComparisons) {
    const afterMarket = output.findIndex((page) => page.referenceSlide === 29) + 1;
    output.splice(afterMarket, 0, ...comparisonDefinitions);
  }
  return output.map((page, index) => ({ ...page, page: index + 1 }));
}

export function createPanoramaSections(manifest: ReportPageDefinition[]): PanoramaSection[] {
  return Object.entries(SECTION_LABELS).flatMap(([id, label]) => {
    const entries = manifest.filter((page) => page.sectionId === id);
    return entries.length ? [{ id, label, start: entries[0].page, end: entries.at(-1)!.page }] : [];
  });
}

export const PANORAMA_REPORT_MANIFEST = createPanoramaReportManifest();
export const PANORAMA_SECTIONS = createPanoramaSections(PANORAMA_REPORT_MANIFEST);

/* -------------------------------------------------------------------------- */
/* Decisão de inclusão condicional — fonte única de preview, PDF e PPT espelho  */
/* -------------------------------------------------------------------------- */

export interface ManifestSubject {
  provenance: { engineVersion?: 'v2' | 'v3' | 'v4' };
  cube: { projects: { segment: string; finalUnits: number | null }[] };
  locations: GeographicPoint[];
  cityComparisons: { enabled: boolean };
}

/**
 * JG-34 e JG-39 decidem a existência da lâmina **antes** do sumário e da paginação, e o portão
 * transversal exige que preview, PDF e PPT tenham exatamente a mesma contagem e ordem. Por isso a
 * decisão vive aqui, numa função só: quando ela estava repetida em quatro chamadas, bastava um
 * consumidor esquecer um termo para o sumário divergir do arquivo entregue.
 */
export function panoramaManifestOptions(report: ManifestSubject, mapboxAccessToken = ''): { includeCityComparisons: boolean; includeHorizontal: boolean; includeMap: boolean } {
  const horizontal = report.cube.projects.filter((project) => project.segment === 'Horizontal');
  return {
    includeCityComparisons: report.cityComparisons.enabled,
    // JG-34: "se não tiver empreendimentos ativos, essa página precisa ser excluída". Existir no
    // histórico não basta — o bloco só entra com oferta ativa no fechamento selecionado.
    includeHorizontal: (report.provenance.engineVersion !== 'v3' && report.provenance.engineVersion !== 'v4') || horizontal.some((project) => (project.finalUnits ?? 0) > 0),
    // JG-39: o mapa entra apenas quando tiles e marcadores estão prontos; sem isso, o bloco inteiro
    // sai do manifesto em vez de exportar um mapa quebrado.
    includeMap: buildMapTilePlan(report.locations, mapboxAccessToken) !== null,
  };
}

/** Manifesto efetivo de um relatório — o único caminho que os consumidores devem usar. */
export function panoramaManifestFor(report: ManifestSubject, mapboxAccessToken = ''): ReportPageDefinition[] {
  return createPanoramaReportManifest(panoramaManifestOptions(report, mapboxAccessToken));
}
