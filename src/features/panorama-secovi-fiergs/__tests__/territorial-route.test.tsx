import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import PanoramaSecoviFiergsPage from '../pages/PanoramaSecoviFiergsPage';
import { usePanoramaExportStore } from '../export-store';
import { buildFiergsAuditCsv } from '../lib/fiergs-audit';
import { panoramaManifestFor } from '../report/manifest';

const mocks=vi.hoisted(()=>({fetch:vi.fn(),mode:'ok' as 'ok'|'error'|'loading',resolve:undefined as undefined|((value:unknown)=>void)}));
vi.mock('../api',()=>({createPanoramaCollectionSession:()=>({}),PanoramaCollectionError:class extends Error {},fetchPanoramaReportModel:async(scope)=>{
  mocks.fetch(scope);
  if(mocks.mode==='error')throw new Error('Falha de coleta simulada');
  const {freeScopeReport}=await import('./free-scopes.fixture');
  const result=freeScopeReport(scope,{horizontal:true});
  if(mocks.mode==='loading')await new Promise((resolve)=>{mocks.resolve=resolve;});
  return result;
}}));
vi.mock('@/features/shared/geo-api-scope-engine',()=>({useGeoApiScope:({value,onChange})=>({hasToken:true,availableUfs:['RS','SP'],availableCities:value.uf==='RS'?['Canela','Gramado','Canoas','Esteio']:['Jundiaí','São Paulo'],strictReady:!!value.city,isLoading:false,error:null,setUf:(uf)=>onChange({uf,city:''}),reload:()=>{}})}));
vi.mock('../components/PanoramaCityMultiSelect',()=>({PanoramaCityMultiSelect:({onChange,options,disabled})=><div>{[1,2,3,4].map(n=><button key={n} disabled={disabled} onClick={()=>onChange(options.slice(0,n))}>Selecionar {n}</button>)}</div>}));
// Only normalize input primitives in jsdom: page, projection, paginator, notices and manifest are real.
vi.mock('@/components/ui/select',()=>({Select:({children,value,onValueChange,disabled})=><select value={value} disabled={disabled} onChange={e=>onValueChange(e.target.value)}>{children}</select>,SelectTrigger:()=>null,SelectValue:()=>null,SelectContent:({children})=><>{children}</>,SelectItem:({value,children})=><option value={value}>{children}</option>}));
const originalStart=usePanoramaExportStore.getState().start;
afterEach(()=>{cleanup();mocks.fetch.mockClear();mocks.mode='ok';mocks.resolve=undefined;usePanoramaExportStore.setState({start:originalStart,status:'idle'});});
function setup(entity='fiergs-rs'){
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  render(<QueryClientProvider client={client}><PanoramaSecoviFiergsPage/></QueryClientProvider>);
  if(entity==='fiergs-rs')fireEvent.change(screen.getAllByRole('combobox')[0],{target:{value:entity}});
}
async function generate(groups=2){fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));if(screen.queryByRole('dialog')){if(groups===3)fireEvent.click(screen.getByRole('button',{name:'3 grupos'}));fireEvent.click(screen.getByRole('button',{name:'Gerar relatório com grupos'}));}await screen.findByRole('button',{name:'Baixar PPT'});}
describe('rota real Panorama → projeção → manifesto → exportação',()=>{
  it('mantém seleção vazia, gera o relatório integrado e entrega o mesmo manifesto ao PPT',async()=>{
    setup();expect(screen.getByRole('button',{name:'Gerar relatório'})).toBeDisabled();expect(mocks.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Selecionar 2'));await generate();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Nome do território 1')).toBeNull();
    const start=vi.fn();usePanoramaExportStore.setState({start});
    fireEvent.click(screen.getByRole('button',{name:'Baixar PPT'}));
    const continueButton=screen.queryByRole('button',{name:'Continuar e baixar PPT'});if(continueButton)fireEvent.click(continueButton);
    await waitFor(()=>expect(start).toHaveBeenCalledTimes(1));
    const [report,format,options]=start.mock.calls[0];
    expect(format).toBe('pptx');expect(report.scope.presentation.layout).toBe('integrated');expect(report.territorial.units[0].unit.label).toBe('Canela');
    expect(options.manifest.map(p=>p.id)).toEqual(panoramaManifestFor(report).map(p=>p.id));
    expect(buildFiergsAuditCsv(report)).toContain('integrated');
    const pair=options.manifest.filter(p=>p.fiergsOfficialSlide===9);expect(pair).toHaveLength(2);expect(pair[1].territorialParentId).toBe(pair[0].id);
    expect(document.querySelector('.panorama-report-page')).not.toBeNull();
  });
  it('cobre três cidades, consolidado maior e cidade versus grupo sem nova coleta editorial',async()=>{
    setup();fireEvent.click(screen.getByText('Selecionar 3'));await generate(3);
    expect(mocks.fetch.mock.calls[0][0].presentation.units).toHaveLength(3);
    fireEvent.click(screen.getByText('Selecionar 4'));
    fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button',{name:'2 grupos'}));
    fireEvent.click(screen.getByRole('button',{name:'Mover Esteio'}));
    fireEvent.click(screen.getByRole('button',{name:'Mover para grupo 2'}));
    fireEvent.change(screen.getByLabelText('Nome do grupo 2'),{target:{value:'Região do entorno'}});
    fireEvent.click(screen.getByRole('button',{name:'Gerar relatório com grupos'}));
    await screen.findByRole('button',{name:'Baixar PPT'});
    expect(mocks.fetch.mock.calls.at(-1)[0].presentation.units.map(u=>u.cities.length)).toEqual([1,3]);
    const count=mocks.fetch.mock.calls.length;
    fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));
    fireEvent.change(screen.getByLabelText('Nome do grupo 2'),{target:{value:'Novo nome do entorno'}});
    fireEvent.click(screen.getByRole('button',{name:'Gerar relatório com grupos'}));
    await screen.findByRole('button',{name:'Baixar PPT'});
    expect(mocks.fetch).toHaveBeenCalledTimes(count);
  });
  it('preserva carregamento Brain e erro sem montar relatório parcial',async()=>{
    setup();mocks.mode='loading';fireEvent.click(screen.getByText('Selecionar 1'));fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));
    await waitFor(()=>expect(mocks.resolve).toBeDefined());
    expect(screen.getByText('Consultando APIs e montando o relatório…')).toBeInTheDocument();expect(document.querySelector('[role="status"][aria-busy="true"] img')).not.toBeNull();
    expect(screen.queryByRole('button',{name:'Baixar PPT'})).toBeNull();mocks.resolve?.(null);
    await screen.findByRole('button',{name:'Baixar PPT'});
  });
  it('isola falha da coleta e preserva Secovi com cidade única',async()=>{
    setup('secovi-sp');mocks.mode='error';fireEvent.click(screen.getByText('Selecionar 1'));fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));
    await screen.findByText('Falha de coleta simulada');expect(screen.queryByRole('button',{name:'Baixar PPT'})).toBeNull();
    mocks.mode='ok';fireEvent.click(screen.getByRole('button',{name:'Recomeçar coleta'}));await screen.findByRole('button',{name:'Baixar PPT'});
    expect(mocks.fetch.mock.calls.at(-1)[0].entity).toBe('secovi-sp');expect(document.querySelector('.panorama-report-page')).not.toBeNull();
  });
  it.each(['fiergs-rs','secovi-sp'])('gera somente o consolidado em %s sem nenhuma lâmina municipal ou territorial',async(entity)=>{
    setup(entity);fireEvent.click(screen.getByText('Selecionar 2'));
    fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));
    expect(mocks.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Somente consolidado'}));
    fireEvent.click(screen.getByRole('button',{name:'Gerar consolidado'}));
    await screen.findByRole('button',{name:'Baixar PPT'});
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0][0].presentation).toEqual({mode:'consolidated',layout:'integrated'});
    const start=vi.fn();usePanoramaExportStore.setState({start});
    fireEvent.click(screen.getByRole('button',{name:'Baixar PPT'}));
    const proceed=screen.queryByRole('button',{name:'Continuar e baixar PPT'});if(proceed)fireEvent.click(proceed);
    await waitFor(()=>expect(start).toHaveBeenCalled());
    const [report,,options]=start.mock.calls[0];
    expect(report.scope.cities).toHaveLength(2);
    expect(options.manifest.some(p=>p.territorialKind||p.territorialUnitId||p.cityComparison||p.fiergsOfficialSlide===31)).toBe(false);
  });

});
