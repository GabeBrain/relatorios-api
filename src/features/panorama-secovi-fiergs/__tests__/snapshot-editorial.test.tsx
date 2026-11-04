import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PanoramaPresentationContent } from '../components/ReportPaginator';
import { panoramaManifestFor } from '../report/manifest';
import { editableScopeReport } from './editable-pptx.fixture';
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
