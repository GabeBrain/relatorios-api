# Luna na Sugestão de análise e consumo por modelo em produção

Data: 19/10/2026. Responsável pela sessão: Gabriel. Estado: implementação L0–L6 concluída com checagens estáticas; L7 preparado para push autorizado. Migration/deploy/produção pendentes conforme handoff.

## 1. Decisão e escopo

Adotar `gpt-6-luna` para novas gerações de **Sugestão de análise**, com `reasoning_effort: high`. Manter OpenAI direta e Chat Completions. Seleção técnica por perfil versionado; nenhuma escolha de modelo, preço ou limite na interface do analista.

A prioridade declarada por Diego/Gabriel é utilidade para A&R. Luna é a escolha solicitada; a documentação o posiciona como modelo eficiente, não como o mais capaz de toda a família. Usar high não comprova superioridade para nossos estudos. A adoção será sem experimento prévio de qualidade e sem geração paga pelo agente. A observação ocorrerá nos usos normais de produção.

Preservar motores de correção, regras determinísticas, prompts de negócio, autenticação Geobrain, documentos, histórico, versões e decisões humanas. Não incorporar nesta entrega novos materiais, leitura de imagens, consulta automática à base Markdown do Diego ou mudança de fornecedor. Não refazer recomendações antigas automaticamente.

“Sem testes”, neste plano, significa sem comparação de modelos e sem geração experimental paga. A execução proposta inclui apenas checagens estáticas de tipos, lint, compilação e documentação. Não executar suítes automatizadas ou ensaios com provedor sem pedido posterior. Registrar essa limitação no fechamento.

## 2. Situação confirmada no código

Base consultada: main `36b4773`, sem diferença de commits com origin após fetch. Existem alterações locais de documentação FIERGS e referência ZIP de interface; preservar e não incluir no commit.

- `supabase/functions/_shared/recommendation.ts`: padrão global gpt-4o-mini; preços globais; limites de saída 1.200 no memo e 3.500 no resultado; regras e orçamento compartilhados com frontend.
- `supabase/functions/analyze-consulting-suggestion/index.ts`: OpenAI direta, `max_tokens`, validação de modelo global; retorna modelo solicitado/efetivo, tokens/cache, identificação e duração.
- `supabase/functions/corretor-execution/recommendation.ts`: contexto registra modelo, prompt e preço, mas execução/retomada ainda consultam constantes globais. Trocar só a constante pode impedir retomadas ou misturar perfis.
- Migration `20261016153609_corretor_recommendation_metrics.sql`: `corretor_recommendations`, `ia_passes`, contabilização atômica por lote e agregados já existem. Não criar uma segunda contabilidade.
- `src/features/corretor/lib/recommendations.ts` e `components/StudyRecommendation.tsx`: estimativa local, limite técnico automático, geração explícita, leitura de histórico sem nova IA; custos escondidos no produto.
- O limite de saída inclui raciocínio nos modelos novos. Manter 1.200/3.500 como teto total pode produzir pouco ou nenhum texto visível.

Não houve auditoria das linhas reais do backend nesta preparação. O chat compartilhado não abriu pela consulta web e não existe navegador conectado para usar o login indicado. O texto copiado foi lido como referência: descreve construção de base e comparativos, sem identificar a versão exata do Luna nem conter os arquivos integrais.

## 3. Configuração técnica proposta

Criar catálogo fechado de perfis no contrato compartilhado, sem pacote externo de flags e sem tabela nova de configuração remota:

- Flag versionada `ACTIVE_RECOMMENDATION_PROFILE`: padrão `luna-high-2026-10-19`.
- Perfil novo: provider openai; endpoint chat/completions; modelo gpt-6-luna; esforço high; processamento standard; parâmetros compatíveis; versão própria de configuração e de preços.
- Perfil legado: gpt-4o-mini com preços, prompt, partição e limites anteriores, somente para compatibilidade/retomada e reversão técnica deliberada.
- Teto total inicial Luna: `max_completion_tokens: 32768` por chamada, incluindo raciocínio e texto, em memo e resultado final. É limite de geração, não tamanho desejado do texto.
- Manter contrato do memo de até 8.000 bytes e formato de saída final existente. Reforço de tamanho, se necessário no prompt, exige nova versão e hash; não truncar silenciosamente um memo para continuar a compilação.
- Manter partição atual e guarda conservadora de contexto. A soma do limite superior de entrada e saída deve caber na janela operacional definida; não ampliar lotes apenas porque Luna suporta janela maior.
- Sem ferramentas, pesquisa externa, chamadas auxiliares ou streaming novo nesta entrega. Enviar `store: false` se suportado pelo contrato, sem mudar as políticas de dados existentes.

