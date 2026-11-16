# Fortaleza — comparação dos arquivos gerados com as referências

16/11/2026 — Lucas/Codex. Solicitação: comparar dados e corrigir os títulos que cruzavam a régua verde/tag roxa. Revisão e homologação de conteúdo pertencem ao analista; Lucas conduz a implementação pela Inovação.

## Materiais e método

- Referência trimestral: `BRAIN_PANORAMA_FORTALEZA_E_RM_JUNHO_V28jul_11h35.pptx`, 89 slides, SHA256 `9627305db0022997961cd8feb37523cca49111ee8277947a0e4544b5bc66a78a`. Junho é o fechamento do **2T2026**; há gráficos trimestrais, tabelas mensais de junho, IVV mensal e janelas móveis.
- Trimestral gerado fornecido por Lucas: `fortaleza-trimestral-2026-06-conferencia-editavel.pptx`, 89 slides, SHA256 `a3b9a9f668989178b283d6388dfb064ef910a86cd70d63f081b995ac3344d737`. Auditoria embutida: exportação em `2026-11-16T12:29:34.247Z`, sem edições manuais.
- Referência mensal: `BRAIN_PANORAMA_FORTALEZA_E_RM_JULHO_VAP_26ago_9h31.pptx`, 60 slides, SHA256 `296fe59a14cb914e84c070700a177fe999950aab54468ea261ade2167fa245a8`.
- Mensal gerado fornecido por Lucas: `fortaleza-mensal-2026-08-conferencia-editavel.pptx`, 60 slides, SHA256 `0397cc7a804491f78759bd4f76b965b89075dc1c55ad2e5dc892c45f920fe754`. Auditoria embutida: exportação em `2026-11-16T12:42:02.596Z`, sem edições manuais.

Extraídos todos os textos, tabelas e caches dos gráficos das referências e todos os textos/tabelas/auditorias dos arquivos gerados. Comparações de séries preservam o índice original do ponto: lacuna de cache não é tomada como último valor nem como zero. Séries de casas/lotes são alinhadas pelo nome, pois sua ordem difere. A auditoria do gerado fornece as medidas sem arredondamento. Os quatro arquivos foram abertos somente em leitura no PowerPoint; nove lâminas de cada um foram renderizadas para inspeção, com hashes preservados. Não é reconciliação com a base bruta da API nem homologação de todos os indicadores.

Os arquivos brutos do usuário permanecem intactos; cópias, extrações e capturas ficam somente em `.local-inputs/relatorios-lucas/fortaleza/comparison-2026-11-16/` e `monthly-comparison-2026-11-16/`.

## Mensal: comparar julho com julho

O gerado é de agosto; a referência é de julho. O histórico do gerado contém julho, permitindo confrontar o mesmo mês. Não comparar diretamente o fechamento de agosto ao fechamento da referência de julho como se fosse erro.

| Indicador de julho/2026 | Referência julho | Julho no gerado de agosto | Leitura técnica |
|---|---:|---:|---|
| Unidades lançadas, conjunto — slide 12 | 2.231 | 2.231 | Igual: Fortaleza 1.132 e RM 1.099 nos dois |
| Econômico / demais da capital — slide 13 | 920 / 212 | 920 / 212 | Igual |
| VGV lançado, R$ milhões — slide 16 | 599,265 | 603,199 na base agosto | Convertido à base julho, 599,265256: coincide dentro do arredondamento |
| Vendas líquidas, conjunto — slide 22 | 1.727 | 1.713 | −14 unidades, cerca de −0,8% |
| Oferta final, conjunto — slide 33 | 15.140 | 15.897 | +757 unidades, +5,0% |
| Oferta vertical da capital — slide 34 | 10.584 | 11.271 | +687 unidades, +6,5% |
| Preço/m² vertical da capital — slide 37 | R$ 12.099 | R$ 9.360,90 | Cerca de −22,6%; principal ponto de método/universo a conciliar |
| IVV capital — slide 45 | 10,08% | 9,5062% | Cerca de −0,57 ponto percentual |
| IVV RM — slide 46 | 10,4% | 10,1196% | Cerca de −0,28 ponto percentual |

Conversão monetária aplicada somente para essa comparação: `603,199176819 × 1288,431 / 1296,889 = 599,265256`, usando os índices INCC-DI julho/agosto já versionados. Preços/m² são nominais e não recebem essa conversão.

Agosto no gerado: 1.928 unidades lançadas, 1.522 vendas líquidas, oferta final de 16.303 unidades e preço/m² vertical de Fortaleza de R$ 9.761,19. **Não há referência de agosto neste pacote para afirmar igualdade desses fechamentos.** O diagnóstico embutido registra 45 slides disponíveis, zero fontes pendentes e 15 editoriais; permanecem avisos de balanço e histórico horizontal de Caucaia. Fonte disponível não significa método homologado.

