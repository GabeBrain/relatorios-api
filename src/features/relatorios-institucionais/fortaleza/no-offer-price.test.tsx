import { afterEach,it,expect } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import { buildPriceSlide,type PriceCollection } from './monthly-prices';
import { buildQuarterlyPrice } from './quarterly-analysis';
import { FortalezaPriceInsights } from './FortalezaPriceInsights';
import FortalezaMonthlyAnalysisSlide from './FortalezaMonthlyAnalysisSlide';
import type { FortalezaSelection } from './model';

afterEach(cleanup);
const selection:FortalezaSelection={uf:'CE',city:'Fortaleza',territory:'capital-rm',periodicity:'monthly',year:2026,position:10};
const cities=['Fortaleza','Aquiraz','Caucaia','Eusébio','Maracanaú'];
function fixture(month='2026-10'):PriceCollection {
  const values=[['Aquiraz',26,6330.308846153847],['Caucaia',169,6677.830946745562],['Eusébio',299,6190.808294314383],['Maracanaú',0,null]] as const;
  return {scopeKey:'synthetic',months:[month],issues:[],sources:values.map(([city,units,meter])=>({city,segment:'Horizontal',complete:true,records:[],frames:{[month]:{rows:[{project:city,typology:'1',product:'houses',units,meter,category:'Padrão'}],issues:[],productIssues:{}}},issue:null,requests:1,startedAt:'',finishedAt:''}))};
}
it('reproduz as494unidades e média ponderada de outubro sem preço zero em Maracanaú',()=>{
  const data=fixture(),before=JSON.stringify(data),model=buildPriceSlide(41,data,selection,cities);
  expect(model.status).toBe('ready');expect(model.cities!.reduce((sum,city)=>sum+city.units,0)).toBe(494);expect(model.average).toBeCloseTo(6364.763441295548);
  expect(model.cities!.at(-1)).toEqual({city:'Maracanaú',units:0,value:null});expect(model.warnings[0]).toContain('Maracanaú');expect(JSON.stringify(data)).toBe(before);
  const {container}=render(<FortalezaMonthlyAnalysisSlide page={41} selection={selection} data={model}/>);
  expect(screen.getByText('Sem oferta')).toBeTruthy();expect(screen.getByText('Maracanaú')).toBeTruthy();expect(screen.queryByLabelText('Análise mensal pendente')).toBeNull();expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  expect(screen.getByText('Média regional: 6.365')).toBeTruthy();
});
it('sem oferta em todas as cidades não inventa média nem divisão por zero',()=>{
  const data=fixture();data.sources.forEach(source=>source.frames['2026-10'].rows.forEach(row=>row.units=0));
  const model=buildPriceSlide(41,data,selection,cities);expect(model.status).toBe('ready');expect(model.average).toBeUndefined();
  render(<FortalezaMonthlyAnalysisSlide page={41} selection={selection} data={model}/>);expect(screen.getAllByText('Sem oferta')).toHaveLength(4);expect(screen.queryByText(/Média regional:/)).toBeNull();
});
it('falha de consulta e estoque positivo sem preço continuam bloqueados',()=>{
  const data=fixture();data.sources[0].complete=false;expect(buildPriceSlide(41,data,selection,cities).status).toBe('blocked');
  data.sources[0].complete=true;data.sources[0].frames['2026-10'].rows[0].meter=null;expect(buildPriceSlide(41,data,selection,cities).issue).toContain('Aquiraz');
});
it('detalhes de origem mostram ausência de oferta sem formatar null como dinheiro',()=>{
  const data=fixture(),model=buildPriceSlide(41,data,selection,cities);
  render(<FortalezaPriceInsights page={41} data={model} prices={data}/>);expect(screen.getByText(/Maracanaú: Sem oferta elegível/)).toBeTruthy();
});
it('correspondente trimestral preserva o mesmo tratamento',()=>{
  const model=buildQuarterlyPrice(46,fixture('2026-12'),{...selection,periodicity:'quarterly',position:4},cities);
  expect(model.status).toBe('ready');expect(model.cities!.at(-1)?.value).toBeNull();expect(model.average).toBeCloseTo(6364.763441295548);
});
