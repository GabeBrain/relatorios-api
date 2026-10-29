import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import incc from './incc-di.json';
import { buildSpVglSeries } from './vgl-series';
import { buildSpTemporalPreview } from './temporal';
import { buildSpLaunchSeries } from './launch-series';
import { SpTrendSlide } from './SpTrendSlide';
import { syntheticLaunchSeries, syntheticVglInput } from './__tests__/launch-series';

describe('SP — VGL corrigido pelo INCC-DI', () => {
  it('corrige cada mês antes de somar e usa a mesma base da parcial para total/MCMV/anuais', () => {
    const input = syntheticVglInput(), report = buildSpTemporalPreview(input, '3T2026'), rows = syntheticLaunchSeries(input);
    const result = buildSpVglSeries(rows, report);
    expect(result.status).toBe('ready'); expect(result.baseMonth).toBe('2026-08');
    const current = rows.filter(row => ['2026-07-01', '2026-08-01'].includes(String(row.period)));
    const corrected = (row: typeof rows[number]) => Number(row.vgv_release) * incc.indices['2026-08'] / incc.indices[String(row.period).slice(0, 7) as keyof typeof incc.indices];
    expect(result.trends!.quarterly.at(-1)!.value).toBeCloseTo(current.reduce((sum, row) => sum + corrected(row), 0), 5);
    expect(result.breakdown!.mcmv!.quarterly.at(-1)!.value).toBeCloseTo(current.filter(row => row.group === 'Econômico').reduce((sum, row) => sum + corrected(row), 0), 5);
    expect(result.trends!.rolling.at(-1)!.value).toBeCloseTo(rows.filter(row => String(row.period) >= '2025-09-01').reduce((sum, row) => sum + corrected(row), 0), 5);
    expect(result.trends!.quarterly.at(-1)!.partial).toBe(true);
    expect(result.breakdown!.annual!.at(-1)!.segments.reduce((sum, row) => sum + row.value, 0)).toBeCloseTo(result.breakdown!.annual!.at(-1)!.total, 5);
    for (const number of [26,27,28,29,30]) {
      const html = renderToStaticMarkup(<SpTrendSlide report={{ ...report, vglSeries: result }} number={number} />);
      expect(html).toContain('INCC-DI'); expect(html).toContain('Base única: 2026-08'); expect(html).not.toContain('Dados em conferência');
    }
  });
  it.each([null, '', false, -1, 'NaN', Number.POSITIVE_INFINITY])('VGL inválido bloqueia só dinheiro, não unidades: %s', value => {
    const input = syntheticVglInput(), report = buildSpTemporalPreview(input, '3T2026'), rows = syntheticLaunchSeries(input); rows[0].vgv_release = value;
    expect(buildSpVglSeries(rows, report).status).toBe('blocked'); expect(buildSpLaunchSeries(rows, report).status).toBe('ready');
  });
  it('não inventa índice ausente, não usa base anterior e não aceita releitura monetária divergente', () => {
    const input = syntheticVglInput(), report = buildSpTemporalPreview(input, '3T2026'), rows = syntheticLaunchSeries(input);
    const indices: Record<string, number> = { ...incc.indices }; delete indices['2026-08'];
    expect(buildSpVglSeries(rows, report, indices).issues[0]).toContain('Falta INCC-DI');
    indices['2026-08'] = incc.indices['2026-08']; delete indices['2021-01'];
    expect(buildSpVglSeries(rows, report, indices).status).toBe('blocked');
    rows.find(row => row.period === '2026-08-01')!.vgv_release = 1;
    expect(buildSpVglSeries(rows, report).issues[0]).toContain('releitura');
  });
  it('preserva zero comprovado e exige o nominal municipal para conferir a releitura', () => {
    const input = syntheticVglInput(); input.releases = input.releases.map(row => ({ ...row, vgv_release: 0 }));
    const report = buildSpTemporalPreview(input, '3T2026');
    const rows = syntheticLaunchSeries(input).map(row => ({ ...row, vgv_release: 0 }));
    expect(buildSpVglSeries(rows, report).trends!.quarterly.at(-1)!.value).toBe(0);
    expect(buildSpVglSeries(rows, { ...report, nominalLaunchVgv: undefined }).status).toBe('blocked');
  });
  it('preserva a série DI publicada, distinta dos índices divergentes da planilha recebida', () => {
    expect(incc.indices['2025-10']).toBe(1222.356); expect(incc.indices['2026-04']).toBe(1259.652); expect(incc.indices['2026-09']).toBe(1299.713);
    expect(Object.keys(incc.indices)).toHaveLength(69);
  });
});
