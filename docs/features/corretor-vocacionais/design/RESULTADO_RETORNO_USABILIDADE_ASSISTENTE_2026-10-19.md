# Retorno de usabilidade — resultado local de 19/10/2026

## Estado

Implementação T0–T5 e validação local T6 concluídas; fechamento documental T7 preparado antes do push. Não publicado nem verificado em produção. Sem IA paga, deploy ou mudança no banco remoto. Base sincronizada por fast-forward `bb0f22a` → `d3463d7` (30 commits), com alterações FIERGS e ZIP de referência preservados.

## Antes e depois

- Entrada: carteira com Novo estudo e escolha posterior → duas entradas diretas, **Revisar estudo** e somente **Sugestão de análise**, seguidas pela carteira.
- Acesso: formulário adicional do Corretor e ponte condicionada à rota → sessão compartilhada acima do layout; o formulário do menu autentica APIs e estudos em qualquer rota. Token antigo permanece identificado como acesso somente às APIs. Identidade e email da sessão precisam corresponder à conta do menu. Credenciais rejeitadas não usam fallback; somente ponte ausente permite acesso legado às APIs.
- Ações protegidas: abrem/focam o menu, aguardam login e retomam uma vez. Cancelamento, saída da rota e retorno tardio não executam a decisão. Triagem permite usar o menu sem perder o apontamento.
- Carteira: preserva Todos, Meus estudos e compartilhados; preparação incompleta continua na conta. Cadastro opcional sai das linhas da lista e fica em Dados do estudo. Sugestões são consultadas em lote, por metadados, sem baixar seus textos; indisponibilidade não quebra a revisão.
- Abertura: revisão existente abre diretamente; estudo apenas com sugestão abre essa área. Registros incompletos usam a preparação contínua, com mesmo hash/versão, sem criar outra versão na retomada. Fonte anterior pode ser reaproveitada ou substituída.
- Navegação: Revisão, Sugestão de análise, Arquivos e histórico. Rotas antigas continuam acessíveis; resumo embutido na revisão. Versão antiga sem snapshot não exibe apontamentos atuais como se históricos fossem.
- Materiais: PowerPoint e Excel reconhecíveis, sucesso verde preservado, planilhas antes da análise e escolha explícita quando ausentes. Estimativa e limite continuam antes do início. Evidência única, PDF completo, mapa aberto, português e triagem ampla preservados.

## Evidências locais reproduzíveis

- Vitest Corretor, sessão compartilhada e menu: **327 aprovados, zero falhas, dois ignorados** em `.local-inputs/retorno-usabilidade-tests.json`. Teste adicional de retomada com fonte preservada e testes da sessão: aprovados em `retorno-final-focused.json`.
- `npm run test:corretor:materials`: **10 passes**, baseline e Excel de Rolândia, Toledo, Campos do Jordão, São José dos Campos VAP e v2. Goldens preservados. Relatório `.local-inputs/corretor-regression/2026-10-19T16-02-22.319Z-30460/report.md`.
- `corretor-continuous-browser.mjs`: **15 verificações**, sem erros de página. PPTX real Campos do Jordão, 11 planilhas, PDF de 153 páginas; páginas23/41/66/68/153, duplicata, rascunho consumido, triagem/cancelamento, retomada pendente e avaliação completa simulada. Corpus/decisões comparados por hash.
- `corretor-recommendation-browser.mjs`: **9 verificações**, sem erros de página. Sucesso dos arquivos, alternância sem perder planilhas, previsão antes da confirmação, resultado simulado/reabertura sem nova chamada, métricas e navegação. Duas chamadas exclusivamente interceptadas, zero provedor real.
- `corretor-portfolio-flow-browser.mjs`: **8 verificações**, sem erros de página. Cadastro associa sem reatribuir autoria; preparação sem cidade/cadastro/IA aparece em Meus estudos, permanece após reload; início reutiliza registro; falha simulada mantém avaliação incompleta.
- Telas em1440/1024/390/320, tema escuro e contraste dos arquivos; captura da carteira1440 inspecionada. Evidências brutas permanecem em `.local-inputs/portfolio-flow-1792426110404`, `continuous-browser-1792425978309`, `recommendation-flow-1792425859624`.
- TypeScript `tsconfig.app.json`: aprovado. ESLint dirigido: zero erros/avisos no fechamento. Build gerado em43,52s; avisos existentes de Browserslist antigo e chunks grandes. PowerShell registra stderr como NativeCommandError apesar do bundle gerado; não tratar esse código de saída isolado como prova de falha de compilação.

## Preservação e limites

Nenhuma alteração em `supabase/` ou nos motores de `lib/v3/`. Prompts, preços, controle servidor de lotes/reservas/replays e decisões humanas não foram migrados nem regravados em produção. Dez passes protegem o corpus disponível; não comprovam cobertura de todos os estudos nem corrigem omissões sem gabarito humano. Não houve aceite de Diego/Ana.

Autenticação real, expiração real do provedor, permissões reais e armazenamento remoto não foram exercitados com credenciais: os percursos de navegador interceptam todos os serviços externos. Testes locais cobrem cancelamento, rejeição, token antigo/expirado, remoção e login tardio após trocar de rota. Não constituem homologação do login real. Migrations/deploys de16/10 não foram reaplicados nem presumidos por haver código no Git.

## Publicação e conferência humana

Após revisão e autorização: push do frontend, publicação Lovable e reteste gratuito do login único pelo menu, Meus estudos, retorno à carteira e originais. **Nenhuma migration nova e nenhuma Edge Function nova exigida por este lote.** A ponte existente `corretor-access` deve estar publicada para associar a conta aos estudos; sua ausência mantém apenas APIs, com aviso explícito.

Material: `C:\Users\GaloD\Desktop\SE\_UPLOADS_TESTE\Corretor_V3_Campos_do_Jordao\`; apresentação em `02_APRESENTACAO_SELECIONAR_DEPOIS`, todas as11 planilhas em `01_PLANILHAS_SELECIONAR_TODAS`. Não confirmar processamento pago no reteste gratuito. Novo lote de IA exige orçamento próprio.
