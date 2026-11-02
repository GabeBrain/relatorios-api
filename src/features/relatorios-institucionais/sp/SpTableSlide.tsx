import { spPeriodLabel, type SpHistoryMetric, type SpPreview } from './model';
import { buildSpTable } from './tables';

const quantity = (value: number) => value.toLocaleString('pt-BR');
export function SpTableSlide({ report, dimension, metric }: { report: SpPreview; dimension: 'patterns' | 'typologies'; metric: SpHistoryMetric }) {
  const table = buildSpTable(report, dimension, metric);
  const kind = dimension === 'patterns' ? 'padrão' : 'tipologia';
  if (!table) return <div className="absolute left-[90px] top-[300px] w-[1100px] text-center"><p className="text-[28px] font-bold">Quadro por {kind} indisponível</p><p className="mt-4 text-[20px]">{dimension === 'typologies' ? 'Use Conferir tipologias e confira as divergências.' : 'Confira os dados reais e seus totais antes de preencher este quadro.'}</p></div>;
  const height = Math.min(43, 320 / table.rows.length);
  return <>
    <p className="absolute left-[62px] top-[155px] text-[20px]">{report.quarter} · {spPeriodLabel(report)}</p>
    <p className="absolute left-[62px] top-[190px] text-[18px]">Quadro por {kind} · grupos originais da API</p>
    <p className="absolute right-[100px] top-[155px] text-[28px] font-bold text-[#5b7638]">{quantity(table.total)} unidades</p>
    <svg role="img" aria-label={`Quadro reconciliado por ${kind}`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
      <text x="100" y="245" fontSize="20" fontWeight="bold">{dimension === 'patterns' ? 'Padrão' : 'Tipologia'}</text>
      <text x="880" y="245" textAnchor="end" fontSize="20" fontWeight="bold">Unidades</text>
      <text x="1170" y="245" textAnchor="end" fontSize="20" fontWeight="bold">Participação</text>
      {table.rows.map((row, index) => {
        const y = 280 + index * height;
        return <g key={row.group}><line x1="90" x2="1190" y1={y + 10} y2={y + 10} stroke="#d9d9d9" /><text x="100" y={y} fontSize="19">{row.group}</text><text x="880" y={y} textAnchor="end" fontSize="20" fontWeight="bold">{quantity(row.value)}</text><text x="1170" y={y} textAnchor="end" fontSize="19">{row.share === null ? 'Não calculável' : `${row.share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}</text></g>;
      })}
    </svg>
    <p className="absolute left-[62px] top-[605px] text-[16px]">{metric === 'stock' ? 'Oferta: fotografia do último mês. Estoques não são somados.' : 'Fluxos acumulados nos meses conferidos. Sinais negativos preservados.'}</p>
  </>;
}
