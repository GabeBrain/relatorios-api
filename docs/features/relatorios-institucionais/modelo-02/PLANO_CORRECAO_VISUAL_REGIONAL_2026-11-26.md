# Institucionais Imprensa — correção visual e editorial das cinco regiões

26/11/2026 · Autor: Codex, a pedido do usuário · **Estado: IMPLEMENTADA (26/11, Claude): todas as famílias das §3 nas cinco regiões, conferidas com dados sintéticos no PowerPoint. Aceite com saídas reais pendente, a cargo do usuário. Ver §8.**

Este documento substitui a leitura de que a publicação anterior resolveu a fidelidade visual. O usuário apontou diferenças na geração real, incluindo população ausente, títulos sobrepostos, falta de setas e colchetes, rótulos mal posicionados e gráficos com lacunas. O pedido desta rodada é documentar a correção; não executar nem publicar mudanças de produto.

## 0. Escopo obrigatório: todas as regiões

A correção abrange **Sul, Sudeste, Nordeste, Norte e Centro-Oeste**. O Sul é a região que o usuário testou no sistema e cuja exportação real foi indicada para reproduzir os defeitos. Ele é evidência do problema, não o limite da implantação.

População e participação estadual, ordenação, títulos completos, manchetes, setas/colchetes, rótulos, divisórias, séries e exportação devem ser corrigidos nas cinco regiões, inclusive quando o mesmo componente é compartilhado. Não encerrar a entrega corrigindo apenas o Sul nem deixar as outras regiões como extensão opcional futura.

Cada região deve continuar seguindo seu próprio original. Compartilhar a correção não significa copiar a apresentação Sul inteira: preservar UFs/capitais e sua ordem, exclusões, quadros exclusivos e paginação de cada matriz. Exemplos: preços das capitais no Nordeste; valorização do m² no Norte/Centro-Oeste; ausência de ranking de luxo no Norte.

| Região | Original 4T2025 no Desktop | Matriz | Evidência real desta revisão |
|---|---|---|---|
|Sul|`BRAIN-Panorama-Sul_4T2025_VAP_26fev_10h43.pptx`|[Matriz Sul](MATRIZ_sul.md)|PPTX gerado pelo sistema, testado pelo usuário e identificado na pasta Auditorias.|
|Sudeste|`BRAIN-Panorama-Regiao-Sudeste_4T2025_VAP_20FEV_17H25.pptx`|[Matriz Sudeste](MATRIZ_sudeste.md)|Não foi fornecida uma saída real desta região nesta revisão; gerar e conferir na execução da correção.|
|Nordeste|`BRAIN-Panorama-Nordeste_4T2025_VAP_25fev_16h30.pptx`|[Matriz Nordeste](MATRIZ_nordeste.md)|Não foi fornecida uma saída real desta região nesta revisão; gerar e conferir na execução da correção.|
|Norte|`BRAIN-Panorama-Regiao-Norte_4T2025_VAP_20fev_17h20.pptx`|[Matriz Norte](MATRIZ_norte.md)|Não foi fornecida uma saída real desta região nesta revisão; gerar e conferir na execução da correção.|
|Centro-Oeste|`BRAIN-Panorama-Regiao-Centro_Oeste_4T2025_VAP_20fev_17h15.pptx`|[Matriz Centro-Oeste](MATRIZ_centro-oeste.md)|Não foi fornecida uma saída real desta região nesta revisão; gerar e conferir na execução da correção.|

Todos os originais acima ficam em `C:\Users\Usuario\Desktop\Relatorios Institucionais Imprensa - Referencias Regionais`. Os números de página, contagens e valores específicos do Sul nas seções seguintes pertencem ao caso real testado; não devem ser aplicados automaticamente às demais regiões.

## 1. Arquivos certos e onde comparar

**“Auditorias” é uma pasta local do computador. Não é uma página do Rebrain nem um endereço de navegador.**

### Referência original Sul — 4T2025

```text
C:\Users\Usuario\Desktop\Relatorios Institucionais Imprensa - Referencias Regionais\BRAIN-Panorama-Sul_4T2025_VAP_26fev_10h43.pptx
```

### Geração real apontada pelo usuário — 3T2026

```text
C:\Users\Usuario\Desktop\Auditorias\institucionais-imprensa-sul-2026-3T-editavel.pptx
```

Abrir os dois arquivos no PowerPoint, lado a lado, usando a correspondência de páginas da seção 3 e do apêndice. Preservar os arquivos de origem; gerar novas saídas com outro nome. Comparar linguagem visual, composição e método. Os valores de 4T2025 não devem ser copiados para 3T2026.

### Evidências disponíveis no workspace

Caminhos relativos à raiz `C:\Users\Usuario\Desktop\Sistemas Brain\Banco Quanti`:

