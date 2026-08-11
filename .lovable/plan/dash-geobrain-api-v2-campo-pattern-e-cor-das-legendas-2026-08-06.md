# Dash Geobrain — API v2, campo `pattern` e cor das legendas

Quatro ajustes na página `/dash-geobrain`, preservando o layout atual.

## 6. Novo endpoint (POST v2)

- Trocar a base da consulta de `https://geobrain.com.br/public-api/building-with-history` (GET)
  para `https://api.geobrain.com.br/public-api/v2/building-with-history` (POST).
- Mesmos parâmetros (`uf`, `city`, `type`, `status`, `per_page`, `page`), mantidos na
  **query string**, com o `Authorization: Bearer <token>` como hoje.
- Paginação por `meta.last_page` e as 8 "lanes" paralelas (tipo × status) permanecem iguais.

## 7. Mapear os campos novos

Com base no JSON de exemplo enviado, o parser passa a ler:

- **No empreendimento**: `delivery_date`, `zipcode`, `address`, `address_number`, `city_id`,
  `latitude`, `longitude`, `towers`, `floors`, `elevators`, `period`, `time_on_sale`,
  `total_stock`, `total_units`, `builder_name`, `bathrooms`, `has_suites`, `last_update`,
  condições comerciais (`interest_rate_index`, `interest_rate_tax`, `bank_financing`,
  `own_financing`, `fiduciary_ownership`, `down_payment_percentage`, `discount_percentage`,
  `number_of_installments`), além das listas `incorporators[]` e `areas[]`.
- **No histórico da tipologia**: `pattern`, `building_status`, `time_on_sale`, `public_area`,
  `price_public_area`, `vgv_total`, `sold`, `number_suite`, `estagio_empreendimento`,
  `taxa_associativa`. Campos que antes eram fixos por tipologia (`private_area`,
  `release_price`, `number_bedroom`, `garage`, `qty`) agora vêm por período — passam a ser
  guardados também na entrada de histórico, mantendo o valor representativo na tipologia
  para compatibilidade com as medidas atuais.
- Todos com o mesmo tratamento numérico/nulo já usado (`toNum`, `toNumOrNull`, datas), e
  `latitude`/`longitude` convertidos para número.
- Nenhum campo novo entra em gráfico nesta etapa — ficam disponíveis para uso futuro.


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
