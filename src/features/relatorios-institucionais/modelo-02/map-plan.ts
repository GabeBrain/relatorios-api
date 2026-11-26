import {buildMapTilePlan,type GeographicPoint,type MapTilePlan} from '@/features/panorama-secovi-fiergs/lib/map-tiles';
/** Wide, whole-tile frame keeps preview/export identical without clipping tile images. */
export function capitalMapPlan(points:GeographicPoint[],token:string):MapTilePlan|null{
 const base=buildMapTilePlan(points,token);if(!base)return null;
 for(let zoom=16;zoom>=4;zoom--){
  const n=2**zoom,tx=(longitude:number)=>(longitude+180)/360*n,ty=(latitude:number)=>(1-Math.asinh(Math.tan(latitude*Math.PI/180))/Math.PI)/2*n;
  const xs=points.map(p=>tx(p.longitude)),ys=points.map(p=>ty(p.latitude)),minX=Math.floor((Math.min(...xs)+Math.max(...xs))/2-1.5),minY=Math.floor((Math.min(...ys)+Math.max(...ys))/2-.5);
  if(xs.some(x=>x<minX+.08||x>minX+3.92)||ys.some(y=>y<minY+.08||y>minY+1.92))continue;
  const template=new URL(base.tiles[0].url);
  return {...base,zoom,columns:4,rows:2,tiles:Array.from({length:8},(_,i)=>{const x=minX+i%4,y=minY+Math.floor(i/4),url=new URL(template);url.pathname=url.pathname.replace(/\/\d+\/\d+\/\d+$/,`/${zoom}/${x}/${y}`);return {x,y,url:url.toString()};}),positionOf:point=>({left:(tx(point.longitude)-minX)/4*100,top:(ty(point.latitude)-minY)/2*100})};
 }
 return base;
}
