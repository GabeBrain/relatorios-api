# Carregamento Brain e falha na leitura de ata

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
