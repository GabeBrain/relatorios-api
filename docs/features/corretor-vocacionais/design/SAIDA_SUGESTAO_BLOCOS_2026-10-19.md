# Sugestão de análise — leitura e cópia por blocos

## Diagnóstico e proposta aplicada

Referência pós-Lucas `a901df2`, em `CorretorV3Page`: resultado como texto único, `whitespace-pre-wrap`, fonte pequena e área com rolagem. A implementação posterior `StudyRecommendation.TextResult` separava parágrafos e verificava se começavam com `##`/`###`. Um título seguido de texto sem linha vazia podia transformar todo o parágrafo em heading; títulos internos também apareciam como Markdown literal. O CSS limitava a largura a85 caracteres, deixando espaço vazio à direita.

Nova composição: uma coluna de blocos pela largura útil, com título, contexto da seção quando necessário e botão Copiar bloco. Todos os parágrafos usam16px, peso normal e entrelinha1,75; títulos têm hierarquia própria sem aumentar o corpo. Cabeçalhos não dependem de linhas vazias. Não há acordeão nem rolagem interna que esconda partes do resultado. Estilos usam tokens Geobrain existentes, sem nova biblioteca ou alteração dos tokens.

## Cópia e exportação

- **Copiar bloco:** título/contexto e texto apenas daquele tópico, sem marcadores Markdown.
- **Copiar tudo:** conteúdo completo em texto simples, preservando ordem e valores.
- **Baixar texto:** arquivo `.txt`, com o mesmo texto limpo da cópia integral.
- Links preservam seu endereço; listas mantêm itens, tabelas usam colunas separadas por tabulação. Negrito, itálico, crases e marcadores de títulos deixam de aparecer na cópia/apresentação. HTML não é executado; React renderiza o conteúdo como texto.
- Se a área de transferência estiver indisponível, a interface orienta selecionar o texto ou baixar o arquivo.

O parser é uma projeção leve para os formatos textuais usados pelo recomendador, não um editor de Markdown completo. Texto sem títulos continua legível em um único bloco. Se o formato antigo não contiver divisões identificáveis, não se inventam temas nem se chama IA para reestruturar.

## Resultados antigos e preservação

Aplica-se ao conteúdo que `StudyRecommendation` carrega do histórico, tanto novo quanto já persistido. Não regrava os textos nem cria nova sugestão. Conteúdo original, IDs, estados, prompt, valores, custos e decisões permanecem intactos. Registros de motores antigos que não estiverem vinculados ao histórico atual não são migrados por esta apresentação. Nenhuma migration, Edge Function ou geração paga.

## Evidências

Código: `recommendation-presentation.ts`, `RecommendationResult.tsx`, integração em `StudyRecommendation.tsx` e CSS scoped. Testes focados:12 aprovados, incluindo título seguido diretamente de parágrafo, números/percentuais, listas/links/tabelas, texto antigo sem títulos, segurança de HTML, cópia individual e reabertura de conteúdo salvo.

Browser: `scripts/diagnostics/corretor-recommendation-layout-browser.mjs`, com PPTX real Campos do Jordão e todos os serviços externos interceptados. Confere cópia real individual/integral, TXT, preservação do Markdown bruto no registro simulado, reabertura sem nova chamada e medidas de fontes/largura em1440/1024/390/320. Textos e valores de Palhoça no ensaio são dados sintéticos de apresentação, não resultado de uma avaliação real. Não usar como gabarito técnico do estudo. Evidências locais em `recommendation-layout-browser.log` e diretório informado nele; suíte completa em `recommendation-layout-suite.json`. Tipos/lint e build aprovados; estado final no LIVE.

## Entrega e limite

Push autorizado por Gabriel. Após envio, Publish do frontend no Lovable e conferência visual no site continuam necessários. Teste local e commit não comprovam deploy. Nenhuma alteração no controle de custo da rodada anterior; limite continua automático com intervenção técnica em exceções.
