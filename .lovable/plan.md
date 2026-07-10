# Nova página: Rebrain → Validação do Fechamento

Página nova em `/rebrain/validacao-fechamento` que reutiliza a mesma consulta da API do Dash Geobrain (GeoApiScopeEngine + `useDashboardData`) e apresenta a tabela de validação de fechamento (Resumo) e um DataGrid com registros individuais (Detalhamento).

## Estrutura de arquivos

Novo módulo em `src/features/validacao-fechamento/`:

```text
src/features/validacao-fechamento/
  types.ts                 // ClosureRow, ClosureMetric, Granularity, Filters
  aggregate.ts             // agrupa typologies_history em anos/trimestres/meses e calcula métricas + variações
  useClosureData.ts        // reaproveita useDashboardData (mesma API) + memoiza flatten + aggregation
  Header.tsx               // reutiliza estilos do dash-geobrain (chips Anual/Trimestral/Mensal, botão sidebar, escopo)
  Sidebar.tsx              // filtros retráteis multi-select (Ano, Trimestre, Período, Padrão, Tipo, Empreendimentos)
  ResumoTable.tsx          // tabela dinâmica principal
  DetalhamentoGrid.tsx     // DataGrid moderno (TanStack Table) com ordenação/paginação/export/etc.
  fechamento.css           // tokens escopados (paleta obrigatória) + suporte dark
src/pages/ValidacaoFechamento.tsx  // orquestra: scope + tabs Resumo/Detalhamento
```

Rota registrada em `src/App.tsx`; entrada no menu **Rebrain** (`AppLayout.tsx`) chamada "Validação do Fechamento".

## Design system (escopo `.validacao-fechamento`)

CSS scoped tokens (não vazam globalmente, seguindo o padrão do `dashboard.css`):

- `--vf-primary: #71984a` / `--vf-accent: #f4d83f` / `--vf-muted: #6e6e6e`
- `--vf-text: #212529` / `--vf-neg: #f93f16` / `--vf-pos: #2f982f`
- Fonte: `Archivo, Tahoma, sans-serif`, base 10pt
- Tema claro/escuro: variantes `.dark .validacao-fechamento { … }` — ajusta apenas surfaces/bordas; verde/amarelo/vermelho/positivo permanecem constantes.

Archivo já é carregado no `index.html` (dash-geobrain), portanto não requer import adicional.

## Header (topbar)

Idêntico visualmente ao Dash Geobrain:

- Botão "☰ Filtros" (abre sidebar retrátil)
- `GeoApiScopeSelector` (UF + Cidade, via GeoApiScopeEngine — padrão obrigatório do repo)
- Legenda: `Cidade: X - Fechamento: DD/MM/AAAA - Exibindo: Anual|Trimestral|Mensal`
- Chip-group Anual / Trimestral / Mensal (granularidade)
- Botões rápidos "Atualizar" e "Limpar"
- Toggle tema claro/escuro (persistido em `localStorage`)

## Consulta à API

Reaproveita `fetchBuildings` de `src/features/dashboard-geobrain/api.ts` via um hook fino `useClosureData(scope)` que delega a `useDashboardData`. Sem duplicação de rede — mesmo cache de resposta por escopo.

## Filtros (Sidebar retrátil, multi-select)

Todos com botões "Selecionar Todos" e "Limpar Seleção" (reaproveita `MultiSelect` do dash-geobrain). Ordem:

1. **Ano** — derivado de `typologies_history.period` (`YYYY`)
2. **Trimestre** — formato `01T/26`, `02T/26`, …
3. **Período (mês)** — formato `jan/26`, ordenado do mais recente para o mais antigo
4. **Padrão** — `building.standard`
5. **Tipo Empreendimento** — `building.building_type`
6. **Empreendimentos** — `building.name`

Persistência: `sessionStorage` com chave `vf-filters` enquanto o usuário navega. Atualização automática (sem botão "Aplicar"), com `useDeferredValue` para suavizar recomputações.

## Aba Resumo (tabela dinâmica)

Colunas dinâmicas conforme granularidade:

- **Anual** → uma coluna por ano selecionado + `% Var. Total`
- **Trimestral** → uma coluna por trimestre (`01T/26`) + `% Var. Total`
- **Mensal** → uma coluna por mês (`jan/26`) + `% Var. Total`

Linhas por métrica (o rótulo da linha de variação **troca conforme a granularidade** — `% Var. Anual`, `% Var. Trimestral` ou `% Var. Mensal`; a linha "Var. Ano" mantém sempre esse nome, pois compara com o mesmo período do **ano anterior**):

