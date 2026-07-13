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

### 2026-07-13 — Corretor v5: fluxo operacional WS-0–WS-5 — Gabriel
- **Confiabilidade e portão:** build agora inclui typecheck; análise foi dividida em DET/Ata e
  passes pagos, com confirmação obrigatória de cidade, UF e pedidos antes do gasto.
- **Entrega e correção:** relatório read-only registra o trabalho positivo; triagem por teclado
  acelera a worklist; drop no workspace reconfere a versão e encerra em R$ 0 quando não há
  imagem nova fora do cache.
- **Calibração:** `/corretor/calibracao` consolida FPs, saúde por regra, reconhecimento de
  item/grupo e CSV. Migrations v5: `20260713160000`, `20260713170000` e `20260713180000`.
- **Validação local:** 48 testes verdes e `tsc --noEmit && vite build` aprovado. File watch
  permanece explicitamente futuro; falta aplicar/verificar migrations e homologar no navegador.

### 2026-07-13 — Corretor v4: precisão antes da homologação + UI por confiança — Gabriel
- **Precisão:** corrigidos os quatro geradores de falso positivo apontados na revisão do
  Coverage 90 (projeção histórica, eixos de lacunas, totais de participação e mapas não
  analisados), além de faixas numéricas, fichas, checklist e custo/progresso da visão.
- **Interface:** o workspace agora diferencia **Erro / Provável / Verificar**, organiza a
  correção em Completude, Problemas e Por slide, permite ação em lote e registra “Não é erro
  (FP)” para calibrar o motor. Entrega bloqueia níveis 1–2; nível 3 pede confirmação.
- **Banco:** nova migration `20260713150000_corretor_v4_verdict.sql` adiciona o veredito aos
  achados v3. Roteiro de deploy/homologação atualizado no doc operacional do Corretor.

### 2026-07-13 — Corretor Coverage 90: WS2–WS8 concluídos em BETA — Gabriel
- **Motor:** cruzamentos entre tabelas, checklist de cobertura da Ata, estrutura granular,
  projeções, fichas técnicas, fonte/notas/exclusões e regras de consolidada/VSO entraram no
  passo único. Regras usam o IR e o payload de visão já cacheado, sem novo passe de IA.
- **Visão:** `analyze-table-image` evoluiu para cache v6, com unidades de ficha e fonte visível.
  A função precisa ser publicada; não há migration nova.
- **Operação:** [lista de deploy e homologação](../features/corretor-vocacionais/OPERACAO_coverage_90.md)
  separa a publicação obrigatória das validações Marka, Itajaí e GO. A meta continua condicionada
  ao harness com IR real: >=90% recall e <=15% FP.

### 2026-07-13 — Corretor Coverage 90: WS0+WS1 (recall e contexto) — Gabriel
- **WS0:** o extrator PPTX→IR agora separa notas internas de revisão (forma com fundo amarelo e
  texto vermelho) em `notas_revisao`, fora do texto auditável, e continua apontando-as como
  `LEFTOVER_NOTE`. Entraram o gabarito Marca/Tancredo (96 labels) e o harness com 57 alvos
  ancorados para medir recall DET assim que o IR real local for informado.
- **WS1:** a visão de tabelas passou a devolver localidades visíveis (`locais_visiveis`), com
  cache v5, e compara cidade/UF contra a Ata; o motor também detecta UF divergente em títulos
  textuais. Isso cobre erros de contexto sem inferir localidade a partir de números.
- **Validação:** testes de nota, contexto e harness passaram; build passou. A aferição real de
  recall ainda depende de rodar o harness com o IR do Marka e, depois do deploy, calibrar
  Marka/Itajaí (meta: >=90% recall e <=15% FP).
- **Próximo:** deploy de `analyze-table-image` e WS2 (`CROSS_TABLE_MISMATCH`) somente após a
  medição-base. Detalhes e regras: doc vivo do Corretor v0.29/v0.30.

### 2026-07-09 — Corretor v3.2: números das imagens no app (Fase C produtizada) — Gabriel
- **O quê:** o reconhecimento numérico das tabelas-imagem saiu do piloto e entrou no fluxo:
  localizador de candidatas no navegador (porte do scan_imagens.py; Marka 46/Itajaí 32,
  inclui as do piloto), edge `analyze-table-image` (JSON estrito, nunca inventa dígito),
  **`vision_cache` por sha1** (imagem paga 1× para sempre), auto-validação linha×coluna×total
  e achados `ABSOLUTE_SUM`/`BINNING_RULE` na worklist com selo IA. Custo ~R$ 0,7–1/estudo
  na 1ª vez; ~R$ 0 depois.
