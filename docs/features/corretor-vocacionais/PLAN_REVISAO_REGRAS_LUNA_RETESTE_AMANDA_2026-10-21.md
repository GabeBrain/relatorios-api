# Regras do revisor, Luna high e reteste de Amanda

Preparado e autorizado em 21/10/2026. **R0–R5 implementados/validados localmente; R6/R8 reais e publicação pendentes do backend correto.** Gabriel reduziu o teto global da proposta para US$3,00; esse valor prevalece em toda a execução. Resultado e pacote de publicação nesta pasta.

## 1. Objetivo e resultado esperado

Confrontar as preocupações de Guajajaras com o Corretor existente, corrigir lacunas demonstradas e adotar `gpt-6-luna` com raciocínio `high` nas novas execuções de texto, ata e visão do revisor. Validar regras, contratos, custo e percurso completo; publicar e preparar o reteste de Amanda com uma apresentação ainda sem marcações de revisão.

A Sugestão de análise já usa Luna/high. Preservar seu contrato e verificar que continua funcionando. A queixa original era sobre os destaques gerados: ampliar o revisor não comprova, por si só, correção dessa saída consultiva. O reteste deve permitir identificar qual das duas funções produziu cada resultado.

Execução contínua depois do CTA: avançar automaticamente quando os critérios de cada etapa forem atendidos; corrigir e repetir verificações locais dentro do escopo. Pausas humanas somente quando houver falha impeditiva, acesso indispensável indisponível, orçamento insuficiente ou publicação não executável com os acessos autorizados. Testes e integração/entrega contínuas (CI/CD) são condições de avanço, não pedidos repetidos de aprovação.

## 2. Base confirmada e limites

- Main `a199e7e`; após fetch, 0 atrás e 2 commits locais de Finotti à frente do origin. Documentação FIERGS e referência de interface também locais. Preservar; autorização deste plano não presume autorização para publicar trabalho alheio.
- Diagnóstico: `DIAGNOSTICO_GUAJAJARAS_AMANDA_2026-10-21.md`, sobretudo seção 0. PPTX revisado tem 137 slides e marcações em 25; original anterior à revisão e saída antiga não recuperados. Não condicionar implementação à recuperação nem chamar o arquivo revisado de original.
- `CorretorV3Page.tsx`: padrão `MODEL = gpt-4o-mini` para ata/visão. `pipeline.ts`: `TEXT_REVIEW_MODEL = gpt-4o`. `ia-vision.ts`: releitura do mini no 4o quando necessário. Migração envolve os três percursos.
- As três Edge Functions aceitam somente mini/4o e usam limites `max_tokens` de 1.500/2.000/4.000. `corretor-execution` também restringe esses modelos e fixa suas taxas/reservas.
- `ia-text.ts` já inclui `textos_svg`. A lacuna de SVG medida na Sugestão não deve ser repetida como diagnóstico do revisor.
- `vision_cache` é consultado por hash da imagem; ata usa prefixo `ata:`. A elegibilidade atual não isola suficientemente perfil/esforço/prompt. `confidence.ts` contém promoção associada a escalonamento/menção ao GPT-4o.
- Existem motores determinísticos, ledger de execução/lotes, `ia_passes`, materiais, versões e decisões. Evoluir esses contratos; não criar contabilidade concorrente.
- CI existente tem checagens de documentação/protocolo, sem comprovação de uma esteira completa de tipos, build, regras e Edge. Não presumir que push verde valida o produto.
- Backend do Corretor identificado no diagnóstico: `mxinpvcqzbfbzjodhgtz`; não aparece no conector administrativo disponível. Conferir acesso novamente na execução; não usar outro projeto como substituto. Lovable/CLI podem exigir intervenção única para SQL/deploy/Publish.

## 3. Escopo e preservação

