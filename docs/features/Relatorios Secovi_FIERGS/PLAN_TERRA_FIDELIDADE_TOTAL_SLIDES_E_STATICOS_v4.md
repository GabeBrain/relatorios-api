# PLAN TERRA — Fidelidade total dos slides, estáticos e blocos do mercado v4

**Execução:** direta na `main`  
**Rota:** `/rebrain/panorama-secovi-fiergs`  
**Objetivo:** substituir placeholders e fallback repetido por uma reprodução fiel, verificável e automatizável do Panorama.

## Diagnóstico que este plano corrige

O estado atual confirma dois defeitos objetivos:

1. Os slides corporativos/finais não foram incorporados. A página “Consultores do estudo” é texto de placeholder, apesar de o PPT institucional conter composição aprovada com fotos, QR code, mockups e encerramentos prontos para uso.
2. As páginas quantitativas 29–51 ainda roteiam diversas intenções para o mesmo bloco `stock.units` e o mesmo `MetricTable`. Por isso “ano × padrão”, “maturidade” e “participação” têm a mesma tabela, embora o gabarito exija dimensões e visuais diferentes.

Não há impedimento técnico ou de dados para corrigir o primeiro problema: os slides estáticos devem ser rasterizados uma vez a partir dos PPTX autorizados e exibidos como página integral. O segundo depende de contratos de dados próprios, mas não autoriza repetir uma tabela nem ocultar números retornados pela API.

## Resultado de aceite

- Nenhum slide contém texto genérico como “podem ser parametrizados”.
- Cada página estática oficial é visualmente a mesma do deck de origem, em 16:9, inclusive fotos, QR codes, logos e rodapés.
- Nenhuma página de dados muda somente o título mantendo `modelKey`, dimensão, colunas e visual iguais.
- Todo número dinâmico vem da API do município/trimestre selecionado; todo estático vem do arquivo oficial identificado.
- O preview e o PDF rasterizado têm a mesma sequência, uma página por slide ativo.

## T0 — inventário definitivo e bloqueio de repetição

1. Criar `slide-registry.ts` a partir do gabarito, com uma linha por slide: `referenceSlide`, `outputOrder`, `title`, `section`, `sourceKind`, `modelKey`, `visualKind`, `apiDimensions`, `staticAsset`, `enabled` e `qaStatus`.
2. Manter `referenceSlide` imutável; `outputOrder` é a numeração exibida após a supressão da capa redundante.
3. Validar em teste que:
   - `outputOrder` é contínuo;
   - há uma única capa;
   - nenhum slide quantitativo reutiliza outro `modelKey + visualKind` sem uma exceção nomeada;
   - `sourceKind=static` possui asset existente;
   - `sourceKind=api` declara dimensões e fórmula.
4. Remover os fallbacks genéricos do `ReportPaginator`. Página não implementada deve mostrar estado explícito de cobertura, nunca dados de outra página.

## T1 — incorporar literalmente os slides corporativos

### Fonte e processo

Usar exclusivamente os dois arquivos oficiais já versionados:

- `Panorama_Secovi_SP_Piracicaba_1T26_vApres_28MAI_13h50.pptx`;
- `PPT Institucional_2026 - Widescreen_NOVO (1).pptx`.

Criar script versionado `scripts/export-panorama-static-slides.*` que exporte os slides selecionados em PNG 1920×1080, registre checksum e produza `static-slides-manifest.json`. Preferir PowerPoint/LibreOffice em modo headless; se indisponível, usar renderizador PPTX documentado. Não usar screenshot manual da interface.

### Páginas obrigatórias

Mapear e importar como `StaticOfficialSlide`, com o slide inteiro como imagem de fundo, sem título/rodapé extra do React:

| Função no relatório | Conteúdo que deve aparecer literalmente |
|---|---|
| Consultores — capa | card “Consultores do estudo” do deck oficial |
| Consultores — equipe | fotos, nomes e cargos aprovados |
| Consultoria | quadro completo de consultores com retratos |
| Aplicativo | QR code, botões Android/iOS e mockups de celulares |
| Institucional/promocional | peça “Terreno de mudanças” e demais peças finais existentes |
| Encerramento Brain | slide final oficial, incluindo contatos/rodapé |

Também converter para imagem integral todo slide corporativo informativo que não tenha texto dependente de cidade/período. Os slides institucionais com conteúdo oficial não devem ser “recontados” pelo app.

**Aceite visual:** comparação por overlay entre PNG oficial e página do app; dimensão 1920×1080, diferença somente em compressão sem perda perceptível; QR legível.

