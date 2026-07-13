
# Plano — `/quanti` (Banco Quanti)

Duas frentes independentes, entregues juntas. Tudo continua 100% client-side, base atual em Lovable Cloud Storage. Nenhuma quebra no que já funciona (filtros, KPIs, rankings, gráficos existentes).

---

## 1) Mapa do Brasil com drill-down (substitui o `BrazilMap` atual)

### Bibliotecas
- `react-simple-maps` + `d3-geo` (leves, sem dependência de servidor de tiles). Alternativa: `svg-brazil` puro. Vou usar **react-simple-maps** com TopoJSON.
- Fontes geográficas (públicas, MIT/CC):
  - **Brasil por estado**: TopoJSON dos 27 UFs (IBGE 2020, ~50 KB) — servido de `public/geo/br-states.json`.
  - **Municípios por UF**: 27 arquivos TopoJSON simplificados, um por UF, sob demanda em `public/geo/mun/<UF>.json` (~20–150 KB cada). Baixados só quando o usuário faz drill-down. Simplificação via `mapshaper` no meu lado antes de comitar.

### Comportamento
- **Nível 1 — Brasil**: choropleth por UF (verde Brain — escala `#eaf2d8 → #5B7537`). Tooltip: UF, N entrevistas, % da base.
- **Nível 2 — UF**: choropleth por município do UF selecionado. Tooltip: município, N, %. Municípios sem entrevista ficam cinza claro.
- **Nível 3 — Município**: clique num município aplica filtro `cidade`, mantém o mapa da UF aberto e destaca o município selecionado (borda escura + preenchimento amarelo Brain `#F8D000`).
- **Breadcrumb** acima do mapa: `Brasil › Pernambuco › Recife`. Cada nível é clicável para voltar.
- **Sincronização com store existente** (`useQuantiStore`):
  - Clique em UF → `toggleValue('estado', <UF ou nome>)` **e** avança para nível 2.
  - Clique em município → `toggleValue('cidade', <cidade>)`.
  - Se o usuário limpar o filtro `estado` na sidebar → mapa volta ao nível 1 automaticamente.
  - Se selecionar `estado` na sidebar → mapa avança para nível 2 daquele UF.
  - Botão "Voltar ao Brasil" no breadcrumb limpa `estado` e `cidade`.
- Destaque visual: UF/município selecionado com borda `#5B7537` grossa + fill amarelo.
- Escala de cor: quintis (mais robusto que linear para caudas longas).

### Arquivos
- `src/features/area-quanti/dashboard/geo/BrazilChoropleth.tsx` (novo — substitui `BrazilMap.tsx`).
- `src/features/area-quanti/dashboard/geo/UFChoropleth.tsx` (novo).
- `src/features/area-quanti/dashboard/geo/GeoMap.tsx` (orquestrador + breadcrumb).
- `src/features/area-quanti/dashboard/geo/geo-utils.ts` (normalização UF, matching de nomes de cidade — casefold + strip de acentos).
- `public/geo/br-states.json`, `public/geo/mun/<UF>.json` (27 arquivos, gerados 1x com mapshaper).
- `QuantiDashboard.tsx` — trocar `<BrazilMap />` por `<GeoMap />`.

---

## 2) Análise Cruzada Universal (substitui `CrossAnalysis` atual)

### Detecção dinâmica de variáveis
Ao carregar o dataset, um scanner varre as chaves de `records[0..N]` e classifica cada campo:
- **Excluído** (não aparece nos selects): match por padrão de nome (`id`, `_id`, `uuid`, `hash`, `timestamp`, `created_at`, `lat`, `lng`, `_raw`, `data_pesquisa` como técnico) **ou** cardinalidade > 500 valores distintos com >90% únicos (texto livre).
- **Categórico**: string ou number-com-baixa-cardinalidade (≤ 100 valores distintos).
- **Numérico contínuo**: number com > 100 valores distintos ou range amplo (ex.: `renda_valor_estimado`, `idade`).
- **Rótulo**: gerado a partir de `FIELD_LABELS` quando existir; senão, do próprio nome do campo em Title Case.

