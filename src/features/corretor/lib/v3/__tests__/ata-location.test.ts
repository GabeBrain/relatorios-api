// Regressão da derivação cidade/UF a partir do trecho literal da ata.
// Espelha `normalizeAtaLocation` da Edge Function `analyze-ata-image`: a lógica
// vive lá (Deno), mas o contrato é testado aqui para não regredir em silêncio.
// Caso real (jul/2026): a ata da Housi escreve "Rolândia PR", sem barra, e o
// padrão anterior (`Cidade/UF`) devolvia null — o portão abria sem cidade.

import { describe, expect, it } from 'vitest';

const UF_LIST = 'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SE|SP|TO';

function cityUfFrom(source: string): { cidade: string; uf: string } | null {
  const match = source.match(new RegExp(`([^|,/\\n]+?)\\s*(?:[/\\-–—]\\s*|\\s)(${UF_LIST})\\b`, 'i'));
  if (!match) return null;
  const cidade = match[1].trim().replace(/^[|,\-–—\s]+/, '').replace(/\s+(?:pr|sp|mg|rs|sc|go|ba|pe|ce)$/i, '');
  return cidade ? { cidade, uf: match[2].toUpperCase() } : null;
}

describe('cidade/UF a partir do trecho literal da ata', () => {
  it('aceita os separadores usados nas atas reais', () => {
    expect(cityUfFrom('... bairro São Roque | Guarulhos/SP')).toEqual({ cidade: 'Guarulhos', uf: 'SP' });
    expect(cityUfFrom('Brumadinho/MG')).toEqual({ cidade: 'Brumadinho', uf: 'MG' });
    expect(cityUfFrom('Rolândia - PR')).toEqual({ cidade: 'Rolândia', uf: 'PR' });
    // Sem separador: formato da ata multi-estudo da Housi.
    expect(cityUfFrom('Rolândia PR')).toEqual({ cidade: 'Rolândia', uf: 'PR' });
    expect(cityUfFrom('Toledo PR')).toEqual({ cidade: 'Toledo', uf: 'PR' });
    expect(cityUfFrom('São José dos Campos SP')).toEqual({ cidade: 'São José dos Campos', uf: 'SP' });
  });

  it('não inventa UF a partir de sigla que não é estado', () => {
    expect(cityUfFrom('Santos FC')).toBeNull();
    expect(cityUfFrom('sem cidade aqui')).toBeNull();
  });
});
