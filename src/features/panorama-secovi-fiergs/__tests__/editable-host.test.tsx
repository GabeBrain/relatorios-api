import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import Host from '../components/PanoramaExportHost';
import { usePanoramaExportStore } from '../export-store';
import type { PanoramaReportModel } from '../types';

const mocks = vi.hoisted(() => ({ native: vi.fn(), pdf: vi.fn(), mirror: vi.fn(), deck: vi.fn(), build: vi.fn() }));
vi.mock('../components/ReportPaginator', () => ({ PanoramaExportDeck: (props: { rootRef: React.Ref<HTMLDivElement> }) => {
  mocks.deck(); return <div ref={props.rootRef}><section className="panorama-report-page"/></div>;
} }));
vi.mock('../report/presentation/build-package', () => ({ buildPanoramaPresentationPackage: mocks.build }));
vi.mock('../lib/pptx/render', () => ({ renderPanoramaEditablePptx: mocks.native }));
vi.mock('../lib/pdf-export', () => ({ buildPanoramaPdf: mocks.pdf, buildPanoramaPptx: mocks.mirror, PanoramaExportCancelled: class extends Error {} }));
const report = { scope: { entity: 'fiergs-rs', uf: 'RS', cities: ['Canela'], startQuarter: '1T2021', endQuarter: '2T2026' },
  provenance: { requestedCities: ['Canela'], completedCities: ['Canela'], failedCities: [] }, reconciliation: { homologable: true, rows: [] } } as unknown as PanoramaReportModel;
const result = () => ({ blob: new Blob(['synthetic']), pageCount: 1, width: 1920, height: 1080 });
beforeEach(() => {
  vi.clearAllMocks(); mocks.native.mockResolvedValue(result()); mocks.pdf.mockResolvedValue(result()); mocks.mirror.mockResolvedValue(result());
  mocks.build.mockReturnValue({ schemaVersion: 'panorama-presentation-v1', pages: [{ id: 'test' }] });
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:synthetic'), revokeObjectURL: vi.fn() }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  usePanoramaExportStore.setState({ status: 'idle', result: null, report: null, controller: null, manifest: null });
});
afterEach(() => { usePanoramaExportStore.getState().cancel(); cleanup(); vi.restoreAllMocks(); });
describe('Host real · modalidade nativa', () => {
  it('runs PDF, editable PPT and mirror for the same report; native does not mount the capture deck', async () => {
    render(<Host/>);
    act(() => usePanoramaExportStore.getState().start(report, 'pdf'));
    await waitFor(() => expect(usePanoramaExportStore.getState().status).toBe('done'));
    expect(mocks.pdf).toHaveBeenCalledOnce();
    mocks.deck.mockClear();
    act(() => usePanoramaExportStore.getState().start(report, 'pptx', { pptxMode: 'editable', manifest: [] }));
    await waitFor(() => expect(usePanoramaExportStore.getState().status).toBe('done'));
    expect(mocks.native).toHaveBeenCalledOnce(); expect(mocks.deck).not.toHaveBeenCalled();
    expect(usePanoramaExportStore.getState().result?.name).toMatch(/-editavel\.pptx$/);
    act(() => usePanoramaExportStore.getState().start(report, 'pptx', { pptxMode: 'mirror' }));
    await waitFor(() => expect(usePanoramaExportStore.getState().status).toBe('done'));
    expect(mocks.mirror).toHaveBeenCalledOnce(); expect(usePanoramaExportStore.getState().result?.name).not.toContain('-editavel');
  });
  it('discards a late native result after cancellation and permits a fresh retry', async () => {
    let finish!: (r: ReturnType<typeof result>) => void;
    mocks.native.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<Host/>);
    act(() => usePanoramaExportStore.getState().start(report, 'pptx', { pptxMode: 'editable', manifest: [] }));
    await waitFor(() => expect(mocks.native).toHaveBeenCalledOnce());
    act(() => usePanoramaExportStore.getState().cancel());
    await act(async () => finish(result()));
    expect(usePanoramaExportStore.getState()).toMatchObject({ status: 'idle', result: null, manifest: null });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    act(() => usePanoramaExportStore.getState().start(report, 'pptx', { pptxMode: 'editable', manifest: [] }));
    await waitFor(() => expect(usePanoramaExportStore.getState().status).toBe('done'));
  });
  it('keeps collection guards in force for editable export', () => {
    const incomplete = { ...report, provenance: { ...report.provenance, completedCities: [] } };
    act(() => usePanoramaExportStore.getState().start(incomplete, 'pptx', { pptxMode: 'editable', consistencyAcknowledged: true }));
    expect(usePanoramaExportStore.getState().status).toBe('error'); expect(mocks.native).not.toHaveBeenCalled();
  });
});
