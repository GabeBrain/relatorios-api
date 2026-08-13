// Aceite sobre os payloads REAIS do estudo Raimundo Leonardi V3 (Toledo/PR,
// study_id 17062ca6…), extraídos do Supabase em 12/ago/2026. São a entrada exata
// que as regras viram em 28/jul e que produziu os 6 achados de soma, então
// reproduzem o caso sem PPTX e sem custo de IA.
//
// Fixa as duas correções da sessão de 12/ago:
//  FP-01 — totais compactos casados por índice acusavam a coluna errada;
//  FP-02 — s42 × s43 escapavam do agrupamento de tabela paginada.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { checkTableSums } from '../../audit/engine';
import { resolvePaginatedSums, type SumSlice } from '../paginated-tables';
import type { Cell, ExtractedTable } from '../../audit/model';

interface Fixture {
  ruleId: string;
  slideRef: string;
  slide: number;
  notesOriginais: string[];
  badColumnsOriginais: number[];
  table: ExtractedTable;
}

const FIXTURES: Fixture[] = JSON.parse(
  readFileSync(
    join(__dirname, '../../../../../../docs/features/corretor-vocacionais/calibracao/toledo-2026-08/sum-payloads.json'),
    'utf8'
  )
);

const bySlide = (slide: number) => {
  const hit = FIXTURES.find((f) => f.slide === slide);
  if (!hit) throw new Error(`fixture do s${slide} não encontrada`);
  return hit;
};

const sums = (table: ExtractedTable) => checkTableSums(table, { absTol: Math.max(0.5, table.rows.length / 2) });

const asSlice = (fixture: Fixture): SumSlice => ({
  slide: fixture.slide,
  section: 'MERCADO',
  findingId: fixture.ruleId,
  table: fixture.table,
});

describe('Toledo (Raimundo Leonardi V3) — payloads reais do banco', () => {
  it('a fixture tem os 6 achados de soma originais', () => {
    expect(FIXTURES.map((f) => f.slideRef)).toEqual(['s42', 's43', 's61', 's98', 's100', 's101']);
  });

  describe('FP-01 — linha de totais casada por índice', () => {
    it('s42: os totais vinham compactos e as notas acusavam a coluna errada', () => {
      const { table, notesOriginais } = bySlide(42);
      // 6 totais para 15 colunas: a visão pulou as células vazias do rótulo "Total".
      expect(table.totals).toHaveLength(6);
      expect(table.columns).toHaveLength(15);
      // O que o analista viu em 28/jul — 397 é o total de Oferta ATUAL, não Lançada.
      expect(notesOriginais[0]).toContain('«Oferta Lançada»: soma 434 ≠ total 397');
    });

    it('s42: sem alinhamento possível, nenhuma coluna é acusada e o achado vira Verificar', () => {
      const viz = sums(bySlide(42).table);
      expect(viz.unaligned).toBe(true);
      expect(viz.badColumns).toEqual([]);
      expect(viz.notes).toHaveLength(1);
      expect(viz.notes?.[0]).toMatch(/não pôde ser alinhada/);
      // e nunca mais afirma o que não sabe
      expect(viz.notes?.[0]).not.toMatch(/≠/);
    });

    it('tabela alinhada segue sendo conferida normalmente (s100)', () => {
      const viz = sums(bySlide(100).table);
      expect(viz.unaligned).toBeUndefined();
      expect(viz.badColumns?.length).toBeGreaterThan(0);
    });
  });

  describe('FP-02 — agrupamento de tabela paginada', () => {
    it('s100 × s101 fecham exatamente somando as duas fatias', () => {
      // 471+194=665 · 392+132=524 · 79+62=141 — os totais declarados do conjunto
      const out = resolvePaginatedSums([asSlice(bySlide(100)), asSlice(bySlide(101))]);
      expect(out.findings).toEqual([]);
      expect([...out.dropIds].sort()).toEqual([bySlide(100).ruleId, bySlide(101).ruleId].sort());
      expect(out.verified).toBe(2);
    });

    it('s42 × s43 passam a ser reconhecidas como fatias da mesma tabela', () => {
      // Antes: headerKey 15 × 16 colunas e totalsKey ancorado no índice — nunca agrupavam.
      const out = resolvePaginatedSums([asSlice(bySlide(42)), asSlice(bySlide(43))]);
      expect(out.dropIds.size).toBe(2);
      expect(out.findings).toHaveLength(1);
      const [finding] = out.findings;
      expect(finding.slideRef).toBe('s42 × s43');
      // a leitura do s43 tem linha duplicada: o conjunto não fecha, e o veredito
      // honesto é "Verificar", não "Erro"
      expect(finding.confidence).toBe(3);
    });

    it('s98 não é agrupado com o par de 2km: total diferente, tabela diferente', () => {
      const out = resolvePaginatedSums([asSlice(bySlide(98)), asSlice(bySlide(100))]);
      expect(out.dropIds.size).toBe(0);
    });
  });

  it('aceite: os 6 achados de soma caem para 3', () => {
    // s42×s43 → 1 (conjunto, Verificar) · s100×s101 → 0 (fecha) · s61 e s98 seguem sozinhos
    const out = resolvePaginatedSums(FIXTURES.map(asSlice));
    const restantes = FIXTURES.filter((f) => !out.dropIds.has(f.ruleId)).length + out.findings.length;
    expect(restantes).toBe(3);
  });
});
