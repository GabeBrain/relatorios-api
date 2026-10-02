# Evidência G1 — sequência editorial FIERGS

**Data:** 02/10/2026  
**Entrada visual:** `assets/panorama-fiergs-rs-2T2026 (5).pdf` (74 páginas rasterizadas)  
**Manifesto:** `FIERGS_4T25_SLIDE_MANIFEST` (75 IDs oficiais)

## Reconciliação dos pares repetidos

| Páginas físicas iguais na entrada | IDs oficiais mantidos / removidos | Decisão |
|---|---|---|
| 13 / 18 | 13 / 18 | Mantém 13; remove 18, repetição indistinguível do mesmo indicador. |
| 25 / 30 | 25 / 30 | Mantém 25; remove 30, repetição indistinguível do mesmo indicador. |
| 36 / 55 | 36 / 55 | Mantém 36; remove 55, cópia da distribuição já presente. |
| 37 / 54 | 37 / 54 | Mantém 37; remove 54, cópia da distribuição já presente. |

## Implementação e validação

- `report/manifest.ts` centraliza os IDs excluídos em `FIERGS_REDUNDANT_OFFICIAL_SLIDES`; o manifesto de produção, sumário e exportação consomem a mesma lista ordenada.
- A lâmina anual 41 continua condicional à cobertura; com ela indisponível e as quatro cópias removidas, o deck tem 70 páginas (`75 − 1 − 4`). Com a lâmina anual disponível, são 71.
- `fiergs-manifest.test.ts` verifica sequência contínua, IDs mantidos, ausência dos IDs redundantes e contagens com/sem a lâmina anual.
- `fiergs-editorial-blocks.test.tsx` verifica a posição dos blocos de maturidade, VGV, oferta e comparativos após a renumeração.
- Testes: `npx.cmd vitest run src/features/panorama-secovi-fiergs/__tests__/fiergs-manifest.test.ts src/features/panorama-secovi-fiergs/__tests__/fiergs-editorial-blocks.test.tsx` — **2 arquivos, 5 testes aprovados**. Permanecem avisos conhecidos de dimensões zero do Recharts no ambiente de teste e base Browserslist desatualizada; sem falhas.
- Nenhuma fórmula, número de indicador, dado de origem, `src/features/corretor` ou pasta de referência foi alterado.

## Estado do portão

G1 aprovado. Esta decisão editorial remove somente conteúdo duplicado; não equivale a homologação numérica ou institucional. A arte da página institucional segue pendente do material aprovado do Diego.
