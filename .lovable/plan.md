
# Dashboard Banco Quanti — Base Unificada 2020

Ferramenta de análise exploratória interativa para a página `/quanti`, aba **Banco Quanti**, usando `Base_Unificada_2020.xlsx` (11.737 registros × 92 colunas) como fonte inicial, e desenhada para receber bases futuras (2019, 2021, 2022…) sem alterar componentes.

## Estratégia de dados

Como a base tem ~11k linhas (leve para o navegador), o dashboard usa **processamento 100% client-side** — sem migration, sem dependência de rede a cada filtro, resposta instantânea.

1. **Conversão única** (script Node em `scripts/`): lê o `.xlsx`, seleciona só os campos usados (research_name, data_pesquisa, regiao, localidade, Estado, Cidade, genero, faixa_etaria, geracao, renda_macro_faixa, renda_faixa_padronizada, renda_classe_agregada, renda_classe_detalhada, renda_valor_estimado, intencao_compra_padronizada, tempo_intencao_padronizado, idade), normaliza null/"" → `"Não informado"`, e emite `public/data/quanti/base-2020.json` (gzip friendly, ~1–2 MB).
2. **Registro de bases** em `src/features/area-quanti/dashboard/datasets.ts`: `{ id: "2020", label: "Base 2020", url: "/data/quanti/base-2020.json" }`. Adicionar novas bases é só um item nessa lista + rodar o script na nova planilha.
3. **Hook `useQuantiDataset(id)`**: fetch + cache em memória, retorna registros normalizados tipados.

## Arquitetura de UI

Rota já existe (`/quanti`). Substituir o placeholder por um layout com **tabs**: `Banco Quanti` (este dashboard) — futura extensão para outras abas. O dashboard vive em `src/features/area-quanti/dashboard/`.

```text
AreaQuanti (page)
└── Tabs [Banco Quanti | (futuras abas)]
    └── QuantiDashboard
        ├── DatasetSwitcher  (seletor de base — 2020, 2021, …)
        ├── FiltersSidebar   (retrátil, multi-select por campo)
        ├── ActiveFiltersBar (breadcrumbs + limpar tudo)
        ├── KpiRow           (7 KPIs)
        ├── Section "Perfil Demográfico"  (Gênero donut · Faixa etária bar · Geração bar)
        ├── Section "Perfil de Renda"     (Macro · Padronizada · Classe agregada · Classe detalhada · Histograma renda_valor_estimado)
        ├── Section "Distribuição Geográfica" (Mapa Brasil coroplético + Top cidades)
        ├── Section "Intenção de Compra"  (Intenção · Tempo · Cruz. por gênero/faixa/classe)
        ├── Section "Cruzamentos" (heatmaps prontos: FE×Classe, Gênero×Classe, Estado×Classe, Região×Classe, Geração×Intenção, Cidade×Intenção)
        ├── Section "Ranking" (Top 10 cidades · Top 10 estados · Regiões)
        └── Section "Análise Cruzada" (pivot dinâmico com exportação CSV/XLSX)
```

## Componentes principais

- `dashboard.css` — paleta azul (`#1E3A8A` primário, `#3B82F6` accent) / branco / cinza; cartões `rounded-2xl` com sombra suave.
- `FiltersSidebar.tsx` — reutiliza `MultiSelect` já existente; filtros: research_name, Estado, Cidade (dependente do Estado), regiao, genero, faixa_etaria, geracao, renda_faixa_padronizada, renda_classe_agregada, renda_classe_detalhada, intencao_compra_padronizada, tempo_intencao_padronizado, data_pesquisa (range).
- `useFilters.ts` — estado global (Zustand — já no projeto), com `toggleFilter(field, value)` para cross-filter de gráficos.
- `aggregate.ts` — funções puras: `countBy`, `distinct`, `mean`, `percentile`, `histogram(bins)`, `crosstab(rows, cols, metric)`. Todos aplicam o filtro corrente.
- `KpiRow.tsx` — Total entrevistas, # cidades, # estados, Renda média estimada, Idade média, % Homens, % Mulheres.
- `Charts.tsx` (Recharts, já no projeto) — `DonutChart`, `BarChart` horizontal/vertical, `Histogram`, `StackedBar`, `Heatmap` (SVG custom leve).
- `BrazilMap.tsx` — coroplético por Estado usando `react-simple-maps` + topojson BR (arquivo estático em `public/data/br-states.json`). Clique em UF → toggle filtro Estado.
- `RankingList.tsx` — top-N configurável.
- `CrossAnalysis.tsx` — pivot: 2 selects (linhas/colunas de qualquer campo categórico), select de métrica (Quantidade, %, Média de renda estimada), 4 modos de exibição (Tabela, Barras agrupadas, Barras empilhadas, Heatmap), botões **Exportar CSV** e **Exportar XLSX** (usa `xlsx` já instalada).
- `ActiveFiltersBar.tsx` — chips por filtro ativo, "Limpar tudo".
- Todos os gráficos: hover tooltip padronizado e clique em série → aplica/remove filtro correspondente (cross-filter).

## Fluxo cross-filter

Clique em uma barra "Homem" no gráfico Gênero → `toggleFilter('genero', 'Homem')` → todos os agregados recomputam via `useMemo(filteredRows)` → breadcrumb aparece com chip "Gênero: Homem × remover".

## Nulos e futuras bases

- Normalização única no loader: `""`, `null`, `undefined`, `"—"` → `"Não informado"`.
- Loader ignora silenciosamente campos ausentes (novas bases podem ter subconjunto). Cada gráfico degrada — se o campo não existe no dataset atual, o cartão mostra "Campo indisponível nesta base".

## Entregáveis (ordem)

1. Script `scripts/build-quanti-dataset.mjs` + rodar sobre `Base_Unificada_2020.xlsx` → `public/data/quanti/base-2020.json` + `br-states.json`.
2. `src/features/area-quanti/dashboard/` (types, datasets, hooks, aggregate, filtros, componentes).
3. Refatorar `src/pages/AreaQuanti.tsx` para tabs + montar o dashboard na aba "Banco Quanti".
4. Atualizar `docs/projetos/LIVE_area-quanti.md`.

## Fora do escopo (pode virar próximo passo)

- Persistência de filtros salvos por usuário.
- Ingestão dinâmica de novas bases via upload no app (por ora, novas bases são adicionadas rodando o script e commitando o JSON).
- Migration para Lovable Cloud (o volume atual não justifica; se as bases somadas passarem de ~100k linhas migramos para tabela + agregação server-side).
