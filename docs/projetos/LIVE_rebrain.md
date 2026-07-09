# Rebrain (Plataforma) — Documento Vivo

**Responsável:** Gabriel · **Rotas:** `/inicio`, `/rebrain/secovi`, `/auditoria`, `/qualidade/*`, `/apis/explorer`

Doc vivo do projeto que abriga a **plataforma/shell** (o "Studio Brain" → Rebrain) e as
features que rodam sobre ela. Ver a convenção e a regra de atualização em [`README.md`](./README.md).
Atualize **Desenvolvimentos / Etapas / Pendências** sempre que sincronizar uma alteração relevante.

> **Corretor \| Estudos Vocacionais** é parte do Rebrain mas tem doc vivo próprio e detalhado:
> [`../features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`](../features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md).
> Mudanças de **regra/prompt/schema/extração** do Corretor vão lá; aqui registramos só o marco.

---

## Motor / arquitetura atual (base zero — 2026-07-08)

Hub interno da Brain para relatórios e QA de dados do mercado imobiliário.
Stack: **React 18 + TS + Vite**, Tailwind + shadcn/ui, Zustand, React Query, React Router;
backend **Supabase** (Postgres + Edge Functions em Deno).

### Infra compartilhada (plataforma) — `RUNTIME`
- **Auth global** — [`src/store/auth-store.ts`](../../src/store/auth-store.ts) + `AuthBlock`: login POST `/auth/login`, token com TTL 180 min (Zustand persist + localStorage).
- **Shell/navegação** — `AppLayout` (sidebar por área de trabalho, reorg. de 05/jul/2026), busca global **Ctrl+K**, rotas legadas redirecionam para as novas.
- **HTTP client** — [`src/lib/http-client.ts`](../../src/lib/http-client.ts): wrapper de requisições com métricas (latência, bytes, headers).
- **Integração Supabase** — [`src/integrations/supabase/client.ts`](../../src/integrations/supabase/client.ts) (chave anon pública por design; segredos de backend ficam nos secrets do Supabase).
- **Log de atividade** — [`src/lib/activity-log.ts`](../../src/lib/activity-log.ts) + Edge Function [`supabase/functions/log-activity/`](../../supabase/functions/log-activity/): registra ações na tabela `activity_log` capturando IP (x-forwarded-for), escrita via service role.

### Features sobre a plataforma
- **Corretor \| Estudos Vocacionais** — `/auditoria` — `RUNTIME`. Motor de auditoria de estudos
  vocacionais: extrator PPTX→IR ([`docs/.../ir_extractor.py`](../features/corretor-vocacionais/ir_extractor.py), IR v1),
  análise via OpenAI ([`src/features/corretor/lib/openai-analyzer.ts`](../../src/features/corretor/lib/openai-analyzer.ts) + Edge Function [`analyze-slide`](../../supabase/functions/analyze-slide/) que protege a `OPENAI_API_KEY`),
  calculadora de custo, gerador de relatório e revisão com veredito (bug real × falso positivo). **Detalhes no doc vivo próprio.**
- **Relatórios — Secovi** — `/rebrain/secovi` — `RUNTIME`. Geração de relatórios de mercado com
  export Excel ([`src/pages/TestesArquitetura.tsx`](../../src/pages/TestesArquitetura.tsx)); planilhas de referência (Barretos) em [`docs/features/relatorios-secovi/`](../features/relatorios-secovi/).
- **API Explorer** — `/apis/explorer` — `RUNTIME`. Documentação OpenAPI + console de requisições
  unificados. Motor: [`src/lib/openapi-engine.ts`](../../src/lib/openapi-engine.ts) (engine OpenAPI 3.0 portada de `Testes API/src/api_docs.py`) + [`use-openapi-docs.ts`](../../src/hooks/use-openapi-docs.ts).
- **Qualidade — CID Validação de Base** — `PLANEJADA/POC`. Base no notebook [`docs/features/cid-validacao/Validacao_Dados_CID.ipynb`](../features/cid-validacao/Validacao_Dados_CID.ipynb). CID em standby (ver memória do projeto).
- **Qualidade — Piemonte (VGV / Release Price)** — validação de qualidade de dados.

### Legado (congelado, não bundlado)
- **Mapa** (`/mapa`) e **Assistente** (`/assistente`) — aposentados; cascas informativas.
  Código preservado em [`src/legacy/mapa/`](../../src/legacy/mapa/); fontes documentadas em `DATA_SOURCES.md`.

**O que já está pronto:** auth + shell + navegação, HTTP client, integração Supabase, log de
atividade (com Edge Function), Corretor em runtime, Relatórios Secovi com export Excel, API
Explorer com engine OpenAPI. Migração Streamlit→React V1 concluída (ver [`../architecture/migration-paridade-v1.md`](../architecture/migration-paridade-v1.md)).

---

## 1. Desenvolvimentos

