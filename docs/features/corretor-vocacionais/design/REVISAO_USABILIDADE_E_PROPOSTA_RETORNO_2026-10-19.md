# Assistente de Projetos — revisão histórica e proposta de usabilidade

19/10/2026 · Gabriel / sessão Codex · **Proposta preparada; produto não alterado.**

**Decisão posterior de Gabriel em 19/10:** preparar plano técnico completo e CTA único; usar somente **Sugestão de análise**, sem frase adicional explicando o papel do analista. Plano vigente para a próxima execução: [T0–T7](PLAN_RETORNO_USABILIDADE_ASSISTENTE_2026-10-19.md). Essa orientação substitui os textos auxiliares sugeridos nesta revisão; produto ainda não alterado.

## Direção recomendada

Recuperar a entrada de duas opções da referência de setembro sobre os motores, materiais e controles atuais. Preservar System Design SE e análise contínua. Concentrar a autenticação no bloco existente do menu da plataforma. Apresentar a segunda opção como apoio ao trabalho do analista.

Essa proposta responde à conversa Diego/Gabriel de 19/10 e às três imagens fornecidas. A referência do email da Ana relata falhas na sociodemografia/concorrência e uma tela que aparentava não ter erros. Esse relato exige tanto clareza de cobertura quanto avaliação técnica das omissões; reorganizar a interface não comprova que os erros do estudo passaram a ser encontrados.

## Base conferida e limites

- Fetch de todos os remotos: apenas `origin`, em `d3463d7`; main local `bb0f22a`, **30 commits atrás e zero à frente**. Commits adicionais concentrados nos relatórios institucionais SP, documentação, tipos gerados e rota SP em App.tsx. Não há código novo do Corretor após `bb0f22a` no remoto consultado.
- Documentos FIERGS, entrada FIERGS em LIVE_rebrain e ZIP local preservados. Não feito pull sobre árvore suja. A comparação utilizou objetos Git locais/remotos, sem mudar checkout, resolver conflitos ou publicar algo.
- Os commits consultivos identificados por Gabriel como trabalho do Lucas registram autor Git **Codex Test**. Não há email pessoal do Lucas nesses commits; a associação humana vem do contexto fornecido. A renomeação visível para Assistente de Projetos aparece em commit do bot Lovable.
- Capturas do usuário mostram a nova interface em uso. Não houve ensaio independente de produção, login de conta real, consulta de banco ou IA nesta revisão. Os deploys/migration da entrega de 16/10 permanecem sem nova confirmação operacional nesta rodada.
- Números de testes das entregas anteriores são evidência histórica: não foram reexecutados nesta análise de proposta. Nova implementação deverá repetir os dez passes e os controles de navegação/identidade.

### Contexto dos ambientes, sem ampliar a tarefa

Dashboard: último commit de código consultado de 25/09, bot Lovable; documento registra filtros geográficos/classificação de dormitórios sob Codex (`660ee45`). Próximos indicadores/cobertura de testes ainda aparecem como pendências documentais. Área Quanti: último commit consultado de 09/09, Codex Test, gráficos de intenção; documento também registra bases anuais/combinação virtual pelo Lovable, com contrato definitivo de API ainda pendente. Rebrain: Corretor `bb0f22a`, Gabriel, 16/10; relatórios SP `103e3df`, Codex Test, 16/10, incorporados ao remoto e com publicação ainda distinguida de Git. Esta sessão trata somente a proposta do Corretor, sem alterar os outros ambientes.

## Referência a recuperar

1. `89012dc`, 15/09: duas entradas **Avaliar erros** e **Sugestão de Análise**. A primeira monta correções; a segunda gera apoio consultivo, separado da fila de erros.
2. `226288c`, 15/09: critérios consultivos ajustados e documentados em BASE_CONHECIMENTO_SUGESTAO_ANALISE.md.
3. `d58f64c`, 17/09: textos extensos em lotes e compilação final; `a9118e2`: identidade Brain durante processamento.
4. `a36f745`, 17/09, bot Lovable: título/menu **Assistente de Projetos**. A integração `a901df2` conserva as duas opções grandes e a lista de estudos abaixo. **Esta é a referência principal de composição.**

