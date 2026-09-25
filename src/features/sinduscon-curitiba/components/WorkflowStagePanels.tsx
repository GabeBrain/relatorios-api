import { useRef, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { cn } from '@/lib/utils';
import { consolidateSindusconFiles, createSindusconFinalPdf, createSindusconFinalReport, tabulateSindusconFile } from '../api';
import type { CompiledPdf } from '../lib/pdf-compiler';
import type { ConsolidationOutput, FinalReportOutput, TabulationOutput } from '../lib/monthly-workflow';
import type { ReportKind } from '../types';

type Output = ConsolidationOutput | TabulationOutput | FinalReportOutput;
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function download(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: /\.pdf$/i.test(fileName) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FileField({ label, description, file, onChange, accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }: { label: string; description: string; file: File | null; onChange: (file: File) => void; accept?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState(false);
  const expectsPdf = accept.includes('.pdf');
  function select(next?: File) {
    if (!next) return;
    const valid = expectsPdf ? /\.pdf$/i.test(next.name) : /\.xlsx$/i.test(next.name);
    setRejected(!valid);
    if (valid) onChange(next);
  }
  return <div>
    <button type="button" className={cn('block w-full cursor-pointer rounded-xl border border-dashed border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', dragging && 'border-primary bg-primary/[0.07]')} onClick={() => input.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }}>
      <span className="flex items-start gap-3"><UploadCloud className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{dragging ? 'Solte o arquivo aqui' : file?.name ?? `${description}. Clique ou arraste o arquivo aqui.`}</span></span></span>
    </button>
    <input ref={input} className="sr-only" type="file" accept={accept} onChange={(event) => { select(event.target.files?.[0]); event.target.value = ''; }} />
    {rejected && <p role="alert" className="mt-1.5 text-xs text-destructive">Formato incompatível. Envie um arquivo {expectsPdf ? '.pdf' : '.xlsx'}.</p>}
  </div>;
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

export function PdfCompilationPanel({ kind, onLeave }: { kind: ReportKind; onLeave: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [result, setResult] = useState<CompiledPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  async function process() {
    if (!file || !month) return;
    setStartedAt(Date.now()); setError(null);
    try { setResult(await createSindusconFinalPdf(file, kind, month, Number(year))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível compilar o PDF final.'); }
    finally { setStartedAt(null); }
  }
  return <StageShell title={`Compilar PDF ${kind === 'alvaras' ? 'Liberados' : 'Concluídos'}`} description="Depois de conferir o Excel, exporte as oito abas do relatório como um único PDF. A aplicação adicionará a capa do período e o mapa de Curitiba antes dessas oito páginas." onLeave={onLeave} startedAt={startedAt}>
    {result ? <div className="space-y-4"><Alert><FileSpreadsheet /><AlertTitle>PDF final preparado</AlertTitle><AlertDescription>{result.pageCount} páginas: capa, mapa e oito páginas do relatório.</AlertDescription></Alert><div className="flex flex-wrap gap-3"><Button onClick={() => download(result.bytes, result.fileName)}><Download /> Baixar PDF final</Button><Button variant="outline" onClick={() => setResult(null)}>Compilar outro PDF</Button></div></div> : <>
      <FileField label="PDF exportado do Excel" description="Selecione o arquivo com as oito abas do relatório" file={file} onChange={setFile} accept=".pdf,application/pdf" />
      <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><label className="text-sm font-medium">Mês de referência</label><Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger><SelectContent>{MONTHS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><label htmlFor="sinduscon-pdf-year" className="text-sm font-medium">Ano</label><Input id="sinduscon-pdf-year" type="number" min={2020} max={2100} value={year} onChange={(event) => setYear(event.target.value)} /></div></div>
      {error && <ErrorMessage message={error} />}<Button disabled={!file || !month || !year || startedAt !== null} onClick={() => void process()}><FileSpreadsheet /> Compilar PDF final</Button>
    </>}
  </StageShell>;
}

function ErrorMessage({ message }: { message: string }) { return <Alert variant="destructive"><AlertCircle /><AlertTitle>Não foi possível processar</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>; }
