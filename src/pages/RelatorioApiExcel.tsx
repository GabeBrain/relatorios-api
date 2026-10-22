import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, Download, Play, X } from 'lucide-react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { GeoApiScopeSelector, useGeoApiScope } from '@/features/shared/geo-api-scope-engine';
import type { GeoLoadRequest } from '@/features/shared/geo-api-scope-engine/GeoApiScopeSelector';
import { MonthField } from '@/features/relatorio-api-excel/MonthField';
import { fetchBuildings, type FetchProgress, type RawBuilding } from '@/features/relatorio-api-excel/api';
import { buildReport, createWorkbook, dateBounds, exportValue, monthStart, MEASURES, VGV_UNITS, PERCENT_COLUMNS, REPORT_FIELDS, municipalityKey, selectReportFields,
  type Cell, type Granularity, type Layout, type PriceMode, type BuildingAverageMode, type Report, type ReportOptions, type VgvScale } from '@/features/relatorio-api-excel/report';

const PAGE_SIZE = 100;
const EMPTY_REPORT: Report = { columns: [], rows: [], periods: [], series: [], typologyCount: 0 };
const BUILDING_TYPES = ['Vertical', 'Comercial', 'Horizontal', 'Hotel'];
function display(column: string, value: Cell, scale: VgvScale = 'standard') {
  const result = exportValue(column, value, scale);
  if (result === null) return '';
  if (typeof result !== 'number') return result;
  if (PERCENT_COLUMNS.has(column)) return result.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 });
  return result.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: column.startsWith('VGV') ? 2 : 0 });
}

