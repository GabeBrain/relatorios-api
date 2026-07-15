# Paridade Funcional V1 — Streamlit → React (Lovable)

> Repositório de referência (somente leitura): `Testes API`
> Repositório alvo: `relat-rios-api`
> Branch de migração: `migration/v1`

---

## Checklist por Página

### Sidebar / Auth Global

| Item | Origem Streamlit | Implementação V1 Lovable | Status |
|------|-----------------|--------------------------|--------|
| Login via POST /auth/login | `src/sidebar_auth.py:138-180` | `src/store/auth-store.ts` + `src/components/layout/AuthBlock.tsx` | ✅ |
| Persistência de token (TTL 180 min) | `sidebar_auth.py:TOKEN_TTL_SECONDS` | Zustand persist + localStorage | ✅ |
| Exibir conta logada e minutos restantes | `sidebar_auth.py:114-121` | `AuthBlock.tsx` countdown | ✅ |
| Botões "Reemitir" e "Remover" | `sidebar_auth.py:124-131` | `AuthBlock.tsx` | ✅ |
| Menu de navegação entre páginas | `sidebar_auth.py:207-213` | `AppLayout.tsx` sidebar | ✅ |
| Logo Brain na sidebar | `sidebar_auth.py:185-203` | `AppLayout.tsx` | ✅ |

---

### Página `/` — Início / Mapa

| Item | Origem Streamlit | Implementação V1 Lovable | Status |
|------|-----------------|--------------------------|--------|
| Dashboard de entrada | `app.py` | `src/pages/Index.tsx` (reaproveitado) | ✅ |
| Mapa geoespacial (empreendimentos) | Lovable original | `src/pages/Index.tsx` StudyMap | ✅ |
| Adaptador API → GeoJSON pontos | N/A (novo) | `src/lib/api-to-geojson.ts` | ✅ |
| Filtros de arquitetura ligados ao mapa | N/A (novo) | Via store compartilhado | ⏳ |

---

### Página `/documentacao` — Documentação

| Item | Origem Streamlit | Implementação V1 Lovable | Status |
|------|-----------------|--------------------------|--------|
| Lista de APIs carregadas | `pages/3_Documentacoes.py` | `src/pages/Documentacao.tsx` | ✅ |
| Acordeões por operação | `pages/3_Documentacoes.py` | Accordion shadcn/ui | ✅ |
| Method / path / operationId / auth | `pages/3_Documentacoes.py` | Por operação | ✅ |
| Parâmetros path/query com tipos | `pages/3_Documentacoes.py` | Por operação | ✅ |
| Template de body JSON | `api_docs.py:build_request_body_template` | `openapi-engine.ts` | ✅ |
| Busca global de endpoint | N/A (melhoria) | Campo de busca em tempo real | ✅ |
| Botão "Testar" → Testes de Requisição | N/A (melhoria) | Navigate com estado pré-preenchido | ✅ |

---

### Página `/testes-requisicao` — Testes de Requisição

| Item | Origem Streamlit | Implementação V1 Lovable | Status |
|------|-----------------|--------------------------|--------|
| Seleção de API alvo | `pages/1_API_Testes.py:225-228` | `src/pages/TestesRequisicao.tsx` | ✅ |
| Seleção de endpoint | `pages/1_API_Testes.py:233-237` | Select dinâmico | ✅ |
| Inputs dinâmicos path/query | `pages/1_API_Testes.py:252-391` | Formulário gerado pelo motor | ✅ |
| Suporte a enum, array, data | `pages/1_API_Testes.py:302-381` | `openapi-engine.ts` + form | ✅ |
| Toggle "Enviar Authorization" | `pages/1_API_Testes.py:406-409` | Switch component | ✅ |
| Timeout configurável | `pages/1_API_Testes.py:411` | Slider | ✅ |
| Execução da request | `pages/1_API_Testes.py:428-444` | HTTP client via `http-client.ts` | ✅ |
| Painel de métricas (status, latência, bytes, content-type) | `pages/1_API_Testes.py:466-475` | MetricsBar component | ✅ |
| Request expandido (conteúdo da chamada) | `pages/1_API_Testes.py:477-486` | Accordion | ✅ |
| Response expandido com JSON | `pages/1_API_Testes.py:488-494` | JSON viewer com highlight | ✅ |
| Histórico rápido até 50 entradas | `pages/1_API_Testes.py:446-458` | localStorage persistido | ✅ |
| Cache de candidatos de path id | `pages/1_API_Testes.py:139-172` | `openapi-engine.ts` candidate store | ✅ |
| Reset body para template | `pages/1_API_Testes.py:419-421` | Botão reset | ✅ |
| Layout split-pane | N/A (melhoria) | react-resizable-panels | ✅ |
| Copiar como cURL | N/A (melhoria) | `buildCurlCommand()` util | ✅ |
| Snippets fetch/curl/python | N/A (melhoria) | CodeSnippets component | ✅ |
| Atalhos Ctrl+Enter / Esc | N/A (melhoria) | useKeyboardShortcuts hook | ✅ |