Inclui preparação da evidência compartilhada quando necessária às regras, correções delimitadas, migração de modelo dos três passes, cache, confiança, consumo, testes, publicação e comunicação. Preservar autenticação Geobrain, Meus estudos, Excel opcional antes da análise, fluxo contínuo e interface atual.

Preservar originais, versões, decisões humanas, IDs estáveis quando a semântica não mudar, relatórios antigos e configurações de execuções iniciadas. Nova revisão técnica gera execução identificada; não sobrescreve revisão de Amanda nem reabre/encerra apontamentos antigos automaticamente.

Não incluir pesquisa automática de concorrentes na internet, reconstrução da base de mercado, novo recomendador, redesenho de interface, migração de outros produtos, agentes auxiliares, filas ou comparação paga entre mini/4o/Luna. Qualidade de mapa e cobertura consultiva completa de imagens ficam documentadas, sem virar projetos paralelos.

## 4. R0 — Matriz entre preocupações, regras e resultados existentes

1. Ler instruções, plano semanal e prioridades; fetch de todos os remotos; conferir main, autoria Git, alterações e commits de saída. Sincronizar preservando locais conforme CTA; nunca rebase/reset de histórico publicado.
2. Congelar fonte por hash e baseline do código. Materiais e saídas integrais ficam em `.local-inputs/`; versionar apenas derivados pequenos necessários à reprodução.
3. Criar `MATRIZ_GUAJAJARAS_REGRAS_2026-10-21.md` com: caso, comportamento esperado, evidência/slide/objeto, universo e ressalvas, regra/função existente, entrada realmente disponível, resultado observado, decisão de ajuste e critério de aceite.
4. Cada resultado deve declarar origem: execução offline observada, leitura persistida ou somente inspeção de código. Sem leitura de imagem reutilizável, marcar cobertura indisponível; não afirmar que a regra falhou apenas por não ter recebido a tabela.
5. Executar o caminho atual offline com extrações disponíveis. Quando não houver leitura real, usar transcrição derivada identificada para testar a regra, separando isso de teste da extração pelo modelo. Não buscar indefinidamente a saída histórica.

Confrontos obrigatórios:

| Caso | Regra existente a confrontar | Expectativa delimitada |
|---|---|---|
| Renda 27/28; propriedade 32/33; verticalização 30/31 | `cross-table.ts`, `narrative-total.ts`, `source-crosscheck.ts`, texto e refs de visão | Conflito referenciado se indicador/recorte/período forem compatíveis; caso contrário, pedir conferência da definição. Não escolher valor correto. |
| Cabeçalho 63 | `audit/engine.ts`, regras de intervalos e adaptação do payload visual | Detectar faixas rotuladas como sobrepostas; não substituir 60 por 30 sem fonte. |
| Garagem 66 | Somas/totais, validação de visão e categorias | Mostrar resíduos e categoria possivelmente omitida, sem inventar linha ou repetir vários erros de soma para a mesma causa. |
| Universos 61/63 e composição 108 | `declared-exclusions.ts`, `nested-radii.ts`, cruzamentos e fonte | Preservar diferenças legítimas de universo; média combinada não vira média de bairro por associação. |
| Unidade 24 | `source-crosscheck.ts` e coerência textual | Com Excel, confrontar indicador/unidade; sem ele, conflito título/unidade é suspeita fundamentada, não correção numérica definitiva. |
| Pedidos da ata e comparáveis | `coverage-rules.ts`, `ia-ata.ts`, `entity-consistency.ts` | Procurar resposta no estudo inteiro e fora da própria ata/notas. Match lexical não comprova atendimento substantivo. Ausência de leitura não prova ausência do conteúdo. |
| Status/homônimos 105 | Identificação de entidades e texto | Separar pergunta, resposta e fato datado; não validar mercado atual ou identidade só pelo nome. |
| Soma correta 30/32; amostra atualizada 108 | Motor de soma, notas de revisão e fonte atual | Não repetir acusações antigas. “Ajustado” não determina decisão nem dispensa conferência. |
| Mapas, rótulos, nitidez, foto e destaque | Cobertura/estrutura e comunicação de revisão | Classificação visual/editorial; registrar limite de leitura sem converter em erro matemático. |

