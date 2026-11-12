import {useSlidePreviewEditing} from '../shared/useSlidePreviewEditing';
import { EditableSlideSurface, SlidePreviewEditor } from '../shared/SlidePreviewEditor';
import FortalezaReportSlide from './FortalezaReportSlide';
import FortalezaPptxExport from './FortalezaPptxExport';
import type { FortalezaGenerationState } from './useFortalezaMarket';
import FortalezaClosingEditor from './FortalezaClosingEditor';
import { createFortalezaEditorial } from './monthly-closing';
import { buildOfferTable } from './monthly-tables';
import { FortalezaTableInsights } from './FortalezaMonthlyTableSlide';
import { buildPriceSlide } from './monthly-prices';
import { buildMonthlyIvv } from './monthly-ivv';
import { FortalezaPriceInsights } from './FortalezaPriceInsights';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FORTALEZA_CITIES, FORTALEZA_REFERENCES, type FortalezaSelection } from './model';
import type { IntroData } from './intro-data';
import { buildIntroView } from './intro-view';
import { introTablePlan } from './intro-layout';
import { monthlyProjectLaunches, monthlyUnitLaunches, type MonthlyLaunchData, type LaunchSeries } from './monthly-launches';
import { buildMonthlySlide } from './monthly-market';
import { FortalezaMonthlyInsights } from './FortalezaMonthlyInsights';
import { quarterlyTableForPage } from './quarterly-details';
import { buildQuarterlyPrice,buildQuarterlyIvv,QUARTERLY_PRICE_PAGES } from './quarterly-analysis';
import { buildQuarterlyLaunchSlide,buildQuarterlyMunicipalTable,buildQuarterlyStockTable } from './quarterly-launches';

function MonthlyLaunchInsights({ page, series, sources }: { page: number; series: LaunchSeries | null; sources: MonthlyLaunchData | null }) {
  return <>
    {series && <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Origem e cálculo deste slide</summary><div className="mt-3 space-y-2 text-muted-foreground">
      <p>{page === 11 ? 'Empreendimentos: IDs distintos do cadastro vertical da capital, agrupados pela data de lançamento. Cadastro atual sujeito a revisão; não comprova amostras históricas.' : 'Unidades: soma de releases_in_period das séries municipais verticais. Todos os meses e municípios desta análise devem estar conferidos; os padrões são os grupos observados na resposta paginada.'}</p>
      <p>Econômico é apresentado separadamente dos demais seis padrões. O gráfico reúne 25 meses. A variação do total compara o mês selecionado com o mesmo mês do ano anterior; as variações por padrão comparam janeiro até esse mês, nos dois anos. Base anterior zero: variação —.</p>
      <p>{series.status === 'ready' ? `Mês selecionado: ${series.history.at(-1)!.total.toLocaleString('pt-BR')}. Acumulado no ano: ${series.accumulated[1].total.toLocaleString('pt-BR')}.` : series.issue}</p>
      {page !== 11 && sources?.sources.filter(item => page === 13 ? item.city === 'Fortaleza' : item.city !== 'Fortaleza').map(item => <p key={item.city}>{item.city}: {item.rows.length} linhas · {item.requests} requisições · coleta {item.complete ? 'concluída' : 'incompleta'} · {item.finishedAt}</p>)}
    </div></details>}
    {sources?.issues.map(issue => <p className="text-xs text-muted-foreground" key={issue}>{issue}</p>)}
  </>;
}

