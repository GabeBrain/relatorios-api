import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import corpus from './fixtures/review-expanded-numeric.json';
import textCorpus from './fixtures/review-v069-text.json';
import units from './fixtures/review-expanded-units.json';

for (const c of corpus.cases) it(`confere transcrição, associação e soma: ${c.id}`, () => {
  const sums = c.columns.map((_, col) => c.rows.reduce((total, row) => total + row[col], 0));
  expect(sums).toEqual(c.expectedSums);
  expect(c.rows.every(row => row.length === c.columns.length)).toBe(true);
  expect(c.totals).toHaveLength(c.columns.length);
  expect(c.limitation.length).toBeGreaterThan(30);
  if (existsSync(c.path)) expect(createHash('sha256').update(readFileSync(c.path)).digest('hex')).toBe(c.sha256);
});
it('explicita magnitude OCR errada sem desligar divergência verdadeira', () => {
  const c = corpus.cases[0];
  expect(c.rows[7][0]).toBe(9947578);
  expect(c.totals[0] - c.expectedSums[0]).toBe(1236781);
  const result = corpus.cases.map(c => ({ id: c.id, columns: c.columns.map((name, col) => ({ name,
    sum: c.expectedSums[col], total: c.totals[col], delta: c.totals[col] - c.expectedSums[col] })), limitation: c.limitation }));
  if (existsSync('.local-inputs')) writeFileSync('.local-inputs/review-expanded-numeric-result.json', JSON.stringify(result, null, 2));
});

for (const [id, n] of [['cj', 23], ['vap', 24], ['v2', 22]] as const) it(`preserva unidade errada Brasil: ${id}`, () => {
  const slide = textCorpus.find(c => c.id === id)!.ir.slides.find(s => s.n === n)!;
  expect(slide.textos.join(' ')).toContain('75.298.796 hab.');
  const source = units.find(u => u.caseIds.includes(id))!;
  expect(source.sheet).toBe('Domicilios'); expect(source.cells.A9).toBe('Brasil');
  expect(source.cells.D9).toBe(75298796); expect(source.cells.G9).toBe(75298796);
});