**Saída R0:** matriz com lacunas demonstradas e tarefas selecionadas. Não considerar todos os candidatos erros confirmados ou criar regra específica por número de slide.

## 5. R1 — Ajustar evidências e regras na menor extensão necessária

1. Separar fatos, premissas do cliente, recados e respostas de revisão nos pontos compartilhados que alimentam o revisor. Preservar proveniência e notas; não apagar todo texto vermelho nem perder o briefing. Validar o impacto na Sugestão.
2. Reutilizar chaves existentes de indicador, unidade, recorte, período, amostra/exclusões e referência. Acrescentar apenas campos faltantes às evidências usadas pelos casos selecionados. Não construir uma ontologia geral.
3. Estender cruzamentos para valores repetidos entre slides quando a matriz demonstrar falta de cobertura. Preservar associação rótulo/valor; em evidência ambígua, produzir “Verificar”, sem resultado numérico inventado.
4. Corrigir a identificação de faixas sobrepostas e categorias incompletas onde necessário. Somar apenas distribuições completas; frequência de múltipla resposta e universos distintos têm tratamento próprio.
5. No checklist da ata, impedir que o próprio pedido ou uma resposta de revisão conte como atendimento. Não prometer compreensão integral de varanda/garagem por ocorrência de duas palavras. Retornar localização e “evidência não localizada” quando apropriado.
6. Toda nova ocorrência deve ter mensagem em português, evidência recuperável e referência aos dois lados quando houver conflito. Deduplicar causas comuns. IDs antigos permanecem estáveis quando significado e origem forem os mesmos.
7. Preservar a distinção Erro/Provável/Verificar; contradição de fonte não autoriza selecionar uma verdade nem alterar material automaticamente.

**Saída R1:** regras reutilizáveis e casos positivos/negativos derivados da matriz; dúvidas de mercado e ajustes editoriais registrados sem expansão de escopo.

## 6. R2 — Perfis do revisor e chamadas Luna/high

1. Criar contrato compartilhado específico do revisor, preferencialmente `_shared/reviewer.ts`, com `ACTIVE_REVIEW_PROFILE`, perfil `luna-high-review-2026-10-21` e perfil legado que representa explicitamente texto 4o, ata/visão mini e releitura 4o.
2. Novas execuções: texto, ata e visão em `gpt-6-luna`, `reasoning_effort: high`. Manter OpenAI e o endpoint compatível já usado; não introduzir ferramentas ou pesquisa externa. Perfil selecionado e validado pelo servidor, não por parâmetros arbitrários do navegador.
3. Retrato imutável por execução: etapas, modelo, esforço, endpoint, limites, versão/hash dos prompts, regras, extração e preços. Alterar a flag só afeta novas execuções. Retomadas antigas conservam perfis e hashes anteriores.
4. Adaptar as três Edge Functions e `corretor-execution`; propagar perfil nos estimadores, payloads, tipos `ModelId`, orquestração e página. Não basta ampliar a lista de modelos.
5. Luna usa `max_completion_tokens`, incluindo raciocínio e resposta. Limites iniciais propostos: texto/ata 16.384; tabela-imagem 32.768. São tetos técnicos configuráveis, não quantidade desejada de texto. Confirmar com os testes limitados antes da liberação.
6. Preservar lotes e limites de entrada conservadores. Não usar automaticamente a janela máxima anunciada do modelo. Reserva deve contemplar prompt, imagem, entrada e saída; rever a regra de tokens visuais em vez de reutilizar a fórmula do 4o.
7. Validar JSON e esquema de domínio antes de produzir achados. Campos ausentes, resposta truncada, recusa, filtro ou saída vazia não significam “nenhum erro”. Manter estado parcial/falho com consumo registrado quando houver.
8. Versionar somente mudanças de prompt necessárias às regras aprovadas e compatibilidade. Evitar misturar nova voz consultiva com migração de modelo; guardar hashes antes/depois. A Sugestão conserva seu perfil/prompt salvo ajuste compartilhado demonstrado.
9. Definir timeouts coordenados: provedor inferior ao controlador, ambos inferiores ao limite real do ambiente. Referência inicial 110s/130s; medir. Não repetir chamadas de resultado desconhecido. Eventual repetição de 429 só se recusa anterior sem processamento for inequívoca e dentro do orçamento/tempo.

