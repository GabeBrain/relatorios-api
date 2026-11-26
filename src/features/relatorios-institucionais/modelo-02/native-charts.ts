import type PptxGenJS from 'pptxgenjs';
import type {ChartPanel} from './presentation';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';

/** Values, category labels, colors and boxes are shared with the SVG preview. */
export function addCharts(slide:PptxGenJS.Slide,charts:ChartPanel[]){
 for(const chart of charts){
  const {table,box,kind}=chart;
  const data=table.columns.map((name,j)=>({name,labels:table.rows.map(r=>r.label),values:table.rows.map(r=>r.values[j] as number)}));
  const type=kind==='stacked-area'?'area':kind==='pie'?'pie':'bar';
  const combo=chart.lineSeries?.length?data.map((series,j)=>({type:chart.lineSeries!.includes(j)?'line' as const:'bar' as const,data:[series],options:{chartColors:[chart.colors[j].replace('#','')],showValue:!chart.lineSeries!.includes(j)}})):null;
  const options:PptxGenJS.IChartOpts={
   x:box.x/96,y:box.y/96,w:box.w/96,h:(box.h+70)/96,
   catAxisLabelFontFace:'Arial',catAxisLabelFontSize:10,valAxisLabelFontSize:9,
   chartColors:chart.colors.map(c=>c.replace('#','')),showLegend:kind!=='pie'&&kind!=='bars'&&table.columns.length>1,legendPos:'b',legendFontSize:10,
   displayBlanksAs:'gap',showPercent:false,
   showValue:true,showLabel:false,dataLabelFormatCode:chart.percent?'0"%"':table.formats[0]==='count'?'#,##0':'#,##0.00',lang:'pt-BR',showTitle:false,
   barDir:kind==='bars'?'bar':'col',barGrouping:kind==='stacked-area'||chart.stacked?'stacked':'clustered',
   valAxisMinVal:chart.percent?0:undefined,valAxisMaxVal:chart.percent?100:undefined,
   valAxisHidden:true,catAxisLineShow:false,valGridLine:{style:'none'},
  };
  // PptxGenJS's multi-chart implementation takes options as its second argument.
  if(combo)slide.addChart(combo,options as unknown as []);else slide.addChart(type,data,options);
 }
}

/** PptxGenJS writes null as zero in embedded Excel. Clear those cells, too. */
export function preserveChartBlanks(bytes:Uint8Array){
 const files=unzipSync(bytes);
 for(const name of Object.keys(files).filter(k=>/^ppt\/charts\/chart\d+\.xml$/.test(k))){
  let chart=strFromU8(files[name]);const blanks:string[]=[];
  if(chart.includes('<c:areaChart>'))chart=chart.replace(/<c:ser>[\s\S]*?<\/c:ser>/g,series=>series.includes('val="206082"')?series.replace(/<c:dLbls>[\s\S]*?<\/c:dLbls>/g,labels=>labels.replace(/<a:srgbClr val="000000"\/>/g,'<a:srgbClr val="FFFFFF"/>')):series);
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