| Material | Onde encontrar | O que comprova |
|---|---|---|
| Miniaturas dos 53 originais Sul | `docs/features/relatorios-institucionais/modelo-02/miniaturas/sul-01.jpg` até `sul-53.jpg` | Ordem e composição do original; estão versionadas. |
| Renderizações maiores do original | `.local-inputs/relatorios-lucas/modelo-02/reference-audit/sul/Slide1.JPG` até `Slide53.JPG` | Inspeção dos detalhes gráficos; arquivos locais, ignorados pelo Git. |
| Auditoria embutida extraída do PPTX real | `.local-inputs/relatorios-lucas/modelo-02/real-audit-2026-11-26/audit.json` e `audit.xml` | Seleção, recorte, fontes, tabelas, ressalvas e mapa físico da geração real. |
| Inventário do PPTX real | `.local-inputs/relatorios-lucas/modelo-02/real-audit-2026-11-26/slides.json` | Textos e séries dos gráficos nativos das 92 páginas. |
| Exemplos de componentes gráficos originais | `.local-inputs/relatorios-lucas/modelo-02/real-audit-2026-11-26/picture-31-1.png` e demais `picture-*` | Camadas originais de arte que permitem recompor divisórias sem texto residual. |
| Capturas dos defeitos | Imagens enviadas pelo usuário nesta conversa | Cidades sem população; destaques sem setas; série sem comparativos; título com “E” residual; VGV com espaços vazios. |
| Comparativos anteriores de desenvolvimento | `.local-inputs/relatorios-lucas/modelo-02/visual-2026-11-26-correction/pair-sul-*.jpg` | **São ensaios com mercado sintético**, não a geração real desta pasta Auditorias. |
| Piloto anterior com ruas Mapbox | `.local-inputs/relatorios-lucas/modelo-02/visual-2026-11-26-real-basemap-correction/` | Base cartográfica real com mercado sintético; não homologa os dados imobiliários da geração atual. |

Os pares sintéticos anteriores não devem ser apresentados como “antes/depois” da geração real. Ainda é necessário produzir os pares visuais reais de todas as famílias alteradas. O apêndice abaixo é um comparativo estrutural extraído dos arquivos, não um aceite visual das 92 páginas.

## 2. Base observada nesta revisão

| Medida | Original Sul | Geração real de Auditorias |
|---|---:|---:|
| Competência |4T2025|3T2026|
| Páginas físicas |53|92|
| Gráficos nativos |19|40|
| Municípios do recorte |Consultar quadro original|77|
| Posições lógicas no diagnóstico |Não se aplica|71|
| Posições marcadas “aguardando fonte” |Não se aplica|0|

A geração real é o arquivo de **92 páginas**, não o primeiro ensaio de 88 páginas citado no plano antigo, nem o piloto sintético de 49 páginas. Ter 40 gráficos nativos e zero posições “aguardando fonte” não prova equivalência visual nem cobertura temporal completa: há células `null` nos gráficos e acumulados.

Identificação dos arquivos inspecionados (SHA-256):

- Original: `6b4ec81f4b74f988472a8f5d8f6174c0a88aba7654ef76ac03dc7787dfa2daed`.
- Gerado: `92a45e453d69b12a71a45955678f54542c4c0a52f5193699ea9fbe99101f36cd`.

## 3. Diferenças identificadas no Sul e correções de família para todas as regiões