**Saída R2:** os três passes novos usam Luna/high, com legado retomável; testes de contrato cobrem modelo/esforço/limites efetivos e bloqueio de chamadas incompatíveis.

## 7. R3 — Cache e confiança sem mistura entre modelos

1. Preservar `vision_cache` e leituras antigas. Novas chaves/eligibilidade devem distinguir hash original, tarefa, perfil, esforço, prompt e versão de extração. Preferir namespace compatível com o campo textual existente; verificar consumidores de `sha1` antes de mudar a chave. O hash da evidência continua sendo o da mídia original.
2. Ata precisa do mesmo isolamento. Leitura do cache deve registrar o perfil real que a produziu; não contabilizar uma leitura mini/4o como chamada Luna nem afirmar que um teste Luna foi executado por ter ocorrido cache hit.
3. Na validação Luna, usar namespace novo e leituras novas apenas para os lotes autorizados. Não invalidar em massa nem reprocessar automaticamente o acervo em produção.
4. Retirar a dependência de “confirmado no gpt-4o” como prova técnica para novas ocorrências. Confiança deve depender da evidência, validação e concordância, com compatibilidade de apresentação dos registros antigos.
5. Não chamar automaticamente 4o depois de Luna. Se a leitura for incoerente, manter pendência; permitir, no máximo, releitura delimitada no próprio Luna/high com imagem adequada, identificada e reservada. Concordância do mesmo modelo não é confirmação independente ou garantia de erro no documento.

**Saída R3:** cache auditável, sem poluição de histórico; erro de leitura não vira certeza por nome de modelo ou flag de escalonamento.

## 8. R4 — Consumo, persistência e migration aditiva

1. Evoluir o ledger atual e `ia_passes`, reutilizando os campos de perfil/raciocínio introduzidos para a Sugestão onde forem compatíveis. Rever a versão efetiva de `corretor_finish_batch` e as migrations posteriores antes de editar.
2. Por chamada/etapa: execução, estudo/versão/hash, perfil, modelo solicitado/retornado, esforço, versões de regras/prompt/extração/preço, input/cache/output, reasoning tokens quando informado, duração, estado, finish reason, request ID e tier efetivo. Não salvar raciocínio interno do modelo; apenas contagem informada.
3. Contabilização atômica e idempotente: atualizar lote/consumo/passe sem duplicar gastos do navegador. `output_tokens` inclui raciocínio; não cobrá-lo novamente. Cache do aplicativo e cache faturado pelo provedor são conceitos separados.
4. Reserva calculada no servidor com limite conservador do pedido, incluindo raciocínio; limite técnico e orçamento do teste também validados no servidor. Não confiar em custo ou uso enviados livremente pelo cliente.
5. Persistir consumo confirmado mesmo que JSON seja inválido. Falha com retorno desconhecido mantém reserva e exige reconciliação; não refazer silenciosamente. Serviço/taxa incompatível fica pendente de reconciliação.
6. Criar migration aditiva com nome `corretor_review_model_profiles` pelo procedimento do projeto; entregar o caminho real. Não modificar migrations aplicadas nem reprecificar históricos. Contextos legados reconhecidos conservam contrato; desconhecidos bloqueiam antes do provedor.
7. Manter permissões atuais e dados técnicos fora da interface do analista. Consultas de consumo por modelo/etapa/origem acessíveis somente à administração. Nenhuma ampliação de Auth/RLS/Storage é necessária por conveniência desta mudança.
8. Preparar consulta de acompanhamento por modelo/perfil/etapa e erros/parciais. Testes ficam identificados como validação técnica; não contaminam a comparação dos usos normais de produção.

