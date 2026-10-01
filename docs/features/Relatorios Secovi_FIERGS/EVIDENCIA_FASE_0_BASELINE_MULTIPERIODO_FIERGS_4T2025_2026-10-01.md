# Evidência da Fase 0 — baseline multiperíodo FIERGS 4T2025

**Executado em:** 30/09/2026–01/10/2026  
**Base de código inicial:** `269338d`  
**Entidade:** `fiergs-rs`  
**Motor:** `v4`  
**Fechamento principal:** `4T2025`  
**Regressão de controle:** `2T2026`  
**Cidades:** Alvorada, Cachoeirinha, Canoas, Eldorado do Sul, Esteio, Gravataí, Guaíba, Novo Hamburgo, São Leopoldo e Viamão

## 1. Artefatos preservados

- PDF recebido: `assets/panorama-alvorada-cachoeirinha-canoas-e-mais-7-4T2025 (7).pdf`;
- PowerPoint original da Juliana: preservado e não versionado;
- pasta `src/features/corretor/referencia_ajustes/`: preservada e não alterada.

O PDF possui 75 páginas rasterizadas. A inspeção visual foi usada para registrar os totais apresentados; a fonte numérica foi reconsultada pela bancada autenticada.

## 2. Bancada reproduzível

O script `scripts/fiergs-sales-reconciliation.mts` foi parametrizado por fechamento e início do recorte. Nenhum total do estudo foi codificado no script.

Comandos executados:

```text
npx tsx scripts/fiergs-sales-reconciliation.mts .tmp/fiergs-phase0-reconciliation-4T2025.json 4T2025 1T2021
npx tsx scripts/fiergs-sales-reconciliation.mts .tmp/fiergs-phase0-reconciliation-2T2026.json 2T2026 1T2023
```

A coleta consulta, por cidade:

- `temporal-analysis-city/sales`, por padrão e tipologia;
- `temporal-analysis-city/stock`, por padrão e tipologia;
- `building-with-history-internal`, para o cubo por empreendimento e tipologia.

## 3. Totais reproduzidos em 4T2025

| Universo/fonte | Vendas verticais | Oferta final vertical | Projetos horizontais | Lançada horizontal | Final horizontal |
|---|---:|---:|---:|---:|---:|
| Cubo completo no fechamento | 1.524 | 5.855 | 121 | 28.413 | 2.840 |
| Cubo filtrado por lançamento desde 1T2021 | 1.517 | 5.448 | 58 | 11.563 | 2.364 |
| Diferença removida pelo filtro | **7** | **407** | **63** | **16.850** | **476** |

Esses valores reproduzem integralmente as divergências visíveis no PDF.

## 4. Causa confirmada

`buildGranularBlocks` construía universos incompatíveis:

- `areaBands` usava o cubo completo;
- `offerByStandard`, `offerByTypology` e `vgv` usavam `cubeInLaunchWindow`;
- o horizontal por produto/coorte já usava o cubo completo.

Assim, a data de lançamento era usada para remover da fotografia atual empreendimentos antigos que ainda tinham venda, estoque ou oferta histórica no fechamento. O início selecionado deve limitar séries de lançamentos, mas não excluir produtos que continuam no mercado atual.

Não houve diferença de cobertura entre o nível de projeto e a soma tipológica nos registros que causam os deltas. A divergência é produzida pelo filtro de janela, não por perda de tipologia.

## 5. Decomposição por cidade

Valores abaixo são a contribuição dos projetos anteriores a 1T2021 que eram removidos pelo filtro:

