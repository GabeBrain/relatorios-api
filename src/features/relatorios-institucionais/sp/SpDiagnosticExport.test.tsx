import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpDiagnosticExport } from './SpDiagnosticExport';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { buildSpMunicipalPrices } from './municipal-prices';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const readBlob = (blob: Blob) => new Promise<string>(resolve => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.readAsText(blob);
});

describe('SP diagnóstico da geração atual', () => {
  it('baixa fontes, grupos observados e lacunas sem autenticação ou históricos individuais', async () => {
    const report = buildSpTemporalPreview(recordedInput(), '3T2026');
    report.municipalPrices = buildSpMunicipalPrices([
      { metric: 'medium-prices-meter', grouping: 'Tipologia', rows: [
        { period: '2026-08-01', building_type: 'Vertical', group: '4 Quartos', average_price_per_meter: 12345, Authorization: 'Bearer SECRET', typologies_history: [{ private: true }] },
      ] },
    ], report);
    let downloaded: Blob | undefined;
    const create = vi.fn((blob: Blob) => { downloaded = blob; return 'blob:diagnostic'; });
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
    let filename = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
    render(<SpDiagnosticExport report={report}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Baixar diagnóstico JSON' }));
    expect(click).toHaveBeenCalledOnce();
    expect(filename).toBe('sp-3T2026-2026-08-diagnostico.json');
    const json = await readBlob(downloaded!);
    const result = JSON.parse(json);
    expect(result).toMatchObject({ quarter: '3T2026', throughMonth: '2026-08', analystApproval: false });
    expect(result.slides).toHaveLength(85);
    expect(result.slides.find((row: { number: number }) => row.number === 59).state).toBe('blocked');
    expect(result.numericAudit.details.priceSource.sources[0].coverage).toEqual([{ month: '2026-08', groups: ['4 Quartos'], ticketValues: 0, meterValues: 1 }]);
    expect(json).not.toMatch(/SECRET|Authorization|typologies_history/);
  });
});
