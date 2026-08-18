# Plano de ação terminal — Terra — V1 com paridade de apresentação e PDF

**Status:** `ACTIVE_EXECUTION_PLAN` — prevalece sobre os planos Terra v1–v4 anteriores  
**Data:** 2026-08-18 · **Execução:** direta na `main`, sem branch  
**Rota:** `/rebrain/panorama-secovi-fiergs`  
**Referência:** Piracicaba/SP · 1T2026 · 62 slides · 13,333 × 7,5 pol.  
**V1:** preview no browser + PDF paginado 16:9  
**Fora da V1:** PPTX editável e edição editorial dentro do sistema

## 1. Missão

Entregar a melhor reprodução automatizada possível dos 62 slides, com estrutura, ordem, identidade, tabelas, gráficos, institucionais, mapa, sumário e encerramento reconhecíveis como o relatório oficial.

A Fase 1 deixa toda a apresentação limpa e semanticamente correta. Diferenças residuais de universo, fórmula, ponderação ou taxonomia seguem para uma Fase 2 de calibração. Essa separação não autoriza preencher uma página com a métrica errada: se o contrato correto ainda não produzir valor confiável, preservar o visual e exibir “Em validação” ou “Dimensão não coberta”, com diagnóstico rastreável.

## 2. Fontes e precedência

Ler integralmente antes de editar:

1. `MAPEAMENTO_FASE0_PIRACICABA_1T26.md`;
2. `GABARITO_CONGELADO_PANORAMA_PIRACICABA_1T26_v1.md`;
3. `DECISOES_E_PREMISSAS_PANORAMA.md`;
4. `DOSSIER_STATUS_PANORAMA_2026-08-17.md`;
5. `docs/architecture/FRONTEND_GUIDELINES.md` e `DESIGN_SYSTEM.md`;
6. o PPTX oficial diretamente.

Em conflito: este plano → mapa da Fase 0 → gabarito → decisões/premissas → planos anteriores. O deck é a autoridade visual; contratos/gabarito são a autoridade semântica. Anomalia catalogada do deck não vira regra metodológica.

## 3. Regras inegociáveis

- São **62 slides**; o slide 2 está no preview e no PDF.
- Não gerar PPTX e não usar `window.print()`.
- Não usar valores do gabarito, mock ou hardcode em runtime.
- Não reutilizar tabela de estoque em coorte, maturidade, preço, participação ou mapa.
- Diferenciar `0`, `null`, erro, dimensão não coberta e método em validação.
- Preview/PDF consomem o mesmo registry, componentes e `PanoramaReportModel`.
- Uma coleta por endpoint/recorte; navegar ou exportar não refaz chamadas.
- Asset oficial integral é permitido somente para conteúdo estático; variável usa template/contrato.
- Preservar alterações paralelas e não tocar em outras features.
- Primitives shadcn no shell; componentes do slide pertencem ao Panorama.
- Cobrir carregamento, vazio, erro, escopo inválido, sucesso e geração do PDF.

## 4. Separação das fases

**Fase 1 — esta execução:** registry de 62 slides, paridade visual, componentes corretos, sumário/navegação, PDF direto, máximo uso dos métodos já reconciliados e estados claros nas lacunas.

**Fase 2 — posterior:** curadoria horizontal, VGV lançado/MCMV, ponderação de preços, maturidade, universo do mapa, reconciliações finas e promoção formal `RECONCILED → APPROVED` pelos analistas.

## 5. Sequência terminal

### T0 — base e diagnóstico

1. Confirmar `main`, atualizar base e registrar `git status`.
2. Preservar as alterações documentais da Fase 0.
3. Inventariar manifesto, paginador, modelo, API, PDF, CSS e assets.
4. Mapear `referenceSlide → componente/modelKey atual → defeito`.
5. Provar por teste o slide 2 omitido e o fallback semântico repetido.

### T1 — referências e assets

