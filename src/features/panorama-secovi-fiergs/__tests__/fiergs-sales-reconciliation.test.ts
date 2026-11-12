import { describe, expect, it } from 'vitest';
import { fiergsDistributionData } from '../components/ReportPaginator';

describe('FIERGS — distribuição de vendas líquidas', () => {
  it('preserva distrato negativo no total e na dimensão visível', () => {
    const result = fiergsDistributionData([
      { label: '1 dormitório', value: 64 },
      { label: '2 dormitórios', value: 919 },
      { label: '3 dormitórios', value: 155 },
      { label: '4 dormitórios', value: -1 },
    ]);

    expect(result.total).toBe(1137);
    expect(result.visible).toContainEqual({ label: '4 dormitórios', value: -1 });
    expect(result.max).toBe(919);
  });
});
