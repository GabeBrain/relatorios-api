// Aceite da Fase 1/2 do sprint contra o DECK REAL da Rolândia (Daniele Nunes).
// O IR versionado em calibracao/feedback-2026-07/ permite retestar sem o PPTX
// de 162 MB e sem custo de IA. Baseline: 17 achados, TODOS marcados FP por ela.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { irToFindings, ziLabelFindings } from '../../audit/ir-rules';
import { crossTableFindings } from '../cross-table';
import { isMapSlide, sourceFindingsFromVision } from '../coverage-rules';
import type { Ir } from '../../audit/ir';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, '..', '..', '..', '..', '..', '..', 'docs', 'features', 'corretor-vocacionais', 'calibracao', 'feedback-2026-07');
const ir = JSON.parse(readFileSync(join(CORPUS, 'rolandia-v1.ir.json'), 'utf-8')) as Ir;

const findings = [...irToFindings(ir, { city: 'Rolândia', uf: 'PR' }), ...crossTableFindings(ir, [])];

describe('Rolândia — deck real (baseline: 17 achados, 17 FP)', () => {
  it('CH-4: o rodapé FONTE em tabela 1×1 é extraído — nenhum SOURCE_MISSING', () => {
    // Eram 11 (s22,23,24,27,28,29,30,31,34,36,37), todos com "FONTE: GEOBRAIN
    // | ELABORAÇÃO: BRAIN" visível no slide, dentro de uma tabela de 1 célula.
    expect(findings.filter((f) => f.type === 'SOURCE_MISSING')).toEqual([]);
  });

  it('CH-3: legendas de mapa e lacunas de unidades diferentes não são cruzadas', () => {
    // Eram 5: cross-renda-28-37, 29-37 (LEGENDA do mapa de renda × absorção) e
    // cross-lacunas-bins-51-52, 52-53, 53-53 (metragem × preço, e 53 consigo).
    expect(findings.filter((f) => f.type === 'CROSS_TABLE_MISMATCH')).toEqual([]);
  });

  it('CH-1: o checklist não acusa como ausente o que está em mapa/imagem', () => {
    const checklist = findings.find((f) => f.type === 'STRUCTURE_MISSING');
    expect(checklist?.viz?.kind).toBe('text');
    const items = checklist?.viz?.kind === 'text' ? checklist.viz.checklist ?? [] : [];
    const missing = items.filter((i) => i.status === 'missing').map((i) => i.label);
    // Os 15 itens que a analista sublinhou (mapas, endereço, acessos, consolidada…)
    // saíram de "ausente". Sobra a ausência real de 7.1 — que ela não contestou.
    expect(missing).toEqual(['7.1 — Futuros lançamentos']);
  });

  it('o estudo real produz 1 achado (era 17, todos FP)', () => {
    expect(findings).toHaveLength(1);
  });

  it('slide de mapa não é cobrado por fonte — nenhum leva FONTE por convenção', () => {
    // Feedback do Gabriel (28/jul): mapas usam base cartográfica de terceiro
    // (Google Maps) e não levam FONTE/ELABORAÇÃO. No estudo real são 8 slides
    // cujo conteúdo tabular é 100% LEGENDA (raios/terreno/faixas) — inclusive
    // "Renda domiciliar" (s28/s29), que antes eram os únicos acusados.
    const mapas = [20, 25, 26, 28, 29, 32, 33, 68];
    for (const n of mapas) {
      const slide = ir.slides.find((s) => s.n === n)!;
      expect(isMapSlide(slide), `s${n} deveria ser reconhecido como mapa`).toBe(true);
    }
    const flagged = new Set(sourceFindingsFromVision(ir, [], ir.slides.map((s) => s.n)).map((f) => f.slideRef));
    for (const n of mapas) expect(flagged.has(`s${n}`), `s${n} é mapa e não deve ser cobrado`).toBe(false);
  });

  it('slide de dados com tabela real continua sendo cobrado quando não tem fonte', () => {
    // Guarda contra isentar demais: tabela de verdade (não-legenda) sem FONTE
    // segue candidata — a regra só perdoa a assinatura de mapa.
    const slide = {
      ...ir.slides.find((s) => s.n === 27)!,
      n: 900, fontes: [], n_imagens: 1,
      tabelas: [{ n_linhas: 3, n_colunas: 3, linhas: [['Faixa', '2024', '2025'], ['A', '1', '2'], ['B', '3', '4']], linhas_num: [] }],
    };
    expect(isMapSlide(slide)).toBe(false);
    expect(sourceFindingsFromVision({ ...ir, slides: [slide] }, [], []).map((f) => f.slideRef)).toEqual(['s900']);
  });
});

describe('FN-3 (Lucas Finoti) — rótulo de Z.I. trocado', () => {
  it('a Rolândia usa a convenção corretamente: nenhum alerta', () => {
    // s19 declara primária=1km, secundária=2km, terciária=3km; s41 diz
    // "não foram encontrados empreendimentos na Z.I. secundária (de 1 km a 2 km)" ✓
    expect(ziLabelFindings(ir)).toEqual([]);
  });

  it('acusa o caso do Finoti: 2 km chamado de secundária quando é primária', () => {
    const slides = ir.slides.map((s) => (s.n === 41
      ? { ...s, textos: ['Não foram encontrados empreendimentos na Z.I. secundária (até 2 Km).'] }
      : s));
    // Convenção invertida deste estudo: primária = 2 km, secundária = 4 km.
    const convention = {
      ...slides[18],
      n: 19,
      titulo: 'Zona de influência do estudo',
      textos: ['Foram traçados raios: Z.I. primária: 2 km; Z.I. secundária: 4 km; Z.I. terciária: 6 km.'],
    };
    const out = ziLabelFindings({ ...ir, slides: [convention, ...slides.filter((s) => s.n !== 19)] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ slideRef: 's41', type: 'WRONG_CONTEXT' });
    expect(out[0].title).toContain('secundaria');
  });

  it('se abstém quando o deck não declara a convenção', () => {
    const semConvencao = ir.slides.filter((s) => s.n !== 19);
    expect(ziLabelFindings({ ...ir, slides: semConvencao })).toEqual([]);
  });
});