O servidor escolhe o perfil ativo para novas execuções. Cliente não pode fornecer modelo, taxa, esforço ou limite arbitrário. Perfil inválido bloqueia antes de chamar o provedor. Reversão exige intervenção técnica na flag e publicação; nenhuma queda automática para outro modelo.

Cada início grava um retrato imutável da configuração: profile_id, config_version, requested_model, reasoning_effort, endpoint, service_tier, limites por etapa, prompt_version, price_version e taxas aplicáveis. Trocar o padrão afeta somente novas execuções.

## 4. L0 — Inventário e preparação

1. Ler instruções e fetch de todos os remotos; comparar main/origin novamente na execução.
2. Preservar alterações de outras frentes. Sincronização apenas conforme autorização vigente e regras do repositório; não reescrever histórico.
3. Conferir último schema e definições de `corretor_finish_batch`, incluindo qualquer migration posterior. Usar a versão efetiva como base.
4. Registrar contratos existentes e dependências, sem imprimir segredos. Se houver acesso técnico permitido, consultar disponibilidade do modelo sem geração; ausência desse acesso é limitação, não confirmação.

Conclusão: mapa de arquivos e contratos confirmado, árvore alheia preservada e nenhum provedor chamado.

## 5. L1 — Perfil e compatibilidade com execuções anteriores

1. Refatorar quote, prepareRequest, cost e seleção de modelo para receber perfil explícito; valores padrão somente para novas execuções.
2. Resolver o perfil de uma execução a partir do contexto confirmado e do registro persistido, nunca do padrão atual.
3. Para contextos antigos sem profile_id: reconhecer apenas a combinação legada conhecida de modelo/prompt/preço. Preservar identidade dos lotes e memos anteriores; não recalcular os hashes antigos com campos novos.
4. Se o contrato legado não for reconhecido, interromper com orientação operacional. Não reinterpretar como Luna, não repetir chamada desconhecida e não apagar reservas.
5. Usar namespace/hash novo nas execuções novas; incluir perfil, esforço e configuração. Todos os lotes e a compilação final de uma execução usam o mesmo perfil.

Conclusão: novo padrão Luna; execução antiga segue seu contrato; rollback técnico não modifica histórico ou tentativas já iniciadas.

## 6. L2 — Chamada OpenAI e controle de gasto

1. Luna usa `max_completion_tokens` e `reasoning_effort`; legado mantém adaptador compatível. Não passar parâmetros incompatíveis por cópia do pedido anterior.
2. Normalizar resposta preservando modelo solicitado e retornado, input/output/cache, reasoning_tokens quando informado, finish_reason, service_tier, request_id e duração.
3. `completion_tokens` já inclui raciocínio: não somar reasoning_tokens novamente ao custo. Campo de detalhamento ausente deve ficar desconhecido/null, não zero inventado.
4. Preço standard curto inicial Luna por milhão: entrada US$0,10; cache US$0,01; saída US$0,50, conforme documentação de19/10. Legado conserva US$0,15/0,075/0,60. Guardar taxas na execução, sem reprecificar histórico.
5. Reserva por lote cobre entrada conservadora mais teto TOTAL de saída/raciocínio. Estimativa e reserva são conceitos distintos; gasto efetivo vem do uso retornado.
6. Reconciliar service_tier efetivo. Se diferente do contratado, guardar a evidência e exigir reconciliação com preço correto; nunca cobrar internamente uma taxa presumida como confirmada.
7. Preservar limite técnico global de US$100 e limite por execução já existentes. Calcular automaticamente cobertura para novo perfil; não mostrar ao analista.
8. Não repetir automaticamente em timeout, retorno desconhecido ou falha após envio. Preservar reserva, registrar falha e intervenção técnica. Resposta com uso e sem texto continua contabilizada.
9. Resultado cortado/filtrado fica parcial ou falho, nunca concluído indevidamente. Não reduzir esforço ou trocar modelo para concluir barato.
10. Verificar tempo máximo do ambiente Edge e do cliente. Se high ultrapassar o limite suportado, bloquear/registrar honestamente; não adicionar fila ou arquitetura nova sem registrar o escopo necessário. Não prometer confiabilidade temporal sem chamada real.

Conclusão: todas as novas chamadas são autorizadas, limitadas e contabilizáveis por perfil, incluindo falhas com consumo confirmado.

## 7. L3 — Migration aditiva de rastreabilidade

Criar migration via CLI `supabase migration new corretor_recommendation_model_profiles`; entregar o caminho real gerado. Não inventar timestamp nem reaplicar migrations antigas.

