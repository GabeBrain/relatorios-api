import {useSlidePreviewEditing} from './useSlidePreviewEditing';
import { fireEvent,render,screen,cleanup } from '@testing-library/react';
import { afterEach,describe,it,expect } from 'vitest';
import { useState } from 'react';
import { EditableSlideSurface,SlidePreviewEditor } from './SlidePreviewEditor';
afterEach(cleanup);
function Harness({revision=1}:{revision?:number}){
 const state=useSlidePreviewEditing(revision),[page,setPage]=useState(1);
 return <><button onClick={()=>setPage(page===1?2:1)}>Trocar página</button><SlidePreviewEditor page={page} state={state}/><EditableSlideSurface page={page} edits={state.edits[page]}><svg><text>Fonte original</text></svg></EditableSlideSurface><output data-testid="audit">{JSON.stringify(state.edits)}</output></>;
}
describe('edição compartilhada da prévia',()=>{
 it('preserva ajustes por slide, mantém a fonte e permite restaurar',()=>{
  render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Adicionar texto'}));
  fireEvent.change(screen.getByLabelText('Conteúdo'),{target:{value:'Manchete revisada'}});
  expect(screen.getByTestId('audit')).toHaveTextContent('Manchete revisada');
  expect(screen.getByText('Fonte original')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Trocar página'));expect(screen.queryByText('Manchete revisada',{selector:'tspan'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Trocar página'));expect(screen.getByText('Manchete revisada',{selector:'tspan'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Restaurar slide 1'}));expect(screen.getByTestId('audit')).toHaveTextContent('{}');
 });
 it('limpa ajustes ao gerar outra competência',()=>{
  const view=render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Adicionar texto'}));
  expect(screen.getByTestId('audit')).toHaveTextContent('sourceText');view.rerender(<Harness revision={2}/>);
  expect(screen.getByTestId('audit')).toHaveTextContent('{}');
 });
});
