import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import MaceioPptxExport from './MaceioPptxExport';
import {maceioCities,prepareMaceioBlueprint,type MaceioSelection} from './model';
import type {MaceioGenerationState} from './useMaceioMarket';
import {introFixture} from './__tests__/intro-fixture';
const build=vi.hoisted(()=>vi.fn());vi.mock('./pptx-export',()=>({buildMaceioPptx:build,maceioPptxFilename:()=> 'maceio-editavel.pptx'}));
const workers:FakeWorker[]=[];
class FakeWorker {onmessage:((event:{data:unknown})=>void)|null=null;onerror:(()=>void)|null=null;terminate=vi.fn();postMessage=vi.fn();constructor(){workers.push(this);}ready(){this.onmessage?.({data:{type:'ready',audit:{schema:'safe-audit'}}});}}
const selection:MaceioSelection={uf:'AL',city:'Maceió',territory:'capital-rm',periodicity:'monthly',year:2026,position:10};
let generation:MaceioGenerationState;
const click=vi.fn();
beforeEach(async()=>{
 workers.length=0;click.mockClear();build.mockReset().mockResolvedValue(new Blob(['pptx']));vi.stubGlobal('Worker',FakeWorker);
 vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=> 'blob:export'),revokeObjectURL:vi.fn()}));vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(click);
 generation={key:'private-token-do-not-export',phase:'done',startedAt:0,finishedAt:'2026-11-23T18:00:00Z',message:'Done',steps:[],report:null,hasFailedCities:false,blueprint:await prepareMaceioBlueprint(selection,[...maceioCities('monthly')]),intro:introFixture(selection)};
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const renderSlide=(page:number)=><svg><text>Página {page}</text></svg>;
describe('Maceió exportação na interface',()=>{
 it('impede download sem geração concluída e rejeita referência antiga',()=>{
  const props={selection,generation:null,renderSlide,revision:0},view=render(<MaceioPptxExport {...props}/>);expect(screen.getByRole('button',{name:'Baixar PPTX editável'})).toBeDisabled();
  view.rerender(<MaceioPptxExport {...props} generation={{...generation,phase:'loading'}}/>);expect(screen.getByRole('button',{name:'Baixar PPTX editável'})).toBeDisabled();
  view.rerender(<MaceioPptxExport {...props} selection={{...selection,position:9}} generation={generation}/>);expect(screen.getByRole('button',{name:'Baixar PPTX editável'})).toBeDisabled();expect(workers).toHaveLength(0);
 });
 it('exporta uma única vez, com 82 páginas e auditoria sem chave de sessão',async()=>{
  render(<MaceioPptxExport selection={selection} generation={generation} renderSlide={renderSlide} revision={0}/>);
  const button=screen.getByRole('button',{name:'Baixar PPTX editável'});fireEvent.click(button);fireEvent.click(button);
  await waitFor(()=>expect(workers).toHaveLength(1));expect(document.querySelectorAll('[data-maceio-export-slide]')).toHaveLength(82);expect(JSON.stringify(workers[0].postMessage.mock.calls)).not.toContain('private-token');
  act(()=>workers[0].ready());await waitFor(()=>expect(click).toHaveBeenCalledOnce());expect(build).toHaveBeenCalledOnce();expect(screen.getByRole('status')).toHaveTextContent('82 páginas');expect(document.querySelectorAll('[data-maceio-export-slide]')).toHaveLength(0);
 });
 it('cancela o worker, ignora conclusão tardia e permite nova tentativa',async()=>{
  render(<MaceioPptxExport selection={selection} generation={generation} renderSlide={renderSlide} revision={0}/>);fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));await waitFor(()=>expect(workers).toHaveLength(1));
  fireEvent.click(screen.getByRole('button',{name:'Cancelar exportação'}));await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('cancelada'));expect(workers[0].terminate).toHaveBeenCalled();
  act(()=>workers[0].ready());expect(click).not.toHaveBeenCalled();expect(build).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));await waitFor(()=>expect(workers).toHaveLength(2));
  act(()=>workers[1].ready());await waitFor(()=>expect(click).toHaveBeenCalledOnce());
 });
 it('troca de geração cancela processamento e impede download obsoleto',async()=>{
  let resolve!:(value:Blob)=>void;build.mockImplementation(()=>new Promise<Blob>(done=>{resolve=done;}));
  const props={selection,generation,renderSlide,revision:0},view=render(<MaceioPptxExport {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));await waitFor(()=>expect(workers).toHaveLength(1));act(()=>workers[0].ready());await waitFor(()=>expect(build).toHaveBeenCalledOnce());
  view.rerender(<MaceioPptxExport {...props} revision={1} generation={{...generation,phase:'loading'}}/>);expect(build.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async()=>resolve(new Blob(['obsolete'])));expect(click).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Baixar PPTX editável'})).toBeDisabled();
 });
 it('falha recuperável permite tentar novamente e desmontagem encerra worker',async()=>{
  const view=render(<MaceioPptxExport selection={selection} generation={generation} renderSlide={renderSlide} revision={0}/>);fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));await waitFor(()=>expect(workers).toHaveLength(1));
  act(()=>workers[0].onerror?.());await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Tente novamente'));expect(click).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));await waitFor(()=>expect(workers).toHaveLength(2));view.unmount();expect(workers[1].terminate).toHaveBeenCalled();
 });
});
