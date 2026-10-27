# Bancada científica de Curitiba — plano de implementação

Data: 27/10/2026. Estado: preparado; nenhuma nova interface, consulta Curitiba ou avaliação executada nesta etapa. Responsável: Gabriel.
Propósito: fonte única da próxima versão científica e seus critérios de aceite. O contrato operacional permanece em CONTRATO_E_VALIDACAO.md; a baseline operacional aponta para este plano.

## 1. Direção e limites

Na rota existente /rebrain/estimativas-vendas, manter o nome Estimativas de vendas e a introdução: “Transformar o histórico de um empreendimento em uma projeção de vendas compreensível, verificável e pronta para revisão.” A entrada principal passa a Estudos de previsão, começando em Curitiba. Preservar a jornada operacional em acesso secundário “Preparar lote”, sem apagar motores, regras, auditorias ou contratos.

O pedido atual autoriza planejar. O CTA abaixo inicia implementação local em outra execução. Não fazer push/deploy automaticamente. O refinamento visual final depende do ZIP revisado por Gabriel; contratos, inventário e motor de avaliação podem avançar antes, com componentes existentes.

As decisões do grill permanecem: comparação de métodos sem edição de entradas/parâmetros, origem desconhecida explícita, cenários fora do lote, filtros não alteram composição operacional. O foco científico foi solicitado após o diagnóstico Rio Branco. Isso muda a próxima frente, mas não comprova atendimento nem cancelamento dos prazos operacionais de 29–30/10.

## 2. Pergunta e evidências

Pergunta: com dados disponíveis até uma data, quão bem prevemos vendas líquidas no intervalo seguinte e estoque ao final, por condição do empreendimento?
Distinguir na interface: reprodução da referência; comparação com histórico reportado; avaliação com coleta confirmada. Reprodução de exemplos não é avaliação independente. Não apresentar R² alto do Finotti sem fonte e reprodução. Faixas empíricas originais não são garantia de cobertura em Curitiba.

Alvos separados: estoque final; venda líquida do intervalo; percentual acumulado como leitura secundária. Queda de estoque só representa venda líquida quando oferta/revisões forem reconciliadas. Não prever distratos nem preço nesta versão. Não transformar trimestres em meses artificiais. A flag atual do cadastro não estabelece a origem histórica.

## 3. Jornada e conteúdo

### A. Entrada: escolher o estudo
Curitiba/PR sugerida, condicionada ao catálogo autorizado GeoApiScopeEngine. Uma ação primária: “Carregar Curitiba”. Histórico disponível exibido depois da consulta; sem números fictícios na aplicação. Mostrar data da consulta, cobertura de páginas e acesso “Dados e qualidade”. Carregar ambos os tipos e reutilizar snapshot para filtros, modelos e gráficos.

Após a carga, catálogo de estudos: Referência Finotti horizontal; Referência Finotti vertical; Estoque antigo; Histórico curto; Outros padrões; Dados a esclarecer. Cartões editoriais de navegação, não gráficos pequenos. Cada um: pergunta, número de empreendimentos distintos, condição resumida e estado (pronto para explorar / avaliação limitada / dados insuficientes). Não confundir estoque zero com curva de vendas futura.

Condições são etiquetas que podem coexistir; não somar cartões sobrepostos como total. Mostrar total distinto e explicar sobreposição. Inventário inicial em uma data explícita, classificação histórica recalculada em cada data do teste. Separar faixa original horizontal 1–48 de extensão 49–60; acima de 60 é outro estudo. Vertical 1–36; padrões mapeados e comparáveis conforme fonte. Compatibilidade calculável não comprova equivalência da amostra de treino.

### B. Desenho do estudo
Página dedicada com pergunta, critérios, participantes/exclusões e qualidade dos dados. Resumo legível: “Usar dados até [data] e comparar os [intervalos] seguintes”. Preset recomendado calculado a partir da cobertura, sem supor mensalidade. Permitir estudar uma data ou várias datas passadas; configuração avançada em painel próprio, sem parede de botões. Antes de executar, mostrar métodos disponíveis, amostra comum, limites de treino e alvos avaliáveis. Método indisponível continua visível com motivo e ação possível.

