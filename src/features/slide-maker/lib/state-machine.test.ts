import { describe, expect, it } from 'vitest';
import {
  ESTADOS,
  EVENTOS,
  FASES,
  TransicaoInvalida,
  aceitaAjuste,
  emExecucao,
  estadoDaFase,
  podeTransicionar,
  transicionar,
  type ContextoTransicao,
  type Estado,
  type Evento,
  type Fase,
} from './state-machine';

const NOVO: ContextoTransicao = { versaoAtual: 0, erroFase: null };
const ENTREGUE: ContextoTransicao = { versaoAtual: 2, erroFase: null };
const falhaEm = (fase: Fase, versaoAtual = 0): ContextoTransicao => ({ versaoAtual, erroFase: fase });

type Caso = [Estado, Evento, ContextoTransicao, Estado, Fase | null];

/**
 * Transições válidas escritas à mão a partir do diagrama da §4. Nada fora daqui é aceito.
 * Estas não dependem de já existir deck entregue, então valem nos dois contextos: por exemplo,
 * um ajuste que muda a tese volta à aprovação e roda F3 de novo com versão > 0.
 */
const INDEPENDENTES: [Estado, Evento, Estado, Fase | null][] = [
  ['rascunho', 'arquivos_enviados', 'analisando', 'F1'],
  ['analisando', 'perguntas_feitas', 'aguardando_respostas', null],
  ['analisando', 'intake_concluido', 'pesquisando_e_narrando', 'F2'],
  ['pesquisando_e_narrando', 'narrativa_submetida', 'aguardando_aprovacao', null],
  ['aguardando_aprovacao', 'narrativa_aprovada', 'produzindo', 'F3'],
  ['aguardando_aprovacao', 'ajuste_narrativa_pedido', 'pesquisando_e_narrando', 'F2'],
  ['produzindo', 'revisao_iniciada', 'revisando', null],
  ['produzindo', 'deck_entregue', 'entregue', null],
  ['revisando', 'deck_entregue', 'entregue', null],
  ['entregue', 'ajuste_pedido', 'ajustando', 'F4'],
  ['ajustando', 'revisao_iniciada', 'revisando', null],
  ['ajustando', 'deck_entregue', 'entregue', null],
  // Ajuste ambíguo: o agente pergunta antes de produzir.
  ['ajustando', 'perguntas_feitas', 'aguardando_respostas', null],
  // Ajuste que muda a tese passa de novo pela aprovação antes de produzir.
  ['ajustando', 'narrativa_submetida', 'aguardando_aprovacao', null],
];

const EM_EXECUCAO: Estado[] = ['analisando', 'pesquisando_e_narrando', 'produzindo', 'revisando', 'ajustando'];
for (const estado of EM_EXECUCAO) INDEPENDENTES.push([estado, 'falhou', 'erro', null]);

const VALIDAS: Caso[] = INDEPENDENTES.flatMap(([e, ev, destino, fase]): Caso[] => [
  [e, ev, NOVO, destino, fase],
  [e, ev, ENTREGUE, destino, fase],
]);

// Dependem do contexto: a resposta a perguntas feitas num ajuste volta ao ajuste (F4), não à narrativa.
VALIDAS.push(['aguardando_respostas', 'respostas_enviadas', NOVO, 'pesquisando_e_narrando', 'F2']);
VALIDAS.push(['aguardando_respostas', 'respostas_enviadas', ENTREGUE, 'ajustando', 'F4']);
for (const fase of FASES) {
  VALIDAS.push(['erro', 'retomar', falhaEm(fase), estadoDaFase(fase), fase]);
  VALIDAS.push(['erro', 'retomar', falhaEm(fase, 3), estadoDaFase(fase), fase]);
}
// Cancelar: encerra o trabalho, exceto quando já existe deck entregue (volta à versão vigente).
for (const estado of ESTADOS.filter((e) => e !== 'cancelado' && e !== 'entregue')) {
  VALIDAS.push([estado, 'cancelar', NOVO, 'cancelado', null]);
  VALIDAS.push([estado, 'cancelar', ENTREGUE, 'entregue', null]);
}

const CONTEXTOS: ContextoTransicao[] = [NOVO, ENTREGUE, ...FASES.map((f) => falhaEm(f)), ...FASES.map((f) => falhaEm(f, 3))];
const chave = (e: Estado, ev: Evento, c: ContextoTransicao) => `${e}|${ev}|${c.versaoAtual > 0}|${c.erroFase ?? '-'}`;

describe('máquina de estados do Slide Maker', () => {
  it.each(VALIDAS)('%s + %s %j → %s', (estado, evento, ctx, esperado, fase) => {
    expect(transicionar(estado, evento, ctx)).toEqual({ estado: esperado, iniciaFase: fase });
    expect(podeTransicionar(estado, evento, ctx)).toBe(true);
  });

  it('recusa toda combinação estado × evento × contexto fora da tabela', () => {
    // Uma transição válida vale para o contexto em que foi declarada; os contextos de falha
    // repetem os de NOVO/ENTREGUE para todos os eventos que não sejam "retomar".
    const permitidas = new Set<string>();
    for (const [e, ev, c] of VALIDAS) {
      for (const outro of CONTEXTOS) {
        const mesmaEntrega = (outro.versaoAtual > 0) === (c.versaoAtual > 0);
        const mesmaFalha = ev !== 'retomar' || outro.erroFase === c.erroFase;
        if (mesmaEntrega && mesmaFalha) permitidas.add(chave(e, ev, outro));
      }
    }
    let recusadas = 0;
    for (const estado of ESTADOS) for (const evento of EVENTOS) for (const ctx of CONTEXTOS) {
      if (permitidas.has(chave(estado, evento, ctx))) continue;
      expect(() => transicionar(estado, evento, ctx), chave(estado, evento, ctx)).toThrow(TransicaoInvalida);
      expect(podeTransicionar(estado, evento, ctx)).toBe(false);
      recusadas++;
    }
    expect(recusadas).toBeGreaterThan(900);
  });

  it('retomar sem fase registrada é recusado', () => {
    expect(() => transicionar('erro', 'retomar', NOVO)).toThrow(TransicaoInvalida);
  });

  it('cancelado é terminal', () => {
    for (const evento of EVENTOS) {
      for (const ctx of CONTEXTOS) expect(podeTransicionar('cancelado', evento, ctx)).toBe(false);
    }
  });

  it('só uma fase roda por vez: nenhum evento do usuário inicia fase durante a execução', () => {
    const doUsuario: Evento[] = ['arquivos_enviados', 'respostas_enviadas', 'narrativa_aprovada', 'ajuste_narrativa_pedido', 'ajuste_pedido', 'retomar'];
    for (const estado of EM_EXECUCAO) for (const evento of doUsuario) for (const ctx of CONTEXTOS) {
      expect(podeTransicionar(estado, evento, ctx)).toBe(false);
    }
  });

  it('toda fase iniciada leva ao estado da própria fase', () => {
    for (const [, , , esperado, fase] of VALIDAS) if (fase) expect(esperado).toBe(estadoDaFase(fase));
  });

  it('auxiliares de interface', () => {
    expect(ESTADOS.filter(emExecucao)).toEqual(EM_EXECUCAO);
    expect(ESTADOS.filter(aceitaAjuste)).toEqual(['entregue']);
  });
});
