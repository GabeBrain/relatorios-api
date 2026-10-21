# Guajajaras — confronto com as regras do revisor

21/10/2026. Fonte SHA-256 `b2e01406c6be565ce450b8a67d078084feba0405661e8ff188a50b5a42253191`, 137 slides, original local preservado. Material já revisado: não substitui o arquivo anterior à revisão nem a saída histórica da IA, não recuperados.

## Método e resultado observado

Código anterior `a199e7e` confrontado com os caminhos atuais de texto, visão, cruzamentos, soma e ata. Extração atual executada no PPTX real. Para dados em imagem, usadas transcrições pequenas verificadas no diagnóstico anterior e identificadas no script/testes como derivadas; não são leituras Luna. Sem IA paga ou consulta/escrita remota nesta execução.

Reprodução: `node scripts/diagnostics/corretor-review-matrix.mjs`. Resultados integrais ignorados em `.local-inputs/review-luna-20261021/matrix-observed.json`. Os testes de `review-guajajaras.test.ts` exercitam os mesmos motores, incluindo contraexemplos e números de página diferentes.

| Caso e esperado | Evidência e regra anterior | Resultado observado e ajuste |
|---|---|---|
| Propriedade 32/33: comparar mesmo recorte e indicador | 68,5/72,6% na tabela versus 33,5/33,4% no resumo. Cruzamentos existentes não cobriam este par específico de indicador textual/tabela. | Nova regra genérica localizou os dois conflitos com referência a ambos os lados. “Verificar” conceito, período e denominador, sem escolher valor correto. Tabela desta rodada é transcrição derivada. |
| Verticalização 30/31 | SVG 95,7% para até 1km versus resumo 97,5%. O passe textual do revisor já recebe SVG, mas não mantém sozinho a associação geométrica dos dados. | Regra localiza o conflito quando recebe evidência estruturada com categoria/recorte. Nesta rodada essa ligação foi derivada manualmente. Não declarar que a extração Luna ou a geometria do SVG foram validadas. |
| Renda 27/28 | Três valores do 27 sem associação completa aos recortes, versus valores associados no 28. | A regra se abstém de associar os valores soltos. Lacuna de ligação das evidências continua identificada; trocar o modelo não a encerra. Não adicionar alerta numérico inventado. |
| Cabeçalho 63 | “Até 60m²”, 31–40, 41–50 e 51–60. Motor `detectBinGap` já existia. | Teste observado confirma detecção de sobreposição. Regra de intervalos preservada; não duplicada nem substituída por condição específica do slide. A confirmação pela leitura real Luna está pendente. |
| Garagem 66 | Total 1.204 versus 1.090 nas linhas visíveis; Rotativa no bloco de disponibilidade. Motor já acusava soma divergente. | Com a mesma imagem estruturada, nova conferência mostra possível categoria omitida e resíduo 114, substituindo apenas o alerta de soma daquela tabela. Não atribui o resíduo nem cria linha fictícia. |
| Unidade 24 | Título de domicílios e trecho “75.298.796 hab.”. Conferência com Excel já tinha validação de unidade, mas faltava a pista sem Excel. | Nova ocorrência de coerência localizada no texto real, “Verificar”; não converte o indicador ou altera o valor. |
| Soma 30/32 | Notas antigas acusavam soma acima de 100%. | Tabela atual do 32 fecha em 100%; motor de soma preservado e teste negativo aprovado. Não reabrir acusação antiga como erro atual. |
| Universos 61/63 | Exclusão de esgotados em uma das bases; taxas 27,4/31,2% usam denominadores diferentes. | Regras de exclusões preservadas; nova comparação não exige igualdade desses totais. A regra semântica não iguala anel a acumulado, percentual a absoluto ou anos explicitamente diferentes. |
| Amostra 108 | Nota antiga sobre 30 imóveis; imagem atual 1.815, com composição por bairro distinta. | Leitura numérica antiga não repetida por anotação. A composição continua preocupação interpretativa; não foi criada uma conclusão de preço para Barro Preto pela média total. |
| Ata, mix e comparáveis | Checklist existente podia encontrar o pedido na própria ata ou na repetição literal. | Própria ata/briefing e repetição literal não comprovam atendimento. Mensagem explicita que referência textual não garante resposta integral e que imagem pode exigir conferência visual. Não foi criada promessa de avaliação completa de mix por palavras-chave. |
| Recados, respostas e status 105 | Filtro anterior separava 22 caixas, mas deixava pedidos/respostas no texto factual. | Extração real atual separou 51 caixas; texto factual do 105 ficou com título, marcador e “Zaira Santo Agostinho breve lançamento”. Conversa preservada em notas, sem aceitar seus argumentos como fatos. Isso não valida o status de mercado de Zaira. |
| Mapas e identidade dos concorrentes | Há pedidos editoriais, prints, homônimos e dúvidas. | Preservados como revisão/contexto; instrução Luna separa fatos, premissas e comentários. Sem consulta externa de mercado, detecção visual integral de nitidez ou resolução automática de homônimos. |

## Controle de regressão

Cinco materiais originais e seus caches permaneceram congelados. Os dez passes usam baseline e Excel bruto. Não foram removidos nem alterados achados antigos na rodada revisada. Adições intencionais:

- Uma ocorrência “hab.” em página de domicílios em cada material, com trecho literal.
- VAP e v2 também apresentam rendas de R$6.722 e R$5.703 com o mesmo rótulo de raio em páginas distintas; nova ocorrência pede conferir conceito/período, sem declarar qual é correta.
- Uma primeira tentativa comparou percentual com absoluto em VAP. Esse falso positivo foi identificado na inspeção dos resultados, corrigido e coberto por teste específico, inclusive absoluto menor que 100.

As cinco diferenças de baseline estão descritas em `calibracao/automacao/review-deltas-2026-10-21.json`, com hashes exatos do antes/depois e justificativa. A baseline original não foi editada. O comparador só aceita essas transições exatas quando chamado explicitamente com `--review-deltas`; qualquer outra alteração continua exigindo revisão. Os cinco passes de Excel bruto ficaram iguais aos respectivos replays atuais.

## Limite de conclusão

Regras e preparação de evidências foram confrontadas localmente. A qualidade da extração e os resultados efetivos dos três passes Luna/high ainda precisam dos lotes autorizados após publicar o backend correto. Não há prova de reprodução do erro antigo de Amanda ou de superioridade universal do modelo.
