import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PanoramaPresentationContent } from '../components/ReportPaginator';
import { panoramaManifestFor } from '../report/manifest';
import { editableScopeReport } from './editable-pptx.fixture';
import { buildPanoramaReportModel } from '../report/model';
import { buildPanoramaPresentationPackage } from '../report/presentation/build-package';
import { observedDormitoryPriceGroup } from '../report/dormitory-price-series';
afterEach(cleanup);
it('compares IVV for the same quarter, never sums rates or presents a closing rate as nine months', () => {
  const report = editableScopeReport({ entity: 'fiergs-rs', uf: 'RS', cities: ['Canela'], startQuarter: '1T2023', endQuarter: '3T2025' });
  report.ivv.series = [
    { ...report.ivv.series[0], quarter: '1T2023', vertical: 99, horizontal: 0, total: 99 }, { ...report.ivv.series[0], quarter: '3T2023', vertical: 10, horizontal: 0, total: 10 },
    { ...report.ivv.series[0], quarter: '1T2024', vertical: 1, horizontal: 0, total: 1 }, { ...report.ivv.series[0], quarter: '3T2024', vertical: 20, horizontal: 0, total: 20 },
    { ...report.ivv.series[0], quarter: '3T2025', vertical: 30, horizontal: 0, total: 30 },
  ];
  const def = panoramaManifestFor(report).find(p => p.fiergsOfficialSlide === 39)!;
  const { container } = render(<PanoramaPresentationContent def={def} report={report}/>);
  const annual = container.querySelector('header section')!.textContent;
  expect(annual).toContain('+100%'); expect(annual).not.toContain('+50%');
  const comparisons = container.querySelector('.panorama-fiergs-context-comparisons')!;
  expect(comparisons.querySelectorAll('section')).toHaveLength(1);
  expect(comparisons.textContent).not.toContain('9 MESES');
  expect(container.textContent).toContain('Geobrain'); expect(container.textContent).not.toContain('GeoBrain');
});
it('distinguishes an absent price observation from an observed zero in the actual chart package', () => {
  const empty = { rows: [], available: true, source: 'fixture' };
  const report = buildPanoramaReportModel({ entity: 'fiergs-rs', uf: 'RS', cities: ['Canela'], startQuarter: '1T2023', endQuarter: '2T2023' }, [], {
    sales: empty, salesTypology: empty, stock: empty, stockTypology: empty, ivv: empty, ivvTypology: empty,
    ticket: empty, ticketTypology: empty, meter: empty,
    meterTypology: { ...empty, rows: [{ period: '2T2023', building_type: 'Vertical', group: '4', average_price_per_meter: 0 }] },
  });
  const group = observedDormitoryPriceGroup(report.prices.meterByTypology, 4)!;
  expect(group.series[0].observed?.vertical).toBe(false);
  expect(group.series[1].observed?.vertical).toBe(true);
  const def = panoramaManifestFor(report).find(p => p.fiergsOfficialSlide === 47)!;
  const pkg = buildPanoramaPresentationPackage(report, [def]);
  const chart = pkg.pages[0].blocks.find(b => b.kind === 'chart');
  expect(chart?.kind === 'chart' && chart.chart.series[0].values).toEqual([null, 0]);
  expect(report.notices.some(n => n.code === 'DORMITORY_PRICE_GAPS_4')).toBe(true);
});
