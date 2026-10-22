# Relatório API Excel

Rota: `/rebrain/relatorio-api-excel`. Menu: **Relatórios Automatizados → Relatório API Excel**.

Cópia independente de `src/pages/RelatorioAelo.tsx`, preservando filtros, prévia, coleta, cancelamento, tabelas, gráficos e exportação. Compartilha o catálogo AELO e a agregação trimestral existente. O AELO original permanece intacto.

## Escopo

Token GeoBrain e seletor GeoApiScopeEngine; consulta POST paginada em `/public-api/v2/building-with-history-internal`, por UF e status (Ativo/Esgotado), tipo Horizontal. Filtra localmente padrões Loteamento Aberto/Fechado, catálogo de municípios AELO e município escolhido (opcional). Exige histórico no intervalo selecionado. Cada linha corresponde a empreendimento/tipologia.

## VGV na planilha

- Histórico limitado ao trimestre final, desconsiderando fechamentos anteriores ao trimestre de lançamento. Tipologias sem histórico elegível são excluídas.
- Preço atual: `price` do último fechamento elegível da tipologia, até o trimestre final. Não usa `release_price` no VGV lançado.
- VGV Lançado = `qty` do último fechamento (fallback para o primeiro) × preço atual. Quantidade ausente/zero ou preço ausente produz célula vazia.
- VGV trimestral = soma de `sold_in_period` dos fechamentos do trimestre × preço atual.
- VGV Estoque trimestral = `typology_stock` do último fechamento do trimestre × preço atual.
- Antes do trimestre de lançamento, estoque, vendas e ambos os VGV trimestrais são zero. Trimestre sem histórico ou preço ausente produz VGV vazio. A agregação inicia vendas em zero: trimestre com histórico, mas sem `sold_in_period` numérico, pode ter VGV zero enquanto vendas ficam vazias.
- Produtos são arredondados a centavos; na exportação, todos os VGV são divididos por 1.000.000 e arredondados a duas casas, como números com formato `0.00`.
- A coluna “Vendas líquidas” contém vendas brutas da API. Não há distratos reais para calcular vendas líquidas. Campos internos VGV Estoque consolidado, VGV Vendas Brutas, VGV Distratos e Vendas Líquidas monetárias não integram as colunas exportadas.
- Os gráficos temporais preservam o comportamento original: VGV Vendas soma venda × preço de cada fechamento; VGV Estoque lê `vgv_stock` da API. Essa série não equivale ao recálculo da planilha pelo preço atual.

## Layout do Excel

Arquivo `Relatorio_API_Excel_<cidade-ou-UF>_<trimestre>.xlsx`, uma aba `RELATÓRIO <trimestre>` (ex.: `RELATÓRIO 4T26`). Primeira linha de cabeçalhos, seguida dos empreendimentos ativos e depois esgotados. Dentro de cada grupo: lançamento crescente, nome e ID tipologia.

Colunas fixas, nesta ordem:

| Faixa | Colunas |
|---|---|
| A–D | ID Empreendimento; ID Tipologia; Status Empreendimento; Status Tipologia |
| E–I | Região Administrativa; Cidade/UF; Tipo; Tempo de Vendas; Empreendimentos |
| J–O | Taxa Administrativa; Bairro; Endereço; Número; Urbanizadora; Oferta por Lotes |
| P–U | Lançamento; Ano; Entrega; Entrada; Nº de Parcelas; Valor da parcela |
| V–AC | % de Juros Mensal; Indíce de Juros; Desconto à Vista; Valor m2 Priv.; Preço atual; m2 Priv.; VGV Lançado; m² Lançado |

Depois de AC, quatro blocos, cada um com uma coluna por trimestre encontrado no intervalo, em ordem cronológica: **Estoque**, **Vendas líquidas**, **VGV**, **VGV Estoque**. Ex.: Estoque 1T2026, Estoque 2T2026, Vendas líquidas 1T2026, Vendas líquidas 2T2026, VGV 1T2026, VGV 2T2026, VGV Estoque 1T2026, VGV Estoque 2T2026.

Entrada, juros mensal e desconto são números divididos por 100 e formatados `0.00%` no Excel (8,5 → 8,50%). Datas válidas são texto `dd/mm/aaaa`; ausências ficam vazias. m² Lançado = área privativa do último fechamento × quantidade, com duas casas; valores zero/ausentes ficam vazios nesse cálculo. Preços permanecem em reais; VGV em milhões de reais. Não são gravadas fórmulas Excel: os valores são calculados no aplicativo.
