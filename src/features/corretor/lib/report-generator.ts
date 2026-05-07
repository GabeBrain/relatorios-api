import type { SlideResult, ProjectConfig, CostSummary, ErrorType } from '../store/analysis-store';
import { formatUSD, formatUSDTotal } from './cost-calculator';

const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  PERCENTAGE_SUM: 'Soma %',
  CITY_NAME: 'Nome Cidade',
  RADII: 'Raios',
  SPELLING: 'Ortografia',
  COHERENCE: 'Coerência',
};

const SEVERITY_LABELS = { HIGH: 'ALTA', MEDIUM: 'MÉDIA', LOW: 'BAIXA' };

export function generateReportText(
  config: ProjectConfig,
  summary: CostSummary,
  slides: SlideResult[]
): string {
  const slidesWithErrors = slides
    .filter((s) => s.errors.length > 0)
    .sort((a, b) => a.slideNumber - b.slideNumber);

  const totalErrors = slidesWithErrors.reduce((s, sl) => s + sl.errors.length, 0);

  const lines: string[] = [
    '═══════════════════════════════════════════════════════',
    ' RELATÓRIO DE ANÁLISE — CORRETOR DE ESTUDOS VOCACIONAIS',
    '═══════════════════════════════════════════════════════',
    '',
    `Projeto : ${config.projectName}`,
    `Cidade  : ${config.cityName}`,
    `Raios   : ${config.radii}`,
    `Modelo  : ${config.model}`,
    `Data    : ${new Date().toLocaleString('pt-BR')}`,
    '',
    '─── RESUMO ─────────────────────────────────────────────',
    `Total de slides        : ${summary.totalSlides}`,
    `Slides analisados      : ${summary.processedSlides}`,
    `Slides ignorados       : ${summary.skippedSlides} (sem dados tabulares)`,
    `Slides com erros       : ${summary.slidesWithErrors}`,
    `Total de erros         : ${totalErrors}`,
    `Custo total (real)     : ${formatUSDTotal(summary.totalCost)}`,
    `Média por slide        : ${formatUSD(summary.avgCostPerSlide)}`,
    `Tokens entrada (total) : ${summary.totalInputTokens.toLocaleString('pt-BR')}`,
    `Tokens saída (total)   : ${summary.totalOutputTokens.toLocaleString('pt-BR')}`,
    '',
    '─── ERROS ENCONTRADOS ──────────────────────────────────',
    '',
  ];

  if (slidesWithErrors.length === 0) {
    lines.push('Nenhum erro encontrado.');
  } else {
    for (const slide of slidesWithErrors) {
      lines.push(`SLIDE ${slide.slideNumber}`);
      for (const err of slide.errors) {
        lines.push(`  [${SEVERITY_LABELS[err.severity]}] ${ERROR_TYPE_LABELS[err.type]}`);
        lines.push(`  Descrição : ${err.description}`);
        if (err.location) lines.push(`  Local     : ${err.location}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

export function downloadReport(reportText: string, projectName: string) {
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_${projectName.replace(/\s+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
