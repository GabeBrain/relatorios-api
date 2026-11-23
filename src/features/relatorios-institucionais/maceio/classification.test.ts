import { describe, it, expect } from 'vitest';
import { maceioPatternFamily, maceioHorizontalProduct } from './classification';
import { buildMaceioPattern, buildMaceioLaunchSeries } from './intro-data';
import { buildMaceioMarketSlide } from './market-slides-data';
import { buildOfferPriceSlide } from './offer-price-data';
import { buildRemainingSlide } from './remaining-data';
import { introFixture } from './__tests__/intro-fixture';
import { offerPriceFixture } from './__tests__/offer-price-fixture';
import { remainingFixture } from './__tests__/remaining-fixture';
import type { MaceioSelection } from './model';
import type { MarketRow } from './market';

describe('Maceió: classificações confirmadas e fontes independentes', () => {
  it('aplica somente as correspondências confirmadas por Lucas', () => {
    expect(['Compacto','Econômico','Standard','Médio','Médio-Alto','Alto','Luxo'].map(maceioPatternFamily))
      .toEqual(['Compactos','MCMV','Médio Padrão','Médio Padrão','Médio Padrão','Luxo','Luxo']);
    expect(maceioPatternFamily('Desconhecido')).toBeNull();
    expect(maceioHorizontalProduct({work:'Condomínio de Casas/Sobrados',standard:'Econômico'})).toBe('Condomínio de Casas');
    expect(maceioHorizontalProduct({work:'Loteamento Aberto'})).toBe('Loteamento Aberto');
    expect(maceioHorizontalProduct({standard:'Loteamento Fechado'})).toBe('Loteamento Fechado');
    expect(maceioHorizontalProduct({work:'Fechado',standard:'Econômico'})).toBe('');
    expect(maceioHorizontalProduct({work:'Condomínio de Chácaras'})).toBe('Condomínio de Chácaras');
    expect(maceioHorizontalProduct({standard:'Econômico'})).toBe('');
  });

  for (const periodicity of ['monthly','quarterly'] as const) {
    const selection: MaceioSelection = {uf:'AL',city:'Maceió',territory:'capital-rm',periodicity,year:2026,position:periodicity==='monthly'?5:2};
    it(`usa zero só para ausência de registros em varredura concluída · ${periodicity}`,()=>{
      const data=offerPriceFixture(selection),intro=introFixture(selection);
      for(const source of data.sources.filter(s=>s.city==='Pilar'))source.rows=[];
      const city=intro.cities.find(c=>c.city==='Pilar')!;city.units=[];city.buildings=[];
      expect(buildMaceioLaunchSeries(19,selection,intro).issue).toBeNull();
      expect(buildMaceioMarketSlide(30,selection,data).issue).toBeNull();
      expect(buildOfferPriceSlide(periodicity==='monthly'?59:58,selection,data,'stock-weighted').issue).toBeNull();
      expect(buildRemainingSlide(periodicity==='monthly'?62:61,selection,data).issue).toBeNull();
      data.sources.find(s=>s.city==='Pilar'&&s.metric==='sales')!.complete=false;
      expect(buildMaceioMarketSlide(30,selection,data).issue).not.toBeNull();
      const stock=data.sources.find(s=>s.city==='Maceió'&&s.metric==='stock')!;
      stock.rows.at(-1)!.stock=null;
      expect(buildMaceioMarketSlide(40,selection,data).issue).not.toBeNull();
    });
    it(`conserva totais e MCMV ao agrupar padrões reais · ${periodicity}`, () => {
      const data=offerPriceFixture(selection),intro=introFixture(selection);
      for (const city of intro.cities) for (const row of city.buildings) row.standard=({Luxo:'Alto','Médio Padrão':'Standard',MCMV:'Econômico',Compactos:'Compacto'} as Record<string,string>)[String(row.standard)];
      const patterns=buildMaceioPattern(selection,intro);expect(patterns.issue).toBeNull();
      expect(patterns.values.flat().reduce((a,b)=>a+b,0)).toBe(intro.cities.reduce((s,c)=>s+c.buildings.length,0));
      const before=buildMaceioMarketSlide(33,selection,data);
      for (const source of data.sources.filter(s=>s.group==='Padrão')) for (const row of source.rows) row.group=({Luxo:'Alto','Médio Padrão':'Médio-Alto',MCMV:'Econômico',Compactos:'Compacto'} as Record<string,string>)[String(row.group)];
      expect(buildMaceioMarketSlide(33,selection,data)).toEqual(before);
      expect(buildMaceioMarketSlide(21,selection,data).issue).toBeNull();
      const page=periodicity==='monthly'?43:42;
      expect(buildOfferPriceSlide(page,selection,data).issue).toBeNull();
    });
    it(`aceita dormitórios numéricos sem alterar oferta · ${periodicity}`, () => {
      const data=offerPriceFixture(selection),page=periodicity==='monthly'?42:41;
      const baseline=buildOfferPriceSlide(page,selection,data);
      for (const source of data.sources.filter(s=>s.group==='Tipologia')) for (const row of source.rows) row.group=Number(String(row.group).split(' ')[0]);
      expect(buildOfferPriceSlide(page,selection,data)).toEqual(baseline);
    });
    it(`resolve produto horizontal explicitamente em work · ${periodicity}`, () => {
      const data=remainingFixture(selection),page=periodicity==='monthly'?71:72;
      const before=buildRemainingSlide(page,selection,data);
      for (const source of data.horizontal!.filter(s=>s.metric==='details')) for (const row of source.rows) {
        row.work=row.building_subtype==='Condomínio de Casas'?'Condomínio de Casas/Sobrados':row.building_subtype;
        delete row.building_subtype;row.standard='Econômico';
      }
      expect(buildRemainingSlide(page,selection,data)).toEqual(before);
    });
    it(`mantém meses válidos de IVV e sinaliza balanço divergente · ${periodicity}`, () => {
      const data=offerPriceFixture(selection),page=periodicity==='monthly'?46:45;
      data.sources.find(s=>s.city==='Maceió'&&s.metric==='stock')!.rows.find(r=>String(r.period).startsWith('2021-03'))!.stock=1;
      const model=buildOfferPriceSlide(page,selection,data);
      expect(model.issue).toBeNull();expect(model.rows[2].values[8]).toBeNull();
      expect(model.rows[0].values[13]).not.toBeNull();
      expect(model.warnings.some(w=>w.includes('2021-03')&&w.includes('Balanço'))).toBe(true);
      // The monthly series also retains valid months and marks only the bad rate.
      (data.sources.find(s=>s.city==='Maceió'&&s.metric==='stock')!.rows.at(-1) as MarketRow).stock=1;
      const series=buildOfferPriceSlide(periodicity==='monthly'?45:44,selection,data);expect(series.issue).toBeNull();expect(series.series[0].values.at(-1)).toBeNull();expect(series.warnings.join(' ')).toContain('Balanço');
    });
  }
});
