# Plano de correções — evidências persistidas do Corretor V3

13/10/2026 — Gabriel. **Estado: preparado, execução ainda não iniciada.** Integra o plano semanal confirmado; reservas de horas não são medição. Referências: [balanço por estudo](./REVISAO_RESULTADOS_E_PERSISTENCIA_2026-10-13.md), [baseline Rolândia](./BASELINE_2026-10-13_ROLANDIA.md), [rodada automática](./AUTOMACAO_TESTES_CORRETOR.md).

## Objetivo e critério de sucesso

Reduzir falsos positivos sustentados pelos registros reais e detectar a omissão tabela × conclusão relatada por Daniele. Medir por problema: FP que deixou de ser produzido, erro verdadeiro preservado e omissão que passou a ser detectada. Não medir sucesso apenas por queda no total de cartões.

Usar achados/veredictos/cache/prints já persistidos antes de novas leituras. A correção do motor deve ser geral, sem lista de cidades, IDs ou números específicos em produção. O caso identificado fica nos testes; a regra usa contexto e evidência. Não apagar nem marcar como corrigidos todos os registros históricos para fazer o painel parecer limpo.

Entregáveis: corpus pequeno rastreável, testes negativos/positivos, regras corrigidas, reteste das evidências, comparação antes/depois, regressão dos cinco decks e handoff reproduzível. Cada resultado distingue **validado localmente**, **publicado no Git**, **publicado no app** e **verificado no app**.

## Evidências disponíveis e controles

| Caso | Registro / fonte | Rótulo inicial | Reteste possível |
|---|---|---|---|
| Salvador s86/s87/s88/s89/s91/s94 — valores como 1.342 acusados como anos | estudo `16cb827e-cec7-4958-8d45-893eb29f3e40`, IDs `native-format-*`; `verdict=fp` | seis FP registrados; causalidade na regra de formato identificada | texto/detalhe persistido e fixture negativa; **não há print desse achado no snapshot** |
| SJC VAP s73 — ano 2.023 | expectativa `vap.expected.json` e leitura já congelada | controle positivo de formato | replay da leitura; conferir imagem se disponível na rodada |
| Goiânia 2027–2032 — total 56.808 × conclusão 17.566 | imagem e relato da Daniele enviados por Gabriel; registrado em `audit-2026-10-13/studies.json` | omissão confirmada pela analista; projeto/slide ainda não associado | transcrição da imagem + teste controlado; aceitação sobre extração real exige print local ou PPTX pareado |
| UsHome s35 — “São Paulo ≠ Curitiba” | estudo `5de0e62e-559d-4990-8208-e0cbbf80858a`, `iavis-context-18db1d310b-sao-paulo`; imagem/cache `18db1d310b9aca7dedb2da164d612fc1b20f465e` | FP registrado; print inspecionado não contém o nome São Paulo | mesma imagem persistida e leitura salva; testar a âncora literal e a reconciliação atual |
| UsHome s23 — soma da consolidada | mesmo estudo, `iavis-sum-0466081e4f-0`; imagem/cache `0466081e4fb51708d8ada36852f2d8eef9afc007` | FP registrado; tabela visível pode ser fatia de uma consolidada maior | imagem/cache e agrupamento de fatias recuperáveis; não presumir soma global pela fatia |
| Curitiba 105 s37 — cenário BASE | estudo `4a491b44-f1ac-4ae3-b156-52a3569928ce`, `iavis-sum-3d5daefc4d-0`; imagem/cache `3d5daefc4d87880ac92afb57db7ba61560bb9e2e` | controle de divergência aritmética: coluna 20% soma 1.197, total declara 1.399 | imagem disponível, valores visíveis transcritíveis e cache; ressalva de eventual nota/escopo fora do crop |
| Palmas s104/s114 — Bairro Plano Diretor Sul comparado como empreendimento | estudo `584dc129-9dc2-49e6-9b5a-f147d070a9d8`, `entity-bairro: plano diretor sul` | suspeita forte de FP de identidade, sem `verdict=fp` registrado | detalhe persistido e fixture textual; print desses dois slides não recuperado nesta auditoria |
| Boulevard Rolândia s52/s55 | baseline de 13/10 e estudo real de 02/10 | erro preservado no replay; omitido no conjunto salvo do site | preservar como controle positivo de entidade/faixa, comparar leituras existentes |

