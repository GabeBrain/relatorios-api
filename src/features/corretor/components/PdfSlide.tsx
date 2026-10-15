import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();

export default function PdfSlide({url,slide,zoom=1,expectedPages}:{url:string;slide:number;zoom?:number;expectedPages?:number}){
 const canvas=useRef<HTMLCanvasElement>(null),[doc,setDoc]=useState<PDFDocumentProxy|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 useEffect(()=>{let active=true;setDoc(null);setError('');setBusy(true);const task=pdfjs.getDocument({url});task.promise.then(d=>{if(active)setDoc(d);}).catch(()=>{if(active){setError('Não foi possível abrir a prévia PDF. Tente anexar novamente.');setBusy(false);}});return()=>{active=false;void task.destroy();};},[url]);
 useEffect(()=>{if(!doc)return;let active=true;let render:RenderTask|undefined;setBusy(true);setError('');
  if(expectedPages&&doc.numPages!==expectedPages){setError(`A prévia tem ${doc.numPages} páginas, mas o estudo tem ${expectedPages} slides. Exporte novamente incluindo os slides ocultos para manter as referências corretas.`);setBusy(false);return;}
  if(slide>doc.numPages){setError('Este slide não está disponível na prévia anexada.');setBusy(false);return;}
  doc.getPage(slide).then(page=>{if(!active||!canvas.current)return;const viewport=page.getViewport({scale:1.5*zoom});canvas.current.width=viewport.width;canvas.current.height=viewport.height;render=page.render({canvas:canvas.current,viewport});return render.promise;}).then(()=>{if(active)setBusy(false);}).catch(e=>{if(active&&e?.name!=='RenderingCancelledException'){setError('Não foi possível renderizar este slide.');setBusy(false);}});
  return()=>{active=false;render?.cancel();};
 },[doc,slide,zoom,expectedPages]);
 return <div className="cb-pdf">{busy&&<p role="status">Abrindo slide…</p>}{error&&<p role="alert">{error}</p>}<canvas ref={canvas} style={{width:`${zoom*100}%`}} aria-label={`Prévia PDF do slide ${slide}`} hidden={Boolean(error)}/>{doc&&!error&&!busy&&<p className="cp-muted">Prévia PDF fornecida · página {slide} de {doc.numPages}</p>}</div>;
}
