import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import FortalezaInstitutionalPage from './FortalezaInstitutionalPage';
const environment=vi.hoisted(()=>({cities:['Fortaleza','Aquiraz','Caucaia','Eusébio','Maracanaú'],error:null as object|null,loading:false,token:true,consult:vi.fn(),capture:vi.fn(),reload:vi.fn()}));
vi.mock('@/store/auth-store',()=>({useAuthStore:(selector:(state:object)=>unknown)=>selector({getToken:()=>environment.token?'synthetic':null})}));
vi.mock('@/features/shared/geo-api-scope-engine',()=>({useGeoApiScope:({value}:{value:{uf:string;city:string}})=>({hasToken:environment.token,citiesByUf:{CE:environment.cities},strictReady:environment.cities.includes(value.city)&&value.uf==='CE',isLoading:environment.loading,error:environment.error,availableUfs:['CE'],reload:environment.reload})}));
vi.mock('./useFortalezaMarket',()=>({useFortalezaMarket:(...args:unknown[])=>{environment.capture(...args);return {state:null,consult:environment.consult,cancel:vi.fn()};}}));
vi.mock('./FortalezaIntroSlides',()=>({default:()=>null}));
beforeEach(()=>{environment.cities=['Fortaleza','Aquiraz','Caucaia','Eusébio','Maracanaú'];environment.error=null;environment.loading=false;environment.token=true;environment.consult.mockReset();environment.capture.mockReset();});
afterEach(cleanup);
describe('Fortaleza — escopo fixo automático',()=>{
  it('oferece somente período, reconhece as cinco cidades e habilita geração sem seleção geográfica',async()=>{
    render(<FortalezaInstitutionalPage/>);await waitFor(()=>expect((screen.getByRole('button',{name:'Gerar prévia mensal'})as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getAllByRole('combobox')).toHaveLength(3);expect(document.querySelector('#fortaleza-territory')).toBeNull();
    expect(environment.capture.mock.calls.at(-1)![0]).toMatchObject({uf:'CE',city:'Fortaleza',territory:'capital-rm'});
    expect(environment.capture.mock.calls.at(-1)![3]).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Gerar prévia mensal'}));expect(environment.consult).toHaveBeenCalledTimes(1);
  });
  it('catálogo incompleto não autoriza gerar um subconjunto silencioso',async()=>{
    environment.cities=['Fortaleza'];render(<FortalezaInstitutionalPage/>);
    await waitFor(()=>expect(screen.getByText(/Não disponíveis: Aquiraz/)).toBeTruthy());
    const button=screen.getByRole('button',{name:'Gerar prévia mensal'})as HTMLButtonElement;expect(button.disabled).toBe(true);fireEvent.click(button);expect(environment.consult).not.toHaveBeenCalled();expect(environment.capture.mock.calls.at(-1)![3]).toBe(false);
  });
  it('usa a grafia real do catálogo e mantém CE antes da identificação da capital',async()=>{
    environment.cities=['FORTALEZA','AQUIRAZ','CAUCAIA','EUSEBIO','MARACANAU'];render(<FortalezaInstitutionalPage/>);
    await waitFor(()=>expect((screen.getByRole('button',{name:'Gerar prévia mensal'})as HTMLButtonElement).disabled).toBe(false));
    expect(environment.capture.mock.calls.at(-1)![0]).toMatchObject({uf:'CE',city:'FORTALEZA',territory:'capital-rm'});
  });
  it('erro do catálogo bloqueia geração, exibe nova tentativa e não usa IBGE',()=>{
    environment.error={};render(<FortalezaInstitutionalPage/>);expect(screen.getByText('Cidades indisponíveis')).toBeTruthy();expect((screen.getByRole('button',{name:'Gerar prévia mensal'})as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));expect(environment.reload).toHaveBeenCalled();expect(environment.consult).not.toHaveBeenCalled();
  });
});
