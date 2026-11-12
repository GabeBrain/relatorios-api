import LoadingSurface from './LoadingSurface';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import CorretorLoadingState from './CorretorLoadingState';
import { useGeobrainAccess } from '../lib/geobrain-access-context';
import { activateSources, listMaterials, listSourceSets, recordReviewSnapshot, recoverMaterial, uploadMaterial, type MaterialAsset, type MaterialKind, type SourceSet } from '../lib/materials';
import type { VersionRecord } from '../lib/projects';
import type { StudyV3 } from '../lib/v3/db';
import { savePptx } from '../lib/v3/pptx-store';
import { loadLocalStudySheets } from '../lib/v3/local-materials';
import { Download, FileSpreadsheet, FileText, Presentation } from 'lucide-react';

export default function StudyMaterials({study,version,onSourcesChanged}:{study:StudyV3;version?:VersionRecord;onSourcesChanged:()=>void}){
 const access=useGeobrainAccess(), input=useRef<HTMLInputElement>(null),kind=useRef<MaterialKind>('pptx');
 const [assets,setAssets]=useState<MaterialAsset[]>([]),[sets,setSets]=useState<SourceSet[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[revision,setRevision]=useState(0);
 const [loading,setLoading]=useState(true),[loaded,setLoaded]=useState(false);
 const [localSheets,setLocalSheets]=useState<Awaited<ReturnType<typeof loadLocalStudySheets>>>([]);
 useEffect(()=>{let active=true;setLocalSheets([]);if(study.lastSha1)loadLocalStudySheets(study.lastSha1).then(files=>{if(active)setLocalSheets(files);}).catch(()=>{});return()=>{active=false;};},[study.lastSha1]);
 function downloadLocal(bytes:Uint8Array,name:string){const url=URL.createObjectURL(new Blob([bytes.slice().buffer]));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 useEffect(()=>{let active=true;setError('');setLoading(true);Promise.all([listMaterials(study.id),listSourceSets(study.id)]).then(([a,s])=>{if(active){setAssets(a);setSets(s);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active){setLoaded(true);setLoading(false);}});return()=>{active=false;};},[study.id,revision]);
 async function pick(value:MaterialKind){if(!version||!await access('guardar os materiais deste estudo'))return;kind.current=value;if(input.current){input.current.accept=value==='pptx'?'.pptx':value==='sheet'?'.xlsx,.xlsm':'.pdf';input.current.multiple=value==='sheet';input.current.click();}}
 async function send(files:File[]){if(!version||!files.length||busy)return;setBusy(true);setError('');setProgress(0);
  try{
   const saved:MaterialAsset[]=[];
   for(let i=0;i<files.length;i++)saved.push(await uploadMaterial(study.id,version,files[i],kind.current,p=>setProgress(Math.round((i+p/100)/files.length*100))));
   if(kind.current==='sheet'){
    const {extractFonteFromExcel}=await import('../lib/v3/fonte-extractor-browser');
    const payload=await extractFonteFromExcel(files,study.id);
    await activateSources(study.id,version.id,saved,payload);onSourcesChanged();
    toast.success('Planilhas originais e fonte guardadas. A revisão pode ser reconferida com esses cálculos.');
   }else toast.success(kind.current==='preview_pdf'?'Prévia PDF vinculada à versão.':'Original guardado sem exigir cadastro complementar.');
   setRevision(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível guardar os materiais.');}
  finally{setBusy(false);}
 }
 async function recover(asset:MaterialAsset){if(busy||!await access('recuperar os arquivos originais'))return;setBusy(true);try{const bytes=await recoverMaterial(asset);if(asset.kind==='pptx'){
   if(!asset.sha1||!await savePptx(asset.sha1,asset.original_name,bytes))throw new Error('O navegador não conseguiu guardar o original recuperado.');toast.success('Apresentação recuperada e integridade conferida.');
  }else{const url=URL.createObjectURL(new Blob([bytes.slice().buffer]));const link=document.createElement('a');link.href=url;link.download=asset.original_name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 }catch(e){setError(e instanceof Error?e.message:'Falha na recuperação.');}finally{setBusy(false);}}
 async function reuse(set:SourceSet){if(!version||busy||!await access('reaproveitar as planilhas anteriores'))return;setBusy(true);try{const files=set.file_ids.map(id=>assets.find(a=>a.id===id)).filter((a):a is MaterialAsset=>Boolean(a));if(files.length!==set.file_ids.length)throw new Error('Os originais do conjunto anterior não estão todos disponíveis.');await activateSources(study.id,version.id,files,set.payload);onSourcesChanged();setRevision(n=>n+1);toast.success('Planilhas anteriores reaproveitadas nesta versão.');}catch(e){setError(e instanceof Error?e.message:'Falha ao reaproveitar.');}finally{setBusy(false);}}
 async function snapshot(){if(!version||busy||!await access('guardar o estado desta revisão'))return;setBusy(true);try{await recordReviewSnapshot(study.id,version.id);toast.success('Estado atual registrado com fontes e decisões disponíveis.');}catch(e){setError(e instanceof Error?e.message:'Falha ao registrar.');}finally{setBusy(false);}}
 const current=assets.filter(a=>a.version_id===version?.id);
 return <section className="cp-panel" aria-label="Materiais persistidos"><h2>Materiais do estudo</h2><p>Guarde a apresentação e as planilhas utilizadas nesta versão. Informações de cadastro são opcionais.</p>
  <LoadingSurface busy={loading} initial={!loaded} label="Atualizando materiais…">
  {error&&<p role="status" className="cp-notice">{error}</p>}
  <input ref={input} type="file" hidden onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';void send(files);}}/>
  <div className="cp-actions"><Button disabled={!version||busy} onClick={()=>void pick('pptx')}><Presentation size={18} aria-hidden="true"/>Guardar apresentação</Button><Button variant="outline" disabled={!version||busy} onClick={()=>void pick('sheet')}><FileSpreadsheet size={18} aria-hidden="true"/>Adicionar planilhas</Button><Button variant="outline" disabled={!version||busy} onClick={()=>void pick('preview_pdf')}><FileText size={18} aria-hidden="true"/>Adicionar prévia PDF</Button></div>
  <p className="cp-muted">Inclua as planilhas para conferir os números contra os cálculos de origem. O PDF é uma prévia complementar exportada do mesmo PPTX, não um novo estudo.</p>
  {busy&&<CorretorLoadingState title="Guardando e conferindo materiais…" description={`${progress}% do envio confirmado`} />}
  {localSheets.length>0&&<section className="cp-local-materials" aria-label="Planilhas neste navegador"><h3>Planilhas desta análise</h3><p className="cp-muted">Disponíveis neste navegador. Para acesso em outro computador, guarde-as em Adicionar planilhas.</p><ul className="cs-files">{localSheets.map(f=><li key={f.key}><FileSpreadsheet size={18} aria-hidden="true"/><span>{f.name}</span><Button variant="ghost" onClick={()=>downloadLocal(f.bytes,f.name)} aria-label={`Baixar ${f.name}`}><Download size={18} aria-hidden="true"/></Button></li>)}</ul></section>}
  {current.map(a=><div className="cp-version" key={a.id}><strong>{a.original_name}</strong><p className="cp-muted">{a.kind==='sheet'?'Planilha':a.kind==='pptx'?'Apresentação':'Prévia'} · {(a.bytes/1024/1024).toFixed(1)} MB</p><Button variant="outline" disabled={busy} onClick={()=>void recover(a)}>{a.kind==='pptx'?'Recuperar apresentação':'Baixar arquivo'}</Button></div>)}
  {sets.filter(s=>s.version_id!==version?.id).slice(0,1).map(s=><div key={s.id} className="cp-notice"><p>As planilhas mudaram nesta versão?</p><Button variant="outline" disabled={busy} onClick={()=>void reuse(s)}>Usar planilhas anteriores</Button><Button variant="outline" disabled={busy} onClick={()=>void pick('sheet')}>Atualizar planilhas</Button></div>)}
  <Button variant="outline" disabled={!version||busy} onClick={()=>void snapshot()}>Guardar estado atual da revisão</Button>
 </LoadingSurface></section>;
}
