import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import OperationalPage from './OperationalPage';
import {readHorizontalHistory} from '../source';
vi.mock('@/store/auth-store',()=>({useAuthStore:(select:(s:unknown)=>unknown)=>select({getToken:()=> 'fixture'})}));
vi.mock('@/features/shared/geo-api-scope-engine',()=>({
 useGeoApiScope:()=>({hasToken:true,strictReady:true,isLoading:false,error:null,citiesByUf:{PR:['Curitiba']},ufsByRegion:{Sul:['PR']},availableUfs:['PR'],availableRegions:['Sul']}),
 GeoApiScopeSelector:({onChange}:{onChange:(g:{uf:string;city:string})=>void})=><button onClick={()=>onChange({uf:'PR',city:'Curitiba'})}>Selecionar Curitiba</button>,
}));
vi.mock('../source',async importOriginal=>({...await importOriginal<object>(),readHorizontalHistory:vi.fn()}));
beforeEach(()=>vi.mocked(readHorizontalHistory).mockImplementation(async(_uf,_city,_signal,_progress,type)=>({pages:1,fetchedAt:'2026-10-27T12:00:00Z',buildings:[{building_id:type==='Horizontal'?1:2,name:type==='Horizontal'?'Horizontal exemplo':'Vertical exemplo',sourceType:type,release_date:'2026-01-01',typologies_history:Array.from({length:9},(_,i)=>({period:`2026-${String(i+1).padStart(2,'0')}`,typology_id:type==='Horizontal'?1:2,pattern:type==='Horizontal'?'Loteamento Fechado':'Standard',qty:100,typology_stock:100-(i+1)*9,sold_in_period:9}))}]})));
describe('primeira jornada do lote',()=>{
 it('carrega os tipos juntos; filtro não muda composição nem chama API',async()=>{
  render(<OperationalPage/>);
  fireEvent.click(screen.getByText('Selecionar Curitiba'));fireEvent.click(screen.getByRole('button',{name:'Adicionar cidade'}));fireEvent.click(screen.getByRole('button',{name:'Preparar análise'}));
  await screen.findByText('2 empreendimentos no recorte');
  expect(readHorizontalHistory).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getAllByRole('button',{name:'Incluir na proposta'})[0]);
  fireEvent.change(screen.getByPlaceholderText('Nome, ID ou cidade'),{target:{value:'nenhum'}});
  expect(screen.getByRole('button',{name:'Revisar proposta (1)'})).toBeTruthy();
  expect(screen.getByText(/Nenhum empreendimento corresponde aos filtros/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Revisar proposta (1)'}));
  const dialog=screen.getByRole('dialog');expect(within(dialog).getByText(/Horizontal exemplo/)).toBeTruthy();
  expect(within(dialog).getByRole('button',{name:'Exportar competências operacionais'})).toBeDisabled();
  expect(readHorizontalHistory).toHaveBeenCalledTimes(2);
 });
 it('falha da segunda consulta não apresenta o primeiro tipo como lote completo',async()=>{
  const original=vi.mocked(readHorizontalHistory).getMockImplementation()!;
  vi.mocked(readHorizontalHistory).mockImplementationOnce(original).mockRejectedValueOnce(new Error('Fonte indisponível'));
  render(<OperationalPage/>);fireEvent.click(screen.getByText('Selecionar Curitiba'));fireEvent.click(screen.getByRole('button',{name:'Adicionar cidade'}));fireEvent.click(screen.getByRole('button',{name:'Preparar análise'}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Fonte indisponível'));
  expect(screen.queryByLabelText('Resumo do lote')).toBeNull();
 });
});