A referência de 17/09 é anterior ao painel com quatro indicadores e menus V1/V2/V3 de 24–30/09. São duas versões diferentes da interface antiga. A proposta recupera a escolha direta de setembro; os indicadores administrativos e gerações não precisam voltar à área principal.

## Mapa das mudanças posteriores

| Período / commits | Mudança | Decisão proposta |
|---|---|---|
| 24/09 — `ed46c02`, `493dd66`, `3997d16` | Cruzamentos com fonte numérica e persistência da fonte por estudo | Manter |
| 24/09 — `c1293da` | Landing redesenhada, indicadores gerais, duas ações horizontais e carteira com busca/filtros | Recuperar ações destacadas; manter busca/filtros; custos globais fora da entrada principal |
| 27–28/09 — `feb0163`, `077f63d` | Ingestão Excel V3 e separação de gerações antigas | Manter Excel e leitura do legado; não exigir escolha V1/V2/V3 do usuário |
| 29/09 — `77401f9`, `fe6fc4d`, bot | Precisão, falsos positivos e controles de revisão | Manter regras; não restaurar motor antigo junto com aparência |
| 30/09 — `00dffba`, `70e66bb`, `d495ed6` | Reconciliação entre slides, persistência resiliente e leitura textual mais ampla | Manter |
| 30/09 — `efc26e2`, `c69a913`, `2920197`, `fa4cdd4` | Estado pendente honesto, cache do original, pré-análise com cidade/Excel/custo; Excel saiu da tela inicial | Manter estado honesto/cache; conservar a simplificação posterior que trouxe Excel antes da análise |
| 01/10 — `44c9242`, `df75819`, `35c0656` | Mapas, observações, deslocamentos, raios e consistência; blocos C/D v0.67 | Manter |
| 13/10 — `04edc0d`, `f5eff70`, `47107b2`, `e230070` | Baseline/replays, falsos positivos de ano, tabela × conclusão e reconferência preservando alertas fora do escopo | Manter, protegendo os erros verdadeiros e os dez passes |
| 14/10 — `6073ba3`, `e0c9d98` | Confirmação de custo, revisão conservadora de evidências, duplicatas sem colapsar erros distintos | Manter |
| 14–15/10 — `eb0faa1`, `1f61fa5`, `416488d` | Carteira por projetos, cadastro, originais, identidade Geobrain, resumo e navegação nova | Manter persistência/identidade; reduzir a exposição de cadastro e a navegação obrigatória |
| 15/10 — `ddc2291`, `c10194e`, `b2d221e`, `48949a7` | Bancada PDF/materiais, retirada da landing antiga, mapa visível, evidências e aviso de incompletude | Manter bancada/evidências/estado; recuperar a entrada de duas ações |
| 15/10 — `178a96b` | Preparação contínua antes da ata/IA, materiais/cidade/custo em uma página; execução com reserva e replay; evidência única e triagem ampla | Manter integralmente como comportamento de execução |
| 16/10 — `15e5efc`, `e36c591` | Rascunho consumido corretamente, Meus estudos, autoria e preparações incompletas visíveis na conta | Manter, ligado ao acesso único da plataforma |
| 16/10 — `bb0f22a` | Recomendador volta dentro de Novo estudo e ganha histórico/controle de custo/métricas; arquivos verdes | Manter motor/contabilidade/histórico; levar a escolha de finalidade à entrada e revisar comunicação |

## Por que a experiência ficou mais complexa

### 1. A intenção principal ficou distante

Em setembro: abrir Assistente → escolher um dos dois trabalhos. Hoje: abrir carteira → Novo estudo → escolher Revisar estudo/Gerar recomendação → preparar. A página inicial comunica organização de arquivos; as duas funções principais só aparecem na página seguinte.

