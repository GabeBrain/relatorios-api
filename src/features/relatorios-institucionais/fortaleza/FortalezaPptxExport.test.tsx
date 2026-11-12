import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import FortalezaPptxExport from './FortalezaPptxExport';
import { FORTALEZA_CITIES,prepareFortalezaBlueprint } from './model';
import type { FortalezaGenerationState } from './useFortalezaMarket';
import { monthlyMarketSelection as selection } from './__tests__/monthly-market-fixture';
const build=vi.hoisted(()=>vi.fn());
vi.mock('./pptx-export',()=>({buildFortalezaMonthlyExport:build}));
let state:FortalezaGenerationState,click:ReturnType<typeof vi.spyOn>;
const revision={},slide=(page:number)=><svg><text>Slide {page}</text></svg>;
beforeEach(async()=>{
  state={key:'Bearer private-token',phase:'done',startedAt:1,finishedAt:'2026-11-11T18:00:00Z',message:'Conferência',hasFailedCities:false,report:null,intro:null,monthlyLaunches:null,steps:[],blueprint:await prepareFortalezaBlueprint(selection,[...FORTALEZA_CITIES],{yieldControl:async()=>{}})};
  build.mockReset().mockResolvedValue(new Blob(['fixture']));
  const OriginalURL=URL;vi.stubGlobal('URL',class extends OriginalURL{static createObjectURL=vi.fn(()=>'blob:fixture');static revokeObjectURL=vi.fn();});
  click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const view=(overrides={})=><FortalezaPptxExport selection={selection} generation={state} renderSlide={slide} overflow={0} revision={revision} {...overrides}/>;
describe('Fortaleza exportação da mesma prévia',()=>{
  it('envia60páginas na ordem e audita sem a chave privada da sessão',async()=>{
    render(view());fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX de conferência'}));await waitFor(()=>expect(click).toHaveBeenCalledOnce());
    const [slides,options]=build.mock.calls[0];expect(slides.map((s:HTMLElement)=>Number(s.dataset.fortalezaExportSlide))).toEqual(Array.from({length:60},(_,i)=>i+1));
    expect(options).toMatchObject({format:'pptx',mode:'editable',period:'2026-07'});expect(JSON.stringify(options.audit)).not.toContain('private-token');expect(options.audit.report.reference.slideCount).toBe(60);
    expect(document.querySelectorAll('[data-fortaleza-export-slide]')).toHaveLength(0);
  });
  it('PDFusa modo fiel independentemente da escolha editável',async()=>{
    render(view());fireEvent.click(screen.getByRole('button',{name:'Baixar PDF de conferência'}));await waitFor(()=>expect(click).toHaveBeenCalledOnce());expect(build.mock.calls[0][1]).toMatchObject({format:'pdf',mode:'faithful'});
  });
  it('bloqueia excesso de lançamentos, geração incompleta e competência divergente',()=>{
    const root=render(view({overflow:1}));expect(screen.getByRole('button',{name:'Baixar PPTX de conferência'})).toBeDisabled();
    root.rerender(view({generation:{...state,phase:'loading'}}));expect(screen.getByRole('button',{name:'Baixar PDF de conferência'})).toBeDisabled();
    root.rerender(view({selection:{...selection,position:8}}));expect(screen.getByRole('button',{name:'Baixar PPTX de conferência'})).toBeDisabled();expect(build).not.toHaveBeenCalled();
  });
  it('mudança de prévia aborta captura e impede download tardio',async()=>{
    let finish!:(value:Blob)=>void;build.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    const root=render(view());fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX de conferência'}));await waitFor(()=>expect(build).toHaveBeenCalledOnce());
    root.rerender(view({revision:{}}));expect(build.mock.calls[0][1].signal.aborted).toBe(true);finish(new Blob());await screen.findByText('Exportação cancelada. Inicie novamente para usar a prévia atual.');expect(click).not.toHaveBeenCalled();
  });
  it('erro permite nova tentativa sem coletar dados',async()=>{
    build.mockRejectedValueOnce(new Error('Imagem indisponível'));render(view());fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX de conferência'}));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX de conferência'}));await waitFor(()=>expect(click).toHaveBeenCalledOnce());expect(build).toHaveBeenCalledTimes(2);
  });
});
