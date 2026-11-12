# Custos fora do fluxo dos analistas — 19/10/2026

## Decisão e escopo

Diego sinalizou que avaliar custos cabe à gestão e pode desencorajar o uso pelos analistas. Gabriel autorizou remover a exposição dessas informações e enviar o ajuste. A interface pede iniciar/retomar a atividade; não pede definir orçamento. Não há início automático ao subir arquivo.

## Mapa da exposição e tratamento

- **Preparação da correção:** removidos estimativa, câmbio, campo de limite em dólares e explicação financeira. Mesma fórmula interna continua calculando o limite enviado ao controlador; validações e teto existentes permanecem.
- **Preparação da sugestão:** removidos previsão, preço, modelo, tokens, reserva e campo de orçamento. Mantida a descrição do que será lido e do que fica fora da cobertura. Botões Preparar sugestões/Retomar sugestões.
- **Execução:** progresso mostra etapas e tempo; não mostra dinheiro ou consumo do provedor. Botão de pausa preservado.
- **Confirmação de reconferência e portões antigos:** ação explícita mantida, sem moeda ou pedido de aprovação financeira. Compatibilidade de props preservada para não alterar o controlador.
- **Notificações:** conclusão/pausa/reconferência/cruzamento sem gasto, cobrança ou anúncio de gratuidade. Mensagens financeiras recebidas do processamento são traduzidas em orientação operacional, sem alterar o erro registrado pelo servidor.
- **Sugestões persistidas:** histórico conserva data, estado, conteúdo e versão do arquivo. Não renderiza gasto, previsão, reserva, tokens, modelo ou contagem de chamadas. Retorno desconhecido continua bloqueando repetição e mostra orientação para atualizar o histórico.
- **Cabeçalho e relatório do estudo:** removido gasto acumulado; slides, versão do arquivo, apontamentos e decisões permanecem.
- **Histórico antigo:** removido total monetário por estudo.
- **Calibração:** painel financeiro não é montado na rota do produto; link passa a Calibração dos apontamentos. `AiUsagePanel`, consulta de métricas e dados permanecem no código/base para gestão interna, sem abrir um novo painel administrativo ou inventar papéis.
- **Painel de teste de ata:** resultado mostra leitura concluída/reaproveitada, sem valor.

Valores do conteúdo do estudo, como preço por metro quadrado e números de tabelas, são evidências e permanecem. A alteração não é uma política de acesso aos dados financeiros por API; retira sua apresentação no fluxo do produto. Os componentes aposentados `CorretorPage`, `CorretorAnalysisPage`, `NewProjectForm` e `AuditoriaV2Page` não são as rotas atuais e não foram reativados. Seus controles não integram esta entrega.

## Preservação verificável

Sem mudança em `supabase/`, migrações, prompts, preços, `lib/v3/execution.ts`, `lib/v3/db.ts` ou `lib/recommendations.ts`. Esses arquivos preservam persistência de gastos/tokens, reservas, limites, replays, bloqueio de retorno desconhecido e cálculo interno. Nenhuma exclusão de consumo antigo ou decisão humana; nenhuma chamada real paga, escrita no banco remoto ou deploy de função.

## Evidências e reprodução

1. Testes de StudyPreparationPage verificam ausência de campo monetário e envio do mesmo limite interno no início explícito.
2. StudyRecommendation verifica geração com limite positivo, resultado salvo sem nova geração, bloqueio de retorno desconhecido e histórico indisponível sem iniciar IA.
3. processing-message testa a apresentação operacional de erros financeiros sem modificar as mensagens de conteúdo do estudo.
4. `scripts/diagnostics/corretor-cost-free-ui-browser.mjs`: PPTX real de Campos do Jordão, rede externa integralmente interceptada. Seis verificações aprovadas; zero erros de página. Geração simulada recebeu limite positivo e conservou gasto0,000195USD e1000 tokens de entrada nos registros simulados sem renderizá-los. Reabertura não repetiu a execução. Preparação da correção, cabeçalho/resumo, relatório e calibração sem dados financeiros. Capturas1440/390/320 sem estouro horizontal.

Logs, JSON e capturas em `.local-inputs/cost-free-ui-1792432618470`, `cost-ui-browser.log`, `cost-ui-tests-final.json`, `cost-ui-materials.log`, `cost-ui-types.log`, `cost-ui-lint.log`, `cost-ui-build.log`. Materiais brutos continuam locais/ignorados. Resultado final das suítes registrado no fechamento LIVE.

## Publicação e limites

Push autorizado. Necessário Publish do frontend no Lovable e conferência no site publicado; código/teste local não prova deploy. Não há migration ou Edge Function nova. Login real e persistência real não foram usados para gerar IA neste lote: a prova de execução é simulada, complementada pela comparação dos arquivos internos preservados. O controle continua aplicado pelo servidor existente. Aceite pós-publicação: conferir novos estudos, sugestão salva, revisão, relatório e mensagens de pausa sem iniciar processamento real desnecessário.
