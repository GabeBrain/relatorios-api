import { describe, expect, it } from 'vitest';
import { SECOVI_SP_POLICY, classifyHorizontalSubtype, entityPolicy } from '../domain/entity-policy';
import {
  UNCLASSIFIED,
  canonicalStandard,
  canonicalTypology,
  cohortBuckets,
  cohortLabelOf,
  maturityOfMonths,
  orderStandards,
  orderTypologies,
} from '../domain/taxonomy';

describe('OP-1 · política de universo Secovi (G-03)', () => {
  it('aceita todo empreendimento vertical, qualquer que seja o texto de subtipo', () => {
    for (const rawType of ['Vertical', 'Residencial Vertical', 'vertical']) {
      expect(SECOVI_SP_POLICY.classify({ segment: 'Vertical', rawType }).accepted).toBe(true);
    }
  });

  it('aceita no horizontal somente o subtipo canônico Condomínio de Casas', () => {
    const decision = SECOVI_SP_POLICY.classify({ segment: 'Horizontal', rawSubtype: 'Condomínio de Casas' });
    expect(decision.accepted).toBe(true);
    expect(decision.horizontalSubtype).toBe('condominio_casas');
  });

  it('recusa loteamento mesmo quando a API o devolve como Horizontal', () => {
    const decision = SECOVI_SP_POLICY.classify({ segment: 'Horizontal', rawSubtype: 'Loteamento Aberto' });
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('horizontal_fora_da_politica');
  });

  it('não infere que todo Horizontal é condomínio de casas: sem subtipo, recusa (rejeita PRE-002)', () => {
    const decision = SECOVI_SP_POLICY.classify({ segment: 'Horizontal' });
    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('subtipo_horizontal_indefinido');
  });

  it('recusa segmento desconhecido em vez de escolher um lado', () => {
    expect(SECOVI_SP_POLICY.classify({ segment: null, rawType: 'Comercial' }).reason).toBe('segmento_desconhecido');
  });

  it('classifica o subtipo horizontal por subtipo, tipo ou nome, nessa ordem de confiança', () => {
    expect(classifyHorizontalSubtype({ segment: 'Horizontal', rawSubtype: 'Cond. de Casas' })).toBe('condominio_casas');
    expect(classifyHorizontalSubtype({ segment: 'Horizontal', rawName: 'Residencial Loteamento Bela Vista' })).toBe('loteamento');
    expect(classifyHorizontalSubtype({ segment: 'Horizontal', rawSubtype: 'Casas Geminadas' })).toBe('outro');
    expect(classifyHorizontalSubtype({ segment: 'Horizontal' })).toBe('indefinido');
  });

  it('`Horizontal` sozinho é o segmento repetido, não evidência de subtipo', () => {
    // Se `building_type` contasse como evidência, `indefinido` nunca ocorreria e a premissa
    // PRE-002 voltaria pela porta dos fundos: todo horizontal viraria condomínio por omissão.
    expect(classifyHorizontalSubtype({ segment: 'Horizontal', rawType: 'Horizontal' })).toBe('indefinido');
    expect(classifyHorizontalSubtype({ segment: 'Horizontal', rawType: 'Residencial Horizontal', rawName: 'Horizontal' })).toBe('indefinido');
    expect(SECOVI_SP_POLICY.classify({ segment: 'Horizontal', rawType: 'Horizontal' }).accepted).toBe(false);
  });

  it('mantém a extensão FIERGS explícita, sem herdar a regra Secovi em silêncio', () => {
    expect(() => entityPolicy('fiergs-rs')).toThrow(/fiergs-rs/);
    expect(entityPolicy().id).toBe('secovi-sp');
  });
});

describe('OP-1 · taxonomia de tipologias (slides 34–37, 45, 46)', () => {
  it('canoniza as grafias reais da API para os quatro rótulos oficiais', () => {
    expect(canonicalTypology('1 dorm')).toBe('1 Dormitório');
    expect(canonicalTypology('2 Dormitórios')).toBe('2 Dormitórios');
    expect(canonicalTypology('3 dormitorios')).toBe('3 Dormitórios');
    expect(canonicalTypology('4+')).toBe('4 ou + Dormitórios');
    expect(canonicalTypology('4 ou mais dormitórios')).toBe('4 ou + Dormitórios');
    expect(canonicalTypology('5 dormitórios')).toBe('4 ou + Dormitórios');
  });

  it('trata studio e afins como 1 dormitório', () => {
    expect(canonicalTypology('Studio')).toBe('1 Dormitório');
    expect(canonicalTypology('kitnet')).toBe('1 Dormitório');
  });

  it('marca desconhecido explicitamente em vez de descartar a linha', () => {
    expect(canonicalTypology('')).toBe(UNCLASSIFIED);
    expect(canonicalTypology('Comercial')).toBe(UNCLASSIFIED);
    expect(canonicalTypology(null)).toBe(UNCLASSIFIED);
  });

  it('ordena exatamente 1 → 2 → 3 → 4 ou +, com desconhecido ao final', () => {
    expect(orderTypologies(['4 ou + Dormitórios', UNCLASSIFIED, '1 Dormitório', '3 Dormitórios']))
      .toEqual(['1 Dormitório', '3 Dormitórios', '4 ou + Dormitórios', UNCLASSIFIED]);
  });
});

