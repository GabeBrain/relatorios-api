import { spPeriodLabel, type SpPreview } from './model';
import type { SpAreaRow, SpPricePoint } from './granular-details';
import { priorMonth } from './temporal';

const number = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits:0 });
const percent = (value: number | null, sign = false) => value === null ? '—' : `${sign && value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits:1 })}%`;
const labels: Record<number,string> = { 53:'MÉDIA GERAL',54:'1 DORMITÓRIO',55:'1 DORMITÓRIO SEM MCMV',56:'2 DORMITÓRIOS',57:'2 DORMITÓRIOS SEM MCMV',58:'3 DORMITÓRIOS',59:'4 DORMITÓRIOS' };
export function SpDetailSlide({ report, slide }: { report: SpPreview; slide: number }) {
  const details = report.granularDetails, area = slide === 51, standards = slide >= 61, ticket = slide === 61;
  const title = area ? 'IVV POR ÁREA ÚTIL EM m² VERTICAL' : standards ? ticket ? 'TICKET MÉDIO POR PADRÃO RESIDENCIAL (R$ MIL)' : 'PREÇO MÉDIO R$/m² PRIVATIVO POR PADRÃO' : 'EVOLUÇÃO DOS PREÇOS · R$/m² VERTICAL';
  const problem = details?.status === 'blocked' ? details.issues[0] : area && details?.area.status === 'blocked' ? details.area.issues[0] : 'A consulta compartilhada dos históricos preencherá este slide após a conferência.';
  const ready = details?.status === 'ready' && (!area || details.area.status === 'ready');
  return <svg role="img" aria-label={`Slide ${slide} · ${title}`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <rect x="40" y="10" width="1000" height="150" fill="#f8f8f8" />
    <text x="62" y="62" fontSize={standards ? 28 : 30} fontWeight="bold">{title}</text>
    {area ? <text x="62" y="102" fontSize="27" fill="#5b7638" fontWeight="bold">PERÍODO DISPONÍVEL</text> : !standards ? <><rect x="840" y="85" width="370" height="38" fill={slide === 55 || slide === 57 ? '#59a6ce' : '#ffcf00'} /><text x="1025" y="111" textAnchor="middle" fontSize="20">{labels[slide]}</text></> : null}
    <rect x="62" y="119" width="85" height="9" rx="4" fill="#ffcf00" />
    <text x="62" y="159" fontSize="17">{report.quarter} · {spPeriodLabel(report)}</text>
    {!ready ? <Pending text={problem} /> : area ? <AreaTable rows={[...details.area.rows,details.area.total!]} report={report} /> : standards ? <StandardChart report={report} ticket={ticket} /> : <PriceHistory rows={details.prices.series[slide] ?? []} annualChange={details.prices.annualChanges[slide] ?? null} />}
  </svg>;
}
function Pending({ text }: { text:string }) {
  const lines = ['']; for (const word of text.split(' ')) { if (`${lines.at(-1)} ${word}`.length > 98) lines.push(''); lines[lines.length-1] += `${lines.at(-1) ? ' ' : ''}${word}`; }
  return <g><text x="640" y="330" textAnchor="middle" fontSize="27" fontWeight="bold">Áreas e preços em conferência</text>{lines.map((line,i) => <text key={i} x="640" y={375+i*26} textAnchor="middle" fontSize="18">{line}</text>)}</g>;
}
function PriceHistory({ rows, annualChange }: { rows:SpPricePoint[]; annualChange:number|null }) {
  if (!rows.some(row => row.value !== null)) return <Pending text={rows.find(row => row.issue)?.issue ?? 'Nenhuma fotografia com preços completos foi comprovada.'} />;
  const max = Math.max(1,...rows.flatMap(row => row.value === null ? [] : [row.value]));
  return <g>{rows.map((row,i) => {
    const x = 100+i*1080/Math.max(1,rows.length-1), y = row.value === null ? 535 : 535-row.value/max*260;
    return <g key={row.label}><title>{`${row.label}, ${row.month}: ${row.value === null ? row.issue : `R$ ${number(row.value)}/m²`}`}</title>{row.value !== null && <rect x={x-29} y={y} width="58" height={535-y} fill="#b3d184" />}<text x={x} y={y-15} textAnchor="middle" fontSize="15">{row.value === null ? '—' : number(row.value)}</text>{row.variation !== null && <><text x={x} y={y-66} textAnchor="middle" fontSize="14">{percent(row.variation,true)}</text>{row.variation !== 0 && <polygon points={row.variation > 0 ? `${x},${y-52} ${x-9},${y-35} ${x+9},${y-35}` : `${x},${y-35} ${x-9},${y-52} ${x+9},${y-52}`} fill={row.variation > 0 ? '#00b454' : '#ef0000'} />}</>}<text x={x} y="558" textAnchor="middle" fontSize="13">{row.label}{row.month.slice(5) !== String(Number(row.label[0])*3).padStart(2,'0') ? '*' : ''}</text></g>;
  })}<line x1="60" x2="1210" y1="536" y2="536" stroke="#ddd" /><rect x="850" y="574" width="320" height="25" fill="#ffcf00" /><polygon points="1170,566 1195,586 1170,608" fill="#ffcf00" /><text x="1010" y="592" textAnchor="middle" fontSize="17">{percent(annualChange,true)} em 12 meses</text><text x="62" y="603" fontSize="12">{rows.some(row => row.value === null) ? '— indica fotografia sem cobertura ou preço completos; não representa preço zero.' : 'Valores nominais ponderados pelas unidades em oferta final; sem correção pelo INCC.'}</text><text x="62" y="623" fontSize="12">Fotografia final de cada trimestre. * Mês disponível na parcial. Comparação anual no mesmo mês.</text></g>;
}
function StandardChart({ report, ticket }: { report:SpPreview; ticket:boolean }) {
  const prices = report.granularDetails!.prices, values = prices.standards.map(row => ticket ? row.ticket : row.meter), mean = ticket ? prices.overall.ticket : prices.overall.meter;
  if (!values.some(value => value !== null)) return <Pending text={prices.overall.issues[0] ?? 'Não há preços com cobertura comprovada no mês disponível.'} />;
  const max = Math.max(1,mean ?? 0,...values.flatMap(value => value === null ? [] : [value])), y = (value:number) => 520-value/max*280;
  const format = (value:number) => number(ticket ? value/1000 : value);
  return <g>{prices.standards.map((row,i) => {
    const value = values[i], x = 135+i*160;
    return <g key={row.group}><title>{`${row.group}: ${value === null ? row.issues.join(' ') : `${format(value)}; ${row.units} unidades em oferta`}`}</title>{value !== null && <rect x={x-48} y={y(value)} width="96" height={520-y(value)} fill={ticket ? '#5b7638' : '#ffcf00'} />}<text x={x} y={value === null ? 505 : y(value)-14} textAnchor="middle" fontSize="21" fontWeight="bold">{value === null ? '—' : format(value)}</text><text x={x} y="549" textAnchor="middle" fontSize="16" fontWeight="bold">{row.group}</text></g>;
  })}{mean !== null && <><line x1="80" x2="1200" y1={y(mean)} y2={y(mean)} stroke={ticket ? '#ffcf00' : '#5b7638'} strokeWidth="3" /><rect x="1100" y={y(mean)-24} width="115" height="26" fill={ticket ? '#ffcf00' : '#5b7638'} /><text x="1157" y={y(mean)-5} textAnchor="middle" fontSize="19" fontWeight="bold" fill={ticket ? '#262626' : '#fff'}>{format(mean)}</text></>}<text x="640" y="590" textAnchor="middle" fontSize="18">{mean === null ? 'Média geral indisponível por falta de cobertura ou preço.' : 'Linha: média geral ponderada por todas as unidades em oferta final.'}</text><text x="62" y="620" fontSize="13">Mês disponível: {report.throughMonth}. Sem média simples dos padrões ou ponderação por quantidade lançada.</text></g>;
}
function AreaTable({ rows, report }: { rows:SpAreaRow[]; report:SpPreview }) {
  const headers = [['Área útil',65],['Oferta inicial',330],['Oferta final',455],['(%)',535],['Lançamentos',675],['(%)',760],['Vendas líquidas',925],['(%)',1005],['IVV (%)',1180]] as const;
  return <g><rect x="50" y="188" width="1150" height="46" fill="#ddd" />{headers.map(([label,x]) => <text key={`${label}${x}`} x={x} y="209" textAnchor={x===65 ? 'start' : 'end'} fontSize="16" fontWeight="bold">{label}</text>)}<text x="330" y="228" textAnchor="end" fontSize="12">{priorMonth(report.monthly![0].month)}</text><text x="455" y="228" textAnchor="end" fontSize="12">{report.throughMonth}</text>{rows.map((row,i) => <g key={row.label}><rect x="50" y={234+i*23} width="1150" height="23" fill={i === rows.length-1 ? '#d8d8d8' : i%2 ? '#f1f1f1' : '#fff'} />{[[row.stockShare,490,'#ffcf00'],[row.launchShare,715,'#83a83d'],[row.salesShare,960,'#86b7d5'],[row.ivv,1105,'#ffb4b4']].map(([value,x,color],j) => typeof value === 'number' && <rect key={j} x={Number(x)} y={235+i*23} width={Math.min(100,Math.max(0,value))/100*(j===3 ? 75 : 45)} height="21" fill={String(color)} />)}{[[row.label,65],[number(row.openingStock),330],[number(row.stock),455],[percent(row.stockShare),535],[number(row.launches),675],[percent(row.launchShare),760],[number(row.sales),925],[percent(row.salesShare),1005],[percent(row.ivv),1180]].map(([value,x],j) => <text key={j} x={Number(x)} y={251+i*23} textAnchor={j===0 ? 'start' : 'end'} fontSize="15" fontWeight={i===rows.length-1 ? 'bold' : undefined}>{value}</text>)}</g>)}<text x="62" y="603" fontSize="12">MCMV = Econômico. DPA = demais padrões. Faixas contínuas: limite inferior seguinte incluído, sem arredondar a área.</text><text x="62" y="623" fontSize="12">IVV = vendas / (oferta inicial + lançamentos) × 100. Negativos preservados; percentuais de vendas omitidos com faixa negativa.</text></g>;
}
