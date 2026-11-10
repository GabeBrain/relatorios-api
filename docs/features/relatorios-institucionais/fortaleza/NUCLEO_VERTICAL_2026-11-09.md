# Fortaleza — núcleo municipal vertical e etapas automáticas

09/11/2026 · Lucas / Codex · implementação local sobre `574087e`, sem publicação.

## Escopo desta entrega

Lucas autorizou iniciar a integração GeoBrain e pediu o fluxo automático do SP institucional, com progresso visível, além de seletor Mensal/Trimestral e referência mês ou trimestre/ano. Rota preservada: `/rebrain/relatorios-institucionais/fortaleza`, sem entrada no painel, menu ou busca.

Uma ação **Gerar prévia vertical** executa: validar o recorte → consultar fontes municipais → conferir balanços → organizar a prévia. O estado indica aguardando/em andamento/concluída/conferir/cancelada, com BrainLoadingState overlay, tempo real, cidade/fonte/página corrente e cancelamento. Não há percentual ou duração inventados. Etapas rápidas podem terminar imediatamente; não foram acrescentadas esperas artificiais.

**Mensal:** mês e ano de referência. **Trimestral:** trimestre e ano de referência. Alternar preserva ano e correspondência do período (2T↔junho, julho→3T); campos exibem a referência selecionada. Mudar período, tipo, cidade, conjunto, autorização ou token invalida resultados/cache e interrompe a tentativa anterior. O período escolhido não é imposto pelos arquivos históricos junho/julho.

## Fontes e limites

Contrato de transporte confrontado com `sp/api.ts`, `sp/temporal.ts` e fixtures do checkout, sem editar esses módulos. É o mesmo endpoint municipal; a aderência dos números/método ao caso Fortaleza ainda exige ensaio autenticado e reconciliação granular.

| Fonte | Escopo | Uso |
|---|---|---|
| `/public-api/monitored-cities` | Token pessoal, paginando `links.next` via GeoApiScopeEngine | Autorizar UF/municípios antes de qualquer leitura de mercado |
| `/public-api/building-with-history` | CE/cidade/Vertical, `per_page=1` | Amostra para confirmar município/segmento, sem usar fotografia da amostra para limitar séries nem contar projetos |
| `/public-api/temporal-analysis-city/releases` | CE/cidade, `type[]=Vertical`, `group_by=Padrão`, janela escolhida | `releases_in_period` como fluxo municipal informado |
| `/public-api/temporal-analysis-city/sales` | Mesmo escopo e janela | `liquid_sales` com sinal preservado |
| `/public-api/temporal-analysis-city/stock` | Mês anterior à abertura até fechamento | `stock` como fotografias mensais |

Leitura serial por município; 1 amostra e 3 fontes, até 2 páginas/100 linhas por fonte, máximo 200 linhas. Normal: 4 requests por cidade; limite 7 antes de retries. Reutiliza requestWithRetry do Panorama com 2 tentativas totais apenas para transitórios, respeitando Retry-After; 401/403 e erros de contrato não repetem credenciais. URLs de próxima página não são seguidas: cada página mantém os filtros originais. Sem varredura granular completa ou histórico de anos nesta fatia.

Meta/current_page/last_page/total/next, estabilidade da paginação e mês de cada linha são conferidos. Resposta inválida, mudança durante paginação, excesso do limite, cidade/segmento incompatível, grupos duplicados ou quantidade inválida deixam os totais indisponíveis. Mensagens são sanitizadas, sem corpo/headers/tokens do provedor.

Coleção por cidade reaproveita `collectByCity`. Retry manual **Tentar cidades faltantes** preserva cidades já concluídas somente no mesmo recorte e sessão, consultando novamente a cidade inteira que falhou. Nova geração inicia do zero. Cancelamento descarta resultado parcial; cache não persiste em arquivo/localStorage e não cruza token/escopo. Dataset incompleto nunca recebe consolidado do conjunto.

## Regras dos números

