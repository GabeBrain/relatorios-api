import { describe, expect, it } from 'vitest';
import { visibleBuildings } from './selection';
import type { Building } from './source';
import type { Decision } from './research';

describe('seleção de empreendimentos', () => {
  it('mantém todos os 371 IDs pesquisáveis e filtra elegíveis só por escolha explícita', () => {
    const buildings: Building[] = Array.from({ length: 371 }, (_, i) => ({ building_id: i + 1, name: `Projeto ${i + 1}`, typologies_history: [] }));
    const decisions = new Map<string, Decision>([['371', { id: '371', name: 'Projeto 371', reason: 'Elegível', projection: { id: '371' } as Decision['projection'] }]]);
    expect(visibleBuildings(buildings, '', false, decisions)).toHaveLength(371);
    expect(visibleBuildings(buildings, '371', false, decisions).map(b => b.building_id)).toEqual([371]);
    expect(visibleBuildings(buildings, '', true, decisions).map(b => b.building_id)).toEqual([371]);
  });
});