Isso vale para **qualquer base futura** — novas colunas aparecem automaticamente. Registro salvo em `useMemo` derivado dos records.

### UI (4 seletores + toggle de visualização)
- **Agrupar por** (linhas) — todos os campos elegíveis.
- **Comparar com** (colunas) — todos os campos elegíveis; pode ser "— (nenhum)" para análise 1-D.
- **Métrica**: `Quantidade`, `% do total`, `% por linha`, `% por coluna`, `Média`, `Soma`, `Mediana`. As três últimas só habilitam quando o usuário escolher também um **campo numérico** ("Métrica sobre…") — dropdown extra que só aparece nesses casos.
- **Visualização**: `Tabela`, `Barras agrupadas`, `Barras empilhadas`, `Barras 100%`, `Heatmap`, `Pizza`, `Rosca`, `Treemap`. O componente calcula quais são compatíveis com a combinação (ex.: Pizza só quando não há coluna OU quando linhas ≤ 8; Heatmap exige linha+coluna) e desabilita as demais.
- **Modo de exibição**: `Tabela + Gráfico` (padrão) / `Só tabela` / `Só gráfico`.

### Motor
- Novo `crosstabUniversal(rows, rowField, colField|null, metric, valueField?)` em `aggregate.ts` (mantém `crosstab` antigo intacto até migração completa; depois removo).
- Retorna `{ rows, cols, matrix, rowTotals, colTotals, total }` já normalizado conforme métrica (ex.: `% por linha` já divide antes de retornar).

### Interatividade
- Clique numa barra/célula → `toggleValue(rowField, rowKey)` e, se houver `colField`, também `toggleValue(colField, colKey)`.
- Filtros da sidebar já entram naturalmente porque a análise consome `filtered` do store.
- Export CSV/XLSX mantém.

### Arquivos
- `src/features/area-quanti/dashboard/CrossAnalysis.tsx` — reescrito.
- `src/features/area-quanti/dashboard/aggregate.ts` — nova função `crosstabUniversal` + helpers `detectFieldSchema(records)`.
- `src/features/area-quanti/dashboard/Charts.tsx` — adicionar `PieMini`, `Donut`, `Treemap`, `Bars100`, `BarsGrouped` genéricos.
- `src/features/area-quanti/dashboard/types.ts` — tipo `FieldMeta { key, label, kind: 'categorical'|'numeric', cardinality }`.

---

## Detalhes técnicos

- **Dependências novas**: `react-simple-maps`, `d3-geo`, `topojson-client`. Já temos `recharts` (usa para Treemap/Pie/Donut).
- **Performance**: TopoJSON de municípios só é fetched sob demanda e cacheado em memória. Choropleth só re-renderiza quando `filtered` muda.
- **Match UF/cidade → geografia**: a base usa nomes por extenso (`"São Paulo"`) — normalizo com strip de acentos + lowercase, e casos ambíguos (mesmo nome em UFs diferentes) exigem UF selecionado.
- **Compatibilidade com bases futuras**: o scanner de schema roda sobre `records` a cada troca de dataset, então `datasets.ts` continua sendo o único ponto de registro.

---

## Não muda
- Fonte de dados (`base-2020.json` no bucket `quanti-datasets`).
- KPIs, filtros laterais, rankings, gráficos temáticos existentes.
- Rota `/quanti`, layout de abas, paleta verde/amarelo Brain.

## Doc vivo
Atualizo `docs/projetos/LIVE_area-quanti.md` com nova entrada em *Desenvolvimentos* + ajuste em *Etapas*/*Pendências* antes de encerrar.

---

Aprovando, sigo pela ordem: (a) dependências + geo assets, (b) `GeoMap` + breadcrumb, (c) motor universal + UI de cruzamento, (d) doc vivo.
