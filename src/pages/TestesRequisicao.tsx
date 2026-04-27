import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Square, RotateCcw, Copy, Check, ChevronDown, ChevronUp, History, Code } from 'lucide-react';
import { toast } from 'sonner';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useOpenAPIDocs } from '@/hooks/use-openapi-docs';
import {
  type OperationSpec,
  type RequestResult,
  buildRequestBodyTemplate,
  executeRequest,
  buildCurlCommand,
  updatePathCandidates,
  getPathParamCandidates,
  isDateQueryParam,
  isArraySchema,
  getArrayItemEnumValues,
  getEnumValues,
} from '@/lib/openapi-engine';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-blue-500',
  POST: 'text-green-500',
  PUT: 'text-yellow-600',
  PATCH: 'text-orange-500',
  DELETE: 'text-red-500',
};

interface HistoryEntry {
  id: string;
  timestamp: string;
  api: string;
  endpoint: string;
  status: number | string;
  latencyMs: number;
  bytes: number;
}

const HISTORY_KEY = 'brain-request-history';
const CANDIDATE_STORE_KEY = 'brain-path-candidates';

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}
function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 50)));
}

function JsonViewer({ data }: { data: unknown }) {
  const text = JSON.stringify(data, null, 2);
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 z-10 flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded text-muted-foreground hover:text-foreground"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
      <pre className="text-[11px] font-mono bg-muted rounded p-3 overflow-auto max-h-[60vh] text-foreground leading-relaxed whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}

function StatusBadge({ status }: { status: number | null }) {
  if (status === null) return <Badge variant="destructive">Erro</Badge>;
  const ok = status >= 200 && status < 300;
  return (
    <Badge className={ok ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'} variant="outline">
      {status}
    </Badge>
  );
}

function ParamField({
  param,
  value,
  onChange,
}: {
  param: OperationSpec['queryParams'][number] | OperationSpec['pathParams'][number];
  value: string;
  onChange: (v: string) => void;
}) {
  const enums = getEnumValues(param.schema);
  const arrayEnums = getArrayItemEnumValues(param.schema);
  const isDate = isDateQueryParam(param.name, param.schema);
  const isArr = isArraySchema(param.schema);
  const candidates = 'location' in param && param.location === 'path' ? getPathParamCandidates(param.name, param.schema) : [];

  const label = (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-xs font-medium font-mono text-foreground">{param.name}</span>
      <span className="text-[10px] text-muted-foreground">
        [{isArr ? 'array' : (param.schema.type ?? 'string')}]
      </span>
      {param.required && <span className="text-[10px] text-red-500">*</span>}
    </div>
  );

  if (arrayEnums.length > 0) {
    const selected: string[] = value ? JSON.parse(value) : [];
    return (
      <div>
        {label}
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {arrayEnums.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selected, opt]
                    : selected.filter((v) => v !== opt);
                  onChange(JSON.stringify(next));
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (enums.length > 0) {
    const NONE = '__none__';
    return (
      <div>
        {label}
        <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {!param.required && <SelectItem value={NONE}>— vazio —</SelectItem>}
            {enums.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isDate) {
    return (
      <div>
        {label}
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    );
  }

  if (candidates.length > 0) {
    const NONE = '__none__';
    return (
      <div>
        {label}
        <div className="flex gap-1.5">
          <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Sugestão ou manual…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— vazio —</SelectItem>
              {candidates.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Manual"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs w-28"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {label}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.description || ''}
        className="h-8 text-xs"
      />
    </div>
  );
}

export default function TestesRequisicao() {
  const { data: docs, isLoading } = useOpenAPIDocs();
  const location = useLocation();
  const { getToken, hasValidToken } = useAuthStore();

  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedOpKey, setSelectedOpKey] = useState<string>('');
  const [pathInputs, setPathInputs] = useState<Record<string, string>>({});
  const [queryInputs, setQueryInputs] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState('');
  const [useAuth, setUseAuth] = useState(true);
  const [timeoutSec, setTimeoutSec] = useState(40);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState<'curl' | 'fetch' | 'python'>('curl');
  const abortRef = useRef<AbortController | null>(null);

  const selectedDoc = docs?.find((d) => d.documentId === selectedDocId) ?? docs?.[0];
  const selectedOp = selectedDoc?.operations.find((op) => opKey(op) === selectedOpKey) ?? selectedDoc?.operations[0];

  function opKey(op: OperationSpec) { return `${op.documentId}__${op.method}__${op.path.replace(/[^a-z0-9]/gi, '_')}`; }

  // Set first doc/op on load
  useEffect(() => {
    if (!docs || docs.length === 0) return;
    const preselect = location.state?.preselect as { docId?: string; opId?: string } | undefined;

    if (preselect?.docId) {
      const doc = docs.find((d) => d.documentId === preselect.docId);
      if (doc) {
        setSelectedDocId(doc.documentId);
        if (preselect.opId) {
          const op = doc.operations.find((o) => o.operationId === preselect.opId);
          if (op) setSelectedOpKey(opKey(op));
        }
        return;
      }
    }

    if (!selectedDocId) setSelectedDocId(docs[0].documentId);
  }, [docs, location.state]);

  // Reset inputs when operation changes
  useEffect(() => {
    if (!selectedOp) return;
    const pathDef: Record<string, string> = {};
    const queryDef: Record<string, string> = {};
    selectedOp.pathParams.forEach((p) => { pathDef[p.name] = ''; });
    selectedOp.queryParams.forEach((p) => {
      const d = p.schema.default;
      queryDef[p.name] = d !== undefined && d !== null ? String(d) : '';
    });
    setPathInputs(pathDef);
    setQueryInputs(queryDef);
    setBodyText(selectedOp.requestBodySchema ? buildRequestBodyTemplate(selectedOp) : '');
    setUseAuth(selectedOp.requiresAuth);
    setResult(null);
  }, [selectedOpKey]);

  // Keyboard shortcut: Ctrl+Enter to run, Esc to cancel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleRun(); }
      if (e.key === 'Escape' && loading) { handleCancel(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, selectedOp, pathInputs, queryInputs, bodyText, useAuth, timeoutSec]);

  const handleRun = useCallback(async () => {
    if (!selectedOp) return;
    if (useAuth && !hasValidToken()) {
      toast.error('Token ausente ou expirado. Gere um token no menu lateral.');
      return;
    }
    abortRef.current = new AbortController();
    setLoading(true);
    setResult(null);
    try {
      const res = await executeRequest({
        operation: selectedOp,
        token: getToken(),
        includeAuth: useAuth,
        queryInputs,
        pathInputs,
        rawBody: bodyText,
        timeoutSeconds: timeoutSec,
        signal: abortRef.current.signal,
      });
      setResult(res);
      updatePathCandidates(res.responseJson, pathInputs);

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleString('pt-BR'),
        api: selectedDoc?.title ?? '',
        endpoint: `${selectedOp.method} ${selectedOp.path}`,
        status: res.statusCode ?? 'erro',
        latencyMs: Math.round(res.latencyMs ?? 0),
        bytes: res.responseBytes,
      };
      const newHistory = [entry, ...history].slice(0, 50);
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [selectedOp, selectedDoc, useAuth, queryInputs, pathInputs, bodyText, timeoutSec, history, getToken, hasValidToken]);

  function handleCancel() {
    abortRef.current?.abort();
    setLoading(false);
  }

  function buildSnippets() {
    if (!selectedOp || !result) return { curl: '', fetch: '', python: '' };
    const token = getToken();
    const url = result.url;
    const method = selectedOp.method;
    const body = result.requestBody;

    const curl = buildCurlCommand(url, method, result.requestHeaders, body, useAuth ? token : '');

    const fetchHeaders: Record<string, string> = { Accept: 'application/json' };
    if (useAuth && token) fetchHeaders['Authorization'] = `Bearer ${token}`;
    if (body !== null) fetchHeaders['Content-Type'] = 'application/json';

    const fetchCode = [
      `const response = await fetch('${url}', {`,
      `  method: '${method}',`,
      `  headers: ${JSON.stringify(fetchHeaders, null, 2).replace(/\n/g, '\n  ')},`,
      body !== null ? `  body: JSON.stringify(${JSON.stringify(body)}),` : null,
      `});`,
      `const data = await response.json();`,
      `console.log(data);`,
    ].filter(Boolean).join('\n');

    const pythonHeaders = `headers = {"Accept": "application/json"${useAuth && token ? `, "Authorization": "Bearer ${token}"` : ''}}`;
    const pythonCode = [
      `import requests`,
      ``,
      pythonHeaders,
      body !== null ? `payload = ${JSON.stringify(body)}` : null,
      `response = requests.${method.toLowerCase()}(`,
      `    "${url}",`,
      `    headers=headers,`,
      body !== null ? `    json=payload,` : null,
      `)`,
      `print(response.json())`,
    ].filter(Boolean).join('\n');

    return { curl, fetch: fetchCode, python: pythonCode };
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">Nenhuma documentação OpenAPI encontrada.</div>;
  }

  const snippets = buildSnippets();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-card flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Testes de Requisição</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Playground de chamadas HTTP. <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded">Ctrl+Enter</kbd> para executar · <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded">Esc</kbd> para cancelar
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowHistory((v) => !v)}
        >
          <History className="h-3.5 w-3.5" />
          Histórico ({history.length})
        </Button>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="border-b border-border bg-muted/30 px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold">Histórico recente (últimas 50 chamadas)</p>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setHistory([]); saveHistory([]); }}>
              Limpar
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma chamada realizada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1 pr-4 font-medium">Horário</th>
                    <th className="text-left py-1 pr-4 font-medium">API</th>
                    <th className="text-left py-1 pr-4 font-medium">Endpoint</th>
                    <th className="text-left py-1 pr-4 font-medium">Status</th>
                    <th className="text-left py-1 pr-4 font-medium">Latência</th>
                    <th className="text-left py-1 font-medium">Bytes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-accent/30">
                      <td className="py-1 pr-4 text-muted-foreground">{h.timestamp}</td>
                      <td className="py-1 pr-4">{h.api}</td>
                      <td className="py-1 pr-4 font-mono">{h.endpoint}</td>
                      <td className="py-1 pr-4"><StatusBadge status={typeof h.status === 'number' ? h.status : null} /></td>
                      <td className="py-1 pr-4">{h.latencyMs} ms</td>
                      <td className="py-1">{h.bytes.toLocaleString('pt-BR')} B</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main split area */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left: Form */}
          <Panel defaultSize={42} minSize={30}>
            <div className="flex flex-col h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* API + Endpoint selectors */}
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs mb-1 block">API alvo</Label>
                    <Select value={selectedDoc?.documentId ?? ''} onValueChange={(v) => { setSelectedDocId(v); setSelectedOpKey(''); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione a API" />
                      </SelectTrigger>
                      <SelectContent>
                        {docs.map((d) => <SelectItem key={d.documentId} value={d.documentId}>{d.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDoc && (
                    <div>
                      <Label className="text-xs mb-1 block">Endpoint</Label>
                      <Select value={selectedOp ? opKey(selectedOp) : ''} onValueChange={setSelectedOpKey}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecione o endpoint" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDoc.operations.map((op) => (
                            <SelectItem key={opKey(op)} value={opKey(op)}>
                              <span className={cn('font-mono font-bold mr-2', METHOD_COLORS[op.method])}>{op.method}</span>
                              {op.path}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedOp && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>Base URL: <span className="font-mono">{selectedDoc?.baseUrl}</span></div>
                      <div>operationId: <span className="font-mono">{selectedOp.operationId}</span></div>
                    </div>
                  )}
                </div>

                {/* Path params */}
                {selectedOp && selectedOp.pathParams.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground border-b border-border pb-1">Parâmetros de path</p>
                    {selectedOp.pathParams.map((p) => (
                      <ParamField
                        key={p.name}
                        param={p}
                        value={pathInputs[p.name] ?? ''}
                        onChange={(v) => setPathInputs((prev) => ({ ...prev, [p.name]: v }))}
                      />
                    ))}
                  </div>
                )}

                {/* Query params */}
                {selectedOp && selectedOp.queryParams.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground border-b border-border pb-1">Parâmetros de query</p>
                    {selectedOp.queryParams.map((p) => (
                      <ParamField
                        key={p.name}
                        param={p}
                        value={queryInputs[p.name] ?? ''}
                        onChange={(v) => setQueryInputs((prev) => ({ ...prev, [p.name]: v }))}
                      />
                    ))}
                  </div>
                )}

                {/* Body */}
                {selectedOp?.requestBodySchema && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between border-b border-border pb-1">
                      <p className="text-xs font-semibold text-foreground">Body JSON</p>
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => setBodyText(buildRequestBodyTemplate(selectedOp))}
                      >
                        <RotateCcw className="h-3 w-3 inline mr-1" />
                        Resetar template
                      </button>
                    </div>
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      className="w-full h-36 font-mono text-xs bg-muted rounded p-2 text-foreground resize-none border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={useAuth} onCheckedChange={setUseAuth} id="use-auth" />
                    <Label htmlFor="use-auth" className="text-xs cursor-pointer">
                      Enviar Authorization: Bearer token
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs shrink-0">Timeout:</Label>
                    <input
                      type="range"
                      min={5} max={120} step={5}
                      value={timeoutSec}
                      onChange={(e) => setTimeoutSec(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10 shrink-0">{timeoutSec}s</span>
                  </div>
                </div>

                {/* Run / Cancel */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleRun}
                    disabled={loading || !selectedOp}
                  >
                    {loading ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {loading ? 'Executando…' : 'Executar'}
                  </Button>
                  {loading && (
                    <Button variant="outline" onClick={handleCancel} className="gap-1">
                      <Square className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-px bg-border hover:bg-primary/40 transition-colors cursor-col-resize" />

          {/* Right: Result */}
          <Panel defaultSize={58} minSize={30}>
            <div className="flex flex-col h-full overflow-y-auto">
              {!result && !loading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-sm text-muted-foreground space-y-1">
                    <Play className="h-8 w-8 mx-auto opacity-20" />
                    <p>Execute uma requisição para ver o resultado</p>
                    <p className="text-xs">Ctrl+Enter para executar</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-32 w-full" />
                </div>
              )}

              {result && !loading && (
                <div className="p-4 space-y-3">
                  {/* Metrics bar */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Status', value: <StatusBadge status={result.statusCode} /> },
                      { label: 'Latência', value: `${(result.latencyMs ?? 0).toFixed(0)} ms` },
                      { label: 'Tamanho', value: `${result.responseBytes.toLocaleString('pt-BR')} B` },
                      { label: 'Content-Type', value: result.contentType.split(';')[0] || '-' },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg border border-border bg-card p-2">
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                        <div className="text-xs font-semibold mt-0.5 truncate">{value}</div>
                      </div>
                    ))}
                  </div>

                  {result.error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      {result.error}
                    </div>
                  )}

                  {/* Snippets */}
                  <div>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSnippets((v) => !v)}
                    >
                      <Code className="h-3.5 w-3.5" />
                      Snippets de código
                      {showSnippets ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {showSnippets && (
                      <div className="mt-2 border border-border rounded-lg overflow-hidden">
                        <div className="flex border-b border-border bg-muted">
                          {(['curl', 'fetch', 'python'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setActiveSnippet(s)}
                              className={cn('px-3 py-1.5 text-xs font-medium', activeSnippet === s ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}
                            >
                              {s === 'fetch' ? 'JS fetch' : s}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(snippets[activeSnippet]); toast.success('Copiado!'); }}
                            className="absolute right-2 top-2 text-[11px] bg-muted px-2 py-0.5 rounded text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" /> Copiar
                          </button>
                          <pre className="text-[11px] font-mono p-3 overflow-x-auto max-h-40 text-foreground whitespace-pre-wrap">
                            {snippets[activeSnippet]}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Request details */}
                  <div>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowRequest((v) => !v)}
                    >
                      Conteúdo da chamada (request)
                      {showRequest ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {showRequest && (
                      <div className="mt-2">
                        <JsonViewer data={{
                          method: result.method,
                          url: result.url,
                          headers: result.requestHeaders,
                          query: result.requestQuery,
                          body: result.requestBody,
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Response */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">Resposta (response)</p>
                    {result.responseJson !== null ? (
                      <JsonViewer data={result.responseJson} />
                    ) : result.responseText ? (
                      <pre className="text-[11px] font-mono bg-muted rounded p-3 overflow-auto max-h-[60vh] whitespace-pre-wrap break-words text-foreground">
                        {result.responseText}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground">Resposta sem corpo.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
