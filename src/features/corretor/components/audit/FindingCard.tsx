import { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, ArrowRight, MinusCircle, XCircle, MapPin, Quote, Radius,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ERROR_CATALOG, MODE_META, errorLabel,
} from '../../lib/error-catalog';
import type {
  Finding, Verdict, TableViz, SideBySideViz, BinRangeViz, TextViz, MapViz, Cell,
} from '../../lib/audit/model';

// ─── Viz: tabela com células marcadas ───────────────────────────────────────

function fmt(v: Cell): string {
  if (v === null || v === undefined) return '–';
  if (typeof v === 'number') return v.toLocaleString('pt-BR');
  return v;
}

function TableVizView({ viz }: { viz: TableViz }) {
  const bad = new Set(viz.badColumns ?? []);
  const badRows = new Set(viz.badRows ?? []);
  const t = viz.table;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60">
              {t.columns.map((c, i) => (
                <th key={i} className={cn(
                  'px-2 py-1 text-left font-medium whitespace-nowrap',
                  bad.has(i) && 'bg-destructive/15 text-destructive'
                )}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, ri) => (
              <tr key={ri} className={cn('border-t border-border', badRows.has(ri) && 'bg-destructive/10')}>
                {r.map((cell, ci) => (
                  <td key={ci} className={cn(
                    'px-2 py-1 whitespace-nowrap',
                    ci === 0 ? 'text-foreground' : 'text-right font-mono tabular-nums text-muted-foreground',
                    bad.has(ci) && 'bg-destructive/10 text-destructive font-medium'
                  )}>{fmt(cell)}</td>
                ))}
              </tr>
            ))}
            {t.totals && (
              <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                {t.totals.map((cell, ci) => (
                  <td key={ci} className={cn(
                    'px-2 py-1 whitespace-nowrap',
                    ci === 0 ? '' : 'text-right font-mono tabular-nums',
                    bad.has(ci) && 'bg-destructive/20 text-destructive'
                  )}>{fmt(cell)}</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {viz.notes && viz.notes.length > 0 && (
        <ul className="space-y-0.5">
          {viz.notes.map((n, i) => (
            <li key={i} className="text-[11px] text-destructive flex items-start gap-1">
              <XCircle className="w-3 h-3 mt-0.5 shrink-0" />{n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Viz: comparação lado a lado ────────────────────────────────────────────

function SideBySideVizView({ viz }: { viz: SideBySideViz }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/60">
            <th className="px-2 py-1 text-left font-medium" />
            <th className="px-2 py-1 text-left font-medium">{viz.leftLabel}</th>
            <th className="px-2 py-1 text-center font-medium w-8" />
            <th className="px-2 py-1 text-left font-medium">{viz.rightLabel}</th>
          </tr>
        </thead>
        <tbody>
          {viz.rows.map((r, i) => (
            <tr key={i} className={cn('border-t border-border', r.mismatch && 'bg-destructive/10')}>
              <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{r.label}</td>
              <td className={cn('px-2 py-1 font-mono tabular-nums', r.mismatch && 'text-destructive font-medium')}>{fmt(r.left)}</td>
              <td className="px-2 py-1 text-center">
                {r.mismatch
                  ? <XCircle className="w-3.5 h-3.5 text-destructive inline" />
                  : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
              </td>
              <td className={cn('px-2 py-1 font-mono tabular-nums', r.mismatch && 'text-destructive font-medium')}>{fmt(r.right)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Viz: régua de faixas ───────────────────────────────────────────────────

function BinRangeVizView({ viz }: { viz: BinRangeViz }) {
  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-0.5 overflow-x-auto pb-1">
        {viz.bins.map((b, i) => (
          <div key={i} className="flex items-center">
            <div className="rounded border border-border bg-muted/40 px-2 py-1 text-[11px] whitespace-nowrap">
              {b.label}
            </div>
            {viz.gapAfterIndex === i && (
              <div className="flex items-center px-1" title={viz.gapDescription}>
                <div className="h-6 border-l-2 border-dashed border-destructive" />
                <AlertTriangle className="w-3.5 h-3.5 text-destructive mx-0.5" />
                <div className="h-6 border-l-2 border-dashed border-destructive" />
              </div>
            )}
            {viz.gapAfterIndex !== i && i < viz.bins.length - 1 && (
              <ArrowRight className="w-3 h-3 text-muted-foreground/40 mx-0.5 shrink-0" />
            )}
          </div>
        ))}
      </div>
      {viz.gapDescription && (
        <p className="text-[11px] text-destructive flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{viz.gapDescription}
        </p>
      )}
    </div>
  );
}

// ─── Viz: texto / overlay / checklist ───────────────────────────────────────

function TextVizView({ viz }: { viz: TextViz }) {
  return (
    <div className="space-y-1.5">
      {viz.location && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />{viz.location}
        </p>
      )}
      {viz.evidence && (
        <p className="text-xs bg-muted/50 border border-border rounded px-2 py-1 font-mono">{viz.evidence}</p>
      )}
      {viz.checklist && (
        <ul className="space-y-1">
          {viz.checklist.map((c, i) => (
            <li key={i} className="text-xs flex items-center gap-1.5">
              {c.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              {c.status === 'missing' && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
              {c.status === 'na' && <MinusCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              <span className={cn(c.status === 'missing' && 'text-destructive')}>{c.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MapVizView({ viz }: { viz: MapViz }) {
  const exp = new Set(viz.expected.map((s) => s.toLowerCase()));
  const det = new Set(viz.detected.map((s) => s.toLowerCase()));
  const chip = (label: string, tone: 'ok' | 'bad' | 'muted') => (
    <span key={label} className={cn(
      'text-[11px] rounded-full px-2 py-0.5 border',
      tone === 'ok' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      tone === 'bad' && 'bg-destructive/15 text-destructive border-destructive/30',
      tone === 'muted' && 'bg-muted/50 text-muted-foreground border-border',
    )}>{label}</span>
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Radius className="w-3 h-3" />Esperado:</span>
        {viz.expected.map((r) => chip(r, 'muted'))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Radius className="w-3 h-3" />Detectado:</span>
        {viz.detected.length === 0
          ? <span className="text-[11px] text-muted-foreground">nenhum raio em texto</span>
          : viz.detected.map((r) => chip(r, exp.has(r.toLowerCase()) ? 'ok' : 'bad'))}
        {viz.expected.filter((r) => !det.has(r.toLowerCase())).map((r) => chip(`${r} (faltando)`, 'bad'))}
      </div>
      {viz.note && <p className="text-[11px] text-muted-foreground">{viz.note}</p>}
    </div>
  );
}

function VizSwitch({ finding }: { finding: Finding }) {
  const v = finding.viz;
  if (!v) return null;
  switch (v.kind) {
    case 'table': return <TableVizView viz={v} />;
    case 'sidebyside': return <SideBySideVizView viz={v} />;
    case 'binrange': return <BinRangeVizView viz={v} />;
    case 'map': return <MapVizView viz={v} />;
    case 'text': return <TextVizView viz={v} />;
  }
}

// ─── Card completo ──────────────────────────────────────────────────────────

const VERDICT_BTN: { value: Verdict; label: string }[] = [
  { value: 'bug', label: 'Bug real' },
  { value: 'fp', label: 'Falso positivo' },
  { value: 'unsure', label: 'Não sei' },
];

export function FindingCard({
  finding, verdict, onVerdict,
}: {
  finding: Finding;
  verdict?: Verdict;
  onVerdict: (v: Verdict) => void;
}) {
  const [open, setOpen] = useState(true);
  const meta = ERROR_CATALOG[finding.type];
  const mode = MODE_META[meta.mode];

  return (
    <div className={cn(
      'rounded-lg border bg-card',
      finding.ok ? 'border-border' : 'border-destructive/30'
    )}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 shrink-0">
          {finding.ok
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <AlertTriangle className="w-4 h-4 text-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="text-sm font-medium">{finding.title}</span>
            <span className="text-[10px] font-mono text-muted-foreground">· {finding.slideRef}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[10px] rounded px-1.5 py-0.5 border bg-muted/50 text-muted-foreground">
              {errorLabel(finding.type)}
            </span>
            <span className={cn('text-[10px] rounded px-1.5 py-0.5 border', mode.className)} title={mode.hint}>
              {mode.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{meta.motor}</span>
          </div>
          <p className="text-xs text-muted-foreground">{finding.detail}</p>
          {finding.gabarito && (
            <p className="mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1 italic">
              <Quote className="w-3 h-3 mt-0.5 shrink-0" />
              Nota do analista (gabarito): “{finding.gabarito}”
            </p>
          )}
        </div>
        {finding.viz && (
          <button onClick={() => setOpen((o) => !o)} className="text-[11px] text-primary shrink-0 hover:underline">
            {open ? 'ocultar' : 'ver'}
          </button>
        )}
      </div>

      {open && finding.viz && (
        <div className="px-4 pb-3"><VizSwitch finding={finding} /></div>
      )}

      <div className="flex items-center gap-1.5 border-t border-border px-4 py-2">
        <span className="text-[10px] text-muted-foreground mr-1">Veredito:</span>
        {VERDICT_BTN.map((b) => (
          <button
            key={b.value}
            onClick={() => onVerdict(b.value)}
            className={cn(
              'text-[11px] rounded-full px-2.5 py-0.5 border transition-colors',
              verdict === b.value
                ? b.value === 'bug'
                  ? 'bg-destructive text-destructive-foreground border-destructive'
                  : b.value === 'fp'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-muted text-foreground border-border'
                : 'bg-background border-border hover:border-primary/50 text-muted-foreground'
            )}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
