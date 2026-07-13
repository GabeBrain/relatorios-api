# Plano — Ajustes Dash Geobrain

Escopo apenas em `src/features/dashboard-geobrain/*`, `src/pages/DashboardGeobrain.tsx`, `src/lib/format.ts` e `docs/projetos/LIVE_dashboard-geobrain.md`. Nenhuma alteração de backend/API.

## 1. Header (`Header.tsx` + `GeoApiScopeSelector`)

- Reestruturar `dg-header` em duas linhas usando `flex-wrap` com grupos empilhados (label em cima, controle embaixo):
  - Grupo **UF + Município**: mantém o `GeoApiScopeSelector` (labels internos preservados). Reduzir largura/altura do combobox de município (`min-w-[180px]`, `h-8`) e do label para casar com os demais.
  - Grupo **Tipo de empreendimento**: label `TIPO EMPREENDIMENTO` acima e chips Vertical/Horizontal/Comercial abaixo (`dg-chip-group`).
  - Grupo **Visualização**: label `VISUALIZAÇÃO` acima e chips Ano/Trimestre/Mês/Ano abaixo.
- Padronizar altura dos chips (`h-8`) e labels (`text-[10px] uppercase tracking-wide text-muted-foreground`) para alinhar visualmente com os dropdowns do GeoApiScopeSelector.
- Botão `☰ Filtros` continua à esquerda; `flex-wrap` mantido para responsividade.

## 2. Cor do texto do tooltip (`Charts.tsx`)

- Trocar `HL = 'var(--dg-tooltip-hl)'` por cor fixa `#212529` no valor destacado e no título do `DGTooltip`. Manter `dg-muted` para o nome da série.

## 3. KPIs (`KpiRow.tsx`, `aggregate.ts`, `format.ts`, `DashboardGeobrain.tsx`)

- Remover card **Empreendimentos**.
- Adicionar **Preço médio m²** entre "Empreend. Ativos" e "Unidades Lançadas" (usa `kpis.precoMedioM2`).
- **Unidades Lançadas** e **VGV Lançado**: passar a somar sobre TODO o período filtrado (se filtros temporais vazios → soma total da base). Extrair função `computeReleaseTotals(buildings, f)` que itera o histórico com `historyMatches` e aplica **KEEPFILTERS status = "Ativo"** por building (item 7). Retorna `{ unidadesLancadas, vgvLancado }`. Substituir a agregação atual desses dois campos no `computeKpis` (mantém os demais no último período).
- Ajustar `numCompact`/`brlCompact` em `src/lib/format.ts`: quando `abs(v) >= 1000`, exibir com **1 casa decimal** (`1,3 mil`, `2,4 mi`). Preservar 0 casas para valores < 1000 em campos de quantidade.
- Ajustar grid do `KpiRow` para 8 cards (mesmo número, pois removemos 1 e adicionamos 1) mantendo `xl:grid-cols-8`.

## 4. Filtros padrão — últimos 12 meses (`DashboardGeobrain.tsx`)

- Substituir `EMPTY_FILTERS` inicial por `defaultFilters()` que popula `periods` com os últimos 12 meses `YYYY-MM` (ancorado em `latestPeriodInScope(buildings)` após load; enquanto sem dados usa mês corrente).
- `useEffect` após load bem-sucedido: se `filters.periods.length === 0 && filters.years.length === 0`, aplicar os 12 períodos mais recentes disponíveis no dataset carregado.
- Botão "Limpar filtros" na sidebar volta para os 12 meses default (não para lista vazia).
- `ActiveFiltersBar` já mostrará os períodos aplicados.

## 5. Títulos dos rankings (`DashboardGeobrain.tsx`)

- Renomear:
  - "Top 10 bairros — maior IVV" → **"IVV por bairro"**
  - "Top 10 bairros — menor tempo de estoque" → **"Tempo de estoque por bairro"**
  - "Top 10 bairros — menor preço m²" → **"Preço médio m² por bairro"**
  - "Top 10 bairros — menor preço médio" → **"Preço médio por bairro"**

