import { useRef, useState } from 'react';
import { Check, ImageDown, Info } from 'lucide-react';
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
  const accumulatedVariation = metric.noVariation ? null : varPct(resumo.selectedAccum[key], resumo.previousYearAccum[key]);

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
  const tableRef = useRef<HTMLTableElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle');
  if (!resumo) return <div className="vf-card p-6 text-center text-sm text-[var(--vf-muted)]">Nenhum período mensal disponível para os filtros selecionados.</div>;

  const previousYearLabel = resumo.previousYearKey ? resumo.previousYearKey : 'Ano anterior';
  const previousMonthLabel = resumo.previousMonthKey ? resumo.previousMonthKey : 'Mês anterior';
  const selectedLabel = resumo.selectedKey;
  const previousYearMonth = resumo.previousYearKey ? resumo.previousYearKey : 'período anterior';

  async function copyTableImage() {
    const table = tableRef.current;
    if (!table || !navigator.clipboard || !window.ClipboardItem) {
      setCopyState('error');
      return;
    }
    const width = table.scrollWidth;
    const height = table.offsetHeight;
    const markup = new XMLSerializer().serializeToString(table.cloneNode(true));
    const styles = `
      table { border-collapse: collapse; width: 100%; font: 14px Arial, sans-serif; background: #fff; color: #1f2937; }
      th, td { padding: 6px 10px; border: 1px solid #d1d5db; text-align: right; white-space: nowrap; }
      thead th { background: #587f35; color: #fff; font-weight: 600; text-align: center; white-space: normal; }
      th.vf-label, td.vf-label { text-align: left; }
      td.vf-label { background: #f3f6ef; font-weight: 500; }
      tbody tr { background: #fff; font-weight: 700; }
      .vf-email-var { position: relative; font-weight: 700; }
      .vf-email-bar { display: none; }
      .vf-pos { color: #326c24; } .vf-neg { color: #a32d2d; } .vf-zero { color: #6b7280; }
      button { display: none; }
    `;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${styles}</style>${markup}</div></foreignObject></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Não foi possível gerar a imagem da tabela.')); image.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas indisponível.');
      context.scale(2, 2);
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Não foi possível gerar a imagem da tabela.');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopyState('done');
      window.setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      setCopyState('error');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button type="button" className="vf-btn" onClick={copyTableImage}>
          {copyState === 'done' ? <Check className="mr-1 inline h-3 w-3" /> : <ImageDown className="mr-1 inline h-3 w-3" />}
          {copyState === 'done' ? 'Imagem copiada' : 'Copiar tabela como imagem'}
        </button>
      </div>
      {copyState === 'error' && <p className="text-right text-[9pt] text-red-700">Não foi possível copiar a imagem neste navegador.</p>}
      <div className="vf-card overflow-auto">
      <table ref={tableRef} className="vf-resumo vf-resumo-email">
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
            <th><span className="inline-flex items-center justify-center gap-1">Var. Acumulado<Help label="Variação acumulada" text="(acumulado do ano atual ÷ acumulado do ano anterior) − 1." /></span></th>
          </tr>
        </thead>
        <tbody>{METRICS.map((metric) => <MetricRow key={metric.key} metric={metric} resumo={resumo} />)}</tbody>
      </table>
      </div>
    </div>
  );
}

function toMonthLabel(periodKey: string): string {
  const [year, month] = periodKey.split('-');
  const labels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const index = Number(month) - 1;
  return Number.isInteger(index) && labels[index] && year ? `${labels[index]}/${year.slice(-2)}` : periodKey;
}
