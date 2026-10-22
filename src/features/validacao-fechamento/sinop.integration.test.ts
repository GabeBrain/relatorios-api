import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, it, vi } from 'vitest';
import { fetchValidationBuildings } from './api';
import { validateBuildings } from './validation-rules';

const source = process.env.VF_SINOP_SOURCE;
it.skipIf(!source)('executa a normalização real e as regras na base local de Sinop/MT', async () => {
  const raw = readFileSync(source!, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).map((line) => JSON.parse(line));
  expect(raw.length).toBeGreaterThan(0);
  expect(raw.every((b) => b.city === 'Sinop' && b.state === 'MT')).toBe(true);
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input);
    const selected = raw.filter((b) => b.building_type === url.searchParams.get('type'));
    const page = Number(url.searchParams.get('page'));
    return new Response(JSON.stringify({ data: selected.slice((page - 1) * 100, page * 100), meta: { last_page: Math.max(1, Math.ceil(selected.length / 100)) } }));
  }));
  try {
    const buildings = await fetchValidationBuildings({ uf: 'MT', city: 'Sinop', token: 'offline-fixture', signal: new AbortController().signal });
    expect(buildings).toHaveLength(raw.length);
    const result = validateBuildings(buildings);
    expect(result.length).toBeGreaterThan(0);
    const output = '.local-inputs/validacao-fechamento/sinop-typescript.json';
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ buildings: buildings.length, findings: result.length, categories: result.reduce<Record<string, number>>((counts, row) => { counts[row.rule] = (counts[row.rule] ?? 0) + 1; return counts; }, {}) }));
  } finally {
    vi.unstubAllGlobals();
  }
});
