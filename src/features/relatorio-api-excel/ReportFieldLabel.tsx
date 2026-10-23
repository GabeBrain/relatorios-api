import { Info } from 'lucide-react';
import { Portal as TooltipPortal } from '@radix-ui/react-tooltip';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ReportFieldLabel({ htmlFor, children, help }: { htmlFor: string; children: string; help?: string }) {
  return <div className="flex items-center gap-1.5">
    <Label htmlFor={htmlFor}>{children}</Label>
    {help && <TooltipProvider delayDuration={150}><Tooltip>
      <TooltipTrigger asChild><button type="button" aria-label={`Informações sobre ${children}`} className="inline-flex shrink-0 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Info aria-hidden="true" className="h-4 w-4" /></button></TooltipTrigger>
      <TooltipPortal><TooltipContent className="max-w-[min(340px,calc(100vw-32px))] text-xs leading-relaxed">{help}</TooltipContent></TooltipPortal>
    </Tooltip></TooltipProvider>}
  </div>;
}
