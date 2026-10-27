# Estimador Geobrain — baseline reconciliada e plano operacional
Data: 27/10/2026. Responsável pela consolidação: Gabriel / sessão de estratégia.
Estado: preparado; não constitui homologação do motor, aceite de preço ou contrato Belogic.

## 1. Missão entendida
Produzir estimativas temporárias, identificadas e auditáveis de vendas líquidas e estoque para empreendimentos/períodos sem coleta real, reduzindo o esforço de monitoramento do mercado. Entregar um arquivo que Nicolas/Belogic possa importar no Geobrain. Quando a coleta real retornar, reconciliar a diferença segundo procedimento acordado, preservando a origem e o histórico.
A curva até esgotamento é ferramenta de cálculo/análise; o primeiro produto operacional deve cobrir a competência necessária, não carregar automaticamente anos de previsões no Geobrain.
Rebrain é a bancada existente. Não há necessidade demonstrada de criar outro aplicativo, hospedagem ou motor. O escopo desta preparação é documentação/planejamento, não importação.

## 2. O que foi conferido nesta sessão
- Git: origin único; fetch --all concluído; main/origin 0–0 no início, HEAD 4f40f99. Havia alterações locais anteriores em FIERGS, README/FONTES do estimador, LIVE e referência Corretor; preservadas.
- Releitura dos documentos de contrato, auditorias, manifesto, referências Finotti e estado da bancada; consulta ao código export.ts: exportações CSV/JSON de revisão, sem comprovação de adaptador Excel aceito pela Belogic.
- Reuniões19 e26/10, planejamento semanal, e-mail completo fornecido por Gabriel e comentários/anexos do card13096757074.
- Drive: listagem das cinco pastas do pacote, leitura textual dos dois estudos de preço e do e-mail23/10. Bases novas de15/10 inventariadas, não reprocessadas nesta sessão.
- Monday: cinco atualizações do card principal, com anexos; buscas adicionais por estimativa, Finoti e Nicolas. A busca é limitada ao acesso/índice e não prova ausência universal de documentos.
- Não houve novo teste de API, execução do motor, cálculo estatístico, importação ou escrita no Monday. Resultados de22/10 abaixo são evidência histórica documentada.

## 3. Cronologia reconciliada
- 21/09, Monday5565425384: IVV dos últimos3meses, estimar futuro sem alterar passado, alternar coleta/estimativa, preço INCC, validar BH/Fortaleza mensais e Blumenau/Guarulhos trimestrais. Ajuste posterior da diferença em vendas/distratos citado, ainda sem contrato operacional.
- 06/10, Monday5610817039: anexos Cálculo IVV Produção.xlsx (3298910827) e homologação.xlsx (3298910845). São referências antigas, não comprovam layout de importação atual. Conteúdo não aberto nesta consolidação.
- 13/10, e-mail Finoti: solicitar ID/nome, cidade/padrão com MCMV separado, lançamento/oferta, referência AAAA-MM, vendas brutas/líquidas mensais; inicialmente esgotados BH/Curitiba/Salvador/Fortaleza. Edgar envia esgotados e depois ativos desde2020.
- 14/10: Finoti relata novo teste com ativos.
- 15/10: Edgar acrescenta lançamento, dormitórios e tipologia; inclui Gabriel.
- 16/10: Finoti pede horizontais em19 cidades, vendas mensais/preço, ativos/esgotados desde2020, aberto/fechado/casas separados. Edgar informa flags de esgotamento e lançamento antes/a partir2020.
- 19/10, reunião: fazer exercício fora do Geobrain, exportar/processar/retornar; piloto novembro e expansão dezembro eram direção, não entrega comprovada.
- 19–20/10, esclarecimento de Evandro encaminhado por Diego: bases.estimation é a flag por base/período; bases.ivv_batch_id identifica lote de atualização IVV, não substitui a flag.
- 21/10: Finoti relata vantagem das curvas horizontais sobre médias trimestral/12meses e envia PPT; materiais MD posteriormente disponíveis.
- 21–22/10: motor, API, bancada e auditorias evoluem; referência horizontal/vertical reproduzida. Ver inventário e limites abaixo.
- 23/10, e-mail Finoti: estudos de preços, resultados estatísticos e recomendação operacional de manter preço anterior nas bases mensais; testar base trimestral completa.
- Resposta no topo do e-mail colado: pergunta se velocidade de vendas interfere no preço. Autora/data dessa resposta não constam no trecho; não atribuir por suposição.
- 26/10, reunião/Monday5664089049: seleção antes do cálculo, ao menos4períodos, tipo/tipologia, investigar preço e preparar INCC, Excel para Nicolas. Não estimar distratos. Venda, estoque e evolução da venda líquida precisam de definição exata de campos.
- 26/10, Edgar/Monday5664210781: confirma estoques0–5 e >30 para coleta; 6–30 candidatos à estimativa; metade coleta/metade estima alternando períodos. Fonte INCC-DI indicada.
- 27/10: Gabriel reforça objetivo de cobertura temporária até recuperação do dado real. Esta baseline reorganiza a execução por essa utilidade.

