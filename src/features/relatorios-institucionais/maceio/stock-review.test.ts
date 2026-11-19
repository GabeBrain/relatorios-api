import { describe,it,expect } from 'vitest';
import { buildMaceioStockReview } from './stock-review';
import { offerPriceFixture } from './__tests__/offer-price-fixture';
import type { MaceioSelection } from './model';
import type { MarketRow } from './market';

const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
describe('conferência identificada do estoque',()=>{
  for(const periodicity of ['monthly','quarterly'] as const)it(`localiza delta por padrão e quartos ${periodicity}, preserva futuros e privacidade`,()=>{
    const current={...selection,periodicity,position:periodicity==='monthly'?5:2},data=offerPriceFixture(current);
    const details=data.sources.find(source=>source.city==='Marechal Deodoro'&&source.metric==='details')!;
    const building=details.rows[0];building.name='Empreendimento para conferir';building.status='Esgotado';building.token='private-token';building.address='private-address';
    const row=(building.typologies_history as MarketRow[]).at(-1)!;row.typology_stock=Number(row.typology_stock)+34;row.building_status='Ativo';
    details.rows.push({...structuredClone(building),building_id:'future-project',release_date:'2030-01-01'});
    const raw=JSON.stringify(data),review=buildMaceioStockReview(current,data);
    expect(review.complete).toBe(true);expect(review.mismatchCities).toEqual(['Marechal Deodoro']);
    const city=review.reports.find(report=>report.summary.city==='Marechal Deodoro')!;
    expect(city.summary.delta).toBe(34);
    expect(city.comparisons.byCatalogStandard.find(group=>group.group==='luxo')?.delta).toBe(34);
    expect(city.comparisons.byBedrooms.find(group=>group.group==='1')?.delta).toBe(34);
    expect(city.records.find(record=>record.projectId==='future-project')?.eligible).toBe(false);
    expect(city.records[0]).toMatchObject({projectName:'Empreendimento para conferir',historicalStatus:'Ativo',catalogStatus:'Esgotado'});
    expect(JSON.stringify(review)).not.toMatch(/private-token|private-address/);expect(JSON.stringify(data)).toBe(raw);
  });
  it('coleta incompleta e duplicação não produzem comparação numérica confiável',()=>{
    const data=offerPriceFixture(selection),source=data.sources.find(source=>source.city==='Marechal Deodoro'&&source.metric==='details')!;
    source.complete=false;
    let review=buildMaceioStockReview(selection,data);expect(review.complete).toBe(false);
    expect(review.reports.find(report=>report.summary.city==='Marechal Deodoro')!.comparisons.byCatalogStandard.every(group=>group.granularStock===null)).toBe(true);
    source.complete=true;source.rows.push(source.rows[0]);review=buildMaceioStockReview(selection,data);
    expect(review.reports.find(report=>report.summary.city==='Marechal Deodoro')!.summary.invalid.duplicateProjects).toBe(1);
    expect(review.reports.find(report=>report.summary.city==='Marechal Deodoro')!.comparisons.byBedrooms.every(group=>group.delta===null)).toBe(true);
  });
  it('não reaproveita fontes de outra competência',()=>{
    const data=offerPriceFixture(selection);data.end='2026-04';
    const review=buildMaceioStockReview(selection,data);expect(review.complete).toBe(false);expect(review.reports.every(report=>!report.records.length)).toBe(true);
  });
});
