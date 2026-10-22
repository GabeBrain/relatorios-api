# Rolândia: avaliação incompleta apresentada como pausa

## Correção do bloqueio excessivo introduzido na recuperação

Gabriel rejeitou a trava de “conferência técnica pela equipe” ao tentar continuar. Esse requisito foi introduzido pelo agente no86de30f: `reviewRecoveryState` exigia zero pending/reserva, e start impedia qualquer revisão interrupted com unknown. Não era uma nova avaliação humana do negócio. Essa proteção impedia trabalho independente e contradizia a solicitação de continuar de onde parou. Testes anteriores validavam o bloqueio excessivo; não demonstravam a retomada útil de outro lote.

Corrigido: status distingue unknown de running. Prepared/interrupted/failed podem continuar se não há chamada running; a reserva de unknown fica intacta e no teto vigente. Reserva sem lote que a explique continua falhando fechada. Start não precisa resolver um unknown para autorizar outros hashes. Claim transacional continua proibindo repetir o lote desconhecido; o controlador retorna REVIEW_BATCH_UNCONFIRMED para esse hash, sem chamar folha/provedor ou tocar no registro. Lotes completed usam replay/cache; lotes novos seguem o controle de orçamento existente. Não há liberação de reserva, aumento automático do orçamento, limpeza de consumo ou duplicação autorizada.

Interface remove a exigência de conferência por equipe, libera continuar as demais etapas e informa que a leitura sem retorno aparece como pendência da revisão. Não declara que a imagem foi lida ou que a análise integral terminou; entrega/snapshot completo mantêm seus critérios. A exceção original permanece sem causa recuperada, e este complemento **não conclui a análise real por execução do agente**.

Cobertura image-not-read atualiza só aviso automático pendente/sem veredicto, mantendo payload anterior em readCoverageHistory. Filtro de update também verifica status/veredicto e detalhe anterior, para não sobrescrever decisão ou cobertura concorrente. Assim, uma retomada que confirma s45 passa a listar apenas s4, sem perder a evidência anterior; achados ignorados/corrigidos/revisados por humano não são alterados.

Teste do controlador real transpilado, com banco e fetch totalmente simulados, comprova: review_status libera restante com37completed/1unknown; start reaproveita execução com reserva; unknown retorna409 sem folha/finish/escrita; completed retorna replay sem provedor; novo hash chama folha uma vez e finish uma vez. Testes de cobertura verificam histórico e proteção de decisões. CI passou a incluir esses cenários, sem rede/IA nesses testes. Logs privados em `.local-inputs/review-luna-20261021/suite-resume-remaining.log`.

**Publicação necessária deste complemento:** apenas `corretor-execution` com `_shared/reviewer.ts` atualizado e frontend Publish. As três folhas e review-provider não mudaram. Push leva os arquivos ao Code; não é preciso colar os mesmos códigos novamente. A publicação ativa do backend continua separada. Nenhuma migration. Estado local até envio/publicação confirmados; lote histórico permanece preservado.

Validação final deste complemento: **392testes aprovados/2ignorados**,56arquivos aprovados,20,49s; TypeScript aplicação/lint/Deno aprovados; build24,67s com avisos preexistentes. São testes locais/simulados, não uma nova avaliação do estudo ou prova de causa do retorno antigo. Nenhuma chamada paga ou alteração remota de dados/deploy pelo agente.

## Continuidade solicitada: resultados parciais e retomada protegida

Gabriel autorizou envio de36ebc7a/8c2f799, realizado para origin/main; CI técnico/documental39719712840/39719712792 aprovados. Em seguida pediu alternativa para concluir a avaliação daqui ou oferecer fallback/retomada no produto. O agente continua sem credencial administrativa do backend correto ou do provedor; **não concluiu a análise real, não reconciliou o unknown e não chamou IA**.

