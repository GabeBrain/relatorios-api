import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateEmployeeHistory } from '../api';
import { formatInteger, formatPercentage } from '../domain';
import type { EmployeeHistoryReport, MunicipalityOption } from '../types';

interface Props { municipality: MunicipalityOption; }

function historySummary(history: EmployeeHistoryReport) {
  const first = history.points[0];
  const last = history.points.at(-1)!;
  const change = last.activeEmployees - first.activeEmployees;
  return { first, last, change, growth: first.activeEmployees > 0 ? change / first.activeEmployees : null };
}

function HistoryMetrics({ history }: { history: EmployeeHistoryReport }) {
  const summary = historySummary(history);
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div><p className="text-xs text-muted-foreground">Primeiro ano disponível</p><p className="mt-1 font-medium">{summary.first.year} · {formatInteger(summary.first.activeEmployees)}</p></div>
    <div><p className="text-xs text-muted-foreground">Último ano disponível</p><p className="mt-1 font-medium">{summary.last.year} · {formatInteger(summary.last.activeEmployees)}</p></div>
    <div><p className="text-xs text-muted-foreground">Variação no período</p><p className="mt-1 font-medium">{summary.change >= 0 ? '+' : ''}{formatInteger(summary.change)}</p></div>
    <div><p className="text-xs text-muted-foreground">Crescimento acumulado</p><p className="mt-1 font-medium">{formatPercentage(summary.growth)}</p></div>
  </div>;
}

export default function EmployeeHistoryPanel({ municipality }: Props) {
  const [history, setHistory] = useState<EmployeeHistoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const chartData = useMemo(() => history?.points.map((point) => ({ year: point.year, activeEmployees: point.activeEmployees })) ?? [], [history]);

  useEffect(() => {
    setHistory(null);
    setLoading(false);
    setStartedAt(null);
  }, [municipality.ibgeCode]);

  async function loadHistory() {
    setLoading(true); setStartedAt(Date.now());
    try {
      const next = await generateEmployeeHistory(municipality);
      setHistory(next);
      toast.success(next.meta.cacheHit ? 'Evolução histórica reutilizada do cache.' : 'Evolução histórica carregada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a evolução histórica.');
    } finally { setLoading(false); setStartedAt(null); }
  }

  if (!history) return <Card className="border-primary/15"><CardHeader><CardTitle className="text-base">Evolução histórica</CardTitle><CardDescription>Vínculos formais ativos em 31 de dezembro, de 1985 ao último ano RAIS publicado.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">A primeira consulta é agregada por município e fica disponível para todos os usuários pelo cache compartilhado.</p><Button variant="outline" onClick={loadHistory} disabled={loading}><TrendingUp /> Carregar evolução 1985–2025</Button></CardContent>{loading && <BrainLoadingState variant="overlay" title="Preparando evolução histórica" description="Consultando vínculos anuais agregados." startedAt={startedAt} />}</Card>;

  return <Card className="border-primary/15"><CardHeader><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-base">Evolução histórica</CardTitle><CardDescription>{history.meta.firstYear}–{history.meta.lastYear} · {history.meta.cacheHit ? 'resultado reutilizado do cache compartilhado' : 'consulta agregada concluída'}</CardDescription></div><Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}><TrendingUp /> Carregar novamente</Button></div></CardHeader><CardContent className="space-y-5"><HistoryMetrics history={history} /><div className="h-72 w-full" role="img" aria-label={`Evolução dos vínculos ativos de ${history.meta.firstYear} a ${history.meta.lastYear}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" minTickGap={28} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} /><YAxis tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 12 }} /><Tooltip formatter={(value: number) => [formatInteger(value), 'Vínculos ativos']} labelFormatter={(label) => `Ano ${label}`} /><Line type="monotone" dataKey="activeEmployees" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div><p className="text-xs leading-5 text-muted-foreground">A série conta vínculos ativos, não pessoas únicas. Ela não inclui salários, setores ou ocupações históricos nesta versão.</p></CardContent>{loading && <BrainLoadingState variant="overlay" title="Atualizando evolução histórica" description="Consultando vínculos anuais agregados." startedAt={startedAt} />}</Card>;
}
