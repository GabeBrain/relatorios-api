import { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { processSindusconFile } from '../api';
import type { ProcessedReport, ReportKind } from '../types';

const COPY: Record<ReportKind, { title: string; description: string }> = {
  alvaras: { title: 'Tratamento Inicial Alvarás', description: 'Envie a planilha de alvarás para organizar colunas, áreas e unidades.' },
  cvco: { title: 'Tratamento Inicial CVCO', description: 'Envie a planilha de CVCO para organizar colunas, áreas, vistoria e unidades.' },
};

export default function SindusconCuritibaPage() {
  const [step, setStep] = useState<ReportKind | null>(null);
  const [report, setReport] = useState<ProcessedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [download, setDownload] = useState<{ blob: Blob; fileName: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const processing = startedAt !== null;

  async function handleFile(file?: File) {
    if (!file || !step) return;
    if (!/\.xlsx$/i.test(file.name)) { setError('Aceitamos somente arquivos .xlsx. Se o seu arquivo for .xls, abra-o no Excel e use Salvar como → Pasta de Trabalho do Excel (.xlsx) antes do envio.'); return; }
    setError(null); setStartedAt(Date.now());
    try {
      const result = await processSindusconFile(file, step);
      setReport(result.report);
      setDownload({ blob: result.blob, fileName: result.fileName });
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível tratar esta planilha.'); }
    finally { setStartedAt(null); }
  }
  function choose(next: ReportKind) { setStep(next); setReport(null); setDownload(null); setError(null); }
  function leave() { setStep(null); setReport(null); setDownload(null); setError(null); }
  function downloadReport() {
    if (!download) return;
    const url = URL.createObjectURL(download.blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = download.fileName; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="min-h-full">
    <header className="border-b border-border bg-card px-5 py-6 sm:px-8"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Rebrain · Sinduscon</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Sinduscon - Curitiba</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Preparação das bases mensais de alvarás e certificados de vistoria e conclusão de obra.</p></header>
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      {!step ? <div className="grid gap-5 md:grid-cols-2">{(['alvaras', 'cvco'] as ReportKind[]).map((kind) => <Card key={kind} className="border-primary/15 shadow-sm"><CardHeader><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileSpreadsheet className="h-5 w-5" /></span><CardTitle className="mt-3 text-lg">{COPY[kind].title}</CardTitle><CardDescription>{COPY[kind].description}</CardDescription></CardHeader><CardContent><Button className="w-full" onClick={() => choose(kind)}>Iniciar tratamento <ArrowRight /></Button></CardContent></Card>)}</div> : <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Etapa atual</p><h2 className="text-xl font-semibold">{COPY[step].title}</h2></div><Button variant="ghost" onClick={leave}>Voltar às etapas</Button></div>
        {!report && <Card className="border-dashed border-primary/30"><CardContent className="p-6 sm:p-10"><button type="button" className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]" onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files[0]); }}><UploadCloud className="h-9 w-9 text-primary" /><p className="mt-4 font-medium">Arraste a planilha aqui ou selecione um arquivo</p><p className="mt-1 text-sm text-muted-foreground">Aceita exclusivamente arquivos .xlsx. Se o seu arquivo for .xls, abra-o no Excel e use Salvar como → Pasta de Trabalho do Excel (.xlsx). Mês e ano são lidos do nome do arquivo.</p></button><input ref={input} className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleFile(event.target.files?.[0])} />{error && <Alert variant="destructive" className="mt-4"><AlertCircle /><AlertTitle>Não foi possível processar o arquivo</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}</CardContent></Card>}
        {report && <Result report={report} onDownload={downloadReport} onNext={() => choose(step === 'alvaras' ? 'cvco' : 'alvaras')} onLeave={leave} />}
      </>}
      {processing && <BrainLoadingState variant="overlay" startedAt={startedAt} title="Tratando planilha" description="Organizando colunas e identificando itens para revisão." />}
    </div>
  </div>;
}

function Result({ report, onDownload, onNext, onLeave }: { report: ProcessedReport; onDownload: () => void; onNext: () => void; onLeave: () => void }) {
  const nextLabel = report.kind === 'alvaras' ? 'Ir para Tratamento Inicial CVCO' : 'Tratar outra planilha de Alvarás';
  return <div className="space-y-5"><Card className="border-primary/20"><CardHeader><CardTitle className="text-lg">Planilha preparada</CardTitle><CardDescription>{report.fileName} · {report.month} de {report.year}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-x-8 gap-y-3 text-sm"><p><strong>{report.rows.length}</strong> linhas mantidas</p><p><strong>{report.rowsRemoved}</strong> linhas removidas por demolição ou área liberada zerada</p><p><strong>{report.decisions.length}</strong> padronizações de unidades</p><p><strong>{report.reviews.length}</strong> itens para revisão humana</p></CardContent></Card>
    {report.decisions.length > 0 && <Card><CardHeader><CardTitle className="text-base">Decisões de unidades</CardTitle><CardDescription>Registro de cada ajuste automático realizado nesta planilha.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b"><tr><th className="pb-2 pr-3">Linha</th><th className="pb-2 pr-3">Uso</th><th className="pb-2 pr-3">Original (resid. / não resid.)</th><th className="pb-2 pr-3">Final (resid. / não resid.)</th><th className="pb-2">Decisão</th></tr></thead><tbody>{report.decisions.map((item) => <tr key={item.id} className="border-b border-border/60 align-top"><td className="py-2 pr-3">{item.rowNumber}</td><td className="py-2 pr-3">{item.usage}</td><td className="py-2 pr-3">{item.originalResidential || '—'} / {item.originalNonResidential || '—'}</td><td className="py-2 pr-3">{item.finalResidential || '—'} / {item.finalNonResidential || '—'}</td><td className="py-2">{item.decision}</td></tr>)}</tbody></table></CardContent></Card>}
    {report.reviews.length > 0 && <Alert><AlertCircle className="text-warning" /><AlertTitle>Revisão humana necessária</AlertTitle><AlertDescription><p>Os casos abaixo têm uso misto comercial e residencial em uma faixa que não permite decisão automática segura. Eles permanecem no arquivo e também são listados na aba “Revisão humana”.</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs"><thead className="border-b"><tr><th className="pb-2 pr-3">Linha</th><th className="pb-2 pr-3">Uso</th><th className="pb-2 pr-3">Resid.</th><th className="pb-2">Não resid.</th></tr></thead><tbody>{report.reviews.map((item) => <tr key={item.id} className="border-b border-border/60"><td className="py-2 pr-3">{item.rowNumber}</td><td className="py-2 pr-3">{item.usage}</td><td className="py-2 pr-3">{item.residential}</td><td className="py-2">{item.nonResidential}</td></tr>)}</tbody></table></div></AlertDescription></Alert>}
    <div className="flex flex-wrap gap-3"><Button onClick={onDownload}><Download /> Baixar Excel tratado</Button><Button variant="outline" onClick={onNext}>{nextLabel} <ArrowRight /></Button><Button variant="ghost" onClick={onLeave}>Sair</Button></div>
  </div>;
}
