// Sessão de revisão da Auditoria v2: persistência dos vereditos (localStorage),
// export do dataset rotulado (CSV) e cálculo de calibração ao vivo (recall vs
// o gabarito das notas reais do analista). Tudo client-side, sem custo.

import { ERROR_CATALOG } from '../error-catalog';
import type { Finding, StudyFixture, Verdict } from './model';

export type VerdictMap = Record<string, Verdict>;

const KEY = 'corretor-audit-v2-verdicts';

export function loadVerdicts(): VerdictMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as VerdictMap;
  } catch {
    return {};
  }
}

export function saveVerdicts(v: VerdictMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* localStorage indisponível — ignora */
  }
}

export interface Calibration {
  total: number;
  reviewed: number;
  bugMarked: number;
  fpMarked: number;
  /** Achados que reproduzem uma nota real do analista (positivos do gabarito). */
  gabaritoTotal: number;
  /** Desses, quantos a analista confirmou como bug. */
  gabaritoConfirmed: number;
  /** recall = confirmados / total do gabarito (null se não há gabarito). */
  recallPct: number | null;
}

export function calibrationFor(findings: Finding[], v: VerdictMap): Calibration {
  let reviewed = 0, bug = 0, fp = 0, gabTotal = 0, gabConfirmed = 0;
  for (const f of findings) {
    const vd = v[f.id];
    if (vd) reviewed++;
    if (vd === 'bug') bug++;
    if (vd === 'fp') fp++;
    if (f.gabarito) {
      gabTotal++;
      if (vd === 'bug') gabConfirmed++;
    }
  }
  return {
    total: findings.length,
    reviewed,
    bugMarked: bug,
    fpMarked: fp,
    gabaritoTotal: gabTotal,
    gabaritoConfirmed: gabConfirmed,
    recallPct: gabTotal > 0 ? Math.round((gabConfirmed / gabTotal) * 100) : null,
  };
}

function csvCell(v: string | number | boolean | undefined): string {
  const s = v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  bug: 'bug real',
  fp: 'falso positivo',
  unsure: 'não sei',
};

export function exportReviewCsv(study: StudyFixture, v: VerdictMap): void {
  const header = ['estudo', 'secao', 'tipo', 'modo', 'motor', 'slide', 'titulo', 'checagem', 'nota_analista_gabarito', 'veredito'];
  const lines = [header.map(csvCell).join(';')];
  for (const f of study.findings) {
    const meta = ERROR_CATALOG[f.type];
    lines.push([
      csvCell(study.label),
      csvCell(f.section),
      csvCell(f.type),
      csvCell(meta.mode),
      csvCell(meta.motor),
      csvCell(f.slideRef),
      csvCell(f.title),
      csvCell(f.ok ? 'consistente' : 'problema'),
      csvCell(f.gabarito),
      csvCell(v[f.id] ? VERDICT_LABEL[v[f.id]] : ''),
    ].join(';'));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revisao_${study.id}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
