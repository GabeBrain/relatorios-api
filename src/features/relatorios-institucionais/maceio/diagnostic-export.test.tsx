import { act,cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { MaceioDiagnosticExport } from './MaceioDiagnosticExport';
import { buildMaceioDiagnostic } from './diagnostic';
import type { MaceioGenerationState } from './useMaceioMarket';
import type { MaceioSelection } from './model';
const selection:MaceioSelection={uf:'AL',city:'Macei\u00f3',territory:'capital-rm',periodicity:'monthly',year:2026,position:5};
const workers:FakeWorker[]=[];
class FakeWorker {onmessage:((event:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;postMessage=vi.fn();terminate=vi.fn();constructor(){workers.push(this);}ready(snapshot:unknown){this.onmessage?.({data:{type:'ready',snapshot}});}}
const state:MaceioGenerationState={key:'Bearer confidential-token',phase:'done',startedAt:Date.parse('2026-11-10T15:00:00Z'),finishedAt:'2026-11-10T15:01:00Z',message:'Done',report:null,hasFailedCities:false,blueprint:null,intro:null,steps:[]};
beforeEach(()=>{workers.length=0;vi.stubGlobal('Worker',FakeWorker);});afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('Maceio — preparo automático do diagnóstico',()=>{
  it('inicia ao terminar, não envia a chave de sessão ao worker e disponibiliza o arquivo concluído',()=>{
    render(<MaceioDiagnosticExport selection={selection} state={state}/>);expect(workers).toHaveLength(1);expect(JSON.stringify(workers[0].postMessage.mock.calls)).not.toContain('confidential-token');expect(screen.getByText('Preparando diagnóstico JSON')).toBeTruthy();expect(screen.queryByRole('button',{name:'Baixar diagnóstico JSON'})).toBeNull();act(()=>workers[0].ready(buildMaceioDiagnostic(selection,state)));expect(screen.getByRole('button',{name:'Baixar diagnóstico JSON'})).toBeTruthy();
  });
  it('cancelamento termina processamento, ignora conclusão tardia e permite preparar novamente',()=>{
    render(<MaceioDiagnosticExport selection={selection} state={state}/>);fireEvent.click(screen.getByRole('button',{name:'Cancelar diagnóstico'}));expect(workers[0].terminate).toHaveBeenCalled();act(()=>workers[0].ready(buildMaceioDiagnostic(selection,state)));expect(screen.queryByRole('button',{name:'Baixar diagnóstico JSON'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Preparar diagnóstico'}));expect(workers).toHaveLength(2);act(()=>workers[1].ready(buildMaceioDiagnostic(selection,state)));expect(screen.getByRole('button',{name:'Baixar diagnóstico JSON'})).toBeTruthy();
  });
  it('troca de geração encerra worker antigo e erro oferece nova tentativa sem consultar API',()=>{
    const view=render(<MaceioDiagnosticExport selection={selection} state={state}/>);view.rerender(<MaceioDiagnosticExport selection={selection} state={{...state,phase:'loading'}}/>);expect(workers[0].terminate).toHaveBeenCalled();act(()=>workers[0].ready(buildMaceioDiagnostic(selection,state)));expect(screen.queryByRole('button',{name:'Baixar diagnóstico JSON'})).toBeNull();view.rerender(<MaceioDiagnosticExport selection={selection} state={{...state,finishedAt:'2026-11-10T16:00:00Z'}}/>);act(()=>workers[0].onerror?.());expect(screen.queryByRole('alert')).toBeNull();act(()=>workers[1].onerror?.());expect(screen.getByRole('alert')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Tentar diagnóstico novamente'}));expect(workers).toHaveLength(3);
  });
});