| Cidade | Δ vendas verticais | Δ final vertical | Δ projetos horizontais | Δ lançada horizontal | Δ final horizontal |
|---|---:|---:|---:|---:|---:|
| Alvorada | 0 | 0 | 0 | 0 | 0 |
| Cachoeirinha | 0 | 0 | 10 | 1.894 | 0 |
| Canoas | -3 | 329 | 6 | 1.541 | 16 |
| Eldorado do Sul | 0 | 0 | 5 | 3.060 | 116 |
| Esteio | 0 | 0 | 0 | 0 | 0 |
| Gravataí | 4 | 33 | 17 | 3.562 | 67 |
| Guaíba | 4 | 3 | 5 | 2.142 | 221 |
| Novo Hamburgo | 2 | 38 | 5 | 579 | 0 |
| São Leopoldo | 0 | 2 | 10 | 2.597 | 11 |
| Viamão | 0 | 2 | 5 | 1.475 | 45 |
| **Total** | **7** | **407** | **63** | **16.850** | **476** |

O delta de vendas preserva distratos: Canoas contribui com `-3`, enquanto Gravataí, Guaíba e Novo Hamburgo somam `+10`, produzindo o saldo líquido de `+7`.

## 6. Projetos verticais que explicam vendas e estoque

Dos projetos anteriores à janela, 23 possuem venda ou oferta final não nula em 4T2025. Principais contribuições:

| Cidade | Empreendimento | Lançamento | Vendas | Oferta final |
|---|---|---:|---:|---:|
| Canoas | Villagio Ventura | 4T2013 | 0 | 320 |
| Canoas | Mont Pellegrino | 1T2020 | -4 | 5 |
| Canoas | Residencial Domani — Torre D | 3T2020 | 1 | 0 |
| Gravataí | New Place | 4T2019 | 4 | 28 |
| Guaíba | Córdia Altos da Figueira | 4T2017 | 4 | 3 |
| Novo Hamburgo | New Life | 1T2019 | 0 | 12 |
| Novo Hamburgo | Vithra Residencial | 1T2019 | 2 | 3 |
| Novo Hamburgo | Residencial Villa Lobos | 1T2020 | 0 | 14 |

A relação completa, incluindo projetos de contribuição zero em vendas mas relevantes para oferta lançada, está nos CSVs da matriz.

## 7. Matriz por fonte, cidade, projeto, tipologia e período

### 4T2025

- `evidencias/MATRIZ_FIERGS_4T2025-cities.csv`;
- `evidencias/MATRIZ_FIERGS_4T2025-projects.csv`;
- `evidencias/MATRIZ_FIERGS_4T2025-typologies.csv`.

### 2T2026

- `evidencias/MATRIZ_FIERGS_2T2026-cities.csv`;
- `evidencias/MATRIZ_FIERGS_2T2026-projects.csv`;
- `evidencias/MATRIZ_FIERGS_2T2026-typologies.csv`.

Cada linha registra período, fonte, cidade, chave composta do empreendimento, identificador, segmento, padrão ou tipologia, trimestre de lançamento, inclusão na janela e contribuições de unidades lançadas, finais e vendidas.

## 8. Fatos confirmados versus hipóteses

### Confirmado

- Os deltas `7`, `407` e horizontal são exatamente a contribuição dos projetos excluídos por `cubeInLaunchWindow`.
- O cubo completo fecha vendas em 1.524 e oferta vertical em 5.855.
- O horizontal completo fecha em 121 projetos, 28.413 lançadas e 2.840 finais.
- Projeto e tipologias apresentam os mesmos subtotais nos registros causais.
- A regressão 2T2026 continua fechando em 1.091 vendas, 5.251 unidades finais e 129/30.476/3.365 no horizontal completo.

### Hipóteses descartadas para estes deltas

- perda de sete vendas por tipologia ausente;
- soma de snapshots como causa de 1.524 × 1.517;
- chácaras como causa do delta horizontal 4T2025;
- diferença posterior da API como explicação do PDF.

### Ainda fora do portão G0/G1

- semântica e deduplicação dos 626 pontos dos mapas;
- comparativo contextual de 4T;
- generalização das guardas para horizontal e mapas.

## 9. Resultado do portão G0

**G0 aprovado.** Todas as divergências exigidas foram reproduzidas e explicadas sem alteração manual de números. A correção do modelo pode iniciar pela Fase 1.
