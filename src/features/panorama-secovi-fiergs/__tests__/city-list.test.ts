import {describe,it,expect} from 'vitest';
import {matchCityList} from '../domain/city-list';
const options=['Bom Retiro do Sul','Estrela','Taquari','Teutônia','São João e Maria','São Paulo'];
describe('lista de cidades do catálogo autorizado',()=>{
 it.each(['Bom Retiro do Sul, Estrela, Taquari e Teutônia','Bom Retiro do Sul, Estrela, Taquari, Teutônia'])('reconhece a lista da Teresa: %s',text=>{
  expect(matchCityList(text,options)).toEqual({isList:true,matched:options.slice(0,4),missing:[]});
 });
 it('ignora acento/caixa/espaço e duplicatas; conserva grafia canônica',()=>{
  expect(matchCityList('teutonia; ESTRELA\nTeutônia',options)).toMatchObject({matched:['Teutônia','Estrela'],missing:[]});
 });
 it('aponta o que falta sem selecionar nome parecido',()=>{
  expect(matchCityList('Estrela, Taquara, Não Existe',options)).toMatchObject({matched:['Estrela'],missing:['Taquara','Não Existe']});
 });
 it('preserva nomes com e interno e reconhece outro município depois',()=>{
  expect(matchCityList('São João e Maria',options)).toEqual({isList:false,matched:['São João e Maria'],missing:[]});
  expect(matchCityList('São João e Maria e Estrela',options)).toEqual({isList:true,matched:['São João e Maria','Estrela'],missing:[]});
 });
 it('não encontra cidades de outraUF/conta nem usa substring como match',()=>{
  expect(matchCityList('Estrela, São Paulo',['Estrela'])).toMatchObject({matched:['Estrela'],missing:['São Paulo']});
  expect(matchCityList('Estre, Taqua',options)).toMatchObject({matched:[],missing:['Estre','Taqua']});
 });
});
