import { buildMapTilePlan, positionMapPoints, type MapTilePlan } from '@/features/panorama-secovi-fiergs/lib/map-tiles';
import type { SpMapProject } from './market-details';
import { SP_SEGMENT_RULE } from './segments';
export type SpMapMode='stock'|'standard'|'meter'|'vgv';
const stockColors=['#1254d4','#478cc6','#74a82c','#edc500','#ed4e31','#ac1d5d','#284e72','#727272'];
export function spMapPlan(projects:SpMapProject[],mode:SpMapMode,close:boolean,token:string){
  const colors=mode==='meter'?['#f01923','#f97479','#ff9833','#f2cb00','#69a821','#285f18']:mode==='vgv'?['#194e71','#3b8cc4','#b5d775','#76a54a','#506b20','#efaa00','#f04759','#b71854']:stockColors;
  const all=projects.filter((p):p is SpMapProject&{latitude:number;longitude:number}=>p.latitude!==null&&p.longitude!==null);
  const core=close?{points:all,excluded:0}:spMapCore(all);
  const base=buildMapTilePlan(core.points,token||'geometry-only');let plan=base;
  if(base&&close){const median=(values:number[])=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)],zoom=Math.min(17,base.zoom+2),world=2**zoom;
    const tx=(lon:number)=>(lon+180)/360*world,ty=(lat:number)=>(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*world;
    const minX=Math.floor(tx(median(all.map(p=>p.longitude))))-2,minY=Math.floor(ty(median(all.map(p=>p.latitude))))-1;
    plan={...base,zoom,columns:5,rows:3,tiles:Array.from({length:15},(_,i)=>{const x=minX+i%5,y=minY+Math.floor(i/5);return {x,y,url:`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/${zoom}/${x}/${y}?access_token=${encodeURIComponent(token)}`};}),positionOf:p=>({left:(tx(p.longitude)-minX)/5*100,top:(ty(p.latitude)-minY)/3*100})};
  }
  const value=(p:SpMapProject)=>mode==='stock'?p.stock:mode==='meter'?p.meter:mode==='vgv'?p.vgv:null;
  const values=all.flatMap(p=>value(p)===null?[]:[value(p)!]).sort((a,b)=>a-b);
  const limits=mode==='stock'?[20,50,100,200,2000,Infinity]:mode==='meter'?[8000,10000,15000,25000,100000,Infinity]:[...new Set(Array.from({length:7},(_,i)=>values[Math.floor((i+1)*values.length/8)]).filter((v):v is number=>v!==undefined)),Infinity];
  const standards=Object.keys(SP_SEGMENT_RULE.groups);
  const segment=(p:SpMapProject)=>Object.entries(SP_SEGMENT_RULE.groups).find(([,patterns])=>(patterns as readonly string[]).includes(p.standard))?.[0];
  const palette=(p:SpMapProject)=>mode==='standard'?colors[standards.indexOf(segment(p)??'')%colors.length]??'#727272':value(p)===null?'#727272':colors[limits.findIndex(limit=>value(p)!<=limit)%colors.length];
  const within=plan?(close?all.filter(p=>{const pos=plan!.positionOf(p);return pos.left>=0&&pos.left<=100&&pos.top>=0&&pos.top<=100;}):core.points):[];
  const positioned=plan?positionMapPoints(within,plan as MapTilePlan):[];
  return {plan,positioned,palette,value,limits,standards,colors,all,visible:within.length,total:projects.length,mappedUnits:all.reduce((s,p)=>s+p.stock,0),totalUnits:projects.reduce((s,p)=>s+p.stock,0),missingValues:mode==='standard'?0:all.filter(p=>value(p)===null).length};
}

/** Wide view frames the dense urban area: 2nd-98th percentile box plus 15% margin. Points outside are counted, never pinned to the edge. */
export function spMapCore<T extends {latitude:number;longitude:number}>(points:T[]):{points:T[];excluded:number} {
  if(points.length<20)return {points,excluded:0};
  const q=(values:number[],r:number)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.max(0,Math.floor(r*(s.length-1))))];};
  const lat=points.map(p=>p.latitude),lon=points.map(p=>p.longitude);
  const [a,b,c,d]=[q(lat,.02),q(lat,.98),q(lon,.02),q(lon,.98)],mlat=(b-a)*.15,mlon=(d-c)*.15;
  const inside=points.filter(p=>p.latitude>=a-mlat&&p.latitude<=b+mlat&&p.longitude>=c-mlon&&p.longitude<=d+mlon);
  return {points:inside,excluded:points.length-inside.length};
}
