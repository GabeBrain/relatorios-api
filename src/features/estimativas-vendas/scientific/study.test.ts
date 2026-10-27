import { describe, expect, it } from 'vitest';
import type { Building } from '../source';
import { shiftMonth } from '../expanded/contract';
import { defaultProtocol, describeBuilding, groupedMetrics, inventory, predictCase, runStudy, studyMetrics, type StudyDataset, type StudyProtocol, type StudyTrial } from './study';
import { evidenceFiles } from './evidence';
import { portfolioRows } from './portfolio';

function building(overrides: Partial<Building> = {}): Building {
  return { id: '1', name: 'Exemplo privado', sourceType: 'Horizontal', release_date: '2025-01-01', estimation: true,
    typologies_history: [
      { period: '2026-03', typology_id: 1, pattern: 'Loteamento Fechado', qty: 100, typology_stock: 90, sold_in_period: 10 },
      { period: '2026-04', typology_id: 1, pattern: 'Loteamento Fechado', qty: 100, typology_stock: 80, sold_in_period: 10 },
      { period: '2026-05', typology_id: 1, pattern: 'Loteamento Fechado', qty: 100, typology_stock: 70, sold_in_period: 10 },
      { period: '2026-06', typology_id: 1, pattern: 'Loteamento Fechado', qty: 100, typology_stock: 60, sold_in_period: 10 },
      { period: '2026-09', typology_id: 1, pattern: 'Loteamento Fechado', qty: 100, typology_stock: 45, sold_in_period: 15 },
    ], ...overrides };
}
function dataset(buildings = [building()]): StudyDataset {
  return { buildings, city: 'Curitiba', uf: 'PR', fetchedAt: '2026-10-27T12:00:00Z', hash: 'test-hash' };
}
function protocol(d: StudyDataset, extra: Partial<StudyProtocol> = {}): StudyProtocol {
  return { ...defaultProtocol(d, 'all'), cutoffs: ['2026-06'], horizons: [3], ...extra };
}

describe('condições científicas por data', () => {
  it.each([48, 49, 60, 61])('distingue suporte horizontal e extensão na idade %i', age => {
    const b = building({ release_date: `${shiftMonth('2026-09', 1 - age)}-01` });
    const row = describeBuilding(b, '2026-09');
    expect(row.age).toBe(age);
    expect(row.tags.includes('finotti-horizontal')).toBe(age <= 60);
    expect(row.extension).toBe(age > 48 && age <= 60);
    expect(row.tags.includes('old-stock')).toBe(age > 60);
  });
  it.each([36, 37])('separa vertical antigo na idade %i', age => {
    const row = describeBuilding(building({ sourceType: 'Vertical', release_date: `${shiftMonth('2026-09', 1 - age)}-01` }), '2026-09');
    expect(row.tags.includes('finotti-vertical')).toBe(age <= 36);
    expect(row.tags.includes('old-stock')).toBe(age > 36);
  });
  it('não usa padrão atual ou flag do cadastro para reescrever o passado', () => {
    const b = building();
    const changed = { ...b, estimation: false, typologies_history: b.typologies_history.map(r => r.period > '2026-06' ? { ...r, pattern: 'Standard', qty: 1000, typology_stock: 900 } : r) };
    expect(predictCase(changed, '2026-06', [3], ['constant', 'stock-trend'])).toEqual(predictCase(b, '2026-06', [3], ['constant', 'stock-trend']));
  });
  it('estoque zero é separado, padrão não mapeado tem motivo e condições se sobrepõem', async () => {
    const b = building({ release_date: '2026-08-01' }); b.typologies_history = [{ ...b.typologies_history.at(-1)!, pattern: 'Standard', typology_stock: 0 }];
    const row = describeBuilding(b, '2026-09');
    expect(row.tags).toEqual(expect.arrayContaining(['sold-out', 'short-history', 'other-pattern']));
    const d = dataset([b]), out = await runStudy(d, protocol(d, { cutoffs: ['2026-09'] }));
    expect(out.trials.every(t => t.predicted === null && t.error === null)).toBe(true);
  });
  it('recusa IDs repetidos e mantém dados ausentes/duplicados como impedimento', () => {
    expect(() => inventory([building(), building()], '2026-06')).toThrow('duplicados');
    const b = building(); b.typologies_history.push({ ...b.typologies_history[0] });
    expect(describeBuilding(b, '2026-06').origin).toBeNull();
    expect(describeBuilding(building(), '2026-07').stock).toBeNull();
  });
  it('separa porte pequeno e suspensão sem alterar o motor da referência', () => {
    const small = building(); small.typologies_history = small.typologies_history.map(r => ({ ...r, qty: 9, typology_stock: 5 }));
    expect(describeBuilding(small, '2026-09').tags).not.toContain('finotti-horizontal');
    const suspended = building(); suspended.typologies_history.at(-1)!.building_status = 'Suspenso';
    expect(describeBuilding(suspended, '2026-09').tags).toContain('other-pattern');
    expect(describeBuilding(suspended, '2026-09').tags).not.toContain('finotti-horizontal');
  });
});

