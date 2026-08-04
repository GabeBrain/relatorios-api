// Aceite do ajuste B (28/jul, decidido em 31/jul): comentário de revisão sai do
// catálogo de erros e vira “Comunicação da revisão” — UM item agregado, fora da
// contagem Erro/Provável/Verificar, mais a pista dirigida de calibração.
// Caso real: Toledo/PR, 32 dos 39 achados eram nota de edição.

import { describe, expect, it } from 'vitest';

import { irToFindings, reviewNoteBlindSpots, reviewNotesOf } from '../../audit/ir-rules';
import { confidenceOf } from '../confidence';
import { isStaleReviewNote } from '../reconcile';
import { isCommunication } from '../../error-catalog';
import type { Ir, IrSlide } from '../../audit/ir';
import type { Finding } from '../../audit/model';

function slide(n: number, notas_revisao: string[] = [], textos: string[] = []): IrSlide {
  return {
    n, titulo: `Slide ${n}`, secao_canonica: 'SOCIO', textos,
    fontes: [], notas: [], notas_edicao: [], notas_revisao, tabelas: [], graficos: [], n_imagens: 0,
  };
}

const NOTAS = [
  'Deixar somente as bordas com cores, o restante do raio deve ser transparente. Vale para todos os mapas',
  'As cores dos raios acabam misturando com as informações das camadas nos outros mapas',
  'Ajustar a legenda. Melhor pegar a legenda do geobrain',
];

const ir: Ir = {
  ir_version: 1, arquivo: 'toledo.pptx', n_slides: 3,
  slides: [slide(18, [NOTAS[0]]), slide(24, [NOTAS[1], NOTAS[2]]), slide(31)],
};

describe('Comunicação da revisão — item agregado', () => {
  it('um único achado cobre todos os comentários, com slide e texto no checklist', () => {
    const notes = irToFindings(ir).filter((f) => f.type === 'LEFTOVER_NOTE');
    expect(notes).toHaveLength(1);
    const [comunicacao] = notes;
    expect(comunicacao.title).toBe('3 comentário(s) de revisão em 2 slide(s)');
    expect(comunicacao.slideRef).toBe('—');
    const checklist = comunicacao.viz?.kind === 'text' ? comunicacao.viz.checklist ?? [] : [];
    expect(checklist).toHaveLength(3);
    expect(checklist[0].label).toContain('s18');
    expect(checklist[2].label).toContain('Ajustar a legenda');
  });

  it('fica fora da contagem de erros e não bloqueia a entrega', () => {
    expect(isCommunication('LEFTOVER_NOTE')).toBe(true);
    // nível 3 nunca entra no bloqueio (que é <= 2), mesmo vindo do DET pleno
    const [comunicacao] = irToFindings(ir).filter((f) => f.type === 'LEFTOVER_NOTE');
    expect(confidenceOf(comunicacao, 'DET')).toBe(3);
  });

  it('estudo sem comentário não gera item nenhum', () => {
    expect(reviewNotesOf({ ...ir, slides: [slide(1)] })).toEqual([]);
    expect(irToFindings({ ...ir, slides: [slide(1)] }).filter((f) => f.type === 'LEFTOVER_NOTE')).toEqual([]);
  });
});

describe('Pista dirigida — a nota é gabarito parcial de graça', () => {
  const achadoNoS18: Finding = {
    id: 'src-18', type: 'SOURCE_MISSING', section: 'SOCIO', slideRef: 's18',
    title: 'Sem fonte', detail: 'Slide sem FONTE.', ok: false,
  };

  it('aponta os slides comentados onde o motor não achou nada', () => {
    const [blind] = reviewNoteBlindSpots(ir, [achadoNoS18]);
    expect(blind.title).toContain('1 slide(s)');
    const checklist = blind.viz?.kind === 'text' ? blind.viz.checklist ?? [] : [];
    // s18 tem achado do motor; s24 é o ponto cego
    expect(checklist.map((item) => item.label.slice(0, 3))).toEqual(['s24', 's24']);
  });

  it('cala quando todo slide comentado já tem achado', () => {
    const noS24: Finding = { ...achadoNoS18, id: 'src-24', slideRef: 's24' };
    expect(reviewNoteBlindSpots(ir, [achadoNoS18, noS24])).toEqual([]);
  });

  it('não conta o próprio item de comunicação como cobertura', () => {
    const agregado = irToFindings(ir).filter((f) => f.type === 'LEFTOVER_NOTE');
    expect(reviewNoteBlindSpots(ir, agregado)).toHaveLength(1);
  });
});

describe('Reconciliação dos estudos já analisados', () => {
  it('encerra as notas por slide dos estudos antigos (Toledo: 32 itens)', () => {
    const legado: Finding = {
      id: 'note-18-0', type: 'LEFTOVER_NOTE', section: 'SOCIO', slideRef: 's18',
      title: 'Nota interna de revisão no slide', detail: 'Comentário de revisão deixado no estudo.', ok: false,
    };
    expect(isStaleReviewNote(legado)).toBe(true);
    // o item agregado novo NÃO é encerrado pela reconciliação
    const [agregado] = irToFindings(ir).filter((f) => f.type === 'LEFTOVER_NOTE');
    expect(isStaleReviewNote(agregado)).toBe(false);
  });
});
