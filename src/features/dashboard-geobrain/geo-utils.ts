import MUNICIPIOS_BR from '@/assets/municipios-br.json';

/** Reverse lookup: city name → UF (case/accent-insensitive). Precomputed once. */
const CITY_TO_UF: Map<string, string> = (() => {
  const map = new Map<string, string>();
  const dict = MUNICIPIOS_BR as Record<string, string[]>;
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  for (const [uf, cities] of Object.entries(dict)) {
    for (const c of cities) map.set(norm(c), uf);
  }
  return map;
})();

export function ufFromCity(city: string): string | null {
  const norm = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return CITY_TO_UF.get(norm) ?? null;
}
