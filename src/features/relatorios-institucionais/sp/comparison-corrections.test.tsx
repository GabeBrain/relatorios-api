import { afterEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,within } from '@testing-library/react';
import { buildSpMarketDetails,type SpMapProject } from './market-details';
import type { SpObservation } from './granular-details';
import { buildSpTemporalPreview } from './temporal';
import { recordedInput } from './__tests__/recorded';
import { spMapPlan } from './map-model';
import { spVgvHeat } from './map-heat';
import { spSvgTexts } from './pptx-export';
import { SpReportPages } from './SpReportPages';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
const observation=(overrides:Partial<SpObservation>={}):SpObservation=>({project:'a',typology:'1',month:'2026-08',standard:'Standard',bedrooms:1,area:45,stock:10,sales:1,qty:20,price:450000,meter:10000,release:'2025-01',sold:10,stage:'Planta',...overrides});
function market(rows:SpObservation[]){
  const report=buildSpTemporalPreview(recordedInput(),'3T2026');report.metrics.stock=rows.reduce((sum,row)=>sum+(row.stock??0),0);
  const buildings=[...new Set(rows.map(row=>row.project))].map(building_id=>({building_id,name:building_id,latitude:-23.5,longitude:-46.6}));
  return buildSpMarketDetails(rows,buildings,report,null);
}
describe('SP — correções da comparação dos85slides',()=>{
  it('faixa usa ticket do empreendimento Standard e denominador Standard, sem depender dos preços de outros padrões',()=>{
    const rows=[observation({price:350000,stock:5}),observation({typology:'2',price:550000,stock:5}),observation({project:'b',price:650000,stock:30,qty:50}),observation({project:'c',standard:'Econômico',price:null,stock:100,qty:100})];
    const data=market(rows);
    expect(data.priceBand).toMatchObject({numerator:10,denominator:40,selection:'standard-project-ticket-v1'});
    expect(data.priceBandShare).toBe(25);
    rows[0].price=null;expect(market(rows).priceBandShare).toBeNull();
    expect(market([observation({standard:'Econômico'})]).priceBandShare).toBeNull();
  });
  it('capacidade considera projetos em oferta, incluindo tipologia esgotada, e preserva fonte e identidades',()=>{
    const rows=[observation(),observation({typology:'2',qty:30,stock:0,price:300000,sold:30}),observation({project:'esgotado',qty:1000,stock:0,price:null,stage:null})];
    const source=structuredClone(rows),data=market(rows);
    expect(data.capacityUniverse).toEqual({selection:'projects-with-positive-stock',includedProjects:1,excludedProjects:1});
    expect(data.vgv.total).toMatchObject({qty:50,sold:40,stock:10,offeredVgv:18000000,soldVgv:13500000,stockVgv:4500000});
    expect(data.vgv.partial).toBe(false);
    expect(data.stages.launched.ready).toBe(true);
    expect(data.stages.launched.typologies.reduce((sum,row)=>sum+row.total,0)).toBe(50);
    expect(data.stages.final.typologies.reduce((sum,row)=>sum+row.total,0)).toBe(10);
    expect(rows).toEqual(source);
    rows[1].price=null;expect(market(rows).vgv.total!.offeredVgv).toBeNull();
  });
  it('mapa aplica exatamente os quatro segmentos confirmados',()=>{
    const points=['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo'].map((standard,i):SpMapProject=>({id:String(i),name:String(i),standard,stock:10,meter:10000,ticket:450000,vgv:4500000,latitude:-23.5+i*.001,longitude:-46.6}));
    const map=spMapPlan(points,'standard',false,'');
    expect(map.standards).toEqual(['Compactos','MCMV','Médio Padrão','Luxo']);
    expect(new Set(points.map(map.palette)).size).toBe(4);
    expect(map.palette(points[2])).toBe(map.palette(points[4]));expect(map.palette(points[5])).toBe(map.palette(points[6]));
  });
  it('calor pondera VGV sem inventar valor ausente ou posição',()=>{
    const one=spVgvHeat([{left:50,top:50,value:100}]);
    const two=spVgvHeat([{left:50,top:50,value:100},{left:50,top:50,value:100},{left:10,top:20,value:null},{left:NaN,top:20,value:200}]);
    expect(two.maximum).toBeCloseTo(one.maximum*2);expect(two.contributors).toBe(2);
    expect(two.cells.every(cell=>Number.isFinite(cell.ratio)&&cell.ratio>0&&cell.ratio<=1)).toBe(true);
    expect(spVgvHeat([{left:50,top:50,value:0}]).cells).toEqual([]);
  });
  it('exporta texto direto e spans sem perder trimestre ou exportar tooltip',()=>{
    const root=document.createElement('div');document.body.append(root);
    root.innerHTML='<svg><text style="font-size:20px">2T<tspan style="font-size:20px">2026</tspan><title>Tooltip</title></text><text><tspan style="font-size:20px">3T</tspan><tspan style="font-size:20px">2025</tspan></text><text>126.307<tspan> unidades</tspan></text></svg>';
    vi.spyOn(Element.prototype,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:1280,height:720} as DOMRect);
    expect(spSvgTexts(root).map(row=>row.text)).toEqual(['2T','2026','3T','2025','126.307',' unidades']);root.remove();
  });
  it('índice e divisórias navegam na página e expõem os destinos para o PPTX',()=>{
    render(<SpReportPages report={buildSpTemporalPreview(recordedInput(),'3T2026')}/>);
    fireEvent.click(screen.getByRole('button',{name:'6. Sumário e navegação'}));
    expect(screen.getByRole('article').querySelectorAll('[data-sp-target-slide]')).toHaveLength(9);
    fireEvent.click(within(screen.getByRole('article')).getByRole('button',{name:'Ir para 12. lançamentos verticais'}));
    expect(screen.getByRole('article')).toHaveAttribute('aria-label','Slide 12: Divisória: lançamentos verticais');
    expect(screen.queryByRole('button',{name:'Voltar ao sumário'})).not.toBeInTheDocument();
  });
});
