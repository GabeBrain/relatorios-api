import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import StudyRecommendation from './StudyRecommendation';
import type { Ir } from '../lib/audit/ir';
import type { StudyV3 } from '../lib/v3/db';
const mocks=vi.hoisted(()=>({list:vi.fn(),run:vi.fn(),load:vi.fn()}));
vi.mock('../lib/recommendations',async original=>({...await original<object>(),listRecommendations:mocks.list,runRecommendation:mocks.run}));
vi.mock('../lib/v3/pptx-store',()=>({loadPptx:mocks.load,savePptx:vi.fn()}));
const ir={sha1:'a'.repeat(40),n_slides:1,slides:[{n:1,textos:['Evidência do estudo '.repeat(10)],tabelas:[]}]} as Ir;
const study={id:'study'} as StudyV3,version={id:'version',n:1,sha1:ir.sha1,n_slides:1,arquivo:'estudo.pptx',created_at:new Date().toISOString()};
const record={id:'rec',execution_id:'run',version_n:1,prompt_version:'brain-2026-09-15-v1',state:'completed',content:'## Recomendação\n\nTexto consultivo salvo.',created_at:new Date().toISOString(),estimated_usd:.002,budget_usd:.01,spent_usd:.001,reserved_usd:0,provider_calls:1,total_requests:1,input_tokens:1,cached_tokens:0,output_tokens:1,model:'gpt-4o-mini'};
beforeEach(()=>{vi.clearAllMocks();mocks.list.mockResolvedValue([]);mocks.load.mockResolvedValue(null);mocks.run.mockResolvedValue(undefined);});
it('selecionar objetivo prepara previsão sem criar estudo ou chamar IA',async()=>{
 const ensure=vi.fn();render(<MemoryRouter><StudyRecommendation preparedIr={ir} ensureStudy={ensure}/></MemoryRouter>);
 expect(screen.queryByText(/US\$|R\$|Previsão conservadora|tokens de entrada/)).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Preparar sugestões'})).toBeEnabled();expect(ensure).not.toHaveBeenCalled();expect(mocks.run).not.toHaveBeenCalled();
 expect(screen.queryByLabelText('Limite autorizado em dólares (US$)')).not.toBeInTheDocument();
});
it('reabre texto salvo mesmo sem original neste navegador',async()=>{
 mocks.list.mockResolvedValue([record]);render(<MemoryRouter><StudyRecommendation study={study} version={version}/></MemoryRouter>);
 expect(await screen.findByText('Texto consultivo salvo.')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Copiar texto'})).toBeInTheDocument();expect(mocks.run).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Preparar sugestões'})).not.toBeInTheDocument();
});
it('retorno desconhecido impede iniciar novamente',async()=>{
 mocks.list.mockResolvedValue([{...record,state:'unknown',content:null,reserved_usd:.01}]);
 render(<MemoryRouter><StudyRecommendation study={study} version={version}/></MemoryRouter>);await screen.findByText(/Uma etapa ainda aguarda confirmação/);expect(mocks.run).not.toHaveBeenCalled();
});
it('arquivo repetido com recomendação salva é aberto sem nova geração',async()=>{
 mocks.list.mockResolvedValue([record]);const ensure=vi.fn().mockResolvedValue({study,version});
 render(<MemoryRouter><StudyRecommendation preparedIr={ir} ensureStudy={ensure}/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Preparar sugestões'}));await screen.findByText('Texto consultivo salvo.');expect(ensure).toHaveBeenCalledOnce();expect(mocks.run).not.toHaveBeenCalled();
});
it('indisponibilidade do histórico não inicia IA e conserva a preparação',async()=>{
 mocks.list.mockRejectedValue(new Error('Histórico indisponível'));const ensure=vi.fn().mockResolvedValue({study,version});
 render(<MemoryRouter><StudyRecommendation preparedIr={ir} ensureStudy={ensure}/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Preparar sugestões'}));await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Histórico indisponível'));expect(mocks.run).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Preparar sugestões'})).toBeEnabled();
});

it('gera com limite interno positivo sem pedir valor ao analista',async()=>{
 const ensure=vi.fn().mockResolvedValue({study,version});render(<MemoryRouter><StudyRecommendation preparedIr={ir} ensureStudy={ensure}/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Preparar sugestões'}));await waitFor(()=>expect(mocks.run).toHaveBeenCalledOnce());
 expect(mocks.run.mock.calls[0][0].budgetUsd).toBeGreaterThan(0);expect(mocks.run.mock.calls[0][0].budgetUsd).toBeLessThanOrEqual(100);
});
