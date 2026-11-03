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
  it('expõe mês, padrão, valores e sinal da divergência sem liberar um ranking parcial',()=>{
    const {report,buildings}=fixture();
    const month=report.monthly![0],pattern=report.patterns!.rows[0];
    const originalMonth=month.sales,originalPattern=pattern.sales,originalTotal=report.metrics.sales!;
    const history=buildings[0].typologies_history.find(row=>String(row.period).startsWith(month.month))!;
    history.sold_in_period=Number(history.sold_in_period)-3;
    const result=buildSpSalesNeighborhoods(buildings,report);
    expect(result).toMatchObject({status:'blocked',rows:[],cityTotal:null});
    expect(result.issues[0]).toContain(`Total de 2T2026: empreendimentos ${originalTotal-3}; municipal ${originalTotal}; diferença -3`);
    expect(result.issues[0]).toContain(`Mês ${month.month}: empreendimentos ${originalMonth-3}; municipal ${originalMonth}; diferença -3`);
    expect(result.issues[0]).toContain(`Padrão ${pattern.group}: empreendimentos ${originalPattern-3}; municipal ${originalPattern}; diferença -3`);
    expect(result.issues[0]).toContain('sold_in_period');expect(result.issues[0]).toContain('liquid_sales');
    expect(report.metrics.sales).toBe(originalTotal);
  });
  it('mostra divergências mensais que se anulam no trimestre',()=>{
    const {report,buildings}=fixture(),months=report.monthly!;
    for(const [index,delta] of [[0,2],[1,-2]]){
      const row=buildings[0].typologies_history.find(value=>String(value.period).startsWith(months[index].month))!;
      row.sold_in_period=Number(row.sold_in_period)+delta;
    }
    const result=buildSpSalesNeighborhoods(buildings,report);
    expect(result.status).toBe('blocked');expect(result.issues[0]).toContain(`Mês ${months[0].month}`);
    expect(result.issues[0]).toContain('diferença +2');expect(result.issues[0]).toContain('diferença -2');
    expect(result.issues[0]).not.toContain('Total de');expect(result.issues[0]).not.toContain('Padrão');
  });
  it('identifica padrões divergentes mesmo com totais municipais e mensais iguais',()=>{
    const {report,buildings}=fixture(),month=report.monthly![0].month;
    for(const [index,delta] of [[0,4],[1,-4]]){
      const row=buildings[index].typologies_history.find(value=>String(value.period).startsWith(month))!;
      row.sold_in_period=Number(row.sold_in_period)+delta;
    }
    const result=buildSpSalesNeighborhoods(buildings,report);
    expect(result.status).toBe('blocked');expect(result.issues[0]).toContain('Padrão Alto');expect(result.issues[0]).toContain('Padrão Compacto');
    expect(result.issues[0]).not.toContain('Mês ');expect(result.issues[0]).not.toContain('Total de');
  });
});
