import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { bucketMonthFromStr, bucketQuarterFromStr, computeResumoEmail, type ClosureRow, type Granularity } from './aggregate';
import { ResumoEmailTable } from './ResumoEmailTable';

afterEach(cleanup);

function row(periodKey: string, sold: number): ClosureRow {
  const period = `${periodKey}-01`;
  return {
    building_id: '1', building_name: 'Teste', building_type: 'Vertical', standard: 'Médio', city: 'Sinop', status: 'Ativo',
    release_date: period, release_period_key: periodKey, release_period_bucket_year: periodKey.slice(0, 4),
    release_period_bucket_quarter: bucketQuarterFromStr(period), release_period_bucket_month: bucketMonthFromStr(period),
    typology_id: periodKey, type_of_typology: 'Padrão', number_bedroom: 2, garage: 1, qty: 1, release_qty: 1, private_area: 50,
    period, periodDate: new Date(period), periodKey, bucketYear: periodKey.slice(0, 4), bucketQuarter: bucketQuarterFromStr(period),
    bucketMonth: bucketMonthFromStr(period), price: 100000, sold_in_period: sold, typology_stock: 10, vgv_period: 100000,
  };
}

describe('variação anual do Resumo email', () => {
  it.each<[Granularity, string, string]>([
    ['month', 'Var. ago/25 x ago/26', '100%'],
    ['quarter', 'Var. 03T/25 x 03T/26', '114,3%'],
    ['year', 'Var. 2025 x 2026', '188,9%'],
  ])('acompanha a visualização %s sem mudar a variação acumulada', (granularity, header, expected) => {
    const data = [row('2025-01', 20), row('2025-07', 30), row('2025-08', 40), row('2026-01', 50), row('2026-04', 60), row('2026-07', 70), row('2026-08', 80)];
    render(<ResumoEmailTable resumo={computeResumoEmail([data[6]], data, granularity)} />);
    expect(screen.getByRole('columnheader', { name: new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeInTheDocument();
    const metricRow = screen.getAllByRole('row').find((element) => element.textContent?.includes('Unidades vendidas'))!;
    const cells = within(metricRow).getAllByRole('cell');
    expect(cells[4].textContent).toBe(expected);
    expect(cells[7].textContent).toBe('188,9%');
  });
});
