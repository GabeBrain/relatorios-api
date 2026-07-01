export default function DashboardGeobrain() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Geobrain</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada de mercado com KPIs, matriz IVV e cortes analíticos.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Página em construção. Em breve serão exibidos os cartões de KPI, a matriz de IVV por
          bairro × dormitórios e os cortes por padrão construtivo e tipologia.
        </p>
      </div>
    </div>
  );
}
