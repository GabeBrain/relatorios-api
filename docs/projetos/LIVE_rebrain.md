# Rebrain (Plataforma) — Documento Vivo

> **Panorama V2 · revisão visual pós-deploy · 31/ago/2026:** produção confirmou quatro resíduos da V1: capa vermelha ainda é a primeira página, fundos 2026 foram aproximados em CSS, rodapé legado é injetado globalmente e comprime inclusive equipe/consultor, e o carregamento não informa percentual/ETA. A inspeção dos PPTX mostrou fundos vazios canônicos nos slides 1–4 do deck institucional, correspondentes a capa, divisória, equipe e conteúdo do estudo da Baixada. Plano terminal: [`PLAN_TERMINAL_CORRECAO_VISUAL_V2_POS_DEPLOY_2026-08-31.md`](../features/Relatorios%20Secovi_FIERGS/PLAN_TERMINAL_CORRECAO_VISUAL_V2_POS_DEPLOY_2026-08-31.md). **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.

> **Panorama V2 · ponderação e horizontais multicidades · 31/ago/2026:** IVV, ticket e preço por m² agora consolidam municípios por **média ponderada pelo estoque final** no mesmo fechamento, segmento e recorte; quando o endpoint não oferece estoque correspondente, o relatório preserva o valor disponível com média simples e não inventa peso zero. Testes do motor: **16/16 aprovados**. Auditoria autenticada do fallback legado `building-with-history` para Guarujá, Praia Grande, Santos e São Vicente encontrou 75 horizontais: somente 3 Condomínios de Casas (todos em Praia Grande) entram no universo Secovi; 72 outros horizontais ficam excluídos. O endpoint v2 respondeu 401 com esse token e permanece sob fallback legado explícito até paridade de autenticação. **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.

> **Panorama V2 · 31/ago/2026:** base visual implementada (capa multicidade, sumário/divisórias dinâmicos e créditos híbridos); `official_v2/` guarda os três perfis fixos aprovados. O modelo calcula comparativos municipais apenas quando toda a coleta fecha; falta posicionar as três lâminas condicionais no manifesto e homologar preview/PDF multicidades.

> **Panorama V2 · consistência temporal multicidades · 31/ago/2026:** antes de homologar comparativos, validar a mistura de séries mensais e trimestrais por cidade. O código atual concatena linhas e agrega por trimestre sem contrato de frequência; ele também não reconhece período explícito `1T2026`. Mapeamento e portão de aceite: [`MAPEAMENTO_V2_MULTICIDADES_2026-08-31.md`](../features/Relatorios%20Secovi_FIERGS/MAPEAMENTO_V2_MULTICIDADES_2026-08-31.md). **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.

> **Panorama V2 · evidência autenticada · 31/ago/2026:** token efêmero GeoBrain validado em leitura. `sales` de Guarujá trouxe 22 períodos distintos na janela de 17 trimestres, combinando fechamento trimestral e meses intermediários; a normalização temporal é portão obrigatório. Plano terminal para a Luna: [`PLAN_LUNA_VALIDACAO_TEMPORAL_MULTICIDADES_V2.md`](../features/Relatorios%20Secovi_FIERGS/PLAN_LUNA_VALIDACAO_TEMPORAL_MULTICIDADES_V2.md). **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.

> **Panorama V2 · correção temporal multicidades · 31/ago/2026:** implementado normalizador por município antes do consolidado: fluxos preservam meses, total trimestral explícito tem precedência e snapshots/taxas usam o último ponto disponível até o fechamento. Cobertura: 5 testes novos + 14 regressões existentes e build de produção aprovados. A Luna deve executar a auditoria autenticada e gerar o preview/PDF das quatro cidades; não reimplementar o motor. **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.

**Responsável:** Gabriel · **Rotas:** `/inicio`, `/rebrain/secovi`, `/corretor`, `/atualizador-vgv`, `/qualidade/*`, `/apis/explorer`

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

### 2026-08-31 — Panorama V2: enquadramento integral e mercado municipal por segmento — Gabriel + Codex

- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — capa, institucional, encerramento e comparativos multicidade.
- **O quê:** a capa passou a usar “Panorama imobiliário de”; os conteúdos institucionais ganharam área segura inferior para não cortar a lista de valores; e os fundos V2 passam a preencher o canvas 16:9 sem `cover`, preservando integralmente a arte do encerramento institucional. O comparativo de mercado deixou de somar cada cidade em uma linha: agora reproduz a referência com linhas distintas de residencial vertical e Condomínio de Casas por município, seguidas do total geral.
- **Cobertura multicidade:** a referência Baixada possui três comparativos quantitativos por cidade: vendas líquidas, mercado por segmento e disponibilidade vertical por padrão. Os três estão no manifesto condicional; as demais páginas daquele bloco são consolidadas ou narrativas, não tabelas municipais adicionais.
- **Verificação:** 58 testes direcionados e build de produção aprovados. O aceite visual autenticado em preview/PDF permanece pendente neste ambiente sem runner de navegador.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{components/{ReportPaginator.tsx,MarketSlides.tsx},print/panorama-print.css,report/model.ts,types.ts,__tests__/report-model.test.ts}`, `docs/features/Relatorios Secovi_FIERGS/MAPEAMENTO_V2_MULTICIDADES_2026-08-31.md`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** conteúdo e enquadramento seguem o deck de referência; falta somente a homologação visual e numérica autenticada no recorte real.

### 2026-08-31 — Panorama V2: encerramento único e comparativos condicionais — Gabriel + Codex

- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — manifesto, sumário, leitura contínua e exportação PDF.
- **O quê:** removidas as referências finais duplicadas 61 e 62; a referência 60 é o único encerramento institucional do livro. Em recortes com todas as cidades concluídas, o manifesto passa a inserir após o resumo de mercado três páginas: vendas líquidas por município, oferta/disponibilidade por município e disponibilidade vertical por padrão × cidade. Sumário, paginação, leitura contínua e PDF consomem o mesmo manifesto: 57 páginas no recorte simples e 60 no multicidade completo. Coleta parcial continua sem comparativos.
- **Unidades e preço horizontal:** a correção de VGV municipal em R$ milhões permanece aplicada antes da normalização. Para Condomínio de Casas, preço/área/R$/m² vêm do `building-with-history`, única fonte que permite filtrar o subtipo Secovi; o endpoint temporal agrega todos os horizontais e não pode substituir essa fonte sem reintroduzir loteamentos. Ausência desses campos no payload permanece indisponibilidade explícita, não zero.
- **Verificação:** 60 testes direcionados aprovados e build de produção aprovou. O runner visual autenticado não está disponível neste ambiente; conferir em produção o recorte real e o PDF continua sendo o aceite visual.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{report/manifest.ts,components/ReportPaginator.tsx,pages/PanoramaSecoviFiergsPage.tsx,__tests__/pdf-export.test.ts}`, `docs/features/Relatorios Secovi_FIERGS/MAPEAMENTO_V2_MULTICIDADES_2026-08-31.md`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** as páginas comparativas deixam de ser pendência de implementação; resta homologar, com sessão GeoBrain autenticada, os valores reais de vendas e preços e a composição visual do PDF.

### 2026-08-31 — Panorama V2: estabilidade multicidade, unidades monetárias e margens — Gabriel + Codex

- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — geração, séries temporais, preview e PDF.
- **O quê:** removida a previsão de tempo instável, preservando o percentual por chamadas realmente concluídas; limitada a coleta a uma cidade e quatro requisições simultâneas para evitar o cancelamento do fallback de empreendimentos observado em recortes de três cidades. Vendas e R$/m² sem fonte temporal passam a declarar indisponibilidade, sem preencher tabelas/gráficos com zeros. O VGV das fontes municipais agora é convertido de reais para **R$ milhões antes da normalização**, corrigindo séries e faixas anuais que exibiam valores em reais sob legenda de milhões. As páginas V2 receberam margem interna segura, sem comprimir fundos, capa ou rodapé.
- **Verificação:** 29 testes direcionados aprovados e build de produção aprovado; preview local com fixtures confirmou margem de sumário, divisória, página institucional, tabela e PDF. O runner `agent-browser` não está instalado e o Playwright compartilhado aponta dependência ausente; a homologação autenticada do recorte real segue pendente.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{api.ts,pages/PanoramaSecoviFiergsPage.tsx,components/PanoramaLoadingState.tsx,components/ReportPaginator.tsx,components/MarketSlides.tsx,print/panorama-print.css,__tests__/report-model.test.ts}`, `docs/features/Relatorios Secovi_FIERGS/MAPEAMENTO_V2_MULTICIDADES_2026-08-31.md`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** comparativos municipais continuam calculados, mas ainda precisam das três páginas condicionais e da homologação autenticada de vendas/R$/m²; nenhuma ausência de fonte deve voltar a se passar por resultado numérico.

### 2026-08-28 — Teste headless da exportação percentual do AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — exportação Excel.
- **O quê:** adicionada cobertura Vitest para a conversão dos percentuais, o tipo numérico das células, o formato `0.00%` e a preservação de valores nulos/vazios.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`, `src/pages/__tests__/RelatorioAelo.test.ts`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.

### 2026-08-28 — Landing de entrada orientada por objetivo — Gabriel + Codex
- **Ambiente/funcionalidade:** `/inicio` — página de entrada da plataforma Rebrain.
- **O quê:** substituído o painel operacional de KPIs de auditoria e atividade recente por uma landing de direcionamento. A página agora organiza os ambientes por três objetivos (gerar relatório de mercado, analisar mercado/pesquisa e validar/atualizar dados), identifica o tipo de estudo em cada destino e permite destacar os fluxos por público (Analistas, Pesquisa, Gestão, Operação ou Técnico). Todos os módulos ativos possuem acesso direto; API Explorer ficou como ferramenta de apoio.
- **Verificação:** build de produção e typecheck aprovados. Conferência local em navegador confirmou conteúdo, rota `/inicio` e ausência de overlay de erro; o ambiente bloqueou somente o carregamento das fontes externas do Google.
- **Arquivos:** `src/pages/Home.tsx`, `src/App.css`.
- **Impacto em Etapas/Pendências:** a entrada deixa de depender de métricas que não orientavam a escolha do usuário. O próximo aceite é validar com os públicos reais a nomenclatura dos objetivos e o encaixe de cada fluxo.

### 2026-08-28 — Panorama: remoção da abertura residual — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — composição do livro, prévia e exportação PDF.
- **O quê:** retirada da V1 a abertura estática `Panorama imobiliário de {cidade}` (referência 4), pois ela não recebe com segurança os municípios do recorte. A capa dinâmica da página 2 continua sendo a única capa com cidades; a máscara CSS experimental foi removida integralmente, sem afetar os slides institucionais.
- **Verificação:** o manifesto agora contém 60 páginas ativas, sem as referências 4 e 56; 108 testes da feature, typecheck e build de produção aprovados.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{report/manifest.ts,components/ReportPaginator.tsx,print/panorama-print.css,__tests__/pdf-export.test.ts}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** a abertura só deve retornar numa V2 com composição dinâmica aprovada; o mapa permanece suspenso até configuração e homologação Mapbox no deploy.

### 2026-08-28 — Panorama: mapa de empreendimentos temporariamente desativado — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — slide de mapa de empreendimentos verticais.
- **O quê:** removido o slide de mapa da composição do preview e do PDF enquanto o ambiente publicado não recebe `VITE_MAPBOX_ACCESS_TOKEN`. O livro passa a ter 61 páginas e os controles usam a contagem real; a abertura de Localização permanece como peça editorial, sem exibir um mapa indisponível.
- **Verificação:** manifesto e contrato de exportação atualizados; testes da feature, typecheck real e build de produção aprovados nesta entrega.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{report/manifest.ts,components/ReportPaginator.tsx,__tests__/pdf-export.test.ts}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** mapa passa a ser V2 até a chave Mapbox estar configurada no deploy e o PDF autenticado ser homologado.

### 2026-08-28 — Panorama: erros da GeoBrain em linguagem de produto — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — geração do panorama quando séries temporais não podem ser consultadas.
- **O quê:** a falha técnica dos endpoints temporais passou a ser traduzida para quatro orientações práticas: sessão expirada/sem permissão, indisponibilidade momentânea da GeoBrain, consulta recusada que exige ajuste da integração do relatório, ou ausência de dados publicados para o recorte. A mensagem informa de quem é a próxima ação e confirma que o relatório foi bloqueado para não representar a indisponibilidade como zero.
- **Verificação:** 108 testes do Panorama, typecheck real e build de produção aprovados; testes dedicados cobrem acesso, provedor indisponível, requisição inválida e resposta vazia.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{api.ts,__tests__/api-error-messages.test.ts}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** usuários não técnicos passam a receber uma orientação acionável sem códigos HTTP; a investigação autenticada de Jundiaí continua necessária se a API não publicar séries para o recorte.

### 2026-08-28 — Panorama: impedir séries temporais vazias de virarem zeros — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — vendas, preços, estoque e IVV por trimestre.
- **O quê:** corrigido o fallback que aceitava `HTTP 200` com lista temporal vazia como fonte disponível e, por consequência, compunha gráficos e tabelas inteiros com zero. Uma resposta sem linhas agora é identificada na proveniência; quando todos os endpoints temporais de uma cidade estão indisponíveis, a geração é interrompida com os endpoints e seus status, em vez de produzir um relatório numérico falso.
- **Verificação:** 105 testes do Panorama, typecheck real e build de produção aprovados. Próximo aceite: executar Jundiaí autenticado e registrar a mensagem retornada para corrigir o contrato/parâmetro que estiver sem dados.
- **Arquivos:** `src/features/panorama-secovi-fiergs/api.ts`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** nenhuma lâmina temporal deve voltar a representar indisponibilidade da API como valor zero; permanece necessária a evidência autenticada de Jundiaí para fechar a causa no endpoint.

