import { describe, expect, it } from 'vitest';

import { sanitizeVisionPayload, toExtracted, wrongContextFromVisibleLocales } from '../ia-vision';
import { wrongCityFindings, wrongUfFindings } from '../../audit/ir-rules';
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

  it('sinaliza cidade IBGE divergente mesmo quando a UF ainda é a correta', () => {
    const ir: Ir = {
      ir_version: 1, arquivo: 'brumadinho', n_slides: 1,
      slides: [{ n: 3, titulo: 'Objetivos do estudo', secao_canonica: 'METODOLOGIA', textos: ['Realizar estudo no município de Curitiba – MG.'], fontes: [], notas: [], notas_edicao: [], notas_revisao: [], tabelas: [], graficos: [], n_imagens: 0 }],
    };
    expect(wrongCityFindings(ir, 'Brumadinho')).toMatchObject([{ type: 'WRONG_CONTEXT', slideRef: 's3' }]);
    expect(wrongCityFindings(ir, 'Curitiba')).toEqual([]);
  });

  it('ignora cidade que a visão INFERIU mas não transcreveu (alucinação s45)', () => {
    // Caso real Rolândia jul/2026: o modelo devolveu "São Paulo" como principal
    // a partir dos bairros "Centro" e "Jardim Das Américas"; o nome não existe
    // na imagem. Sem âncora no texto transcrito, não vira achado.
    const payload = {
      tables: [{
        title: 'Empreendimentos até 3 Km',
        columns: ['Empreendimento', 'Bairro', 'Oferta Lançada'],
        rows: [['Terrasse', 'Centro', 100], ['Boulevard', 'Jardim Das Américas', 192]],
      }],
    };
    expect(wrongContextFromVisibleLocales(
      [{ texto: 'São Paulo', tipo: 'cidade', principal: true }],
      { cidade: 'Rolândia', uf: 'PR' },
      { ...candidate, titulo: 'Empreendimentos até 3 Km' },
      payload,
    )).toEqual([]);
  });

  it('mantém o achado quando a cidade está escrita DENTRO da tabela-imagem', () => {
    // O nome só existe no print — é exatamente o vazamento que queremos pegar,
    // e a âncora o encontra porque a visão transcreveu a célula.
    const payload = {
      tables: [{
        title: 'Empreendimentos até 3 Km',
        columns: ['Empreendimento', 'Cidade', 'Oferta'],
        rows: [['Terrasse', 'São Paulo', 100], ['Boulevard', 'São Paulo', 192]],
      }],
    };
    const out = wrongContextFromVisibleLocales(
      [{ texto: 'São Paulo', tipo: 'cidade', principal: true }],
      { cidade: 'Rolândia', uf: 'PR' },
      { ...candidate, titulo: 'Empreendimentos até 3 Km' },
      payload,
    );
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('WRONG_CONTEXT');
  });

  it('sem payload de tabelas, mantém o comportamento anterior (não silencia)', () => {
    // Imagem sem tabela extraída (mapa/arte): não há o que ancorar, então a
    // regra continua valendo pelo julgamento da visão.
    expect(wrongContextFromVisibleLocales(
      [{ texto: 'São Paulo', tipo: 'cidade', principal: true }],
      { cidade: 'Rolândia', uf: 'PR' },
      { ...candidate, titulo: null },
      { tables: [] },
    )).toHaveLength(1);
  });

  it('descarta payload de visão malformado sem deixar map derrubar o passe', () => {
    const payload = sanitizeVisionPayload({
      tables: [{ columns: { errado: true }, rows: { errado: true }, totals: null }],
      locais_visiveis: { texto: 'Curitiba' },
      unidades: null,
    });
    expect(payload.tables).toEqual([]);
    expect(payload.locais_visiveis).toEqual([]);
    expect(toExtracted({ columns: {} as unknown as unknown[], rows: [] })).toBeNull();
  });
});
