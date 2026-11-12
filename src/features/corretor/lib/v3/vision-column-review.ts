import type { ExtractedTable, Finding } from '../audit/model';

/** A mesma guarda na apresentação de achados salvos, sem modificar o histórico. */
export function reviewVisionFinding(finding: Finding): Finding {
  if (!finding.evidenceSha1) return finding;
  const ambiguous = finding.type === 'PERCENTAGE_SUM' && finding.viz?.kind === 'table' ? percentageColumnAmbiguities(finding.viz.table) : [];
  const literal = finding.type === 'FORMAT_MISMATCH' && /limite superior/.test(finding.detail) && !finding.escalated;
  if (!ambiguous.length && !literal) return finding;
  return { ...finding, confidence: 3, title: ambiguous.length ? 'Associação de percentual a conferir' : 'Limite de faixa a conferir na imagem', detail: `${ambiguous[0] ?? 'Literal de imagem sem confirmação independente; confira o print antes de corrigir.'}\nAlerta original: ${finding.detail}` };
}

/** Número inconsistente que fecha em outra coluna é suspeita de OCR, não autorização para movê-lo. */
export function percentageColumnAmbiguities(table: ExtractedTable, tolPp = 0.5): string[] {
  const out: string[] = [];
  const pairs = table.columns.flatMap((_, p) => {
    if (table.colKinds?.[p] === 'rate') return [];
    const total = table.totals?.[p];
    if (typeof total !== 'number' || Math.abs(total - 100) > 1) return [];
    const a = table.shareOf?.[p] ?? p - 1;
    const denominator = table.totals?.[a];
    return a > 0 && a < table.columns.length && a !== p && typeof denominator === 'number' && denominator > 0 ? [{ p, a, denominator }] : [];
  });
  for (const row of table.rows) {
    for (const pair of pairs) {
      const value = row[pair.a], pct = row[pair.p];
      if (typeof value !== 'number' || typeof pct !== 'number' || Math.abs(value / pair.denominator * 100 - pct) <= tolPp) continue;
      const peer = pairs.find(other => other.a !== pair.a && table.columns[other.a] !== table.columns[pair.a] && typeof row[other.a] === 'number' && Math.abs((row[other.a] as number) / other.denominator * 100 - pct) <= tolPp);
      if (peer) out.push(`Linha «${row[0]}»: ${pct}% não fecha em «${table.columns[pair.a]}», mas coincide com «${table.columns[peer.a]}». Associação entre colunas não conferida; confirme a imagem antes de corrigir.`);
    }
  }
  return [...new Set(out)];
}
