import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight, Palette, X, FlaskConical } from 'lucide-react';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import StudyMap from '@/components/study/StudyMap';
import brainLogoName from '../../assets/logoBrain.png';
import brainIcon from '../../assets/braininteligenciaestrategica_logo.jpg';
import {
  featureCollectionFirstPolygonRings,
  pointInPolygonRings,
  polygonRingsToFeatureCollection,
  type PolygonRings,
  type LonLat,
} from '@/lib/spatial';
import { parseKmlOrKmzToPolygonFeatureCollection } from '@/lib/kml-loader';

type ColorBy = 'status' | 'tipologia' | 'quartos' | 'padrao';
type AreaMode = 'city' | 'kmz' | 'draw';
type SocioRenderMode =
  | 'none'
  | 'choropleth'
  | 'heatmap'
  | 'hexbin';
type SocioMetricKey =
  | 'domicilios_26'
  | 'nr_pessoas_v0001'
  | 'rend_mensal_por_domicilio2026'
  | 'rend_mensal_por_pessoa2026'
  | 'total_alimentacao_dentro'
  | 'total_alimentacao_fora'
  | 'total_despesas_consumo'
  | 'total_habitacao';

interface EmpreendimentoProperties {
  empreendimento_id: string;
  empreendimento: string;
  cidade?: string;
  estado?: string;
  bairro?: string;
  endereco?: string;
  numero?: string;
  statuses?: string[];
  tipos?: string[];
  padroes?: string[];
  quartos?: string[];
  tipologias_count?: number;
  inside_default_area?: boolean;
  [key: string]: unknown;
}

interface SectorIndexRow {
  cd_setor: string;
  centroid: [number, number];
  domicilios_26?: number | null;
  nr_pessoas_v0001?: number | null;
  rend_mensal_por_domicilio2026?: number | null;
  rend_mensal_por_pessoa2026?: number | null;
  total_alimentacao_dentro?: number | null;
  total_alimentacao_fora?: number | null;
  total_despesas_consumo?: number | null;
  total_habitacao?: number | null;
}

interface SectorGeometryProperties {
  CD_SETOR?: string;
  cd_setor?: string;
  [key: string]: unknown;
}

interface SocioPointRow {
  cd_setor: string;
  position: [number, number];
  value: number;
}

interface TipologiaRow {
  empreendimento_id: string;
  tipologia_id: string;
  empreendimento: string;
  status: string;
  tipo: string;
  latitude: number | null;
  longitude: number | null;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  quartos: string;
  unidades_tipologia: number | null;
  oferta_final_tipologia: number | null;
  preco_lancamento: number | null;
  preco: number | null;
  m2_priv: number | null;
  valor_m2_priv: number | null;
  padrao: string;
  tipologia: string;
  oferta_lancada_empreendimento: number | null;
  oferta_final_empreendimento: number | null;
  vgv_total: number | null;
  vgv_oferta_final: number | null;
}

type RgbaColor = [number, number, number, number];

const SOCIO_MODE_CARDS: Array<{
  key: SocioRenderMode;
  label: string;
  hint: string;
  tone: 'neutral' | 'green' | 'red' | 'violet';
}> = [
  { key: 'none', label: 'Sem camada', hint: 'Desativa a malha socio', tone: 'neutral' },
  { key: 'choropleth', label: 'Coropletico', hint: 'Setor por cor', tone: 'green' },
  { key: 'heatmap', label: 'Heatmap', hint: 'Intensidade espacial', tone: 'red' },
  { key: 'hexbin', label: 'Hexbin', hint: 'Agregacao por hexagonos', tone: 'violet' },
];

type ReportTableKey =
  | 'vertical'
  | 'vertical_vgv'
  | 'vertical_vgv_lancado'
  | 'vertical_preco_medio'
  | 'vertical_m2_privativo'
  | 'vertical_m2_oferta'
  | 'horizontal'
  | 'horizontal_vgv'
  | 'horizontal_vgv_lancado'
  | 'horizontal_preco_medio'
  | 'comercial'
  | 'comercial_vgv'
  | 'comercial_vgv_lancado'
  | 'comercial_preco_medio'
  | 'tipologias';

type ReportSectionKey = 'vertical' | 'horizontal' | 'comercial' | 'tipologias';

const REPORT_TABLE_TITLES: Record<ReportTableKey, string> = {
  vertical: 'Resumo por padrao',
  vertical_vgv: 'VGV (oferta final)',
  vertical_vgv_lancado: 'VGV (lancado)',
  vertical_preco_medio: 'Preco medio',
  vertical_m2_privativo: 'M2 privativo por tipologia',
  vertical_m2_oferta: 'Oferta por tipologia',
  horizontal: 'Resumo por padrao',
  horizontal_vgv: 'VGV (oferta final)',
  horizontal_vgv_lancado: 'VGV (lancado)',
  horizontal_preco_medio: 'Preco medio',
  comercial: 'Resumo por padrao',
  comercial_vgv: 'VGV (oferta final)',
  comercial_vgv_lancado: 'VGV (lancado)',
  comercial_preco_medio: 'Preco medio',
  tipologias: 'Planilha detalhada de tipologias',
};

const REPORT_SECTION_CONFIG: Array<{
  key: ReportSectionKey;
  label: string;
  hint: string;
  tone: 'green' | 'yellow';
  tableKeys: ReportTableKey[];
}> = [
  {
    key: 'vertical',
    label: 'Vertical',
    hint: 'Oferta, VGV, preco e m2',
    tone: 'green',
    tableKeys: [
      'vertical',
      'vertical_vgv',
      'vertical_vgv_lancado',
      'vertical_preco_medio',
      'vertical_m2_privativo',
      'vertical_m2_oferta',
    ],
  },
  {
    key: 'horizontal',
    label: 'Horizontal',
    hint: 'Oferta, VGV e preco',
    tone: 'green',
    tableKeys: ['horizontal', 'horizontal_vgv', 'horizontal_vgv_lancado', 'horizontal_preco_medio'],
  },
  {
    key: 'comercial',
    label: 'Comercial',
    hint: 'Oferta, VGV e preco',
    tone: 'green',
    tableKeys: ['comercial', 'comercial_vgv', 'comercial_vgv_lancado', 'comercial_preco_medio'],
  },
  {
    key: 'tipologias',
    label: 'Tipologias',
    hint: 'Planilha detalhada',
    tone: 'yellow',
    tableKeys: ['tipologias'],
  },
];

interface DynamicTableColumn {
  key: string;
  label: string;
  format?: 'text' | 'int' | 'float' | 'percent' | 'currency';
}

interface DynamicTableData {
  key: ReportTableKey;
  title: string;
  columns: DynamicTableColumn[];
  rows: Array<Record<string, string | number | null>>;
}

interface AnalysisSnapshot {
  area: FeatureCollection | null;
  selectedTipologias: string[];
  selectedStatus: string[];
  selectedQuartos: string[];
  selectedPadroes: string[];
}

const SOCIO_METRIC_OPTIONS: Array<{ key: SocioMetricKey; label: string }> = [
  { key: 'rend_mensal_por_domicilio2026', label: 'Renda mensal por domicilio (2026)' },
  { key: 'rend_mensal_por_pessoa2026', label: 'Renda mensal por pessoa (2026)' },
  { key: 'domicilios_26', label: 'Domicilios (proxy 2026)' },
  { key: 'nr_pessoas_v0001', label: 'Populacao total' },
  { key: 'total_alimentacao_dentro', label: 'Total alimentacao dentro' },
  { key: 'total_alimentacao_fora', label: 'Total alimentacao fora' },
  { key: 'total_despesas_consumo', label: 'Total despesas consumo' },
  { key: 'total_habitacao', label: 'Total habitacao' },
];

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mixRgb(
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] {
  const tt = Math.max(0, Math.min(1, t));
  return [
    Math.round(from[0] + (to[0] - from[0]) * tt),
    Math.round(from[1] + (to[1] - from[1]) * tt),
    Math.round(from[2] + (to[2] - from[2]) * tt),
  ];
}

function toRgba(color: [number, number, number], alpha = 235): RgbaColor {
  return [color[0], color[1], color[2], alpha];
}

function colorForStatus(label: string): RgbaColor {
  const key = normalizeToken(label);
  if (key.includes('esgotad')) return [220, 38, 38, 235];
  if (key.includes('comercializacao')) return [22, 163, 74, 235];
  return [55, 65, 81, 235];
}

function colorForTipologia(label: string): RgbaColor {
  const key = normalizeToken(label);
  if (key.includes('comercial')) return [37, 99, 235, 235];
  if (key.includes('horizontal')) return [220, 38, 38, 235];
  if (key.includes('vertical')) return [22, 163, 74, 235];
  return [55, 65, 81, 235];
}

