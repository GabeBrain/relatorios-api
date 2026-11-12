import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readHorizontalHistory } from '../source';
import { loadUniverse } from './universe';
vi.mock('../source', async original => ({ ...await original<typeof import('../source')>(), readHorizontalHistory: vi.fn() }));
vi.mock('../scientific/client', () => ({ snapshotHash: async () => 'test-hash' }));
const read = vi.mocked(readHorizontalHistory);
beforeEach(() => read.mockReset());
describe('contrato de universo', () => {
  it('percorre cidades e tipos sem multiplicar pools; mantém local e recorte IDs', async () => {
    let active = 0, peak = 0; const calls: string[] = [];
    read.mockImplementation(async (uf, city, _signal, _progress, type) => { active++; peak = Math.max(peak, active); calls.push(`${city}|${type}`); await new Promise(r => setTimeout(r, 2)); active--; return { buildings: [{ building_id: `${city}-${type}`, typologies_history: [], sourceType: type }], pages: 1, fetchedAt: '' }; });
    const out = await loadUniverse([{ city: 'Curitiba', uf: 'PR' }, { city: 'Londrina', uf: 'PR' }], ['Curitiba-Horizontal', 'ausente'], new AbortController().signal, vi.fn());
    expect(peak).toBe(1); expect(calls).toHaveLength(4); expect(out.buildings).toHaveLength(1);
    expect(out.locations['Curitiba-Horizontal'].city).toBe('Curitiba'); expect(out.missingIds).toEqual(['ausente']); expect(out.complete).toBe(true);
  });
  it('falha no segundo tipo ou ID repetido não devolve universo parcial', async () => {
    read.mockResolvedValueOnce({ buildings: [], pages: 1, fetchedAt: '' }).mockRejectedValueOnce(new Error('falha vertical'));
    await expect(loadUniverse([{ city: 'Curitiba', uf: 'PR' }], [], new AbortController().signal, vi.fn())).rejects.toThrow('falha vertical');
    read.mockResolvedValue({ buildings: [{ building_id: 'same', typologies_history: [] }], pages: 1, fetchedAt: '' });
    await expect(loadUniverse([{ city: 'Curitiba', uf: 'PR' }], [], new AbortController().signal, vi.fn())).rejects.toThrow('repetido');
  });
});
