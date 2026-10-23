# Relatório API Excel

Rota: `/rebrain/relatorio-api-excel`. Menu: **Relatórios Automatizados → Relatório API Excel**.

## Coleta completa antes das regras

Implementação exclusiva em `src/features/relatorio-api-excel/` e `src/pages/RelatorioApiExcel.tsx`. AELO e Dashboard GeoBrain não são alterados. A consulta usa o contrato copiado do Dashboard, acrescentando Hotel somente neste relatório e mantendo os objetos brutos para não perder campos e nulos na normalização:

- GeoApiScopeSelector + useGeoApiScope: catálogo paginado `/monitored-cities`, sem fallback IBGE. Escopo por município, UF ou UFs da região, sempre autorizado pelo token. Não existe whitelist de cidades AELO nem filtro de padrões de loteamento.
- POST `/public-api/v2/building-with-history-internal`, parâmetros na query string e token Bearer. Município tem precedência sobre UF. Comercial, Horizontal, Vertical e Hotel consultados sequencialmente, sem parâmetro de status ou período.
- Páginas de 100 registros; primeira página determina `meta.last_page`; demais páginas em lotes de até cinco simultâneas; timeout de 60 segundos. Não há consulta de detalhes adicional nem deduplicação por `building_id`.
- A coleta só é publicada para a tela ao final de todas as respostas, armazenando os objetos brutos. Falha HTTP, payload inválido, paginação inválida ou cancelamento não libera resultado parcial; nova coleta remove o resultado anterior. Troca de token aborta coleta e limpa os dados.
- Após a coleta, somente opções cadastrais de status/município são listadas; nenhum histórico é ordenado, agregado ou convertido em relatório automaticamente. Datas, status, município, tipos, visão, cálculo monetário e seleção de campos são rascunhos locais.
- **Gerar relatório**, à esquerda de **Baixar Excel**, é o único ponto que percorre os históricos, aplica filtros, calcula séries e expande os campos escolhidos. Baixar Excel apenas serializa o resultado já gerado. Alterar uma seleção mantém a prévia anterior identificada como antiga e desabilita o download até gerar novamente; não recalcula automaticamente. Nova coleta ou troca de escopo/token limpa o resultado anterior. Geração duplicada é bloqueada e o estado Brain informa o processamento.
- A configuração começa, nesta ordem, por **Município**, **Tipo Empreendimento** e **Status do Empreendimento**. Os três usam o mesmo combobox de múltipla escolha com busca, marcação, Selecionar todos, Limpar e resumo da seleção; permanecem abertos ao marcar/desmarcar opções. Todos os controles de configuração estão em uma única grade de três colunas no desktop e uma coluna em telas menores.
- Município filtra uma ou várias chaves `city/state` dos registros já carregados, combinadas por OU. Todos os municípios são selecionados na carga; limpar a seleção significa nenhum município, nunca todos, e bloqueia a geração até escolher uma opção. Tipo Empreendimento filtra `building_type`; Vertical, Comercial, Horizontal e Hotel permanecem disponíveis. Status filtra os valores presentes na coleta. Esses filtros não alteram a coleta nem fazem novas requisições; mudanças exigem Gerar relatório novamente. No motor puro, município omitido mantém o escopo completo, enquanto lista explicitamente vazia não retorna registros.
- Após Status do Empreendimento aparece **Padrão**, no mesmo combobox múltiplo. Opções = `data.standard` dos registros cujo `building_type` pertence aos tipos selecionados, sem percorrer históricos. O padrão cadastral é distinto da tipologia (`type_of_typology`). Inicialmente todos os padrões compatíveis participam; seleção explícita é preservada por interseção ao mudar tipos, removendo valores incompatíveis. Se essa interseção ficar vazia, geração bloqueada até selecionar um padrão, sem fallback silencioso. O motor aplica esse filtro junto com município, tipo e status somente em Gerar relatório.
- Os 11 campos de **2. Configurar relatório** têm ícone de informação ao lado da label. Tooltip abre por hover ou foco de teclado, com nome acessível próprio e texto limitado à largura da tela. Município/tipos/status/padrão explicam escopo e dependências; Visão/Layout explicam agregação e estrutura; datas explicam competências e meses completos. Cálculo monetário, Preço Médio Empreendimento e Visualização do VGV mostram a regra da opção atualmente selecionada. Ajuda não abre o seletor nem gera relatório ou consulta a API. Componentes e textos ficam locais em `ReportFieldLabel.tsx`/`field-help.ts`, reutilizando Tooltip Brain.

## Visão, datas e agregação