function parseQuartos(label: string): number | null {
  const match = label.match(/\d+/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function padraoScore(label: string): number {
  const key = normalizeToken(label);
  if (key.includes('super luxo')) return 8;
  if (key.includes('luxo')) return 7;
  if (key.includes('alto +') || key.includes('alto+')) return 6.5;
  if (key.includes('alto')) return 6;
  if (key.includes('medio')) return 5;
  if (key.includes('standard')) return 4;
  if (key.includes('loteamento fechado')) return 4.5;
  if (key.includes('condominio de casas') || key.includes('sobrados')) return 4.5;
  if (key.includes('loteamento aberto')) return 3.5;
  if (key.includes('compact')) return 3;
  if (key.includes('econom')) return 2;
  return 4;
}

function buildColorMap(keys: string[], colorBy: ColorBy): Record<string, RgbaColor> {
  const map: Record<string, RgbaColor> = {};
  if (colorBy === 'status') {
    keys.forEach((key) => {
      map[key] = colorForStatus(key);
    });
    return map;
  }
  if (colorBy === 'tipologia') {
    keys.forEach((key) => {
      map[key] = colorForTipologia(key);
    });
    return map;
  }
  if (colorBy === 'quartos') {
    const values = keys
      .map((key) => parseQuartos(key))
      .filter((value): value is number => value != null);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    keys.forEach((key) => {
      const q = parseQuartos(key);
      if (q == null) {
        map[key] = [55, 65, 81, 235];
        return;
      }
      const t = max > min ? (q - min) / (max - min) : 1;
      map[key] = toRgba(mixRgb([233, 213, 255], [88, 28, 135], t));
    });
    return map;
  }
  const scores = keys.map((key) => padraoScore(key));
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 1;
  keys.forEach((key) => {
    const score = padraoScore(key);
    const t = max > min ? (score - min) / (max - min) : 1;
    map[key] = toRgba(mixRgb([255, 235, 59], [211, 47, 47], t));
  });
  return map;
}

function asFeatureCollection(value: unknown): FeatureCollection {
  if (!value || typeof value !== 'object') {
    throw new Error('Resposta invalida de dados.');
  }
  const fc = value as FeatureCollection;
  if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    throw new Error('FeatureCollection invalida.');
  }
  return fc;
}

function asArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v).trim()).filter(Boolean);
}

function pickColorKey(
  props: EmpreendimentoProperties,
  colorBy: ColorBy
): string {
  if (colorBy === 'status') return normalizeList(props.statuses)[0] || 'Sem status';
  if (colorBy === 'tipologia') return normalizeList(props.tipos)[0] || 'Sem tipologia';
  if (colorBy === 'quartos') return normalizeList(props.quartos)[0] || 'Sem quartos';
  return normalizeList(props.padroes)[0] || 'Sem padrao';
}

function matchesFilter(values: string[], selected: string[]): boolean {
  if (!selected.length) return true;
  return values.some((v) => selected.includes(v));
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function formatPt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function isCurrencyMetric(key: SocioMetricKey): boolean {
  return (
    key === 'rend_mensal_por_domicilio2026' ||
    key === 'rend_mensal_por_pessoa2026' ||
    key === 'total_alimentacao_dentro' ||
    key === 'total_alimentacao_fora' ||
    key === 'total_despesas_consumo' ||
    key === 'total_habitacao'
  );
}

function formatLegendMetricValue(value: number, key: SocioMetricKey): string {
  const currency = isCurrencyMetric(key);
  const abs = Math.abs(value);

  const compact =
    abs >= 1_000_000
      ? { divisor: 1_000_000, suffix: ' mi', digits: 2 }
      : abs >= 1_000
        ? { divisor: 1_000, suffix: ' mil', digits: 1 }
        : null;

  if (currency) {
    if (!compact) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(value);
    }
    const base = new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: compact.digits,
      minimumFractionDigits: compact.digits,
    }).format(value / compact.divisor);
    return `R$ ${base}${compact.suffix}`;
  }

  if (!compact) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
  }
  const base = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: compact.digits,
    minimumFractionDigits: compact.digits,
  }).format(value / compact.divisor);
  return `${base}${compact.suffix}`;
}

function socioLegendUnitLabel(key: SocioMetricKey, maxValue: number): string {
  const abs = Math.abs(maxValue);
  const currency = isCurrencyMetric(key);
  if (currency && abs >= 1_000_000) return 'Escala: R$ em milhoes';
  if (currency && abs >= 1_000) return 'Escala: R$ em milhares';
  if (currency) return 'Escala: R$';
  if (abs >= 1_000_000) return 'Escala: valores em milhoes';
  if (abs >= 1_000) return 'Escala: valores em milhares';
  return 'Escala: valor absoluto';
}

function socioLegendGradient(mode: SocioRenderMode): string {
  if (mode === 'choropleth') {
    return 'linear-gradient(to top, rgb(240,253,244), rgb(187,247,208), rgb(74,222,128), rgb(21,128,61))';
  }
  if (mode === 'heatmap') {
    return 'linear-gradient(to top, rgb(255,245,240), rgb(252,146,114), rgb(239,59,44), rgb(153,0,13))';
  }
  if (mode === 'hexbin') {
    return 'linear-gradient(to top, rgb(239,246,255), rgb(191,219,254), rgb(129,140,248), rgb(91,33,182))';
  }
  return 'linear-gradient(to top, rgb(241,245,249), rgb(100,116,139))';
}

