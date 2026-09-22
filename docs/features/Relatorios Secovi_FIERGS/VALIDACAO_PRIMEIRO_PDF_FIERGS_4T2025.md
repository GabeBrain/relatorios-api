# Validação do primeiro PDF FIERGS — 4T2025

Arquivo avaliado: `assets/panorama-alvorada-cachoeirinha-canoas-e-mais-8-4T2025.pdf`

Referência: `Panorama_FIERGS_RM de Porto Alegre_4T25_VAP_26Mar_10h15.pptx`

## Resultado executivo

O PDF foi gerado integralmente, com 61 páginas em 16:9, para as 11 cidades corretas e com fechamento em 4T2025. Ele ainda **não possui paridade numérica nem estrutural** com o estudo oficial de 75 slides. O resultado deve ser tratado como diagnóstico do motor, não como entregável validado.

## Primeiros controles numéricos

| Indicador | Oficial 4T2025 | PDF gerado | Resultado |
|---|---:|---:|---|
| Empreendimentos verticais lançados no trimestre | 13 | 29 | Divergente |
| Empreendimentos verticais lançados em 2025 | 35 | 105 | Divergente |
| Unidades verticais lançadas no trimestre | 2.554 | 5.963 | Divergente |
| VGV vertical lançado no trimestre (R$ mi) | 657,3 | 2.155,8 | Divergente |
| Unidades verticais vendidas no trimestre | 1.463 | 3.620 | Divergente |
| VGV vertical vendido no trimestre (R$ mi) | 399,8 | 1.877,5 | Divergente |
| Oferta final vertical | 4.850 | 12.715 | Divergente |
| IVV vertical | 23,17% | 14,7% | Divergente |
| Preço médio vertical (R$/m²) | 6.745 | 9.967 | Divergente |
| Empreendimentos horizontais no fechamento | 107 | 69 | Divergente |
| Oferta lançada horizontal | 18.747 | 12.557 | Divergente |
| Oferta final horizontal | 3.038 | 2.629 | Divergente |

## Inconsistências internas do PDF gerado

- A oferta final vertical é `13.666` na página 25 e `12.715` nas páginas 27 e 32.
- As vendas verticais do trimestre são `3.620` na série temporal, mas a tabela de área útil usa `2.356` como vendas líquidas.
- As famílias temporal e granular estão produzindo universos diferentes sem sinalização editorial suficiente.
- A página 3 ainda está intitulada `Sobre o SECOVI-SP`, embora o estudo seja FIERGS.

## Diferenças estruturais

- O oficial possui 75 slides; o PDF gerado possui 61 páginas.
- Não entrou a página oficial do recorte territorial com população e potencial de consumo.
- Não entraram os três mapas finais por padrão, estoque e R$/m².
- A sequência e o desdobramento dos blocos de lançamentos, vendas, oferta, preços e estado atual ainda não reproduzem o registro oficial dos 75 slides.
- Os slides horizontais existem, mas seus totais não reproduzem os slides 63–66 oficiais.

## Diagnóstico metodológico

As diferenças aparecem antes da camada visual. O motor usa duas famílias de fonte:

1. contratos temporais municipais para séries de lançamentos, vendas, estoque, IVV e preços;
2. `building-with-history` para o cubo granular e o fechamento.

As duas famílias não reconciliam entre si neste recorte e nenhuma delas reproduz o deck oficial. Isso aponta para diferença de universo, regra de corte, snapshot histórico ou semântica dos campos — não para erro de soma ou formatação isolado.

Também é possível que o deck oficial tenha sido fechado sobre um snapshot de pesquisa que já não corresponde à visão retrospectiva atual da API. Essa hipótese precisa ser confirmada com o Geobrain ou com a base usada na produção do deck.

## Próximo portão recomendado

Não avançar na homologação visual como se os números estivessem corretos. Antes:

1. comparar, por cidade e empreendimento, o universo oficial do deck com o retorno atual de `building-with-history`;
2. identificar a regra oficial de inclusão para lançamentos, vendas e oferta no fechamento de 4T2025;
3. esclarecer por que o temporal e o granular divergem dentro do mesmo PDF;
4. definir se 4T2025 deve usar snapshot histórico imutável ou a fotografia retrospectiva atual da API;
5. transformar os principais valores oficiais em testes de paridade obrigatórios;
6. somente depois fechar a estrutura dos 75 slides e a revisão visual.

## O que já pode ser validado

- integridade do PDF e proporção 16:9;
- recorte das 11 cidades;
- período 4T2025;
- blocos básicos vertical e horizontal;
- aplicação geral da identidade visual;
- presença de capa, sumário, equipe e encerramento.

O PDF é útil como primeira execução ponta a ponta, mas não deve ser distribuído externamente até a reconciliação metodológica.
