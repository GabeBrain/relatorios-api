import type PptxGenJS from 'pptxgenjs';
import {CATEGORY_SPACE,type ChartPanel} from './presentation';
import {contrastText} from './text-metrics';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';

/** Values, category labels, colors and boxes are shared with the SVG preview. */
export function addCharts(slide:PptxGenJS.Slide,charts:ChartPanel[]){
 for(const chart of charts){
  const {table,box,kind}=chart,scaled=chart.scaleMax!==undefined&&kind==='columns';
  const data=table.columns.map((name,j)=>({name,labels:table.rows.map(r=>r.label),values:table.rows.map(r=>r.values[j] as number)}));
  const type=kind==='stacked-area'?'area':kind==='pie'?'pie':'bar';
  const combo=chart.lineSeries?.length?data.map((series,j)=>({type:chart.lineSeries!.includes(j)?'line' as const:'bar' as const,data:[series],options:{chartColors:[chart.colors[j].replace('#','')],showValue:!chart.lineSeries!.includes(j)}})):null;
  const digits=chart.labelDigits??(chart.percent?0:table.formats[0]==='count'?0:2);
  const options:PptxGenJS.IChartOpts={
   x:box.x/96,y:box.y/96,w:box.w/96,h:(box.h+(scaled?CATEGORY_SPACE:70))/96,
   catAxisLabelFontFace:'Arial',catAxisLabelFontSize:scaled?11:10,valAxisLabelFontSize:9,catAxisLabelColor:'444444',
   chartColors:chart.colors.map(c=>c.replace('#','')),showLegend:kind!=='pie'&&kind!=='bars'&&table.columns.length>1,legendPos:'b',legendFontSize:10,
   displayBlanksAs:'gap',showPercent:false,
   showValue:true,showLabel:kind==='pie',dataLabelFormatCode:chart.percent||kind==='pie'?'0"%"':digits?`#,##0.${'0'.repeat(digits)}`:'#,##0',lang:'pt-BR',showTitle:false,
   barDir:kind==='bars'?'bar':'col',barGrouping:kind==='stacked-area'||chart.stacked?'stacked':'clustered',
   valAxisMinVal:chart.percent||scaled?0:undefined,valAxisMaxVal:chart.percent?100:scaled?chart.scaleMax:undefined,
   valAxisHidden:true,catAxisLineShow:false,valGridLine:{style:'none'},
   ...scaled?{
    // Inner plot = the preview box exactly; category labels use the reserved strip below it.
    layout:{x:0,y:0,w:1,h:box.h/(box.h+CATEGORY_SPACE)},barGapWidthPct:chart.gapPct??70,
    dataLabelPosition:'ctr' as const,dataLabelFontBold:true,dataLabelFontSize:11,dataLabelFontFace:'Arial',
   }:kind==='bars'?{
    // Ranking reads top-down as in the originals; pptxgenjs writes this value verbatim (its typing omits maxMin).
    catAxisOrientation:'maxMin' as unknown as 'minMax',catAxisLabelFontSize:12,catAxisLabelColor:'1F1F1F',dataLabelPosition:'ctr' as const,dataLabelFontBold:true,dataLabelFontSize:12,dataLabelFontFace:'Arial',barGapWidthPct:35}:{},
  };
  // PptxGenJS's multi-chart implementation takes options as its second argument.
  if(combo)slide.addChart(combo,options as unknown as []);else slide.addChart(type,data,options);
 }
}

