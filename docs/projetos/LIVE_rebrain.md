# Rebrain (Plataforma) — Documento Vivo

## 12/11/2026 — Slide Maker: Fase 6 (histórico de versões e relatório ao analista) — Claude (sessão de Diego Cabrero)

- **Mudança:**
  - **Histórico no chat:** as entregas anteriores continuam na conversa, marcadas "Substituído pela vN", e ainda podem ser baixadas. "Versões anteriores" abre a lista de todas as versões, da mais recente à mais antiga, com o que mudou em cada uma.
  - **Relatório ao analista:** passa a ser gravado também no Storage, em `slide-maker-saida/<jobId>/v<N>/relatorio.md`, além da tabela `slide_maker_relatorios`. Ele não aparece em nenhuma rota do colaborador nem na lista de arquivos.
  - **Consulta pela equipe:** a consulta SQL está no README do serviço. Não há tela na v1, e nada mudou no banco.
- **Validação:**
  - Testes do serviço (71): o relatório de v1 e de v2 fica na tabela e no Storage, e não aparece no detalhe, nos arquivos nem no download.
  - Testes de componente do histórico no chat e do diálogo de versões. Typecheck e ESLint limpos.
  - E2E Playwright com o serviço simulado (2 passando), agora conferindo também a v1 marcada como substituída e baixável.
- **Pendências:** Fase 7 (trabalhos dourados 2 e 3), que depende do deploy e da chave no Secret Manager (`DEPLOY_GCP.md` C1–C5).
- **Monday:** —

## 12/11/2026 — Slide Maker: Fase 5 (frontend) — Claude (sessão de Diego Cabrero)

- **Mudança:** nova ferramenta no menu, **Slide Maker** (`/slide-maker`), item próprio no grupo Rebrain logo depois do Atualizador VGV, com o ícone `Presentation`; também na busca Ctrl+K e na jornada "Gerar um relatório de mercado" da Home. Páginas lazy em `src/features/slide-maker/`: lista com identificação por e-mail @brain.srv.br (sem login GeoBrain), "Nova apresentação" (nome, contexto, upload validado), "Meus trabalhos" (tokens deste navegador) e "Todos os trabalhos" (só metadados); chat do trabalho com cards de perguntas (opções, "(Recomendado)", "Outro", múltipla escolha), narrativa (aprovar ou pedir ajuste), progresso com `BrainLoadingState`, etapa real e tempo decorrido, entrega com download, histórico de versões, ajuste pelo chat e "Tentar novamente". Atualização por Realtime Broadcast e consulta a cada 5 s durante as fases; ações registradas na `activity_log`. Arquivos compartilhados alterados: `App.tsx` (2 rotas), `AppLayout.tsx` (item e recolhimento do menu no celular), `AppLayout.test.tsx`, `CommandPalette.tsx` e `Home.tsx`. Risco aceito das rotas públicas registrado em `docs/architecture/SECURITY_NOTES.md` §8.
- **Validação:** 96 testes (feature e layout); typecheck, ESLint e build de produção limpos (páginas em pacotes próprios). **E2E Playwright** (`playwright.slide-maker.config.ts`) com a interface real contra o serviço real com agente simulado (`gcp/slide-maker-agent/src/dev-local.ts`, tudo em memória): identificação → arquivo recusado → upload → perguntas → narrativa → ajuste de narrativa → aprovação → download do PPTX → ajuste pelo chat → v2 → histórico de versões → listas; capturas conferidas em claro, escuro e celular (390 px). Rodado no Edge instalado (`PW_CHANNEL=msedge`), porque o Chromium da versão do Playwright do projeto não está baixado nesta máquina. **Não verificado:** a interface contra o serviço publicado (o `.env` ainda não tem `VITE_SLIDE_MAKER_AGENT_URL`; até lá a página explica que a ferramenta não está disponível) e o Realtime Broadcast real.
- **Pendências:** depois do deploy (DEPLOY_GCP.md C2), incluir `VITE_SLIDE_MAKER_AGENT_URL` no `.env`; agente real e trabalho dourado 1 (C5). Próximo: Fase 6 (histórico de versões e relatório ao analista).
- **Monday:** —

## 12/11/2026 — Slide Maker: Fase 4 (agente real com o Claude Agent SDK) — Claude (sessão de Diego Cabrero)

- **Mudança:** agente real em `gcp/slide-maker-agent/src/agent/claude.ts` (`@anthropic-ai/claude-agent-sdk` 0.3.322): `claude-opus-5-5`, effort `medium`, `maxBudgetUsd` por fase (F1 2, F2 6, F3 10, F4 5), `settingSources: []`, sessão não persistida, ferramentas por fase sem pedir aprovação (`dontAsk`), MCP em processo `brain` com as ferramentas da §5.1 e subagente `revisor` (rubrica do doc 05) em F3/F4. System prompt montado da base de conhecimento e do manual da `lib/`, com a parte fixa cacheável (`src/prompt.ts`). Isolamento: o `Bash` embutido é desviado para `mcp__brain__executar`, que roda cada comando sob `bwrap` sem rede, sem variáveis do serviço e só com o workspace gravável (a mesma configuração que o diagnóstico de subida testa); hook `PreToolUse` limita Read/Write/Edit/Glob/Grep ao trabalho e às pastas de apoio, resolvendo links simbólicos. `entregar_deck` roda o `lint_pptx.py` de novo e recusa falhas 🔒; `registrar_fonte` passa a gravar `trabalho/fontes.json`. Com `AGENTE=claude`, isolamento reprovado deixa o `/healthz` em 503 e nenhuma fase roda. Decisões em `INSTRUCOES_DESENVOLVIMENTO.md` §15.1 item 12; ativação em `DEPLOY_GCP.md` Parte C5.
- **Validação:** 71 testes do serviço (opções do `query()` por fase, ferramentas MCP, resultado/orçamento/abort, guarda de caminhos com link simbólico, configuração do sandbox e diagnóstico, validador do lint, prompt com snapshot); typecheck e ESLint limpos. A CLI real do SDK subiu nesta máquina com uma chave **inválida** (sem custo): modelo, modo de permissão, ferramentas sem Bash, MCP `brain` conectado e subagente `revisor` confirmados na mensagem de início; isso revelou dois ajustes (resultado preservado quando a CLI termina com exceção; subagente listado como `Task`). Servidor compilado com `AGENTE=claude` sem `bwrap` respondeu 503 no `/healthz`. **Não verificado:** sandbox `bwrap` real (2 testes só rodam em Linux; no Cloud Run, o diagnóstico de subida faz a prova), execução com chave válida e o **trabalho dourado 1**: a chave está nos Secrets do Lovable (funções do Supabase), inacessível ao Cloud Run e a esta sessão, e não há Linux/Docker aqui para o sandbox.
- **Pendências:** Gabriel publica (`DEPLOY_GCP.md` C1–C3), grava a chave no Secret Manager e ativa o agente (C5); depois, trabalho dourado 1. Próximo: Fase 5 (frontend).
- **Monday:** —

## 12/11/2026 — Slide Maker: Fase 3 (ferramentas do agente em `lib/`) — Claude (sessão de Diego Cabrero)

- **Mudança:** `gcp/slide-maker-agent/lib/` com as ferramentas que o agente usará: `brain-deck` (PptxGenJS 4.0.1; constrói o deck a partir de `trabalho/deck_spec.json` validado com Zod, extraída do build aprovado de `referencia/`), `apply_theme.js` (paleta e fontes da marca no tema do PPTX), `extract/extrair.py` (pptx, xlsx, pdf, docx e imagens → inventário, com limites contra bomba de compressão), `render.py`/`render.sh` (LibreOffice → PDF → PNG via pypdfium2), `lint_pptx.py` (doc 05 §1 completo, com D2 como ALERTA) e `preparar_marca.py` (logos recortadas no build). O Dockerfile passa a instalar o `hunspell` e a rodar os testes da `lib/` sem nada pulado no lugar do teste de fumaça da Fase 2. Nenhum arquivo compartilhado alterado.
- **Decisões:** interpretações das regras do lint registradas em `gcp/slide-maker-agent/lib/README.md` (E3 compara pixels, não bytes, porque o deck aprovado traz a mesma imagem do slide final regravada; T1 estimado com as métricas reais das fontes; M7 por família de cor; listas de termos [calibrar]).
- **Validação:** a brain-deck reproduz o build original da referência (18 slides; textos, gráficos, tabelas e notas idênticos, posições a até 0,1″); o lint dá **zero falhas 🔒** na referência e também no deck aprovado da pasta do Diego; 48 testes Python (cada regra 🔒 reprova a sua fixture; extração com arquivos reais e malformados; render em 18 PNGs com o LibreOffice local), rodados com marca sintética e com a marca real; 6 defeitos injetados no lint, todos detectados; 38 testes do serviço e typecheck sem regressão. **Não verificado:** render com Neo Sans e Montserrat (as fontes não estão instaladas no Windows; o LibreOffice local substituiu por Arial Black e DejaVu, e o modo obrigatório do teste acusou isso, como deve); T8 (sem `hunspell` nesta máquina); build Docker (sem Docker). Testado localmente com Python 3.14, Pillow 13 e PyYAML 6.0.3; a imagem usa Python 3.12 e as versões fixadas em `requirements.txt`.
- **Pendências:** o `ValidadorDeck` do `entregar_deck` passa a chamar o `lint_pptx.py` na Fase 4, junto do agente real; push segue bloqueado (conta sem escrita em `GabeBrain/relatorios-api`). Próximo: Fase 4 (agente real, prompt e MCP `brain`).
- **Monday:** —

## 12/11/2026 — Slide Maker: Fase 2 (serviço com agente simulado) — Claude (sessão de Diego Cabrero)

- **Mudança:** novo serviço `gcp/slide-maker-agent/` (Node 22, Fastify) com todas as rotas da §8, token por trabalho (só o hash no banco), lista "Todos os trabalhos" só com metadados, upload validado por extensão e assinatura binária, limites por e-mail e IP, fases enfileiradas no Cloud Tasks e executadas dentro de `POST /internal/fase` (OIDC), corte de 25 min, cancelamento e retomada. Ferramentas `brain` (§5.1) com validação, prontas para o SDK na Fase 4. Agente **simulado** (sem modelo, sem custo). Dockerfile (Python 3.12, LibreOffice, poppler, bubblewrap, fontes do bucket privado) com teste de fumaça que exige Neo Sans e Montserrat embutidas no PDF; `cloudbuild.yaml`; diagnóstico de isolamento com `bwrap` exposto no `/healthz` (spike do Cloud Run). Nenhum arquivo compartilhado alterado.
- **Contrato:** ajustes registrados em `INSTRUCOES_DESENVOLVIMENTO.md` §15.1 item 11 (`titulo` obrigatório na criação, `concluir_intake`, `informar_etapa`, `responsavel` na narrativa, relatório antes da entrega, cancelar após entrega volta à versão vigente). `DEPLOY_GCP.md` Parte C com build, deploy e verificações.
- **Validação:** 38 testes do serviço (fluxo F1→F4 completo, falhas, orçamento, tempo, cancelamento, retomada, idempotência, OIDC, acesso por token, limites, upload, ferramentas, ambiente do agente sem segredos, diagnóstico de isolamento, cópia da máquina de estados idêntica à do frontend); 4 defeitos injetados de propósito foram todos detectados. Typecheck e ESLint da raiz limpos. Servidor compilado subiu localmente com configuração fictícia (`/healthz` ok, `/internal/fase` sem OIDC → 403, chave fora do log). **Não verificado:** build Docker e teste de fumaça (sem Docker nesta máquina), integração real com Supabase, Cloud Tasks, OIDC e Broadcast (sem projeto GCP), e o isolamento no Cloud Run.
- **Pendências:** Gabriel executa `DEPLOY_GCP.md` (A, B, C) e envia o JSON do `/healthz` (decide o isolamento da Fase 4); push bloqueado: a conta `diegocabrero` não tem escrita em `GabeBrain/relatorios-api`. Próximo: Fase 3 (`lib/` do agente).
- **Monday:** —

## 12/11/2026 — Slide Maker: Fase 1 (fundação de dados) — Claude (sessão de Diego Cabrero)

- **Mudança:** nova ferramenta Slide Maker (rota futura `/slide-maker`). Migration `20261112160000_slide_maker.sql` com 6 tabelas `slide_maker_*` (inclui `slide_maker_fases`: uma fase ativa por trabalho, rate limit e idempotência com o Cloud Tasks) e 3 buckets privados, **sem nenhuma policy** e com `revoke` para `anon`/`authenticated`. Tipos em `src/features/slide-maker/types.ts` e máquina de estados pura em `src/features/slide-maker/lib/state-machine.ts`. Nenhum arquivo compartilhado alterado; nada aparece no menu ainda.
- **Decisões:** respostas do Diego registradas em `docs/features/apresentacoes/INSTRUCOES_DESENVOLVIMENTO.md` §15.1 (repo público → ativos de marca em bucket privado; `southamerica-east1`; lista "Todos os trabalhos" visível a todos, só com metadados; corte de fase em 25 min pelo limite de 30 min do Cloud Tasks, com Cloud Run Job como alternativa registrada; retenção de 180 dias). Roteiro de infraestrutura para o Gabriel em `docs/features/apresentacoes/DEPLOY_GCP.md`.
- **Validação:** 78 testes da feature (todas as 1.430 combinações estado × evento × contexto da máquina de estados; leitura estática da migration cruzando os domínios do SQL com os tipos); typecheck e lint sem erros. Migration executada num Postgres 18.6 local (PGlite, fora do repo) com os grants padrão do Supabase simulados: 46/46 verificações de restrição e de acesso. **Não aplicada no Supabase real.**
- **Pendências:** Gabriel aplica a migration (Parte A) e prepara o GCP (Parte B) conforme `DEPLOY_GCP.md`; Fase 2 (serviço `gcp/slide-maker-agent` com agente simulado) em seguida.
- **Monday:** —

## 12/11/2026 — Validação do Fechamento: merge da main local divergente — Claude (sessão de Diego Cabrero)

- **Mudança:** merge de `origin/main` (565 commits) na `main` local, que tinha divergido com 2 commits não publicados. O fix local `02b69c51` (15/10, filtros da sidebar na guia Divergências) foi substituído pelo fix equivalente e mais completo `75ef905a` (Edgar, 15/10, que também casa tipologia e período). Os três conflitos ficaram com a versão do remoto, e `aggregate.ts` voltou à versão do remoto. O guia `docs/INTEGRACAO_API_GEOBRAIN.md` (commit local `d567641b`) entra sem alteração.
- **Doc vivo:** a entrada de 15/10 do fix local foi movida sem edição para `historico/LIVE_rebrain_ate_2026-10-19.md`, junto das demais entradas daquela data. A entrada de 17/09 do Sinduscon já estava no histórico e não foi duplicada.
- **Validação:** código resultante idêntico ao `origin/main`; typecheck sem erros; 50 testes da Validação do Fechamento aprovados. A suíte completa tem 18 falhas que já existem no `origin/main` (Panorama, SP/Fortaleza institucional, Sinduscon, Estimativas, Relatório API Excel), parte por timeout de 5 s nesta máquina e parte real, como `free-scopes-selection.test.tsx`. Nenhuma foi corrigida aqui.
- **Pendência herdada do remoto:** `package.json` e `package-lock.json` estão dessincronizados (`@lovable.dev/vite-plugin-dev-server-bridge` e `@lovable.dev/vite-plugin-hmr-gate` ausentes do lock), e `npm ci` falha.
- **Monday:** —

## 10/11/2026 — Relatório São Paulo: correções editoriais — Lovable

- **Mudança:** Tahoma nos slides/textos de exportação, sumário simplificado, remoção da casinha nas divisórias, período consolidado compacto e identificação preservada para parciais. Linhas suavizadas, rótulos sem caixas escuras, valores monetários em milhões inteiros e fonte FGV. Manchete de lançamentos deriva do volume da janela de 12 meses, sem alegar recorde histórico sem prova.
- **Mapas:** visão ampla enquadra o núcleo urbano com percentis e mantém totais geocodificados; calor normalizado por visão e escala de concentração relativa com maior contraste, sem alterar valores de VGV. Contagem de empreendimentos visíveis explicitada.
- **Validação:** 304 testes SP aprovados; conferência de tipos sem erros SP; navegador em desktop e largura móvel com amostra sintética nos slides 6, 12, 18, 46, 63 e 80. Padrão de slides existente e BrainLoadingState preservados. Não representa geração real autenticada ou aceite de indicadores.
- **Etapas/pendências:** preços ponderados e escoamento existentes preservados; conciliação de 2T2026 e lacunas históricas aguarda resposta real/referência manual autorizada. Fotos HD aguardam originais. Exportação real e geração autenticada ainda não verificadas. Sem consulta de IA, alteração do Banco Quanti, Corretor, Empresas ou motores Secovi/FIERGS; sem push/publicação manual ou escrita no Monday.

> **Rotação 27/10/2026:** entradas anteriores a 20/10/2026 foram movidas sem edição para [historico/LIVE_rebrain_ate_2026-10-19.md](historico/LIVE_rebrain_ate_2026-10-19.md). Este documento mantém o estado atual e o registro recente. Novas entradas seguem o `README.md` desta pasta: topo de **1. Desenvolvimentos**.


## 27/10/2026 — Estimativas: seleção e Excel candidato para Belogic — Gabriel / Codex

- **Entrega:** seleção operacional isolada, reaproveitando referências Finotti; motivos por ID/cadência, cálculo sem rateio para uma tipologia e mapa de entrada/saída. [Resultado, amostra e perguntas](../features/estimativas-vendas/ENTREGA_CANDIDATA_OPERACIONAL_2026-10-27.md). Três fontes congeladas/2.305empreendimentos, duas hipóteses de cadência:1candidato condicional,10exemplos revisáveis. Excel interno NÃO IMPORTAR; nenhum contrato externo aceito localizado.
- **Validação:**15testes novos e62existentes aprovados; leitura de retorno do Excel confere chaves, conservação, fórmulas e valores. Sem ensaio visual Excel ou importação. Nenhuma API nova ou escrita na origem.
- **Etapas/pendências:** validado localmente para revisão; bloquear importação até exemplarNicolas, granularidade/cadência/origem, política da metade, preço e reconciliação. Quatro posições consecutivas não estimadas é política conservadora proposta, não aceite operacional. Sem push/deploy/mensagens, alterações paralelas preservadas.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — referência, leitura apenas.

## 27/10/2026 — FIERGS: alertas agrupados por tipo — Gabriel / Codex

- **Mudança:** controles cadastrais agrupados em um aviso; ajustes e divergências repetidos agrupados por categoria, com detalhes recolhidos por padrão. Contagem do botão representa grupos. Nenhum número, guarda, exclusão de produto ou CSV alterado; 29 empreendimentos sem classificação continuam explicitados. Avisos críticos não são duplicados entre notificações e conferências.
- **Validação:** 11 testes focados do modal/fluxo aprovados; cenário de 18 controles verifica um grupo, preservação dos 18 detalhes e imutabilidade do relatório. Verificação de tipos e lint dirigidos antes da publicação. Sem API ou geração real; ensaio no site e exportações seguem pendentes.
- **Etapas/pendências:** ajuste editorial preparado para publicação autorizada por Gabriel; nova conferência dos recortes no site e retorno da Juliana continuam necessários.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — somente referência.

## 27/10/2026 — FIERGS: modal de alertas e diagnóstico adicional Miradero — Gabriel / Codex

- **Solicitação:** Gabriel definiu alertas objetivos e material disponível, sem rótulos de confiabilidade/aprovação; pediu diagnosticarMiradero antes. Duas consultas individuais200 confirmam divergência interna na competênciaago/2026: cadastro36/estoque16 contra única tipologia87033com18/8. Não é só diferença temporal; causa do backend ainda semprova. Brutos ignorados, nenhuma escrita na origem.
- **Mudança:** botãoAlertas noRelatório abreDialogpadrão com ajustesnominais/diferenças/avisos. Casos reconciliados baixamdireto; divergência numérica oferece continuar após leitura porjob/formato, sem alterar verificações ou auditoria. Cobertura/proveniência municipal continuam protegidas. Host trata novatentativa/cancelamento, sem reutilizar confirmação. Sem texto nos slides.
- **Evidência/estado:** [complementoMiradero/alertas e roteiro](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md);35testes distintos focados aprovados, lint0erros/3avisosanteriores. Validação local decomponentes/store; navegador/exportaçãofísica pendentes. Sem push/mensagens; política posterior substitui bloqueionuméricoabsoluto anterior, não fabrica reconciliação ou aceite.
- **Próximo:** publicar com autorização e testar modal/download no site com os recortes afetados/preset. ExplicarMiradero como divergência na resposta, não correção confirmada da fonte; investigaçãoEdgar permanece independente.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

## 27/10/2026 — FIERGS G4: auditoria, regressões e preparação do ensaio — Gabriel / Codex

- **Mudança:** CSV distingue original/capacidade/cadastro/competências, classes de guarda e índices de duplicatas/conflitos. Avisos dinâmicos e Metodologia/Glossário existentes explicam a origem; sem notas no PDF/PPT, CSS ou tokens novos. Query/sessão versionam os contratos para não reaproveitar modelo anterior. G0–G2 em25258d8 eG3 em67869e3.
- **Validação:**66testes distintos focados, tipos completos doapp e lint dirigido aprovados. Dezreplays locais de2T2026/4T2025, hashesCSV e decisão central de exportação conferidos; zero críticos nos recortes congelados. Estoque/vendas/preços/VGVfinal preservados; Miradero capacidade−18, SolarisVGVoriginal−5,301milhões têm linhagem. [Matriz, ressalvas, roteiroG5 e rascunhosG6](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md); resumo pequeno versionado e script offline reproduzível.
- **Limites/estado:** G0–G4 validados localmente, não publicação ou aceite. Sem consultaGeoBrain, PDF/PPTreal ou envio de mensagens nesta execução. Preset integral de dez cidades e exportações físicas aguardamG5; Miradero18tipologia×36cadastro posterior permanece limitação auditada, em investigação de origem conforme Gabriel. Não alegar controle externo aprovado quando indisponível.
- **Próximo:** autorização de push/publicação, Gabriel gera recortes afetados e baseline/preset e traz PDF/PPT/CSV da mesma geração. Conferir antes de enviar pedido de aceite; estimador é a próxima atividade, sem encerrar incidente por inferência. Alterações paralelas e outros motores preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

## 27/10/2026 — FIERGS G3: capacidade por competência e guardas independentes — Gabriel / Codex

- **Mudança:** cubo FIERGS identificado separa original de lançamento, capacidade derivada no fechamento e cadastro/competência. Campo de compatibilidade launchedUnits usa a capacidade dos empreendimentos classificados pela data original; não soma meses ou usa cadastro futuro. Preços/estoque/vendas mantêm a fotografia e política de representação; Secovi preserva sua base anterior.
- **Guardas:**42controles dimensionais anteriores preservados, integridade crítica adicional e confronto cadastral somente em competência compatível; controle indisponível fica explícito, sem match fabricado. Conflito de ID, medida ausente, fotografia incompleta e total70×distribuição127 na mesma competência continuam impedindo exportação.
- **Evidência:** dezreplays congelados, cinco recortes em2T2026/4T2025, sem críticos abertos. Em2T2026 estoque/vendas/preços/VGVfinal e referência266projetos preservados; Miradero36cadastroago×18tipologiajun separa18unidades, e SolarisVGVoriginal10,602→5,301milhões após remover as cópias. [Matriz e limites](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md).
- **Estado/próximo:** validado localmente; G4auditoria/avisos em fechamento, sem chamada de negócio nova/PDF/PPT/push. Ensaio do site/presetintegral e aceite continuam pendentes. Não equivale a correção na base Geobrain.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

## 27/10/2026 — FIERGS G0–G2: entrada validada e identidade histórica — Gabriel / Codex

- **Mudança:** `building-source.ts` valida envelope, paginação/total, território e repetição de empreendimentos; erro de contrato não dispara fallback nem retry transitório. `building-history.ts` implementa identidade/competência, deduplicação idempotente com índices de origem e detecção de conflito/incompletude; zero/nulo/venda negativa preservados. API/sessão conserva rota, concorrência e recuperação; sem mudanças nos outros motores.
- **Evidência:** [execução e matriz](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md), respostas congeladas originais preservadas; nenhuma chamada de negócio nova. Fixtures anonimizadas nos testes. Testes de identidade/fonte aprovados; integração temporal/auditoria em verificação na mesma sessão.
- **Estado:** validado localmente no domínio/contrato de entrada, não publicação/homologação ou PDF/PPT. Próximo concluir G3/G4 e matriz numérica, depois ensaio autorizado do site. Registro não atribui correção da origem ao backend.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

## 27/10/2026 — FIERGS: contratos de deduplicação/competência e revisão do plano — Gabriel / Codex

- **Objetivo/decisão:** Gabriel informou conversa pessoal com Edgar, que seguirá investigando a origem. Plano revisado para avançar no consumidor sem esperar esse diagnóstico; implementação ainda será acionada pelo CTA.
- **Contrato proposto:** `history-identity-v1`, remoção idempotente somente de duplicatas equivalentes com linhagem; conflito de mesmo ID/mês permanece impeditivo. `period-capacity-v1`, capacidade derivada de qty de fotografia comum até o fechamento, separada do lançamento original, sem dado futuro ou reconstrução por vendas/distratos. Origem derivada não é validação independente.
- **Escopo:** [plano revisão2 e CTA](../features/Relatorios%20Secovi_FIERGS/PLAN_MODERNIZACAO_COLETA_E_HISTORICO_FIERGS_2026-10-27.md), diagnóstico atualizado. Separar integridade, conservação dimensional e confronto externo; total70/distribuição127 na mesma competência continua crítico. Sem otimização de transporte, alterações de outros motores ou exceções municipais.
- **Estado/próximo:** preparado/documental; nenhum runtime, nova consulta ou exportação nesta revisão. Testes anteriores não são evidência de implementação futura. Próximo G0–G4 com regressões2T2026/4T2025, envio autorizado/ensaioG5, rascunhos para Teresa/Juliana e novo aceiteG6. Prioridade FIERGS→estimador preservada; sem push ou homologação antecipada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita.

## 27/10/2026 — FIERGS: referência Dashboard, sincronização e plano de ingestão — Gabriel / Codex

- **Ambiente/objetivo:** Rebrain/Panorama; orientação de Edgar para consultar conforme Dashboard, sem modificar o Dashboard. Gabriel pediu sincronizar, confrontar o JSON e preparar plano/CTA antes da implementação.
- **Integração:** `21edc3d` incorpora sete commits remotos de Validação/Excel sobre três locais, sem reescrever histórico. Hunk LIVE anterior guardado/reaplicado e conferido; demais mudanças locais FIERGS/estimativas/Corretor preservadas. Nenhum push. A integração supera o estado de divergência registrado na entrada anterior.
- **Evidência:** mesma rota POST interna v2 nos três motores. Quatro consultas200 no padrão Dashboard ainda reproduzem Solaris18×9 e Porto Alegre240×153. A amostra recebida tem cinco projetos de Curitiba/785linhas sem duplicatas, não os casos afetados; formato confirmado, resolução não demonstrada. Brutos/scripts e hashes em `.local-inputs/fiergs-incidente-20261027/`.
- **Plano:** [modernização de coleta e histórico G0–G6](../features/Relatorios%20Secovi_FIERGS/PLAN_MODERNIZACAO_COLETA_E_HISTORICO_FIERGS_2026-10-27.md), além do diagnóstico atualizado. Copiar contrato/identidade como referência; não importar zeros artificiais, busca futura, duplicatas preservadas ou captura silenciosa de falhas de outros produtos.
- **Validação/estado:** sete testes locais de consulta/fonte aprovados, hashes/matriz e gate documental conferidos. Preparado, não implementação do motor nem nova exportação. Próximo autorizar G0–G4, resolver coerência temporal e conflitos sem afrouxar guardas, depois publicação autorizada/ensaio humano G5 e aceite G6. Novos recortes ainda não homologados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita.

## 27/10/2026 — FIERGS: diagnóstico do bloqueio em novos municípios — Gabriel / Codex

- **Ambiente:** Rebrain/Panorama FIERGS, incidente Teresa/Juliana de26/10. Prioridade confirmada hoje: FIERGS antes do estimador. Escopo desta rodada: diagnóstico e proposta, sem implementar ainda.
- **Evidência:** Porto Alegre e Gramado+Canela,1T2021–2T2026, reproduzidos com o coletor/modelo/CSV reais.150 respostas de dados HTTP200, cidades na primeira tentativa; guarda crítica `residual.vertical.typology.launched.negative`:87 emPorto e9 emGramado. Canela isolada e referência Canoas+Esteio+SãoLeopoldo,1T2023–2T2026,42/42 guardas aprovadas. IndividuaisGramado/Canela usam respostas congeladas da coleta conjunta.
- **Causa:** Solaris/Gramado traz três linhas históricas duplicadas exatamente; experimento offline de deduplicação faz o conjunto passar42/42. Porto mistura cadastro atual e quantidades tipológicas originais em quatro empreendimentos revisados:153×240, diferença87; tipologiasjun/2026 somam153. Não é prova de indisponibilidade passada nem justificativa para afrouxar guardas.
- **Documentação:** [diagnóstico e proposta G0–G4](../features/Relatorios%20Secovi_FIERGS/DIAGNOSTICO_EXPORTACAO_RECORTES_FIERGS_2026-10-27.md); brutos/CSV/scripts ignorados em `.local-inputs/fiergs-incidente-20261027/`.17 testes focados da reconciliação aprovados; manifesto e conferência offline aprovados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, nenhuma escrita.
- **Complemento de reprodução por ID:** GET `https://geobrain.com.br/public-api/building-with-history/73632` testado 200: um Solaris, histórico jul/2024 com seis linhas/três objetos distintos e soma 18. Os filtros query `building_id`/`id`/`building_ids` não restringiram a listagem interna nas três chamadas testadas. Evidência bruta/script no mesmo diretório ignorado; diagnóstico atualizado, sem alteração de motor ou nova geração. Commit inicial documental `3e2f5d4`; este complemento não resolve o produto.
- **Etapas/pendências:** diagnóstico validado localmente com API real; correção proposta de identidade/duplicação e coerência temporal, ainda não implementada. PDF/PPT no site não verificados, produção não corrigida e novos recortes não homologados. Git diverge7remotos/1local na abertura; nenhuma integração/push. Próximo: aprovação da proposta, implementação com regressões e exportação pareada, depois autorização para sincronizar/publicar. Alterações paralelas preservadas.
## 26/10/2026 — Validação do Fechamento: contexto para conferência na coluna Valor — Edgar / Codex

- **Ambiente/funcionalidade:** Divergências da Validação do Fechamento; Edgar / Codex.
- **O quê:** revisão dos textos frente ao Python: restauradas área/padrão nas regras de vagas e corrigida a identificação do padrão, que no anexo aparecia rotulado como M2. Valores agora incluem, conforme a regra, desvio percentual absoluto, limite de desvio/preço, quantidade de empreendimentos, preço/m² calculado, diferença e tolerância de R$ 0,01/m², status histórico, datas, critérios de cluster unitário e unidades/área usadas nas referências de garagem/Garden/Cobertura. Taxas de venda exibidas como percentuais e mediana de vendas identificada em unidades, sem acrescentar médias de outras métricas.
- **Preservado:** critérios, prioridade, agrupamentos, identidades e aprovações. Apenas o conteúdo de `value` mudou; tabela e Excel já consomem esse mesmo conteúdo. Python fornecido/gerado não foi sobrescrito nesta revisão da apresentação.
- **Evidência:** 41 testes/8 arquivos aprovados; comparador atual confirma os mesmos 52 achados entre Python e aplicação na base local Sinop/MT de 22/10. Sem nova consulta autenticada ou validação visual.
- **Etapas/Pendências:** revisão local implementada; conferência humana e publicação pendentes. Sem alterações em Supabase ou demais projetos.
- **Monday:** —

## 26/10/2026 — Validação do Fechamento: prioridade de preços e tolerância de arredondamento — Edgar / Codex

- **Ambiente/funcionalidade:** motor de Divergências da Validação do Fechamento; Edgar / Codex.
- **O quê:** habilitadas as duas regras específicas de preço baixo, preservando seus limites inclusivos (Horizontal ≤ R$ 40.000; demais tipos ≤ R$ 100.000) e desvio ≥30% da mediana. Prioridade exclusiva na mesma família/campo: preço zerado (status histórico Ativo/Esgotado/Lançado), depois preço baixo, depois desvio geral. Comparações independentes de garagem/Garden/Cobertura e demais campos não foram suprimidas. Preço/m² gravado versus calculado aceita diferença de até R$ 0,01/m², após arredondamento a duas casas e sem falso positivo de ponto flutuante.
- **Python:** criado `farol_rebrain_20261026_corrigido.py` na pasta do anexo (`validacao_geobrain`), com o original preservado; cópia de referência idêntica nesta feature. Priorização e tolerância replicadas, com datas de exibição tratadas como texto. Comparador atual em `reference/compare-current.py`; comparadores anteriores permanecem referências históricas.
- **Evidência:** testes incluem os três casos reais de arredondamento, diferença acima da tolerância, tipos de empreendimento, preço zerado e supressão do desvio genérico. Na base offline Sinop/MT salva em 22/10 (174 empreendimentos/395 tipologias), os três alertas de arredondamento desaparecem e restam 52 achados idênticos entre Python e TypeScript.
- **Etapas/Pendências:** 37 testes/8 arquivos, TypeScript e diff aprovados. Implementação local concluída; sem nova consulta autenticada ou validação visual. Publicação depende de autorização. Sem alterações em Supabase, Dashboard ou outros projetos.
- **Monday:** —

## 26/10/2026 — Validação do Fechamento: integridade cadastral do Farol — Edgar / Codex

- **Ambiente/funcionalidade:** Validação do Fechamento, motor da guia Divergências. Autor/origem: Edgar / Codex, novas regras do Python fornecido após `# Adicionado regras 26/10/2026`.
- **O quê:** seis verificações acrescentadas: área privativa zerada fora de Futuro; preço/m² gravado diferente de preço/área (divisão arredondada a duas casas, área zero resulta em zero); preço de lançamento ou período zerado para status histórico contendo Ativo/Esgotado/Lançado; quantidade lançada zerada e preços de lançamento/período diferentes apenas quando as datas coincidem. Grupo vazio para estas regras, sem agregação. Motor anterior, aprovações, interface e demais projetos preservados.
- **Conflitos excluídos:** Preço abaixo de R$ 100.000 (não Horizontal) e Preço abaixo de R$ 40.000 (Horizontal). Exigem o mesmo desvio ≥30% da mediana já validado pela regra geral; duplicariam achados nos clusters com múltiplos empreendimentos. No cluster unitário válido, a própria mediana coincide com o preço, logo o desvio não se verifica.
- **Evidência:** 31 testes/8 arquivos aprovados, incluindo dez casos de integridade e a normalização da base local Sinop/MT (174 empreendimentos/395 tipologias, salva em 22/10). Total de 55 achados, sendo três das novas regras. Comparação direta com o Python fornecido confirmou os três, sem exclusivos em nenhuma implementação. TypeScript aprovado. Comparador reproduzível em `src/features/validacao-fechamento/reference/compare-integrity.py`.
- **Etapas/Pendências:** implementação e verificação headless locais concluídas; sem consulta autenticada nova nem validação visual nesta sessão. Publicação aguarda autorização. Anexo original e referência histórica preservados, sem alteração de Supabase.
- **Monday:** —

## 26/10/2026 — Validação do Fechamento: rótulos da coluna Regra — Edgar / Codex

- **Ambiente/funcionalidade:** Divergências da Validação do Fechamento.
- **O quê:** removidos os sufixos ` - Empreendimento` e ` - Tipologia` da apresentação da coluna Regra, incluindo filtros, ordenação, cópia e Excel. Reutilizada a grade existente; critérios de validação e identificadores internos de aprovação preservados.
- **Etapas/Pendências:** ajuste local; teste do formatador e TypeScript aprovados. Validação visual e publicação pendentes. Sem alterações em outros projetos.
- **Monday:** —

## 26/10/2026 — Validação do Fechamento: medianas e faixas de área nos clusters — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/validacao-fechamento` — regras de Divergências.
- **O quê:** adotado o Python anexo atualizado: último registro por tipologia antes dos agrupamentos, cluster sem período, CEP ausente convertido a 00000, desvios de preço pela mediana com ao menos dois empreendimentos e regras isoladas de baixo preço somente em cluster unitário. Preço/m² compara o campo da API com a mediana de `price/private_area`. Regras antigas de desvio de área removidas; estoque compara percentuais vendidos e vendas comparam taxas. Mensagens alinhadas aos cálculos efetivos. Para padrões contendo loteamento, a dimensão dormitórios passa a ser a faixa de área privativa.
- **Faixas:** algoritmo isolado na Validação reproduz o Dashboard, sem alterações naquele projeto: por cidade/tipo, uma última área positiva por tipologia, até seis faixas por posições empíricas, cortes arredondados para dois algarismos significativos, limite inferior inclusivo e superior exclusivo. Python anexo em `validacao_geobrain` atualizado e cópia idêntica mantida em `src/features/validacao-fechamento/reference/`.
- **Evidência:** teste offline da base Sinop/MT salva em 22/10/2026 (174 empreendimentos, 395 tipologias). Python e TypeScript coincidem nas 52 divergências e nos clusters usados. Excel gerado e reaberto com 52 registros. Sem consulta autenticada à API.
- **Monday:** —
- **Etapas/Pendências:** implementação local e comparação automatizada concluídas; validação autenticada/visual e publicação pendentes de aceite. Nenhuma alteração de Supabase nesta entrega.

## 23/10/2026 — Relatório API Excel: ajuda contextual nos campos — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — 2. Configurar relatório.
- **O quê:** ícone de informação ao lado dos 11 campos, com tooltip por hover ou foco. Explica filtros, períodos, layouts e fórmulas; textos de cálculo monetário, média e escala acompanham a seleção atual. Reutiliza Tooltip/Label do design system, sem modificar primitives compartilhados ou regras de processamento.
- **AELO, análise somente:** endpoint principal confirmado no código como POST `https://app.geobrain.com.br/public-api/v2/building-with-history-internal`, com tipo Horizontal, UF, status e paginação. Catálogo geográfico usa endpoint separado. Nenhuma alteração ou consulta real ao AELO.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; base `38c10a8`.
- **Monday:** —
- **Validação:** TypeScript, lint dirigido, build, quatro testes em dois arquivos e diff sem erros. Navegador com API simulada em 1440/390 px e temas claro/escuro: 11 tooltips, hover, foco, conteúdo dinâmico e posicionamento dentro da janela; quatro chamadas de coleta preservadas, sem processamento automático ou erro de página. Evidências locais ignoradas em `.local-inputs/api-excel-check/verify-tooltips.cjs` e capturas associadas. AELO/Dashboard intactos.
- **Etapas/Pendências:** implementação e verificação local concluídas; aceite com API autenticada e publicação pendentes. Sem push nesta entrega.

## 23/10/2026 — Relatório API Excel: filtro de padrão e médias por tipologia Padrão — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Configurar relatório.
- **O quê:** Padrão adicionado após Status do Empreendimento, com o mesmo combobox múltiplo. Opções de `data.standard` limitadas aos `building_type` selecionados; escolhas explícitas incompatíveis removidas ao trocar tipos. Sem padrão compatível escolhido, geração bloqueada até nova seleção. Dados cadastrais apenas; nenhuma agregação automática ou chamada extra de API.
- **Preço Médio Empreendimento:** as três fórmulas existentes incluem todas as tipologias válidas (Garden/Cobertura preservados). Rótulo ponderado por quantidade renomeado para Ponderado pela oferta lançada, mantendo peso `qty`. Acrescentadas as mesmas três fórmulas somente para `type_of_typology` Padrão/Padrao, com normalização de acentos/caixa/espaços. Restringe a média, sem excluir linhas de outras tipologias; sem Padrão válido, média vazia, sem fallback. Seleção continua aplicada somente em Gerar relatório.
- **AELO, apenas informativo:** usa soma de `sold_in_period`; distratos estimados por estoque atual − anterior + vendas, com total vazio se algum intervalo for incalculável/negativo; coluna chamada Vendas líquidas repete `sold_in_period`, sem subtração. Não usa gross_sales/distractions. Conferência detalhada em `docs/features/relatorio-api-excel.md`; AELO e agregação compartilhada intactos.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; base `5daefda`.
- **Monday:** —
- **Validação:** TypeScript, lint dirigido e build aprovados. 62 testes em seis arquivos, incluindo padrões/tipos, seis médias, normalização Padrão/Padrao, preservação de Garden/Cobertura, agrupamentos mensal/trimestral, ausência de Padrão e regressões AELO/trimestres. Navegador 1440/390 px, claro/escuro, com rede externa interceptada: opção Padrão após Status, opções Alto/Econômico conforme Hotel/Vertical, remoção de padrão incompatível e bloqueio até selecionar, seis opções de média, três versões restritas produzindo 150.000 nas duas linhas (incluindo Garden) e versão geral preservando 163.500. Gerações/filtros não fizeram novas requisições; downloads reabertos nas três escalas. Sem erro de página/overflow da janela; mobile com menu recolhido. Evidências locais ignoradas em `.local-inputs/api-excel-check/verify-standards-average.cjs` e arquivos associados.
- **Etapas/Pendências:** ajustes locais concluídos; API autenticada/aceite com dados reais e publicação ainda pendentes. Padrões reutilizados: ReportMultiSelect, Select/Popover/Command Brain e geração explícita existente; carregamento deliberadamente lento, sucesso, vazio de seleção, rascunho, erro e download verificados. Nenhuma escrita Monday ou push nesta entrega.

## 22/10/2026 — Estimativas: auditoria das bases IVV e envio autorizado — Gabriel / Codex

- **Ambiente:** Rebrain/Estimativas. Gabriel pediu conferir os arquivos enviados por Edgar antes de publicar `a2480df` e autorizou push se as premissas fossem corroboradas.
- **Resultado:** cinco bases,475.058 linhas, uma aba/26 campos e granularidade tipologia×mês. Horizontal de18 cidades, sem Curitiba; filtros publicados reproduziram366 projetos/15.164 meses. API real Cuiabá:6.727 chaves comuns/166 projetos, quantidade/estoque/venda líquida iguais nas20.181 comparações; zero diferenças.72 chaves exclusivas Excel e243 API impedem afirmar completude idêntica.98.563 linhas marcadas estimadas reforçam separar fonte reportada de observação comprovada. Nenhum ajuste de motor necessário.
- **Evidência:** `docs/features/estimativas-vendas/AUDITORIA_BASES_EDGAR_2026-10-22.md`, JSON de hashes/contagens/paridade e três scripts diagnósticos. Brutos ignorados; não foi adicionado importador IVV à interface. Conferidor atual continua Análise Temporal Excel/Colunas.
- **Integração:** merge `3e87e6d` preserva `1709128`/`0e7bc71` de Edgar sobre períodos/variação anual do Resumo email.114 testes/13 arquivos e tipos completos aprovados; build integrado conferido antes do envio. Alterações paralelas FIERGS/Corretor fora do commit. Monday: [Estimativas](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`, sem escrita.
- **Estado/próximo:** validado localmente, envio autorizado; usuário publicará no Lovable e testará a ferramenta. Git não comprova produção. Linhagem histórica API, teste independente posterior ao treino e contrato de retorno continuam pendentes. A auditoria valida estrutura e conjunto comum, não acurácia ou recalibração integral.

## 22/10/2026 — Estimativas: referência Finotti completa e gráficos automáticos em Goiânia — Gabriel / Codex

- **Ambiente/funcionalidade:** `/rebrain/estimativas-vendas`, bancada local de comparação.
- **Mudança:** Drive fornecido por Gabriel destravou cauda/faixas horizontais e modelo vertical por30 comparáveis; 22 casos originais reproduzidos. Transporte com até8 chamadas simultâneas, seleção inicial completa, modelos preparados em cache, gráficos de histórico mesmo sem projeção, recorte compacto, metodologia em Dialog e modelos/modos em botões. Referência Finotti ou ritmo de estoque identificados separadamente. Logo Brain obrigatória em AGENTS/CLAUDE, no campo geográfico compartilhado e no carregamento bloqueante com foco/Escape/cancelamento. Menu móvel da ferramenta reutiliza o comportamento existente; grade responde à largura útil, sem mudar tokens.
- **Evidência:** página local usando API real, sem respostas simuladas:641 cadastros/7 páginas200,640 projeções automáticas,12 cartões iniciais,16,18s até gráficos e zero erro de página.185 têm suporte Finotti; os demais usam ritmo recente quando disponível.108 testes integrados/11 arquivos, tipos completos, lint dirigido e build; oito ensaios responsivos com snapshot separado da medição real. Fontes, hashes, reprodução e limites em `docs/features/estimativas-vendas/REFERENCIAS_FINOTTI_DRIVE_2026-10-22.md` e evidência JSON associada.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência, sem escrita.
- **Estado/pendências:** validado localmente; nenhuma precisão observada ou cobertura local de faixas comprovada. Treino até setembro/2026 bloqueia retrospectiva independente anterior para os parâmetros de referência. Origem por período, calibração independente, comercial e retorno Geobrain seguem pendentes. Fontes brutas ignoradas e artefato derivado de inferência versionado com IDs anônimos. Alterações FIERGS/Corretor paralelas preservadas. Revisão atual sem push/deploy; próxima etapa é revisão/publicação autorizada e teste no ambiente publicado.
## 22/10/2026 — Validação do Fechamento: variação anual do Resumo email por visualização — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/validacao-fechamento` — Resumo email.
- **O quê:** complemento solicitado: cálculo, cabeçalho e dica da variação anual agora usam o período atual e o mesmo período do ano anterior conforme Ano, Trimestre ou Mês/ano. Acumulados e variação acumulada permanecem mensais, com o mesmo corte já existente.
- **Evidência:** seis testes de agregação/renderização aprovados; conferem percentuais distintos por visualização e a conservação da variação acumulada. Sem consulta autenticada ou verificação visual no navegador.
- **Monday:** —
- **Etapas/Pendências:** implementação local concluída; publicação depende de autorização de envio.

## 22/10/2026 — Validação do Fechamento: períodos do Resumo email por visualização — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/validacao-fechamento` — Resumo email.
- **O quê:** somente as três colunas de períodos passam a acompanhar Ano, Trimestre ou Mês/ano. Em trimestre, mostram mesmo trimestre do ano anterior, trimestre anterior e trimestre atual; em ano, ano anterior, ano anterior e ano atual. A agregação anual/trimestral reutiliza o motor de Resumo. O comportamento mensal permanece igual.
- **Preservado:** cálculos, cabeçalhos e barras das variações anuais mensais, acumulados de janeiro até o último mês selecionado e variação acumulada; nenhum ajuste nas demais guias ou na API.
- **Evidência:** três testes direcionados cobrem as granularidades, a passagem de ano e a igualdade dos cálculos preservados. Validação visual autenticada não executada nesta sessão.
- **Monday:** —
- **Etapas/Pendências:** implementação local concluída; publicação depende de autorização de envio.

## 22/10/2026 — Relatório API Excel: publicação autorizada do conjunto local — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **Autorização:** usuário autorizou o push nesta sessão, superando a orientação anterior de manter o conjunto local. Pacote preparado para sincronizar a mesma `main` em `origin` e `upstream`, sem reescrever histórico.
- **Commits:** `841e173` (Hotel/métricas reais/média), `670f3d3` (geração explícita/filtros/cadastro), `3ed0152` (competências pt-BR/escala VGV), `2526863` (comboboxes múltiplos/grade); merge autorizado `1b3e0b0` preserva `6c4ccf6` de Gabriel.
- **Evidência:** fetch de ambos os remotes sem novidade ou divergência; documentação viva compatível com o pacote contra cada remote. Build, TypeScript, lint, testes e navegador com dados fictícios registrados nas entradas específicas abaixo; nenhuma alteração de runtime adicional nesta anotação.
- **Monday:** —
- **Etapas/Pendências:** conjunto local validado e envio autorizado; consulta autenticada à API, aceite com dados reais e deploy continuam sem confirmação nesta sessão. Arquivo local de auditoria permanece fora dos commits.

## 22/10/2026 — Relatório API Excel: filtros múltiplos e grade uniforme — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — 2. Configurar relatório.
- **O quê:** Município convertido em seleção múltipla; Tipo Empreendimento e Status do Empreendimento passam ao mesmo componente local Popover/Command, com busca, marcação, selecionar todos, limpar e resumo. A lista permanece aberta ao alternar opções. Os três campos iniciam a configuração na ordem pedida; todos os controles seguem uma única grade de três colunas no desktop e uma coluna em telas menores.
- **Regra local:** municípios escolhidos combinados por OU, todos selecionados após a carga; lista vazia significa nenhum, sem fallback para todos. O motor mantém comportamento sem restrição somente quando o filtro municipal é omitido. Limpar qualquer filtro principal bloqueia geração até nova seleção. Mantidos Hotel, aplicação somente em Gerar relatório e bloqueio do download desatualizado; nenhuma nova consulta provocada pelos filtros.
- **Escopo:** `src/pages/RelatorioApiExcel.tsx`, componente local `ReportMultiSelect.tsx`, condição municipal/teste do motor e documentação. Sem alterações no AELO, Dashboard ou primitives compartilhados.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; evolução de `3ed0152`.
- **Monday:** —
- **Validação:** TypeScript, lint dirigido e build aprovados; suíte anterior de 44 testes aprovada e novo cenário de seleção municipal múltipla/vazia aprovado com os 36 testes do motor (45 cenários distintos no total). Navegador em 1440/390 px, claro/escuro, com API simulada: seleção de dois municípios, dois tipos e dois status sem fechar a lista, seleção vazia bloqueando geração, ordem e alinhamento dos três filtros medidos por bounding boxes, nenhum cabeçalho antes de Gerar e quatro chamadas de coleta mantidas. Downloads reabertos nas três escalas de VGV, sem erro de página ou overflow da janela; mobile com menu recolhido. Evidências locais ignoradas em `.local-inputs/api-excel-check/verify-multiselect.cjs` e arquivos associados.
- **Etapas/Pendências:** ajuste local concluído; consulta autenticada/aceite com dados reais pendentes. Padrão visual Brain reutilizado; estados nenhum/um/vários/todos selecionados, configuração, geração, rascunho e erro de coleta verificados. Mantido sem push conforme determinação anterior.

## 22/10/2026 — Relatório API Excel: competências pt-BR e escala do VGV — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **O quê:** Data inicial/final usam calendário local de mês/ano, com dia fixo 01, texto pt-BR e armazenamento ISO. O filtro incide em `typologies_history[].period` e inclui todos os dias dos meses escolhidos, inclusive o mês final e fevereiro bissexto. Não filtra `release_date`. Datas vazias continuam inferidas somente em Gerar relatório; resumo em pt-BR.
- **VGV:** adicionado Visualização do VGV em Configurar relatório: Padrão (inicial, valor calculado), Milhar (/1.000) e Milhão (/1.000.000). Mesma escala na prévia, gráfico e Excel; preços/quantidades/áreas/percentuais intactos. Valores de base em reais preservados; conversão única sem arredondar o quociente numérico, formato visual de duas casas. Escala faz parte da geração; alterar a opção bloqueia download até gerar novamente.
- **Escopo:** somente componente mensal local, motor/página/testes e documentação do Relatório API Excel. Nenhuma mudança no AELO, Dashboard ou módulos compartilhados. Padrões reutilizados: Popover, Button, Input, Label e Select Brain; não há seletor diário nativo nem novo primitive global.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; evolução de `670f3d3`.
- **Monday:** —
- **Validação:** 44 testes em quatro arquivos aprovados, incluindo calendário pt-BR/dia 01/limpeza/ano inválido, recorte mensal completo nos dois agrupamentos e fevereiro bissexto, escala nas duas estruturas de Excel reaberto, valores negativos, preços preservados e nenhuma mutação no cálculo. TypeScript, lint dirigido e build aprovados. Navegador 1440/390 px, claro/escuro, com API simulada: datas `01/02/2026` incluem fechamento de 28/02; Excel baixado/reaberto nas três escalas com VGV de 18.000.000, 18.000 e 18, preço médio 163.500 preservado, sem novas consultas durante filtros/gerações e sem erros de página/overflow da janela. Mobile com menu recolhido. Evidências locais ignoradas em `.local-inputs/api-excel-check/verify-month-scale.cjs` e arquivos associados.
- **Etapas/Pendências:** implementação e validação local concluídas; consulta autenticada/aceite com dados reais pendentes. Carga/configuração, calendário, geração, sucesso, rascunho, bloqueio de download e erro de coleta verificados. Mantido local, sem push conforme determinação anterior do usuário.

## 22/10/2026 — Relatório API Excel: geração sob comando e cadastro ampliado — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **O quê:** coleta guarda o JSON bruto e não percorre/agrega históricos automaticamente. Gerar relatório, à esquerda de Baixar Excel, é a única chamada ao motor. Configurações/seleção ficam como rascunho; mudanças não recalculam e bloqueiam download até nova geração. Resultado anterior continua identificado na prévia. Limites de datas vazios são inferidos somente ao gerar; processamento duplicado bloqueado e BrainLoadingState informa a operação.
- **Filtros/colunas:** Município com busca e Tipo Empreendimento locais, incluindo Hotel preservado. Seleção mostra nomes de campos sem mês/trimestre e os expande apenas ao gerar horizontal; mantém seleção ao trocar visão/layout. Gráficos reutilizam a geração, sem uma segunda chamada ao motor para distribuição.
- **Cadastro:** Incorporadoras concatena todos os nomes; Data de Lançamento, Data de Entrega, Unidades por Tipologia, Padrão/Tipo e Região/Região Administrativa separados. Adicionados Tipologia, Quartos e Garagem nas posições solicitadas. Preço de Lançamento usa `price` do registro da tipologia na data exata de `release_date`; sem correspondência fica vazio. M² Lançado = quantidade × área da posição final; R$/m² Lançado = preço ÷ área do registro exato de lançamento. Regras completas em `docs/features/relatorio-api-excel.md`.
- **Integração autorizada:** `1b3e0b0` integra `upstream/main` (`6c4ccf6`, Gabriel, Estimativas/guia frontend) sem conflitos e sem perda/duplicação no documento vivo, conferido pela identidade de três pontos. Preservado `841e173`, anterior e ainda local. Alterações desta entrega exclusivas ao relatório, testes e documentação.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; merge `1b3e0b0`; evolução de `841e173`.
- **Monday:** —
- **Validação:** build, TypeScript e lint dirigido aprovados; 39 testes em cinco arquivos (36 próprios e três de integração menu/seleção Estimativas). Teste do componente observa zero chamadas a buildReport/dateBounds na coleta, após carga e ao editar seleções, exatamente uma por clique de geração, bloqueio de Excel desatualizado e seleção por campo. Motor cobre filtros, ordem/mapeamento cadastral, incorporadoras, lançamento exato e sem fallback. Navegador 1440/390 px, claro/escuro, com API simulada: coleta completa incluindo Hotel, seleção sem datas, filtro municipal, geração explícita, rascunho sem recálculo, nova geração e download reaberto com quatro colunas/duas linhas, média de 163.500 e VGV de 18/12 milhões. Sem erros de página/overflow da janela; mobile com menu recolhido. Evidência local ignorada: `.local-inputs/api-excel-check/verify-manual.cjs` e arquivos associados.
- **Etapas/Pendências:** implementação e validação local concluídas; consulta autenticada/aceite com dados reais ainda pendentes. Padrões reutilizados: Select, Popover/Command, Checkbox, campos Brain, GeoApiScopeEngine e BrainLoadingState. Estados de carga, configuração, geração, sucesso, erro, rascunho e exportação bloqueada verificados. Usuário determinou manter local, sem push nesta sessão; nenhum envio realizado.

## 22/10/2026 — Relatório API Excel: Hotel, vendas reais e seletor de preço médio — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **O quê:** Hotel incluído exclusivamente no coletor deste relatório. Séries mensais/trimestrais com 12 métricas na ordem solicitada: Vendas Brutas, Distratos, Vendas Líquidas, Estoque, Preço Atual, Preço Médio Empreendimento, Preço m², VGV Lançado, VGV Vendas Brutas, VGV Distratos, VGV Vendas Líquidas e VGV Estoque. Preços e VGV Lançado deixam de ter resumo fixo duplicado; horizontal pivota as mesmas séries usadas no tabular.
- **Regras:** Vendas Brutas = soma de `gross_sales`; Distratos = soma de `distractions`; Vendas Líquidas = diferença, preservando negativos. Sem fallback para `sold_in_period` nem estimativa de distratos; ausência em um fechamento impede total parcial. VGV brutas/distratos usam os campos próprios e o modo monetário escolhido; VGV líquido é a diferença. Preços históricos usam o último fechamento de cada período.
- **Novo filtro:** Preço Médio Empreendimento por média simples (padrão), ponderada por `qty` ou ponderada por estoque. Última posição de cada tipologia por mês/trimestre, cálculo por registro de empreendimento; preço ausente e pesos ausentes/não positivos excluídos, sem base válida fica vazio. Média repetida nas linhas de tipologia do empreendimento; gráfico conta cada registro de empreendimento uma vez, sem somar preços.
- **Escopo:** somente `src/features/relatorio-api-excel/`, `src/pages/RelatorioApiExcel.tsx` e documentação. Filtros continuam posteriores a todas as respostas da API, incluindo Hotel. Dashboard e AELO intactos.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; evolução de `794f8fe`.
- **Monday:** —
- **Validação:** TypeScript, lint dirigido, build e 28 testes próprios aprovados. Cobertura: Hotel/espera pela última resposta, novos campos, líquido negativo, ausência de fallback, 12 métricas ordenadas e paridade mensal/trimestral entre layouts, três médias, pesos inválidos, preços nos gráficos e Excel reaberto. Navegador 1440/390 px, claro/escuro, com dados fictícios/rede externa interceptada: troca de média sem novas requisições; ponderação por estoque exportada em quatro colunas/duas linhas, média 163.500 e VGV lançados de 18/12 milhões, reabertos do download. Sem erros de página ou overflow da janela; mobile com menu recolhido. Evidência local ignorada em `.local-inputs/api-excel-check/verify-temporal.cjs` e arquivos associados.
- **Etapas/Pendências:** implementação e validação local concluídas; consulta autenticada/aceite com dados reais e publicação pendentes. Padrões reutilizados: Select/Checkbox/Input/Tabs Brain, GeoApiScopeEngine e motor puro após coleta. Estados de carregamento, sucesso, erro e seleção vazia verificados no navegador; ausências e lacunas verificadas nos testes. Nenhum push automático nesta entrega.

## 22/10/2026 — Integração do Relatório API Excel com a main do time — Edgar / Codex

- **Ambiente/funcionalidade:** Rebrain — Relatório API Excel e integração das Estimativas de Vendas recebidas de Gabriel.
- **O quê:** merge autorizado de `upstream/main` (`c0b7be8`) na `main`, preservando as duas entregas, rotas, menus e histórico publicado. Sem alterações adicionais de regra no relatório, AELO ou Dashboard durante a integração.
- **Commits:** `ff6ae69` (cópia), `794f8fe` (configuração do relatório), `73e6a58` (merge com 14 commits do time).
- **Evidência:** merge automático sem conflitos; documento vivo conferido pela identidade base + (local − base) + (upstream − base), sem perda ou duplicação de linhas não vazias. Build, TypeScript, 39 testes em oito arquivos (relatório, AELO, consulta Dashboard, Estimativas e menu) e checagem dos documentos vivos contra ambos os remotes aprovados. A consulta autenticada e o deploy continuam sem verificação nesta integração.
- **Autor/origem:** Edgar / Codex para o relatório e a integração; Gabriel para os commits recebidos de Estimativas de Vendas.
- **Monday:** —
- **Etapas/Pendências:** integração local concluída; envio da `main` a `origin` e `upstream` autorizado nesta sessão. Aceite do relatório com dados reais permanece pendente.

## 22/10/2026 — Relatório API Excel: coleta completa e exportação configurável — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` — Relatórios Automatizados.
- **O quê:** removidos catálogo de cidades e filtros de loteamentos AELO. Contrato de consulta copiado do Dashboard (Comercial/Horizontal/Vertical, POST interno v2, páginas de 100, lotes de cinco, timeout 60 s e registros repetidos preservados), mantendo dados brutos. Todas as respostas precisam terminar antes de habilitar filtros; erro/cancelamento não libera planilha parcial.
- **Relatório:** mensal por padrão ou trimestral; datas inclusivas e status locais; seleção individual de colunas; layout em colunas ou tabular; preço atual ou preço do período. Conforme definição do usuário, VGV Lançado histórico = quantidade × preço do último fechamento de cada mês/trimestre. Vendas somam o fluxo; estoque conserva a última posição. Prévia e gráficos usam o motor do relatório.
- **Arquivos:** `src/pages/RelatorioApiExcel.tsx`, `src/features/relatorio-api-excel/`, somente a entrada deste relatório em `Home.tsx`/`CommandPalette.tsx` e `docs/features/relatorio-api-excel.md`. Nenhuma alteração no AELO ou Dashboard.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada; evolução da cópia `ff6ae69`.
- **Monday:** —
- **Validação:** build, typecheck e lint dirigido aprovados; 24 testes aprovados (17 próprios, sete de regressão AELO/consulta Dashboard). Excel criado e reaberto headless nos dois layouts. Navegador em 1440/390 px, claro/escuro, com API simulada e rede externa interceptada: espera pela última resposta, filtros sem nova consulta, seleção de três colunas, download tabular reaberto com VGV de 18 milhões, gráficos e bloqueio após erro. Sem erros de página ou overflow da janela; celular com menu recolhido pelo controle existente. Evidências locais ignoradas em `.local-inputs/api-excel-check/`.
- **Etapas/Pendências:** implementação e validação local concluídas. Consulta autenticada à API e aceite com dados reais pendentes; nenhum acesso real à API nesta sessão. Publicação depende de autorização. Padrões reutilizados: GeoApiScopeSelector/useGeoApiScope, BrainLoadingState, primitives Brain, rota lazy existente. Estados observados: escopo/carregamento/sucesso/erro; vazio, datas inválidas, ausência de valores e exportação sem colunas cobertos pelo motor.

## 22/10/2026 ? Relatório API Excel ? Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorio-api-excel` ? Relatórios Automatizados.
- **O quê:** cópia independente do AELO com nome próprio, rota lazy, menu, busca, início e nome de arquivo Excel; preservados filtros AELO, coleta, tabelas e gráficos.
- **Regras/layout:** `docs/features/relatorio-api-excel.md` documenta VGV, colunas, formatos e limitações herdadas.
- **Autor/origem:** Edgar / Codex. **Commits:** commit desta entrada.
- **Monday:** ?
- **Etapas/Pendências:** implementação local concluída; 12 testes existentes de percentuais/agregação e typecheck aprovados. Consulta autenticada e interface em navegador (desktop/mobile, claro/escuro) pendentes; publicação depende de autorização. Padrões reutilizados: página AELO, primitives Brain e GeoApiScopeSelector; estados de carregamento, vazio, erro, escopo e sucesso preservados por cópia.

## 22/10/2026 — Validação do Fechamento: migration aplicada manualmente no Supabase — Edgar / Codex

- **Ambiente/funcionalidade:** aprovações de divergências da Validação do Fechamento.
- **Estado:** migration `20261022090000_validacao_fechamento_exclusao_administrativa.sql` aplicada manualmente pelo usuário no SQL Editor do projeto `mxinpvcqzbfbzjodhgtz`.
- **Evidência informada pelo usuário:** consulta de permissões retornou `usuario = postgres` e `aplicacao_pode_excluir = false`. Nenhuma exclusão de aprovação foi necessária para essa verificação.
- **Etapas/Pendências:** aplicação manual do SQL concluída. O registro de `20261022090000` no histórico remoto do CLI permanece pendente: CLI sem autenticação e checkout sem vínculo. Antes de futuro `db push`, conferir o histórico e registrar a versão como aplicada, sem executar novamente o SQL. Esta anotação documenta a aplicação manual; não altera o histórico remoto.
- **Monday:** —

## 22/10/2026 — Validação do Fechamento: regras Farol por cluster — Edgar / Codex

- **Ambiente/funcionalidade:** `/rebrain/validacao-fechamento` — guia Divergências.
- **O quê:** motor substituído pelas regras ativas do Python Farol de 21/10/2026. Backup das regras anteriores em `src/features/validacao-fechamento/backups/validation-rules-20261022.ts`. Cluster: cidade, tipo, tipologia, padrão atual, dormitórios, CEP5, período e ano de lançamento. Preço/área usam média ponderada; vendas usam mediana. Garagem compara com as unidades sem vagas do mesmo cluster; área abaixo de 10 exige menos de três empreendimentos. Python corrigido e comparador disponíveis em `src/features/validacao-fechamento/reference/`.
- **Evidência:** base local de Sinop/MT de 19/10/2026, 174 empreendimentos e 395 tipologias no último período; Python e TypeScript produzem as mesmas 123 divergências por empreendimento/tipologia/período/campo/regra/categoria: Estoque 32, Preço 67, Metragem 23, Vagas 1. Excel gerado e reaberto headless com 123 registros. Sem nova consulta autenticada à API.
- **Supabase:** migration `20261022090000_validacao_fechamento_exclusao_administrativa.sql` permite DELETE somente ao administrador SQL `postgres`, mantém bloqueio de UPDATE e revoga DELETE de anon/authenticated/service_role. O botão Aprovar e a Edge Function seguem sem operação de exclusão.
- **Monday:** —
- **Etapas/Pendências:** implementação e comparação local concluídas; aplicar a nova migration no Supabase para habilitar exclusão administrativa. SQL remoto e interface autenticada não verificados nesta sessão. Backup não é importado pelo app.

## 22/10/2026 — Corretor e Sugestão: tema escuro com superfícies contínuas

Gabriel solicitou suavizar as mudanças bruscas de cor e faixas brancas. Causa: cards recebiam aliases escuros, mas rodapés usavam Papel claro fixo; a triagem em portal não herdava o escopo da página. CSS local agora reutiliza superfícies/bordas semânticas da plataforma e tokens Geobrain para texto acinzentado, rodapés e cabeçalhos próximos ao card, mapa menos luminoso, seleção/hover discretos e verde suave nos materiais enviados. Inclui resultados da Sugestão e triagem em tela cheia. Estado selecionado dos botões de decisão exposto por aria-pressed, sem mudar a ação ou persistência.

**Estado/evidência:** validado localmente; `styles/projects.css` e duas propriedades acessíveis em `CorretorV3Page.tsx`. Compilação/TypeScript e lint dirigidos aprovados; prévia isolada com card extraído do código real, VizSwitch, RecommendationResult, StudyQuickReview, Button e carregamento Brain, dados fictícios/rede externa bloqueada, em1440/390px e claro/escuro. Sem erros de página ou overflow móvel; tokens canônicos idênticos à fundação. Evidências pequenas e capturas em `.local-inputs/dark-interface-20261022/` (ignoradas). Sem suíte de regressão nesta rodada, IA ou banco remoto. Etapa de publicação depende do Publish do frontend e aceite real; nenhuma migration ou atualização de Edge necessária. Alterações FIERGS locais preservadas fora deste envio.

## 22/10/2026 — Remoção da trava excessiva na retomada

Validação final:392aprovados/2ignorados,56arquivos aprovados; tipos/lint/Deno/build24,67s aprovados. Novo cenário testa o controlador real transpilado com banco/fetch simulados, além da preservação de histórico/decisões na cobertura. Sem avaliação paga ou confirmação de produção nesta rodada.

Gabriel rejeitou conferência técnica como requisito. Causa: recuperação86de30f bloqueava toda execução com unknown/reserva; requisito criado pelo agente, sem nova avaliação humana de negócio. Status/start agora permitem outras etapas se não há running, preservando reserva/orçamento e bloqueando apenas o hash unknown no claim. Completed reapresentado, novos lotes seguem controle existente. Cobertura automática atualiza pendências sem sobrescrever decisões e guarda evidência anterior. Cenários do controlador real com banco/rede simulados comprovam retomada, skip unknown sem provedor, replay e novo lote; CI ampliado. [Causa, escopo e publicação](../features/corretor-vocacionais/DIAGNOSTICO_INTERRUPCAO_IMAGENS_ROLANDIA_2026-10-22.md). Sem IA/migration/banco remoto; publicar somente controlador com reviewer.ts e frontend. Não confundir remoção da trava com resolução da falha original ou análise completa real.

## 22/10/2026 — Recuperação de revisão incompleta sem ocultar resultados

Fechamento local deste complemento:380testes aprovados/2ignorados,54arquivos aprovados,19,97s; tipos/lint/Deno/build e prévia isolada aprovados. Não equivale a conclusão do estudo Rolândia ou runtime atualizado; aguardando publicação manual e reconciliação da leitura desconhecida.

Gabriel autorizou push36ebc7a/8c2f799 (CI técnico/documental aprovado) e pediu fallback/retomada. Implementada bancada parcial com achados/evidências/triagem, acesso à preparação e consulta review_status somente leitura por owner/documento/versão. Running/unknown/reserva bloqueiam continuação no frontend e start; completed/cache reaproveitados quando retomada segura. Fonte/localização/ata e decisões humanas preservadas, entrega exige snapshot completo. Tipos/lint/Deno/build42,39s e prévia local1440/390 claro/escuro aprovados, sem IA/banco/deploy. [Detalhes e limites](../features/corretor-vocacionais/DIAGNOSTICO_INTERRUPCAO_IMAGENS_ROLANDIA_2026-10-22.md). Etapa validada localmente; próximo publicar quatro funções com dois shared e frontend, nenhuma migration nova. O unknown real continua exigindo reconciliação; análise não foi concluída pelo agente.

## 22/10/2026 — Rolândia: lote unknown confirmado, exceção original ausente

SQL fornecido por Gabriel confirma um unknown de analyze-table-image, execução5ef5c1a9, gasto confirmado0,0360202USD/reserva0,2280224USD. Catch da folha descartava a exceção; logs recebidos só Boot/Shutdown sem motivo/correlação, insuficientes para confirmar timeout. Preparados códigos/fases/status/request-id seguros nas três folhas/shared e status/razão técnica no controlador, sem retry, liberação de reserva, IA ou banco.37 testes focados e369/2ignorados na suíte, tipos/Deno/lint aprovados. [Evidências, limites e publicação](../features/corretor-vocacionais/DIAGNOSTICO_INTERRUPCAO_IMAGENS_ROLANDIA_2026-10-22.md). Etapa validada localmente, sem resolver causa histórica por inferência; próximo publicar quatro funções com shared/frontend e reconciliar lote por evidência administrativa. Nenhuma migration nova; não reenviar estudo para descobrir erro.

## 22/10/2026 — Rolândia: duas imagens pendentes tratadas como pausa

Leitura REST do estudo ativoedda49da confirma13Excel,12DET/8texto/2visão e ausência de relatório;37 chamadas Luna com stop contabilizadas. Aviso image-not-read identifica s4/s45: retorno não confirmado e lote bloqueado, causa privada ainda a conferir. Código somava falha de imagem a pausa manual; corrigida comunicação/contagem e aviso persistente sem declarar conclusão ou refazer IA.363 testes/2ignorados, tipos/lint aprovados; consulta SQL só leitura preparada para execução5ef5c1a9. [Diagnóstico e limites](../features/corretor-vocacionais/DIAGNOSTICO_INTERRUPCAO_IMAGENS_ROLANDIA_2026-10-22.md). Sem nova migration/Edge/alteração remota; correção frontend local, causa específica dos lotes não resolvida por suposição. Arquivos alheios preservados.

## 21/10/2026 — Causa real ATA e recuperação sem repetir essa leitura

Gabriel trouxe SQL e JSON do lote novo: três listas null previstas no prompt rejeitadas pelo validador, não truncamento/recusa. Corrigida representação antes da validação e no replay seguro de lote completed, preservando resposta/consumo original e sem nova IA na ata. Retomada ignora só horário de reextração Excel, mantendo dados/snapshot/hash; ata multi-estudo não escolhe cidade.33 testes locais/checagens estáticas aprovados; sem escrita remota/processamento/deploy. Carregamento Brain local00e0bb5 continua incluído no envio pendente. [Evidências e publicação](../features/corretor-vocacionais/CARREGAMENTO_BRAIN_E_FALHA_ATA_2026-10-21.md): folha ATA+shared → controlador+shared → frontend, sem migration nova. Retomar estudo existente/materiais iguais, sem excluir; passos seguintes ainda requerem execução normal. Não homologado integralmente em produção.

## 21/10/2026 — Logo Brain nas etapas e diagnóstico da resposta recusada

Gabriel relatou nova falha após chamada real na ata e pediu carregamento padronizado. Sincronizado af04ed9 (edição manual do controlador) preservando locais. Logo opaca/preenchida e etapa aplicada no Corretor/Sugestão, documentos, execução, histórico/materiais/PDF; redução de movimento, contadores confirmados e pausa mantidos. Agora erro informa avaliação interrompida/documentos preservados. Tipo/lint/Deno/build e prévia desktop/mobile isolada aprovados, sem IA ou testes nesta rodada. Causa exata de produção ainda não lida: mensagem antiga mistura truncamento/recusa/JSON/schema; hipótese null versus listas na ata documentada. Adicionados motivos/field paths privados sem relaxar validação ou retry, consulta SQL somente leitura e [resultado/limites](../features/corretor-vocacionais/CARREGAMENTO_BRAIN_E_FALHA_ATA_2026-10-21.md). Próximo conferir lote real e publicar frontend/três folhas com shared; sem migration nova ou push nesta etapa.

## 21/10/2026 — Reconciliação Rolândia confirmada pelo retorno Lovable

Gabriel forneceu confirmação administrativa: três tentativas3b975f4f/a059b088/ef9c3c41 reconferidas e marcadas failed, sem lotes/gastos/reservas/ia_passes, exclusão ou IA. IDs completos no diagnóstico. Supera a pendência de reconciliação abaixo; não substitui homologação da correção. Código local f345adb/c9bd1c6, sem envio ou nova publicação nesta etapa. Próximo enviar correção, publicar corretor-execution+shared e frontend e conferir início real; nenhuma migration adicional.

## 21/10/2026 — Correção local de início/retomada incompleta

Retorno Lovable recebido por Gabriel: três prepared sem lotes/gasto/reserva e com reviewProfileId Luna sem snapshot; quatro funções publicadas, sem start real de homologação. Corrigidos rejeição de retomada moderna sem snapshot (legado válido preservado), retenção de id antes de validar perfil, causa HTTP operacional, erro persistente no topo da preparação e navegação somente após sucesso. Sem nova migration, IA, alteração remota ou reconciliação das órfãs. Checagens estáticas locais; próximo enviar commit e republicar controlador com shared + frontend, reconciliar tentativas e homologar. [Diagnóstico atualizado](../features/corretor-vocacionais/DIAGNOSTICO_INICIO_ROLANDIA_2026-10-21.md).

## 21/10/2026 — Reteste Rolândia: início falhou, registro preservado

Gabriel relatou retorno à preparação e bloqueio de exclusão após publicar. REST somente leitura confirma estudo5b389531 e fonte13planilhas persistidos, sem relatório, três DET. Exclusão rejeita execução prepared/running; hipótese principal controlador antigo sem reviewProfileId, com janela comprovada de órfã no cliente e navegação no finally apagando contexto do erro. CORS/recusa400 operacionais; versão das funções/consumo ainda não acessíveis administrativamente. [Diagnóstico e verificação única Lovable](../features/corretor-vocacionais/DIAGNOSTICO_INICIO_ROLANDIA_2026-10-21.md). Sem IA, deploy, limpeza ou correção aplicada; não declarar resolvido.

## 21/10/2026 — Material para reteste manual separado

Gabriel informou migration/publicação concluídas e pediu pacote de teste. Preparado Rolândia em `.local-inputs/testes/TESTE_LUNA_ROLANDIA_2026-10-21/`, 78 slides e 13 Excel. Só título interno do PPTX alterado, hash próprio para novo cadastro sem substituir avaliação antiga; demais entradas e Excel preservados, manifesto local. Cache por perfil pode ser compartilhado, reenvio da mesma cópia reconhece o mesmo teste. Sem IA ou consulta ao banco; produção informada pelo usuário, qualidade real pendente. Proveniência no pacote de publicação. Nenhum push adicional solicitado nesta preparação.

## 21/10/2026 — Revisor: push autorizado e CI aprovado

Gabriel autorizou expressamente incluir os dois commits Finotti anteriores. Enviados `30ab046`, `a199e7e`, `829f862` e `fe5c7f9` à main. [CI técnico do último SHA aprovado](https://github.com/GabeBrain/relatorios-api/actions/runs/39693170276), junto de documentação viva e contrato do protocolo. Alterações locais FIERGS e referência de interface preservadas fora do envio. Estado publicado no Git e validado localmente/CI; backend correto ainda sem acesso administrativo, migration/deploy e lotes reais R6/R8 pendentes no pacote único. US$0 gasto sob teto global US$3; nenhum email enviado. Próximo: aplicar o pacote e retomar a verificação real antes do convite à Amanda.

## 21/10/2026 — Revisor: fechamento local, envio ainda condicionado

Principal no commit local829f862, com retenção de falhas/metadados e proteção contra sobrescrever finish confirmado complementadas.25 testes focados/Deno aprovados; PostgreSQL13verificações. Suíte355 e dez passes da entrega mantidos. Decisão sobre os dois commits Finotti de saída solicitada antes do push; FIERGS local excluído do commit. Backend correto segue sem acesso administrativo, US$0 gasto, sem deploy/email. [Resultado e pacote de retomada](../features/corretor-vocacionais/RESULTADO_REVISAO_REGRAS_LUNA_2026-10-21.md); estado validado localmente, CI remoto e produção pendentes.

## 21/10/2026 — Revisor Luna/high e Guajajaras preparados para publicação

Gabriel/sessão: R0–R5 locais implementados, regras/evidências confrontadas, novas execuções de texto/ata/visão em Luna/high com flag/snapshot, cache/retomadas legadas, materiais, decisões e Sugestão preservados. JSON inválido não vira ausência de erro; consumo confirmado/raciocínio/perfil e teto global de validação US$3 protegidos na migration aditiva. Suíte355/2 ignorados, dez passes com deltas intencionais exatos sem apagar baseline, PostgreSQL12checks, tipos/Deno/lint/build e percurso isolado PPTX+11Excel aprovados. Corrigido evento de teclado na triagem; aparência/tokens preservados.

Estado validado localmente. Backend mxinpvcqzbfbzjodhgtz indisponível no conector e CLI; sem migration remota, deploy ou testes pagos (US$0). R6/R8 e convite de reteste aguardam publicação e verificação real. Dois commits locais Finotti fora do escopo de envio, demais arquivos FIERGS preservados. [Resultado, matriz e evidências](../features/corretor-vocacionais/RESULTADO_REVISAO_REGRAS_LUNA_2026-10-21.md) e [pacote único de publicação](../features/corretor-vocacionais/PUBLICACAO_REVISOR_LUNA_2026-10-21.md). Email preparado, não enviado; Git não comprova produção.

## 21/10/2026 — Plano do revisor Luna/high e reteste de Amanda

Preparado por pedido de Gabriel `PLAN_REVISAO_REGRAS_LUNA_RETESTE_AMANDA_2026-10-21.md`: matriz das regras existentes, ajustes pequenos demonstrados, texto/ata/visão Luna/high com legado/cache/consumo preservados, dez passes, CI, validação real limitada, publicação e resposta pronta para Amanda. Teto de ensaio proposto US$5, autorizado somente no CTA; não gasto nesta preparação. Email distingue Sugestão de análise e Revisar estudo, pede arquivo ainda sem marcações para reteste e fica condicionado à verificação de produção. Backend/acessos e dois commits locais Finotti não autorizados por inferência; handoff único se publicação exigir usuário. Estado preparado, sem implementação, testes, SQL remoto, IA paga, commit/push ou envio de email.

## 21/10/2026 — Diagnóstico Guajajaras/BH sem nova geração

A pedido de Gabriel, ampliada a leitura do PPTX enviado: marcações vermelhas em25 slides, embora sem comentários nativos. Correção da constatação inicial: há revisão humana no arquivo, mas não se comprovou ser o mesmo relatório anexo ao email ou a autoria de cada caixa. Extração real local do código atual:137slides,124 incluídos/13 excluídos,26.173caracteres;47 tabelas nativas são41 legendas e6 rodapés. Dados PNG ausentes na sugestão; SVG de30/70 existe no IR mas não entra no pedido; recados de revisão sobrevivem ao filtro. Divergências de renda/propriedade/verticalização, cabeçalho63 e categoria de garagem66 mapeadas, distinguindo soma32 atual correta e amostra108 atual de1.815 da nota antiga sobre30.

Consulta REST pública somente leitura não localizou caso/arquivo Guajajaras; estudo Quanti VBE homônimo não foi confundido. Código histórico d58f64c guardava sugestão somente em estado React; persistência entrou em bb0f22a/16out, sem comprovar runtime do uso antigo. Email direto indisponível por reautenticação. Matriz completa dos25 slides e13 diagnósticos/proposta P0–P3 em `DIAGNOSTICO_GUAJAJARAS_AMANDA_2026-10-21.md`. Evidência reproduzível por script local de cobertura. Estado: diagnóstico documental/extração local, correções propostas e ainda não implementadas. Sem suíte, IA paga, escrita remota, deploy, contato com Amanda ou push; dois commits locais Finotti e demais alterações alheias preservados. Próximo: P0/P1, fonte limpa e reconciliação antes de nova geração.

**Destilação posterior,21/10:** Gabriel pediu reduzir a frente a um passo de melhoria do revisor. Seção 0 do diagnóstico Guajajaras consolida preocupações numéricas, briefing, comparáveis, amostra, situação dos concorrentes e legibilidade, distinguindo marcações do estudo de omissões da IA não comprovadas. Próximo: confrontar candidatos com regras/resultados existentes no Corretor e escolher a menor correção; cobertura medida na Sugestão não comprova lacuna igual no revisor. Sem nova implementação, execução ou push; plano amplo permanece opção, não escopo aprovado.

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

### 12/11/2026 — Slide Maker: infraestrutura Google e ponte Lovable Cloud — Gabriel / Codex

- **Problema/resultado:** o Rebrain usa Lovable Cloud, sem service role exportável. Cloud Run agora usa `slide-maker-bridge` para dados, autorização de Storage e Broadcast; credencial gerenciada permanece na Edge. Arquivos grandes são transferidos diretamente por URLs assinadas restritas. API pública por token do trabalho preservada.
- **Implementação:** HMAC/versionamento/prazo/nonce, lista fechada de operações, erros sanitizados, idempotência transacional e reserva CAS+fase com limites serializados no banco. Migration complementar `20261112200554_slide_maker_bridge.sql`: duas tabelas privadas e duas RPCs invoker, sem execução pública. Recuperação da credencial via script pessoal com clipboard, sem chat, arquivo ou argumento de processo contendo segredo.
- **Infraestrutura preparada antes desta fatia:** projeto `brain-rebrain-slide-maker`, número `475189392075`, São Paulo, mesma organização/cobrança profissional do BigQuery; bucket privado, contas runtime/tasks/build, repositório e fila (1 tentativa/4 concorrentes). Anthropic1enabled conforme capturaGabriel. Nenhum deploy. Bucket vazio na última conferência; 20 ativos com Diego. Segredo antigo de service role vazio e sem uso no novo deploy.
- **Validação local:** 78 testes do serviço aprovados, 2 condicionais Linux/bwrap pulados; fluxo API→HMAC→handler→PostgreSQL/PGlite→F1–F4/v1/v2, incluindo resposta perdida após commit sem duplicação. 31 verificações SQL de permissões/CAS/idempotência/limites/rollback. 92 regressões da feature frontend, 3 testes do cadastro seguro, tipos Node/Deno, lint dirigido, builds do serviço/Rebrain aprovados. Storage/fila/Broadcast são simulados no teste integrado; concorrência multi-conexão e isolamento Cloud Run ainda precisam ensaio real. Nenhuma chamada paga.
- **Entrega/manual:** [roteiro de deploy](../features/apresentacoes/DEPLOY_GCP.md), [plano e estado](../features/apresentacoes/PLANO_LOVABLE_CLOUD_2026-11-12.md), [SQL de conferência](../features/apresentacoes/VERIFICAR_LOVABLE_CLOUD_2026-11-12.sql). Gabriel aplica migrations e publica função manualmente no Lovable, cadastra `SLIDE_MAKER_BRIDGE_SECRET` com o valor gerado por `scripts/slide-maker/cadastrar-bridge.py`; Google usa `slide-maker-bridge-secret`. Depois validar simulado/isolamento e URLfrontend; agente real só com autorização de consumo. Estado **validado localmente**, sem migration remota, push ou publicação.
- **Preservação:** main atualizada por fast-forward até06a179ee com autorização; nove arquivos locais salvos e reaplicados sem conflito, untracked preservados. Backup/stash mantidos. Alterações paralelas de FIERGS/estimativas/segurança ficam fora deste commit.

### 12/11/2026 — Relatórios: tabelas nativas e objetos editáveis nos PPTX — Codex/Lucas

- **Commit:** `cd473deb` (12/11/2026), local; documentação de fechamento em commit separado.

- **Mudança:** exportador compartilhado de objetos DrawingML para SP85 e Fortaleza60/89; listas3–7 como tabelas reais, textos e gráficos em elementos vetoriais, imagens separadas. Modo de PPTX em lâmina única retirado de Fortaleza. Contraste/alinhamento/centro das listas corrigidos; SP2 refeito com textos/cartões nativos. Fortaleza59/88 reconstruído em16retratos/nomes/cargos com editor individual; SP mantém suas15imagens de consultoria. Capas e divisórias entram no mesmo caminho.
- **Limites:** gráficos em formas vetoriais, sem planilha Excel “Editar Dados”; demais tabelas SVG como objetos de texto/células. Imagens/logotipos e bases cartográficas selecionáveis/substituíveis. Qualidade máxima dos recortes é a disponível na referência, com upload individual para melhoria. Não modifica cálculo nem homologa indicadores.
- **Validação:**276testes, build/tipos/lint;240casos mensais/324trimestrais no Edge. Três downloads reais e abertura/render no PowerPoint (60/89/85), tabelas `HasTable`, ajuste de célula preservado e fotos separadas. Dados de QA sintéticos/fixtures, sem API autenticada. [Contrato e evidência](../features/relatorios-institucionais/PREVIA_EDITAVEL_2026-11-12.md).
- **Monday:** [Fortaleza](https://brain381753.monday.com/boards/18398428946/pulses/13149406420) — `13149406420`
- **Etapas/Pendências:** correção local pronta para revisão/publicação autorizada. Depois, gerar os materiais reais novamente e homologar com o analista; persistência da edição continua apenas na sessão. Sem escrita Monday.


### 12/11/2026 — Relatórios Fortaleza: fontes observadas; Fortaleza e SP: prévia editável — Codex/Lucas

- **Commit/validação:** `a6b537af`;266testes, build/tipos/lint;240casos mensais e324trimestrais no Edge, edição/navegação/restauração em ambos e PPTX/PDF reais60conferidos. Nove retratos em objetos editáveis. Novo download realSP85não executado; extração e integração testadas.

- **Mudança:** validação das40fontes municipais pelo conjunto observado e meses completos; respostas comerciais realmente vazias confirmadas; classificação horizontal conhecida, intervalo para desconhecidos no cadastro; listas iniciais completas nas posições originais. Slide2 identifica base cadastral, não amostra histórica. Editor compartilhado de textos na prévia, auditoria dos ajustes manuais e exportação pareada; Tahoma/títulos principais30pt, artes Fortaleza com texto nativo e retratos de maior resolução disponível separados no PPTX.
- **Evidência/limites:** [disponibilidade e método](../features/relatorios-institucionais/fortaleza/DIAGNOSTICO_MENSAL_2026-11-12.md), [editor e visual](../features/relatorios-institucionais/PREVIA_EDITAVEL_2026-11-12.md). Agregados reais do JSON de agosto; cadastro/históricos individuais sintéticos no ensaio. Sem nova geração autenticada, homologação ou escrita Monday. Alterações locais nesta entrega.
- **Monday:** [Fortaleza](https://brain381753.monday.com/boards/18398428946/pulses/13149406420) — `13149406420`
- **Etapas/Pendências:** implementação local e validações de prévia/exportação; publicar após autorização e gerar mensal real para confrontar disponibilidade/valores. Edição permanece na sessão, sem persistência no servidor; métodos de preços e mapas esquemáticos trimestrais seguem pendentes de homologação.


## 12/11/2026 — Fortaleza mensal: diagnóstico agosto versus outubro e bloqueios confirmados

**Autor/origem:** Codex, a pedido de Lucas. Agosto recebido após a hipótese de outubro sem fechamento. Agosto tem15disponíveis/33pendentes/12editoriais; outubro14/34/12. Não é somente fechamento: cadastro falha na primeira resposta pelo limite de5páginas; séries municipais rejeitadas por padrões/meses/categorias persistem nos dois arquivos. Em agosto37está disponível e52–55bloqueiam por bairro ausente no empreendimento23980; em outubro37/52–55acusam fotografia2026-10ausente do85529. Evidências do usuário, não chamadas autenticadas feitas pelo agente.

**Correções locais:** cadastro agora percorre até40páginas/4.000IDs por cidade/segmento, conservando totais estáveis, deduplicação, escopo e cancelamento. Regressão reproduz577verticais em6páginas sem truncamento; os577constam na coleta detalhada real. Capa1, sumário8 e divisória9deixam de receber erro de cálculo no JSON e seguem revisão editorial. Tabelas por bairro conservam registros sem bairro em “Bairro não informado”, com aviso e totais integrais; não inventam bairro nem alteram preço, quantidade ou fotografia. Produtos horizontais desconhecidos continuam bloqueados.

**Séries ainda em investigação:** no diagnóstico antigo, a validação descartava as linhas municipais antes de exportar, impedindo identificar quais grupos/meses foram omitidos ou qual classificação comercial chegou. Nova cobertura é capturada após paginação estável, antes desse descarte: grupos/tipos observados, meses, padrões ausentes, células faltantes e quantidades/VGV agregados. Runtime ainda não publica fonte inválida; dados ausentes não viram zero. Não há token, cabeçalhos ou histórico individual nessa cobertura; não acrescenta chamadas GeoBrain. Necessária nova geração/JSON após publicação para corrigir a semântica específica da resposta real.

**Ambiente/Etapas:** sessão começou em main limpa, origin único; fetch mostrou11commits atrás. FF até`4f2b0bf3` incorporou Slide Maker, guia GeoBrain e filtro de divergências; nenhuma mudança Fortaleza. Alterações desta rodada locais, distintas dos commits trimestrais publicados`4ec89c0a`/`431b64f4`. Prévia mensal60e trimestral89preservadas; não declarar todos os slides liberados nem homologados. Carregamento Brain, seleção autorizada e renderizadores de tabela existentes reutilizados.

**Validação:** suíte Fortaleza251testes/23arquivos, tipos e lint aprovados; testes adicionais confirmam estados editoriais e cobertura preservada com fonte rejeitada. Build aprovado;12cenários Edge com bairro válido/ausente e fotografia ausente em1440/390claro/escuro aprovados, sem erros ou overflow. Captura de bairro não informado inspecionada.20testes focados repetidos após acrescentar asserções de estados e cobertura. Geração real do novo código e próximos números/estados ainda não observados.

**Retomada:** completar verificações, commit isolado e perguntar pelo push. Após envio autorizado, gerar agosto novamente e ler `sources.municipal[].coverage`. Resolver categorias esparsas/comercial com evidência; não relaxar guardas globais para “zerar” o status. Histórico23980pode ter outros problemas além do bairro: a nova geração determina os bloqueios seguintes. Nenhuma escrita Monday, mudança SP, Slide Maker ou outros motores.

**Monday:** [Estudo Fortaleza](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`, referência apenas.



## 12/11/2026 — autorização de publicação do trimestral

Lucas autorizou expressamente o push após explicação de que89posições estão implementadas e a validação real permanece pendente. A revisão automática voltou a permitir fetch e regressões nesta retomada; não atribuir a isso comprovação de reposição de créditos. Tipos/lint e documentação aprovados; nova suíte completa247testes/22arquivos e build aprovados antes do envio. Usuário pediu aguardar JSON de agosto/setembro para o mensal; nenhuma correção mensal adicional foi incluída neste push. Mantidos os limites de localização esquemática, classificação da API, metodologia candidata e download real89pendente. Mensal outubro recebeu JSON com34fontes pendentes: investigação separada, sem atribuir esses defeitos ao novo trimestral ou homologar o mensal. Referência: commit local11–20`4ec89c0a`; restante21–89em commit isolado desta entrega. Sem escrita Monday.

**Monday:** [Estudo Fortaleza](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`, referência apenas.


## 12/11/2026 — Fortaleza trimestral: continuação 21–89 local, conferência final pendente

**Autor/origem:** Codex, retomada solicitada por Lucas. Base publicada `bca69e66`; bloco 11–20 no commit local `4ec89c0a` (12/11, 13:03 -03:00), ainda não enviado. Continuação 21–89 permanece em arquivos locais, sem commit final. Main estava 0 atrás/1 à frente de origin; nenhum outro remoto configurado. Não houve push, geração autenticada GeoBrain ou escrita no Monday.

**Implementação:** prévia e diagnóstico cobrem as 89 posições originais. Janela de 27 meses para nove trimestres de fluxos e fotografias; INCC-DI aplicado mês a mês antes de agregar VGV; estoques são fechamentos trimestrais. 26/28 preservam 13 janelas mensais móveis de 12 meses. 16/19/31/32 e bairros/municípios preservam o mês de fechamento do original. 54/72 preservam 25 IVVs MENSAIS (confirmados nos caches e renders originais); média aritmética das taxas mensais. Preços históricos 42/43 têm nove fechamentos trimestrais; 45–48 comparam cidades no fechamento. Tabelas 59–84 usam qty/estoque/preço/área históricos de empreendimentos ativos, sem substituir ausências pelo cadastro atual. Faixas de idade ≤6/7–42/>42 meses vêm da data de lançamento. Equipe 86/87 editável e quadro88 substituível. Exportador estendido a89 páginas, mantendo mensal60 e auditoria pareada.

**Diferenças explícitas:** localização49–53/71 é representação esquemática de coordenadas da API;50–53separam quadrantes do mesmo conjunto, não reproduzem os mapas/cartografia/zoom antigos. Padrões são os nomes da API, sem inventar equivalência entre Médio-Alto/Super Luxo nem faixas editoriais de preço. Universo ativo/capacidade/ponderação/idade/classificação ainda candidato; amostra histórica continua sem fonte própria. Sem homologação do material ou dos indicadores. Totais municipais de16/19/31/32somam os três segmentos, corrigindo o original que repetia só horizontal/comercial.

**Evidência e limites da sessão:** suíte Fortaleza, build e testes de estrutura dos pacotes PPTX/PDF89 passaram antes dos ajustes finais. Edge offline executou324asserções de estrutura/estado (79 lâminas ×1440/390×claro/escuro, mais fonte vazia/incompleta). Inspeção visual dos originais versus saída detectou captura antes do carregamento da imagem: a espera de decode/paint foi reforçada e precisa repetir. A mesma inspeção identificou IVV54/72mensal (corrigido após a suíte) e motivou restaurar gráfico+quadro68/83 e comparação de dois anos42. Tipos e lint finais passaram; esses últimos ajustes ainda precisam de regressão/build/captura completos. Os testes de exportação usam capturas simuladas: não substituem um download real de89lâminas capturadas no navegador.

**Bloqueio externo:** a revisão automática de aprovação recusou iniciar o ensaio adicional de download no navegador porque o workspace está sem créditos (falha da revisão, não juízo de ação insegura). Comando não executado. Usuário autorizou continuar; isso não repõe os créditos. Consultas/edições permitidas sem escalonamento continuaram; não contornar o mecanismo com ferramenta/rota alternativa. Novos ensaios elevados e commit final aguardam revisão disponível. Não declarar conclusão validada/publicada.

**Próxima ação concreta:** após reposição de créditos pelo responsável do workspace, executar suíte Fortaleza completa, build e `fortaleza-quarterly-visual.mjs` com a espera de imagens; inspecionar novamente54/65/68/72/75/83/84 e os mapas. Fazer download real PPTX/PDF89 e testar cancelamento/erro/retry Brain. Conferir manifesto/hash das artes e `npm.cmd run check:live-docs -- origin/main HEAD`; registrar commit isolado com caminhos explícitos. Só então pedir autorização de push do lote Fortaleza. SP não foi alterado.

**Monday:** [Estudo Fortaleza](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`, referência apenas.



## 12/11/2026 — Fortaleza trimestral: slides 11–20

Retomada autorizada por Lucas, base `bca69e66`, main/origin 0–0 após fetch. Office abriu original trimestral em leitura (hash do catálogo conferido); arte 11–20 sem tabelas/gráficos/percentuais anteriores. Nove trimestres completos a partir de 27 meses; lançamentos em unidades, cadastro distinto e VGV corrigido mês a mês pelo INCC-DI. Tabelas 16/19 preservam mês de fechamento do original e somam vertical/horizontal/comercial; original exibia total repetindo somente horizontal. Prévia e JSON agora reconhecem 20/89 posições, sem exportação trimestral prematura. Carregamento Brain, escopo autorizado, retry e cancelamento reutilizados. Mensal 60/60 e SP preservados.

Validação: 235 testes Fortaleza/21 arquivos, build/tipos e lint dirigidos aprovados; 48 cenários Edge com rede externa bloqueada (1440/390, claro/escuro, dez slides e fontes incompletas/vazias); comparação visual com os dez originais revisada, títulos das tabelas restaurados após inspeção. Dados sintéticos; sem geração autenticada ou homologação. Próximo: 21–40, depois preços, mapas, tabelas e fechamento. Sem publicação ou escrita Monday.

**Monday:** [Estudo Fortaleza](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`, referência apenas.


## 12/11/2026 — SP: preços históricos observados sem barras vazias

Novo diagnóstico do usuário (SHA-256 `504aa4d5fd114879fb8ff4af4719655b0ea94af64e2086a9da20f006f4ae27fd`) confirma médias por estoque positivo nos 13 períodos de cada slide 53/55/57. A guarda de estoque negativo em uma tipologia bloqueava as amostras históricas, inclusive o recorte de dois dormitórios sem negativo próprio. Agora permite exibir a média observada com cobertura parcial; negativos não ponderam preços e permanecem na auditoria. Não reconcilia estoque/população, não altera o fechamento nem calcula variações envolvendo parciais. Validação: 351 testes SP em 39 arquivos, tipos e lint dirigidos aprovados. Teste novo confere 13 pontos em 53/55/57 e preserva bloqueio de fechamento inválido. Sem nova observação em navegador autenticado; verificação headless do cálculo, com dados sintéticos. Métodos com esgotadas continuam indisponíveis por preços ausentes (99 tipologias no geral, 25 em um dormitório e 24 em dois no fechamento); não comprovam equivalência ao analista. Sem novas consultas API ou mudança de coleta. Fortaleza preservado.

- **Autor/origem:** Codex, diagnóstico fornecido pelo usuário; base `1d3b88ac`.
- **Etapas/pendências:** correção local para exibir 13 observações; cobertura completa e média do analista continuam pendentes. Conferir geração real após publicação.
- **Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`, referência apenas.


### 12/11/2026 — SP: comparar pesos de preço incluindo tipologias esgotadas — Codex

- **Ambiente/funcionalidade:** SP institucional, diagnóstico e Insights do analista / Memória de cálculo.
- **Pedido/mudança:** usuário propôs incluir tipologias sem estoque positivo para investigar a diferença de preço geral. Comparação exploratória por competência e slides53/55/57: estoque positivo, qty da fotografia incluindo esgotadas e média simples de todas as tipologias do recorte. Exporta contagens de estoques positivo/zero/negativo/desconhecido, denominadores, medições inválidas e ressalva de cobertura. Sem novas chamadasAPI; reaproveita os históricos em memória. Não altera médias dos slides nem escolhe automaticamente o resultado mais próximo do original.
- **Validação:**26testes focados/4arquivos, tipos/build/lint aprovados.4cenáriosEdgeoffline1440/390claro/escuro, tabela de3recortes aberta, zero erros/overflow; captura desktop inspecionada. PadrãoTable/details existente reutilizado, carregamento e cancelamento intactos.
- **Limite/Etapas/Pendências:** não há históricos completos persistidos nesta máquina; JSON recebido traz médias finais, insuficientes para recalcular os pesos. Resultado real da hipótese ainda NÃO medido. Após envio autorizado, usuário gera novamente e envia JSON; comparar os13períodos e a referência antes de mudar método. qty pode representar capacidade na fotografia, não necessariamente quantidade original de lançamento. Fortaleza permanece pausado.
- **Commits:** commit desta entrada; base `1c7a4a84`.
- **Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`, referência apenas.


### 12/11/2026 — SP: médias históricas observadas e manchetes — Codex

- **Ambiente/funcionalidade:** SP institucional, séries53/55/57e destaques9–11; regra aplicada a todos os períodos.
- **Mudança:** divergência do total municipal deixa de ocultar automaticamente a média histórica da amostra observada quando estoques/preços são válidos. Pontos parciais ficam amarelos, com motivo na auditoria e sem variação envolvendo parcial. Fechamento, dados inválidos/conflitantes e estoques negativos sem projeção conciliada continuam bloqueados. Nenhum preço é copiado do original ou interpolado. Manchetes dinâmicas enfatizam liderança, avanço/recuo/estabilidade e lançamentos em12meses conforme dados reais do recorte.
- **Referência:** revisadas51planilhas embutidas no original de hash1350f82cb1d9386487ca1a9aee110fb19cf3d6ea7cb40d4a0205025802d9939b; sem conexões externas.53/55/57têm13valores colados, com últimos15.896/18.713/13.673. Não revelam o cálculo das médias. Concordância de55/57com cartõesMAP64é evidência de consistência interna, não prova da fórmula.
- **Validação:**346testesSP/38arquivos aprovados; build/tipos/lint.24cenáriosEdgeoffline1440/390claro/escuro,13pontos observados nos históricos sintéticos e manchetes9–11; capturas53/9inspecionadas. Na primeira rodada, regressão de estoque negativo identificou guarda que precisava ser preservada; corrigida antes da rodada final. Sem nova consultaGeoBrain ou geração real. Padrões de gráficos/feedback preservados, sem mudar carregamento.
- **Etapas/Pendências:** usuário autorizou publicação. Isto amplia exibição da amostra válida; não comprova cobertura completa ou preço equivalente ao analista. Fonte/cálculo geral e cruzamento dormitório×MCMV continuam em investigação. Após publicação, gerar novamente e conferir o JSON. Fortaleza permanece pausado e fora do commit.
- **Commits:** commit desta entrada; base `57e24837`.
- **Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`, referência apenas.


### 12/11/2026 — SP: recuperar preços e cartões com método explícito — Codex

- **Ambiente/funcionalidade:** SP institucional, slides53/55–59/61–64, revisão e diagnóstico em todos os períodos.
- **Evidência/mudança:** JSON2T2026do usuário comprovou sete preços anônimos na consulta geral, grupo4ignorado e adaptador apagando MCMV/MAP calculados. Série53recupera método granular inteiro com lacunas; linha61/62recupera média granular conferida, separada das barras municipais;59aceita4sem chamá-lo4+;63/64mantêm quadro granular completo. Métodos e avisos na prévia/JSON/insights, sem média dos padrões ou mistura de fontes por ponto. [Contrato, hash e limites](../features/relatorios-institucionais/sp/DIAGNOSTICO_PRECOS_2026-11-12.md).
- **Etapas/Pendências:** correção local;53passa a parcial com oito competências ausentes/divergentes;55/57continuam parciais,56já estava disponível no arquivo. Média geral calculada não é equivalência homologada com o manual. Falta publicar com autorização e conferir nova geração/JSON, incluindo preços do grupo4que não vieram numericamente no diagnóstico recebido. Fortaleza pausado, sem alteração runtime.
- **Validação:** regressões com agregados reais e fontes sintéticas;50casosEdge1440/390sem rede externa, erro ou overflow. Build/tipos e lint aprovados;342testes/38arquivosSPaprovados, com concorrência limitada após timeout na primeira rodada. Reutilizados gráficos/quadros e feedback existentes; consultas, BrainLoadingState e cancelamento preservados. Sem API nova/geração real/push/Monday.
- **Commits:** commit desta entrada; base `a4ea3a25`.
- **Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`.


### 12/11/2026 ? SP: diagn?stico JSON vis?vel para investigar pre?os ? Codex

- **Ambiente/funcionalidade:** SP institucional, resultado da gera??o e diagn?stico dos 85 slides.
- **Pedido:** usu?rio pausou Fortaleza trimestral e pediu investigar 53/59 indispon?veis e 55/56/61?64 com lacunas, em todos os per?odos. Solicitou primeiro o bot?o JSON, depois pausa para gerar e enviar o arquivo.
- **Mudan?a:** bot?o ?Baixar diagn?stico JSON? no topo do resultado ao encerrar a gera??o, reutilizando `spReviewSnapshot` e Button Brain. Exporta per?odo efetivo, situa??o/motivo por slide, pre?os municipais e baseline granular j? existentes. Fontes de pre?os passam a registrar grupos observados e contagem de medi??es v?lidas por m?s, sem payload bruto, autentica??o ou hist?ricos individuais. Checklist anterior preservado.
- **Valida??o:** 26 testes focados; tipos/build e lint dirigido aprovados; download real no Edge headless com dados sint?ticos, 1440/390 e claro/escuro, 85 posi??es no JSON, zero erros/overflow. Rede externa bloqueada. Sem ensaio autenticado ou gera??o real.
- **Etapas/Pend?ncias:** diagn?stico preparado; corre??o dos indicadores deliberadamente pausada at? usu?rio enviar JSON da gera??o atual, come?ando por 2T2026. Nenhuma regra de pre?o, status, m?dia ou fallback foi alterada. Fortaleza permanece pausado em 10/89; somente script preparat?rio n?o commitado, sem altera??o runtime.
- **Monday:** ?
- **Commits:** commit desta entrada; base `3d3b1024`. Sem push/publica??o ou escrita Monday.


### 11/11/2026 — Fortaleza mensal: PDF/PPTX de conferência e revisão — Lucas / Codex

- **Mudança:** revisão mensal encontrou exportação ausente. Implementados PDF e PPTX fiel/editável com60páginas, diagnóstico da mesma geração, equipe da prévia, cancelamento/recuperação e guardas de acesso/competência/excesso de lançamentos. Mesmo componente nas prévias e nos arquivos; removido subtítulo duplicado11/13/15. [Contrato e retomada](../features/relatorios-institucionais/fortaleza/MENSAL_EXPORTACAO_2026-11-11.md).
- **Validação:**225casos Fortaleza distintos +7regressões SP; tipos/build/lint, Edge1440/390claro/escuro/cancelamento/erro/retry, três arquivos de60páginas e auditoria sem credenciais. Office em leitura gerou16renders; PDF renderizado/inspecionado. Dados sintéticos, sem comprovação de valores reais.
- **Etapas/pendências:** mensal60+exportação implementados para conferência, não homologados; revisar fonte/amostra/capacidade/preços/IVV/INCC/equipe com geração real/analista. Trimestral continua10/89; próximo11–20. Basee23c6692, nova fatia local. SP apenas reutiliza rotina de auditoria extraída sem mudar namespace/parte; fórmulas e demais motores preservados. Sem publicação/coleta real/Monday.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

### 11/11/2026 — SP: fonte municipal de preços e recuperação do histórico — Lucas / Codex

- **Mudança:** observações de preço municipal integradas à geração, independentes da reconciliação granular, com auditoria/insights distinguindo preço informado e cálculo por estoque. Média geral exige total explícito; sem média de padrões. [Contrato e retomada](../features/relatorios-institucionais/sp/CORRECAO_FONTE_PRECOS_2026-11-11.md). Preservados recortes sem MCMV/MAP candidatos, escoamento e demais motores.
- **Validação:** suíte SP/tipos/build/lint e Edge offline:40casos de slides mais sete cenários de geração lenta/cancelamento/recuperação/vazio/erro, sem erros de página. Fontes simuladas, nenhuma nova medição de mercado.
- **Etapas/pendências:** implementação local para ensaio; autenticação real, retorno geral sem agrupamento, valores2T2026 e metodologia integral ainda pendentes. Não declarar o preço corrigido/homologado antes do retorno real. Nova fatia local sobre f0d5b408; sem push, publicação ou escrita Monday.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

### 11/11/2026 — SP: origem dos meses de escoamento — Lucas / Codex

- **Diagnóstico:** leitura do original no Drive,51planilhas embutidas, caches e auditoria do gerado. [Contas, fontes e limites](../features/relatorios-institucionais/sp/INVESTIGACAO_ESCOAMENTO_2026-11-11.md). Econômico, Compacto, Standard e mercado reproduzem média móvel de12meses; Alto reproduz com históricos originais e158vendas atuais do gerado. Sistema usa média do trimestre, explicando41,87contra14,177meses no Alto. Original contém bases de apoio diferentes dos totais finais, além de arredondamento diferente.
- **Validação/estado:** script offline compara Excel/cache, totais trimestrais/móveis e reproduções numéricas, com hashes/JSON. Nenhuma fórmula de produção alterada ou nova coleta. Etapa de conciliação em andamento; pendem memória nominal e diferenças individuais de classificação/atualização. Não homologado, não publicado; trabalho anterior7685cd57preservado.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

### 11/11/2026 — SP Institucional: revisão do analista, Top10 e nitidez do PPTX — Lucas / Codex

- **Ambiente/funcionalidade:** Rebrain — `/rebrain/relatorios-institucionais/sp`. Base608009b7recebida porFF limpo de49commits; correções Lovable e entregas paralelas preservadas.
- **Entrega:** complemento Tahoma em textos antes incorporados às artes, divisórias e rodapés; sumário30pt, trimestre no subtítulo e notas condicionais. Top10 agora calcula participação sobre saldo municipal positivo mesmo com bairros negativos, preservando sinais e reconciliação mensal. Cinco fotos originais e referência1920×1080 da consultoria; exportador mede densidade sem inventar detalhe. [Contrato, fontes e retomada](../features/relatorios-institucionais/sp/CORRECOES_ANALISTA_2026-11-11.md).
- **Dados/decisão:** escoamento adiado explicitamente por Lucas, sem mudança de fórmula ou unidade e sem bloquear demais páginas. Preços/histórico em diagnóstico separado; comparação dos artefatos mostra diferenças de universo/método a confirmar. Não impor14meses ou15mil/m² nem preencher ausência por zero. Nenhuma alteração de coletores ou política Secovi/FIERGS.
- **Validação:**308testesSP/35arquivos, tipos/lint/build e86casosEdge locais; PPTX sintético85slides, textos nativos Tahoma/sumário30pt,20retratos e13rendersOffice. Geometria/cores de mapas verificadas, sem cartografia externa real. Não é geração autenticada ou homologação de indicadores. Sem publicação/envio de email/Monday.
- **Arquivos/commits:** componentes/exportador/testes/artes SP, diagnósticos e docs específicos; commit isolado `fix(sp): complete analyst presentation corrections`, hash no fechamento. Próximo: revisão/publicação autorizada; dados de preço/histórico e escoamento permanecem separados.
- **Monday:** [Relatório SP Institucional](https://brain381753.monday.com/boards/18398428946/pulses/13452140276) — `13452140276`; referência, sem escrita.

### 10/11/2026 — Integração autorizada: Relatório API Excel e atualizações upstream — Edgar / Codex

- **Autorização/escopo:** usuário autorizou merge, validação e sincronização de origin/main e upstream/main, preservando ambos os históricos. Merge de15ab9f88 (quatro commits locais VGL/quantidade lançada/preço médio) com0aa49380 (28commits upstream, incluindo SP/Fortaleza/Lovable). Sem rebase/reset/push forçado ou edição das regras recebidas. Documento vivo é a única sobreposição de arquivos.
- **Preservação:** merge automático via union, conferido antes desta entrada pela identidade base+(local−base)+(upstream−base): zero linhas não vazias perdidas/extras. Oito arquivos exclusivos locais e85exclusivos upstream comparados contra seus blobs originais: zero divergência. Arquivo PROTOCOLO-SESSAO-v3-AUDITORIA-2026-08-28.md mantido externo ao índice/publicação, hashB0CC263B122D461DE0E87304B09419113DE2CC7DF9326E5D060F2C56DA82FA3A.
- **Validação:**335 testes em30arquivos (Relatório API Excel, Fortaleza, personalização e correções SP), TypeScript completo e diff/index sem erros. Testes executados com recurso experimental webstorage do Node desativado no ambiente, sem alterar código. Build e check-live-docs aprovados. Nenhuma API autenticada, deploy Lovable ou aceite externo observado nesta integração.
- **Etapas/Pendências:** integração técnica validada para envio autorizado; confirmar runtime publicado e artefatos reais separadamente. Esta entrada sucede os estados locais anteriores de VGL; não apaga seus registros. Origem das funcionalidades preservada nas entradas respectivas. Sem escrita no Monday.
- **Monday:** —

### 10/11/2026 — Relatório API Excel: preço médio usado no VGL — Edgar / Codex

- **Mudança exclusiva:** coluna selecionável Preço Médio para VGL. Por empreendimento: soma(qty lançado × preço escolhido) / soma(qty lançado), com as mesmas tipologias do VGL (inclusive Garden/Cobertura). Por tipologia expõe preço individual. Não usa média geral nem filtro Padrão/MCMV; não renomeia Preço de Lançamento para um valor que poderia ser atual. Tabular por período; horizontal posição final/série. Valor em reais sem escala VGV/VGL, precisão interna e duas casas no Excel/prévia. Ausências/pesos zerados geram vazio; total_units não substitui pesos. VGL permanece soma dos produtos.
- **Validação:**92 testes em sete arquivos aprovados: média lançada/atual com pesos10+5 mesmo após qty20+5, exclusão de escala, independência da média geral, visões/layouts, períodos sem uma tipologia, ausências/zero e XLSX reaberto. Tipos/lint/build aprovados. Navegador1440/390 claro/escuro com rede simulada e downloads: preço médio atual400.000 e lançamento233.333,333… com pesos10+20, independente de qty posterior100+200, VGL12/7milhões preservado, quatro chamadas de coleta e zero erro de página. Evidência ignorada verify-vgl-average.cjs. Nenhuma API autenticada ou alteração no coletor/AELO/Dashboard.
- **Etapas/Pendências:** implementação local; integração upstream continua adiada conforme escolha do usuário. Base969e8501; commit desta entrada. Sem merge/push/Monday. Padrões de seleção/descrições/tabela existentes reutilizados, sem novo carregamento.
- **Monday:** —

### 10/11/2026 — Relatório API Excel: quantidade lançada fixa no VGL — Edgar / Codex

- **Regra confirmada:** quantidade lançada por tipologia = qty onde period = release_date exato; soma teoricamente igual a total_units. VGL passa a usar essa quantidade fixa em ambos modos de preço/níveis/layouts/visões, sem usar qty posterior. Mantém preço de lançamento ou atual conforme combobox. Sem correspondência/qty, valor vazio inclusive em preço atual; total por empreendimento não publica soma parcial. Tipologia criada depois sem registro de lançamento não recebe fallback ou retroação. Cadastro total_units não é corrigido/rateado nem tratado como automaticamente errado em divergência.
- **Escopo:** fórmula/tooltip/descrição VGL e testes; preservados Unidades por Tipologia cadastral, MCMV, demais VGVs, coletor, AELO e Dashboard. Valores seguem processamento somente em Gerar relatório após coleta completa.
- **Validação:**89 testes em sete arquivos aprovados: qty posterior diferente, preço independente, data exata/fora do filtro, qty ausente/zero, tipologia posterior, total_units divergente e Excel reaberto. Tipos/lint/build aprovados. Navegador1440/390 claro/escuro com API simulada: lançamento10+20 versus qty posterior100+200; VGL atual12milhões e lançamento7milhões, estoque10,4milhões preservado, tooltip e quatro chamadas sem erro de página. Evidência local ignorada verify-launch-qty.cjs. API autenticada não consultada.
- **Etapas/Pendências:** correção local; usuário escolheu não integrar upstream agora. Referências no fetch: origin alinhado ao snapshot antigo (14 commits locais à frente); upstream divergiu14 remotos/2 locais antes desta entrega. Nenhum merge/push. Base3e36477b; commit desta entrada. Publicação/aceite real pendentes.
- **Monday:** —

### 10/11/2026 — Relatório API Excel: VGL e preço independente — Edgar / Codex

- **Mudança exclusiva:** VGV Lançado renomeado VGL em seleção, tabela, série, totais e Excel. Novo Select Brain Cálculo VGL com tooltip dinâmico: Pelo preço de lançamento / Pelo preço atual (padrão). Preço de lançamento usa mesmo registro da coluna existente: price onde period = release_date exato, inclusive antes do filtro inicial; ausência fica vazia sem fallback. Preço atual usa último fechamento até o mês final. Ambos multiplicam qty do período, sem acumular oferta mensal no trimestre. Por empreendimento soma as tipologias. Cálculo monetário dos demais VGVs independente; MCMV/AELO/Dashboard intactos.
- **Escala/fluxo:** helper monetário inclui VGL na escala e formato de duas casas em prévia/gráfico/XLSX. Troca do combobox só invalida a geração/download, sem cálculo automático ou nova API. Descrições corrigidas para não vincular VGL ao preço do período; cálculo histórico continua oferta total, não fluxo de lançamentos.
- **Validação:**86 testes em sete arquivos aprovados, cobrindo preços atuais/lançamento, ausência/data exata/fora do filtro, independência dos VGVs, ambos níveis/visões/layouts, seleção/escala/XLSX reaberto. Navegador1440/390 claro/escuro com API simulada: VGL atual12milhões, modo lançamento vazio por ausência de data exata, estoque inalterado10,4milhões, download invalidado/regerado, tooltip e quatro chamadas sem erro de página. Evidência local ignorada verify-vgl.cjs. Tipos/lint/build aprovados. Sem API autenticada ou validação de produção.
- **Etapas/Pendências:** implementação local, publicação/aceite pendentes. Base408711c; commit desta entrada. Sem push/Monday. Identidade Brain reutilizada via Select/ReportFieldLabel; não altera carregamento.
- **Monday:** —

### 10/11/2026 — Relatório API Excel: VGV Lançado por empreendimento — Edgar / Codex

- **Correção exclusiva:** VGV Lançado estava fora de BUILDING_TOTALS e não aparecia no nível Por empreendimento. Incluído na seleção e soma por empreendimento/período, nos dois layouts. Preserva qty/preço de cada tipologia e modo monetário; trimestre usa último fechamento, sem somar oferta mensal. Ausências e escala mantêm regras existentes. Sem mudança no nível Por tipologia, coletor, MCMV, AELO ou Dashboard.
- **Validação:** testes de disponibilidade na interface, valores mensais25000/40000 nos modos período/atual, trimestre40000 sem somar meses e leitura de retorno XLSX com escala25/40. Tipos/lint e regressões da feature no fechamento. Sem consulta autenticada ou nova conferência visual de produção.
- **Etapas/Pendências:** correção local, publicação aguarda autorização. Base atualizada por fast-forward d9b2448→fbe9742 (12 commits de Fortaleza/Panorama); entradas recebidas conferidas. Arquivo de auditoria local preservado. Sem push/Monday.
- **Monday:** —
### 2026-11-10 — Fortaleza: integração autorizada do fechamento mensal — usuário / Codex

- **Ambiente/funcionalidade:** Rebrain / Fortaleza mensal1–60e diagnóstico JSON. Usuário autorizou integrar/publicar; merge b6c6488 preserva0ec2dcbe nove commits remotos atée7a00db, sem conflito/rebase/reset/force. Fortaleza permaneceu idêntico ao commit local.
- **Remoto preservado:** mapa/CSV, armazenamento de autenticação de preview e configurações/dependências Lovable. Nenhuma nova regra de mercado introduzida pela integração. Comportamento CSV remoto do Corretor registrado no seu live conforme protocolo, com autoria original preservada.
- **Validação:**214testes Fortaleza/18arquivos aprovados na integração. Build e tipagem integrados aprovados; avisos anteriores de Browserslist/chunks preservados. Validações visuais/JSON do lote anterior não foram apresentadas como novo ensaio autenticado; sem API real/homologação/deploy observado/Monday.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`.
- **Impacto em Etapas/Pendências:** envio autorizado do mensal60e JSON; aguardar teste real/diagnóstico do usuário. Exportação/homologação continuam pendentes; próxima frente indicada é SP estética/diagnóstico.


### 2026-11-10 — Fortaleza mensal60slides e diagnóstico JSON — usuário / Codex

- **Ambiente/funcionalidade:** Rebrain / Fortaleza mensal, cinco posições finais56–60; não há mensal61. Basefbe9742atualizada porFF limpo após fetch, com dois commits do time lidos e preservados.
- **Entrega:** [contrato e evidências](../features/relatorios-institucionais/fortaleza/MENSAL_SLIDES_56_60_DIAGNOSTICO_2026-11-10.md). Equipes57/58editáveis, quadro59substituível, arte original e competência variável. Pedido posterior atendido: JSON preparado automaticamente ao concluir, com download,60situações/valores/fontes; sem token, fotos ou históricos brutos. Worker cancelável, sem API extra.
- **Validação:**214testes Fortaleza +31contratos/regressões selecionados, tipos/build/lint e Edge1440/390claro/escuro com fontes sintéticas e download JSON conferidos no fechamento. Não equivale a homologação, estudo real, exportador ou deploy observado; sem Monday.
- **Commits:** fatia isolada `feat(relatorios): finish Fortaleza monthly preview and diagnostic`, basefbe9742; permanece local até autorização própria de push.
- **Fechamento Git:** fetch encontrou9remotos novos atée7a00db(mapa/segurança/auth), sem diff de Fortaleza. Não integrados com árvore suja; testes/build desta fatia na basefbe9742. Pedir autorização para integrar antes do envio.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`.
- **Impacto em Etapas/Pendências:** mensal1–60implementado como prévia; receber JSON real e revisar fontes/estética/metodologia/exportação. Trimestral89mantém dez iniciais. Usuário indicou depois refinamentos estéticos/diagnóstico SP; SP e motores paralelos não alterados nesta fatia.


### 10/11/2026 — Panorama: somente consolidado e ressalvas acessíveis — Gabriel / Codex

- **Mudança:** seleção com2+cidades permite Somente consolidado, semnomesougruposobrigatórios; opções2/3grupos preservadas. O manifesto compartilhado omite comparativosmunicipais/territoriais, incluindo antigosSecovi eFIERGS31, mantendo todascidades e análisesconsolidadas. Cidadeúnica continua direta. Novidadesnãoalteramcálculos ouguardas.
- **Alertas:** “Médias gerais de preço e área” explicita pendência defórmula/filtros/competência naorigem; classificaçãohorizontal segue noavisoexistente comestoqueexcluído. Semvaloresfixos, imputação oualegação deatualização dafonte.
- **Fonte:** [plano territorial](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md), seção10/11; paridadenumérica nareferênciaexistente.48testesfocados,tipos/lint aprovados;4percursosvisuaisdesktop/mobileclaro/escuro semerro/overflow. SemAPIreal,artefatos `.local-inputs/panorama-consolidado-2026-11-10/`.
- **Estado:** validado localmente, para disponibilizar no teste solicitado; publicaçãoLovable e aceiteexternopendentes. E-mail curto preparado no chat, não enviado.
### 2026-11-10 — Fortaleza: integração autorizada para publicar46–55 — usuário / Codex

- **Ambiente/funcionalidade:** Rebrain / Fortaleza mensal. Usuário autorizou o push e, após aviso de divergência, autorizou integrar os dois trabalhos. Remoto a1db2ba com quatro commits novos de Panorama; local73b14dc. Merge c0441be sem conflitos, sem rebase/reset/force.
- **Preservação:** Fortaleza idêntico a73b14dc. Entradas LIVE dos dois lados preservadas pela identidade de três pontos, excluindo linhas vazias da comparação. Entradas novas de Gabriel sobre paridade de plantas/fluxos/preços FIERGS foram lidas; limites/pendências e autoria preservados.
- **Validação:**228testes/20arquivos aprovados (Fortaleza e contratos/regressões selecionados Panorama). Tipagem e build integrados aprovados; avisos anteriores de Browserslist/chunks preservados. Sem novo ensaio de API real/homologação/deploy observado ou escrita no Monday.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`.
- **Impacto em Etapas/Pendências:**46–55e recortes automáticos prontos para envio autorizado. Próximo56–60, revisão/exportação e homologação de fontes/metodologia continuam pendentes.


### 2026-11-10 — Fortaleza mensal46–55, IVV e tabelas — usuário / Codex

- **Ambiente/funcionalidade:** Rebrain / relatório Fortaleza mensal, prévia1–55na ordem dos60originais, carregamento local preservado.
- **Entrega:** [contratos e evidências](../features/relatorios-institucionais/fortaleza/MENSAL_SLIDES_46_55_2026-11-10.md). IVV agregado da RM; oferta por município/tipo, capacidade histórica de ativos e quatro páginas de bairros, com totais integrais e insights. Reutiliza fontes sem novas consultas ao navegar, sem alterar SP/Secovi/FIERGS.
- **Refinamento pedido na mesma sessão:** geografia fixa por slide, sem seletores UF/cidade/território; mantidos catálogo/autoriza??o das cinco cidades e guardas. Referências original mensal/trimestral em página local no Desktop. Relato remoto22/25ainda sem nova evidência de fonte, sem declarar homologação.
- **Validação:**198testes Fortaleza +16regressões selecionadas, build/tipos/lint e Edge1440/390claro/escuro sintético; Office em leitura. Sem API real/homologação/exportador/deploy observado/Monday.
- **Commits:**84568dfenviado com autorização nesta sessão; nova fatia isolada `feat(relatorios): add Fortaleza monthly slides 46 through 55`, base84568df, local até autorização própria.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`.
- **Impacto em Etapas/Pendências:** próximo56–60; validar universo ativo/capacidade, bairro cadastral, fonte granular versus municipal e metodologias antes da homologação; amostra/empresas e exportação continuam pendentes.


### 10/11/2026 — Panorama FIERGS: paridade por planta implementada — Gabriel / Codex

- **Entrega:** oferta ativa no fechamento separada dos lançamentos históricos; vendas trimestrais sem duplicar reservas Futuro; estoques/áreas por planta; preços Padrão por contribuições de quantidade, valor e área. Tabelas, série, faixas, coortes/produtos e mapas usam a base correspondente. Campo `work` explícito recupera produtos sem exceções por ID. Metodologia, avisos, CSV e cache atualizados. PPT híbrido mantido; faixa do título ancorada ao DOM.
- **Resultado:** São Leopoldo3T2026:2.923ofertaativa/891estoque/370vendas, anterior781, lançamentos480, IVV29,3418%. Onze controles offline2T2026/4T2025 e Canela+Gramado3T2026 com zero diferenças críticas e de estoque/fluxo.478testes aprovados/2opcionais preexistentes ignorados,14novos decontrato; tipos/lint/build verificados. Extrato13páginasPDF/PPT conferido, Office sem objetosfora e edição real de cabeçalho salva/reaberta em cópia, original intacto.
- **Fonte única:** [execução e ressalvas](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md#10112026--implementação-da-paridade-e-verificação-para-publicação); matriz JSON e brutos ignorados vinculados nela. Nenhuma coleta nova durante a implementação; respostas SãoLeopoldo jácongeladas reutilizadas.
- **Estado e pendências:** validado offline, push autorizado; publicação/ensaio no Lovable e aceite externo pendentes. Total de preço/área dos prints e classificação de dois horizontais(121estoques) ainda precisam de contrato da origem; não anunciar paridade integral. Demais preços seguem a API atual, que difere de algumas capturas. E-mail não enviado. Merge autorizado preservou SP/Fortaleza e alterações paralelas.


### 10/11/2026 — Panorama: São Leopoldo, paridade com Geobrain mapeada — Gabriel / Codex

- **Diagnóstico:** OfertaLançada4591versus2923 integralmente explicada por janela e statusAtivo histórico porplanta; vendas168versus370 explicadas por último mês versus fluxo trimestral. Plantas preservadas reproduzem todas as faixas e781/891/480/370 doGeobrain. Preços atuais porgrupo reproduzidos por contratos diferentes dos agregadores doPanorama. Horizontal perde126unidades por rejeições deproduto, incluindo5comrótulo explícito emwork ignorado.
- **Fonte:** [mapeamento e lacunas](../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_CONTRATOS_HISTORICO_FIERGS_2026-10-27.md#10112026--são-leopoldo-reabertura-da-paridade-com-o-geobrain), com matriz versionada e insumos `.local-inputs/fiergs-sao-leopoldo-2026-11-10/`. Oito consultas delimitadas,81asserçõesoffline aprovadas, semestudo completo.
- **Estado:** diagnóstico local; nenhuma mudança de runtime ou publicação. Total do preço/área e classificações horizontais semcampo autoritativo permanecem pendentes de contrato/snapshot daorigem. Não antecipar correção/aceite. Gabriel determinou aguardar resolução antes de responderoemail. Fetch:9remotosSP/Fortaleza,0locais antesdesteregistro, códigoPanorama semdiferença; árvoreparalela não integrada.
### 2026-11-10 — Fortaleza mensal36–45, preços e IVV — usuário / Codex

- **Ambiente/funcionalidade:** Rebrain / relatório Fortaleza mensal; prévia1–45emordem dos60originais, carregamento local preservado.
- **Entrega:** [contratos e evidências](../features/relatorios-institucionais/fortaleza/MENSAL_SLIDES_36_45_2026-11-10.md). Preços v2 tipologia/mês, produtos horizontais separados, média regional ponderada, exclusões40e IVV25meses com abertura observada. Critérios candidatos explícitos nos insights; sem API real/homologação.
- **Validação:**170testes Fortaleza +16regressões, build/tipos/lint e Edge1440/390claro/escuro sintético, estados e menu preservados. SP/Secovi/FIERGS sem mudança de regra; sem Monday/deploy observado/exportador.
- **Commits:**9fa553eenviado com autorização; novo commit isolado `feat(relatorios): add Fortaleza monthly slides 36 through 45`, base9fa553e, local até autorização própria.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`.
- **Impacto em Etapas/Pendências:** próximo46–55e56–60; validar pesos/área dos lotes/IVV, fontes reais e metodologias anteriores antes de homologação.


### 2026-11-10 — Fortaleza mensal:26–35, VGV e oferta final — usuário / Codex

- **Ambiente/funcionalidade:** Rebrain — `/rebrain/relatorios-institucionais/fortaleza`, rota oculta.
- **O quê:** prévia1–35na ordem dos60slides mensais originais. RM móvel, VGV vendido por recorte/padrão, lotes, divisórias e oferta final em25fotografias. Oferta nunca é somada no ano; comparações com mesmo mês de1/2anos. VGV preserva sinal e INCC-DI/base provisórios explícitos nos insights.
- **Contrato/arquivos:** [lote26–35](../features/relatorios-institucionais/fortaleza/MENSAL_SLIDES_26_35_2026-11-10.md); módulo/arte Fortaleza, diagnósticos e docs. Coleta compartilhada adiciona stock apenas V/H,40fontes, concorrência2, cache/abort mantidos; navegar não consulta. Sem alterações de SP/Secovi/FIERGS ou componente global.
- **Validação:**148testes Fortaleza +16regressões selecionadas2T2026/4T2025, tipos/build/lint; Edge1440/390claro/escuro,25renders11–35, estados lento/vazio/incompleto/cancelado e cartão de carregamento/menu preservados. Office original em leitura, dez renders novos inspecionados. Sem API real/homologação/deploy observado/Monday.
- **Commits:** commit isolado `feat(relatorios): add Fortaleza monthly slides 26 through 35`, base3a846f0; local até autorização própria de push.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`.
- **Impacto em Etapas/Pendências:** novo lote validado localmente; próximo36–45, depois46–60/exportação. Amostra, metodologia/INCC e fontes reais permanecem sujeitos à homologação.

### 2026-11-10 — Fortaleza: carregamento local, menu acessível — usuário / Codex

- **Ambiente/funcionalidade:** Rebrain — `/rebrain/relatorios-institucionais/fortaleza`.
- **O quê/por quê:** após envio autorizado de d9b2448, usuário pediu espera sem cobrir o sistema inteiro. Catálogo, preparação e consulta agora usam BrainLoadingState absoluto dentro de cartão relativo da página, com rolagem local; configuração/menu ficam fora do véu. Etapas, cronômetro e cancelar preservados.
- **Padrão/arquivos:** padrão local já usado no SP; somente página Fortaleza e diagnóstico mensal alterados, sem novo primitive nem mudança no BrainLoadingState compartilhado ou em fontes/fórmulas.
- **Validação:** build/tipos/lint; Edge com fontes sintéticas lentas1440/390claro/escuro, contenção geométrica e menu acessível por hit-test. Sucesso/vazio/incompleto/cancelamento e navegação11–25mantidos. [Evidências](../features/relatorios-institucionais/fortaleza/EVIDENCIAS.md). Sem API real/deploy observado/Monday.
- **Commits:** commit isolado `fix(relatorios): contain Fortaleza loading within report`, base d9b2448; local até autorização própria de envio.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`.
- **Impacto em Etapas/Pendências:** ajuste de carregamento validado localmente; próximo lote26–35e homologação mantidos.

### 2026-11-10 — Fortaleza:12/14 e lote mensal16–25 — usuário / Codex

- **Ambiente/funcionalidade:** Rebrain — `/rebrain/relatorios-institucionais/fortaleza`, somente rota.
- **O quê:** push autorizado anterior1e1767econcluído; nova implementação fecha12/14eacrescenta16–25sem saltos: VGL, loteamentos, divisórias, vendas e13pontos móveis de12meses. Coleta compartilhada por segmento/cidade/fonte, concorrência2, cache/retry/abort por sessão.13/15reutilizam a mesma fonte vertical; navegar não consulta.
- **Contrato/limites:** [mensal12–25](../features/relatorios-institucionais/fortaleza/MENSAL_SLIDES_12_25_2026-11-10.md). Casas versus lotes/comercial explícitos; desconhecido/incompleto não vira zero. INCC-DI/base selecionada provisórios e identificados nos insights; validar VGL nominal e metodologia com fonte real. Sem afirmar aceite ou relatório completo.
- **Validação/padrões:**127testes Fortaleza +16regressões selecionadas Secovi/FIERGS, build/tipos/lint, Edge1440/390claro/escuro/estados lento/vazio/incompleto/cancelado, ordem11–25. Arte original Office em leitura, SVG dinâmico, GeoApiScopeEngine/BrainLoadingState/shadcn. Sem GeoBrain real, novo exportador, deploy observado ou Monday.
- **Arquivos/commits:** módulo Fortaleza, artes sanitizadas11–25, diagnósticos e documentos; commit isolado `feat(relatorios): complete Fortaleza monthly slides 12 through 25`, base1e1767e. Nova fatia local até autorização própria de envio; sem mudanças SP ou política compartilhada.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`.
- **Impacto em Etapas/Pendências:** prévia mensal1–25implementada condicional às fontes; próximo lote26–35. Fontes reais/INCC/homologação, amostra institucional e exportação seguem pendentes.

### 2026-11-10 — Fortaleza: prioridade mensal e lançamentos verticais — Lucas / Codex

- **Ambiente/funcionalidade:** Rebrain — `/rebrain/relatorios-institucionais/fortaleza`, somente rota, sem menu/painel.
- **O quê:** mensal como padrão, competência inicial pelo calendário;11/13/15 com25meses e comparativos mês/ano/acumulado, fontes automáticas na mesma geração e insights de cálculo/proveniência.13composições mensais, sem renumerar nem preencher12/14com universo vertical incompleto.
- **Contrato/evidência:** [mensal Fortaleza](../features/relatorios-institucionais/fortaleza/MENSAL_LANCAMENTOS_2026-11-10.md). Cadastro por ID no11; releases_in_period municipal nos13/15; sete padrões explícitos/mês/cidade, falta não vira zero. Histórico limitado, cancelamento e retry por sessão/janela. Arte original sem cifras antigas; fonte mensal recuperada/Office leitura. Sem API real ou aceite.
- **Validação:**105casos distintos Fortaleza/Secovi/FIERGS aprovados após rechecagem de asserção de mensagem duplicada; tipos/build/lint, Edge1440/390claro/escuro lento/vazio/incompleto/cancelamento. Padrões BrainLoadingState/GeoApiScopeEngine e primitives existentes. SP/motores compartilhados intactos.
- **Arquivos/commits:** módulo Fortaleza, scripts diagnósticos e documentos; commit isolado `feat(relatorios): extend Fortaleza monthly launch analysis`, base03d3301. Local até autorização própria de push.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`; somente referência.
- **Impacto em Etapas/Pendências:** mensal em andamento; próximos12/14/segmentos e16–60, INCC/preços/IVV/exportação, ensaio autenticado/homologação. Base anterior publicada em03d3301; nenhuma publicação desta fatia.
- **Ordem oficial:** reforço posterior do Lucas aplicado à navegação1–15sem saltos.12/14mantêm posições/arte com fonte em preparação. Prioridade de conclusão dessas lacunas antes de avançar ao próximo bloco.

### 2026-11-10 — integração autorizada de SP, Panorama e Fortaleza — usuário / Codex

- **Pedido/estado:** usuário autorizou push/sincronização e confirmou a resolução da divergência. Checkout encontrado com merge já iniciado: local `1d601d0`, entrada `6ffb91d` (31 commits remotos), conflito somente no STATUS do handoff. Nenhum histórico publicado reescrito.
- **Preservação:** STATUS resolvido somando as novas entradas dos dois lados, com novembro09 antes de novembro05. STATUS e LIVE comprovados por contagem de linhas não vazias conforme base+(local−base)+(remoto−base), antes desta nova entrada. Código SP idêntico ao commit local; App/BrainLoadingState/Panorama/Fortaleza idênticos ao remoto. Documentos/escopos paralelos mantidos.
- **Escopo:** publicação conjunta da personalização da equipe SP e do trabalho remoto já existente, sem nova regra de negócio, consulta autenticada ou homologação. Fortaleza continua somente por rota; não foi acrescentado ao menu. Validações da base integrada registradas no fechamento do handoff.
- **Validação integrada:** build/tipos aprovados;833casos/100arquivos,829aprovados/2falhas/2ignorados na rodada conjunta. Um timeout SP passou na repetição isolada7/7 sem alterar limite. Falha funcional remanescente de Panorama/firewall-fontes já documentada no remoto; código idêntico, preservado sem ajuste alheio. Suíte não declarada integralmente verde; sem novo ensaio autenticado/deploy.
- **Etapas/Pendências:** concluir merge, pull com fast-forward e push autorizados. Deploy observado e testes reais da equipe continuam distintos da sincronização Git. Sem escrita no Monday.
- **Monday:** [Relatório SP Institucional](https://brain381753.monday.com/boards/18398428946/pulses/13452140276) — `13452140276`; referência.

### 2026-11-05 — SP: personalização de equipe técnica e consultoria — usuário / Codex

- **Entrega:** editor local para nomes, cargos, fotos, visibilidade e restauração das cinco posições do82 e quinze do83. Prévia e PPTX usam a mesma configuração; fotos ficam em memória, sem servidor/localStorage. Nova geração restaura a referência, conforme texto da interface.
- **Exportação:** vinte retratos passam a imagens PowerPoint separadas da arte e textos a caixas nativas. Recorte normaliza inset físico/lógico; diagnóstico verifica pixels, não só quantidade de imagens. Guarda contra resposta tardia de upload e formulário montado somente quando aberto. GeoApiScopeEngine e cálculos intactos.
- **Validação:**301testesSP/34arquivos, tipos/build/lint e Edge desktop/celular claro/escuro com fontes sintéticas. Office reconheceu20retratos; dois nomes e uma foto alterados, salvos/reabertos e renderizados com sucesso. [Uso, escopo e limites](../features/relatorios-institucionais/sp/PERSONALIZACAO_EQUIPE_2026-11-05.md).
- **Etapas/Pendências:** implementação local pronta para publicação; conferência no site e homologação pertencem à equipe. Menu `219ed1c` foi enviado primeiro por pedido explícito, independentemente desta entrega posterior. Sem consulta autenticada nova ou escrita no Monday.
- **Monday:** [Relatório SP Institucional](https://brain381753.monday.com/boards/18398428946/pulses/13452140276) — `13452140276`.

### 09/11/2026 — Fortaleza: envio da base e dez slides iniciais — Lucas / Codex

- **Ambiente/funcionalidade:** Rebrain — `/rebrain/relatorios-institucionais/fortaleza`, acesso somente por rota.
- **Pedido/entrega:** Lucas autorizou o push de `c78a7c1`/`574087e`/`5439ffe`, concluído e confirmado 0/0 após fetch; deploy não observado. Depois pediu os dez primeiros slides seguindo o original. Prévia mensal/trimestral com navegação/ampliação, arte nativa, posições/tabelas medidas e fontes locais; integração na sequência automática existente. Novo lote local sobre `5439ffe`.
- **Dados/limites:** cadastro por município/segmento, paginação/IDs/cobertura conferidos, listas acumuladas e contagem de empreendimentos com classificação explícita. Fotografia atual não prova histórico; amostra/empresas pesquisadas aguardam fonte própria. Falhas não produzem parcial e valores antigos não preenchem novo estudo. [Contrato e retomada](../features/relatorios-institucionais/fortaleza/SLIDES_01_10_2026-11-09.md).
- **Validação:**63testes Fortaleza, tipos/lint/build, Edge1440/390 claro/escuro e vinte controles contra Office. Arte preservada e nenhum corte nos controles; diferenças dinâmicas ainda impedem afirmar 100% visual. BrainLoadingState/GeoApiScopeEngine/Button/Tabs/Dialog reutilizados, sem novo primitive global. Sem API real, estudo/exportação real ou Monday; motores SP/Panorama e frentes paralelas sem edição.
- **Arquivos/commits:** componentes/fontes/arte/layout e contrato de dados em Fortaleza; diagnósticos e documentação. Commit isolado `feat(relatorios): add first ten Fortaleza slides`, hash no fechamento. Próximo: refinamento visual e fonte de amostra/data/fases/cobertura, ensaio autenticado delimitado e exportador posterior.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`; somente referência.

### 09/11/2026 — Fortaleza: núcleo vertical, referência de período e prévia por etapas — Lucas / Codex

- **Ambiente/funcionalidade:** Rebrain — `/rebrain/relatorios-institucionais/fortaleza`, sem item em painel/menu/busca.
- **Pedido/entrega:** Lucas autorizou integrar fontes e pediu sequência automática inspirada no SP, com Mensal/Trimestral e mês/trimestre/ano de referência. Uma ação valida recorte, consulta fontes municipais, confere balanços e organiza a prévia; BrainLoadingState com etapa/tempo real/cancelamento e estados de conferência. Alternância preserva ano/período de fechamento e invalida dados anteriores.
- **Dados:** launches/releases_in_period, sales/liquid_sales e stock por cidade/padrão/mês, apenas vertical; amostra confirma recorte, paginação/janelas limitadas, retries transitórios e recuperação só das cidades faltantes. Sem meses/cidades/grupos completos não há consolidado. Estoque final não é soma trimestral; negativos, ausentes e diferenças compensadas permanecem visíveis. [Contrato e limites](../features/relatorios-institucionais/fortaleza/NUCLEO_VERTICAL_2026-11-09.md).
- **Padrões/arquivos:** API/modelo/hook/painéis/testes específicos Fortaleza, seletores/tokens/GeoApiScopeEngine existentes, requestWithRetry/collectByCity Panorama reutilizados sem alteração. Matriz/PLAN/DECISOES/EVIDENCIAS e STATUS atualizados. Fonte do núcleo é municipal; método granular e indicadores restantes continuam pendentes. Manifesto60/89 não equivale a todos os slides gerados.
- **Validação/limites:**49testes Fortaleza aprovados; regressão ampla807aprovados/1falha existente firewall-fontes Panorama/2ignorados, mais2casos de etapas no foco final49. SP/Panorama sem alterações; falha alheia não foi corrigida nesta frente. Build/tipos/lint e Edge1440/390claro/escuro com transporte sintético; ensaio autenticado com token pessoal ainda pendente. Sem coleta/API real, exportação/estudo real, homologação, push/deploy ou escrita Monday. [Evidências](../features/relatorios-institucionais/fortaleza/EVIDENCIAS.md).
- **Commits/etapas:** base574087e, dois commits locais anteriores preservados; commit isolado `feat(relatorios): integrate Fortaleza vertical preview pipeline`, hash no fechamento. Núcleo implementado localmente; próximo é ensaio autenticado delimitado e reconciliação granular, antes de ampliar segmentos/preços/histórico/exportação.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`; somente referência.

### 09/11/2026 — Fortaleza/SINDUSCON: base navegável apenas por rota — Lucas / Codex

- **Ambiente/funcionalidade:** Rebrain — `/rebrain/relatorios-institucionais/fortaleza`, base estrutural em implementação.
- **O quê:** Lucas autorizou conferir originais e preparar base usando FIERGS/SP como referências, sem item no painel. Dois PPTX/hashes/89 e60slides reais/49 e47gráficos conferidos; Office renderizou12amostras, seis inspecionadas. [Revisão dos materiais](../features/relatorios-institucionais/fortaleza/REVISAO_REFERENCIAS_2026-11-09.md).
- **Runtime:** rota lazy, configuração autorizada de município/conjunto completo e mês/trimestre, composição local das posições do estudo, abas de estrutura/referência/metodologia. Sem dados fictícios ou exportação; contratos de fonte permanecem pendentes. GeoApiScopeEngine/BrainLoadingState/Select/Tabs/Alert existentes; mobile usa padrão compacto já existente. Home/menu/busca sem item novo, motores SP/FIERGS e demais domínios intactos.
- **Arquivos/commit:** `src/features/relatorios-institucionais/fortaleza/`, registro em `App.tsx`, condição mobile em `AppLayout.tsx`, diagnóstico visual, docs Fortaleza/STATUS e este LIVE. Commit isolado `feat(relatorios): prepare Fortaleza route-only foundation`, hash reportado no fechamento; publicação recusada por Lucas nesta rodada.
- **Validação:** 11testes Fortaleza aprovados; total conjunto771aprovados/1falha/2ignorados (296SP,463Panorama,1scope,11Fortaleza). Falha isolada no teste existente firewall-fontes/loteamento; código/fixtures Panorama sem mudança. Tipos/lint/build aprovados, AppLayout focado aprovado, sete grupos de cenários Edge1440/390 claro/escuro/catálogo lento/erro/vazio/sucesso com rede externa interceptada e zero chamadas de mercado. [Evidências/limites](../features/relatorios-institucionais/fortaleza/EVIDENCIAS.md).
- **Impacto em Etapas/Pendências:** base de navegação/manifesto pronta localmente; contratos mensais, classificação/preços/INCC/MCMV, cálculo, desenho final e exportação ainda pendentes. Sem coleta, geração real, push/deploy ou homologação. Brutos/capturas ignorados, dependências alinhadas sem alterar package/lock.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`; somente referência, nenhuma escrita.

### 09/11/2026 — Fortaleza/SINDUSCON: início do mapa de fontes e indicadores — Lucas / Codex

- **Ambiente/funcionalidade:** Rebrain — relatórios institucionais, Fortaleza/SINDUSCON-CE (`PLANEJADA`, sem runtime novo).
- **O quê/por quê:** após Lucas informar conclusão do SP e autorizar próximo levantamento, consultados os dois modelos Fortaleza no Drive. Junho/2T2026 principal proposto e julho mensal complementar, 22 contratos iniciais e 89/60 blocos textuais inventariados, sem assumir número real de slides. [Plano e portões](../features/relatorios-institucionais/fortaleza/PLAN.md).
- **Decisões/lacunas:** separar capital/RM e universos por bloco, mês/trimestre/12 meses, preços por unidade e exclusões explícitas; preservar negativos. MCMV por data/recorte, INCC/ponderação, totais aparentes e revisões entre fotografias precisam de prova. G2 candidato vertical capital junho/2026 depende de contrato e confirmação; sem copiar política SP/FIERGS.
- **Arquivos/commits:** `docs/features/relatorios-institucionais/fortaleza/{PLAN.md,DECISOES.md,EVIDENCIAS.md,MATRIZ_INDICADORES.csv,MAPA_BLOCOS.md}`, STATUS do handoff e este LIVE. Commit isolado `docs(relatorios): map Fortaleza sources and initial contracts`, hash no fechamento.
- **Validação/limites:** leitura conector comprovada, fonte PPTX/parent e datas identificados; bruto/hash/visual/caches e API granular ainda pendentes. Preflight offline, validação estrutural de matriz/links e documentação no fechamento. Sem geração/API GeoBrain/publicação/Monday, sem mudar SP/Secovi/FIERGS ou demais domínios. Três commits locais anteriores preservados.
- **Monday:** [Fortaleza — SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`; somente referência.
- **Impacto em Etapas/Pendências:** G1 iniciado com documentação própria; falta prova visual/mensal/metodológica para encerrar contrato e delimitar G2. Declaração de SP concluído vem de Lucas, sem nova homologação pelo agente.

### 06/11/2026 — Panorama: auditoria real individualiza ausência de VGV em Taquari

- Diagnóstico da sessão de Gabriel: CSV das cinco cidades sem `different`, mas com cobertura indisponível. VGV vertical de Taquari3T2026 ausente; consulta posterior à API confirma última linha vertical emjunho, com setembro horizontal presente. Sem preencher zero ou mudar runtime.
- Fonte técnica e limites: [I6 — auditoria e lacuna de VGV](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md). Brutos/hashes `.local-inputs/panorama-territorial-2026-11-05/taquari-vgv-2026-11-06/`. Probe reutilizado excedeu escopo autorizado (quatro consultasTaquari emvezdeuma), comunicado; semoutrascidades/estudos.
- Estado: diagnóstico local, I6 parcial; contrato da ausência monetária na origem e aceite externo pendentes. Acabamento37cf69d local; sem publicação.


### 06/11/2026 — Panorama: revisão da segunda saída real e cartões sem ícone

PPT real `(1)` deGabriel:104slides Office/read-only,0formasfora, todaspáginas conferidas. Vale8+Lajeado20=28vendasfechamento eVale69+Lajeado741=810em12meses; tracejados, VENDIDOinteiro, omissãovazia e0sem100%confirmados. Falta pontoVGVVale3T2026 naspáginas37/39: pendenteCSVdamesmageração, semextrapolar/numerosmanuais. Fonte ehash no [plano territorial](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md), I6nova saída. Removidoíconedos6pontos emcartões, instruçãoexplícita/arraste/cliquepreservados,5testesaprovados; separadortextualVGVcorrigido. Código local,semAPI/push/aceiteexterno; paralelos preservados.


### 06/11/2026 — Panorama: envio autorizado das correções I6 e seleção

`0e95c5d`/`dfe2fa4`/`36d0fc3` enviados aorigin/main por autorização explícita, SHA36d0fc34b417cf01e9a73c96b1869413fa747157 confirmado,0/0. Semmerge, ediçõesparalelas preservadas. Gate documentalaprovado; origem dasmudanças e testes na entrada anterior e no [plano territorial](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md). Publicado noGit não é conferênciaLovable: próximoGabrielpublicar, testarlista/drag eregerar5cidadescomCSV/PPT paraI6. Semnovoaceiteexterno.


### 06/11/2026 — Panorama: arrastar cidades e selecionar lista colada

Gabriel autorizouenvio dascorreçõesanteriores epediu facilidadesnesta rodada. Modal comcartões arrastáveis2/3grupos, nomecompostoobrigatório ealternativatoque/clique/teclado; preservapartição/cancelamentosemcoleta. Buscacomlista(vírgula/e/linhas), matchingexato sócatálogoUF, avisodeausentes euniãocomseleçãoanterior.23testes/tipos/lint/buildaprovados,5cenáriosbrowserclaro/escuro390–1440pxcomdragreal/5–15cidades,semoverflow/erro. Fontetécnica/evidência no [plano territorial](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md), seleçãosimplificada06/11. SemAPI/mudançanumérica; aguardapushautorizado/republicação eensaioI6comCSV/PPT. Alteraçõesparalelaspreservadas; semaceiteexterno presumido.


### 06/11/2026 — Panorama: correções dirigidas após PPT real

AutorizaçãoGabriel: cobertura distingue segmento municipal inexistente (cadastroconcluído/nãovazio/semrejeições+semevidênciatemporal), preservandovalores deoutrosmembros; preçoausente dispensadoapenascomestoquezeroobservado. Pontes tracejadas entreobservações, seminterpolar números/cobertura/comparativos; doisavisosdinâmicosnovos. Ajustados folga detítuloPPT (VENDIDO), omissão daoficial19totalmentesematividade epercentualtotalcomdenominadorzero.11replayssemrede/indicadoresconservados,40testes+1opcionalignorado, tipos/lint/buildaprovados, extrato3páginasOffice/Chromiumconferido. Fonte [plano territorial](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md), correçõesI6. Semcoleta/push; aguardapublicação autorizada eregeraçãorealLajeado/Vale comCSV. Nenhumaceiteexternopresumido; paralelospreservados.


### 06/11/2026 — Panorama: revisão do PPT real Lajeado/Vale e espera ao trocar de aba

PPT real deGabriel1T2023–3T2026 aberto/renderizado noOffice105slides, semformasfora, originalpreservado. Estrutura consolidado→territórios egrupos corretos; I6não encerra: Vale ausente em séries apesar deTeutônia8vendas nofechamento, títuloVENDIDO truncado37, vazio21 epercentual100%comtotal0em51. Hipótese de cobertura porsegmento precisa entradas/CSV, nenhuma alteraçãonumérica feita. Fonte/evidência epróximospassos no [plano territorial](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md), seçãoI6da saída real. Corrigida apenas espera deexportação autorizada: visibilidade/fallback/limpeza,12testes/tipos/lint aprovados; semAPIreal/push/aceiteexterno.


### 06/11/2026 — Panorama: completude aplicável ao universo horizontal e cronômetro

CSV de Gabriel semtimeout motivou diagnóstico delimitado autorizado: Bom Retiro do Sul tem um Horizontal/nenhum Vertical, padrão com dados e tipologia HTTP200 vazia. Corrigida exigência da dimensão apenas com cadastro e duas fontes padrão comprovadamente horizontais, sem exceção municipal, síntese de zero ou dispensa de erro HTTP. 50 testes/tipos/lint aprovados; replay offline dos seis retornos com44reconciliações críticas match, sem bloqueio; preços/IVV não validados, sem estudo completo. Cronômetro Panorama sóMM:SS/pulso discreto com movimento reduzido. Fonte/evidências no [plano de recuperação](../features/Relatorios%20Secovi_FIERGS/PLAN_RECUPERACAO_COLETA_MULTICIDADES_PANORAMA_2026-10-06.md). Estado local, publicação e reteste real pendentes; paralelos preservados.


### 06/11/2026 — Panorama: recuperação de falhas mistas e progresso

Retorno de Gabriel no recorte Lajeado/Vale 1T2023–2T2026: timeout misturado com HTTP200 vazio em Bom Retiro do Sul era classificado como vazio e impedia retry automático/manual. Corrigida precedência dos erros agregados sem afrouxar completude. Contagem deduplica operação por cidade, dez operações reais, reserva consolidação/preparo; BrainLoadingState overlay/tempo real. 42 testes offline, tipos/lint e tela lenta desktop/celular aprovados. Ainda não enviado; timeout de origem não diagnosticado pelas capturas. Fonte, evidências e próximo passo no [plano de recuperação](../features/Relatorios%20Secovi_FIERGS/PLAN_RECUPERACAO_COLETA_MULTICIDADES_PANORAMA_2026-10-06.md). Próximo autorizar push/publicar e repetir recorte real; sem API nesta sessão ou alteração paralela.


### 06/11/2026 — Panorama: relatório único enviado e prévia Lajeado/Vale

Push autorizado de `0a8a672` concluído; SHA de origin/main confirmado e 0/0 após envio. Publicação no Lovable ainda não verificada. Prévia local do componente real confirmou Lajeado individual e Vale do Taquari (Bom Retiro do Sul, Estrela, Taquari e Teutônia), sem perda de membros. Navegadores conectados indisponíveis; captura headless não é estudo numérico nem ensaio de produção, sem API. Fonte/artefatos e próximo passo na seção final do [plano territorial](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md). Alterações paralelas preservadas.


### 06/11/2026 — Panorama: relatório único e modal de grupos — Gabriel / Codex

- **Contrato corrigido porGabriel:** o consolidado permanece no livro; cada visão territorial vem logo após seu análogo, na mesma seção. Retirado seletor de modos/editor permanente.1cidade municipal,2/3automáticas;4+abrem modal aoGerar para2/3grupos. Nomes individuais automáticos, nome apenas para conjunto, validação de atribuição completa/única e cancelar semcoleta. Coletores/matemática preservados.
- **Produto:** Dialog/Input/Button existentes e tokens, lista compacta de cidades com seleção1/2/3; reabertura e nomes respeitam grupos confirmados e reaproveitam coleta. Manifesto mantém pais/filhos com vínculo estável, anuais junto da métrica; grupos/membros em subtítulos curtos/página de cidades/metodologia. Capas identificam o consolidado real. Avisos apontam todas as páginas aplicáveis.
- **Validação:**62testes, incluindo conservação dos indicadores e regressões2T2026/4T2025 das projeções; build/tipos/lint. Chromium1440/390claro/escuro4/8/15cidades semoverflow; extrato6páginas da dupla exata1T2023–3T2026 PDF/PPT/CSV, aberto/renderizado noOffice. [Contrato vigente e evidências](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#relatório-único-e-modal-de-grupos--primeira-versão-em06112026).
- **Estado:** primeira versão validada localmente, sempush/APIreal/estudocompleto;88425c4publicado anteriormente não contém esta revisão. Próximo revisãoGabriel e autorização de publicação; aceite externo/email aguardam nova conferência. Arquivos paralelos preservados, sem alteraçãoSP/Sinduscon/Corretor.
- **Monday:** [FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/13149405149) — referência, sem escrita.


### 06/11/2026 — Panorama I5: integração e envio autorizados — Gabriel / Codex

- **Integração:** aprovação explícita deGabriel; merge f9810a0 incorporouSP4aed591/219ed1c sem conflito. Apenas edição paralela doLIVE foi guardada/reaplicada; cinco demais documentos locais mantêm hash e delta doLIVE foi conferido, assim como a união do histórico. Alterações paralelas continuam fora do lote; stash de segurança preservado.
- **Validação:** build pós-merge aprovado27,72s e17testes afetadosSP/Panorama semfalhas. [I5 e evidência](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#i5--integração-e-publicação-com-autorização). Candidata pronta para push já autorizado; confirmação remota guardada na evidência localI5-push.json.
- **Próximo:** Gabriel publica/confere noLovable egera os arquivosI6. Somente após conferirPDF/PPT/CSV preparar resposta aTeresa/Finoti; aceite desta ampliação depende do retorno deles. Produção ainda não verificada; semAPIreal/estudoreal/envio deemail pela sessão.
- **Monday:** [FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/13149405149) — referência, sem escrita.


### 06/11/2026 — Panorama I3–I4: reconciliação e saídas finais — Gabriel / Codex

- **Resultado:** I0–I4concluídos localmente.79testes/0falhas, tipos/lint/build final aprovados.11replays com9blocos canônicos idênticos;11CSVs equivalentes à candidataGit c547ab7, ignorando apenas a data de geração. Baseline recompilada por overlay de blobs, sem alterar árvore. Expectativa antiga de testeGeoBrain corrigida paraGeobrain; IVV preservado.
- **Saídas:** R1exato12páginas, complemento12famílias faltantes, R2sintético8com seis painéis/médias próximas e dois estados anuais1+1;34páginasPDF/PPT renderizadas,0objetosfora noOffice, edição de texto/célula persistida emcópia. Gráficos em imagem ePPT híbrido preservados. [Fonte técnica e hashes](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#checkpoint-de-incorporação--06112026).
- **Estado/pendências:** validado localmente, não publicado; I1em8058949, I2emc32953a. SemAPIreal, estudos completos, merge oupush. I5exige autorização após apresentar divergência; I6gerações humanas/publicação/aceite. Artefatos brutos permanecem na pasta local da frente; árvore paralela preservada.
- **Monday:** [FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/13149405149) — referência, sem escrita.


### 06/11/2026 — Panorama I2: integração da rota e exportação — Gabriel / Codex

- **Validação:**4testes novos da página real, com projeção/paginator/manifesto/avisos reais e coleta simulada: seleção vazia/1/2/3cidades, grupos1+3, carregamentoBrain, erro sem parcial, Secovi e envio do mesmo contexto aoPPT/CSV. Renomear mantém uma única coleta. Nenhum código adicional de integração foi necessário.
- **Evidência/estado:** [I2 no plano](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#i2--validar-a-integração-da-rota-do-manifesto-e-das-saídas), `territorial-route.test.tsx` e JSONlocal. Validado localmente com entradas geográficas simuladas; não é ensaio autenticado no site. Código de acabamentoI1 em8058949. SemAPIreal, merge oupush; I3/I4registram prova final.
- **Monday:** [FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/13149405149) — referência, sem escrita.


### 06/11/2026 — Panorama I0–I1: médias visuais e estados anuais — Gabriel / Codex

- **Mudança:** candidata congelada sem merge; médias ponderadas identificadas por linhas tracejadas, quadros anuais sem comparação retirados com aviso/auditoria, composição de ano único em faixa100%, lacunas preservadas e janela anual explícita. Altura dos seis painéis laterais ajustada após prova com três grupos ativos; título preto/verde ePPT híbrido preservados.
- **Validação:**13testes focados/seleção, tipos/lint e conferência em navegador offline; sem mudança dos dados. [Portões e evidências](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#i1--fechar-os-acabamentos-identificados-na-revisão). Regressão e arquivos finais serão registrados nosI3/I4.
- **Estado:** validado localmente; árvore paralela preservada, semAPIreal, integração oupush. Publicação/gerações humanas seguemI5/I6, sem novo aceite externo.
- **Monday:** [FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/13149405149) — referência, sem escrita.


### 05/11/2026 — Panorama: revisão final e plano de incorporação à versão publicada — Gabriel / Codex

- **Diagnóstico:**17referências relistadas noDrive;15imagens e147páginas dos panoramas revisitadas em pranchas versusR1/R2. Candidata local atende ao pedido central deFinoti/Teresa, sem novo aceite externo. Restam médias visuais, tratamento do quadro anual sem comparação/ano único, janela anual e prova com três unidades ativas.
- **Planejamento:** [matriz de aderência e portõesI0–I6 na fonte existente](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#incorporação-ao-relatório-publicado--revisão-final-e-plano-i0i6-05112026). Código já conectado à rota/manifesto/exportação local; fechar acabamentos e validar integração real antes de publicar. Sem novo plano paralelo.
- **Estado/limites:** preparado; somente revisão/documentação nesta rodada, sem código de produto, teste novo, APIreal, merge oupush. Git11locais/2remotosSP na abertura, árvore paralela preservada. PróximoI0–I4;I5exige autorização de integração/push, I6gerações humanas no site.
- **Monday:** [FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/13149405149) — referência, sem escrita.


### 05/11/2026 — Panorama: composição anual em áreas contínuas — Gabriel / Codex

- **Ajuste:** conforme retorno de Gabriel, composição anual usa áreas empilhadas lineares no lugar de colunas separadas, preservando categorias, percentuais, cores, legenda e ano parcial. Anos sem observação continuam como lacunas. Aplica-se às três métricas, sem mudar cálculos.
- **Validação/estado:**3testes focados, tipos/lint aprovados; R1PDF/PPT/CSVoffline atualizado, gráfico inspecionado no navegador e renderizado noPowerPoint. [Fonte técnica](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#composição-anual-contínua--retorno-de-gabriel-em-0511). Sem API, merge ou push; Gabriel continua os testes antes de decidir incorporação à versão live.
- **Monday:** [FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/13149405149) — referência, sem escrita.


### 05/11/2026 — Panorama: composição territorial alinhada à aparência aprovada — Gabriel / Codex

- **Problema/decisão:** Gabriel comparou o primeiro PPT territorial ao estudo aprovado e rejeitou a nova composição. Restaurada a estrutura trimestral existente (título preto/verde em blocos, quadro anual superior, gráfico à esquerda e barras comparativas à direita), mantendo separação por cidades/grupos e os dados conciliados. Cabeçalhos de oferta/preços/anuais alinhados; marcador compartilhado preserva cor dos trimestres equivalentes. PPT híbrido continua com textos/células editáveis e gráficos em imagem.
- **Evidências:** [revisão visual na fonte de execução](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#revisão-visual-após-conferência-de-gabriel--05112026), JSON de evidência atualizado, R1/R2offline12/8páginas PDF/PPT/CSV. CSV idêntico byte a byte;15testes focados, tipos/lint; PowerPoint renderizou20páginas sem objetos fora e persistiu edição de texto/célula após reabrir.
- **Estado/pendências:** validado localmente, conferência visual de Gabriel pendente; G7 exige integração/publicação autorizada e ensaio no site. Sem nova API/coleta, merge ou push. Dois commits remotos SP até219ed1c não integrados; alterações paralelas preservadas. Não antecipar aceite da ampliação.
- **Monday:** [FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/13149405149) — referência, sem escrita.


### 2026-11-05 — Panorama: comparação territorial G0–G6 validada localmente — Gabriel / Codex

- **Mudança:** consolidado ou até3unidades cidade/grupo, partição explícita, coleta reutilizada; curvas/variações, tabelas comparativas, páginas específicas densas/horizontais e três composições anuais. Capas, metodologia, nomes/CSV/avisos rastreiam membros. Zeros/negativos e contratos homologados preservados; classificação de lançamento não é inferida pela classe atual/preço. Gráficos continuam imagens noPPT híbrido.
- **Evidência:** [plano/execução e roteiroG7](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md#g6--evidência-final-local-e-limites-de-g7) e [resumo verificável](../features/Relatorios%20Secovi_FIERGS/EVIDENCIA_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.json).78testes aprovados/0falhas/1opcional ignorado;11replaysoffline,30218conferências/0diferenças, campos canônicos intactos;ausências explicitadas. Tipos/build aprovados, lint0erros/4avisos anteriores.0leituras extras ao reagrupar;19–155ms de recomposição local, sem promessa sobreAPI/produção.
- **Provas locais:** R1exato1T2023–3T2026,12páginas;R2sintético3unidades,8páginas, somente para lacunas. PDF/PPT/CSV conferidos;PowerPoint abriu, editou texto/célula e salvou/reabriu cópia.20páginas sem objetos fora;editor1440/390claro/escuro semoverflow/erro. Brutos em `.local-inputs/panorama-territorial-2026-11-05/`. Não houve coleta real nem estudo real novo.
- **Integração/limites:** merge autorizado `8d3eaec` trouxe seis commitsSP; documentos paralelos reaplicados e stash mantido. Novo remoto `4aed591` não integrado. Sem push; estado **validado localmente**, G7aguarda autorização, publicaçãoLovable, ensaio autenticado e aceite desta ampliação. A falha de aprovação por créditos na atualização de extratos impediu só aquela tentativa; continuação solicitada foi executada após aprovação normal, sem contorno.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — referência somente.

### 2026-11-05 — Panorama: plano de comparação territorial e composições anuais — Gabriel / Codex

- **Plano:** alinhamento de Gabriel convertido em [fonte técnica de execução](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md), T01–T07/G0–G7: seleção livre, consolidado ou até três unidades cidade/grupo, partição completa sem sobreposição, projeções com controles independentes e coleta reutilizada. Referências/pedidos permanecem na revisãoFinoti03/11.
- **Escopo:** curvas/variações e tabelas comparativas, páginas específicas somente nas famílias densas, horizontal incluído e composições anuais de empreendimentos/unidades/VGL. Colunas100% por ano com padrões autoritativos; não equiparar Econômico a MCMV. Vendas anuais e duplicação de maturidade/mapas ficam fora desta rodada. PPT híbrido/aparência e políticas numéricas preservadas.
- **Validação planejada:** matrizes antes do layout, regressões offline2T2026/4T2025, R1 curto da dupla3T2026 com insumos exatos eR2 somente para lacunas, PDF/CSV/ediçãoOffice; sem coleta real autorizada. Estado: preparado, não executado. G7 depende de publicação autorizada, ensaio no site e aceite externo; sem integração/push nesta preparação.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — referência somente.

### 2026-11-05 — Panorama: novas referências territoriais Finoti/Teresa — Gabriel / Codex

- **Diagnóstico:**15imagens e PDFs Lajeado/Vale72páginas eRM75páginas lidos/visualizados. Referências combinam séries/colunas comparativas e páginas específicas; Vale agrupa quatro municípios contra Lajeado. Três e-mails compartilhados confirmam separar poucas cidades e agruparRM. Aceite Finoti da revisão anterior preservado; esta ampliação ainda não implementada.
- **Proposta:** consolidado disponível para qualquer recorte; até três unidades comparativas, cada uma cidade ou grupo explícito, sem sobreposição/omissão. Reutilizar coleta municipal e recalcular taxas/preços; novas composições anuais mapeadas, sem copiar inconsistências dos exemplos. [Fonte única, inventário e estratégia](../features/Relatorios%20Secovi_FIERGS/REVISAO_FINOTI_GRAMADO_CANELA_2026-11-03.md#referências-territoriais-recebidas-em-05112026).
- **Evidência/estado:** brutos/hashes/pranchas em `.local-inputs/finoti-comparativos-2026-11-05/`; análise preparada, sem alteração de produto/API/testes/estudo real/push. Fetch:cinco commits remotos novos, sem integração da árvore suja. Próximo fechar contrato e plano antes da implementação; limite de séries não reduz por si as chamadas por cidade.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — referência somente.
### 2026-11-05 — SP Institucional: acesso pela navegação de relatórios — usuário / Codex

- **Mudança:** entrada ativa SP Institucional em Relatórios Automatizados, busca rápida e jornada de relatórios da página inicial, apontando para a rota lazy existente `/rebrain/relatorios-institucionais/sp`. Sem alterar autenticação, catálogo de municípios ou guardas da geração.
- **Padrão/validação:** reutiliza NavLink/pasta lateral, CommandPalette e cartão Home existentes. Testes AppLayout, tipagem e lint dirigidos; Edge desktop/celular claro/escuro verifica menu, página inicial, busca e geração bloqueada sem login. Nenhuma consulta autenticada real.
- **Etapas/Pendências:** navegação implementada localmente; publicar e conferir no site. A disponibilização para testes não significa homologação numérica/metodológica, que cabe à equipe responsável.
- **Monday:** [Relatório SP Institucional](https://brain381753.monday.com/boards/18398428946/pulses/13452140276) — `13452140276`; somente referência nesta alteração.

### 2026-11-05 — SP: data correta no perfil e indicadores institucionais editáveis — usuário / Codex

- **Problema:** artes integrais dos slides5/7 conservavam junho/2026 e impediam editar números no PPTX. Usuário identificou o período antigo em geração3T2026 e pediu edição de percentuais e cartões GeoBrain.
- **Correção:** camada SVG nativa substitui título/data/textos/percentuais do7 e seis valores/legendas do5. Data usa o mês efetivamente conferido, inclusive parcial e virada de ano. Exportador existente gera caixas de texto editáveis. Artes, mapas, logos/QR preservados; demais slides institucionais seguem como referência.
- **Fonte:** percentuais e indicadores institucionais continuam provenientes da edição original2T2026; não foram recalculados pela API municipal. Nota discreta no7 e explicação no checklist/interface evitam apresentar números editoriais como observação atual. Edição no PowerPoint altera a cópia baixada, não a base.
- **Validação:**296testes/33arquivos, tipos/build/lint, Edge desktop/celular claro/escuro e PPTX85slides sem nova coleta. PowerPoint editou data/percentual/indicador, salvou e reabriu preservando as três alterações. [Contrato, escopo e evidências](../features/relatorios-institucionais/sp/TEXTOS_INSTITUCIONAIS_EDITAVEIS_2026-11-05.md).
- **Etapas/Pendências:** implementação local concluída; publicação e nova exportação real pendentes. Sem nova API autenticada ou alteração numérica dos demais indicadores; Secovi/FIERGS preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência sem escrita.

### 2026-11-05 — SP: carregamento limitado à área do relatório — usuário / Codex

- **Mudança:** removido o Dialog global da primeira etapa. BrainLoadingState overlay fica em cartão relativo, sem portal, bloqueio do menu ou retenção de foco. Progresso e cancelamento preservados; demais etapas seguem no painel automático. Nenhuma regra ou chamada alterada.
- **Validação/estado:** testes da página, tipagem e ensaio Edge com resposta lenta em desktop/celular claro/escuro; diagnóstico verifica overlay absoluto contido, ausência de modal e acionamento do menu durante a consulta. Padrão Brain existente reutilizado. Ensaio com fonte sintética; API autenticada e deploy não verificados nesta rodada.
- **Etapas/Pendências:** ajuste local para revisão; testar no site após publicação. [Contrato atualizado](../features/relatorios-institucionais/sp/GERACAO_AUTOMATICA_2026-11-05.md). Demais pendências numéricas permanecem.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; sem escrita.

### 2026-11-05 — SP: geração automática em oito etapas e insights — usuário / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp`. Usuário autorizou substituir os acionamentos manuais por um fluxo visual e, nesta entrega, finalizar/commitar/publicar.
- **Mudanças:** uma ação Gerar relatório prepara municipal, empreendimentos, lançamentos, vendas, oferta/IVV, tipologias, detalhamentos compartilhados e 85 slides. Progresso por fontes/janelas/páginas/empreendimentos/slides efetivamente concluídos, marca Brain e tempo real. Cancelamento e retomada preservam resultados; falhas independentes não interrompem as demais fontes. Repetição recupera etapas pendentes e dependências locais sem repetir coleta v2 completa já preservada.
- **Insights:** memória de cálculo, conciliação mensal, diferenças por grupo, acumulados, cobertura e diagnóstico técnico mantidos em aba própria. Sem inferir distratos/reclassificações; avisos extensos carregam sob demanda. Abrir slides deixa de iniciar coleta. Fonte, fórmulas e guardas existentes preservadas.
- **Padrão/validação:** GeoApiScopeEngine, shadcn e BrainLoadingState overlay/operation reutilizados; regressão SP, testes de sessão/callback tardio, tipos/build/lint e ensaio Edge desktop/celular claro/escuro com fontes sintéticas. [Contrato, reprodução e limites](../features/relatorios-institucionais/sp/GERACAO_AUTOMATICA_2026-11-05.md). Fonte real/deploy não observados nesta rodada; nenhum acesso autenticado novo.
- **Etapas/Pendências:** implementação e validação local do novo fluxo concluídas; publicação autorizada nesta sessão. Permanecem geração real do analista, conferência do site e reconciliação numérica com a edição original; duração real do provedor não foi prometida. Motores Secovi/FIERGS e demais domínios preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência sem escrita.

### 2026-11-05 — SP: comparação dos 85 pares e correções de cálculo/exportação — usuário / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp` — relatório automatizado e PowerPoint de conferência.
- **Origem:** usuário forneceu original e gerado2T2026, confirmou segmentos, pediu MD, excluiu erros manuais do original da fila e autorizou continuar correções. [Plano e inventário dos85slides](../features/relatorios-institucionais/sp/PLANO_CONTENCAO_COMPARACAO_2T2026_2026-11-05.md).
- **Diagnóstico:**170renders inspecionados,1.021conferências numéricas em55posições; diferenças de extração não foram todas classificadas como defeitos. Original contém contradições de texto/série e totais não aditivos, mantidas somente como observações. Nenhuma nova consulta autenticada ou constante para copiar resultados antigos.
- **Mudanças:** cenário69restrito aoStandard e destaque de três padrões; capacidade76–78restrita aos empreendimentos emoferta, incluindo tipologias esgotadas desses projetos, com universo explícito na auditoria. Mapas com quatro segmentos e densidade relativa porVGV. PPTXpreserva trimestres/espaços e18links; slide2usa arte original e período dinâmico. VGVpor tipologia e guardas monetárias mantidos, fonte original preservada.
- **Validação:**300testes/30arquivos, tipos/lint/build, Edge e Office aprovados.85slides,18links,17rótulos trimestrais nos46/50; edição salva/reaberta e auditoria exata. Nove páginas renderizadas,46/69/79inspecionadas. Ensaios sintéticos/replay, semAPIrealnova. BrainLoadingState e componentes existentes reutilizados; estados lento/cancelamento/retry/erro/vazio e sucesso cobertos.
- **Arquivos:** móduloSPde mercado/mapas/apresentação/exportação, diagnóstico e testes; arte2com proveniência; plano/evidências/handoff.
- **Commits:** `785cae6` — correções SP; documentação neste fechamento.
- **Integração:** usuário autorizou preservar ambos os trabalhos; merge `2d6c018` reúne correções/documentação `785cae6`/`9f0ab00` e seis commits remotos até `e5bc2c2`. Sem conflito;126arquivos SP idênticos byte a byte e LIVE preservado conforme base+(local−base)+(remoto−base), ignorando somente separadores vazios. Alterações FIERGS/Finoti/menu escuro preservadas; nova publicação ainda não executada.
- **Regressão integrada:**302testes/31arquivos aprovados (300SPe2FIERGS), sem relaxar timeout ou guardas.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`, referência sem escrita.
- **Impacto em Etapas/Pendências:** correções locais prontas para publicação; nova geração real e verificação prática pendentes. Fontes ausentes, ponderação do original, IDs de contagem e base antigaINCC não foram inferidos. Secovi/FIERGS e demais motores preservados.
### 2026-11-05 — Rebrain: barra do menu no tema escuro e publicação FIERGS — Gabriel / Codex

- **Mudança:** barra de rolagem da navegação usa `color-scheme: dark` e cores existentes de fundo/sidebar e texto secundário; regra limitada ao modo escuro do menu, sem novos tokens ou alteração do tema claro. Seleção manual FIERGS incluída em `c8d2abb`.
- **Integração:** autorizada por Gabriel nesta sessão; merge `4f24191` incorporou13 commits remotos de SP/Validação sem conflito. Seis documentos locais guardados e reaplicados; insumos e Corretor preservados, stash de segurança mantido. Sem alterações próprias nessas features paralelas.
- **Validação:** Chromium isolado confirma barra cinza translúcida sobre fundo rgb20/23/31, esquema escuro, rolagem ativa; modo claro permanece auto. Captura e JSON em `.local-inputs/sidebar-scrollbar-2026-11-05/`. Dez testes focados de seleção/identidade/metodologia reaprovados após merge. Publicação Git autorizada; conferência da aplicação no Lovable ainda necessária.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — referência somente.

### 2026-11-05 — Panorama FIERGS: seleção manual de cidades — Gabriel / Codex

- **Mudança:** pedido de Teresa autorizado por Gabriel: início sem cidades; UF RS/FIERGS e SP/Secovi alterável; entidade/UF limpam recorte e resultado. Removidos atalho e menções ao preset na seleção/metodologia. Identidade interna do conjunto homologado, fórmulas e guardas preservadas.
- **Evidência/estado:** 10 testes focados aprovados, sem API/estudo real. Validado localmente; publicação e conferência no site pendentes. [Fonte única](../features/Relatorios%20Secovi_FIERGS/PLAN_FIERGS_RECORTES_LIVRES_2026-10-13.md#05112026--seleção-manual-solicitada-por-teresa).
- **Retorno externo:** Finoti informou “Os ajustes estão OK” (04/11). Comparação por cidade é novo pedido; Gabriel solicitou exemplos e aguarda resposta. Sem presumir aceite dessa ampliação.
- **Git:** fetch05/11: 3 commits documentais locais e13 remotos paralelos antes desta entrega; árvore suja preservada, sem integração/push.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — referência somente.

### 2026-11-04 - Panorama: PPT(2) confrontado com46comentarios Finoti - Gabriel / Codex

- **Pedido/parecer:** usuario trouxe nova saida64paginas e pediu situacao de cada comentario antes da homologacao. Arquivo apto a nova avaliacao/aceite do consultor; nao registrar homologacao externa ou dizer46pedidos literalmente corrigidos.
- **Evidencia:**PPT(2)SHA425e4ef60ca39a0c39723148bbac4006c40d5c5e4cd05da5c949ee7e8b5a522d,64slides renderizados Office;0frases ocultas/grafia antiga/formas fora;21runs de seta. Textos iguais areferencia907d4aa salvo ordem de cidades nas tres legendas de mapa. Planilhas nao nativas por decisao anterior; sem regressao visual nos quadros anuais/setas inspecionados.
- **Ressalvas reais:**pagina16 ainda diz Fonte:cubo granular Geobrain; eliminar jargao recomendado. Pouco lancamento/legibilidade final das matrizes com analista; nomes estao no subtitulo mas legenda inferior ainda compacta. PicoIVV/posicaoWinkelHaus e eventual aceite de Media das taxas continuam separados. Nao inferir auditoriaCSV nova pelo arquivoPPT.
- **Fonte unica:**[matriz completaF01-F46 e onze marcacoes](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md#conferencia-do-ppt-recebido-2-e-situacao-dos46comentarios---04112026). Insumos/renders em `.local-inputs/panorama-acceptance-2026-11-04/`. Estado:diagnostico/documentacao preparados; nenhum codigo/API/teste runtime novo, nem push ou aceite externo.
- **Resumo e resposta preparados:** adicionada leitura rapida agrupada no mesmo plano, mantendo matriz como fonte detalhada. E-mailTeresa03/11 esclarece que os apontamentos de vendas foram retirados por inicio do monitoramento posterior, nao erro confirmado. Nao estender isso automaticamente ao picoIVV. Rascunho de resposta para envio porGabriel, sem envio do agente ou aceite externo.
- **Apoio de revisao preparado:**PDF7paginas com46comentarios, tratamento/oqueconferir e checklist humano aposcada geracao na paginafinal. ReferenciaPPT(2), semaceiteexterno. PDFderivado/checklist fonte no planoPPTX; insumos/renderQA em panorama-review-support-2026-11-04,46IDs conferidos. Rascunhoemail orienta editar copiaPPT e gerarPDF a partirda propria versao editada;graficos continuamimagens. Semnovo recursoautomaticonoapp ou emailenviado.


### 2026-11-05 — SP: compatibilidade do PowerPoint real — usuário / Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp` — exportação editável de conferência.
- **O quê:** auditoria agregada sai do texto das notas para parte Custom XML vinculada à apresentação. Comparador aceita o formato antigo e identifica o novo pelo namespace, inclusive após salvamento no Office.
- **Por quê:** usuário relata crash na abertura; arquivo real tem326.127caracteres em uma sequência das notas, maior que o sintético anteriormente testado. Causa exclusiva não afirmada sem reproduzir o crash na interface habitual.
- **Evidência:** cópia real reparada preserva todos os slides/imagens byte a byte e JSON exato; abriu85slides em0,7s, salvou/reabriu no PowerPoint e manteve auditoria.293testes/29arquivos, tipos/lint aprovados; [diagnóstico](../features/relatorios-institucionais/sp/CORRECAO_ABERTURA_PPTX_2026-11-05.md).
- **Arquivos:** `sp/pptx-export.ts`, `sp/pptx-audit.ts`, testes, `scripts/diagnostics/sp-reference-audit.py`, evidências/handoff.
- **Commits:** `0965ba3` — correção do pacote PPTX e comparador; documentação neste fechamento.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203` (referência, sem escrita).
- **Impacto em Etapas/Pendências:** correção local e arquivo reparado disponíveis; publicação e reteste do usuário pendentes. Exportação disponível para conferência não significa homologação. Reconciliação numérica permanece separada, sem nova API ou mudança dos demais motores.

### 2026-11-05 — SP: destaques coerentes, divisórias originais e PPTX de conferência — usuário / Codex

- **Commits da entrega autorizada:**`bf8c362` implementa revisão/exportação; fila contínua em`092996e` e registro`b8eb808`. Usuário pediu push conjunto. Pronto para envio após gate documental; conferência do deploy e geração real2T2026 permanecem pendentes.

- **Validação final:**292 testes/28arquivos, tipos/lint/build aprovados;PPTX final85slides/2.354textos nativos aberto noOffice, sete páginas renderizadas e comparativos finais inspecionados. Exportação final noEdge preservou cobertura e não chamou GeoBrain; falhas de expectativa editorial antiga corrigidas sem alterar cálculos. Ainda não é reconciliação da fonte real.

- **Pedido/escopo:** usuário pediu coerência numérica sem copiar a redação, comparação original×JSON, restauração das capas de tema e exportação PPTX editável; autorizou enviar junto da otimização da coleta. Primeiro par de commits locais092996e/b8eb808 preservado.
- **Mudança:**9 usa janeiro-fechamento;10 separa trimestre MCMV, comparação anual, mercado e MCMV12meses;9–11 sem comentários de implementação. Trimestres equivalentes destacados e tabela com dois comparativos recentes. Nove divisórias reaproveitadas do original,45 sem mês fixo. Diagnóstico inclui dados agregados/períodos e comparador offline; não troca valores para coincidir com narrativa antiga.
- **PPTX:** botão de conferência monta85posições da geração fixa, sem nova coleta GeoBrain. Textos/células dinâmicos nativos; desenhos dos gráficos, mapas e artes estáticas em imagem. BrainLoadingState, cancelamento, erro/retry e auditoria JSON nas notas. Não é homologação ou promessa de gráfico nativo editável. [Contrato, divergências e limites](../features/relatorios-institucionais/sp/REVISAO_DESTAQUES_EXPORTACAO_2026-11-05.md).
- **Evidência:**289 testes SP/27arquivos, lint e build aprovados na primeira verificação; rodada final documentada no EVIDENCIAS. Edge gerou85slides/2.404textos nativos sem GeoBrain adicional; cancelamento/sucesso observados. Arquivo aberto noPowerPoint: título e valor editados, salvos/reabertos em cópia, sete páginas renderizadas e capturas inspecionadas. Dados sintéticos, não ensaio de negócio. Comparador leu auditoria embutida e percorreu85posições/25tendências; demais posições não são aprovadas automaticamente.
- **Estado:** fonte original tem divergências internas (127.778 no texto×127.788 no gráfico, entre outras); diferenças atuais não atribuídas automaticamente a atualização/distratos/filtros. Aguardar PPTX2T2026 da geração real para reconciliação; fonte/editorial/homologação continuam abertos. Domínios paralelos preservados e Monday não alterado.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas.

### 2026-11-05 — SP: coleta detalhada com vagas continuamente ocupadas — usuário / Codex

- **Commit técnico:** `092996e` (05/11/2026), entrega validada localmente. Publicação desta otimização ainda pendente; não confundir com as correções SP já enviadas em04/11.

- **Validação final:** tipos/build exit0 e lint aprovados; Edge local dirigido22posições, lento/cancelamento/retry/erro/vazio e múltiplos períodos/2027 aprovados. Loading Brain existente preservado e captura inspecionada; zero erros de página/zero GeoBrain real/54Mapbox200. Caso53páginas é teste de transporte, sem promessa de duração real.

- **Problema/mudança:** usuário observa7–10min para53páginas. Consumidor aguardava a mais lenta de cada lote de três antes de continuar. Fila contínua inicia a próxima assim que uma vaga libera; mantém três requisições, fonte/filtros/100por página/timeout/retry/Retry-After e todas as guardas. Falha interrompe fila e aguarda iniciadas; cancelamento não publica parcial. Cache/BrainLoadingState existentes preservados, sem fluxo visual novo.
- **Evidência:**278 testes SP/25arquivos e lint dirigido aprovados; quatro regressões novas. Relógio virtual com53páginas/5.229IDs e latências desiguais:541s antes/195s depois (~64% de redução), sem medir/prometê-lo na API real. [Regra e limites](../features/relatorios-institucionais/sp/PERFORMANCE_COLETA_2026-11-05.md).
- **Integração/estado:** base5e883a8 após fast-forward de três commits da Validação de Fechamento, preservados. Implementação local em validação final; reteste autenticado de duração e homologação permanecem pendentes. Não houve coleta de negócio nova ou alteração de outros motores.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas.

### 2026-11-05 — Validação do Fechamento: ajuda do Resumo email alinhada às regras vigentes — Edgar / Codex

- **Mudança exclusiva:** textos dos oito indicadores e quatro colunas calculadas do Resumo email isolados em `resumo-email-help.ts`, sem alterar METRICS compartilhado ou a ajuda das outras abas. Dicas explicam lançamentos somente no mês de lançamento, Preço médio pela última posição ponderada, Preço/m² com todos os históricos elegíveis, estoques por última posição, oferta ativa com status cadastral atual, representatividade do fechamento e vendas por soma dos históricos disponíveis. Acumulados explicitam corte mensal; variações descrevem fórmula e tratamento de base zero, sem prometer corte mensal para os buckets trimestrais/anuais.
- **Padrão/validação:** ajuste editorial reutiliza Help/Popover Brain existentes, sem mudança de layout ou cálculos. Nove testes de componente cobrem variações e abertura/conteúdo das dicas, foco e Escape. Sem ensaio visual desktop/mobile ou temas nesta sessão; equivalente headless executado. Estados de carregamento, vazio e erro não alterados.
- **Etapas/Pendências:** textos implementados localmente; conferência visual e publicação pendentes. Nenhuma mudança de API ou em outros projetos.
- **Monday:** —

### 2026-11-05 — Validação do Fechamento: Preço médio pela última posição no Resumo email — Edgar / Codex

- **Mudança exclusiva:** Preço médio do Resumo email usa a última posição observada por empreendimento/tipologia dentro de cada intervalo, incluindo os acumulados. Depois de escolher a posição, mantém filtros Padrão, estoque diferente de zero e preço informado; ponderação permanece Σ(qty × price)/Σ(qty). Não busca um registro antigo elegível quando o último está esgotado ou sem preço. Preço/m², demais métricas, recortes temporais e abas Resumo/Resumo por cidade preservados.
- **Evidência:** execução offline da base Teresina/PI Vertical (157 empreendimentos, 283 tipologias, 6.076 históricos): 3T/2026 Preço médio R$ 489.689,35; Preço/m² permanece R$ 7.725,30; unidades lançadas permanecem 1.368. Anual e acumulado jan–set/2026 também usam última posição no Preço médio, mantendo os respectivos cálculos originais de preço/m². Testes novos cobrem ponderação, históricos fora de ordem, tipologia sem posição no último mês comum, estoque zero e preço ausente na última posição, e preservação do cálculo das demais abas.
- **Etapas/Pendências:** implementação local; sem nova consulta autenticada ou ensaio visual. Aceite e publicação pendentes. Nenhuma mudança nas demais questões identificadas na análise temporal.
- **Monday:** —

### 2026-11-05 — Validação do Fechamento: unidades lançadas sem repetição no Resumo email — Edgar / Codex

- **Mudança exclusiva:** nas três colunas de períodos do Resumo email, em visualização trimestral/anual, unidades lançadas passam a somar qty somente dos registros do mês de lançamento, evitando repetir a quantidade nos históricos posteriores do mesmo intervalo. A variação anual dessa linha acompanha os valores corrigidos. Mensal, acumulados, demais indicadores, filtros temporais, Resumo/Resumo por cidade e motor compartilhado `computeResumo` preservados.
- **Evidência:** execução offline com normalização real da base local PI atualizada em 04/11, recorte Teresina/PI Vertical (157 empreendimentos, 283 tipologias, 6.076 históricos, último período set/2026). 3T/2026 corrigido de 2.168 para 1.368; 2T/2026 de 334 para 214; 3T/2025 de 598 para 539; anual/2026 de 6.250 para 2.536. Demais métricas comparadas sem alteração. Exemplo: 800 unidades do empreendimento 89698/tipologia 155858 deixam de repetir em setembro após lançamento em agosto.
- **Etapas/Pendências:** testes de regressão adicionados para trimestre/ano, colunas comparativas, variação anual, mensal, acumulados e preservação dos demais indicadores/abas. Sem nova consulta autenticada ou ensaio visual; aceite e publicação pendentes. As questões de preços e de corte temporal permanecem deliberadamente sem alteração, conforme escopo solicitado.
- **Monday:** —

### 2026-11-04 — SP: integração autorizada preservando os dois trabalhos — usuário / Codex

- **Build integrado:** tipos completos e build exit0, Vite29,63s; avisos existentes de Browserslist/chunks. Gate documental aprovado, com avisos de tamanho dos documentos vivos. Evidência em `.local-inputs/sp-integrated-build-final.log`.

- **Integração:** usuário confirmou integrar os14commits remotos preservando as correções. Merge `7e699fc` combina origin `907d4aa` com os commits SP `951c79d`/`851776e`, sem conflito e sem reescrita. Arquivos SP idênticos ao lado local; conferência automatizada comprova que todas as linhas novas do LIVE dos dois lados foram preservadas, sem somar novamente a base comum. Entradas remotas de Panorama/Finoti/PPT lidas e preservadas.
- **Verificação integrada:**274 testes SP/25arquivos aprovados com dois workers. Primeira execução simultânea ao build teve273 aprovações e um timeout de renderização; repetição sem mudar código, assertivas ou limite de tempo passou. Logs `.local-inputs/sp-integrated-*`, ignorados. Gate documental aprovado. Ensaio autenticado/deploy e revisão das fontes ainda pendentes; não declarar homologação.
- **Estado:** integração concluída; confirmação anterior de espera fica superada por esta entrada. Envio das correções mantém autorização anterior do usuário; não houve mensagem externa ou alteração no Monday.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas.

### 2026-11-04 — SP: correções remanescentes do checklist (4) — usuário / Codex

- **Commit técnico:** `951c79d` (04/11/2026); sete testes dirigidos repetidos na retomada, aprovados. Registro local, ainda sem integração/publicação.
- **Mudança:**51 e históricos53–59 admitem oferta não negativa somente com soma exatamente conciliada ao municipal; payload assinado preservado.78 mantém quantidades e células monetárias completas quando falta preço, com — nos valores dependentes e totais, marcado parcial. [Regra atualizada](../features/relatorios-institucionais/sp/TRATAMENTO_FONTE_2026-11-03.md). Sem tolerância residual, interpolação ou preço presumido.
- **Evidência:** checklist real68disponíveis/7parciais/2bloqueados/8referências; controles124044×124045 e preço54845/73369/junho.274 testes SP/25arquivos, tipos/lint/build e Edge dirigido aprovados na base92eeef0; capturas51/78 inspecionadas, sem nova API autenticada. Reutilizados renderizadores e estados existentes.
- **Estado:** implementação local; integração dos14commits novos encontrada em04/11 aguarda confirmação por árvore suja. Jun2023/64094 e artes editoriais continuam pendências de fonte/revisão. Não declarar homologação ou deploy observado.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência, sem escrita.
### 2026-11-04 - Panorama: conferencia integral pre-push e cobertura de preco - Gabriel / Codex

- **Pedido:** Gabriel autorizou push e exigiu gerar/revisar o estudo local antes. Primeira saida64paginas aprovada noOffice; revisao identificou zero artificial de4dormitorios em1T2023: nenhuma linha desse grupo nas tres respostas paginadas da fonte; consumidor preenchia a chave ausente com0.
- **Correcao:** metadado de observacao por trimestre/segmento distingue ausencia de zero retornado. Grafico por dormitorio usa lacuna/null sem conectar pontos ausentes; zero observado preservado. Aviso eCSV registram a lacuna. Manifesto e cache ajustados; nenhum numero canonico alterado, sem excecao por municipio/periodo.
- **Evidencia:**27testes focados e11replays offline aprovados, tipos/build/lint aprovados. Segunda geracao integral finalPDF/PPT/CSV64paginas no cache exato: nenhum texto oculto/grafia antiga, nenhum objeto fora do slide, nenhuma divergencia critica;1578textos/123imagens noPPT. Edicao de titulo/celula salva e reaberta noOffice. Arquivos e checks em `.local-inputs/panorama-prepush-final-2026-11-04/`; [resultado/hashes e limites](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md#conferencia-integral-antes-do-push-autorizado---04112026).
- **Estado:** validado localmente; envio autorizado nesta rodada junto de4e773a8. Lovable/site e aceite externo ainda pendentes; picoIVV e coordenada deWinkelHaus continuam separados da correcao de cobertura. Alteracoes paralelas preservadas.
- **Retorno visual posterior:** usuario apontou quadro anual/setas ainda desalinhados. Causa local da exportacao hibrida, nao diferenca comprovada de ambiente. Reparo dirigido: painel anual em imagem unica; setas em runs nativos coloridos junto do numero, sem fundo duplicado. Prova4paginas Office salva/reaberta e close-ups conferidos;10testes/tipos/lint aprovados. Fonte no planoPPTX03/11, secao camadas04/11. Sem nova coleta/push; revisao integral depois do reparo ainda pendente.


### 2026-11-04 - Panorama: revisao do PPT integral e tabelas - Gabriel / Codex

- **Diagnostico:** arquivo editavel(1) de 64 paginas revelou 84 caixas de texto de leitores de tela em sete tabelas (saida30,31,34,42,44,54,55). A amostra anterior nao cobriu esses estados. O exportador agora exclui spans sr-only/hidden/recortados sem remover acessibilidade do HTML; uma caixa editavel por celula e decoracao de tabela isolada corrigem o alinhamento no Office. Geobrain padronizado nos textos gerados.
- **IVV:** fechamento8,5032% preservado e reconciliado com a tabela. Retirado painel9meses que repetia fotografia trimestral; variacoes anuais agora comparam o mesmo trimestre, sem somar taxas. Estoque tambem deixa de repetir fotografia como acumulado. Pico56,856% permanece por contratoD12; origem ainda por apurar.
- **Validacao:**15 testes focados, tipos/build e lint0erros aprovados. Geracao integral offline64paginas sem texto oculto/grafia antiga, seguida de prova final9paginas apos centralizacao/isolamento de tabelas:371textos/18imagens, edicao de titulo e celula salva/reaberta noOffice. Sem API nova. Arquivos em `.local-inputs/panorama-review-2026-11-04/`; [fonte e limites](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md#conferencia-da-geracao-integral-recebida---04112026).
- **Estado:** validado localmente; commit isolado para revisao, sem push nesta rodada. Proximo autorizacao de envio e nova conferencia no site. Alteracoes paralelas preservadas; sem aceite externo.

### 2026-11-04 - Panorama: aparencia aprovada com textos editaveis - Gabriel / Codex

- **Decisao:** apos revisar o PPT integral de 64 paginas/47 graficos, Gabriel pediu voltar ao desenho aprovado, preservando textos editaveis e motor nativo para outros relat?rios. Botao PPT usa o mesmo DOM do PDF; graficos sao imagens individuais, textos/celulas sao caixas nativas, decoracao de tabelas e mapas rasterizada. Dados e contratos Finoti nao revertidos.
- **Evidencia:** extrato exato de oito paginas aberto no Office, 621 textos/12 imagens/zero graficos nativos; titulo e texto de celula editados, salvos e reabertos. Primeira prova revelou quebras extras, corrigidas antes do envio. Build/tipos e lint aprovados; 36 testes distintos aprovados; testes e renders em `.local-inputs/panorama-approved-ppt-2026-11-04/`. Guia/snapshot reutilizavel em `SE/System Design/ativos/pptx-nativo-panorama-2026-11-04/`. [Decisao e limites](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md#revisao-de-decisao-visual--04112026).
- **Estado:** validado localmente, envio autorizado pelo pedido; conferencia integral no site e aceite visual externo pendentes. Captura volta a depender de aba visivel. Sem alteracao nos projetos paralelos.

### 2026-11-04 — Panorama: contratos Finoti implementados e extratos conferidos — Gabriel / Codex

- **Resultado local:** [G0–G6, reconciliações, R1/R2 e limites](../features/Relatorios%20Secovi_FIERGS/PLAN_IMPLEMENTACAO_REVISAO_FINOTI_PANORAMA_2026-11-04.md#execução-autorizada-em-0411--resultado-curto). Corrigida exclusão indevida da categoria com distratos no IVV consolidado vertical; preço atual considera estoque positivo; média simples identificada; contexto e nomenclatura nos slides; fontes, negativos, omissões e mapa territorial implementados. Totais canônicos dos empreendimentos preservados.
- **Evidência:**102 testes distintos e11replays locais, tipos/build e lint0erros/8avisos; PDF12/8páginas ePPT nativo com edição real de texto/tabela/workbook, salvamento e reabertura Office. Cartografia comCORS conferida no navegador. Uma coleta autorizada da dupla3T2026; restantecache-only. [Matriz e hashes](../features/Relatorios%20Secovi_FIERGS/EVIDENCIA_IMPLEMENTACAO_FINOTI_2026-11-04.json).
- **Estado/próximo:** validado localmente, não publicado/homologado externamente. Origem da coordenada deWinkelHaus precisa de apuração; indicadores não foram excluídos com o ponto fora do enquadramento. Relevância de páginas e acabamento específico das tabelas ficam com o analista. Apresentar divergência/commits e obter autorização antes de push/sincronização da árvore suja; conferir site/material integral após publicação. Domínios paralelos preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas.
- **Publicacao autorizada:** Push autorizado e realizado em 04/11: sete commits ate `5b3c50b`, incluindo `46f72bd`. Origin/main e main em 0/0 apos envio; nenhuma integracao da arvore suja. Publicado no Git, ainda sem conferencia no site ou aceite externo. Proximo: publicar/conferir no Lovable e gerar Canela + Gramado, 1T2023-3T2026, com PDF/PPT/CSV integrais.

### 2026-11-04 — Panorama: plano de execução Finoti e validação curta — Gabriel / Codex

- **Entrega preparada:** [plano técnico G0–G6, estratégia R1/R2, evidências e CTA](../features/Relatorios%20Secovi_FIERGS/PLAN_IMPLEMENTACAO_REVISAO_FINOTI_PANORAMA_2026-11-04.md), seguindo o contrato fechado sem redefinir escolhas. R1: Canela4T2025, menor volume entre os modelos locais empatados em67páginas, extrato interno até12páginas. R2: até8páginas apenas para lacunas, priorizando o recorte Finoti1T2023–3T2026; sem reduzir manifesto comercial.
- **Limites:** insumos congelados encontrados cobrem2T2026/4T2025; replay antigo redireciona chave temporal parajunho2026 e não comprova3T2026. Regressões offline recalculam código atual; renderizar JSON salvo não valida novo cálculo. Coleta delimitada opcional só será autorizada se Gabriel ativar o CTA com essa cláusula.
- **Estado/próximo:** planejamento/documentação, sem implementação, coleta, teste funcional ou caderno gerado. Ativar plano, preservar árvore paralela, executar testes/edição Office e apresentar commits/divergência antes de sincronização de árvore suja/push. Estado anterior de aceite preservado; revisão nova não homologada por inferência.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas.

### 2026-11-04 — Panorama: contrato da revisão Finoti fechado com Gabriel — Gabriel / Codex

- **Decisões:** respostas individuais D01–D14 consolidadas no [contrato, fonte única](../features/Relatorios%20Secovi_FIERGS/REVISAO_FINOTI_GRAMADO_CANELA_2026-11-03.md#contrato-de-ajustes--decisões-consolidadas). Substituem a leitura equivocada de aprovação geral da mensagem isolada sobre D06. Sigla e extenso juntos; média simples das taxas; tabelas em um slide; exclusão por pouca relevância com o analista; cabeçalho sem “histórica”, sem trocar denominador; mapas com foco no território selecionado, preservando cubo/indicadores.
- **Estado:** contrato preparado, sem implementação, teste funcional, coleta ou publicação. Área50m² sem regra especial; preços baixos após D10 continuam observados se válidos. IVV só recebe tratamento existente aplicável e comprovado, sem novo filtro de outliers. Fonte inclui acabamentos do analista e dependências técnicas reais; aceiteJuliana anterior preservado.
- **Próximo:** plano técnico conforme contrato; verificar referência territorial e tratamentos históricos aplicáveis, sem pressupor erro/correção da API. Não houve autorização de push ou de ensaio real nesta resposta.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas.


### 2026-11-03 — Panorama: levantamento visual da revisão Finoti — Gabriel / Codex

- **Resultado:** 46 caixas amarelas em 33 slides e 11 marcações auxiliares mapeadas por posição/alvo; 69 slides renderizados no PowerPoint em leitura. [Fonte única, inventário espacial, evidências e nove decisões abertas](../features/Relatorios%20Secovi_FIERGS/REVISAO_FINOTI_GRAMADO_CANELA_2026-11-03.md).
- **Estado:** diagnóstico documental preparado, sem mudança de produto, API, estudo real ou teste funcional. IVV9,5%×8,5%, extremos de preço e marcador distante requerem investigação; porcentagem de empreendimentos usando unidades lançadas confirmada no código como achado adicional. Alterações paralelas e aceiteJuliana anterior preservados; novo PPT nativo não validado por este arquivo raster anotado.
- **Próximo:** incorporar respostas de Gabriel às perguntas e então planejar implementação automática/editorial e reconciliações. Insumo/cópia/renders em `.local-inputs/fiergs-finoti-revisao-2026-11-03/`; original intocado. Sem push autorizado nesta revisão.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas.


### 2026-11-03 — Panorama: um único PPT público — Gabriel / Codex

- **Decisão posterior:** Gabriel pediu remover a opção em imagens e mostrar somente `Baixar PPT`, direcionado ao gerador nativo editável. Progresso e confirmação também usam `PPT`. PDF, dados e alertas preservados; caminho raster legado mantido somente como compatibilidade interna, sem botão público.
- **Validação/próximo:** teste do botão real verifica ação única e `pptxMode: editable`; testes focados do host/alertas e tipos antes do envio autorizado. Próximo conferir no site após publicação, sem novo estudo real pelo agente. [Contrato vigente](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md).


### 2026-11-03 — Panorama: rótulo PPT e publicação autorizada — Gabriel / Codex

- **Pedido/mudança:** Gabriel pediu apresentar o formato anterior apenas como `PPT`; toolbar, progresso e confirmação de alertas atualizados. `PPT editável` permanece distinto. Sem mudança em dados ou serialização.
- **Integração/publicação:** seis commits SP integrados com autorização em `3e09422`, sem conflito; alteração local do LIVE guardada/reaplicada e materiais paralelos preservados. Push autorizado concluído até `92eeef0`, confirmado em origin/main com0/0; 14 testes focados e tipos aprovados após integração. Publicado no Git, não verificado no site; deploy e ensaio real G6 continuam pendentes. [Fonte do upgrade](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md).


### 2026-11-03 — Panorama: PowerPoint nativo editável, validação local — Gabriel / Codex

- **Mudança:** pacote de apresentação sobre o mesmo modelo/manifesto; textos/tabelas/formas e gráficos Office com XLSX embutido. Modalidade editável separada do espelho, download `-editavel.pptx`, BrainLoadingState, cancelamento/retentativa e alertas preservados. PDF/CSV e domínio numérico intactos. [Fonte única, matriz e limitações](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md#7-execução-local-e-evidências--03112026).
- **Evidência/estado:** 39 testes focados, dez modelos congelados compilados sem mutação, quatro decks sintéticos com paridade de todas as células numéricas dos gráficos/workbooks; tipos, lint dirigido e build aprovados. Office abriu as amostras, permitiu edição/salvamento de texto/tabela/dados e reabertura; Chromium local baixou o arquivo sem API externa/erro JS/deck de captura nativo. Validado localmente; não publicado.
- **Etapas/pendências:** G0–G5 executados no escopo local, com sete artes institucionais FIERGS e bases cartográficas ainda rasterizadas, identificadas explicitamente. Conferência real no site e aceite visual/exceções por Gabriel/Finoti pendentes no G6; não anunciar arquivo inteiro 100% editável. Merge inicial autorizado `e6c8385`; commits SP que chegaram depois não integrados. Sem push, API ou estudo real nesta execução.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — somente referência.


### 2026-11-03 — Panorama FIERGS/Secovi: plano do PowerPoint editável — Gabriel / Codex

- **Diagnóstico e proposta:** exportação atual insere um JPEG por slide. A POC consolidada no Sandbox já usa objetos Office e planilhas de gráficos; `pptxgenjs` também está instalado no Rebrain. [Plano técnico e CTA, fonte única](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md) organiza G0–G6, paridade com modelo/manifesto, famílias analíticas, capas/arte/mapas, integração e edição real no PowerPoint. Fotos/mapas e eventuais artes rasterizadas são exceções a inventariar, sem promessa de editabilidade integral não verificada.
- **Estado/evidência:** preparado por leitura dos geradores, contratos, manifestos e testes existentes; sem mudança de produto, API, geração real ou teste Office. Aceite Juliana de28/10 preservado. Base local `f5d4ba6`, remoto `028ee1a` com12commits SP à frente e árvore suja; nenhuma integração nesta sessão.
- **Etapas/pendências:** implementar somente após ativação do plano; sincronização com alterações paralelas depende de autorização. Testar natividade/valores no XML e XLSX embutidos, PDF preservado e edição/salvamento reais com Gabriel/Finoti antes de declarar o novo formato aceito. Push não autorizado nesta solicitação de planejamento.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — referência apenas.
### 2026-11-03 — SP: correção de cálculos e cobertura no consumidor — Codex

- **Ambiente/funcionalidade:** SP Institucional,51/53–59/78, ressalvas/checklist/auditoria.
- **Pedido e decisão:** usuário solicitou fazer a correção após o diagnóstico. [Método aplicado](../features/relatorios-institucionais/sp/TRATAMENTO_FONTE_2026-11-03.md) substitui os bloqueios anteriores pertinentes: estoque negativo informado preservado na conciliação/contagem, sem peso na média de oferta positiva; amostra histórica parcial identificada, sem variação; vendido/VGV calculados de capacidade−oferta válidas e sold original auditado. Dados ausentes/conflitos/totais de fotografia completa divergentes continuam protegidos.
- **Interface/linhagem:** SVG mantém85posições; barra amarela† identifica amostra, nota78 declara derivação. Alert de ressalvas existente reutilizado. JSON aditivo inclui resumo de avisos e método/contagem/exemplos de vendido calculado. Sem API alterada, estimativa de registros faltantes ou mutação dos fluxos mensais.
- **Validação:**271testes SP/24arquivos, tipos/lint/build e Edge dirigido22posições mais casos novos aprovados; três capturas inspecionadas. Refinamento textual final repetido em7testes. Prova mínima real87999 e demais dados simulados; zero API de negócio nova,54Mapbox200. Implementação: `039ea0d`.
- **Etapas/Pendências:** implementação preparada para reteste autenticado, não homologação ou fonte corrigida. Revisão de contrato/origem permanece como melhoria, sem impedir a aplicação da regra solicitada. Tempo da coleta, automação adiada e outros motores fora desta alteração.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência somente.

### 2026-11-03 — SP: identificação do78 e casos prontos para validação da fonte — Codex

- **Ambiente/funcionalidade:** SP Institucional, VGV por padrão/checklist e diagnóstico de estoque.
- **Origem/evidência:** usuário trouxe checklist apósv2 com68disponíveis/7parciais/2bloqueados/8referências e pediu ação. Resposta v2 já fornecida revela87999/jun2026 com sold−9/−11/−6 e diferença de capacidade10/11/6 igual a distractions. Não concluir causa sem contrato. [Casos e perguntas para encaminhamento humano](../features/relatorios-institucionais/sp/PENDENCIAS_FONTE_2T2026_2026-11-03.md).
- **Mudança:** diagnóstico78 informa IDs/campos/valores/deltas e inclui ocorrências no resumoJSON. Estoque e vendido negativos são preservados como valores no diagnóstico, explicitamente rejeitados para cálculos que não os aceitam. Mesma identidade de capacidade e fórmulas; sem rateio, zero presumido, API alterada ou mensagem enviada.
- **Validação:**267testesSP/23arquivos, tipos/lint/build e Edge dirigido22posições mais caso78/mapa79 aprovados; captura inspecionada. Prova mínima de campos reais, demais dados de teste simulados; zero consultas de negócio novas,54Mapbox200. Implementação: `c2664b2`.
- **Etapas/Pendências:** material para validar estoques/lacuna e semântica de qty/sold/distratos pronto; desbloqueio real depende de contrato/dados confirmados e novo ensaio. Outros motores, automação adiada e Monday preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência somente.

### 2026-11-03 — SP: coleta detalhada integrada à API v2 — Codex

- **Ambiente/funcionalidade:** SP Institucional, fonte compartilhada dos históricos detalhados.
- **Origem:** usuário consultouPOSTv2 no Postman:100registros na página1/5.229totais/53páginas,1.458históricos com padrão e estágio. Não contém os três IDs pendentes. Resposta bruta/pessoal permanece fora do Git; [evidência e hash](../features/relatorios-institucionais/sp/EVIDENCIAS.md).
- **Mudança:** históricos por POST sem corpo na rota interna v2 do Dashboard; Bearer da sessão, query/filtros confirmados, validaçãoSãoPaulo/SP/Vertical, todas as páginas eIDs, três concorrentes/cancelamento preservados. Retry-Afterv2 respeitado sem corte3s. Proveniência versionada e mensagem segura em acesso/conexão, sem fallbackv1. Cadastro/séries municipais e fórmulas preservados; migração integral depende de contratos equivalentes validados.
- **Validação:**264testesSP, tipos/lint/build e Edge dirigido22posições mais casos de POSTv2/403 aprovados; captura403inspecionada. Dados de negócio simulados no navegador do agente,48Mapbox200. OPTIONSsem token confirmouCORS204/POST/authorization/content-type para origem do relatório, sem consulta autenticada de negócio. Implementação: `f7507d9`.
- **Etapas/Pendências:** adaptação pronta para reteste no site. Verificar coleção integral e três registros antigos, baixar novo checklist e observar deploy; não declarar lacunas/estoque negativo resolvidos pela amostra. Automação adiada e outros motores preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência somente.

### 2026-11-03 — SP: campos históricos e diagnóstico dos registros pendentes — Codex

- **Ambiente/funcionalidade:** SP Institucional, detalhamentos/39 e checklistJSON.
- **Origem:** checklist real2T2026 com59disponíveis/9parciais/9bloqueados/8referências e print64semMCMV/MAP. Não atribuir todas as lacunas à API por esse resumo.
- **Correção:** preferir pattern da observação mensal ao cadastro atual; estágio dedicado estagio_empreendimento antes do legado reconhecido. Ativo/Esgotado não são estágios. Mensagens identificam ID/tipologia/competência; JSON inclui contagem e até5exemplos de lacunas/valores inválidos por competência. Padrão misto no mesmo projeto não vira cor única presumida nos mapas70/71. Sem alteração de endpoint/credencial, zero inventado ou automação.
- **Validação:**258testes SP/22arquivos, tipos/lint/build e Edge dirigido aprovados; duas capturas inspecionadas.64MCMV/MAP e76estágio preenchidos com campos mensais corretos em fonte simulada. Zero GeoBrain real,48Mapbox200. [Evidências e limites](../features/relatorios-institucionais/sp/EVIDENCIAS.md). Implementação: `9f092ff`.
- **Etapas/Pendências:** retestar fonte real e baixar novoJSON para verificar campos disponíveis e IDs restantes. O histórico33693 recebido antes não tem os campos dedicados; isso permanece suportado e não comprova resolução de todas as diferenças. Deploy observado/homologação pendentes; outros motores preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência somente.

### 2026-11-03 — SP: varredura de guardas por dimensão nos85 slides — Codex

- **Ambiente/funcionalidade:** SP Institucional, detalhamentos de área/preços/estoque/mapas e checklist.
- **Causa/mudança:** igualdade por padrão embutida na validação comum de estoque bloqueava visões gerais. Separadas conferências de total, padrão, segmento e Econômico/MCMV; preservar médias gerais/categorias comprovadas e bloquear só os recortes dependentes. Tabela51 não exige outros padrões ou estoque intermediário classificado que não apresenta. Avisos por competência na página e motivo do checklist/JSON. Snapshot da mesma fonte, identidade/cobertura, valores, preços/área/capacidade e totais permanecem protegidos.
- **Validação:**251 testes SP/21arquivos, tipos/lint/build e Edge dirigido22posições mais cenários de troca de padrão/MCMV aprovados; três capturas inspecionadas. Fontes simuladas, zero GeoBrain real,48Mapbox200. [Matriz de todos os slides e limites](../features/relatorios-institucionais/sp/REVISAO_GUARDAS_DIMENSIONAIS_2026-11-03.md). Implementação: `7bf10c2`.
- **Etapas/Pendências:** bloqueios indevidos corrigidos localmente; reteste autenticado, deploy observado, classificação da origem e homologação permanecem pendentes. Outros motores e automação adiada preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência somente.

### 2026-11-03 — SP: ranking de bairros com ressalva de padrão — Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp`, slide39 e checklist de conferência.
- **Evidência/causa:** retorno do usuário soma38.658 nas duas fontes, com diferenças só nos sete padrões; causa da classificação ainda não comprovada. Guarda do ranking era excessiva ao exigir igualdade numa dimensão que não usa.
- **Regra:** total trimestral e cada mês permanecem impeditivos; diferenças apenas por padrão viram aviso com valores completos na página e motivo do checklist/JSON. Mesmas validações de histórico, identidade, cobertura e bairro. Outros slides conservam suas guardas; sem rateio ou alteração de fonte. Implementação: `d077ffc`.
- **Validação:**244 testes SP, tipos/build/lint e navegador Edge dirigido22posições aprovados; cenário de padrões diferentes mantém ranking visível e aviso. Imagem inspecionada; fontes simuladas, zero chamadas GeoBrain reais. [Evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md).
- **Etapas/Pendências:** correção preparada para reteste autenticado. Classificação da fonte, deploy observado e homologação continuam pendentes; automação adiada preservada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência.

### 2026-11-03 — SP: valores divergentes na reconciliação de bairros — Codex

- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp`, ranking de vendas do slide39.
- **Mudança:** mensagem discrimina total trimestral, cada mês e cada padrão divergente; mostra soma dos empreendimentos, total municipal e diferença assinada. Guardas e fórmulas preservadas. Não é cruzamento mês/padrão nem inferência de distratos. Implementação: `198e8b8`.
- **Evidência:** print mostra bloqueio após validação cadastral, sem números para determinar causa; 32 testes dirigidos, tipos e lint aprovados. Sem API autenticada ou observação da nova mensagem em produção. [Detalhes](../features/relatorios-institucionais/sp/EVIDENCIAS.md).
- **Etapas/Pendências:** diagnóstico preparado; reteste para identificar valores e confrontar fontes permanece necessário. Automação adiada e outros motores preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência somente.

### 2026-11-03 — SP: bairro dispensável quando vendas zero estão comprovadas — Codex

- **Origem/causa:** usuário forneceu histórico33693 com bairro vazio e0vendas emabr/mai/jun2026, tipologia42611 identificada. Bloqueio do39 era excessivo: exigia bairro antes de examinar o movimento. Codex/Codex Test, Windows/PowerShell; main limpaa645034, origin único0/0 após fetch. Implementação no commit `0d60ad1`.
- **Regra:** validar históricos/IDs/conflitos/valores e cobertura mensal por tipologia; sem bairro, permitir somente cada venda explicitamente0. Qualquer positivo/negativo, inclusive soma0, mantém exigência de bairro. Sem inferência por status atual/estoque/acumulado e sem exceção porID. Totais municipais, mensais e por padrão preservados; nota no slide informa quantidade de cadastros com zero comprovado. Não preenche bairro na API nem altera automação adiada.
- **Validação:**240 testes SP/20arquivos, tipos/build/lint aprovados; navegador dirigido22posições, quatro períodos/2027 e estados de falha/recuperação, projeto sem bairro/zero observado e imagem39 inspecionada. Dados de mercado do teste são simulados, salvo a prova individual fornecida pelo usuário; zero API GeoBrain pelo agente, Mapbox27HTTP200. [Método](../features/relatorios-institucionais/sp/DECISOES.md), [evidência](../features/relatorios-institucionais/sp/EVIDENCIAS.md).
- **Pendências:** reteste da coleção completa; outros registros com bairro ausente e movimento ou histórico incompleto continuam bloqueando. Cadastro do provedor, método/editorial, deploy observado e exportação integral não homologados. Fonte/contratos de motores paralelos preservados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência somente, sem escrita.

### 2026-11-03 — SP: diagnóstico identificável do ranking de bairros — Codex

- **Contexto:** usuário adiou a automação e depois enviou bloqueio de bairros. Checklist anterior mostrava49 disponíveis/8 referências/28 aguardando; novo print comprova validação impeditiva após coleta, mas não o campo exato. Base limpafb7fa91 atualizada por ff-only paraf5d4ba6 com dois commits de grafia Finoti, preservados. Codex/Codex Test, Windows/PowerShell. Implementação no commit `6a039bd`.
- **Ajuste:** mensagem do primeiro registro impeditivo informa ID e campo (bairro/padrão/histórico/formato vazio); lacuna mensal também informa competências. Não descarta registros, não preenche zeros e não muda os cálculos/reconciliações. Automação continua adiada, sem alteração de fluxo ou motores paralelos.
- **Evidência/pendência:**14 testes dirigidos aprovados, tipos/build/lint conferidos; [evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md). Amostra antiga confirma campos no contrato, não a coleção real. Sem nova API ou observação autenticada; aguardar ID/campo atual para confrontar a origem. Falha de dados ainda não considerada resolvida.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência somente, sem escrita.

### 2026-11-03 — Estimativas: grafia Finoti nos textos exibidos — Gabriel / Claude

- **Solicitação:** Gabriel pediu grafar "Finoti" (um t) em tudo que aparece na tela.
- **Entrega:** rótulos, avisos, painéis e textos exportados corrigidos em `src/features/estimativas-vendas/`; identificadores internos (`finotti-reference`, versões e tags) mantidos para preservar contratos e arquivos exportados. Commit `3fd16cc`.
- **Evidência:** 129 testes Vitest da feature e typecheck aprovados localmente.
- **Estado/pendências:** enviado à `main`; conferir a tela no Lovable após o deploy. Documentação histórica e nomes de arquivo `FINOTTI` não foram alterados.

### 2026-11-03 — SP Institucional: Ano/Trimestre e consultas históricas gerais — Codex

- **Ambiente/solicitação:** usuário relatou municipal/contagem disponíveis, mas três séries históricas indisponíveis no2T2026; pediu período geral e seleção separada, incluindo2027. Codex/Codex Test; main limpa9b5d641 atualizada por ff-only atéfec9b74 com cinco commits de Estimativas, preservados. Origin único0/0 após fetch e reconferência. Implementação e evidências no commit `b7c25b9`.
- **Entrega:** Ano/Trimestre, padrão no último trimestre concluído e calendárioSãoPaulo com entrada automática de ano. Mudança invalida consultas/cache e preserva município. Históricos em janelas anuais paginadas, teto por universo da janela, sem seis páginas globais. Cobertura derivada dos17trimestres/comparativos, abertura adicional apenas no estoque. Mensagem segura mantém causa/janela; Retry-After respeitado, municipal preservado e retry por fonte. Select/GeoApiScopeEngine/BrainLoadingState existentes reutilizados.
- **Evidência:**221 testes SP+359 regressões Panorama, tipos reais/lint/build aprovados. Matriz unitária entre2025/2026/2027, parciais e paginação pequena; navegador com períodos2T2025/4T2025/1T2026/2T2026, simulação2027,429/retry/cancelamento e22 posições em rechecagem dirigida. [Métodos e limites](../features/relatorios-institucionais/sp/DECISOES.md), [evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md). API de negócio simulada, somente Mapbox externo; runtime Computer Use não iniciou.
- **Estado/pendências:** correções estruturais validadas localmente; print não identifica causa do erro original. Retestar2T2026 com login e motivo agora visível. Confirmar deploy, cobertura/metodologia/editorial, índices além deset/2026 e exportação integral; não afirmar acesso real resolvido sem observação. Motores Secovi/FIERGS, Estimativas, Quanti e Corretor não alterados.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas, sem escrita.

### 2026-11-02 — Estimativas: ações na linha da navegação — Gabriel / sessão

- **Mudança:** Alterar local, Atualizar dados e Dados e metodologia à direita da mesma barra de Previsões/Análise detalhada, estilo textual uniforme sem moldura. Quebra responsiva por grupos; motores/filtros/arquivos intactos.
- **Evidência/estado:** [plano seção14.11](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md#1411-refinamento-da-barra-de-navegação--0211), dois testes de jornada, tipos/build/lint e seis cenários de navegador aprovados; zero overflow/errosJS e nenhuma API extra. Fonte sintética identificada. Refinamento local, sem envio ou confirmação de produção deste ajuste.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074), somente referência.


### 2026-11-02 — Estimativas: envio autorizado da nova jornada — Gabriel / sessão

- **Envio Git confirmado:** `aa39ce5` (plano), `706eb96` (merge remoto autorizado) e `ad86e26` (prévia/Excel principal e Análise detalhada) enviados por autorização explícita de Gabriel. Fetch prévio0atrás/3locais; ls-remote/HEAD iguais em `ad86e26da8b43355d3acd3056f8a16827a671905`,0/0 após push. Gate LIVE e diff aprovados; cinco documentos/pastaCorretor paralelos continuam fora da entrega.
- **Estado:** publicado no Git, sem comando de deploy ou verificação da versão em produção; testes locais129+15 e evidências anteriores preservados, não reexecutados por esta sincronização documental. [Resultado e limites](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md#1410-envio-autorizado-em-0211).
- **Próximo:** publicar/conferir no Lovable a jornada território→prévia→Excel e Análise detalhada. Arquivo segue não homologado para Geobrain; contrato final externo pendente.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074), somente referência.


### 2026-11-02 — Estimativas: prévia/Excel na principal e Análise detalhada — Gabriel / sessão

- **Ambiente/funcionalidade:** `/rebrain/estimativas-vendas`; jornada de entrega implementada localmente após feedback Diego30/10. Principal com filtros visíveis, prévia configurável inline e Excel; gráficos/comparação/backtest na vista Análise detalhada, sem nova API na exploração.
- **Proteções:** arquivo principal Finotti exclusivo, datas individuais, conjunto integral antes do limite50; seleção exploratória independente; nenhum fallback, arquivo parcial silencioso ou aprovação operacional implícita. Cancelamento/retry/quadro anterior, personalização persistente e descarte de download após saída da sessão. Motores e contratos preservados.
- **Evidência:** [plano seção14.9](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md#149-execução-local-em-0211--resultado-evidências-e-limites) e [evidências](../features/estimativas-vendas/EVIDENCIAS_PREVIA_EXPORTACAO_2026-10-29.json),129Vitest/23arquivos+15operacionais; tipos/lint/build aprovados. Seis combinações de tela/tema+cinco estados; prévia50/Excel72iguais, zero errosJS/overflow/chamadas adicionais. Replay Maragogi25cadastros/13pontos em1440/390 preservado. Fontes sintéticas/replay, sem nova API real ou validação de precisão.
- **Git/estado:** merge autorizado `706eb96` incorporou15commits remotos SP, preservando plano `aa39ce5`; alterações paralelas reaplicadas/conferidas e fora do commit da entrega. Validado localmente, sem push/deploy; próxima autorização final e aceite no site.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — somente referência.
- **Pendências:** contrato final Nicolas/Belogic, origem/cadência, preço/rateio/reconciliação e importação não homologados. Uso da expressão Estimativas aprovadas não altera esses limites.


### 2026-11-02 — Estimativas: plano da jornada de entrega e Análise detalhada — Gabriel / sessão

- **Ambiente/funcionalidade:** `/rebrain/estimativas-vendas` — planejamento, sem alteração runtime.
- **Decisão:** feedback de Diego de 30/10 fornecido por Gabriel orienta território → prévia inline → Excel na principal; filtros de cidade/tipo/duração expostos; gráficos, comparação e retrospectiva em Análise detalhada com a mesma base carregada.
- **Fonte única:** [plano essencial, seção 14](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md#14-fluxo-de-entrega-com-análise-detalhada--plano-de-02112026). Define recorte completo reference-only, independência da seleção exploratória, estado atômico/cancelamento, colunas/download, etapas G0–G6 e testes de aceite. Motores/contrato científico preservados; arquivo não homologado.
- **Evidência/estado:** preparado documentalmente após inspeção do código c62e41e; nenhum teste de produto/API/navegador executado nesta preparação. Fetch confirmou 15 commits remotos de relatórios SP, zero locais à frente; árvore paralela suja preservada, sem integração/push/deploy. Implementação e validação permanecem pendentes.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — somente referência, sem escrita.
- **Etapas/Pendências:** próxima execução deve seguir seção 14 e integrar a base apenas com autorização; contrato final Nicolas/Belogic continua externo.

### 2026-10-30 — SP Institucional: varredura e preparo dos testes práticos — Codex

- **Ambiente/objetivo:** Rebrain, rota`/rebrain/relatorios-institucionais/sp`; Codex/Codex Test a pedido do usuário. Main limpa`ab149ef`, único origin0/0 após fetch e reconferência. Revisão dos85 slides para ensaio prático, sem consultar dados de negócio reais. Implementação e evidências no commit `64dd203`.
- **Entrega:** checklist por slide/fonte (disponível, lacuna, aguardando, bloqueado, referência editorial), filtro/acesso e JSON sem token/histórico individual; botão de detalhamentos explícito com a mesma coleta em memória. Corrigidos avisos de pendência/sucesso e dependência do48; edição institucional também na ampliação. Primitives Select/Table/Button/Dialog, GeoApiScopeEngine e BrainLoadingState existentes preservados; checklist fora das artes.
- **Validação:**211 testes SP/18arquivos e359 regressões Panorama/43arquivos aprovados;85 posições nas quatro combinações1440/390 e claro/escuro, filtro/download/ampliação, lento/cancelamento/retry, erro/vazio e lacunas. QA com fontes interceptadas; única rede externa Mapbox186/186HTTP200, não prova GeoBrain. Corrigidos6 erros tipados em testes anteriores; typecheck/build agora verificam o projeto app real em vez do tsconfig raiz vazio. Build/tipos/lint aprovados.
- **Etapas/pendências:** preparado para ensaio controlado da tela. [Inventário, achados e roteiro](../features/relatorios-institucionais/sp/REVISAO_PARA_TESTES_2026-10-30.md). Validar token/cobertura/dados reais e deploy pelo usuário, metodologia/editorial pelo analista; índices futuros e exportação integral seguem pendentes. Não houve alteração de motor Secovi/FIERGS, Corretor ou ÁreaQuanti, nem homologação por inferência.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas, sem escrita.

### 2026-10-29 — SP Institucional: lote final de28 posições — Codex

- **Ambiente/funcionalidade:** Rebrain, `/rebrain/relatorios-institucionais/sp`. Codex/Codex Test a pedido do usuário, main limpa`e431fa7`, único origin0/0 após fetch. Implementação e evidências no commit `b6487b4`. Pedido explícito de fazer os28 restantes juntos. As85 posições originais passam a ter renderizador, mantendo a ordem; dados ausentes continuam em conferência.
- **Entrega:**17 analíticos63/64/66–80,3 destaques dinâmicos9–11 e8 institucionais3–5/7/82–85. Preços ponderados, coortes/padrões/dormitórios, matriz por área, composição por estágio e capacidade/vendas acumuladas/estoque/VGV nominal. Oito mapas amplos/aproximados usam coordenadas e oferta atuais; sem coordenadas/medição, a cobertura permanece explícita. Artes institucionais conservam edição2T2026, perfil7jun2026, identificadas na interface; não são atualização observada de equipe/contatos.
- **Métodos/desempenho:** MAP segue recorte sem Econômico; cenário400–500mil não atesta regra legal. Estágio declarado, sem inferência pela idade. VGV da fotografia exige capacidade=vendidas+estoque e preço atual, separado dos fluxos corrigidos pelo INCC. Uma coleta privada compartilhada em memória, sem endpoint novo; BrainLoadingState `field` nos tiles Mapbox. Reutiliza primitivas cartográficas do Panorama e visualizador original, sem alterar outros motores. [Decisões](../features/relatorios-institucionais/sp/DECISOES.md).
- **Validação/limites:**205 testes SP, tipos/lint/build aprovados; QA local e evidências em [EVIDENCIAS](../features/relatorios-institucionais/sp/EVIDENCIAS.md). Dados de negócio sintéticos/replays, sem GeoBrain autenticada; Mapbox público configurado respondeu200. Cobertura das85 é implementação, não homologação real/exportação integral. Revisão autenticada, metodologia/edição pelo analista, publicação observada e exportação seguem pendentes.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência apenas, sem escrita.

### 2026-10-29 — SP Institucional: IVV por área e preços ponderados — Codex

- **Ambiente/funcionalidade:** Rebrain, `/rebrain/relatorios-institucionais/sp`. Codex/Codex Test por solicitação do usuário; abertura em `main` limpa `671568c`, único origin em 0/0 após fetch. Implementação e evidências no commit `b8241cd`. Quarto lote: dez conteúdos nas posições 51, 53–59, 61 e 62. Divisórias 52 e 60 mantidas, sem renumeração.
- **Mudança:** tabela de IVV por 14 faixas de área, sete séries trimestrais de preço/m² e gráficos de ticket e R$/m² por sete padrões. Preços nominais ponderados pelas unidades em oferta final, média geral calculada diretamente das unidades, snapshots históricos reconciliados e recortes sem MCMV excluindo somente Econômico. Tabela usa abertura/fechamento e fluxos observados, com IVV por oferta disponível. Critérios escolhidos sob a delegação do usuário, coerentes com o original e sujeitos à revisão do analista.
- **Experiência/desempenho:** a mesma coleta integral em memória atende bairros, áreas e preços. Abrir um desses slides inicia a consulta após operações leves; alternar entre eles não repete a rede. Nova geração/escopo/token descarta o cache. Recuperar estoque revalida registros em memória. Processamento local cede o event loop e permite cancelar, com logo Brain, etapa e tempo; demais slides permanecem acessíveis. Ausência de preço, área ou fotografia afeta somente os dados dependentes, sem média de amostra incompleta ou preço zero inventado.
- **Validação/limites:** 198 testes SP, tipos completos do app, lint e build aprovados. Edge local1440/390, claro/escuro, cobre parciais, trimestre completo, sinais negativos, fonte lenta/cancelamento/retry, reaproveitamento e lacunas isoladas com recuperação. Fontes de projeto/preço/área são inventadas; nenhuma API de negócio real nesta rodada. [Métodos e evidências](../features/relatorios-institucionais/sp/DECISOES.md). Validar cobertura histórica, pesos e interpretação com analista; publicação observada e exportação integral continuam pendentes. Nenhum motor Secovi/FIERGS ou domínio Quanti/Corretor alterado.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita.

### 2026-10-29 — SP Institucional: VGV vendido, oferta, IVV e vendas por bairro — Codex

- **Ambiente/funcionalidade:** Rebrain, `/rebrain/relatorios-institucionais/sp`. Codex/Codex Test a pedido do usuário; abertura em `main` limpa `dbd887d`, único origin em 0/0 após fetch. Implementação e evidências no commit `fa33bf2`. Terceiro lote de dez posições originais: 39–44, 46–48 e 50. Ordem de 85 e divisórias preservadas; os demais blocos continuam pendentes.
- **Mudança:** cinco páginas de VGV vendido corrigido pelo INCC-DI, oferta como fotografia trimestral e comparativos anuais por tipologia/segmento, escoamento e IVV trimestral. Reutiliza vendas e tipologias existentes; adiciona série municipal de estoque. Valores monetários negativos preservados, mesma base de INCC do VGL, sem nova chamada para dinheiro. IVV = vendas/(oferta inicial+lançamentos); escoamento = estoque final/média mensal de vendas, com arredondamento para cima e indisponível quando vendas não positivas. Critérios coerentes com o original, adotados sob delegação do usuário e sujeitos à revisão do analista.
- **Bairros/desempenho:** históricos completos só ao abrir39, depois das operações leves, com até três páginas simultâneas, progresso Brain, tempo, cancelamento e retry próprios. Contagem básica continua sem histórico. Exige identidade por empreendimento/tipologia/mês, deduplicação, cobertura e soma igual aos totais municipais por mês/padrão; negativos não somem nem viram percentuais enganosos. Oferta automática aguarda cadastro básico, mantendo até seis consultas leves simultâneas. Nenhum motor Secovi/FIERGS alterado.
- **Evidência/limites:** 186 testes SP aprovados, tipos do app, lint e build passando; QA Edge local em 1440/390, claro/escuro, parciais, trimestre completo e estados de cancelamento/erro/vazio. Somente fontes interceptadas/sintéticas, sem API de negócio real. [Contratos e evidências](../features/relatorios-institucionais/sp/DECISOES.md). Validar cobertura histórica, semântica das vendas por bairro, números e fórmulas com analista; índices futuros, publicação observada e exportação integral continuam pendentes.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita.

### 2026-10-29 — SP Institucional: comparativos, bairros, vendas e VGL corrigido — Codex

- **Ambiente/funcionalidade:** Rebrain, `/rebrain/relatorios-institucionais/sp`. Base `26bcfb6`, main limpa e único origin em 0/0 após fetch. Autoria Codex/Codex Test, a pedido do usuário; implementação e evidências no commit `7f6a259`.
- **Mudança:** quinze conteúdos nas posições originais 23–30 e 32–38: comparativos anuais por tipologia/segmento de lançamentos/vendas, Top 10 bairros, cinco tendências de vendas e cinco de VGL corrigido. Meses equivalentes, vendas negativas preservadas, ranking com denominador municipal integral e soma cadastral reconciliada. Mantém as 85 posições, com outros conteúdos ainda pendentes.
- **INCC:** usuário confirmou INCC-DI e delegou escolha de base após receber diferenças da planilha. Critério adotado: último mês municipal disponível como base única para todos os anos e recortes, inclusive MCMV; corrigir cada mês antes de somar. Snapshot público SindusconPR/FGV de jan/2021 a set/2026 com proveniência/hash, sem copiar índices divergentes ou bases abril/março da planilha. Falta de nominal/índice deixa apenas VGL indisponível. Não há sincronização automática de novos índices; atualizar o snapshot quando publicados. [Contrato e evidências](../features/relatorios-institucionais/sp/DECISOES.md).
- **Desempenho/UX:** bairros reutilizam `/building`; VGL reutiliza `releases`; vendas usam série municipal paginada e tipologias consultam duas janelas. Consultas independentes com BrainLoadingState, tempo, cancelamento e retry; municipal permanece acessível. GeoApiScopeEngine e rota lazy preservados; Secovi/FIERGS não alterados.
- **Validação/limites:** 173 testes SP, tipos completos do app, lint e build aprovados. QA Edge local com tráfego externo bloqueado verifica 1440/390, claro/escuro, parcial de um/dois meses, trimestre completo, erro/vazio/cancelamento e páginas originais. Fontes locais monetárias/bairros/tipologias são sintéticas; API autenticada e aceite do analista não observados. Revisão da base INCC, cobertura histórica real, publicação observável, demais conteúdos e exportação seguem pendentes.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita.

### 2026-10-29 — SP: estrutura original85 e dez slides analíticos13–22 — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp`, autoria Codex/Codex Test, baseeb2b666, main limpa/origin0/0apósfetch. Usuário pediu10slides e exigiu mesma estrutura original.
- **Estrutura:** navegação preserva85posições/títulos do inventário, pendentes explícitos; remove sequência própria de complementos. Slide2apresentação,13empreendimentos; capítulos/sumário e23/24,37/38,47/48nas posições corretas.85posições não significam85conteúdos finalizados.
- **Lote13–22:** empreendimentos e unidades, cinco cada: trimestral,12meses,trimestralMCMV,12mesesMCMV,participaçãoanual.17trimestres e37pontos móveis; anualdesde2021, mês/ano/trimestre parcial explícitos, variações em pares anuais consecutivos e meses equivalentes, basezero sem percentual. Empreendimentos reutilizam cadastro completo, unidades usam série releasesjan2021…throughMonth, até6páginas100 com validação de grupos/meses/valores/releitura. Guardas desconhecidas bloqueiam recorte, sem zero inventado ou política FIERGS transplantada.
- **UX/padrão:** artes/gráficos SVG e primitives existentes, rota lazy/GeoApiScopeEngine preservados. Consulta de unidades independente com Brain`operation`, progresso/tempo/cancelamento/retry; não bloqueia municipal/contagem. Atualizações mesclam resultados e descartam escopo/token/geração antigos.
- **Validação/limites:**149testes SP na rodada, tipos/lint aprovados e comparações consecutivas retestadas; build final e QA Edge1440/390 claro/escuro com os dez gráficos aprovados, zero errosJS/chamadas reais; [evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md). Fontes simuladas; sem APIreal/aceite. Reconstituição pelo cadastro atual e vigência histórica dos segmentos explicitamente em revisão.
- **Arquivos/commit:** móduloSP, diagnóstico dinâmico, mapa/matriz/plano/decisões/evidências/status; entrega sobre`eb2b666`, commit desta entrada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência, sem escrita.
- **Etapas/pendências:** estrutura corrigida e10componentes implementados; validar cobertura/classificação históricas reais e revisar slides. Preços/INCC, IVV, mapas, curva completa de vendas/oferta, editorial e exportação/homologação integral continuam abertos.

### 2026-10-29 — SP: cadastro sem históricos e contagem sem bloquear municipal — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp`, desempenho da geração; identidade Codex Test. Usuário relatou4:24na página15/52 da coleta de5751424 e autorizou corrigir.
- **Mudança:** contagem usa GET`/public-api/building`, cujo contrato local inclui ID/data/tipo/território sem históricos mensais; após primeira página, até3em paralelo. Primitivas de integridade Panorama preservadas, sem alterar seus motores. Mesmos meses municipais e contagem de IDs, sem filtros de lançamento inventados ou cache silencioso.
- **Fluxo:** municipal aparece antes, contagem automática em BrainLoadingState`operation` com progresso/tempo real/cancelamento próprios. Retry só de empreendimentos; falha/cancelamento mantém municipal. Controle independente e atualizações funcionais evitam dados antigos ou perda de históricos/tipologias.
- **Evidência/limites:** 138testes SP, tipos/lint/build e diagnóstico Edge local1440/390 claro/escuro aprovados, conforme [evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md). Sem consulta autenticada ou promessa de segundos; duração e cobertura do cadastro real precisam de reteste. Contrato revisto em `src/assets/openapi/api-geobrain.json`. Documentos do piloto/handoff atualizados, entrega sobre5751424, commit desta entrada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência, sem escrita.
- **Etapas/pendências:** espera municipal pela coleta longa removida; retestar tempo/cobertura real no site. Contrato líquido, preços/INCC, IVV, exportação/homologação seguem abertos. Supera endpoint interno pesado para contagem SP, sem transferir políticas FIERGS.

### 2026-10-29 — SP: contagem paginada de empreendimentos no slide 2 — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp` — coleta granular e contagem de empreendimentos lançados; autoria Codex, identidade Git Codex Test. Implementação/publicação autorizadas pelo usuário.
- **O quê:** adapta as primitivas `readBuildingPage`/`insertBuilding` do Secovi/FIERGS à fonte interna v2, somente São Paulo/SP vertical, todas as páginas e sem excluir status. Conta IDs distintos por data de lançamento no mesmo período municipal disponível; total e evolução mensal no slide 2. Raiz não limita competência, tipologias/unidades não multiplicam empreendimentos. Sem alterar motores/políticas dos Panoramas.
- **Guardas/UX:** total e paginação estáveis, IDs distintos, conflito/território/tipo/datas inválidos ou fonte vazia bloqueiam apenas a contagem. Totais municipais preservados em falha granular; nova geração refaz consulta sem cache. Reutilizados GeoApiScopeEngine, overlay Brain com tempo real/cancelamento e progresso por página, Alert/Table e gráfico mensal existente.
- **Validação:** 134 testes SP aprovados, lint dirigido e Edge headless local1440/390 claro/escuro; duas páginas, transições de1/2/3meses, erro granular preservando municipal, lento/cancelamento e erro/vazio municipal. Zero erros JS/chamadas reais; contagens sintéticas. [Evidências](../features/relatorios-institucionais/sp/EVIDENCIAS.md); tipos completos do app e build final aprovados.
- **Arquivos/commits:** `sp/projects.ts`, testes e página/slides SP, diagnóstico dinâmico e plano/decisões/evidências/status; entrega sobre base `795ee04`, commit desta entrada.
- **Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência, nenhuma escrita.
- **Impacto em Etapas/Pendências:** implementação do slide2 concluída localmente; conferir acesso à fonte interna e contagem real após publicação com sessão pessoal. Preços/INCC, IVV, contrato líquido, exportação/homologação integral continuam pendentes.

### 2026-10-29 — SP: disponibilidade municipal independente da raiz e balanço diagnóstico — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp` — correção após o teste autenticado do usuário; autoria Codex, identidade Git `Codex Test`.
- **Evidência recebida:** usuário consultou a API e forneceu raiz `2026-08-01`, históricos com setembro e respostas completas de `sales`, `releases` e `stock` por Padrão. Setembro: 7.825 lançamentos, 8.912 vendas líquidas e 126.307 estoque; agosto: 127.372 estoque. Balanço residual +22, com diferenças maiores por grupo; causa não demonstrada. Disponibilidade confirmada pelas respostas fornecidas, não por consulta autenticada do agente.
- **Mudança:** solicita a janela trimestral completa e descobre o prefixo consecutivo comum das três séries, sem corte pelo `period` de uma amostra. Um/dois meses produzem parcial; três, trimestre completo nas séries. Raiz continua só contexto territorial. Balanços total/por grupo viram diagnóstico explícito sem alterar números ou inferir distratos. Histórico conserva meses equivalentes e bloqueio por releitura/dimensão divergente; diferenças de balanço são separadas dessas guardas.
- **Guardas preservadas:** catálogo/escopo autorizado, limite de duas páginas por fonte, retry/cancelamento, sem cache HTTP, cobertura/paginação, lacunas intermediárias, grupos incompatíveis, duplicatas, valores inválidos, negativo líquido observado e estoque do último mês. Sem fallback para zero ou liberação de coleta/exportação integral. Slide 2 segue dependente da coleta granular.
- **Referência revisada:** normalização temporal e reconciliação do Panorama Secovi/FIERGS. Reaproveitado o princípio de distinguir fluxo/fotografia e separar diagnósticos de integridade; nenhuma política de vendas granulares FIERGS foi transplantada ou alterada.
- **Arquivos:** módulo SP, diagnósticos locais em `scripts/diagnostics/sp-*.mjs`, fixture agregada recebida em 29/10 e plano/decisões/evidências/status do piloto.
- **Validação:** 120 testes SP/10 arquivos, tipos completos do app, lint dirigido e build aprovados. Edge headless local 1440/390, claro/escuro: raiz fixa em agosto, transições de um/dois/três meses, setembro preservado e alerta +22; carregamento lento Brain com tempo real/cancelamento, erro e vazio. Zero erros JS/chamadas reais. Replay combina setembro/agosto recebidos hoje com outros meses de fixtures anteriores: comprova mecanismo, não baseline trimestral pareado nem causa dos resíduos.
- **Commits:** commit desta entrada; base `97caa21`.
- **Monday:** [SP — Institucional mensal/trimestral](https://brain381753.monday.com/boards/18398638577/pulses/13149411648) — `13149411648`; referência apenas, sem escrita.
- **Etapas/Pendências:** correção validada localmente; aceite da versão publicada permanece pendente. Retestar geração no site após envio/publicação. Contagem granular, contrato exato de `liquid_sales`, preços/INCC, IVV, exportação e homologação integral continuam abertos. Sem confirmação de produção nesta evidência.

### 2026-10-29 — SP Institucional: fechamento dinâmico a cada geração — Codex
- **Ambiente/funcionalidade:** `/rebrain/relatorios-institucionais/sp` — cobertura temporal da prévia municipal; autoria Codex, identidade Git `Codex Test`, solicitação do usuário nesta sessão.
- **O quê:** releitura do fechamento sem cache HTTP em cada geração; um/dois meses consecutivos reconciliados mantêm parcial, três produzem `quarter-closed`. Rótulos da página/slides e liberação de tipologias, segmentos, quadros e históricos reconhecem ambos os estados. Nova geração retira detalhes anteriores; consultas bloqueantes usam overlay Brain com tempo real e cancelamento por botão/Escape. Nenhuma consulta agendada ou ampliação granular.
- **Guardas:** mês ausente, grupo incompatível, duplicata, paginação incompleta ou balanço divergente impedem publicação dos indicadores. Estoque usa apenas o último mês; vendas negativas preservadas. Trimestre municipal fechado não equivale à homologação/exportação ou cobertura granular do estudo.
- **Arquivos:** `src/features/relatorios-institucionais/sp/`, opção aditiva de cache em `src/lib/http-client.ts`, diagnóstico `scripts/diagnostics/sp-dynamic-closure.mjs` e plano/status do piloto.
- **Commits:** commit desta entrada; base `c62e41e`.
- **Monday:** [SP — Institucional mensal/trimestral](https://brain381753.monday.com/boards/18398638577/pulses/13149411648) — `13149411648`; somente referência, sem escrita.

- **Validação 29/10:** 115 testes SP/10 arquivos, TypeScript explícito do app, lint dirigido e build final aprovados. Diagnóstico Edge headless local cobre 1440/390 px, claro/escuro, transições de um/dois/três meses, fonte vazia/erro e resposta lenta com overlay/cronômetro/cancelamento; zero erros JS e zero chamadas reais. Setembro sintético, sem alegação de disponibilidade real. Evidência local ignorada em `.local-inputs/relatorios-lucas/sp/dynamic-closure/`; reprodução por `node scripts/diagnostics/sp-dynamic-closure.mjs`.
- **Limites:** setembro real não confirmado; controle do navegador pessoal interrompido por não determinar a URL com segurança. QA headless local usa setembro sintético. Sem push/deploy nesta entrega; etapa validada localmente, próximo publicar com autorização e conferir o retorno autenticado.

### 29/10/2026 — Estimativas: prévia da base exportável

- **Entrega:** modal ampliado com até50linhas e as13colunas atuais do Excel analítico, inspirado no `BasePreviewPanel` das coletas Quanti (somente leitura). Cabeçalhos arrastáveis, alternativa Alt+setas/menu, ocultar/restaurar e restaurar padrão. Excel completo usa exatamente as colunas visíveis na ordem escolhida; prévia não limita a quantidade exportada. Pacote de evidências acompanha a configuração no CSV analítico/manifesto, preservando histórico e arquivo candidato de26colunas.
- **Contratos:** sem edição de células, cálculos ou novos filtros de linha. Tipos/precisão/IDs preservados; ao menos uma coluna obrigatória. `leia_me` registra layout/omissões e mantém estado não homologado. Nenhuma confirmação de formato final Nicolas/Belogic. [Fonte vigente, seção13](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md).
- **Validação:**122Vitest/20arquivos,31da experiência/11arquivos, tipos/lint/build aprovados. Chromium local1440claro/escuro e390: arraste real/teclado, ocultar/restaurar, XLSX reaberto72linhas/12colunas e comparação célula a célula com as50linhas da prévia; zero errosJS/overflow do modal ou novas chamadas na personalização. IDs em texto, booleanos, nulos e precisão conferidos. Fontes sintéticas; sem nova API real. [Evidência](../features/estimativas-vendas/EVIDENCIAS_PREVIA_EXPORTACAO_2026-10-29.json). Capturas revisadas; servidor local anterior estava encerrado e foi iniciado novo preview do build antes dos ensaios. Navegador conectado indisponível, usado Chromium headless local.
- **Estado/próximo:** validado localmente, implementação destinada àmain conforme autorização vigente da frente; publicação/aceite desta revisão pendentes. Motores e alterações paralelas preservados. Próximo: conferir prévia no site e aguardar o contrato final externo para adaptar a saída.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência, sem escrita.

### 28/10/2026 — Estimativas: ações compactas e rótulos aprovados pelo usuário

- **Entrega:** comparar/baixar/marcar/configurar reunidos junto ao cabeçalho das curvas, removendo a faixa vazia. Sem preenchimento amarelo/verde no hover; destaque breve apenas nas letras, respeitando movimento reduzido. Nome de navegação `Estimativas aprovadas` solicitado por Gabriel; o conjunto calculável e a identificação técnica Finotti permanecem, sem nova homologação ou validação estatística. [Fonte](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md), refinamento seção12.
- **Validação:**28testes da experiência/9arquivos, tipos/lint/build aprovados; três cenários de navegador1440 claro/escuro e390, transparência/sombra dos botões verificadas, seis jornadas completas/backtest/comparação/Excel24linhas preservadas. Zero errosJS/overflow horizontal ou chamadas adicionais. Dados sintéticos, sem nova API real; [evidência](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json) `compactActions`. Retomada após bloqueio temporário da revisão automática por limite de uso, sem contornar a revisão.
- **Estado/próximo:** validado localmente, envio conforme autorização vigente; nova publicação/aceite no site pendentes. Alterações paralelas preservadas e contratos científicos/operacionais intactos.
- **Aceite posterior em28/10:** Gabriel informou nesta conversa que conferiu em produção e está ótimo por ora, após envio `9d14f2a`. Verificado em produção pelo usuário; não houve nova inspeção do agente nem confirmação do hash servido. Frente encerrada por ora. Retomar quando houver comprovação do formato final de saída para Nicolas/Belogic; aceite da interface não homologa importação ou precisão estatística.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência.

### 28/10/2026 — Estimativas: ajustes laterais, galerias e carrossel estável

- **Entrega:** conceito aprovado por Gabriel implementado: Sheet direito agrupa projeção/disponibilidade/tipo/cidade/apresentação e informações do universo. Busca/curvas/ações no centro, marcar todos como link discreto. Comparação orienta escolher dois ou mais e informa `Comparar N curvas`. Controles mini/detalhado e nome/vendas alternáveis e empilhados. Outros/esgotados em grid paginado amplo, busca e cantos12px locais; sem `Incluir esgotados`. [Plano vigente, seção12](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md).
- **Transição:** detalhe permanece montado; quadro publicado associa hash/ID/data/duração/métodos/versões. Nome, valores e curva continuam juntos e opacos até o próximo resultado correto. Respostas atrasadas/divergentes descartadas, até dois vizinhos preparados em cache, prioridade do detalhe preservada. Exportação/controles desabilitados enquanto pendente, setas e identidade Brain disponíveis; movimento reduzido respeitado. Motores e dados matemáticos intactos.
- **Validação:**119Vitest/18arquivos, tipos/lint/build aprovados. Novos testes de A→B→C atrasado, duração, identidade divergente e galeria. Navegador local1440 claro/escuro e390 com cálculo atrasado400ms, paginação12/4itens e seleção orientada aprovados, sem errosJS/overflow ou consultas extras. Seis jornadas completas/Excel24linhas e replay Maragogi com13pontos preservados. [Evidência](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json), campo `settingsAndBuffer`. Capturas revisadas visualmente; dados sintéticos e replay, sem nova coleta autenticada.
- **Estado/próximo:** validado localmente; envio conforme autorização vigente da frente. Publicação e aceite da revisão no site pendentes. Contratos Belogic, origem/cadência por período, preço/rateio/reconciliação e precisão independente permanecem abertos; nenhuma homologação de importação. Alterações paralelas preservadas.
- **Envio:** implementação `b0757b2` enviada a origin/main em28/10; main/origin0–0 conferido. Git enviado não significa publicação nem verificação no site.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência, sem escrita.

### 28/10/2026 — Estimativas: exploração direta, carrossel e histórico Maragogi

- **Entrega:** clique abre curva; modo Comparação explícito seleciona. Ações/contagem acima dos cards, barra inferior retirada, comparar habilitado com dois ou mais itens e pulso reduzível. Download coletivo conserva revisão explícita. Detalhe com gráfico dominante, histórico completo e controles abertos; método/dados/backtest em vistas próprias. Setas laterais seguem a ordenação efetiva do mapa. [Plano vigente, seção11](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md).
- **Diagnóstico real:** duas consultas autenticadas somente leitura HTTP200 retornaram25cadastros de Maragogi. Max Tulum — BlocoB tem13registros válidos2023-10–2026-09, principalmente trimestrais. A linha mensal sem pontos escondia observações isoladas. Pontos agora visíveis, guia pontilhado somente visual, meses vazios continuam nulos; nenhuma imputaçāo, regra de cadência ou alteração do motor. Projeção atual segue após último registro; datas anteriores apenas no backtest.
- **Validação:**115Vitest/16arquivos, tipos/lint/build aprovados. Replay do snapshot real1440/390 renderiza13pontos, valida carrossel ordenado, modo comparação e ausência da barra inferior; desktop principal sem rolagem, celular com rolagem vertical por legibilidade. Quatro regressões de mosaico e seis jornadas completas/Excel24linhas também aprovadas; sem errosJS ou overflow horizontal. [Evidência](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json), campo `directExploration`. Primeiro ensaio contou pontos antes do cálculo terminar; instrumentação passou a aguardar o gráfico e a nova corrida completou.
- **Estado/próximo:** validado localmente; envio àmain conforme autorização vigente. Publicação e aceite desta revisão no site pendentes. Cadência/origem oficiais, precisão independente e contrato de importação permanecem abertos. Materiais privados ignorados; alterações paralelas preservadas.
- **Monday:** [Estimativas de vendas por empreendimento](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; somente referência, sem escrita.

### 28/10/2026 — Estimativas: controles abertos e exploração dentro do card

- **Pedido/entrega:** Gabriel testou o mapa e pediu menos caixas e expanders. Resumo aberto e grupos de busca, duração, disponibilidade e tipo expostos; cidade só quando necessário. Listas extensas de outros/esgotados usam Dialog. Mapa sem moldura, ações com estado sublinhado e cards arredondados localmente em8px, conforme solicitação explícita; tokens globais intactos.
- **Interação:** card contém botões irmãos para selecionar e explorar, sem aninhamento; abrir curva preserva seleção e fechar devolve foco ao acionador. Cor, hachura, motores e contratos preservados. Detalhes no refinamento editorial da seção10 do [plano](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md).
- **Evidência:**23testes da experiência, tipos/lint/build e quatro cenários de mosaico +seis de jornada completa aprovados em Chromium local, com dados sintéticos. Sem errosJS/overflow ou chamadas extras; Excel24linhas reaberto. [Registro](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json), campo `editorialRefinement`.
- **Estado/próximo:** validado localmente, entrega destinada àmain conforme autorização de envio vigente. Publicação e aceite desta revisão em produção pendentes; sem nova API autenticada, alteração de motores ou homologação de importação. Alterações paralelas preservadas.

### 28/10/2026 — Estimativas: mapa mini/detalhado implementado

- **Entrega:** mosaico inicial com miniaturas SVG percentuais, modos mini/detalhado, faixa de inspeção e lista alternativa. Seleção compartilhada, destaque oliva, Finotti primeiro, ordenação por nome/vendas, paginação 500/60. Cor significa unidades previstas, hachura ausência de referência; eixos comuns e lacunas preservadas. Motores, detalhe/backtest e Excel reutilizados.
- **Execução:** resumos no worker em blocos de16, cache e prioridade inferior às interações; não faz novas chamadas à API para mudar filtros/vistas. Plano técnico na seção10 do [fluxo essencial](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md); [evidência](../features/estimativas-vendas/EVIDENCIAS_MAPA_CURVAS_2026-10-28.json).
- **Validação:** 114Vitest/16arquivos,15Node operacionais, tipos/lint/build aprovados. Chromium local com146/478/501cadastros sintéticos e regressão completa1440/768/390 claro/escuro, seleção, detalhe/backtest, comparação e Excel24linhas; sem errosJS/overflow ou consultas extras. Ajuste de contraste conferido visualmente. Tokens intactos. Nenhuma nova leitura autenticada de base real nesta revisão.
- **Estado:** implementação `8ae89a3` enviada a origin/main em 28/10 por autorização de Gabriel; main/origin 0–0 conferido após o envio. Publicação e produção não verificadas; contratos externos e precisão independente continuam pendentes. Alterações paralelas preservadas.
### 28/10 — Estimativas: simplificação após grill de uso — Gabriel / Codex

- **Mudança:** entrada só com território hierárquico (vários estados/cidades), sem banner/IDs/modalidades. Finotti primeiro, card selecionável com destaque oliva, exploração separada e origem no último dado de cada empreendimento. Períodos disponíveis com anterior/próximo substituem calendários/sliders. Comparação padrão em percentual/tempo relativo, detalhe em acumulado de unidades e Excel direto após revisão.
- **Código:** retiradas as jornadas UI Preparar lote/Estudos científicos e seus componentes exclusivos, por decisão explícita de Gabriel. Motores, políticas e testes de cálculo preservados. Origem/cadência/importação continuam sem semântica inventada.
- **Validação:** 109 testes da feature e 15 contratos operacionais; tipos/lint/build e matriz Chromium local 1440/768/390 claro/escuro, Excel reaberto com origens diferentes, sem consulta adicional na exploração. [Decisões e evidências](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md#9-simplificação-após-grill--decisões-e-execução-em-2810). Sem nova consulta autenticada nesta revisão e sem push/deploy.
- **Envio autorizado em 28/10:** Gabriel autorizou o push da simplificação `a2b73d8`, acompanhada de `c9366a7` (tipagem de teste Excel). Fetch conferido sem novidades e gate documental aprovado. Publicação da nova revisão e verificação de produção ainda não confirmadas.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`, referência somente.

### 28/10 — Estimativas: fluxo essencial V1 e integração da main — Gabriel / Codex

- **Entrega:** universo autorizado → curvas → exploração temporal/backtest → seleção/carteira → pacote revisável. ZIP v2 usado seletivamente; matemática demonstrativa rejeitada. Worker persistente/cache limitado, gráficos largos, seleção independente de filtros e card curto de teste. Estudos científicos e operação anteriores preservados.
- **Arquivos/contrato:** [plano técnico e evidências](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md). ZIP/CSV/HTML/JSON e XLSX candidato com 26 colunas apenas para tipologia única/períodos novos; nenhuma linha homologada. Origem, cadência, preço, rateio e reconciliação externos continuam pendentes.
- **Integração:** merge autorizado `86b716e`, com três commits remotos de Excel/MCMV/garagem; alterações paralelas preservadas. V1 validada localmente, sem push/deploy. Registros verificáveis e resultados finais ficam no plano da feature.
- **Commit da implementação:** `d683df3`. Gate `check:live-docs origin/main HEAD` aprovado; tamanho LIVE permanece com aviso, e ensaio de rotação não encontrou entradas anteriores a21/10 elegíveis. Nenhuma entrada histórica foi descartada.
- **Sincronização para envio autorizado em 28/10:** merge `d1be35e` incorpora cinco commits novos do Edgar até `bc04d51` (Relatório API Excel); 81 testes desse módulo e build integrado aprovados. Conferência de três versões do LIVE: nenhuma linha não vazia perdida. Push autorizado por Gabriel; publicação e comportamento no site ainda precisam de conferência.
- **Validação:** 113 testes do estimador, 15 operacionais e 57 de Excel integrado aprovados; tipos/build/lint conferidos. API real local: 1.996 empreendimentos/21 páginas200, 76,17s carga e 78,06s primeira curva; 20 interações p50 95,80ms/p95 546,42ms, sem nova consulta de histórico ou erro JS. Pacote real reaberto com 26 colunas/12 linhas candidatas, IDs texto e campos pendentes vazios; nenhuma linha importável. Matriz visual e fonte de cada evidência no plano.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; referência somente, sem escrita.
### 28/10 — Relatório API Excel: totais históricos por empreendimento — Edgar / Codex

- **Mudança exclusiva:** oito métricas disponíveis Por empreendimento: estoque, distratos, vendas brutas/líquidas e respectivos VGVs. Soma todas as tipologias observadas por período, incluindo Garden/Cobertura; trimestre soma fluxos e última posição de estoque por tipologia. VGV preserva preços próprios/regras atual-período e escala só na exportação. Campo ausente em fechamento deixa total vazio; tipologia sem fechamento não contribui. Mesma tipologia repetida idêntica não duplica total; divergência bloqueia. Cadastro/unidades totais/médias/MCMV não somados; Por tipologia intacto.
- **Validação:**81 testes em seis arquivos aprovados; mensal/trimestral nos dois modos monetários e layouts, escala XLSX reaberto, zero/saldo negativo, lacunas, campo ausente e duplicação/conflito. Tipos/lint/build aprovados. Navegador1440/390 claro/escuro com API simulada: duas tipologias geram uma linha, estoque25, vendas9, distratos2, VGV estoque10.400.000 na escala padrão, prévia/download com quatro chamadas de coleta e zero erro de página. Evidência local ignorada verify-building-totals.cjs em .local-inputs/api-excel-check. Sem consulta autenticada ou alteração no coletor/AELO/Dashboard.
- **Etapas/Pendências:** implementação local, publicação/aceite real dependem de autorização; base d027157, commit desta entrada. Fetch sem novidades; quatro commits anteriores preservados. Sem push/Monday.
- **Monday:** —

### 28/10 — Relatório API Excel: nível explícito e colunas compatíveis — Edgar / Codex

- **Mudança exclusiva:** seletor Nível do relatório com Por empreendimento/Por tipologia (padrão), reutilizando Select e ReportFieldLabel/Tooltip Brain. Substitui agrupamento automático por campos. Motor agrupa por ID/período ou ID antes da projeção; não exige exportar ID. Seleção apenas exporta, removendo campos incompatíveis ao trocar nível e invalidando download. Por empreendimento oferece só cadastro, total de unidades, médias e MCMV; campos específicos e métricas de tipologia não constam nem no motor/Excel. Nome do arquivo informa nível.
- **Validação:**74 testes em cinco arquivos; motor nos dois layouts, período oculto, ID não exportado, seleção todas, ausências, conflitos, preservação dos dados, reabertura XLSX e interface alternando nível sem consulta extra. Tipos/lint/build aprovados. Navegador1440/390 claro/escuro com API simulada: tipologia padrão, mudança de nível, remoção dos campos incompatíveis, download invalidado/regerado, prévia e XLSX com uma linha/30unidades sem soma, nome identificando nível, quatro chamadas de coleta e zero erro de página. Evidência local ignorada verify-level.cjs/capturas em .local-inputs/api-excel-check. Sem API autenticada/aceite real. Padrões de carregamento existentes preservados.
- **Etapas/Pendências:** implementação local, publicação/aceite real pendentes; base1d6ad7e, commit desta entrada. Fetch de ambos sem novidades, três commits locais anteriores preservados. AELO/Dashboard/coletor intactos; sem push/Monday.
- **Monday:** —

### 28/10 — Relatório API Excel: agrupamento por seleção de cadastro — Edgar / Codex

- **Mudança exclusiva:** selecionar ID Empreendimento com campos apenas de empreendimento agrupa por ID/período no tabular e ID no horizontal. Campos de tipologia/métricas de vendas/estoque mantêm detalhe. Ocultar Período não elimina meses distintos. Médias/totais não são somados; lacunas usam valor disponível do mesmo grupo; valores preenchidos conflitantes bloqueiam com orientação. Regra descrita em Selecionar colunas, aplicada só ao gerar, prévia/XLSX iguais.
- **Validação:**64 testes de motor/MCMV aprovados; casos agrupados e detalhados nos dois layouts, períodos ocultos, duas identidades, lacunas, conflitos, preservação dos brutos e XLSX reaberto. Tipos/lint dirigidos. Sem consulta autenticada/regeneração integral de Campinas ou novo ensaio visual.
- **Etapas/Pendências:** implementação local concluída; publicação depende de autorização. Base4053ca4; commit desta entrada. Fetch desta etapa recusado pelo ambiente: comparações usam últimas referências disponíveis; sem push, merge ou alegação de remotes atualizados. Auditoria local preservada.
- **Monday:** —

### 28/10 — Relatório API Excel: preço usado na Faixa MCMV — Edgar / Codex

- **Mudança exclusiva:** campo selecionável Preço Médio para Faixa MCMV após Faixa MCMV, com o mesmo resultado quantity-standard passado ao classificador. Tabular usa período da linha; horizontal conserva posição final e série histórica. Não altera fórmula/limites/elegibilidade. Reais com duas casas em prévia/XLSX, sem escala VGV; sem base válida fica vazio.
- **Validação:** testes dos dois layouts com janeiro100.000/fevereiro275.000, exclusão de Garden, independência da média geral/escala VGV, seleção e XLSX reaberto com valor numérico e duas casas. Tipos/lint dirigidos; sem API autenticada ou ensaio visual novo.
- **Etapas/Pendências:** implementado localmente, publicação aguarda autorização; base66cce08, commit desta entrada. Sem push/Monday. AELO/Dashboard intactos.
- **Monday:** —

### 28/10 — Relatório API Excel: unidades totais e conferência da base MCMV — Edgar / Codex

- **Análise:** confirmado que MCMV atual e histórico usam quantity-standard: soma price×qty / soma qty somente tipologias Padrão, excluindo Garden/Cobertura. Mantida regra anterior até confirmação explícita de incluir todas as tipologias.
- **Mudança exclusiva:** coluna selecionável Unidades Totais do Empreendimento após Unidades por Tipologia, usando data.total_units cadastral (campo também mapeado no Dashboard, sem alterá-lo). Repetido por linha, sem somar históricos/tipologias e sem fallback quando ausente.
- **Validação:** testes de prévia e reabertura XLSX nos dois layouts para número/texto numérico, zero e ausências; tipos/lint dirigidos. Sem consulta autenticada. AELO/Dashboard e fórmula MCMV intactos.
- **Etapas/Pendências:** coluna implementada localmente; confirmação de eventual mudança da média MCMV para todas as tipologias e publicação pendentes. Base1a82104; commit desta entrada. Sem push/Monday.
- **Monday:** —

### 28/10 — Relatório API Excel: Garagem textual — Edgar / Codex

- **Correção:** Garagem passa a preservar o texto de typologies_history[].garage no último fechamento da tipologia até o corte. Removida a conversão numérica que descartava descrições como “1 vaga” e “1 a 2 vagas”. Nulo/ausente permanece vazio; zero é conservado como texto. Sem mudança de API, histórico, AELO ou Dashboard.
- **Validação:** teste de prévia e XLSX reaberto nos dois layouts com descrições, espaços, zero e ausências; tipos e lint dirigidos. Consulta autenticada não executada; a correção usa o contrato textual confirmado pelo usuário.
- **Etapas/Pendências:** correção local, publicação aguarda autorização; base079bdcd, commit desta entrada. Sem push/Monday.
- **Monday:** —

### 28/10 — Relatório API Excel: histórico desde lançamento e Faixa MCMV por período — Edgar / Codex

- **Diagnóstico:** planilha Campinas fornecida com132.427 linhas/151 períodos/877 pares empreendimento-tipologia.82.118 linhas anteriores ao lançamento e22.081 posteriores com todas as métricas vazias; preços presentes em28.228. O tabular cruzava todos os períodos globais com todas as tipologias. Exemplo Midtown Aquidaban: lançado ago/2014, exportado desde mai/2002. Sem payload bruto não se atribui cada lacuna à API.
- **Mudança exclusiva:** histórico a partir do mês de release_date, inclusive em trimestre parcial; períodos anteriores excluídos da coleta local de históricos/limites, sem alterar requisições. Tabular só emite períodos com fechamento; horizontal mantém união de períodos com lacunas vazias. Não inventa preços/vendas/estoques nem preenche ausência com zero.
- **MCMV:** campo imediatamente após Padrão. Tabular calcula por mês/trimestre, ponderação quantity-standard exclusiva; horizontal conserva faixa final e acrescenta série histórica no mesmo bloco após Padrão. Seleção Faixa MCMV expande períodos somente na geração. Tetos do JSON original2026 também usados no histórico, sem afirmar tetos normativos passados. Regras e ausência de lançamento descritas na interface/doc da feature. Atualização por upload/Supabase cancelada permanece ausente.
- **Validação/limites:**64 testes em cinco arquivos, tipos/lint/build aprovados; limites MCMV, mudança de faixa mensal, trimestre de lançamento, seleção, exportação e reabertura XLSX. Navegador desktop1440/claro com rede simulada: coluna selecionável, descrição MCMV, hover/foco e quatro chamadas de coleta, sem erro de página. Ensaio de vários temas/larguras interrompido por timeout de hover; smoke desktop repetido aprovado. Mobile/escuro desta revisão e consulta autenticada/regeneração integral de Campinas com dados brutos não concluídos. Padrões de seleção/descrições existentes reutilizados, sem alterar carregamento ou componentes compartilhados. AELO/Dashboard intactos.
- **Etapas/Pendências:** ajuste local concluído, aguarda publicação autorizada e nova geração pelo usuário. Base0e01278; commit desta entrada. Sem push/Monday. Auditoria local preservada.
- **Monday:** —

### 28/10 — Relatório API Excel: Faixa MCMV — Edgar / Codex

- **Mudança:** nova coluna fixa selecionável Faixa MCMV, exclusiva de Vertical Econômico/Standard; acrescenta o sufixo da faixa e preserva Padrão. Média exclusiva ponderada pela oferta lançada somente tipologias Padrão, na última posição até o mês final, independente das opções gerais de média, visão e VGV. Calculado somente em Gerar relatório após coleta completa. Coletor/AELO/Dashboard intactos.
- **Fonte:** planilha municipal fornecida, 5.571 chaves únicas UF/cidade, tetos positivos. Faixa2 até teto; Faixa3 até400.000; Faixa4 de400.000,01 até600.000, conforme confirmação. Sem teto conhecido, elegibilidade ou média válida: vazio. Tabela derivada/SHA-256 e regras em docs/features/relatorio-api-excel.md; descrições na seção2 da interface.
- **Validação:** 61 testes em cinco arquivos, incluindo limites em centavos, correspondência municipal, média exclusiva, ausência de Padrão, corte temporal e reabertura XLSX nos dois layouts. TypeScript, lint dirigido e build aprovados. Navegador com rede simulada; consulta autenticada e aceite com dados reais não executados.
- **Etapas/Pendências:** implementação local concluída; publicação aguarda autorização. Base atualizada por fast-forward para7cacaf8, preservando auditoria local. Padrões de seleção de colunas e descrições existentes reutilizados; sem novo controle/carregamento. Sem push/Monday.
- **Monday:** —

### 27/10 — Estimativas: protótipo Claude Design adaptado — Gabriel/sessão
- Estado: validado localmente; push autorizado por Gabriel. [Fonte, decisões e limites](../features/estimativas-vendas/PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md#10-adaptação-do-zip-claude-design-e-envio-autorizado--2710).
- Jornada em etapas, período/timeline, amostra/métodos, cartões/proporções/sobreposição, níveis de evidência, explicações dos gráficos, painel de ajustes e premissas recolhidas após cálculo. Dados/motores/guardas e Preparar lote preservados.
- ZIP original ignorado; textura de marca incorporada. Tokens SE intactos; não transportar cálculos, limites, cores/tokens ou backend fictícios do protótipo.98testes/tipos/lint/build e QA responsiva do preview; nenhuma nova alegação estatística. Publicação/site ainda exigem conferência após envio.
- Monday: [Estimativas de vendas](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`. Nenhuma escrita.

### 27/10 — Bancada científica Curitiba local — Gabriel/sessão
- Estado: validado localmente, sem push/deploy. [Execução, testes e limites](../features/estimativas-vendas/PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md#9-execução-local-em-2710--evidência-e-limites); evidência agregada vinculada ali, brutos ignorados.
- Entrada por estudos/condições, retrospectiva em worker, métricas pareadas, gráficos amplos, detalhe/equação, carteira/sobreposição e ZIP de evidências. Preparar lote e motores Finotti preservados; Excel opcional reutilizado. Sem edição de parâmetros ou ampliação silenciosa do domínio.
- API Curitiba: 1.996 empreendimentos/413.279 linhas, 21 páginas200; 37 horizontais/347 verticais nas condições consideradas, 186 estoques antigos e 1.313 esgotados (grupos podem se sobrepor). Comparação com estoque reportado, não coleta comprovada ou validação independente Finotti.
- 98 Vitest + 15 Node, tipos/lint/build; Chromium390/768/1440 claro/escuro e preview compilado; API real na UI, zero erroJS e zero consulta adicional na análise/exportação. Preview com API real: carga76,27s/cálculo19,40s numa medição; contagens37/347 confirmadas no ZIP.
- Próximo: ZIP/aceite visual, proveniência/cadência e protocolo independente antes de ajustar modelos ou calibrar faixas. Contrato/importação/reconciliação continuam pendentes.
- Monday: [Estimativas de vendas](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`. Nenhuma escrita.

### 27/10 — Plano da bancada científica Curitiba e handoff visual — Gabriel/sessão
- Estado: preparado; documentação local, sem nova UI, consulta Curitiba, backtest, push ou deploy.
- Plano/CTA técnico: [bancada científica](../features/estimativas-vendas/PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md). Briefing/CTA Claude Design vinculado pela baseline; contratos e testes de temporalidade, amostra comum, origem e estados de interface definidos.
- Próximo: prototipação por Gabriel/Claude Design; implementação local via CTA, preservando operação. Homologação/importação e cadência/origem continuam pendentes.
- Monday: [Estimativas de vendas](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) ? `13096757074`. Nenhuma escrita no Monday.

### 27/10/2026 — Estimativas: explicar curvas de Rio Branco com dados reais — Gabriel / Codex

- **Diagnóstico:** [exemplos e limites das contagens](../features/estimativas-vendas/BASELINE_OPERACIONAL_E_PLANO_2026-10-27.md#explicação-com-rio-branco--reprodução2710). Consulta somenteleitura reproduz29/23coleta/4pendência/2semmodelo e11resultados da referência;5jáesgotados/6comestoque. Coleta não impede cálculo. ExemplosEcovillage/PortalViaVerde/Orquídeas/BosquePrimavera/IlhaDeCreta/SwissPark documentados; sem extrapolar coeficientes ou inferir tipo pelo nome.
- **Evidência/estado:** script `estimativas-rio-branco-explain.mjs`, replay e hashes na baseline;2respostas200, mesmoscontratos e motores da página. Diagnóstico validado localmente, não precisão comercial. Nenhuma interface/regra alterada ou escrita naAPI.
- **Pendências:** melhorar comunicação de suporte matemático versus decisãooperacional e distinguir esgotados na contagem; origem/cadência/granularidade continuam abertas. Sem push/deploy desta revisão.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — referência, sem escrita.
### 27/10/2026 — Estimativas: primeira jornada após o grill — Gabriel / Codex

- **Entrega:** [premissas confirmadas e fatia local](../features/estimativas-vendas/BASELINE_OPERACIONAL_E_PLANO_2026-10-27.md#decisões-de-experiência-confirmadas-no-grill--continuação2710). Entradas região/UF/cidades/IDs autorizados, dois tipos juntos, resumo/lista, proposta com Incluir/Retirar, filtros independentes e detalhe amplo. Comparação de métodos sem edição de entradas/parâmetros, sem fallback automático; inventário de situações por frequência. Conferência Excel existente em diálogo próprio.
- **Evidência:** 70 testesVitest, tipos/lint/build; quatro percursos locais390/1440 claro/escuro com fontes sintéticas, foco/Escape/paginação/download/composição e Brain sem overflow/erro. Scripts estimativas-operational-browser/live em diagnostics; fontes/capturas ignoradas. Consulta real e limites registrados na baseline.
- **Etapas/pendências:** preparado/validado localmente conforme evidência, sem push/deploy. Referência calculável não é aprovação operacional; cadência/origem por competência, equivalência da preparação, granularidade, partição da metade, preço e saídaIVV ainda impedem lote importável. CSV/JSON são conferência, não retornoBelogic. Próximo revisão humana da jornada e completar contratos, sem inventar nova modelagem.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — leitura/referência, nenhuma escrita.

### 2026-10-22 — Finotti: API confirmada e plano do dossiê/simulador — Gabriel / Codex
- **Ambiente/funcionalidade:** Rebrain/SID, Estimativas de vendas; diagnóstico somente leitura, sem interface ou backtest real.
- **O quê/por quê:** autenticação local e histórico horizontal Geobrain confirmados em Fortaleza e Blumenau. Auditoria agregada identifica campos, reconciliação brutas−distratos, meses negativos, rótulos de produto e ausência de flag observado/estimado por competência na resposta. Gabriel/Codex passam a conduzir implementação/dossiê; Edgar apoia esclarecimento de acesso/contrato em paralelo, conforme direção de Gabriel.
- **Evidência/estado:** [plano e números da sondagem](../features/estimativas-vendas/PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md), `scripts/diagnostics/estimativas-api-audit.mjs`; HTTP 200 para cidades monitoradas/histórico, 43 empreendimentos e 2.965 linhas em Fortaleza, 38 e 1.754 em Blumenau. Estado **preparado** para retrospectiva; nenhum mês tratado como gabarito observado sem linhagem confirmada.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; leitura de referência, sem escrita.
- **Impacto em Etapas/Pendências:** fonte API viável; próximo adaptar payload bruto sem trocar nulo por zero, fechar origem por período, revisar vendas negativas, rodar comparação pareada e só então habilitar simulador de teste. Push/deploy não feitos nesta sessão.

**Complemento documental de22/10 — Gabriel/sessão, estado preparado.** Diego encaminhou resposta de Evandro: `bases.estimation` é a única flag da base/período estimado; `bases.ivv_batch_id` rastreia atualizações IVV em lote. A API sondada não mostra a flag por linha mensal, portanto o histórico continua sem gabarito confirmado. Gabriel buscará exportação real para confrontar esquema e API; enquanto isso, pediu primeira página editorial funcional só com leitura da API, empreendimento isolado/carteira, gráfico interativo e responsivo, explicação recolhível e exportação **de revisão**. [Plano de implementação e CTA](../features/estimativas-vendas/PLANO_PAGINA_EDITORIAL_API_2026-10-22.md); nenhuma UI ou upload executado neste complemento. Monday de referência acima, sem escrita.

**Auditoria posterior de22/10 — mesma frente, estado preparado.** Exportação real da Análise Temporal Geobrain tem seis abas agregadas/84 competências e não contém ID/flag da base; `NaN` em linhas de variação e zeros sem prova de coleta mensal. Segunda exportação recebida contém cadastro de204 empreendimentos **verticais**, sem histórico ou flag. Manual Linkages explica a tela, ficha individual e download detalhado do Mapa, mas não fornece contrato de retorno. API autorizada retornou Guarapuava29 horizontais/1.167 linhas; Guaratuba não consta nas355 cidades do token e retornou HTTP422. Brutos preservados em `.local-inputs/` com hashes; [auditoria](../features/estimativas-vendas/AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md), plano e CTA atualizados para paridade apenas com recorte idêntico e próxima amostra horizontal por competência. Sem UI/backtest homologado/push/deploy ou escrita Monday.

### 2026-10-21 — Estimativas Finotti: motor horizontal e ensaio de corte — Gabriel / Codex
- **Ambiente/funcionalidade:** Rebrain/SID, código local em `src/features/estimativas-vendas/`, sem rota ou integração Geobrain.
- **O quê/por quê:** coeficientes do slide 7 versionados à parte do motor puro; caso fechado 300/150/6 reproduzido (`k=0,632035`, 65,84% no mês 12, 75,04% no 18, cruzamento de 95% no 61 e contagem ilustrativa até 67). Ensaio em memória congela origem e compara curva com médias de 3/12 meses, omitindo cauda e extrapolação da métrica.
- **Evidência/estado:** [reprodução e handoff](../features/estimativas-vendas/REPRODUCAO_E_HANDOFF.md), testes focados de matemática e corte, tipagem e lint locais; nenhum dado real processado, nenhuma regra da cauda mensal ou banda inventada. Estado validado localmente apenas para a reprodução matemática; teste retrospectivo real pendente.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; sem escrita.
- **Impacto em Etapas/Pendências:** M1 parcial e estrutura de M2 preparados; próximo obter MD/código e exportação/retorno Geobrain com Edgar, confirmar domínio/cauda/bandas e avaliar um recorte observado. Push/deploy pendentes de autorização.

### 2026-10-21 — Estimativas de vendas Finotti: pacote técnico inicial — Gabriel / Codex
- **Ambiente/funcionalidade:** Rebrain/SID, futura feature Estimativas de vendas; status PLANEJADA, sem motor/rota runtime.
- **O quê/por quê:** contexto da reunião19/10, email21/10, equação horizontal, coeficientes, dados dos slides, regras históricas Monday, contrato candidato e roteiro de validação reunidos para conversa técnica dedicada. Rebrain é o destino do exercício; Edgar conduz/Gabriel apoia, integração Geobrain posterior.
- **Arquivos:** [índice](../features/estimativas-vendas/README.md), [manifesto](../features/estimativas-vendas/MANIFESTO.md), fontes, contrato/validação e CTA. PPTX copiado com hash verificado para `.local-inputs/estimativas-vendas/2026-10-21/`, ignorada; original preservado.
- **Evidência/estado:** dez slides e caches de quatro gráficos extraídos, links internos/manifesto verificados. Somente preparação documental; MD/código original, bandas, vertical, contrato oficial e teste retrospectivo real pendentes. Nenhuma UI, matemática executada, base real processada, escrita Monday, banco ou deploy. Commit isolado desta entrada e pacote; hash consultável pelo histórico da pasta.
- **Monday:** [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — `13096757074`; leitura apenas.
- **Impacto em Etapas/Pendências:** documentação inicial preparada; implementação e homologação não iniciadas. Próximo: recuperar insumos/contrato e reproduzir o caso fechado300/150/6 com as limitações descritas.

### 2026-10-21 — Empresas: fallback mensal com competência explícita — Gabriel / Codex
- **Mudança:** proxy BigQuery passa a informar disponibilidade e vínculos entre estabelecimentos e empresas; materializador tenta até seis competências em ordem decrescente e publica somente carga íntegra. Cargas já publicadas são preservadas. Interface e exportações mostram a competência efetiva e aviso quando anterior ao alvo; rechecagem da fonte em até 24 horas.
- **Evidência/estado:** código em `supabase/functions/empresas-*`, `src/features/empresas-empregados/` e `Sistema-Quanti/Sistema Novo/gcp/bigquery-proxy/`; testes focados, tipagem e build locais. Acesso de julho a maio/2026 sem linhas visíveis e abril disponível em consulta agregada de São Paulo (2.702.140 estabelecimentos com vínculo); sem materialização remota nesta etapa. Estado validado localmente; deploy do Cloud Run antes das três Edge Functions e Publish frontend, seguido de teste em São Paulo e cidade já publicada, pendentes.
- **Monday:** [reBrain — Empresas e Empregados](https://brain381753.monday.com/boards/18398428946/pulses/12880655319) — `12880655319`; sem escrita no card.

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


## 2. Etapas

- **12/11 — PPTX SP/Fortaleza60/89:** exportação com objetos editáveis validada em arquivo real e PowerPoint; listas nativas e consultoria individual. Publicação desta correção pendente.


- **12/11 — Fortaleza e SP:** edição na prévia implementada localmente, com Tahoma/títulos e exportação da mesma composição; mensal Fortaleza usa cobertura municipal observada para liberar fontes completas. Conferência real pós-publicação e homologação continuam abertas.


- **Fortaleza mensal (12/11):** diagnóstico real de agosto confirma bloqueios além do fechamento. Correções locais de paginação, estados editoriais e bairro não informado; matriz municipal detalhada preparada para próximo JSON, sem declarar fontes todas resolvidas.


- **Fortaleza trimestral (12/11):** 89 posições com implementação local; validação final/exportação real pendentes. 11–20 commitado localmente;21–89sem commit. Mensal60mantido. Ver [retomada](../features/relatorios-institucionais/fortaleza/TRIMESTRAL_2026-11-12.md).


- 🟡 **SP — amostra histórica/manchetes12/11:**346testes e24ensaiosEdgeaprovados; envio autorizado. Exibe observações históricas parciais válidas com método explícito; equivalência com os13preços do analista ainda não concluída.

- 🟡 **SP — preços12/11:** seleção corrigida localmente com diagnóstico real,342testes e50ensaiosEdge.53parcial,55/57com oito lacunas preservadas;59aceita4exatos,61–64recuperam cálculos identificados. Publicação e nova geração/JSON pendentes.

- 🟡 **Fortaleza mensal —11/11:**60posições e PDF/PPTX de conferência implementados localmente; ensaios sintéticos/Office/PDF aprovados. Sem homologação real. Trimestral10/89, próximo11–20. [Estado atual](../features/relatorios-institucionais/fortaleza/MENSAL_EXPORTACAO_2026-11-11.md); supera pendências de implementação mensal nas entradas históricas abaixo.

- 🟡 **SP Institucional — revisão11/11:** correções visuais/Top10/fotos/exportação verificadas localmente; publicação pendente. Escoamento adiado por Lucas, preços/histórico aguardam conciliação de método/base. [Entrega](../features/relatorios-institucionais/sp/CORRECOES_ANALISTA_2026-11-11.md).

- **Fortaleza mensal60/JSON:** integrado em b6c6488,214testes e build aprovados; publicação autorizada. Próxima validação é o teste real/diagnóstico do usuário.

- 🟡 **Fortaleza mensal1–60:** todas as posições da prévia implementadas; diagnóstico JSON e editor final disponíveis localmente. Publicação/revisão real/homologação/exportação ainda pendentes.

- **Fortaleza46–55:** integrado ao remoto em c0441be com recortes automáticos, preservando Panorama; envio autorizado nesta sessão. Sem aceite remoto presumido.

- 🟡 **Fortaleza mensal46–55:** prévia1–55, IVV RM e tabelas implementadas;198testes +16regressões e visual sintético. Novo lote local; homologação/exportação pendentes.

- 🟡 **Fortaleza mensal36–45:** prévia1–45, preços/IVV candidatos e insights implementados;170testes +16regressões e visual sintético. Novo lote local, homologação/exportação pendentes.

- 🟡 **Fortaleza mensal —26–35,10/11:** prévia chega ao35dos60originais, dados condicionados à cobertura;164casos locais/regressões e visual aprovados. [Estado atual](../features/relatorios-institucionais/fortaleza/MENSAL_SLIDES_26_35_2026-11-10.md). Lote local; homologação/exportação ainda pendentes.

- 🟡 **Fortaleza mensal — lote12/14+16–25,10/11:** prévia1–25na ordem original, fontes segmentadas e cálculo/render dos doze novos slides. Validado localmente; método INCC e fontes reais aguardam homologação. [Estado atual](../features/relatorios-institucionais/fortaleza/MENSAL_SLIDES_12_25_2026-11-10.md).1e1767epublicado; novo lote local.

- 🟡 **Fortaleza mensal —10/11:**1–10e11/13/15 implementados localmente, histórico vertical automático25meses e insights;13composições, restante ainda pendente. [Estado atual](../features/relatorios-institucionais/fortaleza/MENSAL_LANCAMENTOS_2026-11-10.md), que atualiza os registros históricos de09/11 abaixo.

**05/11 — SP, equipe/consultoria:** cinco e quinze posições personalizáveis na prévia, com nomes/cargos e retratos separados no PPTX. Validado localmente com Edge/Office; publicar e conferir no site. Navegação do menu já publicada em219ed1c.

- 🟡 **Fortaleza — slides1–10 09/11:** prévia mensal/trimestral implementada/testada localmente; arte original preservada, renderização dinâmica ainda sem aceite de100%. Base anterior enviada até5439ffe; lote novo local. [Estado](../features/relatorios-institucionais/fortaleza/SLIDES_01_10_2026-11-09.md).

- 🟡 **Fortaleza — núcleo vertical09/11:** consulta municipal e prévia em4etapas implementadas/testadas localmente, referência mensal/trimestral explícita. Contrato granular, ensaio real e relatório completo ainda pendentes. [Contrato](../features/relatorios-institucionais/fortaleza/NUCLEO_VERTICAL_2026-11-09.md).

- 🟡 **Fortaleza/SINDUSCON — base09/11:** rota oculta e composição estrutural verificadas localmente, 89/60páginas reais inventariadas; sem indicadores/exportação integrados. [Estado atual](../features/relatorios-institucionais/fortaleza/PLAN.md).

- 🟡 **Fortaleza/SINDUSCON — 09/11:** G1 iniciado, dois modelos legíveis e matriz inicial documentados; sem implementação nova. [Plano](../features/relatorios-institucionais/fortaleza/PLAN.md).

**05/11 — Panorama territorial:** G0–G6validados localmente, sem push; [execução/roteiroG7](../features/Relatorios%20Secovi_FIERGS/PLAN_COMPARACAO_TERRITORIAL_PANORAMA_2026-11-05.md). Aceite anterior permanece, ampliação nova aguarda ensaio/aceite.
**05/11 — SP, textos institucionais5/7:** competência do perfil acompanha a geração; títulos/percentuais e seis cartões GeoBrain exportam como caixas editáveis. Validados localmente com Edge/Office; fonte editorial continua identificada, publicação/ensaio real pendentes.

**05/11 — SP, geração automática:** fluxo visual em oito etapas substitui os botões de coleta; cancelamento/retomada e insights do analista implementados e validados localmente. Publicação autorizada; teste autenticado e aceite permanecem distintos da implementação.

**05/11 — SP, relatório para conferência integral:** destaques com janelas explícitas, nove divisórias e comparativos destacados; exportador85posições com textos/células editáveis e auditoria embutida validado com fonte sintética/Office. Exportação de conferência implementada; exportações comerciais adicionais e homologação não estão concluídas.

**05/11 — SP, eficiência da coleta:** fila contínua com três vagas substitui lotes;278 regressões e lint aprovados. Ganho demonstrado em latências simuladas, duração real pós-publicação ainda por medir. Critérios de fonte e aprovação dos slides preservados.

**04/11 — SP, checklist (4):** ajustes51/53–59/78 validados localmente com274 testes, tipos/lint/build e navegador dirigido. Quantidades do78 preservadas com preço incompleto explicitado; controle de estoque aceita apenas soma municipal exata. Integração/publicação e novo ensaio autenticado pendentes, sem homologação automática.

**04/11 — SP, integração posterior:** merge7e699fc autorizado e concluído, preservação verificada e274 regressões aprovadas na base combinada. Integração deixou de ser pendência; ensaio real, fonte e editorial permanecem abertos.

- **Panorama — PPTX editável:** implementação validada localmente em03/11; [portões, evidência e limites](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md#7-execução-local-e-evidências--03112026). G6 depende de autorização/publicação/ensaio real e aceite das exceções institucionais; aceite dos dados anteriores preservado.
- **Panorama — PPTX editável:** implementação validada localmente e enviada ao Git até `92eeef0` em03/11; [portões, evidência e limites](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md#7-execução-local-e-evidências--03112026). G6 depende da publicação/conferência no site e aceite das exceções institucionais; aceite dos dados anteriores preservado.
**03/11 — SP, correção no consumidor:**51/53–59/78 tratados por regra explícita, com preservação/auditoria e parciais identificadas;271testes e navegador dirigido aprovados. Novo checklist autenticado pendente.

**03/11 — SP, pós-v2:** checklist real confirma68disponíveis/7parciais/2bloqueados/8referências. Casos de fonte/contrato identificados e material de encaminhamento pronto; diagnóstico78 refinado e267testes aprovados.

**03/11 — SP, fonte detalhada v2:** contrato da página1 observado pelo usuário, transporte adaptado/testado e preflight público confirmado. Coleta integral autenticada no site e paridade real ainda pendentes.

**03/11 — SP, campos temporais:** leitura de padrão/estágio por fotografia e diagnóstico nominal de falhas implementados;258testes e navegador dirigido aprovados, fonte real aguarda reteste.

**03/11 — SP, revisão dimensional geral:**85posições revisadas; guardas de detalhamento separadas por total, padrão, segmento e Econômico/MCMV.251testes e navegador dirigido aprovados; reteste real pendente.

**03/11 — SP, dimensão bairro:** total e meses iguais permitem ranking39 com ressalva explícita de padrão; guardas das outras dimensões preservadas.

**03/11 — SP, reconciliação de bairros:** diagnóstico agora discrimina valores trimestrais, mensais e por padrão; diferenças reais ainda não reconciliadas.

**03/11 — SP, caso33693:** prova recebida e regra excessiva corrigida para bairro ausente com vendas0 inteiramente comprovadas. Retestar coleção integral; demais problemas de fonte permanecem impeditivos.

**03/11 — SP, bairros:** diagnóstico agora identifica primeiro empreendimento/campo impedido. Ranking continua aguardando integridade da fonte; coletar a nova mensagem no acesso real antes de decidir correção de dado ou contrato. Automação segue adiada.

**03/11 — SP, período geral:** Ano/Trimestre e transporte histórico por janelas validados localmente, incluindo virada2027. Próximo reteste autenticado2T2026 para confirmar motivo/recuperação no acesso real; alteração no Git não prova deploy ou homologação.

**02/11 — Estimativas:** seção14 implementada e validada localmente (129Vitest+15operacionais, seis telas/temas+cinco estados e replay real); prévia/Excel na principal, análise detalhada preservada. Enviada a origin/main em `ad86e26` com autorização; publicação/aceite no site e formato Nicolas/Belogic pendentes.
**30/10 — SP, preparo dos testes:** checklist das85 posições e refinamentos validados localmente;211 testes SP+359 regressões Panorama, tipos reais/lint/build e navegador aprovados. Próximo ensaio autenticado da tela pelo usuário, seguido de revisão metodológica/editorial e exportação integral.

**29/10 ? SP, lote final:**85 posições com renderizador, após os28 finais. Mapas/indicadores dependem de fontes conferidas; institucionais conservam a edição identificada. Próximo: validar no token real, revisar com analista/editorial e preparar exportação integral. As entradas abaixo registram checkpoints anteriores; pendências de implementação dos28 foram superadas.

**29/10 — SP, quarto lote:** 51, 53–59 e 61/62 implementados localmente; 52/60 são divisórias preservadas. Preços e áreas compartilham históricos e reconciliam cobertura antes dos cálculos, com 198 testes aprovados. A próxima frente começa em63/64 e segue o estado atual do mercado. Revisão autenticada, pesos/método do analista e aceite permanecem abertos; não são 85 conteúdos concluídos.

**29/10 — SP, terceiro lote:** implementados 39–44,46–48 e50, somando dez conteúdos ao lote anterior. VGV vendido usa o INCC já definido; oferta, IVV e escoamento com fórmulas explícitas e ranking sob demanda, sem prender a prévia. 186 testes locais aprovados; validação autenticada e aceite metodológico seguem abertos. Próxima frente:51 e bloco de preços, preservando posições originais.

**29/10 — SP, segundo lote:** implementados localmente 23–30 e 32–38, incluindo INCC-DI com base única no mês disponível; 173 testes aprovados. Soma ao lote 13–22 e preserva 85 posições. Revisar cobertura real, classificação histórica e critério INCC com analista; publicação observada e exportação integral continuam pendentes.

**29/10 — SP, correção após teste e coleta granular:** setembro confirmado nas três séries por respostas do usuário, apesar da raiz de agosto. Descoberta do período pelas séries; diferença de balanço diagnóstica. Contagem do cadastro leve implementada sem bloquear municipal; agora no slide13original. Reteste publicado/cobertura real pendentes; raiz não limita séries.

**29/10 — SP Institucional:** estrutura original85restaurada, com pendentes explícitos; lote analítico13–22implementado localmente, usando cadastro existente e série municipal de unidades.149testes e QA local; validar cobertura histórica/classificação/valores reais.85posições não são85conteúdos prontos. Publicação verificada/exportação/homologação integral permanecem pendentes.

**29/10 — Estimativas:** Gabriel reabriu a frente para prévia configurável no modal:50linhas, ordem/ocultação aplicadas ao Excel completo. Implementada e validada localmente (122testes), publicação/aceite desta revisão pendentes. Interface anterior aceita em produção por Gabriel em28/10 após envio`9d14f2a`. Fonte/limites na seção13 do plano essencial. Contrato final de saída Nicolas/Belogic, importação e avaliação independente continuam abertos.

**22/10 — Estimativas de vendas Finotti:** reprodução matemática local e acesso API somente leitura confirmados; [plano do dossiê](../features/estimativas-vendas/PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md), [auditoria das exportações](../features/estimativas-vendas/AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md) e [plano da página editorial](../features/estimativas-vendas/PLANO_PAGINA_EDITORIAL_API_2026-10-22.md) definem fontes, recortes, carteira e interface. Guarapuava/Maringá conciliou 72 empreendimentos/124 tipologias horizontais e oito trimestres com a API/Série Histórica. Curitiba ampliou a evidência: 371 empreendimentos/693 tipologias horizontais, 14.154 vendas e 14.154 estoques numéricos comparáveis iguais à API em 11/2024–09/2026. A API preenche posições `-` do Excel, e um vertical exportado falta na API; completude não é idêntica. `bases.estimation` foi confirmado para a base/período por mensagem encaminhada, mas a linhagem ainda não aparece por competência na série API nem no Excel. Contrato oficial, retrospectiva observada, cauda mensal, bandas, UI e retorno continuam pendentes. A página horizontal poderá usar API direta, com auditoria de cobertura separada. Sem runtime publicado nesta etapa.

**22/10 — direção visual/funcional adicional de Gabriel, ainda preparada:** a primeira página API terá editorial amplo inspirado nas capturas dos slides Finotti, gráficos grandes, laboratório da equação e conferência **opcional** por Excel já na interface. O usuário verá os filtros necessários e o [exportador Análise Temporal Excel](https://app.geobrain.com.br/analise-temporal-excel); o arquivo será lido localmente para paridade por ID/competência, sem substituir a API nem enviar dados. [Plano](../features/estimativas-vendas/PLANO_PAGINA_EDITORIAL_API_2026-10-22.md) e [CTA](../features/estimativas-vendas/CTA_IMPLEMENTACAO_PAGINA_API.md) atualizados. Nenhuma tela ou teste estatístico real entregue neste refinamento.

**15/10 — Corretor F1–F6:** preparação/revisão validadas localmente; registro de execução e prévias têm limites de ativação/infraestrutura no resultado F1–F6. A2/A3/F3 servidor não encerradas.

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
| 7a | **Panorama Secovi/FIERGS** — automatização do deck trimestral | 🟡 (retorno horizontal de 06/10: contingência por produto auditado para sete condomínios aplicada no código; falta conferir PDF/CSV 2T2026 da nova versão e obter aceite. Homologação aberta. PPT editável segue para V3.) |
| 8 | API Explorer (OpenAPI + console) | ✅ |
| 9 | Qualidade CID / Piemonte | 🟡 (CID em standby) |
| 10 | Atualizador VGV V1 — operação client-side | 🟡 (motor, UI padronizada, mapa urbano, testes e build ✅; homologação pelo setor usuário pendente) |

---

## 3. Pendências

- **12/11 — Exportação de relatórios, correção atual:** autorizar push e conferir os três relatórios reais após deploy. Gráficos exportados como formas; eventual exigência de planilha Excel/Editar Dados precisa de um contrato adicional de gráficos nativos.


- **12/11 — Fortaleza/SP, entrega atual:** autorizar publicação desta correção, gerar mensal agosto novamente e conferir os números com o analista. Prévia manual permanece na sessão; fotos de consultoria SP disponíveis só no composto original podem exigir upload para maior resolução.


- **Fortaleza mensal:** publicar correções somente após autorização; gerar agosto e conferir cobertura municipal agora preservada. Categorias/meses ausentes e fotografia de outubro ainda não reconciliados. Ver [diagnóstico](../features/relatorios-institucionais/fortaleza/DIAGNOSTICO_MENSAL_2026-11-12.md).


- **Fortaleza trimestral:** repor créditos do workspace para a revisão automática voltar a autorizar ensaios elevados; repetir regressões após ajuste do IVV mensal, capturas aguardando imagens e downloads PPTX/PDF89. Depois commit isolado e autorização de push; homologação real separada.


- **SP — comparação de médias12/11:** comparação estoque/qty/simples preparada localmente; publicar com autorização e obter novo diagnóstico real. Não alterar o preço geral antes de conferir hipótese nos13períodos.

- **SP — após publicação12/11:** nova geração/JSON para observar pontos recuperados; identificar consulta/universo/ponderação da média geral e recortes semMCMV. Mostrar amostra parcial não resolve divergência com o original. Não declarar falta de dados naAPIapenas pela divergência de conciliação.

- **SP — preços12/11:** seleção de fontes corrigida localmente após JSON real; autorizar envio e gerar novamente. Confirmar grupo4e linha/série calculada; oito lacunas antigas53/55/57e agregado municipal único continuam em aberto. Estado supera a pausa aguardando JSON registrada abaixo.

- **Fortaleza —11/11:** autorizar envio da exportação mensal, gerar/inspecionar dados reais e diagnostico pareado; fechar amostra/empresas, universo/capacidade, preços/IVV/INCC e equipe. PDF/PPTX mensal não é mais pendência de implementação. Próxima fatia trimestral11–20, com janela/fonte próprias; demais estados abaixo são históricos.

- **SP — revisão11/11:** publicar o lote com autorização e conferir nova saída no ambiente do usuário; conciliar preços/cobertura histórica com a mesma fotografia e critério do analista. Escoamento fica separado para retomada posterior, conforme Lucas. Fotos melhoradas apenas até a resolução disponível no original; não declarar todas HD. [Contrato](../features/relatorios-institucionais/sp/CORRECOES_ANALISTA_2026-11-11.md).

- **Fortaleza mensal após60:** autorizar envio, gerar teste real e analisar JSON; revisar fontes/INCC/preços/IVV/capacidade/amostra/equipe e exportação. Não há outros slides mensais. Depois, correções estéticas/diagnóstico SP indicadas pelo usuário. Trimestral segue separado.

- **Fortaleza mensal após46–55:** implementar56–60, revisar conjunto/exportação e homologar fontes/metodologia; validar capacidade histórica/universo ativo, bairro, preço/IVV e diferenças entre fontes. Estados abaixo são históricos, sem retirar amostra/empresas do2da fila.

- **Fortaleza mensal após36–45:** implementar46–55e56–60, exportação; validar ponderação dos preços, área de lotes, IVV e fontes reais, além de amostra/INCC/metodologias anteriores. Estados abaixo preservam o histórico;36–45não são mais pendência de implementação.

- **Fortaleza mensal — após26–35:** próximos36–45e46–60, exportação e homologação de fontes/INCC/produtos/VGV nominal. Amostra/empresas do2ainda sem fonte própria;36–60são25posições remanescentes, não uma estimativa de conclusão total. Lote26–35local, envio depende de autorização.

- **Fortaleza mensal — continuação10/11:** próximo26–35; depois36–60/exportação. Homologar produtos horizontais/comercial, VGL nominal, INCC-DI/base provisórios e fotografias reais pareadas. Amostra/empresas do2ainda sem fonte própria.12/14não são mais pendências de implementação; estados anteriores abaixo são históricos.

- **Fortaleza mensal —10/11:** priorizar12/14com casas/comercial/loteamentos e valores/INCC; depois vendas/oferta/preços/IVV/tabelas e exportação. Fonte da amostra, ensaio real e homologação continuam pendentes. Fatia11/13/15local; publicação exige autorização. Estados09/11abaixo preservados como histórico; base anterior já enviada em03d3301.

- [ ] **SP — ensaiar personalização no site:** atualizar responsáveis e fotos nos slides82/83, exportar e conferir a cópia. Configuração vale para a prévia atual, sem persistência entre gerações; padrões ainda vêm da referência2T2026. [Contrato](../features/relatorios-institucionais/sp/PERSONALIZACAO_EQUIPE_2026-11-05.md).

- **Fortaleza — slides1–10 09/11:** refinar diferenças visuais dinâmicas, fonte da amostra/empresas e reconciliação de início de vendas/fases/exclusões históricas; ensaio autenticado delimitado e exportador posteriores. Publicação deste lote ainda pendente; base anterior enviada. Sem acesso via painel. CorretorV3/Quanti2026 seguem Gabriel.

- **Fortaleza — núcleo vertical09/11:** ensaio autenticado delimitado, fotografias pareadas e reconciliação de fluxos/data de início de vendas/cobertura. Demais segmentos, preços, INCC, MCMV, histórico completo e exportação pendentes. Preservar rota sem painel e não confundir etapas concluídas com aceite do estudo. Falha existente Panorama/firewall-fontes registrada separadamente.

- **Fortaleza/SINDUSCON — base09/11:** comprovar fonte mensal vertical capital/cobertura antes de integrar lançamentos/vendas/oferta; ponderação/INCC/MCMV e desenho final por modelo ainda abertos. Uma falha no teste existente Panorama/firewall-fontes fica registrada separadamente, sem alteração de regras nesta frente. Sem ensaio real/publicação autorizados.

- **Fortaleza/SINDUSCON — 09/11:** obter/revisar PPTX bruto e hashes/caches, comprovar fonte mensal/unidade e universo por bloco, ponderação/INCC/MCMV e diferenças de fotografia; depois confirmar fatia G2. [Decisões e lacunas](../features/relatorios-institucionais/fortaleza/DECISOES.md). Sem coleta real/publicação autorizadas nesta rodada.

**05/11 — Panorama territorial:** autorizar integração do novoSP `4aed591` e publicação; conferir noLovable dupla comparada, consolidado regional e cidade versus grupo, retornandoPDF/PPT/CSV. Não homologado externamente nesta entrega.
- [ ] **SP — revisar números editoriais dos slides5/7:** atualizar percentuais e indicadores institucionais com fonte aprovada quando necessário. Textos agora editáveis no PPTX; a API municipal não fornece esses números. Data da geração é dinâmica e não significa atualização automática desses indicadores.

- [ ] **SP — ensaio real do fluxo automático:** após o deploy, selecionar ano/trimestre e Gerar relatório; conferir progresso, cancelamento/retomada, fontes parciais e memória de cálculo nos insights. Fontes reais e latência do provedor não foram exercitadas nesta rodada. [Contrato](../features/relatorios-institucionais/sp/GERACAO_AUTOMATICA_2026-11-05.md).

- [ ] **SP — reconciliar edição2T2026 com a geração real:** usuário enviar novoPPTX ou JSON numérico. Confrontar as25séries automaticamente e revisar restantes com inventário/dados agregados; distinguir período, indicador e revisões da origem. Não forçar127.778,29.065 ou560 no código. Original também tem contradições internas, registradas na revisão05/11. Confirmar valores e metodologia com analista; não declarar coincidência integral antes da comparação.

- [ ] **SP — medir fila contínua na API real:** após publicação, comparar duração da conferência detalhada no mesmo recorte; se ainda lenta, registrar latências/tamanhos/retries das páginas, sem expor token. Resultado sintético9min01s→3min15s não é SLA. Cobertura integral, lacunas reais e revisão editorial continuam independentes dessa otimização.

- [ ] **SP — reteste do checklist (4):** integração autorizada concluída em7e699fc; publicar correções e gerar novo checklist2T2026. Conferir51, pontos recuperados53–59 e tabela parcial78. Jun2023/64094 permanece fotografia ausente; preço54845/73369 deve vir da fonte para completar os valores monetários. Revisar oito artes editoriais. Não converter parciais em disponíveis apenas para fechar contagem.

- **Panorama — PPTX editável:** autorizar integração adicional e envio dos commits, publicar e executar o roteiro real G6 do [plano03/11](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md). Aceite visual/comercial das exceções rasterizadas e teste no site ainda pendentes; edição Office já verificada em cópias sintéticas.
- **Panorama — PPTX editável:** conferir publicação no site e executar o roteiro real G6 do [plano03/11](../features/Relatorios%20Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md). Integração e envio autorizados concluídos; aceite visual/comercial das exceções rasterizadas e teste no site ainda pendentes. Edição Office já verificada em cópias sintéticas.
- [ ] **SP — retestar tratamento aplicado:** gerar novo2T2026 com estoques assinados conciliados, preços parciais† e VGV calculado; conferir os resultados e a auditoria antes de homologar. API original e performance da coleta continuam independentes.

- [ ] **SP — validar contrato e casos da fonte:** esclarecer estoque−1 do26686, jun2023 ausente do64094 e sold/qty/distratos do87999. Material local pronto, sem envio externo. Não alterar identidade ou fabricar dados antes da confirmação; não declarar relatório homologado.

- [ ] **SP — validar v2 integral no site:** atualizar históricos, baixarJSON e comparar26686/64094/9498 e recortesMCMV/padrão/estágio. Postman página1 e OPTIONS204 não substituem esse ensaio.
- [ ] **SP — avaliar equivalentes municipais v2:** mapear contratos/rotas e paridade dos totais antes de propor migração das séries municipais; endpoint de histórico individual não é substituto direto.

- [ ] **SP — novo checklist com sourceDiagnostics:** retestar64/76 e fontes históricas após leitura temporal; identificar registros/competências ainda ausentes sem presumir zero ou causa da origem. Campos dedicados podem não existir no legado.

- [ ] **SP — retestar detalhamentos após revisão dimensional:** conferir fontes reais em51/53–59/61–64/66–80, distinguir classificação divergente de falta de histórico/preço/área e registrar o novo checklist. Não assumir que todos os85 slides têm fonte real completa.

- [ ] **SP — retestar ranking39 com ressalva:** confirmar no acesso real o ranking por bairro após correção dimensional; investigar classificação dos padrões com a origem, sem assumir causa.

- [x] **SP — obter valores da divergência de bairros:** usuário trouxe as sete diferenças por padrão, total38.658 igual e nenhuma divergência mensal indicada; correção dimensional com ressalva implementada. Causa da classificação ainda não confirmada.

- [ ] **SP — reteste39 após zero comprovado:** gerar/conferir novamente com a coleção real; verificar igualdade municipal e qualquer novo ID/campo. O cadastro33693 segue sem bairro na origem, mas seu0observado não exige localização no2T2026.

- [x] **SP — ranking39:** obter ID/campo ou competências do novo aviso e confrontar resposta da API. Não ignorar empreendimentos ou assumir zero para publicar Top10 parcial.

- [ ] **SP — incidente2T2026:** atualizar a página, autenticar e retestar Ano2026/2º trimestre; se falhar, registrar mensagem segura/janela e checklist. Causa original ainda semHTTP real. Conferir períodos/INCC disponíveis, deploy e aceite; não preencher ausência com zero.

- **Estimativas:** conferir no site a seção14 enviada em `ad86e26` (prévia/Excel na principal e Análise detalhada), sem verificação de produção nesta sessão e aguardar formato final Nicolas/Belogic. Interface anterior aceita em 28/10; capturas recebidas em 30/10 mostram uso da prévia, sem nova inspeção independente. Origem/duração por período, contrato de importação, preço, rateio, reconciliação e avaliação independente permanecem abertos, sem homologação pelo aceite da página.
- [ ] **SP — teste prático30/10:** seguir o roteiro da feature; registrar trimestre/mês/slide, esperado/observado e checklist da mesma geração. Conferir fontes reais, mapa/estágio/capacidade e atualidade das8 artes; observar versão publicada. Exportação integral, revisão do analista e novos índices permanecem abertos.

- [ ] **SP — lote final:** validar85 posições no token real, cobertura de coordenadas/fotografias/estágio/capacidade; revisar MAP, VGV nominal e cenário400–500mil com analista. Confirmar pessoas/contatos e perfiljun2026 antes do aceite. Implementar/verificar exportação integral e observar publicação. Os28 finais já foram implementados; anotações antigas abaixo descrevem checkpoints, não lacunas atuais de renderização.

- [ ] **SP — quarto lote:** validar 51, 53–59 e61/62 com token real: cobertura por fotografia, pesos de estoque, preço privativo, dormitórios, faixas e fluxos. Dado ausente fica indicado no slide; não completar amostras por estimativa. Revisar escolhas com analista. Próximos conteúdos:63/64 e tabelas/mapas do estado atual; editorial e exportação integral ainda pendentes.

- [ ] **SP — terceiro lote:** testar 39–44,46–48 e50 com o token real e revisar IVV/escoamento com analista. Conferir cobertura mensal de `sold_in_period` e sua soma por padrão; falta de histórico bloqueia somente39. Rever limites/requisições se a fonte não cobrir a cidade. Preços/áreas 51,53–59,61/62 foram implementados no quarto lote e aguardam revisão real;63/64, mapas, editorial e exportação integral continuam pendentes; implementação dos 85 conteúdos ainda não concluída.

- [ ] **SP — segundo lote e INCC:** validar no site os comparativos 23/24/37/38, ranking 25, vendas 32–36 e VGL 26–30; confirmar a base comum com o analista e nominais históricos `vgv_release`. Atualizar snapshot de índices após set/2026; falta de índice bloqueia só VGL. Testes sintéticos não são aceite de mercado. Demais posições originais, mapas, editorial e exportação ainda exigem implementação/revisão; oferta histórica e IVV foram implementados no terceiro lote e aguardam revisão real.

- [ ] **SP Institucional — validação publicada:** conferir a ordem original de 85 posições e os lotes 13–30/32–38, séries municipais desde 2021, cobertura do cadastro por ID/data, padrão/classificação histórica e parciais; dados locais inventados não são aceite. Contagem anteschamada2agora13original, sem bloquear municipal. Medir tempo real; diferença municipal+22/contrato líquido continuam em aberto. Preços 63/64, mapas, editorial e exportação/homologação integral seguem pendentes;51,53–59,61/62 implementados no quarto lote aguardam revisão real; IVV e oferta histórica implementados no terceiro lote aguardam revisão real; VGL/INCC e vendas longas implementados no segundo lote, aguardando revisão real.

- **Estimativas:** conferir a nova prévia de exportação em produção e aguardar comprovação do formato final de saída Nicolas/Belogic. Interface anterior aceita em28/10; revisão29/10 validada somente localmente. Origem/duração por período, contrato de importação, preço, rateio, reconciliação e avaliação independente permanecem abertos, sem homologação pelo aceite da página.

- [ ] **Estimativas de vendas Finotti:** concluir contrato de retorno/aceite operacional e avaliação independente. Página API, conferência opcional Excel, motores horizontal/vertical e reprodução de caudas/faixas já avançaram; estado vigente no [plano essencial](../features/estimativas-vendas/PLANO_FLUXO_ESSENCIAL_V1_2026-10-28.md), sem manter o plano editorial antigo como lista de implementação pendente. Obter origem histórica por período e periodicidade real; comparações com saldos reportados não comprovam coleta observada. Regras de alternância/coleta, granularidade, preço e reconciliação continuam externas. Sem homologação de importação.

- [ ] **Corretor v0.73:** revisar/publicar lote de fluxo contínuo, ativar migration/Edge/frontend e conferir produção. Conversão automática hospedada e recuperação da execução em outro navegador permanecem abertas; sem IA paga sem lote/orçamento.

- [ ] **FIERGS — retorno de 06/10:** após publicar a contingência auditada, conferir o PDF/CSV 2T2026 gerado por Gabriel: os sete condomínios devem aparecer nas páginas 55/57/59/60 sem alterar loteamentos, preços ou outros totais indevidamente. A consulta ao payload bruto atual continua pendente por timeout, e o aceite explícito da Juliana ainda falta. A página 55 foi mantida com vertical e subtotal; confirmar essa interpretação de “Desconsiderar” se ela esperar exclusão integral.

- [ ] **Plataforma Rebrain — governança de custo BigQuery:** implantar o plano de labels comuns,
  auditoria de produto, agregação administrativa de `INFORMATION_SCHEMA.JOBS_BY_PROJECT`, exportação
  de Cloud Billing, orçamento/alertas e painel interno por feature. A telemetria de jobs não deve
  ser consultada a cada abertura de página. Detalhe em
  [`PLAN_BIGQUERY_COST_OBSERVABILITY.md`](../architecture/PLAN_BIGQUERY_COST_OBSERVABILITY.md).
- [ ] **Empresas e Empregados — Histórico de Empregados, Fase 2:** remuneração, setores e ocupações
  históricos; comparação municipal; e qualquer pré-carga/batch nacional. Permanecem fora da V1 de
  vínculos anuais e só avançam após *dry run*, teto de bytes, política de cache/retenção e revisão
  metodológica por recorte. Detalhe em
  [`PLAN_POS_TESTE_EMPREGADOS_UX_HISTORICO_2026-09-04.md`](../features/empresas-empregados/PLAN_POS_TESTE_EMPREGADOS_UX_HISTORICO_2026-09-04.md).
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
- [ ] **Panorama V3 — PPT editável:** o PPT espelho já está disponível na V2 como uma imagem 16:9 por lâmina; a reconstrução de textos, tabelas e gráficos em objetos nativos do PowerPoint requer escopo próprio e não bloqueia a homologação atual.
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
### 2026-09-22 — Panorama: fonte granular interna com fallback público — Gabriel + Codex

- **Ambiente/funcionalidade:** `/rebrain/panorama-secovi-fiergs` — aquisição granular dos Panoramas Secovi-SP e FIERGS.
- **O quê:** bancada autenticada no recorte FIERGS — RM Porto Alegre confirmou as 11 cidades em `monitored-cities`, 2.048 IDs idênticos e 258.557 registros históricos nas rotas interna e pública v2. A rota interna passa a ser a fonte granular padrão, filtrando Ativo/Esgotado e normalizando `number_bedroom` (`0` como ausência; demais valores como texto); a pública v2 permanece como fallback com três tentativas e o contrato legado continua restrito ao motor V2. Falha de todas as fontes interrompe a cidade, sem produzir zeros.
- **Evidência:** rota pública exigiu 73 tentativas para 55 páginas por falhas transitórias de infraestrutura; a interna concluiu 34 páginas em 34 chamadas. Todos os campos compartilhados usados pelo motor coincidiram; a interna adiciona campos operacionais. A última repetição integral após a normalização final ficou pendente porque o ambiente de aprovação esgotou créditos, sem nova chamada à GeoBrain.
- **Verificação:** 8 testes direcionados e typecheck aprovados. Na suíte global, 353/354 testes passaram; restaram somente um timeout de 5 s no template real do Sinduscon e a suíte do compilador Sinduscon sem `@pdf-lib/fontkit` instalado. O build também chegou a 1.888 módulos e parou exclusivamente nessa mesma dependência ausente, fora da feature Panorama.
- **Arquivos:** `src/features/panorama-secovi-fiergs/{api.ts,__tests__/building-source-parity.test.ts}`.
- **Monday:** [DESAFIO - Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`.
- **Impacto em Etapas/Pendências:** aquisição granular padronizada antes da validação dos motores; continuam pendentes a robustez/rate limit das séries temporais e a reconciliação numérica do fechamento FIERGS 4T2025 contra o deck.
### 2026-09-30 — FIERGS-RS: baseline pós-teste explica quatro totais de vendas — Gabriel Hxg + Codex
- **Ambiente/funcionalidade:** Panorama de Mercado — reconciliação metodológica do recorte FIERGS 2T2026.
- **O quê:** uma bancada autenticada e reproduzível congelou o recorte das dez cidades e explicou integralmente os totais apontados pela Juliana. `2.317` soma indevidamente `1.137` verticais e `1.180` horizontais; `1.138` descarta uma venda líquida negativa de quatro dormitórios; e o excesso de `46` entre `1.137` e `1.091` vem da soma de fotografias acumuladas em Canoas (`41`) e Novo Hamburgo (`5`). O total tecnicamente recomendado é `1.091`, derivado da última fotografia granular por empreendimento/tipologia.
- **Por quê:** concluir as Fases 0 e 1 antes de alterar o runtime e impedir correção arbitrária de números ou avanço prematuro para ajustes visuais.
- **Arquivos:** `scripts/fiergs-sales-reconciliation.mts`, `docs/features/Relatorios Secovi_FIERGS/{PLAN_POS_TESTE_JULIANA_FIERGS_2T2026_2026-09-30.md,EVIDENCIA_FASES_0_1_VENDAS_FIERGS_2T2026_2026-09-30.md}`.
- **Commits:** `290a5e2`.
- **Verificação:** consulta autenticada das dez cidades; repetição focal de Canoas/Novo Hamburgo; 64 testes focais e typecheck aprovados.
- **Impacto em Etapas/Pendências:** portão A passou tecnicamente; a mudança estrutural permanece bloqueada no checkpoint para aprovação da fonte canônica antes das Fases 2–4. Nenhum componente de produção foi alterado.
- **Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`.

### 2026-09-30 — FIERGS-RS: clareza visual e mapas da Etapa 6 — Gabriel Hxg + Codex
- **Ambiente/funcionalidade:** Panorama de Mercado — lâminas editoriais e mapas FIERGS.
- **O quê:** percentuais fecham em 100,0% por rateio determinístico; dormitórios usam nomenclatura completa; ranking municipal ganhou margens próprias; o slide 41 declara indisponibilidade anual auditável; o gráfico de R$/m² reduz colisões; mapas calculam bounds/zoom e exibem legendas por padrão, estoque e R$/m².
- **Verificação:** `235/235` testes da feature, `tsconfig.app.json` e build de produção aprovados; proporção 16:9 coberta pela regressão existente.
- **Impacto em Etapas/Pendências:** Fase 6 concluída tecnicamente. A inspeção humana dos novos PDF/PPT permanece na Fase 8; a próxima frente de implementação é a Fase 7.

### 2026-09-30 — FIERGS-RS: pacote de homologação 2T2026 — Gabriel Hxg + Codex
- **Ambiente/funcionalidade:** Panorama de Mercado — validação integrada FIERGS no build de produção.
- **O quê:** o navegador autenticado encontrou uma diferença entre produto horizontal completo e coorte cortada em `1T2023`; o bloco FIERGS passou a preservar a coorte `Até 2022`. A guarda final aprovou 11/11 invariantes e gerou CSV, PPTX e PDF com 75 páginas.
- **Evidência:** vendas `1.091`, estoque `5.251`, horizontal `129 / 30.476 / 3.365`, chácaras `0`; `236/236` testes FIERGS e build aprovados.
- **Impacto em Etapas/Pendências:** Fases 7 e 8 concluídas tecnicamente. O pacote está pronto para Juliana; promoção depende do aceite externo.

### 2026-10-02 — Panorama FIERGS: ajustes finos da Juliana
- **Ambiente/funcionalidade:** Relatórios Automatizados → Panorama de Mercado FIERGS-RS.
- **O que:** disponibilidade por tipologia/padrão usa oferta final sobre lançamentos históricos da mesma dimensão; lançamento da janela permanece claramente separado. IDs oficiais de tempo/maturidade (59–60) e VGV (61) foram restaurados; ID 63 consolida o horizontal por produto e preserva disponibilidade e média de lançamentos por empreendimento. Linha de preço sem qualquer indicador observado é ocultada.
- **Decisões:** 63 unidades não classificadas tornam o total de disponibilidade indisponível; não são redistribuídas. Categorias de maturidade existentes não equivalem a média de idade em meses. A página institucional de 22 anos não foi alterada.
- **Verificação:** 32 arquivos/266 testes Vitest aprovados; build de produção aprovado; PDFs/PPTs 2T2026 e 4T2025 (74 páginas/slides cada); CSVs de 819 linhas com 39 invariantes críticas em `match` e sem deltas. Capturas das páginas tocadas e nota VGV de cobertura parcial inspecionadas; artefatos em `.tmp/fiergs-final-adjustments-regression-20261002/`.
- **Arquivos:** componentes e manifesto em `src/features/panorama-secovi-fiergs/`; resumo e evidência na pasta de documentos FIERGS.
- **Commit/push:** implementação local `a95e039`; documentação/evidências em commit separado. Nenhum push sem autorização do usuário. A página institucional de 22 anos continua para o marketing.

### 2026-10-02 — Panorama FIERGS: revisão do PDF (6) e aba Avisos — Codex
- **O quê:** revisão das 70 páginas do PDF gerado; páginas físicas 34/51 idênticas, lâmina “Sobre o estudo” com contagem antiga e categorias sem R$/m² no gráfico por padrão. O manifesto remove a cópia oficial 56; a contagem fica dinâmica; categorias sem preço são omitidas do gráfico, mas zeros observados permanecem. Omissões entram nos Avisos e auditoria. Avisos passa a aba própria entre Relatório e Metodologia; Relatório mantém apenas páginas e controles.
- **Verificação:** testes de manifesto/renderização aprovados; TypeScript global segue bloqueado exclusivamente por fixtures preexistentes em `src/features/corretor/lib/audit/__tests__/structure-empty-sections.test.ts`. PDF novo após esta alteração e regressão autenticada de 4T2025 ainda pendentes.
- **Evidência:** `docs/features/Relatorios Secovi_FIERGS/EVIDENCIA_REVISAO_PDF_6_ABA_AVISOS_2026-10-02.md`.

### 2026-10-02 — Panorama FIERGS: sumário e cabeçalho anual — Codex
- **O quê:** o sumário do PDF passa a incluir IVV e preços (páginas antes ausentes) e a ordenar VGV antes do horizontal pela paginação real. O cabeçalho “Variações anuais” fica alinhado à tabela, cujas colunas passam a ocupar a largura disponível conforme a quantidade de comparações.
- **Verificação:** regressão do manifesto cobre integralmente as 69 páginas e a ordem das seções; 14 testes focados aprovados. Nova exportação autenticada ainda necessária para aceite visual.

### 2026-10-06 — Sinduscon: quadros mensais e revisão de usos comerciais — Codex
- **Ambiente/funcionalidade:** Sinduscon Curitiba, Liberados e CVCO.
- **O quê:** agregações mensais por pavimento nas folhas 04/07; áreas por zona separadas das unidades nas folhas 05/08; restauração de totais mensais ausentes. Uso exclusivamente comercial com quantidade residencial ao menos três vezes maior que a não residencial segue para revisão humana, preservando ambas.
- **Impacto em Etapas/Pendências:** regenerar a tabulação a partir da base acumulada antes do relatório, pois as novas agregações exigem quatro novas tabelas de dados. Reprocessar o arquivo bruto de agosto para recuperar quantidades excluídas pela regra anterior. Arquivos enviados no navegador não possuem logs centrais de processamento.
- **Monday:** —


**22/10/2026 — Gabriel/sessão, estimativas Finotti, estado preparado localmente.** Rota editorial /rebrain/estimativas-vendas com consulta paginada Horizontal, seleção de empreendimento/carteira, projeção conservadora e laboratório; conferência opcional do Excel no navegador separada do cálculo. Typecheck, ESLint, 10 testes focados e build aprovados localmente. Sem backtest observado por falta de bases.estimation mensal. Teste autenticado da página, paridade das fixtures na nova interface e inspeção visual ainda pendentes; nenhum push/deploy. [Pacote técnico](../features/estimativas-vendas/README.md).


**22/10 — Gabriel/sessão, Estimativas: correção após teste de usuário.** Seleção de três empreendimentos mostrou 0 elegíveis e gráfico vazio. Adaptador de elegibilidade ignora fase Futuro ao definir produto e origem da curva; motivos de exclusão aparecem no seletor e junto ao gráfico. Domínio 1–48 meses e ausência/negativos preservados. 11 testes focados, tipos e lint aprovados localmente. Reteste dos IDs da captura pendente; sem alegação de acurácia observada. [Registro técnico](../features/estimativas-vendas/README.md).


**22/10 — Gabriel/sessão, navegação Estimativas de Vendas.** Ferramenta saiu da pasta Relatórios Automatizados e ganhou grupo próprio acima de Área Quanti; item Simulador de Vendas mantém aviso em implementação e a mesma rota. Typecheck, lint e teste do menu aprovados localmente. Próximo confirmar posição no site publicado.


**22/10 — correção do menu Estimativas, Gabriel/sessão:** por pedido do usuário, Estimativas de Vendas virou link lateral direto acima de Banco Quanti, sem submenu Simulador de Vendas. Rota e aviso em implementação preservados. Dois testes de menu, tipos e lint aprovados; publicação e conferência visual pendentes.


**22/10 — Gabriel/sessão, curva Finotti em Rio Branco.** Diagnóstico API: 21 empreendimentos, 13 horizontais com lacunas; regra anterior impedia todas as curvas. Motor agora ancora a curva em estoque por tipologia no corte apenas quando conciliado com vendas acumuladas, mantendo médias 3/12 ausentes sem cadência mensal adequada. Ecovillage 52093 é caso local avaliável (348/276 no mês39); proveniência mensal desconhecida, sem backtest. 13 testes, tipos/lint aprovados. [Evidência](../features/estimativas-vendas/README.md).

**22/10 — Gabriel/sessão, seleção Curitiba e carregamento Brain.** Consulta real de 371 empreendimentos em quatro páginas; filtro e corte em 09/2026 identificam 22 elegíveis. A lista agora expõe os 371, permite busca por ID/nome e filtro opcional de elegibilidade. Texto explica que o corte define a origem da previsão. `BrainLoadingState` cobre consulta e Excel da ferramenta e o fallback lazy compartilhado; demais operações Rebrain seguem para revisão individual. Ensaio local autenticado confirmou curva 1/1 para ID 87338; 16 testes focados, tipos/lint/build aprovados. Estado validado localmente, sem publicação nem retrospectivo comprovado nesta evidência. [Detalhe](../features/estimativas-vendas/README.md).


**22/10 — Gabriel/sessão, plano de expansão das estimativas.** Preparado plano de seis etapas para modelos por tipo, tratamento de dados incompletos, retrospectiva independente e sombra de previsão calibrada. Cobertura total do catálogo não equivale a previsão identificável para todos; cenários manuais permanecem explícitos. Evidência: docs/features/estimativas-vendas/PLANO_EXPANSAO_MODELOS_E_FAIXAS_2026-10-22.md. Estado preparado; próximos passos: inventário de tipo/idade/periodicidade e motor retrospectivo. Sem implementação, testes novos, push ou publicação nesta etapa.

## 22/10/2026 — Estimativas: bancada multiempreendimento local — Gabriel/sessão

**Desenvolvimento:** grade paginada de 12 gráficos, carteira de todos os membros, sobreposição de cinco, detalhe acessível, Horizontal/Vertical, Excel opcional, modelos versionados e retrospectiva. Fontes, contrato, motores, ajuste, calibração e interface separados. Cenário manual cobre hipóteses sem dados; comercial/mistos aguardam contrato da API.

**Etapa/evidência:** validado localmente; 37 testes focados, tipos explícitos da aplicação, lint e build. Oito ensaios de viewport/tema sem overflow/erro e com foco restaurado. Ensaio autenticado local e Excel Curitiba: 28.308 iguais/0 diferentes/181 exclusivos. Auditoria de 2.257 cadastros em três recortes, com snapshots ignorados e agregados versionados. [Dossiê](../features/estimativas-vendas/RESULTADO_EXPANSAO_LOCAL_2026-10-22.md).

**Pendências:** faixas reais não promovidas por cobertura/composição inadequadas; origem mensal, cadência, idade/revisões e contrato comercial continuam abertos. Próximo revisar localmente e esclarecer fonte; sem push ou deploy nesta etapa, conforme Gabriel. Alterações FIERGS/Corretor preservadas. Não equivale a acurácia observada ou ferramenta ampliada publicada.

**Fechamento da mesma entrega em22/10:** merge local5a02fb9 integrou seis commits remotos API Excel ao60d4989, sem conflitos;82testes/11arquivos e build passaram. TypeScript explícito identificou opção exact incompatível em getByRole/queryByRole nos dois testes novos API Excel; corrigida somente a chamada de teste, mantendo produto. Tipos completos e quatro testes afetados revalidados. Sem push/deploy; FIERGS e referência Corretor continuam locais preservados.

## 27/10/2026 — Consolidação operacional do estimador
Gabriel/sessão preparou baseline e inventário em docs/features/estimativas-vendas/BASELINE_OPERACIONAL_E_PLANO_2026-10-27.md. E-mails, estudos de preço e regrasMonday reconciliados. Estado preparado; contratoExcel, origem porcompetência e preço pendentes. Próximo: seleção e amostra revisável. Sem alteração de produto/importação.
Monday: [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074) — 13096757074. Nenhuma escrita no card.