- **Pendências:** aplicar migration `20260709120000_corretor_v3_vision.sql` + deploy
  `supabase functions deploy analyze-table-image`.
- **Arquivos:** `supabase/functions/analyze-table-image/`, `lib/v3/{table-images,ia-vision}.ts`,
  `pages/CorretorV3Page.tsx`, migration; LIVE v0.16.

### 2026-07-09 — Corretor v3.1: IA de texto + feedback do 1º teste — Gabriel
- **Feedback aplicado:** (1) `/corretor` sem rail duplo — landing com cards → workspace com
  voltar; (2) `SOURCE_MISSING` desativada por flag (na prática ninguém preenche fonte;
  Marka 35→17 achados).
- **v3.1:** edge `analyze-text-batch` (texto do IR, batch, JSON estrito) + painel "Aprofundar
  com IA" com custo estimado antes (Marka: ~R$ 0,02 no mini vs ~R$ 6 da visão v1), achados IA
  na worklist com selo, custo acumulado (`ia_passes`). Fix: diff do recheck escopo DET.
- **Pendências:** aplicar migration `20260709110000_corretor_v3_ia.sql` + deploy
  `supabase functions deploy analyze-text-batch`.
- **Arquivos:** `supabase/functions/analyze-text-batch/`, `lib/v3/{ia-text.ts,db.ts}`,
  `pages/CorretorV3Page.tsx`, `lib/audit/ir-rules.ts`, migration; LIVE v0.15.

### 2026-07-09 — Corretor v3.0 no ar em `/corretor` (fluxo completo, R$ 0) — Gabriel
- **O quê:** primeira fatia da v3 implementada: rail de estudos (sessões retomáveis via
  Supabase) → upload .pptx → triagem DET instantânea → worklist com status
  pendente/corrigido/ignorado e progresso rumo a zero → **Reconferir** (sobe a versão
  corrigida; diff por rule_id: resolvidos/persistem/novos; correção manual que não pegou
  volta a pendente) → **Entregar** (só com 0 pendentes; selo "pronto p/ A&R").
- **Decisões:** rota `/corretor`; IA liberada p/ analista (v3.1+); calibração bug/fp separada.
- **⚠ Pendência:** aplicar a migration `20260709100000_corretor_v3.sql` no Supabase.
- **Verificação:** tsc/eslint/build ok. Fluxo contra Supabase real não exercido nesta sessão
  (depende da migration) — validar no navegador após aplicar.
- **Arquivos:** `supabase/migrations/20260709100000_corretor_v3.sql`, `lib/v3/db.ts`,
  `pages/CorretorV3Page.tsx`, `App.tsx`, `AppLayout.tsx`; LIVE v0.14.

### 2026-07-09 — Corretor v3: design da unificação (v1+v2 → um fluxo) — Gabriel
- **O quê:** decidida a v3, que absorve v1 (IA/custo/persistência/arquivo) e v2 (PPTX→IR,
  motor DET, worklist) num fluxo único de 5 estágios: Triagem (DET, R$0) → Aprofundar (IA por
  demanda com orçamento: texto-batch + visão cirúrgica) → Corrigir (worklist) → Reconferir
  (re-upload/diff) → Entregar (0 pendentes = pronto p/ A&R). Decisões: **só PPTX**, IA por
  demanda, **Supabase desde o início** (schema `*_v3`), **v3 substitui v1**.
- **Insight:** com o IR entregando o texto, ortografia/cidade/coerência viram IA de TEXTO
  (~10× mais barata) e a visão fica só para tabelas-imagem/mapas (mídia do zip, sem render).
- **Status Fase C registrado:** pilotada e validada; extração numérica automática ainda NÃO
  está no app — produtiza na v3.2 (edge + vision_cache).
- **Arquivos:** `docs/features/corretor-vocacionais/DESIGN_corretor_v3.md`.

