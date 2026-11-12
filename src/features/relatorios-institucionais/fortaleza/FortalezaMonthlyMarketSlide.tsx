import { FortalezaArtwork } from './FortalezaArtwork';
import { introMonth } from './intro-view';
import type { FortalezaSelection } from './model';
import type { MonthlyBin, MonthlySlideData } from './monthly-market';
import layouts from './assets/monthly/layout.json';
import './intro-slides.css';
const artwork = import.meta.glob('./assets/monthly/*.png', { eager:true, import:'default', query:'?url' }) as Record<string,string>;
const colors = ['#1B4059','#42CCA2'];
const number = (value: number, money = false) => value.toLocaleString('pt-BR',{ maximumFractionDigits:money ? 1 : 0 });
const percentage = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('pt-BR',{ maximumFractionDigits:1 })}%`;
export function Plot({ bins, x, width, large = false, money, palette = colors, bottom = 533, quarterly = false }: { bins: MonthlyBin[]; x:number; width:number; large?:boolean; money:boolean; palette?:string[]; bottom?:number; quarterly?:boolean }) {
  const min = Math.min(0,...bins.map(bin => Math.min(0,bin.first) + Math.min(0,bin.second)));
  const max = Math.max(1,...bins.map(bin => Math.max(0,bin.first) + Math.max(0,bin.second)));
  const y = (value:number) => bottom - (value - min) / (max - min) * 275;
  const zero = y(0), step = width / bins.length, barWidth = step * .76;
  return <g aria-label={large ? 'Acumulado no ano' : quarterly ? 'Histórico trimestral' : 'Histórico mensal'}><line x1={x} x2={x + width} y1={zero} y2={zero} stroke="#AAB8C2" />
    {bins.map((bin,index) => {
      const cx = x + step * (index + .5); let positive = 0, negative = 0;
      return <g key={bin.month}>{[bin.first,bin.second].map((value, group) => {
        const from = value >= 0 ? positive : negative;
        if (value >= 0) positive += value; else negative += value;
        const top = Math.min(y(from),y(from + value)), height = Math.abs(y(from) - y(from + value));
        const label = number(value,money), labelSize = large ? 23 : quarterly ? 22 : Math.min(12,(step - 4) / (label.length * .65));
        return <g key={group}><rect x={cx - barWidth / 2} y={top} width={barWidth} height={height} fill={palette[group]} />{height > (large ? 35 : 18) && <text x={cx} y={top + height / 2 + (large ? 8 : 4)} textAnchor="middle" fontSize={labelSize} fill={group ? 'black' : 'white'} fontWeight={700}>{label}</text>}</g>;
      })}<circle cx={cx} cy={y(bin.total)} r={large ? 6 : 4.5} fill="#AA4EBF" /><text x={cx} y={y(bin.total) - 14} textAnchor="middle" fontSize={large ? 27 : quarterly ? 25 : Math.min(13,(step - 3) / (number(bin.total,money).length * .65))} fill="black" fontWeight={700}>{number(bin.total,money)}</text><text x={cx} y={bottom + 27} textAnchor={large || quarterly ? 'middle' : 'end'} transform={large || quarterly ? undefined : `rotate(-50 ${cx} ${bottom + 27})`} fontSize={large || quarterly ? 17 : 14} fill="black">{bin.label}</text></g>;
    })}
  </g>;
}
function StockChart({ data,page,selection }: { data:MonthlySlideData; page:number; selection:FortalezaSelection }) {
  const palette = page === 34 ? ['#3D2055',colors[1]] : colors;
  return <g aria-label="Fotografias mensais de oferta final">
    <g fill={colors[0]} fontSize={22} fontWeight={700}><text x={187} y={152} textAnchor="end">{percentage(data.stockChanges!.twoYears)}</text><text x={1223} y={152} textAnchor="end">{percentage(data.stockChanges!.year)}</text></g>
    <g fill="black" fontSize={14} textAnchor="end"><text x={187} y={173}>em relação</text><text x={187} y={191}>a {introMonth(selection.position)} de {selection.year-2}</text><text x={1223} y={173}>em relação</text><text x={1223} y={191}>a {introMonth(selection.position)} de {selection.year-1}</text></g>
    <Plot bins={data.history} x={30} width={1220} money={false} palette={palette} bottom={523} />
    <g fill="black" fontSize={15} fontWeight={700}><rect x={230} y={596} width={8} height={8} fill={palette[0]} /><text x={244} y={605}>Estoque · {data.labels[0]}</text><rect x={610} y={596} width={8} height={8} fill={palette[1]} /><text x={624} y={605}>Estoque · {data.labels[1]}</text><circle cx={1010} cy={600} r={4.5} fill="#AA4EBF" /><text x={1022} y={605}>Total</text></g>
  </g>;
}
export function Rolling({ data }: { data: NonNullable<MonthlySlideData['rolling']> }) {
  const max = Math.max(1,...data.flatMap(row => [row.launches,row.sales])), min = Math.min(0,...data.map(row => row.sales));
  const x = (index:number) => 58 + index / Math.max(1,data.length - 1) * 1150;
  const y = (value:number) => 520 - (value - min) / (max - min) * 250;
  return <g aria-label="Séries móveis de 12 meses"><line x1={15} x2={1265} y1={529} y2={529} stroke={colors[0]} />
    {(['launches','sales'] as const).map((key,series) => <g key={key}><polyline points={data.map((row,index) => `${x(index)},${y(row[key])}`).join(' ')} fill="none" stroke={colors[series]} strokeWidth={3} />{data.map((row,index) => <g key={row.month}><rect x={x(index)-33} y={y(row[key]) + (series ? 5 : -24)} width={66} height={23} fill={colors[series]} /><text x={x(index)} y={y(row[key]) + (series ? 23 : -7)} fontSize={16} textAnchor="middle" fontWeight={700} fill="white">{number(row[key])}</text></g>)}</g>)}
    {data.map((row,index) => <text key={row.month} x={x(index)} y={555} fontSize={17} textAnchor="middle" fill="black">{row.month.slice(5)}/{row.month.slice(0,4)}</text>)}
    <g fontSize={18} fontWeight={700} fill="black"><line x1={385} x2={413} y1={610} y2={610} stroke={colors[0]} strokeWidth={3}/><text x={420} y={616}>Unidades Lançadas</text><line x1={700} x2={728} y1={610} y2={610} stroke={colors[1]} strokeWidth={3}/><text x={735} y={616}>Vendas Líquidas</text></g>
  </g>;
}
export default function FortalezaMonthlyMarketSlide({ page,selection,cities,data }: { page:number; selection:FortalezaSelection; cities:string[]; data:MonthlySlideData | null }) {
  const divider = [18,21,29,32].includes(page);
  const scope = layouts.find(layout => layout.page === page)?.scope;
  const money = data?.unit === 'milhões';
  return <svg className="fortaleza-intro-slide block aspect-video h-auto w-full" viewBox="0 0 1280 720" role="img" aria-label={`Fortaleza · slide ${page}`}>
    <FortalezaArtwork href={artwork[`./assets/monthly/${page}.png`]} kind="monthly" page={page}/>
    {divider ? <>
      {scope && <text x={scope.x + scope.width} y={scope.y + 30} textAnchor="end" fill="white" fontSize={cities.join(', ').length > 70 ? 20 : 25}>{cities.length ? cities.join(', ') : 'Selecione o recorte autorizado'}</text>}
      <text x={1180} y={scope ? Math.max(365,scope.y + scope.height + 36) : 400} textAnchor="end" fill="white" fontSize={18}>{introMonth(selection.position)} de {selection.year}</text>
    </> : <>
      <text x={43} y={218} fill={colors[0]} fontSize={16}>{introMonth(selection.position)} de {selection.year}{money ? ` · R$ milhões · INCC-DI base ${data?.baseMonth ?? 'pendente'}` : ''}</text>
      {data?.status !== 'ready' ? <g aria-label="Histórico mensal pendente"><text x={640} y={365} fontSize={26} textAnchor="middle" fill={colors[0]}>Aguardando conferência da fonte</text></g> : data.stockChanges ? <StockChart data={data} page={page} selection={selection} /> : data.rolling ? <Rolling data={data.rolling} /> : <>
        <g fill={colors[0]} textAnchor="middle" fontSize={22} fontWeight={700}><text x={860} y={144}>{percentage(data.changes.total)}</text><text x={1040} y={144}>{percentage(data.changes.first)}</text><text x={1180} y={144} fill={colors[1]}>{percentage(data.changes.second)}</text></g>
        <g fill="black" textAnchor="middle" fontSize={13}><text x={860} y={165}>em relação</text><text x={860} y={183}>a {introMonth(selection.position)} de {selection.year-1}</text><text x={1040} y={167}>{data.labels[0]}</text><text x={1180} y={167}>{data.labels[1]}</text><text x={1110} y={190}>acumulado no ano</text></g>
        <Plot bins={data.history} x={15} width={910} money={Boolean(money)} /><Plot bins={data.accumulated} x={974} width={270} large money={Boolean(money)} />
        <g fill="black" fontSize={15} fontWeight={700}><rect x={103} y={596} width={8} height={8} fill={colors[0]} /><text x={117} y={605}>{data.labels[0]}</text><rect x={470} y={596} width={8} height={8} fill={colors[1]} /><text x={484} y={605}>{data.labels[1]}</text><circle cx={850} cy={600} r={4.5} fill="#AA4EBF" /><text x={862} y={605}>Total</text></g>
      </>}
    </>}
  </svg>;
}