Padrão **Mensal** (`jan/2026`, `fev/2026`); alternativa **Trimestral** (`1T/2026`, `2T/2026`). Data inicial e Data final usam calendário de competências em pt-BR, com apenas mês/ano selecionáveis, sempre exibindo `01/mm/aaaa` e armazenando `aaaa-mm-01`. O filtro incide em `typologies_history[].period`, não em `release_date`. Ambos os meses são inclusivos: a competência final inclui todos os seus dias, inclusive fevereiro bissexto. Ex.: inicial/final `01/02/2026` inclui o fechamento `2026-02-28`, sem incluir março. No trimestral, somente os fechamentos dos meses escolhidos entram na soma/posição; trimestre pode ser parcial em meses.

Datas começam vazias; cada limite vazio é inferido do histórico e normalizado para competência somente ao clicar em Gerar relatório. Não há processamento de histórico ao abrir o calendário ou trocar mês/ano. O resumo do resultado mostra as competências em pt-BR. Os períodos gerados respeitam também município, tipo e status selecionados. O motor conserva o recorte diário para seus consumidores explícitos que não usam `periodRange: month`; a interface deste relatório sempre usa competência mensal.

Somente períodos observados dentro das datas escolhidas geram colunas/linhas. Cada registro de empreendimento é preservado, agrupando seu histórico por tipologia. Vendas Brutas somam `gross_sales`; Distratos somam `distractions`; Vendas Líquidas = Vendas Brutas − Distratos. Não há fallback para `sold_in_period` nem estimativa de distratos. Vendas líquidas negativas são preservadas. Se algum fechamento do período não tem um dos campos, seu respectivo total fica vazio; a venda líquida exige ambos completos. Estoque, quantidade, preço e área usam o último fechamento de cada período. Tipologia sem fechamento no intervalo não gera linha. Não há preenchimento por carregamento de posição de meses anteriores.

Histórico de períodos anteriores ao mês/trimestre de `release_date` é desconsiderado no cálculo. Nas séries, vendas, estoque e VGV anteriores ao lançamento ficam zero; preços anteriores ao lançamento e lacunas posteriores ficam vazios. Valores ausentes não são convertidos silenciosamente em zero. Região usa `region`, com fallback para `administrative_region`; a nova Região Administrativa usa exclusivamente `administrative_area`. Sem esses campos fica vazia, sem consultar o catálogo AELO.

## Valores monetários

O preço atual é `price` do último fechamento da tipologia até a data final selecionada. É o mesmo conceito da cópia inicial, agora com corte diário inclusivo. Não usa fechamentos posteriores ao corte nem `release_price`.

| Métrica histórica | Valor atual (padrão) | Valor do período |
|---|---|---|
| VGV Lançado | `qty` do último fechamento do período × preço atual | `qty` × `price` do último fechamento do período |
| VGV Estoque | estoque do último fechamento do período × preço atual | estoque × preço do último fechamento do período |
| VGV Vendas Brutas | soma de `gross_sales` × preço atual | soma de `gross_sales × price` de cada fechamento do período |
| VGV Distratos | soma de `distractions` × preço atual | soma de `distractions × price` de cada fechamento do período |
| VGV Vendas Líquidas | VGV Vendas Brutas − VGV Distratos | VGV Vendas Brutas − VGV Distratos |

**Decisão do usuário:** VGV Lançado em Valor do período é uma série histórica de quantidade daquele período × preço daquele período. No trimestre, quantidade e preço são posições do último fechamento, não somas dos meses. Não representa somente novos lançamentos e não deve ser somado ao longo do tempo como fluxo.

VGV Lançado, Preço Atual e Preço m² passaram a ser exclusivamente temporais nos dois layouts, sem resumo fixo duplicado. Preço Atual = `price` e Preço m² = `price_private_area` do último fechamento do período. O modo monetário controla os VGV, não substitui essas posições de preço pelo último preço global.

Produtos monetários são arredondados a centavos. Em **2. Configurar relatório**, Visualização do VGV oferece:

| Opção | Valor apresentado na prévia, gráficos e Excel |
|---|---|
| Padrão (inicial) | valor calculado, sem divisão |
| Milhar | valor calculado ÷ 1.000 |
| Milhão | valor calculado ÷ 1.000.000 |

A escala se aplica a todas as métricas cujo nome começa com VGV, inclusive líquidos negativos. Não altera preço, área, quantidade ou percentual. O motor conserva os valores calculados em reais; a conversão é única na apresentação/serialização, sem arredondar o quociente armazenado. Formatação visual de VGV/Excel `0.00` mantém duas casas para leitura. Prévia, legenda/unidade do gráfico e arquivo usam a escala da geração, não o rascunho atual: mudar a opção exige Gerar relatório novamente e bloqueia download antigo. Não faz nova consulta à API.

Preço ausente gera VGV vazio. VGV de vendas por preço do período fica vazio se alguma venda não nula/não zero não tem preço. Sem dado de vendas, fica vazio; venda explícita zero permanece zero.