**Saída R4:** migration e consulta técnica reproduzíveis; custo reconciliado, históricos preservados e nenhum valor financeiro recolocado no fluxo de uso.

## 9. R5 — Validação local e CI sem IA paga

1. Tipos da aplicação e Deno, lint dos arquivos alterados e build. Registrar erros preexistentes separadamente; corrigir os introduzidos ou diretamente ligados ao escopo.
2. Testes unitários/integração das regras com dados derivados identificados: conflitos, intervalos, categoria ausente, unidade, notas/briefing e contraexemplos de soma correta, universo distinto e amostra atualizada. Cobrir exemplos fora de Guajajaras para evitar ajuste ao arquivo específico.
3. Regressão dos **dez passes existentes**: cinco materiais em baseline e com Excel bruto, via `npm run test:corretor:materials`, com manifesto `calibracao/automacao/cases.json`. Hashes e entradas preservados. Replay de cache antigo comprova estabilidade determinística; não valida extração Luna.
4. Comparar identidade, conteúdo, evidência, cobertura e decisões, não só total de alertas. Diferenças intencionais exigem justificativa por regra; não atualizar a baseline apenas para obter verde. Arquivo/fixture ausente é bloqueio, não passe.
5. Contratos de Edge e ledger com provedor simulado: rejeição antes da chamada, perfil adulterado, orçamento, cache/perfil, duplicata, retomada antiga, JSON inválido, uso sem resposta, truncamento, timeout e custo/raciocínio.
6. Validar SQL localmente, inclusive permissões/assinaturas e transação do finish. Parser é checagem estática e não substitui execução. Se PostgreSQL local não estiver disponível, registrar e exigir consulta de verificação após aplicar migration antes de liberar.
7. Percurso no navegador com serviços simulados e zero provedor: home → PPTX → Excel/sem Excel → confirmação → avaliação → revisão/evidência → sair/retomar → Meus estudos; incluir sugestão salva e cópia do texto. Sem sobrescrever estudos reais.
8. Adicionar uma checagem CI técnica delimitada caso ainda não exista: tipos, regras/contratos, build e documentação. Sem segredo/provedor/produção. Os materiais grandes locais continuam fora do Git; dez passes são evidência local anexada por resumo/hash, não downloads implícitos na CI.
9. Executar `npm run check:live-docs -- <base> <head>` antes do push e acompanhar os checks após ele. Falha de CI relacionada ao lote interrompe promoção; corrigir e repetir autonomamente. Nenhum teste de banco remoto em CI por padrão.

**Saída R5:** relatório com comandos, resultados, hashes/diffs e pendências. Nenhum resultado antigo reutilizado como teste desta entrega.

## 10. R6 — Lotes limitados com Luna/high

**Orçamento autorizado por Gabriel em 21/10:** até **US$3,00 no total**, somando gasto e reservas desconhecidas dos lotes A/B e verificações de produção. Não é previsão de gasto e não autoriza reprocessar o acervo. Nenhuma chamada paga na preparação ou validação local; falta publicação/acesso para os lotes reais.

