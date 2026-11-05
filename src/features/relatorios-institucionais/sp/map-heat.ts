/** Relative VGV density. Coordinates are measured before any visual point separation. */
export function spVgvHeat(points:{left:number;top:number;value:number|null}[],columns=80,rows=48) {
  const valid=points.filter(p=>p.value!==null&&Number.isFinite(p.value)&&p.value>0&&Number.isFinite(p.left)&&Number.isFinite(p.top));
  const maximumWeight=valid.reduce((max,p)=>Math.max(max,p.value!),0);
  const density=new Float64Array(columns*rows),radius=3;
  for(const point of valid){
    const cx=point.left/100*columns,cy=point.top/100*rows,weight=point.value!/maximumWeight;
    for(let y=Math.max(0,Math.floor(cy-radius));y<Math.min(rows,Math.ceil(cy+radius));y++){
      for(let x=Math.max(0,Math.floor(cx-radius));x<Math.min(columns,Math.ceil(cx+radius));x++){
        const distance=(x+.5-cx)**2+(y+.5-cy)**2;
        if(distance<=radius**2)density[y*columns+x]+=weight*Math.exp(-distance/2);
      }
    }
  }
  const maximum=density.reduce((a,b)=>Math.max(a,b),0);
  const color=(ratio:number)=>{
    const start=ratio<.5?[62,163,69]:[255,235,0],end=ratio<.5?[255,235,0]:[235,40,30],t=ratio<.5?ratio*2:(ratio-.5)*2;
    return `rgb(${start.map((v,i)=>Math.round(v+(end[i]-v)*t)).join(',')})`;
  };
  const cells=Array.from(density,(value,index)=>({x:index%columns/columns*100,y:Math.floor(index/columns)/rows*100,ratio:maximum>0?value/maximum:0})).filter(c=>c.ratio>.03).map(cell=>({...cell,color:color(cell.ratio),opacity:.18+.52*Math.sqrt(cell.ratio)}));
  return {cells,columns,rows,maximum,contributors:valid.length};
}
