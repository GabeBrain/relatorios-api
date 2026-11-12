import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi, expect, it } from 'vitest';
import StudyQuickReview from './StudyQuickReview';
import type { StudyV3, FindingV3 } from '../lib/v3/db';
vi.mock('./StudySlideViewer', () => ({ default: ({slide}: {slide:number}) => <div>Prévia {slide}</div> }));
const queue = [1,2].map(n => ({ruleId:`item-${n}`,status:'pendente',origem:'IA_texto',finding:{id:`item-${n}`,type:'SPELLING',title:`Apontamento ${n}`,detail:'Texto',slideRef:`s${n}`,ok:false}})) as FindingV3[];
it('não avança enquanto salva; rejeição ou login cancelado conserva o apontamento', async () => {
  let finish: (value:boolean)=>void;
  const onStatus = vi.fn(() => new Promise<boolean>(resolve => { finish=resolve; }));
  render(<StudyQuickReview study={{id:'test',nSlides:2} as StudyV3} queue={queue} onStatus={onStatus} onVerdict={async()=>false} onClose={()=>{}} />);
  fireEvent.click(screen.getByRole('button',{name:'Já ajustei · C'}));
  expect(screen.getByText('Apontamento 1')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Já ajustei · C'})).toBeDisabled();
  finish!(false);
  await screen.findByRole('alert'); expect(screen.getByText('Apontamento 1')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Já ajustei · C'})); finish!(true);
  await screen.findByText('Apontamento 2'); expect(onStatus).toHaveBeenCalledTimes(2);
});
it('revisitar item não infla o progresso e Enter não decide implicitamente', async () => {
  render(<StudyQuickReview study={{id:'test',nSlides:2} as StudyV3} queue={queue} onStatus={async()=>true} onVerdict={async()=>true} onClose={()=>{}} />);
  fireEvent.keyDown(window,{key:'Enter'}); expect(screen.getByText('Apontamento 1')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Manter pendente e avançar'})); await screen.findByText('Apontamento 2');
  fireEvent.click(screen.getByRole('button',{name:'Anterior'}));
  fireEvent.click(screen.getByRole('button',{name:'Manter pendente e avançar'}));
  await waitFor(()=>expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('1 de 2 apontamentos percorridos'));
});