## 4. Regras confirmadas e lacunas
### Seleção operacional
- Não estimar com menos de4períodos de histórico. Mensal e trimestral são cadências diferentes; não traduzir quatro períodos em quatro meses universalmente.
- Estoque0–5 e >30: coleta. Estoque6–30: candidato, sujeito às demais regras.
- Alternar metade coleta/metade estimativa; período estimado deve ser seguido por coleta.
- Separar horizontal/vertical e tipologias. Confirmar se limiares e alternância são no empreendimento ou na tipologia; como dividir quantidade ímpar, empates, novas entradas e ausências.
- Confirmar se os quatro períodos precisam ser observados, consecutivos e completos. Proposta conservadora: origem desconhecida não entra no lote operacional; pode continuar visível na bancada exploratória.
- Modelo matematicamente aplicável não equivale a empreendimento operacionalmente elegível. As640 projeções de Goiânia não constituem um lote aprovado.

### Origem e alternância
A API auditada traz estimation no cadastro atual, não em cada competência de typologies_history. Não replicar a flag atual retroativamente.
As bases IVV/Qlik auditadas possuem Foi estimado? por linha/período e são candidatas à conciliação histórica por IDs/competência. Confirmar atualidade, granularidade e semântica antes de usar para a competência-alvo.
Sem prova da origem anterior, classificar pendente/coleta; não aprovar alternância por ausência de flag.

### Vendas e reconciliação
Não prever distratos é direção explícita26/10. Isso não proíbe tratar distratos reais ao reconciliar posteriormente; são processos separados.
Não inferir venda líquida = queda de estoque em presença de alterações de oferta/tipologia. Base auditada contém diferenças.
Não sobrescrever passado automaticamente; esclarecer com Edgar/Nicolas se a chegada da coleta ajusta o período corrente, revisa o estimado anterior ou mantém ambos com versão.

