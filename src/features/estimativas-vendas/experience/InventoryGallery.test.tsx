import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InventoryGallery } from './InventoryGallery';
import type { InventoryRow } from '../scientific/study';
import type { Universe } from './domain';
describe('galeria do universo', () => {
  it('pagina sem omitir resultados e volta à primeira página após buscar', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: `Projeto ${i}`, cutoff: '2026-09', stock: 0, tags: [] }) as unknown as InventoryRow);
    const universe = { locations: {} } as Universe;
    render(<InventoryGallery kind="sold" rows={rows} universe={universe} onClose={() => {}} />);
    expect(document.querySelectorAll('.evs-gallery-grid article')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' })); expect(screen.getByText('Projeto 12')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Nome, ID ou cidade'), { target: { value: 'Projeto 24' } });
    expect(document.querySelectorAll('.evs-gallery-grid article')).toHaveLength(1); expect(screen.getByText('Página 1 de 1 · 1 resultados')).toBeTruthy();
  });
});
