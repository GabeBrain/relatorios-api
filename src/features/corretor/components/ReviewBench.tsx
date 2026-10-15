import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { listMaterials, previewUrl, type MaterialAsset } from '../lib/materials';
import { loadVersions } from '../lib/projects';
import type { StudyV3, FindingV3 } from '../lib/v3/db';
const PdfSlide=lazy(()=>import('./PdfSlide'));
export default function ReviewBench({study,items,renderFinding}:{study:StudyV3;items:FindingV3[];renderFinding:(item:FindingV3)=>ReactNode}){
 const [params,setParams]=useSearchParams(),input=useRef<HTMLInputElement>(null);
 const slide=Math.min(Math.max(1,Number.parseInt(params.get('slide')??'1',10)||1),Math.max(1,study.nSlides));
 const [assets,setAssets]=useState<MaterialAsset[]>([]),[versionId,setVersionId]=useState(''),[url,setUrl]=useState(''),[error,setError]=useState(''),[local,setLocal]=useState(''),[zoom,setZoom]=useState(1);
 useEffect(()=>{let active=true;Promise.all([listMaterials(study.id),loadVersions(study.id)]).then(([a,v])=>{if(active){setAssets(a);setVersionId(v.find(x=>x.sha1===study.lastSha1)?.id??v[0]?.id??'');}}).catch(()=>{});return()=>{active=false;};},[study.id,study.lastSha1]);
 useEffect(()=>()=>{if(local)URL.revokeObjectURL(local);},[local]);
 const currentAssets=assets.filter(a=>a.version_id===versionId);
 const preview=currentAssets.find(a=>a.kind==='preview_slide'&&a.slide_n===slide)??currentAssets.find(a=>a.kind==='preview_pdf');
 useEffect(()=>{let active=true;setUrl('');setError('');if(!preview)return;previewUrl(preview).then(u=>{if(active)setUrl(u);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[preview]);
 const related=items.filter(i=>[...i.finding.slideRef.matchAll(/s(\d+)/g)].some(m=>Number(m[1])===slide));
 const unlocated=items.filter(i=>! /s\d+/.test(i.finding.slideRef));
 const evidence=related.find(i=>i.finding.evidenceImage)?.finding.evidenceImage;
 function go(n:number){setParams(p=>{p.set('slide',String(Math.max(1,Math.min(study.nSlides,n))));return p;});}
 return <section className="cb" aria-label="Bancada de revisão"><div className="cb-toolbar"><div><strong>Slide {slide}</strong> <span className="cp-muted">de {study.nSlides} · {related.length} apontamentos</span></div><div className="cp-actions"><Button variant="outline" disabled={slide<=1} onClick={()=>go(slide-1)}>Anterior</Button><Button variant="outline" disabled={slide>=study.nSlides} onClick={()=>go(slide+1)}>Próximo</Button><Button variant="outline" onClick={()=>setZoom(z=>z===1?1.4:1)}>Zoom {Math.round(zoom*100)}%</Button></div></div>
 <div className="cb-layout"><div className="cb-document">
  {local||url?(preview?.kind==='preview_slide'&&!local?<img src={url} alt={`Prévia do slide ${slide}`}/>:<Suspense fallback={<p role="status">Preparando visualização…</p>}><PdfSlide url={local||url} slide={slide} zoom={zoom} expectedPages={study.nSlides}/></Suspense>):evidence?<><img src={evidence} alt={`Evidência parcial do slide ${slide}`}/><p className="cp-muted">Recorte de evidência persistido. Não representa o slide inteiro.</p></>:<p>Prévia completa ainda não disponível para este slide.</p>}
  {error&&<p role="status">{error}</p>}<input ref={input} type="file" accept=".pdf" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file&&file.size<=512*1024*1024)setLocal(URL.createObjectURL(file));}}/>
  <Button variant="outline" onClick={()=>input.current?.click()}>Abrir PDF deste estudo</Button><p className="cp-muted">{local?'Prévia aberta apenas neste navegador. Guarde em Materiais para recuperá-la depois.':'Use um PDF exportado da mesma versão do PowerPoint para visualizar o slide completo.'}</p>
 </div><aside className="cb-findings" aria-label={`Apontamentos do slide ${slide}`}>
  {related.length?related.map(item=><div key={item.ruleId}>{renderFinding(item)}</div>):<p>Nenhum apontamento com referência a este slide nos registros disponíveis.</p>}
 </aside></div>
 <details className="cb-map"><summary>Mapa de slides · localizar apontamentos</summary><div>{Array.from({length:study.nSlides},(_,i)=>i+1).map(n=>{const count=items.filter(i=>i.status==='pendente'&&[...i.finding.slideRef.matchAll(/s(\d+)/g)].some(m=>Number(m[1])===n)).length;return <button key={n} aria-label={`Slide ${n}${count?`, ${count} pendências`:''}`} aria-current={n===slide?'page':undefined} data-pending={count>0} onClick={()=>go(n)}>{n}{count>0&&<span aria-hidden="true"> ·</span>}</button>;})}</div></details>
 {unlocated.length>0&&<details><summary>Apontamentos gerais do estudo · {unlocated.length}</summary>{unlocated.map(item=><div key={item.ruleId}>{renderFinding(item)}</div>)}</details>}
 </section>;
}
