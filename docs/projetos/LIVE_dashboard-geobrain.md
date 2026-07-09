# Dashboard GeoBrain — Documento Vivo

**Responsável:** Edgar · **Rota:** `/dash-geobrain` · **Código:** [`src/features/dashboard-geobrain/`](../../src/features/dashboard-geobrain/) · Página: [`src/pages/DashboardGeobrain.tsx`](../../src/pages/DashboardGeobrain.tsx)

Doc vivo do projeto. Ver a convenção e a regra de atualização em [`README.md`](./README.md).
Atualize **Desenvolvimentos / Etapas / Pendências** sempre que sincronizar uma alteração relevante.

---

## Motor / arquitetura atual (base zero — 2026-07-08)

Dashboard de KPIs e gráficos sobre a base de empreendimentos da **API pública GeoBrain**.

- **Conexão de API — `RUNTIME`.** [`api.ts`](../../src/features/dashboard-geobrain/api.ts) consome
  `https://geobrain.com.br/public-api` via `apiGet(path, params, token, signal)`. Autenticação
  por token (reusa o auth global da plataforma). Paginação de 100 itens/página (`PER_PAGE`).
- **Normalização — `RUNTIME`.** `normalizeBuilding()` + helpers (`toNum`, `toNumOrNull`,
  `parseDate`, `parseGarage`) saneiam o payload cru da API. Domínios conhecidos:
  tipos `Vertical | Horizontal | Comercial | Hotel`; status `Ativo | Esgotado`.
- **Tipos — `RUNTIME`.** [`types.ts`](../../src/features/dashboard-geobrain/types.ts): `Building`, `Typology`, `HistoryEntry`.
- **Agregação — `RUNTIME`.** [`aggregate.ts`](../../src/features/dashboard-geobrain/aggregate.ts) computa os KPIs/séries a partir dos buildings normalizados.
- **Data hook — `RUNTIME`.** [`use-dashboard-data.ts`](../../src/features/dashboard-geobrain/use-dashboard-data.ts) orquestra fetch + agregação (React Query).
- **UI — `RUNTIME`.** [`Charts.tsx`](../../src/features/dashboard-geobrain/Charts.tsx) (visualizações),
  [`FiltersPanel.tsx`](../../src/features/dashboard-geobrain/FiltersPanel.tsx) + [`MultiSelect.tsx`](../../src/features/dashboard-geobrain/MultiSelect.tsx) (filtros por tipo/status/etc.).

**O que já está pronto:** conexão à API GeoBrain, normalização do payload, agregação de KPIs,
gráficos e painel de filtros funcionais em runtime.

---

## 1. Desenvolvimentos

### 2026-07-09 — Ajustes finos de UX e correção de filtros temporais — Edgar
- **O quê:** (1) gráficos temporais agora exibem os 12 períodos mais recentes com scroll horizontal alinhado à direita; (2) rótulos em todos os pontos da linha de tempo de estoque nos combos; (3) eixos Y ocultos em todos os gráficos; (4) linha de referência `y=1` no IPC; (5) KPIs centralizados; (6) `k` → `mil` em `numCompact`/`brlCompact`; (7) mapa de oportunidades invertido (verde=alto, amarelo=baixo); (8) novo segmentador **Períodos (mês)** na sidebar; (9) filtros Ano/Período/Dormitório/Garagem/Tipologia agora se aplicam **dentro** das entradas de histórico via helper `historyMatches`/`lastHistoryMatching`, corrigindo o bug em que categorias fora do filtro apareciam no eixo X.
- **Arquivos:** `Charts.tsx`, `Sidebar.tsx`, `KpiRow.tsx`, `OpportunityMap.tsx`, `dashboard.css`, `aggregate.ts`, `types.ts`, `src/lib/format.ts`, `src/pages/DashboardGeobrain.tsx`.

### 2026-07-08 — Base zero documentada — Gabriel
- **O quê:** criação deste doc vivo consolidando o estado atual do Dashboard GeoBrain.
- **Por quê:** estabelecer a linha de base de desenvolvimento para colaboração via git.
- **Arquivos:** todos em `src/features/dashboard-geobrain/`.

<!-- novas entradas acima desta linha, mais recente no topo -->

---

## 2. Etapas

| # | Etapa | Status |
|---|---|---|
| 1 | Conexão à API pública GeoBrain (auth + paginação) | ✅ |
| 2 | Normalização/saneamento do payload | ✅ |
| 3 | Agregação de KPIs e séries | ✅ |
| 4 | Gráficos + painel de filtros | ✅ |
| 5 | (a definir com Edgar — novos indicadores/filtros, export, etc.) | 🔲 |

---

## 3. Pendências

- [ ] Definir com o Edgar os próximos indicadores/visualizações desejados.
- [ ] Confirmar cobertura de testes (Vitest) para `aggregate.ts` e `normalizeBuilding`.
- [ ] Documentar os endpoints exatos da GeoBrain public-api consumidos (paths e params).
