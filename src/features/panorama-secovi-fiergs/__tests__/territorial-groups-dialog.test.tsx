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
  fireEvent.click(screen.getByRole('radio',{name:'Canela no grupo 2'}));
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
});
