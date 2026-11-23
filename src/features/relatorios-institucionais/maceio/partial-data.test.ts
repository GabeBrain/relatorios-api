import {describe,it,expect} from 'vitest';
import {remainingFixture} from './__tests__/remaining-fixture';
import {buildMaceioMarketSlide} from './market-slides-data';
import {buildOfferPriceSlide} from './offer-price-data';
import {buildRemainingSlide} from './remaining-data';
import {buildMaceioDataIssuesReview} from './data-issues-review';
import type {MaceioSelection} from './model';
import type {MarketRow} from './market';

const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'quarterly',year:2026,position:3};
const pages=[36,46,47,49,50,51,52,53,55,56,57,58,59,61,62,63,64,66,67,68,69,70,80];

describe('liberação dos 23 slides com casos isolados registrados',()=>{
  it('percorre os 23 com fotografia faltante, preço/área zero, Médio-Alto e comercial misto',()=>{
    const data=remainingFixture(selection);
    const capital=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!;
    capital.rows[0].typologies_history=(capital.rows[0].typologies_history as MarketRow[]).filter(row=>!['2026-06','2026-08','2026-09'].includes(String(row.period).slice(0,7)));
    for(const row of capital.rows[1].typologies_history as MarketRow[])if(String(row.period).startsWith('2026-09'))row.price=0;
    for(const row of capital.rows[2].typologies_history as MarketRow[])if(String(row.period).startsWith('2025-09'))row.private_area=0;
    capital.rows.push({city:'Maceió',state:'AL',building_type:'Vertical',building_id:'future',release_date:'2027-01-01',typologies_history:[{period:'2026-07-01',typology_id:1,sold_in_period:1}]});
    data.sources.find(source=>source.city==='Marechal Deodoro'&&source.metric==='details')!.rows[0].standard='Médio-Alto';
    const commercial=data.commercial![0].rows[0],photo=(commercial.typologies_history as MarketRow[])[0];
    (commercial.typologies_history as MarketRow[]).push({...photo,typology_id:2,price:850000});data.commercial![1].rows[0].stock=200;
    const original=JSON.stringify(data);
    for(const page of pages){
      const model=page<=40?buildMaceioMarketSlide(page,selection,data):page<=60?buildOfferPriceSlide(page,selection,data,'stock-weighted'):buildRemainingSlide(page,selection,data,'stock-weighted');
      expect(model.issue,`slide ${page}`).toBeNull();
      if(page!==36&&page!==63&&page!==80&&'warnings' in model)expect(model.warnings.some(warning=>warning.startsWith('Base parcial:')),`aviso slide ${page}`).toBe(true);
    }
    expect(JSON.stringify(data)).toBe(original);
    const review=buildMaceioDataIssuesReview(selection,data);
    expect(review.csv).toContain('Fotografia mensal ausente');expect(review.csv).toContain('Preço ausente, inválido ou zero');
  });
  it('IVV exclui o mesmo empreendimento em toda a janela, sem mudar denominador entre meses',()=>{
    const data=remainingFixture(selection),capital=data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!;
    capital.rows[0].typologies_history=(capital.rows[0].typologies_history as MarketRow[]).filter(row=>!String(row.period).startsWith('2026-08'));
    const model=buildOfferPriceSlide(47,selection,data);
    expect(model.issue).toBeNull();
    expect(model.rows.at(-1)!.values.slice(0,2)).toEqual([900,900]);
    expect(model.rows.at(-1)!.values[3]).toBe(108);
    expect(model.rows.at(-1)!.values[5]).toBe(108);
    expect(model.rows.at(-1)!.values[7]).toBeCloseTo(108/1008*100);
    expect(model.warnings.join(' ')).toContain('Mesma base de empreendimentos');
  });
  it('preços sem nenhuma base válida continuam sem preço, sem inventar zero',()=>{
    const data=remainingFixture(selection);
    for(const source of data.sources.filter(source=>source.metric==='details'))for(const building of source.rows)for(const row of building.typologies_history as MarketRow[])row.price=0;
    const model=buildOfferPriceSlide(55,selection,data,'stock-weighted');expect(model.issue).toContain('Nenhuma unidade');
  });
  it('ranking sem nenhum empreendimento válido não vira uma classificação vazia de valor zero',()=>{
    const data=remainingFixture(selection);
    for(const building of data.sources.find(source=>source.city==='Maceió'&&source.metric==='details')!.rows)for(const row of building.typologies_history as MarketRow[])row.sold_in_period=null;
    const model=buildMaceioMarketSlide(36,selection,data);expect(model.issue).toContain('nenhum empreendimento');expect(model.warnings?.join(' ')).toContain('sold_in_period ausente');
  });
});
