import { useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useGeobrainAccess } from '../lib/geobrain-access-context';
import { deleteStudy } from '../lib/v3/db';
import { clearPreparationForDocument } from '../lib/v3/local-materials';
import { hasActiveExecution } from '../lib/v3/execution';

export default function DeleteStudyButton({id,name,sha1,disabled,onDeleted}: {
  id:string; name:string; sha1?:string|null; disabled?:boolean; onDeleted:()=>void|Promise<void>;
}) {
  const access=useGeobrainAccess(),lock=useRef(false),[busy,setBusy]=useState(false);
  async function remove() {
    if(lock.current || disabled || hasActiveExecution()) return;
    lock.current=true;setBusy(true);
    try {
      if(!await access('excluir este estudo'))return;
      if(!window.confirm(`Excluir “${name}” da carteira? Ele deixará de aparecer para a equipe. Os materiais, decisões e registros técnicos serão preservados. A recuperação depende da equipe de suporte.`))return;
      await deleteStudy(id);
      try { await clearPreparationForDocument(sha1); } catch { toast.warning('Estudo removido. Não foi possível limpar a preparação deste navegador.'); }
      toast.success('Estudo removido da carteira.');
      try { await onDeleted(); window.dispatchEvent(new Event('corretor-library-refresh')); }
      catch { toast.warning('Estudo removido. Atualize a página para conferir a carteira.'); }
    } catch(e) {toast.error(e instanceof Error?e.message:'Não foi possível excluir. Atualize a carteira e confira o estado.');}
    finally {lock.current=false;setBusy(false);}
  }
  return <Button className="cp-delete-study" variant="ghost" size="icon" title="Excluir estudo" aria-label={`Excluir estudo ${name}`} disabled={disabled||busy||hasActiveExecution()} onClick={()=>void remove()}>{busy?<Loader2 size={17} className="animate-spin" aria-hidden="true"/>:<Trash2 size={17} aria-hidden="true"/>}</Button>;
}