1. Exportar o deck em 1920×1080 para pasta local de QA.
2. Classificar cada slide: `static_official`, `parameterized_template`, `data_table`, `data_chart`, `narrative` ou `map`.
3. Versionar somente assets estáticos usados no runtime; referências temporárias pesadas ficam fora do bundle.
4. Reusar e conferir os PNGs oficiais 57–62.
5. Não redesenhar logos, retratos, QR codes ou peças aprovadas.
6. Criar contact sheet/índice visual local para QA.

**Aceite:** todo slide possui referência localizável; asset runtime tem ao menos 1920 px e não contém chrome do PowerPoint.

### T2 — registry canônico

Evoluir o manifesto para entradas tipadas com `referenceSlide`, `outputOrder`, `sectionId`, `title`, `visualFamily`, `componentKey`, `contractKeys`, `methodologyStatus`, `staticAsset`, `qaState` e `enabled`.

- uma entrada habilitada por slide, 1–62, sem filtro do slide 2;
- seções seguem o sumário oficial;
- slides podem compartilhar primitive, mas não combinação semântica indevida;
- o registry dirige contador, navegação, sumário, renderização offscreen, PDF e QA.

**Testes:** 62 entradas, sequência contínua, referências únicas, seções válidas, assets existentes e falha para fallback semântico repetido.

### T3 — preview e sumário

- painel com as 10 seções oficiais, expansível por slide;
- destaque de seção/slide atual e clique sem refetch;
- anterior/próxima sincronizados;
- no mobile, sumário em `Sheet`/drawer;
- estado metodológico discreto fora do canvas;
- canvas 16:9 sem deformação;
- ação primária única: **Visualizar PDF**;
- shell acompanha claro/escuro; slides mantêm as cores oficiais;
- teclado, foco, contraste e estados de página cobertos.

### T4 — biblioteca visual da feature

Criar, dentro do Panorama: `PanoramaSlideFrame`, `OfficialStaticSlide`, `ParameterizedCoverSlide`, `SectionDividerSlide`, `SecoviSourceFooter`, `SecoviMatrixTable`, `SecoviComparisonTable`, `SecoviTrendChart`, `SecoviParticipationChart`, `SecoviStackedShareChart`, `SecoviPriceChart`, `SecoviNarrativeSlide`, `SecoviMarketMap`, `MethodologyNotice` e `CoverageNotice`.

Extrair tokens locais do deck para cores, tipografia, rodapé, margens e escalas. Não alterar tokens globais: shell Rebrain e canvas Secovi têm identidades distintas. O frame captura em 1920×1080, sem scroll, corte, hover obrigatório ou animação na exportação.

### T5 — páginas estáticas/parametrizadas

Implementar e aprovar:

- 1–5: capas, abertura e sumário;
- 6–10: Secovi e objetivos;
- 11, 20, 28, 30, 47, 50, 52, 55 e 57: divisores;
- 58: equipe/créditos;
- 59–62: encerramento oficial.

Asset integral para estático; template apenas para cidade, UF, trimestre, ano ou equipe variável. Não duplicar footer sobre imagem completa.

### T6 — páginas quantitativas

Migrar por família: 12–19 → 21–27 → 29 → 31–35 → 36–40 → 41–46 → 48–49 → 51 → 53–54 → 56.

Para cada slide:

- dimensão, unidade e contrato corretos;
- cabeçalhos, ordem, legenda, cores, rótulos, destaques, rodapé e observações fiéis;
- dado real quando o método for semanticamente compatível;
- `CoverageNotice` quando faltar dimensão/método, sem substituir a métrica;
- status/fórmula no modelo, sem condicionais espalhadas;
- remover `MetricTable` após migrar seu último consumidor válido.

Não transformar esta etapa em calibração profunda. Investigar o suficiente para selecionar o contrato correto; divergências de valor vão para a Fase 2.

**Aceite:** nenhuma página 29–56 usa dataset/visual por fallback; todas têm família e contrato coerentes.