### 2026-08-28 — Panorama: mapa do slide 56 passa a usar Mapbox — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — mapa de empreendimentos verticais (slide 56).
- **O quê:** substituído o mosaico CARTO, que passou a inserir marca d’água sem chave, por tiles Mapbox no mesmo planejador limitado e testado. A chave pública é lida exclusivamente de `VITE_MAPBOX_ACCESS_TOKEN`; sem ela, o slide informa que o fundo cartográfico não está configurado e não faz requisição incompleta. O arquivo de exemplo documenta a variável sem registrar valor.
- **Verificação:** 105 testes do Panorama, typecheck real e build de produção aprovados. Próximo aceite: conferir o PDF autenticado com a variável também configurada no ambiente de deploy.
- **Arquivos:** `.env.example`, `src/features/panorama-secovi-fiergs/{lib/map-tiles.ts,components/MarketSlides.tsx,__tests__/map-tiles.test.ts}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** eliminada a dependência de tiles CARTO sem credencial; manter a chave Mapbox restrita aos domínios da aplicação e cadastrada no ambiente publicado.

### 2026-08-28 — Panorama: capa estática consistente e rótulos de preço legíveis — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — slide 3 e série histórica de preço por m².
- **O quê:** o texto residual `Panorama imobiliário de` da arte estática foi neutralizado no slide 3, pois o nome do recorte pertence exclusivamente à capa dinâmica da página 2; a máscara foi calibrada pela posição real do canvas, sem alterar a capa PMI. No gráfico de preço por m², os rótulos trimestrais agora alternam quatro patamares, preservam proximidade com o ponto e desenham guia fina sempre que precisam ser deslocados.
- **Verificação:** 105 testes do Panorama, typecheck real e build de produção aprovados. Ajuste visual deve ser conferido no próximo PDF autenticado.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{components/ReportPaginator.tsx,print/panorama-print.css}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** o mapa do slide 56 não usa mais uma fonte de tiles sem credencial: a CARTO passou a exigir chave para remover a marca d’água. A alternativa recomendada é uma chave pública gratuita configurada por ambiente; migrar para provedor vetorial sem chave é uma tarefa separada porque muda a captura do PDF.

### 2026-08-28 — Panorama: nunca exportar relatório zerado por falha de coleta — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — geração de relatório e coleta de empreendimentos.
- **O quê:** a primeira tentativa de migração do contrato granular para v2 fez a coleta municipal falhar e o fluxo anterior ainda renderizava o modelo indisponível como tabelas zeradas. A coleta v2 agora possui fallback explícito para o contrato legado já funcional; se ambos falharem, nenhuma cidade concluída gera erro humano com cidade e causas dos dois contratos, sem exibir nem permitir exportar um PDF fictício de zeros.
- **Verificação:** testes da feature, typecheck real e build executados nesta entrega. Próximo aceite: recorte autenticado de Jundiaí deve voltar a apresentar dados legados; caso v2 falhe, a tela explicará o status sem ocultá-lo.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{api.ts,pages/PanoramaSecoviFiergsPage.tsx}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** nenhum relatório vazio será apresentado como resultado; a promoção definitiva para v2 continua dependente de evidência autenticada de paridade.

### 2026-08-27 — Panorama: contrato granular v2 e geocoordenadas decimais — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — coleta de empreendimentos, slide 49 e slide 56.
- **O quê:** identificado e corrigido o parser que removia o ponto decimal de coordenadas retornadas como string pelo contrato v2 (por exemplo, `-23.1857` virava `-231857` e era descartado como fora do globo). A coleta granular do Panorama foi alinhada ao endpoint `POST api.geobrain.com.br/public-api/v2/building-with-history`, já utilizado pelo Dashboard GeoBrain, cobrindo status Ativo/Esgotado e deduplicando por empreendimento. O vazio do slide 49 agora separa claramente ausência de Condomínio de Casas elegível da ausência de preço no universo permitido; a política Secovi continua sem assumir que todo horizontal é condomínio.
- **Verificação:** 105 testes do Panorama, typecheck real e build aprovados. Os dois endpoints respondem 401 sem JWT neste ambiente; validar o payload v2 autenticado de Jundiaí é o próximo aceite para confirmar campos de subtipo/preço e a recuperação dos pontos no mapa.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{api.ts,domain/cube.ts,components/MarketSlides.tsx,__tests__/opus-cube-aggregations.test.ts}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** o erro determinístico de geolocalização foi removido; a pendência restante é evidência autenticada para mapear o subtipo horizontal oficial e confirmar a cobertura real de preços.

### 2026-08-27 — Panorama: capa central, ausência de dados explícita e isolamento por página — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — capa 2, slides 48–49, leitura contínua e exportação.
- **O quê:** a composição da capa 2 foi centralizada no canvas inteiro: cidade, faixa amarela e trimestre ocupam o mesmo eixo vertical, com a faixa entre o nome e o período. As lâminas de coorte e preço agora removem anos integralmente zerados e mostram uma mensagem objetiva quando a API não devolve dados observados; em especial, o slide 49 não apresenta mais a tabela enganosa `Média Geral —`. A renderização de cada página foi isolada por um error boundary: uma lâmina com falha passa a apresentar seu estado local, preservando a leitura e a exportação das demais. O planejador de tiles tem teste adicional para extremos geográficos válidos, mas inviáveis.
- **Verificação:** testes da feature, typecheck real e build de produção pendentes desta entrega; a QA autenticada deve confirmar a leitura de 62 páginas e distinguir mensagem de ausência de dado de falha da API.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{components/{ReportPaginator.tsx,MarketSlides.tsx},print/panorama-print.css,__tests__/map-tiles.test.ts}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** leitura contínua deixa de ter uma única falha global; falta o aceite visual autenticado da capa e a investigação de origem para qualquer ausência de dado que persista na API.

### 2026-08-27 — Panorama: leitura contínua protegida contra coordenadas inválidas — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — ação `Ver as 62 páginas`, slide 56.
- **O quê:** corrigido o `Invalid array length` que interrompia a leitura contínua: o gerador de tiles agora descarta latitude/longitude fora do globo, limita o mosaico a 20 tiles e não monta o fundo cartográfico quando o recorte é impossível. A contagem de pontos do slide 56 passou a considerar apenas coordenadas válidas.
- **Verificação:** typecheck real, build e 103 testes do Panorama aprovados, incluindo coordenada extrema e `NaN`.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{lib/map-tiles.ts,components/MarketSlides.tsx,__tests__/map-tiles.test.ts}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** a leitura de 62 páginas não deve mais depender da validade geográfica completa do retorno da API; validar manualmente no recorte que reportou a falha.

### 2026-08-27 — Panorama: tipologia real da API, capa sem corte e mapa base — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — slides 2, 14–27, 34–37 e 56.
- **O quê:** a inspeção do contrato `BuildingWithHistoricResource` identificou que a API entrega a tipologia em `number_bedroom` (com `type_of_typology` como alternativa), enquanto o adaptador lia apenas aliases inexistentes; isso criava a linha espúria `Não classificado`. O cubo agora lê os campos oficiais também para vendas por período e preço/m². A capa municipal usa a arte inteira sem recorte, centraliza melhor o título e exibe o trimestre uma única vez. Labels históricos ficam próximos ao ponto, recebem fundo que evita invasão da curva e linha-guia somente quando afastados. O mapa ganhou mosaico CARTO/OSM sem chave, com atribuição e pontos projetados nas coordenadas reais.
- **Verificação:** endpoint sem JWT retornou HTTP 401 neste ambiente; contrato OpenAPI local revisado. Typecheck real, build e 102 testes do Panorama aprovados. Falta a confirmação visual autenticada e a exportação PDF com tiles carregados.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{domain/cube.ts,lib/map-tiles.ts,components/{ReportPaginator.tsx,MarketSlides.tsx},print/panorama-print.css,__tests__/{opus-cube-aggregations.test.ts,map-tiles.test.ts}}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** etapa 7a mantém QA autenticado como próximo portão; o dado de tipologia deixa de depender do fallback visível. A infraestrutura de tiles gratuita precisa apenas ser validada na geração real antes do aceite final.

### 2026-08-27 — Panorama: capa municipal única, carregamento com marca e rótulos protegidos — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — geração e apresentação do deck.
- **O quê:** a posição 2 passou a ser a única capa com o nome das cidades, usando `secovi-cover.jpg` e composição responsiva; capas/aberturas restantes não repetem o nome do recorte. O carregamento inicial e as atualizações em segundo plano usam o componente visual com a marca Brain. Rótulos das séries históricas agora ficam acima dos pontos, omitem zeros e recebem margem adicional do eixo X para impedir colisões; o painel de filtros ganhou coluna de UF independente e botão verticalmente centralizado.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{pages/PanoramaSecoviFiergsPage.tsx,components/PanoramaLoadingState.tsx,components/ReportPaginator.tsx,print/panorama-print.css}`.
- **Verificação:** typecheck real, testes da feature, build e QA visual local devem ser repetidos após a integração; PDF autenticado de 62 páginas permanece o aceite final.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** etapa 7a segue em QA autenticado; falta confirmar a capa e a não sobreposição em dados reais. Layout novo de tabelas e exportação PPTX continuam V2.

### 2026-08-27 — Panorama: plano visual até o slide 33 a partir dos prints — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — filtros, geração e slides 1–33.
- **O quê:** os dez primeiros apontamentos visuais foram diagnosticados e transformados em plano: multi-select pesquisável com chips, range inicial/final, bloqueio de refetch pesado, correção da capa 2, rodapé dinâmico, legibilidade/colisão de labels, tag vertical compacta e ordenação semântica. O plano inclui causas no código, sequência e matriz de prints para aceite.
- **Arquivos:** `docs/features/Relatorios Secovi_FIERGS/PLAN_CORRECOES_VISUAIS_ATE_SLIDE33_2026-08-27.md`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** etapa 7a permanece em QA; próximo portão é implementar P0–P7 e comparar os prints até o slide 33 antes da inspeção integral do novo PDF.

### 2026-08-27 — Panorama: execução das correções visuais e de fluxo até o slide 33 — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — filtros, geração, capa 2, rodapé e gráficos dos slides 1–33.
- **O quê:** implementado multi-select pesquisável com chips, período inicial/final inclusivo (`1T2022`–`2T2026` sugerido), query sem refetch automático/skeleton de background, overlay semântico da capa municipal, grid de rodapé dinâmico, tipografia maior, supressão de labels zero, tag vertical compacta e ordenação semântica antes dos cortes.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{pages/PanoramaSecoviFiergsPage.tsx,components/PanoramaCityMultiSelect.tsx,components/PanoramaQuarterRangePicker.tsx,components/ReportPaginator.tsx,components/MarketSlides.tsx,print/panorama-print.css,api.ts,domain/quarters.ts,lib/launches.ts,report/model.ts,types.ts}`.
- **Verificação:** typecheck real (`tsconfig.app.json`), build de produção e 99 testes da feature aprovados; QA Playwright headless confirmou rota, período padrão e abertura do range picker sem token. QA autenticado, PDF real de 62 páginas e comparação visual completa permanecem pendentes.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** etapa 7a segue em QA autenticado; novo portão é validar multi-cidade, chamadas únicas, rodapé/capa e slides 14–33 com dados reais. Tabela Rebrain e PPTX continuam V2.

### 2026-08-27 — Panorama: refinamento do painel de filtros e confirmação do período — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — painel de seleção antes da geração.
- **O quê:** reorganizada a grade responsiva para alinhar UF, municípios, período e ação; textos e chips ganham áreas controladas para não deslocar o cabeçalho. O range picker agora mantém um rascunho visual e só aplica início/fim após `Confirmar período`; `Cancelar` descarta a alteração.
- **Arquivos:** `src/features/panorama-secovi-fiergs/pages/PanoramaSecoviFiergsPage.tsx`, `src/features/panorama-secovi-fiergs/components/PanoramaQuarterRangePicker.tsx`, `src/features/panorama-secovi-fiergs/components/PanoramaCityMultiSelect.tsx`.
- **Verificação:** typecheck, suíte da feature e QA Playwright do fluxo de confirmação aprovados.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** geração/API permanecem inalteradas; falta repetir o aceite com token e cidades reais.

### 2026-08-27 — Panorama: verificação antes × agora de Jundiaí — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — auditoria pós-integração da V1.
- **O quê:** criado relatório operacional que compara comportamento anterior e atual de cada requisito, reúne evidências de código/testes e cruza individualmente as 28 anotações do PDF de Jundiaí por slide. Itens dependentes de token/PDF real e itens V2 ficaram explicitamente separados.
- **Arquivos:** `docs/features/Relatorios Secovi_FIERGS/VERIFICACAO_ANTES_AGORA_JUNDIAI_V1.md`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** etapa 7a ganha checklist operacional para QA autenticado, PDF de 62 páginas e nova homologação da Juliana.

### 2026-08-27 — Panorama: integração Luna + Opus concluída para validação final — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — V1 Jundiaí.
- **O quê:** handoff `OPUS_READY` revisado; contrato `cities[]`, política Secovi, período dinâmico e agregações granulares foram conectados à UI/PDF. O manifesto mantém a referência 3 na posição 7, a seleção de municípios é multi-cidade, e os slides 31–51 consomem linhas prontas do cubo com nulos explícitos e remoção da Faixa de Valor sem fonte.
- **Verificação:** typecheck real (`tsconfig.app.json`) aprovado; suíte 230/230; build de produção gerado; rota local HTTP 200. QA visual autenticado e PDF real de 62 páginas ainda precisam ser executados no ambiente com token/agent-browser.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{domain,types.ts,api.ts,report/model.ts,components,pages,report/manifest.ts,lib/pdf-export.ts}` e testes/documentação associados.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** etapa 7a aguarda somente QA autenticado, PDF final e homologação; G-04/G-05 permanecem V2.

