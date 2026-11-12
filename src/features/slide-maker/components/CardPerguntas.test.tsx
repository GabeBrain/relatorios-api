import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CardPerguntas } from './CardPerguntas';
import type { Pergunta } from '../types';

afterEach(cleanup);

const perguntas: Pergunta[] = [
  { pergunta: 'Quem será o responsável pela apresentação?', cabecalho: 'Responsável', multipla: false, opcoes: [
    { rotulo: 'Fábio Tadeu Araújo', descricao: 'CEO', recomendada: true }, { rotulo: 'Guilherme Werner', descricao: 'Sócio' },
  ] },
  { pergunta: 'Incluir quais blocos?', cabecalho: 'Blocos', multipla: true, opcoes: [
    { rotulo: 'Mercado', descricao: '' }, { rotulo: 'Regulação', descricao: '' },
  ] },
];

describe('CardPerguntas (§9)', () => {
  it('mostra "(Recomendado)", libera o envio só com tudo respondido e envia no formato do serviço', () => {
    const onEnviar = vi.fn();
    render(<CardPerguntas perguntas={perguntas} ativo onEnviar={onEnviar} />);
    expect(screen.getByText('(Recomendado)')).toBeInTheDocument();
    const enviar = screen.getByRole('button', { name: 'Enviar respostas' });
    expect(enviar).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Guilherme Werner/ }));
    fireEvent.click(screen.getByRole('button', { name: /Fábio Tadeu Araújo/ }));
    expect(screen.getByRole('button', { name: /Fábio Tadeu Araújo/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Guilherme Werner/ })).toHaveAttribute('aria-pressed', 'false');
    expect(enviar).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Mercado/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /^Outro/ })[1]!);
    expect(enviar).toBeDisabled(); // "Outro" sem texto
    fireEvent.change(screen.getByLabelText('Outra resposta para: Incluir quais blocos?'), { target: { value: 'Florianópolis' } });
    expect(enviar).toBeEnabled();
    fireEvent.click(enviar);
    expect(onEnviar).toHaveBeenCalledWith({
      'Quem será o responsável pela apresentação?': 'Fábio Tadeu Araújo',
      'Incluir quais blocos?': ['Mercado', 'Florianópolis'],
    });
  });

  it('card do histórico: só leitura, com as respostas dadas', () => {
    render(<CardPerguntas perguntas={perguntas} ativo={false} respondidas={{ 'Quem será o responsável pela apresentação?': 'Guilherme Werner', 'Incluir quais blocos?': ['Mercado'] }} onEnviar={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Enviar respostas' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guilherme Werner/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Guilherme Werner/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Resposta: Guilherme Werner')).toBeInTheDocument();
  });
});
