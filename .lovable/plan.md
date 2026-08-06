# Dash Geobrain — API v2, campo `pattern` e cor das legendas

Quatro ajustes na página `/dash-geobrain`, preservando o layout atual.

> Observação: o JSON de exemplo com os campos novos ainda não chegou até mim (a lista de anexos
> não mostra nenhum arquivo `.json`). O item 7 abaixo descreve o mecanismo de mapeamento; assim
> que o arquivo for anexado, mapeio campo a campo dentro da mesma estrutura.

## 6. Novo endpoint (POST v2)

- Trocar a base da consulta de `https://geobrain.com.br/public-api/building-with-history` (GET)
  para `https://api.geobrain.com.br/public-api/v2/building-with-history` (POST).
- Mesmos parâmetros (`uf`, `city`, `type`, `status`, `per_page`, `page`), mantidos na
  **query string**, com o `Authorization: Bearer <token>` como hoje.
- Paginação por `meta.last_page` e as 8 "lanes" paralelas (tipo × status) permanecem iguais.
- Se a resposta v2 vier com envelope diferente (`data`/`meta`), o parser trata os dois formatos
  para não quebrar em caso de divergência.

## 7. Mapear os campos novos

- `normalizeBuilding()` passa a ler também os campos novos, mantendo os atuais.
- Cada campo novo entra em `types.ts` (`Building`, `Typology`, `HistoryEntry`) com o mesmo
  tratamento numérico/nulo já usado (`toNum`, `toNumOrNull`, datas).
- Campos textuais que servem de agrupamento seguem a regra de bairro: normalização e trim.
- Nenhum campo novo é exibido em gráfico nesta etapa — apenas fica disponível para uso;
  se algum deles for medida esperada em tela, incluo depois de ver o JSON.

## 8. `standard` → `typologies_history[].pattern`

- O padrão deixa de ser atributo do empreendimento e passa a ser lido do registro de
  histórico da tipologia, **usando o pattern do próprio período em análise**.
- Impacto nas medidas que hoje usam `building.standard`:
  - filtro "Padrão" na sidebar e na barra de filtros ativos;
  - "Estoque por padrão";
  - "Preço m² por padrão" e "Preço médio por padrão";
  - mapa de oportunidades com coluna por padrão;
  - gráfico de IPC por padrão.
- Em cada uma delas a chave de agrupamento passa a ser resolvida no nível
  período+tipologia, e não mais no nível empreendimento. Isso significa que um mesmo
  empreendimento pode contribuir para padrões diferentes em períodos diferentes — que é o
  comportamento correto pedido.
- Onde a medida é "último período" (rankings de preço, estoque atual), o pattern usado é o
  do período mais recente considerado.
- Fallback `Sem classificação` mantido quando o pattern vier vazio.

## 9. Cor das legendas dos gráficos

- Texto das legendas (`<Legend>` do Recharts) passa a `#212829` em todos os gráficos,
  via token, sem alterar cores de séries, eixos, grid ou tooltip.
- No modo escuro o token recebe a variante clara equivalente, para a legenda continuar legível.

## Detalhes técnicos

- `src/features/dashboard-geobrain/api.ts` — nova BASE_URL v2, `fetch` com `method: 'POST'`,
  parser dos campos novos em `normalizeBuilding`.
- `src/features/dashboard-geobrain/types.ts` — `pattern` em `HistoryEntry` + campos novos.
- `src/features/dashboard-geobrain/aggregate.ts` — troca de `b.standard` por resolução via
  histórico em `applyFilters`, `computeOfertaPorPadrao`, `precoM2PorPadrao`,
  `precoMedioPorPadrao`, `computeOpportunityMap`, `computeIpcByStandard` e `extractOptions`.
- `src/features/dashboard-geobrain/Charts.tsx` e `dashboard.css` — token de cor da legenda.
- Doc vivo `docs/projetos/LIVE_dashboard-geobrain.md` atualizado ao final.
