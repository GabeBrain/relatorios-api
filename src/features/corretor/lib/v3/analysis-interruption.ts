/** Falha técnica de imagem não significa que o usuário pediu pausa. */
export function analysisInterruption(pausedByUser: boolean, failedSlides: readonly number[]) {
  const slides = [...new Set(failedSlides.filter(Number.isInteger))].sort((a, b) => a - b);
  if (!pausedByUser && !slides.length) return null;
  if (pausedByUser) return {
    kind: 'paused' as const,
    title: 'Avaliação pausada',
    message: 'A avaliação foi pausada. Os resultados confirmados estão guardados; confira as etapas pendentes antes de retomar.',
  };
  return {
    kind: 'image_failures' as const,
    title: 'Avaliação incompleta',
    message: `A leitura não foi confirmada nos slides ${slides.join(', ')}. Os resultados das outras etapas estão guardados e podem ser revisados. Você pode continuar as etapas restantes; não é necessário reenviar os documentos.`,
  };
}