VGV Vendas Brutas usa `gross_sales`; VGV Distratos usa `distractions`. No modo Valor atual, cada total é multiplicado pelo preço até o corte; em Valor do período, soma-se campo × preço de cada fechamento. VGV Vendas Líquidas = VGV Vendas Brutas − VGV Distratos, exigindo os dois valores completos e preservando negativos. Estes campos substituem o antigo VGV genérico. Gráficos históricos consomem a mesma série do motor da planilha.

## Preço Médio Empreendimento

Filtro local aplicado na geração do relatório após a coleta completa. As três opções originais incluem todas as tipologias válidas, inclusive Garden e Cobertura; **Média simples** permanece como padrão:

- **Média simples:** soma dos preços válidos ÷ número de tipologias com preço válido.
- **Ponderado pela oferta lançada:** soma de preço × `qty` ÷ soma de `qty` das tipologias com preço válido e quantidade positiva. Mesmo cálculo da opção anteriormente chamada Ponderada pela quantidade; mudou somente o rótulo.
- **Ponderada pelo estoque:** soma de preço × `typology_stock` ÷ soma de `typology_stock` das tipologias com preço válido e estoque positivo.

Três opções adicionais aplicam as mesmas fórmulas somente às tipologias cujo `type_of_typology`, normalizado por caixa, acentos e espaços externos, seja **Padrão/Padrao**:

- Média simples (somente tip. Padrão).
- Ponderado pela oferta lançada (somente tip. Padrão).
- Ponderada pelo estoque (somente tip. Padrão).

O filtro adicional restringe apenas a composição do Preço Médio Empreendimento: linhas de Garden, Cobertura e demais tipologias continuam no relatório e recebem a média do empreendimento. Tipologia ausente não é presumida como Padrão; se não houver tipologia Padrão com dados/pesos válidos, a média fica vazia. Nenhum fallback para Garden/Cobertura ou média geral. Isso não altera os VGV nem os outros preços das linhas.

Cada tipologia contribui com seu último fechamento dentro do mês/trimestre e do intervalo de datas, não com todos os fechamentos do trimestre. O cálculo é por registro de empreendimento/período e se repete nas linhas de suas tipologias com fechamento nesse período. Preços ausentes são excluídos; pesos ausentes, zero ou negativos são excluídos das opções ponderadas. Sem base válida, a média fica vazia, sem fallback para outro cálculo. Mudar o filtro apenas altera o rascunho e bloqueia download; Gerar relatório recalcula a prévia e o Excel sem consultar a API.

### AELO: conferência informativa de 23/10/2026, sem alteração

Endpoint de dados confirmado por leitura de `RelatorioAelo.tsx`: **POST `https://app.geobrain.com.br/public-api/v2/building-with-history-internal`**, com token Bearer e corpo JSON contendo `type: Horizontal`, `uf`, `status`, `per_page: 100` e `page`. A prévia coleta as páginas; Buscar empreendimentos reaproveita `preview.records`. Há helpers de detalhe `/<building_id>` definidos no arquivo, mas o fluxo atual de Buscar não os chama. O catálogo do seletor geográfico usa separadamente GET `https://geobrain.com.br/public-api/monitored-cities`, paginando links.next. Nenhuma requisição real ou alteração do AELO foi feita para esta conferência.

O AELO continua usando a implementação de `RelatorioAelo.tsx` e `aggregateTypologyHistoryByQuarter`:

- Vendas: soma `sold_in_period` dos fechamentos da tipologia no trimestre; não usa `gross_sales`.
- Distratos estimados por intervalo: `estoque atual − estoque anterior + sold_in_period`, somados no trimestre. Se falta estoque anterior/atual ou venda, ou se a estimativa fica negativa em algum intervalo, o total estimado do trimestre fica vazio. Não usa `distractions` nem corta estimativas negativas para zero.
- A coluna chamada Vendas líquidas recebe a mesma soma de `sold_in_period`; não subtrai os distratos estimados. Antes do trimestre de lançamento, séries de vendas/estoque/VGV ficam zero.
- VGV Distratos e Vendas Líquidas monetárias internos ficam nulos porque `vgvDistratos` é fixado em null. Essa lógica não foi migrada para o Relatório API Excel, que preserva as regras reais de gross_sales/distractions já definidas pelo usuário. Nenhum arquivo do AELO ou da agregação compartilhada foi modificado.

Nos gráficos, quantidades/VGV são somados. Preço Atual e Preço m² são médias simples das posições válidas por tipologia; Preço Médio Empreendimento é a média simples das médias dos registros de empreendimento, contando cada registro uma vez por período. Não se somam preços nem se multiplicam médias pela quantidade de linhas da tipologia.

## Layout e seleção de colunas

