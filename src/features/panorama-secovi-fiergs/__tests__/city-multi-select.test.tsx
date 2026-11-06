import{useState}from'react';
import{render,screen,fireEvent,cleanup,waitFor}from'@testing-library/react';
import{beforeEach,afterEach,describe,it,expect,vi}from'vitest';
import{PanoramaCityMultiSelect}from'../components/PanoramaCityMultiSelect';
const options=['Bom Retiro do Sul','Estrela','Taquari','Teutônia','Lajeado'];
beforeEach(()=>{Element.prototype.scrollIntoView=vi.fn();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function Harness(){const[cities,setCities]=useState(['Lajeado']);return <PanoramaCityMultiSelect cities={cities} options={options} onChange={setCities}/>;}
describe('busca municipal em lote',()=>{
 it('seleciona reconhecidas em uma ação e mantém anteriores/aviso de ausente',async()=>{
  render(<Harness/>);fireEvent.click(screen.getByRole('combobox'));
  fireEvent.change(screen.getByLabelText('Buscar municípios'),{target:{value:'Bom Retiro do Sul, Estrela, Taquari e Teutônia, Ausente'}});
  expect(screen.getByText('Não encontradas nesta UF: Ausente.')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Selecionar 4 cidades da lista'));
  await waitFor(()=>expect(screen.getByRole('combobox')).toHaveTextContent('5 municípios selecionados'));
  expect(screen.getByText(/Não encontradas nas cidades disponíveis desta UF: Ausente/)).toBeInTheDocument();
  for(const city of options)expect(screen.getByRole('button',{name:`Remover ${city}`})).toBeInTheDocument();
 });
 it('não permite aplicar uma lista totalmente desconhecida',()=>{
  render(<Harness/>);fireEvent.click(screen.getByRole('combobox'));
  fireEvent.change(screen.getByLabelText('Buscar municípios'),{target:{value:'Ausente, Outro'}});
  expect(screen.getByText('Selecionar 0 cidades da lista').closest('[aria-disabled]')).toHaveAttribute('aria-disabled','true');
 });
 it('aceita colagem multilinha sem perder os separadores',()=>{
  render(<Harness/>);fireEvent.click(screen.getByRole('combobox'));
  fireEvent.paste(screen.getByLabelText('Buscar municípios'),{clipboardData:{getData:()=> 'Estrela\nTeutônia'}});
  expect(screen.getByText('Selecionar 2 cidades da lista')).toBeInTheDocument();
 });
 it('impede remoção enquanto o filtro estiver bloqueado',()=>{
  const change=vi.fn();render(<PanoramaCityMultiSelect cities={['Estrela']} options={options} onChange={change} disabled/>);
  fireEvent.click(screen.getByRole('button',{name:'Remover Estrela'}));expect(change).not.toHaveBeenCalled();
 });
 it('limpa busca e aviso ao mudar o catálogo daUF/conta',()=>{
  const props={cities:[],options,onChange:()=>{}};
  const {rerender}=render(<PanoramaCityMultiSelect {...props}/>);
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.change(screen.getByLabelText('Buscar municípios'),{target:{value:'Estrela, Ausente'}});
  expect(screen.getByText('Não encontradas nesta UF: Ausente.')).toBeInTheDocument();
  rerender(<PanoramaCityMultiSelect {...props} options={['São Paulo']}/>);
  expect(screen.getByLabelText('Buscar municípios')).toHaveValue('');
  expect(screen.queryByText('Não encontradas nesta UF: Ausente.')).toBeNull();
 });

});
