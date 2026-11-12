import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimeControls } from './Controls';
describe('períodos disponíveis', () => {
  it('anterior/próximo percorrem apenas registros disponíveis e mantêm duração', () => {
    const onChange = vi.fn(); const spec = { cutoff: '2026-05', duration: 12, methods: ['constant' as const] };
    const view = render(<TimeControls spec={spec} periods={['2026-02', '2026-05', '2026-08']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Período anterior' })); expect(onChange).toHaveBeenLastCalledWith({ ...spec, cutoff: '2026-02' });
    fireEvent.click(screen.getByRole('button', { name: 'Próximo período' })); expect(onChange).toHaveBeenLastCalledWith({ ...spec, cutoff: '2026-08' });
    fireEvent.click(screen.getByRole('button', { name: '6 meses' })); expect(onChange).toHaveBeenLastCalledWith({ ...spec, duration: 6 });
    expect(document.querySelector('input[type=month],input[type=range]')).toBeNull();
    view.rerender(<TimeControls spec={{ ...spec, cutoff: '2026-02' }} periods={['2026-02', '2026-05', '2026-08']} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Período anterior' })).toBeDisabled();
  });
});
