# Integração da locação, varredura e liberação no menu

26/11/2026 · Codex/Lucas. Lucas autorizou integrar os históricos sem push, retirar novos/usados e perspectivas editoriais e disponibilizar o Modelo03 no menu para testes.

## Históricos preservados

Base comum `d3ceeaa0`; locais `7971eb24`, `9a97010b`, `1c8790f7`; remotos `31a20548`, `296d12dd`, `2cec4cd9`. Cinco conflitos resolvidos somando comportamentos: README, STATUS, bancada visual, coleta e diagnóstico. Sem rebase/reset.

- Coleta conserva ALUGUEL e todas as verificações remotas de paginação, incluindo contradição entre próxima/última página.
- Diagnóstico conserva detalhes dos campos de vendas inválidos e auditoria de aluguel; cadência respeita o corte do relatório; inventário externo permanece nos Insights, JSON e CSV.
- Cálculo conserva isolamento de território/célula sem fonte, status de quadro inteiramente sem valores, rastreabilidade e RM desativada; regra de locação preservada.
- Verificação do LIVE antes de adicionar a nova entrada: `base + (local-base) + (remoto-base)` por multiplicidade de linhas não vazias, zero linhas faltantes e zero extras. Entradas de ambos os lados preservadas, sem duplicar a base. STATUS preserva26/11,25/11 e24/11 em ordem decrescente.

## Retiradas temporárias

- Novos × usados: capa127 e referência128 retirada também do inventário de fontes, sem criar um comparativo sem classificação comprovada.
- Perspectivas: capa143 e páginas editoriais144–153, que aguardavam revisão do analista. Não removidos indicadores calculados.
- Capas25/39/100 continuam omitidas. `reference.temporarilyOmittedReferencePages` identifica as omissões no JSON; IDs originais preservados.
- Resultado com RM:86 posições (62 indicadores,24 editoriais); sem RM80. Inventário de fontes externas ainda previstas:40. As páginas físicas variam com municípios/tabelas/continuações.

## Menu e método

`AppLayout` passa a oferecer **Relatórios Automatizados → Modelo 03**, após Maceió, com indicação “em implantação”; usa a rota lazy existente. Reutilizados o shell, o comportamento de menu móvel e os controles/carregamento comuns; formulário geográfico e de período permanece intacto. Sem novo card de Home.

Locação segue como amostra de anúncios coletados no período. Preço recebido não comprova preço histórico; avisos informam atualização posterior ao corte. Anúncios não são contratos, imóveis únicos entre portais ou fotografia histórica do estoque ativo. Média simples e base válida por campo mantidas. O lado VENDA/novos × usados ficou suspenso por pedido do usuário.

## Validação e limites

Fechamento:142 testes/11arquivos aprovados (111Modelo03,26Curitiba,5layout/menu), tipos/lint/build aprovados e sete cenários Edge offline aprovados, incluindo menu, três periodicidades, locação por bairros, navegação/modal, insights, JSON/CSV/PPTX, vazio/erro/sem token e429/cancelamento. Cenário Curitiba/Araucária exportou86posições/96páginas físicas. Captura do quadro de locação inspecionada. Lucas autorizou o push após revisar a entrega.

111 testes do Modelo03 aprovados após a integração, incluindo48combinações cidade/periodicidade e casos de fontes ausentes. Tipos/lint/build aprovados na base integrada. Teste de menu móvel aprovado. Regressões de templates Curitiba receberam nova execução com timeout30s, pois a primeira execução concorrente ao build excedeu5s por caso, sem falha de asserção.

Navegador e exportações usam API sintética; não comprovam cobertura imobiliária real. Nenhuma geração autenticada de ALUGUEL, deploy ou homologação pelo analista observada. Publicação depende de autorização separada; nenhuma escrita Monday.
