# Carregamento Brain e falha na leitura de ata

## Causa confirmada e correção posterior — 21/10

Gabriel forneceu o resultado SQL de dois lotes de analyze-ata-image: execuções `4b341e7f-6625-4c26-8143-8be1453b3286` (estudo novo32a2234c) e `8d52e8e7-9048-4721-81fe-cc50995a8f76` (estudo anterior5b389531). Ambos lotes completed, execuções failed, término stop e sem recusa; custos individuais0,0010786/0,0010231USD já registrados. O estado completed do lote significa retorno contabilizado, não relatório concluído. reserved_usd da linha do lote é a reserva histórica; não equivale ao saldo atual da execução.

O JSON real do lote novo, fornecido depois pelo usuário, tem ata válida e três campos explicitamente null: `observacoes_localizacao`, `comentarios_sobrepostos` e `duvidas_cliente`. O prompt permite null para campo ausente, enquanto o validador exigia cinco listas. **Causa confirmada para esse lote: incompatibilidade de representação no nosso validador**, não truncamento, recusa ou ausência de conteúdo. O outro lote tem metadados compatíveis, mas seu JSON não foi inspecionado; não afirmar equivalência integral. Nenhum provedor foi chamado pelo agente.

Correção: normalização pura `ata-null-lists-v1` converte somente null explícito nas cinco listas conhecidas em []; mantém pedidos, candidatos, valores escalares e conteúdo original. Campo ausente, string/número/lista inválida e JSON malformado continuam recusados. A normalização ocorre antes de validar a resposta do provedor e deixa versão/caminhos em metadados. Não altera prompt, modelo, limites, preços ou hashes dos lotes.

Recuperação sem nova IA da ata: quando o claim transacional, já autorizado pelo proprietário, devolve **cached de lote completed**, o controlador pode reler invalidOutput privado, exigindo mesmo perfil, stop, ausência de recusa e erro de schema conhecido. Se apenas corrigir null nas listas torna a ata válida, reapresenta-a em memória com `recoveredFromStoredResponse`, sem alterar o lote original, chamar provedor, chamar finish de novo ou duplicar custo. Frontend já zera uso/custo de replay. Lotes unknown/running nunca entram nesse caminho. O reaproveitamento depende de retomar a mesma execução/material no mesmo navegador; não excluir e reenviar como outro estudo.

Outro impedimento demonstrado no código: reextrair os mesmos Excel atualiza `fonte.gerado_em`, e a comparação anterior recusava retomada por esse horário. Agora a comparação de retomada ignora **só esse metadado**; todo o restante do contexto e dos materiais continua comparado. A retomada usa o snapshot/context_hash original, sem reescrever histórico ou criar nova tentativa. Alterações de números/cidade continuam bloqueadas.

Ata multi-estudo real lista Toledo, Rolândia e São José dos Campos. A normalização de localização foi compartilhada entre folha e recuperação, com proteção para mais de uma candidata: cidade/UF continuam null, sem escolher a primeira cidade ou substituir a confirmação humana. Não afeta as listas de candidatos/pedidos. Derivação da localização única permanece coberta.

Validação posterior: **33 testes focados aprovados**, reprodução derivada da resposta real, normalização sem mutação/idempotente, casos malformados, multi-cidade, recuperação/consumo intactos e fornecedor simulado com uma chamada. TypeScript/lint dirigido e Deno das quatro funções aprovados. Nenhum teste pago, SQL remoto, deploy ou limpeza pelo agente. Primeiro roteiro de impressão do log teve falha de encoding depois do processo Vitest retornar0; o teste adicional simulado precisou adaptar AbortSignal.timeout ao ambiente jsdom. Rodada final33/33 e log privado `ata-null-lists.log` prevalecem.

### Publicação acumulada do carregamento e da correção

Build final do complemento20,97s, código0, com os avisos de bundles/Browserslist já existentes. Documentação viva e diff --check conferidos antes do commit.

Suíte completa do Corretor reexecutada após o complemento: **361 testes aprovados / 2 ignorados**,52 arquivos aprovados; código0,16,85s, log privado `suite-ata-null-lists.log`. Os dois ignorados não contam como validação; dez passes de materiais não foram reexecutados nesta rodada. Isso supera, para esta rodada posterior, os limites de testes das seções históricas abaixo. Sem provedor real ou escrita remota.

Não há migration nova. Atualizar **analyze-ata-image** com `_shared/review-provider.ts` e `_shared/reviewer.ts`; depois **corretor-execution** com reviewer compartilhado; Publish frontend para o carregamento já preparado no00e0bb5. As outras duas folhas só precisam de republicação para receber os novos motivos diagnósticos do00e0bb5; não dependem da correção específica de listas da ata. A pasta shared é empacotada, não uma função separada. Guardar/sincronizar código não é prova do pacote ativo. Usar edição/publicação manual disponível, sem pedir execução de IA ao Lovable.

