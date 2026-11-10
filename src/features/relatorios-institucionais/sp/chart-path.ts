/** Smooth curve through every observed point (Catmull-Rom converted to cubic Bézier). */
export function spSmoothPath(points:{x:number;y:number}[]):string {
  if(!points.length)return '';
  if(points.length<3)return `M${points.map(p=>`${p.x},${p.y}`).join(' L')}`;
  let path=`M${points[0].x},${points[0].y}`;
  for(let i=0;i<points.length-1;i++){
    const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
    const minY=Math.min(p1.y,p2.y),maxY=Math.max(p1.y,p2.y),clamp=(v:number)=>Math.min(maxY,Math.max(minY,v));
    path+=` C${p1.x+(p2.x-p0.x)/6},${clamp(p1.y+(p2.y-p0.y)/6)} ${p2.x-(p3.x-p1.x)/6},${clamp(p2.y-(p3.y-p1.y)/6)} ${p2.x},${p2.y}`;
  }
  return path;
}
