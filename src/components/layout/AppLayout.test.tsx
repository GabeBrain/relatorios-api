import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';

vi.mock('./AuthBlock', () => ({ AuthBlock: () => null }));
vi.mock('./CommandPalette', () => ({ CommandPalette: () => null }));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('marca do menu lateral', () => {
  it('troca o logo por ícone vetorial ao recolher e restaura ao expandir', () => {
    render(<MemoryRouter><AppLayout><p>Conteúdo</p></AppLayout></MemoryRouter>);
    expect(screen.getByAltText('Brain')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(screen.queryByAltText('Brain')).not.toBeInTheDocument();
    const expand = screen.getByRole('button', { name: 'Expandir menu' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(expand.querySelector('svg.lucide-brain-circuit')).not.toBeNull();
    expect(expand).toHaveClass('h-8', 'w-8', 'shrink-0');
    fireEvent.click(expand);
    expect(screen.getByAltText('Brain')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recolher menu' })).toHaveAttribute('aria-expanded', 'true');
  });
});
