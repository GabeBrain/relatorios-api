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
import { reviewSpSlides } from './review';

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
  it('reproduz 24,6% para 9.513 de 38.658 do PPTX anotado, sem excluir negativos da base',()=>{
    const {report,buildings}=fixture(),first=report.monthly![0].month;
    // Top 10 and city total from the supplied deck; remaining distribution synthetic.
    const amounts=[1377,1135,1032,993,962,888,842,775,768,741,...Array.from({length:41},()=>700),449,-4];
    const values=amounts.map((units,index)=>({...structuredClone(buildings[0]),building_id:90000+index,neighborhood:`Bairro ${index}`,typologies_history:buildings[0].typologies_history.map(row=>({...row,sold_in_period:String(row.period).startsWith(first)?units:0}))}));
    report.metrics.sales=38658;report.monthly!.forEach(row=>{row.sales=row.month===first?38658:0;});
    const data=buildSpSalesNeighborhoods(values,report);
    expect(data).toMatchObject({status:'ready',cityTotal:38658,topTotal:9513});
    expect(data.topShare).toBeCloseTo(24.608101815924257);
    const svg=renderToStaticMarkup(<SpNeighborhoodSlide report={{...report,salesNeighborhoods:data}} sales/>);
    expect(svg).toContain('24,6%');expect(svg).toContain('3,6%');expect(svg).toContain('9.513 de 38.658 unidades');
  });
  it.each(['2T2026','4T2025'] as Quarter[])('publica percentuais sobre saldo municipal positivo em%s mesmo com bairro negativo',quarter=>{
    const {report,buildings}=fixture(quarter);
    const first=report.monthly![0].month;
    const amounts=[...Array.from({length:10},()=>10),-4];
    const values=amounts.map((units,index)=>({...structuredClone(buildings[0]),building_id:90000+index,neighborhood:`Bairro ${String(index).padStart(2,'0')}`,typologies_history:buildings[0].typologies_history.map(row=>({...row,sold_in_period:String(row.period).startsWith(first)?units:0}))}));
    report.metrics.sales=96;
    report.monthly!.forEach(row=>{row.sales=row.month===first?96:0;});
    const data=buildSpSalesNeighborhoods(values,report);
    expect(data).toMatchObject({status:'ready',cityTotal:96,topTotal:100});
    expect(data.rows).toHaveLength(10);
    expect(data.rows.every(row=>row.share!==null&&Math.abs(row.share-10/96*100)<1e-9)).toBe(true);
    expect(data.topShare).toBeCloseTo(100/96*100);
    expect(data.warnings!.some(warning=>warning.includes('negativas'))).toBe(true);
    const svg=renderToStaticMarkup(<SpNeighborhoodSlide report={{...report,salesNeighborhoods:data}} sales/>);
    expect(svg).toContain('104,2%');expect(svg).toContain('10,4%');
    expect(svg).not.toContain('10 un.');expect(svg).toContain('100 de 96 unidades');
    // The independent monthly reconciliation still blocks compensating changes.
    report.monthly![0].sales--;report.monthly![1].sales++;
    expect(buildSpSalesNeighborhoods(values,report).status).toBe('blocked');
  });
  it('preserva contribuição negativa no gráfico e não calcula participação para base negativa',()=>{
    const {report,buildings}=fixture(),first=report.monthly![0].month;
    const make=(amounts:number[])=>amounts.map((units,index)=>({...structuredClone(buildings[0]),building_id:90000+index,neighborhood:`Bairro ${index}`,typologies_history:buildings[0].typologies_history.map(row=>({...row,sold_in_period:String(row.period).startsWith(first)?units:0}))}));
    const setTotal=(total:number)=>{report.metrics.sales=total;report.monthly!.forEach(row=>{row.sales=row.month===first?total:0;});};
    setTotal(96);
    const signed=buildSpSalesNeighborhoods(make([100,-4]),report);
    expect(signed.rows.find(row=>row.units===-4)?.share).toBeCloseTo(-4/96*100);
    const svg=renderToStaticMarkup(<SpNeighborhoodSlide report={{...report,salesNeighborhoods:signed}} sales/>);
    expect(svg).toContain('-4,2%');expect(svg).toContain('100%');
    setTotal(-96);
    const negative=buildSpSalesNeighborhoods(make([4,-100]),report);
    expect(negative).toMatchObject({status:'ready',cityTotal:-96,topShare:null});
    expect(negative.rows.every(row=>row.share===null)).toBe(true);
  });
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
    expect(result.status).toBe('ready');expect(result.issues).toEqual([]);
    expect(result.warnings![0]).toContain('Padrão Alto');expect(result.warnings![0]).toContain('Padrão Compacto');
    expect(result.warnings![0]).not.toContain('Mês ');expect(result.warnings![0]).not.toContain('Total de');
  });
  it('reproduz os totais informados pelo usuário sem bloquear a dimensão bairro por diferenças de padrão',()=>{
    const {report,buildings}=fixture();
    // Aggregate values supplied by the user; monthly allocation below is synthetic.
    const actual=[348,6067,24817,385,1624,367,5050],municipal=[158,5658,26443,384,1610,515,3890];
    report.metrics.sales=38658;
    report.monthly!.forEach((row,index)=>{row.sales=index===0?38658:0;});
    report.patterns!.rows.forEach((row,index)=>{row.sales=municipal[index];});
    buildings.forEach((building,index)=>{for(const row of building.typologies_history){
      row.sold_in_period=String(row.period).startsWith(report.monthly![0].month)?actual[index]:0;
    }});
    const data=buildSpSalesNeighborhoods(buildings,report);
    expect(data).toMatchObject({status:'ready',cityTotal:38658,topTotal:38658,topShare:100});
    expect(data.rows.map(row=>row.units)).toEqual([...actual].sort((a,b)=>b-a));
    for(const delta of ['+190','+409','-1626','+1','+14','-148','+1160'])expect(data.warnings![0]).toContain(`diferença ${delta} unidade(s)`);
    const preview={...report,salesNeighborhoods:data};
    expect(reviewSpSlides(preview).find(row=>row.number===39)).toMatchObject({state:'available',reason:data.warnings![0]});
    const svg=renderToStaticMarkup(<SpNeighborhoodSlide report={preview} sales/>);
    expect(svg).toContain('total e meses reconciliados');expect(svg).not.toContain('meses e padrões reconciliados');
    report.monthly![0].sales--;report.monthly![1].sales++;
    expect(buildSpSalesNeighborhoods(buildings,report).status).toBe('blocked');
  });
});
