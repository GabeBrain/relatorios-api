import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDownUp, BarChart3, Download, LockKeyhole, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { EmployeesApiError, generateEmployeeReport, loadAvailableYears, resolveRaisMunicipality } from '../api';
import { formatCurrency, formatInteger, formatPercentage, methodologyText } from '../domain';
import { downloadEmployeeWorkbook } from '../export-xlsx';
import type { EmployeeOccupationRow, EmployeeReport, EmployeeSectorRow, MunicipalityOption } from '../types';
import RaisMunicipalitySelector from './RaisMunicipalitySelector';

function SummaryCard({ label, value, description }: { label: string; value: string; description?: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}</CardContent></Card>;
}

function SalaryCell({ value }: { value: number | null }) { return <span>{formatCurrency(value)}</span>; }

function EmptyPanel({ text }: { text: string }) { return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>; }

function SectorsTable({ rows }: { rows: EmployeeSectorRow[] }) {
  if (!rows.length) return <EmptyPanel text="Nenhum setor foi retornado para este recorte." />;
  return <div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>Setor</TableHead><TableHead className="text-right">Empregados</TableHead><TableHead className="text-right">Participação</TableHead><TableHead className="text-right">Salário médio</TableHead><TableHead className="text-right">Salário mediano</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.code}><TableCell className="font-medium">{row.name}</TableCell><TableCell className="text-right">{formatInteger(row.employees)}</TableCell><TableCell className="text-right">{formatPercentage(row.percentage)}</TableCell><TableCell className="text-right"><SalaryCell value={row.averageSalary} /></TableCell><TableCell className="text-right"><SalaryCell value={row.medianSalary} /></TableCell></TableRow>)}</TableBody></Table></div>;
}

function OccupationsTable({ rows }: { rows: EmployeeOccupationRow[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'employees' | 'occupation' | 'code'>('employees');
  const parentRef = useRef<HTMLDivElement>(null);
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    const next = normalized ? rows.filter((row) => [row.code, row.majorGroup, row.family, row.occupation].some((value) => value.toLocaleLowerCase('pt-BR').includes(normalized))) : rows;
    return [...next].sort((a, b) => sort === 'employees' ? b.employees - a.employees : sort === 'code' ? a.code.localeCompare(b.code) : a.occupation.localeCompare(b.occupation, 'pt-BR'));
  }, [query, rows, sort]);
  const virtualizer = useVirtualizer({ count: filteredRows.length, getScrollElement: () => parentRef.current, estimateSize: () => 57, overscan: 8 });

  return <div className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ocupação, família, grupo ou CBO" className="pl-9" aria-label="Buscar ocupação" /></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{formatInteger(filteredRows.length)} de {formatInteger(rows.length)}</span><Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}><SelectTrigger aria-label="Ordenar ocupações" className="h-9 w-48 bg-card"><ArrowDownUp className="mr-2 h-3.5 w-3.5 text-primary" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="employees">Mais empregados</SelectItem><SelectItem value="occupation">Nome da ocupação</SelectItem><SelectItem value="code">Código CBO</SelectItem></SelectContent></Select></div></div><div ref={parentRef} className="h-[540px] overflow-auto rounded-lg border"><div className="min-w-[980px]"><Table><TableHeader className="sticky top-0 z-10 bg-card"><TableRow><TableHead>Grande grupo</TableHead><TableHead>Família</TableHead><TableHead>Ocupação</TableHead><TableHead>CBO</TableHead><TableHead className="text-right">Empregados</TableHead><TableHead className="text-right">Participação</TableHead><TableHead className="text-right">Médio</TableHead><TableHead className="text-right">Mediano</TableHead></TableRow></TableHeader></Table><div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>{virtualizer.getVirtualItems().map((item) => { const row = filteredRows[item.index]; return <div key={row.code + item.index} className="absolute left-0 top-0 grid w-full grid-cols-[1.25fr_1.35fr_1.5fr_100px_100px_100px_115px_115px] items-center border-b px-4 text-sm" style={{ height: `${item.size}px`, transform: `translateY(${item.start}px)` }}><div className="truncate pr-3" title={row.majorGroup}>{row.majorGroup}</div><div className="truncate pr-3" title={row.family}>{row.family}</div><div className="truncate pr-3 font-medium" title={row.occupation}>{row.occupation}</div><div>{row.code}</div><div className="text-right">{formatInteger(row.employees)}</div><div className="text-right">{formatPercentage(row.percentage)}</div><div className="text-right"><SalaryCell value={row.averageSalary} /></div><div className="text-right"><SalaryCell value={row.medianSalary} /></div></div>; })}</div></div></div></div>;
}

