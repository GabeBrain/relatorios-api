import { spPeriodLabel, type SpPreview } from './model';
export function SpNeighborhoodSlide({ report }: { report: SpPreview }) {
  const data = report.projects?.neighborhoods;
  const maximum = Math.max(1, ...data?.rows.map(row => row.units) ?? []);
  return <svg role="img" aria-label="Top 10 bairros por unidades lançadas" viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
    <rect x="40" y="10" width="1000" height="140" fill="#f8f8f8" /><text x="62" y="62" fontSize="31" fontWeight="bold">UNIDADES VERTICAIS LANÇADAS POR BAIRRO</text><rect x="62" y="112" width="85" height="9" rx="4" fill="#ffcf00" /><text x="62" y="158" fontSize="17">{report.quarter} · {spPeriodLabel(report)}</text>
    {data?.status === 'ready' ? <>
      {data.rows.map((row, i) => <g key={row.neighborhood}><text x="330" y={208 + i * 36} textAnchor="end" fontSize="17">{row.neighborhood.length > 29 ? `${row.neighborhood.slice(0, 27)}…` : row.neighborhood}<title>{row.neighborhood}</title></text><rect x="345" y={188 + i * 36} width={row.units / maximum * 500} height="24" fill={i === 0 ? '#ffcf00' : i % 2 ? '#5b7638' : '#83a83d'} /><text x={355 + row.units / maximum * 500} y={208 + i * 36} fontSize="16" fontWeight="bold">{row.share === null ? '—' : `${row.share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}</text></g>)}
      <rect x="940" y="300" width="270" height="170" rx="24" fill="#5b7638" /><text x="1075" y="342" textAnchor="middle" fontSize="34" fontWeight="bold" fill="#fff">{data.topShare === null ? '—' : `${data.topShare.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}</text>{['dos lançamentos da cidade', 'concentrados no Top 10', `${data.topTotal!.toLocaleString('pt-BR')} de ${data.cityTotal!.toLocaleString('pt-BR')} unidades`].map((line, i) => <text key={i} x="1075" y={378 + i * 28} textAnchor="middle" fontSize="18" fill="#fff">{line}</text>)}
      {!data.rows.length && <text x="640" y="365" textAnchor="middle" fontSize="24">Nenhum lançamento no período conferido.</text>}
      <text x="62" y="610" fontSize="14">Denominador: todos os lançamentos municipais; cadastro reconciliado pelo total de unidades.</text>
    </> : <><text x="640" y="335" textAnchor="middle" fontSize="28" fontWeight="bold">Ranking de bairros em conferência</text>{wrap(data?.issues[0] ?? 'O cadastro completo preencherá este slide após a reconciliação com os lançamentos municipais.').map((line, i) => <text key={i} x="640" y={380 + i * 28} textAnchor="middle" fontSize="18">{line}</text>)}</>}
  </svg>;
}
function wrap(value: string) { const lines = ['']; for (const word of value.split(' ')) { if (`${lines.at(-1)} ${word}`.length > 95) lines.push(''); lines[lines.length - 1] += `${lines.at(-1) ? ' ' : ''}${word}`; } return lines; }
