# Evidência pré-homologação — Fase 1: completude tipológica

**Data:** 01/10/2026

**Escopo:** FIERGS 2T2026 e regressão FIERGS 4T2025

**Portão:** G1

## 1. Resultado

O portão G1 foi aprovado. A oferta por tipologia, a maturidade por tipologia e as dimensões por padrão agora partem do mesmo total canônico por empreendimento. Nenhum total de período, cidade ou empreendimento foi fixado no runtime.

## 2. Fatos confirmados

### 2T2026

- O delta anterior de 63 unidades pertencia integralmente a `RS/Cachoeirinha#63001`, Residencial Santa Bárbara.
- O projeto declara 63 unidades lançadas, não possui linha tipológica e não informa estoque final nem vendas.
- A linha derivada `Não classificado` passou a representar `63 lançadas / null finais / null vendidas`.
- Os totais de oferta por padrão, tipologia, maturidade por padrão e maturidade por tipologia fecharam em `54.761 lançadas / 5.251 finais`.
- Vendas verticais permaneceram em 1.091; o horizontal permaneceu em `129 / 30.476 / 3.365`; os mapas permaneceram em `648 = 519 + 129`.
- As 23 linhas da reconciliação autenticada fecharam e o resultado foi `homologable: true`.

### 4T2025

- Na matriz congelada usada no G0, o empreendimento 63001 não produzia residual no recorte 4T2025.
- Na consulta autenticada atual, a fonte passou a incluir o mesmo residual lançado de 63 unidades sem linha tipológica.
- Esta diferença é tratada como variação do snapshot da fonte, não como exceção de período nem como número artificial.
- Com a fonte atual, padrão, tipologia e as duas aberturas de maturidade fecharam em `53.295 lançadas / 5.855 finais`.
- As regressões aprovadas permaneceram em 1.524 vendas, 5.855 unidades finais e horizontal `121 / 28.413 / 2.840`; todas as linhas da reconciliação fecharam.

## 3. Matriz antes/depois

| Período/dimensão | Antes — lançadas/finais | Depois — lançadas/finais | Resultado |
|---|---:|---:|---|
| 2T2026 — tipologia | 54.698 / 5.251 | 54.761 / 5.251 | residual 63 representado |
| 2T2026 — padrão | 54.761 / 5.251 | 54.761 / 5.251 | preservado |
| 2T2026 — maturidade/tipologia | 54.761 / 5.251 | 54.761 / 5.251 | mesma política residual |
| 2T2026 — maturidade/padrão | 54.761 / 5.251 | 54.761 / 5.251 | preservado |
| 4T2025 — quatro dimensões, fonte atual | — | 53.295 / 5.855 | reconciliadas |

## 4. Decisão metodológica

Para cada empreendimento e para cada métrica (`launchedUnits`, `finalUnits`, `soldUnits`), o modelo calcula:

`residual = total declarado pelo empreendimento − soma das linhas tipológicas observadas`

- ausência no total declarado permanece `null`;
- linhas tipológicas ausentes não são confundidas com um zero declarado;
- o residual é agregado em `Não classificado` e fundido a uma linha já existente, sem duplicação;
- a contagem de empreendimentos é distinta;
- resíduos negativos são preservados como evidência de sobrecobertura, sem compensação silenciosa; seu bloqueio de exportação pertence à Fase 2;
- a linha total continua derivada diretamente do universo canônico de empreendimentos.

## 5. Hipóteses rejeitadas

- correção fixa de 63 unidades;
- exceção por 2T2026, 4T2025, cidade ou empreendimento;
- conversão de estoque/vendas ausentes em zero;
- alteração da fonte ou compensação em outra tipologia;
- mudança do universo horizontal, vendas ou mapas.

## 6. Arquivos afetados

- `src/features/panorama-secovi-fiergs/domain/aggregations.ts`: política comum de residual tipológico e totais canônicos.
- `src/features/panorama-secovi-fiergs/__tests__/typology-offer-residual.test.ts`: ausência, fusão com `Não classificado` e sobrecobertura negativa.
- `scripts/fiergs-sales-reconciliation.mts`: evidência explícita das quatro dimensões e das lançadas por tipologia.
- este documento e a evidência do G0, atualizada com o hash do commit isolado.

Nenhum arquivo de `src/features/corretor` ou `src/features/corretor/referencia_ajustes/` foi alterado por esta fase.

## 7. Testes e evidências

| Verificação | Resultado |
|---|---|
| teste focal do residual | 3/3 aprovados |
| suíte FIERGS | 31 arquivos, 252/252 testes aprovados |
| `npx tsc --noEmit -p tsconfig.app.json` | aprovado |
| `npm run build` | aprovado |
| reconciliação autenticada 2T2026 | aprovada, 23 linhas compatíveis |
| reconciliação autenticada 4T2025 | aprovada, todas as linhas compatíveis |

Avisos não bloqueantes já existentes: dimensões zero do Recharts nos testes, base Browserslist desatualizada, importação mista de `xlsx` e chunks superiores a 500 kB.

Artefatos autenticados locais (não versionados):

| Arquivo | SHA-256 |
|---|---|
| `.tmp/fiergs-prehomologacao-2T2026.json` | `EB536DC422D56A0AC050CABD670832C6FB8D7AB29CF876D7C434F686DAF5234A` |
| `.tmp/fiergs-prehomologacao-4T2025.json` | `EA3E83D5B879BFB3DFDBCECE8CEE057C0BD01C6B8DDA87C22820A2836499B134` |

## 8. Portão G1

**APROVADO.** O delta 63 é derivado da fonte granular, está visível em `Não classificado` e todas as dimensões de oferta fecham nos dois períodos de regressão. A Fase 2 ainda não foi executada; as guardas de bloqueio continuam pendentes e nenhum ajuste visual de mapas foi iniciado.

**Commit isolado:** registrado no handoff do portão, pois um commit não pode conter o próprio hash de forma estável.