Depois da publicação, retomar o estudo novo existente no mesmo navegador com as mesmas planilhas. A ata recuperada não chama IA novamente; as etapas seguintes ainda não executadas podem usar IA normalmente mediante início explícito. Não prometer que todo o estudo será concluído sem custo ou que a execução inteira já foi homologada.

## Entrega local

Aplicado o preenchimento horizontal da logo usado pelo dashboard Quanti, sem alterar a fundação ou as ferramentas fora do Corretor/Sugestão. Componente CorretorLoadingState com logo de fundo opaca, camada preenchida, texto da etapa, tempo real e movimento reduzido. A animação é atividade indeterminada; os contadores externos são o progresso efetivamente confirmado.

Cobertura: carteira/listas e versões, restauração/preparo do PPTX, armazenamento e leitura de Excel, confirmação inicial, registro/início da execução, triagem/ata/texto/visão/cruzamento/salvamento, reconferência, carregamento de apontamentos/bancada, histórico/preparo/geração de sugestões, envio de materiais e PDF/slide. Não foi adicionado percentual estimado nem promessa de término. Conteúdo existente mantém opacidade durante atualização. Botões de pausa mantidos. Após erro, título Avaliação interrompida, causa visível e indicação de documentos preservados.

## O erro atual é diferente do início sem perfil

Prints recebidos mostram triagem1/1 e ata0/1, depois a mensagem exata de callReviewProvider: uso retornado, mas conteúdo incompleto/inválido. Portanto o caminho chegou ao provedor e recusou a resposta; não é a antiga recusa por perfil ausente antes de qualquer chamada. Essa mensagem só é construída depois de receber uso e testar finish_reason, recusa, JSON e contrato da tarefa. Ela não informa qual desses testes falhou, nem prova por si só conclusão da contabilização no banco.

Leitura pública do arquivo de teste encontrou dois estudos: primeiro5b389531-9190-41b5-8acf-5b035fa0f4ce e novo32a2234c-89a9-4dfc-9eaf-be4fa63df6e9 (recebido2026-10-22T01:55:59.825258+00:00, ainda21/10 em São Paulo). Não houve leitura privilegiada dos lotes, nova avaliação, limpeza ou IA pelo agente.

Hipótese concreta, **ainda não confirmada para a resposta real**: prompt ATA diz que campo ausente deve ser null, mas validateReviewContent exige cinco listas de strings. Uma lista null/malformada causa a mesma recusa genérica. Também possíveis: finish_reason length/recusa/outro término, JSON malformado ou outra divergência. `json_object` não exige conformidade ao esquema; [documentação oficial OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs). Não trocar modelo, prompt, contrato ou limite por suposição; não repetir provedor para reconstruir resposta já preservada.

## Diagnóstico melhorado sem relaxar a validação

Novas respostas inválidas distinguem REVIEW_REFUSED, REVIEW_TRUNCATED, REVIEW_UNFINISHED, REVIEW_JSON_INVALID e REVIEW_SCHEMA_INVALID. O lote guarda validationErrors com caminhos, não valores do estudo, mantendo invalidOutput privado, consumo/perfil/hash/raciocínio e política de não repetição. A mensagem pública diz qual leitura parou e o motivo operacional, sem expor uso/custo. Não transforma resposta inválida em ata nula ou lista vazia de achados.

Sem migration nova. Para publicar o visual: frontend Publish. Para receber os motivos novos: publicar analyze-ata-image, analyze-text-batch e analyze-table-image com _shared/review-provider.ts e _shared/reviewer.ts. Controlador não foi modificado por este complemento. Não requer alterar segredo ou permissão.

O lote já ocorrido usa o formato anterior. **Próximo passo obrigatório para fechar a causa real:** executar no SQL Editor administrativo CONSULTA_FALHA_LEITURA_ROLANDIA_2026-10-21.sql, somente leitura. Ela traz término, contagens, estado/consumo e motivo já armazenados. Se stop com campos diagnósticos antigos ausentes, exportar response do lote específico para JSON privado para inspecionar formato offline. Não pedir senha no chat, conceder SELECT a anon ou usar lote pago como sonda.

## Evidências e limites

TypeScript da aplicação, lint dirigido e Deno das quatro funções aprovados; build local30,72s com avisos preexistentes de bundles e Browserslist. Prévia local do componente em1440x1000 e390x844, screenshots em .local-inputs/loading-brain-20261021/, rede externa bloqueada, sem erros de página; ajuste de grade mobile revisado visualmente. Tentativa inicial da prévia tinha importação de React inadequada e ausência de charset no HTML auxiliar; corrigidas no roteiro ignorado, não no produto.

Navegador integrado sem sessões disponíveis; usada prévia headless isolada. Essas imagens demonstram o componente, não percurso real do backend nem qualidade Luna. Não reexecutados testes ou dez passes nesta rodada; os resultados antigos não são nova evidência. Materiais, versões, decisões, prompts, modelos, limites, preços e validação de aceitação preservados. Código local preparado; produção e causa exata da resposta aguardam publicação/leitura do lote.
