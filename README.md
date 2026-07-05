# Relatórios API — Studio Brain

Hub interno da **Brain Inteligência Estratégica** para relatórios e controle de qualidade
de dados do mercado imobiliário. Reúne consumo/documentação de APIs geoespaciais e
socioeconômicas, geração de relatórios e ferramentas de QA sobre bases de clientes.

## Stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind + shadcn/ui, Zustand, React Query, React Router
- **Backend:** Supabase (Postgres + Edge Functions em Deno)
- **Domínio:** dados IBGE / POF, APIs GeoBrain e Sócio, análise de PDFs via OpenAI

## Funcionalidades ativas

| Área | Rota | Descrição |
|---|---|---|
| Documentação API | `/documentacao` | Explorador OpenAPI (GeoBrain + Sócio) com playground |
| Testes de Requisição | `/testes-requisicao` | Console de requisições autenticadas às APIs |
| Relatório SECOVI | `/relatorios-secovi` | Geração de relatórios de mercado (export Excel) |
| Corretor \| Estudos Vocacionais | `/relatorios/corretor` | Análise automática de slides de PDF via OpenAI (revisão de estudos vocacionais) |
| TQ Piemonte — VGV Verticais | `/testes-qualidade/piemonte-vgv` | Validação de qualidade de dados VGV |
| TQ Piemonte — Release Price | `/testes-qualidade/piemonte-release-price` | Validação de release price |
| TQ CID — Validação de Base | `/testes-qualidade/cid-validacao-base` | Validação de base de dados CID |

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
(pública por design), mas o `.env` **não** é versionado. Segredos de backend (ex.:
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
