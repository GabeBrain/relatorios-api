## Ajuste

No segundo heatmap da página ("Mapa de oportunidades — Padrão"), inverter os eixos:

- **Linhas:** bairro (`neighborhood`)
- **Colunas:** padrão (`standard`) — lista dinâmica extraída dos dados filtrados
- **Célula:** IVV = vendas / (estoque + vendas) no período mais recente do escopo, mantendo a escala de cor amarelo → verde já existente.

O primeiro mapa ("Mapa de oportunidades — Bairro") continua com colunas por dormitório (1, 2, 3, 4+), sem alteração.

## Detalhes técnicos

`src/features/dashboard-geobrain/aggregate.ts`
- Estender `computeOpportunityMap` com um segundo eixo configurável, por exemplo `colBy: 'bedroom' | 'standard'` (default `'bedroom'`).
- Quando `colBy === 'standard'`, as colunas são coletadas dinamicamente dos `b.standard` presentes nos dados filtrados, ordenadas em pt-BR; agregar estoque e vendas por par (bairro, padrão) no `latestPeriodInScope`.
- Manter o payload compatível com `OpportunityMatrix` (`rows`, `cols`, `data[row][col]`, `rowLabel`) para o componente `OpportunityMap` não precisar mudar.

`src/pages/DashboardGeobrain.tsx`
- Trocar a chamada atual `computeOpportunityMap(filtered, filtersWithType, 'standard')` (que hoje muda a linha) por `computeOpportunityMap(filtered, filtersWithType, { rowBy: 'neighborhood', colBy: 'standard' })` — ou equivalente segundo a assinatura estendida.
- Manter título "Mapa de oportunidades — Padrão" e ajustar o `subtitle` para refletir "IVV por bairro × padrão".

`docs/projetos/LIVE_dashboard-geobrain.md`
- Registrar a correção em nova entrada de *Desenvolvimentos*.

Sem alterações visuais adicionais: escala de cor, busca, altura, ordenação e tooltips permanecem como estão.
