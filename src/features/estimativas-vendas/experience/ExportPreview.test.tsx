import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExportPreview } from './ExportPreview';
import type { ForecastColumn } from './exportColumns';
function Harness() {
  const [columns, setColumns] = useState<ForecastColumn[]>(['id_empreendimento', 'mes', 'cidade']);
  return <ExportPreview rows={Array.from({ length: 72 }, () => ({ id_empreendimento: '001', mes: '2026-10', cidade: 'Curitiba' }))} columns={columns} onChange={setColumns} disabled={false} />;
}
describe('prévia exportável', () => {
  it('limita a 50 linhas e permite mover por teclado ou arraste', () => {
    render(<Harness />);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(50);
    const move = screen.getByRole('button', { name: 'Mover coluna mes' });
    fireEvent.keyDown(move, { altKey: true, key: 'ArrowLeft' });
    expect(document.querySelector('th[data-column]')?.getAttribute('data-column')).toBe('mes');
    const dataTransfer = { setData() {}, effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'Mover coluna cidade' }), { dataTransfer });
    fireEvent.dragOver(document.querySelector('th[data-column="mes"]')!, { dataTransfer });
    fireEvent.drop(document.querySelector('th[data-column="mes"]')!, { dataTransfer });
    expect(document.querySelector('th[data-column]')?.getAttribute('data-column')).toBe('cidade');
  });
});
