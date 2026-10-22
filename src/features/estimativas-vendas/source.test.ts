import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpRequest } from '@/lib/http-client';
import { readHorizontalHistory } from './source';
vi.mock('@/lib/http-client', () => ({ httpRequest: vi.fn() }));
const request = vi.mocked(httpRequest);
beforeEach(() => request.mockReset());
describe('transporte de histórico', () => {
    it('pagina o vertical e preserva tipo, sem transformar ausência em zero', async () => { request.mockResolvedValueOnce({ ok: true, data: { data: [{ building_id: 1, typologies_history: [] }], meta: { last_page: 2 } } } as never).mockResolvedValueOnce({ ok: true, data: { data: [{ building_id: 2, typologies_history: [] }], meta: { last_page: 2 } } } as never); const r = await readHorizontalHistory('PR', 'Curitiba', undefined, undefined, 'Vertical'); expect(r.buildings.map(b => b.sourceType)).toEqual(['Vertical', 'Vertical']); expect(request.mock.calls[0][0].query).toMatchObject({ type: 'Vertical', page: 1 }); });
    it('falha integralmente se uma página falhar; nunca devolve sucesso parcial', async () => { request.mockResolvedValueOnce({ ok: true, data: { data: [], meta: { last_page: 2 } } } as never).mockResolvedValueOnce({ ok: false, error: 'falhou' } as never); await expect(readHorizontalHistory('PR', 'Curitiba')).rejects.toThrow('página 2'); });
    it('nega escopo vazio e paginação acima do teto', async () => { await expect(readHorizontalHistory('', '')).rejects.toThrow(); request.mockResolvedValueOnce({ ok: true, data: { data: [], meta: { last_page: 31 } } } as never); await expect(readHorizontalHistory('PR', 'Curitiba')).rejects.toThrow('30 páginas'); });
});
