import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BarChart3, Building2, Download, Loader2, LockKeyhole, Search, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth-store';
import { useVirtualizer } from '@tanstack/react-virtual';
import { disabledCompanyReportProvider } from '../companies';
import { generateEmployeeReport, loadAvailableYears, loadMunicipalities, EmployeesApiError } from '../api';
import { downloadEmployeeWorkbook } from '../export-xlsx';
import { formatCurrency, formatInteger, formatPercentage, methodologyText } from '../domain';
import type { EmployeeOccupationRow, EmployeeReport, EmployeeSectorRow, MunicipalityOption } from '../types';

const UF_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

function SummaryCard({ label, value, description }: { label: string; value: string; description?: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}</CardContent></Card>;
}

function SalaryCell({ value }: { value: number | null }) { return <span>{formatCurrency(value)}</span>; }

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

  return <div className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ocupação, família, grupo ou CBO" className="pl-9" aria-label="Buscar ocupação" /></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{formatInteger(filteredRows.length)} de {formatInteger(rows.length)}</span><select aria-label="Ordenar ocupações" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"><option value="employees">Mais empregados</option><option value="occupation">Nome da ocupação</option><option value="code">Código CBO</option></select></div></div><div ref={parentRef} className="h-[540px] overflow-auto rounded-lg border"><div className="min-w-[980px]"><Table><TableHeader className="sticky top-0 z-10 bg-card"><TableRow><TableHead>Grande grupo</TableHead><TableHead>Família</TableHead><TableHead>Ocupação</TableHead><TableHead>CBO</TableHead><TableHead className="text-right">Empregados</TableHead><TableHead className="text-right">Participação</TableHead><TableHead className="text-right">Médio</TableHead><TableHead className="text-right">Mediano</TableHead></TableRow></TableHeader></Table><div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>{virtualizer.getVirtualItems().map((item) => { const row = filteredRows[item.index]; return <div key={row.code + item.index} className="absolute left-0 top-0 grid w-full grid-cols-[1.25fr_1.35fr_1.5fr_100px_100px_100px_115px_115px] items-center border-b px-4 text-sm" style={{ height: `${item.size}px`, transform: `translateY(${item.start}px)` }}><div className="truncate pr-3" title={row.majorGroup}>{row.majorGroup}</div><div className="truncate pr-3" title={row.family}>{row.family}</div><div className="truncate pr-3 font-medium" title={row.occupation}>{row.occupation}</div><div>{row.code}</div><div className="text-right">{formatInteger(row.employees)}</div><div className="text-right">{formatPercentage(row.percentage)}</div><div className="text-right"><SalaryCell value={row.averageSalary} /></div><div className="text-right"><SalaryCell value={row.medianSalary} /></div></div>; })}</div></div></div></div>;
}

function EmptyPanel({ text }: { text: string }) { return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>; }

