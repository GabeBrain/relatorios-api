import { useMemo, useState } from 'react';
import { BarChart2, Building2, TrendingUp, Package, DollarSign, Timer, Layers, Activity, Search } from 'lucide-react';
import { brlCompact, intFmt, ivvColorStyle, m2, months, pctRaw } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Mock data — placeholder até plugarmos as APIs Geobrain reais.       */
/* Substituir por hook useDashboardData(city, periodo) na próxima etapa.*/
/* ------------------------------------------------------------------ */

const CITIES = ['Curitiba', 'Joinville'];
const PERIODS = [
  { value: '12', label: 'Últimos 12 meses' },
  { value: '24', label: 'Últimos 24 meses' },
  { value: '36', label: 'Últimos 36 meses' },
  { value: 'acc', label: 'Acumulado' },
];

const KPIS_MOCK = {
  Empreendimentos: 812,
  EmpreendimentosAtivos: 214,
  LancamentosAcumulados: 18450,
  VgvLancamentoAcc: 12_400_000_000,
  Estoque: 4820,
  VgvEstoque: 3_150_000_000,
  IVV: 0.084,
  TempoEstoqueIVV: 11.8,
};

const DORM_COLS = ['0 dorms', '1 dorm', '2 dorms', '3 dorms', '4 dorms'] as const;

const BAIRROS_MOCK: { bairro: string; ivv: (number | null)[] }[] = [
  { bairro: 'Água Verde',      ivv: [0.14, 0.11, 0.09, 0.06, 0.03] },
  { bairro: 'Batel',           ivv: [null, 0.12, 0.08, 0.05, 0.02] },
  { bairro: 'Bigorrilho',      ivv: [0.10, 0.09, 0.07, 0.05, 0.04] },
  { bairro: 'Cabral',          ivv: [null, 0.13, 0.10, 0.07, null] },
  { bairro: 'Cajuru',          ivv: [null, 0.18, 0.16, 0.09, null] },
  { bairro: 'Campo Comprido',  ivv: [null, 0.15, 0.12, 0.08, null] },
  { bairro: 'Centro',          ivv: [0.17, 0.14, 0.10, 0.06, 0.03] },
  { bairro: 'Cristo Rei',      ivv: [null, 0.11, 0.09, 0.05, null] },
  { bairro: 'Ecoville',        ivv: [null, 0.08, 0.06, 0.04, 0.02] },
  { bairro: 'Jardim Botânico', ivv: [null, 0.16, 0.11, 0.07, null] },
  { bairro: 'Juvevê',          ivv: [null, 0.12, 0.10, 0.06, null] },
  { bairro: 'Mercês',          ivv: [null, 0.10, 0.09, 0.06, null] },
  { bairro: 'Novo Mundo',      ivv: [null, 0.19, 0.15, 0.10, null] },
  { bairro: 'Portão',          ivv: [null, 0.14, 0.12, 0.08, null] },
  { bairro: 'Rebouças',        ivv: [0.13, 0.12, 0.09, 0.06, null] },
  { bairro: 'Santa Felicidade',ivv: [null, 0.13, 0.11, 0.08, null] },
];

const CORTE_PADRAO_MOCK = [
  { key: 'Comercial',  AreaMediaEstoque: 42,  PrecoM2Estoque: 12800, Estoque: 620,  VgvEstoque: 320_000_000, LancamentosAcc: 2400, PrecoM2Tipo: 12100, VgvLancAcc: 1_050_000_000, PrecoUnit: 550_000 },
  { key: 'Horizontal', AreaMediaEstoque: 180, PrecoM2Estoque: 9400,  Estoque: 410,  VgvEstoque: 680_000_000, LancamentosAcc: 1800, PrecoM2Tipo: 8900,  VgvLancAcc: 1_950_000_000, PrecoUnit: 1_690_000 },
  { key: 'Vertical',   AreaMediaEstoque: 78,  PrecoM2Estoque: 11200, Estoque: 3790, VgvEstoque: 2_150_000_000, LancamentosAcc: 14250, PrecoM2Tipo: 10700, VgvLancAcc: 9_400_000_000, PrecoUnit: 890_000 },
];

