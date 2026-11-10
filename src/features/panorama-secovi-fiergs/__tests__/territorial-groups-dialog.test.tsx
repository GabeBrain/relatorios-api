import {fireEvent,render,screen,cleanup} from '@testing-library/react';
import{afterEach,describe,it,expect,vi}from'vitest';
import{TerritorialGroupsDialog}from'../components/TerritorialGroupsDialog';
const cities=['Canela','Gramado','Canoas','Esteio'];
afterEach(cleanup);
describe('grupos no relatório único',()=>{
 it('propõe uma cidade e um conjunto, exige nome só no conjunto e aceita espaços',()=>{
  const confirm=vi.fn();render(<TerritorialGroupsDialog open onOpenChange={()=>{}} cities={cities} onConfirm={confirm}/>);
  expect(screen.queryByLabelText('Nome do grupo 1')).toBeNull();
  expect(screen.getByRole('button',{name:'Gerar relatório com grupos'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Nome do grupo 2'),{target:{value:'Região '}});
  expect(screen.getByLabelText('Nome do grupo 2')).toHaveValue('Região ');
  fireEvent.change(screen.getByLabelText('Nome do grupo 2'),{target:{value:'Região do entorno'}});
  fireEvent.click(screen.getByRole('button',{name:'Gerar relatório com grupos'}));
  expect(confirm.mock.calls[0][0]).toMatchObject({mode:'comparison',layout:'integrated',units:[{label:'Canela',cities:['Canela']},{label:'Região do entorno',cities:['Gramado','Canoas','Esteio']}]});
 });
 it('cada cidade fica em um grupo; grupos vazios impedem confirmar e cancelar não gera',()=>{
  const confirm=vi.fn(),close=vi.fn();render(<TerritorialGroupsDialog open onOpenChange={close} cities={cities} onConfirm={confirm}/>);
  fireEvent.click(screen.getByRole('button',{name:'Mover Canela'}));
  fireEvent.click(screen.getByRole('button',{name:'Mover para grupo 2'}));
  expect(screen.getByRole('button',{name:'Gerar relatório com grupos'})).toBeDisabled();
  expect(screen.getByText('Cada grupo precisa de ao menos uma cidade.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(close).toHaveBeenCalledWith(false);expect(confirm).not.toHaveBeenCalled();
 });
 it('três grupos mantêm atribuição única e os nomes de cidades individuais automáticos',()=>{
  const confirm=vi.fn();render(<TerritorialGroupsDialog open onOpenChange={()=>{}} cities={cities} onConfirm={confirm}/>);
  fireEvent.click(screen.getByRole('button',{name:'3 grupos'}));
  fireEvent.change(screen.getByLabelText('Nome do grupo 2'),{target:{value:'Grupo do entorno'}});
  fireEvent.click(screen.getByRole('button',{name:'Gerar relatório com grupos'}));
  const result=confirm.mock.calls[0][0];expect(result.units).toHaveLength(3);expect(new Set(result.units.flatMap(u=>u.cities)).size).toBe(4);
  for(const u of result.units)if(u.cities.length===1)expect(u.label).toBe(u.cities[0]);
 });
 it('arrasta entre grupos sem duplicar cidades e exige nome se o destino vira conjunto',()=>{
  const confirm=vi.fn();render(<TerritorialGroupsDialog open onOpenChange={()=>{}} cities={cities} onConfirm={confirm}/>);
  const data=new Map();const dataTransfer={setData:(key,value)=>data.set(key,value),getData:key=>data.get(key),effectAllowed:'',dropEffect:''};
  fireEvent.dragStart(screen.getByRole('button',{name:'Mover Gramado'}),{dataTransfer});
  fireEvent.dragOver(screen.getByRole('region',{name:'Grupo 1'}),{dataTransfer});
  fireEvent.drop(screen.getByRole('region',{name:'Grupo 1'}),{dataTransfer});
  expect(screen.getByLabelText('Nome do grupo 1')).toHaveValue('');
  expect(screen.getAllByRole('button',{name:'Mover Gramado'})).toHaveLength(1);
  expect(screen.getByRole('button',{name:'Gerar relatório com grupos'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Nome do grupo 1'),{target:{value:'Serra'}});
  fireEvent.change(screen.getByLabelText('Nome do grupo 2'),{target:{value:'Metropolitana'}});
  fireEvent.click(screen.getByRole('button',{name:'Gerar relatório com grupos'}));
  expect(confirm.mock.calls[0][0].units[0]).toMatchObject({label:'Serra',cities:['Canela','Gramado']});
 });
 it('não aceita cidade desconhecida no drop',()=>{
  render(<TerritorialGroupsDialog open onOpenChange={()=>{}} cities={cities} onConfirm={()=>{}}/>);
  fireEvent.drop(screen.getByRole('region',{name:'Grupo 1'}),{dataTransfer:{getData:()=> 'Outra cidade'}});
  expect(screen.queryByText('Outra cidade')).toBeNull();
 });

 it.each([2,4,10])('permite somente consolidado com %i cidades, sem exigir nomes ou partições',count=>{
  const selected=Array.from({length:count},(_,i)=>`Cidade ${i+1}`),confirm=vi.fn();
  render(<TerritorialGroupsDialog open onOpenChange={()=>{}} cities={selected} onConfirm={confirm}/>);
  fireEvent.click(screen.getByRole('button',{name:'Somente consolidado'}));
  expect(screen.queryByRole('region',{name:'Grupo 1'})).toBeNull();
  expect(screen.queryByLabelText('Nome do grupo 2')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Gerar consolidado'}));
  expect(confirm).toHaveBeenCalledWith({mode:'consolidated',layout:'integrated'});
 });
 it('preserva os grupos ao alternar para consolidado e voltar, sem gerar ao cancelar',()=>{
  const confirm=vi.fn(),close=vi.fn();render(<TerritorialGroupsDialog open onOpenChange={close} cities={cities} onConfirm={confirm}/>);
  fireEvent.change(screen.getByLabelText('Nome do grupo 2'),{target:{value:'Entorno'}});
  fireEvent.click(screen.getByRole('button',{name:'Somente consolidado'}));
  fireEvent.click(screen.getByRole('button',{name:'2 grupos'}));
  expect(screen.getByLabelText('Nome do grupo 2')).toHaveValue('Entorno');
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(confirm).not.toHaveBeenCalled();
 });
 it('reabre uma escolha consolidada e impede três grupos para somente duas cidades',()=>{
  render(<TerritorialGroupsDialog open onOpenChange={()=>{}} cities={cities.slice(0,2)} value={{mode:'consolidated',layout:'integrated'}} onConfirm={()=>{}}/>);
  expect(screen.getByRole('button',{name:'Somente consolidado'})).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('button',{name:'3 grupos'})).toBeDisabled();
 });

});