export default function FortalezaIntroSlides({ selection, cities, data, monthlyLaunches = null, generation = null }: { selection: FortalezaSelection; cities: string[]; data: IntroData | null; monthlyLaunches?: MonthlyLaunchData | null; generation?:FortalezaGenerationState|null }) {
  const editingRevision=useMemo(()=>({selection,data,monthlyLaunches}),[selection,data,monthlyLaunches]);
  const editing=useSlidePreviewEditing(editingRevision);
  const [editorial,setEditorial]=useState(createFortalezaEditorial);
  const [requestedPage, setPage] = useState(1), [expanded, setExpanded] = useState(false);
  const page = Math.min(requestedPage,selection.periodicity === 'monthly' ? 60 : 89);
  const model = selection.periodicity === 'monthly' ? 'julho' : 'junho';
  const view = buildIntroView(selection, cities.length ? cities : [...FORTALEZA_CITIES], data);
  const source = FORTALEZA_REFERENCES[model === 'junho' ? 0 : 1];
  const pages = Array.from({ length: model === 'julho' ? 60 : 89 }, (_, index) => index + 1);
  const extended = model === 'julho' && (page === 12 || page === 14 || page >= 16);
  const analysis = model === 'julho' && page >= 36;
  const tablePage = model === 'julho' && page >= 47 && page <= 55 ? Math.min(page,52) : null;
  const tableData = useMemo(() => tablePage ? buildOfferTable(tablePage,monthlyLaunches?.market ?? null,monthlyLaunches?.prices ?? null,selection,cities) : null,[tablePage,monthlyLaunches?.market,monthlyLaunches?.prices,selection,cities]);
  const analysisData = analysis && page <= 46 && ![36,39,44].includes(page) ? page >= 45 ? buildMonthlyIvv(monthlyLaunches?.market ?? null,selection,cities,page === 46) : buildPriceSlide(page,monthlyLaunches?.prices ?? null,selection,cities) : null;
  const monthlyData = extended && !analysis && ![18,21,29,32].includes(page) ? buildMonthlySlide(page,monthlyLaunches?.market ?? null,selection,cities) : null;
  const series = model==='julho'?(page === 11 ? monthlyProjectLaunches(data, selection, cities) : page === 13 || page === 15 ? monthlyUnitLaunches(monthlyLaunches, selection, cities, page === 13 ? 'capital' : 'rm') : null):null;
  const quarterlyData=model==='junho'&&page>=11&&page<=40&&![20,23,33,36].includes(page)?(page===40?buildQuarterlyStockTable(monthlyLaunches?.market??null,selection,cities):[16,19,31,32].includes(page)?buildQuarterlyMunicipalTable(page,monthlyLaunches?.market??null,selection,cities):buildQuarterlyLaunchSlide(page,monthlyLaunches?.market??null,data,selection,cities)):null;
  const quarterlyDetail=model==='junho'&&page>=41&&page<=84&&![41,44,65,70,80].includes(page)?QUARTERLY_PRICE_PAGES[page]?buildQuarterlyPrice(page,monthlyLaunches?.prices??null,selection,cities):page===54||page===72?buildQuarterlyIvv(monthlyLaunches?.market??null,selection,cities,page===72):quarterlyTableForPage(page,{selection,cities,data,monthlyLaunches,editorial}):null;
  const capacity = (start:number,_end:number) => introTablePlan(model,start,(start===3?view.capital:view.rm)?.length??0).capacity;
  const overflow = Math.max(0, (view.capital?.length ?? 0) - capacity(3, 4)) + Math.max(0, (view.rm?.length ?? 0) - capacity(5, 7));
  const pending = quarterlyDetail?.issue ?? quarterlyData?.issue ?? tableData?.issue ?? analysisData?.issue ?? monthlyData?.issue ?? (series ? series.issue : page === 2 && !view.sampleMethod ? 'Amostra histórica e empresas pesquisadas aguardam fonte própria; não são copiadas da edição antiga.' : page >= 3 && page <= 4 && cities.length && !cities.includes('Fortaleza') ? 'Fortaleza não integra o recorte escolhido; a lista da capital permanece indisponível.' : page >= 5 && page <= 7 && cities.length === 1 && cities[0] === 'Fortaleza' ? 'Municípios da região metropolitana não integram o recorte escolhido.' : page >= 3 && page <= 7 && data?.status !== 'ready' ? 'Lista de lançamentos ainda indisponível. Gere a prévia para conferir o cadastro.' : page === 10 && !view.history ? 'Gráfico de empreendimentos indisponível. Exige o conjunto completo de cinco cidades, cadastro conferido e classificação horizontal explícita.' : null);
  const navigation = <nav className="flex flex-wrap gap-2" aria-label="Slides implementados"><Button variant="outline" disabled={page === 1} onClick={() => setPage(pages[pages.indexOf(page) - 1])}>Anterior</Button>{pages.map(number => <Button key={number} variant={page === number ? 'default' : 'outline'} aria-pressed={page === number} onClick={() => setPage(number)}>{number}</Button>)}<Button variant="outline" disabled={page === pages.at(-1)} onClick={() => setPage(pages[pages.indexOf(page) + 1])}>Próximo</Button></nav>;
  const closing=model === 'julho' ? page>=56 : page>=85;
  const renderSlide=(number:number,interactive=false)=><EditableSlideSurface page={number} edits={editing.edits[number]} enabled={interactive&&editing.enabled} onElements={interactive?editing.setElements:undefined} onSelect={interactive?editing.setSelected:undefined}><FortalezaReportSlide page={number} selection={selection} cities={cities} data={data} monthlyLaunches={monthlyLaunches} editorial={editorial}/></EditableSlideSurface>;
  const slide = <div className="overflow-hidden border bg-white shadow-sm">{renderSlide(page,true)}</div>;
  const cityKey=cities.join('|');
  const exportRevision=useMemo(()=>({periodicity:selection.periodicity,year:selection.year,position:selection.position,cityKey,data,monthlyLaunches,editorial,finishedAt:generation?.finishedAt,edits:editing.edits}),[selection.periodicity,selection.year,selection.position,cityKey,data,monthlyLaunches,editorial,generation?.finishedAt,editing.edits]);
  return <section className="space-y-4" aria-label="Slides implementados Fortaleza"><header><h2 className="text-lg font-semibold">Slides do relatório · {selection.periodicity === 'monthly' ? 'Mensal' : 'Trimestral'}</h2><p className="text-sm text-muted-foreground">Arte, tabelas e medidas extraídas do original {source.label}. Os campos variáveis usam o recorte escolhido; números do original não são usados como dados novos.</p></header>{navigation}<SlidePreviewEditor page={page} state={editing}/>{<FortalezaPptxExport selection={selection} generation={generation} renderSlide={renderSlide} overflow={overflow} revision={exportRevision} manualEdits={editing.edits}/>}{closing&&<><p className="text-sm text-muted-foreground">Conteúdo editorial da referência;; revise os responsáveis desta edição.</p><FortalezaClosingEditor page={model==='junho'?page-29:page} value={editorial} onChange={setEditorial}/></>}{page===2&&view.sampleWarnings&&<details className="rounded-lg border p-3 text-sm"><summary>Origem das contagens</summary>{view.sampleWarnings.map(warning=><p key={warning} className="mt-2 text-muted-foreground">{warning}</p>)}</details>}{quarterlyDetail&&<details className="rounded-lg border p-3 text-sm"><summary>Origem e conferência do fechamento</summary><p className="mt-3 text-muted-foreground">Fotografias históricas por empreendimento e tipologia; não usa preços ou capacidade atuais para preencher ausências. Preço ponderado pelas unidades em oferta. Slides 54 e 72 preservam os 25 IVVs mensais do original: vendas líquidas do mês ÷ (estoque anterior ao mês + lançamentos do mês); média aritmética dessas 25 taxas. As tabelas de bairros e município preservam a comparação mensal de fechamento do original. Localização esquemática por coordenadas; páginas 50–53 separam quatro quadrantes do mesmo conjunto, sem reproduzir mapas históricos.</p>{quarterlyDetail.warnings.map(warning=><p key={warning}>{warning}</p>)}{quarterlyDetail.issue&&<p>{quarterlyDetail.issue}</p>}</details>}{quarterlyData&&<details className="rounded-lg border p-3 text-sm"><summary>Origem e cálculo trimestral</summary><p className="mt-3 text-muted-foreground">Nove trimestres completos; fluxos somados após conferência mensal. Variação do trimestre contra o mesmo trimestre do ano anterior; acumulado de janeiro até o fechamento nos dois anos. Tabelas municipais dos slides 16 e 19 usam somente o mês de fechamento. VGV histórico atualizado pelo INCC-DI; tabela do fechamento em valores nominais. Estoque não é acumulado. Base anterior zero: variação —.</p>{quarterlyData.issue&&<p>{quarterlyData.issue}</p>}</details>}<MonthlyLaunchInsights page={page} series={series} sources={monthlyLaunches} /><FortalezaTableInsights page={page} data={tableData} /><FortalezaPriceInsights page={page} data={analysisData} prices={monthlyLaunches?.prices ?? null} /><FortalezaMonthlyInsights page={page} data={monthlyData} market={monthlyLaunches?.market ?? null} /><p className="text-sm">Slide {page} · {source.slides[page - 1].title}</p>{pending && <p role="status" className="text-sm text-muted-foreground">{pending}</p>}{overflow > 0 && <p className="text-sm text-muted-foreground">{overflow} lançamento(s) adicionais não cabem nas páginas iniciais deste lote; precisam de continuação antes da exportação.</p>}<Button variant="outline" onClick={() => setExpanded(true)}>Ampliar slides</Button>{!expanded && slide}<Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[95dvh] w-[96vw] max-w-7xl overflow-auto"><DialogTitle>Fortaleza · slides implementados</DialogTitle><DialogDescription>Modelo {source.label}; fontes pendentes são identificadas fora da lâmina.</DialogDescription>{navigation}{slide}</DialogContent></Dialog>{data?.issues.map((issue, index) => <p className="text-xs text-muted-foreground" key={index}>{issue}</p>)}</section>;
}