Implementação: estudo pendente com achados abre a bancada dos **resultados salvos até aqui**, com aviso persistente de cobertura incompleta, filtros, evidências e revisão individual. Pode conferir materiais e voltar aos resultados; não precisa excluir ou reenviar para vê-los. Entrega/relatório completo continuam bloqueados. Reconferência de versão e alteração de planilhas ficam na preparação enquanto pendente, evitando modificar o contexto silenciosamente na bancada parcial.

Nova ação `review_status` no controlador faz somente SELECT com owner verificado, estudo, versão, SHA e purpose review; retorna estado/quantidades/possibilidade de retomada, sem saldos/custos/materiais ou tabelas técnicas públicas. Recupera ponteiro local da execução já verificada, sem iniciar processamento. Consulta indisponível ou controlador antigo falha fechada para continuar, mantendo acesso aos resultados. Tentativa de outro navegador recebe orientação sem expor identificador ou consumo.

Retomada é liberada para prepared/interrupted/failed sem lotes running/unknown e sem reserva; running/completed ou estado inválido não autorizam execução. `start` também reconfere no servidor antes de reabrir a revisão, inclusive interrupted com unknown; o claim transacional existente mantém a proteção contra concorrência. O botão de consulta não cria lote ou IA. No caso atual, o lote unknown continua bloqueando continuação até reconciliação administrativa baseada em evidência; **o fallback não elimina essa pendência nem demonstra causa histórica**.

Após liberação válida, preparação recupera PPTX/Excel deste navegador, fonte persistida, cidade/UF/outras cidades e ata confirmada. Usa a mesma versão/perfil/execução; cache e respostas completed são reapresentados com tokens/custo zero no cliente, sem nova cobrança desses lotes. Não muda modelo, prompts, chave de cache ou limites. Achados são inseridos com ignoreDuplicates já existente; decisões/status humanos não são sobrescritos. Aviso image-not-read só é encerrado na análise completa se ausente da cobertura final, pendente e sem veredicto humano. Se o arquivo não estiver no navegador, continua possível selecionar o mesmo original; material de outra versão é recusado.

Publicação: atualizar **shared/reviewer.ts e shared/review-provider.ts**, publicar as três folhas com as dependências atualizadas, depois corretor-execution, e Publish frontend. **Nenhuma migration nova**. Compartilhados não são funções independentes. Os seis arquivos completos têm links no retorno da sessão. Código no Git não comprova empacotamento ativo.

Validação: **380testes aprovados/2ignorados**,54arquivos aprovados,19,97s; tipos aplicação/lint/Deno aprovados; build42,39s com avisos preexistentes. Inclui regras de retomada, leitura sem start, reaproveitamento sem custo/tokens duplicados, estados do painel e início bloqueado. Prévia isolada do componente real em1440/390px, claro/escuro, ações materiais/resultados/consulta, sem erros de página ou overflow; rede externa bloqueada. Navegador conectado indisponível, portanto prévia foi headless local com entorno simulado, não estudo de produção. Brutos/logs ficam ignorados em `.local-inputs/recovery-20261022/` e `.local-inputs/review-luna-20261021/suite-recovery.log`. Não foram reexecutados dez passes de materiais ou provedor real nesta rodada.

## Complemento: lote privado e logs enviados por Gabriel

O SQL administrativo fornecido em22/10 confirma **um lote unknown**, hash685e75a9…15321b7, analyze-table-image, criado2026-10-22T03:27:18.776715Z, execução5ef5c1a9. Response contém somente o erro genérico do catch da folha; sem uso, finishReason, errorCode ou campos inválidos. A execução está interrupted, com **US$0,0360202 contabilizados** e **US$0,2280224 reservados**. Reserva não é cobrança confirmada nem prova de consumo zero do lote desconhecido. Não foi alterada ou liberada.

Essa mensagem específica localiza a falha no catch da folha, que descartava a exceção. Não comprova erro de schema, timeout, HTTP específico do provedor ou causa interna. A resposta anterior do controlador conservou corretamente a incerteza, porém não conservou o status HTTP recebido. O segundo slide pendente não gerou outro lote na consulta: seu bloqueio ocorreu antes de uma nova chamada autorizada, com motivo SQL também mascarado. Não atribuir bloqueio a orçamento ou ao primeiro unknown sem registro específico.