export default function EmpresasEmpregadosPage() {
  const hasToken = useAuthStore((state) => state.hasValidToken());
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedUf, setSelectedUf] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityOption | null>(null);
  const [municipalitySearch, setMunicipalitySearch] = useState('');
  const [year, setYear] = useState('');
  const [report, setReport] = useState<EmployeeReport | null>(null);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingMunicipalities(true);
    loadMunicipalities().then((data) => { if (active) setMunicipalities(data); }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Falha ao carregar municípios.'); }).finally(() => { if (active) setLoadingMunicipalities(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hasToken) { setYears([]); setYear(''); return; }
    let active = true;
    setLoadingYears(true);
    loadAvailableYears().then((data) => { if (active) { setYears(data); setYear((current) => current || String(data[0] ?? '')); } }).catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar os anos disponíveis.'); }).finally(() => { if (active) setLoadingYears(false); });
    return () => { active = false; };
  }, [hasToken]);

  const ufs = useMemo(() => [...new Set(municipalities.map((item) => item.uf))].sort(), [municipalities]);
  const filteredMunicipalities = useMemo(() => municipalities.filter((item) => item.uf === selectedUf && item.name.toLocaleLowerCase('pt-BR').includes(municipalitySearch.trim().toLocaleLowerCase('pt-BR'))).slice(0, 80), [municipalities, municipalitySearch, selectedUf]);

  function changeUf(value: string) { setSelectedUf(value); setSelectedMunicipality(null); setMunicipalitySearch(''); setReport(null); }
  function selectMunicipality(value: MunicipalityOption) { setSelectedMunicipality(value); setMunicipalitySearch(value.name); setReport(null); }

  async function handleGenerate() {
    if (!hasToken) { setError('Faça login no menu lateral para gerar um relatório.'); return; }
    if (!selectedMunicipality || !year) { setError('Escolha UF, município e ano antes de gerar.'); return; }
    setError(null); setLoadingReport(true);
    try { setReport(await generateEmployeeReport({ municipality: selectedMunicipality, year: Number(year) })); toast.success('Relatório de empregados gerado.'); }
    catch (err) { const apiError = err instanceof EmployeesApiError ? err : null; setError(apiError?.message ?? 'Não foi possível gerar o relatório.'); }
    finally { setLoadingReport(false); }
  }

  async function handleExport() { if (!report) return; const filename = await downloadEmployeeWorkbook(report); toast.success(`Arquivo exportado: ${filename}`); }

  return <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8 lg:p-10 animate-fade-in"><header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:flex-row lg:items-start lg:justify-between"><div><div className="mb-3 flex flex-wrap items-center gap-2"><Badge className="bg-primary/10 text-primary hover:bg-primary/10">Rebrain</Badge><Badge variant="outline">Dados agregados</Badge></div><h1 className="text-3xl font-semibold tracking-tight">Empresas e Empregados</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Explore o emprego formal por município e ano. Começamos pelos vínculos ativos da RAIS, com a mesma estrutura das referências de Blumenau e Rio Verde.</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4" /> Bearer GeoBrain</div></header>

    <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.15fr]" aria-label="Escolha do relatório"><Card className="border-primary/40 bg-primary/5"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-primary" /> Empregados <Badge className="ml-auto">Disponível</Badge></CardTitle></CardHeader><CardContent><p className="text-xs leading-5 text-muted-foreground">Vínculos formais ativos em 31 de dezembro, por setores, ocupações e remuneração.</p></CardContent></Card><Card className="border-dashed opacity-70"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" /> Empresas <Badge variant="outline" className="ml-auto">Em preparação</Badge></CardTitle></CardHeader><CardContent><p className="text-xs leading-5 text-muted-foreground">Estabelecimentos, matriz/filial e porte serão ativados em uma etapa futura.</p></CardContent></Card><div className="space-y-1.5"><Label htmlFor="employee-uf">UF</Label><Select value={selectedUf} onValueChange={changeUf}><SelectTrigger id="employee-uf" disabled={loadingMunicipalities}><SelectValue placeholder={loadingMunicipalities ? 'Carregando UFs…' : 'Selecione a UF'} /></SelectTrigger><SelectContent>{ufs.map((uf) => <SelectItem key={uf} value={uf}>{uf} — {UF_NAMES[uf] ?? uf}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label htmlFor="employee-year">Ano RAIS</Label><Select value={year} onValueChange={(value) => { setYear(value); setReport(null); }} disabled={!hasToken || loadingYears || years.length === 0}><SelectTrigger id="employee-year"><SelectValue placeholder={!hasToken ? 'Faça login primeiro' : loadingYears ? 'Carregando anos…' : 'Selecione o ano'} /></SelectTrigger><SelectContent>{years.map((item, index) => <SelectItem key={item} value={String(item)}>{item}{index === 0 ? ' — mais recente' : ''}</SelectItem>)}</SelectContent></Select></div></section>

    <section className="rounded-xl border border-border bg-card p-4 sm:p-5"><div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><div className="space-y-1.5"><Label htmlFor="employee-municipality">Município</Label><div className="relative"><Input id="employee-municipality" value={municipalitySearch} onChange={(event) => { setMunicipalitySearch(event.target.value); if (selectedMunicipality?.name !== event.target.value) setSelectedMunicipality(null); }} disabled={!selectedUf || loadingMunicipalities} placeholder={selectedUf ? 'Digite para buscar um município' : 'Selecione a UF primeiro'} autoComplete="off" />{municipalitySearch && <button type="button" className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => { setMunicipalitySearch(''); setSelectedMunicipality(null); }} aria-label="Limpar município"><X className="h-4 w-4" /></button>}</div>{selectedUf && municipalitySearch && !selectedMunicipality && <div className="mt-1 max-h-56 overflow-auto rounded-md border bg-popover p-1 shadow-md" role="listbox" aria-label="Municípios encontrados">{filteredMunicipalities.length ? filteredMunicipalities.map((item) => <button type="button" role="option" key={item.ibgeCode} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => selectMunicipality(item)}>{item.name}</button>) : <p className="p-3 text-sm text-muted-foreground">Nenhum município encontrado.</p>}</div>}{selectedMunicipality && <p className="mt-1 text-xs text-muted-foreground">Código IBGE: {selectedMunicipality.ibgeCode}</p>}</div><Button onClick={handleGenerate} disabled={loadingReport || !hasToken || !selectedMunicipality || !year}>{loadingReport ? <><Loader2 className="animate-spin" /> Gerando…</> : <><BarChart3 /> Gerar relatório de empregados</>}</Button></div></section>

    {!hasToken && <Alert><LockKeyhole className="h-4 w-4" /><AlertTitle>Login necessário</AlertTitle><AlertDescription>Use o bloco de autenticação no menu lateral. O token GeoBrain limita o acesso à consulta; ele não é enviado ao BigQuery.</AlertDescription></Alert>}
    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription className="flex items-center justify-between gap-3">{error}<Button variant="outline" size="sm" onClick={() => setError(null)}>Fechar</Button></AlertDescription></Alert>}

    {loadingReport && <div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}
    {report && !loadingReport && <ReportResult report={report} onExport={handleExport} />}
  </div>;
}

