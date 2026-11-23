import {it,expect} from 'vitest';
import {buildMaceioDataIssuesReview} from './data-issues-review';
import {remainingFixture} from './__tests__/remaining-fixture';
import type {MaceioSelection} from './model';
import type {MarketRow} from './market';
const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'quarterly',year:2026,position:3};

it('CSV identifica a fotografia ausente com mês e contexto sem preencher dados ou vazar campos extras',()=>{
  const data=remainingFixture(selection),building=data.sources.find(source=>source.metric==='details')!.rows[0];
  building.name='=Nome; "conferir"';building.token='secret-token';building.address='private-address';
  const history=building.typologies_history as MarketRow[];
  const previous=history.find(row=>String(row.period).startsWith('2026-08'))!;previous.typology_stock=123;previous.price=987654;
  building.typologies_history=history.filter(row=>!String(row.period).startsWith('2026-09'));
  const original=JSON.stringify(data),review=buildMaceioDataIssuesReview(selection,data);
  const missing=review.csv.split('\r\n').find(line=>line.includes('Fotografia mensal ausente')&&line.includes('2026-09'))!;
  expect(review.complete).toBe(true);expect(missing).toContain('synthetic/0/0');expect(missing).toContain('2026-08-01');
  expect(missing).toContain('"";"";"";"";"";""');expect(missing).toContain('123');expect(missing).toContain('987654');
  expect(review.csv).toContain("\"'=Nome; \"\"conferir\"\"\"");
  expect(review.csv).not.toMatch(/secret-token|private-address/);expect(JSON.stringify(data)).toBe(original);
});
it('CSV aponta preços e áreas inválidos contribuintes, distingue pré-lançamento e fonte parcial',()=>{
  const data=remainingFixture(selection),source=data.sources.find(source=>source.metric==='details')!,building=source.rows[0];
  const row=(building.typologies_history as MarketRow[]).at(-1)!;row.price=0;row.private_area=0;source.complete=false;
  source.rows.push({...building,building_id:'future',release_date:'2027-01-01'});
  const review=buildMaceioDataIssuesReview(selection,data);
  expect(review.complete).toBe(false);expect(review.csv).toContain('Preço ausente, inválido ou zero; Área ausente, inválida ou zero');expect(review.csv).toContain('Fluxo anterior ao lançamento');
  data.end='2026-08';expect(buildMaceioDataIssuesReview(selection,data)).toMatchObject({count:0,complete:false});
});