## T2 — modelo granular de mercado

Construir `PanoramaMarketCube` a partir de uma única coleta por recorte, com adaptadores explícitos para `building-with-history`, `stock`, `sales`, `medium-prices`, `medium-prices-meter` e `ivv`.

Cada registro normalizado deve preservar quando disponível: empreendimento, segmento, padrão, tipologia/dormitórios, data/ano de lançamento, estágio/idade, lançada, oferta final, vendas, VGV, área, ticket, preço/m², coordenadas e proveniência.

Para cada dimensão não retornada, a página recebe `coverage: unavailable` com o nome do campo/endpoint ausente. É proibido substituir tipologia, coorte ou maturidade por padrão apenas para preencher a tabela.

## T3 — contratos e visuais exclusivos por bloco

| Referência | Modelo obrigatório | Visual obrigatório |
|---:|---|---|
| 29 | `marketSummaryBySegment` | matriz vertical/horizontal/total |
| 31 | `offerByStandard` | tabela oferta lançada/final + disponibilidade |
| 32 | `offerShareByStandard` | barras ou 100% empilhado; não tabela absoluta |
| 33 | `offerByReleaseCohort` | tabela por ano de lançamento |
| 34 | `offerByTypology` | tabela por tipologia |
| 35 | `offerShareByTypology` | gráfico de participação |
| 36–39 | `ticket/area/priceByTypologyOrStandard` | tabelas e barras de preço específicas |
| 40 | `priceSeries` | linha trimestral 17 períodos, curva suave e destaque comparável |
| 41 | `offerByCohortAndStandard` | matriz absoluta de ano × padrão |
| 42 | `shareByCohortAndStandard` | matriz percentual com data bars/heatmap |
| 43 | `maturityByStandard` | Planta/Construção/Pronto, lançada e final |
| 44 | `maturityShareByStandard` | participação da mesma matriz |
| 45 | `maturityByTypology` | Planta/Construção/Pronto × tipologia |
| 46 | `maturityShareByTypology` | participação por tipologia |
| 48 | `horizontalOfferByCohort` | coorte somente horizontal |
| 49 | `horizontalPrices` | ticket, área e R$/m² somente horizontal |
| 51 | `vgvMatrix` | matriz monetária, não unidades de estoque |
| 53–54 | `marketNarratives` | texto determinístico citando os modelos acima |
| 56 | `locations` | mapa real de coordenadas válidas |

Criar primitives editoriais `SecoviMatrixTable`, `DataBarMatrix`, `ParticipationChart`, `PriceBarChart`, `SecoviTrendChart` e `StaticOfficialSlide`. Reutilizar primitive não significa reutilizar contrato.

## T4 — fidelidade de layout

1. Reproduzir títulos, marcador amarelo, verde, cabeçalhos cinza, subtotais, rodapé oficial e espaço negativo dos slides de referência.
2. Para tabelas de maturidade e participação, implementar as duas metades “oferta lançada” e “oferta final”, totais e barras internas tal como a referência.
3. Para participação por ano × padrão, produzir a matriz de dois valores por padrão (lançada/final), totais de 100% e barras de intensidade, não três colunas genéricas.
4. As séries trimestrais devem ser limitadas aos 17 trimestres da janela oficial e ter destaque do trimestre equivalente por ano.
5. Desabilitar animação somente durante o PDF; preview pode preservar animações discretas.

## T5 — PDF e publicação

Usar o gerador rasterizado já introduzido, mas removendo definitivamente a ponte temporária baseada em `window.print`. O botão deve chamar diretamente `buildPanoramaPdf`, renderizar o root offscreen oficial e abrir a Blob URL no visualizador de PDF.

Testes do PDF:

- 61 páginas (ou quantidade exata do registry);
- 16:9 em todas;
- estáticos aparecem no PDF e no preview;
- nenhuma página em branco;
- sem shell/filtros/navegação;
- ordem igual ao registry;
- PDF aberto com `pdfjs-dist` em smoke automatizado.

## T6 — QA e relatório final

Executar screenshots em 1920×1080 e revisão lado a lado para: capa, 3, 7, 8, 10, 12, 14, 29, 31–46, 48, 49, 51, 53–58 e todos os encerramentos.

Rodar typecheck, testes, build, `check:live-docs`, commit direto na `main` e publicação. Entregar:

- mapa `referência → output → asset/modelo → fonte`;
- checksum e origem de cada imagem estática;
- cobertura de campos da API por página;
- screenshots/diff visual;
- contagem e dimensões do PDF;
- somente bloqueios reais de endpoint/metodologia.