### C. Resultado coletivo
Uma ação primária “Executar retrospectiva”; execução local cancelável. Resultado identifica fonte, protocolo, métodos, datas e quantidade de empreendimentos/testes. Métricas traduzidas: erro médio em unidades, tendência de superestimar/subestimar, cobertura. Separar qualidade/origem dos alvos; nunca misturar em uma única nota de precisão.
Gráficos grandes, um por linha: (1) erro por horizonte e método na amostra comum; (2) distribuição dos erros e casos extremos. Tabela pesquisável dos empreendimentos com erro, cobertura e motivo de exclusão. Não começar com uma média de curvas que esconda falhas individuais. Sobreposição e carteira são análises secundárias; carteira soma previsões individuais alinhadas no calendário e revela componentes ausentes.

### D. Exploração individual
Modal amplo ou página de detalhe, com foco restaurado ao fechar. Um gráfico principal: histórico usado, divisória “Previsão feita aqui”, linha prevista e histórico posterior, todos com estilos e legendas distintos. Finotti em verde de destaque; não depender só de cor. Seletor simples estoque/vendas do intervalo/percentual, somente quando o alvo existir. Dados faltantes interrompem linhas. Sem suavização que invente observações.
Mostrar mês dos dados, meses desde lançamento, unidades, estoque inicial, intervalo entre coletas, método/versão e erro. “Como foi calculado” abre painel editorial com equação, tradução dos símbolos, parâmetros efetivos somente leitura, origem e limites. Modelos podem ser sobrepostos sem nova API; manter poucos visíveis por padrão.

### E. Evidências
“Baixar evidências do estudo” entrega manifesto JSON, avaliações e exclusões CSV, dicionário e configuração. Não rotular como arquivo importável Geobrain. Dados sensíveis mantêm permissões; dados/IDs privados não integram portfólio público sem autorização. Conferência Excel permanece em Dados e qualidade, com instruções e link https://app.geobrain.com.br/analise-temporal-excel . Não confundir Análise Temporal com IVV de importação.

## 4. Etapas técnicas e entregas

1. Inventário e contratos: consultar Curitiba somente leitura, snapshot datado/hash em .local-inputs, dicionário e resumo agregado versionados. Conferir IDs, tipologias, duplicatas, unidades, estoque, lançamento, lacunas, oferta revisada, origem por período e periodicidade. Sem acesso, desenvolver com fixtures identificadas e declarar que o censo real está pendente. Aceite: contagens reconciliadas e razões para todos os registros.
2. Classificador puro: condições multidimensionais por empreendimento/data, separadas de elegibilidade operacional; múltiplos motivos e evidência de cada regra. API bruta -> normalização -> inventário -> protocolo -> previsão -> avaliação -> apresentação/exportação. Auditar uso de cadastro atual como atributo histórico: se não existe versão passada, registrar potencial vazamento, não presumir invariância.
3. Protocolo versionado: dataset/hash, data limite do treino, datas de previsão, horizontes, alvo, modelo/versão, IDs de treino e teste, granularidade, proveniência, exclusões, política de arredondamento. Origem por registro/alvo, nunca uma constante que transforme todo o conjunto em observado. Persistir configuração/resultado reproduzíveis sem persistir token.
4. Executor: reutilizar evaluation.ts, models.ts, contract.ts e referenceModels.ts onde corretos, sem afrouxar guardas. Predição recebe somente passado; o avaliador acrescenta o futuro depois. Worker para tarefas intensas, progresso real, cancelamento e descarte de respostas obsoletas. Cache por snapshot+protocolo; trocar visualização não chama API. Consulta com concorrência total limitada a 8, sem pools aninhados multiplicados, retry controlado e cancelamento; falha parcial nunca vira censo completo.
5. Primeira avaliação executável: estoque constante e ritmo recente quando intervalo/medida permitem. Finotti congelado permanece reproduzível; bloquear comparação histórica independente quando treino usa futuro. Reajustar coeficientes ou reconstruir coortes somente como novo artefato experimental com treino anterior e identificação própria. Não prometer retrospectiva independente Finotti na ausência desse artefato/futuro suficiente.
6. Integrar jornada mínima com primitives existentes e testes. Incorporar o ZIP aprovado depois por adaptação a React/TypeScript; não substituir autenticação, shell ou motor por JavaScript do protótipo. Preservar acesso operacional e regressões.
7. Evidências e entrega local: testes, build, capturas, reprodução congelada de Curitiba se disponível, limitações e acompanhamento. Sem publicação automática.

## 5. Protocolo estatístico mínimo

