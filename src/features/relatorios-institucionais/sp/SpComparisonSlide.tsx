import { spPeriodLabel, type SpPreview } from './model';
import type { SpGroupComparison } from './comparisons';
import { resolveSpTypologyComparison } from './typology-history';

const colors = ['#5b7638', '#83a83d', '#1d6288', '#ffcf00', '#86b7d5', '#89713a', '#aaa', '#324c26'];
const count = (value: number) => value.toLocaleString('pt-BR');
const percent = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export function SpComparisonSlide({ report, number }: { report: SpPreview; number: number }) {
  const sales = number >= 37, typology = number === 23 || number === 37;
  const result = typology ? resolveSpTypologyComparison(report, sales ? 'sales' : 'launches') : (sales ? report.salesSeries : report.launchSeries)?.comparison;
  const title = `UNIDADES VERTICAIS ${sales ? 'VENDIDAS' : 'LANÇADAS'}`;
  return <svg role="img" aria-label={`Comparação anual por ${typology ? 'tipologia' : 'segmento'} · ${sales ? 'vendas' : 'lançamentos'}`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <rect x="40" y="10" width="1000" height="140" fill="#f8f8f8" />
    <text x="62" y="62" fontSize="31" fontWeight="bold">{title}</text><text x="62" y="101" fontSize="27" fontWeight="bold" fill="#5b7638">POR {typology ? 'TIPOLOGIA' : 'SEGMENTO'}</text>
    <rect x="62" y="117" width="85" height="9" rx="4" fill="#ffcf00" />
    <text x="62" y="158" fontSize="17">{report.quarter} · {spPeriodLabel(report)}</text>
    {result?.status === 'ready' ? <ComparisonChart result={result} report={report} /> : <><text x="640" y="335" textAnchor="middle" fontSize="28" fontWeight="bold">Comparativo em conferência</text><text x="640" y="380" textAnchor="middle" fontSize="18">{result?.issues[0] ?? (typology ? 'A conferência das tipologias nos dois anos preencherá este slide.' : 'A série municipal dos dois anos preencherá este slide.')}</text></>}
    <text x="62" y="621" fontSize="13">Mesmos meses nos dois anos. Vendas negativas preservadas; base anterior não positiva sem variação percentual.</text>
  </svg>;
}
function ComparisonChart({ result, report }: { result: SpGroupComparison; report: SpPreview }) {
  const shares = result.rows.every(row => row.currentShare !== null && row.previousShare !== null);
  const values = result.rows.flatMap(row => shares ? [row.previousShare!, row.currentShare!] : [row.previous, row.current]);
  const minimum = Math.min(0, ...values), maximum = Math.max(1, ...values), y = (value: number) => 505 - (value - minimum) / (maximum - minimum) * 220;
  const step = 480 / result.rows.length, width = Math.min(90, step * .84);
  const years = [Number(report.quarter.slice(2)) - 1, Number(report.quarter.slice(2))];
  return <g>
    {[0, 1].map(year => <g key={year}>
      <text x={340 + year * 600} y="213" textAnchor="middle" fontSize="17">{count(year === 0 ? result.previousTotal : result.currentTotal)} unidades</text>
      {result.rows.map((row, i) => {
        const value = shares ? year === 0 ? row.previousShare! : row.currentShare! : year === 0 ? row.previous : row.current;
        const x = 100 + year * 600 + (i + .5) * step;
        return <g key={row.group}><title>{row.group}: {years[year]}, {count(year === 0 ? row.previous : row.current)} unidades</title><rect x={x - width / 2} y={Math.min(y(0), y(value))} width={width} height={Math.abs(y(value) - y(0))} fill={colors[i % colors.length]} /><text x={x} y={value < 0 ? y(value) + 18 : y(value) - 12} textAnchor="middle" fontSize={result.rows.length > 5 ? 16 : 22} fontWeight="bold">{shares ? percent(value) : count(value)}</text></g>;
      })}
      <line x1={90 + year * 600} x2={590 + year * 600} y1={y(0)} y2={y(0)} stroke="#d9d9d9" />
      <text x={340 + year * 600} y="542" textAnchor="middle" fontSize="23" fontWeight="bold">{report.quarter.slice(0, 2)} {years[year]}{report.monthly!.length < 3 ? '*' : ''}</text>
    </g>)}
    {result.rows.map((row, i) => <g key={row.group}><rect x={90 + i % 4 * 275} y={560 + Math.floor(i / 4) * 22} width="14" height="14" fill={colors[i % colors.length]} /><text x={112 + i % 4 * 275} y={573 + Math.floor(i / 4) * 22} fontSize="16">{row.group}</text></g>)}
    <text x="62" y="607" fontSize="13">{shares ? 'Participação sobre o total municipal de cada ano.' : 'Quantidades líquidas; percentuais indisponíveis com base não positiva ou grupo negativo.'}{report.monthly!.length < 3 ? ' * Janela parcial equivalente.' : ''}</text>
  </g>;
}
