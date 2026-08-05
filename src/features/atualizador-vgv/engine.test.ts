import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildAdjustments, findColumn, normalizeText, parseIndexArrayBuffer, parseVgvArrayBuffer, toNumber } from './engine';
import type { IndexSeries, PerformanceRow } from './types';
import { INDEX_NAMES } from './types';

function workbookBuffer(rows: unknown[][]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Base');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

describe('Atualizador VGV — motor client-side', () => {
  function assetBuffer(name: string): ArrayBuffer {
    const bytes = readFileSync(resolve('public', 'atualizador-vgv', name));
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }

  it('normaliza acentos e encontra colunas por equivalência', () => {
    expect(normalizeText('Preço de Lançamento')).toBe('preco de lancamento');
    expect(findColumn(['Endereço', 'VGV Oferta Final'], ['Endereco'])).toBe('Endereço');
  });

  it('interpreta números brasileiros e internacionais', () => {
    expect(toNumber('1.234,56')).toBe(1234.56);
    expect(toNumber('1,234.56')).toBe(1234.56);
    expect(toNumber(42)).toBe(42);
  });

  it('converte blocos mensais da planilha para performance longa', () => {
    const buffer = workbookBuffer([
      ['Empreendimento', 'Cidade', 'Tipologia', 'Latitude', 'Longitude', '01/2021', null, null, null, null, null, null],
      [null, null, null, null, null, 'Estoque', 'Vendas', 'Preço', 'VGV Total', 'VGV Oferta Final', 'Status', 'Preço de Lançamento'],
      ['Edifício Aurora', 'Curitiba', '2 quartos', -25.43, -49.27, 10, 2, 5000, 5000000, 1000000, 'Ativo', 4500],
    ]);
    const parsed = parseVgvArrayBuffer(buffer);
    expect(parsed.base).toHaveLength(1);
    expect(parsed.metadata.monthLabels).toEqual(['01/2021']);
    expect(parsed.performance).toHaveLength(1);
    expect(parsed.performance[0].Empreendimento).toBe('Edifício Aurora');
    expect(parsed.performance[0]['VGV Oferta Final']).toBe(1000000);
  });

  it('aplica a fórmula de reajuste direto para todos os índices', () => {
    const performance: PerformanceRow[] = [{
      __registro_id: 1,
      Empreendimento: 'Aurora',
      Tipologia: '2 quartos',
      Mes: '01/2021',
      MesData: new Date(Date.UTC(2021, 0, 1)),
      'VGV Oferta Final': 100,
    }];
    const series = Object.fromEntries(['INCC-DI', 'IPCA', 'IGP-DI'].map((name) => [name, [
      { monthKey: '01/2021', date: new Date(Date.UTC(2021, 0, 1)), value: 50 },
      { monthKey: '12/2025', date: new Date(Date.UTC(2025, 11, 1)), value: 100 },
    ]])) as IndexSeries;
    const rows = buildAdjustments(performance, series);
    expect(rows[0].corrected['INCC-DI']).toBe(200);
    expect(rows[0].corrected.IPCA).toBe(200);
    expect(rows[0].corrected['IGP-DI']).toBe(200);
  });

  it('mantém paridade estrutural com a base e os índices reais da versão Streamlit', () => {
    const sampleBuffer = assetBuffer('tabelaEmpreendimentoReduzida.xlsx');
    const sampleWorkbook = XLSX.read(sampleBuffer, { type: 'array', cellDates: true });
    const sampleMatrix = XLSX.utils.sheet_to_json<unknown[]>(sampleWorkbook.Sheets[sampleWorkbook.SheetNames[0]], { header: 1, defval: null, raw: true });
    expect(sampleMatrix).toHaveLength(21);
    const parsed = parseVgvArrayBuffer(sampleBuffer);
    expect(parsed.base).toHaveLength(19);
    expect(parsed.columns).toHaveLength(118);
    expect(parsed.performance).toHaveLength(57);
    expect(parsed.metadata.monthLabels).toEqual(['01/2021', '02/2021', '03/2021']);
    expect(parsed.metadata.amenityColumns).toHaveLength(66);

    const incc = parseIndexArrayBuffer(assetBuffer('INCC_Series_MeDI.xlsx'), 'INCC-DI');
    const ipca = parseIndexArrayBuffer(assetBuffer('343b-serie-historica-ipca-ibge.xlsx'), 'Plan1');
    const igp = parseIndexArrayBuffer(assetBuffer('8dec-serie-historica-igp-di-fgv.xlsx'), 'Plan1');
    expect(incc).toHaveLength(378);
    expect(ipca).toHaveLength(385);
    expect(igp).toHaveLength(378);
    expect(incc.at(-1)?.monthKey).toBe('01/2026');
    const adjustments = buildAdjustments(parsed.performance, { 'INCC-DI': incc, IPCA: ipca, 'IGP-DI': igp });
    expect(adjustments).toHaveLength(57);
    expect(adjustments.every((row) => INDEX_NAMES.every((name) => Number.isFinite(row.corrected[name])))).toBe(true);
  });
});
