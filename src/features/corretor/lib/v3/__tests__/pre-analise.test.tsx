// Pré-análise (v0.63): cidades citadas, perfil de imagens, cofre local e o cartão.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PreAnalysisCard from '../../../components/PreAnalysisCard';
import { otherCities, imageProfile } from '../pre-analysis';
import { savePptx, loadPptx } from '../pptx-store';
import type { Ir } from '../../audit/ir';
import type { TableImageScan } from '../table-images';

const ir = {
  slides: [
    { n: 1, titulo: 'Vocacional | João Pessoa - PB', textos: ['Comparativo com Recife - PE e Natal/RN'], tabelas: [{ linhas: [['a']] }] },
    { n: 2, titulo: 'Mercado', textos: ['Recife - PE lidera', 'Cabedelo - PB'], tabelas: [] },
  ],
} as unknown as Ir;

describe('pré-análise', () => {
  it('lista as outras cidades com UF, sem a principal, por frequência', () => {
    const out = otherCities(ir, { cidade: 'João Pessoa', uf: 'PB' });
    expect(out.map((c) => `${c.cidade}/${c.uf}:${c.vezes}`)).toEqual(['Recife/PE:2', 'Natal/RN:1', 'Cabedelo/PB:1']);
    expect(out[0].slides).toEqual([1, 2]);
  });

  it('perfil de imagens separa tabelas nativas, tabelas em imagem, ilegíveis e o resto', () => {
    const scan = Object.assign(
      [{ tipo: 'tabela' }, { tipo: 'tabela' }, { tipo: 'ficha' }],
      { skipped: [{}], totalImages: 10 },
    ) as unknown as TableImageScan;
    expect(imageProfile(ir, scan)).toEqual({ tabelasNativas: 1, tabelasImagem: 2, fichas: 1, naoLidas: 1, outras: 6 });
  });

  it('cofre local sem IndexedDB não quebra (testes, modo privado)', async () => {
    expect(await savePptx('x', 'a.pptx', new Uint8Array([1]))).toBe(false);
    expect(await loadPptx('x')).toBeNull();
  });
});

describe('cartão de pré-análise', () => {
  const props = {
    ata: null, suggestion: { cidade: 'João Pessoa', uf: 'PB', origem: 'arquivo' as const },
    cities: [{ cidade: 'Recife', uf: 'PE', vezes: 2, slides: [1, 2] }],
    profile: { tabelasNativas: 17, tabelasImagem: 120, fichas: 18, naoLidas: 0, outras: 30 },
    costBrl: 'R$ 3,48', running: false, temFonte: false, sourceLabel: null, onAttachSources: () => {},
  };

  it('chega com a cidade sugerida, exige decidir sobre planilhas e envia as outras cidades marcadas', () => {
    const onConfirm = vi.fn();
    render(<PreAnalysisCard {...props} onConfirm={onConfirm} />);
    expect((screen.getByPlaceholderText('ex.: Guarulhos') as HTMLInputElement).value).toBe('João Pessoa');
    const run = screen.getByRole('button', { name: /Rodar análise/ });
    expect(run).toBeDisabled();
    expect(screen.getByText('Falta dizer se o estudo tem planilhas.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Recife\/PE/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Não tem' }));
    expect(run).not.toBeDisabled();
    fireEvent.click(run);
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ cidade: 'João Pessoa', uf: 'PB', outras: ['Recife'], planilhas: 'nao-tem' }));
  });

  it('avisa quando há tabelas coladas como imagem', () => {
    render(<PreAnalysisCard {...props} onConfirm={() => {}} />);
    expect(screen.getByText(/Tabelas coladas como imagem são lidas por IA/)).toBeTruthy();
    expect(screen.getByText('138')).toBeTruthy();
  });
});
