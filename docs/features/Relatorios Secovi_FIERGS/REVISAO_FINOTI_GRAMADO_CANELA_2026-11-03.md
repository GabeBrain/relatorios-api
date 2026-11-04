# Revisão Finoti — Gramado e Canela — 03/11/2026

**Propósito:** fonte única do levantamento visual dos pedidos do consultor; separar regras do gerador, investigação numérica e escolhas editoriais antes do plano de implementação.
**Estado:** levantamento realizado; Gabriel confirmou a omissão com cobertura completa/atividade zerada, a retirada apenas de séries inteiramente zeradas quando houver atividade e a omissão somente de comparativos sem atividade ou sem cobertura suficiente. As outras oito escolhas originais continuam abertas. Nenhuma correção de produto executada ou homologação nova declarada. O aceite anterior de Juliana permanece restrito ao seu escopo.

## Origem e método

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

**Recomendação, pendente de Gabriel:** retirar contagem de páginas e jargão de implementação do material; preservar fonte discreta e informações necessárias de universo/competência. Regras, cobertura e rastreabilidade ficam em Metodologia, Avisos e Auditoria. Retirar um card exige reequilibrar a composição, sem deixar um vazio no slide.

### 3. Páginas de MCMV sem atividade — decisão editorial com guarda de cobertura

**Slides 16 e 27:** caixas centrais cobrem gráficos MCMV acumulados em 12 meses. Textos: “Se nunca lançou MCMV, não precisa acumular em 12 meses” e “Se não tem lançamentos MCMV, não vai ter vendas e não precisa acumular vendas”. No material, a série MCMV fica em zero, mas há uma série cinza dos demais padrões, com valores.

**Decisão de Gabriel em 03/11:** omitir quando houver cobertura completa e a atividade pertinente à página estiver inteiramente zerada. Quando houver atividade, retirar do gráfico apenas séries/categorias comprovadamente zeradas em todo o trecho pertinente; preservar zeros pontuais dentro de séries com atividade. Registrar omissões nos avisos/manifesto, preservando os dados e a auditoria. Não inferir ausência de vendas a partir de ausência de lançamentos: estoque antigo pode vender. Não confundir dado ausente com zero, nem ocultar vendas negativas. A permanência da série dos demais padrões não obriga manter uma página cujo assunto é MCMV.

**Esclarecimento confirmado por Gabriel em 03/11:** retirar apenas comparações sem atividade: omitir quando ambos os lados forem zero ou faltar cobertura; manter comparações válidas. A regra vale para os comparativos do modelo, sem remoção geral das comparações anuais. Um lado zero e outro com atividade não equivale a comparação toda zerada; preservar valores/sinal, sem fabricar variação percentual quando a base zero a torna indefinida. Ausência de cobertura não vira zero. Omissões continuam rastreáveis nos avisos/auditoria.

### 4. Distribuição geográfica pouco informativa — decisão editorial

**Slide 18:** caixa central sobre `UNIDADES VERTICAIS LANÇADAS POR BAIRRO E CIDADE`: “Como tem pouco lançamento, não precisa desse slide”. O exemplo mostra Floresta–Gramado com 100% e Gramado com 100%, Canela com 0%. Slide 10 informa um empreendimento lançado.

**Pendente:** decidir entre omissão por único empreendimento lançado, por única categoria geográfica ativa, ou ajuste manual do analista. “Pouco lançamento” não define um limite universal em unidades. Não inventar um corte como 100 unidades ou três empreendimentos. Se automatizada, a regra usa todo o universo pertinente, não o número de barras após truncamento.

### 5. VGL e VGV — nomenclatura, sem alteração numérica automática

**Slides 19–21:** caixas sobre a primeira linha do título: `VGL – Valor Geral Lançado`.
**Slides 30–31:** mesma posição: `VGV – Valor Geral Vendido`.
**Slide 55:** caixas separadas sobre os cabeçalhos monetários de lançamento e vendido, à direita: `VGL` e `VGV`. A coluna intermediária do valor da oferta final não recebe caixa.

**Recomendação, pendente:** nomenclatura uniforme VGL para lançado, VGV para vendido, nome explícito para valor da oferta final. Auditar a base de cada coluna antes de apenas trocar sigla, especialmente o caráter histórico, da janela ou do fechamento; nome não valida fórmula. Glossário/Fórmulas devem acompanhar a decisão.

### 6. Barra de venda negativa — correção objetiva

**Slide 24:** caixa inferior e contorno vermelho na última barra, padrão Alto: `−7`, participação `−4,8%`. Pedido explícito: “Se aqui é -7 a barra deveria estar para o outro lado e vermelha”. O número tem sinal, mas a barra verde se estende para a direita.

