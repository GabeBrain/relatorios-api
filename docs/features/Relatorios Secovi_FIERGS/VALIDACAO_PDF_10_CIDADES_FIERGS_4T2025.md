# Validação do PDF FIERGS com 10 cidades — 4T2025

Arquivo avaliado: `assets/panorama-alvorada-cachoeirinha-canoas-e-mais-7-4T2025.pdf`

Referência: estudo oficial FIERGS RM Porto Alegre, 4T2025, com 75 slides.

## Conclusão

A retirada de Porto Alegre aproximou materialmente o relatório do universo oficial e confirmou que o recorte calculado contém 10 municípios. O PDF é integral, possui 61 páginas em 16:9 e não apresenta falha de geração. Ainda não há paridade numérica: permanecem diferenças de política de universo e uma inconsistência interna entre indicadores calculados com janela de lançamentos e indicadores baseados no cubo completo.

## Comparação numérica

| Indicador | Oficial | PDF de 10 cidades | Diferença |
|---|---:|---:|---:|
| Empreendimentos verticais lançados no 4T25 | 13 | 15 | +15,4% |
| Unidades verticais lançadas no 4T25 | 2.554 | 3.082 | +20,7% |
| VGV vertical lançado no 4T25 (R$ mi) | 657,3 | 796,3 | +21,1% |
| Empreendimentos verticais lançados em 2025 | 35 | 42 | +20,0% |
| Unidades verticais lançadas em 2025 | 5.577 | 6.631 | +18,9% |
| VGV vertical lançado em 2025 (R$ mi) | 1.681,2 | 1.896,2 | +12,8% |
| Unidades verticais vendidas no 4T25 | 1.463 | 1.135 | -22,4% |
| VGV vertical vendido no 4T25 (R$ mi) | 399,8 | 304,3 | -23,9% |
| Oferta final vertical | 4.850 | 5.855 no cubo / 5.448 no resumo | +20,7% / +12,3% |
| IVV vertical | 23,17% | 20,7% | -2,47 p.p. |
| Preço médio vertical (R$/m²) | 6.745 | 6.198 | -8,1% |
| Empreendimentos horizontais | 107 | 124 | +15,9% |
| Unidades horizontais lançadas | 18.747 | 28.765 | +53,4% |
| Oferta final horizontal | 3.038 | 2.944 | -3,1% |

## Diagnóstico

- A exclusão de Porto Alegre foi correta e eliminou a maior fonte de sobrecontagem.
- Lançamentos, vendas e oferta ainda não reproduzem a curadoria histórica do estudo oficial. A API atual entrega uma fotografia retrospectiva que pode incluir revisões posteriores ao fechamento.
- O próprio PDF usa dois universos em alguns pontos: o cubo completo mostra 5.855 unidades verticais finais, enquanto páginas de resumo filtradas pela janela de lançamento mostram 5.448. O mesmo padrão aparece no horizontal.
- A oferta final horizontal já está muito próxima da referência, mas o total histórico de unidades lançadas continua inflado; isso indica que a regra oficial não é apenas territorial.
- O preço médio é inferior à referência mesmo sem Porto Alegre, sinalizando diferença na seleção de produtos/empreendimentos ou na ponderação do indicador.

## Correções visuais aplicadas após esta validação

- capa FIERGS preservada sem a sobreposição ilegível da lista de cidades;
- nova página branca, imediatamente após a capa, com as 10 cidades do recorte e indicação explícita de que Porto Alegre não integra o universo calculado;
- aberturas de seção passam a usar o fundo oficial extraído do deck FIERGS, com o título mantido como camada dinâmica;
- asset oficial reproduzível pelo script `scripts/export-fiergs-assets.ps1`.

## Próxima validação necessária

Gerar novamente o PDF publicado. O resultado esperado passa a ter 62 páginas. A conferência numérica seguinte deve comparar os identificadores dos empreendimentos da API com a relação curada do fechamento oficial, antes de alterar fórmulas de IVV ou preço.
