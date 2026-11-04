# SP — correção do tratamento de estoque, preços históricos e VGV

03/11/2026 · Codex · implementação solicitada pelo usuário: “Preciso que voce faça a correção”.

## Decisão aplicada

Corrigir o consumidor com dados calculados e coberturas explícitas, preservando a resposta original. Não exigir alteração da API como condição para apresentar os resultados que podem ser calculados. Esta decisão substitui, neste relatório, a política anterior de bloquear qualquer estoque negativo, apagar todo ponto histórico por fotografia de um empreendimento ausente e exigir que sold coincida com capacidade menos oferta.

### Estoque informado e IVV por área — 51

Estoque inteiro negativo é um valor informado, distinto de nulo. Primeiro conferir a soma assinada com o município. Se ela divergir, admitir uma projeção de oferta não negativa exclusivamente quando a soma de max(0, estoque) coincidir exatamente com o total municipal da mesma competência, com cobertura completa e medidas válidas. Não há tolerância de uma unidade nem ajuste residual. Na projeção, usar zero para negativos somente no modelo derivado; preservar o payload original e registrar ID/tipologia/mês/valor e motivo nas ressalvas. Os controles do recorte Econômico continuam independentes. Quando nenhuma das duas somas conciliar, manter o bloqueio.

Média de preço usa somente oferta positiva, como já previa o universo da média; estoque negativo não tem peso de unidade à venda. Participações de oferta são omitidas se houver faixa final negativa. IVV só é calculado com denominador positivo. Uma fotografia atual com estoque negativo não é usada para mapas e composições de oferta positiva sem tratamento específico; essa proteção permanece. A correção dos exemplos históricos não autoriza mapas de unidades negativas.

### Evolução de preços — 53–59

Separar fotografia de empreendimento ausente de conflito ou medida inválida. Em competências históricas (não no fechamento atual), admitir a média da **amostra observada** quando:

- há registros identificados, estoque e medições necessários válidos;
- não há conflito, falha de escopo/identidade ou outro erro estrutural;
- a série municipal da competência existe e o estoque observado é inteiro seguro, não negativo e não excede o total municipal;
- as ausências de fotografia são registradas e quantificadas.

Esse resultado é parcial, não uma média comprovada do universo completo. Nenhum preço, estoque ou fotografia faltante é inventado. Barra amarela com † e nota identifica a amostra; checklist permanece parcial e informa a primeira lacuna. Variações trimestrais e anuais envolvendo cobertura parcial são omitidas. No fechamento atual, na ausência de estoque de uma linha, em conflitos ou em divergência de uma fotografia completa, as proteções anteriores permanecem.

### Vendido e VGV da fotografia — 78

Para esta tabela, usar explicitamente:

```
capacidade declarada = qty da fotografia
oferta final = typology_stock da fotografia
vendido calculado = capacidade declarada − oferta final
VGV lançado = capacidade × preço da tipologia
VGV vendido calculado = vendido calculado × preço da tipologia
VGV final = oferta final × preço da tipologia
```

Exigir capacidade e oferta presentes, inteiras seguras, não negativas, com oferta ≤ capacidade. Não reconstruir capacidade ou estoque faltantes. Se faltar preço positivo em uma tipologia com capacidade, preservar todas as contagens e mostrar — nas células monetárias dependentes, inclusive nos totais afetados; não apresentar a soma apenas dos registros precificados como total completo. Cada VGV considera seus próprios contribuintes positivos: uma tipologia esgotada sem preço não impede o VGV da oferta final. O checklist identifica a tabela como parcial e quantifica os preços ausentes. Quando completos, os valores conservam VGV lançado=VGV vendido calculado+VGV final, respeitada precisão numérica e as guardas de somas seguras.

O sold original permanece na coleção privada e é comparado ao calculado: valores, diferenças e IDs ficam nas ressalvas e na auditoria JSON. Não somar distratos novamente nem substituir sold no payload. Vendas líquidas mensais e séries municipais permanecem independentes e inalteradas. A nota do slide declara a fórmula; não apresentar o derivado como sold observado da API.

Nas três tipologias reais do87999 recebidas anteriormente, os vendidos calculados são1/0/0 para capacidades120/120/96 e estoques119/120/96; sold original continua−9/−11/−6. Isso resolve o cálculo dessa tabela sob o método declarado, sem afirmar que o backend foi corrigido ou que essa seja a semântica contratual original de sold.

## Interface, checklist e auditoria

Reutilizados Alert, detalhes recolhidos e renderizadores SVG existentes. Avisos agora abrangem ressalvas da fonte, não apenas classificação. JSON v1 recebe campos aditivos: resumo limitado de sourceWarnings e calculatedSalesAudit com método capacity-minus-offer-v1, quantidade de diferenças e até20 exemplos. Sem token, coordenadas, nomes ou histórico bruto. Diagnósticos distinguem estoque negativo informado de estoque ausente.

## Validação e limites

Complemento de 04/11/2026, após checklist (4): controles de março/2026 124.044 versus 124.045 e preço ausente 54845/73369/junho motivaram as regras acima. 274 testes em 25 arquivos, tipos, lint e build aprovados na base 92eeef0. Edge local dirigido confirmou slide51 projetado e slide78 parcial; capturas inspecionadas, sem consulta GeoBrain autenticada. A fotografia de junho/2023 do64094 continua ausente: séries53–59 preservam identificação parcial e não inventam esse ponto. Evidência detalhada no EVIDENCIAS.md. Reteste real ainda necessário; os resultados anteriores abaixo são históricos da primeira correção.

271 testes SP/24 arquivos aprovados; tipos, lint e build aprovados. Testes anteriores de bloqueio foram ajustados para a política nova, preservando verificações de estoque nulo, conflito, total divergente, capacidade/estoque inválidos e preço ausente. Quatro regressões adicionais comprovam estoque negativo conciliado na abertura, média parcial calculada diretamente dos registros observados, supressão de variações e cálculo/auditoria de vendido sem mutar sold ou fluxo mensal. Prova mínima real do87999 reutilizada; demais denominadores e valores de teste são sintéticos. Último refinamento textual de diagnóstico repetido em7testes dirigidos, aprovados.

Edge local1440/claro, modo dirigido22posições e casos adicionais:51 disponível com estoque assinado/controle conciliado,53 com barra parcial identificada e78 com tabela calculada; três capturas inspecionadas. Parciais, vários períodos/2027, cancelamento/retry, erro/vazio, v2/403 e mapas preservados; zero erros de página, zero consultas de negócio reais pelo agente,54respostas Mapbox200. Artefatos `.local-inputs/sp-source-treatment-*`, fora do Git.

Não há novo checklist autenticado após esta alteração. Reteste no acesso do usuário/deploy observado e revisão analítica continuam necessários. A fonte original continua com seus valores e lacunas; o relatório agora usa um método declarado e apresenta coberturas parciais, sem homologação automática. A coleta v2 de53páginas não foi otimizada nesta entrega. Automação geral adiada e outros motores preservados.