## Trimestral: mesmo fechamento 2T2026

| Indicador | Slide | Referência | Gerado | Diferença |
|---|---:|---:|---:|---:|
| Unidades lançadas, conjunto | 12 | 4.128 | 4.715 | +14,2% |
| Unidades lançadas, Fortaleza | 12/13 | 1.778 | 2.310 | +532, ou +29,9% |
| Vendas líquidas, conjunto | 24 | 4.316 | 4.147 | −3,9% |
| Oferta final, conjunto | 37 | 15.084 | 15.377 | +1,9% |
| Preço/m² vertical de Fortaleza | 42 | R$ 11.977 | R$ 9.295,30 | −22,4% |
| Oferta final de casas em condomínio, Fortaleza | 66 | 393 | 69 | Universo fortemente diferente |
| IVV mensal de junho, RM | 72 | 11,8% | 10,2679% | −1,53 ponto percentual |

Pontos concretos para o analista:

1. **Lançamentos:** as 532 unidades adicionais de Fortaleza aparecem no Econômico do trimestre (888 → 1.420) e em junho (540 → 1.072). A lista gerada também inclui `Laguna Ville`, ausente na referência; não foi comprovado pelas informações do PPTX que esse empreendimento sozinho explica as 532 unidades.
2. **Classificação:** `The Dream` aparece como Luxo na referência e Alto no gerado. As tabelas por padrão também usam conjuntos de rótulos diferentes (a referência apresenta Super Luxo; a API atual apresenta Médio-Alto). Confirmar a correspondência editorial sem trocar rótulos automaticamente.
3. **Casas/empreendimentos ativos:** slide 66 tem 15 empreendimentos de casas e 393 unidades em oferta na referência, contra 9 e 69 no gerado. O universo precisa ser conciliado; não é diferença de arredondamento.
4. **Preços:** a diferença de aproximadamente 22% aparece tanto no trimestral quanto no mensal, para o mesmo mês comparável. Confirmar quais unidades/tipologias entram e qual ponderação deve ser usada. O gerado usa média de preço/m² ponderada por estoque histórico positivo; o PPTX original não traz memória de cálculo suficiente para comprovar o mesmo critério.
5. **Totais de quadros municipais:** as linhas “Total” dos originais 16/19/31/32 não somam o subtotal vertical mais horizontal/comercial. Exemplo: no slide 19, subtotal vertical de 441,5 e horizontal de 19,2, mas a última linha mostra 19,2. No gerado, Total soma os segmentos. Pode haver convenção editorial ou fórmula do original a esclarecer; não usar o último número original como total geral sem confirmar sua intenção.
6. **Amostra e mapas:** a contagem cadastral do gerado é explicitamente diferente da amostra histórica da pesquisa. Páginas 49–53/71 continuam representações por coordenadas/quadrantes, sem reproduzir a cartografia e a classificação visual dos mapas de referência.

As próprias referências têm diferenças retrospectivas: o preço/m² de junho é 11.977 no trimestral e 12.050 no histórico do mensal de julho. Isso comprova que não são uma única fotografia numérica congelada; não identifica, sozinho, a causa das diferenças para a API atual.

## Cabeçalhos corrigidos no gerador

Pedido de Lucas: 49/54 sobre a régua verde e 49–53 invadindo a tag roxa. Correção aplicada aos mapas 49–53/71 e IVV trimestral54/72; o mesmo padrão cobre IVV mensal45/46.

- Títulos em duas linhas, 30 pt, inteiramente antes de x1000; a tag começa em x1028.
- Máscara da régua antiga a partir de y90, abaixo da tag (termina em y87); título, recorte e competência preservados sem cruzamento.
- Sem alteração de valores, fórmulas, categorias, mapas ou critérios de dados. Os anexos recebidos não foram regravados; a correção entra na prévia e em novas exportações.
- 297 testes/24 arquivos, ESLint e build aprovados. Edge: 364 cenários trimestrais, com asserções geométricas para título/tag/régua, e 240 mensais. Novo PPTX/PDF de teste89 baixado; títulos49/54/72 renderizados e inspecionados no PowerPoint. Os dados dessa exportação de teste são sintéticos.

**Conclusão técnica:** estrutura e coleta estão implementadas; parte dos números coincide e parte diverge de forma relevante. Lançamentos e VGV mensal têm bons pontos de conciliação no período comum. Preço/m², estoque, universo de casas e padrões precisam da decisão do analista antes de considerar os dois modelos equivalentes aos originais. Nenhum número foi sobrescrito para imitar o material de referência.

**Monday:** [Estudo Fortaleza](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`. Nenhuma escrita no Monday.