### 2026-07-09 — PPTX → IR no navegador (upload direto do estudo na v2) — Gabriel
- **O quê:** extrator portado do Python para TS (`lib/audit/pptx-to-ir.ts`, zip via `fflate` +
  `DOMParser`). A Auditoria v2 agora aceita o **`.pptx` padrão do estudo** (além do `.ir.json`):
  o IR é gerado no navegador, sem servidor, custo zero. Gráficos ficam p/ 2ª rodada.
- **Verificação:** IR do TS **idêntico ao do `ir_extractor.py`** nos 2 estudos reais (slides,
  tabelas, notas de edição, fontes e distribuição de seções batem exatamente). tsc/eslint/build ok.
- **Próximas frentes (a pedido do Gabriel):** (1) estratégia de testes reproduzindo o fluxo de
  trabalho do analista na plataforma (melhor que "avaliar o arquivo todo"); (2) repensar a
  interface do Corretor de ponta a ponta (2ª aba lateral de projetos → forma de comunicar erros).
- **Arquivos:** `lib/audit/pptx-to-ir.ts`, `pages/AuditoriaV2Page.tsx`, `package.json` (fflate); LIVE v0.13.

### 2026-07-09 — Mapas/raios (nível 1) + persistência de thumbnails — Gabriel
- **Item 1 (mapas/raios):** regra `RADII` DET sobre o IR (raio estranho ao conjunto canônico;
  subconjuntos passam) + padrão de visualização "mapa" (chips esperado×detectado). No IR real:
  Itajaí acha 3 slides "15 min" num estudo 10/20/30; Marka consistente.
- **Item 2 (thumbnails):** migration `20260709` (`projects.reviewed_at`); persistência da
  thumbnail de **todos** os slides; `getThumbnailUrl` (URL assinada); `markProjectReviewedInDb`
  **poda as imagens dos slides OK** ao concluir a revisão. UI: thumbnail no card de erro +
  botão "Concluir revisão" + selo. Serve para auditar **falso negativo**.
- **Atenção:** migration `20260709` precisa ser aplicada no Supabase; o caminho DB/storage foi
  verificado por tsc/eslint/build, não em runtime contra o Supabase.
- **Arquivos:** `lib/audit/{model.ts,ir-rules.ts,fixtures.ts}`, `components/audit/FindingCard.tsx`,
  `lib/archive-db.ts`, `store/archive-store.ts`, `pages/{CorretorPage,CorretorAnalysisPage}.tsx`,
  `supabase/migrations/20260709000000_project_reviewed.sql`; LIVE v0.12.

### 2026-07-09 — Auditoria v2: ingestão de IR real no navegador — Gabriel
- **O quê:** a v2 agora carrega o `.ir.json` de qualquer estudo (botão "Carregar .ir.json") e
  roda o motor DET no browser (`lib/audit/ir.ts` + `ir-rules.ts`, porte do `rules_ir.py`):
  notas de edição, fonte ausente, soma de tabelas nativas, cobertura de seções, diagnóstico de
  números-em-imagem. Estudo carregado entra no seletor com veredito/export próprios.
- **Verificação:** parser TS sobre os 2 IR reais **reproduz a Fase A** (Itajaí 22+23; Marka
  14+19); se houver tabela nativa, a soma DET acende sozinha. tsc/eslint/build ok.
- **Arquivos:** `src/features/corretor/lib/audit/{ir.ts, ir-rules.ts}`, `pages/AuditoriaV2Page.tsx`; LIVE v0.11.

### 2026-07-09 — Auditoria v2 vira instrumento de validação (vereditos + export + recall) — Gabriel
- **O quê:** a demo `/auditoria/v2` ganhou persistência de vereditos (localStorage), botão
  **Exportar revisão (CSV)** com o dataset rotulado (achados + veredito + nota-gabarito) e um
  painel de **calibração ao vivo** (recall vs gabarito + falsos positivos). Fecha o loop:
  analista revê → dá veredito → exporta → medimos o corretor contra o trabalho humano.
- **Verificação:** tsc/eslint/build ok; calibração checada via tsx (3/3 gabarito → recall 100%).
- **Arquivos:** `src/features/corretor/lib/audit/session.ts`, `pages/AuditoriaV2Page.tsx`; LIVE v0.10.