### 2. Uma única conta passou a parecer dois acessos

Evidência: `src/components/layout/AuthBlock.tsx`, `lib/project-access.ts`, `components/GeobrainAccessProvider.tsx`, `lib/projects.ts`, `lib/materials.ts`.

- Menu usa `useAuthStore` para token da API. Na rota Corretor, o formulário também tenta obter a sessão de projetos; fora dela, segue apenas o login de API.
- Carteira usa `requireProjectIdentity`, que exige sessão do app validada e habilitação Geobrain vigente. Se isso falta, exibe outro **Entrar com Geobrain**, com modal de email/senha no Corretor.
- Assim, autenticar em outra página, entrar com token antigo, ter sessão expirada ou uma troca incompleta pode manter APIs conectadas enquanto a carteira pede outro login. O código comprova a possibilidade; não identifica qual delas ocorreu com Diego.
- Também há um defeito de apresentação: AuthBlock renderiza o bloco Autenticado se existe token armazenado, mesmo que `hasValidToken()` seja falso. A captura com zero minutos não prova sozinha expiração — o contador arredonda para baixo — mas esse caminho de token expirado existe no código e precisa de correção.
- A orientação constante para usar Reemitir transfere ao usuário uma diferença interna entre duas sessões. A integração deve resolver isso no único ponto de autenticação.

### 3. A navegação e o cadastro ganharam peso

Carteira abre resumo e cada estudo apresenta Resumo/Revisão/Recomendação/Materiais/Histórico. Linhas da lista repetem Sem cadastro prévio/Completar cadastro. Isso aumenta a leitura e os passos antes de revisar, embora o cadastro seja opcional e os estudos legados não tenham esses dados.

### 4. O texto mudou o papel percebido do assistente

**Sugestão de Análise** virou **Gerar recomendação** e **Recomendação consultiva**. A chamada enfatiza a produção da conclusão do especialista. A preocupação de Diego é de comunicação e adoção; reduzir uma frase não substitui manter o analista no controle da revisão e da recomendação final.

## Interface proposta

### Entrada `/corretor`

**Assistente de Projetos**

“Apoio à revisão e à análise dos estudos.”

Duas ações grandes, no mesmo nível:

- **Revisar estudo** — “Confira texto, números e consistência do material.”
- **Sugestão de análise**, sem subtítulo explicativo.

Sob elas: estudos recentes, busca e filtro de situação. **Todos os estudos** sempre acessível, como hoje; **Meus estudos** aparece após autenticação no menu da plataforma. Conservar nome estudo/cliente quando disponível, cidade, situação e data, sem cadastrar nada para consultar. Compartilhamentos disponíveis como filtro secundário quando autenticado. Legado em Análises anteriores.

Não repetir uma terceira ação principal Novo estudo disputando com as duas escolhas. Links existentes para `/corretor/novo` continuam funcionais, abrindo o mesmo preparo com finalidade explícita. Selecionar uma opção apresenta o preparo contextual, com retorno claro às opções, sem perder materiais ao trocar finalidade.

### Preparação da revisão — uma página, um início

1. Apresentação com ícone PPTX, arquivo e confirmação verde após leitura válida. PDF continua prévia complementar da versão; não se promete ingestão PDF como apresentação principal.
2. Excel opcional logo abaixo, com ícone, quantidade, verde e remoção/troca. Planilhas oferecidas **antes** de qualquer processamento pago. Sem elas, decisão explícita de continuar e uma frase sobre a limitação da conferência numérica.
3. Cidade/UF sugeridas e conferidas na mesma página. Campos complementares não obrigatórios.
4. Resumo compacto de materiais, previsão e limite de custo, seguido de **Iniciar revisão**.

Após esse único início autorizado: extração → estrutura/ata → texto/números → cruzamentos → resultados, com progresso. Etapas técnicas ficam no processamento, não em novas telas de confirmação. Erro/pausa deixam estudo identificável como incompleto, com retomada e sem aparência de aprovação. Fechar a aba não garante que todos os próximos lotes continuarão rodando; as respostas registradas permitem retomada sem cobrança repetida dos lotes conhecidos.

