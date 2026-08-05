import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  GitCompareArrows,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/features/dashboard-geobrain/MultiSelect';
import {
  buildAdjustments,
  exportVgvWorkbook,
  extractAmenities,
  findColumn,
  loadBundledIndexSeries,
  normalizeText,
  parseVgvArrayBuffer,
  toNumber,
} from './engine';
import type { AdjustmentRow, IndexName, IndexSeries, ParsedVgvWorkbook, PerformanceRow, VgvFilters, VgvRow } from './types';
import { INDEX_NAMES } from './types';
import './atualizador-vgv.css';

const GEO_URL = '/geo/br-states.json';
const EMPTY_FILTERS: VgvFilters = { empreendimentos: [], cidades: [], tipologias: [], status: [] };
const FIELD_COLORS = { primary: '#71984a', secondary: '#315b78', accent: '#f8d000', muted: '#94a3b8', danger: '#b00020' };

type ViewTab = 'overview' | 'indices';

type EnrichedRow = VgvRow & {
  __status_atual?: string;
  __vgv_oferta_atual?: number | null;
};

interface MonthlyRow {
  month: string;
  time: number;
  vgvTotal: number;
  vgvOferta: number;
  estoque: number;
  vendas: number;
}

function brl(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
}

function integer(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
}

function cleanOptions(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function filterRows(
  rows: EnrichedRow[],
  filters: VgvFilters,
  columns: { empreendimento?: string; cidade?: string; tipologia?: string },
  exclude?: keyof VgvFilters,
): EnrichedRow[] {
  return rows.filter((row) => {
    if (exclude !== 'empreendimentos' && filters.empreendimentos.length && !filters.empreendimentos.includes(String(row[columns.empreendimento ?? ''] ?? ''))) return false;
    if (exclude !== 'cidades' && filters.cidades.length && !filters.cidades.includes(String(row[columns.cidade ?? ''] ?? ''))) return false;
    if (exclude !== 'tipologias' && filters.tipologias.length && !filters.tipologias.includes(String(row[columns.tipologia ?? ''] ?? ''))) return false;
    if (exclude !== 'status' && filters.status.length && !filters.status.includes(row.__status_atual ?? '')) return false;
    return true;
  });
}

function chartMoney(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)} bi`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)} mi`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)} mil`;
  return String(Math.round(value));
}

function tooltipMoney(value: number | string | Array<number | string>): [string, string] {
  return [brl(Number(value)), 'Valor'];
}

export default function AtualizadorVgvPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ViewTab>('overview');
  const [dataset, setDataset] = useState<ParsedVgvWorkbook | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [indices, setIndices] = useState<IndexSeries | null>(null);
  const [filters, setFilters] = useState<VgvFilters>(EMPTY_FILTERS);
  const [selectedIndices, setSelectedIndices] = useState<IndexName[]>(['INCC-DI']);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  async function loadWorkbook(file: File | Blob, name: string) {
    setLoading(true);
    setError('');
    try {
      const parsed = parseVgvArrayBuffer(await file.arrayBuffer());
      if (!findColumn(parsed.columns, ['Empreendimento'])) throw new Error("A coluna 'Empreendimento' é obrigatória.");
      setDataset(parsed);
      setSourceName(name);
      setFilters(EMPTY_FILTERS);
      toast.success('Planilha processada no navegador', { description: `${parsed.base.length} registros e ${parsed.metadata.monthLabels.length} meses detectados.` });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível interpretar a planilha.';
      setError(message);
      toast.error('Falha ao carregar a planilha', { description: message });
    } finally {
      setLoading(false);
    }
  }

  async function loadSample(silent = false) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/atualizador-vgv/tabelaEmpreendimentoReduzida.xlsx');
      if (!response.ok) throw new Error('O arquivo de exemplo não está disponível.');
      const parsed = parseVgvArrayBuffer(await response.arrayBuffer());
      setDataset(parsed);
      setSourceName('tabelaEmpreendimentoReduzida.xlsx');
      setFilters(EMPTY_FILTERS);
      if (!silent) toast.success('Base de demonstração restaurada');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar o exemplo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([loadBundledIndexSeries(), loadSample(true)])
      .then(([loadedIndices]) => setIndices(loadedIndices))
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Falha ao preparar os arquivos locais.');
        setLoading(false);
      });
  }, []);

  const columns = useMemo(() => {
    const all = dataset?.columns ?? [];
    const perf = Object.keys(dataset?.performance[0] ?? {});
    return {
      empreendimento: findColumn(all, ['Empreendimento']),
      cidade: findColumn(all, ['Cidade']),
      estado: findColumn(all, ['Estado']),
      tipologia: findColumn(all, ['Tipologia']),
      latitude: findColumn(all, ['Latitude']),
      longitude: findColumn(all, ['Longitude']),
      status: findColumn(perf, ['Status']),
      vgvTotal: findColumn(perf, ['VGV Total']),
      vgvOferta: findColumn(perf, ['VGV Oferta Final']),
      estoque: findColumn(perf, ['Estoque']),
      vendas: findColumn(perf, ['Vendas']),
    };
  }, [dataset]);

  const enriched = useMemo<EnrichedRow[]>(() => {
    if (!dataset) return [];
    const latest = new Map<number, PerformanceRow>();
    dataset.performance.forEach((row) => {
      const current = latest.get(row.__registro_id);
      if (!current || current.MesData < row.MesData) latest.set(row.__registro_id, row);
    });
    return dataset.base.map((row) => ({
      ...row,
      __status_atual: columns.status ? String(latest.get(row.__registro_id)?.[columns.status] ?? '') : '',
      __vgv_oferta_atual: columns.vgvOferta ? toNumber(latest.get(row.__registro_id)?.[columns.vgvOferta]) : null,
    }));
  }, [columns.status, columns.vgvOferta, dataset]);

  const optionSets = useMemo(() => ({
    empreendimentos: cleanOptions(filterRows(enriched, filters, columns, 'empreendimentos').map((row) => row[columns.empreendimento ?? ''])),
    cidades: cleanOptions(filterRows(enriched, filters, columns, 'cidades').map((row) => row[columns.cidade ?? ''])),
    tipologias: cleanOptions(filterRows(enriched, filters, columns, 'tipologias').map((row) => row[columns.tipologia ?? ''])),
    status: cleanOptions(filterRows(enriched, filters, columns, 'status').map((row) => row.__status_atual)),
  }), [columns, enriched, filters]);

  const filteredBase = useMemo(() => filterRows(enriched, filters, columns), [columns, enriched, filters]);
  const filteredIds = useMemo(() => new Set(filteredBase.map((row) => row.__registro_id)), [filteredBase]);
  const filteredPerformance = useMemo(() => (dataset?.performance ?? []).filter((row) => filteredIds.has(row.__registro_id)), [dataset, filteredIds]);
  const adjustments = useMemo(() => dataset && indices ? buildAdjustments(dataset.performance, indices) : [], [dataset, indices]);
  const filteredAdjustments = useMemo(() => adjustments.filter((row) => filteredIds.has(row.__registro_id)), [adjustments, filteredIds]);

  const monthly = useMemo<MonthlyRow[]>(() => {
    const grouped = new Map<string, MonthlyRow>();
    filteredPerformance.forEach((row) => {
      const target = grouped.get(row.Mes) ?? { month: row.Mes, time: row.MesData.getTime(), vgvTotal: 0, vgvOferta: 0, estoque: 0, vendas: 0 };
      target.vgvTotal += toNumber(row[columns.vgvTotal ?? '']) ?? 0;
      target.vgvOferta += toNumber(row[columns.vgvOferta ?? '']) ?? 0;
      target.estoque += toNumber(row[columns.estoque ?? '']) ?? 0;
      target.vendas += toNumber(row[columns.vendas ?? '']) ?? 0;
      grouped.set(row.Mes, target);
    });
    return [...grouped.values()].sort((a, b) => a.time - b.time);
  }, [columns, filteredPerformance]);

  const adjustedMonthly = useMemo(() => {
    const grouped = new Map<string, Record<string, string | number>>();
    filteredAdjustments.forEach((row) => {
      const current = grouped.get(row.Mes) ?? { month: row.Mes, time: row.MesData.getTime(), nominal: 0 };
      current.nominal = Number(current.nominal) + row.nominal;
      INDEX_NAMES.forEach((name) => {
        if (row.corrected[name] !== undefined) current[name] = Number(current[name] ?? 0) + Number(row.corrected[name]);
      });
      grouped.set(row.Mes, current);
    });
    return [...grouped.values()].sort((a, b) => Number(a.time) - Number(b.time));
  }, [filteredAdjustments]);

  const projectNames = cleanOptions(filteredBase.map((row) => row[columns.empreendimento ?? '']));
  const lastMonth = monthly.at(-1);
  const activeFilterCount = Object.values(filters).reduce((sum, values) => sum + values.length, 0);

  function setFilter(key: keyof VgvFilters, value: string[]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function focusProject(name: string) {
    setFilters({ empreendimentos: [name], cidades: [], tipologias: [], status: [] });
  }

  function handleFile(file?: File) {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error('Formato não suportado', { description: 'Envie uma planilha XLSX ou XLS.' });
      return;
    }
    loadWorkbook(file, file.name);
  }

  function exportScope(scope: 'all' | 'filtered') {
    if (!dataset) return;
    const ids = scope === 'all' ? new Set(dataset.base.map((row) => row.__registro_id)) : filteredIds;
    exportVgvWorkbook(
      scope === 'all' ? dataset.base : filteredBase,
      dataset.performance.filter((row) => ids.has(row.__registro_id)),
      adjustments.filter((row) => ids.has(row.__registro_id)),
      scope === 'all' ? 'dados_vgv_todos_empreendimentos.xlsx' : 'dados_vgv_filtros_atuais.xlsx',
    );
  }

  return (
    <div className="vvg-root min-h-full">
      <header className="vvg-hero">
        <div>
          <div className="vvg-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Inteligência imobiliária · processamento local</div>
          <h1>Atualizador VGV</h1>
          <p>Explore a evolução dos empreendimentos, compare índices e exporte recortes sem enviar dados para um servidor.</p>
        </div>
        <div className="vvg-privacy"><CheckCircle2 className="h-4 w-4" /><span><strong>100% no navegador</strong><small>Nenhum arquivo é armazenado</small></span></div>
      </header>

      <main className="vvg-content">
        <section className="vvg-source-card">
          <div
            className={`vvg-dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]); }}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
            <div className="vvg-drop-icon"><UploadCloud className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <strong>{sourceName || 'Carregue uma planilha VGV'}</strong>
              <span>{dataset ? `${dataset.base.length} registros · ${dataset.metadata.monthLabels.length} meses · ${dataset.metadata.amenityColumns.length} amenidades` : 'Arraste o arquivo aqui ou escolha no computador'}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>Escolher arquivo</Button>
            <Button size="sm" variant="ghost" onClick={() => loadSample()} disabled={loading} title="Restaurar demonstração"><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {loading && <div className="vvg-loading"><Loader2 className="h-4 w-4 animate-spin" /> Processando dados localmente…</div>}
          {error && <div className="vvg-error">{error}</div>}
        </section>

        {dataset && !loading && (
          <>
            <div className="vvg-tabs" role="tablist">
              <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><BarChart3 className="h-4 w-4" /> Visão geral</button>
              <button className={tab === 'indices' ? 'active' : ''} onClick={() => setTab('indices')}><GitCompareArrows className="h-4 w-4" /> Comparador de índices</button>
            </div>

            <section className="vvg-filter-card">
              <div className="vvg-filter-heading">
                <div><strong>Filtros inteligentes</strong><span>As opções se adaptam ao recorte selecionado.</span></div>
                {activeFilterCount > 0 && <button onClick={() => setFilters(EMPTY_FILTERS)}><X className="h-3.5 w-3.5" /> Limpar {activeFilterCount}</button>}
              </div>
              <div className="vvg-filter-grid">
                <MultiSelect label="Empreendimento" options={optionSets.empreendimentos.map((value) => ({ value, label: value }))} value={filters.empreendimentos} onChange={(value) => setFilter('empreendimentos', value)} />
                <MultiSelect label="Cidade" options={optionSets.cidades.map((value) => ({ value, label: value }))} value={filters.cidades} onChange={(value) => setFilter('cidades', value)} disabled={!columns.cidade} />
                <MultiSelect label="Tipologia" options={optionSets.tipologias.map((value) => ({ value, label: value }))} value={filters.tipologias} onChange={(value) => setFilter('tipologias', value)} disabled={!columns.tipologia} />
                <MultiSelect label="Status atual" options={optionSets.status.map((value) => ({ value, label: value }))} value={filters.status} onChange={(value) => setFilter('status', value)} disabled={!columns.status} />
              </div>
            </section>

            {filteredBase.length === 0 ? (
              <section className="vvg-empty"><Building2 className="h-8 w-8" /><strong>Nenhum registro neste recorte</strong><span>Remova um filtro para continuar a análise.</span></section>
            ) : tab === 'overview' ? (
              <Overview
                base={filteredBase}
                performance={filteredPerformance}
                monthly={monthly}
                projectNames={projectNames}
                columns={columns}
                lastMonth={lastMonth}
                amenityColumns={dataset.metadata.amenityColumns}
                onFocusProject={focusProject}
              />
            ) : (
              <IndexComparator rows={adjustedMonthly} selected={selectedIndices} onChange={setSelectedIndices} indices={indices} projectCount={projectNames.length} />
            )}

            <section className="vvg-export-card">
              <div><ArrowDownToLine className="h-5 w-5" /><span><strong>Leve a análise com você</strong><small>O arquivo é gerado localmente com três abas.</small></span></div>
              <div>
                <Button variant="outline" onClick={() => exportScope('all')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Base completa</Button>
                <Button onClick={() => exportScope('filtered')}><ArrowDownToLine className="mr-2 h-4 w-4" /> Exportar recorte</Button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Overview({
  base, monthly, projectNames, columns, lastMonth, amenityColumns, onFocusProject,
}: {
  base: EnrichedRow[];
  performance: PerformanceRow[];
  monthly: MonthlyRow[];
  projectNames: string[];
  columns: Record<string, string | undefined>;
  lastMonth?: MonthlyRow;
  amenityColumns: string[];
  onFocusProject: (name: string) => void;
}) {
  return (
    <div className="vvg-section-stack">
      <section className="vvg-kpis">
        <Kpi icon={<Building2 />} label="Empreendimentos" value={integer(projectNames.length)} detail={`${base.length} registros no recorte`} />
        <Kpi icon={<FileSpreadsheet />} label="Mês de referência" value={lastMonth?.month ?? '—'} detail={`${monthly.length} períodos disponíveis`} />
        <Kpi icon={<BarChart3 />} label="VGV total" value={brl(lastMonth?.vgvTotal, true)} detail="no mês de referência" />
        <Kpi icon={<MapPin />} label="VGV da oferta" value={brl(lastMonth?.vgvOferta, true)} detail={`${integer(lastMonth?.estoque)} unidades em estoque`} />
      </section>

      <section className="vvg-dashboard-grid">
        <ChartCard title="Evolução mensal de VGV" subtitle="Valores agregados conforme os filtros atuais" className="vvg-wide">
          <ResponsiveContainer width="100%" height={310}>
            <LineChart data={monthly} margin={{ top: 10, right: 14, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--vvg-grid)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--vvg-muted)" />
              <YAxis tickFormatter={chartMoney} tick={{ fontSize: 11 }} stroke="var(--vvg-muted)" width={62} />
              <Tooltip formatter={tooltipMoney} contentStyle={{ borderRadius: 12, borderColor: 'var(--vvg-border)', background: 'var(--vvg-card)' }} />
              <Legend />
              <Line type="monotone" dataKey="vgvTotal" name="VGV Total" stroke={FIELD_COLORS.secondary} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="vgvOferta" name="VGV Oferta Final" stroke={FIELD_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Estoque × vendas" subtitle="Movimentação mensal em unidades" className="vvg-wide">
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={monthly} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--vvg-grid)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--vvg-muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--vvg-muted)" />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: 'var(--vvg-border)', background: 'var(--vvg-card)' }} />
              <Legend />
              <Bar dataKey="estoque" name="Estoque" fill={FIELD_COLORS.primary} radius={[5, 5, 0, 0]} />
              <Bar dataKey="vendas" name="Vendas líquidas" fill={FIELD_COLORS.accent} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ProjectMap rows={base} columns={columns} onFocus={onFocusProject} />
      </section>

      {projectNames.length === 1 ? <ProjectDetails rows={base} columns={columns} amenityColumns={amenityColumns} /> : (
        <section className="vvg-hint"><MapPin className="h-5 w-5" /><div><strong>Quer ver a ficha completa?</strong><span>Selecione um único empreendimento nos filtros ou clique em um ponto do mapa.</span></div></section>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <article className="vvg-kpi"><span className="vvg-kpi-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div></article>;
}

function ChartCard({ title, subtitle, className = '', children }: { title: string; subtitle: string; className?: string; children: React.ReactNode }) {
  return <section className={`vvg-card ${className}`}><div className="vvg-card-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>;
}

function ProjectMap({ rows, columns, onFocus }: { rows: EnrichedRow[]; columns: Record<string, string | undefined>; onFocus: (name: string) => void }) {
  const points = useMemo(() => {
    const projects = new Map<string, { name: string; city: string; status: string; lat: number; lon: number; vgv: number }>();
    rows.forEach((row) => {
      const name = String(row[columns.empreendimento ?? ''] ?? '').trim();
      const lat = toNumber(row[columns.latitude ?? '']);
      const lon = toNumber(row[columns.longitude ?? '']);
      if (!name || lat === null || lon === null) return;
      const current = projects.get(name);
      projects.set(name, {
        name,
        city: String(row[columns.cidade ?? ''] ?? ''),
        status: row.__status_atual ?? '',
        lat,
        lon,
        vgv: (current?.vgv ?? 0) + (row.__vgv_oferta_atual ?? 0),
      });
    });
    return [...projects.values()];
  }, [columns, rows]);
  return (
    <section className="vvg-card vvg-map-card">
      <div className="vvg-card-head"><div><h2>Mapa de empreendimentos</h2><p>Clique em um ponto para focar a análise</p></div><span className="vvg-count">{points.length} pontos</span></div>
      <div className="vvg-map-shell">
        <ComposableMap projection="geoMercator" projectionConfig={{ center: [-52, -15], scale: 720 }}>
          <ZoomableGroup minZoom={1} maxZoom={6}>
            <Geographies geography={GEO_URL}>{({ geographies }) => geographies.map((geo) => <Geography key={geo.rsmKey} geography={geo} fill="var(--vvg-map-fill)" stroke="var(--vvg-map-line)" strokeWidth={0.65} style={{ default: { outline: 'none' }, hover: { fill: 'var(--vvg-map-hover)', outline: 'none' }, pressed: { outline: 'none' } }} />)}</Geographies>
            {points.map((point) => (
              <Marker key={point.name} coordinates={[point.lon, point.lat]} onClick={() => onFocus(point.name)}>
                <circle r={5.5} fill={normalizeText(point.status).includes('esgotado') ? FIELD_COLORS.danger : FIELD_COLORS.primary} stroke="white" strokeWidth={1.6} className="vvg-marker"><title>{`${point.name}\n${point.city}\n${point.status}\n${brl(point.vgv)}`}</title></circle>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </section>
  );
}

function ProjectDetails({ rows, columns, amenityColumns }: { rows: EnrichedRow[]; columns: Record<string, string | undefined>; amenityColumns: string[] }) {
  const row = rows[0];
  const fields = ['Empreendimento', 'Endereço', 'Número', 'Bairro', 'CEP', 'Cidade', 'Estado', 'Incorporadora 1', 'Data de Lançamento', 'Data de Entrega', 'Tipo', 'Quartos', 'Garagem', 'Torres', 'Elevadores', 'M2 Privativo', 'Padrão', 'Tipologia', 'Oferta Lançada'];
  const fieldRows = fields.flatMap((label) => {
    const column = findColumn(Object.keys(row), [label]);
    if (!column) return [];
    const value = row[column];
    return [{ label, value: value instanceof Date ? value.toLocaleDateString('pt-BR') : String(value ?? '—') }];
  });
  const amenityGroups = rows.reduce((groups, current) => {
    const extracted = extractAmenities(current, amenityColumns);
    (Object.keys(extracted) as (keyof typeof extracted)[]).forEach((group) => extracted[group].forEach((item) => groups[group].add(item)));
    return groups;
  }, { Interna: new Set<string>(), Externa: new Set<string>(), Comercial: new Set<string>(), Geral: new Set<string>() });
  const name = String(row[columns.empreendimento ?? ''] ?? 'Empreendimento');
  return (
    <section className="vvg-card vvg-detail-card">
      <div className="vvg-card-head"><div><h2>{name}</h2><p>Ficha consolidada e amenidades presentes</p></div><span className="vvg-status">{row.__status_atual || 'Status não informado'}</span></div>
      <div className="vvg-detail-grid">
        <div className="vvg-facts">{fieldRows.map((field) => <div key={field.label}><small>{field.label}</small><strong>{field.value}</strong></div>)}</div>
        <div className="vvg-amenities">
          {(Object.keys(amenityGroups) as (keyof typeof amenityGroups)[]).map((group) => (
            <div key={group}><h3>{group} <span>{amenityGroups[group].size}</span></h3><div>{[...amenityGroups[group]].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((item) => <span key={item}>{item}</span>)}{amenityGroups[group].size === 0 && <em>Sem itens</em>}</div></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IndexComparator({ rows, selected, onChange, indices, projectCount }: { rows: Record<string, string | number>[]; selected: IndexName[]; onChange: (names: IndexName[]) => void; indices: IndexSeries | null; projectCount: number }) {
  const reference = rows.at(-1);
  function toggle(name: IndexName) {
    onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name]);
  }
  return (
    <div className="vvg-section-stack">
      <section className="vvg-index-intro">
        <div><span className="vvg-index-icon"><GitCompareArrows className="h-5 w-5" /></span><div><h2>Comparador de índices</h2><p>VGV da oferta corrigido para a base de dezembro de 2025.</p></div></div>
        <div className="vvg-index-toggle">{INDEX_NAMES.map((name) => <button key={name} className={selected.includes(name) ? 'active' : ''} onClick={() => toggle(name)}><span style={{ background: name === 'INCC-DI' ? FIELD_COLORS.primary : name === 'IPCA' ? FIELD_COLORS.secondary : FIELD_COLORS.accent }} />{name}</button>)}</div>
      </section>
      <section className="vvg-kpis vvg-index-kpis">
        <Kpi icon={<Building2 />} label="Recorte" value={projectCount === 1 ? '1 empreendimento' : `${projectCount} empreendimentos`} detail={String(reference?.month ?? 'Sem período')} />
        <Kpi icon={<BarChart3 />} label="VGV nominal" value={brl(Number(reference?.nominal), true)} detail="mês de referência" />
        {selected.map((name) => <Kpi key={name} icon={<GitCompareArrows />} label={`Corrigido ${name}`} value={brl(Number(reference?.[name]), true)} detail="base 12/2025" />)}
      </section>
      <ChartCard title="Nominal × valores corrigidos" subtitle="Método direto: VGV nominal × (índice-base ÷ índice do mês)">
        <ResponsiveContainer width="100%" height={390}>
          <LineChart data={rows} margin={{ top: 12, right: 20, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--vvg-grid)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--vvg-muted)" />
            <YAxis tickFormatter={chartMoney} tick={{ fontSize: 11 }} stroke="var(--vvg-muted)" width={66} />
            <Tooltip formatter={tooltipMoney} contentStyle={{ borderRadius: 12, borderColor: 'var(--vvg-border)', background: 'var(--vvg-card)' }} />
            <Legend />
            <Line type="monotone" dataKey="nominal" name="VGV nominal" stroke={FIELD_COLORS.muted} strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3 }} />
            {selected.includes('INCC-DI') && <Line type="monotone" dataKey="INCC-DI" name="Corrigido INCC-DI" stroke={FIELD_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />}
            {selected.includes('IPCA') && <Line type="monotone" dataKey="IPCA" name="Corrigido IPCA" stroke={FIELD_COLORS.secondary} strokeWidth={2.5} dot={{ r: 3 }} />}
            {selected.includes('IGP-DI') && <Line type="monotone" dataKey="IGP-DI" name="Corrigido IGP-DI" stroke={FIELD_COLORS.accent} strokeWidth={2.5} dot={{ r: 3 }} />}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <section className="vvg-method"><strong>Metodologia da V1</strong><span>O nominal é o VGV Oferta Final de cada mês. Cada série usa o valor do índice no mesmo período e o atualiza para dezembro de 2025. Os arquivos locais cobrem até janeiro de 2026.</span><div>{INDEX_NAMES.map((name) => <span key={name}>{name}: {indices?.[name]?.[0]?.monthKey ?? '—'} → {indices?.[name]?.at(-1)?.monthKey ?? '—'}</span>)}</div></section>
    </div>
  );
}