**Confirmado no código:** `FiergsDistributionSlide` calcula largura com `Math.abs(row.value)`; classe `is-negative` existe, mas não foi localizada regra CSS correspondente na feature. Propor eixo/linha de zero e barras divergentes com negativos à esquerda/vermelhos e positivos à direita. Preservar venda líquida e total algébrico, sem converter distrato em venda positiva. Conferir também os comparativos e o PPT nativo, que têm renderizadores diferentes.

### 7. Total da disponibilidade (“média”) — metodologia, não preenchimento cosmético

**Slide 34:** `OFERTA LANÇADA E FINAL | POR TIPOLOGIA`; três caixas à direita: `Padronizar`, `Disponibilidade s/ O.L.` sobre o cabeçalho da última coluna, e `Faltou a média` abaixo da célula total circulada que contém um traço.
**Slide 35:** mesmo pedido e círculo na célula total da disponibilidade, agora por padrão.
**Slide 58:** caixa `média` abaixo do traço na última célula do total por ano de lançamento; círculo reforça o alvo. Não se refere à média de unidades por empreendimento de outra página.

**Confirmado no código:** `OfferTableSlide` omite esse total quando há janela; linhas usam oferta histórica, enquanto oferta lançada exibida usa a janela. `CohortTableSlide` também omite o total por misturar coortes da janela e estoque antigo. No slide 58, até 2022 há 91 unidades finais e zero lançamento na janela: dividir 174 por 414 automaticamente não resolve o universo dessa linha.

**Recomendação, pendente:** disponibilidade global = soma da oferta final ÷ soma da oferta histórica compatível; conferir completude dimensional e explicitar o denominador na metodologia. Não usar média aritmética de percentuais, nem dividir estoque histórico por lançamentos da janela para preencher o traço. Confirmar intenção com Gabriel e reconciliar antes de implementar. Padronizar cabeçalho não significa suprimir a distinção histórica.

### 8. IVV divergente e início da série — investigação numérica

**Slide 38:** caixa à direita `No slide anterior a média é 9.5%` e contorno vermelho no total **8,5%** da tabela por área útil. No slide 37, o fechamento da série/comparativo mostra **9,5%**. É uma diferença real no material, não arredondamento.

**Controle aritmético confirmado:** tabela 38 mostra oferta anterior 1.647, lançamentos 70 e vendas 146; `146 ÷ (1.647 + 70) × 100 = 8,503...%`. Também `146 ÷ (1.571 + 146) × 100 = 8,503...%`. Isso demonstra coerência interna do 8,5% com os totais impressos; **não prova a causa do 9,5%** nem autoriza sobrescrevê-lo.

**Código:** série temporal deriva IVV de vendas/estoque por dimensão em `report/model.ts`; tabela por área usa tipologias do cubo em `domain/aggregations.ts`. Ambas têm identidades de base, mas origens/abrangências diferentes. Precisamos reconciliar por empreendimento, competência, classificação e cobertura. Não forçar igualdade, tirar média entre taxas ou fixar 8,5%.

**Slide 37:** retângulo vermelho sem texto cobre os primeiros dois pontos, 1,2% e 56,9%, de 1T/2T2023. Intenção não é inequívoca: pode ser questionamento dos valores ou início da série. Pergunta enviada; recomendação investigar antes de recortar dados.

### 9. Fonte pequena nas tabelas — automatizar layout

**Slides 51, 53 e 54:** caixas no centro das tabelas: “Aumentar a fonte da tabela de dados”. Referem-se à matriz de metragem × tipologia e às duas matrizes de maturidade por tipologia/padrão. Não é fonte do título ou do rodapé.

Propor tamanho mínimo legível, redução de espaços desnecessários e melhor uso da área útil; quebrar tabela em páginas com cabeçalhos repetidos quando necessário. Não encolher fonte indefinidamente para manter uma página, não cortar células/zeros e não inserir números ou colunas artificiais. Validar PDF e objetos nativos do PPT separadamente.

### 10. Preços e área mínima suspeitos — investigar, sem corte arbitrário

**Slide 52:** caixa inferior: “Preços muito baixos, seriam compatíveis com padrão econômico, que não existe na cidade”. Um retângulo vermelho cobre os mínimos de R$/m² de 1, 2 e 3 dormitórios: **4.727, 4.425, 4.149**. Outro marca **50 m²**, área mínima de dois dormitórios. A caixa de subtítulo fica sob o título, separada desse pedido numérico.

**Confirmado no código:** `FiergsTypologyPriceRangeSlide` percorre todas as tipologias verticais com preço/m² positivo; peso do estoque é usado nas médias, mas mínimo/máximo incluem entradas com oferta final nula/zero. Uma tipologia sem estoque pode determinar o extremo de uma tabela apresentada como fotografia da oferta final.