const CORTE_DORM_MOCK = [
  { key: '0 dorms',   VgvLancAcc: 480_000_000,  VgvEstoque: 120_000_000, PrecoM2Estoque: 13100, PrecoUnit: 380_000,   PrecoM2Tipo: 12800, LancamentosAcc: 1900, Estoque: 320,  PctVendida: 0.83, DispSobreOferta: 0.17 },
  { key: '1 dorm',    VgvLancAcc: 1_680_000_000,VgvEstoque: 410_000_000, PrecoM2Estoque: 12400, PrecoUnit: 520_000,   PrecoM2Tipo: 12000, LancamentosAcc: 4200, Estoque: 780,  PctVendida: 0.81, DispSobreOferta: 0.19 },
  { key: '2 dorms',   VgvLancAcc: 4_120_000_000,VgvEstoque: 980_000_000, PrecoM2Estoque: 10800, PrecoUnit: 720_000,   PrecoM2Tipo: 10500, LancamentosAcc: 7800, Estoque: 1650, PctVendida: 0.79, DispSobreOferta: 0.21 },
  { key: '3 dorms',   VgvLancAcc: 3_950_000_000,VgvEstoque: 1_050_000_000, PrecoM2Estoque: 10200, PrecoUnit: 1_120_000, PrecoM2Tipo: 9950,  LancamentosAcc: 3400, Estoque: 1200, PctVendida: 0.65, DispSobreOferta: 0.35 },
  { key: '4 dorms',   VgvLancAcc: 1_320_000_000,VgvEstoque: 380_000_000, PrecoM2Estoque: 11400, PrecoUnit: 1_780_000, PrecoM2Tipo: 11100, LancamentosAcc: 720,  Estoque: 240,  PctVendida: 0.67, DispSobreOferta: 0.33 },
  { key: 'Cobertura', VgvLancAcc: 850_000_000,  VgvEstoque: 210_000_000, PrecoM2Estoque: 15200, PrecoUnit: 2_640_000, PrecoM2Tipo: 14800, LancamentosAcc: 430,  Estoque: 130,  PctVendida: 0.70, DispSobreOferta: 0.30 },
];

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-primary/70">{icon}</span>
      </div>
      <div className="mt-2 font-heading text-xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SectionCard({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function DashboardGeobrain() {
  const [city, setCity] = useState('Curitiba');
  const [periodo, setPeriodo] = useState('acc');
  const [bairroQuery, setBairroQuery] = useState('');
  const [sortByIvv, setSortByIvv] = useState(false);

  const filteredBairros = useMemo(() => {
    const q = bairroQuery.trim().toLowerCase();
    let rows = BAIRROS_MOCK.filter((b) => (q ? b.bairro.toLowerCase().includes(q) : true));
    if (sortByIvv) {
      rows = [...rows].sort((a, b) => {
        const avg = (r: typeof a) => {
          const vals = r.ivv.filter((x): x is number => x != null);
          return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        };
        return avg(b) - avg(a);
      });
    } else {
      rows = [...rows].sort((a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR'));
    }
    return rows;
  }, [bairroQuery, sortByIvv]);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard Geobrain</h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada de mercado: KPIs, matriz IVV por bairro × tipologia e cortes analíticos.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent-foreground">
          <Activity className="h-3 w-3" /> Dados de demonstração
        </div>
      </header>

      {/* Filters */}
      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cidade</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Período</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="ml-auto h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Atualizar
        </button>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Building2 className="h-4 w-4" />} label="Empreendimentos"        value={intFmt(KPIS_MOCK.Empreendimentos)} />
        <Kpi icon={<Building2 className="h-4 w-4" />} label="Empreendimentos ativos" value={intFmt(KPIS_MOCK.EmpreendimentosAtivos)} />
        <Kpi icon={<Layers   className="h-4 w-4" />} label="Oferta lançada"         value={intFmt(KPIS_MOCK.LancamentosAcumulados)} hint="unidades acumuladas" />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="VGV lançado"           value={brlCompact(KPIS_MOCK.VgvLancamentoAcc)} />
        <Kpi icon={<Package  className="h-4 w-4" />} label="Estoque"                value={intFmt(KPIS_MOCK.Estoque)} hint="unidades disponíveis" />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="VGV estoque"           value={brlCompact(KPIS_MOCK.VgvEstoque)} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="IVV"                   value={pctRaw(KPIS_MOCK.IVV * 100)} hint="velocidade de vendas" />
        <Kpi icon={<Timer    className="h-4 w-4" />} label="Tempo de estoque"      value={months(KPIS_MOCK.TempoEstoqueIVV)} />
      </div>

      {/* IVV Heatmap */}
      <SectionCard
        title="Mapa de Oportunidades — IVV por bairro × dormitórios"
        subtitle="Escala fixa 0–20%. Verde = vendas lentas · Vermelho = vendas rápidas."
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={bairroQuery}
                onChange={(e) => setBairroQuery(e.target.value)}
                placeholder="Buscar bairro"
                className="h-8 w-44 rounded-md border border-input bg-background pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="button"
              onClick={() => setSortByIvv((v) => !v)}
              className={cn(
                'h-8 rounded-md border px-2.5 text-xs font-medium transition-colors',
                sortByIvv
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-muted-foreground hover:bg-accent/40 hover:text-foreground'
              )}
            >
              Ordenar por IVV
            </button>
          </div>
        }
      >
        <div className="overflow-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left">Bairro</th>
                {DORM_COLS.map((d) => (
                  <th key={d} className="px-2 py-2 text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBairros.map((row) => (
                <tr key={row.bairro}>
                  <td className="sticky left-0 z-[1] bg-card px-3 py-1.5 text-left font-medium text-foreground">
                    {row.bairro}
                  </td>
                  {row.ivv.map((v, i) => (
                    <td key={i} className="px-1 py-0.5 text-center">
                      <div
                        className="mx-auto flex h-8 w-full min-w-[64px] items-center justify-center rounded-md text-xs font-semibold"
                        style={ivvColorStyle(v)}
                        title={v != null ? `IVV: ${(v * 100).toFixed(1)}%` : 'sem dados'}
                      >
                        {v != null ? pctRaw(v * 100, 1) : '—'}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {filteredBairros.length === 0 && (
                <tr>
                  <td colSpan={DORM_COLS.length + 1} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Nenhum bairro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>0%</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              background: 'linear-gradient(to right, hsl(140 65% 78%), hsl(55 65% 64%), hsl(5 65% 50%))',
            }}
          />
          <span>≥ 20%</span>
        </div>
      </SectionCard>

      {/* Cortes analíticos */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Por padrão construtivo" subtitle="Comercial · Horizontal · Vertical">
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2 text-left">Padrão</th>
                  <th className="px-2 py-2 text-right">Área média</th>
                  <th className="px-2 py-2 text-right">R$/m² estoque</th>
                  <th className="px-2 py-2 text-right">Estoque</th>
                  <th className="px-2 py-2 text-right">VGV estoque</th>
                  <th className="px-2 py-2 text-right">Lançamentos</th>
                  <th className="px-2 py-2 text-right">VGV lançado</th>
                  <th className="px-2 py-2 text-right">Preço unitário</th>
                </tr>
              </thead>
              <tbody>
                {CORTE_PADRAO_MOCK.map((r) => (
                  <tr key={r.key} className="border-t border-border">
                    <td className="px-2 py-2 font-medium text-foreground">{r.key}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{m2(r.AreaMediaEstoque)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brlCompact(r.PrecoM2Estoque)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{intFmt(r.Estoque)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brlCompact(r.VgvEstoque)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{intFmt(r.LancamentosAcc)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brlCompact(r.VgvLancAcc)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brlCompact(r.PrecoUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Por dormitórios" subtitle="0 / 1 / 2 / 3 / 4 dorms · Cobertura">
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2 text-left">Tipologia</th>
                  <th className="px-2 py-2 text-right">VGV lançado</th>
                  <th className="px-2 py-2 text-right">VGV estoque</th>
                  <th className="px-2 py-2 text-right">R$/m² estoque</th>
                  <th className="px-2 py-2 text-right">Preço unit.</th>
                  <th className="px-2 py-2 text-right">Lançamentos</th>
                  <th className="px-2 py-2 text-right">Estoque</th>
                  <th className="px-2 py-2 text-right">% vendida</th>
                  <th className="px-2 py-2 text-right">Disp / oferta</th>
                </tr>
              </thead>
              <tbody>
                {CORTE_DORM_MOCK.map((r) => (
                  <tr key={r.key} className="border-t border-border">
                    <td className="px-2 py-2 font-medium text-foreground">{r.key}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brlCompact(r.VgvLancAcc)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brlCompact(r.VgvEstoque)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brlCompact(r.PrecoM2Estoque)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{brlCompact(r.PrecoUnit)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{intFmt(r.LancamentosAcc)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{intFmt(r.Estoque)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{pctRaw(r.PctVendida * 100)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{pctRaw(r.DispSobreOferta * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <footer className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <BarChart2 className="h-3 w-3" />
        Próxima etapa: substituir os dados de demonstração pelas APIs Geobrain (`/building`, `/temporal-analysis-city/*`).
      </footer>
    </div>
  );
}