```text
Empreendimentos lançados (período anter)
Empreendimentos lançados (período atual)
% Var. Anual | Trimestral | Mensal    ← troca conforme granularidade
% Var. Ano                            ← fixo: vs mesmo período do ano anterior
Unidades lançadas (período anter)
Unidades lançadas (período atual)
% Var. Anual | Trimestral | Mensal
% Var. Ano
Unidades vendidas (…)
Oferta final (…)
Preço médio (…)
Preço M2 (…)
```

### Métricas (fiéis ao DAX do PDF)

Sobre o dataset achatado `{ building_id, release_date, period, standard, building_type, qty, sold_in_period, typology_stock, price, private_area, type_of_typology }`:

- `EmpreendimentosLancados` = `DISTINCTCOUNT(building_id WHERE release_date_period == period_bucket)`
- `UnidadesLancadas` = `SUM(qty WHERE release_date_period == period_bucket)`
- `UnidadesVendidas` = `SUM(sold_in_period)`
- `OfertaFinal` = `SUM(typology_stock)` do **último período** dentro do bucket
- `PrecoMedio` = `SUM(qty*price) / SUM(qty)` filtrando `type_of_typology='Padrão'` e `typology_stock<>0`
- `PrecoM2` = `SUM(qty*price) / SUM(qty*private_area)` com os mesmos filtros

### Variações

- **Linha `% Var. Anual|Trimestral|Mensal`**: variação vs período imediatamente anterior segundo a granularidade ativa — DAX `VarXxxPA` com `SWITCH` por `PREVIOUSYEAR/QUARTER/MONTH`. Rótulo troca com a granularidade.
- **Linha `% Var. Ano`**: variação vs mesmo período do **ano anterior** (SAMEPERIODLASTYEAR) — DAX `VarXxxAA`. Rótulo fixo. Caso especial "AA=0 e atual>0 → 100%".
- **Coluna `% Var. Total`** (última coluna): `(valorFinal - valorInicial) / valorInicial` sobre **todo o intervalo atualmente selecionado** pelo usuário (respeita filtros Ano/Trimestre/Período). Aplicada em cada linha.

Valores negativos em `#f93f16`, positivos em `#2f982f`, zeros em `#6e6e6e`. Animações suaves em mudança de valor (`transition: color/opacity 200ms`).

## Aba Detalhamento (DataGrid)

Uma linha por **typology-period** dentro do intervalo/filtros ativos. Colunas:

`Ano | Trimestre | Período | Empreendimento | Tipo | Padrão | Tipologia | Dorm | Vagas | Qty | Vendidas | Estoque | Preço | Preço/m² | VGV`

Implementação com **TanStack Table v8** (adicionar `@tanstack/react-table` + `@tanstack/react-virtual`):

- Ordenação, filtro por coluna, pesquisa global, paginação
- Toggle de colunas, redimensionamento, cabeçalho fixo, rolagem virtual
- Copiar linhas selecionadas (TSV)
- Exportar CSV (util local) e XLSX (via `xlsx` / SheetJS)

Alterações de filtro/granularidade no Header/Sidebar refletem em ambas as abas via estado central em `ValidacaoFechamento.tsx`.

## AppLayout / rotas

- `NAV_GROUPS.rebrain.items` em `src/components/layout/AppLayout.tsx`: adicionar `{ path: '/rebrain/validacao-fechamento', label: 'Validação do Fechamento', icon: <ClipboardList/> }`.
- `src/App.tsx`: `<Route path="/rebrain/validacao-fechamento" element={<ValidacaoFechamento/>} />`.

## Persistência e responsividade

- Filtros e granularidade em `sessionStorage` (`vf-state`).
- Sidebar drawer retrátil (mesma mecânica do `Sidebar.tsx` do dash-geobrain).
- Responsivo: Header quebra em linhas <900px; Resumo com rolagem horizontal; DataGrid com rolagem virtual.
- Transições em filtro/sort/troca de aba via CSS `transition` (framer-motion opcional).

## Não incluso neste plano

- Sem alteração no `/dash-geobrain` nem no GeoApiScopeEngine (só consumo).
- Sem backend/Cloud — dados vêm da API GeoBrain existente.

## Documento vivo

Ao final, adicionar entrada em `docs/projetos/LIVE_rebrain.md` (Desenvolvimentos + Etapas 🟡 → ✅), seguindo AGENTS.md/CLAUDE.md.
