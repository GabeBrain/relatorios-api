# Bases enviadas pelo Edgar: estrutura e confronto com a API

## Decisão

**As bases corroboram as premissas do avanço `a2480df`. Envio autorizado por Gabriel após esta conferência.** Não foi necessário alterar os motores, parâmetros ou o fluxo da página. As restrições de qualidade e as ressalvas de precisão continuam necessárias.

A base horizontal reproduziu as contagens publicadas: 372 empreendimentos lançados desde2020; 370 após excluir Suspensos; oito tipologias sem registro no lançamento removidas; **366 empreendimentos e15.164 meses no painel**. Esta conferência reproduz seleção e dimensões do painel, não o ajuste estatístico completo nem igualdade ponto a ponto com um painel original não fornecido.

Confronto adicional, autenticado e somente leitura: **6.727 chaves empreendimento/tipologia/mês de Cuiabá, em166 empreendimentos, tiveram quantidade, estoque e venda líquida iguais na API e no Excel:20.181 comparações, zero diferenças.** Os escopos não são idênticos: API174 empreendimentos/6.970 chaves, Excel171/6.799, com72 chaves exclusivas do Excel e243 da API. Não inferir a causa dessas ausências sem contrato/filtros da exportação; não transformá-las em zero ou afirmar completude idêntica.

## Material e formato