- **Lote A, focal:** ata, texto e imagens pertinentes de Guajajaras; selecionar até 12 imagens, até 2 lotes de texto e 1 ata, com no máximo 1 releitura adicional justificada por imagem. Usar somente o necessário para a matriz. Red boxes/respostas não entram como instruções; qualquer derivado limpo é identificado como derivado técnico, nunca como original recuperado. Esse ensaio não reproduz o teste anterior de Amanda.
- **Lote B, percurso completo:** uma apresentação existente com proveniência e material congelados no manifesto de regressão, selecionada na execução pelo menor conjunto que cubra texto/ata/visão e Excel disponível. Apenas uma execução completa, sem comparar modelos. Reaproveitar essa execução como canário de produção quando possível.
- Registrar antes de cada lote os hashes, tarefas, chamadas máximas, perfil, ambiente, custo estimado, reserva máxima e saldo global. Não iniciar se reserva+gasto global exceder US$3,00; reusar leituras técnicas confirmadas dentro do mesmo perfil. Sem segunda rodada automática para “melhorar o resultado”.

O provedor deve ser chamado pelo controlador/ledger, não por script direto que contorne orçamento. Acesso permitido, modelo disponível, teto e segredos devem estar confirmados no ambiente de teste. Sem chave local ou Edge local, preparar tudo e executar o lote uma única vez após R7, em estudo técnico separado; não marcar a validação real como concluída antes disso.

Manter manifesto único dos lotes e somar gastos mais reservas pendentes de todas as execuções técnicas, inclusive canário. Usar execução serial dos lotes e guarda antes de cada chamada; limites por estudo continuam obrigatórios e não são substituídos pelo teto global. A liberação desse teto não aumenta limites de usuários reais ou da produção. A identidade/origem técnica deve ser validada no servidor, não escolhida livremente por qualquer cliente.

Avaliar: modelo/esforço usados, JSON completo, português, evidência/slide, achados esperados e falsos positivos, cobertura por tarefa, consumo e duração. Nenhuma decisão de estudo real é alterada pelo ensaio.

**Saída R6:** comparação entre expectativa e resultado da matriz e prova de chamada Luna/high em cada tarefa. Funcionamento não significa superioridade universal; itens ainda inconclusivos ficam identificados.

## 11. R7 — Publicação compatível e CI/CD

1. Consolidar commits próprios com add explícito, documentação e relatório. Antes do push, conferir novamente todos os commits de saída. Os dois commits Finotti locais não são implicitamente liberados; se ainda estiverem pendentes e sem autorização identificável, resolver esse ponto em uma única confirmação. Não retirar/reordenar histórico compartilhado para contornar o limite.
2. Push somente com CTA e R5 aprovado. Conferir GitHub Actions por SHA; sucesso de documentação/protocolo não substitui verificações técnicas.
3. Aplicar **somente a nova migration preparada em R4**, depois de verificar que as dependências anteriores estão aplicadas. Não reaplicar o conjunto antigo. Rodar consulta de verificação de schema/RPC/permissões, sem segredo no chat.
4. Publicar as três folhas compatíveis com perfis novo e legado: `analyze-ata-image`, `analyze-text-batch`, `analyze-table-image`. A ordem entre elas não altera dependência. Depois publicar `corretor-execution` e, por último, frontend/Publish com o novo perfil.
5. Se houver alteração necessária em outra função por dependência real, registrar e incluir no handoff; não redesplegar a Sugestão por rotina. Sem mudança nela, `analyze-consulting-suggestion` não faz parte da lista.
6. Confirmar funções/SHAs, configuração de origem, limites e disponibilidade sem geração quando possível. Chamada inválida deve ser recusada antes do provedor. Não pausar, apagar ou migrar execuções antigas para o perfil novo.
7. Sem acesso de publicação ao backend correto, entregar **um único pacote**: migration/caminho, consulta de verificação, lista ordenada das quatro funções, prompt conciso do Lovable e instrução de Publish. Continuar documentos e automação local, retomando após a confirmação objetiva dessa publicação.

**Saída R7:** publicação comprovada ou dependência operacional precisa. Push não equivale a deploy e não libera o email de conclusão.

## 12. R8 — Verificação real e critérios de liberação

Executar o lote B no ambiente publicado ou aproveitar a execução técnica realizada ali, dentro do mesmo orçamento global. Conferir R6 pendente, sem duplicar lotes já feitos. Se o orçamento foi consumido antes, aguardar autorização adicional, sem ensaios ocultos.

