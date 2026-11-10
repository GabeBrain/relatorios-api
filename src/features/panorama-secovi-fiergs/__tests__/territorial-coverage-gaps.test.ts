import {describe,it,expect} from 'vitest';
import {freeScopeReport} from './free-scopes.fixture';
import {buildTerritorialComparison} from '../report/territorial-projections';
import {temporalGapBridges,territorialTrend} from '../report/territorial-selectors';
import type {PanoramaScope} from '../types';

describe('aplicabilidade municipal e lacunas territoriais',()=>{
  const scope:PanoramaScope={entity:'fiergs-rs',engineVersion:'v4',uf:'RS',cities:['A','B','H'],startQuarter:'1T2023',endQuarter:'2T2026',presentation:{mode:'comparison',layout:'integrated',units:[{id:'a',label:'A',cities:['A']},{id:'g',label:'Vale',cities:['B','H']}]}};
  function setup(unknown=false,verticalH=false){
    const child=(city:string)=>freeScopeReport({...scope,cities:[city],presentation:undefined},{horizontal:city==='H',vertical:city!=='H'||verticalH,sold:city==='B'?8:20});
    const municipal=new Map(scope.cities.map(c=>[c,child(c)]));
    const build=(cities:string[])=>{
      if(cities.length===1)return municipal.get(cities[0])!;
      const base=freeScopeReport({...scope,cities,presentation:undefined},{sold:4});
      base.cube={...base.cube,projects:cities.flatMap(c=>municipal.get(c)!.cube.projects),rejections:unknown?[{city:'H',buildingId:'?',reason:'tipo desconhecido'}]:[]};
      const closing=base.sales.units.series.at(-1)!;
      base.sales.units={...base.sales.units,series:[{...closing,vertical:cities.includes('B')?8:20,observed:{vertical:true,horizontal:true}}]};
      return base;
    };
    const report=build(scope.cities);report.scope=scope;
    // Cobertura ausente no membro H é preservada como tal.
    const h=municipal.get('H')!;
    h.sales.units={...h.sales.units,series:h.sales.units.series.map(r=>({...r,observed:{vertical:false,horizontal:true}}))};
    report.territorial=buildTerritorialComparison(scope,report,build);
    return report;
  }
  it('não deixa município só horizontal apagar as8vendas observadas do outro membro',()=>{
    const r=setup();const group=r.territorial!.units[1];
    expect(r.territorial!.nonApplicableSegments).toContainEqual({city:'H',segment:'vertical'});
    expect(group.data.sales.units.series.at(-1)).toMatchObject({vertical:8,observed:{vertical:true}});
    expect(territorialTrend(r,{fiergsOfficialSlide:24} as never).series[1].plotted.at(-1)?.value).toBe(8);
  });
  it.each([['rejeição',true,false],['segmento vertical existente',false,true]] as const)('preserva lacuna quando há %s',(_,unknown,verticalH)=>{
    const r=setup(unknown,verticalH);expect(r.territorial!.units[1].data.sales.units.series.at(-1)?.observed?.vertical).toBe(false);
  });
  it('preço de um grupo não depende de preço inexistente num membro com estoque zero observado',()=>{
    const children=new Map(scope.cities.map(city=>[city,freeScopeReport({...scope,cities:[city],presentation:undefined})]));
    const h=children.get('H')!;const end=h.stock.units.series.at(-1)!;
    h.stock.units={...h.stock.units,series:[{...end,vertical:0,observed:{vertical:true,horizontal:false}}]};
    h.prices.meter={...h.prices.meter,series:[{...end,vertical:0,observed:{vertical:false,horizontal:false}}]};
    const b=children.get('B')!;b.prices.meter={...b.prices.meter,series:[{...end,vertical:7000,observed:{vertical:true,horizontal:false}}]};
    const build=(cities:string[])=>{
      if(cities.length===1)return children.get(cities[0])!;
      const report=freeScopeReport({...scope,cities,presentation:undefined});
      report.prices.meter={...report.prices.meter,series:[{...end,vertical:7000,observed:{vertical:true,horizontal:false}}]};
      return report;
    };
    const report=build(scope.cities);report.scope=scope;
    const comparison=buildTerritorialComparison(scope,report,build)!;
    expect(comparison.units[1].data.prices.meter.series.at(-1)).toMatchObject({vertical:7000,observed:{vertical:true}});
    h.stock.units.series[0].observed!.vertical=false;
    expect(buildTerritorialComparison(scope,report,build)!.units[1].data.prices.meter.series.at(-1)?.observed?.vertical).toBe(false);
  });
  it('gera pontes só entre extremos observados, mantendo nulos,zeros e negativos',()=>{
    const points=[{quarter:'1T2023',value:null},{quarter:'2T2023',value:0},{quarter:'3T2023',value:null},{quarter:'4T2023',value:-3},{quarter:'1T2024',value:null}];
    const before=JSON.stringify(points);expect(temporalGapBridges(points)).toEqual([{from:{quarter:'2T2023',value:0},to:{quarter:'4T2023',value:-3}}]);expect(JSON.stringify(points)).toBe(before);
  });
  it('não une pontos consecutivos nem estende a série nas extremidades',()=>{
    expect(temporalGapBridges([{quarter:'1T2023',value:1},{quarter:'2T2023',value:2},{quarter:'3T2023',value:null}])).toEqual([]);
  });
});