**Valores em colunas:** uma linha por registro de empreendimento/tipologia. Colunas fixas abaixo, seguidas de 12 blocos, na ordem exata solicitada: **Vendas Brutas; Distratos; Vendas Líquidas; Estoque; Preço Atual; Preço Médio Empreendimento; Preço m²; VGV Lançado; VGV Vendas Brutas; VGV Distratos; VGV Vendas Líquidas; VGV Estoque**. Cada bloco contém os períodos cronológicos. Ex.: `Vendas Brutas jan/2026`, `Vendas Brutas fev/2026`, `Distratos jan/2026`, `Distratos fev/2026`, etc.

| Grupo fixo | Colunas em ordem |
|---|---|
| Identificação | ID Empreendimento; ID Tipologia; Status Empreendimento; Status Tipologia |
| Localização e produto | Região; Região Administrativa; Cidade/UF; Tipo; Padrão; Tipologia |
| Lançamento | Preço de Lançamento; M² Lançado; R$/m² Lançado |
| Cadastro | Tempo de Vendas; Empreendimentos; Taxa Administrativa; Bairro; Endereço; Número; Incorporadoras; Unidades por Tipologia |
| Datas e características | Data de Lançamento; Ano; Data de Entrega; Quartos; Garagem |
| Condições | Entrada; Nº de Parcelas; Valor da parcela; % de Juros Mensal; Indíce de Juros; Desconto à Vista; m2 Priv. |

Incorporadoras concatena todos os nomes válidos de `incorporators[]` com vírgula e espaço. Tipo = `building_type`; Padrão = `standard`; Tipologia = `type_of_typology` da última posição da tipologia até o corte. Unidades por Tipologia = `qty`; Quartos = `number_bedroom`; Garagem = `garage` da mesma posição (zero preservado).

Preço de Lançamento usa `price` do histórico da própria tipologia cuja **data exata** de `period` coincide com `release_date`, normalizando ISO ou `dd/mm/aaaa` para data; não procura o mês/trimestre mais próximo nem usa `release_price`. O histórico anterior à data inicial de vendas continua disponível para essa identificação, respeitando o corte final. Sem correspondência exata, fica vazio. R$/m² Lançado = esse preço ÷ `private_area` do mesmo registro de lançamento; área ausente/não positiva gera vazio. M² Lançado mantém o cálculo cadastral de `qty × private_area` da última posição até o corte, agora movido para depois de Preço de Lançamento; valores ausentes geram vazio, zero explícito é preservado.

**Tabular — períodos em linhas:** repete os dados fixos por período, acrescenta `Período` e as mesmas 12 métricas na mesma ordem. Uma linha por registro de empreendimento/tipologia/período. Os dois layouts vêm da mesma série e têm valores idênticos para a mesma tipologia/período.

Seleção por **nome do campo**, com busca, selecionar todas e limpar: Vendas Líquidas, Estoque, Distratos etc. A seleção nunca lista nomes com mês/trimestre. Na geração horizontal, cada métrica escolhida expande todos os períodos do recorte, na ordem canônica; no tabular, gera uma coluna por métrica. Período aparece na seleção somente no tabular. Trocar visão ou layout preserva a seleção e exige nova geração. Nenhuma coluna extra é inserida no arquivo além das escolhidas/expandidas. A prévia mostra as mesmas colunas e valores do resultado gerado; paginação de 100 linhas afeta só a tela, nunca limita a exportação.

Ordenação: ativos primeiro, lançamento crescente, nome, ID tipologia e períodos cronológicos dentro da tipologia. Registros repetidos da API são mantidos. IDs são texto para preservar identificação. Entrada, juros mensal e desconto são números divididos por 100, formato `0.00%` (8,5 → 8,50%). Datas válidas são texto `dd/mm/aaaa`. Ausências ficam vazias. Sem fórmulas Excel: valores calculados no aplicativo.

Uma aba `RELATÓRIO API EXCEL`, autofiltro e arquivo `Relatorio_API_Excel_<escopo>_<início>_<fim>_<Mensal-ou-Trimestral>_<Tabular-ou-Colunas>.xlsx`. Sem dados, sem colunas ou acima dos limites do Excel (16.384 colunas / 1.048.576 linhas incluindo cabeçalho), exportação bloqueada com orientação.

## Validação local

Testes do coletor cobrem contrato copiado, registros repetidos, escopos, falha de página, payload inválido, cancelamento e espera pela última resposta. Testes do motor cobrem os dois modos monetários e temporais, datas inclusivas, lacunas, status, seleção e ambos os layouts; Excel gravado em memória e reaberto para conferir cabeçalhos, células numéricas e formatos. Sem comprovação de API autenticada em produção nesta sessão. Exemplos de teste usam dados fictícios, não dados do cliente.