Pasta de origem: [Bases_Qlik no Drive indicado por Gabriel](https://drive.google.com/drive/folders/1p9bDnqLdfgBfvgDovIT4Nvp5lnzNCeP6). Listagem anterior vazia foi superada pelos cinco arquivos agora disponíveis. A atribuição do envio a Edgar vem de Gabriel; os metadados do conector não foram usados para inferir autoria pessoal.

Todos têm uma aba e26 colunas, com uma linha por **empreendimento/tipologia/mês**. A horizontal é XLSB; as verticais são XLSX. Quantidades abaixo excluem cabeçalho:

- Horizontal:55.876 linhas,674 empreendimentos,18 cidades, janeiro/1993 a setembro/2026. **Não contém Curitiba**; inclui Goiânia, Fortaleza, Florianópolis, Campinas e outras cidades.
- Cuiabá:6.799 linhas,171 empreendimentos, junho/2004 a setembro/2026.
- Florianópolis:69.044 linhas,669 empreendimentos, janeiro/2009 a setembro/2026.
- Belo Horizonte:195.511 linhas,1.460 empreendimentos, janeiro/2008 a setembro/2026.
- Rio de Janeiro:147.828 linhas,1.112 empreendimentos, março/2000 a setembro/2026.

Campos relevantes: ID Empreendimento, ID Tipologia, Cidade, Tipo, Padrão, Status, Data de lançamento, Mês de referência, Foi estimado?, Qtd Lançada, Venda Bruta, Distrato, Venda Líquida, Estoque Final e Tempo em venda. Preço, índices e indicadores não entram nos cálculos auditados. Nenhuma macro foi executada.

As datas de lançamento recebidas são `DD/MM/AAAA`; referências são `MM/AAAA`. A documentação vertical descrevia lançamento `MM/AAAA`: um futuro importador IVV precisa normalizar essa diferença. A página atual recebe o lançamento ISO da API e não depende dessa conversão.

**O conferidor Excel atual da interface continua esperando Análise Temporal Excel, formato Colunas.** Estas bases IVV usam outro layout, longo. A compatibilidade de dados não implica que o seletor atual de upload aceite XLSB/IVV; não foi acrescentado esse importador nesta revisão. A conferência desta sessão é diagnóstica e reproduzível pelos scripts abaixo.

## Como corroboram o motor

1. **Estoque é o ponto de partida.** Qtd Lançada e Estoque Final existem na mesma tipologia/competência. Vendido acumulado pode ser calculado por quantidade menos estoque e agregado por empreendimento, como na bancada. A paridade de Cuiabá confirma o mapeamento concreto desses campos na API.
2. **Idade conta desde o lançamento.** Na horizontal,21.974 de55.876 linhas têm Tempo em venda divergente da contagem de meses, aproximadamente39,3%, coerente com os39% relatados pelo Finotti. Manter o lançamento e apenas alertar sobre a divergência é apropriado.
3. **Não presumir cadência mensal.** Há8.458 intervalos de três meses na horizontal e4.941 em Cuiabá. Um registro com rótulo de mês não prova que Venda Líquida seja venda daquele único mês. Isso sustenta retirar a confirmação técnica manual do fluxo e usar diferença de estoques em datas conhecidas no candidato de ritmo recente.
4. **Vendas e estoque não são intercambiáveis sem conferência.** Na horizontal há100 intervalos com oferta estável em que queda do estoque difere da venda líquida reportada; em Cuiabá são55. Há também vendas líquidas negativas, revisões de quantidade e estoques fora do suporte bruto. Alertas, limites físicos e recusa de posições inválidas continuam necessários. As contagens agregadas não localizam esses casos no corte atual de cada cidade.
5. **Observado e estimado precisam permanecer separados.** Os cinco arquivos somam475.058 linhas;98.563 têm Foi estimado?=Sim. A flag varia ao longo da história de muitos projetos. O estudo original mantém estimados na preparação; isso não torna os resultados vendas observadas comprovadas. A exportação abre uma frente para máscaras históricas de validação, mas a API examinada só expõe estimation no cadastro atual, não em cada linha histórica. Não retropropagar essa flag atual.
6. **Preparação de treino e inferência têm papéis distintos.** O estudo horizontal usa quantidade final, interpolação e preenchimento até o fim da base; o vertical usa máximos por tipologia e censura dos ativos. Na previsão ao vivo, a bancada usa unidades e estoque disponíveis no corte, sem buscar valores futuros para completar entradas ou alvos de retrospectiva. Reproduzir o preparo integral não pode ser apresentado como teste independente anterior à base de treino.

## O que os arquivos ainda não comprovam

- As quatro verticais e a horizontal não equivalem à totalidade da referência vertical distribuída:686 dos2.176 IDs do artefato original aparecem nestes envios. Correspondência de IDs não demonstra identidade das trajetórias nem informa, sozinha, quais registros passaram nos filtros de treino. Não substituir o artefato fornecido por esta amostra parcial ou recalibrar silenciosamente.
- Não há base de Curitiba nesses cinco arquivos; o confronto com o snapshot horizontal de Curitiba teve zero chaves comuns e não foi tratado como paridade. Cuiabá foi escolhida para um confronto válido entre recortes comuns.
- A comparação API/Excel confirma valores no conjunto comum, não cobertura integral, precisão da curva, calibração de faixas ou acurácia observada.
- Permanecem pendentes máscara temporal independente, cobertura por cidade/tipologia, contrato de retorno ao Geobrain e validação posterior ao treino de setembro/2026. A ferramenta segue experimental.

## Reprodução e custódia

Originais, JSON derivado para leitura do XLSB, snapshot da API e resultados completos ficam ignorados em `.local-inputs/estimativas-vendas/edgar-drive-20261022/`. [Evidência agregada e hashes](EVIDENCIAS_BASES_EDGAR_2026-10-22.json) preservam procedência sem publicar as planilhas brutas.

1. `node scripts/diagnostics/estimativas-edgar-xlsb.mjs` — lê XLSB e prepara derivado local sem Preço.
2. `python scripts/diagnostics/estimativas-edgar-audit.py` — lê as cinco bases, audita chaves/cadência/flags e reproduz os filtros e dimensões horizontais. Usa openpyxl e NumPy para leitura/análise; não modifica planilhas.
3. `node scripts/diagnostics/estimativas-edgar-api-compare.mjs` — confronto autenticado de Cuiabá, com até oito leituras em paralelo, sem gravação no Geobrain. Segredos somente do arquivo local ignorado.

Esta sessão realizou auditoria de Gabriel sobre os materiais recebidos; não registra entregas pessoais de Edgar. Seus dois commits novos de Validação do Fechamento serão integrados preservando o histórico e testados junto ao envio autorizado. Publicação no Git e publicação no Lovable são estados distintos.