export default function RelatorioApiExcel() {
  const token = useAuthStore((state) => state.getToken());
  const [scope, setScope] = useState({ uf: '', city: '' });
  const [region, setRegion] = useState('');
  const [buildings, setBuildings] = useState<RawBuilding[] | null>(null);
  const [loadedScope, setLoadedScope] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [municipalityOpen, setMunicipalityOpen] = useState(false);
  const [buildingTypes, setBuildingTypes] = useState<string[]>(BUILDING_TYPES);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ report: Report; options: ReportOptions; signature: string } | null>(null);
  const revision = useRef(0);
  const generationLock = useRef(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [error, setError] = useState('');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [layout, setLayout] = useState<Layout>('columns');
  const [priceMode, setPriceMode] = useState<PriceMode>('current');
  const [vgvScale, setVgvScale] = useState<VgvScale>('standard');
  const [buildingAverageMode, setBuildingAverageMode] = useState<BuildingAverageMode>('simple');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [columnSearch, setColumnSearch] = useState('');
  const [page, setPage] = useState(0);
  const [metric, setMetric] = useState<string>('Vendas Líquidas');
  const [distribution, setDistribution] = useState('Cidade/UF');
  const controller = useRef<AbortController | null>(null);
  const changeScope = useCallback((next: { uf: string; city: string }) => {
    revision.current++;
    setScope(next); setBuildings(null); setGenerated(null); setError('');
  }, []);
  const geo = useGeoApiScope({ value: scope, onChange: changeScope });
  useEffect(() => {
    const generationRevision = revision;
    generationRevision.current++;
    setBuildings(null); setGenerated(null); setError(''); setLoading(false);
    return () => { generationRevision.current++; controller.current?.abort(); controller.current = null; };
  }, [token]);

  const load = async (request: GeoLoadRequest) => {
    if (loading || generating || exporting || !token || !useAuthStore.getState().hasValidToken()) return;
    if (geo.error || geo.isLoading || !geo.citiesByUf) return;
    if (request.city && !geo.availableCities.includes(request.city)) return;
    if (request.uf && !geo.availableUfs.includes(request.uf)) return;
    if (request.ufs?.some((uf) => !geo.availableUfs.includes(uf))) return;
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    revision.current++;
    setBuildings(null); setGenerated(null); setError(''); setProgress(null); setLoading(true); setStartedAt(Date.now());
    try {
      const complete = await fetchBuildings({ ...request, token, signal: current.signal,
        onProgress: (next) => { if (controller.current === current && !current.signal.aborted) setProgress(next); },
      });
      if (controller.current !== current || current.signal.aborted) return;
      // Guarda a resposta bruta. Históricos e cálculos só são percorridos em Gerar relatório.
      setFrom(''); setTo(''); setMunicipality(''); setBuildingTypes(BUILDING_TYPES);
      setStatuses([...new Set(complete.map((building) => String(building.status ?? '')))]);
      setSelected(null); setPage(0);
      setLoadedScope(request.city || request.uf || request.ufs?.join(', ') || '');
      setBuildings(complete);
      toast.success(`Coleta concluída: ${complete.length} registros. Configure o relatório abaixo.`);
    } catch (cause) {
      if (controller.current === current && !current.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados.');
    } finally { if (controller.current === current) setLoading(false); }
  };
  const options = useMemo(() => ({ granularity, layout, priceMode, buildingAverageMode, vgvScale, periodRange: 'month' as const, from, to, statuses,
    municipalities: municipality ? [municipality] : [], buildingTypes }),
  [granularity, layout, priceMode, buildingAverageMode, vgvScale, from, to, statuses, municipality, buildingTypes]);
  const signature = JSON.stringify({ options, selected });
  const stale = generated !== null && generated.signature !== signature;
  const filtered = generated?.report ?? EMPTY_REPORT;
  const report = filtered;
  const vgvUnit = VGV_UNITS[report.vgvScale ?? 'standard'];
  const availableStatuses = useMemo(() => [...new Set((buildings ?? []).map((building) => String(building.status ?? '')))], [buildings]);
  const municipalities = useMemo(() => [...new Set((buildings ?? []).map(municipalityKey))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [buildings]);
  const fields = REPORT_FIELDS.filter((field) => layout === 'rows' || field !== 'Período');
  const selectedFields = selected === null ? fields : fields.filter((field) => selected.includes(field));
  const maxPage = Math.max(0, Math.ceil(filtered.rows.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, maxPage);
  const pageRows = filtered.rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const chartData = useMemo(() => report.series.map((row) => ({ period: row['Período'], value: exportValue(metric, row[metric] ?? null, report.vgvScale) })), [report, metric]);
  const distributionData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of filtered.typologyRows ?? []) {
      const name = String(row[distribution] || 'Não informado'); counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 20);
  }, [distribution, filtered]);
  const generate = async () => {
    if (!buildings || generationLock.current || loading || exporting || !selectedFields.length) return;
    generationLock.current = true;
    const currentRevision = revision.current;
    setGenerating(true); setStartedAt(Date.now());
    try {
      // Permite pintar o estado de processamento antes do trabalho de CPU.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (revision.current !== currentRevision) return;
      const bounds = !from || !to ? dateBounds(buildings) : null;
      const effective = { ...options, from: monthStart(from || bounds?.from || ''), to: monthStart(to || bounds?.to || '') };
      const complete = buildReport(buildings, effective);
      const output = selectReportFields(complete, selected);
      if (revision.current !== currentRevision) return;
      setGenerated({ report: output, options: effective, signature }); setPage(0);
      if (output.rows.length) toast.success('Relatório gerado. O Excel está pronto para baixar.');
      else toast.warning('Nenhum histórico encontrado para os filtros selecionados.');
    } catch (cause) {
      setGenerated(null);
      toast.error(cause instanceof Error ? cause.message : 'Falha ao gerar relatório.');
    } finally { generationLock.current = false; setGenerating(false); }
  };
  const download = async () => {
    if (exporting || generating || !generated || stale) return;
    setExporting(true);
    try {
      const workbook = await createWorkbook(filtered);
      const { writeFile } = await import('xlsx');
      const { from, to, granularity, layout } = generated.options;
      const suffix = loadedScope.replace(/[^\p{L}\p{N}_-]+/gu, '_');
      writeFile(workbook, `Relatorio_API_Excel_${suffix}_${from}_${to}_${granularity === 'month' ? 'Mensal' : 'Trimestral'}_${layout === 'rows' ? 'Tabular' : 'Colunas'}.xlsx`);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Falha ao exportar Excel.'); }
    finally { setExporting(false); }
  };
  const ready = buildings !== null && !loading;
  const validDates = (!from || !to || from <= to);
  return <div className="flex min-w-0 flex-col">
    <header className="border-b border-border bg-card px-5 py-4 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Relatórios Automatizados</p>
      <h1 className="text-2xl font-semibold tracking-tight">Relatório API Excel</h1>
      <p className="mt-1 text-sm text-muted-foreground">Carregue os dados GeoBrain e configure a visão e as colunas da planilha.</p>
    </header>
    <div className="min-w-0 space-y-5 p-4 sm:p-6">
      <section className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label="Coleta da API">
        <h2 className="font-semibold">1. Carregar dados</h2>
        <p className="text-xs text-muted-foreground">Comercial, Horizontal, Vertical e Hotel. Todos os históricos disponíveis no escopo autorizado, sem restrição a cidades ou padrões do AELO.</p>
        <GeoApiScopeSelector value={scope} onChange={changeScope} region={region} onRegionChange={(next) => { revision.current++; setRegion(next); setBuildings(null); setGenerated(null); }} disabled={loading || exporting || generating} onLoad={load} />
        {loading && <><BrainLoadingState title="Carregando todas as páginas da API" startedAt={startedAt}
          description={progress ? `${progress.pagesDone} páginas · ${progress.buildingsFound} registros · ${progress.lanesDone}/${progress.lanesTotal} consultas concluídas` : 'Iniciando consulta…'} />
          <Button variant="outline" onClick={() => { controller.current?.abort(); setLoading(false); }}><X className="mr-2 h-4 w-4" />Cancelar coleta</Button></>}
        {error && <div role="alert" className="space-y-1 text-sm text-destructive"><p>Coleta interrompida: {error}</p><p>Nenhum relatório parcial foi liberado. Use Carregar para tentar novamente.</p></div>}
        {!ready && !loading && !error && <p className="text-xs text-muted-foreground">Selecione uma UF, município ou região e use Carregar. Os filtros serão habilitados após a coleta completa.</p>}
        {ready && <p role="status" className="text-sm">Coleta completa: <strong>{buildings.length}</strong> registros · {loadedScope}.</p>}
      </section>
      {ready && <>
        <fieldset disabled={generating || exporting} className="contents"><section className="space-y-4 rounded-xl border border-border bg-card p-4" aria-label="Filtros do relatório">
          <h2 className="font-semibold">2. Configurar relatório</h2>
          <p className="text-xs text-muted-foreground">Configure os filtros e clique em Gerar relatório. Alterar seleções não processa os dados nem faz novas consultas à API. Datas vazias incluem todo o histórico disponível.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="api-excel-view">Visão</Label><Select value={granularity} onValueChange={(next: Granularity) => { setGranularity(next); }}><SelectTrigger id="api-excel-view"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="month">Mensal</SelectItem><SelectItem value="quarter">Trimestral</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="api-excel-layout">Layout do Excel</Label><Select value={layout} onValueChange={(next: Layout) => { setLayout(next); }}><SelectTrigger id="api-excel-layout"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="columns">Valores em colunas</SelectItem><SelectItem value="rows">Tabular — períodos em linhas</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="api-excel-price">Cálculo monetário</Label><Select value={priceMode} onValueChange={(next: PriceMode) => setPriceMode(next)}><SelectTrigger id="api-excel-price"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="current">Valor atual</SelectItem><SelectItem value="period">Valor do período</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="api-excel-average">Preço Médio Empreendimento</Label><Select value={buildingAverageMode} onValueChange={(next: BuildingAverageMode) => setBuildingAverageMode(next)}><SelectTrigger id="api-excel-average"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="simple">Média simples</SelectItem><SelectItem value="quantity">Ponderada pela quantidade</SelectItem><SelectItem value="stock">Ponderada pelo estoque</SelectItem></SelectContent></Select></div>
            <MonthField id="api-excel-from" label="Data inicial" value={from} onChange={setFrom} />
            <MonthField id="api-excel-to" label="Data final" value={to} onChange={setTo} />
            <div className="space-y-1.5"><Label htmlFor="api-excel-vgv-scale">Visualização do VGV</Label><Select value={vgvScale} onValueChange={(next: VgvScale) => setVgvScale(next)}><SelectTrigger id="api-excel-vgv-scale"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Padrão — valor calculado</SelectItem><SelectItem value="thousand">Milhar — dividir por 1.000</SelectItem><SelectItem value="million">Milhão — dividir por 1.000.000</SelectItem></SelectContent></Select></div>
          </div>
          <div className="max-w-md space-y-1.5"><Label htmlFor="api-excel-municipality">Município</Label><Popover open={municipalityOpen} onOpenChange={setMunicipalityOpen}><PopoverTrigger asChild><Button id="api-excel-municipality" variant="outline" role="combobox" aria-expanded={municipalityOpen} className="w-full justify-between font-normal"><span className="truncate">{municipality || 'Todos os municípios carregados'}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[min(300px,calc(100vw-32px))] p-0"><Command><CommandInput placeholder="Buscar município carregado…" /><CommandList><CommandEmpty>Nenhum município encontrado.</CommandEmpty><CommandGroup><CommandItem value="Todos os municípios carregados" onSelect={() => { setMunicipality(''); setMunicipalityOpen(false); }}>Todos os municípios carregados</CommandItem>{municipalities.map((item) => <CommandItem key={item} value={item} onSelect={() => { setMunicipality(item); setMunicipalityOpen(false); }}>{item}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>
          <fieldset className="flex flex-wrap gap-4"><legend className="mb-2 text-sm font-medium">Tipo Empreendimento</legend>{BUILDING_TYPES.map((type) => <label key={type} className="flex items-center gap-2 text-sm"><Checkbox checked={buildingTypes.includes(type)} onCheckedChange={(checked) => setBuildingTypes((old) => checked ? [...old, type] : old.filter((item) => item !== type))} />{type}</label>)}</fieldset>
          {!validDates && <p role="alert" className="text-sm text-destructive">Informe datas válidas, com a data inicial anterior ou igual à final.</p>}
          <fieldset className="flex flex-wrap gap-4"><legend className="mb-2 text-sm font-medium">Status do empreendimento</legend>{availableStatuses.map((status) => <label key={status} className="flex items-center gap-2 text-sm"><Checkbox checked={statuses.includes(status)} onCheckedChange={(checked) => { setStatuses((old) => checked ? [...old, status] : old.filter((item) => item !== status)); setPage(0); }} />{status || 'Não informado'}</label>)}</fieldset>
          <p className="text-xs text-muted-foreground">{priceMode === 'current' ? 'Valor atual: último preço disponível da tipologia até a data final, aplicado à série histórica.' : 'Valor do período: estoque e VGV lançado usam quantidade e preço do último fechamento de cada mês/trimestre. VGV de vendas soma venda × preço de cada fechamento.'} A escala escolhida para VGV será aplicada à prévia, aos gráficos e ao Excel. Vendas Brutas = gross_sales; Distratos = distractions; Vendas Líquidas = Vendas Brutas − Distratos.</p>
          <p className="text-xs text-muted-foreground">Preço Médio Empreendimento considera o último fechamento de cada tipologia no período e se repete nas linhas do mesmo empreendimento. {buildingAverageMode === 'simple' ? 'Média simples dos preços válidos.' : buildingAverageMode === 'quantity' ? 'Soma de preço × quantidade, dividida pela soma das quantidades.' : 'Soma de preço × estoque, dividida pela soma dos estoques.'} Pesos ausentes ou não positivos são excluídos; sem base válida, o valor fica vazio.</p>
          <p className="text-xs text-muted-foreground">Preço Atual e Preço m² mostram a posição de cada período; a opção Valor atual/Valor do período governa os VGV. As datas filtram os meses de typologies_history[].period, incluindo o mês final inteiro; o dia exibido é sempre 01. VGV Lançado histórico representa o valor da oferta total de cada período; não é o fluxo de novos lançamentos.</p>
        </section>
        <section className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label="Colunas de exportação">
          <h2 className="font-semibold">3. Selecionar colunas</h2>
          <div className="flex flex-wrap items-end gap-3"><div className="w-full space-y-1 sm:w-72"><Label htmlFor="api-excel-column-search">Buscar coluna</Label><Input id="api-excel-column-search" value={columnSearch} onChange={(event) => setColumnSearch(event.target.value)} placeholder="Nome da coluna" /></div><Button variant="outline" onClick={() => setSelected(null)}>Selecionar todas</Button><Button variant="outline" onClick={() => setSelected([])}>Limpar seleção</Button><span className="text-xs text-muted-foreground">{selectedFields.length}/{fields.length} campos</span></div>
          <div className="grid max-h-60 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2 xl:grid-cols-3">{fields.filter((column) => column.toLocaleLowerCase('pt-BR').includes(columnSearch.toLocaleLowerCase('pt-BR'))).map((column) => <label key={column} className="flex items-center gap-2 text-xs"><Checkbox checked={selectedFields.includes(column)} onCheckedChange={(checked) => setSelected((old) => checked ? [...(old ?? REPORT_FIELDS), column] : (old ?? REPORT_FIELDS).filter((item) => item !== column))} />{column}</label>)}</div>
          <p className="text-xs text-muted-foreground">Selecione os campos uma vez. As colunas de mês/trimestre só serão expandidas ao gerar a visão horizontal; a seleção é mantida ao trocar visão ou layout.</p>
        </section>
        </fieldset><section className="min-w-0 space-y-3" aria-label="Resultado do relatório">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">{generated ? `${report.typologyCount} registros de tipologia · ${filtered.rows.length} linhas · ${report.periods.length} períodos` : 'Configure os campos antes de gerar o relatório.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={generate} disabled={generating || exporting || !validDates || !selectedFields.length || !statuses.length || !buildingTypes.length}><Play className="mr-2 h-4 w-4" />{generating ? 'Gerando relatório…' : 'Gerar relatório'}</Button>
              <Button variant="outline" onClick={download} disabled={exporting || generating || !generated || stale || !filtered.rows.length || !filtered.columns.length}><Download className="mr-2 h-4 w-4" />{exporting ? 'Gerando Excel…' : 'Baixar Excel'}</Button>
            </div>
          </div>
          {generating && <BrainLoadingState title="Processando relatório" startedAt={startedAt} description="Aplicando filtros, cálculos e colunas selecionados." />}
          {stale && <p role="status" className="text-sm text-muted-foreground">Seleções alteradas. Clique em Gerar relatório para atualizar o resultado antes de baixar.</p>}
          {generated && generated.options.from && generated.options.to && <p className="text-xs text-muted-foreground">Resultado gerado: {`01/${generated.options.from.slice(5, 7)}/${generated.options.from.slice(0, 4)}`} a {`01/${generated.options.to.slice(5, 7)}/${generated.options.to.slice(0, 4)}`} · VGV em {vgvUnit}. {stale ? 'A prévia abaixo corresponde à geração anterior.' : ''}</p>}
          {!generated ? <p className="text-sm text-muted-foreground">Os dados foram carregados. O processamento começa somente ao clicar em Gerar relatório.</p> : !filtered.rows.length ? <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Nenhum histórico encontrado para os filtros. Ajuste as datas ou os status.</p> : <Tabs defaultValue="table">
            <TabsList><TabsTrigger value="table">Tabela</TabsTrigger><TabsTrigger value="history">Série histórica</TabsTrigger><TabsTrigger value="distribution">Distribuição</TabsTrigger></TabsList>
            <TabsContent value="table">
              {!filtered.columns.length ? <p className="py-4 text-sm text-muted-foreground">Selecione ao menos uma coluna para visualizar e exportar.</p> : <div className="max-h-[55vh] overflow-auto rounded-xl border border-border"><table className="w-full border-collapse text-xs"><caption className="sr-only">Prévia do Excel com filtros aplicados. Valores de VGV em {vgvUnit}.</caption><thead className="sticky top-0 bg-muted"><tr>{filtered.columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-border p-2 text-left font-medium">{column}</th>)}</tr></thead><tbody>{pageRows.map((row, index) => <tr key={index} className="border-b border-border hover:bg-muted/50">{filtered.columns.map((column) => <td key={column} className="whitespace-nowrap p-2">{display(column, row[column], report.vgvScale)}</td>)}</tr>)}</tbody></table></div>}
              <div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span className="text-xs">Página {currentPage + 1} de {maxPage + 1}. A exportação inclui todas as linhas.</span><Button variant="outline" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)}>Próxima</Button></div>
            </TabsContent>
            <TabsContent value="history" className="rounded-xl border border-border bg-card p-4"><div className="mb-4 max-w-xs space-y-1"><Label htmlFor="api-excel-metric">Métrica da série</Label><Select value={metric} onValueChange={setMetric}><SelectTrigger id="api-excel-metric"><SelectValue /></SelectTrigger><SelectContent>{MEASURES.map((item) => <SelectItem key={item} value={item}>{item}{item.startsWith('VGV') ? ` (${vgvUnit})` : item.startsWith('Preço') ? item === 'Preço m²' ? ' (R$/m²)' : ' (R$)' : ' (unidades)'}</SelectItem>)}</SelectContent></Select></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" name={metric} stroke="hsl(var(--primary))" connectNulls={false} /></LineChart></ResponsiveContainer></div></TabsContent>
            <TabsContent value="distribution" className="rounded-xl border border-border bg-card p-4"><div className="mb-4 max-w-xs space-y-1"><Label htmlFor="api-excel-distribution">Distribuição de tipologias (até 20 grupos)</Label><Select value={distribution} onValueChange={setDistribution}><SelectTrigger id="api-excel-distribution"><SelectValue /></SelectTrigger><SelectContent>{['Cidade/UF', 'Tipo', 'Status Empreendimento', 'Padrão', 'Tempo de Vendas', 'Incorporadoras'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={distributionData}><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Tipologias" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div></TabsContent>
          </Tabs>}
        </section>
      </>}
    </div>
  </div>;
}
