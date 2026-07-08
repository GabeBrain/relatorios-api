# Área Quanti — Documento Vivo

**Responsável:** Lucas · **Rota:** `/quanti` · **Página:** [`src/pages/AreaQuanti.tsx`](../../src/pages/AreaQuanti.tsx)

Doc vivo do projeto. Ver a convenção e a regra de atualização em [`README.md`](./README.md).
Atualize **Desenvolvimentos / Etapas / Pendências** sempre que sincronizar uma alteração relevante.

---

## Motor / arquitetura atual (base zero — 2026-07-08)

Área dedicada aos **dados quantitativos da Brain**, a ser conectada por API a um **banco Quanti
próprio** (banco de dados distinto do Supabase da plataforma).

- **Estado atual — casca `em implementação`.** [`AreaQuanti.tsx`](../../src/pages/AreaQuanti.tsx) é
  hoje uma página informativa (ícone + descrição + escopo previsto). **Ainda não há motor,
  client de API nem consultas.**

**Escopo previsto (do próprio componente, `PLANEJADA`):**
- Conexão via APIs com o banco Quanti (autenticação e client dedicados).
- Consulta e exploração das bases quantitativas.
- Relatórios e visualizações sobre os dados quanti.

**O que já está pronto:** apenas a rota (`/quanti`) e a casca da página. Nenhuma integração
funcional ainda — este é o ponto de partida do Lucas.

---

## 1. Desenvolvimentos

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
| 2 | Definir contrato da API do banco Quanti (endpoints, auth) | 🔲 |
| 3 | Client dedicado + autenticação ao banco Quanti | 🔲 |
| 4 | Consulta/exploração das bases quantitativas | 🔲 |
| 5 | Relatórios e visualizações sobre os dados quanti | 🔲 |

---

## 3. Pendências

- [ ] Definir onde vive o banco Quanti e como é a autenticação (chave, token, VPN?).
- [ ] Especificar o contrato da API (endpoints, formatos de resposta).
- [ ] Decidir se o client segue o padrão de `src/lib/http-client.ts` ou terá client próprio.
- [ ] Alinhar com o Lucas o primeiro caso de uso concreto (qual base, qual relatório).
