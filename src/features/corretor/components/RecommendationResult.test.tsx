import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import RecommendationResult from './RecommendationResult';
it('copia só o bloco escolhido sem Markdown e sem perder o contexto', async () => {
  const copy=vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:copy}});
  const text='## Avaliação\n### Renda\n**R$ 8.207,69** por domicílio.\n### Estoque\n42 unidades.';
  render(<RecommendationResult text={text}/>);
  fireEvent.click(screen.getByRole('button',{name:'Copiar bloco: Renda'}));
  await waitFor(()=>expect(copy).toHaveBeenCalledWith('Avaliação\n\nRenda\n\nR$ 8.207,69 por domicílio.'));
  expect(copy.mock.calls[0][0]).not.toContain('42 unidades');
  expect(screen.getByText('42 unidades.')).toBeInTheDocument();
});
