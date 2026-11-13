import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CardEntrega } from './CardEntrega';
import { HistoricoVersoes } from './HistoricoVersoes';

afterEach(cleanup);

const QA = { falhas_bloqueantes: 0, alertas: [], notas_rubrica: {} };
const v = (versao: number, mudancas: string[] = []) => ({ versao, created_at: `2026-11-1${versao}T15:00:00Z`, mudancas, qa: null });

describe('histórico de versões no chat (§9)', () => {
  it('a entrega vigente oferece o download principal; a anterior aparece como substituída', () => {
    const baixar = vi.fn();
    render(
      <>
        <CardEntrega entrega={{ versao: 1, mudancas: [], qa: QA }} versaoAtual={2} onBaixar={baixar} />
        <CardEntrega entrega={{ versao: 2, mudancas: ['Título do slide 4'], qa: QA }} versaoAtual={2} onBaixar={baixar} onVersoesAnteriores={vi.fn()} />
      </>,
    );
    const antiga = screen.getByRole('region', { name: 'Versão 1' });
    expect(antiga).toHaveTextContent('Deck v1');
    expect(antiga).toHaveTextContent('Substituído pela v2');
    expect(antiga).not.toHaveTextContent('Seu deck está pronto');
    expect(within(antiga).queryByRole('button', { name: 'Versões anteriores' })).not.toBeInTheDocument();

    const atual = screen.getByRole('region', { name: 'Versão 2' });
    expect(atual).toHaveTextContent('Seu deck está pronto — v2');
    expect(atual).toHaveTextContent('Título do slide 4');
    fireEvent.click(within(antiga).getByRole('button', { name: 'Baixar PPTX (v1)' }));
    fireEvent.click(within(atual).getByRole('button', { name: 'Baixar PPTX' }));
    expect(baixar).toHaveBeenCalledTimes(2);
  });

  it('entrega que chega antes de a fase fechar (versao_atual ainda anterior) já aparece como vigente', () => {
    render(<CardEntrega entrega={{ versao: 1, mudancas: [], qa: QA }} versaoAtual={0} onBaixar={vi.fn()} />);
    const card = screen.getByRole('region', { name: 'Versão 1' });
    expect(card).toHaveTextContent('Seu deck está pronto — v1');
    expect(card).not.toHaveTextContent('Substituído');
  });

  it('o diálogo lista da mais recente para a mais antiga, marca a atual e baixa cada uma', () => {
    const baixar = vi.fn();
    render(<HistoricoVersoes aberto onFechar={vi.fn()} versoes={[v(1), v(3, ['Novo gráfico']), v(2)]} baixando={null} onBaixar={baixar} />);
    const itens = within(screen.getByRole('dialog', { name: 'Versões do deck' })).getAllByRole('listitem').filter((li) => li.querySelector('button'));
    expect(itens.map((li) => li.querySelector('p')!.textContent)).toEqual(['v3atual', 'v2', 'v1']);
    expect(itens[0]).toHaveTextContent('Novo gráfico');
    fireEvent.click(screen.getByRole('button', { name: 'Baixar versão 1' }));
    expect(baixar).toHaveBeenCalledWith(1);
  });

  it('enquanto prepara um download, os demais ficam desabilitados', () => {
    render(<HistoricoVersoes aberto onFechar={vi.fn()} versoes={[v(1), v(2)]} baixando={2} onBaixar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Baixar versão 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Baixar versão 2' })).toHaveTextContent('Preparando…');
  });
});
