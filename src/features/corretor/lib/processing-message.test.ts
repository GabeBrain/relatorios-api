import { expect, it } from 'vitest';
import { processingMessage } from './processing-message';
it('não expõe valores nem mensagens financeiras do processamento', () => {
  for (const message of ['Orçamento US$ 1 excedido', 'Budget exceeded', 'Reserva pendente: 0.04', '500 tokens / billing error']) {
    expect(processingMessage(new Error(message))).toBe('Não foi possível concluir esta etapa. Tente novamente ou procure a equipe de suporte.');
  }
});
it('preserva orientação operacional sem mudar dados do estudo', () => {
  expect(processingMessage(new Error('Selecione o mesmo PowerPoint.'))).toBe('Selecione o mesmo PowerPoint.');
});
