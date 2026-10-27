import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpRequest } from '@/lib/http-client';
import { readHorizontalHistory } from './source';
vi.mock('@/lib/http-client', () => ({ httpRequest: vi.fn() }));
const request = vi.mocked(httpRequest);
beforeEach(() => { request.mockReset(); });
describe('transporte de histórico', () => {
    it('limita a oito chamadas concorrentes e preserva ordem com respostas fora de ordem', async () => {
        let active = 0, peak = 0;
        const progress: number[] = [];
        request.mockImplementation(async options => {
            const page = Number(options.query?.page);
            active++; peak = Math.max(peak, active);
            await new Promise(resolve => setTimeout(resolve, page === 2 ? 30 : 3));
            active--;
            return {ok:true, data:{data:[{building_id:page,typologies_history:[]}],meta:{last_page:18}}} as never;
        });
        const out = await readHorizontalHistory('GO','Goiânia',undefined,n => progress.push(n),'Vertical');
        expect(peak).toBe(8);
        expect(out.buildings.map(b => b.building_id)).toEqual(Array.from({length:18},(_,i) => i+1));
        expect(progress).toEqual(Array.from({length:18},(_,i) => i+1));
    });
    it('não inicia consulta cancelada e recusa paginação que muda no meio', async () => {
        const ctrl = new AbortController();ctrl.abort();
        await expect(readHorizontalHistory('GO','Goiânia',ctrl.signal)).rejects.toMatchObject({name:'AbortError'});
        expect(request).not.toHaveBeenCalled();
        request.mockResolvedValueOnce({ok:true,data:{data:[],meta:{last_page:2}}} as never).mockResolvedValueOnce({ok:true,data:{data:[],meta:{last_page:3}}} as never);
        await expect(readHorizontalHistory('GO','Goiânia')).rejects.toThrow('mudou');
    });
    it('recusa sobreposição de cadastros entre páginas', async () => {
        request.mockResolvedValue({ok:true,data:{data:[{building_id:1,typologies_history:[]}],meta:{last_page:2}}} as never);
        await expect(readHorizontalHistory('GO','Goiânia')).rejects.toThrow('repetidos');
    });
    it('pagina o vertical e preserva tipo, sem transformar ausência em zero', async () => { request.mockResolvedValueOnce({ ok: true, data: { data: [{ building_id: 1, typologies_history: [] }], meta: { last_page: 2 } } } as never).mockResolvedValueOnce({ ok: true, data: { data: [{ building_id: 2, typologies_history: [] }], meta: { last_page: 2 } } } as never); const r = await readHorizontalHistory('PR', 'Curitiba', undefined, undefined, 'Vertical'); expect(r.buildings.map(b => b.sourceType)).toEqual(['Vertical', 'Vertical']); expect(request.mock.calls[0][0].query).toMatchObject({ type: 'Vertical', page: 1 }); });
    it('falha integralmente se uma página falhar; nunca devolve sucesso parcial', async () => { request.mockResolvedValueOnce({ ok: true, data: { data: [], meta: { last_page: 2 } } } as never).mockResolvedValueOnce({ ok: false, error: 'falhou' } as never); await expect(readHorizontalHistory('PR', 'Curitiba')).rejects.toThrow('página 2'); });
    it('nega escopo vazio e paginação acima do teto', async () => { await expect(readHorizontalHistory('', '')).rejects.toThrow(); request.mockResolvedValueOnce({ ok: true, data: { data: [], meta: { last_page: 31 } } } as never); await expect(readHorizontalHistory('PR', 'Curitiba')).rejects.toThrow('30 páginas'); });
    it('repete falha transitória com limite e cancela durante a espera', async () => {
        request.mockResolvedValueOnce({ok:false,status:503,retryAfterMs:1} as never).mockResolvedValueOnce({ok:true,data:{data:[],meta:{last_page:1}}} as never);
        await readHorizontalHistory('PR','Curitiba');expect(request).toHaveBeenCalledTimes(2);
        request.mockReset();request.mockResolvedValue({ok:false,status:429,retryAfterMs:5000} as never);
        const ctrl=new AbortController();const pending=readHorizontalHistory('PR','Curitiba',ctrl.signal);setTimeout(()=>ctrl.abort(),10);
        await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(request).toHaveBeenCalledTimes(1);
    });
});