Separar desenvolvimento/calibração/teste final no tempo; reservar o teste antes de ajustar candidatos. Testes repetidos no mesmo empreendimento não são observações independentes: reportar empreendimentos distintos e número de previsões. Avaliação em empreendimentos conhecidos e generalização para novos empreendimentos são perguntas diferentes; não misturar resultados. Para comparáveis, excluir o alvo e informação posterior; Curitiba já participa do treino vertical original.

Comparar métodos nas mesmas chaves empreendimento/data/horizonte/alvo; mostrar também cobertura total e exclusões por método. Erro médio absoluto em unidades e viés (previsto menos reportado), mediana e percentil 90; erro em pontos percentuais do total lançado como complemento. Não usar MAPE quando venda real pode ser zero. R² não é indicador principal nem sinônimo de acurácia. Mostrar agregação por empreendimento para que históricos longos não dominem a leitura; agrupamentos por estoque/idade/tipo e horizonte.

Sem linhagem confirmada: comparação exploratória com histórico reportado. Mesmo com flag observada, snapshot atual pode conter revisões posteriores: declarar limite de reconstrução histórica. Não imputar resultado ausente; horizontes não observados ficam não avaliáveis. Estoques zerados são grupo separado, não inflação de acerto.

Faixas novas ficam fora da primeira entrega se não houver calibração separada suficiente. Quando houver, protocolo define tamanho mínimo antes do ajuste, calibração só com passado, avaliação de cobertura e largura em teste reservado; incerteza das métricas deve respeitar agrupamento por empreendimento. Não inventar sombras. Faixas originais podem aparecer como referência do autor, com rótulo distinto, nunca como calibração Curitiba.

## 6. Testes de aceite

- Regressão dos casos Finotti existentes sem alterar parâmetros/resultado; limites 48/49/60/61 horizontal e 36/37 vertical, padrões desconhecidos e estoque zero.
- Alterar/remover valores futuros não altera previsão nem classificação na data passada; oferta/padrão atual não entram silenciosamente no passado; treino/coortes posteriores ou com alvo são recusados.
- Mensal/trimestral, intervalos desconhecidos, negativo, revisão de oferta, duplicata, histórico curto, origem mista e alvo ausente têm resultados/motivos explícitos.
- Métricas verificadas com exemplos calculáveis à mão, inclusive amostra comum vazia, vendas zero e pesos por empreendimento; não substituir nulo por zero.
- Mesmo snapshot e protocolo geram mesmos resultados; exports conservam IDs, unidades, datas, versão e motivos.
- API: todas as páginas, limite de concorrência, erro/retry/cancelamento/troca de sessão; nenhuma chamada em filtros/comparação.
- UI: Curitiba autorizada e não autorizada, carga lenta com Brain, sucesso, vazio, parcial recusado, erro recuperável, nenhum modelo avaliável, ausência de futuro, nenhuma faixa calibrada. Teclado, foco, reduzido movimento, 390/768/1440px, claro/escuro, gráfico e tabela equivalente, sem overflow.
- Gate final: testes pertinentes existentes/novos, types, lint, build, check:live-docs e evidências. Teste sintético não prova API real; API real não prova precisão.

## 7. Fora da primeira entrega

Não ajustar uma família de modelos para cada condição já nesta etapa. Primeiro classificar, avaliar referências simples e estabelecer protocolo; priorizar novos modelos por frequência, estoque envolvido e dados para validação. Não editar parâmetros pelo usuário, estimar distratos/preço, homologar importação, criar probabilidades de venda por frequência, prometer prazo de esgotamento para todos ou publicar portfólio com dados privados.

## 8. CTA de implementação

Execute a primeira versão local descrita em docs/features/estimativas-vendas/PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md. Leia os AGENTS aplicáveis, AGORA, a baseline operacional, CONTRATO_E_VALIDACAO e as auditorias/referências citadas. Confira remotos e preserve alterações paralelas. Faça primeiro inventário reproduzível de Curitiba e contratos/classificador; depois protocolo e executor de retrospectiva sem vazamento temporal, baselines, métricas pareadas, exportação de evidências e jornada de estudos. Reaproveite motores e testes; preserve Finotti congelado e a área operacional. Sem linhagem, rotule comparação com histórico reportado; sem treino válido, não fabrique avaliação independente Finotti. Se o ZIP aprovado do Claude Design já estiver disponível, registre origem e adapte-o aos componentes/tokens locais; caso contrário, implemente a jornada funcional mínima no design existente, deixando o refinamento visual para sua chegada. Cumpra os testes e evidências do plano, registre limites reais e atualize documentos/acompanhamento. Não faça push, deploy nem importação no Geobrain.
