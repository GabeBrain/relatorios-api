import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { strFromU8 } from 'fflate';
import { FORECAST_COLUMNS, forecastTable, moveForecastColumn, validateForecastColumns, type ForecastColumn } from './exportColumns';
import { forecastWorkbook, packageFiles, type ExportPlan } from './export';

describe('colunas da prévia e do arquivo completo', () => {
  it('reordena sem alterar a entrada e rejeita layout vazio/duplicado/desconhecido', () => {
    expect(moveForecastColumn(FORECAST_COLUMNS, 'mes', 'id_empreendimento')[0]).toBe('mes');
    expect(FORECAST_COLUMNS[0]).toBe('id_empreendimento');
    expect(() => validateForecastColumns([])).toThrow();
    expect(() => validateForecastColumns(['mes', 'mes'])).toThrow();
    expect(() => validateForecastColumns(['outro' as ForecastColumn])).toThrow();
  });
  it('reabre todas as 72 linhas, com as mesmas colunas da prévia e tipos preservados', async () => {
    const rows = Array.from({ length: 72 }, (_, i) => ({ id_empreendimento: '0001', empreendimento: '=Nome literal', mes: `2027-${String(i % 12 + 1).padStart(2, '0')}`, cidade: 'Curitiba', vendas_liquidas_estimadas: i === 0 ? null : 0.123456789, estoque_estimado: 100 - i, importavel: false }));
    const plan = { forecasts: rows, candidates: [], history: [], exclusions: [], trials: [], summary: '', report: '', manifest: { snapshotHash: 'synthetic', spec: { cutoff: '2026-12', duration: 36 }, importable: false } } as unknown as ExportPlan;
    const columns: ForecastColumn[] = ['mes', 'id_empreendimento', 'empreendimento', 'vendas_liquidas_estimadas', 'estoque_estimado', 'importavel'];
    const preview = forecastTable(rows.slice(0, 50), columns);
    expect(preview).toHaveLength(51);
    const wb = XLSX.read(await forecastWorkbook(plan, columns), { type: 'array' });
    const data = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets.previsoes, { header: 1, defval: null });
    expect(data).toHaveLength(73); expect(data.slice(0, 51)).toEqual(preview);
    expect(data[0]).toEqual(columns); expect(data[1][1]).toBe('0001'); expect(data[1][3]).toBeNull(); expect(data[2][3]).toBe(0.123456789); expect(data[1][5]).toBe(false);
    expect(wb.Sheets.previsoes.C2.t).toBe('s'); expect(wb.Sheets.previsoes.C2.f).toBeUndefined();
    expect(wb.SheetNames).toContain('leia_me');
    const files = await packageFiles(plan, columns);
    expect(strFromU8(files['previsoes.csv']).replace(/^\uFEFF/, '').split('\r\n')[0]).toBe(columns.join(';'));
    expect(JSON.parse(strFromU8(files['manifesto.json'])).analyticalExportColumns).toEqual(columns);
    expect(JSON.parse(strFromU8(files['integridade.json']))['previsoes.csv']).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0].cidade).toBe('Curitiba');
  });
});