### 2026-08-27 — Panorama: execução da V1 dividida entre Luna e Opus — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — estratégia de execução paralela das correções de Jundiaí.
- **O quê:** o plano terminal foi separado em duas trilhas com propriedade de arquivos: Opus implementa domínio/API/agregações sem staging ou commit; Luna implementa UI/PDF, aguarda o handoff `OPUS_READY`, revisa o conjunto e cria o único commit integrado após a verificação das 62 páginas. Foram incluídos protocolo contra interferência, contrato congelado, marcadores de handoff e CTAs independentes.
- **Arquivos:** `docs/features/Relatorios Secovi_FIERGS/{PLAN_LUNA_CORRECOES_V1_JUNDIAI.md,PLAN_OPUS_CORRECOES_V1_JUNDIAI.md}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** etapa 7a permanece em andamento; próximo portão é iniciar as duas trilhas na mesma base e concluir a integração única pelo Luna.

### 2026-08-27 — Panorama: feedback de Jundiaí mapeado e plano terminal da V1 — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — fechamento da V1 após retorno da analista.
- **O quê:** inspecionados os 62 slides e as 28 anotações internas do PDF corrigido de Jundiaí; cada comentário foi resolvido em requisito, ponto técnico e critério de aceite. O mapa incorpora também multi-cidade, períodos posteriores a 1T/26 e a política Secovi de verticais + somente Condomínio de Casas no horizontal. Criado plano terminal para o Luna executar código, QA das 62 páginas, PDF final e resposta de e-mail à Juliana.
- **Escopo:** novo padrão visual de tabelas e exportação PPTX foram formalmente adiados para V2 por ausência de referência/decisão do card; resumo/narrativas permanecem não homologados porque Juliana declarou não tê-los revisado nesta rodada.
- **Arquivos:** `docs/features/Relatorios Secovi_FIERGS/{MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md,PLAN_LUNA_CORRECOES_V1_JUNDIAI.md}`.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.
- **Impacto em Etapas/Pendências:** etapa 7a continua em andamento; o portão agora é executar o plano, gerar novo PDF de Jundiaí e obter a segunda validação da analista.
### 2026-08-28 — Percentuais numéricos no Excel AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — exportação Excel.
- **O quê:** campos percentuais passam a ser gravados como números, sem símbolo no valor da célula; o formato numérico `0,00%` é aplicado diretamente nas células.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.

### 2026-08-28 — Preservação de nulos na exportação AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — tabela e exportação Excel.
- **O quê:** campos numéricos continuam sendo exportados como números; valores sem informação permanecem nulos, sem preenchimento artificial com zero. Zeros anteriores ao `release_date` continuam sendo aplicados pela regra histórica definida.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.

### 2026-08-28 — Conversão dos percentuais do AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — tabela e exportação Excel.
- **O quê:** Entrada, % de Juros Mensal e Desconto à Vista passam a usar o valor original da API dividido por 100 antes da exibição percentual, com duas casas decimais.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.

### 2026-08-26 — Ajuste dos gráficos do AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — resumos gráficos.
- **O quê:** `Tipo` permanece representando o `Padrão` (`data[].standard`); o primeiro gráfico passa a resumir `Ativos x Esgotados`, e o segundo continua resumindo o tipo de empreendimento.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.

### 2026-08-26 — IDs e organização das colunas do AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — tabela e exportação Excel.
- **O quê:** adicionados `ID Empreendimento` e `ID Tipologia`; colunas principais reorganizadas conforme o layout solicitado; colunas trimestrais agora são agrupadas por Estoque, Vendas líquidas, VGV e VGV Estoque.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.

### 2026-08-26 — Valor da parcela e precisão do VGV no AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — tabela e exportação Excel.
- **O quê:** adicionada a coluna `Valor da parcela` após `Nº de Parcelas`, preparada para o campo futuro `data[].installment_value`; valores de VGV em milhões passam a ser apresentados com duas casas decimais, mantendo tipo numérico no Excel.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.

### 2026-08-25 — Corte histórico pelo lançamento no AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — séries trimestrais de vendas e estoque.
- **O quê:** históricos anteriores ao trimestre de `release_date` passam a ser zerados para Vendas líquidas, Estoque e seus VGVs; esses períodos também deixam de influenciar a agregação a partir do lançamento.
- **Interface:** a regra também é apresentada no informativo visível “Regra da consulta AELO”.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Monday:** [Backlogs & Roadmaps](https://brain381753.monday.com/boards/18398428946) — card não informado.

### 2026-08-19 — Panorama: export 12x mais rápido e leitura contínua das 62 páginas — Gabriel + Claude
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — exportação de PDF e navegação do livro.
- **Causa medida:** o custo do export não estava nas páginas estáticas, e sim nas webfonts. O `html-to-image` re-baixava e re-embutia Montserrat/Source Sans 3 **a cada lâmina** — ~950 ms por página. Resolvendo o CSS das fontes uma única vez (415 ms) e reaproveitando-o, o export caiu de **87,4 s para 7,3 s** na bancada e ~13 s no fluxo real, com saída **byte a byte idêntica** (mesmos 9.923.588 bytes).
- **Detalhe do contrato:** `getFontEmbedCSS` filtra pelas fontes usadas no nó recebido. Resolver a partir de uma lâmina isolada devolve vazio quando ela é só imagem, o que alterava a renderização das demais; por isso o CSS é resolvido a partir da **raiz do deck**.
- **Leitura contínua:** novo modo “Ver as 62 páginas”, que exibe o livro inteiro em rolagem sem gerar arquivo — 0,38 s para montar, reutilizando as mesmas lâminas. O Sumário passa a rolar até a página, com busca restrita ao container do preview (o deck de exportação usa os mesmos rótulos e vem antes no DOM).
- **Estimativa corrigida:** a ideia de embutir os 21 PNGs oficiais direto no PDF foi **descartada**. A medição por tipo de página mostrou que as estáticas custavam 17,6% do tempo (e não ~1/3, número que vinha de contagem de páginas, não de tempo); depois da correção das fontes o ganho residual seria de poucos segundos, em troca de ~4 MB a mais no arquivo.
- **Evidência:** bancada Playwright com o `ReportPaginator` real — tempo por página por tipo, comparação byte a byte entre baseline e otimizado em 8 lâminas amostradas, e o fluxo completo com o usuário saindo da página aos 2,5 s. Typecheck, 143 testes, ESLint e build de produção aprovados.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{lib/pdf-export.ts,components/ReportPaginator.tsx}`.
- **Impacto em Etapas/Pendências:** fecha as duas melhorias que estavam previstas para a próxima etapa e torna o reteste autenticado da etapa 7a bem mais barato de repetir.

### 2026-08-19 — Panorama: exportação de PDF passa a rodar em segundo plano — Gabriel + Claude
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — exportação do livro de 62 páginas.
- **Pedido:** a rasterização leva ~90 s e prendia o usuário na página; ela deveria correr em paralelo com o resto da navegação.
- **O quê:** o job saiu da árvore da rota. Um store leve (`export-store.ts`) guarda o snapshot do modelo no clique e um host montado pelo `AppLayout` monta as 62 lâminas e executa a captura — o usuário navega para qualquer página sem interromper. O progresso vira um card fixo com barra, ação de **Cancelar** e, ao fim, download automático mais links de baixar novamente/abrir em nova aba. O botão da página virou **“Baixar PDF”**, refletindo o estado global.
- **Aba oculta:** `waitForSlide` deixou de esperar por `requestAnimationFrame`, que o Chrome não dispara em aba de fundo e congelaria o export justamente quando o usuário troca de aba; quando o documento está oculto, cede o event loop.
- **Lazy-loading preservado:** o shell monta apenas um portão que assina o store; o host é `lazy()` e só carrega quando há job ativo. O build confirma `ReportPaginator` em chunk próprio (49 kB).
- **Evidência:** Playwright com o `ReportPaginator` real e a aba se declarando oculta o tempo todo — export iniciado, usuário navegado para fora aos 6 s (paginador desmontado), job concluído e download entregue com os **mesmos 9.923.588 bytes** da execução em primeiro plano. Cancelamento testado: card e deck removidos do DOM, zero downloads, reinício normal. Typecheck, 143 testes, ESLint e build de produção aprovados.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{export-store.ts,components/PanoramaExportHost.tsx,components/PanoramaExportGate.tsx,components/ReportPaginator.tsx,lib/pdf-export.ts,lib/official-cover.ts}`, `src/App.tsx`.
- **Padrão registrado:** [`FRONTEND_DECISIONS.md`](../architecture/FRONTEND_DECISIONS.md) — trabalho longo de feature roda no shell, não na rota.
- **Impacto em Etapas/Pendências:** a etapa 7a ganha ergonomia para o reteste autenticado. Seguem em aberto, por decisão do Gabriel de testar depois: preview instantâneo das 62 lâminas sem gerar arquivo e o corte de ~1/3 do tempo embutindo os 21 PNGs oficiais direto no PDF.

### 2026-08-19 — Panorama: exportação de PDF deixa de depender de popup — Gabriel + Claude
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — botão de exportação do livro de 62 páginas.
- **Sintoma:** o clique abria uma aba `about:blank`, a rasterização levava ~90 s e ao final nada acontecia — sem arquivo baixado, sem pré-visualização e sem mensagem de erro.
- **Causa:** a aba era aberta no clique e só recebia o arquivo minutos depois, via `popup.location.href = blobUrl`. Quando essa navegação não acontece, o código não tinha plano B — o caminho de download só rodava se `window.open` tivesse retornado `null`. Somado a isso, o `catch {}` descartava o erro sem `console.error`, tornando falha e sucesso indistinguíveis para o usuário.
- **O quê:** a entrega passou a ser por download direto (`<a download>` com nome `panorama-<cidade>-<trimestre>.pdf`), sem abrir aba nenhuma. Ao final aparece “PDF pronto: N páginas” com links para **baixar novamente** e **abrir em nova aba** (agora por gesto real do usuário). O erro passou a ser logado e exibido com a mensagem real. A espera por imagens em `waitForSlide` ganhou teto de 10 s, para que um asset preso não trave a exportação inteira em silêncio.
- **Evidência:** reprodução com Playwright montando o `ReportPaginator` real — antes: PDF gerado com sucesso e aba presa em `about:blank`, sem download; depois: download de `panorama-piracicaba-1T2026.pdf` com 9,9 MB e 62 imagens embutidas, nenhuma aba extra. Typecheck, 143 testes e ESLint aprovados.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{components/ReportPaginator.tsx,lib/pdf-export.ts}`.
- **Impacto em Etapas/Pendências:** destrava o reteste visual autenticado da etapa 7a — agora o PDF chega ao disco do analista. Fica registrada a pendência de remover `lib/pdf-print-interceptor.ts`, que não é importado por ninguém e ainda carrega a estratégia antiga de popup e o override de `window.print`.

### 2026-08-18 — Panorama: V1 visual recomposta até o fechamento do livro — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — preview e PDF paginado de 62 páginas.
- **O quê:** os slides 14–26 deixam de compartilhar séries incorretas: famílias por segmento usam verde/amarelo e famílias por padrão usam econômico/demais padrões em vermelho/cinza, com títulos, resumos anuais, variações e cartões MCMV próprios. Os slides 27 e 29–56 passam a ter componentes dedicados para área/IVV, resumo de mercado, oferta por padrão/tipologia/coorte, preços, matrizes, maturidade, VGV, análises editoriais e localização. O slide 10 foi neutralizado sem o nome da cidade.
- **Contratos:** a coleta temporal passou a consultar também `Padrão` e `Tipologia`; o modelo preserva séries por grupo, diferencia soma de média simples e utiliza os campos oficiais de ticket e preço por metro. Onde a API não cobre cruzamentos de oferta lançada ou maturidade, a estrutura permanece visível com travessão e explicação metodológica, sem inventar valores.
- **Evidência:** inspeção direta dos objetos e imagens do PPTX Piracicaba 1T26; QA Chromium dos slides-chave 10, 14–19, 25, 27, 29, 31–46, 48, 49, 51, 53 e 56 sem overflow; 143 testes e build de produção aprovados.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{api.ts,types.ts,report/model.ts,components/ReportPaginator.tsx,components/MarketSlides.tsx,print/panorama-print.css}`.
- **Impacto em Etapas/Pendências:** a V1 fica visualmente testável de ponta a ponta; o portão seguinte é o reteste com dados autenticados e a calibração residual registrada por slide, mantendo inconsistências metodológicas para a Fase 2.

### 2026-08-18 — Panorama: tabelas e gráficos assumem a estrutura integral do gabarito — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — famílias dinâmicas de lançamentos, vendas e séries temporais no preview/PDF.
- **O que:** as tabelas 12/13/21/22 passam a exibir os dois períodos comparativos do deck, grupos com células mescladas, unidade monetária no cabeçalho e barras percentuais proporcionais em verde/vermelho. Os gráficos 14–19, 23–26 e 40 recebem matriz de três comparações por segmento, resumo anual, rótulos em todos os pontos e destaques do trimestre comparável. O rodapé oficial completo passa a reservar sua altura real e a mostrar a fonte Brain sem recorte.
- **Premissa:** valores e divergências permanecem originados pelos contratos da API; o gabarito define estrutura, linguagem visual e conceito, não números de runtime.
- **Limpeza editorial:** removidos os selos e textos visuais “Dados da API em validação”; ausência real de cobertura continua tratada pela página/contrato correspondente.
- **Evidência:** QA Chromium com modelo interceptado em 960×540 confirmou 9 linhas, 5 períodos + 2 deltas, 6 células na matriz de variações, 10 rótulos de série, rodapé e ausência de overflow interno. Typecheck, 141 testes e build aprovados.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{components/ReportPaginator.tsx,print/panorama-print.css}`.
- **Impacto em Etapas/Pendências:** fecha a estrutura transversal desta família; próximo portão é o reteste visual slide a slide com dados autenticados, registrando apenas deltas residuais de geometria ou componentes específicos.