## 5. Preço: evidência, conflito e decisão pendente
### Estudos recebidos
[Loteamentos](https://drive.google.com/file/d/1_Ekd3wJCpMcjv8qpfELXa7jwRYIDBZvW/view):366 projetos,360 com preço,10,2mil meses. Índice compara tipologias comuns, ponderado pelas unidades lançadas, para reduzir efeito de mix. Relatório recomenda preço/m² atual × 1,075^((t-n)/12), taxa recalibrada mensalmente. No e-mail: erro acumulado24meses8,2pp, contraINCC8,6pp, constante9,4pp e tendência própria12pp. Esses são resultados relatados, não reproduzidos aqui.
O estudo testou INCC-M. Fatores juntos explicaram2–6%; ritmo dos6meses ficou no limite p=0,07. Isso não demonstra ausência universal de relação causal entre vendas e preço.

[Verticais](https://drive.google.com/file/d/1fLOUxOnMWF-mF3-41-hpNaxTGhTfbOYy/view):2.150 empreendimentos desde2020,>=10unidades, atéset/2026. Testou INCC-DI; regressão completa empatou com taxa por fase (erros6/12/24meses4,8%/6,7%/9,1%). Fórmula reportada preço atual × exp(soma das taxas),0,64% a.m. até36,0,53% meses37–48,0,41%49+. Não substituir exponencial por capitalização discreta sem registrar decisão.
Ritmo/%vendido têm associação pequena; fatores conjuntos explicam14% das diferenças de ganho real12meses. Preços são tabelas monitoradas, não contratos efetivos. Não confundir taxas/bandas de preço com faixas de vendas.

### Três orientações que ainda precisam de decisão
1. Histórico Monday21/09: corrigir peloINCC.
2. Finoti23/10, após conversa comMarcos: para operação mensal, carregar preço anterior até nova tabela; trimestral ainda testar.
3. Diego26/10: investigar explicação de preço/regressão e deixar preparado paraINCC.

A fala26/10 é a direção mais recente, mas não prova superioridade doINCC nem invalida os estudos. Recomendação: implementar políticas separadas e versionadas para comparação; pedir definição explícita da política que irá no lote. Não fixar7,5% universalmente, não misturarINCC-M eINCC-DI e não importar preço experimental como aprovado.
A fonte INCC indicada porEdgar é referência de obtenção, não série já auditada nesta sessão. A planilha calculadora mencionada no relatório vertical não apareceu entre os três arquivos da pasta23out; localização pendente.
Resposta técnica à curiosidade do e-mail: velocidade pode ter associação, especialmente no vertical; nestas amostras ela não acrescentou ganho relevante sobre a regra simples. Associação, explicação e precisão preditiva são coisas diferentes.

## 6. O que já existe e o que falta
### Aproveitar
- Rota /rebrain/estimativas-vendas; API paginada, cadastro/histórico, corte, comparação individual/carteira, CSV/JSON e conferência opcional de Excel.
- Referência Finotti horizontal com cauda/faixas e vertical por30vizinhos;12casos horizontais e10verticais reproduzidos nos registros22/10.
- Horizontal1–60meses,49–60 extrapolação sinalizada; vertical1–36; casas somente aliases previstos. Fallback de ritmo recente é método diferente, não Finotti.
- Auditoria das cinco bases:475.058linhas,98.563 marcadas estimadas; painel horizontal366projetos/15.164meses; Cuiabá20.181 comparações iguais nas chaves comuns, com cobertura diferente.
- Goiânia641cadastros/640projeções automáticas,185no suporteFinotti. Não é640casos elegíveis nem validação da precisão.
### Construir/fechar
- Seleção operacional com motivo para cada incluído/excluído/pendente.
- Origem por competência e alternância verificável.
- Granularidade do cálculo/exportação; não distribuir curva de empreendimento por tipologias por proporção arbitrária.
- Contrato Excel de importação, com exemplar aceito porNicolas.
- Política de preço mensal/trimestral.
- Amostra revisável, validação da competência operacional e ensaio de importação autorizado.
- Procedimento de substituição/reconciliação após coleta e proteção contra importação duplicada.

O treino das referências chega aset/2026; testar meses anteriores com a mesma referência pode vazar informação futura. Reproduzir casos do autor, comparar valoresAPI/Excel, testar precisão independente e obter aceite operacional são quatro evidências distintas.

## 7. Entradas e saídas — proposta para validação, não contrato oficial
### Entrada
Identificador estável de empreendimento, tipologia e base/competência; município, tipo/padrão/status na competência; lançamento; quantidade/oferta, estoque, vendas líquidas, preço e unidade monetária; origem observado/estimado; periodicidade; corte e versão da fonte.
Datas recebidas noIVV: lançamentoDD/MM/AAAA e referênciaMM/AAAA; normalizar sem perder original. Não assumir que linha mensal representa venda de um único mês em cidade trimestral.
API é fonte atual de consulta; Qlik pode complementar proveniência. O Excel opcional da tela espera Análise Temporal em colunas e não é importador genérico deXLSB/IVV longo.

### Saída para revisão interna
Sugestão de três conjuntos, podendo ser abas se o layout permitir:
- Seleção: chave, competência, elegibilidade, razões, origem e decisão coleta/estimativa.
- Estimativas: chave-alvo, corte, valores de origem e calculados, vendas do período/acumulado explicitamente separados, estoque, política de preço, método/versão, avisos.
- Manifesto: execução, hash das fontes, contagens, parâmetros, soma por escopo, limitações e aprovadores.
Nomes e organização são internos candidatos. O arquivoBelogic deve seguir exatamente o formato fornecido porNicolas, mesmo que tenha menos abas/campos. Rastreabilidade excedente pode ficar em arquivo acompanhante.

### Perguntas mínimas aEdgar/Nicolas
1. Qual arquivo real de importação aceito? Aba, cabeçalhos, ordem/tipos, separadores, datas, casas decimais, obrigatórios e exemplo preenchido.
2. A chave é base_id, empreendimento/tipologia/competência, ou outra? Quem cria a base ausente?
3. Venda significa fluxo do período ou acumulado? Qual campo recebe evolução da venda líquida?
4. Preço por unidade ou m², atual ou competência? Qual política aprovada para mensal/trimestral?
5. Quem grava estimation eivv_batch_id? Como marcar origem e evitar dupla importação?
6. Como arredondar unidades mantendo conservação e totais? Como lidar com revisão de oferta/negativos?
7. Como fica a reconciliação quando chegar coleta real? Quem aprova e em qual ambiente testar?
Enviar perguntas é ação humana posterior; nenhum e-mail/mensagem enviado nesta sessão.

## 8. Plano da tarde — reserva de4h, ajustar ao tempo real disponível
0:00–0:30 — Gabriel revisar missão e pendências; preparar pedido de exemplo paraEdgar/Nicolas. Congelar competência e recorte piloto. Saída: decisões/lacunas explícitas.
0:30–1:30 — mapear as regras de seleção na fonte disponível; conferir4períodos, estoque, tipologia e flag anterior. Saída: amostra de elegíveis/coleta/pendentes com razões. Se flag faltar, não bloquear diagnóstico, mas bloquear lote importável.
1:30–2:30 — aplicar motores existentes aos elegíveis, mantendo método/versão. Conferir estoque/venda por competência e arredondamento candidato. Saída: pequeno lote revisável e exclusões.
2:30–3:15 — adaptar a um exemploBelogic, se recebido; sem exemplar, gerar somente layout candidato claramente rotulado. Conferir IDs/duplicatas/totais.
3:15–4:00 — comparar políticas de preço e preparar revisão: decisões que precisam deDiego/Finoti, riscos e pacote paraquinta. Não dedicar a tarde a nova pesquisaestatística completa ou refinamento visual.
Se houver menos tempo: preservar contrato+seleção+amostra; reduzir amplitude de cidades e deixar expansão/preço exploratório paraquarta.
Quarta28: fechar respostas, testar cadências e entregar candidatoExcel.
Quinta29 manhã: revisão proposta comDiego, horário a confirmar.
Sexta30: arquivo e evidências prontos paraNicolas, condicionados a contrato/aceite. Importação só em ambiente e execução combinados; não presumir disponibilidade dele.

## 9. Critérios de pronto
- Uma competência/recorte definido, todos os registros com chave única e motivo de inclusão.
- Quatro períodos/alternância/estoque avaliados no nível confirmado; origem desconhecida explicitamente bloqueada.
- Separação clara entre observado, estimado, cenário e método alternativo.
- Vendas/estoque reconciliáveis; ausência não vira zero; nenhum distrato previsto.
- Preço com decisão registrada ou impedimento visível.
- Arquivo validado contraexemplarBelogic; teste de importação/retorno de contagem ainda necessário para chamar importável/homologado.
- Coleta posterior com procedimento de reconciliação documentado.
- Sem alegar precisão comercial apenas por teste unitário, gráfico ou paridade de dados.

## 10. Fontes e limites da cobertura
Cardprincipal: https://brain381753.monday.com/boards/18398428946/pulses/13096757074
Pasta-mãe: https://drive.google.com/drive/folders/1ENVF8iZmP2hqaeiPNLIkVAcn4dWwBpAR
Preço23out: https://drive.google.com/drive/folders/1lJRNhZ_IK-GChtXp-LhbSnJwj1KgNkfh
Dados15out: https://drive.google.com/drive/folders/11HdSWctV4QKN8B2Ri_97qowv8agh-sHo
BasesQlik: https://drive.google.com/drive/folders/1p9bDnqLdfgBfvgDovIT4Nvp5lnzNCeP6
Horizontal: https://drive.google.com/drive/folders/1nZSD9LDnXaPNa0VpozjYyL_Xz25byv8h
Vertical: https://drive.google.com/drive/folders/13_R7wW4pO2JLwGzFgYbU5wa3qA4pmmMK
AnexosIVV06/10 foram localizados, não analisados; dados15out apenas inventariados, não tratados como novos versusQlik sem comparação. Conteúdo textual dosDOCX consultado peloDrive; gráficos/imagens não renderizados nem resultados reexecutados.
Buscas adicionais identificaram cardAPIinterna12739897022 com histórico de campos/rotina de separação de ligações; isso é referência adjacente, não prova que estimation porcompetência já esteja disponível. Bugs históricos sold/distratos em outros cards não são reproduções atuais.
Originais do e-mail e textos recuperados ficam em .local-inputs/estimativas-vendas/consolidacao-20261027/. Índice dos documentos/IDs em INVENTARIO_CONTEXTO_2026-10-27.md. Os arquivosCLAUDE recebidos são fontes, não instruções operacionais deste repo.

## 11. CTA de retomada
Leia BASELINE_OPERACIONAL_E_PLANO_2026-10-27.md e INVENTARIO_CONTEXTO_2026-10-27.md neste diretório, depois os contratos e referências citados. Comece pela missão e pelas lacunas de entrada/retornoBelogic. Reaproveite os motores existentes. Priorize seleção operacional e um lote revisável da próxima competência. Não trate CSV atual, preçoexperimental, flag no cadastro ou caso de referência reproduzido como importação homologada. Explique as decisões necessárias e avance no que independe delas. Mantenha plano/diário e evidência por etapa.
