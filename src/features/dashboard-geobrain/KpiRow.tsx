import type { ReactNode } from 'react';
import { Building2, DollarSign, Layers, Package, Timer, TrendingUp } from 'lucide-react';
import { brlCompact, intFmt, months, numCompact, pctRaw } from '@/lib/format';
import type { KPIValues } from './aggregate';

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="dg-kpi">
      <div className="dg-kpi-label-row">
        <span className="text-[hsl(var(--dg-primary))]">{icon}</span>
        <span className="dg-kpi-label">{label}</span>
      </div>
      <div className="dg-kpi-value">{value}</div>
      {hint && <div className="dg-kpi-hint">{hint}</div>}
    </div>
  );
}

export function KpiRow({ k }: { k: KPIValues }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
      <Kpi icon={<Building2 className="h-3.5 w-3.5" />} label="Empreendimentos" value={intFmt(k.empreendimentos)} />
      <Kpi icon={<Building2 className="h-3.5 w-3.5" />} label="Empreend. ativos" value={intFmt(k.empreendimentosAtivos)} />
      <Kpi icon={<Layers className="h-3.5 w-3.5" />} label="Unidades Lançadas" value={numCompact(k.unidadesLancadas, 0)} hint="período mais recente" />
      <Kpi icon={<DollarSign className="h-3.5 w-3.5" />} label="VGV Lançado" value={brlCompact(k.vgvLancado)} />
      <Kpi icon={<Package className="h-3.5 w-3.5" />} label="Estoque" value={numCompact(k.estoqueFinal, 0)} hint="estoque final" />
      <Kpi icon={<DollarSign className="h-3.5 w-3.5" />} label="VGV Estoque" value={brlCompact(k.vgvEstoque)} />
      <Kpi icon={<TrendingUp className="h-3.5 w-3.5" />} label="IVV" value={pctRaw(k.ivv * 100, 1)} />
      <Kpi icon={<Timer className="h-3.5 w-3.5" />} label="Tempo de Estoque" value={months(k.tempoEstoque, 1)} />
    </div>
  );
}