### 2026-08-18 — Panorama: escala 16:9 calibrada para capas, tabelas e graficos — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — capas dinamicas e familias variaveis 12–27.
- **O que:** tipografia e espacamento deixam de depender do viewport externo (`vw`, `clamp` e minimos em px) e passam a usar unidades relativas ao proprio slide (`cqw`). As capas 1 e 2 centralizam cidade/ano pela largura do painel vermelho; tabelas usam Tahoma e proporcoes de titulo, marcador, cabecalho e linhas do deck; graficos recuperam titulo em duas linhas, painel de variacoes, faixa anual e area util sem corte.
- **Evidencia:** fontes e caixas de texto extraidas do PPTX (Tahoma 32 pt nas tabelas, Tahoma 25 pt nos graficos e 10 pt nos resumos anuais) e QA Chromium em 840x472, alem do canvas de exportacao 1920x1080.
- **Arquivos:** `src/features/panorama-secovi-fiergs/print/panorama-print.css`.
- **Impacto em Etapas/Pendencias:** corrige a escala responsiva comum; a proxima etapa estrutural continua sendo reproduzir os dois deltas das tabelas e as tres comparacoes dos graficos.

### 2026-08-18 — Panorama: capas automatizaveis passam a usar artes neutras — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — slides 1, 2 e 4 no preview e PDF.
- **Correcao de estrategia:** removida a camada DOM imperativa que permanecia no conteiner ao navegar e fazia o municipio aparecer sobre slides institucionais e tabelas.
- **O que:** o PowerPoint de referencia exportou tres bases neutras, sem os textos variaveis, e os PNGs antigos com Piracicaba sairam do bundle automatizado. Cidade, UF, ano e trimestre agora sao compostos por seletores exclusivos de cada slide, com fonte Tahoma, coordenadas extraidas do PPTX e reducao tipografica para nomes longos.
- **Evidencia:** QA em Chromium a 1280x720 com Americana confirmou que o texto aparece apenas nas tres paginas previstas; demais slides nao recebem pseudo-elementos.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{assets/official/panorama-0{1,2,4}-neutral.png,components/ReportPaginator.tsx,print/panorama-print.css}`.
- **Impacto em Etapas/Pendencias:** capas deixam de depender de termos rasterizados de Piracicaba; a proxima familia continua sendo a estrutura fiel de tabelas e graficos variaveis.

### 2026-08-18 — Panorama: UF inicial fixada em SP — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — filtros de consulta.
- **O que:** o escopo inicial passa a abrir com UF `SP`, coerente com o produto Secovi-SP; o municipio continua vazio ate o usuario escolher uma cidade autorizada pela API.
- **Impacto em Etapas/Pendencias:** nao dispara consulta pesada automaticamente e preserva o contrato GeoApiScopeEngine de limpar o municipio em toda troca de UF.

### 2026-08-18 — Panorama: municipio dinamico na capa oficial — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — capa de pesquisa, slide 1.
- **O que:** a arte oficial permanece como base visual, mas a regiao que continha Piracicaba recebeu uma camada de texto dinamica sincronizada ao municipio do recorte. Assim, Araçatuba e as demais cidades usam a mesma capa sem manter o nome do gabarito.
- **Cobertura:** preview no browser e as 62 paginas renderizadas para o PDF recebem a mesma camada.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{components/ReportPaginator.tsx,print/panorama-print.css}`.
- **Impacto em Etapas/Pendencias:** corrige a paridade funcional da capa; a calibracao estrutural de tabelas/graficos variaveis segue como proxima familia.

### 2026-08-18 — Panorama: primeira calibracao visual das tabelas e graficos variaveis — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — lancamentos e vendas, slides 12–27.
- **O que:** a regua visual passou a ser a exportacao direta do deck Piracicaba 1T26; o CSS das paginas dinamicas agora replica a hierarquia tipografica, espacos, tabela cinza, celulas de variacao com barra vermelho/verde e painel de variacao dos graficos.
- **Premissa:** os dados continuam dinamicos e os assets PNG ficam restritos aos slides efetivamente estaticos; esta etapa nao converte tabelas/graficos em imagens.
- **Arquivos:** `src/features/panorama-secovi-fiergs/print/panorama-print.css`.
- **Impacto em Etapas/Pendencias:** a proxima calibracao e estrutural: os dois deltas das tabelas e a matriz de tres comparacoes dos graficos devem ser modelados como componentes, apos validar este primeiro ajuste no browser/PDF.

### 2026-08-18 — Panorama: slides institucionais passam a usar o deck oficial — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — identidade visual do preview/PDF.
- **O quê:** PowerPoint exportou os 62 slides da referência; 24 páginas estáticas prioritárias foram incorporadas como PNGs oficiais (capas, sumário, institucional, objetivos, divisores, créditos e encerramentos). O paginador resolve o asset oficial por referência de slide e o usa tanto no preview quanto no PDF, substituindo os layouts CSS genéricos nessas páginas.
- **Arquivos:** `src/features/panorama-secovi-fiergs/assets/official/panorama-*.png`, `components/ReportPaginator.tsx`.
- **Verificação:** build de produção aprovado com todos os assets no bundle.
- **Impacto em Etapas/Pendências:** paridade visual dos blocos estáticos alcançada; próximas famílias a reproduzir fielmente são tabelas e gráficos variáveis, com o PPTX como régua visual.

### 2026-08-18 — Panorama: cubo de coorte passa a alimentar slides de lançamento — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — slides 33, 41, 42 e 48.
- **O quê:** o modelo passa a coletar o último snapshot de `typologies_history` até o fechamento selecionado e a agrupá-lo por ano de `release_date` e segmento. As páginas de coorte e sua participação agora consomem o contrato granular, em vez de aviso genérico ou estoque reutilizado.
- **Premissa:** método `ASSUMED` até confronto autenticado com Piracicaba; maturidade segue separada porque a regra Planta/Construção/Pronto ainda não foi homologada.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{api.ts,report/model.ts,types.ts,components/ReportPaginator.tsx}`.
- **Verificação:** typecheck e 141 testes aprovados.
- **Impacto em Etapas/Pendências:** próximo contrato é maturidade — comparar `building_status`, `time_on_sale` e idade desde lançamento com o gabarito antes de liberar 43–46.

### 2026-08-18 — Panorama: páginas de mercado deixam de reutilizar tabela genérica — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — slides 27–56.
- **O quê:** resumo, participação, preços e VGV passam a ter apresentações próprias; coortes e maturidade deixam de receber estoque como fallback e exibem a cobertura metodológica pendente no desenho reservado. O mapa também passa a tratar corretamente recorte sem coordenadas, sem calcular limites inválidos.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{components/ReportPaginator.tsx,print/panorama-print.css}`.
- **Verificação:** typecheck e 141 testes aprovados.
- **Impacto em Etapas/Pendências:** a repetição semântica foi removida; próxima implementação natural é o cubo granular/contratos de coorte e maturidade, que substituirão os avisos por tabelas, matrizes e participações reais.

### 2026-08-18 — Panorama: livro de 62 slides, sumário e PDF direto integrados — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — preview e exportação da V1.
- **O quê:** o manifesto agora mantém os 62 slides da referência, incluindo a capa municipal 2, com seção, família visual, contratos e estado metodológico por página. O preview recebeu sumário navegável por seção e o botão `Visualizar PDF` passou a gerar um Blob paginado diretamente, sem `window.print()`. Slides oficiais 58–62 entram como assets integrais e o exportador captura o mesmo registry do preview.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{report/manifest.ts,components/ReportPaginator.tsx,print/panorama-print.css,lib/pdf-export.ts,__tests__/pdf-export.test.ts}`.
- **Verificação:** typecheck, 141 testes e build de produção aprovados.
- **Impacto em Etapas/Pendências:** fundação de navegação/exportação concluída; falta migrar as famílias visuais/contratos específicos de mercado para eliminar o `MetricTable` genérico das páginas 29–56 e executar QA visual slide a slide.

### 2026-08-18 — Panorama: Fase 0 fecha o mapa de paridade Piracicaba 1T26 — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — especificação da V1.
- **O quê:** definido o escopo de 62 slides (incluindo a segunda capa), preview/sumário por seção e PDF paginado como artefato V1; o mapa integral associa cada família visual aos contratos, fórmulas e estados metodológicos. Páginas sem método preservam estrutura e sinalização, sem repetir tabelas ou inventar dados.
- **Evidência:** consulta direta ao PPTX de referência (62 slides, 13,333 × 7,5 pol.; objetos, textos, imagens, tabelas e gráficos nativos) e ao gabarito congelado. O PowerPoint COM não pôde exportar imagens nesta sessão por falta de logon interativo; QA visual final segue previsto em ambiente com PowerPoint.
- **Arquivos:** `docs/features/Relatorios Secovi_FIERGS/MAPEAMENTO_FASE0_PIRACICABA_1T26.md`, `PLAN_TERRA_V1_PARIDADE_APRESENTACAO_E_PDF_v5.md`, `DECISOES_E_PREMISSAS_PANORAMA.md`.
- **Impacto em Etapas/Pendências:** mapa e plano terminal fechados; próximo portão é executar registry de 62 slides/sumário + PDF direto, seguido da reconstrução visual/contratual. Divergências residuais ficam isoladas para a Fase 2 metodológica.

### 2026-08-18 — Carregamento e tipos numéricos na exportação AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — busca de empreendimentos e exportação Excel.
- **O quê:** restaurada a renderização do estado de carregamento antes do processamento da busca; campos numéricos permanecem numéricos no Excel, incluindo VGV convertido para milhões.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.

### 2026-08-18 — Formato numérico dos valores de VGV AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — tabela e exportação Excel.
- **O quê:** os valores de VGV deixam de usar os sufixos `R$` e `M` e passam a ser exibidos no formato numérico padrão, com a informação de que estão convertidos para milhões pela divisão por `1.000.000`.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.

### 2026-08-18 — Ajuste da exportação AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — tabela e exportação Excel.
- **O quê:** registros ativos e esgotados passam a ser exportados juntos na mesma planilha; percentuais mantêm o valor original da API e recebem apenas o símbolo `%`; valores de VGV são exibidos em milhões, sem casas decimais.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.

### 2026-08-18 — Formatação percentual do Excel AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — tabela e exportação Excel.
- **O quê:** os campos Entrada, % de Juros Mensal e Desconto à Vista passam a exibir sempre duas casas no padrão `0,00%`, normalizando os valores percentuais da API.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.

### 2026-08-18 — Correção dos cálculos de VGV no Excel AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — tabela resumo e exportação Excel
- **O quê:** restauradas as colunas solicitadas “VGV Lançado” e “m² Lançado”; VGV histórico, VGV Estoque histórico e VGV Lançado passam a usar o Preço atual do último período da tipologia, com a regra informada também na interface.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Impacto em Etapas/Pendências:** cálculos ajustados; homologar os valores exportados com a planilha AELO de referência.

### 2026-08-18 — Correções da consulta e prévia do Relatório AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — consulta API e escopo geográfico
- **O quê:** incluído informativo da regra de consulta; registros da prévia passam a ser reutilizados na busca final, corrigindo o resultado vazio após uma prévia com empreendimentos; o seletor de Município fica oculto somente no AELO e a consulta usa exclusivamente UF.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`, `src/features/shared/geo-api-scope-engine/GeoApiScopeSelector.tsx`.
- **Impacto em Etapas/Pendências:** prévia e busca final alinhadas; validar a resposta real do endpoint interno com os quantitativos de SP.