### 2026-07-09 — Decisão do gestor: imagem é o padrão; foco vira UI — Gabriel
- **O quê:** gestor orientou seguir os testes **com tabelas em imagem** (padrão por enquanto).
  Médio prazo: conversas com a área de elaboração (tabelas nativas ou, alternativa, pré-análise
  dos **Excels de trabalho** antes dos prints). Próximos passos focam **aparência do app e
  visualização de erros (Fase E)**. Criado o inventário completo de regras em linguagem
  natural (`regras_em_linguagem_natural.md`): 24 regras + 11 bases de conhecimento.
- **Arquivos:** `docs/features/corretor-vocacionais/regras_em_linguagem_natural.md`,
  LIVE do Corretor (v0.8).

### 2026-07-09 — Corretor v2: piloto reproduz as notas da analista + custos em R$ — Gabriel
- **O quê:** piloto expandido para 6 complementos (pares cruzados). `crosscheck_piloto.py`
  **reproduziu as notas da analista a partir dos números crus**: faixa de renda divergente
  (s59×s41/s60), lacunas 12.143≠5.478 (s121×s122), janelas 2026-31×2025-30 — **+ 1 bug bônus
  não anotado** (furo de faixa 9501-10000). Calibração aprendida: arredondamento de exibição
  pede tolerância ±n/2 em projeções.
- **Custos em R$** (`custos_visao_reais.md`): visão ≈ R$ 0,02–0,08/imagem → R$ 1,50–6,80/estudo
  → R$ 380–4.100/ano; tabela nativa = R$ 0. Argumento decisivo: exatidão + pipeline zero.
- **Arquivos:** `docs/features/corretor-vocacionais/{crosscheck_piloto.py, custos_visao_reais.md,
  visao/piloto/*(6)}`, LIVE do Corretor (v0.7).

### 2026-07-09 — Corretor v2 Fase C: piloto de visão validado de ponta a ponta — Gabriel
- **O quê:** pipeline da extração de números em imagem desenhado e pilotado. `scan_imagens.py`
  gera o manifest com sha1 (cache): 487 refs → 334 únicas → **154 únicas em seções numéricas**.
  2 extrações-piloto (Ita s41 renda; Mrk s121 lacunas — ambas de slides com nota-gabarito) no
  schema `ir_complemento_visao/v0`, validadas por `valida_complemento.py`: **48 checagens DET
  OK, 0 inconsistências**. Redundância linha×coluna×total auto-valida a extração.
- **Argumento econômico documentado** (`fase_c_visao.md`) para o time de analistas migrar a
  tabelas nativas no PPT: ~75–115 chamadas de visão/estudo → 0 para sempre, exatidão por
  construção; transição gradual começando por lacunas/renda/absorção (mapas continuam imagem).
- **Arquivos:** `docs/features/corretor-vocacionais/{scan_imagens.py, valida_complemento.py,
  fase_c_visao.md, visao/piloto/*.json}`, LIVE do Corretor (v0.6).

### 2026-07-08 — Corretor v2: virada conceitual — notas = especificação + gabarito — Gabriel
- **O quê:** reinterpretação das notas de revisão. Elas **não são bugs**: são as instruções do
  analista humano, que o corretor substitui — e não virão nos estudos reais. Passam a ser
  (1) **especificação do catálogo de regras** (36 notas mineradas em `taxonomia_notas.md` →
  tipos `CROSS_TABLE_MISMATCH`, `PROJECTION_FORMULA`, `VALUE_PLAUSIBILITY`, `WRONG_CONTEXT`,
  `BINNING_RULE`; layout fora de escopo) e (2) **gabarito de validação** (recall/precisão).
- **Impacto:** a maioria das correções humanas depende de **números presos em imagem** → a
  **extração de visão dos números (Fase C) vira caminho crítico**. `LEFTOVER_NOTE` rebaixada a
  rede de segurança. Estratégia reordenada (Fase 0→E) no `DESIGN_corretor_v2.md`.
- **Arquivos:** `docs/features/corretor-vocacionais/{taxonomia_notas.md, DESIGN_corretor_v2.md}`,
  LIVE do Corretor (v0.5).

### 2026-07-08 — Corretor v2 Fase A: motor DET rodando nos estudos reais — Gabriel
- **O quê:** `rules_ir.py` (motor de regras determinísticas puro sobre o IR, zero IA) rodado
  nos 2 estudos reais. **81 achados a custo zero**: Itajaí 48 (22 notas de edição vazadas,
  23 fonte-ausente, 3 janela de projeção fora de 2027–2032), Marka 33. Ouro: notas internas
  esquecidas no deck ("dados do estudo do Brooklin, corrigir"; "verificar, está estranho").
- **Achado estrutural:** números presos em imagem (0 tabelas com número parseado; 264/225
  imagens) → regras numéricas sem material nestes 2 estudos; destrava na Fase C (visão pontual).
- **Entregáveis:** `rules_ir.py`, `achados_fase_a.md` (relatório), `calibracao/*.secao.csv`
  (tabela para a analista da Fase B).
- **Arquivos:** `docs/features/corretor-vocacionais/{rules_ir.py, achados_fase_a.md, calibracao/}`,
  LIVE do Corretor (v0.4).

