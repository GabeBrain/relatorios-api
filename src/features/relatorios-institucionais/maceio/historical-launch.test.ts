import { it, expect } from 'vitest';
import { maceioHistoricalLaunch } from './historical-launch';
import { buildMaceioMarketSlide } from './market-slides-data';
import { offerPriceFixture } from './__tests__/offer-price-fixture';
import type { MaceioSelection } from './model';
import type { MarketRow } from './market';

it('usa quantidade histórica somente no mês do lançamento e preserva fluxo explícito',()=>{
  expect(maceioHistoricalLaunch({qty:10},'2026-05','2026-05')).toBe(10);
  expect(maceioHistoricalLaunch({qty:10},'2026-04','2026-05')).toBe(0);
  expect(maceioHistoricalLaunch({qty:10,releases_in_period:3},'2026-04','2026-05')).toBe(3);
  expect(maceioHistoricalLaunch({qty:10,releases_in_period:null},'2026-05','2026-05')).toBeNull();
  expect(maceioHistoricalLaunch({qty:10},null,'2026-05')).toBeNull();
  expect(maceioHistoricalLaunch({qty:1.5},'2026-05','2026-05')).toBeNull();
});
for(const periodicity of ['monthly','quarterly'] as const)it(`ranking respeita data e reconciliação mensal · ${periodicity}`,()=>{
  const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity,year:2026,position:periodicity==='monthly'?5:2};
  const data=offerPriceFixture(selection),source=data.sources.find(s=>s.city==='Maceió'&&s.metric==='details')!,months=periodicity==='monthly'?['2026-05']:['2026-04','2026-05','2026-06'];
  const base=source.rows[0];source.rows=months.map((month,i)=>({...base,building_id:i+1,neighborhood:`Bairro ${i}`,release_date:`${month}-01`,typologies_history:months.filter(m=>m>=month).map(m=>({period:`${m}-01`,typology_id:1,qty:10,sold_in_period:m===month?10:0}))}));
  source.rows.push({...base,building_id:'future',release_date:'2026-09-01',typologies_history:months.map(m=>({period:`${m}-01`,typology_id:1,qty:9999,sold_in_period:null}))});
  expect(buildMaceioMarketSlide(25,selection,data).issue).toBeNull();
  expect(buildMaceioMarketSlide(25,selection,data).ranking.reduce((a,b)=>a+b.value,0)).toBe(months.length*10);
  expect(buildMaceioMarketSlide(36,selection,data).issue).toBeNull();
  (source.rows[0].typologies_history as MarketRow[])[0].qty=11;
  expect(buildMaceioMarketSlide(25,selection,data).issue).toMatch(/diverge/);
  (source.rows[0].typologies_history as MarketRow[])[0].sold_in_period=null;
  expect(buildMaceioMarketSlide(36,selection,data).issue).toMatch(/sold_in_period/);
});
