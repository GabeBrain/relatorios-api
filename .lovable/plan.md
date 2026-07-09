## Ajustes no Dashboard GeoBrain (revisão final)

### 1. Gráficos temporais — janela de 12 períodos, scroll para a esquerda
- Em `Charts.tsx`, envolver cada `ResponsiveContainer` num wrapper `overflow-x-auto`.
- Quando `data.length > 12`, aplicar largura interna proporcional (`(data.length/12)*100%`) para manter 12 rótulos visíveis por vez.
- Via `useEffect` + `ref`, no primeiro render/mudança de dataset, setar `scrollLeft = scrollWidth` (períodos mais recentes visíveis; usuário rola para a esquerda para ver os antigos).
- Aplica a: Evolução, IVV, VGV, Oferta combos, IPC.

### 2. Rótulos nos gráficos de Oferta final (combos)
- Em `OfertaComboChart`: adicionar `<LabelList>` na linha `tempoEstoque` (formato meses, ex.: `12m`) exibindo o valor em **todos** os pontos, não apenas alguns.
- Manter o `LabelList` já existente sobre as barras de estoque.

### 3. Remover rótulos do eixo Y
- Em todos os gráficos (`EvolucaoChart`, `IvvChart`, `VgvChart`, `OfertaComboChart` — os dois eixos, `IpcChart`): trocar `<YAxis .../>` por `<YAxis hide />`. Eixo continua ativo para escalar, mas sem ticks.

### 4. IPC — linha de corte em 1
- Em `IpcChart`: adicionar `<ReferenceLine y={1} stroke strokeDasharray="4 4">` e garantir domínio Y incluindo 1.

### 5. KPIs centralizados
- `.dg-kpi` em `dashboard.css`: `text-align:center`; label + valor + hint centralizados.
- Ajustar `KpiRow.tsx` para layout coluna centralizada.

### 6. "k" → "mil"
- `src/lib/format.ts`: `numCompact` e `currencyCompactNoPrefix` trocam sufixo `k` por ` mil`. `numCompactBR` já está correto.

### 7. Mapa de oportunidades — inverter escala
- `OpportunityMap.tsx`: **verde = IVV alto**, **amarelo = IVV baixo**. Inverter a função `heatClass` (buckets `dg-heat-*`) e ajustar legenda.

### 8. Segmentador de períodos — apenas na Sidebar, sempre em meses
- **Não mexer no Header** nem no filtro "Ano" existente.
- Adicionar em `Sidebar.tsx` um novo `MultiSelect` **"Períodos (mês)"** com opções no formato `jan/25`, `fev/25`… derivadas de todos os `HistoryEntry.periodDate` do dataset carregado (independente da granularidade escolhida no header).
- Novo campo `periods: string[]` (chave = `YYYY-MM`) em `Filters` (`types.ts`) + `EMPTY_FILTERS`.
- Opções expostas via `extractOptions(allBuildings).months = [{ value:'2025-01', label:'jan/25' }, …]` ordenadas desc.

### 9. Aplicação correta dos filtros nas séries e agregações (bug de eixo X)
Sintoma reportado: ao filtrar `Garagem = 4+` (ou `Ano`), aparece o valor `3` no eixo X / séries. Causa: `applyFilters` filtra buildings, mas gráficos e agregações iteram sobre **typologies/history dentro do building** sem aplicar os mesmos predicados. Um building com garagens 3 e 4+ é mantido inteiro, então tipologias com garagem 3 continuam contribuindo.

Correções em `aggregate.ts`:
- Introduzir helper `matchesTypology(typology, filters)` e `matchesHistoryEntry(entry, filters)` que testam:
  - `bedrooms` (0/1/2/3/4+) → `typology.number_bedroom`
  - `garages` (0/1/2/3/4+) → `typology.garage`
  - `typologies` → `typology.type_of_typology`
  - `years` → `entry.periodDate.getFullYear()`
  - `periods` (novo, YYYY-MM) → `entry.periodDate`
- Aplicar esses predicados em **todas** as funções que percorrem tipologias/histórico: `computeKpis`, `computeSeries`, `computeOfertaPorDormitorio`, `computeOfertaPorPadrao`, `rankBairros*`, `precoM2PorPadrao`, `precoMedioPorPadrao`, `computeOpportunityMap`, `computeIpcByStandard` (no numerador — o denominador `ALL` continua sobre o dataset bruto conforme DAX).
- `applyFilters` continua fazendo filtragem em nível de building (status/cidade/bairro/type/standard/building_id) para reduzir o universo antes das agregações.

### Arquivos afetados
- `src/features/dashboard-geobrain/Charts.tsx`
- `src/features/dashboard-geobrain/KpiRow.tsx`
- `src/features/dashboard-geobrain/Sidebar.tsx`
- `src/features/dashboard-geobrain/OpportunityMap.tsx`
- `src/features/dashboard-geobrain/dashboard.css`
- `src/features/dashboard-geobrain/types.ts` (novo `periods`)
- `src/features/dashboard-geobrain/aggregate.ts` (predicados typology/history + `months` em `extractOptions`)
- `src/lib/format.ts`
- `src/pages/DashboardGeobrain.tsx`
- `docs/projetos/LIVE_dashboard-geobrain.md`
