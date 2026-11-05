# Revisão Finoti — Gramado e Canela — 03/11/2026

**Propósito:** fonte única do levantamento visual dos pedidos do consultor; separar regras do gerador, investigação numérica e escolhas editoriais antes do plano de implementação.
**Estado em 04/11/2026:** contrato D01-D14 fechado e implementacao publicada ate907d4aa. PPT recebido(2) conferido emPowerPoint; [matriz dos46comentarios, parecer e ressalvas](PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md#conferencia-do-ppt-recebido-2-e-situacao-dos46comentarios---04112026). Pronto para nova avaliacao do consultor, sem aceite externo presumido: escolhas do analista, origem e pequeno residuo editorial separados das correcoes. As observacoes de codigo abaixo descrevem a baseline original; nao sao afirmacoes sobre defeitos ainda ativos.

## Origem e método

**Atualização 05/11/2026:** Gabriel compartilhou o aceite de Finoti (“Os ajustes estão OK”) e novos exemplos de comparação territorial. A revisão anterior foi aceita quanto aos ajustes enviados; a ampliação de comparações está em diagnóstico, sem implementação ou aceite presumido. Ver [novas referências e estratégia](#referências-territoriais-recebidas-em-05112026).

- Material informado: `src/features/panorama-secovi-fiergs/revisao_3nov_finoti/panorama-fiergs-rs-canela-gramado-1T2023-3T2026_v2.pptx`. Cópia efetivamente localizada tem sufixo `_v2 (1).pptx`; não foi localizado o nome exato sem `(1)`.
- SHA-256 da cópia analisada: `df1ca3701fe45743102beb718fa1d7c0238845c51a2961e4ba4cc4a116b69ad5`.
- 69 slides, proporção 16:9, 13⅓ × 7½ polegadas. **46 caixas amarelas com texto, em 33 slides**, mais 11 marcações vermelhas sem texto. O slide 37 tem apenas marcação vermelha e também integra a revisão.
- Os 69 slides foram renderizados pelo PowerPoint, em leitura, a 1600 × 900. As páginas anotadas e o slide 37 foram conferidos em seis pranchas; slide 9 também ampliado para confirmar a ponta da seta sobre o rodapé. Extração XML/objetos preserva texto, posição e identidade das formas.
- Brutos, cópia imutável de trabalho, inventário e renders: `.local-inputs/fiergs-finoti-revisao-2026-11-03/`. Original permanece intocado. As imagens são evidência local, não ativos do produto.
- **Numeração abaixo é a posição no arquivo recebido**, não o número oficial do manifesto FIERGS: páginas omitidas mudam essa correspondência. A implementação deverá localizar as famílias de conteúdo pelo manifesto, sem fixar esses números de saída.
- Cada slide recebido tem uma imagem de base; os comentários são formas sobrepostas. Este arquivo documenta o material comentado, **não comprova a aparência da exportação nativa recém-publicada**.
- `git fetch --all` confirmou `main`/`origin/main` em 0/0, baseline `5383e3c`; nenhuma integração, push, API ou estudo real realizado para esta revisão. Alterações paralelas preservadas.

## Leitura consolidada dos pedidos

### 1. Identidade geográfica e temporal — automatizar

**Slides 9 e 11:** as caixas no canto inferior esquerdo e os contornos vermelhos apontam para o rótulo genérico `2 municípios · RS` abaixo da série. Pedido: identificar **Canela e Gramado**, não apenas a quantidade de cidades. O slide 11 explicita “Vale para outros gráficos”.

**Slides 10, 13, 17, 20, 24 e 28:** caixas na faixa logo abaixo do título pedem `3T 2026`. São distribuições do trimestre de fechamento, não somatórios da janela inteira. O slide 29 tem uma seta voltada à expressão `POR CIDADE · 3T 2026`, apresentada como exemplo a replicar.

**Slides 51–54 e 57–60:** caixas no alinhamento esquerdo, abaixo do título e antes da tabela, dizem `Subtítulo indicando que é de Gramado e Canela – 3T 2026`. Não apontam para o rodapé ou para uma célula da tabela.

**Regra proposta:** identidade de território e competência compartilhada entre tela, PDF e PPT; período correto por análise (fotografia, trimestre, janela ou 12 meses), não substituir todos os subtítulos pelo mesmo trimestre. Para conjuntos extensos, compor rótulo e quebra controlados sem colidir com título/tabela; lista completa continua disponível nas páginas de escopo. Preset homologado mantém sua identidade. Não fixar Canela/Gramado/3T2026 no modelo.

### 2. Linguagem técnica exposta e card de páginas — decisão editorial

**Slide 5:** primeira caixa cobre o terceiro card, que exibe `69 páginas neste relatório`: “Precisa indicar o número de paginas do relatório?”. Segunda caixa e contorno vermelho apontam para o rodapé `Dados GeoBrain · regras e rastreabilidade preservadas no cubo granular e na auditoria CSV.`: “Não entendi essa observação”.

**Slide 9:** a seta amarela grande, à direita e apontada para baixo, termina sobre a fonte `FONTE: BRAIN INTELIGÊNCIA ESTRATÉGICA · fotografia atual da API GeoBrain`. O alvo não é o título `Comparativo 9 meses` que fica parcialmente encoberto pela seta. Texto: “Será que deixar essa frase não fica muito na cara que o relatório é automático?”.

**Decisão D04, confirmada em 04/11:** substituir a contagem de páginas pelo período selecionado do estudo, mantendo três cards. Retirar jargão de implementação, preservar fonte discreta e informações necessárias de universo/competência. Regras, cobertura e rastreabilidade ficam em Metodologia, Avisos e Auditoria.

### 3. Páginas de MCMV sem atividade — decisão editorial com guarda de cobertura

**Slides 16 e 27:** caixas centrais cobrem gráficos MCMV acumulados em 12 meses. Textos: “Se nunca lançou MCMV, não precisa acumular em 12 meses” e “Se não tem lançamentos MCMV, não vai ter vendas e não precisa acumular vendas”. No material, a série MCMV fica em zero, mas há uma série cinza dos demais padrões, com valores.

**Decisão de Gabriel em 03/11:** omitir quando houver cobertura completa e a atividade pertinente à página estiver inteiramente zerada. Quando houver atividade, retirar do gráfico apenas séries/categorias comprovadamente zeradas em todo o trecho pertinente; preservar zeros pontuais dentro de séries com atividade. Registrar omissões nos avisos/manifesto, preservando os dados e a auditoria. Não inferir ausência de vendas a partir de ausência de lançamentos: estoque antigo pode vender. Não confundir dado ausente com zero, nem ocultar vendas negativas. A permanência da série dos demais padrões não obriga manter uma página cujo assunto é MCMV.

**Esclarecimento confirmado por Gabriel em 03/11:** retirar apenas comparações sem atividade: omitir quando ambos os lados forem zero ou faltar cobertura; manter comparações válidas. A regra vale para os comparativos do modelo, sem remoção geral das comparações anuais. Um lado zero e outro com atividade não equivale a comparação toda zerada; preservar valores/sinal, sem fabricar variação percentual quando a base zero a torna indefinida. Ausência de cobertura não vira zero. Omissões continuam rastreáveis nos avisos/auditoria.

### 4. Distribuição geográfica pouco informativa — decisão editorial

**Slide 18:** caixa central sobre `UNIDADES VERTICAIS LANÇADAS POR BAIRRO E CIDADE`: “Como tem pouco lançamento, não precisa desse slide”. O exemplo mostra Floresta–Gramado com 100% e Gramado com 100%, Canela com 0%. Slide 10 informa um empreendimento lançado.

**Decisão D05, confirmada em 04/11:** não criar omissão por pouco lançamento, único empreendimento ou baixa diversidade geográfica. Melhorar o tamanho/aproveitamento dos gráficos; o analista avalia a utilidade da página e pode editá-la ou excluí-la no PPT. A relevância editorial depende do projeto e não deve causar perdas automáticas em outros recortes que usam o mesmo motor. Esta escolha se refere à heurística de pouco lançamento; não revoga as omissões por atividade inteiramente zerada/cobertura já aprovadas acima.

### 5. VGL e VGV — nomenclatura, sem alteração numérica automática

**Slides 19–21:** caixas sobre a primeira linha do título: `VGL – Valor Geral Lançado`.
**Slides 30–31:** mesma posição: `VGV – Valor Geral Vendido`.
**Slide 55:** caixas separadas sobre os cabeçalhos monetários de lançamento e vendido, à direita: `VGL` e `VGV`. A coluna intermediária do valor da oferta final não recebe caixa.

**Decisão D06, confirmada em 04/11:** apresentar sigla e extenso juntos: **VGL — Valor Geral Lançado** e **VGV — Valor Geral Vendido**; nome explícito para valor da oferta final. Auditar a base de cada coluna antes de apenas trocar sigla, especialmente o caráter histórico, da janela ou do fechamento; nome não valida fórmula. Glossário/Fórmulas acompanham a decisão. A mensagem isolada anterior sobre “recomendação” se referia a D06; não aprovava todas as recomendações D01–D14.

### 6. Barra de venda negativa — correção objetiva

**Slide 24:** caixa inferior e contorno vermelho na última barra, padrão Alto: `−7`, participação `−4,8%`. Pedido explícito: “Se aqui é -7 a barra deveria estar para o outro lado e vermelha”. O número tem sinal, mas a barra verde se estende para a direita.

**Confirmado no código:** `FiergsDistributionSlide` calcula largura com `Math.abs(row.value)`; classe `is-negative` existe, mas não foi localizada regra CSS correspondente na feature. Propor eixo/linha de zero e barras divergentes com negativos à esquerda/vermelhos e positivos à direita. Preservar venda líquida e total algébrico, sem converter distrato em venda positiva. Conferir também os comparativos e o PPT nativo, que têm renderizadores diferentes.

### 7. Total da disponibilidade (“média”) — metodologia, não preenchimento cosmético

**Slide 34:** `OFERTA LANÇADA E FINAL | POR TIPOLOGIA`; três caixas à direita: `Padronizar`, `Disponibilidade s/ O.L.` sobre o cabeçalho da última coluna, e `Faltou a média` abaixo da célula total circulada que contém um traço.
**Slide 35:** mesmo pedido e círculo na célula total da disponibilidade, agora por padrão.
**Slide 58:** caixa `média` abaixo do traço na última célula do total por ano de lançamento; círculo reforça o alvo. Não se refere à média de unidades por empreendimento de outra página.

**Confirmado no código:** `OfferTableSlide` omite esse total quando há janela; linhas usam oferta histórica, enquanto oferta lançada exibida usa a janela. `CohortTableSlide` também omite o total por misturar coortes da janela e estoque antigo. No slide 58, até 2022 há 91 unidades finais e zero lançamento na janela: dividir 174 por 414 automaticamente não resolve o universo dessa linha.

**Decisões D07/D09, confirmadas em 04/11:** o cabeçalho visível fica **Disponibilidade s/ O.L.**, retirando “histórica”; a base histórica das taxas não muda e segue explicada em Metodologia/Fórmulas. O agregado pedido será a **média aritmética simples das taxas das categorias**, nomeada **Média das taxas**, e não disponibilidade global ou razão de totais. Não dividir estoque histórico por lançamentos da janela para produzir taxas por categoria. A escolha não autoriza padronização geral de todas as tabelas além dos ajustes explicitamente aprovados.

### 8. IVV divergente e início da série — investigação numérica

**Slide 38:** caixa à direita `No slide anterior a média é 9.5%` e contorno vermelho no total **8,5%** da tabela por área útil. No slide 37, o fechamento da série/comparativo mostra **9,5%**. É uma diferença real no material, não arredondamento.

**Controle aritmético confirmado:** tabela 38 mostra oferta anterior 1.647, lançamentos 70 e vendas 146; `146 ÷ (1.647 + 70) × 100 = 8,503...%`. Também `146 ÷ (1.571 + 146) × 100 = 8,503...%`. Isso demonstra coerência interna do 8,5% com os totais impressos; **não prova a causa do 9,5%** nem autoriza sobrescrevê-lo.

**Código:** série temporal deriva IVV de vendas/estoque por dimensão em `report/model.ts`; tabela por área usa tipologias do cubo em `domain/aggregations.ts`. Ambas têm identidades de base, mas origens/abrangências diferentes. Precisamos reconciliar por empreendimento, competência, classificação e cobertura. Não forçar igualdade, tirar média entre taxas ou fixar 8,5%.

**Slide 37:** retângulo vermelho sem texto cobre os primeiros dois pontos, 1,2% e 56,9%, de 1T/2T2023. **D12, confirmada em 04/11:** recuperar os tratamentos históricos já fundamentados no motor e verificar se algum se aplica; sem contrato consistente/reutilizável comprovado, manter a série como está e encaminhar a investigação à base que alimenta a API. Não criar filtro novo de outliers, suavizar picos ou cortar o período por aparência. A atribuição do problema à origem é uma hipótese de investigação, não causa técnica já demonstrada.

### 9. Fonte pequena nas tabelas — automatizar layout

**Slides 51, 53 e 54:** caixas no centro das tabelas: “Aumentar a fonte da tabela de dados”. Referem-se à matriz de metragem × tipologia e às duas matrizes de maturidade por tipologia/padrão. Não é fonte do título ou do rodapé.

**D08, confirmada em 04/11:** manter uma página por tabela, com a maior fonte possível que caiba com o conteúdo inteiro, melhor uso da área útil e ajuste dinâmico de espaçamento. **Não criar continuação automática em outro slide.** Quando a automação não entregar boa leitura, registrar como acabamento do analista no PPT editável; não cortar células/zeros nem inserir números/colunas artificiais. Validar PDF e objetos nativos do PPT separadamente.

### 10. Preços e área mínima suspeitos — investigar, sem corte arbitrário

**Slide 52:** caixa inferior: “Preços muito baixos, seriam compatíveis com padrão econômico, que não existe na cidade”. Um retângulo vermelho cobre os mínimos de R$/m² de 1, 2 e 3 dormitórios: **4.727, 4.425, 4.149**. Outro marca **50 m²**, área mínima de dois dormitórios. A caixa de subtítulo fica sob o título, separada desse pedido numérico.

**Confirmado no código:** `FiergsTypologyPriceRangeSlide` percorre todas as tipologias verticais com preço/m² positivo; peso do estoque é usado nas médias, mas mínimo/máximo incluem entradas com oferta final nula/zero. Uma tipologia sem estoque pode determinar o extremo de uma tabela apresentada como fotografia da oferta final.

**D10/D11, confirmadas em 04/11:** a tabela deve usar a oferta final disponível: tipologias com estoque positivo e métricas válidas da fotografia do fechamento; médias ponderadas pelo estoque e extremos do mesmo universo. Gabriel espera que esse recorte resolva os preços baixos; isso permanece uma hipótese até a comparação antes/depois, não resultado garantido. Se mínimos baixos continuarem válidos no universo correto, preservá-los, sem filtro por aparência econômica. Os **50m²** foram tratados por Gabriel como peculiaridade dos registros da cidade: não criar regra de correção/exclusão para essa metragem nem investigação especial por esse valor. Não afirmar erro de origem antes de rastrear os registros relevantes ao ajuste de universo.

### 11. Empreendimento isolado nos mapas — investigar cadastro/geometria

**Slides 61–63:** a mesma seta aponta para o marcador isolado ao noroeste, longe do aglomerado de Canela/Gramado, perto da região de Caxias do Sul. São mapas por padrão, estoque e R$/m², cada um com 329 empreendimentos georreferenciados. Não se refere à legenda nem a um ponto aleatório no aglomerado.

**D13, confirmada em 04/11:** enquadrar os mapas pelo território das cidades selecionadas, melhorando o foco do mapa e deixando coordenadas distantes fora da apresentação. É uma restrição visual, sem excluir empreendimento dos indicadores ou alterar seu município. Identificar o registro e encaminhar a apuração da origem geográfica à API/base; um recorte visual não comprova nem corrige o cadastro. Possíveis causas continuam sem prova: cadastro geográfico incorreto, inversão/conversão de coordenadas, referência municipal ou posição legítima distante. Não inventar raio ou lista de exceções; a fonte de limites municipais é dependência técnica do plano. O ponto fora do enquadramento não pode ser artificialmente recolocado na borda pelo clamp de coordenadas. Ausências visuais e quantidades permanecem rastreáveis nos avisos/auditoria; contagem de marcadores exibidos precisa corresponder ao mapa, sem mudar totais analíticos.

### 12. Documentário institucional — alteração editorial explícita

**Slide 68:** caixa grande central: “Esse slide do documentário já saiu do material institucional”. Pedido claro de retirada da lâmina de documentário do manifesto ativo. Não pede retirar todos os institucionais nem trocar a arte de 23 anos. Confirmar inventário/versão compartilhada antes de propagar a outros relatórios; alteração de manifesto repercute em sumário, navegação e nomes internos, não em dados.

## Achado adicional da revisão, não atribuído ao Finoti

**Slide 35, coluna de percentual após Nº de Empreendimentos:** 23 empreendimentos Compacto em um total de 148 correspondem a 15,5%, mas a tabela mostra 18,2%, valor de `770 ÷ 4.237` unidades lançadas. O JSX confirma que essa célula usa `row.launched / launchedTotal` em vez de participação dos empreendimentos. Trata-se de correção objetiva de denominador e semântica do cabeçalho. Antes de alterar, conferir se a contagem por padrão tem exclusividade/reconcilia com o total; preservar contratos da janela e não contar empreendimento repetido por tipologia.

## Contrato de ajustes — decisões consolidadas

### Confirmado por Gabriel

- Omitir página com cobertura completa e atividade pertinente inteiramente zerada; cobertura incompleta não pode ser interpretada como ausência de atividade.
- Se houver atividade, retirar somente séries/categorias inteiramente zeradas no trecho pertinente, preservando zeros pontuais e vendas negativas. A regra remove apresentação redundante, não dados da base.
- Omitir comparativos quando ambos os lados forem zero ou faltar cobertura. Manter comparações válidas, incluindo um lado zero e outro com atividade; percentual sobre base zero não é calculado.
- Omissões ficam rastreáveis nos avisos/manifesto/auditoria; notas técnicas não migram para o PDF/PPT.

### D01–D14 — decisões de Gabriel em 04/11/2026

As respostas individuais do formulário são a autoridade desta consolidação; substituem a leitura equivocada de aprovação geral a partir da mensagem isolada sobre D06. Não há perguntas editoriais D01–D14 pendentes.

- **D01 — alcance aprovado:** FIERGS e Secovi, no motor compartilhado, preservando regras numéricas e materiais próprios de cada produto. Corretor, Sinduscon e outros relatórios ficam fora do escopo.
- **D02 — identificação aprovada:** território e período em toda página analítica, em posição consistente; não adicionar às artes institucionais. Rótulo conforme trimestre, janela ou acumulado efetivamente calculado.
- **D03 — conjuntos extensos aprovado:** nomes quando couberem em até duas linhas; identificação compacta para conjuntos maiores, lista completa na página de cidades e nome do preset oficial preservado.
- **D04 — abertura/fonte aprovado:** substituir card de páginas pelo período do estudo; manter três cards úteis, fonte discreta e jargão técnico fora do material.
- **D05 — relevância editorial decidida pelo analista:** não automatizar exclusão por pouco lançamento ou concentração geográfica. Aumentar os gráficos/aproveitar espaço; analista edita ou exclui a página no PPT quando não agregar ao projeto. Omissões por atividade inteiramente zerada continuam conforme decisão anterior.
- **D06 — sigla e extenso aprovados juntos:** **VGL — Valor Geral Lançado** e **VGV — Valor Geral Vendido**; valor da oferta final com nome próprio. Garantir ambos na apresentação pertinente, sem reduzir para sigla isolada ou alterar cálculo para caber no rótulo.
- **D07 — cabeçalho aprovado:** retirar apenas “histórica” do rótulo, ficando **Disponibilidade s/ O.L.**. Denominador não muda por troca de nome; explicação da base histórica fica em Metodologia/Fórmulas. Não foi aprovada a proposta mais ampla de redesenhar todas as tabelas.
- **D08 — tabela única aprovada:** maior fonte que caiba em um slide com conteúdo inteiro; ajuste dinâmico de espaço, sem gerar dois slides/continuação automática. Acabamento que não puder ser resolvido adequadamente fica na lista do analista, com edição nativa no PPT.
- **D09 — média simples aprovada:** calcular média aritmética das taxas das categorias e rotular **Média das taxas**. Não apresentar como disponibilidade global nem substituir por razão dos totais. Categorias de dados válidas, sem total/subtotal em duplicidade; zeros observados entram, ausências e bases não calculáveis não viram zero. Base e cobertura documentadas nas abas de apoio/auditoria, sem nota técnica no slide.
- **D10 — universo atual aprovado:** tabela de mínimos/médias/máximos usa oferta final disponível, com estoque positivo e métricas válidas na competência do fechamento; médias ponderadas pelo estoque e extremos no mesmo universo. Cobertura avaliada por métrica, preservando dados ausentes sem imputação.
- **D11 — sem regra de corte/área:** aplicar D10 e verificar seu efeito real nos preços. Não criar tratamento para50m² nem piso de preço ou padrão presumido. Se preço baixo válido permanecer no universo correto, mantê-lo. A expectativa de que D10 elimine os mínimos baixos não substitui a evidência antes/depois.
- **D12 — reaproveitar apenas tratamento fundamentado:** examinar contratos históricos existentes e se há correção consistente aplicável aos picos. Sem isso, manter valores/janela e encaminhar investigação da base/API; não criar filtro de outliers ou suavização. Divergência9,5%×8,5% continua exigindo confronto das bases antes de qualquer correção numérica.
- **D13 — foco territorial aprovado:** restringir visualmente o mapa aos municípios selecionados; marcadores distantes não ampliam a imagem e ficam fora da exibição. Nenhuma exclusão do cubo/indicadores ou alteração cadastral. Investigar localização na origem separadamente; recorte visual é apresentação, não prova de erro da API. Usar referência territorial verificável, nunca raio/cidade/empreendimento fixado como exceção.
- **D14 — diferença absoluta aprovada:** para base zero ou negativa, mostrar os dois valores e a diferença em unidades/reais, sem percentual. Para bases positivas válidas, manter percentual; falta de cobertura e ambos os lados zerados seguem as omissões já aprovadas.

### Acabamentos reservados ao analista — lista inicial

1. **Relevância da página:** decidir se uma distribuição geográfica com pouco conteúdo deve ser mantida, ajustada ou excluída; nenhuma heurística de volume/densidade apaga essa análise automaticamente.
2. **Leitura da tabela:** quando o ajuste automático em um slide não entregar o acabamento desejado, editar fontes, larguras, posições e composição no PPT nativo, sem alteração automática dos dados.

Esta lista será reunida no handoff de uso do relatório. Divergências de IVV/preço/cadastro não são autorização para corrigir números manualmente no PPT; ficam como investigação da origem e dos contratos de cálculo.

### Requisitos claros e limites de implementação

- Identificar recorte/competência, tornar tabelas legíveis e representar negativos à esquerda/vermelho são pedidos expressos. O contrato detalha alcance e apresentação, não pergunta se dados negativos podem ser descartados.
- Corrigir percentual de empreendimentos exige numerador/denominador de empreendimentos reconciliados. Retirar documentário68 do manifesto FIERGS é pedido editorial explícito; não significa remover outros institucionais nem alterar outros produtos sem examinar a arte correspondente.
- Os mesmos dados, unidades, rótulos e regras editoriais aprovados devem orientar tela/PDF/PPT; implementações gráficas diferentes precisam de conferência própria. Arquivo raster anotado não valida edição/aparência do novo PPT nativo.
- Preservar exportação, alertas, contratos de histórico/capacidade, zeros/nulos/negativos e políticas específicas dos produtos. Não reabrir como nova decisão a política de alertas já acordada nem afrouxar cobertura/proveniência.
- Sem revisão automática de cadastro na origem, cortes por município/período ou textos analíticos inventados para substituir o consultor. Revisões narrativas e específicas do projeto permanecem editáveis pelo analista no PPT.
- Reconciliar IVV, oferta histórica e preços antes de alterar indicadores. O mapa pode receber o enquadramento territorial aprovado sem presumir correção cadastral; identificar o registro antes de atribuir causa/alterar sua coordenada. Resolver causa comprovada; lacunas de evidência são investigação, não preferências a decidir por votação.

**Não dependem de opinião:** recuperar nomes das cidades e competência correta; legibilidade; representação do negativo; diferença de IVV exige diagnóstico; percentuais de empreendimentos exigem denominador coerente. **Não comprovados pelo arquivo:** causa do IVV, identidade/erro do marcador distante e origem dos preços mínimos. A área50m² não recebe tratamento especial por decisão D11.

## Próximo passo e limites

Contrato fechado pelas respostas de04/11. **[Execução G0–G6, R1/R2 e evidências](PLAN_IMPLEMENTACAO_REVISAO_FINOTI_PANORAMA_2026-11-04.md#execução-autorizada-em-0411--resultado-curto)** concluída localmente após ativação doCTA. Este documento continua sendo a fonte das decisões; resultados e pendências ficam no plano. Próximo: autorização de publicação e conferência no site, sem nova coleta extensa nem antecipação de homologação. Origem cadastral deWinkelHaus permanece para investigação; não aplicar cortes numéricos por período/cidade ou editar números para concordar com comentário.

Validação desta etapa é documental: leitura estrutural do PPT, renderização Office, comparação visual e inspeção dirigida do código. Não foram executados testes de produto porque nenhum comportamento foi alterado. Novo PPT editável requer ensaio próprio; o material comentado em imagens não é evidência desse ensaio. Sem push/publicação nesta revisão.

## Inventário espacial completo

A seção abaixo é gerada do inventário da cópia de origem e associa cada caixa a seu alvo. Coordenadas em porcentagem da largura/altura do slide, no formato `x / y / largura / altura`; origem no canto superior esquerdo. Os comentários são transcrições; propostas de interpretação permanecem separadas acima.

| ID | Slide | Caixa x/y/largura/altura (%) | Comentário | Alvo visual |
|---|---:|---|---|---|
| F01 | 5 | 67.7 / 46.7 / 28.0 / 28.1 | Precisa indicar o número de paginas do relatório? | Terceiro card: 69 páginas neste relatório |
| F02 | 5 | 65.6 / 78.0 / 28.0 / 10.9 | Não entendi essa observação | Rodapé técnico sobre cubo e auditoria CSV, reforçado por retângulo vermelho |
| F03 | 9 | 72.8 / 57.3 / 29.9 / 37.5 | Será que deixar essa frase não fica muito na cara que o relatório é automático? | Ponta da seta: fonte no rodapé inferior direito, fotografia atual da API GeoBrain |
| F04 | 9 | 6.1 / 91.6 / 18.4 / 8.4 | Em nenhuma parte do slide/gráfico diz que os dados são de Gramado e Canela | Legenda geográfica sob a série: 2 municípios, contornada em vermelho |
| F05 | 10 | 33.3 / 18.5 / 26.8 / 8.5 | Qual o período?  / 3T 2026, tem que aparecer | Faixa abaixo do título da distribuição de empreendimentos por padrão |
| F06 | 11 | 4.9 / 82.9 / 18.4 / 8.4 | Em nenhuma parte do slide/gráfico diz que os dados são de Gramado e Canela | Legenda geográfica sob a série: 2 municípios, contornada em vermelho |
| F07 | 11 | 4.9 / 92.0 / 18.8 / 2.9 | Vale para outros gráficos | Extensão do pedido de identidade geográfica aos demais gráficos |
| F08 | 13 | 33.3 / 18.5 / 26.8 / 8.5 | Qual o período?  / 3T 2026, tem que aparecer | Faixa abaixo do título de unidades lançadas por padrão |
| F09 | 16 | 18.5 / 57.4 / 38.4 / 32.9 | Se nunca lançou MCMV, não precisa acumular em 12 meses | Página MCMV acumulado de lançamentos, série MCMV zerada |
| F10 | 17 | 33.3 / 18.5 / 26.8 / 8.5 | Qual o período?  / 3T 2026, tem que aparecer | Faixa abaixo do título de unidades lançadas por tipologia |
| F11 | 18 | 18.5 / 57.4 / 38.4 / 32.9 | Como tem pouco lançamento, não precisa desse slide | Página da distribuição de lançamentos por bairro e cidade |
| F12 | 19 | 3.9 / 6.4 / 42.9 / 6.4 | VGL – Valor Geral Lançado | Primeira linha do título monetário, não números da série |
| F13 | 20 | 33.3 / 18.2 / 26.8 / 8.5 | Qual o período?  / 3T 2026, tem que aparecer | Faixa sob título de valor lançado por padrão |
| F14 | 20 | 3.9 / 6.4 / 42.9 / 6.4 | VGL – Valor Geral Lançado | Primeira linha do título monetário |
| F15 | 21 | 3.9 / 6.4 / 42.9 / 6.4 | VGL – Valor Geral Lançado | Primeira linha do título monetário acumulado |
| F16 | 24 | 33.3 / 18.2 / 26.8 / 8.5 | Qual o período?  / 3T 2026, tem que aparecer | Faixa sob título de vendas por padrão |
| F17 | 24 | 13.0 / 87.3 / 34.0 / 8.5 | Se aqui é -7 a barra deveria estar para o outro lado e vermelha | Barra Alto, valor −7, participação −4,8%, marcada em vermelho |
| F18 | 27 | 16.6 / 40.8 / 41.0 / 40.3 | Se não tem lançamentos MCMV, não vai ter vendas e não precisa acumular vendas | Página MCMV acumulado de vendas, série MCMV zerada |
| F19 | 28 | 38.4 / 17.7 / 26.8 / 8.5 | Qual o período?  / 3T 2026, tem que aparecer | Faixa sob título de vendas por tipologia |
| F20 | 29 | 45.2 / 13.2 / 28.2 / 22.7 | Essa indicação do trimestre tem que aparecer nos outros slides | Seta à esquerda para POR CIDADE · 3T 2026, exemplo de competência a repetir |
| F21 | 30 | 3.9 / 6.4 / 42.9 / 6.4 | VGV – Valor Geral Vendido | Primeira linha do título monetário de vendas |
| F22 | 31 | 3.9 / 6.4 / 42.9 / 6.4 | VGV – Valor Geral Vendido | Primeira linha do título monetário de vendas acumuladas |
| F23 | 34 | 80.3 / 71.4 / 15.5 / 17.7 | Faltou a média | Última célula total da disponibilidade, traço circulado |
| F24 | 34 | 78.9 / 24.6 / 15.5 / 8.0 | Padronizar | Região superior direita da tabela/cabeçalho, pedido genérico de padronização |
| F25 | 34 | 78.9 / 36.2 / 15.5 / 8.0 | Disponibilidade s/ O.L. | Cabeçalho da última coluna: disponibilidade s/ O.L. |
| F26 | 35 | 82.9 / 76.7 / 15.5 / 17.7 | Faltou a média | Última célula total da disponibilidade, traço circulado |
| F27 | 38 | 73.3 / 68.9 / 22.7 / 16.1 | No slide anterior a média é 9.5% | Total IVV 8,5%, contornado, comparado ao 9,5% da página anterior |
| F28 | 51 | 35.1 / 42.7 / 29.8 / 18.2 | Aumentar a fonte da tabela de dados | Corpo da matriz metragem × tipologia |
| F29 | 51 | 6.4 / 14.6 / 29.8 / 8.8 | Subtítulo indicando que é de Gramado e Canela – 3T 2026 | Alinhamento esquerdo abaixo do título e antes da tabela |
| F30 | 52 | 6.1 / 22.0 / 29.8 / 8.8 | Subtítulo indicando que é de Gramado e Canela – 3T 2026 | Alinhamento esquerdo abaixo do título e antes da tabela |
| F31 | 52 | 39.3 / 79.5 / 38.0 / 17.6 | Preços muito baixos, seriam compatíveis com padrão econômico, que não existe na cidade | Mínimos de R$/m² (três primeiras tipologias) e área mínima de 50 m², marcados em vermelho |
| F32 | 53 | 6.1 / 22.0 / 29.8 / 8.8 | Subtítulo indicando que é de Gramado e Canela – 3T 2026 | Alinhamento esquerdo abaixo do título e antes da tabela |
| F33 | 53 | 33.0 / 47.2 / 29.8 / 18.2 | Aumentar a fonte da tabela de dados | Corpo da matriz de maturidade por tipologia |
| F34 | 54 | 6.1 / 22.0 / 29.8 / 8.8 | Subtítulo indicando que é de Gramado e Canela – 3T 2026 | Alinhamento esquerdo abaixo do título e antes da tabela |
| F35 | 54 | 33.0 / 47.2 / 29.8 / 18.2 | Aumentar a fonte da tabela de dados | Corpo da matriz de maturidade por padrão |
| F36 | 55 | 65.7 / 25.1 / 10.6 / 8.3 | VGL | Cabeçalho monetário de lançado, à direita |
| F37 | 55 | 86.8 / 25.3 / 10.6 / 8.3 | VGV | Cabeçalho monetário de vendido, extremo direito |
| F38 | 57 | 6.1 / 22.1 / 29.8 / 8.8 | Subtítulo indicando que é de Gramado e Canela – 3T 2026 | Alinhamento esquerdo abaixo do título e antes da tabela |
| F39 | 58 | 6.1 / 22.0 / 29.8 / 8.8 | Subtítulo indicando que é de Gramado e Canela – 3T 2026 | Alinhamento esquerdo abaixo do título e antes da tabela |
| F40 | 58 | 83.3 / 72.3 / 9.8 / 8.8 | média | Última célula do total da disponibilidade por ano, traço circulado |
| F41 | 59 | 6.1 / 22.0 / 29.8 / 8.8 | Subtítulo indicando que é de Gramado e Canela – 3T 2026 | Alinhamento esquerdo abaixo do título e antes da tabela |
| F42 | 60 | 6.1 / 22.0 / 29.8 / 8.8 | Subtítulo indicando que é de Gramado e Canela – 3T 2026 | Alinhamento esquerdo abaixo do título e antes da tabela |
| F43 | 61 | 22.7 / 17.4 / 28.9 / 23.8 | Tá certo aparecer esse empreendimento bem longe de Canela e Gramado? | Ponta da seta à esquerda: marcador isolado ao noroeste, mapa por padrão |
| F44 | 62 | 22.7 / 17.4 / 28.9 / 23.8 | Tá certo aparecer esse empreendimento bem longe de Canela e Gramado? | Ponta da seta à esquerda: mesmo marcador isolado, mapa por estoque |
| F45 | 63 | 22.7 / 17.4 / 28.9 / 23.8 | Tá certo aparecer esse empreendimento bem longe de Canela e Gramado? | Ponta da seta à esquerda: mesmo marcador isolado, mapa por R$/m² |
| F46 | 68 | 32.1 / 23.7 / 41.7 / 46.9 | Esse slide do documentário já saiu do material institucional | Lâmina institucional do documentário inteira |

**Marcações vermelhas sem texto (11):** slide 5 rodapé; slides 9/11 rótulo de municípios; slide 24 barra negativa; slides 34/35 total de disponibilidade; slide 37 primeiros dois pontos do IVV; slide 38 total do IVV; slide 52 área mínima e três mínimos de preço/m²; slide 58 total de disponibilidade. Todas associadas acima, incluindo a única página sem caixa amarela (37).

## Referências territoriais recebidas em 05/11/2026

### Proveniência e limites

[Pasta enviada por Gabriel](https://drive.google.com/drive/folders/1PKZkDP2NeXGNbqXjxYlbZe9g2RB8QZyp): 17 arquivos diretos, todos baixados e conferidos: 15 PNG e dois PDFs, Lajeado/Vale do Taquari (72 páginas) e RM de Porto Alegre (75 páginas), ambos4T2025. Originais, hashes, inventário, textos por página e pranchas de todas as páginas em `.local-inputs/finoti-comparativos-2026-11-05/manifest.json` e pasta correspondente. Numeração abaixo é a página física do PDF recebido; nomes PNG não são números garantidos do manifesto atual. Inspeção visual de todas as imagens e de todas as páginas em pranchas; não é auditoria numérica da origem nem validação do recorte3T2026.

E-mails reproduzidos por Gabriel e capturas anexas são a origem das decisões: (1) Finoti aceita ajustes anteriores e pede cidades separadas em gráficos e algumas tabelas, depois envia exemplos; (2) Teresa05/11às14h29 confirma separar poucas cidades e agrupar regiões metropolitanas; (3) Teresaàs14h31 exemplifica Lajeado versus Vale do Taquari e RM agrupada. Limite de três unidades comparativas e configuração de grupos são proposta de Gabriel, ainda sem contrato implementado. Sem leitura adicional da caixa de e-mail ou envio externo.

### Inventário completo das 15 imagens de Finoti

| Arquivo | Conteúdo e implicação |
|---|---|
| image.png | Empreendimentos verticais trimestrais: Gramado/Canela como duas curvas, variações identificadas por cidade e comparação semestral empilhada. |
| image (1).png | Empreendimentos em12meses: duas curvas e quadro de variações; comentário textual específico do estudo fica como acabamento do analista. |
| image (2).png | Unidades lançadas trimestrais por cidade, variações e semestre. |
| image (3).png | Unidades lançadas em12meses por cidade. |
| image (4).png | Vendas trimestrais por cidade e comparação semestral. |
| image[53].png | Vendas em12meses por cidade. |
| image (5).png | Oferta final por trimestre, duas curvas; estoque é fotografia, não somatório anual. |
| image (6).png | Oferta final por padrão: colunas Gramado/Canela e participação dentro de cada município. Faixas monetárias não se tornam contrato de classificação automaticamente. |
| image[51].png | Oferta final por tipologia: colunas Gramado/Canela e percentuais próprios. |
| image (7).png | Ticket por padrão de Gramado, com referência da média municipal. |
| image[67].png | Preço por m² por padrão com linha média. Há cores/identificação territorial visualmente ambíguas; exigir título territorial explícito em vez de inferir cidade pela cor. |
| image (8).png | Mínimo/média/máximo por tipologia de Gramado. |
| image (9).png | Mesmo quadro de Canela, em página própria. |
| image (10).png | VGV e unidades por padrão, página específica de Gramado. |
| image[27].png | VGV e unidades por padrão, página específica de Canela. |

### Referências adicionais dos dois panoramas

| Família | Lajeado/Vale do Taquari | RM Porto Alegre | Conclusão |
|---|---|---|---|
| Território | p2: Lajeado separado de Vale do Taquari (Bom Retiro do Sul, Estrela, Taquari e Teutônia) | p2/7: região como um território | Comparar unidades territoriais, que podem ser uma cidade ou um conjunto nomeado; não inferir composição regional pelo nome. |
| Lançamentos e VGL | p14/16/17/18/19/24/25: curvas Lajeado/Vale | p9/11/12/14/15/16/20/22: série regional | Substituir série única por até três séries quando solicitada comparação; consolidado continua como modo próprio. |
| Composição anual por padrão | p15 empreendimentos, p20 unidades, p26 valor lançado | p10 empreendimentos, p13 unidades, p21 valor lançado, p25 vendas | Gráficos100% empilhados são famílias novas a mapear, não apenas pintura de séries existentes. Vendas anuais são candidato adicional, não obrigação derivada dos PNG. |
| Vendas e oferta temporal | p28/31/33: duas séries | p24/26/32/33/35: regional | Comparar totais e fotografias da mesma competência; não somar preços, estoques ou taxas no tempo. |
| Preços por padrão/tipologia | p43–48 combinam consolidado e comparação, com médias próprias | p49–52 regional | Barras agrupadas e médias por território, sem média simples de médias municipais. |
| Oferta atual por ano/padrão/tipologia | p50–52: dois conjuntos de colunas | p54–56: uma região | Comparação em uma tabela, participação calculada dentro de cada território. |
| Matrizes e extremos | p53/55 Lajeado e p54/56 Vale | p57/58 regional | Algumas tabelas precisam de uma página por unidade comparada para manter legibilidade; apenas nessas famílias. |
| Maturidade/VGV | p57/58 maturidade consolidada e p59 VGV consolidado | p59–61 regional | Nem tudo é desdobrado nos próprios exemplos. Finoti pede VGV separado nos PNG; maturidade separada não é exigência confirmada. |
| Horizontal | p62/64/66 Lajeado e p63/65/67 Vale | p63–66 regional | Desdobramento territorial é também aplicável ao horizontal; preservar casas em condomínio e demais políticas homologadas. |
| Mapas e artes | Artes gerais antigas e contextualização territorial | p67–69 mapas regionais | Não substituir institucional23anos pelo22anos das referências. Mapas não exigem duplicação automática. |

### Avaliação da proposta: até três unidades comparativas

Recomendação, ainda sujeita ao contrato de execução:

1. Separar **recorte de coleta** (qualquer número de cidades autorizadas, uma UF) de **apresentação territorial** (consolidado ou comparação de até três unidades).
2. Uma cidade: relatório municipal. Duas/três: sugerir comparação por cidade, sem impedir escolher consolidado. Mais de três: manter consolidado disponível e permitir comparação por dois/três grupos nomeados; não obrigar agrupamento para conseguir gerar o relatório.
3. Cada unidade pode conter uma ou várias cidades: Lajeado sozinho versus quatro cidades do Vale, por exemplo. Para comparar, grupos devem ser não vazios, ter nomes distintos e cobrir o recorte exatamente uma vez, sem cidade duplicada ou silenciosamente descartada. Não criar grupos por proximidade/população ou inferir composição de RM.
4. Painéis temporais usam até três curvas; tabelas compactas usam blocos de colunas; matrizes extensas, extremos e VGV podem gerar até três páginas específicas da família. Não repetir todo o relatório três vezes ou comparar total com os próprios componentes como se fossem unidades independentes.
5. Consolidado e grupos partem da mesma coleta e dos mesmos contratos de cálculo. Campos de quantidade/valor somam componentes compatíveis; taxas e preços são recalculados pelos numeradores/pesos corretos. Cada grupo preserva cobertura por competência, sinais, zeros e nulos, deduplicação e controles. Soma de grupos reconcilia quantidades/valores com o consolidado; médias não somam.
6. Cache/chave do resultado, auditoria, metodologia, nomes/cores, capa e PPT/PDF precisam carregar modo e composição dos grupos. Metadados de grupos são do estudo, não classificação nova da API. Usar identificadores estáveis separados dos nomes editáveis.
7. O limite de três reduz poluição visual e eventual número de páginas, **não reduz o volume de API correspondente às cidades coletadas**. Reaproveitar respostas municipais, sem recolher as mesmas cidades por gráfico ou grupo. Medir custo de montagem/renderização antes de prometer melhora de desempenho.

### Gráficos novos e regras que não devem ser copiadas

A imagem4 de Gabriel corresponde à composição percentual anual das **unidades lançadas por padrão** (Lajeado p20). As outras duas famílias diretamente relacionadas são empreendimentos (p15) e VGL (p26); RM traz ainda vendas (p25). Recomenda-se incluir primeiro empreendimentos/unidades/VGL, usando os dados já disponíveis quando sua granularidade anual e classificação forem demonstradas. Barras100% empilhadas tornam anos discretos mais explícitos; área100% pode seguir a referência se aprovada, sem alegar observação entre anos. Ano corrente deve indicar corte real e usar comparação equivalente; ano sem cobertura não vira zero ou100%. Vendas líquidas negativas não cabem em normalização100% convencional: manter aviso/tratamento coerente, nunca ocultar sinal.

A taxonomia visual resumida (Luxo/Médio Padrão/MCMV/Compactos) precisa ser mapeada à classificação autoritativa existente, com reconciliação, antes de fundir categorias. A faixa monetária nos PDFs/PNG é referência histórica, não autorização para substituir classificações pelo preço. Não copiar manualmente números, chamar VGL de VGV sem respeitar o contratoD06, transformar maturidade em média contínua ou limitar históricos aos anos2020–2025 dos exemplos.

Há inconsistências nos próprios arquivos: Lajeado p26 tem rodapé “Até06/2025” embora a capa seja4T2025; p25 mistura valores finais407/13, textoR$720mi e variação13486%, sem reconciliação demonstrada. Esses elementos não são valores-alvo. Referências também exibem categorias vazias/preços zero; continuam valendo D01–D14 e preservação de cobertura/atividade, sem regressão ao tratamento antigo. Artes22anos/contatos antigos não substituem ativos atuais.

### O que já existe no motor e estratégia proposta

`api.ts` conserva `harvests`, cubos por cidade e `cityTemporalSources`; a coleta já é municipal. `report/model.ts` agrega grande parte em `marketBlock` e monta `cityComparisons` limitado ao fechamento (vendas, mercado e disponibilidade por padrão). `PanoramaScope` não contém grupos nem modo de comparação. Portanto, não basta trocar legenda: preservar e agregar a dimensão territorial ao longo das séries e tabelas, reutilizando os mesmos contratos, é a mudança central. A existência de dados municipais é confirmada no código, não prova cobertura integral de todos os novos indicadores/anos.

Ordem sugerida: (A) contrato de unidades/grupos e matriz de aplicabilidade por família; (B) projeções territoriais com reconciliação e cobertura, sem nova coleta quando os insumos bastarem; (C) curvas/variações e tabelas comparativas; (D) somente páginas específicas necessárias e novos gráficos anuais; (E) saídas curtas dirigidas, regressões do consolidado e uma comparação cidade versus grupo. Ainda não executar: esta rodada é leitura/análise. Próximo fechar alcance do horizontal, famílias novas e formato dos gráficos anuais no plano de implementação. O consolidado aceito continua baseline.

Estado Git: fetch05/11, origin/main cinco commits à frente da árvore local, sem commits locais exclusivos na abertura; alterações locais paralelas preservadas e nenhum merge. Sem código, testes de produto, consultaAPI Geobrain, geração real ou push nesta análise. Validação:17/17arquivos,72+75páginas e15imagens inventariados com hashes e visualizados; revisão documental não substitui ensaio da futura implementação.
