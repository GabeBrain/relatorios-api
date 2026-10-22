# Relatório API Excel

Rota: `/rebrain/relatorio-api-excel`. Menu: **Relatórios Automatizados → Relatório API Excel**.

## Coleta completa antes das regras

Implementação exclusiva em `src/features/relatorio-api-excel/` e `src/pages/RelatorioApiExcel.tsx`. AELO e Dashboard GeoBrain não são alterados. A consulta copia o contrato vigente do Dashboard, mantendo os objetos brutos para não perder campos e nulos na normalização:

- GeoApiScopeSelector + useGeoApiScope: catálogo paginado `/monitored-cities`, sem fallback IBGE. Escopo por município, UF ou UFs da região, sempre autorizado pelo token. Não existe whitelist de cidades AELO nem filtro de padrões de loteamento.
- POST `/public-api/v2/building-with-history-internal`, parâmetros na query string e token Bearer. Município tem precedência sobre UF. Comercial, Horizontal e Vertical consultados sequencialmente, sem parâmetro de status ou período.
- Páginas de 100 registros; primeira página determina `meta.last_page`; demais páginas em lotes de até cinco simultâneas; timeout de 60 segundos. Não há consulta de detalhes adicional nem deduplicação por `building_id`.
- A coleta só é publicada para a tela ao final de todas as respostas. Falha HTTP, payload inválido, paginação inválida ou cancelamento não libera resultado parcial; nova coleta remove o resultado anterior. Troca de token aborta coleta e limpa os dados.
- Datas, status, visão, cálculo monetário e seleção de colunas são filtros locais habilitados após a coleta completa. Não disparam nova consulta. Selecionar outro escopo invalida os dados anteriores.

## Visão, datas e agregação

Padrão **Mensal** (`jan/2026`, `fev/2026`); alternativa **Trimestral** (`1T/2026`, `2T/2026`). Datas inicial e final são inclusivas e filtram a data do fechamento, não a data de lançamento do empreendimento. Os limites iniciais vêm do histórico completo. Datas no meio do mês/trimestre geram períodos parciais, informados na interface.

Somente períodos observados dentro das datas escolhidas geram colunas/linhas. Cada registro de empreendimento é preservado, agrupando seu histórico por tipologia. Vendas somam `sold_in_period`; estoque, quantidade, preço e área usam o último fechamento de cada período. Tipologia sem fechamento no intervalo não gera linha. Não há preenchimento por carregamento de posição de meses anteriores.

Histórico de períodos anteriores ao mês/trimestre de `release_date` é desconsiderado no cálculo. Nas séries, os períodos anteriores ao lançamento ficam zero; lacunas após o lançamento ficam vazias. Valores ausentes não são convertidos silenciosamente em zero. Região Administrativa usa `administrative_region` ou `region` quando fornecidos pela API; sem esses campos fica vazia, sem consultar o catálogo AELO.

## Valores monetários

O preço atual é `price` do último fechamento da tipologia até a data final selecionada. É o mesmo conceito da cópia inicial, agora com corte diário inclusivo. Não usa fechamentos posteriores ao corte nem `release_price`.

| Métrica histórica | Valor atual (padrão) | Valor do período |
|---|---|---|
| VGV Lançado | `qty` do último fechamento do período × preço atual | `qty` × `price` do último fechamento do período |
| VGV Estoque | estoque do último fechamento do período × preço atual | estoque × preço do último fechamento do período |
| VGV de vendas | soma das vendas do período × preço atual | soma de `sold_in_period × price` de cada fechamento do período |

**Decisão do usuário:** VGV Lançado em Valor do período é uma série histórica de quantidade daquele período × preço daquele período. No trimestre, quantidade e preço são posições do último fechamento, não somas dos meses. Não representa somente novos lançamentos e não deve ser somado ao longo do tempo como fluxo.

