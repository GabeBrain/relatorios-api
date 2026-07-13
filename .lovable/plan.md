
# Refatoração — Dashboard Geobrain

Escopo restrito ao módulo `src/features/dashboard-geobrain/` + `src/pages/DashboardGeobrain.tsx`. Layout preservado.

## 1. Dimensão de período — usar `h.period` (string)

`aggregate.ts`: substituir todo uso de `h.periodDate` por parsing direto de `h.period` (string `YYYY-MM` ou `YYYY-MM-DD`). Criar helpers:

- `periodKeyFromStr(period, granularity)` — string → rótulo (`26T1`, `03/26`, `2026`).
- `periodSortFromStr(period, granularity)` — número monotônico.
- `yearFromPeriod(period)`, `monthKeyFromPeriod(period)`.

Nenhum bucket usará `Date` local (fim do drift Mar→Fev). Manter `HistoryEntry.periodDate` só para range `from/to` do sidebar, ou substituir também por comparação lexical `YYYY-MM`.

## 2. Barra de filtros ativos

Novo componente `ActiveFiltersBar.tsx` (padrão de `validacao-fechamento/ActiveFiltersBar.tsx`), linha única abaixo do `Header`, mostrando: Estado, Cidade, Tipo, Bairros, Padrão, Dormitórios, Garagens, Tipologia, Anos, Períodos, Status, Empreendimentos. Renderizada em `DashboardGeobrain.tsx` entre `<Header/>` e `<main>`.

## 3. Filtros aplicam a tudo

Revisar cada compute (`computeKpis`, `computeSeries`, `computeOfertaPor*`, `rank*`, `computeIpcByStandard`, `computeOpportunityMap`) para garantir que **todos** aplicam `historyMatches(h, f)` e `typologyMatchesFilters`. Hoje IPC/rankings já aplicam — reforçar auditoria.

## 4. Segmentadores do topo

`Header.tsx`:
- `BUILDING_TYPES = ['Vertical', 'Horizontal', 'Comercial']` (remove Hotel, ordem decrescente).
- Alinhar altura/estilo dos chips à altura do `GeoApiScopeSelector` via `dashboard.css` (`min-height`, `align-items: center`).

## 5. Renomear "Oferta Final" → "Estoque"

Substituir em `KpiRow.tsx`, `Charts.tsx` (títulos, tooltips, legendas), `Rankings.tsx`, `OpportunityMap.tsx` e `DashboardGeobrain.tsx`. Chaves internas (`ofertaFinal`, `estoqueFinal`) podem permanecer; alterar apenas labels visíveis.

## 6. KPIs sempre no período mais recente

Novo helper `latestPeriodInScope(buildings, f)` retorna a maior string `period` presente após filtros; se `f.periods`/`f.years` estiverem vazios, usa o maior período da base filtrada.

Reescrever `computeKpis`:
- `estoque`, `vgvEstoque` = soma do `typology_stock`/`vgv_stock` das entradas cujo `period == latest`.
- `vendasLiquidas` = `sold_in_period` no `latest`.
- `ivv` e `tempoEstoque` = ver §15.
- `unidadesLancadas`, `vgvLancado` = soma somente das tipologias com `release_date == latest` (via `is_release`).
- Não usar `monthsRange` acumulado.

Ampliar `KPIValues` para incluir os campos listados em §14 (empreendimentos ativos, status atualização, empreendimentos lançados, unidades lançadas, VGV lançado, unidades vendidas, VGV vendido, estoque final, VGV estoque, estoque inicial, preço médio, preço médio m², IVV, tempo de estoque, IPC).

## 7. Cartões sobre os gráficos

`Charts.tsx`: para cada gráfico que hoje mostra cartões, manter apenas **Desde o início / 3 anos / 1 ano** com a medida do gráfico.
- Gráficos com múltiplas medidas: remover totalmente os cartões.
- IVV: cartão usa **média** dos períodos da janela, não soma.

## 8. Tooltips

Componente `DGTooltip` compartilhado em `Charts.tsx`:
- Valores com 1 casa decimal (`nf1`, `pct1`).
- Cor destaque `#917C09` (ou `#D9BA0D`) via CSS var `--dg-tooltip-hl`.
- Tempo de Estoque usa o mesmo componente (elimina divergência atual).

## 9. Ordenação em barras horizontais

Nos `RankingCard`, `OfertaComboChart` (barras horizontais): dois botões — "Ordenar por valor" / "Ordenar por rótulo" (com toggle asc/desc). Estado local no card.

