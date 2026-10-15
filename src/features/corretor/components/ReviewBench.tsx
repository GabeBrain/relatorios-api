import { useEffect, useState, type ReactNode } from 'react';
import StudySlideViewer from './StudySlideViewer';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { confidenceOf } from '../lib/v3/confidence';
import type { StudyV3, FindingV3 } from '../lib/v3/db';
export default function ReviewBench({study,items,renderFinding}:{study:StudyV3;items:FindingV3[];renderFinding:(item:FindingV3)=>ReactNode}){
 const [params,setParams]=useSearchParams();
 const firstSlide=items.filter(i=>i.status==='pendente').flatMap(i=>[...i.finding.slideRef.matchAll(/s(\d+)/g)].map(m=>Number(m[1]))).sort((a,b)=>a-b)[0]??1;
 const slide=Math.min(Math.max(1,Number.parseInt(params.get('slide')??String(firstSlide),10)||1),Math.max(1,study.nSlides));
 useEffect(()=>{if(items.length&&!params.has('slide'))setParams(p=>{if(!p.has('slide'))p.set('slide',String(firstSlide));return p;},{replace:true});},[items.length,firstSlide,params,setParams]);
 const related=items.filter(i=>[...i.finding.slideRef.matchAll(/s(\d+)/g)].some(m=>Number(m[1])===slide));
 const unlocated=items.filter(i=>! /s\d+/.test(i.finding.slideRef));
 const [evidenceId,setEvidenceId]=useState('');
 const evidenceItems=related.filter(i=>i.finding.evidenceImage);
 const evidence=(evidenceItems.find(i=>i.ruleId===evidenceId)??evidenceItems[0])?.finding.evidenceImage;
 function go(n:number){setParams(p=>{p.set('slide',String(Math.max(1,Math.min(study.nSlides,n))));return p;});}
 return <section className="cb" aria-label="Bancada de revisão">
 <section className="cb-map" aria-label="Mapa de slides"><h2>Mapa de slides</h2>
 <p className="cb-legend"><span data-tone="error">Erro</span><span data-tone="probable">Provável</span><span data-tone="verify">Verificar</span><span data-tone="decided">Encerrado</span><span>Sem apontamento registrado</span></p>
 <div>{Array.from({length:study.nSlides},(_,i)=>i+1).map(n=>{
 const all=items.filter(i=>[...i.finding.slideRef.matchAll(/s(\d+)/g)].some(m=>Number(m[1])===n));
 const pending=all.filter(i=>i.status==='pendente');
 const level=pending.length?Math.min(...pending.map(i=>confidenceOf(i.finding,i.origem))):0;
 const tone=level===1?'error':level===2?'probable':level===3?'verify':all.length?'decided':'none';
 return <button key={n} aria-label={`Slide ${n}${pending.length?`, ${pending.length} pendências`:all.length?', registro encerrado':', sem apontamento registrado'}`} aria-current={n===slide?'page':undefined} data-tone={tone} onClick={()=>go(n)}>{n}</button>;
 })}</div></section>
 <div className="cb-toolbar"><div><strong>Slide {slide}</strong> <span className="cp-muted">de {study.nSlides} · {related.length} apontamentos</span></div><div className="cp-actions"><Button variant="outline" disabled={slide<=1} onClick={()=>go(slide-1)}>Anterior</Button><Button variant="outline" disabled={slide>=study.nSlides} onClick={()=>go(slide+1)}>Próximo</Button></div></div>
 {evidenceItems.length>1&&<div className="cp-actions" aria-label="Recorte em destaque">{evidenceItems.map((item,index)=><Button key={item.ruleId} variant={item.ruleId===(evidenceId||evidenceItems[0].ruleId)?'default':'outline'} onClick={()=>setEvidenceId(item.ruleId)}>Evidência {index+1}</Button>)}</div>}
 <StudySlideViewer study={study} slide={slide} evidence={evidence}/>
 <div className="cb-layout cb-layout-text">
 {related.length>0&&<aside className="cb-findings" aria-label={`Apontamentos do slide ${slide}`}>{related.map(item=><div key={item.ruleId}>{renderFinding(item)}</div>)}</aside>}
 </div>
 {unlocated.length>0&&<section className="cb-general"><h2>Apontamentos gerais do estudo · {unlocated.length}</h2>{unlocated.map(item=><div key={item.ruleId}>{renderFinding(item)}</div>)}</section>}
 </section>;
}
