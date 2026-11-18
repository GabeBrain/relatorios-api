import { afterEach, describe, expect, it, vi } from 'vitest';
import snapshot from './assets/caged-verified-snapshot.json';
import { reportFromVerifiedSnapshot } from './caged-snapshot';
import { buildCagedSlide, cagedBalance } from './caged';
import { collectMaceioCaged } from './caged-api';
import { maceioCities, type MaceioSelection } from './model';
import { buildMaceioDiagnostic } from './diagnostic';

const selection: MaceioSelection = { uf: 'AL', city: 'Maceió', territory: 'capital-rm', periodicity: 'monthly', year: 2026, position: 5 };
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('CAGED real verificado no BigQuery em 18/11/2026', () => {
  it('valida os 117 grids e conserva a versão real imutável', () => {
    expect(snapshot.months).toHaveLength(117);
    const report = reportFromVerifiedSnapshot(snapshot, '2026-05')!;
    expect(report.snapshotVersion).toBe('8866c0278dfb8cc661f0a7b19055d796f783101a995f87f0c528f7cab6c506dc');
    expect(report.completePeriods).toHaveLength(12);
    expect(report.rows).toHaveLength(2436);
    for (let page = 9; page <= 14; page++) expect(buildCagedSlide(page, selection, { report, issue: null }).issue).toBeNull();
    expect(cagedBalance(report, '2017', 'BR', 'total')).not.toBeNull();
  });
  it('reproduz os quatro saldos conferidos por SELECT independente para maio e junho', () => {
    for (const [end, values] of [['2026-05', [81475, 12583, 61, -72]], ['2026-06', [136423, 12991, 2789, 352]]] as const) {
      const report = reportFromVerifiedSnapshot(snapshot, end)!;
      expect([cagedBalance(report, end, 'BR', 'total'), cagedBalance(report, end, 'BR', 'construction'), cagedBalance(report, end, 'AL', 'total'), cagedBalance(report, end, 'AL', 'construction')]).toEqual(values);
    }
  });
  it('não preenche outubro nem ano parcial com competência ausente', () => {
    expect(reportFromVerifiedSnapshot(snapshot, '2026-10')).toBeNull();
    const partial = structuredClone(snapshot); partial.months = partial.months.filter(row => row.month !== '2026-03');
    expect(reportFromVerifiedSnapshot(partial, '2026-05')).toBeNull();
    const corrupted = structuredClone(snapshot); corrupted.months[0].values[0]++;
    expect(() => reportFromVerifiedSnapshot(corrupted, '2026-05')).toThrow(/divergentes/);
    const duplicated = structuredClone(snapshot); duplicated.months.push(duplicated.months[0]);
    expect(() => reportFromVerifiedSnapshot(duplicated, '2026-05')).toThrow(/inválida/);
  });
  for (const periodicity of ['monthly', 'quarterly'] as const) it(`502 usa fonte real identificada e libera os seis modelos CAGED / ${periodicity}`, async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.invalid'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-public');
    const selected = { ...selection, periodicity, position: periodicity === 'monthly' ? 5 : 2 };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ code: 'PROXY_UPSTREAM', token: 'private-token' }), { status: 502 }));
    const source = await collectMaceioCaged(selected, [...maceioCities(periodicity)], { token: 'private-token', request });
    expect(source.delivery).toEqual({ kind: 'verified-snapshot', verifiedAt: '2026-11-18' });
    expect(source.failure).toEqual({ code: 'PROXY_UPSTREAM', httpStatus: 502 });
    for (let page = 9; page <= 14; page++) {
      const model = buildCagedSlide(page, selected, source);
      expect(model.issue).toBeNull(); expect(model.sourceNotice).toMatch(/cópia verificada/);expect(model.warning).toBeNull();
    }
    const diagnostic = buildMaceioDiagnostic(selected, { phase: 'done', startedAt: 0, report: null, blueprint: null, intro: { collectedAt: '', cities: [], caged: source } });
    expect(diagnostic.slides.filter(row => row.number >= 9 && row.number <= 14).every(row => row.status === 'available')).toBe(true);
    expect(diagnostic.sources.caged).toMatchObject({ delivery: 'verified-snapshot', failure: { code: 'PROXY_UPSTREAM' } });
    expect(JSON.stringify(diagnostic)).not.toContain('private-token');
  });
  it.each([401, 403, 429])('não contorna autorização nem limite de chamadas: HTTP %s', async status => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.invalid'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-public');
    const result = await collectMaceioCaged(selection, [...maceioCities('monthly')], { token: 'x', request: vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status })) });
    expect(result.report).toBeNull(); expect(result.delivery).toBeUndefined(); expect(result.failure?.httpStatus).toBe(status);
  });
  it('resposta 200 inválida não é ocultada por contingência e cancelamento continua respeitado', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.invalid'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-public');
    const source = await collectMaceioCaged(selection, [...maceioCities('monthly')], { token: 'x', request: vi.fn<typeof fetch>().mockResolvedValue(new Response('{"report":null}')) });
    expect(source.report).toBeNull(); expect(source.failure?.code).toBe('CONTRACT');
    const controller = new AbortController(); controller.abort();
    await expect(collectMaceioCaged(selection, [...maceioCities('monthly')], { token: 'x', signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('falha de rede usa cópia verificada e mantém competências futuras bloqueadas', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.invalid'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-public');
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error('private network details'));
    const source = await collectMaceioCaged(selection, [...maceioCities('monthly')], { token: 'x', request });
    expect(source.delivery?.kind).toBe('verified-snapshot'); expect(source.failure?.code).toBe('NETWORK');
    const future = await collectMaceioCaged({ ...selection, position: 10 }, [...maceioCities('monthly')], { token: 'x', request });
    expect(future.report).toBeNull(); expect(future.issue).toMatch(/não há cópia verificada/);
    expect(JSON.stringify(source)).not.toContain('private');
  });
});
