import { Fragment, type CSSProperties } from 'react';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, Tooltip, LabelList } from 'recharts';
import type { PanoramaReportModel } from '../types';
import type { ReportPageDefinition } from '../report/manifest';
import { territorialOfferRows, territorialPriceRows, territorialTrend, TERRITORIAL_COLORS } from '../report/territorial-selectors';
import { observedComparison, monetaryTitle, territorialHeading } from '../report/editorial-contracts';
import { quarterLabel } from '../lib/launches';
import '../print/territorial-comparison.css';
import { compactQuarterLabel } from '../lib/chart-labels';
import { FiergsPointValue } from './FiergsPointValue';
import { PresentationChart } from '../report/presentation/PresentationChart';



const number = (n: number | null | undefined, digits = 0) => n == null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
function Legend({ report }: { report: PanoramaReportModel }) { return <div className="panorama-territorial-legend">{report.territorial?.units.map(({unit},i) => <span key={unit.id}><i style={{background:TERRITORIAL_COLORS[i]}}/>{unit.label}</span>)}</div>; }
export function TerritorialComparisonSlide({ report, def }: { report: PanoramaReportModel; def: ReportPageDefinition }) {
  const kind = def.territorialKind; const units = report.territorial?.units ?? [];
  const title = monetaryTitle(def.title);
  if (kind === 'trend') {
    const model = territorialTrend(report, def); const format = (n: number | null) => number(n, model.percent || model.monetary ? 1 : 0);
    const heading = territorialHeading(title);
    const annotation = (left: number | null, right: number | null) => {
      const c = observedComparison(left, right);
      return !c.visible ? '—' : c.percentage === null ? `Δ ${format(c.difference)}` : `${c.percentage >= 0 ? '+' : ''}${number(c.percentage, 1)}%`;
    };
    const pairs = model.series.flatMap((s) => s.comparisons.map((pair) => ({ ...pair, unit: s.unit, color: s.color })));
    return <div className={`panorama-fiergs-quarterly panorama-territorial-quarterly units-${units.length}`}>
      <header><h2>{heading.title}<span>{heading.subtitle}</span></h2><div className="panorama-territorial-annual-box">
        {model.annual[0]?.values.length > 1 && <><b>VARIAÇÕES ANUAIS</b><table><thead><tr><th/>{model.annual[0].values.slice(1).map((p,i) => <th key={p.year}>{model.annual[0].values[i].year} × {p.year}</th>)}</tr></thead><tbody>{model.annual.map(({unit,values},i) => <tr key={unit.id} style={{background:TERRITORIAL_COLORS[i],color:i===1?'#20231d':'#fff'}}><th>{unit.label}</th>{values.slice(1).map((p,j) => <td key={p.year}>{annotation(values[j].value,p.value)}</td>)}</tr>)}</tbody></table></>}
      </div></header>
      <main><div className="panorama-fiergs-quarterly-series"><div className="panorama-territorial-series-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={model.rows} margin={{top:42,right:28,bottom:24,left:24}}>
        <XAxis dataKey="quarter" tickFormatter={(q) => compactQuarterLabel(String(q))} tickLine={false} tickMargin={9} axisLine={{stroke:'#b8b8b8'}} interval={0} minTickGap={0}/><Tooltip formatter={(v) => format(Number(v))}/>
        {model.series.map((s,i) => <Line key={s.unit.id} dataKey={`v${i}`} name={s.unit.label} stroke={s.color} strokeWidth={4} type="monotone" connectNulls={false} dot={{r:2.5,fill:s.color}} isAnimationActive={false}>
          <LabelList dataKey={`v${i}`} content={(props) => {
            const value=props.value; const x=Number(props.x),y=Number(props.y),index=Number(props.index);
            const others=model.series.slice(0,i).some((other) => {
              const previous=other.plotted[index]?.value;
              return previous!=null && typeof value==='number' && Math.abs(previous-value) <= Math.max(Math.abs(value)*.08,1);
            });
            return typeof value==='number' && Number.isFinite(value) && Number.isFinite(x) && Number.isFinite(y)
              ? <FiergsPointValue x={x} y={y} value={value} index={index} data={s.plotted} format={format} referenceQuarter={report.scope.endQuarter[0]} color={s.color} offset={others?24*i:0}/> : null;
          }}/>
        </Line>)}
      </LineChart></ResponsiveContainer></div><Legend report={report}/></div>
      <aside className="panorama-fiergs-context-comparisons panorama-territorial-comparisons" style={{'--comparison-count':pairs.length} as CSSProperties}>
        {pairs.map((p) => {
          const maximum=Math.max(Math.abs(p.left??0),Math.abs(p.right??0),1);
          const height=(v:number|null)=>`${v==null?0:Math.abs(v)/maximum*100}%`;
          const change=annotation(p.left,p.right);
          return <section key={`${p.unit.id}-${p.kind}`}><h3 style={{borderLeftColor:p.color}}><strong>{p.unit.label}</strong> · {p.title}</h3>
            <PresentationChart spec={{type:'bar',annotation:change,labels:[p.leftLabel,p.rightLabel],series:[{name:p.unit.label,values:[p.left,p.right],color:'4F7ABD'}]}}><div>
              <span><b>{format(p.left)}</b><i style={{height:height(p.left),background:p.left!=null&&p.left<0?'#c62026':undefined}}/><small>{p.leftLabel}</small></span>
              <em>{change}</em><span><b>{format(p.right)}</b><i style={{height:height(p.right),background:p.right!=null&&p.right<0?'#c62026':undefined}}/><small>{p.rightLabel}</small></span>
            </div></PresentationChart></section>;
        })}</aside></main>
      <footer>FONTE: BRAIN INTELIGÊNCIA ESTRATÉGICA · Geobrain{model.monetary ? ' · R$ milhões' : model.percent ? ' · %' : model.metric === 'meter' ? ' · R$/m²' : ''}</footer></div>;
  }
  if (kind?.startsWith('offer-')) {
    const rows = territorialOfferRows(report,kind);
    const shares=units.map((_,i)=>rows.some((r)=>r.values[i].percentage!==null));
    return <div className="panorama-territorial-slide"><header><h2>{territorialHeading(title).title}<span>{territorialHeading(title).subtitle}</span></h2></header><table><thead><tr><th rowSpan={2}>Categoria</th>{units.map(({unit},i) => <th colSpan={shares[i]?2:1} key={unit.id}>{unit.label}</th>)}</tr><tr>{units.map(({unit},i) => <Fragment key={unit.id}><th>Oferta final</th>{shares[i]&&<th>%</th>}</Fragment>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.label}><th>{row.label}</th>{row.values.map((v,i) => <Fragment key={units[i].unit.id}><td>{number(v.value)}</td>{shares[i]&&<td>{v.percentage === null ? '—' : `${number(v.percentage,1)}%`}</td>}</Fragment>)}</tr>)}</tbody></table><footer>Fonte: Brain Inteligência Estratégica · Geobrain</footer></div>;
  }
  const model = territorialPriceRows(report,kind ?? 'meter-standard');
  return <div className="panorama-territorial-slide"><header><h2>{territorialHeading(title).title}<span>{territorialHeading(title).subtitle}</span></h2></header><div className="panorama-territorial-price-plot"><ResponsiveContainer width="100%" height="100%"><BarChart data={model.rows} margin={{top:35,left:25,right:25,bottom:20}}>
    <XAxis dataKey="label" tickLine={false} interval={0}/><Tooltip formatter={(v) => number(Number(v))}/>{units.map(({unit},i) => <Bar key={unit.id} dataKey={`v${i}`} name={unit.label} fill={TERRITORIAL_COLORS[i]} isAnimationActive={false}><LabelList dataKey={`v${i}`} position="top" fontSize="1cqw" formatter={(v:number) => Number.isFinite(v)?number(v):''}/></Bar>)}
  </BarChart></ResponsiveContainer></div><Legend report={report}/><p className="panorama-territorial-averages">{model.averages.map(({unit,value}) => <span key={unit.id}>Média {unit.label}: {number(value)}</span>)}</p><footer>Fonte: Brain Inteligência Estratégica · Geobrain · {quarterLabel(report.scope.endQuarter)}</footer></div>;
}
