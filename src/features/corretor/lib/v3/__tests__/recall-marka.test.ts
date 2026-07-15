// Harness de calibração: o labels.json é o gabarito humano; o PPTX/IR real continua local.
// Com CORRETOR_CALIBRATION_IR=<caminho.ir.json>, o teste mede o recall DET do estado atual.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { irToFindings } from '../../audit/ir-rules';
import type { Ir } from '../../audit/ir';

interface RawLabel { slide: number; fill_yellow: boolean; red_text: boolean; text: string }
interface Expected { slide: number; type: string }

const labelsPath = resolve('docs/features/corretor-vocacionais/calibracao/notas_marka_tancredo.labels.json');
const labels: RawLabel[] = JSON.parse(readFileSync(labelsPath, 'utf8'));

// Mapeamento explícito nota → regra: o gabarito não é inferido pelo texto do comentário.
const EXPECTED: Expected[] = [
  ...[12, 27, 28, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 46, 48, 49, 50, 52, 53, 55]
    .map((slide) => ({ slide, type: 'WRONG_CONTEXT' })),
  ...[41, 90].map((slide) => ({ slide, type: 'BINNING_RULE' })),
  ...[59, 60, 109, 121, 122, 123, 125, 136, 137, 138, 139, 149, 150, 151]
    .map((slide) => ({ slide, type: 'CROSS_TABLE_MISMATCH' })),
  ...[22, 25, 92, 124, 152].map((slide) => ({ slide, type: 'ATA_COVERAGE' })),
  ...[24, 96].map((slide) => ({ slide, type: 'STRUCTURE_MISSING' })),
  ...[89, 90].map((slide) => ({ slide, type: 'PROJECTION_FORMULA' })),
  ...[74, 75, 76, 119, 134, 147].map((slide) => ({ slide, type: 'VALUE_PLAUSIBILITY' })),
  ...[71, 72, 73].map((slide) => ({ slide, type: 'REQUIRED_NOTE' })),
];

function findingMatches(slide: number, type: string, key: string): boolean {
  const [foundType, refs] = key.split('@');
  return foundType === type && refs.split(/\D+/).map(Number).includes(slide);
}

describe('Calibração Marka/Tancredo — recall ancorado', () => {
  it('mantém o gabarito carregável e sem mapeamento órfão', () => {
    expect(labels.length).toBeGreaterThanOrEqual(90);
    const redSlides = new Set(labels.filter((label) => label.fill_yellow && label.red_text).map((label) => label.slide));
    const orphaned = EXPECTED.filter((label) => !redSlides.has(label.slide));
    expect(orphaned, `slides sem nota no gabarito: ${JSON.stringify(orphaned)}`).toEqual([]);
  });

  it('mede o recall DET quando o IR real estiver disponível localmente', () => {
    const irPath = process.env.CORRETOR_CALIBRATION_IR;
    if (!irPath || !existsSync(irPath)) {
      console.log(`[recall] IR real ausente; teto DET ainda não mensurável. Defina CORRETOR_CALIBRATION_IR para medir ${EXPECTED.length} labels.`);
      return;
    }
    const ir = JSON.parse(readFileSync(irPath, 'utf8')) as Ir;
    const keys = irToFindings(ir).filter((finding) => !finding.ok && finding.type !== 'LEFTOVER_NOTE')
      .map((finding) => `${finding.type}@${finding.slideRef}`);
    const missed = EXPECTED.filter((label) => !keys.some((key) => findingMatches(label.slide, label.type, key)));
    const recall = (EXPECTED.length - missed.length) / EXPECTED.length;
    console.log(`[recall DET] ${(recall * 100).toFixed(1)}% (${EXPECTED.length - missed.length}/${EXPECTED.length})` +
      (missed.length ? `\n  faltando: ${missed.map((label) => `${label.type}@s${label.slide}`).join(', ')}` : ''));

    if (process.env.COVERAGE_90_ENFORCE === 'true') {
      expect(recall, 'meta do plano: recall ancorado ≥90%').toBeGreaterThanOrEqual(0.9);
    }
  });
});
