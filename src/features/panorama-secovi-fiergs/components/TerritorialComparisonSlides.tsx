import { Fragment } from 'react';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, Tooltip, LabelList } from 'recharts';
import type { PanoramaReportModel } from '../types';
import type { ReportPageDefinition } from '../report/manifest';
import { territorialOfferRows, territorialPriceRows, territorialTrend, TERRITORIAL_COLORS } from '../report/territorial-selectors';
import { observedComparison, monetaryTitle } from '../report/editorial-contracts';
import { quarterLabel } from '../lib/launches';
import '../print/territorial-comparison.css';

const number = (n: number | null | undefined, digits = 0) => n == null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
function Legend({ report }: { report: PanoramaReportModel }) { return <div className="panorama-territorial-legend">{report.territorial?.units.map(({unit},i) => <span key={unit.id}><i style={{background:TERRITORIAL_COLORS[i]}}/>{unit.label}</span>)}</div>; }
export function TerritorialComparisonSlide({ report, def }: { report: PanoramaReportModel; def: ReportPageDefinition }) {
  const kind = def.territorialKind; const units = report.territorial?.units ?? [];
  const title = monetaryTitle(def.title);
  if (kind === 'trend') {
    const model = territorialTrend(report, def); const format = (n: number | null) => number(n, model.percent || model.monetary ? 1 : 0);
    return <div className="panorama-territorial-slide"><header><h2>{title}</h2><i/></header>
      <div className="panorama-territorial-main"><div className="panorama-territorial-plot"><ResponsiveContainer width="100%" height="100%"><LineChart data={model.rows} margin={{top:45,right:30,bottom:22,left:30}}>
        <XAxis dataKey="quarter" tickFormatter={(q) => String(q).replace('T','T/')} tickLine={false} axisLine={{stroke:'#b8b8b8'}} minTickGap={26}/><Tooltip formatter={(v) => format(Number(v))}/>
        {model.series.map((s,i) => <Line key={s.unit.id} dataKey={`v${i}`} name={s.unit.label} stroke={s.color} strokeWidth={3} type="monotone" connectNulls={false} dot={{r:3}} isAnimationActive={false}>
          <LabelList dataKey={`v${i}`} content={(props) => {
            const value=props.value;const x=Number(props.x),y=Number(props.y);
            return typeof value==='number'&&Number.isFinite(value)&&Number.isFinite(x)&&Number.isFinite(y)
              ? <text x={x} y={y-12-i*14} textAnchor="middle" fontSize="1cqw" fill="#20231d" stroke="#fff" strokeWidth={3} paintOrder="stroke">{format(value)}</text> : null;
          }}/>
        </Line>)}
      </LineChart></ResponsiveContainer></div><aside>{model.series.map((s) => <section key={s.unit.id}><strong>{s.unit.label}</strong>{s.comparisons.map((p) => {
        const comparison = observedComparison(p.left,p.right,p.complete);
        return <div key={p.kind}><small>{p.title}</small><p>{p.leftLabel}: {format(p.left)} → {p.rightLabel}: {format(p.right)}</p><b>{comparison.percentage === null ? `Δ ${format(comparison.difference)}` : `${comparison.percentage >= 0 ? '+' : ''}${number(comparison.percentage,1)}%`}</b></div>;
      })}</section>)}</aside></div><Legend report={report}/>
      {model.annual[0]?.values.length > 1 && <table className="panorama-territorial-annual"><thead><tr><th>Variações anuais</th>{model.annual[0].values.slice(1).map((p,i) => <th key={p.year}>{model.annual[0].values[i].year} × {p.year}</th>)}</tr></thead><tbody>{model.annual.map(({unit,values}) => <tr key={unit.id}><th>{unit.label}</th>{values.slice(1).map((p,i) => { const c=observedComparison(values[i].value,p.value);return <td key={p.year}>{!c.visible?'—':c.percentage === null?`Δ ${format(c.difference)}`:`${c.percentage>=0?'+':''}${number(c.percentage,1)}%`}</td>; })}</tr>)}</tbody></table>}
      <footer>Fonte: Brain Inteligência Estratégica · Geobrain{model.monetary ? ' · R$ milhões' : model.percent ? ' · %' : model.metric === 'meter' ? ' · R$/m²' : ''}</footer></div>;
  }
  if (kind?.startsWith('offer-')) {
    const rows = territorialOfferRows(report,kind);
    const shares=units.map((_,i)=>rows.some((r)=>r.values[i].percentage!==null));
    return <div className="panorama-territorial-slide"><header><h2>{title}</h2><i/></header><table><thead><tr><th rowSpan={2}>Categoria</th>{units.map(({unit},i) => <th colSpan={shares[i]?2:1} key={unit.id}>{unit.label}</th>)}</tr><tr>{units.map(({unit},i) => <Fragment key={unit.id}><th>Oferta final</th>{shares[i]&&<th>%</th>}</Fragment>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.label}><th>{row.label}</th>{row.values.map((v,i) => <Fragment key={units[i].unit.id}><td>{number(v.value)}</td>{shares[i]&&<td>{v.percentage === null ? '—' : `${number(v.percentage,1)}%`}</td>}</Fragment>)}</tr>)}</tbody></table><footer>Fonte: Brain Inteligência Estratégica · Geobrain</footer></div>;
  }
  const model = territorialPriceRows(report,kind ?? 'meter-standard');
  return <div className="panorama-territorial-slide"><header><h2>{title}</h2><i/></header><div className="panorama-territorial-price-plot"><ResponsiveContainer width="100%" height="100%"><BarChart data={model.rows} margin={{top:35,left:25,right:25,bottom:20}}>
    <XAxis dataKey="label" tickLine={false} interval={0}/><Tooltip formatter={(v) => number(Number(v))}/>{units.map(({unit},i) => <Bar key={unit.id} dataKey={`v${i}`} name={unit.label} fill={TERRITORIAL_COLORS[i]} isAnimationActive={false}><LabelList dataKey={`v${i}`} position="top" fontSize="1cqw" formatter={(v:number) => Number.isFinite(v)?number(v):''}/></Bar>)}
  </BarChart></ResponsiveContainer></div><Legend report={report}/><p className="panorama-territorial-averages">{model.averages.map(({unit,value}) => <span key={unit.id}>Média {unit.label}: {number(value)}</span>)}</p><footer>Fonte: Brain Inteligência Estratégica · Geobrain · {quarterLabel(report.scope.endQuarter)}</footer></div>;
}