### Preparação do apoio à análise

Mesmo original e mesma área de arquivos; finalidade já escolhida na entrada. Mostrar previsão/limite e ação **Preparar sugestões**. Usar somente o título **Sugestão de análise**, sem frase adicional sobre o papel do analista, conforme decisão posterior de Gabriel.

Manter os critérios Brain, lotes, cobertura textual explícita, custo, histórico e reabertura gratuita. Não afirmar que o recomendador interpreta Excel/PDF/imagens só porque o mesmo estudo possui esses materiais. O cruzamento com Excel pertence ao caminho de revisão já existente.

Revisar chamadas, título da tela de resultado e ações novas. O plano técnico conserva prompt, critérios/modelo/preços e textos já gerados; não altera os títulos internos do conteúdo salvo. Resultado anterior permanece auditável como originalmente produzido.

### Estudo já analisado

Lista abre o trabalho relevante diretamente: revisão quando houver revisão; sugestões quando houver apenas apoio consultivo; preparo/retomada quando estiver incompleto. Disponibilizar ambas as áreas quando existirem resultados dos dois tipos. Não decidir só pelo estado pronto/pendente de correção, pois sugestão não conclui revisão.

Na revisão: resumo curto de apontamentos/cobertura no topo, bancada com evidência única grande e texto abaixo, mapa de slides preenchido e visível, decisões existentes. O resumo deixa de ser passagem obrigatória. Navegação principal enxuta: **Revisão**, **Sugestões**, **Arquivos e histórico**. Preservar todas as rotas antigas com destino equivalente e versão/filtros/retorno mantidos.

Cadastro fica em Dados do estudo, opcional. Sem lista de campos ausentes nem repetição Sem cadastro prévio em cada linha. Arquivos/histórico/versões continuam acessíveis; essa redução de navegação não autoriza ocultar o mapa, a evidência ou as decisões em accordions.

### Aspecto

Usar composição direta da referência `a901df2`, com tokens SE atuais: oliva, verde de arquivo confirmado, amarelo reservado à ação/destaque necessário, tipografia e raio existentes. Preservar ícones PPTX/Excel/PDF e áreas de clique claras. Sem faixa decorativa amarela, indicadores de custo global dominando a entrada ou seleção da versão técnica V1/V2/V3. Métricas completas continuam na calibração.

## Contrato de autenticação única

- Único formulário no menu existente, com a conta **Geobrain**. A emissão/renovação deve obter token da API **e** identidade dos estudos em qualquer rota; o vínculo não pode depender de estar dentro do Corretor naquele momento.
- Retirar o botão/modal Entrar com Geobrain da carteira/revisão. Uma ação que exige conta leva ao bloco existente, expandindo/focando o menu se necessário. Cancelar preserva tela, arquivos e decisão anterior; nenhuma ação é executada por cancelamento.
- Manter a ponte de identidade validada no servidor. Token armazenado, IP ou email declarado no cliente não viram autoria/permissão. A mudança é de ponto de entrada e orquestração, sem remover proteções do banco.
- Usuários com token anterior e sem sessão correspondente podem precisar usar Reemitir **nesse único bloco**, uma vez. Não guardar senha para autenticar silenciosamente. Uma sessão existente válida deve ser reconhecida sem novo formulário.
- Distinguir internamente API/estudos durante a sincronização; só anunciar acesso completo quando confirmado. Se a ponte estiver indisponível, preservar APIs quando possível e apresentar o problema no menu, sem inventar Meus estudos vazio ou oferecer outro login no Corretor.
- Expiração deve atualizar o estado real. Remover/Reemitir encerra o acesso anterior de ambos; troca de conta invalida listas pessoais e intenções antigas. Não apagar estudos, resultados, decisões ou materiais locais por sair da conta.
- Preparações iniciadas com conta continuam em Meus estudos mesmo sem cadastro/análise completos. Registros legados/visitantes não recebem autoria por inferência. Biblioteca pública continua acessível conforme decisões anteriores.

