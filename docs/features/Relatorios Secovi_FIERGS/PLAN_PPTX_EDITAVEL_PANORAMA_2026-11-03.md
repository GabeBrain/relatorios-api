# PowerPoint editável — Panorama FIERGS e Secovi

**Data:** 03/11/2026. **Estado:** plano preparado; implementação não iniciada.
**Objetivo:** permitir que Finoti e demais usuários editem textos, tabelas, séries e apresentação dos estudos no PowerPoint, mantendo os dados e o conteúdo aprovados. Esta é a fonte única desta evolução; o documento vivo do Rebrain aponta para ela.

## 1. Diagnóstico confirmado

- `src/features/panorama-secovi-fiergs/lib/pdf-export.ts`: `buildPanoramaPptx` captura cada página HTML com `html-to-image` e adiciona um único JPEG ocupando o slide. O PDF é produzido por captura equivalente, mas o PPTX não é convertido a partir do arquivo PDF: os dois saem do mesmo HTML. Um arquivo `.pptx` assim permite mover a imagem, mas não editar seus textos, tabelas ou dados de gráficos.
- `components/PanoramaExportHost.tsx` monta `PanoramaExportDeck`, obtém elementos `.panorama-report-page` e escolhe o gerador pelo formato. Atualmente tanto PDF quanto PPT dependem desse DOM. `export-store.ts` guarda job, cancelamento, progresso e confirmação de alertas; essa política deve ser preservada.
- `report/manifest.ts`, `report/fiergs-manifest.ts` e `panoramaManifestFor` governam páginas ativas, recortes livres, comparações, mapas e omissões. O manifesto oficial FIERGS tem 75 posições de referência, mas a saída tem quantidade variável; Secovi também possui omissões e comparações condicionais. Não programar exportação por quantidade fixa nem confundir posição de saída com slide oficial.
- A composição ainda está distribuída em `components/ReportPaginator.tsx`, `MarketSlides.tsx`, `CustomFiergsCovers.tsx`, helpers de domínio e CSS. Há transformações de apresentação no JSX — recortes de séries, formatações, comparativos, tabelas e barras — que precisam de seletores compartilhados para evitar uma segunda regra numérica.
- `pptxgenjs` já consta no projeto (`^4.0.1`). Não é preciso criar backend, converter PDF ou trocar endpoint para produzir objetos nativos.
- A referência atual da POC está em `SE/Plataforma/sandbox-brain/modules/vocacionais/src/report/`, e não no checkout legado `Vocacionais/poc-vocacionais`, que aponta para a consolidação no Sandbox. Em `render-pptx.ts`, `renderDiegoPptx` usa `addText`, `addTable`, `addShape`, `addChart`, notas e master; gráficos recebem séries e geram planilhas embutidas. `contract.ts`, `build-report.ts`, `pagination.ts` e `integrity.ts` separam pacote, dados, paginação e renderização. `report.test.ts` inspeciona XML, tabelas, gráficos, XLSX embutido e cancelamento.
- Reaproveitar a estratégia da POC, sem importar suas regras de mercado, textos consultivos, limites de páginas ou notas explicativas para o material FIERGS/Secovi. Não criar dependência de build de um checkout vizinho.
- Artes FIERGS hoje chegam por `assets/fiergs/index.ts` como PNG/JPEG; há mapas e fundos. O próprio material original contém elementos rasterizados. Ter um PPTX de origem não prova que cada arte dele é editável.
- Evidência histórica: `ANALISE_automatizacao_panorama.md`, seção 3, já distinguia gerar gráficos nativos de reconstruir páginas-imagem. Esse diagnóstico não comprova implementação nem substitui este plano.

### Baseline e limites desta inspeção

- Rebrain local: `f5d4ba6`; remoto consultado em 03/11: `origin/main` em `028ee1a`, 12 commits à frente do local, concentrados em SP Institucional e documentação. Árvore local contém edições anteriores em evidências/capas, estimativas e `LIVE_rebrain.md`, além de material não rastreado do Corretor. Não houve pull, merge ou sobrescrita dessas alterações nesta inspeção.
- Sandbox consultado somente para leitura: `73e8cf4`. Nenhum código desse projeto foi alterado ou ensaio nele executado.
- FIERGS tem aceite de uso de Juliana em 28/10, registrado em `LIVE_rebrain.md`; isso permanece válido para a entrega anterior e não homologa automaticamente a nova exportação editável.
- Inspeção de código e documentação: não foi feita geração real, chamada de API, abertura de arquivo no PowerPoint ou inspeção de uma exportação nova. Não declarar fidelidade visual ou compatibilidade Office já verificadas.

