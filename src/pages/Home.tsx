import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  BarChart2,
  Plug,
  Database,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useArchiveStore } from '@/features/corretor/store/archive-store';
import { useAuthStore } from '@/store/auth-store';
import { fetchActivity } from '@/lib/activity-log';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  {
    to: '/auditoria',
    icon: <ClipboardList className="h-5 w-5" />,
    title: 'Nova auditoria',
    desc: 'Analisar um estudo vocacional no Corretor',
  },
  {
    to: '/relatorios/secovi',
    icon: <BarChart2 className="h-5 w-5" />,
    title: 'Relatório Secovi',
    desc: 'Gerar relatório de mercado com export Excel',
  },
  {
    to: '/apis/explorer',
    icon: <Plug className="h-5 w-5" />,
    title: 'API Explorer',
    desc: 'Documentação + console das APIs GeoBrain e Sócio',
  },
  {
    to: '/qualidade/cid/validacao-base',
    icon: <Database className="h-5 w-5" />,
    title: 'Qualidade de dados',
    desc: 'Validações por cliente: Piemonte e CID',
  },
];

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold font-heading tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function Home() {
  const { projects, loading, loadProjects } = useArchiveStore();
  const { hasValidToken, expiryLabel } = useAuthStore();

  useEffect(() => {
    if (projects.length === 0) loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: activity } = useQuery({
    queryKey: ['activity-log'],
    queryFn: () => fetchActivity(8),
  });

  const totalErrors = projects.reduce((acc, p) => acc + p.totalErrors, 0);
  const totalCost = projects.reduce((acc, p) => acc + p.totalCost, 0);
  const tokenOk = hasValidToken();

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Brain API Studio</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do Studio — o que aconteceu e o que precisa de você.
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
            tokenOk ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          )}
        >
          ● {tokenOk ? `Token API válido · expira ${expiryLabel()}` : 'Token API ausente ou expirado'}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Auditorias salvas"
          value={loading ? '…' : String(projects.length)}
          sub={projects[0] ? `última: ${projects[0].projectName}` : 'nenhuma ainda'}
        />
        <KpiCard
          label="Erros encontrados"
          value={loading ? '…' : String(totalErrors)}
          sub="total acumulado no Corretor"
        />
        <KpiCard
          label="Custo IA acumulado"
          value={loading ? '…' : `US$ ${totalCost.toFixed(2)}`}
          sub="análises de slides (OpenAI)"
        />
        <KpiCard
          label="Testes de qualidade"
          value="3"
          sub="Piemonte ×2 · CID ×1"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick access */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Acesso rápido</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {QUICK_LINKS.map((q) => (
              <Link
                key={q.to + q.title}
                to={q.to}
                className="group rounded-xl border border-border bg-card p-4 space-y-1.5 transition-colors hover:border-primary/50"
              >
                <span className="text-primary">{q.icon}</span>
                <p className="text-sm font-semibold flex items-center gap-1">
                  {q.title}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </p>
                <p className="text-xs text-muted-foreground">{q.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Atividade recente */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Atividade recente
            {activity && activity.length > 0 && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                log por IP
              </span>
            )}
          </h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {activity && activity.length > 0 ? (
              activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{a.action}</span>
                    {a.detail && <span className="text-muted-foreground"> — {a.detail}</span>}
                  </span>
                  {a.ip && <span className="font-mono text-[11px] text-muted-foreground shrink-0">{a.ip}</span>}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))
            ) : projects.length > 0 ? (
              projects.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">Auditoria salva</span>
                    <span className="text-muted-foreground"> — {p.projectName} ({p.totalErrors} erros)</span>
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(p.savedAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Sem atividade registrada ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
