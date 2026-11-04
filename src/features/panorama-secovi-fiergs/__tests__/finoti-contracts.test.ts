import { describe, it, expect } from 'vitest';
import { meanCategoryRates, observedComparison, closingTypologyPriceRanges, analyticContext, reconcileAggregateIvv, mcmvActivity } from '../report/editorial-contracts';
import { editableScopeReport } from './editable-pptx.fixture';
import { buildMapTilePlan } from '../lib/map-tiles';
import { pointInsideTerritory } from '../lib/municipal-territory';
import { buildPanoramaPresentationPackage } from '../report/presentation/build-package';
import { panoramaManifestFor } from '../report/manifest';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const report = () => editableScopeReport({ entity: 'fiergs-rs', uf: 'RS', cities: ['Canela', 'Gramado'], startQuarter: '1T2023', endQuarter: '3T2026' });
describe('contrato Finoti aprovado', () => {
  it('não toma classificação desconhecida como prova de ausência de MCMV', () => {
    const r=report();r.cube.projects.forEach(p=>{p.standard='Médio';});r.launches.unitStandards=[{quarter:'3T2026',economic:0,other:10}];
    expect(mcmvActivity(r,'launches')).toEqual({known:true,active:false});
    r.cube.projects[0].standard='Não classificado';
    expect(mcmvActivity(r,'launches').known).toBe(false);
  });
  it.runIf(process.env.PANORAMA_FINOTI_INPUTS === '1')('compila os manifestos completos dos onze replays, sem captura ou rede', async () => {
    const dir='.local-inputs/panorama-finoti-2026-11-04/after';
    const names=(await readdir(dir)).filter(n=>n.endsWith('-report.json'));
    expect(names).toHaveLength(11);
    const evidence=[];
    for(const name of names){
      const r=JSON.parse(await readFile(`${dir}/${name}`,'utf8'));
      const before=JSON.stringify(r),manifest=panoramaManifestFor(r,'local-map-token');
      const pkg=buildPanoramaPresentationPackage(r,manifest);
      expect(pkg.pages).toHaveLength(manifest.length);
      expect(JSON.stringify(r)).toBe(before);
      expect(pkg.pages.every(p=>p.blocks.length||p.background)).toBe(true);
      evidence.push({source:name,pages:manifest.length,unchanged:true,charts:pkg.pages.flatMap(p=>p.blocks.filter(b=>b.kind==='chart')).length});
    }
    await writeFile('.local-inputs/panorama-finoti-2026-11-04/full-manifest-compilation.json',JSON.stringify(evidence,null,2));
  });
  it('IVV consolidado inclui a categoria com distratos no numerador e denominador', () => {
    const r=report(),row=r.ivv.series.at(-1)!;
    const block={...r.ivv,series:[{...row,vertical:153/1618*100,horizontal:12,total:13}]};
    const sales={...r.sales.units,series:[{...row,vertical:146}]};
    const stock={...r.stock.units,series:[{...row,vertical:1571}]};
    const actual=reconcileAggregateIvv(block,sales,stock).series[0];
    expect(actual.vertical).toBeCloseTo(146/1717*100,10);
    expect(actual.horizontal).toBe(12);expect(actual.total).toBe(13);
  });
  it('média simples inclui zero e não reconta subtotal, total ou ausência', () => {
    expect(meanCategoryRates([{kind:'row',value:0},{kind:'row',value:20},{kind:'subtotal',value:80},{kind:'total',value:90},{kind:'row',value:null}])).toBe(10);
    expect(meanCategoryRates([{value:null}])).toBeNull();
  });
  it('preserva comparativos com atividade e usa delta absoluto sobre base não positiva', () => {
    expect(observedComparison(0,0).visible).toBe(false);
    expect(observedComparison(0,10)).toEqual({visible:true,percentage:null,difference:10});
    expect(observedComparison(-7,3)).toEqual({visible:true,percentage:null,difference:10});
    expect(observedComparison(10,15).percentage).toBe(50);
    expect(observedComparison(null,15).visible).toBe(false);
    expect(observedComparison(10,15,false).visible).toBe(false);
  });
  it('extremos e médias só usam estoque positivo, sem alterar o cubo ou censurar preço baixo/área50', () => {
    const r=editableScopeReport({ entity:'fiergs-rs',uf:'RS',cities:['Canela'],startQuarter:'1T2023',endQuarter:'3T2026' }),p=r.cube.projects[0];
    const t=p.typologies[0];
    p.typologies=[{...t, finalUnits:0,averagePricePerMeter:1},{...t,finalUnits:10,averagePricePerMeter:200,averageArea:50},{...t,finalUnits:30,averagePricePerMeter:400,averageArea:60}];
    const before=JSON.stringify(r);
    const value=closingTypologyPriceRanges(r)[0];
    expect(value.meterMin).toBe(200);expect(value.meterAverage).toBe(350);expect(value.areaMin).toBe(50);
    expect(JSON.stringify(r)).toBe(before);
  });
  it('contexto distingue fotografia, janela e acumulado',()=>{
    expect(analyticContext(report())).toContain('Canela e Gramado · RS · 3T 2026');
    expect(analyticContext(report(),true)).toContain('1T 2023');
    expect(analyticContext(report(),false,true)).toContain('12 meses até');
  });
  it('enquadramento vem do território e não do ponto distante',()=>{
    const extent={minLatitude:-29.5,maxLatitude:-29,minLongitude:-51,maxLongitude:-50.5};
    const territory={extent,cities:['exemplo'],source:'fixture'};
    const inside={latitude:-29.3,longitude:-50.8},far={latitude:-28,longitude:-52};
    expect(pointInsideTerritory(inside,territory)).toBe(true);expect(pointInsideTerritory(far,territory)).toBe(false);
    const a=buildMapTilePlan([inside],'test',extent)!,b=buildMapTilePlan([inside,far],'test',extent)!;
    expect(a.tiles).toEqual(b.tiles);expect(a.bounds).toEqual(extent);
  });
});
