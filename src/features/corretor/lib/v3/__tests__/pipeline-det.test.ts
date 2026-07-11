// Regressão do pipeline DET do Corretor v3 sobre o estudo sintético gerado por
// docs/features/corretor-vocacionais/gera_estudo_teste.py — mede recall/FP de graça
// (camada DET). As camadas IA/VISÃO do gabarito só se verificam no app (custo real);
// aqui checamos também que o LOCALIZADOR de tabelas-imagem acha as candidatas certas.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

import { pptxToIr } from '../../audit/pptx-to-ir';
import { irToFindings } from '../../audit/ir-rules';
import { findTableImages } from '../table-images';

const HERE = dirname(fileURLToPath(import.meta.url));
const PPTX = join(HERE, 'teste_corretor.pptx');
const GAB = join(HERE, 'teste_corretor.gabarito.json');

interface GabErro { slide: number; type: string; layer: 'DET' | 'IA' | 'VISION'; detail: string }
interface Gabarito { cidade: string; erros: GabErro[]; controles_negativos: { slide: number; nota: string }[] }

const gab: Gabarito = JSON.parse(readFileSync(GAB, 'utf-8'));
const bytes = new Uint8Array(readFileSync(PPTX));

describe('Corretor v3 — pipeline DET sobre estudo sintético', () => {
  it('recupera todos os erros DET injetados, sem falso positivo nos controles', async () => {
    const ir = await pptxToIr(bytes, 'teste_corretor.pptx');
    const findings = irToFindings(ir).filter((f) => !f.ok); // só problemas

    const detErros = gab.erros.filter((e) => e.layer === 'DET');
    const encontrados = new Set(findings.map((f) => `${f.type}@${f.slideRef}`));

    const faltando: string[] = [];
    for (const e of detErros) {
      const key = `${e.type}@s${e.slide}`;
      if (!encontrados.has(key)) faltando.push(`${key} — ${e.detail}`);
    }

    // falso positivo de soma nos controles negativos
    const ctrlSlides = new Set(gab.controles_negativos.map((c) => `s${c.slide}`));
    const fpSum = findings.filter((f) => f.type === 'ABSOLUTE_SUM' && ctrlSlides.has(f.slideRef));

    const recall = detErros.length ? (detErros.length - faltando.length) / detErros.length : 1;
    console.log(
      `[DET] recall ${(recall * 100).toFixed(0)}% (${detErros.length - faltando.length}/${detErros.length})` +
        ` · achados-problema ${findings.length} · FP-controle ${fpSum.length}` +
        (faltando.length ? `\n      faltando: ${faltando.join('; ')}` : ''),
    );

    expect(faltando, `erros DET não detectados: ${faltando.join('; ')}`).toEqual([]);
    expect(fpSum, 'falso positivo de soma em tabela-controle').toEqual([]);
  });

  it('o localizador acha as 3 tabelas-imagem candidatas (slides 6, 7, 9)', async () => {
    const ir = await pptxToIr(bytes, 'teste_corretor.pptx');
    const cands = await findTableImages(bytes, ir);
    const slides = cands.map((c) => c.slide).sort((a, b) => a - b);
    console.log(`[VISÃO/localizador] ${cands.length} candidatas nos slides ${slides.join(', ')}`);
    expect(slides).toEqual([6, 7, 9]);
    // todas dentro da heurística de tamanho/dimensão
    for (const c of cands) {
      expect(c.kb).toBeGreaterThanOrEqual(15);
      expect(c.w).toBeGreaterThanOrEqual(700);
      expect(c.w / c.h).toBeGreaterThanOrEqual(1.2);
    }
  });
});
