import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { METHODS, groupedMetrics, type StudyResult } from './study';
import type { Provenance } from '../expanded/contract';
import { formatNumber, methodColor } from './format';
import { ChartExplanation, EquivalentTable } from './Editorial';
const axis = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const tooltipStyle = { background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', fontSize: 12 };

export function StudyCharts({ result, provenance, horizon }: { result: StudyResult; provenance: Provenance; horizon: number }) {
  const metrics = groupedMetrics(result, true).filter(m => m.provenance === provenance);
  const methods = METHODS.filter(m => metrics.some(r => r.method === m.id && r.evaluated > 0));
  const byHorizon = result.protocol.horizons.map(h => {
    const row: Record<string, string | number | null> = { horizon: `${h} meses` };
    for (const m of methods) row[m.id] = metrics.find(r => r.horizon === h && r.method === m.id)?.maeUnits ?? null;
    return row;
  });
  const ranges = [{ label: '≤ −20', lo: -Infinity, hi: -20 }, { label: '−20 a −5', lo: -20, hi: -5 }, { label: '−5 a 0', lo: -5, hi: 0 }, { label: '0 a 5', lo: 0, hi: 5 }, { label: '5 a 20', lo: 5, hi: 20 }, { label: '> 20', lo: 20, hi: Infinity }];
  const distribution = ranges.map((r, i) => {
    const row: Record<string, string | number> = { range: r.label };
    for (const m of methods) row[m.id] = result.trials.filter(t => t.provenance === provenance && t.matched && t.horizon === horizon && t.method === m.id && t.error !== null && (i === 0 ? t.error <= r.hi : t.error > r.lo && t.error <= r.hi)).length;
    return row;
  });
  if (!methods.length) return <div className="ev-panel" role="status"><h3>Sem comparações válidas neste grupo</h3><p className="ev-note">Confira datas, origem dos resultados e motivos na lista. Resultados ausentes não foram tratados como zero.</p></div>;
  return <>
    <section className="ev-panel ev-science-chart ev-design-figure"><p className="ev-overline">Amostra comum · mesmo peso por empreendimento</p><h3>Quanto erramos em cada horizonte?</h3><p className="ev-note">Erro médio absoluto em unidades. Menor é melhor. Métodos totalmente indisponíveis ficam fora do pareamento; a tabela informa quantos casos foram comparados.</p>
      <div className="ev-science-plot" role="img" aria-label="Erro médio em unidades por horizonte; valores na tabela de métricas"><ResponsiveContainer><LineChart data={byHorizon} margin={{ top: 24, right: 20, bottom: 12, left: 0 }}><CartesianGrid strokeDasharray="3 5"/><XAxis dataKey="horizon" tick={axis}/><YAxis tick={axis} width={48}/><Tooltip contentStyle={tooltipStyle} formatter={formatNumber}/><Legend/>{methods.map(m => <Line key={m.id} dataKey={m.id} name={m.label} stroke={methodColor(m.id)} strokeDasharray={m.id === 'finotti-reference' ? undefined : '6 4'} strokeWidth={3} connectNulls={false} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div><ChartExplanation title="Como ler este gráfico"><p>Quanto mais baixa a linha, menor o erro médio. Compare os métodos no mesmo horizonte e na amostra comum.</p><p>Cada empreendimento tem o mesmo peso na média. Mais datas de um mesmo empreendimento não o tornam mais importante.</p><p>Disponibilidade não é precisão: a tabela informa quantos casos realmente puderam ser avaliados.</p></ChartExplanation>
    </section>
    <section className="ev-panel ev-science-chart ev-design-figure"><p className="ev-overline">Previsões individuais · {horizon} meses</p><h3>Em que direção erramos?</h3><p className="ev-note">Erro = previsto menos reportado. No estoque, um erro positivo significa que previmos mais unidades restantes. Os intervalos não se sobrepõem: o limite superior pertence à faixa.</p>
      <div className="ev-science-plot" role="img" aria-label="Distribuição dos erros em unidades; contagens na tabela abaixo"><ResponsiveContainer><BarChart data={distribution} margin={{ top: 24, right: 20, bottom: 12, left: 0 }}><CartesianGrid strokeDasharray="3 5"/><XAxis dataKey="range" tick={axis}/><YAxis tick={axis} width={48} allowDecimals={false}/><Tooltip contentStyle={tooltipStyle}/><Legend/>{methods.map(m => <Bar key={m.id} dataKey={m.id} name={m.label} fill={methodColor(m.id)} isAnimationActive={false}/>)}</BarChart></ResponsiveContainer></div><ChartExplanation title="O que a direção revela"><p>À esquerda de zero: valor previsto abaixo do reportado. À direita: acima do reportado.</p><p>Para estoque, superestimar significa prever mais unidades restantes. Para vendas, significa prever mais vendas.</p><p>As barras contam previsões individuais; várias podem pertencer ao mesmo empreendimento.</p></ChartExplanation>
      <EquivalentTable><div className="ev-table"><table><caption>Distribuição: número de previsões por faixa de erro</caption><thead><tr><th>Erro em unidades</th>{methods.map(m => <th key={m.id}>{m.label}</th>)}</tr></thead><tbody>{distribution.map(r => <tr key={String(r.range)}><td>{r.range}</td>{methods.map(m => <td key={m.id}>{r[m.id]}</td>)}</tr>)}</tbody></table></div></EquivalentTable>
    </section>
  </>;
}
