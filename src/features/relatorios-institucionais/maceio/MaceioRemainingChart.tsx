import type {RemainingSlide} from './remaining-data';
function wrap(text:string,max:number){const words=text.split(/\s+/),lines:string[]=[];for(const word of words){if(!lines.length||lines.at(-1)!.length+word.length+1>max)lines.push(word);else lines[lines.length-1]+=' '+word;}return lines;}
export default function MaceioRemainingChart({model}:{model:RemainingSlide}){
  if(model.kind==='editorial')return null;
  if(model.kind==='stages'){
    const colors=['#5B7537','#7CA83E','#1F5F8A'];
    return <g data-maceio-chart data-maceio-stages>{model.stages.map((panel,p)=><g key={panel.label} transform={`translate(0 ${185+p*245})`}>
      {[...panel.values.keys()].reverse().map((i,r)=><g key={i}>
        <text x={225} y={r*44+22} textAnchor="end" fontSize={16} fill="#777">{model.groups[i].replace('Dormitórios','dorms').replace('Dormitório','dorm')}</text>
        {panel.values[i].map((value,s)=>{const before=panel.values[i].slice(0,s).reduce<number>((a,b)=>a+(b??0),0),width=(value??0)*8;return <g key={s}><rect x={245+before*8} y={r*44} width={width} height={27} fill={colors[s]}/>{width>40&&<text x={245+before*8+width/2} y={r*44+21} textAnchor="middle" fontSize={18} fontWeight={700} fill="white">{value?.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</text>}</g>})}
        {panel.values[i].every(value=>value===null)&&<text x={260} y={r*44+22} fontSize={18}>—</text>}
      </g>)}
      {['Planta','Construção','Pronto'].map((name,s)=><g key={name} transform={`translate(1065 ${55+s*30})`}><rect y={-14} width={12} height={12} fill={colors[s]}/><text x={19} fontSize={16} fill="#777">{name}</text></g>)}
    </g>)}</g>;
  }
  return <g data-maceio-chart data-maceio-table>{model.tables.map((table,t)=>{
    const left=45,top=190+t*210,width=1190,labelWidth=175,cell=(width-labelWidth)/table.columns.length,header=52,height=Math.min(42,390/Math.max(1,table.rows.length)),font=Math.min(19,cell/5.8),percentColumns=table.formats.map((format,i)=>format==='percent'?i:-1).filter(i=>i>=0);
    return <g key={t}><rect x={left} y={top} width={width} height={header} fill="#5B7537"/>
      <text x={left+labelWidth/2} y={top+31} textAnchor="middle" fontSize={17} fontWeight={700} fill="white">Categoria</text>
      {table.columns.map((name,i)=>wrap(name,Math.max(8,Math.floor(cell/8))).map((line,l)=><text key={`${i}/${l}`} x={left+labelWidth+cell*(i+.5)} y={top+21+l*18} textAnchor="middle" fontSize={table.columns.length>=8?13:Math.min(16,cell/5.5)} fontWeight={700} fill="white">{line}</text>))}
      {table.rows.map((row,r)=><g key={row.label}>
        <rect x={left} y={top+header+height*r} width={width} height={height} fill={r===table.rows.length-1?'#5B7537':r%2?'#EDF2E6':'white'} stroke="#D9D9D9" strokeWidth={.5}/>
        {wrap(row.label,22).slice(0,2).map((line,l)=><text key={l} x={left+8} y={top+header+height*r+height*.6+l*14} fontSize={Math.min(17,height*.5)} fill={r===table.rows.length-1?'white':'#262626'} fontWeight={r===table.rows.length-1?700:400}>{line}</text>)}
        {row.values.map((value,c)=>{const format=table.formats[c],text=value===null?'—':typeof value==='string'?value:value.toLocaleString('pt-BR',{maximumFractionDigits:format==='decimal'||format==='percent'?1:0})+(format==='percent'?'%':'');return <g key={c}>
          {r!==table.rows.length-1&&percentColumns.includes(c)&&typeof value==='number'&&value>0&&<rect x={left+labelWidth+cell*c+2} y={top+header+height*r+3} width={Math.min(100,value)/100*(cell-4)} height={height-6} fill="#B9CBA8"/>}
          <text x={left+labelWidth+cell*(c+.5)} y={top+header+height*r+height*.65} textAnchor="middle" fontSize={typeof value==='string'?Math.min(12,cell/Math.max(1,text.length)*1.7):font} fill={r===table.rows.length-1?'white':'#262626'} fontWeight={r===table.rows.length-1?700:400}>{text}</text>
        </g>})}
      </g>)}
    </g>;
  })}</g>;
}
