import type { SpHistoryBatch, SpHistoryMetric } from './model';

const quantity = (value: number) => value.toLocaleString('pt-BR');
/** Paired bars reuse the original segment slide canvas; no additional collection. */
export function SpSegmentHistorySlide({ batch, metric }: { batch: SpHistoryBatch; metric: SpHistoryMetric }) {
  if (batch.status !== 'ready' || !batch.segments) return null;
  const { current, previous, currentMonth, previousMonth } = batch.segments;
  const values = [...current.rows, ...previous.rows].map(row => row[metric]);
  const minimum = Math.min(0, ...values), maximum = Math.max(0, ...values);
  const y = (value: number) => 465 - (value - minimum) / Math.max(1, maximum - minimum) * 200;
  const total = (rows: typeof current.rows) => rows.reduce((sum, row) => sum + row[metric], 0);
  return <svg role="img" aria-label="Comparação por segmento nos mesmos meses dos dois anos" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <rect x="80" y="201" width="16" height="16" fill="#b5c79a" /><text x="105" y="215" fontSize="18">{previousMonth.slice(0, 4)} · {quantity(total(previous.rows))} unidades</text>
    <rect x="430" y="201" width="16" height="16" fill="#5b7638" /><text x="455" y="215" fontSize="18">{currentMonth.slice(0, 4)} · {quantity(total(current.rows))} unidades</text>
    <line x1="80" x2="1200" y1={y(0)} y2={y(0)} stroke="#d9d9d9" />
    {current.rows.map((row, index) => {
      const before = previous.rows.find(item => item.group === row.group)![metric];
      const now = row[metric], x = 210 + index * 285;
      const variation = before > 0 ? `${((now - before) / before * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : before === 0 ? 'Base anterior zero' : 'Base anterior negativa';
      return <g key={row.group}>
        {[before, now].map((value, year) => <g key={year}>
          <rect x={x + (year ? 8 : -68)} y={Math.min(y(0), y(value))} width="60" height={Math.abs(y(value) - y(0))} fill={year ? '#5b7638' : '#b5c79a'} />
          <text data-segment-history-value="true" x={x + (year ? 38 : -38)} y={value < 0 ? y(value) + 20 : y(value) - 12} textAnchor="middle" fontSize="18" fontWeight="bold">{quantity(value)}</text>
        </g>)}
        <text x={x} y="520" textAnchor="middle" fontSize="20" fontWeight="bold">{row.group}</text>
        <text x={x} y="550" textAnchor="middle" fontSize="17">{variation}</text>
      </g>;
    })}
    <text x="80" y="582" fontSize="16">{metric === 'stock' ? `Oferta: fotografia de ${previousMonth} × ${currentMonth}; estoques mensais não são somados.` : `Fluxos acumulados nos mesmos meses, até ${previousMonth} × ${currentMonth}.`}</text>
  </svg>;
}
