import { afterEach,describe,it,expect } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import { FORTALEZA_BEIRA_MAR_PROJECTS,fortalezaIsBeiraMar } from './beira-mar';
import { buildOfferTable } from './monthly-tables';
import { FORTALEZA_CITIES,type FortalezaSelection } from './model';
import type { PriceCollection } from './monthly-prices';
import FortalezaMonthlyTableSlide from './FortalezaMonthlyTableSlide';

afterEach(cleanup);
const selection:FortalezaSelection={uf:'CE',city:'Fortaleza',territory:'capital-rm',periodicity:'monthly',year:2026,position:10};
const building=(name:string,neighborhood:string,index=0)=>({building_id:`synthetic-${index}`,name,neighborhood,city:'Fortaleza',state:'CE',building_type:'Vertical',release_date:'2020-01-01',standard:'Standard',typologies_history:[
  {period:'2026-09-01',typology_id:1,qty:10,typology_stock:3,sold_in_period:0,price_private_area:1000+index*100},
  {period:'2026-10-01',typology_id:1,qty:10,typology_stock:2,sold_in_period:1,price_private_area:1000+index*100},
]});
function fixture():PriceCollection{return {scopeKey:'fixture',months:['2026-09','2026-10'],issues:[],sources:[{city:'Fortaleza',segment:'Vertical',complete:true,records:FORTALEZA_BEIRA_MAR_PROJECTS.map(([name,neighborhood],index)=>building(name,neighborhood,index)),frames:{},issue:null,requests:1,startedAt:'',finishedAt:''}]};}
describe('Fortaleza mensal · agrupamento Beira Mar confirmado',()=>{
  for(const [name,neighborhood] of FORTALEZA_BEIRA_MAR_PROJECTS)it(`identifica ${name} somente no bairro/recorte confirmado`,()=>{
    const project=building(name,neighborhood);
    expect(fortalezaIsBeiraMar(project)).toBe(true);
    expect(fortalezaIsBeiraMar({...project,name:name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()})).toBe(true);
    for(const override of [{neighborhood:'Centro'},{city:'Aquiraz'},{state:'AL'},{building_type:'Horizontal'},{name:`Outro ${name}`}])expect(fortalezaIsBeiraMar({...project,...override})).toBe(false);
  });
  it('move os13casos, preserva todos os totais e gera a linha visível em52',()=>{
    const data=fixture(),baseline=structuredClone(data);baseline.sources[0].records.forEach(row=>row.name=`Outro ${row.name}`);
    const before=JSON.stringify(data),raw=buildOfferTable(52,null,baseline,selection,[...FORTALEZA_CITIES]);
    const result=buildOfferTable(52,null,data,selection,[...FORTALEZA_CITIES]);
    expect(result.status).toBe('ready');expect(result.rows.map(row=>row.label)).toEqual(['Beira Mar']);expect(result.total).toEqual(raw.total);
    expect(result.total).toMatchObject({projects:13,opening:39,stock:26,sales:13});expect(result.neighborhoodReclassification).toMatchObject({matchedProjects:13,appliedProjects:13});
    expect(JSON.stringify(data)).toBe(before);
    render(<FortalezaMonthlyTableSlide page={52} data={result} selection={selection}/>);expect(screen.getAllByText('Beira Mar').length).toBeGreaterThan(0);
  });
  it('preserva os outros empreendimentos nos bairros originais e a mesma tabela em52–55',()=>{
    const data=fixture();data.sources[0].records.push(building('Outro empreendimento','Meireles',99));
    const table=buildOfferTable(52,null,data,selection,[...FORTALEZA_CITIES]);expect(table.rows.find(row=>row.label==='Meireles')?.stock).toBe(2);expect(table.rows.find(row=>row.label==='Beira Mar')?.stock).toBe(26);expect(table.total.stock).toBe(28);
    for(const page of [53,54,55])expect(buildOfferTable(page,null,data,selection,[...FORTALEZA_CITIES])).toEqual(table);
  });
  it('mantém o trimestral e a auditoria bruta sem nova regra implícita; ignora futuros',()=>{
    const data=fixture();const future=building('Edge','Meireles',99);future.release_date='2027-01-01';data.sources[0].records.push(future);
    expect(buildOfferTable(52,null,data,selection,[...FORTALEZA_CITIES]).neighborhoodReclassification?.matchedProjects).toBe(13);
    const quarterData=structuredClone(data);quarterData.sources[0].records.forEach(project=>(project.typologies_history as Record<string,unknown>[]).forEach((row,index)=>row.period=index?'2026-12-01':'2026-11-01'));
    const quarter=buildOfferTable(52,null,quarterData,{...selection,periodicity:'quarterly',position:4},[...FORTALEZA_CITIES]);
    expect(quarter.status).toBe('ready');expect(quarter.rows.map(row=>row.label)).not.toContain('Beira Mar');expect(quarter.neighborhoodReclassification).toBeUndefined();
  });
});
