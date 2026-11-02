import { spPeriodLabel, type SpPreview } from './model';
import { spQuarterlyIvv, spSellout } from './stock-series';

const count = (value: number) => value.toLocaleString('pt-BR');
export function SpMarketSlide({ report, number }: { report: SpPreview; number: number }) {
  const ivv = number === 50, stock = report.stockSeries, indicator = spQuarterlyIvv(report);
  const ready = ivv ? indicator.status === 'ready' : stock?.status === 'ready';
  const rows = ivv ? indicator.rows : stock?.quarterly ?? [];
  const format = (value: number) => ivv ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : count(value);
  const width = ivv ? 1100 : 810;
  const values = rows.flatMap(row => row.value === null ? [] : [row.value]), minimum = Math.min(0, ...values), maximum = Math.max(1, ...values);
  const points = rows.map((row, i) => ({ ...row, x: 90 + i * width / Math.max(1, rows.length - 1), y: row.value === null ? null : 500 - (row.value - minimum) / (maximum - minimum) * 200 }));
  const showLabel = (index: number) => {
    const row = points[index], next = points[index + 1];
    return ivv || !next || next.value === null || row.value === null || Math.abs(next.y! - row.y!) >= 18 || (format(row.value).length + format(next.value).length) * 13 * .7 / 2 < next.x - row.x;
  };
  const segments: typeof points[] = [[]];
  for (const row of points) { if (row.y === null) segments.push([]); else segments.at(-1)!.push(row); }
  const sellout = spSellout(report), maxSellout = Math.max(1, ...sellout.flatMap(row => row.months === null ? [] : [row.months]));
  return <svg role="img" aria-label={ivv ? 'IVV trimestral calculado sobre oferta disponível' : 'Oferta final histórica e escoamento por padrão'} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <rect x="40" y="10" width="1000" height="150" fill="#f8f8f8" />
    <text x="62" y="62" fontSize="32" fontWeight="bold">{ivv ? 'IVV (%)' : 'OFERTA FINAL VERTICAL'}</text>
    <rect x="62" y="110" width="85" height="9" rx="4" fill="#ffcf00" />
    <text x="62" y="156" fontSize="17">{report.quarter} · {spPeriodLabel(report)}</text>
    {!ivv && report.metrics.stock !== null && <text x="90" y="220" fontSize="28" fontWeight="bold" fill="#5b7638">{count(report.metrics.stock)} unidades</text>}
    {!ready ? <><text x={ivv ? 640 : 480} y="330" textAnchor="middle" fontSize="25" fontWeight="bold">Histórico em conferência</text><text x="62" y="380" fontSize="16">{(ivv ? indicator.issues[0] : stock?.issues[0]) ?? 'A série municipal de oferta preencherá a curva ao terminar.'}</text></> : <>
      {segments.filter(segment => segment.length).map((segment, i) => <polyline key={i} points={segment.map(row => `${row.x},${row.y}`).join(' ')} stroke="#5b7638" strokeWidth="3" fill="none" />)}
      {points.map((row, index) => <g key={row.label}>{row.value !== null && <><circle cx={row.x} cy={row.y!} r="4" fill="#5b7638"><title>{row.label}: {format(row.value)}</title></circle>{showLabel(index) && <text x={row.x} y={row.y! - 14} textAnchor="middle" fontSize={ivv ? 17 : 13} fill="#4f6529" fontWeight="bold">{format(row.value)}</text>}</>}<text x={row.x} y="545" textAnchor="middle" fontSize={ivv ? 14 : 12}>{row.label.slice(0,2)}<tspan x={row.x} dy="17">{row.label.slice(2)}{row.partial ? '*' : ''}</tspan></text></g>)}
      {!ivv && stock?.comparisons?.map((row, i) => <g key={row.label}><rect x={500 + i * 220} y="170" width="220" height="65" fill="#eee" stroke="#aaa" /><text x={610 + i * 220} y="190" textAnchor="middle" fontSize="12">{row.label}</text><text x={610 + i * 220} y="220" textAnchor="middle" fontSize="19" fontWeight="bold" fill="#5b7638">{row.variation === null ? '—' : `${row.variation > 0 ? '+' : ''}${row.variation.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}</text></g>)}
    </>}
    {!ivv && <g><rect x="935" y="250" width="290" height="330" rx="20" fill="#f1f1f1" stroke="#aaa" /><text x="1080" y="275" textAnchor="middle" fontSize="17">Escoamento do estoque (meses)</text>{sellout.map((row, i) => <g key={row.group}><text x="1040" y={307 + i * 35} textAnchor="end" fontSize="13">{row.group}</text>{row.months !== null && <rect x="1050" y={293 + i * 35} width={row.months / maxSellout * 110} height="18" fill={i === 7 ? '#d1ac00' : '#5b7638'} />}<text x={row.months === null ? 1080 : 1060 + row.months / maxSellout * 110} y={307 + i * 35} fontSize="15">{row.months === null ? '—' : Math.ceil(row.months)}<title>{row.months === null ? 'Vendas não positivas: escoamento indisponível' : `${row.months.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} meses antes do arredondamento para cima`}</title></text></g>)}</g>}
    <text x="62" y="603" fontSize="13">{ivv ? 'IVV = vendas líquidas / (oferta inicial + lançamentos) × 100. Base não positiva: indisponível; sinais preservados.' : 'Estoque: fotografia final de cada trimestre. Escoamento = oferta final / média mensal de vendas líquidas na janela.'}</text>
    <text x="62" y="623" fontSize="13">{ivv ? 'Parcial usa somente os meses disponíveis. Não soma nem faz média dos índices mensais da API.' : '* Trimestre atual parcial quando indicado; comparações anuais usam o mesmo mês. Vendas não positivas: escoamento —.'}</text>
  </svg>;
}
