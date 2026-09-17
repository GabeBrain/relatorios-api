import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestCompaniesMaterialization, type MaterializeRequestResult } from '../materialize-request-api';
import type { MunicipalityOption } from '../types';

interface Props {
  municipality: MunicipalityOption;
  onSuccess: () => void;
}

const TONE: Record<string, string> = {
  ok: 'text-primary',
  published: 'text-muted-foreground',
  processing: 'text-muted-foreground',
  rate_limited: 'text-amber-600',
  error: 'text-destructive',
};

/** Solicitação pública: chama apenas `empresas-materialize-request`. */
export default function CompaniesMaterializeButton({ municipality, onSuccess }: Props) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<MaterializeRequestResult | null>(null);

  async function handleClick() {
    setPending(true);
    setResult(null);
    const response = await requestCompaniesMaterialization(municipality);
    setResult(response);
    setPending(false);
    if (response.status === 'ok' || response.status === 'published') onSuccess();
  }

  const Icon = pending
    ? Loader2
    : result?.status === 'ok'
      ? CheckCircle2
      : result?.status === 'processing' || result?.status === 'published'
        ? Clock3
        : result
          ? AlertTriangle
          : RefreshCw;

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleClick} disabled={pending} className="gap-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Atualizar dados deste município
      </Button>
      {pending && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Consultando a fonte e organizando os agregados. Isso pode levar alguns minutos.
        </p>
      )}
      {!pending && result && (
        <p className={`flex items-start gap-2 text-xs leading-5 ${TONE[result.status] ?? 'text-muted-foreground'}`}>
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{result.message}</span>
        </p>
      )}
    </div>
  );
}