Critérios obrigatórios:

- Texto, ata e visão registram Luna/high no perfil e nas chamadas efetivas, não somente no frontend. Cache informa origem correta.
- Uma execução completa registra relatório, consumo e materiais; retorno/reabertura mostra o resultado correto, sem preparar novamente o estudo anterior.
- Cada ajuste aprovado da matriz tem evidência; casos sem leitura/definição permanecem “Verificar”, e os contraexemplos não geram erros indevidos.
- Reservas de chamadas conhecidas encerradas ficam reconciliadas; chamadas desconhecidas não são repetidas. Custos continuam invisíveis ao analista.
- Versões e decisões anteriores permanecem intactas. Sugestão existente abre/copia sem nova geração; perfil Luna já publicado nela permanece válido.
- CI do SHA final aprovada, dez passes locais documentados e erros bloqueadores corrigidos. Limitações editoriais, históricas e de mercado são explícitas.

Reversão técnica: mudar a flag para o perfil legado e publicar o conjunto compatível, se necessário; novas execuções seguem a reversão, execuções em andamento conservam seus snapshots. Nunca desfazer schema aditivo, apagar ledger ou sobrescrever resultado para simular rollback. Falha de integridade, contabilização ou contrato impede anunciar disponibilidade; achado de qualidade residual deve ser avaliado e documentado, não escondido.

**Saída R8:** `RESULTADO_REVISAO_REGRAS_LUNA_2026-10-21.md`, com matriz antes/depois, CI, dez passes, lotes/consumo, publicação e limitações. Só após esse aceite operacional o status muda para verificado em produção.

## 13. R9 — Reteste da Amanda, comunicação e fechamento

1. Preparar resposta para a cadeia original. Usar os destinatários existentes se a cadeia estiver acessível; não inferir endereços de assinatura ou incluir novos destinatários. O CTA abaixo autoriza preparar o texto, não enviar email automaticamente.
2. Só usar o texto de conclusão após R8. Se houver apenas código local/push, informar o estado real e deixar convite de reteste pendente.
3. Orientar uso de **uma versão anterior à revisão humana, sem caixas e comentários de revisão**. Não é necessário pedir novo material para concluir a implementação. O convite pede o arquivo limpo apenas para o reteste dela; o arquivo revisado continua preservado como referência.
4. Não pedir remoção de cores legítimas, dados ou destaques do estudo. Se ela só tiver a versão revisada, explicar que não equivale ao ensaio anterior. Nenhum arquivo é limpo ou alterado silenciosamente pelo agente.
5. Solicitar retorno simples: nome/versão do arquivo, função utilizada e slide/print de algum apontamento divergente. Não exigir nova planilha de homologação ou relatório extenso da analista.
6. Atualizar diagnóstico, matriz, `LIVE_regras_corretor_vocacionais.md`, `LIVE_rebrain.md`, semana corrente em `_Acompanhamento/` e bloco correspondente em `_Planejamento/`. Preservar baseline semanal; registrar entrega, validação e publicação separadamente. Monday somente com autorização específica.

### Texto de resposta preparado para depois da verificação em produção