describe('retrospectiva e alvos', () => {
  it('compara referências simples e bloqueia treino Finotti posterior ao teste', async () => {
    const d = dataset(), out = await runStudy(d, protocol(d));
    const constant = out.trials.find(t => t.method === 'constant')!;
    const recent = out.trials.find(t => t.method === 'stock-trend')!;
    expect([constant.predicted, constant.actual, constant.error]).toEqual([60, 45, 15]);
    expect([recent.predicted, recent.actual, recent.error]).toEqual([30, 45, -15]);
    expect(constant.provenance).toBe('unknown');
    expect(constant.matched).toBe(true); expect(recent.matched).toBe(true);
    expect(out.trials.find(t => t.method === 'finotti-reference')).toMatchObject({ predicted: null, error: null, matched: false });
    expect(out.trials.find(t => t.method === 'finotti-reference')!.reason).toContain('setembro/2026');
  });
  it('alterar futuro muda o alvo, nunca a previsão ou a condição passada', async () => {
    const original = building(), changed = building(); changed.typologies_history.at(-1)!.typology_stock = 20;
    const a = dataset([original]), b = dataset([changed]);
    const one = await runStudy(a, protocol(a)), two = await runStudy(b, protocol(b));
    expect(one.cases).toEqual(two.cases);
    expect(one.trials.map(t => t.predicted)).toEqual(two.trials.map(t => t.predicted));
    expect(one.trials[0].actual).not.toBe(two.trials[0].actual);
  });
  it('mensal e trimestral são datas, não confirmação da duração das vendas', async () => {
    const d = dataset(), p = protocol(d, { target: 'net' });
    const unknown = await runStudy(d, p);
    expect(unknown.trials.every(t => t.actual === null)).toBe(true);
    d.evidence = { '1|2026-09': { provenance: 'observed', intervalMonths: 3, source: 'Contrato de teste sintético' } };
    const documented = await runStudy(d, p);
    expect(documented.trials[0]).toMatchObject({ actual: 15, predicted: 0, error: -15, provenance: 'observed' });
    d.evidence['1|2026-09'].intervalMonths = 1;
    expect((await runStudy(d, p)).trials[0].actual).toBeNull();
  });
  it('origem do alvo é por período e exige fonte, sem herdar estimation do cadastro', async () => {
    const d = dataset(); d.evidence = { '1|2026-09': { provenance: 'observed', source: 'Teste: fonte identificada' } };
    expect((await runStudy(d, protocol(d))).trials[0].provenance).toBe('observed');
    d.evidence['1|2026-09'].source = '';
    expect((await runStudy(d, protocol(d))).trials[0].provenance).toBe('unknown');
  });
  it('revisão de oferta ou tipologias no futuro impede alvo comparável', async () => {
    const b = building(); b.typologies_history.at(-1)!.qty = 120;
    const d = dataset([b]), out = await runStudy(d, protocol(d));
    expect(out.trials[0]).toMatchObject({ predicted: 60, actual: null, error: null });
    expect(out.trials[0].reason).toContain('Oferta');
  });
  it('revisão de tipologias dentro da janela bloqueia ritmo mesmo com soma estável', () => {
    const b = building(); b.typologies_history[1].typology_id = 99;
    expect(predictCase(b, '2026-06', [3], ['stock-trend']).methods['stock-trend'].forecast).toBeNull();
  });
  it('não inventa resultado ausente nem impede leitura de estoque com fluxo negativo', async () => {
    const b = building(); b.typologies_history[1].sold_in_period = -2;
    const d = dataset([b]), out = await runStudy(d, protocol(d, { horizons: [3, 12] }));
    expect(out.trials.find(t => t.horizon === 12)?.actual).toBeNull();
    expect(out.trials.find(t => t.horizon === 3 && t.method === 'constant')?.actual).toBe(45);
    expect(out.cases[0].inventory.reasons.some(r => r.includes('negativas'))).toBe(true);
  });
  it('cancelamento não entrega resultado parcial; protocolo incompatível é recusado', async () => {
    const d = dataset(), ctrl = new AbortController(); ctrl.abort();
    await expect(runStudy(d, protocol(d), ctrl.signal)).rejects.toMatchObject({ name: 'AbortError' });
    await expect(runStudy(d, protocol(d, { datasetHash: 'outro' }))).rejects.toThrow('snapshot');
    await expect(runStudy(d, protocol(d, { methods: [] }))).rejects.toThrow('métodos');
  });
  it('snapshot e protocolo repetidos reproduzem todo o resultado e arquivos de evidência', async () => {
    const d = dataset(), p = protocol(d), a = await runStudy(d, p), b = await runStudy(d, p);
    expect(a).toEqual(b);
    const files = evidenceFiles(d, inventory(d.buildings, '2026-09'), a);
    expect(files['protocolo.json']).toContain('test-hash'); expect(files['avaliacoes.csv']).toContain('finotti-reference');
    expect(files['LEIA-ME.txt']).toContain('Não é arquivo de importação');
  });
  it('carteira preserva membros e soma somente quando todos têm previsão', async () => {
    const b = building({ id: '2' }); b.typologies_history = b.typologies_history.filter(r => r.period !== '2026-03');
    const d = dataset([building(), b]), out = await runStudy(d, protocol(d));
    expect(portfolioRows(out, out.cases, 'constant')[3]).toMatchObject({ predicted: 120, actual: 90, members: 2, missing: 0 });
    expect(portfolioRows(out, out.cases, 'stock-trend')[3]).toMatchObject({ predicted: null, members: 2, missing: 1 });
    expect(() => portfolioRows(out, [out.cases[0], out.cases[0]], 'constant')).toThrow('únicos');
  });
});