### 2026-08-18 — Relatório AELO: endpoint interno e catálogo de municípios — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — coleta, escopo e exportação do relatório AELO
- **O quê:** migração para `POST /public-api/v2/building-with-history-internal` por UF, tipo Horizontal fixo, filtro de padrões de loteamento e municípios do catálogo AELO; inclusão do de-para de Região Administrativa, início do período em 4T2017, status atual/tipologia e formatação de datas/percentuais na tabela e Excel.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`, `src/features/relatorios-aelo/municipios-aelo.ts`.
- **Impacto em Etapas/Pendências:** coleta e estrutura do AELO ajustadas ao catálogo oficial; homologar resposta do endpoint interno, paginação e valores exportados com o usuário.

### 2026-08-17 — Medidas trimestrais e campos do Relatório AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — relatório AELO
- **O quê:** removida a duplicidade entre “Unidades por Tipologia” e “Oferta por lotes”; corrigida a segmentação de tempo de vendas para aceitar `time_on_sale`/`time_on_sales`; adicionadas colunas trimestrais de VGV (`sold_in_period × price`), Estoque (último snapshot disponível do trimestre) e VGV Estoque (`estoque × preço`).
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Impacto em Etapas/Pendências:** medidas trimestrais disponíveis no AELO; validar os recortes com a base AELO e homologar os valores com o usuário.

### 2026-08-17 — Panorama: dossiê de status para retomada — Gabriel + Codex
- **Estado real:** a demonstração tem coleta/estrutura parcial e slides corporativos finais fiéis, mas não está pronta como reprodução integral: PDF do recorte real e contratos das páginas 29–56 seguem bloqueadores.
- **Evidência:** `ReportPaginator` continua roteando coorte, participação e maturidade para `stock.units`/`MetricTable`; o PDF atual rasteriza DOM por ponte sobre `window.print`, abrindo a aba antes de existir Blob.
- **Próximo passo:** seguir a ordem fixa do [`DOSSIER_STATUS_PANORAMA_2026-08-17.md`](../features/Relatorios%20Secovi_FIERGS/DOSSIER_STATUS_PANORAMA_2026-08-17.md): PDF direto, registry antirrepetição, cubo granular e contratos 29–56.

### 2026-08-17 — Panorama: recuperação visível do exportador PDF — Gabriel + Codex
- **Ambiente/funcionalidade:** ação `Visualizar PDF` do Panorama.
- **O quê:** o clique passa a abrir a aba antes da geração, mostrar progresso página a página e expor erro recuperável na interface. O fluxo não depende mais de falha silenciosa no console; se o visualizador for bloqueado, a geração mantém um link explícito para abrir o Blob PDF.
- **Verificações:** suite de 141 testes e build concluídos após o ajuste.

### 2026-08-17 — Panorama: seis lâminas corporativas oficiais no preview e PDF — Gabriel + Codex
- **Ambiente/funcionalidade:** páginas finais 57–62 de `/rebrain/panorama-secovi-fiergs`.
- **O quê:** exporta diretamente do `Panorama_Secovi_SP_Piracicaba_1T26_vApres_28MAI_13h50.pptx` as seis páginas finais em PNG 1920×1080 e substitui os placeholders por suas imagens integrais. Equipe, consultores, peças institucionais, QR code e encerramentos passam a preservar composição, fotos, logos e rodapé do material aprovado, tanto no preview quanto no PDF rasterizado.
- **Verificações:** typecheck, 141 testes e build concluídos. A correção dos contratos dinâmicos 29–56 continua como próximo bloco obrigatório do plano v4.

### 2026-08-17 — Panorama: plano v4 de fidelidade total e slides estáticos — Gabriel + Codex
- **Diagnóstico:** placeholders corporativos e reaproveitamento de `stock.units` persistem em páginas de coorte, participação e maturidade; ambos contradizem o deck oficial e o gabarito congelado.
- **Decisão:** o plano v4 obriga exportar e usar os slides estáticos oficiais como imagem integral, cria registry auditável por página e separa os contratos/visuais das referências 29–56. Página sem dimensão coberta deve declarar ausência, nunca reutilizar outra tabela.
- **Próximo passo:** executar [`PLAN_TERRA_FIDELIDADE_TOTAL_SLIDES_E_STATICOS_v4.md`](../features/Relatorios%20Secovi_FIERGS/PLAN_TERRA_FIDELIDADE_TOTAL_SLIDES_E_STATICOS_v4.md) na `main`.

### 2026-08-17 — Panorama: PDF rasterizado de uma página por slide — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — visualização/exportação do relatório.
- **O quê:** a exportação deixa de depender do layout de impressão para compor o arquivo. O gerador captura cada slide ativo isoladamente em 1920×1080 e monta um Blob PDF com página 16:9 correspondente; o arquivo abre em nova aba no visualizador nativo do navegador. A capa municipal redundante foi removida do manifesto de saída, deixando 61 páginas ativas.
- **Verificações:** testes validam a proporção 16:9 e a contagem/ordem sem a capa duplicada; typecheck, suite de testes e build foram executados com sucesso.
- **Pendência real:** a validação visual autenticada do PDF completo publicado continua necessária, assim como a implementação dos contratos específicos de Mercado Imobiliário previstos no plano v3.

### 2026-08-17 — Panorama: revisão do exportador PDF e contrato rasterizado — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — ação `Exportar PDF`.
- **Diagnóstico:** o botão atual executa `window.print()` e depende de uma árvore `hidden print:block`; no teste publicado o navegador imprimiu o shell, somente a página corrente e uma folha residual, totalizando duas páginas desconfiguradas.
- **Decisão:** o plano v3 passa a exigir geração explícita de um Blob PDF rasterizado, com uma página 16:9 por slide ativo, abertura no visualizador nativo do navegador, progresso, fallback de download e validação via `pdfjs-dist`. PDF editável e PPTX ficam fora desta fase.
- **Próximo passo:** Terra deve implementar e testar o exportador antes de considerar o relatório publicável.

### 2026-08-17 — Panorama: plano v3 para corrigir Mercado Imobiliário e encerramento — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — páginas 29–56 e encerramento corporativo.
- **O quê:** diagnóstico confirmou que páginas de padrão, coorte, tipologia, maturidade e horizontais reutilizam indevidamente a mesma tabela de `stock.units`. O plano v3 define contratos e visuais próprios por intenção, uma única capa, validação antirrepetição no manifesto e incorporação integral dos seis slides corporativos finais exportados do deck oficial.
- **Regra de dados:** números continuam exclusivamente derivados das APIs; metodologia aberta gera selo e rastreabilidade, nunca valor substituto ou cópia de outra dimensão.
- **Próximo passo:** executar [`PLAN_TERRA_CORRECAO_MERCADO_E_ENCERRAMENTO_v3.md`](../features/Relatorios%20Secovi_FIERGS/PLAN_TERRA_CORRECAO_MERCADO_E_ENCERRAMENTO_v3.md) direto na `main`, validar visualmente as referências 29–56, rodar testes/build e publicar.

### 2026-08-17 — Panorama: bases oficiais, coleta ampliada e páginas quantitativas — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — preview/PDF 16:9.
- **O quê:** extrai e incorpora assets autorizados dos dois PPTX oficiais (capa e assinatura), substitui o paginador genérico por composição editorial Secovi, páginas institucionais, divisórias, encerramentos, matrizes trimestrais/anuais e gráficos com 17 trimestres, curva monotônica, destaques comparáveis e variações. O relatório passa a coletar em paralelo lançamentos, vendas, estoque, IVV, ticket, preço/m² e coordenadas.
- **Regra de dados:** status metodológico aberto não oculta mais dado retornado. As páginas mostram os valores e a fórmula/fonte da API com selo “Em validação”; ausência somente aparece quando a fonte não cobre o recorte.
- **Impacto em Etapas/Pendências:** assets e estrutura visual estão no produto; restam QA autenticado lado a lado do PDF e homologação de universos/agregações com analistas, especialmente VGV lançado, grupos e IVV por área.

### 2026-08-17 — Panorama: plano v2 de reprodução fiel e dados visíveis — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — reconstrução integral do relatório/PDF.
- **O quê:** novo plano terminal corrige a interpretação de metodologia aberta: valores disponíveis nas APIs devem continuar visíveis com selo de validação. Define uso obrigatório dos decks Panorama e `PPT Institucional_2026 - Widescreen_NOVO (1)`, reprodução fiel das páginas institucionais/divisórias, tabelas comparativas oficiais, gráficos de 17 trimestres, coleta completa, textos determinísticos e QA visual das 62 páginas.
- **Impacto em Etapas/Pendências:** a próxima execução substitui o esqueleto genérico atual por layout reconhecível e amplia o `PanoramaReportModel` para Vendas, Estoque, IVV, preços, coortes, maturidade e mapa; analistas permanecem responsáveis apenas pela homologação dos tratamentos sinalizados.

### 2026-08-17 — Panorama: PDF editorial de 62 páginas com fonte única — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — livro paginado e impressão 16:9.
- **O quê:** implementa `PanoramaReportModel`, manifesto versionado das 62 intenções editoriais e templates reutilizáveis para capa, divisória, tabela, gráfico, narrativa, metodologia e encerramento. Uma coleta de `building-with-history` por recorte alimenta os lançamentos do PDF; não há valores do gabarito, mock ou hardcode em runtime.
- **Estados e pendências:** lançamentos observados recebem visualizações reais; Vendas, Estoque, IVV, preços, coortes, mapa e horizontais mantêm página e intenção, mas comunicam metodologia aberta até homologação. Impressão nativa preserva todas as páginas 16:9.
- **Impacto:** a demonstração passa a mostrar a estrutura completa do produto, isolando com transparência as fórmulas e filtros que dependem da próxima rodada com analistas.

### 2026-08-17 — Panorama: plano terminal do PDF para demonstração — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — relatório paginado/PDF.
- **O quê:** define a implementação do `PanoramaReportModel`, manifesto das 62 intenções editoriais, templates e visualizações alimentadas exclusivamente pela API, estados metodológicos sem mocks, impressão 16:9, QA visual e roteiro de demonstração ao Diego.
- **Impacto em Etapas/Pendências:** Terra pode executar o PDF completo em paralelo à calibração metodológica; a demo evidencia a fábrica pronta e isola filtros/fórmulas ainda dependentes dos analistas.

### 2026-08-17 — Panorama: diagnóstico único e dossiê de calibração — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — modo Diagnóstico.
- **O quê:** substitui a tabela operacional longa por resumo de status por bloco, uma única ação para executar Lançamentos/Vendas/Estoque/IVV e um dossiê completo de calibração. A tela passa a consumir o contrato granular promovido de lançamentos, eliminando a soma indevida de snapshots históricos. IVV deixa de somar percentuais por padrão.
- **Impacto em Etapas/Pendências:** próximo teste verifica o diagnóstico consolidado e o XLSX; a próxima implementação é a bancada granular concorrente de Vendas/Estoque e o IVV ponderado.

### 2026-08-17 — Panorama: dossiê copiado em Markdown — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — modo Diagnóstico.
- **O quê:** substitui o download XLSX por uma área de texto Markdown gerada sob demanda e um botão de cópia. O conteúdo completo da calibração fica na sessão para ser colado diretamente na conversa de análise.
- **Impacto em Etapas/Pendências:** teste seguinte passa a enviar o texto copiado, sem artefato de arquivo intermediário.

### 2026-08-17 — Panorama: início das bancadas Vendas, Estoque e IVV — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — modo Validação.
- **O quê:** o resultado pós-publicação consolida os três métodos granulares de lançamentos verticais; o endpoint `releases` permanece apenas diagnóstico. A revisão manual de universo sai da UI sem apagar o mecanismo auditável. Entram gabarito executável dos slides 21–24/29, adaptadores dos endpoints `sales`, `stock` e `ivv`, e bancada separada que não promove contratos silenciosamente.
- **Impacto em Etapas/Pendências:** próxima coleta autenticada compara os endpoints e adiciona a derivação granular concorrente; só então Vendas/Estoque/IVV passam ao modelo/PDF/XLSX.

### 2026-08-17 — Panorama: T0–T2 de calibração e curadoria operacional — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — modo Validação.
- **O quê:** adiciona revisão do universo horizontal com IDs, trimestre/unidades, seleção em lote, motivo obrigatório e exclusão `release_only` persistida localmente por recorte. Corrige os parâmetros de `releases` (`per_page` e tipos) e marca empreendimentos/unidades verticais como contratos `reconciled`, mantendo horizontais como hipótese auditável.
- **Impacto em Etapas/Pendências:** analista pode agora identificar e explicar os horizontais excedentes sem alterar o relatório; próxima etapa é medir o retorno da fonte `releases` e iniciar as bancadas de Vendas, Estoque e IVV.

### 2026-08-17 — Panorama: plano de calibração integral e curadoria do universo — Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — evolução planejada do modo Validação.
- **O quê:** define bancadas análogas para Lançamentos, Vendas, Estoque, IVV, Preços, Coortes/Maturidade, VGV e Mapa; introduz exclusões auditáveis por empreendimento/grupo, com escopo global, lançamento, período ou métrica e prévia antes × depois.
- **Decisão:** divergências não bloqueiam o PDF quando o contrato tem semântica, reconciliação interna, cobertura e estado explícitos. Exclusões em lote congelam IDs e nunca alteram o gabarito congelado.
- **Arquivos:** `docs/features/Relatorios Secovi_FIERGS/PLAN_TERRA_CALIBRACAO_TODOS_BLOCOS_v1.md` e log de premissas.
- **Impacto em Etapas/Pendências:** próximo slice técnico é T0–T2: framework compartilhado, curadoria, auditoria horizontal e promoção dos contratos verticais; depois Vendas/Estoque/IVV.

### 2026-08-17 â€” Panorama Secovi/FIERGS: bancada de calibraÃ§Ã£o de LanÃ§amentos â€” Gabriel + Codex
- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` â€” modo ValidaÃ§Ã£o.
- **O quÃª:** adiciona a aÃ§Ã£o explÃ­cita **Executar calibraÃ§Ã£o**, que confronta o gabarito de Piracicaba com quatro candidatos: empreendimentos por `release_date`, unidades por `total_units`, unidades pelo `qty` do mÃªs de lanÃ§amento e `temporal-analysis-city/releases`. A tabela mostra fonte, resultado, diferenÃ§a e status de cada cÃ©lula; nenhum candidato altera o relatÃ³rio automaticamente.
- **Por quÃª:** corrigir a leitura anterior de `typologies_history.period` como lanÃ§amento e fechar o contrato com evidÃªncia antes de expandir os demais blocos.
- **Impacto em Etapas/PendÃªncias:** a homologaÃ§Ã£o Piracicaba 1T26 passa a escolher, por mÃ©trica, o mÃ©todo que reconcilia os 17 trimestres.

### 2026-08-17 — Panorama Secovi/FIERGS: primeiro slice executável de Lançamentos — Gabriel + Codex
- **Ambiente/funcionalidade:** nova rota lazy `/rebrain/panorama-secovi-fiergs` dentro de Rebrain, independente do Relatório Secovi existente.
- **O quê:** cria o modo de **Validação** (gabarito Piracicaba 1T26 × API, com valor esperado/calculado/diferença/status) e o modo **Relatório** com 11 páginas 16:9 navegáveis, tabelas e gráficos de Lançamentos, premissas/fonte e exportação por impressão nativa para PDF. A rota usa `GeoApiScopeSelector`, faz a coleta pesada somente após **Comparar dados** e não possui fallback geográfico.
- **Motor/dados:** nove contratos versionados, fixture de referência dos 17 trimestres de Piracicaba, agregação pura, comparação com tolerância e adaptador autenticado de `building-with-history`, consolidando tipologias por empreendimento/trimestre para não duplicar projetos. VGV e MCMV permanecem metodologias abertas, explicitamente comunicadas.
- **Arquivos:** `src/features/panorama-secovi-fiergs/`, `src/{App.tsx,components/layout/AppLayout.tsx,components/layout/CommandPalette.tsx,pages/Home.tsx}`, `docs/features/Relatorios Secovi_FIERGS/{GABARITO_CONGELADO_PANORAMA_PIRACICABA_1T26_v1.md,PLAN_TERRA_PANORAMA_SECOVI_FIERGS_V1.md,DECISOES_E_PREMISSAS_PANORAMA.md}`.
- **Verificação:** typecheck, 135 testes e build de produção aprovados. Lint global continua bloqueado por erros legados fora desta feature; homologação visual autenticada/Playwright e aderência à API real são pendências.
- **Impacto em Etapas/Pendências:** a etapa 7a sai de análise para protótipo funcional, mas o portão de aderência com analistas permanece obrigatório antes de chamar o PDF de relatório final.

### 2026-08-14 — Correção de codificação visual no Relatório AELO — Gabriel
- **Ambiente/funcionalidade:** `/rebrain/aelo` — textos e rótulos do relatório.
- **O quê:** corrigida a codificação UTF-8 que fazia acentos, símbolos e mensagens aparecerem corrompidos na tela e na exportação; a lógica do relatório, seus campos comerciais e o escopo GeoApi permanecem inalterados.
- **Por quê:** restaurar legibilidade dos textos no runtime após a cópia inicial da página.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Impacto em Etapas/Pendências:** AELO segue pendente apenas de homologação específica da base SP 1T26 e da formatação/unidade dos percentuais.

