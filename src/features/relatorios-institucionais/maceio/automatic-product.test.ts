import {describe,it,expect} from 'vitest';
import {maceioHorizontalProduct} from './classification';
import {buildMaceioClosedReview} from './closed-review';
import {buildMaceioDiagnostic} from './diagnostic';
import {remainingFixture} from './__tests__/remaining-fixture';
import {buildRemainingSlide} from './remaining-data';
import type {MaceioSelection} from './model';
import type {MarketRow} from './market';

describe('horizontal com quartos: regra automática autorizada',()=>{
  const base={building_id:'unlisted',city:'Maceió',state:'AL',building_type:'Horizontal',release_date:'2020-01-01',work:'Econômico',standard:'Econômico'};
  const row=(rooms:unknown,month='2026-05')=>({period:`${month}-01`,number_bedroom:rooms,private_area:600});
  it('aceita quartos positivos, sem exigir garagem e sem converter zero/nulo/catálogo atual',()=>{
    expect(maceioHorizontalProduct({...base,typologies_history:[row('2')]},'2026-05')).toBe('Condomínio de Casas');
    expect(maceioHorizontalProduct({...base,typologies_history:[row('2.0')]},'2026-05')).toBe('Condomínio de Casas');
    for(const rooms of [0,'0',null,'',true,-1,1.5,'2 quartos'])expect(maceioHorizontalProduct({...base,typologies_history:[row(rooms)]},'2026-05')).toBe('');
    expect(maceioHorizontalProduct({...base,typologies:[{number_bedroom:2}],typologies_history:[row(0)]},'2026-05')).toBe('');
    expect(maceioHorizontalProduct({...base,typologies_history:[row(2,'2026-06')]},'2026-05')).toBe('');
    expect(maceioHorizontalProduct({...base,release_date:'2026-06-01',typologies_history:[row(2)]},'2026-05')).toBe('');
    expect(maceioHorizontalProduct({...base,building_type:'Vertical',typologies_history:[row(2)]},'2026-05')).toBe('');
    for(const product of ['Loteamento Fechado','Loteamento Aberto','Condomínio de Chácaras'])expect(maceioHorizontalProduct({...base,product_type:product,typologies_history:[row(2)]},'2026-05')).toBe(product);
  });
  for(const periodicity of ['monthly','quarterly'] as const)it(`classifica, conserva totais e registra aplicação sem IDs no JSON · ${periodicity}`,()=>{
    const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity,year:2026,position:periodicity==='monthly'?5:2};
    const data=remainingFixture(selection),page=periodicity==='monthly'?71:72;
    const source=data.horizontal!.find(s=>s.city==='Maceió'&&s.metric==='details')!,building=source.rows[0];
    delete building.building_subtype;building.work='Econômico';building.standard='Econômico';building.name='private-test-name';
    (building.typologies_history as MarketRow[])[0].number_bedroom=2;
    const copy=JSON.stringify(data),model=buildRemainingSlide(page,selection,data,'stock-weighted');
    expect(model.issue).toBeNull();expect(model.tables[0].rows.at(-1)!.values[4]).toBe(600);
    const review=buildMaceioClosedReview(selection,data);
    expect(review.count).toBe(0);expect(review.automaticProjects).toHaveLength(1);expect(review.automaticProjects[0].evidence.bedrooms).toEqual(['2']);
    const diagnostic=buildMaceioDiagnostic(selection,{phase:'done',startedAt:0,report:null,blueprint:null,intro:{cities:[],collectedAt:'',slides:data}});
    expect(diagnostic.horizontalClassificationAudit.find(s=>s.city==='Maceió')?.automaticProjects).toBe(1);
    expect(JSON.stringify(diagnostic)).not.toContain('private-test-name');expect(JSON.stringify(data)).toBe(copy);
    (building.typologies_history as MarketRow[])[0].number_bedroom=0;
    expect(buildMaceioClosedReview(selection,data).count).toBe(1);expect(buildRemainingSlide(page,selection,data).issue).not.toBeNull();
  });
});
