import { describe, expect, it } from 'vitest';
import { maceioHistoricalLaunch } from './historical-launch';
import { buildMaceioMarketSlide } from './market-slides-data';
import { buildOfferPriceSlide } from './offer-price-data';
import { offerPriceFixture } from './__tests__/offer-price-fixture';
import type { MaceioSelection } from './model';
import type { MarketRow } from './market';

const selection: MaceioSelection = { uf:'AL', city:'Maceió', territory:'capital-rm', periodicity:'monthly', year:2026, position:5 };
function cohortFixture(current: MaceioSelection) {
  const data = offerPriceFixture(current), end = data.end;
  for (const source of data.sources.filter(source=>source.city==='Maceió')) {
    if (source.metric==='details') {
      const old = source.rows[0];
      old.typologies_history = (old.typologies_history as MarketRow[]).map(row=>({ ...row, typology_stock:100, sold_in_period:0, releases_in_period:undefined, qty:100 }));
      source.rows = [old, { ...old, building_id:'new-project', neighborhood:'Novo bairro', release_date:`${end}-01`,
        typologies_history:[{ period:`${end}-01`, typology_id:1, number_bedroom:2, private_area:55, price:300000, qty:10, typology_stock:8, sold_in_period:2 }] }];
    } else {
      source.rows = source.rows.filter(row=>row.group===(source.group==='Padrão'?'Luxo':'1 dorm')).map(row=>({ ...row,
        stock:String(row.period).startsWith(end)?108:100,
        releases_in_period:String(row.period).startsWith(end)?10:0,
        liquid_sales:String(row.period).startsWith(end)?2:0 }));
    }
  }
  return data;
}
describe('Maceió · lançamentos derivados e reconciliados',()=>{
  it('preserva explícitos, inclusive zero, e não substitui valor inválido por capacidade',()=>{
    expect(maceioHistoricalLaunch({releases_in_period:0,qty:10},'2026-05','2026-05').value).toBe(0);
    expect(maceioHistoricalLaunch({releases_in_period:3,qty:10},null,'2026-05').value).toBe(3);
    for(const value of [true,-1,1.5,'inválido'])expect(maceioHistoricalLaunch({releases_in_period:value,qty:10},'2026-05','2026-05').value).toBeNull();
  });
  it('usa qty histórico apenas na coorte de lançamento e exige data e quantidade válidas',()=>{
    expect(maceioHistoricalLaunch({qty:'10.0'},'2026-05','2026-05').value).toBe(10);
    expect(maceioHistoricalLaunch({},'2020-01','2026-05').value).toBe(0);
    expect(maceioHistoricalLaunch({qty:10},null,'2026-05').value).toBeNull();
    for(const qty of [undefined,null,true,-1,2.5,''])expect(maceioHistoricalLaunch({qty},'2026-05','2026-05').value).toBeNull();
  });
  for(const periodicity of ['monthly','quarterly'] as const)it(`calcula ranking e IVV por área ${periodicity}, com proveniência e sem alterar a origem`,()=>{
    const current={...selection,periodicity,position:periodicity==='monthly'?5:2}, data=cohortFixture(current), before=JSON.stringify(data);
    const rank=buildMaceioMarketSlide(25,current,data);
    expect(rank.issue).toBeNull();expect(rank.ranking).toEqual([{label:'Novo bairro',value:10}]);expect(rank.note).toContain('derivados');
    for(const page of periodicity==='monthly'?[47,48]:[46,47]) {
      const ivv=buildOfferPriceSlide(page,current,data);
      expect(ivv.issue).toBeNull();expect(ivv.rows.at(-1)?.values.slice(3,6)).toEqual([10,100,2]);
      expect(ivv.warnings.join(' ')).toContain('derivados');
    }
    expect(JSON.stringify(data)).toBe(before);
  });
  it('bloqueia etapas/revisões cuja coorte não explica os lançamentos municipais',()=>{
    const data=cohortFixture(selection), source=data.sources.find(source=>source.city==='Maceió'&&source.metric==='releases'&&source.group==='Padrão')!;
    source.rows.at(-1)!.releases_in_period=11;
    expect(buildMaceioMarketSlide(25,selection,data).issue).toMatch(/diverge/);
    expect(buildOfferPriceSlide(47,selection,data).issue).toMatch(/divergem/);
  });
});
