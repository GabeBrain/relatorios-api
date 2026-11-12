import { expect, it } from 'vitest';
import { plainRecommendation, recommendationBlocks, recommendationBlockText } from './recommendation-presentation';

it('separa título e parágrafo sem exigir linha vazia; mantém números', () => {
  const text = '## Avaliação da Consultoria\n### Sociodemografia e Domicílios\nA população cresce **4,2%**: 73.835 habitantes.\n\n### Renda\nR$ 8.207,69 e 28,8%.\n## Recomendação\nConferir com a equipe.';
  const before = text;
  const blocks = recommendationBlocks(text);
  expect(blocks).toHaveLength(3);
  expect(blocks[0]).toEqual({title:'Sociodemografia e Domicílios',context:'Avaliação da Consultoria',text:'A população cresce 4,2%: 73.835 habitantes.'});
  expect(blocks[1].text).toBe('R$ 8.207,69 e 28,8%.');
  expect(recommendationBlockText(blocks[0])).not.toMatch(/\*\*|###/);
  expect(text).toBe(before);
});
it('cópia e exportação removem Markdown sem perder texto ou links', () => {
  expect(plainRecommendation('## Título\n\n**Forte** e *ênfase*.\n- Item\n[fonte](https://example.org)')).toBe('Título\n\nForte e ênfase.\n• Item\nfonte (https://example.org)');
});
it('conserva saída antiga sem Markdown como um bloco', () => {
  expect(recommendationBlocks('Texto salvo antes.\n\nOutro parágrafo.')).toEqual([{title:'Sugestão de análise',context:'',text:'Texto salvo antes.\n\nOutro parágrafo.'}]);
});
it('não confunde cabeçalhos dentro de código nem transforma HTML em elementos', () => {
  const blocks = recommendationBlocks('## Notas\n```text\n### conteúdo literal\n```\n<script>alert(1)</script>');
  expect(blocks).toHaveLength(1);
  expect(blocks[0].text).toContain('<script>alert(1)</script>');
});
it('limpa tabelas e títulos em negrito preservando valores e ordem', () => {
  expect(plainRecommendation('| Cidade | Valor |\n| --- | --- |\n| Palhoça | 4,2% |')).toContain('Palhoça\t4,2%');
  expect(recommendationBlocks('**Renda e Propriedade**\nTexto.')[0]).toEqual({title:'Renda e Propriedade',context:'',text:'Texto.'});
});
