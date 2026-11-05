# SP — fila contínua da coleta detalhada

05/11/2026 · Codex · pedido do usuário após consulta de53páginas exceder7minutos.

## Causa observada no consumidor

`fetchSpBuildingRecords`, em `projects.ts`, aguardava cada lote de até três páginas com `Promise.allSettled` antes de começar o lote seguinte. Uma página lenta deixava vagas ociosas mesmo com outras páginas pendentes. Isso é uma espera comprovada no código; não prova que explica sozinho todos os minutos observados pelo usuário. A captura52/53 também pode representar uma última página lenta na API.

## Mudança

Três trabalhadores compartilham uma fila de páginas: quando um conclui, inicia imediatamente a próxima. A página1 continua primeiro para confirmar total e paginação. O limite de três requisições simultâneas foi mantido; um retry/backoff ocupa sua vaga até terminar. Falha interrompe o agendamento e aguarda as requisições já iniciadas antes de rejeitar. Cancelamento não publica coleção parcial.

Mesma rota POSTv2, autenticação da sessão, filtros,100registros por página, timeout/retry/Retry-After e ausência de cache HTTP. Cobertura exata do total/IDs distintos, duplicatas conflitantes, escopo, paginação instável e páginas intermediárias vazias continuam protegidos. Método aplica-se também à coleta básica SP que reutiliza esse consumidor. Outros motores não foram alterados.

Cache privado já existente da página continua compartilhando a coleta entre bairros, áreas, preços e estoque; invalidação por geração/escopo/sessão e atualização explícita não foram ampliadas. Sem persistir históricos ou credenciais no navegador e sem limitar os dados consultados por um filtro temporal não comprovado na API.

## Evidência controlada

Teste usa relógio virtual e o próprio coletor:53páginas/5.229IDs, uma página de30s a cada três e as demais de1s. A política anterior soma541.000ms (9min01s); a fila contínua termina em195.000ms (3min15s), redução de aproximadamente64%. Não é medição de produção, previsão ou garantia de tempo. Com latências uniformes, a diferença tende a ser menor; uma última página demorada continua podendo determinar o tempo total.

Quatro regressões novas cobrem vaga reocupada antes de terminar a página lenta, cobertura/ganho controlado em53páginas, parada e drenagem na falha, cancelamento durante a fila. Os testes anteriores continuam cobrindo limite de três, respostas fora de ordem, acesso negado sem fallback, Retry-After, identidade e integridade da paginação.

## Validação operacional

Reteste autenticado após publicação deve medir tempo total e, se continuar alto, latência/tamanho/retries das requisições individuais no painel Network. Não incluir token ou payload bruto em documentação. O agente não executou nova coleta GeoBrain autenticada nesta alteração. Não afirmar que o tempo real caiu para3min15s antes desse reteste.

Reutilizado `BrainLoadingState` existente com etapa, tempo real e cancelamento; não há mudança de layout, primitive ou fluxo visual. Testes/build e ensaio local são registrados no EVIDENCIAS.md e no documento vivo após conclusão.
