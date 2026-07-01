# Dashboard Geobrain — replicar o Dashboard_Geobrain_V3

Criar uma nova página `/dashboard-geobrain` na app que replica o dashboard Excel, consumindo as APIs Geobrain (mesmo domínio já usado em `TestesRequisicao`/`Documentacao`).

## Navegação
- Adicionar item **"Dashboard Geobrain"** como sub-item dentro do grupo **Relatórios** no menu lateral (`AppLayout`/`NavLink`), apontando para `/dashboard-geobrain`.
- Se Relatórios ainda não for um grupo expansível, promovê-lo a `SidebarGroup` com sub-itens (mantendo os relatórios existentes que já estão sob ele).

## Estrutura da página

Layout single-column com 3 blocos verticais, usando o design system existente (cards `rounded-xl`, sombra sutil, tokens semânticos, Montserrat/Source Sans 3, primária #5B7537, destaque #F8D000).

### 1. Filtros (barra fixa no topo do conteúdo)
- **Cidade**: select (padrão Curitiba — a API do usuário está restrita a Curitiba; Joinville visível como fallback histórico)
- **Período**: seletor de janela (12/24/36 meses ou "acumulado")
- Botão "Atualizar" que dispara refetch

### 2. Cartões de KPI (grid responsivo 4×2 → 2×4 → 1×8)
Fonte: aba `KPIs` / `Medidas` do Excel.

| Card | Métrica | Formato |
|---|---|---|
| Empreendimentos | `Empreendimentos` | inteiro |
| Empreendimentos ativos | `EmpreendimentosAtivos` | inteiro |
| Oferta lançada | `LancamentosAcumulados` | inteiro |
| VGV lançado | `VgvLancamentoAcc` | R$ (bi/mi) |
| Oferta final (estoque) | `Estoque` | inteiro |
| VGV estoque | `VgvEstoque` | R$ (bi/mi) |
| IVV | `IVV` | % |
| Tempo de estoque | `TempoEstoqueIVV` | meses |

### 3. Mapa de Oportunidades — matriz IVV
Fonte: aba `Dashboard` do Excel (Bairros × Dormitórios).

- Linhas = bairros da cidade; colunas = `0 dorms`, `1 dorm`, `2 dorms`, `3 dorms`, `4 dorms`.
- Célula = IVV do corte em %.
- **Heatmap** verde→amarelo→vermelho por célula, escala fixa 0–20% para comparabilidade.
- Ordenação alfabética + toggle "ordenar por IVV total"; busca por bairro; cabeçalho sticky.

### 4. Cortes analíticos (2 tabelas lado a lado no desktop)

**Por padrão construtivo** (Comercial / Horizontal / Vertical) — colunas:
AreaMediaEstoque · PrecoM2Estoque · Estoque · VgvEstoque · LancamentosAcumulados · PrecoM2Tipologia · VgvLancamentoAcc · PrecoMedioUnitario.

**Por dormitórios** (0/1/2/3/4/Cobertura) — colunas:
VgvLancamentoAcc · VgvEstoque · PrecoM2Estoque · PrecoMedioUnitario · PrecoM2Tipologia · LancamentosAcumulados · Estoque · PorcentagemVendida · DisponibilidadeSobreOfertaLancada.

Formatação: R$ compacto, m² com "m²", % com 1 casa, multiplicadores 0.0×.

## Detalhes técnicos

- **Rota**: `src/pages/DashboardGeobrain.tsx`, registrada em `src/App.tsx`.
- **Fetch**: hook `useDashboardData(city, periodo)` em `src/hooks/use-dashboard-data.ts` com React Query. Chamadas paralelas via `Promise.all`:
  - `/empreendimentos?cidade=...` → agrega KPIs top-level e cortes por `padrao_construtivo`.
  - `/tipologias?cidade=...` → agrega cortes por dormitórios e monta matriz bairro×dorm (IVV = vendas_período / oferta_inicial_período).
- **Loading**: skeletons dos cards e da tabela. **Erro**: card com mensagem + botão "tentar novamente".
- **Formatadores**: `src/lib/format.ts` (BRL compacto, %, m²).
- **Heatmap**: função `ivvColor(v)` retornando classes Tailwind semânticas — sem hex hardcoded.
- **Sem backend novo**: consumo direto das APIs Geobrain já autenticadas via `http-client`.

## Fora de escopo (perguntar depois)
- Exportar para Excel/PDF
- Gráficos de séries (o Excel atual não tem)
- Comparação multi-cidade
- Alertas de variação

## Validação
1. `tsgo` passa.
2. Playwright: abrir `/dashboard-geobrain`, screenshot desktop e mobile, checar cards com valores numéricos e matriz IVV com cores diferentes por célula.
3. Confirmar que o link aparece dentro do grupo Relatórios e que o grupo fica expandido quando a rota ativa é `/dashboard-geobrain`.
