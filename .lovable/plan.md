# Dashboard Geobrain — Integração real + Filtros + KPIs + Gráficos

Substituir o mock atual em `src/pages/DashboardGeobrain.tsx` por dados reais do endpoint `/building-with-history` (o endpoint chamado "building-with-story" pelo usuário corresponde ao `/building-with-history` do OpenAPI Geobrain — o /temporal-analysis-city não será usado). Reaproveita o mesmo padrão de auth/fetch já usado em `Relatórios Secovi` (`src/pages/TestesArquitetura.tsx`).

Observação: o endpoint exige `type` como parâmetro. Faremos varredura por `type × status` como já é feito em Secovi. UF é obrigatório na UI; município é opcional.

---

## 1. Camada de dados (novo)

Criar `src/features/dashboard-geobrain/`:

- **`api/fetch-buildings.ts`** — usa `apiGet('/building-with-history', ...)` (mesmo shape de Secovi: `Authorization: Bearer` do `useAuthStore`, `BASE_URL = https://geobrain.com.br/public-api`). Paginação até `meta.last_page`, um lane por combinação `(type, status)` em paralelo, deduplica por `building_id`. Depois busca `/building-with-history/{id}` em batches de 8 para obter `typologies_history` completo (mesma estratégia de Secovi).
- **`hooks/use-dashboard-data.ts`** — `useDashboardData({ uf, city })` com estado `idle | loading | ready | error`, progresso (páginas, IDs, detalhes), `AbortController`, cache por `${uf}|${city}`. Retorna `Building[]` normalizado (números como `number`, datas como `Date`).
- **`lib/normalize.ts`** — converte campos string em números; extrai `year = release_date.slice(0,4)`.
- **`lib/aggregate.ts`** — aplica filtros in-memory e calcula KPIs, séries temporais e cortes.

## 2. Filtros (painel superior)

Componente `FiltersPanel` com todos os filtros como **multi-select dropdowns** (usar `Popover + Command` do shadcn, mesmo padrão de Secovi em `TestesArquitetura.tsx`). Cada dropdown mostra:
- Campo de busca interno
- Botões **"Selecionar todos"** e **"Limpar seleção"** no topo do popover
- Chips resumindo a seleção no trigger

Filtros e origem dos valores (derivados dos buildings carregados):

| Filtro | Campo(s) fonte |
|---|---|
| Período (from / to) | par de date pickers, aplica em `typology_history.period` |
| Ano | `release_date` (2011..2026, derivado dos dados) |
| Situação | `status` (Ativo, Esgotado) |
| UF | `state` — **obrigatório** (dispara fetch) |
| Cidades | `city` (opcional, envia para API se selecionar 1) |
| Bairros | `neighborhood` |
| Tipo | `building_type` (Vertical/Horizontal/Comercial/Hotel) |
| Tipologia | `typologies_history[].type_of_typology` (Cobertura, Garden, Padrão...) |
| Padrão | `standard` |
| Dormitórios | `typologies_history[].number_bedroom` |
| Vagas de garagem | `typologies_history[].garage` (bucket 4+) |
| Empreendimentos | `name` |

**UF + Município** são enviados ao endpoint. Os demais são filtros locais aplicados sobre o dataset carregado.

Botão "Aplicar" (dispara refetch se UF/cidade mudou; senão apenas reaplica localmente). Botão "Limpar tudo".

## 3. KPIs (8 cards no topo, reativos aos filtros)

Grid responsivo (2 / 4 / 8 colunas), mesmos componentes `Kpi` já existentes. Fórmulas (baseadas no DAX original / `typologies_history`):

- **Empreendimentos** = `count(distinct building_id)` após filtros
- **Empreendimentos Ativos** = `count(distinct building_id where status = 'Ativo')`
- **Oferta Lançada** = `Σ typology.qty` (oferta inicial da tipologia, no primeiro `period` de cada `typology_id` dentro do range)
- **VGV Lançado** = `Σ typology.qty × release_price`
- **Oferta Final (Estoque)** = `Σ typology_stock` no `period` mais recente ≤ filtro
- **VGV Estoque** = `Σ vgv_stock` no período mais recente ≤ filtro
- **IVV** = `vendas_liquidas_periodo / (oferta_final + vendas_liquidas_periodo)` onde `vendas_liquidas_periodo = Σ sold_in_period` no range
- **Tempo de Estoque** = `oferta_final / (vendas_liquidas_periodo / meses_no_range)` (em meses)

