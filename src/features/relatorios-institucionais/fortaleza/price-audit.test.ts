import { describe,it,expect } from 'vitest';
import { auditFortalezaClosingPrices } from './price-audit';
import { buildPriceSlide,type PriceCollection,type PriceSource } from './monthly-prices';
import { FORTALEZA_CITIES,type FortalezaSelection } from './model';
import { buildFortalezaDiagnostic } from './diagnostic';

const selection:FortalezaSelection={uf:'CE',city:'Fortaleza',territory:'capital-rm',periodicity:'monthly',year:2026,position:10};
function fixture():PriceCollection {
  return {scopeKey:'private-token',months:['2026-10'],issues:[],sources:FORTALEZA_CITIES.map(city=>({city,segment:'Horizontal',complete:true,records:[{building_id:'private-id',name:'private-name',token:'private-token'}],frames:{'2026-10':{rows:[{project:'private-id',typology:'private-typology',product:'houses',units:10,meter:5000,category:'Padrão'}],issues:[],productIssues:{}}},issue:null,requests:1,startedAt:'',finishedAt:''} as PriceSource))};
}
const check=(data:PriceCollection|null)=>auditFortalezaClosingPrices(data,selection,[...FORTALEZA_CITIES]).rmSlides.find(slide=>slide.slide===41)!;
describe('Fortaleza · auditoria de preços sem alterar o slide',()=>{
  it('identifica exatamente a cidade sem oferta, conserva as demais e não altera o bloqueio',()=>{
    const data=fixture(),source=data.sources.find(source=>source.city==='Aquiraz')!;source.frames['2026-10'].rows[0].units=0;
    const before=JSON.stringify(data),audit=check(data);
    expect(audit.blockingCities).toEqual([{city:'Aquiraz',status:'no-offer',reason:expect.any(String)}]);
    expect(audit.cities.find(city=>city.city==='Aquiraz')).toMatchObject({eligibleUnits:0,pricePerM2:null,missingPriceObservations:0});
    expect(audit.cities.find(city=>city.city==='Caucaia')).toMatchObject({status:'ready',eligibleUnits:10,pricePerM2:5000});
    expect(buildPriceSlide(41,data,selection,[...FORTALEZA_CITIES]).status).toBe('blocked');expect(JSON.stringify(data)).toBe(before);
    expect(JSON.stringify(audit)).not.toMatch(/private-id|private-name|private-token|private-typology/);
  });
  it('distingue produto sem observações de preço ausente com estoque positivo',()=>{
    const data=fixture();data.sources[1].frames['2026-10'].rows=[];data.sources[2].frames['2026-10'].rows[0].meter=null;
    const audit=check(data);expect(audit.cities[0]).toMatchObject({status:'no-offer',observations:0,eligibleUnits:0});
    expect(audit.cities[1]).toMatchObject({status:'price-invalid',eligibleUnits:10,missingPriceUnits:10,pricePerM2:null});
  });
  it('não interpreta fonte incompleta, mês ausente ou erro de classificação como zero',()=>{
    const data=fixture();data.sources[1].complete=false;delete data.sources[2].frames['2026-10'];data.sources[3].frames['2026-10'].issues=['Empreendimento private-id: produto desconhecido'];
    const audit=check(data);expect(audit.cities.map(city=>city.status)).toEqual(['source-incomplete','month-missing','frame-invalid','ready']);
    expect(audit.cities.slice(0,3).every(city=>city.eligibleUnits===null)).toBe(true);expect(JSON.stringify(audit)).not.toContain('private-id');
  });
  it('mostra faixa de preços válida sem presumir que preço baixo é erro',()=>{
    const data=fixture(),source=data.sources[1];source.frames['2026-10'].rows.push({...source.frames['2026-10'].rows[0],typology:'second',units:20,meter:250});
    expect(check(data).cities[0]).toMatchObject({eligibleUnits:30,minValidPricePerM2:250,maxValidPricePerM2:5000,pricePerM2:(5000*10+250*20)/30});
  });
  it('mapeia o correspondente trimestral e inclui a auditoria no JSON exportado',()=>{
    const current={...selection,periodicity:'quarterly' as const,position:4};
    const audit=auditFortalezaClosingPrices(null,current,[...FORTALEZA_CITIES]);expect(audit.rmSlides.find(slide=>slide.product==='houses')?.slide).toBe(46);
    const diagnostic=buildFortalezaDiagnostic(selection,{phase:'done',startedAt:0,report:null,blueprint:null,intro:null,monthlyLaunches:null});
    expect(diagnostic.priceAudit.version).toBe('fortaleza-price-audit-v1');expect(diagnostic.priceAudit.rmSlides.find(slide=>slide.slide===41)?.blockingCities).toHaveLength(4);
    const slide=diagnostic.slides.find(slide=>slide.number===41)!;
    expect('priceCheck' in slide&&slide.priceCheck.blockingCities).toHaveLength(4);
  });
});
