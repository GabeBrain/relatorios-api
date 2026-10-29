import { spPeriodLabel, type SpPreview } from './model';
import type { SpAnnualSegments, SpProjectComparison } from './project-trends';

const colors: Record<string, string> = { Compactos: '#4f6529', MCMV: '#ffcf00', 'Médio Padrão': '#1d6288', Luxo: '#dce9c8' };
const fmt = (value: number) => value.toLocaleString('pt-BR');
const month = (value: string) => `${new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`)).replace('.', '')}/${value.slice(2, 4)}`;
const percentage = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export function SpTrendSlide({ report, number }: { report: SpPreview; number: number }) {
  const projects = number < 18, index = number - (projects ? 13 : 18);
  const source = projects ? report.projects : report.launchSeries;
  const mcmv = index === 2 || index === 3, rolling = index === 1 || index === 3, annual = index === 4;
  const trends = mcmv ? source?.breakdown?.mcmv : source?.trends;
  const ready = source?.status === 'ready' && (annual ? source.breakdown?.status === 'ready' && !!source.breakdown.annual : !!trends);
  const metric = projects ? 'EMPREENDIMENTOS VERTICAIS LANÇADOS' : 'UNIDADES VERTICAIS LANÇADAS';
  const subtitle = annual ? 'PARTICIPAÇÃO ANUAL POR SEGMENTO' : `${mcmv ? 'MCMV · ' : ''}${rolling ? 'ACUMULADO 12 MESES' : 'SÉRIE TRIMESTRAL'}`;
  const comparisons = trends ? rolling ? trends.rollingComparisons : trends.quarterlyComparisons : [];
  const points = trends ? rolling ? trends.rolling.map(row => ({ label: month(row.month), value: row.value, partial: false })) : trends.quarterly.map(row => ({ label: `${row.label.slice(0, 2)} ${row.label.slice(2)}${row.partial ? '*' : ''}`, value: row.value, partial: row.partial })) : [];
  const maximum = Math.max(1, ...points.map(row => row.value));
  const plotted = points.map((row, i) => ({ ...row, x: 90 + i * 1100 / Math.max(1, points.length - 1), y: 505 - row.value / maximum * 195 }));
  const message = source?.status === 'blocked' ? source.issues[0] : (annual || mcmv) && source?.breakdown?.status === 'blocked' ? source.breakdown.issues[0] : projects ? 'A contagem de empreendimentos preencherá este slide ao terminar.' : 'A conferência das séries de lançamentos preencherá este slide ao terminar.';
  return <svg role="img" aria-label={`${metric} · ${subtitle}`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <rect x="40" y="10" width="1000" height="125" fill="#f8f8f8" />
    <text x="62" y="62" fontSize="32" fontWeight="bold">{metric}</text>
    <text x="62" y="100" fontSize="27" fontWeight="bold" fill={rolling ? '#c79f00' : '#5b7638'}>{subtitle}</text>
    <rect x="62" y="116" width="85" height="9" rx="4" fill="#ffcf00" />
    <text x="62" y="157" fontSize="17">{report.quarter} · {spPeriodLabel(report)}</text>
    {!ready ? <><text x="640" y="335" textAnchor="middle" fontSize="28" fontWeight="bold">Dados em conferência</text>{wrap(message, 88).map((line, i) => <text key={i} x="640" y={380 + i * 28} textAnchor="middle" fontSize="19">{line}</text>)}</> : annual ? <AnnualChart rows={source!.breakdown!.annual!} throughMonth={report.throughMonth!} /> : <>
      <text x="90" y="202" fontSize="16">{rolling ? 'Acumulado nos últimos 12 meses' : 'Lançamentos no trimestre selecionado'}</text>
      <text x="90" y="240" fontSize="32" fontWeight="bold" fill="#5b7638">{fmt(points.at(-1)!.value)}{!rolling && points.at(-1)!.partial ? '*' : ''}</text>
      <ComparisonTable rows={comparisons} />
      <line x1="75" x2="1205" y1="530" y2="530" stroke="#d9d9d9" />
      <polyline points={plotted.map(row => `${row.x},${row.y}`).join(' ')} fill="none" stroke="#5b7638" strokeWidth="3" />
      {plotted.map((row, i) => <g key={i}>
        {(!rolling || i % 12 === 0 || i === points.length - 1) && <><circle cx={row.x} cy={row.y} r="4" fill="#5b7638" /><text x={row.x} y={row.y - 16} textAnchor="middle" fontSize={rolling ? 21 : 16} fontWeight="bold" fill="#4f6529">{fmt(row.value)}</text></>}
        {(!rolling || i % 4 === 0 || i === points.length - 1) && <text x={row.x} y="552" textAnchor="middle" fontSize={rolling ? 16 : 14}>{row.label.split(' ').map((part, j) => <tspan key={j} x={row.x} dy={j ? 18 : 0}>{part}</tspan>)}</text>}
      </g>)}
      <text x="62" y="588" fontSize="14">{rolling ? 'Cada ponto reúne 12 meses completos, incluindo o mês indicado.' : '* Trimestre atual parcial quando indicado; comparações anuais usam os mesmos meses.'} Base anterior zero: variação —.</text>
    </>}
    <text x="62" y="606" fontSize="12">{projects ? 'Reconstituição do cadastro atual pela data de lançamento; cobertura histórica sujeita à revisão.' : 'Fonte: séries municipais de lançamentos · releitura do período atual conferida.'}</text>
    {(annual || mcmv) && <text x="62" y="621" fontSize="12">{projects ? 'Segmentos pela classificação atual do cadastro; vigência histórica em revisão.' : 'Segmentos pela regra SP: MCMV = Econômico. Vigência histórica em revisão.'}</text>}
  </svg>;
}

function ComparisonTable({ rows }: { rows: SpProjectComparison[] }) {
  return <g><rect x="640" y="176" width="560" height="72" fill="#eee" stroke="#262626" />{rows.map((row, i) => <g key={row.label}>
    <line x1={640 + i * 560 / 3} x2={640 + i * 560 / 3} y1="176" y2="248" stroke="#262626" />
    <text x={640 + (i + .5) * 560 / 3} y="198" textAnchor="middle" fontSize="12">{row.label}</text>
    <text x={640 + (i + .5) * 560 / 3} y="232" textAnchor="middle" fontSize="19" fontWeight="bold" fill="#4f6529">{percentage(row.variation)}</text>
  </g>)}</g>;
}

function AnnualChart({ rows, throughMonth }: { rows: SpAnnualSegments[]; throughMonth: string }) {
  const order = ['Luxo', 'Médio Padrão', 'MCMV', 'Compactos'];
  const points = rows.map((row, i) => {
    let cumulative = 0;
    const bands = order.map(name => {
      const segment = row.segments.find(item => item.name === name)!;
      const height = (segment.share ?? 0) / 100 * 235;
      const bottom = 505 - cumulative, top = bottom - height;
      cumulative += height;
      return { ...segment, top, bottom };
    });
    return { ...row, x: 90 + i * 1100 / Math.max(1, rows.length - 1), bands };
  });
  return <g>
    {order.map((name, i) => <polygon key={name} points={[...points.map(row => `${row.x},${row.bands[i].top}`), ...[...points].reverse().map(row => `${row.x},${row.bands[i].bottom}`)].join(' ')} fill={colors[name]} />)}
    {points.map((row, index) => <g key={row.year}>
      <text x={row.x} y="240" textAnchor="middle" fontSize="19" fontWeight="bold">{fmt(row.total)}</text>
      {row.bands.filter(segment => (segment.share ?? 0) >= 6).map(segment => <text key={segment.name} x={row.x + (index === 0 ? 4 : index === points.length - 1 ? -4 : 0)} y={(segment.top + segment.bottom) / 2 + 6} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fontSize="18" fontWeight="bold" fill={['MCMV', 'Luxo'].includes(segment.name) ? '#262626' : '#fff'}>{segment.share!.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</text>)}
      {row.total === 0 && <text x={row.x} y="400" textAnchor="middle" fontSize="14">Sem lançamentos</text>}
      <text x={row.x} y="535" textAnchor="middle" fontSize="20" fontWeight="bold">{row.year}{row.partial ? '*' : ''}</text>
    </g>)}
    {order.map((name, i) => <g key={name}><rect x={90 + i * 275} y="552" width="15" height="15" fill={colors[name]} /><text x={113 + i * 275} y="566" fontSize="18">{name}</text></g>)}
    <text x="62" y="588" fontSize="14">* Ano atual até {month(throughMonth)}. Totais anuais no topo; participação calculada sobre o total da cidade.</text>
  </g>;
}

function wrap(value: string, limit: number) {
  const lines = [''];
  for (const word of value.split(' ')) { if (`${lines.at(-1)} ${word}`.length > limit) lines.push(''); lines[lines.length - 1] += `${lines.at(-1) ? ' ' : ''}${word}`; }
  return lines;
}
