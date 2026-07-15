# Relatórios API — Studio Brain

Hub interno da **Brain Inteligência Estratégica** para relatórios e controle de qualidade
de dados do mercado imobiliário. Reúne consumo/documentação de APIs geoespaciais e
socioeconômicas, geração de relatórios e ferramentas de QA sobre bases de clientes.

## Stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind + shadcn/ui, Zustand, React Query, React Router
- **Backend:** Supabase (Postgres + Edge Functions em Deno)
- **Domínio:** dados IBGE / POF, APIs GeoBrain e Sócio, análise de PDFs via OpenAI

## Funcionalidades ativas

Navegação organizada por área de trabalho (reorganização de 05/jul/2026). Rotas antigas
redirecionam para as novas. Busca global com **Ctrl+K**.

| Área | Rota | Descrição |
|---|---|---|
| Início | `/inicio` | Home do Studio: KPIs, acesso rápido e atividade recente |
| Relatórios — Secovi | `/relatorios/secovi` | Geração de relatórios de mercado (export Excel) |
| Relatórios — Dashboard Geobrain | `/relatorios/dashboard-geobrain` | KPIs e filtros sobre a base Geobrain |
| Auditoria de Estudos (Corretor) | `/auditoria` | Análise de estudos vocacionais + revisão com veredito (bug real × falso positivo) |
| Qualidade — Piemonte VGV | `/qualidade/piemonte/vgv` | Validação de qualidade de dados VGV |
| Qualidade — Piemonte Release Price | `/qualidade/piemonte/release-price` | Validação de release price |
| Qualidade — CID Validação de Base | `/qualidade/cid/validacao-base` | Validação de base de dados CID |
| API Explorer | `/apis/explorer` | Documentação OpenAPI + console de requisições unificados (abas) |

## Legado

As páginas **Mapa** (`/mapa`) e **Assistente** (`/assistente`) foram aposentadas
funcionalmente — a versão ativa é desenvolvida por outro time, fora deste repositório.
As rotas exibem cascas informativas; o código está preservado em
[`src/legacy/mapa/`](./src/legacy/mapa/) e as fontes de dados (removidas do working tree
para aliviar o repositório) estão documentadas e são recuperáveis via git — ver
[`src/legacy/mapa/DATA_SOURCES.md`](./src/legacy/mapa/DATA_SOURCES.md).

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencher com as credenciais do Supabase
npm run dev            # http://localhost:8080
```

Outros scripts: `npm run build` (produção), `npm test` (Vitest), `npm run lint` (ESLint).

### Variáveis de ambiente

Ver [`.env.example`](./.env.example). A `VITE_SUPABASE_PUBLISHABLE_KEY` é a chave **anon**
(pública por design). O `.env` **é versionado de propósito** — o Lovable builda a partir do
repositório e lê as `VITE_SUPABASE_*` dele (ver `docs/architecture/SECURITY_NOTES.md`, item 3).
Segredos de backend (ex.:
`OPENAI_API_KEY` da edge function `analyze-slide`) ficam nos secrets do Supabase, nunca no
frontend.

## Estrutura de pastas

```
src/
├── pages/            Páginas ativas (rotas em App.tsx)
├── features/         Features autocontidas (padrão pages/lib/store/components)
│   └── corretor/       Corretor | Estudos Vocacionais
├── components/       ui/ (shadcn), layout/ (AppLayout, AuthBlock)
├── hooks/ lib/ store/ integrations/   Infra compartilhada
└── legacy/mapa/      Código congelado do Mapa (não bundlado)
supabase/
├── functions/        Edge Functions (analyze-slide)
└── migrations/       Schema SQL
docs/                 Documentação — ver docs/README.md
```

Documentação detalhada em [`docs/`](./docs/README.md).
