/** Detalhes financeiros ficam nos registros internos, nunca no aviso operacional. */
export function processingMessage(error: unknown, fallback = 'Não foi possível concluir esta etapa. Tente novamente ou procure a equipe de suporte.'): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /custo|gastos?|orçamento|limite autorizado|budget|quota|usd|brl|\bus\$|r\$|cobran|cobrad|tokens?|reserv[ao]|spent|price|billing|créditos?|credits?/i.test(message) ? fallback : message || fallback;
}