### T7 — PDF direto

1. Remover `window.print()`, interceptor global e dependência de print CSS do fluxo.
2. Controller React: `idle`, `preparing`, `capturing`, `assembling`, `ready`, `error`.
3. Renderizar 62 slides em root offscreen explícito, nunca `display:none`.
4. Aguardar fontes/imagens/gráficos e congelar animações.
5. Capturar cada slide 1920×1080 e montar PDF 16:9 com recursos liberados página a página.
6. Abrir viewer Blob com progresso e erro recuperável; nunca aba branca silenciosa.
7. Incluir metadados do recorte e versão do registry.
8. Slide 5 com links internos às seções; bookmarks quando suportados com estabilidade.
9. Popup bloqueado oferece **Abrir PDF** e **Baixar PDF** sem regenerar/refetch.

**Aceite:** 62 páginas, ordem correta, sem shell, branco, corte ou nova coleta.

### T8 — QA

Revisar os 62 slides em matriz `estrutura → visual → dado → PDF`:

- lado a lado/overlay em 1920×1080;
- preview e PDF com mesmo enquadramento;
- legibilidade a 100%, sem scroll/corte;
- logos/rodapés sem duplicidade;
- gráficos completos e estáveis;
- avisos metodológicos discretos;
- links do sumário;
- Chrome/Edge, desktop/mobile, shell claro/escuro;
- todos os estados de página e exportação.

Nenhuma página fica sem inspeção, inclusive assets oficiais.

### T9 — validação e entrega

- testes de contratos/componentes, registry/antirrepetição e PDF;
- smoke `pdfjs-dist`: 62 páginas, dimensões, ordem e miniaturas;
- typecheck, lint aplicável, suíte e build;
- atualizar decisões, plano, mapa e `LIVE_rebrain.md`;
- antes do push: `npm run check:live-docs -- <base> <head>`;
- commit direto na `main`, publicação e conferência da URL.

## 6. Corte de escopo correto

Se faltar tempo, não cortar páginas nem famílias visuais. Concluir estrutura, registry, assets, sumário, preview e PDF; manter o visual correto com aviso de cobertura; mover somente divergências de cálculo/valor à Fase 2. Nunca restaurar tabela genérica para preencher espaço.

## 7. Critério terminal

- [ ] 62 slides no registry, preview e PDF; slide 2 presente;
- [ ] sumário navega para todas as seções;
- [ ] estáticos/divisores/encerramentos usam o visual oficial;
- [ ] cada slide quantitativo possui componente e contrato próprios;
- [ ] nenhum fallback repetido entre 29–56;
- [ ] lacunas são estados, não zero/mock/métrica substituta;
- [ ] PDF abre no browser sem `window.print()` ou página branca;
- [ ] preview e PDF são equivalentes;
- [ ] testes, typecheck e build passam;
- [ ] docs vivos atualizados e resíduos catalogados para Fase 2.

## 8. Handoff obrigatório

Informar: commit/URL; total de páginas; matriz `slide → componentKey → contractKeys → status`; assets incorporados; cobertura por slide; fallbacks removidos; validações; screenshots de QA; tamanho/PDF de teste; diferenças visuais; backlog objetivo da Fase 2.

## 9. Prompt terminal

> Execute integralmente `PLAN_TERRA_V1_PARIDADE_APRESENTACAO_E_PDF_v5.md` na `main`. Preserve alterações alheias, trate a Fase 0 como contrato e o PPTX como autoridade visual. Entregue preview navegável e PDF direto com 62 slides. Maximize a fidelidade estrutural e visual agora; não pare a Fase 1 para resolver toda divergência metodológica. Se método/dimensão estiver aberto, mantenha o visual correto e sinalize a cobertura sem mock, hardcode, zero silencioso ou métrica substituta. Só encerre após QA dos 62 slides, testes, build, documentação, commit, publicação e handoff.
