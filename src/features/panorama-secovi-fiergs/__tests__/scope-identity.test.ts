import { describe, expect, it } from 'vitest';
import { FIERGS_RM_PORTO_ALEGRE_PRESET } from '../presets';
import { panoramaCitiesAuthorized, panoramaScopeIdentity } from '../scope-identity';

describe('identidade territorial FIERGS', () => {
  const official = FIERGS_RM_PORTO_ALEGRE_PRESET.scope;
  it('reconhece somente o conjunto oficial completo, independentemente da ordem/acentos', () => {
    expect(panoramaScopeIdentity({ ...official, cities: [...official.cities].reverse().map((city) => city.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) }).official).toBe(true);
    expect(panoramaScopeIdentity({ ...official, cities: ['Porto Alegre', ...official.cities.slice(1)] }).official).toBe(false);
    expect(panoramaScopeIdentity({ ...official, uf: 'SP' }).official).toBe(false);
    expect(panoramaScopeIdentity({ ...official, entity: 'secovi-sp' }).official).toBe(false);
  });
  it('identifica cidade única e outra UF sem texto regional', () => {
    expect(panoramaScopeIdentity({ ...official, cities: ['Porto Alegre'] })).toMatchObject({ shortLabel: 'Porto Alegre/RS', fileSlug: 'fiergs-rs-porto-alegre', official: false });
    expect(panoramaScopeIdentity({ ...official, cities: ['Curitiba'], uf: 'PR' })).toMatchObject({ coverTitle: 'Curitiba · PR', fileSlug: 'fiergs-pr-curitiba' });
  });
  it('distingue conjuntos com o mesmo prefixo e preserva estabilidade por ordem', () => {
    const a = { ...official, cities: ['Alvorada', 'Canoas', 'Esteio', 'Guaíba'] };
    const b = { ...a, cities: ['Alvorada', 'Canoas', 'Esteio', 'Viamão'] };
    expect(panoramaScopeIdentity(a).fileSlug).not.toBe(panoramaScopeIdentity(b).fileSlug);
    expect(panoramaScopeIdentity(a).fileSlug).toBe(panoramaScopeIdentity({ ...a, cities: [...a.cities].reverse() }).fileSlug);
  });
  it('exige autorização de todas as cidades selecionadas', () => {
    expect(panoramaCitiesAuthorized(['Canoas', 'Viamão'], ['Canoas'])).toBe(false);
    expect(panoramaCitiesAuthorized(['Viamão'], ['Viamao'])).toBe(true);
    expect(panoramaCitiesAuthorized([], ['Canoas'])).toBe(false);
  });
});
