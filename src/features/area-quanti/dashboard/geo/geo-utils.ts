// UF metadata + normalization helpers for the drill-down map.
export interface UFInfo { uf: string; name: string; ibge: string }

export const UF_LIST: UFInfo[] = [
  { uf: 'AC', name: 'Acre', ibge: '12' },
  { uf: 'AL', name: 'Alagoas', ibge: '27' },
  { uf: 'AP', name: 'Amapá', ibge: '16' },
  { uf: 'AM', name: 'Amazonas', ibge: '13' },
  { uf: 'BA', name: 'Bahia', ibge: '29' },
  { uf: 'CE', name: 'Ceará', ibge: '23' },
  { uf: 'DF', name: 'Distrito Federal', ibge: '53' },
  { uf: 'ES', name: 'Espírito Santo', ibge: '32' },
  { uf: 'GO', name: 'Goiás', ibge: '52' },
  { uf: 'MA', name: 'Maranhão', ibge: '21' },
  { uf: 'MT', name: 'Mato Grosso', ibge: '51' },
  { uf: 'MS', name: 'Mato Grosso do Sul', ibge: '50' },
  { uf: 'MG', name: 'Minas Gerais', ibge: '31' },
  { uf: 'PA', name: 'Pará', ibge: '15' },
  { uf: 'PB', name: 'Paraíba', ibge: '25' },
  { uf: 'PR', name: 'Paraná', ibge: '41' },
  { uf: 'PE', name: 'Pernambuco', ibge: '26' },
  { uf: 'PI', name: 'Piauí', ibge: '22' },
  { uf: 'RJ', name: 'Rio de Janeiro', ibge: '33' },
  { uf: 'RN', name: 'Rio Grande do Norte', ibge: '24' },
  { uf: 'RS', name: 'Rio Grande do Sul', ibge: '43' },
  { uf: 'RO', name: 'Rondônia', ibge: '11' },
  { uf: 'RR', name: 'Roraima', ibge: '14' },
  { uf: 'SC', name: 'Santa Catarina', ibge: '42' },
  { uf: 'SP', name: 'São Paulo', ibge: '35' },
  { uf: 'SE', name: 'Sergipe', ibge: '28' },
  { uf: 'TO', name: 'Tocantins', ibge: '17' },
];

const BY_UF = new Map(UF_LIST.map((u) => [u.uf, u]));
const BY_NAME = new Map(UF_LIST.map((u) => [strip(u.name), u]));

export function strip(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Best-effort UF resolver — accepts UF code or full name. */
export function toUF(v: string): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (BY_UF.has(s.toUpperCase())) return s.toUpperCase();
  return BY_NAME.get(strip(s))?.uf ?? null;
}

export function ufInfo(uf: string): UFInfo | undefined {
  return BY_UF.get(uf.toUpperCase());
}

/** URL for a UF's municipalities GeoJSON (tbrugz/geodata-br, via jsDelivr). */
export function municipalitiesUrl(uf: string): string {
  const info = ufInfo(uf);
  if (!info) throw new Error(`UF desconhecida: ${uf}`);
  return `https://cdn.jsdelivr.net/gh/tbrugz/geodata-br@master/geojson/geojs-${info.ibge}-mun.json`;
}