function finiteOrZero(value: number | null | undefined): number {
  if (value == null) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeDivide(dividend: number, divisor: number): number {
  return divisor > 0 ? dividend / divisor : 0;
}

function normalizeDormitorioLabel(value: string): string {
  const match = String(value || '').match(/\d+/);
  return match ? `${match[0]} dormitório(s)` : String(value || '').trim() || 'Sem quartos';
}

function formatDynamicCell(
  value: string | number | null,
  format: DynamicTableColumn['format']
): string {
  if (value == null || value === '') return '-';
  if (typeof value !== 'number') return String(value);
  if (!Number.isFinite(value)) return '-';
  if (format === 'int') return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value);
  if (format === 'percent') {
    return `${new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }).format(value * 100)}%`;
  }
  if (format === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function sectorMetricValue(row: SectorIndexRow, key: SocioMetricKey): number | null {
  const value = row[key];
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getSectorCodeFromFeature(feature: Feature): string {
  const props = (feature.properties ?? {}) as SectorGeometryProperties;
  return String(props.CD_SETOR ?? props.cd_setor ?? feature.id ?? '').trim();
}

function computeSocioSummary(
  sectorRows: SectorIndexRow[],
  areaRings: PolygonRings | null
): {
  sectors: number;
  domicilios: number;
  pessoas: number;
  rendaDom: number | null;
  rendaPessoa: number | null;
  alimentDentro: number;
  alimentFora: number;
} {
  const rows = areaRings
    ? sectorRows.filter((row) => pointInPolygonRings(row.centroid, areaRings))
    : sectorRows;

  let domicilios = 0;
  let pessoas = 0;
  let alimentDentro = 0;
  let alimentFora = 0;

  let rendaDomWeighted = 0;
  let rendaDomWeight = 0;
  let rendaPessoaWeighted = 0;
  let rendaPessoaWeight = 0;

  for (const row of rows) {
    const d = Number(row.domicilios_26 ?? 0);
    const p = Number(row.nr_pessoas_v0001 ?? 0);
    domicilios += d;
    pessoas += p;
    alimentDentro += Number(row.total_alimentacao_dentro ?? 0);
    alimentFora += Number(row.total_alimentacao_fora ?? 0);

    if (row.rend_mensal_por_domicilio2026 != null && d > 0) {
      rendaDomWeighted += Number(row.rend_mensal_por_domicilio2026) * d;
      rendaDomWeight += d;
    }
    if (row.rend_mensal_por_pessoa2026 != null && p > 0) {
      rendaPessoaWeighted += Number(row.rend_mensal_por_pessoa2026) * p;
      rendaPessoaWeight += p;
    }
  }

  return {
    sectors: rows.length,
    domicilios,
    pessoas,
    rendaDom: rendaDomWeight > 0 ? rendaDomWeighted / rendaDomWeight : null,
    rendaPessoa: rendaPessoaWeight > 0 ? rendaPessoaWeighted / rendaPessoaWeight : null,
    alimentDentro,
    alimentFora,
  };
}

function MapNoticeBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 backdrop-blur-sm px-4 py-2.5 shadow-lg max-w-[520px] w-[calc(100%-2rem)]">
      <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Página de testes — API × Mapas</p>
        <p className="text-[11px] text-amber-600/90 dark:text-amber-400/80 mt-0.5 leading-relaxed">
          Esta visualização usa uma base de dados estática local. O objetivo futuro é substituí-la por dados ao vivo das APIs, integrando os fluxos de Análise de Mercado com a setorização e os filtros do mapa.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors mt-0.5"
        aria-label="Fechar aviso"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function Index() {
  const [activeArea, setActiveArea] = useState<FeatureCollection | null>(null);
  const [areaMode, setAreaMode] = useState<AreaMode>('city');
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<LonLat[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [socioDockVisible, setSocioDockVisible] = useState(true);
  const [pinColorDockVisible, setPinColorDockVisible] = useState(false);
  const [socioLegendDockVisible, setSocioLegendDockVisible] = useState(false);
  const [pinsHidden, setPinsHidden] = useState(false);
  const [socioPanelOpen, setSocioPanelOpen] = useState(true);
  const [tablesPanelOpen, setTablesPanelOpen] = useState(false);
  const [selectedReportSection, setSelectedReportSection] = useState<ReportSectionKey>('vertical');
  const [tablesBusy, setTablesBusy] = useState(false);
  const [colorBy, setColorBy] = useState<ColorBy>('status');
  const [socioRenderMode, setSocioRenderMode] = useState<SocioRenderMode>('none');
  const [socioMetric, setSocioMetric] = useState<SocioMetricKey>('rend_mensal_por_domicilio2026');
  const [socioOpacity, setSocioOpacity] = useState(0.72);
  const [heatmapRadius, setHeatmapRadius] = useState(45);
  const [heatmapIntensity, setHeatmapIntensity] = useState(1.1);
  const [hexRadius, setHexRadius] = useState(120);

  const [selectedTipologias, setSelectedTipologias] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedQuartos, setSelectedQuartos] = useState<string[]>([]);
  const [selectedPadroes, setSelectedPadroes] = useState<string[]>([]);
  const [analysisSnapshot, setAnalysisSnapshot] = useState<AnalysisSnapshot>({
    area: null,
    selectedTipologias: [],
    selectedStatus: [],
    selectedQuartos: [],
    selectedPadroes: [],
  });

  const uploadInputRef = useRef<HTMLInputElement>(null);

  const studyQuery = useQuery({
    queryKey: ['study-ready-curitiba'],
    queryFn: async () => {
      const [empRes, sectorRes, sectorGeoRes, tipologiasRes] = await Promise.all([
        fetch('/data/study/current/empreendimentos.geojson', { cache: 'force-cache' }),
        fetch('/data/study/current/sector_index.json', { cache: 'force-cache' }),
        fetch('/data/pof_setores_2026/4106902.geojson', { cache: 'force-cache' }),
        fetch('/data/study/current/tipologias_index.json', { cache: 'force-cache' }),
      ]);

      if (!empRes.ok) throw new Error(`Falha ao carregar empreendimentos (${empRes.status})`);
      if (!sectorRes.ok) throw new Error(`Falha ao carregar indice setorial (${sectorRes.status})`);
      if (!sectorGeoRes.ok) {
        throw new Error(`Falha ao carregar geometria setorial (${sectorGeoRes.status})`);
      }
      if (!tipologiasRes.ok) {
        throw new Error(`Falha ao carregar base tipologias (${tipologiasRes.status})`);
      }

      const empreendimentos = asFeatureCollection(await empRes.json());
      const sectorIndex = asArray<SectorIndexRow>(await sectorRes.json());
      const sectorGeometries = asFeatureCollection(await sectorGeoRes.json());
      const tipologias = asArray<TipologiaRow>(await tipologiasRes.json());

      return { empreendimentos, sectorIndex, sectorGeometries, tipologias };
    },
  });

  const empreendimentos = studyQuery.data?.empreendimentos;
  const sectorIndex = studyQuery.data?.sectorIndex ?? [];
  const sectorGeometries = studyQuery.data?.sectorGeometries;
  const tipologiasIndex = studyQuery.data?.tipologias ?? [];

  const activeAreaRings = useMemo(
    () => featureCollectionFirstPolygonRings(activeArea),
    [activeArea]
  );

  const rawFeatures = useMemo(() => {
    return (empreendimentos?.features ?? []) as Feature<Point, EmpreendimentoProperties>[];
  }, [empreendimentos]);

  const optionTipologias = useMemo(() => {
    const set = new Set<string>();
    rawFeatures.forEach((f) => normalizeList(f.properties?.tipos).forEach((v) => set.add(v)));
    return Array.from(set).sort();
  }, [rawFeatures]);
  const optionStatus = useMemo(() => {
    const set = new Set<string>();
    rawFeatures.forEach((f) => normalizeList(f.properties?.statuses).forEach((v) => set.add(v)));
    return Array.from(set).sort();
  }, [rawFeatures]);
  const optionQuartos = useMemo(() => {
    const set = new Set<string>();
    rawFeatures.forEach((f) => normalizeList(f.properties?.quartos).forEach((v) => set.add(v)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [rawFeatures]);
  const optionPadroes = useMemo(() => {
    const set = new Set<string>();
    rawFeatures.forEach((f) => normalizeList(f.properties?.padroes).forEach((v) => set.add(v)));
    return Array.from(set).sort((a, b) => padraoScore(b) - padraoScore(a));
  }, [rawFeatures]);

  const visibleFeatures = useMemo(() => {
    if (pinsHidden) return [];
    return rawFeatures.filter((feature) => {
      const props = feature.properties ?? ({} as EmpreendimentoProperties);
      const [lon, lat] = feature.geometry?.coordinates ?? [];
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
      if (activeAreaRings && !pointInPolygonRings([lon, lat], activeAreaRings)) return false;

      const statuses = normalizeList(props.statuses);
      const tipologias = normalizeList(props.tipos);
      const quartos = normalizeList(props.quartos);
      const padroes = normalizeList(props.padroes);

      if (!matchesFilter(tipologias, selectedTipologias)) return false;
      if (!matchesFilter(statuses, selectedStatus)) return false;
      if (!matchesFilter(quartos, selectedQuartos)) return false;
      if (!matchesFilter(padroes, selectedPadroes)) return false;

      return true;
    });
  }, [
    pinsHidden,
    rawFeatures,
    activeAreaRings,
    selectedTipologias,
    selectedStatus,
    selectedQuartos,
    selectedPadroes,
  ]);

  const colorLegendKeys = useMemo(() => {
    if (colorBy === 'status') return optionStatus;
    if (colorBy === 'tipologia') return optionTipologias;
    if (colorBy === 'quartos') return optionQuartos;
    return optionPadroes;
  }, [colorBy, optionStatus, optionTipologias, optionQuartos, optionPadroes]);

  const colorMap = useMemo(() => {
    return buildColorMap(colorLegendKeys, colorBy);
  }, [colorLegendKeys, colorBy]);

  const coloredPointCollection = useMemo<FeatureCollection>(() => {
    const features = visibleFeatures.map((feature) => {
      const props = (feature.properties ?? {}) as EmpreendimentoProperties;
      const key = pickColorKey(props, colorBy);
      return {
        ...feature,
        properties: {
          ...props,
          pinColorRgba: colorMap[key] ?? [55, 65, 81, 235],
        },
      };
    });
    return { type: 'FeatureCollection', features: features as any[] };
  }, [visibleFeatures, colorBy, colorMap]);

  const activeSectorRows = useMemo(() => {
    return activeAreaRings
      ? sectorIndex.filter((row) => pointInPolygonRings(row.centroid, activeAreaRings))
      : sectorIndex;
  }, [sectorIndex, activeAreaRings]);

  const activeSectorIds = useMemo(() => {
    return new Set(activeSectorRows.map((row) => String(row.cd_setor)));
  }, [activeSectorRows]);

  const activeFiltersCount =
    selectedTipologias.length +
    selectedStatus.length +
    selectedQuartos.length +
    selectedPadroes.length;

  const analysisAreaRings = useMemo(
    () => featureCollectionFirstPolygonRings(analysisSnapshot.area),
    [analysisSnapshot.area]
  );

  const analysisVisibleFeatures = useMemo(() => {
    return rawFeatures.filter((feature) => {
      const props = feature.properties ?? ({} as EmpreendimentoProperties);
      const [lon, lat] = feature.geometry?.coordinates ?? [];
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
      if (analysisAreaRings && !pointInPolygonRings([lon, lat], analysisAreaRings)) return false;

      const statuses = normalizeList(props.statuses);
      const tipologias = normalizeList(props.tipos);
      const quartos = normalizeList(props.quartos);
      const padroes = normalizeList(props.padroes);

      if (!matchesFilter(tipologias, analysisSnapshot.selectedTipologias)) return false;
      if (!matchesFilter(statuses, analysisSnapshot.selectedStatus)) return false;
      if (!matchesFilter(quartos, analysisSnapshot.selectedQuartos)) return false;
      if (!matchesFilter(padroes, analysisSnapshot.selectedPadroes)) return false;
      return true;
    });
  }, [
    rawFeatures,
    analysisAreaRings,
    analysisSnapshot.selectedTipologias,
    analysisSnapshot.selectedStatus,
    analysisSnapshot.selectedQuartos,
    analysisSnapshot.selectedPadroes,
  ]);

  const analysisVisibleEmpreendimentoIds = useMemo(() => {
    return new Set(
      analysisVisibleFeatures.map((feature) =>
        String((feature.properties as EmpreendimentoProperties | undefined)?.empreendimento_id ?? '')
      )
    );
  }, [analysisVisibleFeatures]);

  const analysisFilteredTipologiaRows = useMemo(() => {
    if (!tablesPanelOpen) return [];
    return tipologiasIndex.filter((row) => {
      const empId = String(row.empreendimento_id ?? '');
      if (!analysisVisibleEmpreendimentoIds.has(empId)) return false;

      const lon = Number(row.longitude);
      const lat = Number(row.latitude);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
      if (analysisAreaRings && !pointInPolygonRings([lon, lat], analysisAreaRings)) return false;

      if (!matchesFilter([String(row.tipo || '').trim()].filter(Boolean), analysisSnapshot.selectedTipologias)) return false;
      if (!matchesFilter([String(row.status || '').trim()].filter(Boolean), analysisSnapshot.selectedStatus)) return false;
      if (!matchesFilter([String(row.quartos || '').trim()].filter(Boolean), analysisSnapshot.selectedQuartos)) return false;
      if (!matchesFilter([String(row.padrao || '').trim()].filter(Boolean), analysisSnapshot.selectedPadroes)) return false;
      return true;
    });
  }, [
    tablesPanelOpen,
    tipologiasIndex,
    analysisVisibleEmpreendimentoIds,
    analysisAreaRings,
    analysisSnapshot.selectedTipologias,
    analysisSnapshot.selectedStatus,
    analysisSnapshot.selectedQuartos,
    analysisSnapshot.selectedPadroes,
  ]);

  const analysisActiveSectorRows = useMemo(() => {
    return analysisAreaRings
      ? sectorIndex.filter((row) => pointInPolygonRings(row.centroid, analysisAreaRings))
      : sectorIndex;
  }, [sectorIndex, analysisAreaRings]);

  const dynamicTables = useMemo<Record<ReportTableKey, DynamicTableData> | null>(() => {
    if (!tablesPanelOpen) return null;

    const empreendimentoRows = analysisVisibleFeatures.map((feature) => {
      const props = (feature.properties ?? {}) as EmpreendimentoProperties;
      return {
        empreendimento_id: String(props.empreendimento_id ?? ''),
        tipo: normalizeList(props.tipos)[0] || 'Sem tipo',
        padrao: normalizeList(props.padroes)[0] || 'Sem padrao',
        oferta_lancada: finiteOrZero(props.oferta_lancada as number | null | undefined),
        oferta_final: finiteOrZero(props.oferta_final as number | null | undefined),
        vgv_total: finiteOrZero(props.vgv_total as number | null | undefined),
        vgv_oferta_final: finiteOrZero(props.vgv_oferta_final as number | null | undefined),
      };
    });

    const buildPadraoResumo = (tipo: 'Vertical' | 'Horizontal' | 'Comercial') => {
      const rows = empreendimentoRows.filter(
        (row) => normalizeToken(row.tipo) === normalizeToken(tipo)
      );
      const byPadrao = new Map<
        string,
        {
          qtd: number;
          ofertaLancada: number;
          ofertaFinal: number;
          vgvTotal: number;
          vgvOfertaFinal: number;
        }
      >();
      for (const row of rows) {
        const bucket = byPadrao.get(row.padrao) ?? {
          qtd: 0,
          ofertaLancada: 0,
          ofertaFinal: 0,
          vgvTotal: 0,
          vgvOfertaFinal: 0,
        };
        bucket.qtd += 1;
        bucket.ofertaLancada += row.oferta_lancada;
        bucket.ofertaFinal += row.oferta_final;
        bucket.vgvTotal += row.vgv_total;
        bucket.vgvOfertaFinal += row.vgv_oferta_final;
        byPadrao.set(row.padrao, bucket);
      }
      const totalQtd = rows.length;
      const totalOfertaLancada = rows.reduce((acc, row) => acc + row.oferta_lancada, 0);
      const totalOfertaFinal = rows.reduce((acc, row) => acc + row.oferta_final, 0);
      const result = Array.from(byPadrao.entries()).map(([padrao, bucket]) => ({
        padrao,
        quantidade: bucket.qtd,
        porcentagem_empreendimentos: safeDivide(bucket.qtd, totalQtd),
        oferta_lancada: bucket.ofertaLancada,
        oferta_lancada_porcentagem: safeDivide(bucket.ofertaLancada, totalOfertaLancada),
        oferta_final: bucket.ofertaFinal,
        oferta_final_porcentagem: safeDivide(bucket.ofertaFinal, totalOfertaFinal),
        disponibilidade_sobre_oferta_lancada: safeDivide(
          bucket.ofertaFinal,
          bucket.ofertaLancada
        ),
        vgv_total: bucket.vgvTotal,
        vgv_oferta_final: bucket.vgvOfertaFinal,
      }));
      result.sort((a, b) => b.quantidade - a.quantidade);
      return result;
    };

    const buildPrecoMedio = (tipo: 'Vertical' | 'Horizontal' | 'Comercial') => {
      const rows = analysisFilteredTipologiaRows.filter(
        (row) => normalizeToken(row.tipo) === normalizeToken(tipo)
      );
      const byPadrao = new Map<
        string,
        { weight: number; precoSum: number; m2Sum: number; precoCount: number; m2Count: number }
      >();
      for (const row of rows) {
        const padrao = row.padrao || 'Sem padrao';
        const weightBase = finiteOrZero(row.unidades_tipologia);
        const weight = weightBase > 0 ? weightBase : 1;
        const bucket = byPadrao.get(padrao) ?? {
          weight: 0,
          precoSum: 0,
          m2Sum: 0,
          precoCount: 0,
          m2Count: 0,
        };
        const preco = Number(row.preco);
        const valorM2 = Number(row.valor_m2_priv);
        if (Number.isFinite(preco) && preco > 0) {
          bucket.precoSum += preco * weight;
          bucket.precoCount += weight;
        }
        if (Number.isFinite(valorM2) && valorM2 > 0) {
          bucket.m2Sum += valorM2 * weight;
          bucket.m2Count += weight;
        }
        bucket.weight += weight;
        byPadrao.set(padrao, bucket);
      }
      return Array.from(byPadrao.entries())
        .map(([padrao, bucket]) => ({
          padrao,
          preco_medio: safeDivide(bucket.precoSum, bucket.precoCount),
          preco_medio_metro: safeDivide(bucket.m2Sum, bucket.m2Count),
        }))
        .sort((a, b) => a.padrao.localeCompare(b.padrao, 'pt-BR'));
    };

    const verticalRows = analysisFilteredTipologiaRows.filter(
      (row) => normalizeToken(row.tipo) === 'vertical'
    );
    const byDormM2 = new Map<
      string,
      {
        areaMin: number;
        areaMax: number;
        areaSum: number;
        areaCount: number;
        precoMin: number;
        precoMax: number;
        precoSum: number;
        precoCount: number;
      }
    >();
    const byDormOferta = new Map<string, { ofertaLancada: number; ofertaFinal: number }>();

    for (const row of verticalRows) {
      const dormLabel = normalizeDormitorioLabel(row.quartos);
      const area = Number(row.m2_priv);
      const precoM2 = Number(row.valor_m2_priv);
      const ofertaLancadaTipologia = finiteOrZero(row.unidades_tipologia);
      const ofertaFinalTipologia = finiteOrZero(row.oferta_final_tipologia);

      const m2Bucket = byDormM2.get(dormLabel) ?? {
        areaMin: Number.POSITIVE_INFINITY,
        areaMax: Number.NEGATIVE_INFINITY,
        areaSum: 0,
        areaCount: 0,
        precoMin: Number.POSITIVE_INFINITY,
        precoMax: Number.NEGATIVE_INFINITY,
        precoSum: 0,
        precoCount: 0,
      };
      if (Number.isFinite(area) && area > 0) {
        m2Bucket.areaMin = Math.min(m2Bucket.areaMin, area);
        m2Bucket.areaMax = Math.max(m2Bucket.areaMax, area);
        m2Bucket.areaSum += area;
        m2Bucket.areaCount += 1;
      }
      if (Number.isFinite(precoM2) && precoM2 > 0) {
        m2Bucket.precoMin = Math.min(m2Bucket.precoMin, precoM2);
        m2Bucket.precoMax = Math.max(m2Bucket.precoMax, precoM2);
        m2Bucket.precoSum += precoM2;
        m2Bucket.precoCount += 1;
      }
      byDormM2.set(dormLabel, m2Bucket);

      const ofertaBucket = byDormOferta.get(dormLabel) ?? { ofertaLancada: 0, ofertaFinal: 0 };
      ofertaBucket.ofertaLancada += ofertaLancadaTipologia;
      ofertaBucket.ofertaFinal += ofertaFinalTipologia;
      byDormOferta.set(dormLabel, ofertaBucket);
    }

    const verticalPadrao = buildPadraoResumo('Vertical');
    const horizontalPadrao = buildPadraoResumo('Horizontal');
    const comercialPadrao = buildPadraoResumo('Comercial');
    const verticalPreco = buildPrecoMedio('Vertical');
    const horizontalPreco = buildPrecoMedio('Horizontal');
    const comercialPreco = buildPrecoMedio('Comercial');

    const m2PrivRows = Array.from(byDormM2.entries())
      .map(([tipologia, bucket]) => ({
        tipologia,
        area_minima: bucket.areaCount ? bucket.areaMin : 0,
        area_media: safeDivide(bucket.areaSum, bucket.areaCount),
        area_maxima: bucket.areaCount ? bucket.areaMax : 0,
        preco_minimo: bucket.precoCount ? bucket.precoMin : 0,
        preco_medio: safeDivide(bucket.precoSum, bucket.precoCount),
        preco_maximo: bucket.precoCount ? bucket.precoMax : 0,
      }))
      .sort((a, b) => a.tipologia.localeCompare(b.tipologia, 'pt-BR', { numeric: true }));

    const ofertaRowsRaw = Array.from(byDormOferta.entries())
      .map(([tipoImovel, bucket]) => ({
        tipo_imovel: tipoImovel,
        oferta_lancada: bucket.ofertaLancada,
        oferta_final: bucket.ofertaFinal,
      }))
      .sort((a, b) => a.tipo_imovel.localeCompare(b.tipo_imovel, 'pt-BR', { numeric: true }));
    const ofertaLancadaTotal = ofertaRowsRaw.reduce((acc, row) => acc + row.oferta_lancada, 0);
    const ofertaFinalTotal = ofertaRowsRaw.reduce((acc, row) => acc + row.oferta_final, 0);
    const m2OfertaRows = ofertaRowsRaw.map((row) => ({
      ...row,
      porcentagem_oferta_lancada: safeDivide(row.oferta_lancada, ofertaLancadaTotal),
      porcentagem_oferta_final: safeDivide(row.oferta_final, ofertaFinalTotal),
      dispo_s_ol: safeDivide(row.oferta_final, row.oferta_lancada),
    }));

    const tipologiasRows = analysisFilteredTipologiaRows
      .slice(0, 1500)
      .map((row, index) => ({
        ordem: index + 1,
        empreendimento_id: row.empreendimento_id,
        tipologia_id: row.tipologia_id,
        empreendimento: row.empreendimento,
        status: row.status,
        tipo: row.tipo,
        bairro: row.bairro,
        quartos: row.quartos,
        padrao: row.padrao,
        oferta_lancada: finiteOrZero(row.oferta_lancada_empreendimento),
        oferta_final: finiteOrZero(row.oferta_final_empreendimento),
        preco: finiteOrZero(row.preco),
        m2_priv: finiteOrZero(row.m2_priv),
        valor_m2_priv: finiteOrZero(row.valor_m2_priv),
      }));

    const padraoColumns: DynamicTableColumn[] = [
      { key: 'padrao', label: 'Padrao', format: 'text' },
      { key: 'quantidade', label: 'Quantidade', format: 'int' },
      { key: 'porcentagem_empreendimentos', label: '% Empreendimentos', format: 'percent' },
      { key: 'oferta_lancada', label: 'Oferta Lancada', format: 'float' },
      { key: 'oferta_lancada_porcentagem', label: '% Oferta Lancada', format: 'percent' },
      { key: 'oferta_final', label: 'Oferta Final', format: 'float' },
      { key: 'oferta_final_porcentagem', label: '% Oferta Final', format: 'percent' },
      { key: 'disponibilidade_sobre_oferta_lancada', label: 'DISPO.S/O.L', format: 'percent' },
    ];

    const vgvColumns: DynamicTableColumn[] = [
      { key: 'padrao', label: 'Padrao', format: 'text' },
      { key: 'vgv', label: 'VGV', format: 'currency' },
    ];

    const precoColumns: DynamicTableColumn[] = [
      { key: 'padrao', label: 'Padrao', format: 'text' },
      { key: 'preco_medio', label: 'Preco Medio', format: 'currency' },
      { key: 'preco_medio_metro', label: 'Preco Medio Metro', format: 'float' },
    ];

    const tableMap: Record<ReportTableKey, DynamicTableData> = {
      vertical: {
        key: 'vertical',
        title: REPORT_TABLE_TITLES.vertical,
        columns: padraoColumns,
        rows: verticalPadrao,
      },
      vertical_vgv: {
        key: 'vertical_vgv',
        title: REPORT_TABLE_TITLES.vertical_vgv,
        columns: vgvColumns,
        rows: verticalPadrao.map((row) => ({ padrao: row.padrao, vgv: row.vgv_oferta_final })),
      },
      vertical_vgv_lancado: {
        key: 'vertical_vgv_lancado',
        title: REPORT_TABLE_TITLES.vertical_vgv_lancado,
        columns: vgvColumns,
        rows: verticalPadrao.map((row) => ({ padrao: row.padrao, vgv: row.vgv_total })),
      },
      vertical_preco_medio: {
        key: 'vertical_preco_medio',
        title: REPORT_TABLE_TITLES.vertical_preco_medio,
        columns: precoColumns,
        rows: verticalPreco,
      },
      vertical_m2_privativo: {
        key: 'vertical_m2_privativo',
        title: REPORT_TABLE_TITLES.vertical_m2_privativo,
        columns: [
          { key: 'tipologia', label: 'Tipologia', format: 'text' },
          { key: 'area_minima', label: 'Area Minima', format: 'float' },
          { key: 'area_media', label: 'Area Media', format: 'float' },
          { key: 'area_maxima', label: 'Area Maxima', format: 'float' },
          { key: 'preco_minimo', label: 'Preco Minimo', format: 'float' },
          { key: 'preco_medio', label: 'Preco Medio', format: 'float' },
          { key: 'preco_maximo', label: 'Preco Maximo', format: 'float' },
        ],
        rows: m2PrivRows,
      },
      vertical_m2_oferta: {
        key: 'vertical_m2_oferta',
        title: REPORT_TABLE_TITLES.vertical_m2_oferta,
        columns: [
          { key: 'tipo_imovel', label: 'Tipo Imovel', format: 'text' },
          { key: 'oferta_lancada', label: 'Oferta Lancada', format: 'float' },
          { key: 'porcentagem_oferta_lancada', label: '% Oferta Lancada', format: 'percent' },
          { key: 'oferta_final', label: 'Oferta Final', format: 'float' },
          { key: 'porcentagem_oferta_final', label: '% Oferta Final', format: 'percent' },
          { key: 'dispo_s_ol', label: 'DISPO.S/O.L', format: 'percent' },
        ],
        rows: m2OfertaRows,
      },
      horizontal: {
        key: 'horizontal',
        title: REPORT_TABLE_TITLES.horizontal,
        columns: padraoColumns,
        rows: horizontalPadrao,
      },
      horizontal_vgv: {
        key: 'horizontal_vgv',
        title: REPORT_TABLE_TITLES.horizontal_vgv,
        columns: vgvColumns,
        rows: horizontalPadrao.map((row) => ({ padrao: row.padrao, vgv: row.vgv_oferta_final })),
      },
      horizontal_vgv_lancado: {
        key: 'horizontal_vgv_lancado',
        title: REPORT_TABLE_TITLES.horizontal_vgv_lancado,
        columns: vgvColumns,
        rows: horizontalPadrao.map((row) => ({ padrao: row.padrao, vgv: row.vgv_total })),
      },
      horizontal_preco_medio: {
        key: 'horizontal_preco_medio',
        title: REPORT_TABLE_TITLES.horizontal_preco_medio,
        columns: precoColumns,
        rows: horizontalPreco,
      },
      comercial: {
        key: 'comercial',
        title: REPORT_TABLE_TITLES.comercial,
        columns: padraoColumns,
        rows: comercialPadrao,
      },
      comercial_vgv: {
        key: 'comercial_vgv',
        title: REPORT_TABLE_TITLES.comercial_vgv,
        columns: vgvColumns,
        rows: comercialPadrao.map((row) => ({ padrao: row.padrao, vgv: row.vgv_oferta_final })),
      },
      comercial_vgv_lancado: {
        key: 'comercial_vgv_lancado',
        title: REPORT_TABLE_TITLES.comercial_vgv_lancado,
        columns: vgvColumns,
        rows: comercialPadrao.map((row) => ({ padrao: row.padrao, vgv: row.vgv_total })),
      },
      comercial_preco_medio: {
        key: 'comercial_preco_medio',
        title: REPORT_TABLE_TITLES.comercial_preco_medio,
        columns: precoColumns,
        rows: comercialPreco,
      },
      tipologias: {
        key: 'tipologias',
        title: REPORT_TABLE_TITLES.tipologias,
        columns: [
          { key: 'ordem', label: '#', format: 'int' },
          { key: 'empreendimento_id', label: 'ID Empreendimento', format: 'text' },
          { key: 'tipologia_id', label: 'ID Tipologia', format: 'text' },
          { key: 'empreendimento', label: 'Empreendimento', format: 'text' },
          { key: 'status', label: 'Status', format: 'text' },
          { key: 'tipo', label: 'Tipo', format: 'text' },
          { key: 'bairro', label: 'Bairro', format: 'text' },
          { key: 'quartos', label: 'Quartos', format: 'text' },
          { key: 'padrao', label: 'Padrao', format: 'text' },
          { key: 'oferta_lancada', label: 'Oferta Lancada', format: 'float' },
          { key: 'oferta_final', label: 'Oferta Final', format: 'float' },
          { key: 'preco', label: 'Preco', format: 'currency' },
          { key: 'm2_priv', label: 'M2 Priv.', format: 'float' },
          { key: 'valor_m2_priv', label: 'Valor M2 Priv.', format: 'float' },
        ],
        rows: tipologiasRows,
      },
    };

    return tableMap;
  }, [tablesPanelOpen, analysisVisibleFeatures, analysisFilteredTipologiaRows]);

  const reportSectionCards = useMemo(() => {
    return REPORT_SECTION_CONFIG.map((section) => {
      const availableCount = dynamicTables
        ? section.tableKeys.reduce(
            (acc, tableKey) => acc + (dynamicTables[tableKey].rows.length > 0 ? 1 : 0),
            0
          )
        : 0;
      return {
        ...section,
        availableCount,
        totalCount: section.tableKeys.length,
        disabled: Boolean(dynamicTables) && availableCount === 0,
      };
    });
  }, [dynamicTables]);

  const selectedSectionTables = useMemo<DynamicTableData[]>(() => {
    const section = REPORT_SECTION_CONFIG.find((item) => item.key === selectedReportSection);
    if (!section || !dynamicTables) return [];
    return section.tableKeys.map((tableKey) => dynamicTables[tableKey]);
  }, [dynamicTables, selectedReportSection]);

  const selectedSectionSummary = useMemo(() => {
    const renderedTables = selectedSectionTables.filter((table) => table.rows.length > 0).length;
    const totalRows = selectedSectionTables.reduce((acc, table) => acc + table.rows.length, 0);
    return { renderedTables, totalRows };
  }, [selectedSectionTables]);

  useEffect(() => {
    if (!tablesPanelOpen || !dynamicTables) return;
    const activeSection = reportSectionCards.find((section) => section.key === selectedReportSection);
    if (activeSection && !activeSection.disabled) return;
    const fallbackSection = reportSectionCards.find((section) => !section.disabled);
    if (fallbackSection && fallbackSection.key !== selectedReportSection) {
      setSelectedReportSection(fallbackSection.key);
    }
  }, [tablesPanelOpen, dynamicTables, reportSectionCards, selectedReportSection]);

  useEffect(() => {
    if (!tablesPanelOpen && !socioPanelOpen) {
      setTablesBusy(false);
      return;
    }
    setTablesBusy(true);
    const timer = window.setTimeout(() => setTablesBusy(false), 260);
    return () => window.clearTimeout(timer);
  }, [
    selectedReportSection,
    tablesPanelOpen,
    socioPanelOpen,
    analysisSnapshot.area,
    analysisSnapshot.selectedTipologias,
    analysisSnapshot.selectedStatus,
    analysisSnapshot.selectedQuartos,
    analysisSnapshot.selectedPadroes,
    analysisVisibleFeatures.length,
    analysisFilteredTipologiaRows.length,
  ]);

  const socioPointRows = useMemo<SocioPointRow[]>(() => {
    const rows: SocioPointRow[] = [];
    for (const row of activeSectorRows) {
      const value = sectorMetricValue(row, socioMetric);
      if (value == null) continue;
      rows.push({
        cd_setor: String(row.cd_setor),
        position: row.centroid,
        value,
      });
    }
    return rows;
  }, [activeSectorRows, socioMetric]);

  const socioLegendRange = useMemo<{ min: number; max: number } | null>(() => {
    if (!socioPointRows.length) return null;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const row of socioPointRows) {
      if (!Number.isFinite(row.value)) continue;
      min = Math.min(min, row.value);
      max = Math.max(max, row.value);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
  }, [socioPointRows]);

  const socioMetricLabel = useMemo(
    () => SOCIO_METRIC_OPTIONS.find((metric) => metric.key === socioMetric)?.label ?? socioMetric,
    [socioMetric]
  );

  const socioPolygonCollection = useMemo<FeatureCollection>(() => {
    if (!sectorGeometries?.features?.length) {
      return { type: 'FeatureCollection', features: [] };
    }
    const valueBySector = new Map<string, number>();
    for (const row of activeSectorRows) {
      const value = sectorMetricValue(row, socioMetric);
      if (value == null) continue;
      valueBySector.set(String(row.cd_setor), value);
    }

    const features = sectorGeometries.features
      .filter((feature) => {
        const cdSetor = getSectorCodeFromFeature(feature as Feature);
        return activeSectorIds.has(cdSetor);
      })
      .map((feature) => {
        const cdSetor = getSectorCodeFromFeature(feature as Feature);
        const metricValue = valueBySector.get(cdSetor) ?? null;
        return {
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            __metric_value: metricValue,
            __metric_key: socioMetric,
          },
        };
      });

    return { type: 'FeatureCollection', features: features as any[] };
  }, [sectorGeometries, activeSectorRows, activeSectorIds, socioMetric]);

  const socioSummary = useMemo(
    () => computeSocioSummary(analysisActiveSectorRows, null),
    [analysisActiveSectorRows]
  );

  const setCityWideArea = () => {
    setDrawingMode(false);
    setDrawingPoints([]);
    setActiveArea(null);
    setAreaMode('city');
  };

  const beginDrawing = () => {
    setDrawingPoints([]);
    setDrawingMode(true);
    setActiveArea(null);
    setAreaMode('draw');
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3) {
      toast.error('Adicione ao menos 3 vertices para formar o poligono.');
      return;
    }
    setActiveArea(polygonRingsToFeatureCollection([drawingPoints]));
    setDrawingMode(false);
    setDrawingPoints([]);
    setAreaMode('draw');
  };

  const cancelDrawing = () => {
    setDrawingMode(false);
    setDrawingPoints([]);
    if (!activeArea) setAreaMode('city');
  };

  const handleUploadKmz = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const fc = await parseKmlOrKmzToPolygonFeatureCollection(file);
      setDrawingMode(false);
      setDrawingPoints([]);
      setActiveArea(fc);
      setAreaMode('kmz');
      toast.success(`Area carregada de ${file.name}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Falha ao ler KMZ/KML: ${msg}`);
    } finally {
      event.target.value = '';
    }
  };

  const refreshAnalysisSnapshot = () => {
    setAnalysisSnapshot({
      area: activeArea,
      selectedTipologias: [...selectedTipologias],
      selectedStatus: [...selectedStatus],
      selectedQuartos: [...selectedQuartos],
      selectedPadroes: [...selectedPadroes],
    });
  };

  const resetAllFilters = () => {
    setSelectedTipologias([]);
    setSelectedStatus([]);
    setSelectedQuartos([]);
    setSelectedPadroes([]);
    setPinsHidden(false);
  };

  const handlePinsAndFiltersPrimaryAction = () => {
    if (activeFiltersCount > 0) {
      resetAllFilters();
      return;
    }
    setPinsHidden((prev) => !prev);
  };

  const areaActionClass = (mode: AreaMode) =>
    `block w-full text-left text-sm transition-colors ${
      areaMode === mode
        ? 'font-semibold text-emerald-600'
        : 'font-normal text-muted-foreground hover:text-foreground'
    }`;

  const activeAreaDescription = drawingMode
    ? 'desenho em andamento'
    : areaMode === 'city'
      ? 'cidade inteira de Curitiba'
      : areaMode === 'kmz'
        ? 'KMZ/KML carregado'
        : 'desenho no mapa';

  const pulseLoading = tablesBusy || studyQuery.isFetching;

  if (studyQuery.isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando pacote do estudo...
      </div>
    );
  }

  if (studyQuery.isError || !empreendimentos) {
    const msg = studyQuery.error instanceof Error ? studyQuery.error.message : 'erro desconhecido';
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-8 text-center text-sm text-destructive">
        Falha ao iniciar modo estudo: {msg}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <MapNoticeBanner />
      <StudyMap
        points={coloredPointCollection}
        area={activeArea}
        drawingPoints={drawingPoints}
        drawMode={drawingMode}
        onMapClick={() => {
          setSocioDockVisible(false);
          setPinColorDockVisible(false);
          setSocioLegendDockVisible(false);
        }}
        onMapClickDraw={(point) => setDrawingPoints((prev) => [...prev, point])}
        socioMode={socioRenderMode}
        socioPolygons={socioPolygonCollection}
        socioPoints={socioPointRows}
        socioOpacity={socioOpacity}
        heatmapRadius={heatmapRadius}
        heatmapIntensity={heatmapIntensity}
        hexRadius={hexRadius}
      />

      {pulseLoading && (
        <div className="pointer-events-none absolute inset-0 z-[15] animate-pulse bg-background/10 backdrop-blur-[1.5px]" />
      )}

      {/* Collapsible Sidebar */}
      {sidebarCollapsed ? (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm"
            onClick={() => setSidebarCollapsed(false)}
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
          <img
            src={brainLogoName}
            alt="Brain Inteligencia Estrategica"
            className="pointer-events-none h-6 w-auto max-w-[42vw] opacity-30 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:h-7 sm:max-w-[170px]"
          />
        </div>
      ) : (
        <aside className="absolute left-3 top-3 z-20 flex max-h-[calc(100vh-1.5rem)] w-[340px] flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={brainLogoName}
                alt="Brain"
                className="h-4 w-auto max-w-[118px] shrink-0 object-contain opacity-90"
              />
              <h1 className="text-sm font-semibold text-foreground">Analise de Mercado</h1>
            </div>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-border bg-background p-2">
              <div className="text-muted-foreground">Pins visiveis</div>
              <div className="text-base font-semibold">{visibleFeatures.length}</div>
            </div>
            <div className="rounded border border-border bg-background p-2">
              <div className="text-muted-foreground">Empreendimentos base</div>
              <div className="text-base font-semibold">{rawFeatures.length}</div>
            </div>
          </div>

          <div className="space-y-2 rounded border border-border bg-background p-2">
            <p className="text-xs font-semibold">Pre-selecao da area</p>
            <div className="space-y-1.5">
              <button type="button" className={areaActionClass('city')} onClick={setCityWideArea}>
                Cidade inteira
              </button>
              <button
                type="button"
                className={areaActionClass('kmz')}
                onClick={() => uploadInputRef.current?.click()}
              >
                Carregar KMZ
              </button>
              <button
                type="button"
                className={areaActionClass('draw')}
                onClick={() => (drawingMode ? finishDrawing() : beginDrawing())}
              >
                Desenhar area
              </button>
            </div>
            {drawingMode && (
              <div className="flex items-center gap-3 text-[11px]">
                <button
                  type="button"
                  className="font-semibold text-emerald-600 hover:text-emerald-500"
                  onClick={finishDrawing}
                >
                  Finalizar desenho
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={cancelDrawing}
                >
                  Cancelar
                </button>
              </div>
            )}
            <input
              ref={uploadInputRef}
              type="file"
              accept=".kmz,.kml"
              className="hidden"
              onChange={handleUploadKmz}
            />
            <p className="text-[11px] text-muted-foreground">
              Area ativa: {activeAreaDescription}
            </p>
          </div>

          <div className="rounded border border-border bg-background p-2">
            <button
              type="button"
              onClick={handlePinsAndFiltersPrimaryAction}
              className="w-full rounded border border-input bg-card px-2 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-emerald-400 hover:text-emerald-700"
            >
              {activeFiltersCount > 0
                ? `Resetar filtros (${activeFiltersCount})`
                : pinsHidden
                  ? 'Resetar filtros'
                  : 'Ocultar empreendimentos'}
            </button>
          </div>
          <FilterGroup
            title="Tipologia"
            options={optionTipologias}
            selected={selectedTipologias}
            onToggle={(value) => {
              setPinsHidden(false);
              setSelectedTipologias((prev) => toggleInList(prev, value));
            }}
          />
          <FilterGroup
            title="Comercializacao (status)"
            options={optionStatus}
            selected={selectedStatus}
            onToggle={(value) => {
              setPinsHidden(false);
              setSelectedStatus((prev) => toggleInList(prev, value));
            }}
          />
          <FilterGroup
            title="Numero de quartos"
            options={optionQuartos}
            selected={selectedQuartos}
            onToggle={(value) => {
              setPinsHidden(false);
              setSelectedQuartos((prev) => toggleInList(prev, value));
            }}
          />
          <FilterGroup
            title="Padrao"
            options={optionPadroes}
            selected={selectedPadroes}
            onToggle={(value) => {
              setPinsHidden(false);
              setSelectedPadroes((prev) => toggleInList(prev, value));
            }}
          />
        </aside>
      )}


      <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
        {!socioPanelOpen && (
          <button
            type="button"
            className="rounded border border-border bg-card/95 px-2 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm"
            onClick={() => setSocioPanelOpen(true)}
          >
            Resumo socio
          </button>
        )}
        {socioPanelOpen && (
          <aside className="w-[310px] rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground">Resumo socio na area selecionada</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={refreshAnalysisSnapshot}
                >
                  Atualizar
                </button>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setSocioPanelOpen(false)}
                >
                  Recolher
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span>Setores</span>
              <span className="text-right">{formatPt(socioSummary.sectors)}</span>
              <span>Domicilios</span>
              <span className="text-right">{formatPt(socioSummary.domicilios)}</span>
              <span>Pessoas</span>
              <span className="text-right">{formatPt(socioSummary.pessoas)}</span>
              <span>Renda dom. media</span>
              <span className="text-right">{formatPt(socioSummary.rendaDom)}</span>
              <span>Renda pessoa media</span>
              <span className="text-right">{formatPt(socioSummary.rendaPessoa)}</span>
              <span>Total alimentacao dentro</span>
              <span className="text-right">{formatPt(socioSummary.alimentDentro)}</span>
              <span>Total alimentacao fora</span>
              <span className="text-right">{formatPt(socioSummary.alimentFora)}</span>
            </div>
            <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
              Espaco reservado para novas tabelas e relatorios da area selecionada.
            </div>
          </aside>
        )}

        <button
          type="button"
          className="rounded border border-border bg-card/95 px-2 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm hover:border-emerald-400 hover:text-emerald-700"
          onClick={() =>
            setTablesPanelOpen((prev) => {
              const next = !prev;
              if (!prev && next) refreshAnalysisSnapshot();
              return next;
            })
          }
        >
          {tablesPanelOpen ? 'Fechar tabelas' : 'Tabelas dinamicas'}
        </button>
      </div>

      {tablesPanelOpen && (
        <div className="absolute left-1/2 top-[84px] z-30 -translate-x-1/2 animate-in slide-in-from-right-24 fade-in duration-300">
          <aside className="w-[min(96vw,1120px)] rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={brainIcon}
                  alt="Brain icon"
                  className="h-6 w-6 shrink-0 rounded border border-border/70 object-cover"
                />
                <h2 className="truncate text-sm font-semibold text-foreground">
                  Relatorio de areas selecionadas (dinamico)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={refreshAnalysisSnapshot}
                >
                  Atualizar
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setTablesPanelOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 pb-1 sm:grid-cols-2 lg:grid-cols-4">
              {reportSectionCards.map((section) => {
                const active = selectedReportSection === section.key;
                const isTipologias = section.tone === 'yellow';
                const disabled = section.disabled;
                const stateClass = disabled
                  ? 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500'
                  : isTipologias
                    ? active
                      ? 'border-amber-500 bg-amber-300 text-amber-950 shadow-md'
                      : 'border-amber-300 bg-amber-100/95 text-amber-900 hover:border-amber-400 hover:bg-amber-200'
                    : active
                      ? 'border-emerald-500 bg-emerald-900 text-emerald-50 shadow-md'
                      : 'border-emerald-700 bg-emerald-800 text-emerald-50 hover:border-emerald-500 hover:bg-emerald-700';
                return (
                  <button
                    key={section.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedReportSection(section.key)}
                    className={`rounded-xl border px-3 py-2 text-left text-[11px] transition-all ${stateClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-wide">
                        {section.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          disabled
                            ? 'bg-slate-300/70 text-slate-600'
                            : isTipologias
                              ? 'bg-amber-500/20 text-amber-950'
                              : 'bg-emerald-950/35 text-emerald-50'
                        }`}
                      >
                        {section.availableCount}/{section.totalCount}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] opacity-90">{section.hint}</div>
                    {disabled && (
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide">
                        Sem dados na selecao
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 relative">
              {tablesBusy && (
                <div className="pointer-events-none absolute inset-0 z-10 animate-pulse rounded border border-border bg-background/50 backdrop-blur-sm" />
              )}
              <div
                className={`max-h-[62vh] overflow-auto rounded border border-border bg-background ${
                  tablesBusy ? 'blur-[1.5px]' : ''
                }`}
              >
                {selectedSectionTables.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Sem dados para a selecao atual de area e filtros.
                  </div>
                ) : (
                  <div className="space-y-3 p-2">
                    {selectedSectionTables.map((tableData) => (
                      <section
                        key={tableData.key}
                        className={`rounded-lg border ${
                          tableData.rows.length > 0
                            ? 'border-border bg-card/30'
                            : 'border-dashed border-border/80 bg-muted/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                            {tableData.title}
                          </h3>
                          <span className="text-[10px] text-muted-foreground">
                            {tableData.rows.length} linha(s)
                          </span>
                        </div>

                        {tableData.rows.length === 0 ? (
                          <div className="px-3 py-3 text-[11px] text-muted-foreground">
                            Sem dados para este bloco na selecao atual.
                          </div>
                        ) : (
                          <div className="max-h-[36vh] overflow-auto">
                            <table className="min-w-full border-collapse text-[11px]">
                              <thead className="sticky top-0 z-10 bg-card">
                                <tr>
                                  {tableData.columns.map((column) => (
                                    <th
                                      key={column.key}
                                      className="whitespace-nowrap border-b border-border px-2 py-1.5 text-left font-semibold text-foreground"
                                    >
                                      {column.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {tableData.rows.map((row, rowIndex) => (
                                  <tr
                                    key={`${tableData.key}-${rowIndex}`}
                                    className="odd:bg-background even:bg-muted/10"
                                  >
                                    {tableData.columns.map((column) => (
                                      <td
                                        key={`${tableData.key}-${rowIndex}-${column.key}`}
                                        className="whitespace-nowrap border-b border-border/50 px-2 py-1 text-muted-foreground"
                                      >
                                        {formatDynamicCell(
                                          (row[column.key] as string | number | null | undefined) ?? null,
                                          column.format
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {tableData.key === 'tipologias' &&
                          analysisFilteredTipologiaRows.length > tableData.rows.length && (
                            <div className="border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground">
                              Resultado limitado a {tableData.rows.length} linhas.
                            </div>
                          )}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {selectedSectionSummary.renderedTables} tabela(s) com dados e{' '}
              {selectedSectionSummary.totalRows} linha(s) renderizada(s) no total.
            </div>
          </aside>
        </div>
      )}

      <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2">
          {/* Pin Color Dock */}
          {pinColorDockVisible && (
            <div className="w-[min(92vw,520px)] rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
              <div className="text-[11px] font-semibold text-foreground">Cor dos pins</div>
              <div className="mt-2 flex gap-1 flex-wrap">
                {(['status', 'tipologia', 'quartos', 'padrao'] as ColorBy[]).map((option) => {
                  const labels: Record<ColorBy, string> = {
                    status: 'Comercializacao',
                    tipologia: 'Tipologia',
                    quartos: 'Quartos',
                    padrao: 'Padrao',
                  };
                  const active = colorBy === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColorBy(option)}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
                        active
                          ? 'border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-700'
                          : 'border-border bg-background text-muted-foreground hover:border-emerald-300'
                      }`}
                    >
                      {labels[option]}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {colorLegendKeys.map((key) => {
                  const rgba = colorMap[key] ?? [55, 65, 81, 235];
                  return (
                    <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `rgba(${rgba[0]},${rgba[1]},${rgba[2]},1)` }}
                      />
                      <span className="whitespace-nowrap">{key}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Socio Layers Dock */}
          {socioDockVisible && (
            <div className="w-[min(92vw,860px)] rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
              <div className="text-[11px] font-semibold text-foreground">Camadas socio</div>
              <div className="mt-2 rounded-lg border border-border bg-background p-2">
                <div className="text-[10px] font-semibold text-foreground">Dado socio (camada)</div>
                <select
                  className="mt-1 h-7 w-full rounded border border-input bg-background px-2 text-[11px]"
                  value={socioMetric}
                  onChange={(e) => setSocioMetric(e.target.value as SocioMetricKey)}
                >
                  {SOCIO_METRIC_OPTIONS.map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {SOCIO_MODE_CARDS.map((card) => {
                  const active = socioRenderMode === card.key;
                  const activeClass =
                    card.tone === 'green'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700'
                      : card.tone === 'red'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-700'
                        : card.tone === 'violet'
                          ? 'border-violet-500 bg-violet-500/10 text-violet-700'
                          : 'border-slate-500 bg-slate-500/10 text-slate-700';
                  const idleHoverClass =
                    card.tone === 'green'
                      ? 'hover:border-emerald-300'
                      : card.tone === 'red'
                        ? 'hover:border-rose-300'
                        : card.tone === 'violet'
                          ? 'hover:border-violet-300'
                          : 'hover:border-slate-300';
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setSocioRenderMode(card.key)}
                      className={`rounded-lg border p-2 text-left transition-colors ${
                        active
                          ? activeClass
                          : `border-border bg-background ${idleHoverClass}`
                      }`}
                    >
                      <div
                        className={`text-[11px] font-semibold ${
                          active ? '' : 'text-foreground'
                        }`}
                      >
                        {card.label}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{card.hint}</div>
                    </button>
                  );
                })}
              </div>

              {socioRenderMode !== 'none' && (
                <div className="mt-2 rounded-lg border border-border bg-background px-2 py-1.5 text-[10px] text-muted-foreground">
                  <label className="block">
                    Opacidade {Math.round(socioOpacity * 100)}%
                    <input
                      className="mt-0.5 w-full"
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={Math.round(socioOpacity * 100)}
                      onChange={(e) => setSocioOpacity(Number(e.target.value) / 100)}
                    />
                  </label>
                  {socioRenderMode === 'heatmap' && (
                    <>
                      <label className="mt-1 block">
                        Raio {heatmapRadius}px
                        <input
                          className="mt-0.5 w-full"
                          type="range"
                          min={20}
                          max={90}
                          step={1}
                          value={heatmapRadius}
                          onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                        />
                      </label>
                      <label className="mt-1 block">
                        Intensidade {heatmapIntensity.toFixed(1)}
                        <input
                          className="mt-0.5 w-full"
                          type="range"
                          min={0.5}
                          max={2.6}
                          step={0.1}
                          value={heatmapIntensity}
                          onChange={(e) => setHeatmapIntensity(Number(e.target.value))}
                        />
                      </label>
                    </>
                  )}
                  {socioRenderMode === 'hexbin' && (
                    <label className="mt-1 block">
                      Raio {hexRadius}m
                      <input
                        className="mt-0.5 w-full"
                        type="range"
                        min={60}
                        max={320}
                        step={10}
                        value={hexRadius}
                        onChange={(e) => setHexRadius(Number(e.target.value))}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPinColorDockVisible((v) => !v);
                setSocioDockVisible(false);
                setSocioLegendDockVisible(false);
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm"
            >
              <Palette className="h-4 w-4" />
              Cor dos pins
            </button>
            <button
              type="button"
              onClick={() => {
                setSocioDockVisible((v) => !v);
                setPinColorDockVisible(false);
                setSocioLegendDockVisible(false);
              }}
              className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm"
            >
              <span className="inline-flex h-4 w-4 flex-col items-center justify-center gap-0.5 rounded-sm border border-foreground/60 px-0.5">
                <span className="h-[1px] w-2 bg-foreground/70" />
                <span className="h-[1px] w-2 bg-foreground/70" />
                <span className="h-[1px] w-2 bg-foreground/70" />
              </span>
              Camadas
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
        {socioLegendDockVisible && (
          <div className="w-[280px] rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
            <div className="text-[11px] font-semibold text-foreground">Legenda da camada incluida</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{socioMetricLabel}</div>

            {socioRenderMode === 'none' ? (
              <div className="mt-2 rounded-lg border border-dashed border-border bg-background px-3 py-4 text-[11px] text-muted-foreground">
                Ative uma camada socio para visualizar a escala.
              </div>
            ) : !socioLegendRange ? (
              <div className="mt-2 rounded-lg border border-dashed border-border bg-background px-3 py-4 text-[11px] text-muted-foreground">
                Sem dados disponiveis para a selecao atual.
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-stretch gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <span className="text-[11px] font-semibold text-foreground">
                      {formatLegendMetricValue(socioLegendRange.max, socioMetric)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatLegendMetricValue(socioLegendRange.min, socioMetric)}
                    </span>
                  </div>
                  <div
                    className="h-36 w-5 rounded-full border border-border/70"
                    style={{ backgroundImage: socioLegendGradient(socioRenderMode) }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {socioLegendUnitLabel(socioMetric, socioLegendRange.max)}
                </div>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setSocioLegendDockVisible((v) => !v);
            setPinColorDockVisible(false);
            setSocioDockVisible(false);
          }}
          className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm"
        >
          <span
            className="h-4 w-4 rounded-sm border border-foreground/60"
            style={{ backgroundImage: socioLegendGradient(socioRenderMode) }}
          />
          Legenda camada
        </button>
      </div>

    </div>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-1 rounded border border-border bg-background p-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">{title}</p>
        <span className="text-[11px] text-muted-foreground">
          {selected.length ? `${selected.length} selecionado(s)` : 'todos'}
        </span>
      </div>
      <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
        {options.map((item) => {
          const active = selected.includes(item);
          return (
            <label key={item} className="flex cursor-pointer items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggle(item)}
                className="h-3.5 w-3.5 rounded border-input"
              />
              <span className={active ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                {item}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