> Olá, Amanda. Boa tarde!
>
> Obrigado pelo retorno e pelo material. Desde a semana passada, revisamos regras e conferências do Assistente de Projetos e atualizamos o modelo de IA usado na revisão. A Sugestão de análise também está usando o modelo atualizado.
>
> Você já pode testar novamente pelo [Assistente de Projetos](https://geobrain-relatorios.lovable.app/corretor). Para comparar melhor, use uma versão do estudo anterior à revisão, sem caixas ou comentários com apontamentos e respostas.
>
> Para repetir a geração dos destaques, use **Sugestão de análise**. Para conferir erros e inconsistências do estudo, use **Revisar estudo**. As planilhas de cálculo podem ser incluídas na revisão para conferir os números com os dados de origem.
>
> Se algum resultado não fizer sentido, pode nos enviar o nome do arquivo, a opção utilizada e o slide ou print do ponto encontrado.
>
> Obrigado!
>
> Atenciosamente,
> Gabriel

Esse texto comunica mudanças verificadas e convida ao reteste; não afirma que reproduzimos ou corrigimos todos os erros da saída antiga, que não recuperamos.

## 14. Autorizações e pontos de parada

O CTA autoriza de uma vez implementação delimitada, testes locais, dez passes, testes com Luna nos lotes/teto definidos, sincronização preservando locais, commits/push próprios e aplicação da migration/deploy/Publish no backend correto quando os acessos técnicos estiverem disponíveis. Não autoriza publicação de commits alheios sem escopo identificado, IA fora do lote, aumento automático de teto, alteração de decisão humana ou envio de email.

Parar apenas a parte dependente em caso de CI/teste impeditivo, acesso indispensável indisponível, commit alheio sem autorização, incompatibilidade que exija arquitetura fora do plano ou saldo insuficiente. Entregar evidência concreta e ação mínima necessária; continuar tarefas independentes. Nenhuma etapa paga ou publicada pode ser declarada concluída por plausibilidade.

## 15. CTA para execução integral

> Execute R0–R9 do `PLAN_REVISAO_REGRAS_LUNA_RETESTE_AMANDA_2026-10-21.md`. Confronte Guajajaras com as regras atuais, implemente as correções demonstradas e adote GPT-6 Luna/high nos passes de texto, ata e visão do revisor, com flag técnica, compatibilidade de retomadas, cache por perfil e consumo persistido. Preserve a Sugestão de análise, materiais, versões e decisões humanas. Autorizo preservar as alterações locais e sincronizar a main conforme as regras do projeto, executar as verificações locais e os dez passes, além dos lotes A/B limitados ao teto global de US$3,00, incluindo verificações de produção. Após os critérios técnicos, faça os commits/push próprios e aplique a migration/deploy/Publish no backend correto se houver acesso autorizado; caso contrário, entregue um único pacote para eu aplicar e retome após a publicação. Avance sem novas pausas entre etapas aprovadas e corrija falhas dentro do escopo. Não publique trabalho alheio sem autorização, não ultrapasse o orçamento e não envie email. Ao final, apresente as evidências, limitações, documentos atualizados e a resposta à Amanda pronta para envio após a verificação real.

## 16. Referências técnicas consultadas em 21/10

- [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna): modelo explícito, suporte a high, imagem e saída estruturada. Disponibilidade na conta e compatibilidade do pedido efetivo ainda precisam do teste real.
- [Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create): conferir parâmetros, limites, consumo e contrato de resposta ao implementar.
- [Preços OpenAI](https://developers.openai.com/api/docs/pricing): referência Standard/short Luna de US$0,10 entrada, US$0,01 cache e US$0,50 saída por milhão; confirmar tier/endpoint e guardar snapshot, sem reprecificar usos anteriores. Não aplicar automaticamente preços de outras modalidades/contextos.
- [Limites das Edge Functions](https://supabase.com/docs/guides/functions/limits): idle timeout de 150s; duração depende do plano. Conferir o plano real antes de fixar timeouts.
- Planos/resultado Luna da Sugestão de 19/10 e diagnóstico Guajajaras desta pasta. Fontes sustentam compatibilidade e desenho; não provam qualidade superior neste caso.

Checkpoint de execução: código, matriz, migration e validações locais em `RESULTADO_REVISAO_REGRAS_LUNA_2026-10-21.md`. Pacote único em `PUBLICACAO_REVISOR_LUNA_2026-10-21.md`. Nenhuma IA paga, SQL remoto, deploy ou email nesta etapa; publicação e verificação real ainda não concluídas. O estado Git final é registrado no resultado, sem presumir produção pelo commit/push.
