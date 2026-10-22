# Falha de início e exclusão — Rolândia, 21/10/2026

## Atualização: retorno Lovable e correção local

**Reconciliação posterior informada por Gabriel via retorno Lovable:** execuções `3b975f4f-e726-464e-b3fa-8045367e390e`, `a059b088-9c75-4953-b8db-93da22cd92a2` e `ef9c3c41-0189-42fd-b2bb-2e47631fdceb` foram reconferidas e marcadas `failed`. Lovable reportou estados finais verificados, zero lotes/gastos/reservas/ia_passes, sem exclusão ou IA. Supera a pendência de reconciliação descrita abaixo; evidência é o retorno administrativo fornecido pelo usuário, sem nova leitura privilegiada nesta sessão. A correção de código permanece nos commits locais f345adb/c9bd1c6; envio, republicação do controlador e frontend e homologação do início real continuam pendentes. Não reclassificar essas tentativas como legadas nem remover seus registros.

Gabriel trouxe inspeção administrativa do Lovable: três execuções prepared sem lotes, gasto, reserva ou ia_passes; contextos têm reviewProfileId Luna mas não reviewProfile confirmado. Quatro funções publicadas pelo Lovable a partir de63966e7, recusa403 nas folhas/400 no controlador sem provedor; nenhuma tentativa encerrada. O contrato start foi exercitado pelo Lovable somente em cenário isolado, não em start válido no servidor. O achado confirma o contexto incompleto que dispara a falha local de início; não determina independentemente o binário que respondeu a cada tentativa anterior.

Correção autorizada localmente: executionReviewProfile recusa perfil moderno solicitado sem snapshot, e identificação divergente; contexto realmente legado continua permitido. Controlador devolve409 específico antes de comparar/reativar retomada inválida, mantendo a execução intacta. Cliente guarda id e marcador remoto antes de validar perfil; se a resposta antiga vier sem perfil ou com perfil desconhecido, nenhum batch é permitido e o catch consegue chamar finish com esse id. Erros HTTP JSON preservam a causa operacional. Resposta de rede sem id continua inconclusiva e não pode ser encerrada por suposição.

CorretorV3Page mantém erro no estado do pai durante desmontagem da preparação/banner; StudyPreparationPage mostra o aviso no topo com role alert. Navegação à revisão só ocorre após sucesso completo; não há mais navigate no finally. Falha da fase paga retorna false ao chamador, não sucesso aparente. Retenção dos materiais e decisões permanece.

Para publicar esta correção: reenviar **corretor-execution**, incluindo `_shared/reviewer.ts`, e fazer Publish do frontend. Não há migration nova nem necessidade de republicar as três folhas por esta correção. As três tentativas já órfãs exigem a reconciliação administrativa separada, após reconferir lotes/uso/reservas; não foram alteradas aqui. Erros de encerramento não autorizam repetir lote desconhecido.

Validação desta correção: TypeScript da aplicação, Deno do controlador, lint dirigido e build local; não reexecutados testes, ensaios de IA ou homologação em produção. Os355testes/dezpasses da entrega anterior não equivalem a novos ensaios desta correção. Estado preparado/checado estaticamente, não publicado.

## Estado e evidência real

Diagnóstico solicitado após teste publicado de Gabriel. Consulta REST somente leitura ao backend correto `mxinpvcqzbfbzjodhgtz`: estudo `5b389531-9190-41b5-8acf-5b035fa0f4ce`, arquivo de teste SHA-1 `3c29b01ad65beea417aabf8fe394f01d2a95cd46`, versão 1, recebido em `2026-10-21T23:36:28.317565+00:00`. Cidade Rolândia/PR, ata confirmada, estado em_correcao, não excluído, sem relatório. Fonte persistida como **13 planilhas**, atualizada em `2026-10-21T23:39:14.017+00:00`. Três achados DET, nenhum achado IA nessa consulta; ausência de achado IA não prova ausência de consumo.

Pedido inválido a corretor-execution recebeu 400 antes do provedor. OPTIONS respondeu 200 com origem Lovable correta: não há evidência de indisponibilidade geral/CORS nesse controlador. Isso não comprova sua versão implantada ou a das folhas.

