import { useEffect,useMemo,useState } from 'react';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { spMapPlan,type SpMapMode } from './map-model';
import { spPeriodLabel,type SpPreview } from './model';
const count=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:0});
const compact=(n:number)=>n.toLocaleString('pt-BR',{notation:'compact',maximumFractionDigits:1});
export function SpStockMapSlide({report,slide,token=import.meta.env.VITE_MAPBOX_ACCESS_TOKEN??''}:{report:SpPreview;slide:number;token?:string}){
  const mode:SpMapMode=slide<=68?'stock':slide<=71?'standard':slide<=75?'meter':'vgv',close=[68,71,75,80].includes(slide),market=report.granularDetails?.market;
  const map=useMemo(()=>spMapPlan(market?.projects??[],mode,close,token),[market,mode,close,token]);
  const [failedTiles,setFailedTiles]=useState<Set<string>>(new Set());
  const [finished,setFinished]=useState<Set<string>>(new Set()),[failed,setFailed]=useState(false),[started,setStarted]=useState(Date.now());
  useEffect(()=>{setFinished(new Set());setFailedTiles(new Set());setFailed(false);setStarted(Date.now());},[map.plan]);
  const ready=market?.status==='ready',plan=map.plan,loading=ready&&!!token&&!!plan&&finished.size<plan.tiles.length;
  const done=(key:string,error=false)=>{setFinished(prev=>new Set([...prev,key]));if(error){setFailed(true);setFailedTiles(prev=>new Set([...prev,key]));}};
  const titles={stock:'ESTOQUE',standard:'PADRÃO',meter:'R$/m²',vgv:'VGV DA OFERTA FINAL'};
  const labels=mode==='standard'?map.standards:map.limits.map((limit,i)=>limit===Infinity?i===0?'Sem escala disponível':`Acima de ${compact(map.limits[i-1])}`:i===0?`Até ${compact(limit)}`:`>${compact(map.limits[i-1])} a ${compact(limit)}`);
  return <div className="absolute inset-0" aria-label={`Mapa ${titles[mode]} · ${close?'aproximação':'visão ampla'}`}>
    <svg role="img" aria-label={`Mapa atualizado ${slide}`} viewBox="0 0 1280 720" className="absolute inset-0 h-full w-full">
      <rect width="1280" height="720" fill="#f8f8f8"/><rect x="1069" width="211" height="55" fill="#5b7638"/><text x="1175" y="34" fill="white" textAnchor="middle" fontSize="18" fontWeight="bold">SÃO PAULO</text>
      <text x="40" y="55" fontSize="28" fontWeight="bold">LOCALIZAÇÃO DOS EMPREENDIMENTOS · {titles[mode]}</text><rect x="40" y="77" width="90" height="9" rx="5" fill="#ffcf00"/><text x="40" y="120" fontSize="17">{report.quarter} · {spPeriodLabel(report)} · {close?'Aproximação central':'Visão ampla'}</text>
      <rect x="30" y="155" width="910" height="490" fill="#e8ece8" stroke="#ccc"/>
      {ready&&plan?<svg x="30" y="155" width="910" height="490" viewBox={`0 0 ${plan.columns*256} ${plan.rows*256}`} preserveAspectRatio="xMidYMid meet">
        {!token&&<g stroke="#c4ccc4">{Array.from({length:8},(_,i)=><g key={i}><line x1={i*plan.columns*256/7} x2={i*plan.columns*256/7} y1="0" y2={plan.rows*256}/><line x1="0" x2={plan.columns*256} y1={i*plan.rows*256/7} y2={i*plan.rows*256/7}/></g>)}</g>}
        {!!token&&plan.tiles.map((tile,i)=>{const key=`${tile.x}/${tile.y}`;return <image key={key} href={tile.url} style={{visibility:failedTiles.has(key)?'hidden':undefined}} x={i%plan.columns*256} y={Math.floor(i/plan.columns)*256} width="256" height="256" crossOrigin="anonymous" onLoad={()=>done(key)} onError={()=>done(key,true)}/>;})}
        {map.positioned.map(({point,left,top,coincident})=><circle key={point.id} cx={left/100*plan.columns*256} cy={top/100*plan.rows*256} r={Math.max(5,plan.columns*1.8)} fill={map.palette(point)} stroke="white" strokeWidth="1" opacity=".9"><title>{`${point.name}: ${count(point.stock)} unidades; ${mode==='standard'?point.standard:map.value(point)===null?'valor não informado':count(map.value(point)!)}${coincident>1?`; ${coincident} coordenadas coincidentes, separadas apenas no desenho`:''}`}</title></circle>)}
      </svg>:<text x="485" y="390" textAnchor="middle" fontSize="23">{ready?'Sem coordenadas válidas para o mapa.':'Localizações em conferência.'}</text>}
      <text x="970" y="190" fontSize="21" fontWeight="bold">LEGENDA</text>{labels.map((label,i)=><g key={label}><circle cx="980" cy={225+i*29} r="8" fill={map.colors[i%map.colors.length]}/><text x="1000" y={231+i*29} fontSize="15">{label}</text></g>)}
      {map.missingValues>0&&<><circle cx="980" cy="475" r="8" fill="#727272"/><text x="1000" y="481" fontSize="15">Sem valor: {map.missingValues}</text></>}
      <text x="970" y="525" fontSize="16">Geocodificados: {map.all.length}/{map.total}</text><text x="970" y="551" fontSize="16">Neste recorte: {map.visible}</text><text x="970" y="577" fontSize="15">Unid. geo: {count(map.mappedUnits)}/{count(map.totalUnits)}</text>
      <text x="40" y="675" fontSize="13">{!token?'Sem base cartográfica: coordenadas declaradas na API.':failed?'Base cartográfica parcialmente indisponível.':mode==='vgv'?'VGV nominal calculado por unidade/preço na fotografia; classes calculadas no mês.':'Coordenadas declaradas na API; estoque positivo na fotografia disponível.'}</text>
      <text x="40" y="698" fontSize="12">{token?'© Mapbox · © OpenStreetMap contributors. ':''}Coordenadas ausentes não são inventadas; pontos coincidentes podem ser separados apenas no desenho.</text>
    </svg>
    {loading&&<div className="absolute left-[50px] top-[165px] w-[470px] rounded-md border bg-background p-2 shadow-sm"><BrainLoadingState variant="field" title="Carregando base cartográfica…" startedAt={started}/></div>}
  </div>;
}