### 2026-08-14 — Relatório AELO no menu — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — navegação e relatório AELO
- **O quê:** novo item lateral e destino AELO com uma cópia independente da implementação do Relatório Secovi; a página inicia com os mesmos filtros, escopo GeoBrain, coleta, estados e exportação, mas possui código próprio para evoluir sem afetar o Secovi.
- **Por quê:** disponibilizar uma entrada própria para o relatório AELO sem duplicar a implementação funcional.
- **Arquivos:** `src/components/layout/AppLayout.tsx`, `src/components/layout/CommandPalette.tsx`, `src/App.tsx`, `src/pages/TestesArquitetura.tsx`, `src/pages/RelatorioAelo.tsx`.
- **Impacto em Etapas/Pendências:** amplia a etapa de Relatórios Secovi para uma segunda entrada de relatório com paridade funcional; homologação específica do AELO permanece pendente.

### 2026-08-14 — Segmentação do tempo de vendas no AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — coluna de tempo de vendas
- **O quê:** adicionada a segmentação do campo `time_on_sales` da API em “Até 6 Meses”, “De 7 a 24 Meses”, “De 25 a 48 Meses” e “Acima de 49 Meses”.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Impacto em Etapas/Pendências:** coluna disponível no relatório AELO; validar os valores contra a base AELO SP 1T26.

### 2026-08-14 — Mapeamento de campos comerciais no AELO — Edgar
- **Ambiente/funcionalidade:** `/rebrain/aelo` — colunas comerciais da base AELO
- **O quê:** adicionadas as colunas Taxa administrativa, Oferta por lotes, Entrada, Nº de Parcelas, % de Juros Mensal, Indíce de Juros e Desconto à Vista, mapeadas para os campos informados da API.
- **Arquivos:** `src/pages/RelatorioAelo.tsx`.
- **Impacto em Etapas/Pendências:** esses campos deixam de ser lacunas do relatório; permanece pendente validar a unidade/formatação dos percentuais com a base AELO.

### 2026-08-13 — Corretor: `fonte_extractor` — verdade numérica das planilhas do analista — Gabriel + Claude
- **Ambiente/funcionalidade:** Corretor | Estudos Vocacionais — extração de material-fonte (POC, fora do runtime).
- **O quê:** `fonte_extractor.py` transforma as planilhas do analista em JSON versionável para o futuro `SOURCE_CROSSCHECK`; três pacotes reais de Rolândia, Toledo e Marka foram calibrados e receberam fixtures/testes de regressão.
- **Arquivos:** `docs/features/corretor-vocacionais/{fonte_extractor.py,fontes/,calibracao/}`, `src/features/corretor/lib/v3/__tests__/fonte-real.test.ts`.
- **Impacto em Etapas/Pendências:** abre a etapa de `SOURCE_CROSSCHECK`; descarte do material bruto continua condicionado à cobertura de revenda, locação, lazer e anúncios.

### 2026-08-12 — Corretor: sessão de calibração de FPs no banco + consulta por terminal — Gabriel + Claude
- **Ambiente/funcionalidade:** Corretor | Estudos Vocacionais — regras de soma e ferramenta de apoio.
- **O quê:** corrige o alinhamento de linhas de totais e o agrupamento de fatias paginadas, com testes de regressão sobre Toledo; adiciona `scripts/corretor-db.mjs` e sua skill para investigar achados e payloads diretamente no banco.
- **Arquivos:** `src/features/corretor/lib/{audit,v3}/`, `src/features/corretor/lib/v3/__tests__/toledo-real.test.ts`, `scripts/corretor-db.mjs`, `docs/features/corretor-vocacionais/{FP_sessao_2026-08-12.md,calibracao/toledo-2026-08/sum-payloads.json}`.
- **Impacto em Etapas/Pendências:** preserva o aceite de calibração do Toledo e abre a necessidade de reprocessar estudos parados no portão da ata.

### 2026-08-11 — Governança de documentação viva e frontend — Gabriel
- **Ambiente/funcionalidade:** plataforma Rebrain — regras compartilhadas de desenvolvimento e revisão.
- **O quê:** formalizado o controle de documentos vivos em PR/push, com validação automatizada, e publicado o contrato de frontend para componentes, estados de página, acessibilidade, responsividade e registro de decisões duradouras.
- **Por quê:** manter as mudanças de cada ambiente rastreáveis e preservar padrões consistentes nas próximas evoluções da plataforma.
- **Arquivos:** `AGENTS.md`, `CLAUDE.md`, `docs/architecture/{FRONTEND_GUIDELINES.md,FRONTEND_DECISIONS.md}`, `docs/projetos/README.md`, `.github/{pull_request_template.md,workflows/live-docs-check.yml}`, `scripts/check-live-docs.mjs`.
- **Commits:** `4b2eb4a`.
- **Impacto em Etapas/Pendências:** sem alteração de runtime; a documentação viva passa a ser verificada no fluxo de integração.

### 2026-08-11 — Corte temporal explícito no Relatório Secovi — Gabriel
- **Ambiente/funcionalidade:** `/rebrain/secovi` — geração de relatórios trimestrais para cidades mensais.
- **O que:** o antigo seletor "Análise temporal desde" virou o intervalo **Período de análise** (início e fim, padrão 1T2021 até o trimestre corrente). O bloco foi posicionado após os filtros de tipo/status e antes das ações de coleta, para tornar o recorte explícito no fluxo do analista. O corte final agora filtra o histórico antes da agregação trimestral: vendas, colunas exportadas, estoque e demais snapshots usam exclusivamente competências até o trimestre selecionado.
- **Por quê:** impedir que uma competência mensal já aberta do trimestre seguinte, como 07/2026, apareça ou altere a fotografia de um relatório fechado em 2T2026.
- **Arquivos:** `src/pages/TestesArquitetura.tsx`, `src/features/relatorios-secovi/quarterly-history.ts`, `src/features/relatorios-secovi/__tests__/quarterly-history.test.ts`.
- **Commits:** `ac8ef83`, `cbfedf3`.
- **Impacto em Etapas/Pendências:** Relatórios Secovi mantém a etapa de homologação manual; adicionada cobertura de regressão para o corte de competências futuras.

### 2026-08-10 — Exportações e identificação visual dos índices no Atualizador VGV — Lucas
- **Ambiente/funcionalidade:** `/atualizador-vgv` — exportação da base/recorte e comparador de índices.
- **O quê:** as exportações foram separadas por escopo (**base completa** ou **recorte selecionado**) e por formato (**XLSX** ou **CSV**). O CSV usa `;` e BOM para abrir corretamente no Excel. As séries antes azuis passaram a usar o amarelo da interface; no comparador, cada índice mantém uma cor própria e o VGV nominal não disputa a mesma cor das séries corrigidas.
- **Por quê:** tornar explícito o conjunto exportado e evitar a leitura ambígua das séries do gráfico.
- **Arquivos:** `src/features/atualizador-vgv/{AtualizadorVgvPage.tsx,atualizador-vgv.css,engine.ts}`.
- **Commits:** `508744f`, `646d5bb`, `767b0c4`, `b91173b`.
- **Impacto em Etapas/Pendências:** amplia a etapa 10 em runtime; a homologação do setor usuário e a rotina de atualização dos índices permanecem abertas.

### 2026-08-05 — Mapa urbano operacional no Atualizador VGV — Codex
- **O quê:** o mapa nacional estático de `/atualizador-vgv` foi substituído por um mapa urbano MapLibre
  com ruas, bairros, rótulos cartográficos, zoom, tela cheia, escala e enquadramento automático nos
  empreendimentos do recorte.
- **Navegação:** uma lista lateral permite localizar cada empreendimento; o marcador abre nome,
  bairro, cidade/UF, endereço, status e VGV da oferta antes da ação explícita de focar toda a análise.
  Recortes com uma única localização aproximam o endereço, e o botão `Ver todos` recompõe os limites.
- **Resiliência:** a tela informa empreendimentos sem latitude/longitude e mantém a lista de endereços
  utilizável enquanto a base cartográfica externa carrega ou em caso de falha de conexão.
- **Limpeza:** removido do cabeçalho o selo `Processamento local / Nenhum arquivo é armazenado`.
- **Arquivos:** `src/features/atualizador-vgv/{AtualizadorVgvPage.tsx,ProjectMap.tsx,atualizador-vgv.css}`,
  `package.json` e `package-lock.json` (`maplibre-gl`).

### 2026-08-05 — Atualizador VGV alinhado à interface compartilhada — Codex
- **O quê:** a abertura de `/atualizador-vgv` foi reorganizada para seguir o padrão visual dos demais
  módulos da plataforma, com cabeçalho compacto, barra de arquivo, navegação por abas, filtros e cards
  em superfícies neutras, bordas discretas e verde reservado aos estados ativos.
- **Preservado:** os quatro KPIs originais do Atualizador VGV, o upload/drag-and-drop, filtros encadeados,
  visão geral, comparador de índices, gráficos, mapa, ficha, amenidades e exportações continuam com as
  mesmas regras e dados; a mudança é apenas de hierarquia e acabamento visual.
- **Responsividade/tema:** estilos claro e escuro e quebras para tablet/mobile foram atualizados junto
  da nova composição; tipagem, 5 testes do motor e build de produção passaram.
- **Arquivos:** `src/features/atualizador-vgv/{AtualizadorVgvPage.tsx,atualizador-vgv.css}`.

### 2026-08-04 — Atualizador VGV V1 client-side — Codex
- **O quê:** migração da aplicação Streamlit `AtualizadorVGV` para uma feature React/TypeScript na rota
  `/atualizador-vgv`, com item próprio no menu Rebrain e na busca global. A V1 inclui upload/drag-and-drop
  de XLS/XLSX, base de demonstração, filtros encadeados, KPIs, séries de VGV, estoque × vendas, mapa
  clicável, ficha do empreendimento, amenidades, comparador INCC-DI/IPCA/IGP-DI e exportação XLSX.
- **Arquitetura:** processamento integral no navegador, sem persistência ou envio do arquivo. O parser de
  blocos mensais, a conversão wide→long e a correção direta para base 12/2025 foram portados para
  `src/features/atualizador-vgv/engine.ts`; os quatro XLSX de demonstração/índices ficam em
  `public/atualizador-vgv/`.
- **Interface:** página responsiva com identidade Brain, visualizações interativas e suporte aos temas claro
  e escuro globais. A feature é carregada por lazy route para isolar seu bundle.
- **Paridade/verificação:** teste contra os arquivos reais confirma 19 registros, 57 linhas mensais,
  66 amenidades e séries INCC-DI/IPCA/IGP-DI com 378/385/378 pontos. Typecheck e build de produção
  aprovados; suíte total com os 5 testes do motor VGV.
- **Pendências V1:** homologação visual pelo setor usuário e definição da atualização futura dos índices
  locais, atualmente encerrados em 01/2026.

### 2026-08-06 — API Explorer: ponte server-side para Sociodemografia
- **O quê:** criada a Edge Function `socio-proxy`, com allowlist dos endpoints Socio, que encaminha o Bearer token para `sociodemografia.geobrain.com.br` e devolve a resposta ao Explorer com CORS para o domínio Lovable.
- **Motivo:** a API Socio funcionava via terminal, mas o host não devolvia cabeçalhos CORS no preflight do browser. A API GeoBrain principal permanece com chamada direta.
- **Arquivos:** `supabase/functions/socio-proxy/index.ts`, `supabase/config.toml`, `src/lib/openapi-engine.ts`.
- **Pendente:** publicar `socio-proxy` no projeto Supabase `mxinpvcqzbfbzjodhgtz` e redeployar o front-end.

### 2026-08-04 — Relatório Secovi: vendas trimestrais passam a somar todos os fechamentos — Terra
- **O quê:** `sold_in_period` deixou de ser sobrescrito pelo último mês do trimestre. A nova
  agregação separa fluxo de snapshot: soma vendas e VGV por fechamento; mantém estoque, preço e
  disponibilidade no fechamento mais recente.
- **Regressão coberta:** Rubi passa de `300` para `349` no 4T/2025 (`49` em novembro + `300` em
  dezembro), preservando `100` no 1T/2026, `18` no 2T/2026 e estoque `189`.
- **Qualidade:** helper isolado cobre ordem irregular, mês zerado/ausente, venda negativa, preço
  ausente, período inválido e distrato parcial. **103 testes verdes** e build tipado aprovado.
- **Arquivos:** `src/features/relatorios-secovi/quarterly-history.ts`,
  `src/features/relatorios-secovi/__tests__/quarterly-history.test.ts`,
  `src/pages/TestesArquitetura.tsx`.
- **Pendente:** homologação manual da exportação no ambiente da área antes de encerrar o ticket.

### Validação do Fechamento — multi-cidade, resumo por cidade e % de fechamento
- **Multi-cidade:** novo `use-vf-data.ts` consulta até **10 municípios** da UF selecionada em
  paralelo e mescla tudo em uma base única deduplicada por `building_id`; falhas por cidade são
  reportadas sem derrubar as demais.
- **Header:** `VFCityMultiSelect` (UF + multi-seleção de municípios monitorados, sem fallback IBGE)
  e novo filtro **"Cidades carregadas"** (seleção única, `Todas` por padrão).
- **Nova guia "Resumo por cidade":** repete a tabela Resumo em um bloco por cidade carregada.
- **Nova medida "% de fechamento":** representatividade de `building_id` distintos com
  `typologies_history.period` no último período do bucket sobre o total de empreendimentos,
  renderizada como medidor 0–100%.
- **Ícones (i):** cada medida do Resumo exibe popover com a regra de cálculo (`METRICS[].info`).


