import { useMemo, useRef, type ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from './Charts';
import { displayCategoricalValue, normalizeCategoricalValue, purchaseIntentStatus } from './aggregate';
import type { CategoricalField, QuantiRecord } from './types';

type SeriesDefinition = {
  key: string;
  label: string;
  color: string;
  denominator: (row: QuantiRecord) => boolean;
  matches: (row: QuantiRecord) => boolean;
};

type HistoryPoint = Record<string, string | number | null> & { period: string };

const COLORS = ['#5B7537', '#71984a', '#8fb85f', '#b5cf7d', '#d7e3a8', '#F8D000'];

function comparableText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\s*\d+\.\s*/, '')
    .toLowerCase()
    .trim();
}

function quarterOf(row: QuantiRecord): { key: string; label: string; order: number } | null {
  const date = String(row.data_pesquisa ?? '').match(/^(\d{4})[-/]?(\d{2})/);
  if (!date) return null;
  const year = Number(date[1]);
  const month = Number(date[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return { key: `${year}-T${quarter}`, label: `T${quarter}/${year}`, order: year * 10 + quarter };
}

function historyByQuarter(rows: QuantiRecord[], definitions: SeriesDefinition[]): HistoryPoint[] {
  const buckets = new Map<string, { label: string; order: number; rows: QuantiRecord[] }>();
  for (const row of rows) {
    const quarter = quarterOf(row);
    if (!quarter) continue;
    const bucket = buckets.get(quarter.key) ?? { label: quarter.label, order: quarter.order, rows: [] };
    bucket.rows.push(row);
    buckets.set(quarter.key, bucket);
  }

  return [...buckets.entries()]
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([period, bucket]) => {
      const point: HistoryPoint = { period: bucket.label };
      for (const definition of definitions) {
        const base = bucket.rows.filter(definition.denominator);
        point[definition.key] = base.length
          ? Number(((base.filter(definition.matches).length / base.length) * 100).toFixed(1))
          : null;
      }
      return point;
    });
}

function topCategories(rows: QuantiRecord[], field: CategoricalField, limit: number, only?: (row: QuantiRecord) => boolean): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (only && !only(row)) continue;
    const value = normalizeCategoricalValue(field, (row as any)[field]);
    if (value == null) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .slice(0, limit)
    .map(([value]) => value);
}

function categoryDefinitions(
  rows: QuantiRecord[],
  field: CategoricalField,
  limit: number,
  denominator: (row: QuantiRecord) => boolean,
  matches: (row: QuantiRecord) => boolean,
): SeriesDefinition[] {
  return topCategories(rows, field, limit, denominator).map((category, index) => ({
    key: `series_${index}`,
    label: displayCategoricalValue(field, category),
    color: COLORS[index % COLORS.length],
    denominator: (row) => denominator(row) && normalizeCategoricalValue(field, (row as any)[field]) === category,
    matches,
  }));
}

function intentIsTrue(row: QuantiRecord): boolean {
  return purchaseIntentStatus(row.intencao_compra_padronizada) === true;
}

function validIntent(row: QuantiRecord): boolean {
  return purchaseIntentStatus(row.intencao_compra_padronizada) !== null;
}

function validPurchaseTime(row: QuantiRecord): boolean {
  const value = normalizeCategoricalValue('tempo_intencao_padronizado', row.tempo_intencao_padronizado);
  return intentIsTrue(row) && value != null && !comparableText(value).includes('sem intencao');
}

