import { useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { consolidateSindusconFiles, createSindusconFinalReport, tabulateSindusconFile } from '../api';
import type { ConsolidationOutput, FinalReportOutput, TabulationOutput } from '../lib/monthly-workflow';
import type { ReportKind } from '../types';

type Output = ConsolidationOutput | TabulationOutput | FinalReportOutput;

function download(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FileField({ label, description, file, onChange }: { label: string; description: string; file: File | null; onChange: (file: File) => void }) {
  return <label className="block cursor-pointer rounded-xl border border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">
    <span className="flex items-start gap-3"><UploadCloud className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{file?.name ?? description}</span></span></span>
    <input className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { const next = event.target.files?.[0]; if (next) onChange(next); }} />
  </label>;
}

function StageShell({ title, description, children, onLeave, startedAt }: { title: string; description: string; children: React.ReactNode; onLeave: () => void; startedAt: number | null }) {
  return <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Etapa independente</p><h2 className="text-xl font-semibold">{title}</h2></div><Button variant="ghost" onClick={onLeave}>Voltar às etapas</Button></div>
    <Card><CardHeader><CardTitle className="text-lg">Arquivos de entrada</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="space-y-3">{children}</CardContent></Card>
    {startedAt !== null && <BrainLoadingState variant="overlay" startedAt={startedAt} title={`Executando: ${title}`} description="O processamento ocorre localmente no navegador, sem enviar as planilhas para um servidor externo." />}</>;
}

function Success({ result, label, onReset }: { result: Output; label: string; onReset: () => void }) {
  const unmatched = 'unmatchedNeighborhoods' in result ? result.unmatchedNeighborhoods : [];
  return <div className="space-y-4"><Alert><FileSpreadsheet /><AlertTitle>Arquivo preparado</AlertTitle><AlertDescription>{result.month} de {result.year}. Baixe o resultado antes de sair desta etapa.</AlertDescription></Alert>
    {unmatched.length > 0 && <Alert><AlertCircle className="text-warning" /><AlertTitle>Bairros fora do modelo</AlertTitle><AlertDescription>{unmatched.join(', ')} constam na tabulação, mas não possuem linha própria no template armazenado.</AlertDescription></Alert>}
    <div className="flex flex-wrap gap-3"><Button onClick={() => download(result.bytes, result.fileName)}><Download /> {label}</Button><Button variant="outline" onClick={onReset}>Processar outro arquivo</Button></div></div>;
}

export function ConsolidationPanel({ kind, onLeave }: { kind: ReportKind; onLeave: () => void }) {
  const [base, setBase] = useState<File | null>(null);
  const [current, setCurrent] = useState<File | null>(null);
  const [result, setResult] = useState<ConsolidationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const title = kind === 'alvaras' ? 'Alimentar base de Liberados' : 'Alimentar base de CVCO';
  async function process() {
    if (!base || !current) return;
    setStartedAt(Date.now()); setError(null);
    try { setResult(await consolidateSindusconFiles(base, current, kind)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível alimentar a base.'); }
    finally { setStartedAt(null); }
  }
  return <StageShell title={title} description="Envie a base acumulada e o arquivo já tratado do novo mês. O resultado será uma nova base acumulada, com as três fórmulas copiadas para todas as linhas adicionadas." onLeave={onLeave} startedAt={startedAt}>
    {result ? <Success result={result} label="Baixar base atualizada" onReset={() => setResult(null)} /> : <><FileField label="Base acumulada" description="Arquivo alimentado até o mês anterior" file={base} onChange={setBase} /><FileField label="Arquivo tratado do novo mês" description="Saída da etapa de tratamento inicial" file={current} onChange={setCurrent} />{error && <ErrorMessage message={error} />}<Button disabled={!base || !current || startedAt !== null} onClick={() => void process()}><FileSpreadsheet /> Alimentar base</Button></>}
  </StageShell>;
}

export function TabulationPanel({ kind, onLeave }: { kind: ReportKind; onLeave: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TabulationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  async function process() {
    if (!file) return;
    setStartedAt(Date.now()); setError(null);
    try { setResult(await tabulateSindusconFile(file, kind)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar a tabulação.'); }
    finally { setStartedAt(null); }
  }
  return <StageShell title={`Gerar tabulação de ${kind === 'alvaras' ? 'Liberados' : 'CVCO'}`} description="Envie somente a base acumulada atualizada. Esta etapa gera as oito tabelas que substituem o processamento do SPSS." onLeave={onLeave} startedAt={startedAt}>
    {result ? <Success result={result} label="Baixar tabulação" onReset={() => setResult(null)} /> : <><FileField label="Base acumulada atualizada" description="Saída da etapa de alimentação mensal" file={file} onChange={setFile} />{error && <ErrorMessage message={error} />}<Button disabled={!file || startedAt !== null} onClick={() => void process()}><FileSpreadsheet /> Gerar tabulação</Button></>}
  </StageShell>;
}

export function FinalReportPanel({ kind, onLeave }: { kind: ReportKind; onLeave: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<FinalReportOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  async function process() {
    if (!file) return;
    setStartedAt(Date.now()); setError(null);
    try { setResult(await createSindusconFinalReport(file, kind)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o relatório final.'); }
    finally { setStartedAt(null); }
  }
  return <StageShell title={`Gerar relatório ${kind === 'alvaras' ? 'Liberado' : 'Concluído'}`} description="Envie somente a tabulação. O modelo limpo fica armazenado na aplicação e preserva fórmulas, gráficos, imagens, cores, larguras e alturas originais." onLeave={onLeave} startedAt={startedAt}>
    {result ? <Success result={result} label="Baixar relatório final" onReset={() => setResult(null)} /> : <><FileField label="Tabulação do período" description="Saída da etapa de tabulação" file={file} onChange={setFile} />{error && <ErrorMessage message={error} />}<Button disabled={!file || startedAt !== null} onClick={() => void process()}><FileSpreadsheet /> Gerar relatório final</Button></>}
  </StageShell>;
}

function ErrorMessage({ message }: { message: string }) { return <Alert variant="destructive"><AlertCircle /><AlertTitle>Não foi possível processar</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>; }
