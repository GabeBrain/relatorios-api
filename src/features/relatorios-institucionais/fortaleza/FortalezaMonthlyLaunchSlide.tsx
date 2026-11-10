import type { FortalezaSelection } from './model';
import { introMonth } from './intro-view';
import type { LaunchBin, LaunchSeries } from './monthly-launches';
import './intro-slides.css';

const artwork = import.meta.glob('./assets/monthly/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const number = (value: number) => value.toLocaleString('pt-BR');
const percentage = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
function Plot({ bins, x, width, accumulated, projects }: { bins: LaunchBin[]; x: number; width: number; accumulated?: boolean; projects: boolean }) {
  const bottom = 533, height = 275, step = width / bins.length, barWidth = step * (accumulated ? .76 : .78);
  const max = Math.max(1, ...bins.map(bin => bin.total));
  const fontSize = accumulated ? 24 : projects ? 17 : 12;
  return <g>
    <line x1={x} x2={x + width} y1={bottom} y2={bottom} stroke="#DAE4EB" />
    {bins.map((bin, index) => {
      const cx = x + step * (index + .5), economic = bin.economic / max * height, other = bin.other / max * height;
      return <g key={bin.month}>
        <rect x={cx - barWidth / 2} y={bottom - economic} width={barWidth} height={economic} fill="#1B4059" />
        <rect x={cx - barWidth / 2} y={bottom - economic - other} width={barWidth} height={other} fill="#42CCA2" />
        {economic > fontSize * 1.3 && <text x={cx} y={bottom - economic / 2 + fontSize * .35} fontSize={fontSize} textAnchor="middle" fill="white" fontWeight={700}>{number(bin.economic)}</text>}
        {other > fontSize * 1.3 && <text x={cx} y={bottom - economic - other / 2 + fontSize * .35} fontSize={fontSize} textAnchor="middle" fill="black" fontWeight={700}>{number(bin.other)}</text>}
        <circle cx={cx} cy={bottom - economic - other} r={accumulated ? 6.5 : 5} fill="#AA4EBF" />
        <text x={cx} y={bottom - economic - other - 14} fontSize={accumulated ? 28 : projects ? 19 : 14} fontWeight={700} textAnchor="middle" fill="black">{number(bin.total)}</text>
        <text x={cx} y={bottom + 25} fontSize={accumulated ? 17 : 14} textAnchor={accumulated ? 'middle' : 'end'} transform={accumulated ? undefined : `rotate(-50 ${cx} ${bottom + 25})`} fill="black">{bin.label}</text>
      </g>;
    })}
  </g>;
}
export default function FortalezaMonthlyLaunchSlide({ page, selection, series }: { page: 11 | 12 | 13 | 14 | 15; selection: FortalezaSelection; series: LaunchSeries }) {
  const projects = page === 11;
  if (page === 12 || page === 14) return <svg className="fortaleza-intro-slide block aspect-video h-auto w-full" viewBox="0 0 1280 720" role="img" aria-label={`Fortaleza · slide ${page}`}>
    <image href={artwork[`./assets/monthly/${page}.png`]} width={1280} height={720} aria-hidden="true" />
    <text x={43} y={217} fill="#1B4059" fontSize={18}>{introMonth(selection.position)} de {selection.year}</text>
    <g aria-label="Slide em preparação" fill="#1B4059" textAnchor="middle"><text x={640} y={355} fontSize={28} fontWeight={700}>Fonte segmentada em preparação</text><text x={640} y={395} fontSize={18}>{page === 12 ? 'Unidades verticais, comerciais e casas da capital e RM.' : 'Unidades verticais e casas da região metropolitana.'}</text></g>
  </svg>;
  return <svg className="fortaleza-intro-slide block aspect-video h-auto w-full" viewBox="0 0 1280 720" role="img" aria-label={`Fortaleza · slide ${page}`}>
    <image href={artwork[`./assets/monthly/${page}.png`]} width={1280} height={720} aria-hidden="true" />
    <text x={43} y={187} fill="#1B4059" fontSize={24} fontWeight={700}>Residencial Vertical</text>
    <text x={43} y={217} fill="#1B4059" fontSize={15}>{introMonth(selection.position)} de {selection.year}</text>
    <g fill="#1B4059" fontSize={22} fontWeight={700} textAnchor="middle"><text x={860} y={144}>{percentage(series.changes.total)}</text><text x={1042} y={144}>{percentage(series.changes.economic)}</text><text x={1180} y={144} fill="#42CCA2">{percentage(series.changes.other)}</text></g>
    <g fontSize={13} fill="black" textAnchor="middle"><text x={860} y={164}>em relação</text><text x={860} y={182}>a {introMonth(selection.position)} de {selection.year - 1}</text><text x={1042} y={166}>Padrão econômico</text><text x={1180} y={166}>Demais padrões</text><text x={1110} y={190}>acumulado no ano</text></g>
    {series.status === 'ready' ? <><Plot bins={series.history} x={15} width={910} projects={projects} /><Plot bins={series.accumulated} x={974} width={270} accumulated projects={projects} /></> : <g aria-label="Histórico de lançamentos pendente"><text x={640} y={365} textAnchor="middle" fontSize={26} fill="#1B4059">Aguardando conferência da fonte</text></g>}
    <g fontSize={15} fontWeight={700} fill="black"><rect x={103} y={596} width={8} height={8} fill="#1B4059" /><text x={116} y={605}>{projects ? 'Empreendimentos' : 'Unidades'} · Padrão Econômico</text><rect x={470} y={596} width={8} height={8} fill="#42CCA2" /><text x={483} y={605}>{projects ? 'Empreendimentos' : 'Unidades'} · Demais Padrões</text><circle cx={850} cy={600} r={4.5} fill="#AA4EBF" /><text x={862} y={605}>Total</text></g>
  </svg>;
}