function HorizontalChartScroll({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);

  return (
    <div
      ref={viewportRef}
      className="qd-historical-chart-scroll qd-scroll"
      onPointerDown={(event) => {
        const viewport = viewportRef.current;
        if (!viewport || event.pointerType === 'touch') return;
        dragStart.current = { x: event.clientX, scrollLeft: viewport.scrollLeft };
        viewport.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const viewport = viewportRef.current;
        if (!viewport || !dragStart.current) return;
        viewport.scrollLeft = dragStart.current.scrollLeft - (event.clientX - dragStart.current.x);
      }}
      onPointerUp={(event) => {
        dragStart.current = null;
        viewportRef.current?.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { dragStart.current = null; }}
    >
      {children}
    </div>
  );
}
function HistoricalLineCard({
  title,
  subtitle,
  rows,
  definitions,
}: {
  title: string;
  subtitle: string;
  rows: QuantiRecord[];
  definitions: SeriesDefinition[];
}) {
  const data = useMemo(() => historyByQuarter(rows, definitions), [rows, definitions]);
  const chartWidth = Math.max(620, data.length * 92);

  return (
    <ChartCard title={title} subtitle={subtitle} exportable={false}>
      <HorizontalChartScroll>
        <div style={{ minWidth: chartWidth }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 12, right: 22, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--qd-border)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--qd-text-muted)' }} interval={0} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--qd-text-muted)' }}
                tickFormatter={(value) => `${value}%`}
                width={38}
              />
              <Tooltip
                formatter={(value: number, _name: string, item: any) => [`${Number(value).toFixed(1)}%`, item.dataKey]}
                labelStyle={{ color: '#1f2a12' }}
              />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: 10, paddingBottom: 12 }} />
              {definitions.map((definition) => (
                <Line
                  key={definition.key}
                  type="monotone"
                  dataKey={definition.key}
                  name={definition.label}
                  stroke={definition.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: definition.color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </HorizontalChartScroll>
    </ChartCard>
  );
}

export function HistoricalPurchaseIntent({ rows }: { rows: QuantiRecord[] }) {
  const generalDefinitions = useMemo<SeriesDefinition[]>(() => [
    {
      key: 'general',
      label: 'Intencao geral',
      color: COLORS[0],
      denominator: validIntent,
      matches: intentIsTrue,
    },
    {
      key: 'within_two_years',
      label: 'Intencao em ate 2 anos',
      color: COLORS[5],
      denominator: validIntent,
      matches: (row) => {
        if (!intentIsTrue(row)) return false;
        const value = normalizeCategoricalValue('tempo_intencao_padronizado', row.tempo_intencao_padronizado);
        if (value == null) return false;
        const text = comparableText(value);
        return text.includes('ate 6 meses') || text.includes('ate 1 ano') || text.includes('ate 1 ano e meio') || text.includes('ate 2 anos');
      },
    },
  ], []);

  const searchDefinitions = useMemo<SeriesDefinition[]>(() => [
    ['not_searching', 'Ainda nao procurando', 'nao procurando'],
    ['searching', 'Procurando imovel', 'procurando'],
    ['visiting', 'Visitando imoveis', 'visitando'],
  ].map(([key, label, term], index) => ({
    key,
    label,
    color: COLORS[index],
    denominator: validIntent,
    matches: (row) => {
      const text = comparableText(normalizeCategoricalValue('intencao_compra_padronizada', row.intencao_compra_padronizada) ?? '');
      return term === 'procurando'
        ? text.includes(term) && !text.includes('nao procurando')
        : text.includes(term);
    },
  })), []);

  const regionDefinitions = useMemo(
    () => categoryDefinitions(rows, 'regiao', 5, validIntent, intentIsTrue),
    [rows],
  );
  const generationDefinitions = useMemo(
    () => categoryDefinitions(rows, 'geracao', 5, validIntent, intentIsTrue),
    [rows],
  );
  const incomeDefinitions = useMemo(
    () => categoryDefinitions(rows, 'renda_macro_faixa', 5, validIntent, intentIsTrue),
    [rows],
  );
  const timeDefinitions = useMemo(
    () => categoryDefinitions(rows, 'tempo_intencao_padronizado', 5, validPurchaseTime, () => true),
    [rows],
  );
  const motiveDefinitions = useMemo(
    () => categoryDefinitions(rows, 'motivo_intencao_padronizado', 5, intentIsTrue, () => true),
    [rows],
  );

  const availableQuarters = useMemo(() => new Set(rows.map(quarterOf).filter(Boolean).map((quarter) => quarter!.key)).size, [rows]);
  if (!availableQuarters) {
    return <div className="qd-historical-empty">Nao ha datas de pesquisa suficientes para compor a serie trimestral.</div>;
  }

  return (
    <div className="space-y-3">
      <p className="qd-section-sub">
        Percentuais calculados dentro de cada trimestre e respeitando os filtros ativos. Series extensas podem ser arrastadas horizontalmente dentro do proprio grafico.
      </p>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <HistoricalLineCard rows={rows} title="Intencao de compra ao longo do tempo" subtitle="Intencao geral e horizonte de ate 2 anos" definitions={generalDefinitions} />
        <HistoricalLineCard rows={rows} title="Estagio da busca pelo imovel" subtitle="Distribuicao das etapas de busca entre todos os entrevistados" definitions={searchDefinitions} />
        <HistoricalLineCard rows={rows} title="Intencao de compra por regiao" subtitle="Percentual com intencao dentro de cada regiao" definitions={regionDefinitions} />
        <HistoricalLineCard rows={rows} title="Intencao de compra por geracao" subtitle="Percentual com intencao dentro de cada geracao" definitions={generationDefinitions} />
        <HistoricalLineCard rows={rows} title="Intencao de compra por faixa de renda" subtitle="Percentual com intencao dentro de cada faixa" definitions={incomeDefinitions} />
        <HistoricalLineCard rows={rows} title="Prazo para concretizar a compra" subtitle="Distribuicao entre entrevistados com intencao de compra" definitions={timeDefinitions} />
        <HistoricalLineCard rows={rows} title="Motivacoes para compra" subtitle="Cinco principais motivos entre entrevistados com intencao" definitions={motiveDefinitions} />
      </div>
    </div>
  );
}