describe('OP-1 · taxonomia de padrões (slides 38, 39, 51)', () => {
  it('canoniza os sete padrões Secovi, com e sem acento', () => {
    expect(canonicalStandard('economico')).toBe('Econômico');
    expect(canonicalStandard('Médio Alto')).toBe('Médio-Alto');
    expect(canonicalStandard('medio-alto')).toBe('Médio-Alto');
    expect(canonicalStandard('Alto')).toBe('Alto');
    expect(canonicalStandard('Standard')).toBe('Standard');
    expect(canonicalStandard('Compacto')).toBe('Compacto');
    expect(canonicalStandard('Luxo')).toBe('Luxo');
  });

  it('colapsa Super Luxo em Luxo e Especial em Compacto (PRE-008), mantendo sete linhas', () => {
    expect(canonicalStandard('Super Luxo')).toBe('Luxo');
    expect(canonicalStandard('Especial')).toBe('Compacto');
  });

  it('não confunde Médio-Alto com Alto nem com Médio', () => {
    expect(canonicalStandard('Médio-Alto')).not.toBe('Alto');
    expect(canonicalStandard('Médio')).toBe('Médio');
  });

  it('ordena na sequência canônica exigida pela analista', () => {
    expect(orderStandards(['Luxo', 'Econômico', 'Alto', 'Compacto', 'Médio-Alto', 'Standard', 'Médio']))
      .toEqual(['Compacto', 'Econômico', 'Standard', 'Médio', 'Médio-Alto', 'Alto', 'Luxo']);
  });
});

describe('OP-1 · coortes por ano de lançamento (slides 33, 41, 42, 48)', () => {
  // JG-22/26/27: o subtotal soma os lançados APÓS 2024 e fica DEPOIS da linha de 2026.
  it('agrupa até 2022, mantém os anos e põe o subtotal pós-2024 depois de 2026', () => {
    const buckets = cohortBuckets([2018, 2020, 2022, 2023, 2024, 2025, 2026]);
    expect(buckets.map((bucket) => bucket.label))
      .toEqual(['Até 2022', '2023', '2024', '2025', '2026', 'Subtotal lançados após 2024', 'Total geral']);
  });

  it('o subtotal soma somente os anos posteriores a 2024', () => {
    const buckets = cohortBuckets([2019, 2023, 2024, 2025, 2026]);
    const subtotal = buckets.find((bucket) => bucket.label === 'Subtotal lançados após 2024')!;
    expect(subtotal.kind).toBe('subtotal');
    expect([...subtotal.years].sort()).toEqual([2025, 2026]);
    // A prova de que anos anteriores não entram: nenhum ano <= 2024 aparece no subtotal.
    expect(subtotal.years.every((year) => year > 2024)).toBe(true);
  });

  it('posiciona o subtotal imediatamente após o último ano e antes do total geral', () => {
    const labels = cohortBuckets([2023, 2024, 2025, 2026]).map((bucket) => bucket.label);
    expect(labels.indexOf('Subtotal lançados após 2024')).toBe(labels.indexOf('2026') + 1);
    expect(labels.at(-1)).toBe('Total geral');
  });

  it('sem ano posterior a 2024, não cria linha de subtotal vazia', () => {
    expect(cohortBuckets([2019, 2023, 2024]).map((bucket) => bucket.label))
      .toEqual(['Até 2022', '2023', '2024', 'Total geral']);
  });

  it('não produz lista longa 2000–2022: todos viram uma única linha', () => {
    const years = Array.from({ length: 23 }, (_, index) => 2000 + index);
    const buckets = cohortBuckets(years);
    expect(buckets.filter((bucket) => bucket.kind === 'cohort')).toHaveLength(1);
    expect(buckets[0].label).toBe('Até 2022');
  });

  it('devolve lista vazia quando não há coorte, em vez de fabricar linhas', () => {
    expect(cohortBuckets([])).toEqual([]);
  });

  it('mapeia o ano para o rótulo da coorte', () => {
    expect(cohortLabelOf(2015)).toBe('Até 2022');
    expect(cohortLabelOf(2022)).toBe('Até 2022');
    expect(cohortLabelOf(2025)).toBe('2025');
  });
});

describe('OP-1 · maturidade (PRE-007)', () => {
  it('aplica as faixas 0–6 / 7–36 / 37+ meses', () => {
    expect(maturityOfMonths(0)).toBe('Planta');
    expect(maturityOfMonths(6)).toBe('Planta');
    expect(maturityOfMonths(7)).toBe('Construção');
    expect(maturityOfMonths(36)).toBe('Construção');
    expect(maturityOfMonths(37)).toBe('Pronto');
  });

  it('não classifica idade ausente ou negativa como Planta', () => {
    expect(maturityOfMonths(null)).toBeNull();
    expect(maturityOfMonths(-3)).toBeNull();
  });
});
