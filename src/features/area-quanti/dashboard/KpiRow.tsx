import { Users, MapPin, Map, Wallet, CalendarClock, User, UserRound, Target, Timer } from 'lucide-react';
import type { QuantiRecord } from './types';
import { distinctCount, mean, pctGenero, purchaseIntentKpis } from './aggregate';

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const PCT = (n: number) => `${n.toFixed(1)}%`;

interface Props { rows: QuantiRecord[] }

export function KpiRow({ rows }: Props) {
  const totalCidades = distinctCount(rows, 'cidade');
  const totalEstados = distinctCount(rows, 'estado');
  const rendaMedia = mean(rows, 'renda_valor_estimado');
  const idadeMedia = mean(rows, 'idade');
  const pctH = pctGenero(rows, 'masc') || pctGenero(rows, 'homem');
  const pctM = pctGenero(rows, 'fem') || pctGenero(rows, 'mulher');
  const intent = purchaseIntentKpis(rows);

  const kpis = [
    { icon: Users, label: 'Total de entrevistas', value: rows.length.toLocaleString('pt-BR') },
    { icon: Timer, label: 'Intenção até 2 anos', value: PCT(intent.pctIntentWithinTwoYears) },
    { icon: Target, label: 'Intenção geral', value: PCT(intent.pctGeneralIntent) },
    { icon: MapPin, label: 'Cidades', value: totalCidades.toLocaleString('pt-BR') },
    { icon: Map, label: 'Estados', value: totalEstados.toLocaleString('pt-BR') },
    { icon: Wallet, label: 'Renda média estimada', value: rendaMedia ? BRL(rendaMedia) : '—' },
    { icon: CalendarClock, label: 'Idade média', value: idadeMedia ? idadeMedia.toFixed(1) : '—' },
    { icon: User, label: '% Homens', value: `${pctH.toFixed(1)}%` },
    { icon: UserRound, label: '% Mulheres', value: `${pctM.toFixed(1)}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-9">
      {kpis.map((k) => (
        <div key={k.label} className="qd-card p-4 text-center">
          <k.icon className="mx-auto mb-2 h-4 w-4 text-[var(--qd-accent)]" />
          <div className="qd-kpi-value">{k.value}</div>
          <div className="qd-kpi-label mt-1">{k.label}</div>
        </div>
      ))}
    </div>
  );
}