## 2. Contrato de entrega

1. **Textos dinâmicos:** títulos, cidades, período, sumário, fontes existentes, rótulos, totais, equipe variável e encerramentos em caixas editáveis. Não manter título/número duplicado em um fundo rasterizado.
2. **Tabelas:** células nativas editáveis, cabeçalhos, totais, unidades e sinal. Formatação condicional pode usar preenchimentos/retângulos nativos associados à célula. Barras de dados são decoração editável, não gráficos vinculados automaticamente às células.
3. **Gráficos analíticos:** gráficos Office nativos, com categorias, séries, dados numéricos e planilha embutida acessíveis em “Editar Dados”; incluem linhas, colunas, barras, combinações e distribuições presentes no manifesto. Não aprovar SVG/imagem de gráfico como equivalente editável.
4. **Comparativos e destaques:** tabelas ou pequenos gráficos nativos e textos editáveis. Usar rótulos vinculados ao gráfico quando suportados; anotações externas precisam ser identificadas na matriz de editabilidade, pois não recalculam ao editar dados no Office.
5. **Capas e divisórias:** mesmas regras territoriais do preset e recortes livres, títulos e lista de cidades editáveis, alinhamento e limite de texto previstos. Não inserir RM de Porto Alegre/10 cidades em um recorte diferente.
6. **Imagens legítimas:** fotos, logotipos e base cartográfica podem continuar imagens individuais substituíveis. Título, legenda e indicadores do mapa permanecem editáveis; geometria cartográfica e fotos não são prometidas como vetores editáveis. Sem redesenho automático do mapa depois da edição do arquivo.
7. **Institucional:** procurar fonte aprovada de 23 anos e ativos atuais, inspecionar editabilidade e origem por slide. Recriar em objetos nativos os textos e formas cuja reprodução seja verificável; imagens intrínsecas permanecem imagens. Toda lâmina institucional inteira ainda rasterizada deve constar na matriz, com motivo e decisão pendente de aceite. Não anunciar “todo o PowerPoint editável” enquanto houver essa exceção sem confirmação.
8. **Dados:** mesmo `PanoramaReportModel`, mesmo universo, janela, fechamento, unidades, horizontais com casas em condomínio, capacidades, preços e regras já aprovadas. Zero, nulo, indisponível e venda negativa continuam distintos. Sem recolher API ao baixar PPT nem converter texto formatado da tela de volta em número.
9. **PDF e espelho:** preservar o PDF atual. Manter espelho como alternativa explicitamente identificada durante a transição; o novo arquivo usa sufixo `-editavel.pptx` para não sobrescrever o espelho. Rótulo principal proposto: `Baixar PPT editável`; o espelho fica em ação secundária de exportação. Não mudar a navegação de Metodologia/Glossário/Fórmulas/Avisos.
10. **Avisos:** preservar a política atual de alertas, confirmação por job e controles de cobertura/proveniência. Não trazer de volta o bloqueio numérico absoluto nem declarar reconciliação fictícia. Falha de implementação do novo formato deve informar o motivo e manter PDF/espelho utilizáveis conforme as regras atuais, sem substituição silenciosa por imagem.
11. **Edição externa:** o arquivo é uma cópia editável. Alterações feitas pelo consultor no PowerPoint não atualizam a base, o relatório no site, o PDF original ou a auditoria CSV. Células de tabelas e caixas de resumo não se tornam fórmulas de Excel; não prometer recálculo geral após alterações manuais.

## 3. Arquitetura proposta

Fluxo: `PanoramaReportModel + manifesto ativo congelado + ativos aprovados → pacote de apresentação → renderizador PPTX nativo → arquivo`. PDF/espelho seguem no caminho atual de captura. O pacote é adaptador de apresentação, não novo cubo e não nova fonte numérica.

Organização sugerida dentro de `src/features/panorama-secovi-fiergs/`:

- `report/presentation/contract.ts`: páginas/blocos, IDs estáveis, unidade, estado da observação, referência à métrica, séries, células, notas técnicas e editabilidade por elemento.
- `report/presentation/build-package.ts`: pacote imutável a partir do modelo e manifesto fornecido; versão de schema/template e identificação da geração. Reusar hash/identidade existente se disponível; se novo hash for necessário, não incluir segredos nem carimbar a auditoria antiga como pertencente a dados editados depois.
- `report/presentation/selectors.ts` e seletores por família quando necessário: expor transformações hoje locais ao JSX. Migrar por família com teste de paridade; não refatorar todo o preview de uma vez.
- `lib/pptx/` com `render.ts`, `theme.ts`, `primitives.ts`, `charts.ts`, `tables.ts`, `assets.ts` e renderizadores por família: entrada sem DOM para dados/gráficos, importação dinâmica de `pptxgenjs`, coordenadas em polegadas, canvas 16:9, margens/fontes centralizadas e identificação por objeto.
- Registro exaustivo `page-kind → renderer`: cobrir referências dinâmicas FIERGS e Secovi, páginas adicionais por recorte e comparativos. Não usar somente `referenceSlide` se ela colidir entre entidades; identidade inclui entidade e tipo editorial.
- `export-store.ts`/host: distinguir formato de arquivo (`pptx`) de modalidade (`editable`/`mirror`); modalidade participa da chave do job, nome, progresso e resultado. Não chamar o PDF de `pptx-editable`. Confirmar/resetar alertas por job como hoje.
- Notas técnicas de slide podem guardar ID da página, referência de dados, geração, unidade e ativos rasterizados. Sem anexar credenciais, payloads brutos, identificadores privados desnecessários ou as notas explicativas que já decidimos manter fora do material. Dados de gráficos precisam do seu XLSX; não embutir o acervo bruto inteiro.

## 4. Execução por portões

### G0 — Base segura, inventário e gabarito do exportador

**Ações**

- Reler AGENTS aplicáveis e `SE/_Planejamento/AGORA.md`; conferir todos os remotes, branch, índice e árvore. Apresentar divergência atual antes de integrar os 12 commits SP ou qualquer delta novo. Com árvore suja ou divergente, pedir autorização para integração, sem reset/rebase publicado/stash geral.
- Preservar o plano e as alterações paralelas. Após integração autorizada, registrar SHA usado e conferir novas entradas LIVE. Não alterar SP Institucional, Dashboard, Validação, Excel API, Corretor, Sinduscon, estimador ou POC/Sandbox.
- Congelar manifesto e modelo de fixtures locais existentes ou sintéticas representativas, incluindo versões, assets disponíveis e nomes. Procurar `.local-inputs/` antes de gerar dados novos. Nenhum ensaio longo de API ou estudo real sem autorização.
- Inventariar cada tipo de página ativo de ambas as entidades: consumidor JSX, dados utilizados, natividade desejada, ativos, layout e implementação necessária. Usar referências oficiais como chave auxiliar; registrar páginas omitidas por regra e o motivo sem reintroduzi-las.
- Localizar fontes institucionais aprovadas; relacionar hash/origem/licença interna e se cada slide tem texto/vetor ou imagem. Não trocar por material desatualizado de 22 anos.
- Produzir em `.local-inputs/panorama-pptx-editavel-2026-11-03/` amostras brutas; guardar nesta fonte apenas resumo verificável e matriz pequena, sem acervo novo no Git.

**Saída/aceite:** inventário por tipo completo, lista de exceções rasterizadas explícita, nenhuma omissão analítica silenciosa, base Git e fixtures identificadas. Fixar o conteúdo da entrega antes de codificar renderizadores. Não considerar este portão cumprido apenas pelo plano.

### G1 — Contrato e corte vertical de prova

**Ações**

- Implementar pacote e resolução do manifesto uma única vez por geração/exportação; congelar disponibilidade de mapa, ordem, IDs e páginas. Usar a mesma decisão do preview, sem consultar ambiente/token de modo diferente a cada renderização.
- Criar tema/grade e primitivas de texto, célula, forma, imagem e gráfico. Medir o layout canônico existente; derivar posições proporcionalmente à página e fontes em pontos. Não assumir que pixels CSS e pontos Office são a mesma unidade.
- Construir prova com capa customizada, gráfico de preços com dados nulos/zero/negativos aplicáveis, comparativo temporal e tabela de oferta com total. Incluir exemplo FIERGS e Secovi.
- Reaproveitar o padrão de contrato/teste da POC sem copiar seu pacote, cálculos, limite de 100 páginas ou layout genérico sobre o desenho institucional homologado.
- Verificar chart XML e workbook reais; rótulos, escalas, unidade e precisão devem refletir o modelo, não strings arredondadas de exibição. Ausência vira célula/cache ausente e lacuna testada; zero numérico não pode desaparecer nem venda negativa ser truncada.