**Hipótese a testar:** mínimos baixos podem vir de tipologias sem estoque, de competência antiga ou de registros atuais realmente observados. O PPT não identifica as linhas responsáveis; não foi feita chamada API. Não afirmar erro do GeoBrain, do preço ou da classificação sem rastrear a linha. Não filtrar automaticamente um valor porque parece econômico. A marcação de 50 m² foi incluída nas perguntas para confirmar se é também alvo da investigação.

### 11. Empreendimento isolado nos mapas — investigar cadastro/geometria

**Slides 61–63:** a mesma seta aponta para o marcador isolado ao noroeste, longe do aglomerado de Canela/Gramado, perto da região de Caxias do Sul. São mapas por padrão, estoque e R$/m², cada um com 329 empreendimentos georreferenciados. Não se refere à legenda nem a um ponto aleatório no aglomerado.

Precisamos identificar o ID por coordenada/projeção e conferir município/endereço, latitude/longitude, competência e inclusão no recorte. Possíveis causas ainda não comprovadas: cadastro geográfico incorreto, inversão/conversão de coordenadas, referência municipal ou posição legítima distante. Não excluir empreendimento dos indicadores por distância, nem inventar um raio municipal. Uma eventual decisão de não exibir marcador inválido deve preservar indicadores e deixar rastro nos avisos/auditoria. Proposta enviada a Gabriel.

### 12. Documentário institucional — alteração editorial explícita

**Slide 68:** caixa grande central: “Esse slide do documentário já saiu do material institucional”. Pedido claro de retirada da lâmina de documentário do manifesto ativo. Não pede retirar todos os institucionais nem trocar a arte de 23 anos. Confirmar inventário/versão compartilhada antes de propagar a outros relatórios; alteração de manifesto repercute em sumário, navegação e nomes internos, não em dados.

## Achado adicional da revisão, não atribuído ao Finoti

**Slide 35, coluna de percentual após Nº de Empreendimentos:** 23 empreendimentos Compacto em um total de 148 correspondem a 15,5%, mas a tabela mostra 18,2%, valor de `770 ÷ 4.237` unidades lançadas. O JSX confirma que essa célula usa `row.launched / launchedTotal` em vez de participação dos empreendimentos. Trata-se de correção objetiva de denominador e semântica do cabeçalho. Antes de alterar, conferir se a contagem por padrão tem exclusividade/reconcilia com o total; preservar contratos da janela e não contar empreendimento repetido por tipologia.

## Decisões e perguntas abertas

Nove perguntas enviadas pelo formulário do chat; as recomendações abaixo são propostas, não respostas de Gabriel:

1. Slides 5/9: retirar card de páginas e jargão, mantendo fonte discreta?
2. Slide 18: omitir por único empreendimento, por única categoria geográfica ativa ou deixar ao analista?
3. Slide 52: investigar também área mínima de 50 m², além dos preços?
4. Slides 34/35/58: “média” significa disponibilidade global com bases compatíveis ou média simples?
5. **Respondida:** omitir página com cobertura completa/atividade inteiramente zerada; se houver atividade, retirar somente séries/categorias inteiramente zeradas, preservando zeros pontuais e negativos. Comparativos: omitir somente se ambos os lados forem zero ou faltar cobertura; manter os demais comparativos válidos, sem divisão por base zero.
6. Slides 19–21/30–31/55: adotar VGL lançado e VGV vendido nas gerações ou nomes por extenso/ajuste pontual?
7. Slide 37: marcação nos dois pontos iniciais pede investigação ou encurtamento da série?
8. Slides 61–63: investigar marcador e separar eventual correção cartográfica dos indicadores?
9. Slide 34: “Padronizar” refere-se à última coluna ou à tabela inteira? A caixa está próxima do cabeçalho, mas não tem seta; o alcance permanece por confirmar.

**Não dependem de opinião:** recuperar nomes das cidades e competência correta; legibilidade; representação do negativo; diferença de IVV exige diagnóstico; percentuais de empreendimentos exigem denominador coerente. **Não comprovados pelo arquivo:** causa do IVV, identidade/erro do marcador distante, origem dos preços mínimos e eventual erro cadastral na área.

## Próximo passo e limites

Incorporar respostas neste documento, fechando cada decisão antes do plano técnico. Separar implementação automática comum (identidade, layout, sinal, nomenclatura, critérios editoriais explícitos) de investigação (IVV, preço, localização, completude) e edição específica do consultor. Não iniciar coleta extensa nem gerar estudo real sem autorização. Não aplicar cortes numéricos por período/cidade, nem trocar dados para concordar com um comentário.

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
