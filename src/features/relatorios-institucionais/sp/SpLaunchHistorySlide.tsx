import type { SpPreview, SpHistoryMetric } from './model';

const quantity = (value: number) => value.toLocaleString('pt-BR');
export function SpLaunchHistorySlide({ report, metric = 'launches', segment, pattern }: { report: SpPreview; metric?: SpHistoryMetric; segment?: string; pattern?: string }) {
  const patternKey = pattern?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const history = patternKey ? report.historyBatch?.patternDetails?.[patternKey]?.[metric] : segment ? report.historyBatch?.segmentDetails?.[segment]?.[metric] : report.historyBatch ? report.historyBatch.comparisons[metric] : metric === 'launches' ? report.launchHistory : undefined;
  const labels = { launches: 'lançamentos', sales: 'vendas', stock: 'oferta' };
  if (report.historyBatch?.status === 'blocked' || history?.status !== 'ready' || !history.totals || !history.rows.length) return <div className="absolute left-[90px] top-[280px] w-[1100px] text-center"><p className="text-[28px] font-bold">Comparativo de {labels[metric]} indisponível</p><p className="mt-4 text-[20px]">{report.historyBatch?.issues[0] ?? history?.issues[0] ?? 'Use Conferir históricos para buscar os mesmos meses do ano anterior.'}</p></div>;
  const currentYear = history.rows[0].currentMonth.slice(0, 4), previousYear = history.rows[0].previousMonth.slice(0, 4);
  const monthName = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
  const period = history.rows.map(row => monthName(row.currentMonth)).join(' / ');
  const minimum = Math.min(0, ...history.rows.flatMap(row => [row.current, row.previous]));
  const maximum = Math.max(0, ...history.rows.flatMap(row => [row.current, row.previous]));
  const y = (value: number) => 470 - (value - minimum) / Math.max(1, maximum - minimum) * 160;
  const x = (index: number) => history.rows.length === 1 ? 640 : 250 + index * 780 / (history.rows.length - 1);
  const variation = history.totals.variation === null ? `Variação não calculável: base anterior ${history.totals.previous < 0 ? 'negativa' : 'zero'}` : `Variação: ${history.totals.variation.toLocaleString('pt-BR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })}%`;
  return <>
    <p className="absolute left-[62px] top-[155px] text-[20px]">{period} · {previousYear} × {currentYear}</p>
    <p className="absolute left-[62px] top-[190px] text-[18px]">{pattern ? `Padrão da API: ${pattern}` : segment ? `${segment} · classificação SP de Lucas` : `Mesmos meses nos dois anos · ${report.quarter} em validação`}</p>
    <div className="absolute right-[100px] top-[130px] text-right"><p className="text-[20px]">{previousYear}: {quantity(history.totals.previous)} unidades</p><p className="text-[28px] font-bold text-[#5b7638]">{currentYear}: {quantity(history.totals.current)} unidades</p><p className="text-[18px]">{variation}</p><p className="text-[16px]">Diferença: {history.totals.delta.toLocaleString('pt-BR', { signDisplay: 'exceptZero' })} unidades</p></div>
    <svg role="img" aria-label={metric === 'launches' ? 'Lançamentos nos mesmos meses do ano atual e anterior' : metric === 'sales' ? 'Vendas nos mesmos meses do ano atual e anterior' : 'Oferta nos mesmos meses do ano atual e anterior'} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
      <line x1="90" x2="1190" y1="540" y2="540" stroke="#d9d9d9" />
      <line x1="90" x2="135" y1="250" y2="250" stroke="#999" strokeWidth="4" strokeDasharray="8 5" /><text x="145" y="256" fontSize="18">{previousYear}</text>
      <line x1="250" x2="295" y1="250" y2="250" stroke="#5b7638" strokeWidth="4" /><text x="305" y="256" fontSize="18">{currentYear}</text>
      {(['previous', 'current'] as const).map(field => <g key={field}><polyline points={history.rows.map((row, index) => `${x(index)},${y(row[field])}`).join(' ')} fill="none" stroke={field === 'current' ? '#5b7638' : '#999'} strokeWidth="4" strokeDasharray={field === 'previous' ? '8 5' : undefined} />{history.rows.map((row, index) => <g key={row.currentMonth}><circle cx={x(index)} cy={y(row[field])} r="5" fill={field === 'current' ? '#5b7638' : '#999'} /><text data-history-value={field} x={x(index)} y={y(row[field]) + ((row.current >= row.previous ? field === 'current' : field === 'previous') ? -18 : 28)} textAnchor="middle" fill={field === 'current' ? '#5b7638' : '#555'} fontSize="24" fontWeight="bold">{quantity(row[field])}</text></g>)}</g>)}
      {history.rows.map((row, index) => <text key={row.currentMonth} x={x(index)} y="570" textAnchor="middle" fontSize="20">{monthName(row.currentMonth)}</text>)}
    </svg>
    <p className="absolute left-[62px] top-[605px] text-[16px]">{metric === 'stock' ? 'Oferta: fotografia do último mês, sem somar estoques.' : 'Totais acumulados nos mesmos meses. Ausência de dados não representa zero.'}</p>
  </>;
}
