import { describe, expect, it } from 'vitest';
import { legacyStudyHref, portfolioHref, studyHref } from '../study-navigation';

describe('entrada e retorno de estudos', () => {
  it('preserva filtros da carteira ao entrar e sair sem acumular contexto recursivo', () => {
    const source = 'q=Monte+Bello&filter=all&page=2';
    const url = new URL(studyHref('study-a', 'revisao', source), 'http://localhost');
    expect(portfolioHref(url.searchParams.get('carteira')!)).toBe(`/corretor?${source}`);
    expect(studyHref('study-b', 'resumo', 'q=teste&carteira=q%3Doutro')).not.toContain('outro');
  });
  it('retorno direto é local e não aceita destino externo ou seleção antiga', () => {
    expect(portfolioHref('study=outro&return=https://outside.invalid')).toBe('/corretor');
    expect(studyHref('a/b', 'resumo')).toBe('/corretor/estudos/a%2Fb/resumo');
  });
  it('links de materiais/histórico antigos preservam versão e destino equivalente', () => {
    expect(legacyStudyHref('a', new URLSearchParams('tab=history&version=v2'))).toBe('/corretor/estudos/a/historico?version=v2');
    expect(legacyStudyHref('a', new URLSearchParams('tab=materials'))).toBe('/corretor/estudos/a/materiais');
  });
});
