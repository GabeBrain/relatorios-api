import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Lock, Unlock, ExternalLink, Play, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useOpenAPIDocs } from '@/hooks/use-openapi-docs';
import { buildRequestBodyTemplate } from '@/lib/openapi-engine';
import type { OperationSpec } from '@/lib/openapi-engine';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  POST: 'bg-green-500/10 text-green-500 border-green-500/30',
  PUT: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  PATCH: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  DELETE: 'bg-red-500/10 text-red-500 border-red-500/30',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold font-mono shrink-0',
      METHOD_COLORS[method] ?? 'bg-muted text-muted-foreground border-border'
    )}>
      {method}
    </span>
  );
}

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label}
    </button>
  );
}

function OperationCard({ op, onTest }: { op: OperationSpec; onTest: (op: OperationSpec) => void }) {
  const [open, setOpen] = useState(false);
  const bodyTemplate = op.requestBodySchema ? buildRequestBodyTemplate(op) : null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-card hover:bg-accent/50 transition-colors text-left"
      >
        <MethodBadge method={op.method} />
        <span className="font-mono text-sm text-foreground flex-1 truncate">{op.path}</span>
        {op.summary && <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">{op.summary}</span>}
        {op.requiresAuth
          ? <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          : <Unlock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border bg-background p-3 space-y-3">
          {/* Meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">operationId:</span> {op.operationId}</span>
            <span><span className="font-medium text-foreground">auth:</span> {op.requiresAuth ? 'obrigatório' : 'público'}</span>
          </div>

          {/* Path params */}
          {op.pathParams.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Parâmetros de path</p>
              <div className="space-y-1">
                {op.pathParams.map((p) => (
                  <div key={p.name} className="flex items-start gap-2 text-xs">
                    <span className="font-mono font-medium text-foreground shrink-0">{p.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 shrink-0">{p.schema.type ?? 'string'}</Badge>
                    {p.required && <Badge variant="outline" className="text-[10px] h-4 text-red-500 border-red-500/30 shrink-0">required</Badge>}
                    {p.description && <span className="text-muted-foreground">{p.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query params */}
          {op.queryParams.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Parâmetros de query</p>
              <div className="space-y-1">
                {op.queryParams.map((p) => (
                  <div key={p.name} className="flex items-start gap-2 text-xs flex-wrap">
                    <span className="font-mono font-medium text-foreground shrink-0">{p.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                      {Array.isArray(p.schema.type) ? p.schema.type.join('/') : (p.schema.type ?? 'string')}
                    </Badge>
                    {p.required && <Badge variant="outline" className="text-[10px] h-4 text-red-500 border-red-500/30 shrink-0">required</Badge>}
                    {Array.isArray(p.schema.enum) && (
                      <span className="text-muted-foreground">enum: {p.schema.enum.join(', ')}</span>
                    )}
                    {p.description && <span className="text-muted-foreground">{p.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body template */}
          {bodyTemplate && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Template de body JSON</p>
                <CopyButton text={bodyTemplate} label="Copiar body" />
              </div>
              <pre className="text-[11px] bg-muted rounded p-2 overflow-x-auto font-mono text-foreground leading-relaxed max-h-48 overflow-y-auto">
                {bodyTemplate}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1.5"
              onClick={() => onTest(op)}
            >
              <Play className="h-3 w-3" />
              Testar endpoint
            </Button>
            <span className="text-xs text-muted-foreground font-mono">{op.baseUrl}{op.path}</span>
            <CopyButton text={`${op.baseUrl}${op.path}`} label="Copiar URL" />
          </div>
        </div>
      )}
    </div>
  );
}

interface DocumentacaoProps {
  /** Quando montado dentro do API Explorer, troca de aba em vez de navegar. */
  onTest?: (op: OperationSpec) => void;
}

export default function Documentacao({ onTest }: DocumentacaoProps = {}) {
  const { data: docs, isLoading, error } = useOpenAPIDocs();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!docs) return [];
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.map((doc) => ({
      ...doc,
      operations: doc.operations.filter(
        (op) =>
          op.path.toLowerCase().includes(q) ||
          op.method.toLowerCase().includes(q) ||
          op.operationId.toLowerCase().includes(q) ||
          op.summary.toLowerCase().includes(q)
      ),
    })).filter((doc) => doc.operations.length > 0);
  }, [docs, search]);

  function toggleApi(id: string) {
    setExpandedApis((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleTest(op: OperationSpec) {
    if (onTest) {
      onTest(op);
      return;
    }
    navigate('/apis/explorer', { state: { preselect: { docId: op.documentId, opId: op.operationId } } });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header (oculto quando embutido no API Explorer) */}
      {!onTest && (
        <div className="border-b border-border px-6 py-4 bg-card">
          <h1 className="text-lg font-semibold">Documentação</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Referência das APIs disponíveis. Clique em um endpoint para ver detalhes.</p>
        </div>
      )}

      {/* Search */}
      <div className="px-6 py-3 border-b border-border bg-background">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar endpoint, método, operationId…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Erro ao carregar documentação OpenAPI.
          </div>
        )}

        {filtered.map((doc) => {
          const isOpen = expandedApis.has(doc.documentId) || search.trim().length > 0;
          return (
            <div key={doc.documentId} className="space-y-2">
              {/* API header */}
              <button
                type="button"
                onClick={() => toggleApi(doc.documentId)}
                className="w-full flex items-center gap-3 text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">{doc.title}</h2>
                    <Badge variant="outline" className="text-[10px]">v{doc.version}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{doc.operationCount} endpoints</Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground font-mono">{doc.baseUrl}</span>
                  </div>
                </div>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <div className="space-y-1.5 pl-0">
                  {doc.operations.map((op) => (
                    <OperationCard key={`${op.documentId}-${op.method}-${op.path}`} op={op} onTest={handleTest} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!isLoading && filtered.length === 0 && search && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhum endpoint encontrado para "{search}".
          </div>
        )}
      </div>
    </div>
  );
}