### 2026-07-31 — Corretor: decisões A/B tomadas + fila implementada (paginação, CH-6, comunicação) — Gabriel + Claude
- **As 2 decisões de produto que travavam a fila foram tomadas** (Gabriel seguiu as recomendações):
  **(A)** exclusão declarada **rebaixa para “Verificar”**, não apaga o achado; **(B)** comentário de
  revisão no arquivo final **avisa e pede confirmação** na entrega, não bloqueia.
- **Tabela paginada** (`v3/paginated-tables.ts`): fatias da mesma tabela em slides vizinhos repetem o
  total do conjunto (Toledo: `1099/702/397` em s42 e s43) e nenhuma fecha sozinha. Agora as fatias são
  agrupadas por cabeçalho + assinatura de totais, somadas e conferidas **como conjunto** — fecha,
  encerra os achados por fatia; não fecha, sai **um** achado `s42 × s43` em “Verificar”. Roda nas
  tabelas nativas e nas tabelas-imagem.
- **CH-6** (`v3/declared-exclusions.ts`): antes de sustentar soma, procura a frase que declara a
  exclusão (“garden, duplex e coberturas não são apresentadas…”, “ocultamos os esgotados”) e rebaixa
  citando a nota. Exige **verbo de exclusão** — citar “cobertura” como tipologia não silencia nada.
  Era o último item aberto do sprint de 28/jul (dependia do Housi v2; resolvido com o caso do Toledo).
- **“Comunicação da revisão”:** `LEFTOVER_NOTE` sai do catálogo de erros — fora da contagem
  Erro/Provável/Verificar, **um item agregado** com checklist expansível no lugar de 32, chip próprio
  na UI, aviso no portão de entrega e **pista dirigida** (`review-notes-blind`: slide comentado onde o
  motor não achou nada = candidato a regra faltante). Estudos antigos são reconciliados ao reabrir.
- **Verificação:** 97 testes verdes (78 → 97), tsc limpo, lint e build ok. Sem migration. Detalhe na
  **v0.50** do [LIVE do Corretor](../features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md).

### 2026-07-28 — Corretor: checkpoint do dia + 2 ajustes desenhados aguardando decisão — Gabriel + Claude
- **Checkpoint:** [`CHECKPOINT_2026-07-28.md`](../features/corretor-vocacionais/CHECKPOINT_2026-07-28.md)
  consolida o dia (v0.44→v0.49, 6 commits, 78 testes) e o ponto de retomada de 29/jul.
- **Ajuste A — somas que não fecham** (estudo Raimundo Leonardi V3/Toledo): investigado, o
  comentário da analista sobre garden/cobertura **não explica** os 6 achados. São 3 causas:
  **tabela paginada** (total geral repetido em cada fatia — dominante), **leitura ruim da visão**
  e **exclusão declarada** (o CH-6 de fato). Decisão pendente: com exclusão declarada, o achado
  some ou vira "Verificar"?
- **Ajuste B — notas de edição** (32 dos 39 achados do estudo): deixam de ser "Erro" e viram
  categoria própria agregada ("Comunicação da revisão"), usada também como **pista dirigida**
  para o motor. Decisão pendente: na entrega, comentário bloqueia, avisa ou só informa?
- **Pendente:** deploy de `analyze-ata-image`; Housi v2 do Finoti (FN-1/FN-2).

### 2026-07-28 — Corretor: ancoragem textual contra cidade alucinada pela visão — Gabriel + Claude
- **Novo tipo de FP:** no s45 a visão devolveu “São Paulo” como cidade principal de uma tabela
  onde o nome não existe — inferiu dos bairros “Centro”/“Jardim Das Américas”. Diferente dos FPs
  anteriores: aqui a **entrada** é falsa, não o julgamento da regra.
- **Âncora:** cidade só vira achado se o nome estiver no texto que a visão transcreveu (título,
  colunas, células, totais). Preserva o caso legítimo de **cidade escrita dentro da
  tabela-imagem**; sem tabela extraída (mapa/arte), a regra segue como antes.
- **Medição no banco:** dos 5 achados com tabela extraída, os 5 eram cidade inferida.
- **Verificação:** tsc limpo, **78 testes verdes**, build ok. Ver v0.49 do LIVE do Corretor.

### 2026-07-28 — Corretor: slide de mapa deixa de ser cobrado por fonte — Gabriel + Claude
- **Regra da área (Gabriel):** mapa usa base cartográfica de terceiro (Google Maps) e **não leva
  FONTE/ELABORAÇÃO**. Confirmado no estudo real: os 8 slides em questão têm 100% do conteúdo
  tabular em LEGENDA (raios/terreno/faixas) — inclusive os s28/s29 que pareciam erro legítimo.
- **`isMapSlide`:** exige imagem + todas as tabelas serem LEGENDA + menção a raios/terreno, para
  não isentar slide de dados com uma legenda avulsa.
- **Efeito:** 15 slides isentos; `SOURCE_MISSING` cai a **zero** no cenário real da Rolândia.
- **Verificação:** tsc limpo, 75 testes verdes, build ok. Ver v0.48 do LIVE do Corretor.

### 2026-07-28 — Corretor: fonte cobrada de forma inconsistente entre slides iguais — Gabriel + Claude
- **Sintoma (feedback no uso real):** s28/s29 acusados por falta de fonte, mas s20/s25/s26 não —
  nenhum deles tem FONTE (confirmado abrindo a imagem do s25: só o rodapé do Google Maps).
- **Causa:** dicionário de **seção canônica** não conhecia títulos do template novo
  (“Densidade demográfica”, “Índice de verticalização”, “Análise de locação”) → seção `null` →
  a regra de fonte, que filtra por seção, ignorava o slide. Corrigido nos dois extratores
  (29 → 21 slides sem seção no estudo real).
- **Também:** MERCADO passa a exigir fonte (oferta/revenda/locação) e slide cujo único conteúdo
  tabular é legenda de mapa deixa de ser candidato.
- **Verificação:** tsc limpo, **75 testes verdes**, build ok. Ver v0.47 do LIVE do Corretor.

### 2026-07-28 — Corretor: ata da Rolândia não era lida no upload — 3 correções — Gabriel + Claude
- **Sintoma:** subindo o estudo do zero, o portão dizia “sem ata detectada”, embora a ata esteja
  no slide 1. O **localizador estava certo**; a falha era na leitura.
- **Causa principal:** a derivação de cidade/UF exigia barra (`Guarulhos/SP`) e a ata escreve
  **“Rolândia PR”**. Padrão passou a aceitar `/ - – —` e espaço, validando a sigla contra as 27 UFs.
- **Ata multi-estudo:** a ata abre 3 estudos (Toledo, Rolândia, SJC). A LLM devolve
  `cidades_candidatas` e o **analista escolhe no portão** (chips), em vez de a IA chutar.
- **Comentários sobrepostos:** caixa de recado sobre a ata agora é lida à parte
  (`comentarios_sobrepostos`) e exibida como contexto, não como conteúdo da ata.
- **Também:** busca da ata vai até o 5º slide; cache de ata v6 → v7 (força releitura).
- **Requer deploy:** `analyze-ata-image`. tsc limpo, **73 testes verdes**, build ok. Ver v0.46 do LIVE.

### 2026-07-28 — Corretor: sprint Fase 2 com o deck real da Rolândia (17 achados → 1) — Gabriel + Claude
- **Aceite medido:** rodando o motor sobre o IR real do PPTX da Daniele, os **17 achados (100% FP)
  caíram para 1** — e o restante ("7.1 Futuros lançamentos") é ausência legítima do deck.
- **CH-4 — hipótese corrigida:** o rodapé `FONTE: … | ELABORAÇÃO: …` **não** vinha do master; está
  no slide, dentro de uma **tabela 1×1**. Os dois extratores (`pptx-to-ir.ts` e `ir_extractor.py`)
  varriam só caixas de texto. Corrigido: 25 → 34 slides com fonte, 11 `SOURCE_MISSING` zerados.
- **CH-1:** checklist ganhou itens `visual` e o terceiro estado “a conferir em imagem”; padrões
  calibrados nos títulos do template novo. Bug colateral: "**Índice** de verticalização" era
  descartado como slide de sumário.
- **FN-3 (Finoti):** nova regra DET `ziLabelFindings` — o deck declara a convenção de Z.I. e a
  regra confere o uso dos rótulos; conservadora (abstém-se sem convenção declarada).
- **Reteste sem PPTX:** `rolandia-v1.ir.json` versionado no corpus (62 KB, o deck tem 162 MB).
- **Verificação:** tsc limpo, **71 testes verdes**, build ok. Detalhes na v0.45 do LIVE do Corretor.

### 2026-07-28 — Corretor: 1ª homologação real (feedback analistas) + sprint Fase 1 — Gabriel + Claude
- **Diagnóstico:** primeiros 4 estudos reais (Daniele/Rolândia, Beatriz e Lucas Finoti/Housi)
  triaram **~100% dos achados como FP**; consulta direta ao `findings_v3`/`vision_cache` ancorou
  cada família na causa-raiz do código. 3 falsos negativos reais apontados pelo Lucas.
- **Fase 1 implementada (offline, custo de IA R$ 0):** CH-2 (WRONG_CONTEXT: escopo de seção +
  validação IBGE + `sameCity` p/ typo de ata + UF no DET), CH-3 (legendas de mapa, unidade das
  faixas, guard same-slide), CH-5 (linha de total desalinhada do OCR) e **auto-reconciliação**
  (`lib/v3/reconcile.ts`) que limpa os FPs legados ao abrir o estudo.
- **Corpus versionado:** `calibracao/feedback-2026-07/` (102 achados + 34 payloads de visão do
  banco) vira suíte de regressão permanente — reteste sem PPTX e sem token.
- **Verificação:** tsc limpo, 64 testes verdes, build ok. Sem migration/deploy de função.
- **Fase 2 (aguarda PPTXs Rolândia + Housi v2):** CH-1/CH-4/CH-6 + FN-1..3. Detalhes:
  `SPRINT_feedback_analistas_2026-07-28.md` + v0.43–0.44 do LIVE do Corretor.

### 2026-07-26 — Panorama Secovi/FIERGS: análise de automatização (pré-plano de ação) — Gabriel
- **O quê:** análise técnica do deck `Panorama_Secovi_SP_Piracicaba_1T26` (62 slides) + inventário
  de slides + template institucional, para subsidiar a conversa com o head da área.
- **Anatomia:** ~24 slides institucionais/estáticos, 11 gráficos/tabelas **nativos** do PowerPoint e
  **~25 colados como imagem** (prints de Excel) — ou seja, ~40% do conteúdo quantitativo vive como
  imagem, e esse é o maior custo de atualização e o maior obstáculo à automação plena.
- **Cobertura pela API GeoBrain:** essencialmente **todo o conteúdo quantitativo é obtível**
  (direto por `temporal-analysis-city/*` ou derivado de `building-with-history`), com 2 lacunas de
  metodologia: **VGV lançado** (não vem em `releases`) e **% MCMV** (sem flag na API, exige critério
  oficial do analista). Sem dependência obrigatória de exportação manual identificada.
- **Camadas propostas:** (1) XLSX "dados prontos" reusando o padrão `GeoApiScopeEngine`/
  `TestesArquitetura.tsx`; (2) visualização web para QA; (3) geração do PPTX (pré-requisito one-off:
  reconstruir os ~25 slides-imagem como objetos nativos no template); (4) textos analíticos.
- **1º passo definido:** **teste de aderência** — reproduzir Piracicaba 1T26 via API e comparar
  número a número com o deck, antes de qualquer UI. Sem isso, automatizar industrializa divergências
  (risco já visto nos apontamentos da Juliana).
- **Arquivos:** [`docs/features/Relatorios Secovi_FIERGS/ANALISE_automatizacao_panorama.md`](../features/Relatorios%20Secovi_FIERGS/ANALISE_automatizacao_panorama.md);
  `.gitignore` passa a excluir os `.pptx`/`.pdf` pesados dessa pasta (os `.md` e o xlsx de inventário sobem).

