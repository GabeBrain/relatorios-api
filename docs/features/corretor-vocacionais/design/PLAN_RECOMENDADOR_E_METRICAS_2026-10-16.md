# Corretor V3 — recomendador, custo e materiais confirmados

## Autorização e baseline

Gabriel aprovou a abordagem e autorizou criar/executar este plano em16/10. Base `e36c591`, origin/main0/0 após fetch, main direta. Documentos FIERGS/ZIP locais preservados. Código, migration, contratos e evidências pequenas são versionados; materiais reais/capturas/saídas ficam em `.local-inputs/`. Sem IA real sem apresentar lote e orçamento; implementação/verificação usam provedores simulados. Entrega antes de push.

## R0 — contrato e previsão

- Preservar o prompt Brain operacional de15/09: Avaliação da Consultoria, Recomendação e Orientação ao analista. Extrair suas funções para contrato compartilhado sem mudar a tese editorial. Modelo atual `gpt-4o-mini`; nada migra modelo nesta entrega.
- Partir dos textos e tabelas nativas do IR do PPTX, com números de slides. Não dizer que Excel, PDF ou imagens raster foram interpretados por esse motor. Exibir cobertura: slides úteis, slides sem texto suficiente e conteúdo limitado. Não chamar recomendação de correção ou de revisão concluída.
- Contrato compartilhado entre estimativa/frontend/servidor: até180slides e180mil caracteres por lote, com limite adicional90mil bytesUTF8 para manter folga da janela128k. Até10lotes; rejeitar acima disso antes de cobrar. Memos limitados a8mil bytes, compilação dentro da janela. Resultado truncado deve ficar identificado.
- Previsão em USD e conversão indicativa em BRL com referência existente5,16, explicitada. Informar modelo, número de lotes e compilação. Estimativa usa tamanho real do prompt e projeção de tokens; limite autorizado usa reserva conservadora pelo tamanhoUTF8+framing e saída máxima. Compilação reserva para todos os memos possíveis.
- Preço versionado e conferido na documentação oficial em16/10: entradaUS$0,15/milhão, cacheUS$0,075/milhão, saídaUS$0,60/milhão. Usar usage retornado pelo provedor; sem desconto de cache presumido na previsão. Custo calculado por uso não equivale a conciliação com fatura/impostos.

## R1 — schema e contabilidade

- Migration aditiva gerada pela CLI: execuções com finalidade revisão/recomendação e previsão; tabela pública de resultados consultivos, vinculada a estudo/versão/execução. Escrita exclusiva do servidor; leitura compatível com biblioteca pública aprovada. Execuções, respostas de lotes, contexto e identificadores locais continuam privados.
- `ia_passes.tipo` aceita recomendação. Acrescentar vínculo de execução/lote, modelo solicitado/retornado, versão do prompt/preços, tokens em cache e duração; linhas novas de recomendação protegidas contra alteração pelo navegador. Legado mantém semântica anterior; ausência de metadados não vira modelo inferido.
- Na mesma transação que conclui lote: contabilizar custo uma vez em execução, estudo e ia_passes; atualizar progresso/resultado consultivo. Replay devolve resposta sem novo passe/custo. Tokens e custo ficam registrados mesmo se navegador fechar antes de mostrar resultado.
- Resultado guarda previsão, limite, gasto conhecido, reservas pendentes, estado, cobertura e texto final. Tentativas falhas/desconhecidas aparecem como tal; nunca usar zero como custo desconhecido. Não alterar achados, status de revisão, decisões ou relatório de auditoria.
- Índices por estudo/versão/data e execução; RLS em tabela exposta, privilégios explícitos e operações privilegiadas só service_role. Testar acesso anon/auth/service, atomicidade e repetição em PostgreSQL local.

## R2 — execução no servidor

- Integrar com `corretor-execution` preservando os três caminhos de revisão. Contexto da recomendação é normalizado e versionado no servidor. Orquestração seleciona lotes/memos do contexto salvo; cliente não escolhe payload arbitrário para cobrar.
- Antes de cada chamada reservar custo com lock existente. Função `analyze-consulting-suggestion` passa a aceitar apenas chamada interna com service_role e execução registrada. Retornar texto, tokens reais/cache, modelo retornado, ID do provedor, duração e motivo de término; não devolver credenciais ou erro bruto de provedor.
- Resultado desconhecido mantém reserva e impede repetição automática. Retomada conhecida reutiliza memos e resultado final; conta/navegador/arquivo/versão continuam conferidos. Mesmo arquivo/configuração/prompt reutiliza execução; regeneração deliberada precisa de ação/custo novos, sem sobrescrever histórico.
- Início/estado/finalização da recomendação independem de `studies_v3.relatorio`; completar recomendação não conclui correção. Cache/reabertura não tem chamada ao provedor. Falha de migration/função bloqueia cobrança e preserva materiais.