Reaproveitar confirmed_context para o retrato integral da execução. Adicionar, onde faltarem:

- `corretor_recommendations`: profile_id, config_version, reasoning_effort, endpoint, service_tier, pricing_snapshot JSONB, reasoning_tokens acumulados e indicador de cobertura do detalhamento, mantendo modelo e preço existentes.
- `ia_passes`: profile_id, config_version, reasoning_effort, reasoning_tokens nullable, finish_reason, service_tier solicitado/efetivo e taxas/versionamento necessários para auditar cada chamada.
- Resposta do lote: guardar contagens originais e metadados normalizados. Não armazenar cadeia de raciocínio interna; apenas contagem informada pelo provedor.

Atualizar `corretor_finish_batch` preservando assinatura e caminho de correção: contabilizar passe, execução, recomendação e custo_total do estudo na mesma transação; validação de contagens e reserva; chave única por execution/batch impede duplicação. Validar que reasoning_tokens não excede output_tokens, quando ambos estiverem disponíveis.

Compatibilidade: colunas novas nullable/default compatível para pedidos antigos e implantação gradual. Registros legados não recebem high ou detalhes de raciocínio fabricados. Perfil legado só é preenchido quando a combinação existente o demonstra; manter unknown nos demais. Preservar valores históricos, políticas e permissões existentes; não criar acesso público novo para configuração ou contexto. Índices apenas pelos filtros efetivamente usados (tipo, modelo/perfil e data).

Conclusão: migration preparada e instruções entregues, sem aplicação remota pelo agente nesta autorização. Gabriel pode aplicá-la no Supabase.

## 8. L4 — Métricas dos usos reais

Entregar consulta/relatório técnico de produção por período, modelo efetivo, perfil, esforço, versão do prompt e preço. Acesso pelo canal técnico existente, sem reinstalar custos na interface do analista nem conceder novas permissões públicas.

Separar duas unidades:

- Por chamada: quantidade, tokens de entrada/cache/saída/raciocínio, custo, latência e motivo de término.
- Por geração/estudo/versão: soma de todos os lotes e compilação, duração, resultado completo/parcial/falho/desconhecido, estimativa, reserva pendente e gasto confirmado.

Incluir total, média e mediana por geração, custo por mil tokens de entrada e taxa de conclusão; separar novas gerações das reaberturas sem cobrança. Não contar lotes como estudos distintos. Não misturar review com recommendation. Manter produção como origem das novas chamadas; diagnóstico simulado nunca é inserido no banco real. Histórico antigo sem origem comprovada fica identificado como legado/não classificado, sem assumir que é produção homologada.

Comparar gpt-4o-mini histórico e Luna futuro de forma observacional: mostrar cobertura/tamanho e complexidade aproximada; estudos diferentes não estabelecem causalidade ou ganho de qualidade. Não gerar automaticamente os dois modelos para comparar. Consultas em30 dias,7 dias ou período explícito; não interpretar falta de registros como custo zero.

Conclusão: relatório técnico reproduzível de custos por modelo nos envios reais, sem exigir teste A/B e sem exposição na jornada de uso.

## 9. L5 — Integração do cliente e implantação gradual

1. Atualizar tipos e estimativa interna para o novo perfil, incluindo retomada pelo perfil original. Histórico continua legível e copiável sem nova geração.
2. Incluir identidade da configuração cotada no início. Servidor continua autoridade e recusa versão desatualizada antes de consumo; orientar atualização da página em português, sem expor custos.
3. Validar disponibilidade do schema antes de autorizar lote Luna. Migration ausente ou perfil divergente produz erro operacional claro; não perde configuração nem chama provedor.
4. Compatibilizar frontend antigo durante deploy: ele não pode iniciar um Luna usando reserva de mini inadvertidamente. Aceitar somente quando houver contrato compatível comprovado; caso contrário pedir atualização da página antes da geração.
5. Preservar upload, vínculo de planilhas, navegação, cópia por blocos, histórico e decisões. Modelos/preços continuam em controle interno.

Conclusão: nova geração segue Luna após publicação; retomadas não mudam de perfil; leitura do histórico independe de contrato de geração novo.

## 10. L6 — Checagens e documentação sem geração experimental

