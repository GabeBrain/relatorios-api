import outlines from './region-outlines.json';
import type {Table} from './types';
import {signedPercent,direction} from './format';
import {contrastText,textWidth} from './text-metrics';
import {VARIATION_CLASSES,NO_BASE,variationColor} from './variation-classes';

export function StateComparison({table,region,captions}:{table:Table;region:string;captions?:string[][]}){
 const shapes=outlines[region as keyof typeof outlines]??[],scale=.82,missing=table.rows.some(r=>[0,2,4].some(j=>{const now=r.values[j],before=r.values[j+1];return !(typeof now==='number'&&typeof before==='number'&&before>0);}));
 const legend=[...VARIATION_CLASSES,...missing?[{label:'Sem base comparável',color:NO_BASE}]:[]];
 return <g>
  {[0,1,2].map(j=>{
   const data=table.rows.map(row=>{const now=row.values[j*2],before=row.values[j*2+1];return {uf:row.label,value:typeof now==='number'&&typeof before==='number'&&before>0?(now/before-1)*100:null};});
   const left=215+j*360,caption=captions?.[j]??[['Lançamentos','Vendas','Oferta'][j]];
   return <g key={j}>
    {j>0&&<line x1={left-35} x2={left-35} y1="190" y2="600" stroke="#bfbfbf"/>}
    {caption.map((line,k)=><text key={k} x={left} y={225+k*24} fontSize={Math.min(20,20*300/Math.max(1,textWidth(line,20,true)))} fontWeight="700" fill="#262626">{line}</text>)}
    <g transform={`translate(${left} 285) scale(${scale})`}>{shapes.map(shape=>{const value=data.find(r=>r.uf===shape.uf)?.value??null;return <path key={shape.uf} d={shape.path} fill={variationColor(value)} stroke="white" strokeWidth="2"/>;})}</g>
    {/* Many small UFs (e.g. Nordeste) would collide on the map: values go to a list under it. */}
    {shapes.length>4&&shapes.map(shape=><text key={`uf-${shape.uf}`} x={left+shape.centroid[0]*scale} y={289+shape.centroid[1]*scale} textAnchor="middle" fontSize="10" fontWeight="700" fill={contrastText(variationColor(data.find(r=>r.uf===shape.uf)?.value??null),'#1f2a44')}>{shape.uf}</text>)}
    {shapes.length>4&&data.map((r,i)=>{const dir=direction(r.value),x=left+(i%3)*105,y=548+Math.floor(i/3)*22;return <g key={`list-${r.uf}`}><text x={x} y={y} fontSize="14" fontWeight="700" fill="#1f2a44">{r.uf} {signedPercent(r.value)}</text>{dir==='up'&&<polygon points={`${x+80},${y-11} ${x+86},${y-1} ${x+74},${y-1}`} fill="#00a651"/>}{dir==='down'&&<polygon points={`${x+74},${y-11} ${x+86},${y-11} ${x+80},${y-1}`} fill="#c00000"/>}</g>;})}
    {shapes.length<=4&&shapes.map(shape=>{const value=data.find(r=>r.uf===shape.uf)?.value??null,dir=direction(value),fill=variationColor(value),x=left+shape.centroid[0]*scale,y=285+shape.centroid[1]*scale,ink=contrastText(fill,'#1f2a44');
     return <g key={shape.uf}><text x={x} y={y-4} textAnchor="middle" fontSize="11" fill={ink}>{shape.uf}</text><text x={x-(dir==='up'||dir==='down'?6:0)} y={y+12} textAnchor="middle" fontSize="13" fontWeight="700" fill={ink}>{signedPercent(value)}</text>
      {dir==='up'&&<polygon points={`${x+26},${y+1} ${x+32},${y+11} ${x+20},${y+11}`} fill="#00a651"/>}{dir==='down'&&<polygon points={`${x+20},${y+1} ${x+32},${y+1} ${x+26},${y+11}`} fill="#c00000"/>}</g>;})}
   </g>;
  })}
  <g><text x="40" y="488" fontSize="15" fontWeight="700" fill="#262626">Variação</text><line x1="38" x2="186" y1="470" y2="470" stroke="#262626"/><line x1="38" x2="186" y1="495" y2="495" stroke="#262626"/>
   {legend.map((item,i)=><g key={item.label}><text x="40" y={514+i*25} fontSize="14" fill="#262626">{item.label}</text><rect x="156" y={499+i*25} width="30" height="23" fill={item.color}/><line x1="38" x2="186" y1={523+i*25} y2={523+i*25} stroke="#262626" strokeWidth=".8"/></g>)}</g>
 </g>;
}
