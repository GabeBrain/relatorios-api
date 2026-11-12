import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {BrainLoadingState} from '@/components/feedback/BrainLoadingState';

/** Blocking work has one focus scope, Escape/cancel, and the shared Brain progress surface. */
export function WorkbenchLoading({title, description, startedAt, onCancel}: {
    title: string; description: string; startedAt?: number | null; onCancel: () => void;
}) {
    return <Dialog open onOpenChange={open => {if (!open) onCancel();}}>
        <DialogContent className="border-0 p-0 [&>button:last-child]:hidden" style={{left:0,top:0,transform:'none',maxWidth:'none',width:'100vw',height:'100dvh'}}>
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <DialogDescription className="sr-only">{description}. Escape cancela a operação.</DialogDescription>
            <BrainLoadingState variant="overlay" title={title} description={description} startedAt={startedAt}/>
            <div className="fixed right-6 top-6 z-[60]"><Button variant="outline" onClick={onCancel}>Cancelar</Button></div>
        </DialogContent>
    </Dialog>;
}