## 10. Gráfico de Padrões — sem Top 10

`OfertaComboChart` do padrão: remover `slice(0, 10)`; exibir todos os padrões filtrados.

## 11. IPC

`Charts.tsx > IpcChart`:
- `YAxis` com `domain` que inclua 1 (já existe `ReferenceLine y=1`, garantir cruzamento).
- Botão `(i)` no header do card abre popover (shadcn `Popover`) com o texto explicativo definido no ticket.

## 12. Mapa de Oportunidades

- `OpportunityMap.tsx`: corrigir input de busca — `padding-left` para acomodar a lupa (ou reposicionar ícone `left-2` + `pl-8`).
- Adicionar variante `groupBy: 'neighborhood' | 'building_type'` em `computeOpportunityMap` e renderizar **dois mapas** empilhados na página: um por bairro (atual) e outro por `building_type`.

## 13. Campos calculados

Introduzir helpers puros em `aggregate.ts` (aplicados por linha `HistoryEntry` + typology + building):

```ts
isRelease(building, h)      = building.release_date === h.period
vgvSold(h, price)           = h.sold_in_period * price
vgvStock(h, price)          = h.typology_stock * price
initialStock(h)             = h.typology_stock + h.sold_in_period
typologyArea(t)             = t.qty * t.private_area
vgvPeriod(t, price)         = t.qty * price
qtyRelease(building, h, t)  = isRelease ? t.qty : 0
vgvRelease(building, h, t)  = isRelease ? t.qty * price : 0
```

## 14–15. Medidas revisadas

Todas as medidas passam por `latestPeriodInScope` quando aplicável:

- **Empreendimentos Ativos**: `count(status === 'Ativo')` após filtros de dimensão.
- **Status Atualização**: max `period` observado por empreendimento.
- **Empreendimentos Lançados**: distinct buildings com `release_date == latest`.
- **Unidades / VGV Lançado**: soma `qtyRelease` / `vgvRelease` no `latest`.
- **Unidades / VGV Vendido**: soma `sold_in_period` / `vgv_sold` no `latest`.
- **Estoque Final / VGV Estoque**: `typology_stock` / `vgv_stock` no `latest`.
- **Estoque Inicial**: `initialStock` no `latest`.
- **Preço Médio / m²**: média ponderada dos preços no `latest`.
- **IVV**: `sold_in_period / (typology_stock + sold_in_period)` **exclusivamente no período mais recente**. Nunca acumulado.
- **Tempo de Estoque**: `1 / IVV` do período mais recente (fim do cálculo por meses).
- **IPC**: `(vendas_grupo/vendas_total) / (estoque_grupo/estoque_total)`; se `estoque_grupo <= 0` → `null` (BLANK, ponto omitido). Aplicado no gráfico temporal e KPI (latest).

## Notas técnicas

- Preservar assinaturas públicas de `applyFilters`, `extractOptions`.
- `HistoryEntry` já traz `period` (string) — se não trouxer nas normalizações antigas, adicionar no `api.ts`.
- Ajustar `types.ts` com `KPIValues` estendido; atualizar `KpiRow.tsx` (mesmo layout de cards, só novos rótulos/valores).
- Sem novos endpoints; consumo de API inalterado.
- Nenhuma mudança em `dashboard.css` além de: altura dos chips do header, `--dg-tooltip-hl`, padding da busca do mapa.

## Arquivos alterados

- `src/features/dashboard-geobrain/aggregate.ts` (grande refatoração)
- `src/features/dashboard-geobrain/Header.tsx`
- `src/features/dashboard-geobrain/KpiRow.tsx`
- `src/features/dashboard-geobrain/Charts.tsx`
- `src/features/dashboard-geobrain/Rankings.tsx`
- `src/features/dashboard-geobrain/OpportunityMap.tsx`
- `src/features/dashboard-geobrain/dashboard.css`
- `src/features/dashboard-geobrain/types.ts`
- `src/features/dashboard-geobrain/api.ts` (garantir `period` string na normalização)
- `src/features/dashboard-geobrain/ActiveFiltersBar.tsx` (novo)
- `src/pages/DashboardGeobrain.tsx`
- `docs/projetos/LIVE_dashboard-geobrain.md` (entrada de Desenvolvimentos)

## Fora do escopo

- Layout geral, novos gráficos além do 2º mapa de oportunidades.
- Alterações em endpoints ou no `GeoApiScopeEngine`.
- Renomear chaves internas (`ofertaFinal` no código).
