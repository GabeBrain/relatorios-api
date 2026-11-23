import {describe,it,expect} from 'vitest';
import {buildOfferPriceSlide} from './offer-price-data';
import {offerPriceFixture} from './__tests__/offer-price-fixture';
import type {MaceioSelection} from './model';
import type {MarketRow} from './market';
const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
describe('Maceió41–60 · oferta, IVV e preços',()=>{
  for(const periodicity of ['monthly','quarterly'] as const)it(`mantém a sequência própria ${periodicity} e calcula fontes reconciliadas`,()=>{
    const current={...selection,periodicity,position:periodicity==='monthly'?5:2},data=offerPriceFixture(current);
    for(let page=41;page<=60;page++)expect(buildOfferPriceSlide(page,current,data,'stock-weighted').issue,`slide${page}`).toBeNull();
    expect(buildOfferPriceSlide(periodicity==='monthly'?44:43,current,data).kind).toBe('editorial');
  });
  it('usa estoque de fechamento, sem soma dos3meses',()=>{
    const current={...selection,periodicity:'quarterly' as const,position:2},data=offerPriceFixture(current);
    const model=buildOfferPriceSlide(41,current,data);expect(model.series[0].values).toEqual([10,20,30,40]);
    for(const source of data.sources.filter(s=>s.metric==='stock'))for(const row of source.rows)if(String(row.period).startsWith('2026-05'))row.stock=99999;
    expect(buildOfferPriceSlide(41,current,data).series).toEqual(model.series);
  });
  it('bloqueia divergência da oferta por tipologia',()=>{
    const data=offerPriceFixture(selection);data.sources.find(s=>s.group==='Tipologia'&&s.metric==='stock')!.rows.at(-1)!.stock=1;
    expect(buildOfferPriceSlide(42,selection,data).issue).toMatch(/reconciliação/);
  });
  it('preserva categoria desconhecida como pendência',()=>{
    const data=offerPriceFixture(selection);data.sources.find(s=>s.group==='Tipologia'&&s.metric==='stock')!.rows.at(-1)!.group='Studio';
    expect(buildOfferPriceSlide(42,selection,data).issue).toMatch(/Tipologia/);
  });
  it('IVV mensal usa estoque anterior mais lançamentos',()=>{
    const model=buildOfferPriceSlide(45,selection,offerPriceFixture(selection));
    expect(model.series[0].values).toHaveLength(25);expect(model.series[0].values[0]).toBeCloseTo(10/1010*100);
  });
  it('preserva venda líquida negativa em IVV com balanço válido',()=>{
    const data=offerPriceFixture(selection);
    for(const source of data.sources.filter(s=>s.city==='Maceió'))for(const row of source.rows.filter(r=>String(r.period).startsWith('2026-05'))){if(source.metric==='sales')row.liquid_sales=-Number(row.liquid_sales);if(source.metric==='stock'&&source.group==='Padrão')row.stock=Number(row.stock)+2*Number(row.stock)/100;}
    expect(buildOfferPriceSlide(45,selection,data).series[0].values.at(-1)).toBeLessThan(0);
  });
  it('bloqueia o IVV quando o balanço diverge',()=>{
    const data=offerPriceFixture(selection);data.sources.find(s=>s.city==='Maceió'&&s.metric==='stock')!.rows.at(-1)!.stock=1;
    const model=buildOfferPriceSlide(45,selection,data);expect(model.issue).toBeNull();expect(model.series[0].values.at(-1)).toBeNull();expect(model.warnings.join(' ')).toContain('Balanço');
  });
  it('tabela histórica preserva competências sem cobertura como ausentes',()=>{
    const model=buildOfferPriceSlide(46,selection,offerPriceFixture(selection));expect(model.rows[0].values[0]).toBeNull();expect(model.warnings[0]).toContain('2021-01');
  });
  it('IVV12meses usa estoque inicial e soma fluxos',()=>{
    const model=buildOfferPriceSlide(48,selection,offerPriceFixture(selection)),row=model.rows.at(-1)!;
    expect(row.values[0]).toBe(1000);expect(row.values[3]).toBe(120);expect(row.values[5]).toBe(120);expect(row.values[7]).toBeCloseTo(120/1120*100);
  });
  it('preço exige escolha explícita de ponderação',()=>expect(buildOfferPriceSlide(50,selection,offerPriceFixture(selection)).issue).toMatch(/ponderação/));
  it('preços trimestrais têm13fechamentos, incluindo3anos anteriores',()=>{
    const current={...selection,periodicity:'quarterly' as const,position:2},model=buildOfferPriceSlide(49,current,offerPriceFixture(current),'stock-weighted');expect(model.groups).toHaveLength(13);expect(model.groups[0]).toBe('2T/23');expect(model.groups.at(-1)).toBe('2T/26');
  });
  it('pondera o preço pela oferta histórica, sem média simples das categorias',()=>{
    const model=buildOfferPriceSlide(50,selection,offerPriceFixture(selection),'stock-weighted');expect(model.series[0].values.at(-1)).toBeCloseTo((5640+5740*2+5840*3+5940*4)/10);
  });
  it('separa capital eRM e usa R$mil no ticket',()=>{
    const model=buildOfferPriceSlide(59,selection,offerPriceFixture(selection),'stock-weighted');expect(model.unit).toBe('ticket');expect(model.series).toHaveLength(2);expect(model.series[0].values[0]).toBeCloseTo(30*5640/1000);
  });
  for(const fault of ['price','private_area','typology_stock','number_bedroom'] as const)it(`não preenche ${fault} ausente com cadastro atual`,()=>{
    const data=offerPriceFixture(selection),building=data.sources.find(s=>s.metric==='details')!.rows[0];building[fault]=999;
    (building.typologies_history as MarketRow[]).at(-1)![fault]=null;
    const model=buildOfferPriceSlide(60,selection,data,'stock-weighted');
    expect(model.issue).toBeNull();expect(model.warnings.join(' ')).toContain('Base parcial:');
    expect(model.series[0].values[0]).toBeNull();
    expect(model.series[0].values[1]).toBe(5740);
  });
  it('rejeita histórico duplicado',()=>{
    const data=offerPriceFixture(selection),rows=data.sources.find(s=>s.metric==='details')!.rows;rows.push(rows[0]);expect(buildOfferPriceSlide(59,selection,data,'stock-weighted').issue).toMatch(/identificação/);
  });
  it('mantém os demais slides quando uma fonte granular falha',()=>{
    const data=offerPriceFixture(selection);data.sources.find(s=>s.metric==='details')!.complete=false;
    expect(buildOfferPriceSlide(59,selection,data,'stock-weighted').issue).not.toBeNull();expect(buildOfferPriceSlide(42,selection,data).issue).toBeNull();expect(buildOfferPriceSlide(45,selection,data).issue).toBeNull();
  });
  it('não transforma fonte ausente em gráfico com zeros',()=>expect(buildOfferPriceSlide(45,selection,null).issue).toMatch(/Gere/));
  it('explica o recorte vazio sem criar preço zero',()=>{
    const data=offerPriceFixture(selection);
    for(const source of data.sources){if(source.metric==='stock')for(const row of source.rows)row.stock=0;if(source.metric==='details')for(const building of source.rows)for(const row of building.typologies_history as MarketRow[])row.typology_stock=0;}
    expect(buildOfferPriceSlide(60,selection,data,'stock-weighted').issue).toMatch(/Nenhuma unidade/);
  });
});

for(const periodicity of ['monthly','quarterly'] as const)for(const kind of ['Garden','Cobertura'])it(`preserves all units and price weights for ${kind} / ${periodicity}`,()=>{
 const current={...selection,periodicity,position:periodicity==='monthly'?5:2},data=offerPriceFixture(current);
 const page=59;
 const baseline=buildOfferPriceSlide(page,current,data,'stock-weighted');expect(baseline.issue).toBeNull();
 for(const source of data.sources.filter(s=>s.metric==='details'))for(const building of source.rows){
  for(const row of building.typologies as MarketRow[])row.type_of_typology=kind;
  for(const row of building.typologies_history as MarketRow[])row.type_of_typology=kind;
 }
 expect(buildOfferPriceSlide(page,current,data,'stock-weighted')).toEqual(baseline);
 (data.sources.find(s=>s.metric==='details')!.rows[0].typologies_history as MarketRow[]).at(-1)!.typology_stock=999999;
 expect(buildOfferPriceSlide(page,current,data,'stock-weighted').issue).not.toBeNull();
});