## Pontos da Ana e ganhos a proteger

1. Avaliação pendente/incompleta nunca exibe zero como conclusão ou libera entrega por ausência de apontamentos. Diferenciar preparado, processando, interrompido e resultado disponível.
2. Não aumentar etapas obrigatórias: PPTX/Excel/cidade/custo no mesmo preparo; uma autorização para o lote completo e nenhuma IA ao escolher arquivos.
3. Conservar cruzamento Excel, leitura de tabelas, guarda de ano, tabela × conclusão, revalidação dos alertas antigos e tratamento de duplicatas sem fundir erros distintos.
4. Preservar IDs, decisões humanas, versões, originais, fontes, prompts/resultados e custos. Menos alertas ou telas não comprova melhoria de detecção.
5. Manter evidência única, prévias disponíveis, português e triagem ampla. Sem prévia completa, rotular o recorte existente; ausência de imagem não elimina achado verdadeiro.
6. Não prometer aceite do caso ECO João Pessoa da Ana sem parear arquivo analisado, versão com observações humanas e fonte numérica. Email/captura fornecidos não contêm o gabarito integral. Casos conhecidos e dez passes continuam a referência de proteção técnica.

## Ordem de execução proposta, após aprovação

### U0 — congelar referências e preparar base

Guardar a referência de setembro e a atual, inventário de estudos/decisões e contratos. Solicitar autorização de sincronização conforme AGENTS, porque a base tem 30 commits remotos e documentação local de outras frentes; preservar tudo e conferir de novo antes de integrar. Reconciliar as entradas LIVE dos dois lados. Confirmar quais dependências de 16/10 foram realmente publicadas; não reaplicar migrations antigas.

**Concluído quando:** base atual identificada, referências comparáveis e dependências reais registradas. Nenhuma decisão ou material alterado.

### U1 — um acesso no menu

Centralizar a autenticação compartilhada, remover a segunda entrada e preservar cancelamento de intenções. Corrigir expiração/renovação/saída e assinaturas de mudança de conta. Não há migration nova prevista para a apresentação; `corretor-access` só precisará redeploy se seu contrato de servidor mudar.

**Concluído quando:** login no menu em outra página habilita APIs e Meus estudos ao navegar para Corretor; login já válido não pede repetição; expirado/erro não aparece como sucesso; sair/trocar conta não mostra dados pessoais da conta anterior nem apaga arquivos/decisões.

### U2 — entrada de duas opções e comunicação de apoio

Recompor `/corretor`, dar contexto a `/novo`, reduzir cadastro visível e ajustar textos de ação/resultado. Preservar busca, filtros, paginação, compartilhamento e histórico como capacidades secundárias. Ajuste editorial do prompt separado e versionado se necessário.

**Concluído quando:** usuário identifica revisão e sugestão na primeira tela; entra em cada uma com um clique; arquivos/limite continuam disponíveis sem duplicar estudo ou iniciar IA automaticamente. Não há segundo formulário nem promessa de substituir a recomendação humana.

### U3 — continuidade e revisão direta

Preservar preparo compacto e execução registrada. Abrir revisão diretamente com resumo embutido; reduzir navegação, manter rotas antigas, versões, mapa e evidência. Tratar incompletos, original indisponível e resultado apenas consultivo explicitamente.

**Concluído quando:** um preparo + um início percorrem avaliação completa; interrupção é retomável; abrir/sair/back/reload/estudo A→B mantém contexto e decisões. Reconferência não apaga alertas fora do escopo, não repete cobrança desconhecida nem transforma sugestão em revisão concluída.

### U4 — validação e aceite

