# Área Quanti — Documento Vivo

**Responsável:** Lucas · **Rota:** `/quanti` · **Página:** [`src/pages/AreaQuanti.tsx`](../../src/pages/AreaQuanti.tsx)

Doc vivo do projeto. Ver a convenção e a regra de atualização em [`README.md`](./README.md).
Atualize **Desenvolvimentos / Etapas / Pendências** sempre que sincronizar uma alteração relevante.

---

## Motor / arquitetura atual (dashboard operacional — 2026-07-13)

Área dedicada aos **dados quantitativos da Brain**, hoje operando com dashboard client-side em
`/quanti` e base da **Base Unificada 2020** hospedada no Lovable Cloud Storage.

- **Estado atual — dashboard operacional.** [`AreaQuanti.tsx`](../../src/pages/AreaQuanti.tsx)
  carrega o dashboard Banco Quanti com KPIs, filtros, gráficos, mapas, rankings e análise cruzada.
- **Fonte atual:** `base-2020.json` no bucket `quanti-datasets`, gerado a partir de
  `Base_Unificada_2020-2.xlsx`.
- **Regra da planilha:** linha 1 = variáveis, linha 2 = texto das perguntas desconsiderado,
  dados válidos a partir da linha 3.

**O que já está pronto:** exploração da base 2020 com processamento 100% client-side e registro
de datasets em `src/features/area-quanti/dashboard/datasets.ts`.

---

## 1. Desenvolvimentos

### 2026-07-13 — Mapa BR em tons de amarelo + Análise Cruzada com todas as 92 colunas — Lovable
- **O quê:** (1) mapa BR e municipal repaginados: rampa amarela (claro → âmbar profundo) para o heat, cinza mais escuro (`#c8c8c8`) para UFs/municípios sem registros, piso de intensidade elevado para que estados com poucas pesquisas já se destaquem do "sem dados", divisas visíveis (`#4d4d4d`, `1px` estados / `0.6px` cidades) e legenda com swatch dedicado "sem dados"; seleção em verde Brain para contraste com o amarelo. (2) `base-2020.json` regenerado com **todas as 92 colunas** da planilha (antes: 19), incluindo mapa `questions` (texto da linha 2 usado como rótulo). `detectFieldSchema` agora expõe todas as colunas do dataset — só exclui identificadores (`respondent_id`, `survey_id`, `Código`), coordenadas (`lat/lng/latitude/longitude`), sufixos `_original/_texto_original/_raw/_hash` e duplicatas normalizadas (`Cidade/Estado/idade_numerica/Data/Status`). Resultado: **76 colunas elegíveis** nos seletores "Agrupar por" e "Comparar com", com rótulos vindos da pergunta original quando disponível. (3) Legenda dentro das barras do gráfico da Análise Cruzada (padrão já adotado nos demais gráficos).
- **Por quê:** deixar o heat mais legível conforme paleta Brain, permitir cruzar qualquer variável da base (incluindo perguntas específicas de pesquisa) sem depender de whitelist no código, e alinhar leitura de barras com o padrão do dashboard.
- **Arquivos:** `src/features/area-quanti/dashboard/geo/GeoMap.tsx`, `src/features/area-quanti/dashboard/aggregate.ts` (`detectFieldSchema`), `src/features/area-quanti/dashboard/CrossAnalysis.tsx`, `src/features/area-quanti/dashboard/QuantiDashboard.tsx`, `src/features/area-quanti/dashboard/types.ts`; objeto `quanti-datasets/base-2020.json` no Lovable Cloud Storage (regerado com 92 colunas + `questions`).

### 2026-07-13 — Mapa BR político com drill-down + Análise Cruzada Universal — Lovable
- **O quê:** (1) substituído o choropleth de grade por um mapa político do Brasil (react-simple-maps) com drill-down UF → município, breadcrumb `Brasil › UF › Cidade`, tooltip com N e % da base, cor Brain verde e seleção destacada em amarelo `#F8D000`. Municípios carregados sob demanda via CDN (`tbrugz/geodata-br`) e cacheados em memória. Sincronizado com o store (`estado`/`cidade`). (2) Análise Cruzada agora é universal: detecta automaticamente as variáveis analíticas da base (categóricas e numéricas), oferece 7 métricas (`count`, `% total`, `% linha`, `% coluna`, `média`, `soma`, `mediana`) e 8 visualizações (tabela, barras agrupadas/empilhadas/100%, heatmap, pizza, rosca, treemap) — o app habilita só as compatíveis com a combinação. Toggle Tabela / Gráfico / Ambos, clique em barras/células filtra o dashboard inteiro.
- **Por quê:** navegação geográfica mais intuitiva e ferramenta de exploração agnóstica ao schema (funciona para futuras Bases Unificadas sem alteração de código).
- **Arquivos:** `src/features/area-quanti/dashboard/geo/{GeoMap.tsx,geo-utils.ts}`, `src/features/area-quanti/dashboard/CrossAnalysis.tsx` (reescrito), `src/features/area-quanti/dashboard/aggregate.ts` (`detectFieldSchema`, `crosstabUniversal`), `src/features/area-quanti/dashboard/QuantiDashboard.tsx`, `public/geo/br-states.json`.

### 2026-07-13 — Correção do JSON da Base Unificada 2020 — Lovable
- **O quê:** regeneração do `base-2020.json` ignorando a linha 2 da planilha e convertendo valores
  inválidos (`NaN`/infinitos) para `null`, garantindo JSON válido para o carregamento no dashboard.
- **Por quê:** corrigir o erro de abertura em `/quanti` causado por token `NaN` no arquivo JSON.
- **Arquivos:** `src/features/area-quanti/dashboard/useQuantiDataset.ts`; objeto
  `quanti-datasets/base-2020.json` no Lovable Cloud Storage.

### 2026-07-13 — Dashboard Banco Quanti operacional — Lovable
- **O quê:** implementação da aba Banco Quanti com filtros laterais, KPIs, gráficos, mapa do Brasil,
  rankings e pivot dinâmico exportável.
- **Por quê:** transformar a Base Unificada 2020 em uma experiência exploratória moderna e responsiva.
- **Arquivos:** `src/pages/AreaQuanti.tsx`, `src/features/area-quanti/dashboard/*`.

### 2026-07-08 — Base zero documentada — Gabriel
- **O quê:** criação deste doc vivo; registro de que a Área Quanti está em estágio de casca.
- **Por quê:** estabelecer a linha de base para o desenvolvimento do Lucas.
- **Arquivos:** `src/pages/AreaQuanti.tsx`.

<!-- novas entradas acima desta linha, mais recente no topo -->

---

## 2. Etapas

| # | Etapa | Status |
|---|---|---|
| 1 | Casca da página + rota `/quanti` | ✅ |
| 2 | Fonte inicial da Base Unificada 2020 no Lovable Cloud Storage | ✅ |
| 3 | Dashboard exploratório com filtros, KPIs, gráficos e mapas | ✅ |
| 4 | Análise cruzada dinâmica com exportação CSV/XLSX | ✅ |
| 5 | Definir contrato futuro da API/banco Quanti definitivo | 🔲 |
| 6 | Incluir novas safras/bases quantitativas no registry | 🔲 |

---

## 3. Pendências

- [ ] Definir o contrato futuro da API/banco Quanti definitivo (endpoints, autenticação e formatos).
- [ ] Padronizar o pipeline de geração/upload para novas bases (2019, 2021, 2022…).
- [ ] Validar com Lucas os campos prioritários adicionais além do schema atual do dashboard.
