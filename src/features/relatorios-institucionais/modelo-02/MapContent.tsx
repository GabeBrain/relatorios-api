import {useEffect,useMemo,useRef,useState} from 'react';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';
import {capitalMapPlan} from './map-plan';
import type {MapData} from './types';
const mapColors:Record<string,string>={Compactos:'#1b587a',MCMV:'#f0c500','Médio Padrão':'#6f8c43',Luxo:'#476039','Múltiplos padrões':'#845a91'};
export function MapContent({data}:{data:MapData}){
 const token=import.meta.env.VITE_MAPBOX_ACCESS_TOKEN??'',plan=useMemo(()=>capitalMapPlan(data.points,token||'geometry-only'),[data,token]);
 const [settled,setSettled]=useState<Set<string>>(new Set()),[failed,setFailed]=useState<Set<string>>(new Set());
 const loaded=useRef(new Set<string>()),[startedAt]=useState(Date.now());useEffect(()=>{if(!token||!plan)return;const timer=setTimeout(()=>{const missing=plan.tiles.filter(tile=>!loaded.current.has(tile.url)).map(tile=>tile.url);setFailed(old=>new Set([...old,...missing]));setSettled(new Set(plan.tiles.map(tile=>tile.url)));},20000);return()=>clearTimeout(timer);},[plan,token]);
 const done=(url:string,error=false)=>{loaded.current.add(url);setSettled(old=>new Set([...old,url]));if(error)setFailed(old=>new Set([...old,url]));};
 const loading=!!token&&!!plan&&settled.size<plan.tiles.length;
 const pointAt=(latitude:number,longitude:number)=>{
  if(!plan)return {x:0,y:0};const n=2**plan.zoom;
  return {x:((longitude+180)/360*n-plan.tiles[0].x)*256,y:((1-Math.asinh(Math.tan(latitude*Math.PI/180))/Math.PI)/2*n-plan.tiles[0].y)*256};
 };
 const labels=[...new Set(data.points.map(p=>p.family))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 return <g data-map-loading={loading?'true':'false'}>
  <rect x="60" y="210" width="880" height="400" fill="#e9ede7" stroke="#b8c2b4"/>
  {plan?<svg x="60" y="210" width="880" height="400" viewBox={`-16 -16 ${plan.columns*256+32} ${plan.rows*256+32}`} preserveAspectRatio="xMidYMid meet">
   {token&&plan.tiles.map((tile,i)=>!failed.has(tile.url)&&<image key={tile.url} href={tile.url} x={i%plan.columns*256} y={Math.floor(i/plan.columns)*256} width="256" height="256" crossOrigin="anonymous" onLoad={()=>done(tile.url)} onError={()=>done(tile.url,true)}/>)}
   {!token&&Array.from({length:6},(_,i)=><g key={i} stroke="#b7c1b1" strokeWidth="1"><line x1={i*plan.columns*256/5} x2={i*plan.columns*256/5} y1="0" y2={plan.rows*256}/><line x1="0" x2={plan.columns*256} y1={i*plan.rows*256/5} y2={i*plan.rows*256/5}/></g>)}
   {data.points.map(p=>{const {x,y}=pointAt(p.latitude,p.longitude);return <circle key={p.id} cx={x} cy={y} r={Math.max(4,plan.columns*2)} fill={mapColors[p.family]??'#737373'} stroke="white" strokeWidth="1.5"><title>{p.name} · {p.stock} unidades · {p.family}</title></circle>;})}
  </svg>:<text x="500" y="415" textAnchor="middle" fontSize="24" fill="#476039">Sem empreendimentos geocodificados nesta fotografia.</text>}
  <text x="970" y="235" fontSize="20" fontWeight="700" fill="#3b512b">Padrões</text>
  {labels.map((label,i)=><g key={label}><circle cx="981" cy={267+i*32} r="7" fill={mapColors[label]??'#737373'}/><text x="999" y={273+i*32} fontSize="14" fill="#333">{label.length>25?label.slice(0,23)+'…':label}</text></g>)}
  <text x="970" y="475" fontSize="15" fill="#333">Neste slide: {data.points.length}</text>
  <text x="970" y="503" fontSize="15" fill="#333">Localizados: {data.locatedProjects}/{data.totalProjects}</text>
  <text x="970" y="531" fontSize="15" fill="#333">Sem coordenadas: {data.missingCoordinates}</text>
  <text x="970" y="559" fontSize="14" fill="#333">Excluídos do histórico: {data.excludedProjects}</text>
  <text x="970" y="587" fontSize="15" fill="#333">Continuação {data.part}/{data.parts}</text>
  <text x="60" y="634" fontSize="12" fill="#555">{!token?'Base cartográfica indisponível; posições preservadas na grade geográfica.':failed.size?'Base cartográfica parcialmente indisponível. © Mapbox · © OpenStreetMap contributors.':'© Mapbox · © OpenStreetMap contributors.'}</text>
  {loading&&<foreignObject x="80" y="223" width="450" height="70"><div className="rounded-md border bg-background p-2"><BrainLoadingState variant="field" title="Carregando base cartográfica" startedAt={startedAt}/></div></foreignObject>}
 </g>;
}
