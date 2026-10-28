import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import * as XLSX from 'xlsx';
import { shiftMonth } from '../expanded/contract';
import type { Building } from '../source';
import { aggregatePortfolio, ALL_METHODS, analyzeCase, capabilities, chartRows, metricTrials, pairedTrials, present, type AnalysisSpec, type Universe } from './domain';
import { buildExportPlan, csv, IVV_HEADERS, packageFiles } from './export';
import { zipSync } from 'fflate';

function building(id = '001', multi = false): Building {
  return { building_id: id, name: '=Projeto <teste>', release_date: '2026-01-01', sourceType: 'Horizontal', typologies_history: Array.from({ length: 12 }, (_, i) => ({ period: `${shiftMonth('2026-01', i)}-01`, typology_id: '0009', pattern: 'Loteamento Fechado', qty: 100, typology_stock: 90 - i * 3, sold_in_period: 3, building_status: 'Ativo' })).flatMap(r => multi ? [r, { ...r, typology_id: '0010' }] : [r]) };
}
function dataset(buildings = [building()]): Universe { return { schema: 'forecast-universe-v1', complete: true, areas: [{ city: 'Curitiba', uf: 'PR' }], locations: Object.fromEntries(buildings.map(b => [String(b.building_id), { city: 'Curitiba', uf: 'PR' }])), requests: [], missingIds: [], hash: 'fixture-hash', fetchedAt: '2026-10-28T12:00:00Z', city: 'Curitiba', uf: 'PR', buildings }; }
const spec: AnalysisSpec = { cutoff: '2026-09', duration: 3, methods: ALL_METHODS };
describe('experiência: rigor temporal e exportação do conjunto', () => {
  it('classifica disponibilidade no universo inteiro sem promover origem desconhecida', async () => {
    const data = dataset([building(), building('002')]); data.buildings[1].typologies_history = [];
    const available = await capabilities(data, ['001', '002'], spec.cutoff);
    expect(available['001']).toContain('finotti-reference'); expect(available['002']).toEqual([]);
    expect((await analyzeCase(data, '001', spec)).stock.trials.every(t => t.provenance === 'unknown')).toBe(true);
  });
  it('mantém referência e política explícita; passado anterior ao treino fica bloqueado', async () => {
    const data = dataset(); const a = await analyzeCase(data, '001', spec);
    expect(present(a).method).toBe('finotti-reference');
    const old = await analyzeCase(data, '001', { ...spec, cutoff: '2026-06' });
    expect(old.stock.cases[0].methods['finotti-reference'].forecast).toBeNull();
    expect(present(old).method).toBe('stock-trend');
    expect(old.stock.trials.some(t => t.error !== null)).toBe(true);
  });
  it('mudanças futuras não alteram previsão e ausência não vira zero', async () => {
    const a = dataset(), b = dataset(); b.buildings[0].typologies_history.at(-1)!.typology_stock = null;
    const left = await analyzeCase(a, '001', spec), right = await analyzeCase(b, '001', spec);
    expect(left.stock.cases[0].methods).toEqual(right.stock.cases[0].methods);
    expect(right.stock.trials.filter(t => t.targetMonth === '2026-12').every(t => t.actual === null)).toBe(true);
  });
  it('esgotado atual participa do teste quando havia estoque', async () => {
    const data = dataset(); data.buildings[0].typologies_history.at(-1)!.typology_stock = 0;
    expect(present(await analyzeCase(data, '001', { ...spec, cutoff: '2026-12' })).row.stock).toBe(0);
    expect(present(await analyzeCase(data, '001', spec)).method).not.toBeNull();
  });
  it('saldo trimestral não é soma; origem desconhecida bloqueia avaliação de fluxo', async () => {
    const data = dataset(), a = await analyzeCase(data, '001', spec);
    const rows = chartRows(data.buildings[0], a, 'stock', 3);
    expect(rows.filter(r => r.month > spec.cutoff).map(r => r.month)).toEqual(['2026-12']);
    expect(rows.at(-1)!.reported).toBe(57);
    expect(metricTrials(a, 'net', 3).every(t => t.actual === null)).toBe(true);
  });
  it('fluxo trimestral não civil só é comparado com intervalo confirmado', async () => {
    const b = building(); b.typologies_history = [b.typologies_history[0], { ...b.typologies_history[3], sold_in_period: 9 }];
    const data = dataset([b]); data.evidence = { '001|2026-04': { provenance: 'observed', intervalMonths: 3, source: 'fixture documentada' } };
    const a = await analyzeCase(data, '001', { ...spec, cutoff: '2026-01', methods: ['constant'] });
    expect(metricTrials(a, 'net', 3)[0].actual).toBe(9);
    expect(metricTrials(a, 'net', 1).find(t => t.horizon === 1)?.actual).toBeNull();
  });
  it('carteira incompleta não apresenta total e amostras diferentes não são pareadas', async () => {
    const data = dataset([building(), building('002')]); data.buildings[1].typologies_history = [];
    const a = await analyzeCase(data, '001', spec), b = await analyzeCase(data, '002', spec);
    expect(aggregatePortfolio([a, b], 'shown', 'stock', 1)[0].predicted).toBeNull();
    const paired = pairedTrials([...a.stock.trials, ...b.stock.trials], ALL_METHODS);
    expect(paired.every(t => t.id === '001')).toBe(true);
  });
  it('preserva seleção/período, não gera linhas candidatas sobre histórico e não rateia tipologias', async () => {
    const data = dataset([building(), building('002', true)]), next = { ...spec, cutoff: '2026-12' };
    const a = await analyzeCase(data, '001', next), b = await analyzeCase(data, '002', next);
    const plan = buildExportPlan(data, ['001', '002'], [a, b], next);
    expect(plan.forecasts).toHaveLength(6); expect(plan.candidates).toHaveLength(3);
    expect(plan.candidates.every(r => r['ID Empreendimento'] === '001')).toBe(true);
    expect(plan.candidates[0]['Mês de referência']).toBe('01/2027');
    expect(plan.candidates[0]['Preço']).toBeNull(); expect(plan.candidates[0].Distrato).toBeNull();
    expect(plan.candidates[0]['Foi estimado?']).toBe('Sim');
    expect(plan.manifest.importable).toBe(false);
    const past = buildExportPlan(data, ['001'], [await analyzeCase(data, '001', spec)], spec);
    expect(past.candidates).toHaveLength(0); expect(past.forecasts.every(r => r.finalidade === 'comparacao_historica')).toBe(true);
    expect(() => buildExportPlan(data, ['001'], [a], spec)).toThrow(/desatualizados/);
  });
  it('reabre ZIP/XLSX, preserva IDs em texto, conserva unidades e sanitiza HTML/CSV', async () => {
    const data = dataset(), next = { ...spec, cutoff: '2026-12' }, a = await analyzeCase(data, '001', next), plan = buildExportPlan(data, ['001'], [a], next);
    const files = await packageFiles(plan), read = unzipSync(zipSync(files));
    expect(JSON.parse(strFromU8(read['manifesto.json'])).selectedIds).toEqual(['001']);
    const wb = XLSX.read(read['CANDIDATO_NAO_IMPORTAR.xlsx'], { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
    expect(rows[0]).toEqual(IVV_HEADERS); expect(rows[1][0]).toBe('001'); expect(rows[1][2]).toBe('0009');
    let stock = a.stock.cases[0].inventory.stock!;
    for (const r of plan.forecasts) { expect(stock - Number(r.vendas_liquidas_estimadas)).toBeCloseTo(Number(r.estoque_estimado), 8); stock = Number(r.estoque_estimado); }
    expect(csv([{ name: '=SUM(1)', other: '@cmd' }])).toContain("'=SUM");
    expect(plan.summary).not.toContain('<teste>');
    const integrity = JSON.parse(strFromU8(read['integridade.json'])); expect(integrity['previsoes.csv']).toMatch(/^[a-f0-9]{64}$/);
  });
});