- Exige todos os meses selecionados e estoque do mês de abertura. Trimestre sem mês intermediário/fechamento não vira parcial ou aproximação mensal silenciosa.
- Por cidade, exige mesmos grupos entre fontes/meses. Não cria padrão ausente com zero. Linhas agregadas Total/Subtotal são rejeitadas para não somar duas vezes com padrões.
- Lançamentos/vendas = soma dos fluxos mensais. Oferta = estoque no fechamento; jamais soma de estoques ao longo do trimestre. Negativos são permitidos em vendas; estoque/lançamentos negativos são inválidos.
- Balanço por município/mês/padrão: `diferença = estoque final − (estoque anterior + lançamentos − vendas líquidas)`. Diferenças que se compensam no total continuam visíveis por padrão. Não inventar causa de atualização, reclassificação ou distrato.
- Cobertura completa permite exibir **observações municipais**; não significa reconciliação sem diferença, fonte granular confirmada ou homologação. Etapa de balanços fica “Conferir” quando houver diferença. Não há exportação nesta fatia.
- Amostra sem empreendimentos ou fontes vazias não viram mercado zero. Totais ficam ausentes e a interface explica cobertura/observações.

## Apresentação e sequência editorial

Painel do núcleo mostra lançamentos, vendas líquidas, fechamento, balanços mensais/cidade/padrão e proveniência (fonte, janela, horários, número de requests das cidades concluídas). Somente com observações completas a sequência automática organiza o manifesto 60/89; a interface distingue posições editoriais de conteúdos de slides prontos. Demais páginas continuam a integrar. Uma estrutura manual continua disponível como referência local independente.

Primitives/tokens, página/seleção/progresso do SP e padrões de coleta/reconciliação do FIERGS foram usados como referência. Código específico fica em Fortaleza, sem usar IDs/políticas FIERGS/SP como identidade do novo modelo. Sem mudança de regra nos consumidores existentes.

## Limites e próxima etapa

Esta rodada usou somente transporte sintético e testes offline: nenhum token pessoal foi lido, nenhuma coleta GeoBrain real foi acionada pelo agente. O equivalente headless comprova paginação, escopo, cobertura, cancelamento e cálculo sobre os objetos retornados antes da apresentação; não comprova os dados reais.

Próximo: ensaio autenticado delimitado, com conta de Lucas, congelar fonte/janela/versão e reconciliar unidades lançadas/vendas/estoque por cidade. Confrontar o fluxo municipal com data de início das vendas dos empreendimentos e revisões de estoque. Só depois expandir para histórico de gráficos, contagem de projetos, casas/loteamentos/comercial, preços por unidade, distratos brutos, MCMV, INCC, IVV e exportação. Os quatro passos desta prévia não significam relatório completo.

## Comandos e evidências

- `npx.cmd vitest run src/features/relatorios-institucionais/fortaleza --maxWorkers=2`: 49 testes aprovados após ajustes das etapas.
- Regressão ampla com SP/Panorama/GeoApiScopeEngine: 807 aprovados, 1 falha existente Panorama/firewall-fontes (“nenhuma lâmina do deck publica o rótulo de loteamento”), 2 ignorados. Após a orientação de etapas foram acrescentados 2 cenários no teste do hook; foco Fortaleza passou 49/49. Arquivos SP/Panorama sem alteração; não limpar teste alheio mudando política.
- `npm.cmd run build` inclui checagem real de tipos; build/tipos e lint verificados no fechamento. Dependências versionadas não alteradas.
- `node scripts/diagnostics/fortaleza-market-visual.mjs`: catálogo e fontes sintéticas, demais redes interceptadas. Verifica uma ação/4 etapas, mensal/trimestre/ano, negativos, ausência/erro/vazio/diferenças, cancelamento, recuperação só da cidade faltante e invalidação de resultado. Capturas 1440/390 claro/escuro, tabelas com rolagem local sem overflow da página, carregamento deliberadamente lento.
- `node scripts/diagnostics/fortaleza-base-visual.mjs`: confirma base/manual, catálogo e ausência no painel/menu. Resultados brutos/capturas em `.local-inputs/relatorios-lucas/fortaleza/` (ignorados).
- Fechamento: `npm.cmd run check:live-docs -- 574087e HEAD`, commit isolado `feat(relatorios): integrate Fortaleza vertical preview pipeline`. Sem push/deploy/Monday/geração real ou aceite presumido.