Os três prints UsHome/Curitiba acima foram baixados e inspecionados nesta preparação; PNGs locais em `.local-inputs/audit-20261013/`, URLs deriváveis dos hashes no Storage `corretor-evidencias`. Não houve IA paga, reprocessamento ou mutação de estudos. Prints são imagens de tabelas, não prova de que o deck inteiro foi preservado.

## 0. Congelar o corpus de correção

1. Ler `AGENTS.md`, conferir todos os remotos e preservar alterações alheias. Há dois commits locais anteriores (`f5eff70` automação, `bb3326d` auditoria) antes deste plano; não confundir com publicação do app.
2. Selecionar primeiro os seis formatos Salvador, Goiânia, UsHome s35/s23 e Curitiba s37. Adicionar Palmas/ortografia somente depois dos dois primeiros incrementos ou quando houver prova suficiente.
3. Criar manifesto versionado por caso: `study_id`, versão/hash do deck quando conhecido, `rule_id`, slide, URL/hash da imagem, SHA-256 do print baixado, modelo/schema da leitura, veredito original, rótulo de revisão desta rodada e origem da transcrição. Modelo no cache não prova que exista a imagem completa do slide.
4. Manter PNG/PPTX/saída bruta em `.local-inputs/` ignorada; versionar fixtures pequenas com campos necessários para reprodução. Não substituir silenciosamente o cache original por uma transcrição corrigida.
5. Separar **erro de leitura/OCR**, **erro de regra**, **erro de escopo** e **registro antigo já superado**. Executar o motor atual antes de modificar para descobrir quais FP já não são produzidos. Se a causa foi corrigida antes, registrar o reteste e testar a migração/reconciliação; não duplicar regra.

**Aceite:** todos os casos selecionados têm proveniência e tipo de evidência explícitos. Nenhuma lacuna de imagem vira “verificado visualmente”.

## 1. Quantidade não é ano — primeiro incremento

**Onde:** `v3/format-checks.ts::literalFormatIssues`, `audit/ir-rules.ts::nativeFormatFindings` e chamada sobre rótulos lidos em `v3/ia-vision.ts`.

**Causa:** a regra atual considera duas strings `[12].ddd` suficientes para chamar uma coluna de “ano”. Repetição de quantidade `1.342`, por exemplo, também satisfaz o critério.

**Mudar:** transmitir contexto de célula/coluna ao detector, mantendo cabeçalho e vizinhos. Acusar ano com ponto quando houver cabeçalho/rótulo temporal explícito ou sequência cronológica inequívoca com anos distintos e ordenados, dentro do domínio temporal do estudo. Não usar repetição como prova nem presumir que toda quantidade entre 1.000 e 2.999 seja ano. Não esconder a dúvida com uma faixa fixa de anos que perderia séries históricas válidas.

**Testes:** seis exemplos negativos de Salvador; positivos de anos 2.023 e 2.027–2.032 com contexto; negativos de duas contagens iguais, valores por bairro/padrão, preços e períodos mencionados fora da coluna. Decimais duplicados e limites de faixa existentes devem manter comportamento.

**Aceite:** 6/6 exemplos de quantidade deixam de receber acusação de ano no teste; controle SJC VAP s73 continua detectado. Como não temos os prints originais Salvador, isso é aceite de regra/entrada controlada, ainda não prova de extração visual do deck completo.

## 2. Tabela × conclusão — segundo incremento

**Onde:** nova checagem pura em `v3/` ou extensão de `cross-table.ts`; integração em `pipeline.ts::combineVisionFindings` após nativas e tabelas de visão estarem disponíveis. Checar também o caminho de atualização com planilha/replay para não limitar ao primeiro upload.

**Contexto:** `analyze-text-batch` já pede COHERENCE, mas `ia-text.ts` envia tabelas **nativas** naquele passe. A tabela colada como imagem é lida em outra etapa. Portanto o prompt genérico não garante que texto e tabela-imagem sejam comparados juntos.

**Mudar:** associar frases como “Até 2032 são esperados novos ... domicílios em Goiânia” ao total da tabela de projeção no mesmo slide, pela cidade, métrica, unidade e janela. Ler o total municipal, não média anual, estoque, GO ou Brasil. Número de outro contexto/slide sem ligação inequívoca não pode gerar erro automático. Sem total alinhado e confiável, abster-se ou encaminhar para Verificar, com motivo concreto.

**Resultado:** um achado relacional com frase literal, total da tabela, números comparados, cidade/período e imagem de origem quando existente. Nenhum achado novo pode usar trecho inventado ou sugerir trocar números de recortes distintos.

