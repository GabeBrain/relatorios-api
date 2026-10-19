export type StudySection = 'resumo' | 'revisao' | 'recomendacao' | 'materiais' | 'historico';
const sections: StudySection[] = ['resumo', 'revisao', 'recomendacao', 'materiais', 'historico'];
export function studySection(value?: string): StudySection { return sections.includes(value as StudySection) ? value as StudySection : 'resumo'; }
/** Retorno só para a carteira local e com parâmetros conhecidos, nunca uma URL arbitrária. */
export function portfolioSearch(value = ''): string {
  const input = new URLSearchParams(value), output = new URLSearchParams();
  for (const key of ['q', 'filter', 'page', 'scope', 'group', 'groupKey', 'received']) { const v = input.get(key); if (v) output.set(key, v); }
  return output.toString();
}
export function portfolioHref(context = ''): string {
  const query = portfolioSearch(context);
  return `/corretor${query ? `?${query}` : ''}`;
}
export function studyHref(id: string, section: StudySection = 'resumo', context = '', version?: string): string {
  const params = new URLSearchParams();
  const search = portfolioSearch(context);
  if (search) params.set('carteira', search);
  if (version) params.set('version', version);
  const query = params.toString();
  return `/corretor/estudos/${encodeURIComponent(id)}/${section}${query ? `?${query}` : ''}`;
}
export function legacyStudyHref(id: string, params: URLSearchParams): string {
  const tab = params.get('tab');
  const section = tab === 'materials' ? 'materiais' : tab === 'history' ? 'historico' : 'resumo';
  return studyHref(id, section, params.get('carteira') ?? '', params.get('version') ?? undefined);
}
