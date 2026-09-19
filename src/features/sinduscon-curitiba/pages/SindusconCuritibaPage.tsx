import { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Download, FilePlus2, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { ConsolidationPanel, FinalReportPanel, PdfCompilationPanel, TabulationPanel } from '../components/WorkflowStagePanels';
import { processSindusconFile } from '../api';
import type { ProcessedReport, ReportKind } from '../types';

type WorkflowStage = 'initial' | 'consolidate' | 'tabulate' | 'report' | 'pdf';
type WorkflowStep = `${WorkflowStage}-${ReportKind}`;

const COPY: Record<WorkflowStep, { title: string; description: string; icon: typeof FileSpreadsheet }> = {
  'initial-alvaras': { title: 'Tratamento Inicial Alvarás', description: 'Organize colunas, áreas e unidades do arquivo bruto mensal.', icon: FileSpreadsheet },
  'initial-cvco': { title: 'Tratamento Inicial CVCO', description: 'Organize colunas, áreas, vistoria e unidades do arquivo bruto mensal.', icon: FileSpreadsheet },
  'consolidate-alvaras': { title: 'Alimentar base de Liberados', description: 'Acrescente o arquivo tratado à base acumulada e estenda as fórmulas.', icon: FilePlus2 },
  'consolidate-cvco': { title: 'Alimentar base de CVCO', description: 'Acrescente o arquivo tratado à base acumulada e estenda as fórmulas.', icon: FilePlus2 },
  'tabulate-alvaras': { title: 'Tabular Liberados', description: 'Gere as tabelas estatísticas a partir da base acumulada.', icon: FileSpreadsheet },
  'tabulate-cvco': { title: 'Tabular CVCO', description: 'Gere as tabelas estatísticas a partir da base acumulada.', icon: FileSpreadsheet },
  'report-alvaras': { title: 'Relatório Liberado', description: 'Preencha o template interno usando a tabulação de Liberados.', icon: FileSpreadsheet },
  'report-cvco': { title: 'Relatório Concluído', description: 'Preencha o template interno usando a tabulação de CVCO.', icon: FileSpreadsheet },
  'pdf-alvaras': { title: 'PDF final de Liberados', description: 'Una capa, mapa e o relatório exportado do Excel.', icon: FilePlus2 },
  'pdf-cvco': { title: 'PDF final de Concluídos', description: 'Una capa, mapa e o relatório exportado do Excel.', icon: FilePlus2 },
};

function stepKind(step: WorkflowStep): ReportKind { return step.endsWith('alvaras') ? 'alvaras' : 'cvco'; }

export default function SindusconCuritibaPage() {
  const [step, setStep] = useState<WorkflowStep | null>(null);
  const [report, setReport] = useState<ProcessedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [download, setDownload] = useState<{ blob: Blob; fileName: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function handleFile(file?: File) {
    if (!file || !step) return;
    if (!/\.xlsx$/i.test(file.name)) { setError('Aceitamos somente arquivos .xlsx. Se o arquivo for .xls, abra-o no Excel e use Salvar como → Pasta de Trabalho do Excel (.xlsx).'); return; }
    setError(null); setStartedAt(Date.now());
    try {
      const result = await processSindusconFile(file, stepKind(step));
      setReport(result.report);
      setDownload({ blob: result.blob, fileName: result.fileName });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível tratar esta planilha.'); }
    finally { setStartedAt(null); }
  }

  function choose(next: WorkflowStep) { setStep(next); setReport(null); setDownload(null); setError(null); }
  function leave() { setStep(null); setReport(null); setDownload(null); setError(null); }
  function downloadReport() {
    if (!download) return;
    const url = URL.createObjectURL(download.blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = download.fileName; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="min-h-full">
    <header className="border-b border-border bg-card px-5 py-6 sm:px-8"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Rebrain · Sinduscon</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Sinduscon - Curitiba</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Tratamento, consolidação mensal, tabulação estatística e atualização dos relatórios de alvarás e certificados de conclusão.</p></header>
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      {!step ? <div className="space-y-7">
        <WorkflowGroup title="1. Preparar arquivos do mês" steps={['initial-alvaras', 'initial-cvco']} onChoose={choose} />
        <WorkflowGroup title="2. Alimentar bases acumuladas" steps={['consolidate-alvaras', 'consolidate-cvco']} onChoose={choose} />
        <WorkflowGroup title="3. Gerar tabulações" steps={['tabulate-alvaras', 'tabulate-cvco']} onChoose={choose} />
        <WorkflowGroup title="4. Gerar relatórios finais" steps={['report-alvaras', 'report-cvco']} onChoose={choose} />
        <WorkflowGroup title="5. Compilar PDFs para entrega" steps={['pdf-alvaras', 'pdf-cvco']} onChoose={choose} />
      </div> : step.startsWith('consolidate-') ? <ConsolidationPanel kind={stepKind(step)} onLeave={leave} />
        : step.startsWith('tabulate-') ? <TabulationPanel kind={stepKind(step)} onLeave={leave} />
          : step.startsWith('report-') ? <FinalReportPanel kind={stepKind(step)} onLeave={leave} />
            : step.startsWith('pdf-') ? <PdfCompilationPanel kind={stepKind(step)} onLeave={leave} /> : <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tratamento inicial</p><h2 className="text-xl font-semibold">{COPY[step].title}</h2></div><Button variant="ghost" onClick={leave}>Voltar às etapas</Button></div>
        {!report && <Card className="border-dashed border-primary/30"><CardContent className="p-6 sm:p-10"><button type="button" className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-primary/[0.03]" onClick={() => input.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFile(event.dataTransfer.files[0]); }}><UploadCloud className="h-9 w-9 text-primary" /><p className="mt-4 font-medium">Arraste a planilha aqui ou selecione um arquivo</p><p className="mt-1 text-sm text-muted-foreground">Aceita arquivos .xlsx. Mês e ano são lidos do nome do arquivo.</p></button><input ref={input} className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleFile(event.target.files?.[0])} />{error && <Alert variant="destructive" className="mt-4"><AlertCircle /><AlertTitle>Não foi possível processar o arquivo</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}</CardContent></Card>}
        {report && <Result report={report} onDownload={downloadReport} onMonthly={() => choose(`consolidate-${report.kind}`)} onLeave={leave} />}
      </>}
      {startedAt !== null && <BrainLoadingState variant="overlay" startedAt={startedAt} title="Tratando planilha" description="Organizando colunas e identificando itens para revisão." />}
    </div>
  </div>;
}

function WorkflowGroup({ title, steps, onChoose }: { title: string; steps: WorkflowStep[]; onChoose: (step: WorkflowStep) => void }) {
  return <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2><div className="grid gap-5 md:grid-cols-2">{steps.map((step) => { const Icon = COPY[step].icon; return <Card key={step} className="border-primary/15 shadow-sm"><CardHeader><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><CardTitle className="mt-3 text-lg">{COPY[step].title}</CardTitle><CardDescription>{COPY[step].description}</CardDescription></CardHeader><CardContent><Button className="w-full" onClick={() => onChoose(step)}>Iniciar etapa <ArrowRight /></Button></CardContent></Card>; })}</div></section>;
}

function Result({ report, onDownload, onMonthly, onLeave }: { report: ProcessedReport; onDownload: () => void; onMonthly: () => void; onLeave: () => void }) {
  return <div className="space-y-5"><Card className="border-primary/20"><CardHeader><CardTitle className="text-lg">Planilha preparada</CardTitle><CardDescription>{report.fileName} · {report.month} de {report.year}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-x-8 gap-y-3 text-sm"><p><strong>{report.rows.length}</strong> linhas mantidas</p><p><strong>{report.rowsRemoved}</strong> linhas removidas</p><p><strong>{report.decisions.length}</strong> padronizações de unidades</p><p><strong>{report.reviews.length}</strong> itens para revisão humana</p></CardContent></Card>
    {report.reviews.length > 0 && <Alert><AlertCircle className="text-warning" /><AlertTitle>Revisão humana necessária</AlertTitle><AlertDescription>Há {report.reviews.length} casos de uso misto em faixa intermediária. Eles foram mantidos no arquivo para conferência.</AlertDescription></Alert>}
    <div className="flex flex-wrap gap-3"><Button onClick={onDownload}><Download /> Baixar Excel tratado</Button><Button variant="outline" onClick={onMonthly}>Seguir para atualização mensal <ArrowRight /></Button><Button variant="ghost" onClick={onLeave}>Sair</Button></div>
  </div>;
}