Reexecutar dez passes gratuitos dos cinco estudos e os controles de identidade/custo; percursos em navegador com materiais existentes e provedor simulado. Casos: visitante; conta já válida; login em outra rota; token antigo; expiração; troca de conta; cancelamento; PDF/Excel; duplicata; pausa; apenas sugestão; revisão concluída; links antigos; nova preparação vazia. Conferir desktop/mobile, contraste, teclado, erros e clareza de mensagens. Apresentar resultado antes do push.

**Concluído quando:** critérios U1–U3 comprovados, dados/decisões preservados, copy revisada por Gabriel/Diego e primeira experiência humana da entrada aprovada. Lote real de IA somente após apresentar materiais, objetivo e orçamento. Esta proposta não autoriza ensaio pago nem envio de mensagens ao Diego.

## Próximo passo recomendado

Implementar U1–U3 como uma recomposição pequena da interface, mantendo a base funcional atual. Validar primeiro acesso único e as duas entradas, depois percursos completos. Adiar novas expansões de cadastro, composição de projetos e funcionalidades consultivas até o aceite desse recorte.

CTA vigente: executar **T0–T7** do [plano técnico detalhado](PLAN_RETORNO_USABILIDADE_ASSISTENTE_2026-10-19.md), incluindo sincronização preservada autorizada no próprio comando. A seção 10 desse plano contém o texto completo para execução em um pedido.

## Evidências técnicas principais

- Entrada histórica: `git show a901df2:src/features/corretor/pages/CorretorV3Page.tsx`.
- Estado atual: `CorretorProjectsPage.tsx`, `StudyLayout.tsx`, `StudyPreparationPage.tsx`, `StudyRecommendation.tsx` e `CorretorV3Page.tsx`.
- Identidade: `src/components/layout/AuthBlock.tsx`, `src/store/auth-store.ts`, `components/GeobrainAccessProvider.tsx`, `lib/project-access.ts`, `lib/projects.ts`, `lib/materials.ts`, `supabase/functions/corretor-access/{index,core}.ts`.
- Histórico funcional: `LIVE_regras_corretor_vocacionais.md`, `REVISAO_POS_REANALISE_2026-10-13.md`, `RETESTE_SITE_ROLANDIA_2026-10-13.md`, resultados A0/A1, A2/A3, fluxo contínuo e recomendador.
- Fundação: `SE/System Design/README.md`, `FUNDAMENTOS.md`, tokens e mapa; `docs/architecture/FRONTEND_GUIDELINES.md`. Em divergência com o DESIGN_SYSTEM.md antigo do repo, prevalece a fundação SE. Nenhum token alterado nesta proposta.

Preparação documental local, sem commit/push, testes ou mudança de produto. Integração Git depende da autorização de sincronização indicada em U0.

## Inventário Git reproduzível

40 commits após a referência `a901df2` que tocam Corretor ou seus motores/controle de acesso. Inclui commits de integração/bot quando afetam esses caminhos; contagem não equivale a funcionalidades entregues. Ordem abaixo: mais recente primeiro.

