import { describe, expect, it } from 'vitest';
import { panoramaExportMetadata } from '../lib/export-metadata';
import { scopeFileSlug, scopeExportPeriod } from '../types';
import { FIERGS_RM_PORTO_ALEGRE_PRESET } from '../presets';
import { buildFiergsAuditCsv, fiergsAuditFilename } from '../lib/fiergs-audit';
import { freeScopeReport } from './free-scopes.fixture';

describe('metadados institucionais da exportação', () => {
  it('identifica FIERGS, período, território, motor e build', () => {
    const scope = { entity: 'fiergs-rs' as const, uf: 'RS', cities: ['Alvorada', 'Canoas'], endQuarter: '2T2026' as const, engineVersion: 'v4' as const };
    const metadata = panoramaExportMetadata(scope, 'deploy-123');
    expect(metadata.title).toBe('Panorama FIERGS/RS — 2 municípios · RS — 2T2026');
    expect(metadata.subject).toContain('Alvorada e Canoas/RS · 2T2026 · motor v4 · build deploy-123');
    expect(metadata.keywords).toEqual(expect.arrayContaining(['FIERGS/RS', 'Alvorada', 'Canoas', '2T2026', 'motor v4', 'build deploy-123']));
    expect(`panorama-${scopeFileSlug(scope)}-${scope.endQuarter}.pdf`).toBe('panorama-fiergs-rs-alvorada-canoas-2T2026.pdf');
  });

  it('identifica Secovi-SP sem inventar build ausente', () => {
    const scope = { entity: 'secovi-sp' as const, uf: 'SP', cities: ['Jundiaí'], endQuarter: '4T2025' as const, engineVersion: 'v4' as const };
    const metadata = panoramaExportMetadata(scope);
    expect(metadata.title).toBe('Panorama Secovi-SP — 4T2025');
    expect(metadata.subject).not.toContain('build');
    expect(`panorama-${scopeFileSlug(scope)}-${scope.endQuarter}.pptx`).toBe('panorama-secovi-sp-4T2025.pptx');
  });

  it('mantém recorte livre baseado no território', () => {
    const scope = { uf: 'PR', cities: ['Curitiba'], endQuarter: '1T2026' as const, engineVersion: 'v4' as const };
    expect(panoramaExportMetadata(scope).title).toBe('Panorama imobiliário de Curitiba/PR — 1T2026');
    expect(scopeFileSlug(scope)).toBe('curitiba');
  });

  it('preserva nome aprovado somente no preset exato', () => {
    const scope = { ...FIERGS_RM_PORTO_ALEGRE_PRESET.scope, startQuarter: '1T2023' as const, endQuarter: '2T2026' as const };
    expect(scopeFileSlug(scope)).toBe('fiergs-rs');
    expect(scopeExportPeriod(scope)).toBe('2T2026');
    expect(panoramaExportMetadata(scope).title).toBe('Panorama FIERGS/RS — 2T2026');
    expect(fiergsAuditFilename({ scope })).toBe('auditoria-fiergs-2t2026.csv');
  });

  it('identifica cidade, UF, janela e mesma geração no CSV', () => {
    const scope = { entity: 'fiergs-rs' as const, uf: 'PR', cities: ['Curitiba'], startQuarter: '1T2023' as const, endQuarter: '2T2026' as const };
    const report = freeScopeReport(scope);
    const csv = buildFiergsAuditCsv(report);
    expect(scopeFileSlug(scope)).toBe('fiergs-pr-curitiba');
    expect(scopeExportPeriod(scope)).toBe('1T2023-2T2026');
    expect(panoramaExportMetadata(scope).title).toBe('Panorama FIERGS/PR — Curitiba/PR — 1T2023-2T2026');
    expect(fiergsAuditFilename(report)).toBe('auditoria-fiergs-pr-curitiba-1t2023-2t2026.csv');
    expect(csv).toContain('escopo_geracao;Curitiba');
    expect(csv).toContain(`${report.generatedAt};PR;custom;;Curitiba;1T2023;2T2026`);
  });
});
