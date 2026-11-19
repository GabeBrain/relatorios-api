import { describe, it, expect } from 'vitest';
import { buildOfferPriceSlide } from './offer-price-data';
import { offerPriceFixture } from './__tests__/offer-price-fixture';
import type { MaceioSelection } from './model';
import type { MarketRow } from './market';

const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
describe('IVV por área · contribuições históricas',()=>{
  for(const periodicity of ['monthly','quarterly'] as const) {
    const current={...selection,periodicity,position:periodicity==='monthly'?5:2};
    const pages=periodicity==='monthly'?[47,48]:[46,47];
    it(`área zero sem estoque nem fluxos não bloqueia ${periodicity}`,()=>{
      const data=offerPriceFixture(current),details=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!;
      const baseline=pages.map(page=>buildOfferPriceSlide(page,current,data));
      const building=structuredClone(details.rows[0]);building.building_id='zero-contributor';
      for(const row of building.typologies_history as MarketRow[])Object.assign(row,{private_area:0,typology_stock:0,sold_in_period:0,releases_in_period:0});
      details.rows.push(building);
      pages.forEach((page,i)=>{const result=buildOfferPriceSlide(page,current,data);expect(result.issue).toBeNull();expect(result.rows).toEqual(baseline[i].rows);});
    });
    it(`área desconhecida com unidades preserva totais numa linha explícita ${periodicity}`,()=>{
      const data=offerPriceFixture(current),details=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!;
      for(const row of details.rows[0].typologies_history as MarketRow[])row.private_area=0;
      const raw=JSON.stringify(data);
      for(const page of pages){const result=buildOfferPriceSlide(page,current,data);expect(result.issue).toBeNull();
        expect(result.rows.find(row=>row.label==='Área não informada')?.values[1]).toBe(100);
        expect(result.rows.at(-1)?.values[1]).toBe(1000);expect(result.warnings.join(' ')).toContain('Área não informada');}
      expect(JSON.stringify(data)).toBe(raw);
    });
  }
});