---

### Página `/testes-arquitetura` — Testes de Arquitetura

| Item | Origem Streamlit | Implementação V1 Lovable | Status |
|------|-----------------|--------------------------|--------|
| Input: cidade, UF, tipos, trimestre | `pages/4_Testes_de_Arquitetura.py:438-461` | `src/pages/TestesArquitetura.tsx` | ✅ |
| Prévia automática de empreendimentos | `pages/4_Testes_de_Arquitetura.py:474-508` | usePreview hook | ✅ |
| Coleta paralela de detalhes | Sequencial no Python (melhoria) | `Promise.allSettled` concorrente | ✅ |
| Barra de progresso em tempo real | `pages/4_Testes_de_Arquitetura.py:544-556` | Progress component + estado | ✅ |
| Retry automático para falhas parciais | N/A (melhoria) | retry logic no fetch | ✅ |
| Tabelas CONSOLIDADA / ESGOTADOS | `pages/4_Testes_de_Arquitetura.py:635-638` | Tabs + Table shadcn | ✅ |
| Métricas de resultado | `pages/4_Testes_de_Arquitetura.py:629-633` | MetricsBar | ✅ |
| Download XLSX | `pages/4_Testes_de_Arquitetura.py:641-648` | SheetJS (xlsx) | ✅ |
| Gráficos por tipologia/status | N/A (melhoria) | Recharts bar/pie | ✅ |
| Mensagens de erro/estado parcial | `pages/4_Testes_de_Arquitetura.py:567-577` | Toast + inline alerts | ✅ |

> **Diferença documentada (XLSX):** O Python usa `openpyxl` com formatação de número `0.00%` em `% Dispon.`. O SheetJS replica a estrutura e os dados; a formatação de porcentagem pode variar conforme o cliente Excel/LibreOffice. Estrutura de abas CONSOLIDADA / ESGOTADOS preservada.

---

### Página `/assistente` — Assistente AI (Stand-by)

| Item | Origem Streamlit | Implementação V1 Lovable | Status |
|------|-----------------|--------------------------|--------|
| Tela de stand-by explicativa | `pages/2_Assistente.py` | `src/pages/Assistente.tsx` | ✅ |
| Preservar rota no menu | `sidebar_auth.py:211` | AppLayout menu item | ✅ |
| Não ativar funcionalidade real | Explícito no escopo | Stand-by permanente em V1 | ✅ |

---

## Melhorias V1 (além da paridade Streamlit)

| Melhoria | Descrição | Status |
|----------|-----------|--------|
| Paralelismo na coleta de detalhes | `Promise.allSettled` vs loop sequencial Python | ✅ |
| Cache React Query | Respostas de lista em cache client-side | ✅ |
| AbortController | Cancelamento de request em voo | ✅ |
| Layout split-pane | Form + response lado a lado | ✅ |
| Histórico persistente (localStorage) | Sobrevive a F5 e fechamento | ✅ |
| Copiar como cURL | Um clique | ✅ |
| Snippets de código (fetch/curl/python) | Por endpoint | ✅ |
| Atalhos de teclado (Ctrl+Enter, Esc) | Sem mouse | ✅ |
| Busca global de endpoints | Cross-API | ✅ |
| "Testar" direto da Documentação | Navega pré-preenchido | ✅ |
| Dark mode | Toggle claro/escuro | ✅ |
| Skeletons de carregamento | UX fluida | ✅ |
| Toasts contextuais | Sonner já instalado | ✅ |
| Sidebar colapsável | Mais área de trabalho | ✅ |
| Gráficos interativos (Recharts) | Arquitetura: tipologia/status | ✅ |
| Retry automático de falhas | Arquitetura: requests parciais | ✅ |

---

## Pendências V2

- [ ] Ativar Assistente AI (depende de backend Supabase + chaves OpenAI)
- [ ] Decisões finais de backend Supabase (autenticação persistente server-side)
- [ ] Refino de fluxos de mapa (cluster avançado, 3D buildings)
- [ ] Comparação entre duas rodadas de arquitetura (diff de resultado)
- [ ] Formatação rica de XLSX (equivalente ao openpyxl)
- [ ] Múltiplos ambientes (dev/staging/prod) na sidebar

---

*Atualizado em: 2026-04-26 | Migração V1*
