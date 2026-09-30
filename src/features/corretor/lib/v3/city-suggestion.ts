// Corretor v3 — sugestão de cidade/UF quando a ata não traz a cidade.
// O portão pedia a cidade num campo vazio; no estudo de João Pessoa (30/set) a
// analista não percebeu que precisava preenchê-lo e a análise nunca rodou. O
// nome do arquivo e a capa quase sempre dizem onde é o estudo
// ("…_Joao_Pessoa - PB_V1", "Rolândia – PR"): o portão chega preenchido e o
// analista só confirma.

import municipiosPorUf from '@/assets/municipios-br.json';
import type { Ir } from '../audit/ir';

export interface CitySuggestion { cidade: string; uf: string; origem: 'arquivo' | 'capa' }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const BY_UF = new Map<string, Map<string, string>>(
  Object.entries(municipiosPorUf as Record<string, string[]>).map(([uf, cities]) => [uf.toUpperCase(), new Map(cities.map((c) => [norm(c), c.trim()]))]),
);

/**
 * Procura "… Cidade - UF", "Cidade/UF", "Cidade – UF" num texto. Para cada UF
 * válida, testa as 1..5 palavras imediatamente antes dela contra os municípios
 * daquela UF — o maior casamento vence ("Sao Jose dos Campos" > "Campos").
 */
export function cityFromText(text: string): { cidade: string; uf: string } | null {
  const clean = text.replace(/_/g, ' ').replace(/\s+/g, ' ');
  const rx = /([A-Za-zÀ-ÿ'. ]+?)\s*(?:-|–|—|\/)\s*([A-Z]{2})(?=$|[\s_.,;:)\]-])/g;
  let best: { cidade: string; uf: string; words: number } | null = null;
  for (const m of clean.matchAll(rx)) {
    const uf = m[2].toUpperCase();
    const cities = BY_UF.get(uf);
    if (!cities) continue;
    const words = norm(m[1]).split(' ').filter(Boolean);
    for (let n = Math.min(5, words.length); n >= 1; n--) {
      const city = cities.get(words.slice(-n).join(' '));
      if (city) {
        if (!best || n > best.words) best = { cidade: city, uf, words: n };
        break;
      }
    }
  }
  return best ? { cidade: best.cidade, uf: best.uf } : null;
}

/** UFs em que existe um município com esse nome (há homônimos entre estados). */
export function ufsOfCity(name: string): string[] {
  const key = norm(name);
  return [...BY_UF.entries()].filter(([, cities]) => cities.has(key)).map(([uf]) => uf);
}

/** Nome do arquivo primeiro; depois título e textos dos 3 primeiros slides. */
export function suggestCity(fileName: string, ir?: Pick<Ir, 'slides'> | null): CitySuggestion | null {
  const fromName = cityFromText(fileName);
  if (fromName) return { ...fromName, origem: 'arquivo' };
  for (const slide of (ir?.slides ?? []).slice(0, 3)) {
    const found = cityFromText([slide.titulo ?? '', ...(slide.textos ?? [])].join(' \n '));
    if (found) return { ...found, origem: 'capa' };
  }
  return null;
}