**Saída/aceite:** PPTX da prova válido, com texto/tabela/gráfico nativos, dados editáveis embutidos e igualdade exata ao modelo nas medidas brutas; primeira revisão visual antes de expandir. Se a biblioteca não representar um gráfico específico, registrar alternativa nativa verificável ou impedimento; não rasterizar escondido.

### G2 — Famílias analíticas completas

**Lote A:** lançamentos, vendas, trimestres, anos, acumulados 12 meses, padrões, tipologias e comparações trimestre/semestre/12 meses. Reutilizar seletores existentes como `fiergsPeriodComparisons`; não recalcular acumulados ou trocar janela.

**Lote B:** oferta e IVV, tabelas e gráficos de distribuição, coortes/ano de lançamento, matrizes e participação. Manter campos ocultos por ausência e a justificativa no sistema de avisos; zero/negativo continuam presentes. Barras condicionais e preenchimentos como formas/células nativas, com sinal além da cor.

**Lote C:** preço/m², ticket, média/mínimo/máximo por tipologia e padrão, inclusive séries de dormitórios, legendas e variações. Sem novo peso/média ou preenchimento de preço faltante. Rótulos sem sobreposição e unidade/escala no gráfico; teste de lacunas no workbook e nas caches XML.

**Lote D:** mercado vertical/horizontal, agrupamento horizontal com condomínios de casas, consolidado de produtos e médias existentes, maturidade/tempo médio, VGV e comparativos municipais. Preservar bases de oferta original/janela/fechamento e os seletores metodológicos aprovados.

**Para cada lote:** usar dados do pacote; mover apenas transformações de apresentação realmente duplicadas para seletores compartilhados; verificar paridade de valores do preview/modelo/PPTX; ampliar o registro de páginas suportadas e o teste exaustivo. Preservar ordenação e títulos oficiais. Não gerar gráficos a partir de imagens ou traçar cada barra como dezenas de formas alegando edição de dados.

**Saída/aceite:** 100% dos tipos de página analítica ativos em FIERGS e Secovi possuem renderizador nativo testado; nenhuma família analítica inteira como screenshot, nenhum gráfico sem dados embutidos, nenhum valor alterado para caber no layout.

### G3 — Capas, institucional, mapas e paginação

**Ações**

- Reproduzir identidade e composição dos dois produtos usando ativos/tokens aprovados. Ler System Design e guidelines ao alterar UI; copiar tokens sem mudanças se faltar a fundação, manter o escopo de aplicação e atualizar o mapa SE. Não aplicar o estilo da POC sobre o deck FIERGS.
- Capas editáveis para preset homologado, cidade isolada, duas cidades, conjunto ímpar/par e muitos nomes longos. Reusar `scope-identity.ts` e `custom-cover-layout.ts`, seus limites e distribuição; equipe, data e nomes não ficam fundidos ao fundo.
- Sumário/seções/números derivados do manifesto congelado; divisórias e créditos editáveis. Institucional de 23 anos conforme G0: reconstrução onde comprovável, exceções identificadas por asset/slide. Qualquer decisão editorial pendente fica registrada, sem alegar editabilidade completa.
- Mapas: reutilizar imagem pronta do recorte correto, ou preparar somente o ativo faltante com cancelamento/timeout; não recolher dados de mercado. Exportar título, legenda, símbolos e labels como elementos nativos quando possível, registrar base cartográfica como imagem. Não carregar token/URL assinada no conteúdo ou notas do PPTX.
- Tabelas densas: medir linhas/colunas e alturas, cabeçalhos, quebras, totais e nomes. Priorizar adequação dentro da página canônica; não truncar, usar fonte ilegível ou esconder linhas para fechar o slide. Se precisar de página de continuação, decidir explicitamente como manter manifesto compartilhado e PDF preservado antes de alterar paginação; não deixar `autoPage` criar slides fora do sumário.
- Verificar fontes disponíveis e fallback que não quebre medidas; não prometer fontes embutidas se não forem. Logotipos/fotos preservam proporção e qualidade.

**Saída/aceite:** sequência e recorte reais corretos, todos os objetos dentro da área útil, sem excesso de texto, paginação inesperada ou dado congelado no fundo. Matriz de editabilidade completa, com exceções visuais e pendências institucionais declaradas.

### G4 — Integração e experiência de exportação

**Ações**

