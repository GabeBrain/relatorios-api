import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { monthlyMarketFixture,monthlyMarketSelection } from './__tests__/monthly-market-fixture';
import { buildQuarterlyLaunchSlide,buildQuarterlyMunicipalTable,buildQuarterlyStockTable } from './quarterly-launches';
import { monthlyLaunchMonths } from './monthly-launches';
import { FORTALEZA_CITIES } from './model';
import { buildIntroProject,type IntroData } from './intro-data';
import FortalezaReportSlide from './FortalezaReportSlide';
import { createFortalezaEditorial } from './monthly-closing';
import indices from './incc-di.json';
const selection={...monthlyMarketSelection,periodicity:'quarterly' as const,position:2};
const cities=[...FORTALEZA_CITIES];
const fixture=()=>monthlyMarketFixture(selection);
const intro:IntroData={status:'ready',issues:[],requests:1,startedAt:'',finishedAt:'',projects:monthlyLaunchMonths(selection).map((month,index)=>buildIntroProject({building_id:index+1,city:'Fortaleza',building_type:'Vertical',standard:index%2?'Econômico':'Standard',release_date:`${month}-01`}))};
describe('Fortaleza trimestral — ordem original 11–20',()=>{
  it('soma três meses em nove trimestres, mantendo acumulado sem confundir mês e trimestre',()=>{
    const data=buildQuarterlyLaunchSlide(12,fixture(),intro,selection,cities);
    expect(data.status).toBe('ready');expect(data.history).toHaveLength(9);
    expect(data.history[0].label).toBe('2T/2024');expect(data.history.at(-1)!.label).toBe('2T/2026');
    expect(data.history.at(-1)).toMatchObject({first:66,second:264,total:330});
    expect(data.accumulated[1].total).toBe(660);expect(data.changes.total).toBe(0);
  });
  it('mantém contagem distinta do cadastro, unidades da capital e RM separadas',()=>{
    const data=fixture();
    expect(buildQuarterlyLaunchSlide(11,data,intro,selection,cities).history.every(row=>row.total===3)).toBe(true);
    expect(buildQuarterlyLaunchSlide(13,data,intro,selection,cities).history.at(-1)).toMatchObject({first:30,second:18,total:48});
    expect(buildQuarterlyLaunchSlide(15,data,intro,selection,cities).history.at(-1)!.total).toBe(192);
    expect(buildQuarterlyLaunchSlide(14,data,intro,selection,cities).history.at(-1)!.total).toBe(240);
  });
  it('corrige VGV mês a mês antes de somar e não aplica INCC às unidades',()=>{
    const data=buildQuarterlyLaunchSlide(17,fixture(),intro,selection,cities),index=indices.indices as Record<string,number>;
    const expected=['2026-04','2026-05','2026-06'].reduce((sum,month)=>sum+75*index['2026-06']/index[month],0);
    expect(data.history.at(-1)!.total).toBeCloseTo(expected,8);
    expect(data.unit).toBe('milhões');
    expect(buildQuarterlyLaunchSlide(18,fixture(),intro,selection,cities).history.at(-1)!.total).toBeCloseTo(expected*7/75,8);
  });
  it('tabelas municipais usam junho e somam vertical, horizontal e comercial no total',()=>{
    const data=fixture(),units=buildQuarterlyMunicipalTable(16,data,selection,cities),money=buildQuarterlyMunicipalTable(19,data,selection,cities);
    expect(units.month).toBe('2026-06');expect(units.rows.at(-1)!.values).toEqual([22,22,22,22,22]);expect(units.rows.at(-1)!.total).toBe(110);
    expect(money.rows.at(-1)!.total).toBe(75);expect(money.rows[2].total).toBe(35);
  });
  it('bloqueia mês faltante, duplicação, fonte incompleta, preço ausente e recorte insuficiente',()=>{
    for(const mutate of [(data:ReturnType<typeof fixture>)=>data.sources[0].rows.pop(),(data:ReturnType<typeof fixture>)=>data.sources[0].rows.push(data.sources[0].rows[0]),(data:ReturnType<typeof fixture>)=>{data.sources[0].complete=false;}]){
      const data=fixture();mutate(data);expect(buildQuarterlyLaunchSlide(12,data,intro,selection,cities).status).toBe('blocked');
    }
    const data=fixture();data.sources[0].rows.find(row=>row.period==='2026-06-01')!.vgv_release=null;
    expect(buildQuarterlyMunicipalTable(19,data,selection,cities).status).toBe('blocked');
    expect(buildQuarterlyLaunchSlide(15,fixture(),intro,selection,['Fortaleza']).status).toBe('blocked');
  });
  it.each([1,2,3,4])('respeita virada de ano e acumulados do trimestre %i',position=>{
    const selected={...selection,year:2025,position},data=monthlyMarketFixture(selected);
    const result=buildQuarterlyLaunchSlide(12,data,intro,selected,cities);
    expect(result.history).toHaveLength(9);expect(result.history.at(-1)!.label).toBe(`${position}T/2025`);
    expect(result.accumulated[1].total).toBe(330*position);expect(result.changes.total).toBe(0);
  });
  it('renderiza cada posição original e mantém erro visível sem números antigos',()=>{
    const market=fixture();
    for(let page=11;page<=40;page++){
      const svg=renderToStaticMarkup(<FortalezaReportSlide page={page} selection={selection} cities={cities} data={intro} monthlyLaunches={{sources:[],issues:[],market}} editorial={createFortalezaEditorial()}/>);
      expect(svg).toContain(`Fortaleza · slide ${page}`);expect(svg).toContain('viewBox="0 0 1280 720"');expect(svg).not.toContain('Aguardando conferência');expect(svg).not.toContain('NaN');
    }
    const svg=renderToStaticMarkup(<FortalezaReportSlide page={12} selection={selection} cities={cities} data={null} monthlyLaunches={null} editorial={createFortalezaEditorial()}/>);
    expect(svg).toContain('Aguardando conferência da fonte');
  });
  it('vendas preservam negativos; estoque trimestral é fotografia, nunca soma de meses',()=>{
    const data=fixture();
    expect(buildQuarterlyLaunchSlide(24,data,intro,selection,cities).history.at(-1)).toMatchObject({first:45,second:180,total:225});
    expect(buildQuarterlyLaunchSlide(34,data,intro,selection,cities).history.at(-1)!.total).toBe(30);
    expect(buildQuarterlyLaunchSlide(37,data,intro,selection,cities).history.at(-1)!.total).toBe(1300);
    expect(buildQuarterlyLaunchSlide(38,data,intro,selection,cities).history.at(-1)!.total).toBe(160);
    expect(buildQuarterlyLaunchSlide(39,data,intro,selection,cities).history.at(-1)!.total).toBe(640);
    expect(buildQuarterlyLaunchSlide(37,data,intro,selection,cities).accumulated).toEqual([]);
    expect(buildQuarterlyMunicipalTable(31,data,selection,cities).rows.at(-1)!.total).toBe(75);
    expect(buildQuarterlyMunicipalTable(32,data,selection,cities).rows.at(-1)!.total).toBeCloseTo(64,8);
  });
  it('26/28 mantêm 13 janelas mensais móveis de 12 meses como no original',()=>{
    const data=fixture();
    const capital=buildQuarterlyLaunchSlide(26,data,intro,selection,cities),rm=buildQuarterlyLaunchSlide(28,data,intro,selection,cities);
    expect(capital.rolling).toHaveLength(13);expect(capital.rolling!.at(-1)).toMatchObject({launches:192,sales:144});
    expect(rm.rolling!.at(-1)).toMatchObject({launches:768,sales:576});
  });
  it('40 fecha o estoque dos três segmentos e não infere faixas de preço editoriais',()=>{
    const data=fixture(),table=buildQuarterlyStockTable(data,selection,cities);
    expect(table.status).toBe('ready');expect(table.rows.at(-1)!.total).toBe(2200);
    expect(table.rows.some(row=>row.label.includes('Chácaras'))).toBe(false);
    data.sources=data.sources.filter(source=>!(source.segment==='Comercial'&&source.metric==='stock'));
    expect(buildQuarterlyStockTable(data,selection,cities).status).toBe('blocked');
  });
});