A coluna fixa VGV Lançado do layout em colunas mantém o resumo da última posição até a data final (quantidade do último fechamento, fallback para o primeiro, × preço até o corte). A série dinâmica tem uma coluna por período. No tabular, VGV Lançado é somente o valor do período da linha, sem coluna duplicada de resumo.

Produtos monetários são arredondados a centavos. Todos os VGV da prévia/Excel são divididos por 1.000.000 e arredondados a duas casas, como números Excel `0.00`. Preço ausente gera VGV vazio. VGV de vendas por preço do período fica vazio se alguma venda não nula/não zero não tem preço. Sem dado de vendas, fica vazio; venda explícita zero permanece zero.

**Ressalva herdada:** “Vendas líquidas” é o rótulo da coluna, mas contém vendas **brutas** da API. Não há distratos reais para desconto. Gráficos históricos agora consomem a mesma série do motor da planilha e respeitam o modo monetário selecionado.

## Layout e seleção de colunas

**Valores em colunas:** uma linha por registro de empreendimento/tipologia. Colunas fixas abaixo, seguidas de cinco blocos cronológicos: Estoque, Vendas líquidas, VGV, VGV Estoque e VGV Lançado. Ex.: `VGV Lançado mar/2026` ou `VGV Lançado 1T/2026`.

| Faixa fixa | Colunas |
|---|---|
| A–D | ID Empreendimento; ID Tipologia; Status Empreendimento; Status Tipologia |
| E–I | Região Administrativa; Cidade/UF; Tipo; Tempo de Vendas; Empreendimentos |
| J–O | Taxa Administrativa; Bairro; Endereço; Número; Urbanizadora; Oferta por Lotes |
| P–U | Lançamento; Ano; Entrega; Entrada; Nº de Parcelas; Valor da parcela |
| V–AC | % de Juros Mensal; Indíce de Juros; Desconto à Vista; Valor m2 Priv.; Preço atual; m2 Priv.; VGV Lançado; m² Lançado |

**Tabular — períodos em linhas:** repete os dados fixos por período, exclui o resumo fixo VGV Lançado, acrescenta `Período`, `Estoque`, `Vendas líquidas`, `VGV`, `VGV Estoque` e `VGV Lançado`. Uma linha por registro de empreendimento/tipologia/período.

Seleção individual das colunas reais do layout, com busca, selecionar todas e limpar. A ordem canônica é preservada. Trocar visão ou layout seleciona todas as colunas da nova estrutura. Nenhuma coluna extra é inserida no arquivo além das escolhidas. A prévia mostra as mesmas colunas e valores; paginação de 100 linhas afeta só a tela, nunca limita a exportação.

Ordenação: ativos primeiro, lançamento crescente, nome, ID tipologia e períodos cronológicos dentro da tipologia. Registros repetidos da API são mantidos. IDs são texto para preservar identificação. Entrada, juros mensal e desconto são números divididos por 100, formato `0.00%` (8,5 → 8,50%). Datas válidas são texto `dd/mm/aaaa`. Ausências ficam vazias. m² Lançado é área privativa × quantidade da posição final. Sem fórmulas Excel: valores calculados no aplicativo.

Uma aba `RELATÓRIO API EXCEL`, autofiltro e arquivo `Relatorio_API_Excel_<escopo>_<início>_<fim>_<Mensal-ou-Trimestral>_<Tabular-ou-Colunas>.xlsx`. Sem dados, sem colunas ou acima dos limites do Excel (16.384 colunas / 1.048.576 linhas incluindo cabeçalho), exportação bloqueada com orientação.

## Validação local

Testes do coletor cobrem contrato copiado, registros repetidos, escopos, falha de página, payload inválido, cancelamento e espera pela última resposta. Testes do motor cobrem os dois modos monetários e temporais, datas inclusivas, lacunas, status, seleção e ambos os layouts; Excel gravado em memória e reaberto para conferir cabeçalhos, células numéricas e formatos. Sem comprovação de API autenticada em produção nesta sessão. Exemplos de teste usam dados fictícios, não dados do cliente.