- Adicionar PPT editável como ação principal e espelho como alternativa clara, reutilizando componentes atuais. Carregamento alterado deve usar `BrainLoadingState`, com fase/progresso reais, cancelamento, erro e nova tentativa. Sem progresso fictício até a serialização terminar.
- Separar host nativo do caminho de captura: não montar toda a árvore HTML só para exportar texto/tabela/gráfico; resolver apenas ativos de imagem necessários. Importar biblioteca pesada sob demanda. PDF/espelho mantêm o caminho homologado.
- Preservar `panoramaExportBlockReason` e confirmação de alertas da geração; formato/modalidade/relatório/controller distinguem jobs. Testar PDF→PPT editável→espelho e a ordem inversa no mesmo relatório, cancelamento durante montagem/serialização, erro seguido de repetição e troca de recorte, sem resultado tardio ou consentimento reaproveitado.
- Nomes pelo recorte/entidade/período já existentes com sufixo `-editavel.pptx`; metadados consistentes. Revogar object URLs sem perder download, liberar recursos e impedir dois jobs simultâneos.
- Desconexão/aba oculta: geração nativa deve dispensar captura/`requestAnimationFrame` para seus objetos. Isso reduz dependência do DOM, mas timers/serialização ainda podem sofrer limitação do navegador; não prometer worker/servidor ou independência completa da aba. Worker fica fora desta entrega, salvo necessidade demonstrada e nova decisão.

**Saída/aceite:** fluxo acessível e cancelável, dois modos PPT claramente distinguíveis, PDF/CSV preservados, sem consulta pesada adicional ou regressão do modal de consistência. Sem mudar regras de exportação para mascarar tipo de página não implementado.

### G5 — Regressão, fidelidade e edição real

**Testes automatizados proporcionais**

- Unitários do pacote/seletores: ordem e IDs, matrizes, unidade/precisão, totais, janela, colunas omitidas justificadas, nulos/zeros/vendas negativas, sem mutação do modelo. Comparar valores numéricos com o gabarito congelado; teste de chamadas em mocks deve garantir nenhuma nova coleta na exportação.
- Estruturais do arquivo gerado, não apenas mocks de `addChart`: ZIP/relacionamentos válidos; textos em `<a:t>`, tabelas em `<a:tbl>`, gráficos em `ppt/charts`, relações com workbooks `.xlsx` editáveis. Abrir XLSX embutidos e confrontar categoria/série/valor/unidade com o pacote e caches XML. Conferir que cada página analítica prevista contém o objeto esperado e não só uma imagem full-slide. Testar ausências e sinal negativo nos dados reais do arquivo.
- Regressões offline obrigatórias: FIERGS 2T2026 e 4T2025 preset; Porto Alegre e Gramado+Canela 1T2021–2T2026; Secovi/Piracicaba 1T2026 ou fixture institucional equivalente documentada; recortes livres de uma/duas/três/muitas cidades, nomes longos, sem horizontal, sem mapa e com campos incompletos. Dados brutos reais só quando já disponíveis/autorizados. Não inventar números de baseline de uma fixture sintética.
- Modal/store/host: testes focados existentes de metadados, PDF, alertas e chave de exportação, mais novos testes dos modos; tipos/lint/build do projeto após a fatia completa. Não rodar suites de Corretor/SP por rotina nem chamar API em regressão.
- Inspeção visual dos slides gerados renderizados e do PDF preservado: capas, institucional, comparativos, linha/acumulado, preços, tabela densa, horizontal e mapas, em ambas as entidades e ambos os períodos. Verificar corte/overflow, acentos, contraste, legendas, rótulos, fontes e ausência de duplicação de texto em fundos.

**PowerPoint real, com Gabriel/Finoti quando o ambiente exigir**

1. Abrir sem mensagem de reparo; editar e salvar/reabrir capa, período, equipe e uma célula de tabela.
2. Usar “Editar Dados” em preço/m², linha de vendas e gráfico de colunas; alterar valor em cópia e confirmar atualização do gráfico. Verificar zero, lacuna e negativo onde aplicáveis.
3. Mudar série/categoria, cor, fonte e posição; substituir foto/logo/mapa como imagem individual. Conferir que gráfico permanece gráfico depois de salvar.
4. Exportar a cópia editada para PDF pelo Office e conferir o resultado. Separar diferenças numéricas intencionais desse ensaio da baseline original.
5. Se automação Office/renderer compatível estiver indisponível, registrar limite e entregar o roteiro ao usuário; inspeção XML não equivale a teste de uso no PowerPoint. Compatibilidade com LibreOffice/Slides é adicional, não substitui o Office solicitado.

