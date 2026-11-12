import { FortalezaArtwork } from './FortalezaArtwork';
import { INTRO_LAYOUTS, introTablePlan,introCellFont } from './intro-layout';
import type { IntroLayout } from './intro-layout';
import { introMonth, titleCase, type IntroView } from './intro-view';
import type { IntroBin, IntroProject } from './intro-data';
import './intro-slides.css';

type Shape = IntroLayout['shapes'][number];
type Line = NonNullable<Shape['lines']>[number];
const backgrounds = import.meta.glob('./assets/intro/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('pt-BR');
const change = (value: number | null) => value === null ? '—' : `${value > 0 ? '+ ' : value < 0 ? '- ' : ''}${Math.abs(Math.round(value))}%`;
const joinCities = (values: string[]) => values.length < 2 ? values.join('') : `${values.slice(0, -1).join(', ')} e ${values.at(-1)}`;
function lineText(line: Line, shape: Shape, page: number, view: IntroView, index: number) {
  if(page===2&&view.sampleMethod==='registry'){
    if(line.text==='Amostra:')return 'Base consultada:';
    if(line.text==='pesquisadas')return 'identificadas';
  }
  switch (line.binding) {
    case 'period': return view.monthly ? `${titleCase(introMonth(view.month))} de ${view.year}` : `${view.position}º Trimestre de ${view.year}`;
    case 'scope': return page === 9 ? joinCities(view.cities) : view.scope;
    case 'heading': return line.format ? line.format.replace('{year}', String(view.year)).replace('{month}', titleCase(introMonth(view.month))) : page === 2 ? `Mercado Imobiliário – ${titleCase(introMonth(view.month))} | ${view.year}` : page >= 3 && page <= 7 ? `LANÇAMENTOS | ${view.year} ${page === 6 ? '–' : '-'} ${page < 5 ? 'Fortaleza' : 'Região Metropolitana'}` : view.monthly ? 'EMPREENDIMENTOS LANÇADOS POR MÊS' : 'EMPREENDIMENTOS LANÇADOS POR TRIMESTRE';
    case 'projects': return number(view.sample.projects);
    case 'companies': return number(view.sample.companies);
    case 'capital': return `Fortaleza: ${number(view.sample.capital)}`;
    case 'rm': return `Região Metropolitana: ${number(view.sample.rm)}`;
    case 'rm-cities': return `(${joinCities(view.cities.filter(city => city !== 'Fortaleza'))})`;
    case 'change-total': return change(view.changes.total);
    case 'change-capital': return change(view.changes.capital);
    case 'change-rm': return change(view.changes.rm);
    case 'comparison': return view.monthly ? `a ${introMonth(view.month)} de ${view.year - 1}` : index === shape.lines.length - 1 ? `de ${view.year - 1}` : `ao ${view.position}º Trimestre `;
    default: return line.text ?? '';
  }
}
function projectValues(project: IntroProject | undefined, index: number, columns: number) {
  if (!project) return Array.from({ length: columns }, () => '');
  const date = `${introMonth(Number(project.date.slice(5, 7)), true)}/${project.date.slice(2, 4)}`;
  return [String(index + 1), project.name || '—', date, project.developer || '—', ...(columns === 8 ? [project.city] : []), project.neighborhood || '—', project.type || '—', project.standard || '—'];
}
function Plot({ shape, bins, monthly, legend = false }: { shape: Shape; bins: IntroBin[] | null; monthly: boolean; legend?: boolean }) {
  if (!bins) return <g aria-label="Histórico de empreendimentos pendente"><line x1={shape.x + 15} x2={shape.x + shape.width - 15} y1={533} y2={533} stroke="#D7E0E8" /><text x={shape.x + shape.width / 2} y={360} textAnchor="middle" fontSize={26} fill="#1A3F59">—</text></g>;
  const left = shape.x + shape.width * 0.015746, width = shape.width * 0.968508;
  const height = shape.height * .7488573758737428, bottom = shape.y + shape.height * .03622685740439883 + height;
  const largest = Math.max(1, ...bins.map(bin => Math.max(bin.total, bin.capital + bin.rm)+(bin.unknownCapital??0)+(bin.unknownRm??0)));
  const stepSize = 10 ** Math.floor(Math.log10(largest));
  const max = Math.ceil(largest / stepSize) * stepSize;
  const step = width / bins.length, barWidth = step / 1.3, labelSize = bins.length > 10 ? 16 : 26.6666666667, totalLabelSize = bins.length > 10 ? 18.6666666667 : labelSize;
  return <g aria-label="Empreendimentos lançados">
    <line x1={left} x2={left + width} y1={bottom} y2={bottom} stroke="#DAE4EB" />
    {bins.map((bin, index) => {
      const x = left + step * (index + .5), capital = bin.capital / max * height, rm = bin.rm / max * height, totalY = bottom - bin.total / max * height;
      const unknown=(bin.unknownCapital??0)+(bin.unknownRm??0),upperY=bottom-(bin.total+unknown)/max*height;
      return <g key={index}><rect x={x - barWidth / 2} y={bottom - capital} width={barWidth} height={capital} fill="#1B4059" /><rect x={x - barWidth / 2} y={bottom - capital - rm} width={barWidth} height={rm} fill="#42CCA2" />
        {bin.capital !== 0 && <text x={x} y={bottom - capital / 2 + labelSize * .35} textAnchor="middle" fontSize={labelSize} fontWeight={700} fill="white">{bin.capital}</text>}
        {bin.rm !== 0 && <text x={x} y={bottom - capital - rm / 2 + labelSize * .35} textAnchor="middle" fontSize={labelSize} fontWeight={700} fill="black">{bin.rm}</text>}
        {unknown>0&&<g aria-label="Faixa por classificação horizontal pendente"><line x1={x} x2={x} y1={totalY} y2={upperY} stroke="#AA4EBF" strokeWidth={3} strokeDasharray="4 3"/><line x1={x-8} x2={x+8} y1={upperY} y2={upperY} stroke="#AA4EBF" strokeWidth={3}/></g>}
        <circle cx={x} cy={totalY} r={6.5} fill="#AA4EBF" /><text x={x} y={upperY - (bins.length > 10 ? 15 : 19)} textAnchor="middle" fontSize={totalLabelSize} fontWeight={700} fill="black">{unknown?`${bin.total}–${bin.total+unknown}`:bin.total}</text>
        <text x={x} y={monthly && legend ? bottom + 20 : bottom + 26} textAnchor={monthly && legend ? 'end' : 'middle'} transform={monthly && legend ? `rotate(-50 ${x} ${bottom + 20})` : undefined} fontSize={monthly && legend ? 14 : 16} fill="black">{bin.label}</text>
      </g>;
    })}
    {legend && <g fontSize={15} fontWeight={700} fill="black"><rect x={121} y={596} width={8} height={8} fill="#1B4059" /><text x={133} y={605}>Empreendimentos - Fortaleza</text><rect x={399} y={596} width={8} height={8} fill="#42CCA2" /><text x={411} y={605}>Empreendimentos - Região Metropolitana</text><circle cx={774} cy={600} r={4.5} fill="#AA4EBF" /><text x={783} y={605}>Total</text></g>}
  </g>;
}
export default function FortalezaIntroSlide({ model, page, view }: { model: 'junho' | 'julho'; page: number; view: IntroView }) {
  const layout = INTRO_LAYOUTS[model][page - 1];
  let chartIndex = 0;
  return <svg className="fortaleza-intro-slide block aspect-video h-auto w-full" viewBox="0 0 1280 720" role="img" aria-label={`Fortaleza · slide ${page}`}>
    <FortalezaArtwork href={backgrounds[`./assets/intro/${model}-${page}.png`]} kind="intro" page={`${model}-${page}`}/>
    {layout.shapes.map((shape, shapeIndex) => {
      if (shape.slot === 'chart') { const first = chartIndex++ === 0; return <Plot key={shapeIndex} shape={shape} bins={first ? view.history : view.accumulated} monthly={view.monthly} legend={first} />; }
      if (shape.slot === 'table') {
        const projects = page < 5 ? view.capital : view.rm,plan=introTablePlan(model,page,projects?.length??0),offset=plan.offset;
        const header=shape.cells.filter(cell=>cell.row===0),headerHeight=Math.max(...header.map(cell=>cell.height)),rowHeight=(610-shape.y-headerHeight)/plan.rows;
        const cells=plan.expanded?[...header,...Array.from({length:plan.rows},(_,index)=>shape.cells.filter(cell=>cell.row===1).map(cell=>({...cell,row:index+1,y:shape.y+headerHeight+index*rowHeight,height:rowHeight,font:{...cell.font,size:Math.min(cell.font.size,rowHeight*.55)}}))).flat()]:shape.cells;
        return <g key={shapeIndex}>{cells.map((cell, cellIndex) => {
          const value = cell.row === 0 ? cell.text : projects === null ? cell.column === 0 ? '—' : '' : projectValues(projects[offset + cell.row - 1], offset + cell.row - 1, shape.columns)[cell.column];
          const align = cell.align === 2 ? 'center' : cell.align === 3 ? 'right' : 'left';
          const fontSize=plan.expanded&&cell.row>0?introCellFont(value,cell.width-cell.marginLeft-cell.marginRight-4,cell.height-4,cell.font.size):cell.font.size;
          return <g key={cellIndex}><rect x={cell.x} y={cell.y} width={cell.width} height={cell.height} fill={cell.row===0?'white':'none'} stroke="white" strokeWidth={.7}/><foreignObject x={cell.x} y={cell.y} width={cell.width} height={cell.height}><div className="fortaleza-intro-cell" style={{ paddingLeft: cell.marginLeft, paddingRight: cell.marginRight, fontSize, fontWeight: cell.font.bold ? 700 : 400, color: cell.font.color, textAlign: align }}><span style={plan.expanded?{overflowWrap:'anywhere'}:undefined}>{value}</span></div></foreignObject></g>;
        })}</g>;
      }
      return <g key={shapeIndex}>{shape.lines.map((line, index) => {
        const text = lineText(line, shape, page, view, index), x = line.align === 3 ? line.x + line.width : line.align === 2 ? line.x + line.width / 2 : line.x;
        return <text key={index} x={x} y={line.y} dominantBaseline="text-before-edge" textAnchor={line.align === 3 ? 'end' : line.align === 2 ? 'middle' : 'start'} fontSize={line.font.size} fontWeight={line.font.bold ? 700 : 400} fontStyle={line.font.italic ? 'italic' : 'normal'} fill={line.font.color}>{text}</text>;
      })}</g>;
    })}
    {page===2&&view.sampleMethod==='registry'&&<g fill="white" fontSize={14}><text x={67} y={530}>Contagem do cadastro consultado; não representa</text><text x={67} y={551}>a amostra histórica da pesquisa.</text><text x={67} y={575}>Empresas: nomes informados, sem estimar ausências.</text></g>}
    {page===10&&view.history?.some(bin=>bin.unknownCapital||bin.unknownRm)&&<text x={555} y={655} fontSize={10} fill="#1B4059">Faixa mínima–máxima: horizontais sem produto confirmado; comparações dessas faixas não são calculadas.</text>}
  </svg>;
}
