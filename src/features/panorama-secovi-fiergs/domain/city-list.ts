import { normalizeText } from './taxonomy';

const key = (value: string) => normalizeText(value).replace(/\s+/g, ' ').trim();
/** Nomes exatos do catálogo da UF; nunca faz aproximação ou busca fora da conta. */
export function matchCityList(text: string, options: string[]) {
  const catalog = new Map(options.map((city) => [key(city), city]));
  const matched: string[] = [], missing: string[] = [];
  const chunks = text.split(/[,;\n\r]+/).map((part) => part.trim()).filter(Boolean);
  let conjunctionSplit = false;
  for (const chunk of chunks) {
    if (catalog.has(key(chunk))) { matched.push(catalog.get(key(chunk))!); continue; }
    const parts = chunk.split(/\s+e\s+/i);
    conjunctionSplit ||= parts.length > 1;
    for (let i = 0; i < parts.length;) {
      let found: string | undefined, end = i + 1;
      // Preserva nomes oficiais com "e" interno antes de interpretá-lo como separador.
      for (let j = parts.length; j > i; j--) {
        const candidate = catalog.get(key(parts.slice(i, j).join(' e ')));
        if (candidate) { found = candidate; end = j; break; }
      }
      if (found) matched.push(found); else missing.push(parts[i].trim());
      i = end;
    }
  }
  return { isList: /[,;\n\r]/.test(text) || conjunctionSplit,
    matched: [...new Set(matched)], missing: [...new Map(missing.map((name) => [key(name),name])).values()] };
}