**Saída/aceite:** matriz modelo→preview/PDF→PPTX/workbook sem deltas não explicados, imagens permitidas identificadas, abertura e edição reais verificadas. Não declarar editabilidade/fidelidade homologadas só por build, geração de ZIP ou existência de gráfico.

### G6 — Publicação e aceite do novo formato

- Atualizar esta fonte com matriz e evidências pequenas, LIVE Rebrain com ponteiro/estado e diário/AGORA conforme regras SE; commits isolados por contrato, famílias, integração e validação, sempre com `git add` explícito.
- Conferir divergência e listar commits/arquivos que serão enviados. Push e publicação somente após autorização de Gabriel; não incluir mudanças paralelas.
- Após publicação autorizada, Gabriel gera FIERGS e Secovi no site, baixa os três formatos, CSV e confere o recorte real. Anexar hashes/versão e resultado ao registro, sem preservar token ou dados pessoais desnecessários.
- Solicitar conferência do novo PPTX por Gabriel/Finoti. Aceite anterior de Juliana para os números fica preservado; novo formato requer sua própria evidência de uso. Sem novo e-mail de correção numérica se não houve mudança numérica.

**Saída/aceite:** formato novo publicado e edição verificada no PowerPoint pelos usuários, limitações conhecidas aceitas. Se faltar ativo institucional nativo, deixar pendência nominal e não usar expressão “100% editável” para o conjunto inteiro.

## 5. Decisões e riscos que orientam a execução

- **Não é conversão PDF→PPT:** conversores e OCR não recuperam com segurança séries/células e poderiam alterar valores. Reconstruir apresentação a partir dos dados já corretos é a estratégia.
- **Fidelidade e edição:** desenho Office pode diferir em curvas, tipografia e rótulos de Recharts/HTML. Preservar números, hierarquia e identidade; discrepância visual relevante exige revisão, nunca compensação numérica.
- **Nenhuma nova metodologia:** não adotar as regras de barras/escala da POC indiscriminadamente, como mínimo zero em séries com valores negativos. Gráficos devem preservar sinais e lacunas, sem inflação de universo ou preenchimento de histórico.
- **Artes não se descompactam em objetos:** pode ser necessária reconstrução pontual ou confirmação de uma exceção rasterizada. Começar pelo inventário evita prometer editabilidade indiscriminada antes de conhecer a fonte.
- **Manutenção:** registro exaustivo de renderizadores/teste por tipo impede novas páginas no preview de ficarem ausentes do PPTX. Futuras famílias institucionais podem usar as primitivas, mas SP de Lucas e outros relatórios não entram automaticamente neste escopo.
- **Segurança e privacidade:** dados de gráficos embutidos são parte necessária do arquivo editável; não incluir históricos completos, segredos, cache de autenticação, planilha técnica ou auditoria bruta como anexo oculto. Quantidade de observações e campos só do recorte mostrado.
- **Política existente preservada:** avisos continuam na interface/auditoria, sem notas explicativas novas no PDF/PPT nem rótulos de confiabilidade/aprovação. Nada muda no aceite de dados de 28/10 por elaborar este plano.

## 6. CTA para implementação

> Execute `docs/features/Relatorios Secovi_FIERGS/PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md` pelos portões G0–G5. Primeiro confira remotos e alterações locais; apresente a divergência e peça autorização antes de integrar mudanças com a árvore suja ou divergente. Preserve alterações paralelas e não altere SP Institucional, Dashboard, Validação, Relatório API Excel, Corretor, Sinduscon, estimador ou POC/Sandbox. Gere o PowerPoint nativo a partir do mesmo modelo e manifesto, com textos/tabelas/gráficos editáveis e dados embutidos, preservando números, zeros, nulos, negativos, alertas e o PDF atual. Inventarie artes e mapas, registre toda exceção rasterizada e não use captura de gráficos como entrega editável. Execute testes focados e regressões offline FIERGS 2T2026/4T2025, recortes livres e Secovi, registre a matriz de paridade e faça commits isolados com `git add` explícito. Não faça coletas extensas, estudos reais ou push sem autorização. Se faltar acesso ao PowerPoint, entregue o roteiro de edição ao usuário e mantenha esse aceite pendente. Ao concluir, apresente evidências, limitações e commits que seriam publicados para autorizarmos G6.
