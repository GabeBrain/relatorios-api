// Regressão sobre o corpus REAL do feedback dos analistas (jul/2026): achados
// com veredito humano "fp" não podem ser regenerados pelas regras corrigidas.
// Corpus: docs/features/corretor-vocacionais/calibracao/feedback-2026-07/.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { sanitizeVisionPayload, toExtracted, wrongContextFromVisibleLocales, type ExtractedTableRef } from '../ia-vision';
import { checkTableSums } from '../../audit/engine';
import { crossTableFindings } from '../cross-table';
import { isStaleCrossTable, isStaleVisionContext, isStaleWrongCity } from '../reconcile';
import type { Ir } from '../../audit/ir';
import type { ExtractedTable, Finding } from '../../audit/model';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, '..', '..', '..', '..', '..', '..', 'docs', 'features', 'corretor-vocacionais', 'calibracao', 'feedback-2026-07');
const load = <T>(name: string): T => JSON.parse(readFileSync(join(CORPUS, name), 'utf-8')) as T;

interface StudyFx { id: string; nome: string; cidade: string | null; uf: string | null }
interface FindingFx { study_id: string; rule_id: string; tipo: string; slide_ref: string; status: string; verdict: string | null; payload: Finding }
interface VisionFx { sha1: string; payload: Parameters<typeof sanitizeVisionPayload>[0] }

const studies = load<StudyFx[]>('studies.json');
const findings = load<FindingFx[]>('findings.json');
const vision = load<VisionFx[]>('vision-payloads.json');

/** Volta da seção de auditoria persistida para a seção canônica do candidato. */
const AUDIT_TO_SECAO: Record<string, string | null> = {
  SOCIO: 'SOCIO', MERCADO: 'MERCADO', LACUNAS: 'LACUNAS', ABSORCAO: 'ABSORCAO',
  ENTORNO: 'ENTORNO', ESTRUTURA: 'CAPA', GLOBAL: null,
};

const emptyIr: Ir = { ir_version: 1, arquivo: 'corpus', n_slides: 0, slides: [] };

describe('CH-2 — WRONG_CONTEXT de visão (54 achados do feedback, todos FP)', () => {
  const ctx = findings.filter((f) => f.rule_id.startsWith('iavis-context-'));

  it('o corpus contém a família inteira', () => {
    expect(ctx.length).toBeGreaterThanOrEqual(45);
  });

  it('nenhum achado da família é regenerado pela regra corrigida', () => {
    const regenerated: string[] = [];
    for (const f of ctx) {
      const study = studies.find((s) => s.id === f.study_id);
      const sha = f.rule_id.split('-')[2];
      const vc = vision.find((v) => v.sha1.startsWith(sha));
      if (!study?.cidade || !vc) continue;
      const payload = sanitizeVisionPayload(vc.payload);
      const out = wrongContextFromVisibleLocales(payload.locais_visiveis, { cidade: study.cidade, uf: study.uf }, {
        slide: Number(f.slide_ref.replace(/\D/g, '')) || 1,
        secao: AUDIT_TO_SECAO[f.payload.section] ?? null,
        titulo: f.payload.viz?.kind === 'text' ? f.payload.viz.location ?? null : null,
        sha1: vc.sha1,
      });
      if (out.length) regenerated.push(f.rule_id);
    }
    expect(regenerated).toEqual([]);
  });

  it('reconciliação: todos os achados legados da família são reconhecidos como inválidos', () => {
    const alive = ctx.filter((f) => {
      const study = studies.find((s) => s.id === f.study_id);
      return !isStaleVisionContext(f.payload, study?.cidade ?? null);
    });
    expect(alive).toEqual([]);
  });

  it('DET wrong-city do typo da ata ("São José do Campos") é reconciliado', () => {
    const det = findings.filter((f) => f.rule_id.startsWith('wrong-city-'));
    expect(det.length).toBeGreaterThan(0);
    const alive = det.filter((f) => {
      const study = studies.find((s) => s.id === f.study_id);
      return !isStaleWrongCity(f.payload, study?.cidade ?? null);
    });
    expect(alive).toEqual([]);
  });

  it('regressão: cidade IBGE divergente em seção de dados continua disparando', () => {
    const out = wrongContextFromVisibleLocales(
      [{ texto: 'Curitiba', tipo: 'cidade', principal: false }],
      { cidade: 'Brumadinho', uf: 'MG' },
      { slide: 30, secao: 'SOCIO', titulo: 'Domicílios por faixa de renda', sha1: 'deadbeef00' },
    );
    expect(out).toHaveLength(1);
  });
});

