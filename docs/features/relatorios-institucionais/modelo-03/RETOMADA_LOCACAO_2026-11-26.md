# Retomada da locação e análise de novos × usados

26/11/2026 · Codex/Lucas · base local `9a97010b`.

## Estado Git e escopo

Origin único `GabeBrain/relatorios-api`, fetch realizado: três commits remotos exclusivos de25/11 e dois locais exclusivos de24/11, com locação ainda sem commit na abertura. Remotos: `31a20548`, `296d12dd`, `2cec4cd9`. Os dois primeiros corrigem Sinduscon Curitiba; o último corrige fontes/cobertura/inventário do Modelo03. Existem sobreposições com os arquivos locais. Não houve pull, merge ou push: o protocolo AGENTS exige autorização humana para integrar históricos divergentes.

Concluída a validação isolada da implementação local de locação (refs123–126). Mesma fila/paginação/429/cancelamento, escopo autorizado, médias com bases explícitas, amostra por data de coleta, sem expor anúncio bruto nos arquivos. As capas25/39/100 permanecem omitidas. Após autorização, preservar as correções remotas de cobertura e inventário, incorporando as fontes de locação e atualizando a classificação das dependências123–126; repetir a validação na base integrada.

## Comparativo novos × usados: o que os arquivos comprovam

Contrato enviado em `revenda.py`: GET `/public-api/rent-resale-property`, `tipo_negocio=VENDA` ou `ALUGUEL`, cidade/UF, tipo Apartamento e filtros de coleta/atualização. Os dois JSONs são idênticos, com um anúncio VENDA. Trazem preço, preço/m², área útil, quartos, bairro e ano de construção (nulo no exemplo).

É tecnicamente possível calcular o lado de **anúncios de revenda** e confrontá-lo ao mercado novo da API de empreendimentos, por cidade, quartos, bairro ou padrão quando houver equivalência comprovada. O contrato fornecido, porém, não mostra atributo de condição novo/usado. VENDA identifica o negócio, não comprova uso anterior; ano de construção tampouco prova ocupação. Não classificar automaticamente todos os anúncios VENDA como imóveis usados. Uma confirmação documentada de que o endpoint fornece exclusivamente o mercado secundário ou um campo de condição é necessária para usar esse rótulo com segurança. Nenhuma coleta VENDA nova foi adicionada apenas pela solicitação de verificar viabilidade.

Proposta sustentada pelo material atual: **mercado novo × anúncios de revenda**, com fontes e bases separadas. Se o analista confirmar a equivalência de revenda a usados, conservar essa decisão no diagnóstico. Preço anunciado não é preço de transação; anúncios de portais distintos podem representar o mesmo imóvel. A ponderação do estoque novo difere da média simples dos anúncios, portanto deve constar da metodologia do comparativo.

## Tempo e preço

A janela seleciona anúncios coletados no período. `atualizado_em` não fornece série histórica de preço: o valor recebido hoje pode ter mudado depois da competência. Os quadros de locação sinalizam essa limitação e contam anúncios atualizados após o corte. Não declarar preço histórico nem reconstruir estoque ativo passado a partir dessas datas. A mesma limitação existe no comparativo de revenda; a competência da amostra e a data da consulta devem acompanhar o gráfico.

## Verificações e limites

- 88 testes em sete arquivos aprovados na retomada; um caso adicional de atualização posterior aprovado depois (89 casos no conjunto, com os quatro testes de locação reexecutados).
- TypeScript e lint aprovados antes do fechamento; controle temporal adicional sem alterar médias.
- Navegador Edge headless com API sintética: geração, quadro por bairros, insights, navegação e downloads JSON/CSV/PPTX aprovados;98 posições/108 páginas no cenário Curitiba/Araucária. Captura inspecionada: cabeçalhos compactos sem sobreposição.
- Não validado: resposta autenticada de ALUGUEL/VENDA, classificação definitiva de usados, equivalência metodológica ao original, merge dos históricos ou deploy. Não houve escrita no Monday.
