# Fortaleza — fatos, propostas e pendências

09/11/2026 · evidência: leitura textual dos dois PPTX no Drive; localização em [MAPA_BLOCOS](MAPA_BLOCOS.md). Não representa validação visual, base granular ou método homologado.

## Fatos documentais

- Ambos indicam Fortaleza e RM composta por Aquiraz, Caucaia, Eusébio e Maracanaú. Isso não comprova autorização no token atual.
- Critério de lançamentos: tabela de lançamento e mês/ano de início das vendas. Fluxos/preços: comparação de tabelas do mês atual/anterior, com estoque e distratos. Preço: tabela vigente por unidade.
- Junho apresenta séries trimestrais e tabelas de junho; julho usa séries mensais. Acumulados de 12 meses são um terceiro tipo de janela.
- Blocos gerais de lançamentos/vendas incluem vertical, comercial e casas/sobrados em notas específicas. Loteamentos têm séries separadas. Outras notas de oferta restringem vertical/casas, enquanto tabela de oferta detalha também lotes e comercial. Contrato deve ser por bloco, não filtro único.
- Preço vertical RM exclui tipologias com estoque zero e coberturas, lajes, duplex e gardens. O texto não comprova peso exato nem autoriza aplicar essa exclusão aos demais painéis.
- Junho capital cita teto MCMV 400 mil para lançamentos desde abril/2026, mas junho RM cita 350 mil desde julho/2023. Julho RM também cita abril/2026/400 mil. São notas das referências, sem comprovação de regra operacional aplicável a todo histórico. Não transformar em constante geral.
- Texto de junho por município traz venda econômica negativa em Aquiraz; negativo não deve ser zerado. Distratos não podem ser recuperados individualmente de mera diferença líquida sem campos comprobatórios.
- VGV/VGL históricos aparecem corrigidos pelo INCC; índice, série, competência-base e fórmula precisam ser confrontados. Snapshot SP não prova cobertura/metodologia Fortaleza.

## Inconsistências a investigar

1. Junho/bloco 16: subtotal vertical de unidades lançadas é 1.829 e horizontal 32, mas linha “Total” extraída é 32. Bloco 31: subtotal vertical de vendas é 1.327, horizontal 148 e comercial 1, com “Total” 149. Podem ser estrutura visual/subtotal parcial ou erro: conferir slide real antes de atribuir causa ou reescrever.
2. Junho/bloco 40: estoque vertical capital 10.753; abertura junho usada em julho/blocos 52–55 é 10.638. Estoque vertical RM ao fechar junho/bloco 40 soma 3.325, contra abertura 3.380 em julho/bloco 47. São fotografias distintas: possíveis revisões/cobertura, não prova automática de bug.
3. Julho/bloco 20 (VGL mensal loteamentos) mantém texto comparativo “2º Trimestre de 2025”. Confirmar categoria do gráfico/caches e alinhamento do rótulo, sem copiar narrativa.
4. Notas e cabeçalhos de junho/julho não são intercambiáveis. Contagens de amostra, pessoas/contatos e valores dos decks são evidência histórica, nunca parâmetros fixos.

## Propostas desta rodada

- Junho/2T2026 como principal e julho como controle mensal, sem decisão de produto implícita.
- Primeiro núcleo: vertical capital, junho mensal, lançamentos/vendas/oferta. Núcleo é candidato condicionado à fonte mensal; não reduzir trimestre a junho.
- Candidato a teste de coerência: oferta anterior + lançamentos - vendas líquidas = oferta final, somente mesmo universo e sem revisões não explicadas. Não derivar vendas de estoque para esconder revisões.
- IVV candidato: vendas líquidas / (oferta anterior + lançamentos). Compatível com alguns totais textuais, mas continua hipótese até comprovar denominador, revisões e arredondamento em todos os recortes.

## Pendências que bloqueiam implementação fiel

- PPTX bruto: hash, dimensões, sequência real, notas, caches e inspeção visual.
- Fonte/API: campos/unidade/competência, fluxo versus acumulado, status e cobertura de cada cidade, ID/fase e mudanças de universo. Nenhuma API foi consultada nesta rodada.
- Ponderação/denominadores de preço e tempo médio; INCC e classificações por data. Sem média simples/ponderação herdada por conveniência.
- Confirmar com Lucas a fatia G2 após contrato e quem avaliará método/aceite. Aprovação de números do gabarito não dispensa método observável.