describe('métricas de comparação', () => {
  it('amostra comum usa chaves iguais e não exclui baselines por Finotti indisponível', async () => {
    const b = building({ id: '2' }); b.typologies_history = b.typologies_history.filter(r => r.period !== '2026-03');
    const d = dataset([building(), b]), out = await runStudy(d, protocol(d));
    const all = groupedMetrics(out).filter(r => r.provenance === 'unknown');
    const common = groupedMetrics(out, true).filter(r => r.provenance === 'unknown');
    expect(all.find(r => r.method === 'constant')?.evaluated).toBe(2);
    expect(common.find(r => r.method === 'constant')?.evaluated).toBe(1);
    expect(common.find(r => r.method === 'stock-trend')?.evaluated).toBe(1);
    expect(common.find(r => r.method === 'finotti-reference')?.maeUnits).toBeNull();
  });
  it('erros médios dão peso igual por empreendimento; vazio continua nulo e venda zero é válida', () => {
    const rows = [{ id: '1', error: 1, units: 100 }, { id: '1', error: 3, units: 100 }, { id: '2', error: -10, units: 100 }] as StudyTrial[];
    expect(studyMetrics(rows)).toMatchObject({ maeUnits: 6, biasUnits: -4, buildings: 2, evaluated: 3 });
    expect(studyMetrics([]).maeUnits).toBeNull();
    expect(studyMetrics([{ id: '1', error: 0, actual: 0, predicted: 0, units: 100 }] as StudyTrial[]).maeUnits).toBe(0);
  });
});