describe('CH-3 — CROSS_TABLE_MISMATCH (5 FPs da Rolândia)', () => {
  const cross = findings.filter((f) => f.tipo === 'CROSS_TABLE_MISMATCH');

  it('os 5 FPs confirmados são reconhecidos como inválidos na reconciliação', () => {
    const fp = cross.filter((f) => f.verdict === 'fp');
    expect(fp).toHaveLength(5);
    expect(fp.filter((f) => !isStaleCrossTable(f.payload))).toEqual([]);
  });

  it('os pendentes do Housi têm o mesmo padrão (legenda de mapa) e também são reconciliados', () => {
    const pending = cross.filter((f) => f.verdict === null);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.filter((f) => !isStaleCrossTable(f.payload))).toEqual([]);
  });

  const table = (title: string, columns: string[], rows: ExtractedTable['rows']): ExtractedTable => ({ title, columns, rows });
  const ref = (slide: number, secao: string, titulo: string, t: ExtractedTable): ExtractedTableRef =>
    ({ slide, secao, titulo, sha1: `fx-${slide}-${t.title}`, table: t });

  it('legenda de mapa não pareia com a tabela de absorção', () => {
    const legend = ref(28, 'SOCIO', 'Renda domiciliar', table('LEGENDA', ['Faixas de Renda'], [['Raios'], [''], [''], ['']]));
    const abs = ref(37, 'ABSORCAO', 'Cenários de absorção', table('Faixa de Renda / Média Anual',
      ['Faixa de Renda / Média Anual', '20%', '40%'],
      [['Acima de R$ 36.511,01', 9, 18], ['R$ 27.320,01 a R$ 36.511,00', 10, 20]]));
    expect(crossTableFindings(emptyIr, [legend, abs]).filter((f) => f.id.startsWith('cross-renda'))).toEqual([]);
  });

  it('lacunas metragem × preço (unidades diferentes) não são comparadas', () => {
    const metragem = ref(51, 'LACUNAS', 'Lacunas de mercado | tipologia vs metragem',
      table('Oferta Lançada', ['Tipologia', 'Até 50m²', 'De 51m² a 55m²', 'Acima de 105m²'], [['2 Dormitórios', 0, 192, 0]]));
    const preco = ref(52, 'LACUNAS', 'Lacunas de mercado | tipologia vs preço',
      table('Oferta Lançada', ['Tipologia', 'Até R$5.000/m²', 'De R$5.001/m² a 7.000/m²', 'Acima de R$ 8.500/m²'], [['2 Dormitórios', 192, 0, 0]]));
    expect(crossTableFindings(emptyIr, [metragem, preco]).filter((f) => f.id.startsWith('cross-lacunas'))).toEqual([]);
  });

  it('duas fatias da mesma imagem (mesmo slide) não são comparadas entre si', () => {
    const lancada = ref(53, 'LACUNAS', 'Lacunas de mercado | preço vs metragem',
      table('Oferta Lançada', ['Tipologia', 'Até R$5.000/m²', 'Acima de R$8.500/m²'], [['2 Dormitórios', 192, 0]]));
    const final = ref(53, 'LACUNAS', 'Lacunas de mercado | preço vs metragem',
      table('Oferta Final', ['Tipologia', 'Até R$5.000/m²', 'Acima de R$8.500/m²'], [['2 Dormitórios', 87, 0]]));
    expect(crossTableFindings(emptyIr, [lancada, final]).filter((f) => f.id.startsWith('cross-lacunas'))).toEqual([]);
  });
});

describe('CH-5 — linha de total desalinhada pela visão (consolidada Housi)', () => {
  it('soma que bate com o total declarado de OUTRA coluna não é acusada', () => {
    const vc = vision.find((v) => v.sha1.startsWith('924d8136de'));
    expect(vc).toBeDefined();
    const payload = sanitizeVisionPayload(vc!.payload);
    const raw = payload.tables.find((t) => /empreendimentos de 2 km/i.test(String(t.title ?? '')));
    const ext = toExtracted(raw as Parameters<typeof toExtracted>[0]);
    expect(ext).not.toBeNull();
    const viz = checkTableSums(ext!, { absTol: Math.max(0.5, ext!.rows.length / 2) });
    // Oferta Lançada soma 1.187; o "39,8" declarado é o total da coluna % vizinha.
    expect(viz.badColumns ?? []).toEqual([]);
  });
});
