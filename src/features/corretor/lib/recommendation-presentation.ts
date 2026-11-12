export interface RecommendationBlock { title: string; context: string; text: string }

/** Projeção de leitura. Nunca modifica o Markdown original persistido. */
export function plainRecommendation(text: string): string {
  return text.replace(/\r\n?/g, '\n')
    .replace(/^\s*```[^\n]*$/gm, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm, '$1')
    .replace(/!\[([^\]]*)\]\([^\n)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^\n)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_match, a, b) => a ?? b)
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,;:!?)])/gm, '$1$2')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,;:!?)])/gm, '$1$2')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, '')
    .replace(/^\s*([-*_])(?:\s*\1){2,}\s*$/gm, '')
    .split('\n').map(line => /^\s*\|.*\|\s*$/.test(line) ? line.trim().slice(1,-1).split('|').map(cell => cell.trim()).join('\t') : line.trimEnd()).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

export function recommendationBlocks(source: string): RecommendationBlock[] {
  const blocks: RecommendationBlock[] = [];
  let title = '', context = '', parent = '', body: string[] = [], fenced = false;
  function flush() {
    const text = plainRecommendation(body.join('\n'));
    if (title || text) blocks.push({title: title || 'Sugestão de análise', context, text});
    body = [];
  }
  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*```/.test(line)) { fenced = !fenced; body.push(line); continue; }
    const heading = !fenced && line.match(/^[ \t]{0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
    const boldTitle = !fenced && line.match(/^\s*\*\*([^*]+)\*\*\s*$/);
    if (heading || boldTitle) {
      flush();
      const level = heading ? heading[1].length : 3;
      title = plainRecommendation(heading ? heading[2] : boldTitle![1]);
      context = level > 2 ? parent : '';
      if (level <= 2) parent = title;
    } else body.push(line);
  }
  flush();
  // Um título de seção sem corpo vira contexto dos tópicos seguintes.
  return blocks.filter((block, index) => block.text || index === blocks.length - 1 || blocks[index + 1].context !== block.title);
}

export function recommendationBlockText(block: RecommendationBlock): string {
  return [block.context, block.title, block.text].filter(Boolean).join('\n\n');
}
