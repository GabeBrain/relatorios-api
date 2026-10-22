import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MonthField } from './MonthField';

afterEach(cleanup);
describe('MonthField — competência em pt-BR', () => {
  it('exibe dia 01 e permite trocar somente mês/ano', () => {
    const onChange = vi.fn();
    render(<MonthField id="from" label="Data inicial" value="2026-10-01" onChange={onChange} />);
    expect(screen.getByLabelText('Data inicial')).toHaveTextContent('01/10/2026');
    fireEvent.click(screen.getByLabelText('Data inicial'));
    const calendar = screen.getByRole('dialog', { name: 'Escolher mês — Data inicial' });
    expect(within(calendar).getAllByRole('button', { name: / de 2026$/ })).toHaveLength(12);
    fireEvent.change(within(calendar).getByLabelText('Ano'), { target: { value: '2024' } });
    fireEvent.click(within(calendar).getByRole('button', { name: 'fevereiro de 2024', exact: true }));
    expect(onChange).toHaveBeenCalledWith('2024-02-01');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('limpa a data e bloqueia a escolha de mês com ano inválido', () => {
    const onChange = vi.fn();
    render(<MonthField id="to" label="Data final" value="" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Data final'));
    fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'fevereiro de', exact: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar data', exact: true }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
