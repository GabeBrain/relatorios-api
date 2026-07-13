import { describe, expect, it } from 'vitest';

import { wrongContextFromVisibleLocales } from '../ia-vision';
import { wrongUfFindings } from '../../audit/ir-rules';
import type { Ir } from '../../audit/ir';

const candidate = { slide: 36, secao: 'SOCIO', titulo: 'Dados sociodemográficos', sha1: '1234567890abcdef' };

describe('WRONG_CONTEXT — cidade/UF', () => {
  it('sinaliza cidade protagonista divergente vista na imagem', () => {
    const findings = wrongContextFromVisibleLocales(
      [{ texto: 'São Paulo', tipo: 'cidade', principal: true }],
      { cidade: 'Guarulhos', uf: 'SP' }, candidate,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ type: 'WRONG_CONTEXT', slideRef: 's36', evidenceSha1: candidate.sha1 });
  });

  it('não sinaliza cidade esperada, estado esperado ou tabela comparativa', () => {
    expect(wrongContextFromVisibleLocales(
      [{ texto: 'Guarulhos', tipo: 'cidade', principal: true }], { cidade: 'Guarulhos', uf: 'SP' }, candidate,
    )).toEqual([]);
    expect(wrongContextFromVisibleLocales(
      [{ texto: 'São Paulo', tipo: 'cidade', principal: true }], { cidade: 'Guarulhos', uf: 'SP' },
      { ...candidate, titulo: 'Dados do Estado de São Paulo' },
    )).toEqual([]);
  });

  it('sinaliza somente UFs brasileiras diferentes da UF da ata', () => {
    const ir: Ir = {
      ir_version: 1, arquivo: 'teste', n_slides: 1,
      slides: [{ n: 12, titulo: 'São Paulo – MS', secao_canonica: 'CAPA', textos: [], fontes: [], notas: [], notas_edicao: [], notas_revisao: [], tabelas: [], graficos: [], n_imagens: 0 }],
    };
    expect(wrongUfFindings(ir, 'SP')).toHaveLength(1);
    expect(wrongUfFindings(ir, 'MS')).toEqual([]);
  });
});