function ReportResult({ report, onExport }: { report: EmployeeReport; onExport: () => void }) {
  const status = report.meta.cacheHit ? 'Resultado reutilizado do cache compartilhado' : 'Consulta agregada concluída';
  return <section className="space-y-5 animate-fade-in" aria-label="Resultado do relatório">
    <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-semibold">{report.meta.municipality.name}/{report.meta.municipality.uf} · RAIS {report.meta.year}</h2><p className="mt-1 text-xs text-muted-foreground">{report.meta.referenceDate} · {status} · {report.meta.source}</p></div>
      <Button variant="outline" onClick={onExport}><Download /> Exportar XLSX</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><SummaryCard label="Vínculos ativos" value={formatInteger(report.summary.totalEmployees)} description="em 31 de dezembro" /><SummaryCard label="Setores" value={formatInteger(report.sectors.length)} description="categorias retornadas" /><SummaryCard label="Ocupações" value={formatInteger(report.occupations.length)} description="CBO 2002" /><SummaryCard label="Remuneração mediana" value={formatCurrency(report.summary.medianSalary)} description="valores positivos" /></div>
    <Tabs defaultValue="overview"><TabsList className="h-auto flex-wrap"><TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="sectors">Setores ({formatInteger(report.sectors.length)})</TabsTrigger><TabsTrigger value="occupations">Ocupações ({formatInteger(report.occupations.length)})</TabsTrigger><TabsTrigger value="methodology">Metodologia</TabsTrigger></TabsList><TabsContent value="overview" className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Leitura rápida</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">Remuneração média</p><p className="mt-1 font-medium">{formatCurrency(report.summary.averageSalary)}</p></div><div><p className="text-xs text-muted-foreground">Salário ausente ou zero</p><p className="mt-1 font-medium">{formatInteger(report.summary.salaryMissingOrZero)}</p></div><div><p className="text-xs text-muted-foreground">CBO ausente</p><p className="mt-1 font-medium">{formatInteger(report.summary.missingCbo)}</p></div><div><p className="text-xs text-muted-foreground">Vínculos no ano, sem filtro ativo</p><p className="mt-1 font-medium">{formatInteger(report.summary.totalLinksInYear)}</p></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Como interpretar</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">Este relatório conta vínculos formais ativos, não pessoas únicas. Uma pessoa pode ter mais de um vínculo. Salários ausentes ou zero permanecem no total, mas não entram nos indicadores de remuneração.</CardContent></Card></TabsContent><TabsContent value="sectors"><SectorsTable rows={report.sectors} /></TabsContent><TabsContent value="occupations"><OccupationsTable rows={report.occupations} /></TabsContent><TabsContent value="methodology"><Card><CardContent className="p-5"><ul className="space-y-3 text-sm leading-6 text-muted-foreground">{methodologyText(report).map((line) => <li key={line} className="border-b border-border pb-3 last:border-0">{line}</li>)}</ul></CardContent></Card></TabsContent></Tabs>
  </section>;
}

