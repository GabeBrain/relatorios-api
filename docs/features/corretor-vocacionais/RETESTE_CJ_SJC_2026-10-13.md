# Reteste dos estudos existentes — Campos do Jordão e SJC — 13/10/2026

Estado: **três cruzamentos gratuitos verificados no site; reconferência integral não homologada**. Gabriel autorizou os retestes e, após bloqueio da revisão automática de aprovação, autorizou explicitamente vincular 11 planilhas em Campos do Jordão e 12 em cada SJC VAP/v2. Sem IA paga, sem publicação de código nesta sessão.

## Pareamento comprovado

- Campos do Jordão, estudo `408b3bce-a7dd-468f-8e91-5ae1b7a2a17f`: PPTX de 153 slides SHA-1 `e6a5fa03d2a189c86a59d70d5eb515e0dd3cd36f`; 11/11 planilhas iguais ao inventário persistido.
- SJC VAP, estudo `26808f74-f55e-4af9-9a4b-a5dc37879995`: 145 slides SHA-1 `bb968c4b7ae6e734a8e61137ed4c9aaa0b5070ee`; 12/12 planilhas iguais.
- SJC v2, estudo `344a7b69-bee9-4899-9ccc-ba1b2ef8efaa`: 107 slides SHA-1 `c37b3b735ede9493f1485a472dde5704854be9e9`; 12/12 planilhas iguais.

Todos os PPTX coincidem com a última versão salva. As planilhas SJC são o mesmo pacote já associado às duas versões; isso comprova igualdade com o banco, não a adequação temporal do pacote à versão anterior. Comparação dos hashes SHA-1 truncados do inventário contra os arquivos locais, sem depender de nomes apenas.

## Antes/depois observado

**Campos do Jordão:** 38 registros antes/depois do cruzamento, nenhum payload/status alterado nessa etapa; 57 leituras reaproveitadas, 1 divergência com a fonte, 22/23 valores iguais às planilhas. Interface: 35 itens revisáveis, 7 bloqueadores; custo acumulado US$ 0,4909 inalterado.

Reconferência direta anterior criou v2 do mesmo PPTX: encerrou `zi-label-135-primaria-4`, falso positivo conhecido de frase em que o raio vem antes da referência à Z.I., e atualizou checklist. O motor atual documenta esse caso na regra nativa. Sem exclusão dos 38 registros nem mudança de veredito humano. Isso não é edição do PPTX pelo analista.

**SJC VAP:** 33 registros preservados; 93 leituras reaproveitadas; 1 divergência com a fonte; 10/11 valores iguais. Interface: 32 itens revisáveis, 16 bloqueadores; custo acumulado US$ 0,3413 inalterado. Ao abrir o estudo, reconciliação automática encerrou `cross-domicilios-31-31`, achado que compara o mesmo slide consigo. Não atribuir essa mudança ao cruzamento das planilhas ou às correções v0.68. Nenhuma decisão humana alterada.

**SJC v2:** 22 registros preservados; 74 leituras reaproveitadas; 4 divergências com a fonte; 4/10 valores iguais. Interface: 21 itens revisáveis, 14 bloqueadores; custo acumulado US$ 0,4765 inalterado. Reconciliação ao abrir encerrou `cross-domicilios-33-33` (mesmo slide). Demais registros preservados, nenhuma decisão humana alterada.

Contagens de divergência são a mensagem do passe e podem incluir achados já existentes; não representam automaticamente novos erros únicos. Os estudos não continham vereditos humanos/ignorados/manualmente corrigidos nos snapshots consultados. Ainda assim, proteção de automação bloqueia alteração de decisões humanas se encontradas.

## Limitação encontrada em “Reconferir (DET R$ 0)”

Em Campos do Jordão, a etapa DET executou, mas a validação do cache atual considerou leituras antigas insuficientes e `recheckFromBytes` chamou automaticamente a fase paga. A automação bloqueou **43 requisições** às Edge Functions (1 textual e 42 de imagem); nenhuma chegou ao serviço, nenhuma IA foi cobrada. Portanto a mensagem de reconferência gratuita não apareceu, e a rodada direta terminou parcial. Custo anterior inalterado; relatórios históricos de tabelas preservados.

Não repetir esse caminho nos demais estudos enquanto o custo não estiver condicionado à aprovação. `CACHE_SCHEMA=10`: ter leitura persistida não garante que `estimateFullAnalysis` a aceitará como atual. O caminho de vincular fonte/retomar PPTX usa `loadVisionReadings` + replay e permitiu os três cruzamentos sem nova leitura. Foram **zero solicitações de função paga** nessa rodada final, zero erros JavaScript capturados.

**Próxima correção de maior impacto:** quando a reconferência detectar imagens a reler, terminar o DET gratuito e abrir confirmação com lote/estimativa; jamais iniciar texto/visão automaticamente. Preservar a versão/achados já conferidos; cancelamento não deve alterar evidência histórica. Validar depois com o cache legado de Campos do Jordão. Orçamento real ainda não calculado, nenhum lote pago proposto/aprovado.

## Evidências e handoff

Consulta/pareamento: `.local-inputs/corpus-site-2026-10-13T18-51-54-204Z/result.json`.

Reconferência DET parcial e chamadas pagas bloqueadas: `.local-inputs/corpus-site-2026-10-13T18-52-23-891Z/result.json`; estado persistido posterior em `2026-10-13T18-54-17-984Z/result.json`.

Rodada final: `.local-inputs/corpus-site-2026-10-13T19-01-53-989Z/result.json` e capturas `cj/vap/v2-before.png`, `cj/vap/v2-after.png`. Snapshots completos de achados/fontes, comparações por ID e controles de decisões humanas. Brutos ignorados pelo Git. Materiais originais continuam em `_UPLOADS_TESTE/Corretor_V3_*` da raiz SE; caminhos de cada versão no manifesto `calibracao/automacao/cases.json`.

Nenhuma regra/produto alterado, nenhum novo teste de código necessário nessa sessão. Dez passes de regressão aprovados na entrega anterior continuam referência; estes cruzamentos não substituem revisão integral de slides, novos prompts, caso Daniele ou adjudicação de verdadeiros erros. Próximo: corrigir gate de custo da reconferência e comparar alertas de maior impacto com os prints preservados. Preservar os acertos observados; não medir precisão global pelas contagens da interface.

Monday: [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102) — `12700802102`. Sem escrita no Monday.