### 2026-07-09 — Fase E 1ª iteração: Auditoria v2 no app (`/auditoria/v2`) — Gabriel
- **O quê:** interface v2 do corretor implementada e funcional sobre **fixtures reais do
  piloto** (custo de IA R$ 0). Catálogo central de 21 tipos de erro (retrocompatível com a v1),
  motor DET portado para TS (verificado: reproduz o piloto Python), 4 visualizações (tabela com
  células marcadas, lado-a-lado, régua de faixas, texto/checklist), página com sumário +
  cobertura dos 21 tipos + veredito por achado. Cada achado mostra seu modo (pleno/β/demo).
- **Verificação:** `tsc --noEmit` ok, eslint ok, `npm run build` ok; engine rodado via tsx
  reproduz os achados (s41/s121 fecham; faixas/janelas/binning disparam com as notas-gabarito).
- **Falta (próxima sessão):** persistência de thumbnails (todas até veredito→poda), mapas
  nível 1-2, ingestão de PPTX/IR no browser, migração `slide_errors.type`.
- **Arquivos:** `src/features/corretor/lib/error-catalog.ts`, `lib/audit/*`,
  `components/audit/FindingCard.tsx`, `pages/AuditoriaV2Page.tsx`, rota em `App.tsx`, LIVE v0.9.

### 2026-07-09 — Handoff da Fase E pronto (interface + 20 tipos de erro) — Gabriel
- **O quê:** criado `HANDOFF_fase_e_interface.md` — plano completo para a próxima sessão
  implementar a interface v2 **sem depender desta conversa**: enum de 20 tipos com modos
  PLENO/β(degradado)/mock, 6 padrões de visualização por tipo de erro, persistência de
  thumbnails "todas até o veredito, depois poda", mapas/raios em 3 níveis (DET textual →
  visão pontual β → MAP_CHART_MISMATCH), ordem de implementação e critério de pronto
  (analista vê os 20 tipos na tela com fixtures reais do piloto, sem custo de IA novo).
  **Sem código ainda — só o plano.**
- **Arquivos:** `docs/features/corretor-vocacionais/HANDOFF_fase_e_interface.md`.

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
| 6e | Corretor v2 — Fase E: interface v2 (21 tipos, visualizações, veredito, export, PPTX→IR, mapas, thumbnails) | 🟡 (no ar: **upload de .pptx** + fixtures + recall/export + RADII/mapa + thumbnails c/ poda; falta gráficos no extrator, visão nível 2 dos mapas, TEMPORAL_WINDOW sobre IR) |
| 6f | Corretor v2 — estratégia de testes do fluxo do analista | 🟡 (design ✅ + slice 1 worklist ✅; slices 2-4 absorvidos pela v3) |
| 6g | Corretor v2 — repensar a interface de ponta a ponta | 🟡 (absorvido pela v3 — ver `DESIGN_corretor_v3.md`) |
| 6h | **Corretor v5** — fluxo operacional unificado | 🟡 WS0–WS5 ✅ no código (portão da Ata, relatório, triagem, recheck cache-first, calibradora). Build + 48 testes ✅; falta aplicar/verificar migrations v5, deploy da `analyze-table-image` (cache v6), homologação real e recall >=90%. |
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
- [ ] Coverage 90: publicar `analyze-table-image` (contrato `locais_visiveis`/`unidades`/`tem_fonte`, cache v6), medir o
  harness no IR real do Marka (`CORRETOR_CALIBRATION_IR`) e calibrar Marka, Itajaí e GO (meta: >=90% recall, <=15% FP).
- [ ] Corretor v5: aplicar/verificar migrations `20260713160000`, `20260713170000` e
  `20260713180000`; homologar portão da Ata, relatório, triagem, drop/cache e calibradora no Supabase real.
- [ ] Definir se `/corretor/calibracao` permanece visível a todos os usuários internos ou exige papel específico.
- [ ] Gabriel → analista A&R: obter fórmula oficial de projeção e validar falsos positivos do checklist estrutural/fonte.
- [ ] CID: retomar validação de base quando sair do standby.
- [ ] Dívidas de segurança conhecidas — ver [`../architecture/SECURITY_NOTES.md`](../architecture/SECURITY_NOTES.md) (vulns npm, log por IP, `.env` versionado por design).
- [ ] Apontamentos Juliana: etapas 4–6 pendentes (ver memória do projeto).
