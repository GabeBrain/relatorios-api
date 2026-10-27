import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { reportConsistencyAlerts } from '../report/consistency-alerts';
import { ReportConsistencyAlertsDialog } from '../components/ReportConsistencyAlertsDialog';
import { panoramaExportBlockReason, usePanoramaExportStore } from '../export-store';
import type { PanoramaReportModel } from '../types';
import { ReportPaginator } from '../components/ReportPaginator';
import { buildPanoramaReportModel } from '../report/model';

const report = () => ({
  scope: { entity: 'fiergs-rs', uf: 'RS', cities: ['Porto Alegre'], endQuarter: '2T2026' },
  provenance: { requestedCities: ['Porto Alegre'], completedCities: ['Porto Alegre'], failedCities: [] },
  reconciliation: { homologable: true, rows: [] }, notices: [],
  cube: { projects: [{ key: 'P', name: 'Miradero', city: 'Porto Alegre', historyAudit: {
    identityMode: 'identified', duplicates: [], issues: [], registryTotalUnits: 36, capacityAtClosing: 18,
    releaseObservedUnits: 18, registryMonth: '2026-08', closingMonth: '2026-06',
  } }], rejections: [] },
} as unknown as PanoramaReportModel);

afterEach(() => { cleanup(); usePanoramaExportStore.setState({ status: 'idle', report: null, consistencyAcknowledged: false, controller: null }); });
describe('Alertas de consistência e exportação', () => {
  it('keeps the real toolbar download enabled and starts it after the dialog continuation', () => {
    const lean = report(); const empty = { rows: [], available: true, source: 'fixture' };
    const full = buildPanoramaReportModel(lean.scope, [], { sales: empty, salesTypology: empty, stock: empty, stockTypology: empty,
      ivv: empty, ivvTypology: empty, ticket: empty, ticketTypology: empty, meter: empty, meterTypology: empty });
    Object.assign(full, lean);
    full.reconciliation = { homologable: false, rows: [{ metricId: 'test', formula: 'Conferência de unidades.', canonicalTotal: 70,
      dimensionalTotal: 127, delta: 57, critical: true, status: 'different' } as never] };
    render(<ReportPaginator report={full}/>);
    const download = screen.getByRole('button', { name: 'Baixar PDF' });
    expect(download).not.toBeDisabled();
    fireEvent.click(download);
    expect(screen.getByRole('dialog', { name: 'Alertas de consistência' })).toBeInTheDocument();
    expect(usePanoramaExportStore.getState().status).toBe('idle');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar e baixar PDF' }));
    expect(usePanoramaExportStore.getState()).toMatchObject({ status: 'preparing', consistencyAcknowledged: true, report: full });
    expect(full.reconciliation.homologable).toBe(false);
  });
  it('describes Miradero as a difference in source, never as a deduplication or a repaired database', () => {
    const alerts = reportConsistencyAlerts(report());
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ kind: 'consistency', title: 'Miradero · Porto Alegre' });
    expect(alerts[0].description).toContain('36 unidades');
    expect(alerts[0].description).toContain('18 unidades');
    expect(alerts[0].description).not.toMatch(/corrigid|deduplic|homolog|confiável|oficial/i);
  });
  it('explains deduplicated records by project and keeps numeric checks untouched', () => {
    const r = report(); r.cube.projects[0].name = 'Solaris';
    r.cube.projects[0].historyAudit!.duplicates = [{ identity: 'P|T|2024-07', indices: [0, 1], removed: 3 }];
    const before = JSON.stringify(r.reconciliation);
    expect(reportConsistencyAlerts(r).some((a) => a.kind === 'adjustment' && a.description.includes('3 registro'))).toBe(true);
    expect(JSON.stringify(r.reconciliation)).toBe(before);
  });
  it('exposes a readable dialog with a close action and no labels about approval or reliability', () => {
    const r = report(); const close = vi.fn();
    render(<ReportConsistencyAlertsDialog report={r} alerts={reportConsistencyAlerts(r)} open onOpenChange={close}/>);
    expect(screen.getByRole('dialog', { name: 'Alertas de consistência' })).toBeInTheDocument();
    expect(screen.getByText('Miradero · Porto Alegre')).toBeInTheDocument();
    expect(screen.queryByText(/não homologado|não oficial|não confiável/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' })); expect(close).toHaveBeenCalledWith(false);
  });
  it('allows continuing the selected format after reviewing alerts', () => {
    const r = report(); const next = vi.fn();
    render(<ReportConsistencyAlertsDialog report={r} alerts={reportConsistencyAlerts(r)} open onOpenChange={vi.fn()} pendingFormat="pdf" onContinue={next}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar e baixar PDF' })); expect(next).toHaveBeenCalledOnce();
  });
  it('closes through Escape using the standard dialog behavior', () => {
    const r = report(); const close = vi.fn();
    render(<ReportConsistencyAlertsDialog report={r} alerts={reportConsistencyAlerts(r)} open onOpenChange={close}/>);
    fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledWith(false);
  });
  it('keeps corrected reports downloadable without an acknowledgement', () => {
    const r = report(); usePanoramaExportStore.getState().start(r, 'pdf');
    expect(usePanoramaExportStore.getState()).toMatchObject({ status: 'preparing', consistencyAcknowledged: false, report: r });
  });
  it('permits a reviewed numeric alert per job without changing reconciliation or retaining permission for the next job', () => {
    const r = report(); r.reconciliation.homologable = false;
    const before = JSON.stringify(r.reconciliation);
    expect(panoramaExportBlockReason(r)).not.toBeNull();
    expect(panoramaExportBlockReason(r, { consistencyAcknowledged: true })).toBeNull();
    usePanoramaExportStore.getState().start(r, 'pptx', { consistencyAcknowledged: true });
    const signal = usePanoramaExportStore.getState().controller!.signal;
    expect(usePanoramaExportStore.getState().status).toBe('preparing');
    usePanoramaExportStore.getState().cancel(); expect(signal.aborted).toBe(true);
    usePanoramaExportStore.getState().start(r, 'pdf');
    expect(usePanoramaExportStore.getState()).toMatchObject({ status: 'error', consistencyAcknowledged: false });
    expect(JSON.stringify(r.reconciliation)).toBe(before);
  });
  it('does not bypass a missing collection or provenance', () => {
    const r = report(); r.provenance.completedCities = [];
    expect(panoramaExportBlockReason(r, { consistencyAcknowledged: true })).toContain('coleta incompleta');
  });
});
