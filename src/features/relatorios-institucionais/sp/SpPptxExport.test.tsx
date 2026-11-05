import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {SpPptxExport} from './SpPptxExport';
import {buildSpTemporalPreview} from './temporal';
import {recordedInput} from './__tests__/recorded';
const mocked=vi.hoisted(()=>({build:vi.fn()}));
vi.mock('./pptx-export',()=>({buildSpEditablePptx:mocked.build}));
const report=()=>buildSpTemporalPreview(recordedInput(),'3T2026');
beforeEach(()=>{mocked.build.mockReset();vi.stubGlobal('URL',{createObjectURL:vi.fn(()=> 'blob:test'),revokeObjectURL:vi.fn()});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('SP — estados da exportação',()=>{
  it('apresenta erro recuperável e gera85posições ao tentar novamente',async()=>{
    mocked.build.mockRejectedValueOnce(new Error('Falha de captura controlada.')).mockResolvedValueOnce(new Blob(['pptx']));
    render(<SpPptxExport report={report()} renderSlide={page=><article>Slide {page}</article>}/>);
    fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de captura controlada.');
    fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));
    await screen.findByText('PPTX gerado com 85 slides. Download iniciado.');
    expect(mocked.build).toHaveBeenCalledTimes(2);expect(mocked.build.mock.calls[1][0]).toHaveLength(85);
  });
  it('mostra progresso Brain, impede duplicação e não remonta85páginas a cada progresso',async()=>{
    mocked.build.mockImplementation((_slides:unknown,_quarter:string,signal:AbortSignal)=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('abort')))));
    const draw=vi.fn(page=><article>Slide {page}</article>);
    render(<SpPptxExport report={report()} renderSlide={draw}/>);
    fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));
    await waitFor(()=>expect(mocked.build).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button',{name:'Baixar PPTX editável'})).toBeDisabled();expect(draw).toHaveBeenCalledTimes(85);
    act(()=>mocked.build.mock.calls[0][3](1,85));
    expect(screen.getByText('Gerando PowerPoint: 1 de 85 slides')).toBeInTheDocument();expect(draw).toHaveBeenCalledTimes(85);
    fireEvent.click(screen.getByRole('button',{name:'Cancelar exportação'}));
    await screen.findByText('Exportação cancelada.');expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('cancelamento por nova geração impede baixar a geração anterior',async()=>{
    mocked.build.mockImplementation((_slides:unknown,_quarter:string,signal:AbortSignal)=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('abort')))));
    const first=report(),draw=(page:number)=><article>Slide {page}</article>,view=render(<SpPptxExport report={first} renderSlide={draw}/>);
    fireEvent.click(screen.getByRole('button',{name:'Baixar PPTX editável'}));await waitFor(()=>expect(mocked.build).toHaveBeenCalledTimes(1));
    view.rerender(<SpPptxExport report={{...first,quarter:'2T2026'}} renderSlide={draw}/>);
    await screen.findByText('Exportação cancelada.');expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