function ReportResult({ report, onExport }: { report: EmployeeReport; onExport: () => void }) {
  return <section className="space-y-5" aria-label="Resultado do relatório"><div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">{report.meta.municipality.name}/{report.meta.municipality.uf} · RAIS {report.meta.year}</h2><p className="mt-1 text-xs text-muted-foreground">{report.meta.referenceDate} · {report.meta.cacheHit ? 'resultado reutilizado do cache compartilhado' : 'consulta agregada concluída'} · {report.meta.source}</p></div><Button variant="outline" onClick={onExport}><Download /> Exportar XLSX</Button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><SummaryCard label="Vínculos ativos" value={formatInteger(report.summary.totalEmployees)} description="em 31 de dezembro" /><SummaryCard label="Setores" value={formatInteger(report.sectors.length)} description="categorias retornadas" /><SummaryCard label="Ocupações" value={formatInteger(report.occupations.length)} description="CBO 2002" /><SummaryCard label="Remuneração mediana" value={formatCurrency(report.summary.medianSalary)} description="valores positivos" /></div><Tabs defaultValue="overview"><TabsList className="h-auto flex-wrap"><TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="sectors">Setores ({formatInteger(report.sectors.length)})</TabsTrigger><TabsTrigger value="occupations">Ocupações ({formatInteger(report.occupations.length)})</TabsTrigger><TabsTrigger value="methodology">Metodologia</TabsTrigger></TabsList><TabsContent value="overview" className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Leitura rápida</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">Remuneração média</p><p className="mt-1 font-medium">{formatCurrency(report.summary.averageSalary)}</p></div><div><p className="text-xs text-muted-foreground">Salário ausente ou zero</p><p className="mt-1 font-medium">{formatInteger(report.summary.salaryMissingOrZero)}</p></div><div><p className="text-xs text-muted-foreground">CBO ausente</p><p className="mt-1 font-medium">{formatInteger(report.summary.missingCbo)}</p></div><div><p className="text-xs text-muted-foreground">Vínculos no ano, sem filtro ativo</p><p className="mt-1 font-medium">{formatInteger(report.summary.totalLinksInYear)}</p></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Como interpretar</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">Este relatório conta vínculos formais ativos, não pessoas únicas. Uma pessoa pode ter mais de um vínculo. Salários ausentes ou zero permanecem no total, mas não entram nos indicadores de remuneração.</CardContent></Card></TabsContent><TabsContent value="sectors"><SectorsTable rows={report.sectors} /></TabsContent><TabsContent value="occupations"><OccupationsTable rows={report.occupations} /></TabsContent><TabsContent value="methodology"><Card><CardContent className="p-5"><ul className="space-y-3 text-sm leading-6 text-muted-foreground">{methodologyText(report).map((line) => <li key={line} className="border-b border-border pb-3 last:border-0">{line}</li>)}</ul></CardContent></Card></TabsContent></Tabs></section>;
}

void disabledCompanyReportProvider;