Formatação via `brlCompact` (com sufixos `k`, `Mi`, `Bi`), `intFmt`, `pctRaw`, `months` (`src/lib/format.ts` já existe; adicionar sufixo `k` no `brlCompact` e criar `numCompact` para números não-monetários — `1.5k / 1.5 Mi / 1.5 Bi`).

## 4. Gráficos (Recharts, 100% width, empilhados verticalmente)

Componente comum `ChartCard` com toggle de granularidade **Mês / Trimestre / Ano** (drill-down por reagrupamento do array de períodos). Todos com `<LabelList>` para exibir data labels formatados com `numCompact` / `brlCompact`.

- **Gráfico 1 — Evolução do Mercado** (AreaChart): duas séries por período — `Oferta Lançada` (Σ `qty` de tipologias lançadas no período) e `Venda Líquida` (Σ `sold_in_period`).
- **Gráfico 2 — IVV** (LineChart): série única `IVV = venda_liquida / (estoque_final + venda_liquida)` por período (0..1, eixo formatado em %).
- **Gráfico 3 — VGV do Período** (BarChart): duas séries — `VGV Lançamento` (Σ `qty × release_price` no período) e `VGV Estoque` (Σ `vgv_stock` no período).

Tooltip customizado usando `ChartTooltipContent` do design system, valores formatados.

## 5. Layout final da página

```text
┌─────────────────────────────────────────────────────────┐
│ Header (título + badge de dados reais / última atual.)  │
├─────────────────────────────────────────────────────────┤
│ FiltersPanel (12 dropdowns multi-select + Aplicar)      │
├─────────────────────────────────────────────────────────┤
│ 8 KPI cards (grid responsivo)                           │
├─────────────────────────────────────────────────────────┤
│ Gráfico 1 — Evolução do Mercado (Area, 100% width)      │
├─────────────────────────────────────────────────────────┤
│ Gráfico 2 — IVV (Line, 100% width)                      │
├─────────────────────────────────────────────────────────┤
│ Gráfico 3 — VGV do Período (Bar, 100% width)            │
├─────────────────────────────────────────────────────────┤
│ (Mapa IVV + cortes analíticos existentes — mantidos)    │
└─────────────────────────────────────────────────────────┘
```

Estados: `sem UF → placeholder pedindo seleção`; `loading → skeletons + progresso "X/Y empreendimentos"`; `error → alert com retry`; `ready → dashboard renderizado`.

## Arquivos afetados

- Novo: `src/features/dashboard-geobrain/api/fetch-buildings.ts`
- Novo: `src/features/dashboard-geobrain/hooks/use-dashboard-data.ts`
- Novo: `src/features/dashboard-geobrain/lib/{normalize,aggregate,periods}.ts`
- Novo: `src/features/dashboard-geobrain/components/{FiltersPanel,MultiSelect,KpiGrid,EvolucaoChart,IvvChart,VgvChart,ChartCard}.tsx`
- Editar: `src/lib/format.ts` (adicionar `numCompact` com sufixos k/Mi/Bi)
- Editar: `src/pages/DashboardGeobrain.tsx` (remover mocks, montar novo layout consumindo o hook)

Fora de escopo desta etapa: alterar a matriz IVV por bairro e as tabelas de cortes analíticos já existentes — elas continuam renderizando (agora alimentadas pelo dataset real via `aggregate.ts` quando o refactor chegar até lá; se preferir, mantemos os mocks só para essas duas seções nesta entrega e migramos depois — diga se quer que já entre nesta etapa também).

Validação: `tsgo` limpo, Playwright em `/dashboard-geobrain` selecionando UF=PR, cidade=Curitiba e conferindo KPIs > 0 e os 3 gráficos renderizados com labels.
