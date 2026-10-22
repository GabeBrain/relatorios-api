# Relatório API Excel

Rota: `/rebrain/relatorio-api-excel`. Menu: **Relatórios Automatizados → Relatório API Excel**.

## Coleta completa antes das regras

Implementação exclusiva em `src/features/relatorio-api-excel/` e `src/pages/RelatorioApiExcel.tsx`. AELO e Dashboard GeoBrain não são alterados. A consulta usa o contrato copiado do Dashboard, acrescentando Hotel somente neste relatório e mantendo os objetos brutos para não perder campos e nulos na normalização:

- GeoApiScopeSelector + useGeoApiScope: catálogo paginado `/monitored-cities`, sem fallback IBGE. Escopo por município, UF ou UFs da região, sempre autorizado pelo token. Não existe whitelist de cidades AELO nem filtro de padrões de loteamento.
- POST `/public-api/v2/building-with-history-internal`, parâmetros na query string e token Bearer. Município tem precedência sobre UF. Comercial, Horizontal, Vertical e Hotel consultados sequencialmente, sem parâmetro de status ou período.
- Páginas de 100 registros; primeira página determina `meta.last_page`; demais páginas em lotes de até cinco simultâneas; timeout de 60 segundos. Não há consulta de detalhes adicional nem deduplicação por `building_id`.
- A coleta só é publicada para a tela ao final de todas as respostas. Falha HTTP, payload inválido, paginação inválida ou cancelamento não libera resultado parcial; nova coleta remove o resultado anterior. Troca de token aborta coleta e limpa os dados.
- Datas, status, visão, cálculo monetário e seleção de colunas são filtros locais habilitados após a coleta completa. Não disparam nova consulta. Selecionar outro escopo invalida os dados anteriores.

## Visão, datas e agregação

Padrão **Mensal** (`jan/2026`, `fev/2026`); alternativa **Trimestral** (`1T/2026`, `2T/2026`). Datas inicial e final são inclusivas e filtram a data do fechamento, não a data de lançamento do empreendimento. Os limites iniciais vêm do histórico completo. Datas no meio do mês/trimestre geram períodos parciais, informados na interface.

Somente períodos observados dentro das datas escolhidas geram colunas/linhas. Cada registro de empreendimento é preservado, agrupando seu histórico por tipologia. Vendas Brutas somam `gross_sales`; Distratos somam `distractions`; Vendas Líquidas = Vendas Brutas − Distratos. Não há fallback para `sold_in_period` nem estimativa de distratos. Vendas líquidas negativas são preservadas. Se algum fechamento do período não tem um dos campos, seu respectivo total fica vazio; a venda líquida exige ambos completos. Estoque, quantidade, preço e área usam o último fechamento de cada período. Tipologia sem fechamento no intervalo não gera linha. Não há preenchimento por carregamento de posição de meses anteriores.

Histórico de períodos anteriores ao mês/trimestre de `release_date` é desconsiderado no cálculo. Nas séries, vendas, estoque e VGV anteriores ao lançamento ficam zero; preços anteriores ao lançamento e lacunas posteriores ficam vazios. Valores ausentes não são convertidos silenciosamente em zero. Região Administrativa usa `administrative_region` ou `region` quando fornecidos pela API; sem esses campos fica vazia, sem consultar o catálogo AELO.

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

Produtos monetários são arredondados a centavos. Todos os VGV da prévia/Excel são divididos por 1.000.000 e arredondados a duas casas, como números Excel `0.00`. Preço ausente gera VGV vazio. VGV de vendas por preço do período fica vazio se alguma venda não nula/não zero não tem preço. Sem dado de vendas, fica vazio; venda explícita zero permanece zero.

VGV Vendas Brutas usa `gross_sales`; VGV Distratos usa `distractions`. No modo Valor atual, cada total é multiplicado pelo preço até o corte; em Valor do período, soma-se campo × preço de cada fechamento. VGV Vendas Líquidas = VGV Vendas Brutas − VGV Distratos, exigindo os dois valores completos e preservando negativos. Estes campos substituem o antigo VGV genérico. Gráficos históricos consomem a mesma série do motor da planilha.

## Preço Médio Empreendimento

Filtro local aplicado após a coleta completa. Três opções, com **Média simples** como padrão:

- **Média simples:** soma dos preços válidos ÷ número de tipologias com preço válido.
- **Ponderada pela quantidade:** soma de preço × `qty` ÷ soma de `qty` das tipologias com preço válido e quantidade positiva.
- **Ponderada pelo estoque:** soma de preço × `typology_stock` ÷ soma de `typology_stock` das tipologias com preço válido e estoque positivo.

Cada tipologia contribui com seu último fechamento dentro do mês/trimestre e do intervalo de datas, não com todos os fechamentos do trimestre. O cálculo é por registro de empreendimento/período e se repete nas linhas de suas tipologias com fechamento nesse período. Preços ausentes são excluídos; pesos ausentes, zero ou negativos são excluídos das opções ponderadas. Sem base válida, a média fica vazia, sem fallback para outro cálculo. Mudar o filtro recalcula a prévia e o Excel sem consultar a API.

Nos gráficos, quantidades/VGV são somados. Preço Atual e Preço m² são médias simples das posições válidas por tipologia; Preço Médio Empreendimento é a média simples das médias dos registros de empreendimento, contando cada registro uma vez por período. Não se somam preços nem se multiplicam médias pela quantidade de linhas da tipologia.

## Layout e seleção de colunas

**Valores em colunas:** uma linha por registro de empreendimento/tipologia. Colunas fixas abaixo, seguidas de 12 blocos, na ordem exata solicitada: **Vendas Brutas; Distratos; Vendas Líquidas; Estoque; Preço Atual; Preço Médio Empreendimento; Preço m²; VGV Lançado; VGV Vendas Brutas; VGV Distratos; VGV Vendas Líquidas; VGV Estoque**. Cada bloco contém os períodos cronológicos. Ex.: `Vendas Brutas jan/2026`, `Vendas Brutas fev/2026`, `Distratos jan/2026`, `Distratos fev/2026`, etc.

| Faixa fixa | Colunas |
|---|---|
| A–D | ID Empreendimento; ID Tipologia; Status Empreendimento; Status Tipologia |
| E–I | Região Administrativa; Cidade/UF; Tipo; Tempo de Vendas; Empreendimentos |
| J–O | Taxa Administrativa; Bairro; Endereço; Número; Urbanizadora; Oferta por Lotes |
| P–U | Lançamento; Ano; Entrega; Entrada; Nº de Parcelas; Valor da parcela |
| V–Z | % de Juros Mensal; Indíce de Juros; Desconto à Vista; m2 Priv.; m² Lançado |

**Tabular — períodos em linhas:** repete os dados fixos por período, acrescenta `Período` e as mesmas 12 métricas na mesma ordem. Uma linha por registro de empreendimento/tipologia/período. Os dois layouts vêm da mesma série e têm valores idênticos para a mesma tipologia/período.

Seleção individual das colunas reais do layout, com busca, selecionar todas e limpar. A ordem canônica é preservada. Trocar visão ou layout seleciona todas as colunas da nova estrutura. Nenhuma coluna extra é inserida no arquivo além das escolhidas. A prévia mostra as mesmas colunas e valores; paginação de 100 linhas afeta só a tela, nunca limita a exportação.

Ordenação: ativos primeiro, lançamento crescente, nome, ID tipologia e períodos cronológicos dentro da tipologia. Registros repetidos da API são mantidos. IDs são texto para preservar identificação. Entrada, juros mensal e desconto são números divididos por 100, formato `0.00%` (8,5 → 8,50%). Datas válidas são texto `dd/mm/aaaa`. Ausências ficam vazias. m² Lançado é área privativa × quantidade da posição final. Sem fórmulas Excel: valores calculados no aplicativo.

Uma aba `RELATÓRIO API EXCEL`, autofiltro e arquivo `Relatorio_API_Excel_<escopo>_<início>_<fim>_<Mensal-ou-Trimestral>_<Tabular-ou-Colunas>.xlsx`. Sem dados, sem colunas ou acima dos limites do Excel (16.384 colunas / 1.048.576 linhas incluindo cabeçalho), exportação bloqueada com orientação.

## Validação local

Testes do coletor cobrem contrato copiado, registros repetidos, escopos, falha de página, payload inválido, cancelamento e espera pela última resposta. Testes do motor cobrem os dois modos monetários e temporais, datas inclusivas, lacunas, status, seleção e ambos os layouts; Excel gravado em memória e reaberto para conferir cabeçalhos, células numéricas e formatos. Sem comprovação de API autenticada em produção nesta sessão. Exemplos de teste usam dados fictícios, não dados do cliente.
