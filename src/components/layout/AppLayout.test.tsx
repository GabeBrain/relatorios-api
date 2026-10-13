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
  it('enquadra o símbolo do logo original ao recolher e restaura a marca ao expandir', () => {
    render(<MemoryRouter><AppLayout><p>Conteúdo</p></AppLayout></MemoryRouter>);
    expect(screen.getByAltText('Brain')).toBeInTheDocument();
    const originalLogo = screen.getByAltText('Brain').getAttribute('src');
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(screen.queryByAltText('Brain')).not.toBeInTheDocument();
    const expand = screen.getByRole('button', { name: 'Expandir menu' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    const symbol = expand.querySelector('svg[data-brand="brain-symbol"]');
    expect(symbol).toHaveAttribute('viewBox', '650 248 142 100');
    expect(symbol?.querySelector('image')).toHaveAttribute('href', originalLogo);
    expect(symbol?.querySelector('image')).toHaveAttribute('clip-path', 'url(#brain-sidebar-symbol-crop)');
    expect(expand).toHaveClass('h-8', 'w-8', 'shrink-0');
    fireEvent.click(expand);
    expect(screen.getByAltText('Brain')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recolher menu' })).toHaveAttribute('aria-expanded', 'true');
  });
});
