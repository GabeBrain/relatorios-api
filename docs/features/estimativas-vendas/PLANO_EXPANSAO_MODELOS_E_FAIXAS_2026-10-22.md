# Expansão das curvas e faixas de previsão

**Execução local em 22/10:** bancada e motores implementados; testes, auditoria real e condicionantes de faixas/comercial estão no [resultado da execução](RESULTADO_EXPANSAO_LOCAL_2026-10-22.md). Estado validado localmente, sem push/deploy. O texto de preparação abaixo preserva o protocolo original.

Data: 22/10/2026. Responsável pela frente: Gabriel/sessão; Edgar apoia contratos quando necessário. Estado: plano preparado, modelos e testes abaixo ainda não executados. Pedido: ampliar a bancada para horizontais, verticais, comerciais e outras derivações, com parâmetros próprios e sombra de incerteza. Este documento complementa o plano API/dossiê e o plano editorial; não altera o motor publicado nesta etapa.

## 1. Decisão de produto e correção de interpretação

Permitir selecionar e investigar todos os empreendimentos autorizados da API. Oferecer previsão quando houver entradas mínimas, cenário informado quando faltarem entradas e explicação individual quando nenhuma simulação for possível. Não prometer uma previsão estatística para 100% dos cadastros: um registro sem unidades, estágio ou vendas não determina uma curva.

As condições atuais têm origens diferentes:

- Aberto/fechado: são os dois conjuntos de coeficientes publicados que reproduzimos. Não transferir seus nomes ou sua validação para vertical/comercial.
- Origem entre meses 1 e 48 e horizonte de 36 meses: limites do recorte de ajuste informado na apresentação. A expressão pode ser calculável além deles; esse uso é extrapolação experimental e precisa de teste próprio.
- Origem com 0% ou 100% vendido: singularidades da expressão logarítmica atual. Remover a guarda ou adicionar um epsilon arbitrário não resolve a modelagem.
- Origem em 95% ou mais: falta reproduzir e confirmar a regra operacional de cauda; não é ausência de qualquer modelo possível para estoque residual.
- Estoque conciliado, ausência, duplicatas e revisão de unidades: proteções do adaptador implementado, não condições que se possa atribuir automaticamente ao Finotti.
- Mês inicial: o código hoje usa a primeira competência com rótulo de loteamento. Auditar contra lançamento e `time_on_sale`; série truncada não pode tornar um empreendimento antigo artificialmente jovem.

O alvo é reduzir exclusões com tratamento explícito e modelos adequados. Coeficientes Finotti permanecem uma referência congelada; derivações têm identificadores, domínio e parâmetros próprios.

## 2. Fase A — contrato, cobertura e alvos

Entregas: snapshot por cidade/tipo com hash, dicionário, funil de cobertura e catálogo dos motivos de exclusão. Brutos, tokens e saídas extensas não entram no Git; usar `.local-inputs/`. Evidências agregadas, contratos e modelos versionados entram no Git.

1. Inventariar tipos realmente aceitos pelo endpoint; Horizontal/Vertical já têm evidência. Descobrir como comercial, salas, lojas, casas e mistos são identificados, sem supor um parâmetro `Comercial` nem classificar pelo nome do empreendimento.
2. Normalizar empreendimento, tipologia, competência, início/fim do período de medição, data de lançamento, idade confirmada, unidades, estoque, vendas brutas, distratos e líquidas. Guardar ausente/zero/revisado e `observed | estimated | unknown` por competência.
3. Resolver periodicidade: um valor trimestral publicado em um mês não é automaticamente venda mensal. Treinar/avaliar no intervalo real; desagregação mensal, se proposta, é outro modelo e não gabarito.
4. Confirmar linhagem por base/período. Enquanto desconhecida, executar apenas comparação com a série reportada pela API, com selo exploratório; eventual ajuste em dados estimados aprende também o estimador da fonte.
5. Tratar mudanças de oferta e estoque com balanço explícito: estoque anterior + entradas/revisões - vendas brutas + distratos. Não interpretar revisão cadastral como venda nem preencher lacuna com zero. Dados conflitantes podem gerar cenários por fonte, mas não observação conciliada.
6. Definir alvos separados: vendas líquidas no intervalo, estoque ao fim e acumulado vendido. Para distratos, o acumulado líquido pode cair; modelos monotônicos são hipóteses de tendência de absorção, não representação completa da operação.
7. Manter empreendimentos esgotados, antigos e sem movimento no inventário para medir seleção e sobrevivência. Venda, locação e ocupação comercial não são o mesmo alvo; confirmar disponibilidade antes de expandir para locação.

