import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { freeScopeReport } from './free-scopes.fixture';
import { defaultTerritorialPresentation } from '../domain/territorial-presentation';
import { panoramaManifestFor } from '../report/manifest';
import { territorialTrend } from '../report/territorial-selectors';
import { PanoramaPresentationContent } from '../components/ReportPaginator';
import { territorialPriceRows, territorialAnnualColumns } from '../report/territorial-selectors';

function report() {
  return freeScopeReport({ entity:'fiergs-rs',uf:'RS', cities:['Canela','Gramado','Canoas'],startQuarter:'1T2023',endQuarter:'2T2026',engineVersion:'v4',
    presentation:defaultTerritorialPresentation(['Canela','Gramado','Canoas']) },{horizontal:true});
}
describe('apresentação territorial', () => {
  it('expande somente famílias específicas, com identificadores exclusivos e sumário contínuo', () => {
    const r=report(), pages=panoramaManifestFor(r);
    expect(pages.filter((p)=>p.fiergsOfficialSlide===58)).toHaveLength(4);
    expect(pages.filter((p)=>p.fiergsOfficialSlide===61)).toHaveLength(4);
    expect(pages.filter((p)=>p.fiergsOfficialSlide===59)).toHaveLength(1);
    expect(pages.filter((p)=>p.fiergsOfficialSlide===67).length).toBeLessThanOrEqual(1);
    const ids=pages.map((p)=>p.id).filter(Boolean);expect(new Set(ids).size).toBe(ids.length);
    expect(pages.map((p)=>p.page)).toEqual(Array.from({length:pages.length},(_,i)=>i+1));
  });
  it('preserva cobertura ausente, negativo e comparativo absoluto sobre base negativa', () => {
    const r=report();const series=r.territorial!.units[0].data.sales.units.series;
    for(const row of series){row.vertical=0;row.observed={vertical:true,horizontal:false};}
    series.find((p)=>p.quarter==='2T2025')!.vertical=-3;
    series.find((p)=>p.quarter==='2T2026')!.vertical=7;
    series[0].observed!.vertical=false;
    const model=territorialTrend(r,{page:1,referenceSlide:24,fiergsOfficialSlide:24,sectionId:'sales',title:'Vendas',intention:'',visualFamily:'trend-chart',contractKeys:[],methodologyStatus:'reconciled'});
    expect(model.rows[0].v0).toBeNull();
    expect(model.series[0].comparisons.find((p)=>p.kind==='quarter')?.left).toBe(-3);
    expect(model.rows.at(-1)?.v0).toBe(7);
  });
  it('tabela compacta identifica as três unidades; extremos usam o universo de uma unidade', () => {
    const r=report(),pages=panoramaManifestFor(r);
    const table=renderToStaticMarkup(<PanoramaPresentationContent report={r} def={pages.find((p)=>p.fiergsOfficialSlide===36&&p.territorialKind)!}/>);
    for(const label of ['Canela','Gramado','Canoas'])expect(table).toContain(label);
    const range=renderToStaticMarkup(<PanoramaPresentationContent report={r} def={pages.find((p)=>p.fiergsOfficialSlide===58&&p.territorialUnitId)!}/>);
    expect(range).toContain('Canela');
    expect(range).not.toContain('Canoas');
  });
  it('oculta percentual sem denominador e preço sem observação, preservando zero observado',()=>{
    const r=report(),pages=panoramaManifestFor(r);const unit=r.territorial!.units[0];
    unit.data.granular.offerByTypology=unit.data.granular.offerByTypology.map((row)=>({...row,finalUnits:0}));
    const html=renderToStaticMarkup(<PanoramaPresentationContent report={r} def={pages.find((p)=>p.fiergsOfficialSlide===36&&p.territorialKind)!}/>);
    expect(html.match(/<th>%<\/th>/g)).toHaveLength(2);expect(html).toContain('<td>0</td>');
    for(const u of r.territorial!.units)for(const row of u.data.granular.pricesByStandard)row.averagePricePerMeter=null;
    expect(territorialPriceRows(r,'meter-standard').rows).toEqual([]);
    unit.data.granular.pricesByStandard[0].averagePricePerMeter=0;
    expect(territorialPriceRows(r,'meter-standard').rows[0].v0).toBe(0);
  });
  it('amplia a composição aprovada: título em blocos, quadro anual no cabeçalho e comparativos gráficos laterais', () => {
    const r=report(),pages=panoramaManifestFor(r);
    // Ensure this fixture has a valid year-over-year comparison to render.
    for (const unit of r.territorial!.units) for (const row of unit.data.launches.projects) {
      row.vertical=1;
    }
    const html=renderToStaticMarkup(<PanoramaPresentationContent report={r} def={pages.find((p)=>p.fiergsOfficialSlide===9&&p.territorialKind)!}/>);
    const dom=new DOMParser().parseFromString(html,'text/html');
    expect(dom.querySelector('.panorama-fiergs-quarterly header h2 span')?.textContent?.toLowerCase()).toBe('por trimestre');
    expect(dom.querySelector('header .panorama-territorial-annual-box')).not.toBeNull();
    expect(dom.querySelector('main .panorama-fiergs-quarterly-series')).not.toBeNull();
    expect(dom.querySelector('main aside section [data-panorama-chart]')).not.toBeNull();
    expect(dom.querySelector('.panorama-territorial-main')).toBeNull();
    expect(dom.querySelector('main table')).toBeNull();
  });
  it('não publica quadros anuais sem atividade e conserva comparações válidas sobre zero/negativo', () => {
    const annual=[{unit:{id:'a',label:'A',cities:['A']},values:[{year:'2023',value:0},{year:'2024',value:0},{year:'2025',value:4}]}];
    expect(territorialAnnualColumns(annual)).toEqual([2]);
    annual[0].values[1].value=-2;
    expect(territorialAnnualColumns(annual)).toEqual([1,2]);
    const r=report();for(const u of r.territorial!.units)for(const row of u.data.launches.projects)row.vertical=0;
    const def=panoramaManifestFor(r).find((p)=>p.fiergsOfficialSlide===9&&p.territorialKind)!;
    const dom=new DOMParser().parseFromString(renderToStaticMarkup(<PanoramaPresentationContent report={r} def={def}/>),'text/html');
    expect(dom.querySelector('.panorama-territorial-annual-box table')).toBeNull();
    expect(dom.querySelector('.panorama-territorial-series-chart')).not.toBeNull();
  });
  it('identifica a janela na composição anual, não somente o fechamento', () => {
    const r=report();r.annualCompositions=[{metric:'units',title:'Unidades por padrão',categories:['Médio'],unclassified:0,years:[{year:2025,from:'1T2025',through:'4T2025',total:10,status:'ready',values:[{label:'Médio',value:10,share:100}]}]}];
    const def=panoramaManifestFor(r).find((p)=>p.annualCompositionMetric==='units')!;
    const dom=new DOMParser().parseFromString(renderToStaticMarkup(<PanoramaPresentationContent report={r} def={def}/>),'text/html');
    expect(dom.querySelector('.panorama-analytic-context')?.textContent).toContain('1T 2023');
    expect(dom.querySelector('.panorama-analytic-context')?.textContent).toContain('2T 2026');
    expect(dom.querySelector('[data-annual-single-year="2025"]')?.textContent).toContain('100%');
  });

  it('preserva cada página consolidada e mantém seu detalhamento logo depois na mesma seção',()=>{
    const r=report(),pages=panoramaManifestFor(r);
    for(const n of [9,11,24,36,50,58,61,63]){
      const family=pages.filter(p=>p.fiergsOfficialSlide===n);
      expect(family.length).toBeGreaterThan(1);
      expect(family[0].territorialKind).toBeUndefined();expect(family[0].territorialUnitId).toBeUndefined();
      for(const child of family.slice(1))expect(child.territorialParentId).toBe(family[0].id);
      expect(family.at(-1)!.page-family[0].page+1).toBe(family.length);
      expect(new Set(family.map(p=>p.sectionId)).size).toBe(1);
    }
  });

  it('a composição anual acompanha a sua métrica depois do par consolidado/detalhamento',()=>{
    const r=report();r.annualCompositions=(['projects','units','vgl'] as const).map(metric=>({metric,title:metric,categories:['Médio'],unclassified:0,years:[{year:2025,from:'1T2025',through:'4T2025',total:10,status:'ready',values:[{label:'Médio',value:10,share:100}]}]}));
    const pages=panoramaManifestFor(r);
    for(const [metric,official]of [['projects',9],['units',12],['vgl',20]] as const){
      const family=pages.filter(p=>p.fiergsOfficialSlide===official);
      expect(pages.find(p=>p.annualCompositionMetric===metric)!.page).toBe(family.at(-1)!.page+1);
    }
  });

});