Os logs colados em seguida trazem Boot/Shutdown da função05dc9b30, sem reason, execution_id da invocação ou status HTTP. O primeiro Boot informado é03:27:13.537Z, e há encerramentos posteriores; proximidade temporal não vincula um worker ao lote. Shutdown isolado não significa falha de requisição. A [documentação Supabase](https://supabase.com/docs/guides/troubleshooting/edge-function-shutdown-reasons-explained) distingue término natural de limite de tempo/CPU/memória pelo reason ausente nesses registros. Não foi possível recuperar a causa original a partir desse recorte.

### Correção de diagnóstico, sem reconstruir consumo

Preparado no shared/review-provider: códigos para falha de transporte, timeout identificado pela exceção, HTTP do provedor, envelope JSON ilegível e uso ausente. A folha registra fase/status/request-id/duração quando disponíveis, vinculados à execução, sem serializar mensagens arbitrárias, imagens, prompts, credenciais ou resposta de erro do provedor. Exceções internas têm código próprio. Texto/ata/visão compartilham o mesmo tratamento.

Controlador conserva diagnóstico/status da folha no response privado do lote unknown e registra motivo técnico do bloqueio de claim por classes conhecidas, sem expor SQL ou saldos ao analista. Não repete chamada, não inventa tokens/custo, não muda reserva, modelo, limites, prompt, validação ou cache; não altera resposta de lote já concluído. O snapshot completo continua bloqueado se houver falha de imagem. Esses registros ajudam nas próximas falhas, **não recuperam retroativamente a exceção descartada**.

### Publicação deste complemento

Nenhuma migration. Atualizar `supabase/functions/_shared/review-provider.ts`, as folhas `analyze-text-batch/index.ts`, `analyze-ata-image/index.ts`, `analyze-table-image/index.ts` e `corretor-execution/index.ts`. Shared é dependência empacotada, não função separada: as três folhas precisam ser publicadas com o shared atualizado; depois o controlador. O frontend do36ebc7a também aguarda Publish. Salvar arquivo/Git e deploy ativo são evidências distintas; não afirmar vigência só por push.

Checagens locais:37testes focados, **369aprovados/2ignorados** na suíte Corretor (52arquivos aprovados,20,21s), TypeScript aplicação, Deno quatro funções e ESLint dirigido aprovados. Log privado `.local-inputs/review-luna-20261021/suite-provider-diagnostics.log`. Sem provedor real, dez passes materiais novos, SQL de alteração, deploy ou IA nesta rodada. Estado validado localmente, não causa histórica corrigida/homologação de produção.

Próximo: obter detalhe HTTP/erro da invocação histórica ou registro do provedor correlacionado à janela03:27–03:30Z, sem reenviar o estudo. Sem isso, não autorizar repetição do unknown ou liberação da reserva por suposição. A consulta de suporte inclui agora budget_usd para eventual investigação do bloqueio, mas saldo atual não reconstrói sozinho o saldo no instante do claim.

## Conclusão observada em 22/10

Gabriel publicou e relatou aproximadamente sete minutos de processamento, depois aviso amarelo de estudo pausado e volta à preparação, sem pedir pausa. Consulta pública REST somente leitura ao backend correto confirmou o estudo ativo **edda49da-3f0e-4fdf-add8-64e771840b19** (novo envio do mesmo arquivo),13planilhas salvas, sem relatório final. Os estudos anteriores5b389531/32a2234c estão excluídos logicamente conforme leitura, sem alteração pelo agente.

Persistidos no ativo: **12 achados DET,8 IA_texto e2 IA_visao**, todos pendentes. Não são22 erros confirmados por humanos. A análise não foi perdida integralmente, tampouco concluída.

ia_passes tem **37 chamadas contabilizadas**, todas gpt-6-luna e finish_reason stop:1 ata,6 texto,30 tabelas-imagem. Total técnico registrado0,0360202USD. Essas37 terminaram normalmente segundo os registros; isso não cobre uma chamada de retorno desconhecido sem contabilização. Execução associada: **5ef5c1a9-a3fd-48ba-9c51-cfbec6016778**.

Achado persistido image-not-read identifica **duas imagens, slides4 e45** (`image12.jpg`,223KB; `image58.png`,16KB). Mensagens preservadas resumem retorno não confirmado e lote bloqueado por proteção do controlador. Não há evidência suficiente de timeout, causa de bloqueio/orçamento, erro de schema ou simples pausa humana. Os motivos estavam truncados a80caracteres na cobertura e o lote privado não é acessível publicamente. Não conceder acesso público ou liberar reserva para destravar por suposição.

## Causa confirmada da experiência confusa

runPhase2 devolvia aborted para **signal.aborted OU vision.failed.length**. CorretorV3Page apresentava todos esses casos como “Análise pausada — continua pendente”, não salvava snapshot completo e encerrava a execução como interrupted. A ausência de relatório faz analysisPending renderizar StudyPreparationPage. O progresso da visão contava tentativas, incluindo falhas, até total/total e mostrava selo concluído.

Isso explica o aviso e a volta sem concluir, mas não identifica a origem do retorno desconhecido do slide4 ou o bloqueio do45. A chamada da ata passou nesta execução (uma contabilizada); não confundir com o incidente anterior de listas null.

## Correção local da comunicação

Falhas de imagem agora são propagadas separadas de pausa manual. O banner mostra leituras confirmadas e número pendente, sem selo de sucesso se houve falha. Após erro, mensagem persistente com slides pendentes e orientação de conferir registros, sem exigir reenvio; reabrir recupera a informação do image-not-read salvo. Pausa manual mantém seu aviso próprio. Nenhum snapshot de avaliação completa é criado em resultado incompleto. Não há retry automático ou mudanças em prompts, motores, modelos, orçamento, caches ou decisões humanas.

Atualizada contagem final de tentativas para não mostrar total concluído após cancelamento parcial. A normalização de ATA publicada foi preservada; mudanças remotas do editor foram sincronizadas mantendo arquivos locais alheios. Comparação estrutural confirmou equivalência do controlador/shared com696563f; diferenças da folha ATA incluem formatação/representação de chaves, sem mudança implementada nesta sessão nela.

## Próximo dado necessário

Executar **CONSULTA_IMAGENS_PENDENTES_ROLANDIA_2026-10-22.sql** no SQL Editor administrativo. É leitura dos lotes da execução atual, incluindo unknown/running e erros, estado/saldo atual e metadados de resposta/perfil. Não cria lote, não chama IA e não encerra nada. Retorno unknown com response nula não comprova ausência de processamento: investigar o registro/log do provedor antes de repetir. Não excluir ou reenviar o estudo; resultados confirmados permanecem.

## Evidência e estado

Suíte Corretor: **363 aprovados /2 ignorados**,52arquivos aprovados,21,87s, log privado .local-inputs/review-luna-20261021/suite-image-interruption.log. Dois casos adicionais distinguem pausa humana de falha, ordenam slides e preservam orientação de não reenviar. TypeScript da aplicação/lint dirigido aprovados. Sem dezpasses materiais ou provedor real nesta rodada.

Build final23,66s, código0, com avisos preexistentes de bundle/Browserslist. Documentação viva e diff --check aprovados. Não foi necessário alterar funções ou banco para corrigir a apresentação da falha.

CI do push anterior696563f confirmou sucesso no run39715890830; isso não é homologação da nova execução real. Leitura atual, código local e evidências distinguem diagnóstico observado de correção publicada. Não houve SQL de alteração, IA, limpeza de registros ou deploy pelo agente. A correção de comunicação requer só frontend Publish após envio; **nenhuma migration ou Edge nova neste complemento**. A causa específica dos dois lotes permanece pendente da consulta administrativa.
