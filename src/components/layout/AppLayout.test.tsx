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
  it('recolhe em Estimativas no celular, abre em sobreposição e fecha com Escape', () => {
    const media=vi.spyOn(window,'matchMedia').mockImplementation(() => ({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList));
    try {
      render(<MemoryRouter initialEntries={['/rebrain/estimativas-vendas']}><AppLayout><p>Conteúdo</p></AppLayout></MemoryRouter>);
      fireEvent.click(screen.getByRole('button',{name:'Expandir menu'}));
      expect(screen.getByRole('complementary')).toHaveClass('fixed');
      fireEvent.keyDown(window,{key:'Escape'});
      expect(screen.getByRole('button',{name:'Expandir menu'})).toHaveAttribute('aria-expanded','false');
      expect(screen.getByRole('complementary')).toHaveClass('w-14');
      expect(JSON.parse(localStorage.getItem('brain-sidebar-state')!).collapsed).toBe(false);
    } finally {media.mockRestore();}
  });
  it('mostra Estimativas como link direto antes do Banco Quanti', () => {
    render(<MemoryRouter><AppLayout><p>Conteúdo</p></AppLayout></MemoryRouter>);
    const estimates = screen.getByRole('link', { name: /Estimativas de Vendas/i });
    const quanti = screen.getByRole('link', { name: /Banco Quanti/i });
    expect(estimates).toHaveAttribute('href', '/rebrain/estimativas-vendas');
    expect(estimates.compareDocumentPosition(quanti) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('Simulador de Vendas')).not.toBeInTheDocument();
  });
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
