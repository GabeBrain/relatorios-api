import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Quarter } from '@/features/panorama-secovi-fiergs/types';
import { quarterIndex } from '@/features/panorama-secovi-fiergs/domain/quarters';
import { buildSpTemporalPreview } from './temporal';
import { shiftSpMonth } from './project-trends';
import { buildSpSalesNeighborhoods } from './sales-neighborhoods';
import { syntheticWindow } from './__tests__/synthetic-window';
import { syntheticSalesBuildings } from './__tests__/sales-buildings';
import proof from './__tests__/fixtures/sp-unlocated-zero-33693.json';
import { SpNeighborhoodSlide } from './SpNeighborhoodSlide';

function fixture(quarter:Quarter='2T2026'){
  const input=syntheticWindow('09'),offset=(quarterIndex(quarter)-quarterIndex('3T2026'))*3;
  for(const field of ['releases','sales','stock'] as const)input[field]=input[field].map(row=>({...row,period:`${shiftSpMonth(String(row.period).slice(0,7),offset)}-01`}));
  const report=buildSpTemporalPreview(input,quarter),buildings=syntheticSalesBuildings(input);
  const zero=structuredClone(proof.building);
  if(quarter!=='2T2026'){
    zero.building_id=99999;
    zero.typologies_history=zero.typologies_history.map((row,i)=>({...row,period:`${report.monthly![i].month}-01`}));
  }
  return {input,report,buildings,zero};
}

describe('SP — bairro obrigatório para movimentos, zero comprovado sem bloqueio',()=>{
  it.each(['2T2026','3T2026','4T2025'] as Quarter[])('preserva ranking e totais de%s ao validar cadastro sem bairro e vendas zero',quarter=>{
    const {report,buildings,zero}=fixture(quarter),before=buildSpSalesNeighborhoods(buildings,report),after=buildSpSalesNeighborhoods([...buildings,zero],report);
    expect(after.status).toBe('ready');expect(after.rows).toEqual(before.rows);
    expect(after.cityTotal).toBe(before.cityTotal);expect(after.topTotal).toBe(before.topTotal);expect(after.topShare).toBe(before.topShare);
    expect(after.verifiedZeroWithoutNeighborhood).toBe(1);
  });
  it.each(['positive','negative','quarter-net-zero','typology-net-zero'])('continua exigindo bairro com movimento%s, mesmo quando a soma zera',kind=>{
    const {report,buildings,zero}=fixture();
    if(kind==='negative')zero.typologies_history[0].sold_in_period=-1;
    else if(kind==='typology-net-zero'){
      const inverse=zero.typologies_history.map((row,i)=>({...row,typology_id:55555,sold_in_period:i===0?-1:0}));
      zero.typologies_history[0].sold_in_period=1;zero.typologies_history.push(...inverse);
    }else{zero.typologies_history[0].sold_in_period=1;if(kind==='quarter-net-zero')zero.typologies_history[1].sold_in_period=-1;}
    expect(buildSpSalesNeighborhoods([...buildings,zero],report)).toMatchObject({status:'blocked',rows:[],cityTotal:null});
    expect(buildSpSalesNeighborhoods([...buildings,zero],report).issues[0]).toContain('bairro ausente');
  });
  it.each(['month','value','identity','conflict','typology-month'])('não transforma histórico%s incompleto/conflitante em zero',kind=>{
    const {report,buildings,zero}=fixture();
    if(kind==='month')zero.typologies_history.pop();
    if(kind==='value')zero.typologies_history[0].sold_in_period=null;
    if(kind==='identity')zero.typologies_history[0].typology_id=null;
    if(kind==='conflict')zero.typologies_history.push({...zero.typologies_history[0],sold_in_period:1});
    if(kind==='typology-month')zero.typologies_history.push({...zero.typologies_history[0],typology_id:55555});
    expect(buildSpSalesNeighborhoods([...buildings,zero],report).status).toBe('blocked');
  });
  it('usa movimentos da janela selecionada, sem inferir zero pelo cadastro atual ou contar outros meses',()=>{
    const {report,buildings,zero}=fixture();
    zero.typologies_history.push({...zero.typologies_history[0],period:'2026-03-01',sold_in_period:50},{...zero.typologies_history[0],period:'2026-07-01',sold_in_period:50});
    zero.typologies_history.push({...zero.typologies_history[0]});
    expect(buildSpSalesNeighborhoods([...buildings,{...zero,status:'Ativo',stock:100}],report).status).toBe('ready');
    expect(buildSpSalesNeighborhoods([...buildings,{...zero,status:'Esgotado',stock:0,typologies_history:[]}],report).status).toBe('blocked');
  });
  it('mantém a reconciliação municipal impeditiva e exibe a contabilização dos zeros verificados',()=>{
    const {report,buildings,zero}=fixture();
    const data=buildSpSalesNeighborhoods([...buildings,zero],report);
    expect(renderToStaticMarkup(<SpNeighborhoodSlide report={{...report,salesNeighborhoods:data}} sales/>)).toContain('vendas zero comprovadas');
    report.metrics.sales!++;
    expect(buildSpSalesNeighborhoods([...buildings,zero],report).status).toBe('blocked');
  });
  it('trata cidade com vendas zero comprovadas sem inventar bairro ou participação',()=>{
    const {input,zero}=fixture();input.sales=input.sales.map(row=>({...row,liquid_sales:0}));
    const report=buildSpTemporalPreview(input,'2T2026'),buildings=syntheticSalesBuildings(input).map(row=>({...row,neighborhood:''}));
    const data=buildSpSalesNeighborhoods([...buildings,zero],report);
    expect(data).toMatchObject({status:'ready',rows:[],cityTotal:0,topTotal:0,topShare:null});
    expect(renderToStaticMarkup(<SpNeighborhoodSlide report={{...report,salesNeighborhoods:data}} sales/>)).toContain('Nenhuma venda líquida no período conferido.');
  });
});