### 2026-07-08 — Corretor v2: estudos reais + estratégia de testes — Gabriel
- **O quê:** recebidos 2 estudos vocacionais reais e completos (Itajaí/SC 143 slides;
  Marka Prime/Guarulhos 165 slides). IR extraído de ambos sem erro. Achados: as **atas estão
  no slide 1 como imagem** (invisíveis ao IR v1) e a seção canônica v0 regrediu em estudos
  reais (64/143 e 48/165 slides sem seção). Definida a **estratégia de testes com economia de
  créditos** (fases A-E: DET-first → calibração de seção → ata one-shot com cache → IA em
  porções/batch/amostragem → interface v2) — ver `DESIGN_corretor_v2.md`.
- **Por quê:** tornar o corretor funcional testando com material real, expandindo tipos de
  erro e reorganizando a interface, sem estourar créditos de IA.
- **Decisões:** estudos = **PPTX** (não PDF); atas futuras = **DOCX separado** (alinhar com o
  time); PPTX pesados ficam **locais/gitignored** (157/93 MB — acima do limite do GitHub).
- **Arquivos:** `.gitignore`, `docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`
  (v0.3), `docs/features/corretor-vocacionais/DESIGN_corretor_v2.md` (estratégia + log).

### 2026-07-08 — Base zero documentada — Gabriel
- **O quê:** criação deste doc vivo consolidando plataforma + features do Rebrain.
- **Por quê:** estabelecer a linha de base de desenvolvimento para colaboração via git.
- **Arquivos:** transversal (`src/`, `supabase/`, `docs/`).

<!-- novas entradas acima desta linha, mais recente no topo -->

---

## 2. Etapas

| # | Etapa | Status |
|---|---|---|
| 1 | Migração Streamlit → React V1 (paridade) | ✅ |
| 2 | Reorganização de navegação por área de trabalho | ✅ |
| 3 | Auth global + shell + busca Ctrl+K | ✅ |
| 4 | Log de atividade (front + Edge Function) | ✅ |
| 5 | Corretor Vocacionais em runtime (auditoria + veredito) | ✅ |
| 6 | Corretor v2 — IR versionado/validado | ✅ (entregável 1; validado também nos 2 estudos reais) |
| 6.0 | Corretor v2 — Fase 0: mineração da taxonomia das notas (catálogo + gabarito) | ✅ (`taxonomia_notas.md`) |
| 6a | Corretor v2 — Fase A: regras DET sobre o IR dos estudos reais (custo zero) | ✅ (81 achados; `rules_ir.py` + `achados_fase_a.md`) |
| 6b | Corretor v2 — Fase B: calibração da seção canônica com a analista | 🔲 |
| 6c | Corretor v2 — Fase C: **extração de visão dos números** presos em imagem (caminho crítico) + ata, com cache | 🟡 (piloto validado: 48 checagens OK; falta edge function + 28 imagens do gabarito) |
| 6d | Corretor v2 — Fase D: catálogo de regras derivado das notas, validado contra o gabarito (recall/precisão) | 🔲 |
| 6e | Corretor v2 — Fase E: interface v2 (relatório por seção→tipo de erro→achado, custo estimado, execução por porção) | 🔲 |
| 7 | Relatórios Secovi (export Excel) | ✅ |
| 8 | API Explorer (OpenAPI + console) | ✅ |
| 9 | Qualidade CID / Piemonte | 🟡 (CID em standby) |

---

## 3. Pendências

- [ ] Corretor v2: executar as fases A→E da estratégia de testes (ver `DESIGN_corretor_v2.md`) — próxima ação: Fase A (regras DET sobre o IR, custo zero) + gerar tabela de calibração da Fase B.
- [ ] Corretor v2: calibrar dicionário de seção canônica com a analista (item 2 do plano; agora com os 2 estudos reais como base) — ver doc vivo do Corretor.
- [ ] Alinhar com o time o formato dos artefatos por estudo: slides sempre em **PPTX** (não PDF) e ata sempre em **DOCX separado** (nunca print no slide 1). Vale a partir dos próximos estudos; os 2 atuais seguem com ata em imagem (Fase C).
- [ ] **Gabriel → time de analistas (médio prazo, semanas):** propor tabelas nativas no PPT com os argumentos de `fase_c_visao.md`/`custos_visao_reais.md`; **plano B**: pré-análise dos Excels de trabalho (origem dos prints) — bater os números direto na fonte antes da colagem no PPT. Decisão do gestor (09/jul): até lá, **imagem é o padrão**.
- [ ] Fase E (foco atual): reorganizar a interface do corretor — relatório por seção→tipo de erro→achado, visualização de erros sobre a thumbnail, custo estimado antes de rodar IA.
- [ ] Expandir o enum de tipos de erro (`analysis-store.ts`) para o catálogo da rubrica + tipos evidenciados pelas atas reais (`ATA_COVERAGE` etc.).
- [ ] CID: retomar validação de base quando sair do standby.
- [ ] Dívidas de segurança conhecidas — ver [`../architecture/SECURITY_NOTES.md`](../architecture/SECURITY_NOTES.md) (vulns npm, log por IP, `.env` versionado por design).
- [ ] Apontamentos Juliana: etapas 4–6 pendentes (ver memória do projeto).
