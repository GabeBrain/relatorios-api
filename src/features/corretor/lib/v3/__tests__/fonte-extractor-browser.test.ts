import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { extractFonteFromExcel } from '../fonte-extractor-browser';
import { validateFonte } from '../fonte';

function workbookFile(name: string, sheets: Record<string, unknown[][]>): File {
  const workbook = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([sheetName, rows]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  });
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const buffer = bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes).buffer;
  return {
    name,
    size: buffer.byteLength,
    arrayBuffer: async () => buffer,
  } as File;
}

describe('extração browser das planilhas-fonte', () => {
  it('classifica e extrai oferta sem exigir fonte.json manual', async () => {
    const file = workbookFile('01. Consolidada - 1 Km.xlsx', {
      Padrão: [
        ['Relatório'],
        ['Padrão', 'Nº de Empreendimentos', 'Oferta Lançada', 'Oferta Atual', 'Vendas'],
        ['Econômico', 2, 192, 184, 8],
        ['Total', 2, 192, 184, 8],
      ],
      Ano: [['Ano', 'Oferta Lançada', 'Oferta Atual'], ['2025', 100, 80], ['Total', 100, 80]],
      Tipologia: [['Tipologia', 'Oferta Lançada', 'Oferta Atual'], ['2 dorm.', 90, 70], ['Total', 90, 70]],
    });

    const fonte = await extractFonteFromExcel([file], 'rolandia');

    expect(validateFonte(fonte)).toMatchObject({ ok: true, errors: [] });
    expect(fonte).toMatchObject({ fonte_version: 2, estudo: 'rolandia' });
    expect(fonte.inventario[0]).toMatchObject({ papel: 'oferta', recorte: '1 km' });
    expect(fonte.blocos).toHaveLength(3);
    expect(fonte.blocos[0].itens?.[0]).toMatchObject({
      rotulo: 'Econômico',
      valores: { n_empreendimentos: 2, oferta_lancada: 192, oferta_atual: 184, vendas: 8 },
    });
  });

  it('preserva arquivos não cobertos no inventário e emite avisos explícitos', async () => {
    const desconhecido = workbookFile('dados complementares.xlsx', { Dados: [['x', 1]] });
    const absorcao = workbookFile('Absorcao Cenarios.xlsx', { Cenários: [['x', 1]] });

    const fonte = await extractFonteFromExcel([desconhecido, absorcao], 'rolandia');

    expect(fonte.inventario).toHaveLength(2);
    expect(fonte.avisos.map((aviso) => aviso.tipo)).toEqual(['papel_desconhecido', 'cobertura_parcial']);
    expect(fonte.blocos).toEqual([]);
  });
});