Aceite A: cada campo e cada alvo têm significado, unidade e temporalidade; cada registro tem motivo de uso/exclusão; cobertura reportada por cidade/tipo/estágio. A ausência de linhagem mensal não impede desenvolvimento, mas impede chamar o teste de acurácia observada.

## 3. Fase B — motores candidatos

Implementar nesta ordem, promovendo somente candidatos que tragam cobertura ou erro melhores no teste reservado:

1. **Referências simples:** estoque constante/venda zero, último ritmo e médias de 3/12 períodos com duração conhecida. Explicitar mínimo de histórico; uma média de dois meses não recebe o nome de média de 12. Ritmo negativo e esgotamento exigem tratamento visível, sem truncamento silencioso.
2. **Finotti original:** preservar coeficientes e reprodução 300/150/6. Mostrar exclusivamente no domínio original reconhecido.
3. **Finotti extrapolado:** liberar origens acima de 48 meses quando a expressão for definida, com aviso e versão experimental. Testar isoladamente o efeito de ampliar idade, horizonte e classificação. Vertical/comercial não recebem automaticamente o coeficiente de aberto ou fechado.
4. **Família de absorção recalibrada:** candidato `A(t)=1-(1-A_n)^((t/n)^k)`, com `k>0` estimado no treino por segmento; comparar k constante, relação com estágio e ajuste com compartilhamento de informação entre segmentos. Registrar a imposição de monotonicidade. Curvas logísticas e Gompertz ancoradas no corte entram como concorrentes posteriores se houver história suficiente para identificar seus parâmetros.
5. **Modelo de fluxos:** prever vendas brutas e distratos separadamente, condicionados ao estoque/unidades vendidos, e reconstruir estoque por balanço. Comparar modelos de contagem com sobredispersão e ocorrência de meses sem venda; seleção da distribuição depende do diagnóstico dos dados. Essa família deve atender zeros, retomadas, quedas do acumulado e estoque residual.
6. **Coortes semelhantes:** para pouca história ou pré-lançamento, usar distribuição de trajetórias de pares do treino, condicionada a tipo, estágio e porte; cidade e período de lançamento só quando houver suporte. Exibir número de empreendimentos distintos, distância do caso aos pares e origem do parâmetro. Sem pares suficientes: cenário com parâmetros informados, sem faixa estatística.

Não cruzar todas as cidades/tipologias/faixas de porte de início: isso produz grupos vazios e parâmetros instáveis. Comparar ajuste geral por família, compartilhamento parcial e ajustes específicos. Variáveis como preço/localização só entram com disponibilidade na data da previsão e ganho medido; dados atuais revisados não podem aparecer como se fossem conhecidos no passado.

Cauda: comparar escoamento pelo ritmo recente, modelo de fluxos e hipótese linear de 5/6 meses do material horizontal, esta última identificada como hipótese até reproduzir a regra. Não obrigar todos os casos a esgotar. Estudos sem esgotamento no período de observação são censurados, não erros com mês inventado.

Aceite B: cada candidato declara entradas, domínio, alvo, política de falta de dados, versão, intervalo de medição e limitações. Nenhum fallback silencioso entre modelos.

## 4. Fase C — retrospectiva independente

Protocolo a congelar antes do ajuste:

- Inventariar Curitiba, Rio Branco, Blumenau, Fortaleza e Guarapuava/Maringá como recortes candidatos já explorados; o uso efetivo depende de acesso, periodicidade e linhagem. Incluir comercial somente após identificação comprovada.
- Separar treino, calibração das faixas e teste final por empreendimento; manter tipologias/fases do mesmo projeto juntas. Acrescentar separação temporal: treino/calibração só usam resultados disponíveis antes da origem avaliada.
- Avaliar duas situações separadas: futuro de empreendimentos conhecidos e generalização para empreendimentos/cidades novos. Reservar uma cidade quando a amostra permitir; não usar seu teste para escolher modelos.
- Origens candidatas em 3, 6, 12, 24, 36, 48, 60 e 72 meses; horizontes 1, 3, 6, 12 e 24, apenas quando o intervalo real da fonte permite. Fazer previsão com corte congelado e revelar a sequência posterior depois.
- Congelar lista de membros de cada carteira no corte. Calcular individualmente e somar em unidades; mudanças futuras da composição não podem melhorar o resultado retroativamente.
- Comparar modelos nos mesmos casos e horizontes, e publicar também cobertura no universo total. Uma previsão para mais casos não deve parecer pior somente porque assumiu os casos difíceis omitidos pelo concorrente.
- Medir erro absoluto em unidades e pontos percentuais, viés, mediana, percentil 90, erro de estoque e cobertura de casos. Evitar erro percentual relativo quando a venda real é zero. Usar denominador de unidades conhecido no corte; revisões posteriores ficam separadas.
- Separar resultados por tipo, cidade, estágio, porte, origem observada/estimada e cadência. Mostrar número de empreendimentos distintos, não somente quantidade de linhas/origens.
- Reamostrar empreendimentos inteiros para avaliar incerteza das diferenças de erro; origens do mesmo projeto são dependentes. Tratar dependência temporal/cidade na análise de sensibilidade.

Promoção: candidato deve melhorar cobertura com erro aceitável ou superar a referência no conjunto pareado, com tolerância de negócio definida antes de abrir o teste final. Sem tolerância acordada ou amostra que permita conclusão, permanece experimental. Não escolher vencedor e anunciar ganho nos mesmos dados de ajuste. Usar curvas de aprendizado e precisão das estimativas para definir suficiência amostral, em vez de inventar um mínimo universal.

## 5. Fase D — sombra de incerteza

A captura fornecida indica faixa central/metade dos casos e faixa ampla/8 em 10 casos. A imagem não determina o método, o universo nem se a cobertura foi medida fora da amostra. Reproduzir aparência não reproduz a estatística original.

Proposta própria: linha central e faixas de previsão de 50% e 80%, identificadas como novas. Faixa de previsão descreve possíveis resultados futuros; intervalo de confiança dos parâmetros ou da média é outro objeto.

1. Começar com quantis dos erros fora da amostra por horizonte e segmento, estimados no conjunto de calibração. Permitir assimetria; não usar percentual fixo em torno da linha nem desvio arbitrário.
2. Comparar com trajetórias simuladas pelo modelo de fluxos e reamostragem de empreendimentos. Se avaliar métodos conformais, usar desenho temporal apropriado; dados imobiliários correlacionados/revisados não satisfazem automaticamente permutabilidade e não dão garantia universal de cobertura.
3. Testar cobertura empírica de 50%/80% em teste reservado, largura, escore de intervalo e erro por horizonte/subgrupo. Informar incerteza da cobertura e tamanho amostral. Distinguir cobertura em cada data da cobertura da trajetória inteira.
4. Manter faixa de 50% dentro da de 80%, unidades coerentes e limites físicos do modelo. Se truncar/restringir intervalos, reavaliar cobertura após a transformação. Faixa pode ser assimétrica ou deixar de ser informativa.
5. Na origem, colapsar as faixas só se o estado inicial for tomado como conhecido. Origem estimada/incerta exige exibir essa condição e, quando modelada, propagá-la.
6. Para carteiras, simular/reconstituir trajetórias conjuntas preservando dependência entre membros. Somar limites individuais não produz automaticamente uma faixa de carteira com a mesma cobertura.
7. Sem calibração suficiente, mostrar “faixa ainda não estimada” ou cenários baixo/central/alto com premissas explícitas. Cenário não recebe rótulo de 80% de probabilidade.

Aceite D: tabela de cobertura/largura por horizonte acompanha a sombra; o teste final permanece independente; linha/faixas não alegam precisão observada em bases de origem desconhecida.

## 6. Plano de testes de implementação