| Prioridade | Original → gerado real | Diferença observada | Correção e conferência |
|---|---|---|---|
| P0 |11 → 9 · Cidades analisadas|O gerado mostra apenas nomes por UF, em ordem alfabética. Faltam população, `% Part. Total` estadual e cobertura populacional das cidades somadas.|Recompor três colunas por bloco: Cidade, População, % Part. Total da UF. Ordenar dentro de cada UF pela participação exata, da maior para a menor. Incluir o resumo de cobertura por UF e fonte/data-base.|
| P0 |16–18 → 14–16 · Destaques geral/MCMV/luxo|Títulos abreviados, tabela genérica muito larga, sem setas, sem leitura comercial dos comparativos.|Recuperar títulos completos, badge e cores da família; tabela central compacta, coluna de comparação cinza, valores e setas verdes/vermelhas. Frase/manchete derivada das comparações válidas.|
| P0 |20 → 18 · Unidades lançadas por trimestre|Faltam colchete anual, seta do trimestre anterior e seta do acumulado. Valores aparecem acima das barras; no acumulado há quebra de rótulo numérico. Há competências vazias sem destaque suficiente da ausência.|Restaurar composição original, valores internos com contraste, separação do acumulado, escala/espaçamento e comparativos sobrepostos. Identificar lacunas explicitamente, sem desenhar barra zero ou inventar comparação.|
| P0 |22 → 20; 26 → 24; 28 → 26 · VGL, vendas e VGV|Os mesmos detalhes comerciais estão ausentes. No VGV real, 2T2026 e acumulados não têm valor disponível.|Aplicar a mesma família visual aos quatro quadros; tratar origem das ausências separadamente do desenho. Colchetes e setas só aparecem quando suas duas bases são válidas.|
| P0 |31 → 29 · Divisória comparativa|A captura mostra texto residual (“E”) misturado ao título novo, cortado e desalinhado.|Eliminar texto antigo da arte antes de inserir o novo; reaproveitar camadas originais sem título. Não tentar resolver com retângulo branco que cobre apenas parte do texto. Conferir título completo, recorte da foto, logo e margens.|
| P0 |10,13,19,25,33,43 → 8,11,17,23,31,62 · Outras aberturas/divisórias|Usam o mesmo mecanismo de arte rasterizada e máscara; podem repetir o defeito de sobreposição.|Varrer todas as divisórias, não só a página 29. Arte original e texto dinâmico devem ser camadas separadas e verificadas no PPTX renderizado.|
| P1 |14–15 → 12–13 · Resumo geral|Texto mais técnico e genérico, sem a mesma hierarquia de notícia/indicador do original.|Preservar o título da seção e produzir chamadas com número, direção, recorte e comparação quando disponíveis. Manter tipografia, ênfases e espaçamento comercial; evitar “aumento de 0%”.|
| P1 |21,23,27,29 → 19,21,25,27 · Composição por padrão|Ordem das séries e categorias do arquivo real não acompanha necessariamente a leitura do original; há lacunas em áreas empilhadas.|Fixar ordem/cores por família e preservar categorias desconhecidas identificadas. Conferir legenda, percentuais internos, contraste e base de participação por trimestre; não ligar uma área por cima de competência ausente.|
| P1 |24,30 → 22,28 · Quadros por estado|Verificar densidade de cabeçalhos, total, três variações, intervalos e unidade. “Passar no teste” não basta para legibilidade.|Reproduzir cabeçalhos e hierarquia do original; garantir que título, tabela e total caibam sem cortar texto. Comparativos: trimestre anterior, mesmo trimestre anterior e acumulado equivalente.|
| P1 |32 → 30 · Lançamentos, vendas e estoque|Comparar legenda, empilhamento, rótulos, cores e chamadas de variação, além da presença do gráfico.|Distinguir fluxos do trimestre de estoque do fechamento; recuperar a leitura gráfica original sem misturar acumulado e fotografia.|
| P1 |34–37 → 32–35 · Oferta por padrão e tipologia|Conferir valores, percentuais, categorias, totais e destaques de participação; não usar só uma tabela genérica para todos os quadros.|Restaurar hierarquia de cada família; manter padrões brutos quando exigidos e explicar base incompleta no diagnóstico.|
| P1 |38 → 36 · Preço por m²|Conferir linha da média, cores, rótulos, percentuais de desvio e legibilidade. A comparação do quadro original é com a média simultânea correspondente.|Não confundir desvio em relação à média regional com valorização anual. Preservar números do preço no período, linha média e unidade R$/m².|
| P1 |39 → 37 · Comparação por UF|Conferir títulos, três mapas, legenda e faixas de cores; os valores precisam usar períodos equivalentes.|Recuperar leitura das variações com valores e sinais identificáveis. A fonte demográfica não determina o recorte de mercado.|
| P1 |40–42 → 38–61 · Rankings|A geração espalha os três rankings por 24 páginas, inclusive continuações com muitos zeros. O original é editorialmente mais compacto.|Reproduzir o recorte mostrado na referência (Top 10 quando essa for a regra), com participação/pizza quando aplicável. Demais municípios continuam na conferência CSV; continuações só quando justificadas pela apresentação acordada.|
| P1 |44–49 → bloco após 62 · Mapas das capitais|A quantidade de páginas muda com a base real e a divisão dos pontos; não comparar com o mapa sintético de 65 projetos como prova do mapa real.|Conferir cada capital, preço/faixa/legenda, sobreposições, recorte e continuação. Manter coordenadas, não deslocar nem descartar pontos para imitar a referência. Justificar as continuações no diagnóstico.|
| P2 |50–53 → bloco final · Institucional/encerramento|Preservar artes e conteúdos aprovados, verificando posição e legibilidade após ajustes anteriores.|Não deixar continuações empurrarem a contracapa para o meio do material; não reintroduzir documentário e Anuário, que foram excluídos explicitamente.|

## 4. Regras específicas da correção

### 4.1 Cidades, população e participação estadual

