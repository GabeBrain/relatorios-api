import { render,screen,cleanup } from '@testing-library/react';
import { afterEach,it,expect } from 'vitest';
import { MaceioGenerationPanel } from './MaceioGenerationPanel';
import type { MaceioGenerationState } from './useMaceioMarket';

afterEach(cleanup);
it('mostra percentuais medidos e conserva progresso durante espera, erro e cancelamento',()=>{
  const state:MaceioGenerationState={key:'synthetic',phase:'loading',startedAt:0,message:'Coletando',report:null,hasFailedCities:false,blueprint:null,
    steps:[{id:'validation',title:'Validar o recorte',status:'done'},{id:'sources',title:'Consultar fontes municipais',status:'running',percent:37},{id:'caged',title:'Consultar emprego CAGED',status:'waiting'}]};
  const view=render(<MaceioGenerationPanel state={state} compact/>);
  expect(screen.getByText('Concluída · 100%')).toBeTruthy();expect(screen.getByText('Em andamento · 37%')).toBeTruthy();expect(screen.getByText('Aguardando · 0%')).toBeTruthy();
  view.rerender(<MaceioGenerationPanel state={{...state,waitingForApi:true}} compact/>);
  expect(screen.getByText('Aguardando resposta da API · 37%')).toBeTruthy();
  expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  for(const status of ['cancelled','failed'] as const){view.rerender(<MaceioGenerationPanel state={{...state,waitingForApi:false,steps:state.steps.map(step=>step.id==='sources'?{...step,status}:step)}} compact/>);expect(screen.getByText(new RegExp('37%'))).toBeTruthy();}
});
