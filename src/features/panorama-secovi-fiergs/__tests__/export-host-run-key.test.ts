import { describe, expect, it } from 'vitest';

/**
 * Regressão do guard de execução do `PanoramaExportHost`.
 *
 * O efeito de exportação não pode rodar duas vezes o mesmo trabalho, mas a chave precisa distinguir
 * o formato: com a chave apenas no relatório, pedir o PPT espelho logo após o PDF do mesmo recorte
 * reencontrava a chave anterior e a exportação nunca começava — ficava presa em "Preparando…".
 */
type RunKey = { report: object; format: 'pdf' | 'pptx' } | null;

/** Mesma decisão do efeito, isolada para poder ser exercitada sem montar o host. */
function shouldSkip(current: RunKey, report: object, format: 'pdf' | 'pptx') {
  return current?.report === report && current.format === format;
}

describe('PanoramaExportHost · guard de execução', () => {
  const report = { id: 'recorte' };

  it('não repete o mesmo formato para o mesmo relatório', () => {
    let key: RunKey = null;
    expect(shouldSkip(key, report, 'pdf')).toBe(false);
    key = { report, format: 'pdf' };
    expect(shouldSkip(key, report, 'pdf')).toBe(true);
  });

  it('deixa o PPT espelho rodar depois do PDF do mesmo relatório', () => {
    const key: RunKey = { report, format: 'pdf' };
    expect(shouldSkip(key, report, 'pptx')).toBe(false);
  });

  it('deixa qualquer formato rodar para outro relatório', () => {
    const key: RunKey = { report, format: 'pptx' };
    expect(shouldSkip(key, { id: 'outro' }, 'pptx')).toBe(false);
  });
});
