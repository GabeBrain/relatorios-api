import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import StudyRecoveryPanel from './StudyRecoveryPanel';
const props=()=>({recovery:null,loading:false,savedCount:22,preparing:false,onPrepare:vi.fn(),onReview:vi.fn(),onRefresh:vi.fn()});
it('retorno desconhecido mantém resultados acessíveis e não oferece execução direta',()=>{
 const p=props();const {container}=render(<StudyRecoveryPanel {...p} recovery={{id:'run',state:'interrupted',completedBatches:37,pendingBatches:1,canResume:false}}/>);
 expect(screen.getByText(/22 apontamento/)).toBeInTheDocument();
 expect(screen.getByText(/conferência pela equipe/)).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Continuar avaliação'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Conferir materiais'}));expect(p.onPrepare).toHaveBeenCalledOnce();
 expect(container.textContent).not.toMatch(/US\$|R\$|\b(?:custo|tokens|gasto|reserva)\b/);
});
it('preparação pode voltar aos resultados e reconsultar sem executar IA',()=>{
 const p=props();render(<StudyRecoveryPanel {...p} preparing recovery={{id:'run',state:'interrupted',completedBatches:37,pendingBatches:0,canResume:true}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Ver resultados salvos'}));expect(p.onReview).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Conferir retomada'}));expect(p.onRefresh).toHaveBeenCalledOnce();
 expect(p.onPrepare).not.toHaveBeenCalled();
});
it('erro da consulta conserva aviso e carregamento desabilita nova consulta',()=>{
 const p=props();const {rerender}=render(<StudyRecoveryPanel {...p} error="Consulta indisponível"/>);
 expect(screen.getByRole('alert')).toHaveTextContent('Consulta indisponível');
 rerender(<StudyRecoveryPanel {...p} loading/>);
 expect(screen.getByRole('button',{name:'Conferir retomada'})).toBeDisabled();
});
