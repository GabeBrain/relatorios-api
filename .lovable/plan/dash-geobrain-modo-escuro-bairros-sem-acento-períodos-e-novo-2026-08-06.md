# Dash Geobrain — Modo escuro, bairros sem acento, períodos e novos filtros

Cinco ajustes na página `/dash-geobrain`, preservando a estrutura visual e as regras já existentes.

## 1. Modo escuro

O app já tem um toggle global de tema (aplica a classe `dark` no `<html>`), mas o Dash Geobrain
usa tokens próprios (`--dg-*`) definidos apenas para o tema claro em `dashboard.css`, então hoje
a página continua branca com o modo escuro ligado.

- Adicionar um bloco `.dark .dash-geobrain` com a variante escura dos mesmos tokens
  (fundo `#272726`/superfícies em cinza-escuro, bordas, texto claro), mantendo a paleta
  verde/amarelo da marca — mesmo padrão já adotado na Área Quanti.
- Ajustar pontos que hoje têm cor fixa: cor de destaque do tooltip (`#212529`), fundos brancos
  fixos de heatmap/rankings/sidebar e ticks/grid/legenda do Recharts.
- Nenhuma lógica de dados muda.

## 2. Bairro sem acentuação

- Normalizar `neighborhood` (remoção de diacríticos) no momento da normalização do payload da API,
  antes de qualquer agregação.
- Efeito automático: filtro "Bairros", rankings por bairro e mapa de oportunidades passam a usar
  o valor sem acento. Bairros que só diferiam por acento passam a ser agrupados em um único item.

## 3. Gráficos temporais só com os períodos selecionados

- As séries principais já respeitam os filtros, mas o gráfico de **IPC** monta o eixo de períodos a
  partir de *todos* os empreendimentos (sem filtro temporal), o que faz aparecer períodos fora da
  seleção. Restringir o eixo aos períodos que passam pelos filtros, mantendo o denominador de
  mercado (todos os empreendimentos) apenas no cálculo do índice.

## 4. Novo gráfico "Estoque atual por bairro"

- Novo card idêntico ao "Tempo de estoque por bairro" (mesmo componente `RankingCard`: busca,
  Top N, ordenação, popover `(i)`), trocando somente a medida: soma do estoque
  (`typology_stock`) por bairro no período mais recente do escopo filtrado, ordenado do maior
  para o menor. Posicionado junto aos demais rankings de bairro.

## 5. Novos filtros "Área Privativa" e "Preço/m²"

- Dois novos segmentadores na sidebar, com até 6 intervalos cada.
- Os intervalos são **dinâmicos**: recalculados a partir dos dados carregados da cidade
  selecionada e do tipo de empreendimento ativo (Vertical/Horizontal/Comercial), usando quantis
  para distribuir os registros de forma equilibrada e arredondando os limites para valores
  legíveis (ex.: `até 45 m²`, `45–60 m²`, …; `até R$ 8 mil/m²`, …).
- Área privativa vem da tipologia (`private_area`); preço/m² vem do histórico
  (`price_private_area`) no período mais recente do escopo.
- Aplicados no mesmo ponto dos demais filtros de tipologia, portanto valem para KPIs, gráficos,
  rankings e mapas automaticamente. Também aparecem na barra de filtros ativos.

## Detalhes técnicos

- `src/features/dashboard-geobrain/dashboard.css` — tokens `.dark`, superfícies e textos.
- `src/features/dashboard-geobrain/Charts.tsx` — cores do tooltip/eixos via token em vez de hex fixo.
- `src/features/dashboard-geobrain/api.ts` — `normalizeBuilding()` remove acentos de `neighborhood`.
- `src/features/dashboard-geobrain/aggregate.ts` — filtro de períodos no `computeIpcByStandard`,
  nova função `rankBairrosPorEstoque`, buckets dinâmicos (`computeRangeBuckets`) e extensão de
  `typologyMatchesFilters` / `extractOptions`.
- `src/features/dashboard-geobrain/types.ts` — `Filters` ganha `privateAreas` e `pricePerM2`.
- `src/features/dashboard-geobrain/Sidebar.tsx`, `ActiveFiltersBar.tsx`, `Rankings.tsx`,
  `src/pages/DashboardGeobrain.tsx` — novos controles e novo card.
- Doc vivo `docs/projetos/LIVE_dashboard-geobrain.md` atualizado ao final.
