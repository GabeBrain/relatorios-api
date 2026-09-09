import { useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from './Charts';
import { displayCategoricalValue, normalizeCategoricalValue, orderedValues, purchaseIntentStatus } from './aggregate';
import type { CategoricalField, QuantiRecord } from './types';

type SeriesDefinition = {
  key: string;
  label: string;
  color: string;
  denominator: (row: QuantiRecord) => boolean;
  matches: (row: QuantiRecord) => boolean;
};

type HistoryPoint = Record<string, string | number | null> & { period: string };

const COLORS = ['#5B7537', '#D89B00', '#3B82A0', '#B45B5B', '#8B6BB5', '#D47C29', '#4C9A7A'];
const PROPERTY_FIELD = 'IC4P33_1' as CategoricalField;

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

function distributionDefinitions(
  rows: QuantiRecord[],
  field: CategoricalField,
  limit: number,
  denominator: (row: QuantiRecord) => boolean,
): SeriesDefinition[] {
  return topCategories(rows, field, limit, denominator).map((category, index) => ({
    key: `series_${index}`,
    label: displayCategoricalValue(field, category),
    color: COLORS[index % COLORS.length],
    denominator,
    matches: (row) => normalizeCategoricalValue(field, (row as any)[field]) === category,
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
  const labels = useMemo(() => new Map(definitions.map((definition) => [definition.key, definition.label])), [definitions]);
  const chartWidth = Math.max(620, data.length * 92);

  return (
    <ChartCard title={title} subtitle={subtitle} exportable={false}>
      <HorizontalChartScroll>
        <div style={{ minWidth: chartWidth }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 26, right: 22, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--qd-border)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--qd-text-muted)' }} interval={0} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--qd-text-muted)' }}
                tickFormatter={(value) => `${value}%`}
                width={38}
              />
              <Tooltip
                formatter={(value: number, name: string, item: any) => [`${Number(value).toFixed(1)}%`, labels.get(String(item?.dataKey ?? 'serie')) ?? name]}
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

                  >

                    <LabelList dataKey={definition.key} position="top" fill={definition.color} fontSize={9} formatter={(value: number) => `${Number(value).toFixed(1)}%`} />

                  </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </HorizontalChartScroll>
    </ChartCard>
  );
}

function hasDesiredProperty(row: QuantiRecord): boolean {
  return normalizeCategoricalValue(PROPERTY_FIELD, (row as any)[PROPERTY_FIELD]) != null;
}

function DesiredPropertyMatrix({ rows, rowField, title, subtitle }: { rows: QuantiRecord[]; rowField: CategoricalField; title: string; subtitle: string }) {
  const matrix = useMemo(() => {
    const activeRows = rows.filter((row) => hasDesiredProperty(row) && normalizeCategoricalValue(rowField, (row as any)[rowField]) != null);
    const rowValues = orderedValues(rowField, topCategories(activeRows, rowField, 10));
    const colValues = topCategories(activeRows, PROPERTY_FIELD, 5);
    const values = rowValues.map((rowValue) => {
      const base = activeRows.filter((row) => normalizeCategoricalValue(rowField, (row as any)[rowField]) === rowValue);
      return colValues.map((colValue) => {
        const count = base.filter((row) => normalizeCategoricalValue(PROPERTY_FIELD, (row as any)[PROPERTY_FIELD]) === colValue).length;
        return base.length ? (count / base.length) * 100 : 0;
      });
    });
    return { rowValues, colValues, values };
  }, [rows, rowField]);

  return (
    <ChartCard title={title} subtitle={subtitle} exportable={false}>
      <div className="qd-historical-matrix-scroll qd-scroll">
        <table className="qd-historical-matrix">
          <thead><tr><th>{rowField === 'localidade' ? 'Localidade' : rowField === 'geracao' ? 'Geracao' : 'Faixa de renda'}</th>{matrix.colValues.map((value) => <th key={value}>{value}</th>)}</tr></thead>
          <tbody>{matrix.rowValues.map((rowValue, rowIndex) => <tr key={rowValue}><th>{displayCategoricalValue(rowField, rowValue)}</th>{matrix.colValues.map((colValue, colIndex) => { const value = matrix.values[rowIndex]?.[colIndex] ?? 0; return <td key={colValue} style={{ '--qd-cell-alpha': Math.max(0.08, value / 100) } as CSSProperties}>{value.toFixed(1)}%</td>; })}</tr>)}</tbody>
        </table>
      </div>
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
    () => distributionDefinitions(rows, 'tempo_intencao_padronizado', 5, validPurchaseTime),
    [rows],
  );
  const motiveDefinitions = useMemo(
    () => distributionDefinitions(rows, 'motivo_intencao_padronizado', 5, intentIsTrue),
    [rows],
  );
  const propertyDefinitions = useMemo(
    () => distributionDefinitions(rows, PROPERTY_FIELD, 5, hasDesiredProperty),
    [rows],
  );
  const hasPropertyData = useMemo(() => rows.some(hasDesiredProperty), [rows]);

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
        {hasPropertyData && <HistoricalLineCard rows={rows} title="Tipo de imovel desejado ao longo do tempo" subtitle="Cinco tipos mais citados por trimestre" definitions={propertyDefinitions} />}
      </div>
      {hasPropertyData && (
        <section className="space-y-2 pt-2">
          <h3 className="qd-section-title">Imovel de desejo</h3>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <DesiredPropertyMatrix rows={rows} rowField="renda_macro_faixa" title="Tipo de imovel por faixa de renda" subtitle="Percentual dentro de cada faixa de renda" />
            <DesiredPropertyMatrix rows={rows} rowField="geracao" title="Tipo de imovel por geracao" subtitle="Percentual dentro de cada geracao" />
            <DesiredPropertyMatrix rows={rows} rowField="localidade" title="Tipo de imovel por capital e interior" subtitle="Percentual dentro de cada localidade" />
          </div>
        </section>
      )}
    </div>
  );
}