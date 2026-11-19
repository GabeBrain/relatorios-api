import { describe, expect, it } from 'vitest';
import { buildMaceioClosedReview } from './closed-review';
import { maceioExcludedHorizontal, MACEIO_PRODUCT_FIELDS } from './classification';
import { remainingFixture } from './__tests__/remaining-fixture';
import { buildRemainingSlide } from './remaining-data';
import { buildMaceioDiagnostic } from './diagnostic';
import type { MaceioSelection } from './model';

describe('decisões do analista Maceió em 18/11/2026', () => {
  for (const periodicity of ['monthly', 'quarterly'] as const) {
    const selection: MaceioSelection = { uf: 'AL', city: 'Maceió', territory: 'capital-rm', periodicity, year: 2026, position: periodicity === 'monthly' ? 5 : 2 };
    const pages = periodicity === 'monthly' ? [71, 72, 73, 75, 76, 77] : [72, 73, 74, 76, 77, 78];
    it(`exporta também padrão econômico e campos vazios, com rótulos originais e motivo / ${periodicity}`,()=>{
      const data=remainingFixture(selection),rows=data.horizontal![0].rows;
      delete rows[0].building_subtype;Object.assign(rows[0],{work:'Econômico',standard:'Econômico',name:'Projeto econômico',address:'segredo-endereco'});
      delete rows[1].building_subtype;rows[1].standard='';rows[1].name='Projeto sem tipo';
      const before=JSON.stringify(data),review=buildMaceioClosedReview(selection,data);
      expect(review.count).toBe(1);expect(review.automaticProjects).toHaveLength(1);expect(review.complete).toBe(true);
      expect(review.automaticProjects[0].name).toBe('Projeto econômico');expect(review.csv).not.toContain('Projeto econômico');expect(review.csv).toContain('Projeto sem tipo');
      expect(review.csv).toContain('Motivo da conferência');expect(review.csv).toContain('Campos de produto não informados');
      expect(review.automaticProjects[0].reason).toContain('padrão');
      for(const field of MACEIO_PRODUCT_FIELDS)expect(review.csv.split('\r\n')[0]).toContain(`"${field}"`);
      expect(review.csv).not.toContain('segredo-endereco');expect(JSON.stringify(data)).toBe(before);
      rows[0].standard='';rows[0].work='=FORMULA()';expect(buildMaceioClosedReview(selection,data).csv).toContain('"\'=FORMULA()"');
    });
    it(`exclui chácaras de todos os totais, preços e rótulos, preservando reconciliação bruta / ${periodicity}`, () => {
      const data = remainingFixture(selection);
      const before = pages.map(page => buildRemainingSlide(page, selection, data, 'stock-weighted'));
      for (const source of data.horizontal!.filter(item => item.metric === 'details')) {
        source.rows.push({ building_id: 'excluded', city: source.city, state: 'AL', building_type: 'Horizontal', building_subtype: 'Condomínio de Chácara', release_date: '2020-01-01',
          typologies_history: [{ period: `${data.end}-01`, typology_id: 99, typology_stock: 25, qty: null, price: null, private_area: null }] });
        data.horizontal!.find(item => item.city === source.city && item.metric === 'stock')!.rows.push({ city: source.city, state: 'AL', building_type: 'Horizontal', group: 'Condomínio de Chácaras', period: `${data.end}-01`, stock: 25 });
      }
      for (const [i, page] of pages.entries()) {
        const model = buildRemainingSlide(page, selection, data, 'stock-weighted');
        expect(model.issue).toBeNull();
        expect(model).toEqual(before[i]);
        expect(JSON.stringify(model)).not.toContain('Chácara');
      }
      data.horizontal!.find(item => item.metric === 'stock')!.rows.at(-1)!.stock = 26;
      expect(buildRemainingSlide(pages[0], selection, data).issue).toMatch(/diverge/);
    });
    it(`lista somente produto ambíguo Fechado sem vazar diagnóstico ou reclassificar / ${periodicity}`, () => {
      const data = remainingFixture(selection), building = data.horizontal![0].rows[0];
      delete building.building_subtype;
      Object.assign(building, { work: ' Fechado ', standard: '', name: 'Projeto para conferência', address: 'segredo-endereco', token: 'segredo-token' });
      data.horizontal![0].rows.push({ ...building });
      const review = buildMaceioClosedReview(selection, data);
      expect(review.complete).toBe(true);
      expect(review.count).toBe(1);
      expect(review.csv).toContain('Projeto para conferência');
      expect(review.csv).toContain(String(building.building_id));
      expect(review.csv).not.toMatch(/segredo/);
      expect(buildRemainingSlide(pages[1], selection, { ...data, horizontal: data.horizontal!.map(source => source.metric === 'details' ? { ...source, rows: source.rows.slice(0, 3) } : source) }).issue).toMatch(/Categoria/);
      const diagnostic = buildMaceioDiagnostic(selection, { phase: 'done', startedAt: 0, report: null, blueprint: null, intro: { collectedAt: '', cities: [], slides: data } });
      expect(JSON.stringify(diagnostic)).not.toMatch(/Projeto para conferência|segredo|building_id/);
      expect(diagnostic.criteria.monetaryIndex).toBe('INCC-DI');
      expect(diagnostic.criteria.horizontalUniverse.excluded).toEqual(['Condomínio de Chácaras']);
      building.product_type = 'Loteamento Fechado';
      data.horizontal![0].rows.pop();
      expect(buildMaceioClosedReview(selection, data).count).toBe(0);
    });
    it(`identifica ausência de fonte, lista parcial, recorte antigo e vazio / ${periodicity}`, () => {
      const data = remainingFixture(selection);
      expect(buildMaceioClosedReview(selection, data)).toMatchObject({ complete: true, count: 0 });
      data.horizontal![0].complete = false;
      expect(buildMaceioClosedReview(selection, data).missingCities).toContain('Maceió');
      expect(buildMaceioClosedReview(selection, null).complete).toBe(false);
      expect(buildMaceioClosedReview({ ...selection, year: 2025 }, data).complete).toBe(false);
    });
    it(`CSV protege fórmulas e escapa aspas; ignora futuros e outros segmentos / ${periodicity}`, () => {
      const data = remainingFixture(selection), building = data.horizontal![0].rows[0];
      delete building.building_subtype;
      Object.assign(building, { work: 'Fechado', standard: '', name: '=HYPERLINK("externo")' });
      expect(buildMaceioClosedReview(selection, data).csv).toContain('"\'=HYPERLINK(""externo"")"');
      building.release_date = '2027-01-01';
      expect(buildMaceioClosedReview(selection, data).count).toBe(0);
      building.release_date = '2020-01-01'; building.building_type = 'Vertical';
      expect(buildMaceioClosedReview(selection, data).count).toBe(0);
    });
  }
  it('reconhece singular, plural, acentos e exclusão em todos os campos de produto', () => {
    for (const field of MACEIO_PRODUCT_FIELDS) for (const value of ['Condomínio de Chácara', 'CONDOMINIO DE CHACARAS']) {
      expect(maceioExcludedHorizontal({ building_subtype: 'Condomínio de Casas', [field]: value })).toBe(true);
    }
  });
});
