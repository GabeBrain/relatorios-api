import {describe,it,expect} from 'vitest';
import {rentalQuery,rentalOffer} from '../rental-contract';
describe('Contract supplied for rent/resale endpoint',()=>{
 it('requests only apartment rental listings and exclusive collection-date boundaries',()=>{
  expect(rentalQuery('Curitiba','PR','collected-in-period','2026-07','2026-09',2)).toEqual({cidade:'Curitiba',uf:'PR',tipo:'Apartamento',tipo_negocio:'ALUGUEL',page:2,per_page:100,coletado_em_gt:'2026-06-30',coletado_em_lt:'2026-10-01'});
  expect(rentalQuery('Curitiba','PR','collected-in-period','2024-03','2024-03',1).coletado_em_gt).toBe('2024-02-29');
  expect(rentalQuery('Curitiba','PR','current-offers','2026-07','2026-09',1).coletado_em_gt).toBeUndefined();
 });
 it('rejects sale samples and other cities instead of calling them rentals',()=>{
  const row={id:1,cidade:'Curitiba',estado:'PR',tipo:'Apartamento',tipo_negocio:'ALUGUEL',area_util:40,preco:2000,preco_metro:50,quartos:1,bairro:'Centro',logradouro:'Do not export',coletado_em:'2026-09-01'};
  expect(rentalOffer(row,'Curitiba','PR')).toMatchObject({price:2000,meter:50,neighborhood:'Centro'});
  expect(JSON.stringify(rentalOffer(row,'Curitiba','PR'))).not.toContain('Do not export');
  expect(()=>rentalOffer({...row,tipo_negocio:'VENDA'},'Curitiba','PR')).toThrow();
  expect(()=>rentalOffer(row,'Natal','RN')).toThrow();
 });
});
