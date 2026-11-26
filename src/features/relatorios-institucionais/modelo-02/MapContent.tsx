import {useEffect,useMemo,useRef,useState} from 'react';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';
import {MAP_PRICE_BANDS,UNKNOWN_MAP_PRICE,mapPriceBand} from './map-price-bands';
import {capitalMapPlan} from './map-plan';
import type {MapData} from './types';
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
 const bands=[...MAP_PRICE_BANDS,...data.points.some(p=>!p.meter)?[UNKNOWN_MAP_PRICE]:[]];
 return <g data-map-loading={loading?'true':'false'}>
  <rect x="0" y="0" width="1280" height="720" fill="#e9ede7" stroke="#b8c2b4"/>
  {plan?<svg x="0" y="0" width="1280" height="720" viewBox={`-16 -16 ${plan.columns*256+32} ${plan.rows*256+32}`} preserveAspectRatio="xMidYMid meet">
   {token&&plan.tiles.map((tile,i)=>!failed.has(tile.url)&&<image key={tile.url} href={tile.url} x={i%plan.columns*256} y={Math.floor(i/plan.columns)*256} width="256" height="256" crossOrigin="anonymous" onLoad={()=>done(tile.url)} onError={()=>done(tile.url,true)}/>)}
   {!token&&Array.from({length:6},(_,i)=><g key={i} stroke="#b7c1b1" strokeWidth="1"><line x1={i*plan.columns*256/5} x2={i*plan.columns*256/5} y1="0" y2={plan.rows*256}/><line x1="0" x2={plan.columns*256} y1={i*plan.rows*256/5} y2={i*plan.rows*256/5}/></g>)}
   {data.points.map(p=>{const {x,y}=pointAt(p.latitude,p.longitude);return <g key={p.id}><path d={`M${x} ${y} C${x-12} ${y-16} ${x-12} ${y-27} ${x} ${y-27} C${x+12} ${y-27} ${x+12} ${y-16} ${x} ${y}Z`} fill={mapPriceBand(p.meter).color} stroke="white" strokeWidth="1"><title>{p.name} · {p.stock} unidades · {p.family} · {mapPriceBand(p.meter).label}</title></path><circle cx={x} cy={y-18} r="3" fill="#333"/></g>;})}
  </svg>:<text x="500" y="415" textAnchor="middle" fontSize="24" fill="#476039">Sem empreendimentos geocodificados nesta fotografia.</text>}
  {/* Original composition: mustard title badge top-left, "RANGE POR R$/M²" legend bottom-right. */}
  <rect x="0" y="14" width="312" height="102" rx="22" fill="#b8930c"/>
  {['LOCALIZAÇÃO DOS','EMPREENDIMENTOS',`${data.city.city.toLocaleUpperCase('pt-BR')}${data.parts>1?` (${data.part}/${data.parts})`:''}`].map((line,i)=><text key={i} x="160" y={46+i*30} textAnchor="middle" fontSize={line.length>18?19:23} fontWeight="700" fill="#ffffff">{line}</text>)}
  <rect x="1022" y={490-(bands.length-5)*32} width="228" height={46+bands.length*32} fill="#ffffff" opacity=".96" stroke="#d9d9d9"/>
  <rect x="1022" y={490-(bands.length-5)*32} width="228" height="34" fill="#d9d9d9"/>
  <text x="1136" y={513-(bands.length-5)*32} textAnchor="middle" fontSize="15" fontWeight="700" fill="#262626">RANGE POR R$/M²</text>
  {bands.map((band,i)=>{const y=544-(bands.length-5)*32+i*32;return <g key={band.label}><path d={`M1046 ${y+8} C1040 ${y} 1040 ${y-8} 1046 ${y-8} C1052 ${y-8} 1052 ${y} 1046 ${y+8}Z`} fill={band.color}/><text x="1064" y={y+4} fontSize="15" fill="#262626">{band.label}</text></g>;})}
  <text x="1250" y="706" textAnchor="end" fontSize="11" fill="#555">{data.points.length} neste slide · localizados {data.locatedProjects}/{data.totalProjects} · sem coordenadas {data.missingCoordinates} · excluídos {data.excludedProjects}</text>
  <text x="30" y="706" fontSize="12" fill="#555">{!token?'Base cartográfica indisponível; posições preservadas na grade geográfica.':failed.size?'Base cartográfica parcialmente indisponível. © Mapbox · © OpenStreetMap contributors.':'© Mapbox · © OpenStreetMap contributors.'}</text>
  {loading&&<foreignObject x="50" y="103" width="450" height="70"><div className="rounded-md border bg-background p-2"><BrainLoadingState variant="field" title="Carregando base cartográfica" startedAt={startedAt}/></div></foreignObject>}
 </g>;
}