- TypeScript, lint dos arquivos alterados, build e check:live-docs, somente após autorização do CTA.
- Revisão estática da compatibilidade legada, reserva, parâmetros e mapeamento de consumo; não registrar isso como ensaio runtime.
- Não executar suíte automatizada, dez passes de materiais, A/B, chamada real ou reprocessamento como parte desta mudança, por escolha explícita sem testes prévios.
- Atualizar LIVE do Corretor, LIVE Rebrain, plano e acompanhamento SE com evidências e limitações da rodada. Preservar entradas antigas e alterações de outras frentes.
- Registrar que qualidade, latência high, autorização real da chave e comportamento remoto estarão não verificados até primeiros usos/pós-publicação. Nenhum número de teste anterior serve de evidência desta entrega.

Conclusão: código compilável e documentação consistente; limites de validação declarados.

## 11. L7 — Commit, push e publicação

1. Fazer commit isolado na main, paths explícitos. Conferir diff e documentação obrigatória; fetch novamente antes do push. Não incluir ZIP ou alterações FIERGS alheias.
2. Push autorizado pelo CTA. Entregar hash, resumo de alterações, checagens executadas e pendências reais.
3. Sequência remota: aplicar somente a nova migration; publicar `analyze-consulting-suggestion` (suportando legado e Luna); publicar `corretor-execution`; publicar frontend. Guardas de contrato protegem a janela de versões mistas.
4. Aplicação SQL remota fica com Gabriel. Deploy das funções e Publish dependem do acesso operacional do projeto/Lovable; push sozinho não os substitui. Não disparar geração para provar disponibilidade.
5. A ativação real ocorre quando migration e funções novas estiverem publicadas. Enquanto isso, não declarar Luna ativo com base apenas no commit.
6. Acompanhar primeiros envios normais com leitura técnica: modelo esperado, configuração high, contagem/custo, estado e ausência de duplicação. Leitura não significa autorização para reprocessar. Falha ou retorno desconhecido exige intervenção técnica.
7. Reversão: trocar flag para perfil permitido, publicar código compatível e afetar só novas gerações. Não apagar resultados/custos nem reinterpretar execução em curso.

Conclusão: push realizado e handoff de publicação completo; estado de produção informado separadamente e sem prometer execução remota indisponível.

## 12. Dependências e limitações aceitas

- Uma migration aditiva será necessária para comparação auditável de esforço, preços e tokens de raciocínio. Os campos atuais de modelo/custo serão preservados.
- Duas funções Edge precisam de deploy, mais frontend. Sem mudança de chave ou fornecedor por princípio; acesso ao modelo pela chave atual permanece não confirmado.
- Nenhuma geração paga pelo agente e nenhum orçamento retroativo. Uso normal das pessoas após ativação continua sujeito ao limite técnico e ao comando explícito de gerar no produto, sem exibir valor ao analista.
- high pode aumentar duração/saída e exceder os custos ilustrativos calculados com tokens idênticos. Não usar a simulação anterior como promessa de economia.
- Base de conhecimento completa do Diego e versão do Luna usada por ele não foram obtidas. Não afirmar equivalência daquele trabalho com este perfil.

## 13. CTA único

> Execute L0–L7 do PLAN_LUNA_SUGESTAO_METRICAS_PRODUCAO_2026-10-19.md. Adote gpt-6-luna com raciocínio high como padrão técnico da Sugestão de análise e registre por execução/chamada a configuração e o consumo real para comparação por modelo em produção. Preserve perfis legados, retomadas, prompts de negócio, motores de correção, materiais, versões, decisões humanas e alterações de outras frentes. Faça apenas checagens estáticas, lint, tipos, build e documentação; sem testes comparativos, suítes ou IA paga. Prepare a migration para eu aplicar e entregue a sequência de deploy das duas funções e do frontend. Atualize os documentos e acompanhamentos, faça o push isolado e apresente o resumo final com evidências, dependências e limitações. Não aplique SQL remoto nem execute gerações para validar.

## Referências verificadas em19/10/2026

- [GPT-6 Luna: modelo, raciocínio, endpoint e preços](https://developers.openai.com/api/docs/models/gpt-6-luna).
- [Chat Completions: max_completion_tokens e detalhamento de uso](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
- [Raciocínio, custo e saídas incompletas](https://developers.openai.com/api/docs/guides/reasoning).
- [Guia da família GPT-6](https://developers.openai.com/api/docs/guides/latest-model).
- [Chat indicado por Diego — indisponível na tentativa desta sessão](https://chatgpt.com/s/cx_6ad678a41a0c8191bb232e0ecc43494b).

## Execução desta rodada

Resultado, evidências e limitações: [relatório técnico](design/RESULTADO_LUNA_METRICAS_PRODUCAO_2026-10-19.md). Migration gerada: `supabase/migrations/20261019203600_corretor_recommendation_model_profiles.sql`. Sem suítes, IA paga, SQL remoto ou deploy.
