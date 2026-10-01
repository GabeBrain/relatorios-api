import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PanoramaQuarterRangePicker } from '../components/PanoramaQuarterRangePicker';

describe('PanoramaQuarterRangePicker', () => {
  it('aplica o intervalo no segundo clique sem exigir confirmação', () => {
    const onChange = vi.fn();
    render(<PanoramaQuarterRangePicker start="1T2023" end="2T2026" options={['1T2023', '2T2023', '3T2023', '4T2023']} onChange={onChange}/>);

    fireEvent.click(screen.getByRole('button', { name: /1T 2023 – 2T 2026/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar 2T2023' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar 4T2023' }));

    expect(onChange).toHaveBeenCalledWith('2T2023', '4T2023');
    expect(screen.queryByText('Confirmar período')).not.toBeInTheDocument();
  });
});