/** Data labels over coloured fills: readable colour per bar/series and no line wrap inside a label. */
function contrastLabels(chart:string){
 const labelRun=(fill:string)=>`<a:solidFill><a:srgbClr val="${contrastText('#'+fill).replace('#','').toUpperCase()}"/></a:solidFill>`;
 // Only labels drawn over the fill change colour; labels outside the bar stay dark on white.
 const inside=chart.includes('<c:areaChart>')||/<c:grouping val="(stacked|percentStacked)"\/>/.test(chart)||chart.includes('<c:dLblPos val="ctr"/>');
 return chart.replace(/<c:ser>[\s\S]*?<\/c:ser>/g,series=>{
  if(!series.includes('<c:dLbls>'))return series;
  series=series.replace(/(<c:dLbls>[\s\S]*?<a:bodyPr)\/>/,'$1 wrap="none"/>');
  if(!inside)return series;
  const points=[...series.matchAll(/<c:dPt>\s*<c:idx val="(\d+)"\/>[\s\S]*?<a:srgbClr val="([0-9A-Fa-f]{6})"\/>[\s\S]*?<\/c:dPt>/g)];
  if(points.length){
   const labels=series.match(/<c:dLbls>([\s\S]*?)<\/c:dLbls>/)?.[1]??'',numFmt=labels.match(/<c:numFmt[^>]*\/>/)?.[0]??'',txPr=labels.match(/<c:txPr>[\s\S]*?<\/c:txPr>/)?.[0]??'',pos=labels.match(/<c:dLblPos[^>]*\/>/)?.[0]??'';
   if(!txPr)return series;
   const perPoint=points.map(([,idx,fill])=>`<c:dLbl><c:idx val="${idx}"/>${numFmt}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr.replace(/<a:solidFill>[\s\S]*?<\/a:solidFill>/,labelRun(fill))}${pos}<c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbl>`).join('');
   return series.replace('<c:dLbls>',`<c:dLbls>${perPoint}`);
  }
  const fill=series.match(/<c:spPr>\s*<a:solidFill>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"/)?.[1];
  return fill?series.replace(/(<c:dLbls>[\s\S]*?<c:txPr>[\s\S]*?)<a:solidFill>[\s\S]*?<\/a:solidFill>/,`$1${labelRun(fill)}`):series;
 });
}

/** PptxGenJS writes null as zero in embedded Excel. Clear those cells, too. */
export function preserveChartBlanks(bytes:Uint8Array){
 const files=unzipSync(bytes);
 for(const name of Object.keys(files).filter(k=>/^ppt\/charts\/chart\d+\.xml$/.test(k))){
  let chart=strFromU8(files[name]);const blanks:string[]=[];
  if(!chart.includes('<c:pieChart>')&&!chart.includes('<c:lineChart>'))chart=contrastLabels(chart);
  files[name]=strToU8(chart);
  for(const series of chart.matchAll(/<c:ser>[\s\S]*?<\/c:ser>/g)){
   const values=series[0].match(/<c:val>([\s\S]*?)<\/c:val>/)?.[1],range=values?.match(/<c:f>[^<]*!\$?([A-Z]+)\$?(\d+):/) ;
   if(!values||!range)continue;
   for(const point of values.matchAll(/<c:pt idx="(\d+)"><c:v><\/c:v><\/c:pt>/g))blanks.push(`${range[1]}${Number(range[2])+Number(point[1])}`);
  }
  if(!blanks.length)continue;
  const relName=name.replace('charts/','charts/_rels/')+'.rels',relations=strFromU8(files[relName]);
  const target=relations.match(/Target="([^"]+\.xlsx)"/)?.[1];if(!target)throw new Error('Gráfico sem planilha editável.');
  const bookName=target.startsWith('/')?target.slice(1):'ppt/'+target.replace(/^\.\.\//,'');
  const book=unzipSync(files[bookName]);
  for(const sheet of Object.keys(book).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k))){let xml=strFromU8(book[sheet]);for(const cell of blanks)xml=xml.replace(new RegExp(`<c r="${cell}"[^>]*>[\\s\\S]*?<\\/c>`,'g'),`<c r="${cell}"/>`);book[sheet]=strToU8(xml);}
  files[bookName]=zipSync(book);
  chart=chart.replace(/<c:pt idx="\d+"><c:v><\/c:v><\/c:pt>/g,'');files[name]=strToU8(chart);
 }
 return zipSync(files);
}