- `bb0f22ae` | 2026-10-16 | Gabriel Hxg | feat(corretor): restore recommendations with budget and usage ledger
- `e36c5919` | 2026-10-16 | Gabriel Hxg | fix(corretor): inclui preparacoes autenticadas em meus estudos v0.73.2
- `15e5efc8` | 2026-10-16 | Gabriel Hxg | fix(corretor): encerra rascunho e atualiza carteira pessoal v0.73.1
- `178a96b7` | 2026-10-15 | Gabriel Hxg | feat(corretor): prepara materiais antes da analise e unifica revisao v0.73
- `48949a71` | 2026-10-15 | Gabriel Hxg | fix(corretor): esclarece avaliacao pendente apos pre-analise
- `b2d221e0` | 2026-10-15 | Gabriel Hxg | fix(corretor): torna revisao visivel e documenta analises incompletas
- `c10194e9` | 2026-10-15 | Gabriel Hxg | fix(corretor): remove landing legada e unifica fluxo visual V3
- `ddc22913` | 2026-10-15 | Gabriel Hxg | feat(corretor): integra bancada PDF e primeira persistencia de materiais
- `416488dd` | 2026-10-15 | Gabriel Hxg | feat(corretor): assimila carteira resumo e navegacao A0 A1
- `1f61fa58` | 2026-10-15 | Gabriel Hxg | fix(corretor): permite qualquer login GeoBrain valido sem lista extra
- `d19fd4d3` | 2026-10-15 | gpt-engineer-app[bot] | Changes
- `6cda3f0d` | 2026-10-15 | gpt-engineer-app[bot] | Changes
- `eb0faa16` | 2026-10-14 | Gabriel Hxg | feat(corretor): carteira cadastro e contrato de originais privados
- `e0c9d980` | 2026-10-14 | Gabriel Hxg | fix(corretor): preserva erros distintos e amplia revisao offline
- `6073ba3d` | 2026-10-14 | Gabriel Hxg | fix(corretor): confirm recheck cost and review persisted evidence conservatively
- `e230070f` | 2026-10-13 | Gabriel Hxg | fix(corretor): preserve findings outside direct recheck scope
- `47107b2c` | 2026-10-13 | Gabriel Hxg | fix(corretor): guard years and compare narrative household totals
- `f5eff70d` | 2026-10-13 | Gabriel Hxg | test(corretor): automate material replays and browser inspection
- `04edc0d6` | 2026-10-13 | Gabriel Hxg | fix(corretor): baseline Rolandia and recognize socio content
- `35c0656a` | 2026-10-01 | Gabriel Hxg | feat(corretor): complete v0.67 C and D local validation
- `df758192` | 2026-10-01 | Gabriel Hxg | feat(corretor): travel speed, nested radii and project consistency checks
- `44c9242f` | 2026-10-01 | Gabriel Hxg | fix(corretor): drop BMP maps from vision; detect analyst notes by text
- `d495ed6e` | 2026-09-30 | Gabriel Hxg | fix(corretor): text pass reads slides; omitted bands, radii, lacunas totals, hit summary
- `fa4cdd4c` | 2026-09-30 | Gabriel Hxg | ui(corretor): single status line, clear list filters, honest estimate
- `2920197e` | 2026-09-30 | Gabriel Hxg | ui(corretor): drop spreadsheet block from upload screen
- `c69a9134` | 2026-09-30 | Gabriel Hxg | feat(corretor): single-upload flow with pre-analysis and late spreadsheets
- `70e66bbc` | 2026-09-30 | Gabriel Hxg | fix(corretor): resilient vision pass and reconciled persistence
- `ec360792` | 2026-09-30 | Gabriel Hxg | ui(corretor): align city and UF fields in analysis gate
- `efc26e2e` | 2026-09-30 | Gabriel Hxg | feat(corretor): explicit pending-analysis state and persistent gate
- `00dffbad` | 2026-09-30 | Gabriel Hxg | feat(corretor): deck-level reconciliation to drop misread findings
- `fe6fc4da` | 2026-09-29 | Gabriel Hxg | fix(corretor): generalize precision rules after second SJC run
- `7ed49757` | 2026-09-29 | gpt-engineer-app[bot] | Changes
- `ee231076` | 2026-09-29 | gpt-engineer-app[bot] | Changes
- `77401f93` | 2026-09-29 | Gabriel Hxg | feat(corretor): reduce false positives and catch missed errors from SJC triage
- `077f63d1` | 2026-09-28 | Gabriel Hxg | ui: integrate legacy studies into generation tabs
- `feb0163a` | 2026-09-27 | Gabriel Hxg | feat: add v3 source workbook ingestion
- `c1293da3` | 2026-09-24 | Gabriel Hxg | feat: redesign corretor landing workspace
- `3997d169` | 2026-09-24 | Gabriel Hxg | feat: persist corretor source data per study
- `493dd665` | 2026-09-24 | Gabriel Hxg | feat: expand source crosscheck coverage
- `ed46c02d` | 2026-09-24 | Gabriel Hxg | feat: crosscheck corretor against structured sources