- O denominador é a **população inteira da UF**, não a soma dos municípios monitorados: `população municipal / população estadual × 100`.
- A cobertura do conjunto é `soma das populações dos municípios analisados da UF / população estadual × 100`. Mostrar a frase comercial de cobertura, como na referência.
- Usar o mesmo produto, ano e revisão do IBGE para município e estado. Ordenar pelo valor exato; arredondar somente a exibição (uma casa decimal na participação).
- Empates usam nome; ausência não vira zero, não elimina município e aparece depois dos registros com base conhecida. Se houver cidade sem população identificada, a cobertura deve ser explicitamente parcial, sem afirmar total completo.
- O catálogo GeoApiScopeEngine continua sendo a única lista de municípios autorizados. O IBGE enriquece essas linhas; não acrescenta cidades nem serve de fallback ao catálogo.
- A referência usa Censo 2022. Há revisões: Curitiba aparece com 1.773.733 na imagem antiga e 1.773.718 na tabela oficial consultada. Não alterar número para “bater” visualmente. Identificar versão/data-base e aceitar diferença documentada.
- Preparação já feita, ainda **não integrada à interface**: `scripts/diagnostics/imprensa-population-source.py` e `src/features/relatorios-institucionais/modelo-02/population-2022.json`, com 27 UFs e 5.570 municípios. As somas municipais foram conferidas com o total da própria UF. Origem: [IBGE/SIDRA, tabela 4714, variável 93, 2022](https://sidra.ibge.gov.br/tabela/4714).

### 4.2 Destaques, títulos e manchetes

Preservar a nomenclatura completa, por exemplo:

- **Destaques residencial vertical — Lançamentos, vendas, oferta final**.
- **Destaques residencial vertical MCMV — Lançamentos, vendas, oferta final**.
- **Destaques residencial vertical luxo — Lançamentos, vendas, oferta final**.

A badge e a cor acompanham a família. A convenção global de padrões permanece: Compactos; MCMV; Médio Padrão; Luxo. Não mudar o de-para para reproduzir nomenclatura histórica.

A tabela deve identificar comparações reais: trimestre anterior (com número/ano explícitos), mesmo trimestre do ano anterior e acumulado equivalente. Para 3T, comparar janeiro–setembro nos dois anos; não rotular um acumulado parcial como se fosse o ano completo.

Seta verde para variação positiva; vermelha para negativa; zero sem seta de crescimento/queda; valor indisponível com “—” e sem direção. As setas e a tabela devem permanecer editáveis no PPTX.

As chamadas devem parecer notícia, mantendo suporte numérico. Exemplos condicionais: “Lançamentos e vendas recuam na Região Sul”, ou “Lançamentos avançam e vendas recuam na Região Sul”. Usar apenas se as comparações válidas mostrarem isso. Não inventar retomada, recorde, liderança ou causalidade. Quando faltar uma base, usar apenas os indicadores conhecidos, sem concluir tendência a partir de lacuna.

### 4.3 Séries trimestrais e acumulados

- Colchete do comparativo anual, seta horizontal do trimestre anterior e seta do acumulado devem usar as mesmas células de cálculo do diagnóstico/CSV.
- Barras trimestrais e acumulados têm áreas separadas, alinhamento, rótulos e cores equivalentes à referência. Valores internos devem ter contraste com a cor da barra e não quebrar linha.
- A precisão visual de R$ milhões deve seguir a família do original; os dados completos e a precisão de cálculo continuam no diagnóstico, CSV e planilha embutida do gráfico.
- A prévia e o gráfico nativo não podem usar escalas, rótulos ou posições incompatíveis. Confirmar layout interno do gráfico no PowerPoint, não só o retângulo externo do componente SVG.
- A comparação entre competências diferentes não exige alturas iguais às do original; exige a mesma leitura gráfica com os números do período selecionado.

### 4.4 Lacunas reais não são defeito puramente visual

O PPTX real confirma, entre outros pontos:

- Lançamentos por trimestre: três primeiras competências da janela de nove estão sem valor; acumulado anterior indisponível.
- VGV por trimestre: também há lacunas antigas, 2T2026 indisponível e os dois acumulados sem valor.
- O diagnóstico registra ressalvas históricas de municípios como Estrela, Lajeado e Santa Cruz do Sul. É necessário separar falta de dado da API, calendário de pesquisa, fotografia inválida e campo monetário ausente antes de qualquer mudança de cálculo.

Não preencher com zero, somar silenciosamente só os municípios completos, repetir dado de outro período ou usar preço cadastral atual para completar histórico. Se a base não permitir recompor a série, preservar as competências e mostrar a ausência de modo explícito e discreto. A anotação de comparação correspondente também fica indisponível.

A regra atual de status permite quadro “disponível” com algumas células preenchidas. A interface/diagnóstico precisa distinguir **disponível parcial** de série completa; “0 aguardando fonte” não deve ser interpretado como “todos os números presentes”. Não mudar o dado para eliminar o aviso.

## 5. Onde implementar

Caminhos relativos a `src/features/relatorios-institucionais/modelo-02/`:

| Arquivo | Responsabilidade nesta correção |
|---|---|
| `ReportSlide.tsx` | Composição, títulos, cidades, destaques e divisórias; remover sobreposição e preservar hierarquia do original. |
| `presentation.ts` | Contrato visual por família, ordem, cores e paginação; não agrupar layouts diferentes sob a mesma apresentação genérica. |
| `Chart.tsx` | Prévia das séries, rótulos internos, legenda, escalas, lacunas e anotações gráficas. |
| `native-charts.ts` | Gráficos nativos, fontes/tamanho/posição de labels, layout interno, precisão de exibição e manutenção de células vazias no XLSX. |
| `calculate.ts` | Valores dos comparativos, intervalos equivalentes, ordenação de população, manchetes determinísticas e status de cobertura. |
| `diagnostic.ts` | Fonte/data-base/denominador, população/participações, comparativos, lacunas e rastreabilidade CSV/JSON. |
| `Exports.tsx` | Consumir a mesma apresentação da prévia; verificar tabela/texto/seta/gráfico editáveis e descarte de exportação obsoleta. |
| `assets/editorial/` | Reutilizar artes originais por camadas, sem reaproveitar título antigo ocultado só parcialmente. |

Manter `ReportLoading`/`ReportGenerationPanel`, `ReportSlideControls`, rota canônica e alias existentes. Não alterar formulário/regras do Modelo 03, Corretor, Curitiba ou Monday nesta frente.

## 6. Sequência de execução e critérios de aceite

1. Congelar cópias dos cinco originais e da saída real Sul identificada acima. Usar o Sul para reproduzir os defeitos observados e inventariar a mesma família nas outras quatro matrizes, mantendo os originais intactos.
2. Corrigir primeiro a divisória 31→29 e varrer todas as divisórias. Aceite: nenhum glifo antigo, título cortado ou texto sobreposto; foto/logo/cores com composição original.
3. Corrigir cidades e os três destaques. Aceite: população e participação corretas no mesmo ano/fonte, ordenação decrescente por UF, cobertura coerente, títulos completos, badges, setas e manchetes sustentadas por dados.
4. Fechar a família trimestral em 20→18. Conferir percentuais, geometria, rótulos internos e acumulados; depois aplicar a VGL, vendas e VGV, incluindo o caso real com lacuna.
5. Varrer áreas, quadros UF, preços, mapas comparativos e rankings. Documentar cada diferença frente ao original, sem usar a quantidade de slides como único aceite.
6. Gerar pelo sistema uma nova saída de **cada uma das cinco regiões**, com competência e recorte autorizados. Para o Sul, repetir 3T2026. Criar pares **original regional / saída real anterior quando disponível / nova prévia / novo PPTX renderizado** para cada família alterada. Guardar os pares por região, data e commit; identificar quando não existir uma saída anterior real.
7. Abrir o novo PPTX no PowerPoint. Editar uma série e confirmar seu valor exibido, uma célula de tabela, um título e uma seta. Conferir a correspondência de dados com CSV/JSON e planilha embutida, inclusive `null` versus zero.
8. Conferir o catálogo autorizado específico de cada região, totais por UF, capitais e continuações. Os77municípios são apenas o recorte observado no Sul, não uma meta para as demais regiões. Reexecutar estados de carregamento, erro, vazio e cancelamento quando afetados.
9. Atualizar documento vivo e registro de execução **com as diferenças que restarem**, rodar tipos/lint/build e testes proporcionais. Testes sintéticos são regressão, não aceite visual do arquivo real.
10. Fechar uma matriz de aceite para **Sul, Sudeste, Nordeste, Norte e Centro-Oeste**. A implementação dos padrões compartilhados deve atender as cinco desde a correção; a conferência do Sul é um caso de regressão, não uma condição que adia as demais. Publicação e homologação devem ser registradas como eventos distintos.

### Não considerar concluído por

- build e testes aprovados;
- ZIP do PPTX válido;
- presença de gráficos nativos;
- nenhuma fonte bloqueada no resumo;
- renderização sem crash;
- comparação apenas com fixture sintética;
- mesma quantidade de páginas.

O aceite é conseguir ler a mesma informação na mesma sequência editorial, com detalhes gráficos equivalentes ao original, números rastreáveis da competência escolhida e diferenças de fonte/cobertura devidamente identificadas.

### Matriz mínima de aceite regional

| Região | População/%/ordem | Títulos/manchetes/divisórias | Gráficos/setas/rótulos | Quadros exclusivos/capitais | Prévia e PPTX real conferidos |
|---|---|---|---|---|---|
| Sul |Pendente|Pendente|Pendente|Pendente|Pendente|
| Sudeste |Pendente|Pendente|Pendente|Pendente|Pendente|
| Nordeste |Pendente|Pendente|Pendente|Pendente|Pendente|
| Norte |Pendente|Pendente|Pendente|Pendente|Pendente|
| Centro-Oeste |Pendente|Pendente|Pendente|Pendente|Pendente|

Marcar apenas com evidência da região correspondente. Um teste visual do Sul não aprova automaticamente as outras quatro regiões.

## 7. Pendências na entrega deste MD

- Correções visuais, de população, setas, manchetes e títulos nas **cinco regiões**: **não implementadas nesta rodada**.
- Novas gerações reais corrigidas e pares visuais das **cinco regiões**: pendentes.
- Preparação IBGE: disponível localmente, ainda não integrada nem homologada no material.
- Verificação feita para este MD: leitura estrutural dos dois PPTX, auditoria embutida e capturas fornecidas pelo usuário; não se declara nova homologação visual das 92 páginas.
- A tentativa anterior de navegador não analisou a pasta Auditorias; tratou-se de um equívoco de localização já corrigido. Esta análise usa os arquivos locais indicados pelo usuário.

## 8. Execução — 26/11/2026 (Claude, a pedido do usuário)

Implementado no código compartilhado, portanto vale para **Sul, Sudeste, Nordeste, Norte e Centro-Oeste**. Conferência feita com **mercado sintético** (harness interceptado), não com dados reais. **O aceite com saídas reais fica com o usuário, por decisão dele nesta sessão.** A matriz de aceite da §6 continua toda "Pendente".

| Família (§3) | Situação | Como |
|---|---|---|
| Divisórias 10/13/19/25/31/33/43 | Implementada | `scripts/diagnostics/modelo02-section-art.ps1` reexporta, via PowerPoint, as 35 artes (5 regiões × 7) sem título, barra e número de página do original. O runtime escreve o título com a redação original, idêntica nas cinco matrizes. Não há mais máscara branca parcial. |
| Cidades analisadas | Implementada | Colunas Cidade · População · % Part. Total UF e frase de cobertura por UF (IBGE Censo 2022, SIDRA 4714, `population.ts`). Denominador = população inteira da UF. Ordenação decrescente pela participação exata; sem correspondência no IBGE = "—", ao final, cobertura declarada parcial. Até 3 UFs: uma por coluna; acima disso, blocos empilhados; até 28 linhas por coluna. |
| Destaques geral/MCMV/luxo | Implementada | Títulos completos, selo e cor da família (verde, #FFC000, salmão), tabela compacta nativa, setas verde/vermelha editáveis (nenhuma para 0% ou "—"). Rótulos `3T2025 X 3T2026`, `2T2026 X 3T2026`, `JAN–SET/2025 X JAN–SET/2026` (ano cheio só no 4T). Manchete e frases determinísticas (`highlightText`), só com comparações válidas. |
| Séries trimestrais (unidades, VGL, vendas, VGV) | Implementada | Geometria única (`columnGeometry`) para a prévia, o gráfico nativo (área interna manual, escala e gap fixos) e as anotações. Colchete anual, seta do trimestre anterior e seta do acumulado (`TrendMarks`), desenhados acima do gráfico nativo no PPTX. Rótulos internos com contraste por barra e sem quebra (`wrap="none"`). "Sem dado" explícito e comparação suprimida quando falta base. VGL/VGV em R$ milhões inteiros (1 casa abaixo de 100). |
| Resumo geral | Implementada | Lead em negrito no estilo do original; zero = "estabilidade"; sem base = "sem base comparável"; caracterização da oferta por família. |
| Composição por padrão | Parcial | Ordem fixa Compactos, MCMV, Médio Padrão, Luxo, depois as desconhecidas; contraste dos rótulos. Revisão visual fina pendente. |
| Rankings | Implementada | Títulos do original (`Unidades lançadas \| Luxo \| Jan–Set/2026`, `Maior R$/m² médio \| 3T2026`), Top 10 em uma página, barras de cima para baixo com rótulo interno, pizza com "Outros" e rótulo de cidade + %. Lista completa no CSV. |
| Quadros por estado (24/30) | Implementada (2ª rodada) | Nomes completos dos estados em ordem alfabética, cabeçalhos com janelas equivalentes (`Variação (%) 2T26 X 3T26`, `Jan–Set/25 X Jan–Set/26`), acumulados em negrito, total em cinza e frase gerada pela variação acumulada (`stateSentence`; estado sem base é nomeado, nunca inferido). |
| Lançamentos, vendas e estoque (32) | Implementada (2ª rodada) | Barras agrupadas (antes empilhadas) com rótulo interno, mesmo trimestre um ano antes × atual; painel com legenda "3T2025 X 3T2026" e ícone/cor/% por indicador; "Sem base comparável" quando falta base. |
| Oferta por padrão/tipologia (34–37) | Implementada (2ª rodada) | Cabeçalho "Padrão/ Estado" ou "Tipologia/ Estado", estados por extenso, "Total Sul", coluna "Part. Total Sul (%)" com contorno, total geral em cinza, cabeçalho amarelo nas participações por UF e destaque calculado. Tipologias numéricas viram "N dormitórios". **Omitida a coluna "Faixa de valores (R$)":** é definição datada do 4T2025 (teto MCMV) e não tem fonte atual confirmada. |
| Preço por m² (38 e capitais NE) | Implementada (2ª rodada) | Barras com valor interno sem decimais, linha da média simultânea com valor na ponta, desvio por barra com seta verde/vermelha (`DeviationMarks`, sobre o gráfico nativo, mesma geometria). Legenda passou a ser camada editável. Desvio = em relação à média simultânea, não valorização anual. |
| Comparação por UF (39) | Implementada (2ª rodada) | Seis faixas e legenda do original (+ "Sem base comparável" quando houver), título "Lançamentos x vendas x oferta - 2025 x 2026", legendas por mapa com as janelas equivalentes e selo. Até 4 UFs: valor com ▲/▼ no mapa; acima disso (Nordeste, Norte), sigla no mapa e valores em lista abaixo, para não sobrepor. |
| Mapas das capitais (44–49) | Implementada (2ª rodada) | Selo mostarda em caixa alta e legenda "RANGE POR R$/M²" do original. Pontos, faixas e continuações já seguiam o original; as contagens de cobertura foram para o rodapé. O QR code "Saiba mais" do original não foi reproduzido (ativo datado). |
| Institucional/encerramento (50–53) | Checado | Sem alteração; artes aprovadas preservadas e contracapa no final. |
| Disponível parcial | Implementada | `slide.coverage`; `summary.partial`/`partialIds` no JSON; aviso na página e na ressalva do slide. |

Correção compartilhada: `native-pptx.ts` passa a centralizar verticalmente as células de tabela (`tcPr anchor="ctr"`) e aceita uma camada pintada depois dos gráficos nativos (`deferSelector`), sem alterar o comportamento padrão dos demais relatórios.

Evidência local (ignorada pelo Git): `.local-inputs/relatorios-lucas/modelo-02/visual-2026-11-26-v3/`, com prévias, JSON/CSV/PPTX das cinco regiões, renderização PowerPoint `pptx-<região>/` e `office-editabilidade.json` (título, tabela e série editados com sucesso na cópia Sul). A edição de uma seta não foi testada por script.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`. Referência documental; nenhuma escrita no Monday.

## Apêndice — mapa completo do caso real Sul usado na comparação

Os números da primeira coluna são as posições originais, preservadas no diagnóstico. A segunda coluna usa a página física do PPTX real de Auditorias. As listas explicitam exclusões, agrupamentos e continuações; não equivalem a aprovação visual.

| Original Sul | Páginas no gerado real | Quadro / chave | Miniatura original |
|---:|---|---|---|
|1|1|4º TRIMESTRE/2025 · `cover`|[Ver 1](miniaturas/sul-01.jpg)|
|2|2|Sobre a Brain · `about-brain`|[Ver 2](miniaturas/sul-02.jpg)|
|3|3|Nossa atuação · `brain-studies`|[Ver 3](miniaturas/sul-03.jpg)|
|4|4|Grupo Brain · `brain-group`|[Ver 4](miniaturas/sul-04.jpg)|
|5|5|Estudos Geobrain · `geobrain-studies`|[Ver 5](miniaturas/sul-05.jpg)|
|6|6|Plataforma Geobrain · `geobrain-platform`|[Ver 6](miniaturas/sul-06.jpg)|
|7|7|Aplicativo Geobrain · `geobrain-app`|[Ver 7](miniaturas/sul-07.jpg)|
|8|Excluído explicitamente|Anuário de Cases de Sucesso · `excluded-yearbook`|[Ver 8](miniaturas/sul-08.jpg)|
|9|Excluído explicitamente|Documentário Terreno de Mudanças · `excluded-documentary`|[Ver 9](miniaturas/sul-09.jpg)|
|10|8|MERCADO IMOBILIÁRIO COMPARATIVO  REGIÃO SUL · `regional-opening`|[Ver 10](miniaturas/sul-10.jpg)|
|11|9|Cidades analisadas · `scope`|[Ver 11](miniaturas/sul-11.jpg)|
|12|10|Objetivos e metodologia · `methodology`|[Ver 12](miniaturas/sul-12.jpg)|
|13|11|Destaques · `section-highlights`|[Ver 13](miniaturas/sul-13.jpg)|
|14|12|Resumo geral · `summary`|[Ver 14](miniaturas/sul-14.jpg)|
|15|13|Resumo geral · preços e segmentos · `summary-prices`|[Ver 15](miniaturas/sul-15.jpg)|
|16|14|Destaques residencial vertical - Lançamentos, vendas, oferta final · `highlights-Residencial vertical`|[Ver 16](miniaturas/sul-16.jpg)|
|17|15|Destaques residencial vertical MCMV - Lançamentos, vendas, oferta final · `highlights-MCMV`|[Ver 17](miniaturas/sul-17.jpg)|
|18|16|Destaques residencial vertical luxo - Lançamentos, vendas, oferta Final · `highlights-Luxo`|[Ver 18](miniaturas/sul-18.jpg)|
|19|17|section-releases · `section-releases`|[Ver 19](miniaturas/sul-19.jpg)|
|20|18|Unidades lançadas por trimestre · `releases-units-quarters`|[Ver 20](miniaturas/sul-20.jpg)|
|21|19|Unidades lançadas por padrão · `releases-units-standards`|[Ver 21](miniaturas/sul-21.jpg)|
|22|20|VGL por trimestre (em R$ milhões) · `releases-money-quarters`|[Ver 22](miniaturas/sul-22.jpg)|
|23|21|VGL por padrão · `releases-money-standards`|[Ver 23](miniaturas/sul-23.jpg)|
|24|22|Unidades lançadas - Por estado · `releases-states`|[Ver 24](miniaturas/sul-24.jpg)|
|25|23|section-sales · `section-sales`|[Ver 25](miniaturas/sul-25.jpg)|
|26|24|Unidades vendidas por trimestre · `sales-units-quarters`|[Ver 26](miniaturas/sul-26.jpg)|
|27|25|Unidades vendidas por padrão · `sales-units-standards`|[Ver 27](miniaturas/sul-27.jpg)|
|28|26|VGV por trimestre (em R$ milhões) · `sales-money-quarters`|[Ver 28](miniaturas/sul-28.jpg)|
|29|27|VGV por padrão · `sales-money-standards`|[Ver 29](miniaturas/sul-29.jpg)|
|30|28|Unidades vendidas - Por estados · `sales-states`|[Ver 30](miniaturas/sul-30.jpg)|
|31|29|COMPARATIVO LANÇAMENTOS, VENDAS E ESTOQUE REGIÃO SUL · `section-comparison`|[Ver 31](miniaturas/sul-31.jpg)|
|32|30|Lançamentos, vendas e estoque · `comparison`|[Ver 32](miniaturas/sul-32.jpg)|
|33|31|ANÁLISE GERAL · `section-analysis`|[Ver 33](miniaturas/sul-33.jpg)|
|34|32|Oferta final por padrão · `stock-Padrão`|[Ver 34](miniaturas/sul-34.jpg)|
|35|33|Oferta final por padrão · `stock-Padrão-states`|[Ver 35](miniaturas/sul-35.jpg)|
|36|34|Oferta final por tipologia · `stock-Tipologia`|[Ver 36](miniaturas/sul-36.jpg)|
|37|35|Oferta final por tipologia · `stock-Tipologia-states`|[Ver 37](miniaturas/sul-37.jpg)|
|38|36|Preço por m² privativo geral (R$/m²) - Residencial vertical · `meter-states`|[Ver 38](miniaturas/sul-38.jpg)|
|39|37|RESIDENCIAL VERTICAL · `annual-state-comparison`|[Ver 39](miniaturas/sul-39.jpg)|
|40|38, 39, 40, 41, 42, 43, 44, 45|Unidades lançadas  /  Luxo e Super Luxo  /  2025 · `ranking-Luxo`|[Ver 40](miniaturas/sul-40.jpg)|
|41|46, 47, 48, 49, 50, 51, 52, 53|Unidades lançadas  /  Econômico  /  2025 · `ranking-MCMV`|[Ver 41](miniaturas/sul-41.jpg)|
|42|54, 55, 56, 57, 58, 59, 60, 61|Maior R$/m² médio  /  4T2025 · `ranking-meter`|[Ver 42](miniaturas/sul-42.jpg)|
|43|62|MAPAS DE LOCALIZAÇÃO · `section-maps`|[Ver 43](miniaturas/sul-43.jpg)|
|44|63, 64, 65, 66, 67, 68, 69, 70, 71|LOCALIZAÇÃO DOS EMPREENDIMENTOS · `map:CURITIBA`|[Ver 44](miniaturas/sul-44.jpg)|
|45|63, 64, 65, 66, 67, 68, 69, 70, 71|LOCALIZAÇÃO DOS EMPREENDIMENTOS · `map:CURITIBA`|[Ver 45](miniaturas/sul-45.jpg)|
|46|72, 73, 74, 75, 76, 77, 78, 79, 80|LOCALIZAÇÃO DOS EMPREENDIMENTOS · `map:FLORIANÓPOLIS`|[Ver 46](miniaturas/sul-46.jpg)|
|47|72, 73, 74, 75, 76, 77, 78, 79, 80|LOCALIZAÇÃO DOS EMPREENDIMENTOS · `map:FLORIANÓPOLIS`|[Ver 47](miniaturas/sul-47.jpg)|
|48|81, 82, 83, 84, 85, 86, 87, 88|LOCALIZAÇÃO DOS EMPREENDIMENTOS · `map:PORTO ALEGRE`|[Ver 48](miniaturas/sul-48.jpg)|
|49|81, 82, 83, 84, 85, 86, 87, 88|LOCALIZAÇÃO DOS EMPREENDIMENTOS · `map:PORTO ALEGRE`|[Ver 49](miniaturas/sul-49.jpg)|
|50|89|Equipe técnica · `team`|[Ver 50](miniaturas/sul-50.jpg)|
|51|90|Consultoria · `consulting`|[Ver 51](miniaturas/sul-51.jpg)|
|52|91|Aplicativo Brain · `institutional-app`|[Ver 52](miniaturas/sul-52.jpg)|
|53|92|Contracapa · `closing`|[Ver 53](miniaturas/sul-53.jpg)|
