import { describe, expect, it } from 'vitest';
import {
  exportAeloPercentCell,
  exportAeloPercentValue,
  exportAeloValue,
  formatAeloPercentValue,
} from '../RelatorioAelo';

describe('Relatório AELO — exportação de percentuais', () => {
  it('converte o valor da API para proporção percentual', () => {
    expect(formatAeloPercentValue(8.5)).toBe(0.085);
    expect(formatAeloPercentValue(100)).toBe(1);
    expect(formatAeloPercentValue(0)).toBe(0);
  });

  it.each(['Entrada', '% de Juros Mensal', 'Desconto à Vista'])
    ('gera célula numérica formatada para %s', () => {
      const value = exportAeloValue('Entrada', 8.5);
      const cell = { v: value, z: exportAeloPercentCell(8.5).z };
      expect(typeof cell.v).toBe('number');
      expect(cell.v).toBe(0.085);
      expect(cell.z).toBe('0.00%');
    });

  it('mantém valores nulos e vazios como null', () => {
    expect(exportAeloValue('Entrada', null)).toBeNull();
    expect(exportAeloValue('Entrada', '')).toBeNull();
  });
});
