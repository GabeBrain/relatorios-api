import { describe,it,expect } from 'vitest';
import { literalFormatIssues } from '../format-checks';
import { narrativeTotalFindings } from '../narrative-total';
import type { Ir } from '../../audit/ir';
import type { CrossTableRef } from '../cross-table';
import { entityConsistencyFindings } from '../entity-consistency';

const deck=(value=17566,city='Goiânia',year=2032)=>({slides:[{n:23,titulo:'Variação anual dos domicílios | 2027 a 2032',textos:[`Até ${year} são esperados novos ${value.toLocaleString('pt-BR')} domicílios em ${city}-GO.`]}]} as Ir);
const table=()=>({slide:23,titulo:'Estimativa de variação anual de domicílios',secao:'SOCIO',sha1:'daniele-transcription',source:'vision',reliable:true,table:{title:'Domicílios',columns:['Ano','Goiânia','GO','Brasil'],rows:[
 ['2.027',9084,50871,1294573],['2.028',9234,51875,1316830],['2.029',9387,52898,1339470],['2.030',9542,53942,1362499],['2.031',9700,55006,1385923],['2.032',9860,56091,1409751],['Média por ano',9468,53447,1351508]],totals:['Total',56808,320684,8109046]}} as CrossTableRef);

describe('registros persistidos: formato e conclusão',()=>{
 it('não compara bairro agregado como se fosse empreendimento',()=>{
  const ir={slides:[104,114].map((n,i)=>({n,textos:[`Bairro: Plano Diretor Sul\nOferta Lançada: 200\nOferta Final: ${i?138:6}`]}))} as Ir;
  expect(entityConsistencyFindings(ir,[])).toEqual([]);
 });
 it.each(['1.342','1.547','1.181','1.921','1.318','1.599'])('não confunde quantidade repetida %s com ano',value=>{
  expect(literalFormatIssues([value,value],'tabela','Oferta')).toEqual([]);
 });
 it('preserva ano explícito e série temporal, sem aceitar duas quantidades como sequência',()=>{
  expect(literalFormatIssues(['2.023'],'coluna','Ano')).toHaveLength(1);
  expect(literalFormatIssues(['2.027','2.028','2.029'])).toHaveLength(1);
  expect(literalFormatIssues(['2.027','2.028'])).toEqual([]);
 });
 it('detecta Daniele: conclusão 17.566 versus total municipal 56.808',()=>{
  const findings=narrativeTotalFindings(deck(),[table()]);
  expect(findings).toHaveLength(1);expect(findings[0].detail).toContain('56.808');expect(findings[0].detail).toContain('17.566');
 });
 it('não cruza média, cidade, janela ou leitura não confiável',()=>{
  expect(narrativeTotalFindings(deck(56808),[table()])).toEqual([]);
  expect(narrativeTotalFindings(deck(17566,'Palmas'),[table()])).toEqual([]);
  expect(narrativeTotalFindings(deck(17566,'Goiânia',2031),[table()])).toEqual([]);
  expect(narrativeTotalFindings(deck(),[{...table(),reliable:false}])).toEqual([]);
  const population=table();population.titulo='Projeção da população';population.table.title='População';
  expect(narrativeTotalFindings(deck(),[population])).toEqual([]);
  const noTotal=table();delete noTotal.table.totals;
  expect(narrativeTotalFindings(deck(9468),[noTotal])).toEqual([]);
 });
 it('se abstém quando duas tabelas municipais discordam no total',()=>{
  const other=table();other.table.totals=['Total',10000,320684,8109046];
  expect(narrativeTotalFindings(deck(),[table(),other])).toEqual([]);
 });
});
