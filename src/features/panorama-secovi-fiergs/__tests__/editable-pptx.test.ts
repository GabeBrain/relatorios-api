import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildPanoramaPresentationPackage } from '../report/presentation/build-package';
import { renderPanoramaEditablePptx } from '../lib/pptx/render';
import { panoramaManifestFor } from '../report/manifest';
import { editableScopeReport as freeScopeReport } from './editable-pptx.fixture';
import type { PanoramaPresentationPackage } from '../report/presentation/contract';
import { FIERGS_RM_PORTO_ALEGRE_PRESET } from '../presets';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import type { PanoramaReportModel } from '../types';

const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jYZkAAAAASUVORK5CYII=';
const metadata = { author: 'Teste sintético', title: 'Teste PPTX nativo', subject: 'Sem dados reais' };
const bytes = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(blob);
});
describe('PowerPoint editável do Panorama', () => {
  it('keeps an exceptionally dense table editable on one slide for analyst finishing', async () => {
    const report=freeScopeReport({entity:'fiergs-rs',uf:'RS',cities:['Canela'],endQuarter:'2T2026'});
    const definition={...panoramaManifestFor(report)[0],visualFamily:'market-table' as const};
    const built=await renderPanoramaEditablePptx({schemaVersion:'panorama-presentation-v1',pages:[{id:'dense-qa',definition,rasterized:[],blocks:[{kind:'table',rows:Array.from({length:60},(_,i)=>[{text:`QA-${i}`}])}]}]},metadata,{imageData:async()=>pixel});
    const zip=await JSZip.loadAsync(await bytes(built.blob));
    const slide=await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(slide).toContain('<a:tbl>');expect(slide).toContain('QA-59');
    expect(Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n))).toHaveLength(1);
  });
  for (const endQuarter of ['2T2026', '4T2025'] as const) {
    for (const entity of ['fiergs-rs', 'secovi-sp'] as const) {
      it(`compiles all active page families without DOM/mutation: ${entity} ${endQuarter}`, () => {
        const report = freeScopeReport({ entity, uf: entity === 'secovi-sp' ? 'SP' : 'RS', cities: entity === 'secovi-sp' ? ['Piracicaba'] : ['Canela', 'Gramado'], startQuarter: '1T2021', endQuarter }, { horizontal: true, sold: -1, final: 0 });
        const before = JSON.stringify(report), manifest = panoramaManifestFor(report, '');
        const pkg = buildPanoramaPresentationPackage(report, manifest);
        expect(pkg.pages.map((p) => p.definition)).toEqual(manifest);
        expect(pkg.pages.every((p) => p.blocks.length || p.background)).toBe(true);
        expect(pkg.pages.some((p) => p.blocks.some((b) => b.kind === 'chart'))).toBe(true);
        expect(pkg.pages.some((p) => p.blocks.some((b) => b.kind === 'table'))).toBe(true);
        expect(JSON.stringify(report)).toBe(before);
      });
    }
  }
  it('preserves blank, zero, negative and precision in actual charts and embedded workbooks', async () => {
    const pkg: PanoramaPresentationPackage = { schemaVersion: 'panorama-presentation-v1', pages: [{ id: 'synthetic',
      definition: { page: 1, referenceSlide: 1, sectionId: 'prices', title: 'Preço sintético', intention: 'teste', visualFamily: 'price', contractKeys: [], methodologyStatus: 'reconciled' },
      rasterized: [], blocks: [{ kind: 'text', role: 'title', text: 'Preço editável & dados' },
        { kind: 'chart', chart: { type: 'bar', labels: ['Ausente', 'Zero', 'Negativo', 'Precisão'], series: [{ name: 'Série', values: [null, 0, -1, 123.456789] }] } }],
    }] };
    const result = await renderPanoramaEditablePptx(pkg, metadata, { imageData: async () => pixel });
    if (process.env.PANORAMA_PPTX_EVIDENCE === '1') await writeFile('.local-inputs/panorama-pptx-editavel-2026-11-03/chart-edit-proof-SINTETICO.pptx', new Uint8Array(await bytes(result.blob)));
    const zip = await JSZip.loadAsync(await bytes(result.blob));
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('Preço editável &amp; dados'); expect(xml).not.toContain('<p:pic>');
    expect(xml).toContain('c:chart');
    const chart = await zip.file('ppt/charts/chart1.xml')!.async('string');
    expect(chart).toContain('123.456789'); expect(chart).toContain('<c:v>-1</c:v>'); expect(chart).toContain('<c:v>0</c:v>');
    expect(chart).toContain('gap');
    const workbooks = Object.keys(zip.files).filter((f) => f.endsWith('.xlsx'));
    expect(workbooks).toHaveLength(1);
    const workbook = await JSZip.loadAsync(await zip.file(workbooks[0])!.async('uint8array'));
    const sheet = await workbook.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheet).toContain('123.456789'); expect(sheet).toContain('<v>-1</v>'); expect(sheet).toContain('<v>0</v>');
  });
  it('builds actual native tables and no full-slide analytic screenshots', async () => {
    const report = freeScopeReport({ entity: 'fiergs-rs', uf: 'RS', cities: ['Gramado'], endQuarter: '2T2026' }, { horizontal: true });
    const pkg = buildPanoramaPresentationPackage(report, panoramaManifestFor(report, ''));
    const table = pkg.pages.find((p) => p.blocks.some((b) => b.kind === 'table'))!;
    const result = await renderPanoramaEditablePptx({ ...pkg, pages: [{ ...table, background: undefined }] }, metadata);
    if (process.env.PANORAMA_PPTX_EVIDENCE === '1') await writeFile('.local-inputs/panorama-pptx-editavel-2026-11-03/table-edit-proof-SINTETICO.pptx', new Uint8Array(await bytes(result.blob)));
    const zip = await JSZip.loadAsync(await bytes(result.blob));
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('<a:tbl>'); expect(xml).not.toContain('<p:pic>');
  });
  it('supports preset and long free scopes without changing their source identity', () => {
    for (const cities of [FIERGS_RM_PORTO_ALEGRE_PRESET.scope.cities, ['Porto Alegre'], ['Canoas', 'Esteio', 'São Leopoldo'], Array.from({ length: 17 }, (_, i) => `Município com nome extenso número ${i}`)]) {
      const report = freeScopeReport({ entity: 'fiergs-rs', uf: 'RS', cities: [...cities], endQuarter: '2T2026' });
      const pkg = buildPanoramaPresentationPackage(report, panoramaManifestFor(report, ''));
      expect(new Set(pkg.pages.map((p) => p.id)).size).toBe(pkg.pages.length);
    }
  });
  it('cancels before loading assets or serializing', async () => {
    const report = freeScopeReport({ entity: 'fiergs-rs', uf: 'RS', cities: ['Canoas'], endQuarter: '2T2026' });
    const pkg = buildPanoramaPresentationPackage(report, panoramaManifestFor(report, ''));
    const abort = new AbortController(); abort.abort();
    await expect(renderPanoramaEditablePptx(pkg, metadata, { signal: abort.signal })).rejects.toThrow();
  });
  it('serializes the full synthetic two-entity/two-period matrix with actual product assets offline', async () => {
    const evidence: unknown[] = [];
    for (const entity of ['fiergs-rs', 'secovi-sp'] as const) for (const endQuarter of ['2T2026', '4T2025'] as const) {
      const report = freeScopeReport({ entity, uf: entity === 'secovi-sp' ? 'SP' : 'RS', cities: entity === 'secovi-sp' ? ['Piracicaba'] : [...FIERGS_RM_PORTO_ALEGRE_PRESET.scope.cities], startQuarter: '1T2023', endQuarter }, { horizontal: true });
      const pkg = buildPanoramaPresentationPackage(report, panoramaManifestFor(report, ''));
      const loadImage = async (url: string) => {
        if (url.startsWith('data:')) return url;
        // Offline synthetic map only: no Mapbox request and no token in test errors/evidence.
        if (url.startsWith('https://api.mapbox.com/')) return pixel;
        if (!url.startsWith('/src/') && !url.startsWith('/assets/')) throw new Error('Unexpected external presentation asset.');
        const file = resolvePath(process.cwd(), decodeURIComponent(url.split('?')[0]).replace(/^\//, ''));
        return `data:image/${/\.jpe?g$/i.test(file) ? 'jpeg' : 'png'};base64,${(await readFile(file)).toString('base64')}`;
      };
      const built = await renderPanoramaEditablePptx(pkg, metadata, { imageData: loadImage }).catch(async (error) => {
        for (const page of pkg.pages) {
          await renderPanoramaEditablePptx({ ...pkg, pages: [page] }, metadata, { imageData: loadImage }).catch((cause) => {
            throw new Error(`Native page ${page.id} (${page.definition.title}): ${cause instanceof Error ? cause.message : 'error'}`);
          });
        }
        throw error;
      });
      const data = new Uint8Array(await bytes(built.blob)), zip = await JSZip.loadAsync(data);
      expect(Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))).toHaveLength(pkg.pages.length);
      const charts = Object.keys(zip.files).filter((f) => /^ppt\/charts\/chart\d+\.xml$/.test(f));
      const workbooks = Object.keys(zip.files).filter((f) => f.endsWith('.xlsx'));
      expect(charts.length).toBeGreaterThan(0); expect(workbooks.length).toBe(charts.length);
      const expectedCharts = pkg.pages.flatMap((p) => p.blocks.flatMap((b) => b.kind === 'chart' && b.chart.labels.length && b.chart.series.length ? [b.chart] : []));
      const orderedCharts = [...charts].sort((a, b) => Number(a.match(/chart(\d+)/)![1]) - Number(b.match(/chart(\d+)/)![1]));
      expect(orderedCharts).toHaveLength(expectedCharts.length);
      for (const [index, path] of orderedCharts.entries()) {
        const doc = new DOMParser().parseFromString(await zip.file(path)!.async('string'), 'text/xml');
        const series = [...doc.getElementsByTagName('c:ser')];
        const expected = expectedCharts[index]; expect(series).toHaveLength(expected.series.length);
        for (const [i, ser] of series.entries()) {
          const cache = ser.getElementsByTagName('c:numCache')[0];
          const values: (number | null)[] = expected.labels.map(() => null);
          for (const point of [...cache.getElementsByTagName('c:pt')]) {
            const value = point.getElementsByTagName('c:v')[0]?.textContent;
            values[Number(point.getAttribute('idx'))] = value?.trim() ? Number(value) : null;
          }
          expect(values, `${entity}/${endQuarter}/${path}/${i}`).toEqual(expected.series[i].values);
        }
        const chartNumber = path.match(/chart(\d+)/)![1];
        const rel = await zip.file(`ppt/charts/_rels/chart${chartNumber}.xml.rels`)!.async('string');
        const workbookPath = /Target="\.\.\/([^\"]+\.xlsx)"/.exec(rel)![1];
        const embedded = await JSZip.loadAsync(await zip.file(`ppt/${workbookPath}`)!.async('uint8array'));
        const sheet = new DOMParser().parseFromString(await embedded.file('xl/worksheets/sheet1.xml')!.async('string'), 'text/xml');
        const cells = new Map([...sheet.getElementsByTagName('c')].map((cell) => [cell.getAttribute('r'), cell.getElementsByTagName('v')[0]?.textContent]));
        for (const [i, series] of expected.series.entries()) for (const [row, value] of series.values.entries()) {
          const observed = cells.get(`${String.fromCharCode(66 + i)}${row + 2}`);
          expect(observed?.trim() ? Number(observed) : null, `Workbook ${path} ${i}/${row}`).toBe(value);
        }
      }
      evidence.push({ entity, endQuarter, pages: pkg.pages.length, charts: charts.length, workbooks: workbooks.length,
        numericChartAndWorkbookParity: true,
        rasterized: pkg.pages.filter((p) => p.rasterized.length).map((p) => ({ id: p.id, reason: p.rasterized })) });
      if (process.env.PANORAMA_PPTX_EVIDENCE === '1') {
        const dir = '.local-inputs/panorama-pptx-editavel-2026-11-03'; await mkdir(dir, { recursive: true });
        await writeFile(`${dir}/${entity}-${endQuarter}-SINTETICO.pptx`, data);
        await writeFile(`${dir}/synthetic-regression.json`, JSON.stringify(evidence, null, 2));
      }
    }
  }, 60_000);
  it.runIf(process.env.PANORAMA_PPTX_FROZEN === '1')('compiles ten frozen incident models without collecting or generating real studies', async () => {
    const dir = '.local-inputs/fiergs-incidente-20261027/after-contracts';
    const names = (await readdir(dir)).filter((name) => name.endsWith('-report.json'));
    expect(names).toHaveLength(10);
    const evidence = [];
    for (const name of names) {
      const report = JSON.parse(await readFile(`${dir}/${name}`, 'utf8')) as PanoramaReportModel;
      const before = JSON.stringify(report), manifest = panoramaManifestFor(report, '');
      const pkg = buildPanoramaPresentationPackage(report, manifest);
      expect(pkg.pages).toHaveLength(manifest.length);
      expect(JSON.stringify(report)).toBe(before);
      const charts = pkg.pages.flatMap((p) => p.blocks.filter((b) => b.kind === 'chart'));
      expect(charts.length).toBeGreaterThan(0);
      expect(charts.every((b) => b.chart.series.every((s) => s.values.length === b.chart.labels.length))).toBe(true);
      evidence.push({ source: name, pages: manifest.length, charts: charts.length, tables: pkg.pages.flatMap((p) => p.blocks.filter((b) => b.kind === 'table')).length,
        negativeChartValues: charts.flatMap((b) => b.chart.series.flatMap((s) => s.values)).filter((n) => n !== null && n < 0).length,
        criticalChecks: report.reconciliation.rows.filter((r) => r.critical && r.status !== 'match').length,
        modelUnchanged: true, generatedRealStudy: false });
    }
    await writeFile('.local-inputs/panorama-pptx-editavel-2026-11-03/frozen-compilation.json', JSON.stringify(evidence, null, 2));
  });
  it('includes a synthetic Secovi Piracicaba 1T2026 regression with its own policy', () => {
    const report = freeScopeReport({ entity: 'secovi-sp', uf: 'SP', cities: ['Piracicaba'], startQuarter: '1T2023', endQuarter: '1T2026' }, { horizontal: true });
    const pkg = buildPanoramaPresentationPackage(report, panoramaManifestFor(report, ''));
    expect(pkg.pages.length).toBeGreaterThan(30);
    expect(report.scope.entity).toBe('secovi-sp');
    expect(pkg.pages.find((p) => p.cover)?.cover).toMatchObject({ entity: 'SECOVI-SP', uf: 'SP', cities: ['Piracicaba'] });
  });
});