## R3 — interface contínua

- PPTX preparado e Excel adicionado recebem fundo oliva preenchido, check, rótulo e nome/quantidade. Erro/seleção vazia não recebem sucesso. Trocar/remover recalcula estado; seletor cancelado conserva materiais. Verde descreve entrada/preparação, não revisão nem armazenamento remoto.
- Novo estudo oferece Revisar estudo/Gerar recomendação na mesma preparação. Reutilizar arquivos ao alternar. Revisão mantém cidade/UF/escolha de planilhas; recomendação exibe cobertura e custo próprios, sem requisitos irrelevantes. Não iniciar IA ao selecionar/trocar modo.
- Na geração: estudo existente ou criação atômica, versão/hash corretos, confirmação explícita, progresso por lote/compilação, duração real, pausa entre chamadas e erro recuperável. Reusar original local e fontes existentes sem duplicar estudo nem decisões.
- Área Recomendação em StudyLayout e rotas canônicas; resultados por versão com custo e histórico, copiar/baixar texto. Reabrir resultado não gera novamente. Quem já tem estudo não precisa reenviar se original estiver disponível. Consulta de resultado público; escrita/pagamento com controles existentes. Estado sem resultado apresenta ação clara.

## R4 — métricas de IA

- Integrar passes consultivos ao custo por estudo e ia_passes existentes. Na calibração, adicionar Uso de IA com totais por tipo/modelo: chamadas confirmadas, tokens entrada/cache/saída, custoUSD/BRL indicativo e gasto do recomendador. Não misturar qualidade/FP com uso financeiro.
- Exibir histórico das recomendações: estado, previsão, limite, gasto conhecido/reserva, desvio previsto×calculado, lotes e duração. Ausência/erro de schema aparece como indisponível, sem falso zero; custos legados sem modelo identificados como legados. Replays não aumentam faturamento.
- Proteger metadados privados: não expor owner_hash, confirmed_context, prompt integral de entrada ou respostas internas no painel público. Dados textuais do resultado seguem biblioteca pública já aprovada.

## R5 — validação e publicação

- Testes de divisão, Unicode, orçamento, cache, compilação, classificação de uso, estado truncado, reabertura e formato inválido. Casos SQL/Edge com provedor simulado: uma/múltiplas chamadas, replay, duplicidade, concorrência, falha/unknown, acesso direto negado, custo e passe únicos, resultado salvo antes de fechar navegador.
- Jornada Chromium com PPTX/Excel existentes e APIs interceptadas: estados verdes, alternância sem perder materiais, custo antes de gerar, cancelamento sem IA, geração e reabertura, cadastro incompleto em Meus estudos, navegação/Recomendação, métricas e revisão anterior preservada. Desktop1440/1024 e mobile390/320, claro/escuro e teclado.
- Reexecutar os dez passes de regressão gratuitos, sem mudar gabaritos. Typecheck real, lint dos tocados, build e check:live-docs. Nada de teste pago automático; eventual ensaio real exige lote/custo apresentado ao usuário.
- Documentar resultados/limites, LIVE Corretor/Rebrain, decisão de frontend, mapaSE, plano semanal e acompanhamento. Commit isolado, sem alterações de outras frentes, apresentar antes de push.
- Ativação após revisão: migration nova, republicar controlador e função consultiva, depois frontend, conferir conta/fluxos/registro. Git não comprova deploy. Sem acesso administrativo ao backend Lovable, entregar instrução exata para publicação; não fingir migration aplicada.

## Referências verificadas

- [Preços/modelo GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini).
- [Campos de uso em Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Execução

Plano criado antes das alterações de produto. **R0–R4 implementados e validados localmente; R5 local concluído, ativação e aceite real pendentes.** Evidência, casos, limites e sequência de publicação no [resultado da execução](RESULTADO_RECOMENDADOR_E_METRICAS_2026-10-16.md). 320 testes/2 condicionais pulados, dez passes materiais, controles SQL/Edge e jornadas com serviços simulados; nenhuma IA real.

Dependência encontrada durante execução: documentação oficial marca o modelo existente GPT-4o mini como Deprecated. Sua disponibilidade não foi testada por chamada real e o modelo não foi trocado silenciosamente. Confirmar disponibilidade antes do primeiro lote pago, ou abrir decisão de modelo/preço e repetir validações. Validação local não implica implantação nem qualidade consultiva homologada.
