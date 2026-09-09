import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { intFmt } from '@/lib/format';
import { METRICS, type MetricDef, type MetricKey, type ResumoEmailResult, varPct } from './aggregate';

interface Props {
  resumo: ResumoEmailResult | null;
}

function formatValue(value: number | null, format: MetricDef['format']): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (format === 'currency') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  if (format === 'percent') return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return intFmt(value);
}

function formatVariation(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function Help({ label, text }: { label: string; text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="vf-info" aria-label={`Regra de cálculo — ${label}`}>
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-[10pt] leading-snug">
        <div className="mb-1 font-semibold">{label}</div>
        <p className="text-muted-foreground">{text}</p>
      </PopoverContent>
    </Popover>
  );
}

function VariationCell({ value }: { value: number | null }) {
  if (value == null || !Number.isFinite(value)) return <td className="vf-email-var vf-zero">—</td>;
  const positive = value >= 0;
  return (
    <td className={`vf-email-var ${positive ? 'vf-pos' : 'vf-neg'}`}>
      <span className="vf-email-bar" aria-hidden="true">
        <span className={`vf-email-bar-fill ${positive ? 'is-positive' : 'is-negative'}`} style={{ width: `${Math.min(Math.abs(value) * 100, 100)}%` }} />
      </span>
      <span>{formatVariation(value)}</span>
    </td>
  );
}

function MetricRow({ metric, resumo }: { metric: MetricDef; resumo: ResumoEmailResult }) {
  const key: MetricKey = metric.key;
  const annualVariation = metric.noVariation ? null : varPct(resumo.selected[key], resumo.previousYear[key]);
  // Fórmula solicitada: acumulado do ano anterior ÷ acumulado do ano atual − 1.
  const accumulatedVariation = metric.noVariation ? null : varPct(resumo.previousYearAccum[key], resumo.selectedAccum[key]);

  return (
    <tr className="vf-total">
      <td className="vf-label">
        <span className="inline-flex items-center gap-1">
          {metric.label}
          <Help label={metric.label} text={metric.info} />
        </span>
      </td>
      <td>{formatValue(resumo.previousYear[key], metric.format)}</td>
      <td>{formatValue(resumo.previousMonth[key], metric.format)}</td>
      <td>{formatValue(resumo.selected[key], metric.format)}</td>
      <VariationCell value={annualVariation} />
      <td>{metric.noVariation ? '—' : formatValue(resumo.previousYearAccum[key], metric.format)}</td>
      <td>{metric.noVariation ? '—' : formatValue(resumo.selectedAccum[key], metric.format)}</td>
      <VariationCell value={accumulatedVariation} />
    </tr>
  );
}

export function ResumoEmailTable({ resumo }: Props) {
  if (!resumo) return <div className="vf-card p-6 text-center text-sm text-[var(--vf-muted)]">Nenhum período mensal disponível para os filtros selecionados.</div>;

  const previousYearLabel = resumo.previousYearKey ? resumo.previousYearKey : 'Ano anterior';
  const previousMonthLabel = resumo.previousMonthKey ? resumo.previousMonthKey : 'Mês anterior';
  const selectedLabel = resumo.selectedKey;
  const previousYearMonth = resumo.previousYearKey ? resumo.previousYearKey : 'período anterior';

  return (
    <div className="vf-card overflow-auto">
      <table className="vf-resumo vf-resumo-email">
        <thead>
          <tr>
            <th className="vf-label">Indicador</th>
            <th>{toMonthLabel(previousYearLabel)}</th>
            <th>{toMonthLabel(previousMonthLabel)}</th>
            <th>{toMonthLabel(selectedLabel)}</th>
            <th>
              <span className="inline-flex items-center justify-center gap-1">Var. {toMonthLabel(previousYearMonth)} x {toMonthLabel(selectedLabel)}<Help label="Variação anual" text="(último período selecionado ÷ mesmo período do ano anterior) − 1." /></span>
            </th>
            <th><span className="inline-flex items-center justify-center gap-1">{resumo.previousYearAccumLabel}<Help label="Acumulado do ano anterior" text="Recalcula o indicador de janeiro até o mesmo mês do ano anterior, respeitando os filtros de cidade e dimensões." /></span></th>
            <th><span className="inline-flex items-center justify-center gap-1">{resumo.selectedAccumLabel}<Help label="Acumulado do ano atual" text="Recalcula o indicador de janeiro até o último período selecionado, respeitando os filtros de cidade e dimensões." /></span></th>
            <th><span className="inline-flex items-center justify-center gap-1">Var. Acumulado<Help label="Variação acumulada" text="(acumulado do ano anterior ÷ acumulado do ano atual) − 1." /></span></th>
          </tr>
        </thead>
        <tbody>{METRICS.map((metric) => <MetricRow key={metric.key} metric={metric} resumo={resumo} />)}</tbody>
      </table>
    </div>
  );
}

function toMonthLabel(periodKey: string): string {
  const [year, month] = periodKey.split('-');
  const labels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const index = Number(month) - 1;
  return Number.isInteger(index) && labels[index] && year ? `${labels[index]}/${year.slice(-2)}` : periodKey;
}