**Testes:** positivo Daniele 17.566 × 56.808; negativo frase corrigida 56.808; negativo média por ano 9.468; negativos GO/Brasil, janela diferente, população × domicílios e tabela sem total confiável. Soma anual 56.807 × total 56.808 fica dentro da tolerância de arredondamento da soma; não é o erro principal e não deve gerar um segundo cartão indevido.

**Aceite:** detecta a divergência confirmada e não acusa os controles negativos. Primeiro demonstrar no fixture transcrito; depois retestar no print/PPTX real assim que recuperado. Distinguir explicitamente esses dois aceites.

## 3. Falsos positivos de visão, soma e identidade

Executar após 1/2, por evidência, sem tentar corrigir os 71 FP de uma vez.

- **Cidade inferida:** retestar UsHome s35 em `ia-vision.ts::wrongContextFromVisibleLocales` e `reconcile.ts::isStaleVisionContext`. A cidade precisa estar escrita em evidência de local, não inferida de empresa, empreendimento ou bairro. O print inspecionado não contém São Paulo. Preservar controles com município/UF realmente divergentes. Se a regra atual já abstém/reconcilia, registrar sucesso em vez de introduzir alteração redundante.
- **Total de fatia:** retestar UsHome s23 em `deck-reconcile.ts` e nas regras de soma (`audit/engine.ts`, `ia-vision.ts`). A imagem mostra parte da tabela, com total 13.408; soma da oferta lançada nas linhas visíveis é 2.781. Isso sozinho não prova erro: pode ser total global/paginado. Exigir completude/agrupamento adequado antes de acusar soma. Com contexto insuficiente, manter “não conferido”, sem promover erro. Coletar as demais fatias já referenciadas ou recuperar o PPTX antes de comprovar o total global.
- **Controle de soma real:** Curitiba s37 mantém o alerta 1.197 × 1.399, com a ressalva de escopo/nota fora do print. Não resolver o ruído desativando somas ou aumentando tolerância indiscriminadamente.
- **Bairro como empreendimento:** restringir a identidade em `entity-consistency.ts` a fichas/legendas com chave de empreendimento; rejeitar rótulos “Bairro”, “Região” e agregados. Comparar atributos só no mesmo nível/escopo/tipologia. Palmas vira fixture negativa; Boulevard é controle positivo. A exclusão deve ser semântica, não baseada no nome “Plano Diretor Sul”.
- **Ortografia sem sentido:** triar exemplos `DESLIGAMENTOS`, nomes próprios e termos de mercado. Preservar evidência literal e exigir justificativa/correção plausível. Aplicar guarda simples no cliente quando objetiva; refinar prompt somente quando a causa for interpretação do LLM. Reproduzir resposta salva não valida um novo prompt ao vivo; teste pago de prompt requer lote/orçamento.

**Aceite por caso:** FP deixa de ser gerado/rebaixado conforme evidência, ou a regra atual já mostra comportamento correto; controles positivos preservados. Os alertas sem contexto suficiente permanecem pendentes de adjudicação, sem contá-los como solucionados.

## 4. Reteste nos prints — protocolo obrigatório

1. Abrir a mesma imagem persistida, conferir integridade/legibilidade e identidade do registro. Anotar se o crop inclui contexto suficiente; a marcação humana não substitui o conteúdo da tabela.
2. Confrontar a imagem com a leitura em cache. Se o cache contém um número/local que a imagem não mostra, o problema é leitura; corrigir regra de confiança/âncora ou preparar releitura dirigida. Não adaptar a matemática para aceitar OCR errado.
3. Executar o motor atual sobre a leitura preservada e sobre uma transcrição verificada, em pistas separadas. A primeira mede tratamento das leituras antigas; a segunda isola a lógica com entrada correta.
4. Gerar ficha antes/depois por caso com: print/URL, leitura utilizada, achado anterior, achado novo ou ausência, valor esperado, razão da mudança, preservação dos controles e estado real. Screenshot da interface é evidência de apresentação; não substitui a comparação numérica.
5. Repetir os dez passes da suíte: `npm run test:corretor:materials`. Para consulta de UI, `--browser`; histórico salvo não muda só porque o código foi corrigido. Esperar dados reais carregarem antes de captura.
6. O browser atual bloqueia mutações e produz `guard_blocked` em SJC porque o app reconcilia registros ao abrir. Para verificar a correção na interface completa, usar uma bancada local com backend de fixtures em memória para reproduzir essas respostas/alterações, ou um processamento real explicitamente autorizado. Não liberar escritas de produção silenciosamente só para deixar a automação verde.

