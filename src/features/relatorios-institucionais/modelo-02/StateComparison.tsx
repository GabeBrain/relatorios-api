import outlines from './region-outlines.json';
import type {Table} from './types';
import {formatValue} from './format';
export function StateComparison({table,region}:{table:Table;region:string}){
 const shapes=outlines[region as keyof typeof outlines]??[];
 const color=(v:number|null)=>v===null?'#d8d8d8':v>20?'#4c7e27':v>5?'#93b579':v>=0?'#dce9cf':v> -10?'#f4c2be':'#cc3938';
 return <g>{['Lançamentos','Vendas líquidas','Oferta final'].map((title,j)=>{
  const data=table.rows.map(row=>{const now=row.values[j*2],before=row.values[j*2+1];return {uf:row.label,value:typeof now==='number'&&typeof before==='number'&&before>0?(now/before-1)*100:null};});
  return <g key={title} transform={`translate(${64+j*400} 245)`}><text x="155" y="0" textAnchor="middle" fontSize="22" fontWeight="700" fill="#333">{title}</text>{shapes.map(shape=>{const value=data.find(r=>r.uf===shape.uf)?.value??null;return <g key={shape.uf}><path d={shape.path} fill={color(value)} stroke="white" strokeWidth="1.5"/><text x={shape.centroid[0]} y={shape.centroid[1]} textAnchor="middle" fontSize="13" fill="#333">{shape.uf}</text></g>;})}{data.map((r,i)=><text key={r.uf} x={i%3*108} y={325+Math.floor(i/3)*24} fontSize="14" fill="#333">{r.uf}: {formatValue(r.value,'percent')}</text>)}</g>;
 })}</g>;
}
