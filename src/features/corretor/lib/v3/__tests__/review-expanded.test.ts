import { expect, it } from 'vitest';
import { presentTextFindings } from '../text-review';
import type { FindingV3 } from '../db';

const item = (id: string, evidence: string, detail: string): FindingV3 => ({
  ruleId: id, status: 'pendente', origem: 'IA_texto', primeiraVersao: 1,
  resolvidoNaVersao: null, verdict: null, verdictRevisado: false,
  finding: { id, type: 'SPELLING', slideRef: 's23', section: 'SOCIO', title: detail,
    detail, confidence: 2, viz: { kind: 'text', evidence } },
});

it('não agrupa ortografia e concordância em evidências contidas na mesma frase', () => {
  const rows = [item('iatxt-a', 'são esperado', 'Concordância verbal incorreta.'),
    item('iatxt-b', 'Até 2032 são esperado novos domicílios no OBSERTÓRIO.', "Erro de ortografia em 'OBSERTÓRIO'.")];
  expect(presentTextFindings(rows)).toHaveLength(2);
});

it('não agrupa duas palavras erradas citadas numa mesma frase', () => {
  const sentence = 'Avalição no OBSERTÓRIO.';
  expect(presentTextFindings([item('iatxt-a', sentence, "Erro de ortografia em 'Avalição'."),
    item('iatxt-b', sentence, "Erro de ortografia em 'OBSERTÓRIO'.")])).toHaveLength(2);
});

it('não agrupa instruções de correção conflitantes para o mesmo trecho', () => {
  expect(presentTextFindings([item('iatxt-a', 'são esperado', "'são esperado' deveria ser 'são esperados'."),
    item('iatxt-b', 'são esperado', "'são esperado' deveria ser 'é esperado'.")])).toHaveLength(2);
});