Tabela de execuções permaneceu privada (consulta pública negada). Não conceder SELECT a anon apesar da sugestão automática do PostgREST. Nenhuma IA, SQL de alteração, exclusão, deploy ou limpeza de execução foi executada neste diagnóstico.

## Causas confirmadas no código e hipótese de implantação

1. O estudo e a fonte são registrados antes de beginExecution em CorretorV3Page. Portanto salvar os materiais não significa que a análise começou. Os dados consultados confirmam esse salvamento parcial.
2. A mensagem da imagem de exclusão existe em `20261019182241_corretor_study_trash.sql`: a função privada rejeita excluir se existe execução prepared/running. O print comprova esse bloqueio no momento da tentativa, sem revelar qual execução o causou.
3. Em execution.ts, beginExecution rejeita resposta sem reviewProfileId **antes** de atribuir active e gravar o marcador local. Se um controlador antigo criar a execução e devolver apenas id/state, a rejeição ocorre depois da criação remota. finishExecution no catch encontra active nulo e não encerra a execução. Resultado compatível: prepared órfã, sem análise nem possibilidade de pausa nessa tela.
4. Há janela semelhante se o retorno de start se perder na rede ou se o perfil retornado for desconhecido. A causa remota exata depende de ler a execução/log ou obter o primeiro erro, não pode ser inferida apenas pelo print.
5. Em ingestNew, finally navega para revisão mesmo após erro. Sem relatório, a condição pending renderiza novamente StudyPreparationPage. O erro local pode desaparecer ao desmontar a preparação. Isso explica a volta para o formulário; não é prova de perda dos materiais.
6. Erros HTTP em beginExecution descartam o corpo específico quando functions.invoke retorna error; o aviso genérico inclui orçamento e processingMessage o substitui. Há perda de diagnóstico operacional independente da implantação.

Hipótese principal: frontend Luna publicado com controlador antigo. Folhas antigas também são incompatíveis com Luna, mas erro posterior ao start normalmente passa pelo encerramento e não explica sozinho a execução órfã. Também considerar perda de resposta/recarregamento. Não declarar deploy antigo confirmado sem evidência administrativa.

## Verificação administrativa única, sem IA

Pedir ao Lovable no backend **mxinpvcqzbfbzjodhgtz**:

> Diagnostique sem processar IA nem alterar estudos. Para study_id 5b389531-9190-41b5-8acf-5b035fa0f4ce, consulte corretor_executions e os lotes correspondentes: id, state, purpose, created_at, updated_at, spent_usd, reserved_usd e confirmed_context->'reviewProfile'->>'id', além de quantidade/estado dos lotes. Não exiba owner_hash, segredos ou conteúdo do documento. Confira o resultado de corretor_review_profile_schema() e a implantação das quatro funções contra o código da main (implementação fe5c7f9, documentação 63966e7). Confirme se start de revisão retorna reviewProfileId e se as folhas importam review-provider.ts. Traga os logs de erro do início, sem chamar start/batch ou provedor. Não encerre nem remova execuções antes de informar se há lotes ou reservas desconhecidas.

Se versões antigas forem confirmadas: publicar com dependências compartilhadas analyze-ata-image, analyze-text-batch, analyze-table-image; depois corretor-execution; então Publish frontend. Migration e Publish frontend isolados não atualizam necessariamente essas funções.

## Correção proposta após diagnóstico

- Guardar identificação de start confirmado antes da validação do perfil e permitir reconciliação/encerramento seguro, sem enviar batch em incompatibilidade.
- Exibir erro persistente e acionável na preparação; não navegar no finally em caso de falha.
- Diferenciar execução ativa de execução pendente de reconciliação; disponibilizar estado/pausa conforme propriedade, lotes e reservas. Não liberar exclusão ignorando consumo desconhecido.
- Preservar a causa HTTP em registro técnico, apresentando aviso em português sem valores financeiros.
- Para a execução já bloqueada, só encerrar administrativamente após conferir todos os lotes/reservas. Não remover materiais ou decisões.

Estado: diagnóstico parcial com evidência de produção e causas locais rastreadas; implantação exata e recuperação dependem da inspeção acima. Sem correção aplicada ou teste de IA nesta etapa.
