import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BudgetModal } from '../../../pages/CorretorV3Page';
import { presentTextFindings, literalTextAnchor } from '../text-review';
import { percentageColumnAmbiguities } from '../vision-column-review';
import type { Ir } from '../../audit/ir';
import type { FindingV3 } from '../db';
import type { FullEstimate } from '../pipeline';
const ir = { slides: [{ n: 23, textos: ['Até 2032 são esperado novos 1.030 domicílios.'] }, { n: 68, textos: ['FONTE: OBSERTÓRIO DO TURISMO 2023 | ELABORAÇÃO: BRAIN'] }] } as Ir;
const item = (id: string, slide: number, evidence: string, detail = 'Concordância verbal incorreta.'): FindingV3 => ({ruleId:id,status:'pendente',origem:'IA_texto',primeiraVersao:1,resolvidoNaVersao:null,verdict:null,verdictRevisado:false,finding:{id,type:'SPELLING',slideRef:`s${slide}`,section:'SOCIO',title:detail,detail,viz:{kind:'text',evidence}}});
describe('fechamento v0.69 com corpus de revisão',()=>{
 it('revalida texto antigo sem resolver/alterar registro',()=>{
  const original=item('iatxt-12-old',12,'desenvolviment');const before=JSON.stringify(original);
  const view=presentTextFindings([original],ir);
  expect(view[0].finding.confidence).toBe(3);expect(view[0].status).toBe('pendente');expect(view[0].resolvidoNaVersao).toBeNull();expect(JSON.stringify(original)).toBe(before);
  expect(presentTextFindings([original],null)[0].finding.confidence).toBeUndefined();
 });
 it('âncora não aceita palavra truncada',()=>{
  expect(literalTextAnchor('desenvolvimento','desenvolviment')).toBe(false);
  expect(literalTextAnchor('Até 2032 são esperado novos','são esperado')).toBe(true);
 });
 it('agrupa dois pares reais sem mudar IDs/entrada ou ocorrências em outros slides',()=>{
  const data=[item('iatxt-23-a',23,'são esperado'),item('iatxt-23-b',23,'Até 2032 são esperado novos 1.030 domicílios.'),item('iatxt-68-a',68,'OBSERTÓRIO DO TURISMO 2023'),item('iatxt-68-b',68,'FONTE: OBSERTÓRIO DO TURISMO 2023 | ELABORAÇÃO: BRAIN'),item('iatxt-67-a',67,'OBSERTÓRIO DO TURISMO 2023')];
  const before=JSON.stringify(data);const view=presentTextFindings(data,ir);
  expect(view).toHaveLength(3);expect(view[0].duplicateRuleIds).toEqual(['iatxt-23-a','iatxt-23-b']);expect(view[1].duplicateRuleIds).toHaveLength(2);expect(JSON.stringify(data)).toBe(before);
 });
 it('preserva decisões humanas e erros diferentes no mesmo slide',()=>{
  const human={...item('iatxt-23-a',23,'são esperado'),verdict:'bug' as const,verdictRevisado:true};
  const data=[human,item('iatxt-23-b',23,'são esperado'),item('iatxt-23-c',23,'Shor Stay')];
  expect(presentTextFindings(data,ir)).toHaveLength(3);expect(presentTextFindings(data,ir)[0]).toBe(human);
 });
 it('separa acusação editorial sem blacklist e preserva erro literal',()=>{
  const data=[item('iatxt-70-a',70,'Concorrentes Compactos','Falta de concordância como título sem a devida continuação ou conclusão.'),item('iatxt-23-a',23,'são esperado')];
  const view=presentTextFindings(data);
  expect(view[0].finding.confidence).toBe(3);expect(view[1].finding.confidence).toBeUndefined();
  expect(presentTextFindings([item('iatxt-87-a',87,'Identificação do terreno e determinação da Z.I.','Falta de concordância nominal.')])[0].finding.confidence).toBe(3);
 });
 it('detecta percentual transferido entre recortes sem corrigir números',()=>{
  const table={title:'MORADORES',columns:['Moradores','SP','SP %','Até 6 km','Até 6 km %'],rows:[['1 morador',3114655,19.2,6614,19.2]],totals:['Total',16256029,100,45835,100]};
  const before=JSON.stringify(table);expect(percentageColumnAmbiguities(table)).toHaveLength(1);expect(JSON.stringify(table)).toBe(before);
  table.rows[0][4]=14.4;expect(percentageColumnAmbiguities(table)).toEqual([]);
  table.rows[0][4]=50;expect(percentageColumnAmbiguities(table)).toEqual([]); // divergência verdadeira continua acusável
 });
 it('cancelar não confirma processamento; mostra lote e confirma por ação explícita',()=>{
  const run=vi.fn(),cancel=vi.fn();const estimate={costUsd:.5,textSlides:12,visionToRun:3,visionCached:29} as FullEstimate;
  render(<BudgetModal estimate={estimate} onConfirm={run} onCancel={cancel}/>);
  expect(screen.getByRole('dialog')).toBeTruthy();expect(screen.getByText(/12 slides de texto e 3/)).toBeTruthy();expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Manter resultado gratuito'));expect(cancel).toHaveBeenCalledOnce();expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Confirmar e analisar'));expect(run).toHaveBeenCalledOnce();cleanup();
 });
});
