import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {useState} from 'react';
import {ReportSlideNavigation,ReportSlideHeading,ReportSlideDialog} from './ReportSlideControls';
import {ReportLoading} from './ReportLoading';
import {REPORT_STANDARD_FAMILIES,reportStandardFamily} from './standard-families';
import {SP_SEGMENT_RULE} from '../sp/segments';
import {FORTALEZA_STANDARDS} from '../fortaleza/classifications';
import {maceioPatternFamily} from '../maceio/classification';
import {standardFamily} from '../modelo-03/classification';
afterEach(()=>{cleanup();vi.useRealTimers();});
const slides=[{number:1,title:'Capa'},{number:3,title:'Indicadores'},{number:8,title:'Encerramento'}];
function Harness(){const [page,setPage]=useState(1),[open,setOpen]=useState(false),navigation=<ReportSlideNavigation slides={slides} value={page} onChange={setPage}/>;return <>{!open&&navigation}<ReportSlideHeading page={page} title={slides.find(s=>s.number===page)!.title} onExpand={()=>setOpen(true)}/><ReportSlideDialog open={open} onOpenChange={setOpen} title="Slides do relatório" description="Prévia" navigation={navigation}><p>Conteúdo {page}</p></ReportSlideDialog></>;}
describe('Contrato compartilhado dos relatórios institucionais',()=>{
 it('navega pela sequência disponível, mantém número ativo e continua na mesma posição ao ampliar',()=>{
  render(<Harness/>);expect(screen.getByRole('button',{name:'Anterior'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Próximo'}));expect(screen.getByRole('button',{name:'3'})).toHaveAttribute('aria-current','page');
  fireEvent.click(screen.getByRole('button',{name:'Ampliar slides'}));const dialog=screen.getByRole('dialog');expect(within(dialog).getByText('Conteúdo 3')).toBeVisible();fireEvent.click(within(dialog).getByRole('button',{name:'Próximo'}));expect(within(dialog).getByRole('button',{name:'Próximo'})).toBeDisabled();expect(within(dialog).getByText('Conteúdo 8')).toBeVisible();
 });
 it('mostra somente números nos botões, com título completo no tooltip',()=>{render(<ReportSlideNavigation slides={slides} value={1} onChange={()=>{}}/>);expect(screen.getAllByRole('button').map(b=>b.textContent)).toEqual(['Anterior','1','3','8','Próximo']);expect(screen.getByTitle('Slide 3 · Indicadores')).toHaveTextContent('3');});
 it('mantém animação/tempo/cancelamento na região do relatório, inclusive durante pausa',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-24T15:00:00Z'));const cancel=vi.fn();render(<ReportLoading title="Consultar fontes" description="Aguardando resposta da API" startedAt={Date.now()-65000} onCancel={cancel}/>);
  expect(screen.getByRole('region',{name:'Carregamento do relatório'})).toHaveAttribute('aria-busy','true');expect(screen.getByLabelText('1:05 decorridos')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Cancelar consulta'}));expect(cancel).toHaveBeenCalledOnce();
  expect(screen.getByRole('list',{name:'Andamento das etapas'})).toHaveClass('md:grid-cols-2');expect(screen.getByRole('heading',{name:'Gerando seu relatório'})).toBeVisible();
  expect(document.querySelector('img')).toHaveClass('h-7');expect(document.querySelector('.backdrop-blur-sm')).toBeNull();
 });
 it('mantém a mesma equivalência nos motores existentes, sem misturar padrões desconhecidos',()=>{
  expect(SP_SEGMENT_RULE.groups).toEqual(REPORT_STANDARD_FAMILIES);const raw=Object.values(REPORT_STANDARD_FAMILIES).flat();expect(new Set(raw).size).toBe(7);expect([...FORTALEZA_STANDARDS].sort()).toEqual([...raw].sort());
  for(const [family,patterns] of Object.entries(REPORT_STANDARD_FAMILIES))for(const p of patterns){expect(reportStandardFamily(p)).toBe(family);expect(maceioPatternFamily(p)).toBe(family);expect(standardFamily(p)).toBe(family);}
  expect(reportStandardFamily('Desconhecido')).toBeNull();expect(standardFamily('Desconhecido')).toBe('Desconhecido');
 });
});