- Matemática: ponto de origem exato, k positivo, estabilidade numérica, 0%, 95%, 100%, origem após 48 meses, cauda, estoque zero e horizonte longo; reproduzir 300/150/6 sem regressão.
- Contrato: ausência versus zero, IDs duplicados, tipologias mistas, série truncada, lançamento divergente, mudanças de unidades, venda negativa, distrato maior que venda, atraso de informação, mês sem registro e trimestre sem desagregação.
- Vazamento: alterar qualquer registro posterior ao corte não pode mudar entradas, parâmetros escolhidos nem previsão daquela origem. Proibir IDs compartilhados entre grupos independentes e estatísticas de normalização ajustadas no teste.
- Retrospectiva: amostra sintética de resultado conhecido, comparações pareadas, membros fixos, denominadores auditáveis e métricas calculadas à mão em casos pequenos. Medir falhas de cobertura, não descartá-las silenciosamente.
- Faixas: quantis ordenados, cobertura em simulação conhecida, pouca amostra, mudança de distribuição, dependência entre empreendimentos, carteira correlacionada e ausência de calibração. Simulação não prova cobertura no mercado real.
- Integração: API paginada, cancelamento, erro parcial explícito, seleção por tipo/modelo/corte, aplicação imediata de filtros, Excel opcional sem substituir fonte, CSV/JSON com modelo/versão/linhagem/faixas e snapshot.
- Interface: desktop/mobile, temas, acessibilidade, legenda sem depender só de cor, gráficos grandes, painel recolhível e carregamento Brain. Testar histórico, cenário manual, previsão experimental, faixa ausente, carteira e exclusões.
- Entrega: tipos/lint/testes/build, registro documental, comparação autenticada local e verificação do bundle mais percurso real após publicação. Push não comprova publicação.

## 7. Arquitetura e sequência de entrega

Manter módulos separados: fonte/normalização; qualidade/linhagem; registro de modelos e parâmetros; motores puros; retrospectiva; calibração/faixas; exportação/paridade; interface. Treino e experimentos rodam fora do navegador, com sementes/snapshot/versionamento. Navegador recebe artefato de parâmetros e executa inferência, sem credenciais no build.

Etapa 1: contrato normalizado, inventário de tipos e relatório de cobertura; classificação da idade e da periodicidade são prioritárias.

Etapa 2: retrospectiva reproduzível e referências simples, incluindo casos atualmente excluídos. Entregar primeiro relatório de erros e cobertura, mesmo que exploratório.

Etapa 3: extrapolação Finotti identificada, modelo recalibrado e modelo de fluxos. Cada mudança de regra passa por comparação isolada para identificar a origem do ganho.

Etapa 4: calibração 50%/80%, comparação de cobertura e carteiras; escolher modelos por evidência, mantendo alternativas para laboratório.

Etapa 5: página com escolha de tipo/modelo e distinção entre cenário, previsão e resultado observado. Gráfico mostra história anterior, corte, linha futura, faixas e realizado posterior quando disponível; painel lateral explica população de calibração, parâmetros, métricas e limitações. O menu atual Estimativas de Vendas permanece ponto de entrada.

Etapa 6: dossiê reproduzível por cidade/empreendimento/carteira, revisão e publicação controlada. Retorno ao Geobrain continua contrato separado.

## Referências metodológicas

- Hyndman e Athanasopoulos, [Forecasting: Principles and Practice, capítulo 5](https://otexts.com/fpp3/toolbox.html): avaliação temporal e avaliação de previsões pontuais e intervalares fundamentam o protocolo de retrospectiva. O desenho específico acima é proposta desta frente.
- Gibbs e Candès, [Adaptive Conformal Inference Under Distribution Shift](https://arxiv.org/abs/2106.00170): referência candidata para calibração sob mudanças temporais; suas garantias não equivalem a cobertura condicional garantida para cada cidade ou empreendimento.

Pendências: origem por base/período, intervalo real de medição, idade/lançamento, classificação comercial/mista, revisões de oferta, método original das bandas e tolerâncias de negócio. A imagem é referência visual; estes parâmetros de pesquisa não são regras aprovadas do Geobrain.

## Direção posterior de Gabriel — comparação simultânea

A composição padrão passa a ser grade de vários empreendimentos, com carteira agregada e detalhe individual sob demanda. O contrato visual, paginação, escalas, interação, carregamento e testes de 1/5/20/100 selecionados estão em [CTA de execução atualizado](CTA_EXPANSAO_MULTIPLOS_EMPREENDIMENTOS.md). Implementar essa composição na etapa de UI; cenários e faixas preservam os critérios metodológicos deste plano.
