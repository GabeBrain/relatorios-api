// Fluxo da análise (v0.62): sugestão de cidade e estado “análise pendente”.
// Origem: estudo de João Pessoa (Ana, 30/set) — o painel mostrava “0 erros” sem a
// análise completa ter rodado, porque o portão pedia a cidade num campo vazio.
import { describe, expect, it } from 'vitest';
import { cityFromText, suggestCity } from '../city-suggestion';
import { analysisPending } from '../db';
import type { Ir } from '../../audit/ir';

describe('sugestão de cidade', () => {
  it('lê cidade e UF do nome do arquivo sem engolir o resto do nome', () => {
    expect(cityFromText('Brain_Vocacional_Vertical_ECO_Construcoes_Incorporacoes_Joao_Pessoa - PB_V1')).toEqual({ cidade: 'João Pessoa', uf: 'PB' });
    expect(cityFromText('Brain_Vocacional_Vertical_Housi_Av. Castro Alves_Rolandia - PR_v1')).toEqual({ cidade: 'Rolândia', uf: 'PR' });
    expect(cityFromText('Brain_Vocacional_Vertical_Housi_Jardim Monte Bello_Campos do Jordao - SP_vAP_27jul')).toEqual({ cidade: 'Campos do Jordão', uf: 'SP' });
  });

  it('prefere o nome mais longo (São José dos Campos, não Campos)', () => {
    expect(cityFromText('Estudo Sao Jose dos Campos/SP')).toEqual({ cidade: 'São José dos Campos', uf: 'SP' });
  });

  it('sem cidade no nome, usa a capa; sem nada, não inventa', () => {
    const ir = { slides: [{ n: 1, titulo: 'Vocacional Vertical', textos: ['Toledo – PR', 'Junho/2026'] }] } as unknown as Ir;
    expect(suggestCity('Brain_Rua Raimundo Leonardi_VAP', ir)).toEqual({ cidade: 'Toledo', uf: 'PR', origem: 'capa' });
    expect(suggestCity('estudo final', { slides: [] } as unknown as Ir)).toBeNull();
    expect(cityFromText('Relatório - XY')).toBeNull();
  });
});

describe('análise pendente', () => {
  it('estudo V3 sem snapshot da análise completa está pendente', () => {
    expect(analysisPending({ generation: 'v3', status: 'em_correcao', analise: null })).toBe(true);
  });

  it('com snapshot, entregue, ou geração V2 antiga, não está', () => {
    const report = { tabelasExtraidas: 1, tabelasVerificadas: 1, imagensAnalisadas: 1, tabelasNativas: 1, geradoEm: 'x' };
    expect(analysisPending({ generation: 'v3', status: 'em_correcao', analise: report })).toBe(false);
    expect(analysisPending({ generation: 'v3', status: 'pronto', analise: null })).toBe(false);
    expect(analysisPending({ generation: 'v2', status: 'em_correcao', analise: null })).toBe(false);
  });
});