export default function EmployeesReportWorkspace() {
  const [scope, setScope] = useState({ uf: '', city: '' });
  const [municipality, setMunicipality] = useState<MunicipalityOption | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState('');
  const [report, setReport] = useState<EmployeeReport | null>(null);
  const [loadingMunicipality, setLoadingMunicipality] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setMunicipality(null); setYear(''); setYears([]); setReport(null);
    if (!scope.uf || !scope.city) { setLoadingMunicipality(false); return () => { active = false; }; }
    setLoadingMunicipality(true); setError(null);
    resolveRaisMunicipality({ name: scope.city, uf: scope.uf }).then((resolved) => {
      if (!active) return;
      setMunicipality(resolved);
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Não foi possível preparar o município.'); }).finally(() => { if (active) setLoadingMunicipality(false); });
    return () => { active = false; };
  }, [scope.uf, scope.city]);

  useEffect(() => {
    if (!municipality) return;
    let active = true;
    setLoadingYears(true);
    loadAvailableYears().then((data) => { if (active) { setYears(data); setYear(String(data[0] ?? '')); } }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar os anos RAIS disponíveis.'); }).finally(() => { if (active) setLoadingYears(false); });
    return () => { active = false; };
  }, [municipality?.ibgeCode]);

  async function handleGenerate() {
    if (!municipality || !year) { setError('Escolha um município e o ano RAIS antes de gerar.'); return; }
    setError(null); setGenerationStartedAt(Date.now()); setLoadingReport(true);
    try { setReport(await generateEmployeeReport({ municipality, year: Number(year) })); toast.success('Relatório de empregados gerado.'); }
    catch (err) { const apiError = err instanceof EmployeesApiError ? err : null; setError(apiError?.message ?? 'Não foi possível gerar o relatório.'); }
    finally { setLoadingReport(false); setGenerationStartedAt(null); }
  }

  async function handleExport() { if (!report) return; const filename = await downloadEmployeeWorkbook(report); toast.success(`Arquivo exportado: ${filename}`); }

  return <section className="space-y-5"><Card className="border-primary/15 shadow-sm"><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end"><RaisMunicipalitySelector uf={scope.uf} city={scope.city} onChange={setScope} disabled={loadingReport} /><div className="w-full space-y-1.5 lg:w-52"><Label htmlFor="employee-year">Ano RAIS</Label><Select value={year} onValueChange={(value) => { setYear(value); setReport(null); }} disabled={!municipality || loadingMunicipality || loadingYears || years.length === 0 || loadingReport}><SelectTrigger id="employee-year"><SelectValue placeholder={loadingMunicipality ? 'Preparando município…' : loadingYears ? 'Carregando anos…' : !scope.city ? 'Escolha o município' : 'Selecione o ano'} /></SelectTrigger><SelectContent>{years.map((item, index) => <SelectItem key={item} value={String(item)}>{item}{index === 0 ? ' — mais recente' : ''}</SelectItem>)}</SelectContent></Select></div><Button onClick={handleGenerate} disabled={loadingReport || !municipality || !year}>{loadingReport ? <><BarChart3 /> Gerando relatório…</> : <><BarChart3 /> Gerar relatório</>}</Button></div>{municipality && <p className="mt-3 text-xs text-muted-foreground">Município RAIS · código IBGE: {municipality.ibgeCode}</p>}{loadingMunicipality && <BrainLoadingState variant="field" title="Confirmando município na RAIS" className="mt-3" />}{loadingYears && !loadingMunicipality && <BrainLoadingState variant="field" title="Preparando anos disponíveis" className="mt-3" />}</CardContent></Card>
    <Alert><LockKeyhole className="h-4 w-4" /><AlertTitle>Consulta protegida</AlertTitle><AlertDescription>O Bearer GeoBrain protege a geração do relatório; ele não limita os municípios disponíveis na RAIS.</AlertDescription></Alert>
    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription className="flex items-center justify-between gap-3">{error}<Button variant="outline" size="sm" onClick={() => setError(null)}>Fechar</Button></AlertDescription></Alert>}
    {loadingReport && <div className="space-y-4"><BrainLoadingState title="Consultando vínculos, setores e ocupações" description="Essa consulta pode levar alguns instantes." startedAt={generationStartedAt} /><div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></div>}
    {report && !loadingReport && <ReportResult report={report} onExport={handleExport} />}
  </section>;
}
