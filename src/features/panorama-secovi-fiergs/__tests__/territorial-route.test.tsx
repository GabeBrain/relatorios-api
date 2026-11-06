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
async function generate(){fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));await screen.findByRole('button',{name:'Baixar PPT'});}
describe('rota real Panorama → projeção → manifesto → exportação',()=>{
  it('mantém seleção vazia, coleta uma vez, recompõe o nome e entrega o mesmo manifesto ao PPT',async()=>{
    setup();expect(screen.getByRole('button',{name:'Gerar relatório'})).toBeDisabled();expect(mocks.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Selecionar 2'));await generate();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Nome do território 1'),{target:{value:'Canela revisada'}});
    expect(screen.queryByRole('button',{name:'Baixar PPT'})).toBeNull();
    await generate();expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const start=vi.fn();usePanoramaExportStore.setState({start});
    fireEvent.click(screen.getByRole('button',{name:'Baixar PPT'}));
    const continueButton=screen.queryByRole('button',{name:'Continuar e baixar PPT'});if(continueButton)fireEvent.click(continueButton);
    await waitFor(()=>expect(start).toHaveBeenCalledTimes(1));
    const [report,format,options]=start.mock.calls[0];
    expect(format).toBe('pptx');expect(report.territorial.units[0].unit.label).toBe('Canela revisada');
    expect(options.manifest.map(p=>p.id)).toEqual(panoramaManifestFor(report).map(p=>p.id));
    expect(buildFiergsAuditCsv(report)).toContain('Canela revisada');
    expect(document.querySelector('.panorama-report-page')).not.toBeNull();
  });
  it('cobre três cidades, consolidado maior e cidade versus grupo sem nova coleta editorial',async()=>{
    setup();fireEvent.click(screen.getByText('Selecionar 3'));expect(screen.getByLabelText('Nome do território 3')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Selecionar 4'));expect(screen.queryByLabelText('Nome do território 1')).toBeNull();
    fireEvent.change(screen.getAllByRole('combobox')[2],{target:{value:'comparison'}});
    const assignment=screen.getAllByRole('combobox').slice(3);const ids=[...assignment[0].querySelectorAll('option')].map(o=>o.value).filter(v=>v!=='unassigned');
    expect(screen.getByRole('button',{name:'Gerar relatório'})).toBeDisabled();
    assignment.forEach((select,i)=>fireEvent.change(select,{target:{value:ids[i===0?0:1]}}));
    await generate();expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0][0].presentation.units.map(u=>u.cities.length)).toEqual([1,3]);
  });
  it('preserva carregamento Brain e erro sem montar relatório parcial',async()=>{
    setup();mocks.mode='loading';fireEvent.click(screen.getByText('Selecionar 1'));fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));
    await waitFor(()=>expect(mocks.resolve).toBeDefined());
    expect(screen.getByText('Consultando APIs e montando o relatório…')).toBeInTheDocument();expect(document.querySelector('img.panorama-loading-logo')).not.toBeNull();
    expect(screen.queryByRole('button',{name:'Baixar PPT'})).toBeNull();mocks.resolve?.(null);
    await screen.findByRole('button',{name:'Baixar PPT'});
  });
  it('isola falha da coleta e preserva Secovi com cidade única',async()=>{
    setup('secovi-sp');mocks.mode='error';fireEvent.click(screen.getByText('Selecionar 1'));fireEvent.click(screen.getByRole('button',{name:'Gerar relatório'}));
    await screen.findByText('Falha de coleta simulada');expect(screen.queryByRole('button',{name:'Baixar PPT'})).toBeNull();
    mocks.mode='ok';fireEvent.click(screen.getByRole('button',{name:'Recomeçar coleta'}));await screen.findByRole('button',{name:'Baixar PPT'});
    expect(mocks.fetch.mock.calls.at(-1)[0].entity).toBe('secovi-sp');expect(document.querySelector('.panorama-report-page')).not.toBeNull();
  });
});
