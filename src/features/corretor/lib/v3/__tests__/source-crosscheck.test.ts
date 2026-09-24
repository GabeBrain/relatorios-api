import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Ir } from '../../audit/ir';
import { parseFonteJson, validateFonte, type Fonte } from '../fonte';
import type { ExtractedTableRef } from '../ia-vision';
import { sourceCrosscheckFindings, sourceCrosscheckVisionFindings } from '../source-crosscheck';

const ROOT = join(__dirname, '../../../../../../docs/features/corretor-vocacionais/calibracao');
const ir = JSON.parse(readFileSync(join(ROOT, 'feedback-2026-07/rolandia-v1.ir.json'), 'utf8')) as Ir;
const fonteText = readFileSync(join(ROOT, 'housi-rolandia-2026-07/rolandia.fonte.json'), 'utf8');
const fonte = JSON.parse(fonteText) as Fonte;

describe('contrato fonte.json', () => {
  it('aceita o derivado real e rejeita fonte estruturalmente incompleta', () => {
    expect(parseFonteJson(fonteText)).toMatchObject({ ok: true, errors: [] });
    expect(validateFonte({ fonte_version: 1, estudo: 'x', blocos: [] }).ok).toBe(false);
  });

  it('falha de JSON é explícita, nunca vira fonte vazia', () => {
    expect(parseFonteJson('{quebrado')).toEqual({ ok: false, errors: ['O arquivo não contém JSON válido.'] });
  });
});

describe('SOURCE_CROSSCHECK sobre oferta lida pela visão', () => {
  const ref = (launched: number, current: number, columns = ['Padrão', 'Oferta Lançada', 'Oferta Atual']): ExtractedTableRef => ({
    slide: 46, secao: 'MERCADO', titulo: 'Oferta lançada e oferta atual por padrão', sha1: 'evidencia-46',
    table: { title: 'Oferta por padrão', columns, rows: [['Econômico', launched, current]] },
  });

  it('compara rótulo, métrica e recorte explicitamente identificados', () => {
    const findings = sourceCrosscheckVisionFindings(ir, fonte, [ref(190, 184)]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      type: 'SOURCE_CROSSCHECK', section: 'MERCADO', slideRef: 's46',
      confidence: 2, origem: 'IA_visao', evidenceSha1: 'evidencia-46',
    });
    expect(findings[0].detail).toContain('192');
    expect(findings[0].detail).toContain('Padrão › linha 7');
  });

  it('não acusa a tabela que bate nem tabela sem colunas semânticas', () => {
    expect(sourceCrosscheckVisionFindings(ir, fonte, [ref(192, 184)])).toEqual([]);
    expect(sourceCrosscheckVisionFindings(ir, fonte, [ref(190, 184, ['Categoria', 'Valor A', 'Valor B'])])).toEqual([]);
  });

  it('abstém quando o slide não declara um recorte único', () => {
    const changed: Ir = JSON.parse(JSON.stringify(ir));
    changed.slides.find((item) => item.n === 46)!.textos = ['Oferta lançada e oferta atual por padrão'];
    expect(sourceCrosscheckVisionFindings(changed, fonte, [ref(190, 184)])).toEqual([]);
  });
});

describe('SOURCE_CROSSCHECK sobre Rolândia real', () => {
  const findings = sourceCrosscheckFindings(ir, fonte);

  it('recupera as duas ocorrências da verticalização errada', () => {
    const vertical = findings.filter((finding) => finding.detail.includes('5,7%'));
    expect(vertical.map((finding) => finding.slideRef)).toEqual(['s32', 's33']);
    expect(vertical.every((finding) => finding.detail.includes('5,16%'))).toBe(true);
  });

  it('recupera o total de domicílios do PR com procedência', () => {
    const pr = findings.find((finding) => finding.detail.includes('4.216.017 dom.'));
    expect(pr).toMatchObject({ type: 'SOURCE_CROSSCHECK', section: 'SOCIO', slideRef: 's23', confidence: 1 });
    expect(pr?.detail).toContain('4.216.107 dom.');
    expect(pr?.detail).toContain('Domicilios › linha 8');
  });

  it('recupera a unidade hab. aplicada ao total brasileiro de domicílios', () => {
    const unit = findings.find((finding) => finding.detail.includes('75.298.796 hab.'));
    expect(unit?.slideRef).toBe('s23');
    expect(unit?.detail).toContain('75.298.796 dom.');
  });

  it('não acusa os percentuais e totais que batem', () => {
    expect(findings).toHaveLength(4);
    expect(findings.some((finding) => finding.detail.includes('15,7%'))).toBe(false);
    expect(findings.some((finding) => finding.detail.includes('25.787 dom.'))).toBe(false);
  });

  it('abstém quando o rótulo do recorte não casa com a fonte', () => {
    const changed: Ir = JSON.parse(JSON.stringify(ir));
    const slide = changed.slides.find((item) => item.n === 32)!;
    slide.textos = slide.textos.map((text) => text.replace('5,7%\nRolândia', '5,7%\nCidade sem fonte'));
    expect(sourceCrosscheckFindings(changed, fonte).filter((finding) => finding.slideRef === 's32')).toHaveLength(0);
  });
});