**Sem print:** Salvador/Palmas entidade usam evidência textual e testes de regra primeiro. A ficha fica “validação visual pendente” até recuperar o material; não pedir um deck novo se o original/print pode ser recuperado uma vez. A imagem da Daniele ainda precisa de arquivo local/PPTX ou vínculo ao estudo para automatizar a extração real; o exemplo transcrito já serve à regra.

**Critério de solucionado:** input original rastreável + comportamento após mudança observado + controle positivo mantido. Se faltar imagem/original/deploy, marcar como validado localmente/parcial, não resolvido em produção.

## 5. Publicação, persistência e medição

- Rodar testes significativos por causa, dez replays, tipos/lint/build se houver código de produto alterado e `check:live-docs`. Uma mudança legítima na expectativa deve trazer razão e evidência; a suíte não regrava gabaritos para aceitar a própria implementação.
- Corrigir rastreabilidade do modelo textual no registro de passes: o escopo hoje usa o modelo de visão `MODEL`, enquanto texto usa `TEXT_REVIEW_MODEL`. Gravar o modelo efetivamente utilizado pelo passe, sem editar retroativamente dados históricos sem prova. Não fazer essa correção cosmética passar por melhora de precisão.
- Comparar resultados por caso: seis FP de ano, omissão Daniele, âncora de cidade, soma de fatia, soma de controle e entidade. Informar numerador/denominador somente dos casos adjudicados deste corpus. Listar restantes como indeterminados; não extrapolar para precisão geral de todos os estudos.
- Atualizar plano de correções, regras live, etapa Rebrain, plano semanal e diário SE. Commit isolado e apresentação antes de push, conforme AGENTS. Edge Function só precisa de deploy se seu prompt/contrato mudar; confirmar ambiente e revisão, não deduzir publicação pelo Git.
- Snapshot de texto/tabelas/índice de imagens por versão fica como melhoria posterior de persistência para reduzir dependência do navegador. Não bloquear os primeiros testes por nova infraestrutura; no lote recente, reanálise integral ainda exige os originais ausentes.

## Ordem e limite do bloco semanal

**Entrega mínima do próximo bloco:** corpus rastreável + correção quantidade/ano + regra tabela/conclusão controlada, preservando os cinco decks. Retestes visuais disponíveis entram no mesmo fechamento; lacunas de print ficam nomeadas. Os demais FP são fila priorizada pelo resultado do corpus, não promessa de encerrar 71 casos dentro das 6 h reservadas.

Se a imagem/original do caso Daniele não estiver disponível em arquivo, concluir a checagem determinística com transcrição e avançar nos prints UsHome/Curitiba já disponíveis. Se o caso exigir IA nova, apresentar lote, modelos, número/dimensão das imagens, estimativa por passe e teto antes de executar. Nenhuma chamada paga é automaticamente autorizada por este plano.

## Execução autorizada — 13/10

Entrega mínima implementada e validada localmente: ano/quantidade, conclusão municipal e exclusão de fichas agregadas; rastreabilidade do modelo textual corrigida. Corpus de três prints/cache congelado. 28 testes, dez passes e build aprovados, sem IA nova ou deploy. [Resultado por caso](./RESULTADO_CORRECOES_EVIDENCIAS_2026-10-13.md).

UsHome cidade/soma ainda pendentes no cache original; transcrição verificada distingue erro de leitura de regra. Salvador/Palmas e Daniele sem reteste de extração original. Ortografia, adjudicação humana e caso completo semanal permanecem abertos. Resultado preparado para revisão antes do push; não marcar plano integral como concluído.

## CTA de execução

> Execute `PLAN_CORRECOES_EVIDENCIAS_PERSISTIDAS_2026-10-13.md`. Congele primeiro os casos com registros/prints já persistidos; corrija a confusão entre quantidade e ano e a divergência entre tabela e conclusão do caso Daniele. Reteste as evidências disponíveis, elimine falsos positivos comprovados e preserve os erros verdadeiros e os dez passes de regressão. Registre antes/depois e os limites de contexto de cada caso; use a fila de visão/entidade conforme a evidência e o tempo do bloco. Não faça novas chamadas pagas sem apresentar lote e orçamento. Preserve alterações locais de outras frentes, atualize os registros da semana e apresente o resultado antes do push.

Monday: [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102) — `12700802102`. Sem escrita no Monday.
