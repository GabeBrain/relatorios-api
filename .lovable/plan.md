## Objetivo

Redesenhar `/dash-geobrain` espelhando o layout do PDF (Joinville) com novo design system verde/amarelo, header (UF + Cidade + segmentador de tipo), sidebar retrátil, 8 KPIs, gráficos temporais com mini-KPIs de variação embutidos, rankings e Mapa de Oportunidades.

## 1. Design system (scoped ao dashboard)

- Wrapper `.dash-geobrain` com CSS scoped em `src/features/dashboard-geobrain/dashboard.css`:
  - `--dg-primary: #71984a`, `--dg-accent: #f4d83f`, `--dg-muted: #6e6e6e`, `--dg-bg`, `--dg-card`.
  - `font-family: 'Archivo', Tahoma, sans-serif; font-size: 10px;` como base.
- Carregar Archivo (400/600/700) via Google Fonts em `index.html`, fallback Tahoma.
- Componentes internos usam essas variáveis — não altera tokens globais do app.

## 2. Header

```
[UF ▼]  [Cidade ▼ obrigatório]   [Comercial | Horizontal | Vertical | Hotel]   [Ano | Trim | Mês]
```

- **UF**: seletor auxiliar apenas para filtrar a lista de cidades exibidas no combobox. Não é obrigatório e não é enviado à API.
- **Cidade** (obrigatório): dispara o fetch `/building-with-history`.
- **Building Type**: chips exclusivos (default Vertical). Aplica como filtro `types` client-side.
- **Granularidade global** (Ano/Trim/Mês, default Trim): aplicada a todos os gráficos temporais.

## 3. Sidebar retrátil (filtros)

Painel colapsável à esquerda com toggle fixo. Multi-selects com "Selecionar todos"/"Limpar":

1. Ano — de `typologies_history[].period`.
2. Situação — `status` (relabel `Ativo → Comercialização`).
3. Tipologia — `type_of_typology`.
4. Padrão — `standard`.
5. Dormitórios — normalizado `0,1,2,3,4+`.
6. Vagas — normalizado `0,1,2,3,4+`.
7. Bairros.
8. Empreendimentos.

## 4. Camada de dados

- Fetch chaveado por `city` (UF interno derivado via `MUNICIPIOS_BR` só se a API exigir).
- Segmentador de tipo e sidebar são filtros client-side reativos sobre o dataset já carregado.

## 5. Formatação (`src/lib/format.ts`)

Adicionar: `numCompactBR` (1,5 mil / 1,5 mi / 1,5 bi), `pct1`, `currencyCompactNoPrefix`. Títulos de gráficos monetários recebem sufixo "(valores em R$)".

## 6. KPIs principais (8 cartões — linha superior)

Reaproveita `computeKpis()`: Empreendimentos, Ativos, Oferta Lançada, VGV Lançado, Oferta Final, VGV Estoque, IVV, Tempo de Estoque.

## 7. Mini-KPIs de variação por gráfico temporal

Cada gráfico com eixo temporal (Evolução, IVV, VGV, Performance Comercial) recebe no seu **próprio header** uma barra de mini-cartões:

```
[Desde início] [10a] [5a] [3a] [1a]
   +446%       +82%  +47% +33% +13,8%
```

- Métrica é a do próprio gráfico (unidades vendidas, IVV, VGV, IPC).
- Cálculo: `(valor_último_período − valor_período_âncora) / valor_período_âncora`.
- Âncoras derivadas do array de períodos já agregado — se não houver período correspondente, o cartão exibe `—`.

## 8. Gráficos

| Gráfico | Tipo | Cálculo |
|---|---|---|
| Evolução do mercado | Área (Lançadas × Vendidas) | Σ `qty` no período de lançamento vs Σ `sold_in_period` |
| IVV | Linha | `sold / (stock_final + sold)` |
| VGV lançado × VGV oferta final | Barras agrupadas | Σ `qty*release_price` vs Σ `vgv_stock` final |
| **Oferta final por dormitórios** | **Combo (barra + linha)** | Barra = Σ `typology_stock` (último período) por dormitório; Linha = tempo de estoque (meses) |
| **Oferta final por padrão** | **Combo (barra + linha)** | idem por `standard` |
| Top 10 bairros — maior IVV | Barras h | IVV agregado por bairro |
| Top 10 bairros — menor tempo estoque | Barras h | ordenado asc |
| Top 10 bairros — menor preço m² | Barras h | média `price_private_area` |
| Top 10 bairros — menor preço médio | Barras h | média `price` |
| Preço m² por padrão | Barras h | média `price_private_area` por standard |
| Preço médio por padrão | Barras h | média `price` por standard |
| Índice de Performance Comercial (IPC) | Área empilhada por padrão | ver §9 |
| Mapa de oportunidades | Heatmap tabela | matriz `bairro × dormitórios(1..4)` com IVV, gradiente verde→amarelo |

### Rankings — funcionalidades adicionais
- Busca por bairro embutida no header do card.
- Toggle **Top 10 apenas** (on/off) — quando off, lista completa rolável.

## 9. Índice de Performance Comercial (IPC) — DAX fiel

Para cada building `b` (dentro dos filtros ativos) e cada período `p` da granularidade escolhida:

```text
PercVendas(b, p) = UnidadesVendidas(b, p) / UnidadesVendidas(TODOS_BUILDINGS_DO_UNIVERSO, p)
PercEstoque(b, p) = EstoqueFinal(b, p)  / EstoqueFinal(TODOS_BUILDINGS_DO_UNIVERSO, p)

IPC(b, p) = EstoqueFinal(b, p) > 0
              ? PercVendas(b, p) / PercEstoque(b, p)
              : null   // BLANK()
```

Semântica do `ALL(dados)` no DAX: o denominador ignora **todos** os filtros de linha (equivale ao dataset inteiro carregado da API, antes de qualquer filtro do sidebar/header). Portanto, `PercVendas`/`PercEstoque` são calculados sobre o dataset bruto — apenas a linha `b` respeita filtros para escolher o numerador.

- No gráfico agrego por **padrão** (uma série por `standard`), calculando médias/somatórios de IPC dentro do grupo — replicando o comportamento do PDF (`Alto, Compacto, Econômico, Luxo, Médio, Standard, Super Luxo`).
- Cores das séries seguem paleta scoped (verdes/amarelo/cinza).

## 10. Arquivos

**Alterar:** `src/pages/DashboardGeobrain.tsx`, `src/features/dashboard-geobrain/aggregate.ts` (novas agregações + IPC preservando dataset "ALL"), `Charts.tsx`, `FiltersPanel.tsx` (vira sidebar), `use-dashboard-data.ts` (chave city), `src/lib/format.ts`, `index.html`.

**Criar:** `src/features/dashboard-geobrain/dashboard.css`, `Header.tsx` (UF+Cidade+chips+granularidade), `Sidebar.tsx`, `KpiRow.tsx`, `VariationStrip.tsx` (mini-KPIs de variação reutilizado por cada ChartCard), `Rankings.tsx`, `OpportunityMap.tsx`, `PerformanceIndex.tsx`.

**Doc vivo:** atualizar `docs/projetos/LIVE_dashboard-geobrain.md`.

## 11. Fora deste plano

- Top 10 Construtoras (a API não expõe construtora hoje) — substituído por Top 10 Empreendimentos por VGV.
- Persistência de estado de filtros na URL.

Confirma que posso seguir?