### 2026-07-26 — Limpeza de espaço: estudos pesados fora do repo — Gabriel
- **O quê:** movidos ~673 MB de PPTX/PDF-fonte do Corretor para `C:\Users\GaloD\Desktop\SE\_backup_estudos\`
  (fora do repo). Nenhum estava versionado (cobertos pelo `.gitignore`), logo **não há cópia no histórico**.
- **Preservado no repo:** os derivados que o pipeline usa (`ir/*.ir.json`, `calibracao/*.csv` +
  `*.labels.json`, `visao/`), o gabarito Marka/Tancredo (congelado desde 13/jul) e as duas fixtures
  versionadas de propósito (`Marka Prime_Reduzido.pptx`, `Vocacionais_parametros_de_correcao.pptx`).
- **Arquivos:** [`docs/features/corretor-vocacionais/ARQUIVOS_REMOVIDOS.md`](../features/corretor-vocacionais/ARQUIVOS_REMOVIDOS.md).

### 2026-07-14 — Corretor v5: revisão final aprovada e fatia FECHADA — Gabriel + Claude
- **Revisão de código** dos commits que completaram o plano v5 (`75ad627` WS-3 triagem,
  `62a0276` WS-4 recheck sem atrito, `0c48924` WS-5 calibradora, `273c0e4` cidade IBGE +
  visão defensiva, `f9f3cf6` faixas cumulativas): **aprovada** — typecheck limpo e 52 testes
  verdes na main integrada.
- **Fechamento:** implementação do `PLAN_corretor_v5_fluxo.md` concluída. As 7 pendências
  técnicas da revisão (P1 custo de visão sem filtro de seção; P2 FP de cidade legítima em
  slides de acessos; P3 recheck não re-roda texto; P4–P7 menores) e o **roadmap** (deploy →
  homologação real → pendências humanas → ajustes finos → WS-F file watch) estão consolidados
  na **v0.42 do LIVE do Corretor** — acompanhamento continua lá.
- **Próximo marco:** homologação real (Marka/Itajaí/GO) — é o portão para declarar a meta de
  recall ≥90% / FP ≤15%. Roteiro completo em `OPERACAO_coverage_90.md`.

### 2026-07-13 — Validação do Fechamento: ajustes de UX no segmentador, filtros e tabela resumo — Rebrain
- **Segmentador:** adicionada a label `Visualização` acima do grupo de chips de granularidade
  (Ano / Trimestre / Mês/Ano), envolvida no container `flex flex-wrap items-end gap-3 flex-1 min-w-[320px]`.
- **Filtros temporais:** opções de ano, trimestre e período agora são exibidas do mais recente para
  o mais antigo (ordem decrescente), facilitando a seleção dos dados atuais.
- **Tabela resumo:** a barra de rolagem inicia no máximo à direita, exibindo a coluna **% Var. Total**
  por padrão ao carregar ou trocar a granularidade.
- **Arquivos:** `src/features/validacao-fechamento/{VFHeader.tsx,aggregate.ts,ResumoTable.tsx}`.
- **Verificação:** build (`tsc --noEmit && vite build`) aprovado.

### 2026-07-13 — Corretor: guardrail contra falsos positivos de faixas — Gabriel
- **Correção:** `BINNING_RULE` não confunde mais raios cumulativos (`Até 5/10/15 min`) com
  faixas exclusivas; sequências ambíguas com múltiplos intervalos partindo de zero são
  ignoradas de forma conservadora.
- **Faixas reais:** comparação normaliza tabelas crescentes/decrescentes e respeita centavos,
  mantendo a detecção de furos verdadeiros. A evidência passa a seguir a ordem comparada.
- **Legado:** ao abrir o estudo, falsos positivos pendentes comprovados pelo novo guardrail
  são encerrados e retirados da worklist, preservando o histórico no banco.
- **Validação:** 53 testes verdes e build tipado aprovado. Mudança somente no app; não requer
  migration nem publicação de Edge Function.
- **Ambiente:** `studies_v3.relatorio` estava ausente e interrompia o fechamento da análise;
  a migration `20260713170000` foi aplicada e o cache do PostgREST recarregado. Coluna
  `relatorio` confirmada no Supabase em 13/jul/2026.

### 2026-07-13 — Corretor: contexto de cidade e resiliência da visão — Gabriel
- **Contexto:** regra DET pós-Ata passou a identificar município IBGE no padrão explícito
  `Cidade – UF`; cobre vazamento como `Curitiba – MG` em estudo de Brumadinho/MG, que a regra
  anterior de UF não podia detectar.
- **Visão:** cache v7 valida profundamente payloads antes de reutilizar e não deixa formato
  inválido causar `.map is not a function`; cabeçalhos de tabela entram na leitura de locais e
  o localizador deixa de excluir tabelas somente por seção.
- **Operação:** publicar `analyze-table-image`, pois o prompt mudou e o cache será relido uma
  vez. Testes locais: 50 verdes e build tipado aprovado.

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
| 6h | **Corretor v5** — fluxo operacional unificado | 🟡 **Implementação FECHADA e revisada** (14/jul): WS0–WS5 ✅ no código + revisão de código aprovada (v0.42 do LIVE do Corretor, com pendências P1–P7 e roadmap). Restante: verificar migrations v5 (`relatorio` ✅), deploy `analyze-table-image` (cache v7), homologação real Marka/Itajaí/GO (recall ≥90%, FP ≤15%). WS-F (file watch) = futuro. **Homologação real começou em 22–24/jul** com 4 estudos de analistas (Rolândia/Daniele + Housi/Beatriz e Finoti): 102 achados, ~100% FP nos triados → sprint de 28/jul derrubou Rolândia de 17 achados para 1 (v0.44–0.49, 78 testes verdes). |
| 7 | Relatórios Secovi (export Excel) | 🟡 (correção trimestral implementada e testada em 04/ago; aguarda homologação manual da exportação) |
| 7a | **Panorama Secovi/FIERGS** — automatização do deck trimestral | 🟡 (V1 visual testável de ponta a ponta ✅; retorno de Jundiaí mapeado em 27/ago: 28 comentários + multi-cidade, período dinâmico e política Secovi; próximo portão é executar em paralelo os planos Opus/Luna, integrar, gerar novo PDF e reenviar à Juliana. Layout novo e PPTX ficaram para V2.) |
| 8 | API Explorer (OpenAPI + console) | ✅ |
| 9 | Qualidade CID / Piemonte | 🟡 (CID em standby) |
| 10 | Atualizador VGV V1 — operação client-side | 🟡 (motor, UI padronizada, mapa urbano, testes e build ✅; homologação pelo setor usuário pendente) |

---

## 3. Pendências

- [ ] Atualizador VGV V1: homologar a interface padronizada e o mapa urbano de `/atualizador-vgv` em desktop/mobile e nos temas claro/escuro.
- [ ] Atualizador VGV: definir rotina de atualização das séries INCC-DI, IPCA e IGP-DI (assets atuais até 01/2026).
- [ ] **API Explorer — publicar proxy Socio:** executar `supabase functions deploy socio-proxy --project-ref mxinpvcqzbfbzjodhgtz` com uma conta que tenha acesso ao projeto e, em seguida, redeployar o front-end Lovable.

- [ ] **Relatório Secovi — homologar vendas trimestrais:** correção implementada e coberta por testes;
  gerar o Excel no ambiente da área e conferir a Rubi (`4T2025 = 49 + 300 = 349`, `1T2026 = 100`,
  `2T2026 = 18`, estoque `189`). Plano e roteiro:
  [`PLAN_correcao_agregacao_vendas_trimestrais.md`](../features/relatorios-secovi/PLAN_correcao_agregacao_vendas_trimestrais.md).
- [ ] **Panorama — avaliar impressão nativa vetorial:** o CSS `@media print` já existe e daria PDF instantâneo, mas os gráficos usam `ResponsiveContainer` do recharts, que mede via JS e não é remedido na mídia de impressão; exige verificação lâmina a lâmina antes de considerar.
- [ ] **Panorama — remover `lib/pdf-print-interceptor.ts`:** arquivo morto (nenhum import) que ainda sobrescreve `window.print` e intercepta cliques com a estratégia de popup já abandonada em 19/ago.
- [ ] **Panorama Secovi/FIERGS — executar correções da V1 de Jundiaí:** executar em paralelo [`PLAN_OPUS_CORRECOES_V1_JUNDIAI.md`](../features/Relatorios%20Secovi_FIERGS/PLAN_OPUS_CORRECOES_V1_JUNDIAI.md) e [`PLAN_LUNA_CORRECOES_V1_JUNDIAI.md`](../features/Relatorios%20Secovi_FIERGS/PLAN_LUNA_CORRECOES_V1_JUNDIAI.md); o Luna integra após `OPUS_READY`, cobrindo os 28 comentários, multi-cidade, período após 1T/26, universo Secovi e novo PDF de 62 páginas. Matriz de aceite em [`MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md`](../features/Relatorios%20Secovi_FIERGS/MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md).
- [ ] **Panorama V2 — itens adiados:** novo padrão visual de tabelas Rebrain (aguarda referência) e exportação PPTX editável; não bloqueiam o fechamento da V1.
- [ ] **Panorama V2 — reativar mapa de empreendimentos:** cadastrar `VITE_MAPBOX_ACCESS_TOKEN` no ambiente publicado, restringir o token aos domínios da aplicação e homologar preview/PDF antes de reintroduzir o slide 56.
- [ ] **Panorama V2 — avaliar retorno da abertura de praça:** a referência 4 foi retirada porque a arte estática não recebe o nome do recorte; só reintroduzir com composição dinâmica aprovada.
- [ ] **Panorama — fechar metodologia com os analistas:** critério oficial de **VGV lançado**
  (estimativa via `building-with-history`) e de **% MCMV** (proxy por padrão Econômico / teto de preço).
- [ ] Panorama — confirmar que o token Secovi cobre o histórico desde 1T/22 (dado pontual 4T/21) nas cidades-alvo.
- [ ] Corretor v2: fases restantes da estratégia de testes (ver `DESIGN_corretor_v2.md`) — A/C/E já andaram; falta **Fase B** (calibração de seção) e **Fase D** (catálogo validado contra o gabarito).
- [ ] Corretor v2: calibrar dicionário de seção canônica com a analista (item 2 do plano; agora com os 2 estudos reais como base) — ver doc vivo do Corretor.
- [ ] Alinhar com o time o formato dos artefatos por estudo: slides sempre em **PPTX** (não PDF) e ata sempre em **DOCX separado** (nunca print no slide 1). Vale a partir dos próximos estudos; os 2 atuais seguem com ata em imagem (Fase C).
- [ ] **Gabriel → time de analistas (médio prazo, semanas):** propor tabelas nativas no PPT com os argumentos de `fase_c_visao.md`/`custos_visao_reais.md`; **plano B**: pré-análise dos Excels de trabalho (origem dos prints) — bater os números direto na fonte antes da colagem no PPT. Decisão do gestor (09/jul): até lá, **imagem é o padrão**.
- [ ] Fase E (foco atual): reorganizar a interface do corretor — relatório por seção→tipo de erro→achado, visualização de erros sobre a thumbnail, custo estimado antes de rodar IA.
- [ ] Expandir o enum de tipos de erro (`analysis-store.ts`) para o catálogo da rubrica + tipos evidenciados pelas atas reais (`ATA_COVERAGE` etc.).
- [ ] Coverage 90: publicar `analyze-table-image` (contrato `locais_visiveis`/`unidades`/`tem_fonte`, cache v6), medir o
  harness no IR real do Marka (`CORRETOR_CALIBRATION_IR`) e calibrar Marka, Itajaí e GO (meta: >=90% recall, <=15% FP). A versão atual usa cache v7 e inclui teste Brumadinho/Curitiba.
- [ ] Corretor v5: verificar migrations `20260713160000` e `20260713180000` (`20260713170000`
  aplicada e confirmada); homologar portão da Ata, relatório, triagem, drop/cache e calibradora no Supabase real.
- [ ] Corretor v5 — pendências da revisão final (P1–P7, detalhe na v0.42 do LIVE do Corretor): segue aberto
  **P1** (candidatas de visão sem filtro de seção → monitorar custo/estudo na homologação).
  ✅ **P2 resolvido em 28/jul** (CH-2: validação IBGE + UF + escopo de seção, v0.44 do LIVE do Corretor).
- [x] ~~Corretor — 2 decisões de produto do Gabriel~~ **tomadas em 31/jul**: (A) exclusão declarada → “Verificar”;
  (B) comentário no arquivo final → avisa e pede confirmação. Ambas implementadas (v0.50 do LIVE do Corretor).
- [x] ~~Corretor — fila de 28/jul~~: (1) tabela paginada ✅, (2) CH-6 exclusão declarada ✅,
  (3) `LEFTOVER_NOTE` → “Comunicação da revisão” ✅ (31/jul). Segue adiada a **(4) plausibilidade de tipo por
  coluna** — mesmo tema do teste A/B de modelo (caso s61 do Toledo: `479,9` é % somada numa coluna de contagem).
- [ ] **Corretor — validar a v0.50 no estudo do Toledo** (`study_id = 17062ca6-9814-43b4-a6bf-9f61e0c7db1e`):
  reabrir e medir os 39 achados → esperado cair para a ordem de 1–7 (as 32 notas viram 1 item de comunicação;
  os 6 de soma passam pela paginação/CH-6). É o aceite real das três regras novas.
- [ ] **Corretor — deploy pendente:** `supabase functions deploy analyze-ata-image` (prompt + normalização de
  cidade/UF mudaram; `ATA_CACHE_SCHEMA` 6 → 7 força releitura).
- [ ] **Corretor — Housi v2 (Lucas Finoti) não recebido:** destrava FN-1 (verticalização cross-slide s33 × s32)
  e FN-2 (taxa 0,9% × 1,7%) — exigem o passo novo de "memória do estudo" (valores-âncora por métrica).
- [ ] Corretor — teste A/B de modelo de visão (caso-âncora: s45 da Rolândia, cidade inferida dos bairros).
- [ ] Definir se `/corretor/calibracao` permanece visível a todos os usuários internos ou exige papel específico.
- [ ] Gabriel → analista A&R: obter fórmula oficial de projeção e validar falsos positivos do checklist estrutural/fonte.
- [ ] CID: retomar validação de base quando sair do standby.
- [ ] Dívidas de segurança conhecidas — ver [`../architecture/SECURITY_NOTES.md`](../architecture/SECURITY_NOTES.md) (vulns npm, log por IP, `.env` versionado por design).
- [ ] Apontamentos Juliana: etapas 4–6 pendentes (ver memória do projeto).
> **Panorama V2 · correção visual integral concluída · 31/ago/2026:** fundos 16:9 foram exportados e validados dos PPTs locais (capa Baixada Santista; conteúdo, divisória, equipe e fechamentos institucionais), e passaram a ser aplicados pelo mesmo `Sheet` no preview e PDF. A referência 1/capa vermelha e a 4/abertura legada foram retiradas; não há mais rodapé global nem compressão de equipe/consultor. Cidades continuam linha a linha na capa e o trimestre mantém espaçamento da última linha. A coleta exibe percentual por **11 chamadas concluídas por cidade** + consolidação/prévia e ETA apenas após duas observações; a exportação usa ETA observado por página. QA Playwright com API fixture capturou capa, sumário, divisória, tabela, equipe e consultor e gerou PDF de **59 páginas**; build e testes de contrato passaram. Pendente apenas a homologação autenticada com dados produtivos/multicidades. **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.
> **Panorama V2 · refinamento pós-homologação · 31/ago/2026:** o ETA deixou de recalcular a cada segundo: ele agora é atualizado só após uma nova unidade real concluída e é limitado ao menor valor observado, portanto não cresce durante uma chamada lenta. A superfície clara foi reexportada sem a barra vermelha decorativa; sumário, estáticos, tabelas e gráficos não carregam mais esse traço. Equipe passou a grade central 2×3, com os três perfis fixos maiores e segunda linha vazia para pessoas variáveis. Os três fechamentos usam a lâmina final do estudo Baixada Santista. Build e QA Playwright de preview/PDF passaram. **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — 12517501135.
