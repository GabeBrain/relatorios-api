# Evidência da Fase 0 — residual de oferta lançada por tipologia

**Data:** 01/10/2026
**Plano:** `PLAN_PRE_HOMOLOGACAO_FINAL_FIERGS_2T2026_2026-10-01.md`
**Portão:** G0
**Estado:** aprovado

## 1. Delta reproduzido

O PDF `panorama-fiergs-rs-2T2026.pdf` apresentou:

| Projeção do mesmo universo vertical | Unidades lançadas |
|---|---:|
| oferta por padrão | 54.761 |
| oferta por tipologia | 54.698 |
| maturidade por tipologia | 54.761 |
| consolidado vertical | 54.761 |
| **delta** | **63** |

O teste `typology-offer-residual.test.ts` congela a causa mínima: um empreendimento com total lançado conhecido e nenhuma linha tipológica entra no total por padrão e maturidade, mas desaparece do total atualmente calculado por tipologia.

## 2. Matriz por chave

O cruzamento entre `MATRIZ_FIERGS_2T2026-projects.csv` e `MATRIZ_FIERGS_2T2026-typologies.csv`, pela chave canônica `project_key`, encontrou exatamente uma divergência vertical:

| Cidade | Chave | Empreendimento | Lançadas no projeto | Linhas tipológicas | Lançadas tipadas | Residual |
|---|---|---|---:|---:|---:|---:|
| Cachoeirinha | `RS/Cachoeirinha#63001` | Residencial Santa Bárbara | 63 | 0 | 0 | 63 |
| **Total** |  |  | **63** | **0** | **0** | **63** |

A linha completa foi preservada em `evidencias/MATRIZ_RESIDUAL_TIPOLOGIA_FIERGS_2T2026.csv`.

## 3. Ausência não é zero

O projeto informa `launched_units = 63`, mas não informa `final_units` nem `sold_units`. Também não existe linha correspondente no arquivo de tipologias.

Consequentemente, o fato correto é:

- residual lançado: **63**;
- residual final: **indisponível (`null`)**;
- residual vendido: **indisponível (`null`)**.

Converter final ou vendas para zero fabricaria observações que a fonte não forneceu.

## 4. Regressão 4T2025

O mesmo cruzamento foi executado sobre as matrizes de 4T2025. Não foi encontrado projeto vertical com diferença entre o total lançado do projeto e a soma de suas linhas tipológicas. Portanto, a correção deve ser genérica, mas a linha residual não deve aparecer artificialmente nesse período.

## 5. Fatos confirmados

1. As 63 unidades pertencem integralmente a uma única chave canônica.
2. A cidade é Cachoeirinha.
3. O empreendimento é Residencial Santa Bárbara, `building_id = 63001`.
4. O projeto possui 63 unidades lançadas e zero linhas tipológicas.
5. Estoque final e vendas não foram informados; não são zeros observados.
6. `offerByTypology` totaliza apenas linhas tipológicas.
7. A maturidade já evidencia um residual `Não classificado`, mas converte métricas ausentes em zero durante o cálculo residual.
8. Em 4T2025 o residual lançado é zero.

## 6. Hipóteses rejeitadas

- soma duplicada de snapshots;
- divergência entre cidades;
- arredondamento;
- distrato negativo;
- filtro da janela inicial do relatório;
- mistura de segmento horizontal;
- existência de 63 unidades finais ocultas.

## 7. Decisão metodológica para a Fase 1

O total canônico permanece o total do empreendimento. A abertura por tipologia deve:

1. somar as linhas tipológicas observadas;
2. calcular, por empreendimento e por métrica, `total do projeto − soma tipológica`;
3. agregar resíduos em `Não classificado`;
4. preservar `null` quando o total do projeto não foi informado;
5. não limitar a regra ao FIERGS, período ou número 63;
6. não criar a linha residual quando nenhuma métrica possuir diferença observada.

## 8. Fontes e integridade

| Arquivo | SHA-256 |
|---|---|
| `MATRIZ_FIERGS_2T2026-projects.csv` | `B16C83274C4A76AE2E6EDB3C36F83EC3E61620CF677D4EFFEFEDA80DAE90FFC6` |
| `MATRIZ_FIERGS_2T2026-typologies.csv` | `C9E98CDCBE081A8B96AA6EC8727A6A002C839258B330067059E754CBC2BE2DD0` |
| `MATRIZ_FIERGS_4T2025-projects.csv` | `89D0DA2402363310CF693FDB0075AF02524628E3A3EE6B1079EA273A3AFEE66E` |
| `MATRIZ_FIERGS_4T2025-typologies.csv` | `FFC3D83CFF64A44822EE2C5612D3DAC6B1B001B48B0EF2196032208CCCFD7CE0` |

## 9. Portão G0

**APROVADO.** O delta foi integralmente explicado por chave, cidade, empreendimento e ausência de tipologia. A Fase 1 pode começar sem ajuste manual de números.
