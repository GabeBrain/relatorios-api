# Implementação da revisão Finoti — Panorama FIERGS/Secovi — 04/11/2026

**Estado em 04/11:** G0–G6 implementados e verificados localmente; extratos R1/R2 gerados, publicação e conferência no site pendentes de autorização. Evidência estruturada: [matriz, hashes e verificações](EVIDENCIA_IMPLEMENTACAO_FINOTI_2026-11-04.json).
**Objetivo:** aplicar os contratos aprovados, revisar toda a apresentação e os cálculos afetados e produzir uma referência curta para conferência, com um segundo caderno somente para lacunas de cobertura do primeiro.
**Fonte de decisões:** [contrato D01–D14, anotações e inventário espacial](REVISAO_FINOTI_GRAMADO_CANELA_2026-11-03.md#contrato-de-ajustes--decisões-consolidadas). Este plano descreve execução/aceite; não redefine as escolhas de Gabriel.
**Referência do formato nativo:** [PowerPoint editável](PLAN_PPTX_EDITAVEL_PANORAMA_2026-11-03.md).

## 1. Baseline e fronteiras

- Código publicado observado: `5383e3c`; contrato fechado localmente em `669cdb0`. Fetch de04/11: `main` está quatro commits à frente e nenhum atrás de `origin/main`; existe somente `origin`. Repetir conferência no G0, porque esse estado é temporal.
- Alterações locais paralelas em documentos de recortes/capas, Estimativas, LIVE e pastas não rastreadas do Corretor e da revisão Finoti devem permanecer intactas. Staging explícito; em LIVE, incluir somente a entrada da execução. Não limpar, guardar globalmente ou enviar material bruto.
- Escopo funcional: Panorama FIERGS e Secovi, preservando diferenças de universo horizontal, IVV e demais políticas de cada produto. Não alterar Dashboard, Validação de Fechamento, Relatório API Excel, Corretor, Sinduscon ou SP Institucional.
- Implementação em `main`; sincronização de árvore suja/divergente e push dependem de autorização. Nenhum merge, push, publicação, mensagem externa ou alteração no Monday está autorizado pela criação deste plano.
- Não alterar números manualmente, fixar exceções por cidade/período, inserir filtro de outliers novo, suavizar séries ou trocar base histórica por janela para melhorar aparência.
- Recursos brutos, respostas HTTP, modelos, renders, PDF/PPT/CSV e scripts temporários em `.local-inputs/panorama-finoti-2026-11-04/`, ignorada. Evidência pequena, scripts reproduzíveis necessários e decisões ficam versionados. Nunca salvar token, cabeçalho de autenticação ou `.env` em evidências.

## 2. Estratégia de validação rápida: um principal e um complementar

### 2.1 O que foi efetivamente localizado

O inventário local `frozen-compilation.json`, em `.local-inputs/panorama-pptx-editavel-2026-11-03/`, registra dez modelos compilados em03/11:

- Canela: **67 páginas** em2T2026/4T2025; Gramado e Porto Alegre:68; conjuntos locais:69. Estes números são anteriores às mudanças deste plano, sem mapas adicionais dessa compilação, e não são promessa de tamanho final.
- Canela4T2025 tem98empreendimentos; Canela2T2026 tem102. Ambos são mono-cidade e têm a menor quantidade de páginas registrada;4T2025 reduz também volume de dados. Não houve varredura nacional para afirmar que Canela é o menor município possível.
- Gramado+Canela4T2025 registra três valores negativos nos gráficos; a mesma dupla2T2026 registra zero nesse inventário. Esse contraste serve a testes offline, sem fabricar negativos no estudo real.
- Os modelos em `.local-inputs/fiergs-incidente-20261027/after-contracts/` cobrem2T2026/4T2025. O PPT do Finoti cobre **1T2023–3T2026** e não contém o cubo numérico nativo da geração. Não reconstruir API/cubo a partir de imagens ou números transcritos desse PPT.
- Os arquivos `baseline-conjunto-*` do replay são **Canoas+Esteio+São Leopoldo**, não o preset oficial de dez cidades. O preset completo deve continuar coberto por testes existentes/sintéticos ou snapshots efetivamente encontrados, sem anunciar que essa baseline de três cidades equivale a ele.

### 2.2 R1 — referência principal, a menor já disponível

- **Origem:** Canela/RS,1T2021–4T2025, usando respostas locais congeladas e o motor atual. Empate de páginas resolvido pelo menor volume de empreendimentos.
- **Saída de revisão:** extrato técnico de **até12páginas**, em PDF e PPT editável, com CSV do escopo. Selecionar do manifesto efetivo páginas representativas: capa/identidade, abertura com período, série temporal/comparativos, distribuição, oferta por padrão, oferta por tipologia, preços mínimo/média/máximo, matriz área×tipologia, maturidade, quadro VGL/VGV, coorte horizontal e mapa. Se alguma família não existir nesse recorte, registrar a lacuna e não preencher com dado artificial.
- O extrato é um **caderno interno de QA**, identificado como extrato no nome/metadata/abertura técnica de validação. Não é um novo modo público nem uma redução do relatório comercial. A abertura técnica de QA não entra no modelo do cliente.
- Usar seletores e renderizadores reais de tela/PDF/PPT; escolher páginas por ID/família e conservar a relação com o manifesto completo. Não cortar cubo, alterar totais ou criar regra de omissão no produto para obter12páginas.
- CSV preserva toda a auditoria do escopo, mesmo quando o extrato mostra só uma seleção de páginas. Guardar manifesto completo, seleção e hash dos insumos junto da saída.
- Recalcular e compilar também o **manifesto completo** para detectar conteúdo ausente, órfãos, nomes inadequados e divergências estruturais. Não exportar automaticamente67páginas só para conferir o extrato.

### 2.3 R2 — complemento dirigido, condicionado à matriz de lacunas

- **Alvo preferencial:** Canela+Gramado/RS,1T2023–3T2026, o recorte exato da revisão Finoti. **Até8páginas** em PDF/PPT e CSV: somente o que R1 não comprovar — identidade de duas cidades, venda negativa, IVV série×tabela, extremos de preço no fechamento comentado, tabela densa e três mapas quando os três modos precisarem de confirmação própria.
- Não repetir abertura, tabelas ou gráficos já aprovados em R1 sem uma razão de cobertura. Se R1 e testes focados cobrirem tudo, não gerar R2 por rotina.
- Procurar primeiro os insumos3T2026 locais e verificar competências/linhagem. O replay antigo fixa a chave temporal em30/06/2026 para selecionar fechamentos históricos: **isso não comprova cobertura3T2026**. Ausência deve falhar explicitamente, sem fallback de rede disfarçado.
- Na execução ativada pelo CTA, se os insumos exatos estiverem ausentes e R2 for necessário, permitir **uma única coleta delimitada** do recorte Canela+Gramado1T2023–3T2026, pelo mesmo fluxo do site, com cache persistido e paginação necessária. Sem varrer outras cidades, dez municípios do preset ou períodos adicionais. Retries seguem o mecanismo existente, sem nova rodada integral repetida. Se credenciais/serviço impedirem ou a coleta se prolongar sem avanço, interromper essa coleta, registrar chamadas/estado e concluir as partes independentes; não improvisar um modelo3T2026 com dados2T2026.
- Essa coleta somente fica autorizada **quando Gabriel ativar o CTA com essa cláusula**; o planejamento atual não faz nenhuma consulta GeoBrain. Consultas pequenas à documentação/referência geográfica oficial podem ser necessárias para o mapa e devem ter origem/cache registrados.
- Para depurar negativos antes de qualquer coleta, usar Gramado+Canela4T2025 congelado. Isso é replay numérico/visual dirigido, não prova dos números3T2026 nem um terceiro estudo completo. Se usado como substituto provisório do caderno complementar, declarar3T2026 ainda não verificado.

### 2.4 Testes sem multiplicar relatórios

- FIERGS2T2026 e4T2025 seguem regressões obrigatórias **offline**, sem exportar um deck/PDF inteiro por baseline. Recalcular com fonte congelada e comparar métricas/guardas/avisos/manifestos; compilar apresentação quando relevante.
- Secovi tem teste sintético/fixture próprio do motor e regressão local disponível; não coletar um município SP só para duplicar o ensaio visual FIERGS.
- Casos raros (muitos nomes, nulo, zero, negativo, cobertura parcial, tabela extrema) usam fixtures pequenas e testes de componente/pacote. Dados sintéticos são identificados e nunca misturados aos CSV/valores reais de R1/R2.
- Não confundir **modelo salvo renderizado** com **cálculo reexecutado**. Mudanças de agregação/seleção precisam usar código TypeScript atual e entradas brutas ou contratos tipados suficientes; não usar um `.mjs` compilado antigo como se incorporasse a correção nova.

## 3. G0 — preparação e baseline reproduzível

1. Ler AGENTS, AGORA, contrato, documentos da feature, System Design, tokens, mapa de sistemas e guidelines do frontend. Confirmar todos os remotos/branch; `git fetch --all`, contadores e diffs. Não integrar remoto com árvore suja/divergente sem autorização.
2. Inventariar os insumos de R1, das duas regressões e do caso Finoti; SHA-256, competência máxima por fonte, datas de captura, origem, cidades, contagens e lacunas. Preservar snapshot antigo e gravar execução nova em pasta própria.
3. Reutilizar `scripts/diagnostics/fiergs-history-contract-replay.ts` como referência; adaptar runner com seleção de caso/período, cache-only real, pasta de saída e falha explícita para cache incompleto. Não reutilizar silenciosamente a troca de `end_period` para outro período.
4. Registrar antes do desenvolvimento os hashes das métricas que devem permanecer estáveis e das políticas/guardas. Construir matriz `Dxx / Fxx / família / teste / R1 / lacuna / R2 / acabamento do analista`.
5. Congelar o antes de R1 e as páginas específicas a conferir no R2; os PDFs/PPTX antigos são comparadores visuais, não contratos de API.

**Saída/portão:** baseline rastreável e custo limitado da validação definidos, sem alteração paralela incluída. Registrar estado de cada insumo em vez de declarar indisponibilidade geral por uma fonte faltante.

## 4. G1 — reconciliações e dependências antes dos indicadores

### 4.1 Disponibilidade e participação de empreendimentos

- Conferir cedo a necessidade dos insumos exatos3T2026 para as reconciliações de Finoti. Se indispensáveis, obter a única coleta delimitada prevista no CTA ainda neste portão, preservando a entrada para calcular antes/depois com a baseline e o código novo. Não esperar o fim dos ajustes para descobrir que faltava a base numérica; geração do caderno R2 continua condicionada à matriz de lacunas.
- Por categoria de tipologia, padrão e ano, listar oferta da janela, oferta histórica usada, estoque final, taxa observada/calculável e competência. Reconciliação dimensional antes de qualquer agregado.
- Definir helper puro de **média simples das taxas**: categorias finais válidas com pesos iguais; excluir total/subtotal; incluir zero observado; não imputar nulos/bases não positivas. Não usar média de médias nem razão dos totais.
- Exemplo sintético obrigatório: taxas0% e20% resultam em10%; categoria sem denominador não vira0%; um subtotal não é uma terceira categoria. Manter identificação explícita `Média das taxas` junto do resultado, inclusive se a linha contém totais das demais colunas.
- No percentual após Nº de Empreendimentos do slide35 comentado, provar identidade/unicidade da contagem por padrão e trocar numerador/denominador de unidades por empreendimentos, sem mexer na participação das unidades lançadas ao lado de sua própria coluna.

### 4.2 Universo dos preços e área

- Extrair linhagem dos extremos por empreendimento/tipologia/competência/estoque/preço/área antes e depois do filtro D10. Comparar extremos e médias sem copiar manualmente os valores do PPT.
- Seleção da fotografia até o fechamento, estoque positivo e validade específica de cada métrica. Sem dado futuro, estoque ausente transformado em positivo ou média simples de fallback quando não há pesos válidos.
- Se o preço baixo vier de linha sem estoque, demonstrar sua retirada da **estatística da oferta atual**; o registro histórico permanece no cubo/auditoria. Se continuar elegível, manter.50m² não dispara corte, alerta especial ou correção própria.
- Não aplicar o filtro de oferta atual a séries históricas de preço, VGL da janela ou outros indicadores com universos diferentes.

### 4.3 IVV

- Comparar série temporal e tabela por área no mesmo período/universo: vendas, estoque, oferta anterior, lançamentos, categorias não classificadas e cobertura. No material Finoti,9,5%×8,5% e os pontos1,2%/56,9% são alvos de investigação, nunca constantes do runtime.
- Verificar `report/model.ts`, `domain/aggregations.ts`, normalização temporal e contratos `history-identity-v1`/`period-capacity-v1`; distinguir correção de duplicidade/competência da invenção de um filtro estatístico de outliers.
- Reutilizar tratamento comprovado apenas se identidade, competência e causa forem aplicáveis. Sem isso, preservar números e registrar linha/endpoint/competência para investigação da base/API. Não cortar janela, forçar série=tabela ou eliminar pico por aparência.

### 4.4 Referência territorial

- Descobrir fonte verificável de limites/enquadramento municipal já utilizada no SE; se necessário, validar documentação de fonte oficial. Não presumir que `src/assets/municipios-br.json` contém polígonos: é cadastro, não evidência de geometria.
- Resolver município/UF por identidade confiável; fonte geográfica serve ao mapa, nunca como fallback para ampliar cidades autorizadas pelo `GeoApiScopeEngine`.
- Identificar possível registro distante e separar coordenada observada, associação municipal e apresentação. Se falta fonte territorial, registrar a dependência real; não inventar raio, centróide ou uma lista de empreendimentos a esconder.

**Saída/portão:** matriz antes/depois por campo e decisão, com fatos/hipóteses separados. Alterações numéricas dependem de causa ou regra aprovada demonstrada. Dependência de origem pode permanecer aberta nos termos D11/D12/D13, com valores preservados e escopo de validação explícito; não bloqueia ajustes independentes nem equivale a homologação dessa origem.

## 5. G2 — seletores e regras comuns de apresentação

1. Criar/reutilizar helpers puros por responsabilidade: contexto geográfico-temporal, média simples, universo de extremos, elegibilidade editorial e comparações. Localizar em `report/`/`domain/` da feature; sem novo cubo ou refatoração global.
2. Implementar D09/D10 e correção do percentual de empreendimentos a partir da matriz G1. Expor metadados suficientes para avisos/auditoria e tabelas de Fórmulas/Metodologia. Não alterar exportação só para tornar a conferência verde.
3. Elegibilidade editorial: distinguir zero observado, ausência e cobertura parcial. Página focada em MCMV depende da atividade **MCMV**, não é mantida só porque a série de outros padrões tem valores. Série inteira zerada pode sair; zero pontual, negativo e trimestre da janela permanecem nos dados.
4. Omitir par comparativo com ambos os valores zero ou cobertura insuficiente. Base positiva: percentual válido; base zero/negativa com atividade: mostrar valores e `atual − anterior` em unidades/reais, sem percentual. Operação e arredondamento únicos para tela e PPT; não usar módulo para modificar o sinal.
5. Não adicionar heurística de baixo volume/única categoria para apagar slide18. Preservar as regras estruturais já existentes que não pertencem a essa nova heurística; qualquer alteração precisa ter motivo no contrato e na matriz.
6. Atualizar `generation-notices.ts`, `consistency-alerts.ts` e auditoria onde aplicável: omissões agrupadas por tipo, detalhes rastreáveis, nenhuma explicação técnica nova no material final. Preservar política vigente de disponibilidade de arquivos e guardas de cobertura/proveniência.

**Portão:** testes focados dos helpers/linhagem aprovados; modelo de entrada não mutado; métricas fora da mudança estáveis ou com delta justificado; nenhuma constante municipal/temporal introduzida.

## 6. G3 — edição automática de slides, PDF e PPT nativo

1. **D02/D03:** contexto em toda página analítica, abaixo do título quando esse é o alvo do comentário. Competência por análise e nomes em até duas linhas; fallback compacto só quando necessário; lista completa em cidades e identidade oficial preservada. Testar nome longo, cidade única, duas cidades e conjunto extenso.
2. **D04:** card de período substitui páginas na abertura; manter três cards, fonte discreta e retirar jargão de API/cubo/auditoria do material. Não remover Metodologia/Avisos/Auditoria da aplicação.
3. **D06/D07:** sigla **e extenso** em títulos/cabeçalhos monetários pertinentes; `Disponibilidade s/ O.L.` sem “histórica”. Fórmulas/método continuam explicando a base correta, sem nota nova no PDF/PPT. Tratar limites de largura sem esconder o nome por extenso.
4. **Negativos:** barras divergentes com zero coerente, negativo à esquerda/vermelho e positivo à direita; número, participação e total algébrico preservados. Revisar também comparativos verticais para não desenhar valor negativo como coluna positiva.
5. **D05/D08:** aumentar gráficos pequenos e usar área das tabelas com fonte dinâmica; uma página por tabela, sem clipping/sobreposição, continuação automática ou supressão de célula. Se o acabamento não couber adequadamente, registrar dependência do analista, preservando editabilidade.
6. Retirar documentário pelo ID/arte do manifesto FIERGS, não pelo índice68 da saída comentada. Conferir ativo/template equivalente do Secovi antes de qualquer remoção nele. Renumerar sumário, navegação e exportação a partir do manifesto efetivo; não remover outros institucionais por inferência.
7. Conferir `ReportPaginator.tsx`, `MarketSlides.tsx`, CSS de impressão e `ReportReferencePanels.tsx`; manter `PresentationChart`, compilador `report/presentation/build-package.ts` e `lib/pptx/render.ts` alinhados. CSS da tela não muda automaticamente fonte, largura, eixo ou cor no PPT nativo.
8. Preservar gráficos/tabelas/textos nativos e workbooks embutidos; não resolver dificuldade visual rasterizando análises. Artes institucionais/bases cartográficas mantêm exceções já documentadas.

**Portão:** amostras representativas em tela e pacote nativo sem colisão, com rótulos/dados corretos; zero exclusivo de apresentação não contamina modelo; manifesto e avisos consistentes. Atualizar o mapa System Design na parte tocada, preservando tokens e identidade aprovada das artes de apresentação.

## 7. G4 — enquadramento municipal nos mapas

1. Construir recorte a partir dos municípios selecionados, não dos extremos das coordenadas dos empreendimentos. Para conjuntos, usar o território agregado com margem controlada; não rotular recorte retangular como máscara exata de fronteira municipal.
2. Separar geometria analítica, elegibilidade visual do marcador e projeção. Pontos fora do enquadramento ficam fora da camada visível; **não usar o clamp atual de `positionOf` para trazê-los à borda**. Se o desenho exigir máscara municipal, usar geometria real, não caixa como teste de pertencimento.
3. Aplicar o mesmo recorte aos modos padrão/estoque/R$/m² e seus renderizadores PDF/PPT. Preservar coordenadas, vínculo municipal e todos os totais analíticos originais.
4. Contagem/legenda de pontos exibidos precisa corresponder ao mapa; avisos/auditoria registram IDs e quantidade fora do recorte, sem notas explicativas novas nos slides. Manter atribuição/licença do mapa-base.
5. Preservar tratamento de coincidentes e controles de mosaico; não criar tela vazia/silenciosa se referência territorial falhar. Falta de geometria exige estado/aviso honesto, sem voltar a encaixar a imagem pelo ponto distante e alegar D13 concluído.

**Portão:** teste com cidade única, conjunto de duas cidades, ponto distante, ponto na borda e coincidentes. Imagem se mantém focada, ponto distante não reaparece na margem e métricas/CSV não perdem esse empreendimento. Geometria sem fonte comprovada não fecha G4 por plausibilidade.

## 8. G5 — testes focados e dois cadernos no máximo

### 8.1 Ordem econômica

1. Executar testes dos helpers/regressões diretamente afetados. Não rodar toda a suíte do monorepo nem coletar dados para cada teste.
2. Recalcular as baselines FIERGS2T2026/4T2025 offline e a fixture Secovi; compilar manifestos completos e apresentação. Reutilizar mesma execução para contagens, matriz e hashes.
3. Gerar R1 com código atual e insumos congelados: PDF/PPT/CSV. Conferir abertura/leitura do PDF, natividade e edição real do PPT. Renderizar uma vez as páginas escolhidas e usar comparação lado a lado; nova geração somente se houve mudança/falha concreta.
4. Atualizar matriz de lacunas. Gerar R2 apenas para lacunas, com a preferência de dados/limites da seção2.3. Não montar terceiro deck para repetir validação já feita: ampliar o caderno dirigido dentro do limite ou registrar a pendência.
5. Um teste de integração do fluxo real de download/alertas, cancelamento e nomes; reaproveitar navegador automatizado local e cache. Sem usar a interface do VS Code. Se navegador conectado não estiver disponível, usar headless local e documentar o limite em relação ao site publicado.
6. Ao estabilizar: tipos, lint dos arquivos tocados, build uma vez, `git diff --check` e `check:live-docs`. Repetir somente se nova alteração justificar.

### 8.2 Casos obrigatórios

- Média simples distinta de ponderada; zero incluído, nulo excluído, totais/subtotais fora da amostra e rótulo explícito.
- Percentual de empreendimentos distinto do percentual de unidades, com contagem única conferida.
- Extremos de preço com estoque0/nulo não definem oferta atual; preço baixo válido e área50 permanecem; competência futura não entra; médias sem peso não são inventadas.
- Série toda zerada versus zero pontual, negativo e cobertura parcial; regras de omissão diferentes do caso “pouco lançamento”.
- Comparação0×0 omitida;0×positivo preservada sem percentual; base negativa com delta absoluto; base positiva válida mantém percentual; par com dado ausente não vira zero.
- Subtítulos com janela correta, sigla+extenso, nomes longos/duas linhas, preset oficial e recortes livres.
- Tabela com mais linhas/colunas continua em um slide, sem textos fora da área, dados omitidos ou rasterização; limites que exigirem acabamento humano identificados.
- Mapa municipal, conjunto, ponto distante sem clamp visual, coincidentes, contagens e totais preservados.
- Abertura com período e documentário retirado pelo ID correto; nenhuma confusão entre posição do PPT recebido e referência oficial.
- PPT: abrir, editar texto, célula de tabela e série de gráfico, salvar e reabrir; confrontar XML/cache e workbook com valores de origem, incluindo zero/nulo/negativo. PDF: renderizar páginas e verificar título, fonte, eixos, legendas e tabelas. Não anunciar “editável” apenas porque o arquivo abre.

### 8.3 Comandos de referência

Usar os arquivos existentes relevantes; novos testes só para comportamentos novos com risco real. Em Windows usar `.cmd` para evitar bloqueio de `npm.ps1`:

```powershell
npx.cmd vitest run src/features/panorama-secovi-fiergs/__tests__/period-comparisons.test.ts src/features/panorama-secovi-fiergs/__tests__/map-tiles.test.ts src/features/panorama-secovi-fiergs/__tests__/editorial-clarity.test.ts src/features/panorama-secovi-fiergs/__tests__/fiergs-editorial-blocks.test.tsx src/features/panorama-secovi-fiergs/__tests__/editable-pptx.test.ts
npm.cmd run typecheck
npx.cmd eslint <arquivos-tocados>
npm.cmd run build
npm.cmd run check:live-docs -- <base-da-execucao> HEAD
```

Executar também os testes de história/capacidade, coortes, preços e guardas quando seus arquivos forem tocados. O comando com placeholders é referência, não deve ser executado literalmente. Regressão offline deve apontar a nova pasta de evidências; não sobrescrever resultados03/11 nem usar env legado que faça isso sem adaptação.

**Portão:** matriz completa de contratos/comentários com resultado verificável, R1 aprovado, R2 apenas quando necessário e limites técnicos explícitos. Testes locais não equivalem a publicação/aceite Finoti. Se origem permanece inexplicada e preservada conforme D12, registrar esse resultado como pendência de origem, sem dizer que foi corrigida.

## 9. G6 — fechamento técnico e material de apoio

- Relatório curto de execução **no próprio plano**, com resumo do que mudou, matriz antes/depois, caminho/hash dos cadernos, testes, exceções e investigação pendente. Não criar outro resumo vivo concorrente.
- Atualizar estado da revisão por referência a este plano, LIVE_rebrain, diário semanal e linha do AGORA/plano semanal. Sem atribuir horas medidas ou compromisso a terceiros.
- Consolidar lista do analista: avaliar/excluir páginas de relevância específica; ajustar fontes/larguras/composição em um slide quando necessário; narrativa do projeto. Não sugerir editar números para esconder divergências da fonte.
- Commits locais separados por entrega concreta, com `git add` explícito: lógica/contratos, apresentação/PPT, mapas e testes/evidências quando essa separação for útil. Não criar commit só para cada pergunta; testes e docs acompanham a mudança correspondente.
- Conferir divergência de todos os remotos e listar exatamente os commits a publicar, incluindo os documentais locais anteriores se continuarem exclusivos. Sem incluir materiais brutos ou alterações paralelas.
- Apresentar resultado e pedir autorização **antes de qualquer push/publicação**; sincronização de árvore suja/divergente também exige autorização. Não enviar mensagem a Finoti/Juliana/Edgar por ferramenta.
- Ensaio no site publicado e aceite externo permanecem etapa posterior, conduzida com Gabriel. Preservar aceite antigo da Juliana no escopo original; não anunciar nova revisão homologada sem retorno correspondente.

## 10. Evidência mínima e critérios de conclusão

Para cada portão: arquivos alterados, decisões Dxx e comentários Fxx cobertos, testes/resultados, origens/hashes e pendências. A matriz deve permitir distinguir: **implementado/validado localmente**, **acabamento do analista**, **investigação de origem**, **ainda não verificado no período real**.

Campos mínimos do manifesto de evidências: commit base/final, entidade/UF/cidades/janela, captura/competência, hash da entrada, versão dos contratos, páginas completas/selecionadas, motivos de seleção/omissão, fonte territorial, métricas estáveis/deltas, cobertura dos14contratos/46comentários, saídaPDF/PPT/CSV, conferência Office, testes e limites.

Critério final local: cumprir D01–D14 e os requisitos claros sem violar dados/políticas; produzir o menor caderno suficiente, complementando só lacunas; preservar exportação e apresentar explicitamente qualquer verificação3T2026 que não tenha dados. Não declarar resolução da API, aceite externo ou saída100% vetorial por inferência.

## 11. CTA para ativar a execução

> Execute `docs/features/Relatorios Secovi_FIERGS/PLAN_IMPLEMENTACAO_REVISAO_FINOTI_PANORAMA_2026-11-04.md` pelos portões G0–G6, seguindo o contrato D01–D14 aprovado. Preserve alterações paralelas e não altere Corretor, Sinduscon, SP Institucional, Dashboard, Validação ou Relatório API Excel. Não crie omissões por pouco lançamento, paginação automática de tabelas, filtro novo de outliers ou exceções por cidade/período. Mantenha média simples identificada, sigla e extenso, negativos, zeros, nulos, alertas e guardas. Recalcule as regressões offline2T2026/4T2025 e gere primeiro o extrato curto R1 com os menores insumos locais; gere R2 somente para lacunas demonstradas. Se faltar o insumo exato indispensável de Canela+Gramado1T2023–3T2026, autorizo uma única coleta delimitada desse recorte pelo fluxo do site, com cache, sem varreduras/coletas extensas ou novas cidades. Não trate um período substituto como validação3T2026. Verifique PDF, CSV e edição real no PPT, registre evidências e a lista de acabamentos do analista. Faça commits locais isolados; apresente divergência e commits e peça minha autorização antes de sincronizar árvore suja/divergente ou fazer push. Não antecipe publicação ou homologação externa.

## 12. Registro de execução

- **04/11 — preparação:** plano criado a partir das respostas individuais aprovadas; inspeção do motor, manifesto, exportação nativa, replay/cache e inventário local. Menor conjunto de páginas registrado é Canela67; R1 escolhido4T2025 por menor volume de empreendimentos entre os empatados. Nenhum código de produto alterado, teste funcional, coleta GeoBrain ou relatório gerado durante o planejamento. G0–G6 ainda não executados.

### Execução autorizada em 04/11 — resultado curto

- **G0:** `fetch --all` confirmou inicialmente0remotos/5locais, somenteorigin, main. Árvore paralela preservada. Antes recalculado de dez casos2T2026/4T2025, sem API; hashes em `.local-inputs/panorama-finoti-2026-11-04/`. A geração de3T2026 tinha lacunas reais de insumo, justificando R2.
- **G1:** realizada a única coleta autorizada Canela+Gramado1T2023–3T2026 pelo próprio `fetchPanoramaReportModel`:34respostas de dados GeoBrain e3cartográficas IBGE, todas200, autenticação separada sem credenciais nas evidências.329empreendimentos aceitos, controle de competência e histórico preservados. Demais execuções foram cache-only.
- **Causa do IVV comprovada:** o consolidado vertical descartava o padrãoAlto por vendas negativas antes da agregação. Excluir−7vendas/106estoques produzia153÷1.618=9,456%; com todo o universo,146÷(1.571+146)=8,503%. Corrigida a ordem de agregação usando a identidade existente, sem alterar vendas/estoque nem as políticas de IVV horizontal/total. Série e tabela por área fecham em8,503%. Pontos iniciais1,156%/56,856% permanecem; nenhum filtro de outliers foi criado.
- **Preço antes/depois no recorte exato:** mínimos históricos/sem estoque1dorm.R$4.726,59→oferta atualR$9.677,42;2dorm.R$4.424,53→R$8.037,25;3dorm.R$4.148,99→R$6.757,15/m². Trata-se de filtro de universo com estoque positivo, não edição de preço ou garantia de que todo valor baixo sumiu. Registros históricos permanecem.50m² não recebe regra especial.
- **G2:** média simples identificada, com zeros observados e sem total/subtotal duplicados; percentual de empreendimentos usa IDs/contagens em vez de unidades. Comparativos sem atividade/cobertura omitidos; base não positiva usa diferença absoluta. MCMV exige classificação observável para tratar a série como zerada. Avisos e CSV preservam decisões; guardas não foram desativadas.
- **G3:** contexto territorial/temporal inserido no fluxo do cabeçalho, evitando sobreposição em títulos longos; nomes, sigla+extenso, card de período e cabeçalho sem“histórica” implementados. Tabelas mantidas em um slide, com fontes ampliadas e PPT nativo editável. Negativo à esquerda/vermelho. Documentário removido pela referência oficial74, não pela posição68 do arquivo recebido. Decisão editorial de excluir página pouco útil continua com o analista.
- **G4:** referência territorial dinâmica porUF/nome de município viaIBGE, independente da lista de cidades autorizadas. Enquadramento retangular municipal, sem alegar máscara exata de limites. WinkelHaus (`RS/Canela#63128`,−29,02862/−51,18271) fica fora do enquadramento;328dos329marcadores visíveis nos mapas da dupla, preservando as7unidades finais desse empreendimento e todos os indicadores. Identidade/causa cadastral da coordenada segue para investigação da origem.
- **G5:** onze modelos recalculados com conservação/cobertura aprovadas e sem mudança nos campos canônicos de lançamento/estoque/vendas/preços/VGV dos empreendimentos. Manifestos completos compilados sem mutação, sem gerar onze estudos.99testes focados aprovados, mais a guarda de classificação e o teste que compila os11manifestos; tipos/build aprovados e lint0erros/8avisos deFastRefresh. Recharts em jsdom e bundle/Browserslist têm avisos de ambiente/preexistentes, sem erro no navegador real.
- **R1:** Canela1T2021–4T2025,12páginas de conferência emPDF/PPT+CSV; manifesto comercial efetivo62páginas após omissões justificadas e retirada institucional. **R2:** Canela+Gramado1T2023–3T2026,8páginas apenas para duas cidades, negativos, IVV/preço e3mapas; manifesto efetivo64. Nenhum modo curto foi adicionado ao produto.
- **Conferência física:** PDF16:9,960×540,12/8páginas, render final inspecionado. Harness foi ajustado ao canvas1920×1080 usado pelo exportador real, sem mudar o motorPDF. PPT abriu noPowerPoint, sem formas fora do slide; edição real de texto/tabela/workbook do gráfico salva e reaberta em cópia de ensaio. Cache do primeiro gráfico mudou2→3, confirmando edição dos dados, não só abertura. Quatro gráficos e quatro workbooks em cada caderno; original de conferência preservado. Renders e provas em pasta ignorada.
- **G6:** contrato/LIVE/diário/planejamento/mapa de design atualizados. Acabamentos do analista: avaliar relevância e excluir páginas específicas; ajustar fontes/larguras/composição noPPT quando o resultado automático de uma página não atender ao projeto. Não editar números para esconder divergências da origem. Estado local, não homologação ou publicação.

### Arquivos para conferência local

Todos são extratos técnicos internos; não equivalem ao estudo completo para cliente:

- `.local-inputs/panorama-finoti-2026-11-04/R1-EXTRATO-VALIDACAO.pdf`, `.pptx` e `.csv`.
- `.local-inputs/panorama-finoti-2026-11-04/R2-EXTRATO-VALIDACAO.pdf`, `.pptx` e `.csv`.
- `R1-EDIT-PROOF.pptx` é exclusivamente a cópia modificada pelo ensaio Office, não material a enviar.
- Runner reproduzível: `scripts/diagnostics/panorama-finoti-validation.ts`; entradas HTTP permanecem ignoradas. O modo exato não usa uma resposta temporal2T2026 como substituto3T2026.

### Limites restantes

1. Apurar na origem o vínculo/posição doWinkelHaus; o enquadramento visual não é correção de cadastro.
2. Não alterar por aparência os picos históricos do IVV nem os preços baixos ainda válidos na oferta atual. A diferença de fechamento foi resolvida na agregação do consumidor, não na API.
3. Publicar somente após autorização e conferir fluxo real no site, material integral e aceite visual do consultor. Os extratos e replays locais não antecipam esse aceite.
4. Artes institucionais e base cartográfica continuam exceções rasterizadas previamente registradas; tabelas, textos, marcadores e gráficos analíticos permanecem nativos/editáveis.

### Publicacao autorizada em 04/11

Push autorizado e realizado em 04/11: sete commits ate `5b3c50b`, incluindo `46f72bd`. Origin/main e main em 0/0 apos envio; nenhuma integracao da arvore suja. Publicado no Git, ainda sem conferencia no site ou aceite externo. Proximo: publicar/conferir no Lovable e gerar Canela + Gramado, 1T2023-3T2026, com PDF/PPT/CSV integrais.

Contagem consolidada: 102 testes distintos aprovados; inclui o teste posterior de tabela densa em uma unica pagina. Matriz JSON registra a uniao dos testes.
