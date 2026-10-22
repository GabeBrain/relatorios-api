import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, it, expect, beforeEach } from 'vitest';
import StudyPreparationPage from './StudyPreparationPage';
const mocks=vi.hoisted(()=>({load:vi.fn(),save:vi.fn(),clear:vi.fn(),studies:vi.fn()}));
vi.mock('../lib/v3/local-materials',()=>({loadLocalStudySheets:async()=>[],loadLocalMaterial:mocks.load,saveLocalMaterial:mocks.save,clearPreparationDraft:mocks.clear}));
vi.mock('../lib/v3/pptx-store',()=>({loadPptx:async()=>({name:'estudo.pptx',bytes:new Uint8Array([1])})}));
vi.mock('../lib/v3/db',()=>({listStudies:mocks.studies,analysisPending:(s:{analise?:unknown;status:string})=>!s.analise&&s.status!=='pronto'}));
vi.mock('../lib/audit/pptx-to-ir',()=>({pptxToIr:async()=>({sha1:'a'.repeat(40),n_slides:3,arquivo:'estudo.pptx',slides:[]})}));
vi.mock('../lib/v3/pipeline',()=>({estimateFullAnalysis:async()=>({costUsd:0.1,candidates:[],textSlides:3})}));
vi.mock('../lib/v3/city-suggestion',()=>({suggestCity:()=>({cidade:'Curitiba',uf:'PR',origem:'arquivo'})}));
vi.mock('../lib/v3/pre-analysis',()=>({imageProfile:()=>({tabelasNativas:0,tabelasImagem:0,fichas:0})}));
vi.mock('../lib/v3/fonte-extractor-browser',()=>({extractFonteFromExcel:async()=>({blocos:[]})}));
vi.mock('../lib/account-preparation',()=>({registerAccountPreparation:async()=>null}));
vi.mock('../lib/audit/ir-rules',()=>({irToFindings:()=>[]}));
beforeEach(()=>{vi.clearAllMocks();Object.defineProperty(File.prototype,'arrayBuffer',{configurable:true,value:async()=>new ArrayBuffer(1)});mocks.load.mockResolvedValue(null);mocks.save.mockResolvedValue(undefined);mocks.clear.mockResolvedValue(undefined);mocks.studies.mockResolvedValue([]);});
it('cancelar seletor não escolhe sem planilhas; clique duplo inicia uma única vez',async()=>{
 const onStart=vi.fn(()=>new Promise<void>(()=>{}));
 const {container}=render(<MemoryRouter><StudyPreparationPage back="/corretor" onStart={onStart}/></MemoryRouter>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Escolher PowerPoint'})).not.toBeDisabled());
 const file=new File(['mock'],'estudo.pptx');Object.defineProperty(file,'arrayBuffer',{value:async()=>new ArrayBuffer(1)});
 fireEvent.change(container.querySelector('input[accept=".pptx"]')!,{target:{files:[file]}});
 await screen.findByLabelText('Cidade do estudo');
 const start=screen.getByRole('button',{name:'Continuar sem planilhas'});
 expect(start).toBeEnabled();expect(onStart).not.toHaveBeenCalled();
 expect(screen.queryByLabelText('Limite autorizado em dólares (US$)')).not.toBeInTheDocument();
 expect(container.textContent).not.toMatch(/US\$|R\$|Estimativa da avaliação/);
 fireEvent.change(container.querySelector('input[accept=".xlsx,.xlsm"]')!,{target:{files:[]}});
 expect(start).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Continuar sem planilhas'}));expect(start).toHaveAccessibleName('Iniciar avaliação');expect(onStart).not.toHaveBeenCalled();
 fireEvent.click(start);fireEvent.click(start);await waitFor(()=>expect(onStart).toHaveBeenCalledOnce());
 expect(onStart).toHaveBeenCalledWith(expect.objectContaining({city:'Curitiba',uf:'PR',sheets:[],budgetUsd:1.2}));
});

function savedDraft(){
 mocks.load.mockImplementation(async(key:string)=>key==='preparation:fields'?{bytes:new TextEncoder().encode(JSON.stringify({city:'Curitiba',uf:'PR',choice:true,sheets:[]}))}:key==='preparation:pptx'?{name:'estudo.pptx',bytes:new Uint8Array([1])}:null);
}
it('retomada usa o mesmo arquivo e conserva fonte sem criar outro registro',async()=>{
 const onStart=vi.fn().mockResolvedValue(undefined),fonte={blocos:[]};
 const study={id:'existing',lastSha1:'a'.repeat(40),cidade:'Curitiba',uf:'PR'};
 render(<MemoryRouter><StudyPreparationPage back="/corretor" resume={{study:study as never,fonte:fonte as never,outras:['Pinhais','Colombo']}} onStart={onStart}/></MemoryRouter>);
 await screen.findByLabelText('Cidade do estudo');
 fireEvent.click(screen.getByRole('button',{name:'Continuar avaliação'}));
 await waitFor(()=>expect(onStart).toHaveBeenCalledOnce());
 expect(onStart).toHaveBeenCalledWith(expect.objectContaining({fonte,city:'Curitiba',uf:'PR',outras:['Pinhais','Colombo']}));
 expect(mocks.clear).not.toHaveBeenCalled();
});
it('retorno desconhecido bloqueia início mesmo com materiais restaurados',async()=>{
 const onStart=vi.fn(),study={id:'existing',lastSha1:'a'.repeat(40),cidade:'Curitiba',uf:'PR'};
 render(<MemoryRouter><StudyPreparationPage back="/corretor" resume={{study:study as never,fonte:{blocos:[]} as never}} resumeBlocked="Uma leitura precisa de conferência técnica." onStart={onStart}/></MemoryRouter>);
 await screen.findByLabelText('Cidade do estudo');
 const start=screen.getByRole('button',{name:'Continuar avaliação'});
 expect(start).toBeDisabled();fireEvent.click(start);expect(onStart).not.toHaveBeenCalled();
 expect(screen.getByText('Uma leitura precisa de conferência técnica.')).toBeInTheDocument();
});
it('rascunho antigo de estudo analisado é consumido e oferece o resultado, sem reiniciar',async()=>{
 savedDraft();mocks.studies.mockResolvedValue([{id:'analisado',generation:'v3',lastSha1:'a'.repeat(40),analise:{},status:'em_correcao'}]);
 const onStart=vi.fn();render(<MemoryRouter><StudyPreparationPage back="/corretor" onStart={onStart}/></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'Abrir resultado'})).toHaveAttribute('href','/corretor/estudos/analisado/resumo');
 expect(mocks.clear).toHaveBeenCalledWith('a'.repeat(40));expect(screen.queryByLabelText('Cidade do estudo')).not.toBeInTheDocument();expect(onStart).not.toHaveBeenCalled();
});
it('rascunho não iniciado é recuperado e só é descartado após confirmação',async()=>{
 savedDraft();vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
 render(<MemoryRouter><StudyPreparationPage back="/corretor" onStart={vi.fn()}/></MemoryRouter>);
 expect(await screen.findByLabelText('Cidade do estudo')).toHaveValue('Curitiba');
 fireEvent.click(screen.getByRole('button',{name:'Limpar e começar outro'}));expect(mocks.clear).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Limpar e começar outro'}));await waitFor(()=>expect(screen.queryByLabelText('Cidade do estudo')).not.toBeInTheDocument());
 expect(mocks.clear).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'Escolher PowerPoint'})).toBeEnabled();
});
