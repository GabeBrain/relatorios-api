import { describe, expect, it } from 'vitest';
import { describeTemporalFailure } from '../api';

describe('mensagens práticas para indisponibilidade temporal', () => {
  it('orienta renovação de sessão sem culpar o filtro', () => {
    expect(describeTemporalFailure('Jundiaí', [{ endpoint: 'sales', status: 401, empty: false }])).toContain('sessão de acesso');
  });

  it('separa indisponibilidade do provedor de um ajuste do relatório', () => {
    expect(describeTemporalFailure('Jundiaí', [{ endpoint: 'sales', status: 503, empty: false }])).toContain('instabilidade do provedor');
    expect(describeTemporalFailure('Jundiaí', [{ endpoint: 'sales', status: 422, empty: false }])).toContain('integração do nosso relatório');
  });

  it('explica resposta vazia sem converter o dado em zero', () => {
    expect(describeTemporalFailure('Jundiaí', [{ endpoint: 'medium-prices-meter', status: 200, empty: true }])).toContain('não disponibilizou dados');
  });
});
