import { describe, expect, it } from 'vitest';
import {
  EDITORIAL_WINDOW,
  availableEndQuarters,
  compareQuarters,
  editorialWindow,
  parseQuarter,
  quarterEndDate,
  quarterEndMonth,
  quarterStartDate,
  shiftQuarter,
} from '../domain/quarters';
import { collectByCity, completedValues } from '../domain/collection';
import { scopeCityLabel, scopeCitySlug } from '../types';

describe('OP-2 · período dinâmico (G-02)', () => {
  it('interpreta trimestre, ISO e formato brasileiro sem inventar valor inválido', () => {
    expect(parseQuarter('1T2026')).toBe('1T2026');
    expect(parseQuarter('2026-03-01')).toBe('1T2026');
    expect(parseQuarter('03/2026')).toBe('1T2026');
    expect(parseQuarter('2026-13-01')).toBeNull();
    expect(parseQuarter('')).toBeNull();
  });

  it('gera 17 trimestres terminando em qualquer fechamento, inclusive posterior a 1T/26', () => {
    const window = editorialWindow('3T2027');
    expect(window).toHaveLength(EDITORIAL_WINDOW);
    expect(window.at(-1)).toBe('3T2027');
    expect(window[0]).toBe('3T2023');
  });

  it('atravessa a virada de ano corretamente', () => {
    expect(editorialWindow('1T2026')[0]).toBe('1T2022');
    expect(shiftQuarter('4T2025', 1)).toBe('1T2026');
    expect(shiftQuarter('1T2026', -1)).toBe('4T2025');
  });

  it('mantém a janela estritamente ordenada e sem repetição', () => {
    const window = editorialWindow('2T2026');
    for (let index = 1; index < window.length; index += 1) {
      expect(compareQuarters(window[index - 1], window[index])).toBeLessThan(0);
    }
    expect(new Set(window).size).toBe(window.length);
  });

  it('deriva start_period e end_period do fechamento, sem data fixa de 2022', () => {
    expect(quarterStartDate('1T2026')).toBe('2026-01-01');
    expect(quarterEndDate('1T2026')).toBe('2026-03-31');
    // O trimestre encerra no último dia real do mês, incluindo fevereiro bissexto.
    expect(quarterEndDate('4T2025')).toBe('2025-12-31');
    expect(quarterEndMonth('3T2027')).toBe('2027-09');
  });

  it('oferece fechamentos posteriores a 1T/26 quando o trimestre corrente é posterior', () => {
    const options = availableEndQuarters('1T2025', new Date(Date.UTC(2026, 7, 27)));
    expect(options.at(-1)).toBe('3T2026');
    expect(options).toContain('2T2026');
    expect(options).toContain('1T2026');
  });

  it('nunca devolve lista vazia, mesmo com referência anterior ao início histórico', () => {
    expect(availableEndQuarters('1T2030', new Date(Date.UTC(2026, 0, 1)))).toEqual(['1T2030']);
  });
});

describe('OP-3 · rótulo e slug determinísticos do recorte multi-cidade', () => {
  it('formata uma, duas e várias cidades de forma estável', () => {
    expect(scopeCityLabel({ cities: ['Jundiaí'] })).toBe('Jundiaí');
    expect(scopeCityLabel({ cities: ['Jundiaí', 'Piracicaba'] })).toBe('Jundiaí e Piracicaba');
    expect(scopeCityLabel({ cities: ['Jundiaí', 'Piracicaba', 'Campinas'] })).toBe('Jundiaí, Piracicaba e Campinas');
    expect(scopeCityLabel({ cities: [] })).toBe('—');
  });

  it('gera slug sem acento e independente da ordem de seleção', () => {
    expect(scopeCitySlug({ cities: ['Jundiaí'] })).toBe('jundiai');
    expect(scopeCitySlug({ cities: ['Jundiaí', 'São Paulo'] })).toBe(scopeCitySlug({ cities: ['São Paulo', 'Jundiaí'] }));
    expect(scopeCitySlug({ cities: [] })).toBe('sem-cidade');
  });
});

describe('OP-3 · coleta multi-cidade (G-01)', () => {
  const ok = async (city: string) => `dados de ${city}`;

  it('coleta uma cidade e reporta estado ready', async () => {
    const result = await collectByCity(['Jundiaí'], ok);
    expect(result.state).toBe('ready');
    expect(result.completedCities).toEqual(['Jundiaí']);
    expect(result.failedCities).toEqual([]);
    expect(completedValues(result)).toEqual(['dados de Jundiaí']);
  });

  it('coleta duas cidades preservando ambas no consolidado', async () => {
    const result = await collectByCity(['Jundiaí', 'Piracicaba'], ok);
    expect(result.state).toBe('ready');
    expect(result.completedCities).toEqual(['Jundiaí', 'Piracicaba']);
    expect(completedValues(result)).toHaveLength(2);
  });

  it('deduplica e ignora cidades em branco no recorte solicitado', async () => {
    const result = await collectByCity(['Jundiaí', 'Jundiaí', '  ', ''], ok);
    expect(result.requestedCities).toEqual(['Jundiaí']);
  });

  it('respeita o limite de concorrência', async () => {
    let active = 0;
    let peak = 0;
    const cities = ['A', 'B', 'C', 'D', 'E', 'F'];
    await collectByCity(cities, async (city) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return city;
    }, { concurrency: 2 });
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('falha parcial nomeia a cidade e produz partial, nunca consolidado silencioso', async () => {
    const result = await collectByCity(['Jundiaí', 'Piracicaba'], async (city) => {
      if (city === 'Piracicaba') throw new Error('HTTP 500 na API GeoBrain');
      return `dados de ${city}`;
    });
    expect(result.state).toBe('partial');
    expect(result.completedCities).toEqual(['Jundiaí']);
    expect(result.failedCities).toEqual([{ city: 'Piracicaba', error: 'HTTP 500 na API GeoBrain' }]);
    // O valor da cidade que deu certo continua disponível: falha parcial não descarta o que fechou.
    expect(completedValues(result)).toEqual(['dados de Jundiaí']);
  });

  it('falha total devolve unavailable com todas as cidades listadas', async () => {
    const result = await collectByCity(['Jundiaí', 'Piracicaba'], async () => { throw new Error('token sem acesso'); });
    expect(result.state).toBe('unavailable');
    expect(result.completedCities).toEqual([]);
    expect(result.failedCities.map((row) => row.city)).toEqual(['Jundiaí', 'Piracicaba']);
    expect(completedValues(result)).toEqual([]);
  });

  it('cancelamento propaga exceção em vez de devolver consolidado incompleto', async () => {
    const controller = new AbortController();
    const promise = collectByCity(['Jundiaí', 'Piracicaba', 'Campinas'], async (city) => {
      if (city === 'Jundiaí') controller.abort(new Error('Coleta cancelada pelo usuário.'));
      await new Promise((resolve) => setTimeout(resolve, 5));
      return city;
    }, { concurrency: 1, signal: controller.signal });
    await expect(promise).rejects.toThrow(/cancelada/i);
  });

  it('sinal já abortado não dispara nenhuma requisição', async () => {
    const controller = new AbortController();
    controller.abort(new Error('Coleta cancelada.'));
    let calls = 0;
    await expect(collectByCity(['Jundiaí'], async (city) => { calls += 1; return city; }, { signal: controller.signal }))
      .rejects.toThrow(/cancelada/i);
    expect(calls).toBe(0);
  });
});
