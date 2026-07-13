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