## 6. Mapa de oportunidades — Padrão (`aggregate.ts`, `DashboardGeobrain.tsx`)

- Em `computeOpportunityMap`, estender `OpportunityGroupBy` com `'standard'` e usar `b.standard || 'Sem classificação'` como chave.
- Substituir a chamada `oppMapType` (que agrupava por `building_type`) por agrupamento por `'standard'`.
- Renomear título do card para **"Mapa de oportunidades — Padrão"** e `rowLabel: 'Padrão'`.

## 7. Regra Ativo em Unidades Lançadas / VGV Lançado

- `computeReleaseTotals` (§3) só soma quando `b.status === 'Ativo'` (equivalente ao `KEEPFILTERS(status = "Ativo")` DAX). Aplica-se ao KPI e ao novo gráfico do §8.

## 8. Novo gráfico "Unidades Lançadas × Estoque" (`Charts.tsx`, `aggregate.ts`, page)

- `SeriesPoint` já tem `ofertaLancada` (unidades lançadas) e `estoqueFinal`. Garantir que `computeSeries` respeite `status = "Ativo"` na contribuição de `ofertaLancada` (ajuste local: `if (isRelease && b.status === 'Ativo') ...`).
- Criar componente `UnidadesLancadasVsEstoqueChart` baseado em `VgvChart`, com barras `ofertaLancada` e `estoqueFinal`, tooltip `numCompactBR`.
- Na página, inserir **antes** de `<VgvChart />`.

## 9. Popovers (i) com fórmula (`Rankings.tsx`, `Charts.tsx`, `DashboardGeobrain.tsx`)

- Adicionar prop opcional `info?: ReactNode` no `RankingCard` (renderizar `<Info/>` ao lado do título, análogo ao IpcChart).
- Popovers com texto:
  - **Preço médio por bairro** / **Preço médio por padrão**: "VGV do período ÷ quantidade. Apenas tipologias 'Padrão' (ignora Cobertura, Garden etc.) e apenas com estoque."
  - **Preço médio m² por bairro** / **Preço médio m² por padrão**: "VGV do período ÷ área privativa total. Apenas tipologias 'Padrão' e apenas com estoque."
  - **IVV por bairro**: "Unidades vendidas no período ÷ Estoque inicial no período."
  - **Tempo de estoque por bairro** e no `OfertaComboChart`: "1 ÷ IVV do período (em meses)."
- Observação: os textos descrevem a definição conceitual conforme solicitado; nenhum recálculo é feito neste ponto.

## 10. Documentação

- Registrar todos os itens acima em `docs/projetos/LIVE_dashboard-geobrain.md` (nova entrada `2026-07-13` em Desenvolvimentos + ajuste de Etapas/Pendências).

---

## Detalhes técnicos

```text
Header layout (2 linhas por grupo)
┌─ [☰ Filtros] ┌─UF─┐ ┌─Município─┐ ┌─TIPO EMPREEND─┐ ┌─VISUALIZAÇÃO─┐
│              │▼   │ │▼         │  │ [V][H][C]       │ │ [Ano][Tri][M]│
```

- `format.ts` — regra proposta:
  - `< 1000` → sem casas
  - `>= 1_000` → `x,y mil` (1 casa)
  - `>= 1_000_000` → `x,y mi`
  - `>= 1_000_000_000` → `x,y bi`
- `computeReleaseTotals`: soma sobre TODO histórico filtrado (não apenas `latest`), com `historyMatches(h,f)` + `isRelease(b,h)` + `b.status === 'Ativo'`.
- Default filters: `periods = últimos 12 meses YYYY-MM presentes no dataset carregado` (calcula ao final do primeiro load).

## Não escopo

- Estrutura do endpoint, motor `GeoApiScopeEngine`, tema/tokens de cor globais e outros módulos (Área Quanti, Validação do Fechamento).