# Plano terminal — Terra — PDF Panorama Secovi/FIERGS para demonstração

**Data:** 2026-08-17  
**Prioridade:** demonstração ao Diego em 2026-08-18  
**Rota:** `/rebrain/panorama-secovi-fiergs`  
**Execução Git:** diretamente na `main`, sem branch  
**Referência visual/editorial:** deck congelado de Piracicaba/SP · 1T2026, 62 slides  
**Regra de dados:** todo número exibido no relatório deve vir da API/autenticação da Rebrain e dos
tratamentos do motor. O deck pode orientar título, intenção, hierarquia, composição e validação, mas
nenhum valor congelado pode alimentar o relatório em runtime.

## 1. Resultado esperado

Entregar uma versão demonstrável do produto final com:

1. relatório paginado completo, com a sequência editorial do deck de referência;
2. linguagem visual caracterizada para Secovi/FIERGS + Brain, com acabamento superior ao legado;
3. visualizações reais alimentadas pela API para o recorte selecionado;
4. páginas metodologicamente abertas presentes e bem compostas, sem dados fictícios;
5. indicação discreta e inequívoca de `Reconciliado`, `Em validação`, `Fonte indisponível` ou
   `Não aplicável` por bloco;
6. navegação página a página, visão geral e exportação/impressão em PDF 16:9;
7. modelo de dados único entre interface, gráficos, tabelas, narrativas determinísticas e PDF;
8. nenhum número hardcoded ou mockado para “fazer a demo fechar”.

O objetivo da demonstração não é afirmar que todas as metodologias estão aprovadas. É mostrar que a
fábrica do relatório está pronta e que a semana de trabalho com os analistas se restringe à
calibração de filtros, universos e fórmulas identificadas.

## 2. Princípios inegociáveis

### 2.1 Verdade dos dados

- runtime quantitativo consome apenas API GeoBrain e derivados explícitos da API;
- gabarito congelado permanece exclusivo do modo Diagnóstico/validação;
- ausência não vira zero;
- endpoint sem cobertura vira estado visual, não valor sintético;
- método aberto pode renderizar título, intenção, estrutura, legenda e explicação, mas não inventa
  série, percentual, ranking ou conclusão;
- todo componente numérico recebe `source`, `methodStatus`, `coverage` e `warnings` junto do dado;
- filtros usados no relatório devem ser os mesmos usados no diagnóstico para o mesmo recorte.

### 2.2 Separação de responsabilidades

```text
GeoApiScopeEngine
        ↓
API adapters + paginação + cache
        ↓
PanoramaReportModel (única fonte do relatório)
        ↓
Page manifest + templates visuais
        ↓
Preview paginado ───────────→ impressão/PDF
        ↓
Diagnóstico e dossiê de calibração
```

O componente de página não consulta API, não calcula regra de negócio e não lê o gabarito. Ele
somente apresenta um recorte já normalizado do `PanoramaReportModel`.

### 2.3 Demo honesta

Para métodos ainda abertos, usar uma destas apresentações:

- gráfico com dados da API e selo `Em validação`, quando a série existe mas o tratamento não foi
  aprovado;
- quadro editorial com título, pergunta respondida e `Metodologia em validação`, quando o valor não
  pode ser calculado com segurança;
- `Fonte indisponível para este recorte`, quando a chamada falhou ou não retornou cobertura;
- nunca usar `[0, 0, 0]`, fixture de Piracicaba ou dados do deck para preencher espaço.

## 3. Arquitetura alvo da feature

Evoluir sem desmontar a rota atual:

```text
src/features/panorama-secovi-fiergs/
  api/
    buildings.ts
    temporal.ts
    prices.ts
    monitored-scope.ts
  model/
    report-model.ts
    build-report-model.ts
    method-registry.ts
    coverage.ts
  report/
    report-manifest.ts
    ReportViewer.tsx
    ReportToolbar.tsx
    ReportPage.tsx
    ReportPageState.tsx
    templates/
      CoverPage.tsx
      SectionDividerPage.tsx
      InstitutionalPage.tsx
      SummaryTablePage.tsx
      TimeSeriesPage.tsx
      CompositionPage.tsx
      MatrixPage.tsx
      NarrativePage.tsx
      MapPage.tsx
      CreditsPage.tsx
    visualizations/
      ReportLineChart.tsx
      ReportStackedBarChart.tsx
      ReportCompositionChart.tsx
      ReportMetricTable.tsx
      ReportHeatMatrix.tsx
      ReportMap.tsx
    print/
      panorama-report.css
  diagnostics/                 # bancada permanece separada
  reference/                   # somente validação, nunca runtime do PDF
```

Não é obrigatório mover todos os arquivos imediatamente. A exigência é que a nova implementação
respeite essas fronteiras, podendo começar com adaptadores compatíveis nos arquivos atuais.

## 4. Contrato `PanoramaReportModel`

Criar um modelo único, serializável e independente de React:

```ts
type MethodStatus = 'approved' | 'reconciled' | 'assumed' | 'open_method';
type DataStatus = 'ready' | 'partial' | 'unavailable' | 'not_applicable';

interface ReportMetric<T> {
  id: string;
  value: T | null;
  unit: 'count' | 'brl' | 'brl_millions' | 'percent' | 'sqm' | 'brl_sqm';
  source: string[];
  formula: string;
  methodStatus: MethodStatus;
  dataStatus: DataStatus;
  coverage: { expectedPeriods: number; returnedPeriods: number; missingFields: string[] };
  warnings: string[];
}

interface PanoramaReportModel {
  meta: {
    city: string;
    uf: string;
    endQuarter: string;
    generatedAt: string;
    sourceLabel: string;
    methodologyVersion: string;
  };
  launches: LaunchReportBlock;
  sales: SalesReportBlock;
  stock: StockReportBlock;
  ivv: IvvReportBlock;
  prices: PriceReportBlock;
  cohorts: CohortReportBlock;
  maturity: MaturityReportBlock;
  vgv: VgvReportBlock;
  map: MapReportBlock;
  narratives: NarrativeReportBlock;
  quality: ReportQualitySummary;
}
```

Requisitos:

- todas as séries compartilham chaves canônicas de trimestre;
- vertical, horizontal e total são dimensões, não campos inventados ad hoc em cada gráfico;
- valores monetários permanecem em reais no motor e são convertidos apenas por formatador;
- percentuais permanecem em escala documentada (`25`, não `0.25`, ou vice-versa, mas uma só);
- `null` preserva ausência; zero significa zero retornado/derivado legitimamente;
- modelo carrega fontes, fórmulas e warnings usados tanto no PDF quanto no diagnóstico.

## 5. Coleta real da API

### 5.1 Uma execução por recorte

Ao clicar **Gerar diagnóstico completo**, reutilizar o mesmo resultado para o relatório. Não repetir
coletas pesadas ao trocar de aba ou página.

Chave mínima de cache:

```text
token-session + uf + city + endQuarter + methodologyVersion + exclusionSetVersion
```

### 5.2 Fontes

- `building-with-history`: universo granular, `release_date`, tipologias, histórico, preços,
  vendas, estoque, áreas, padrão e coordenadas;
- `temporal-analysis-city/releases`: candidato de lançamentos, somente diagnóstico enquanto divergir;
- `temporal-analysis-city/sales`: vendas líquidas e VGV vendido;
- `temporal-analysis-city/stock`: estoque e VGV disponível;
- `temporal-analysis-city/ivv`: IVV total por segmento, sem soma de percentuais agrupados;
- `medium-prices` e `medium-prices-meter`: preço/ticket e preço por m² quando cobertos;
- `monitored-cities`: delimitação obrigatória do escopo.

### 5.3 Estratégia de chamadas

1. validar UF/cidade no `GeoApiScopeEngine`;
2. iniciar coleta somente por ação explícita;
3. buscar endpoints temporais independentes em paralelo;
4. paginar cada fonte até `meta.last_page`/`links.next`;
5. buscar `building-with-history` uma única vez por tipo e compartilhar o payload entre blocos;
6. normalizar e construir o modelo fora do React;
7. manter `staleTime` e impedir refetch ao navegar entre páginas;
8. expor falha parcial por bloco sem derrubar páginas independentes;
9. cancelar tudo via `AbortSignal` ao trocar o recorte;
10. nunca embutir token, payload bruto ou credencial no PDF.

## 6. Sistema visual do relatório

### 6.1 Formato

- página 16:9 em CSS, proporção fixa `13.333in × 7.5in` na impressão paisagem;
- conteúdo dentro de safe area consistente;
- rodapé com fonte, cidade/UF, trimestre, estado metodológico e número da página;
- nenhuma página pode cortar título, legenda, tabela ou nota na quebra;
- gráficos usam SVG via Recharts e precisam aparecer integralmente na impressão;
- preview mostra uma página por vez e modo miniaturas/visão geral;
- impressão mostra todas as páginas na ordem do manifest.

### 6.2 Identidade

- base Brain: Montserrat nos títulos, Source Sans 3 no corpo, verde sálvia e amarelo dourado;
- camada Secovi/FIERGS: títulos institucionais, geometria sóbria, fundos claros, divisores com grande
  massa de cor e assinatura conjunta;
- evitar copiar defeitos do deck: tabelas ilegíveis, excesso de casas decimais e gráficos sem escala;
- preservar reconhecimento: capas, divisores, hierarquia, ordem de seções, títulos e intenção;
- usar tokens semânticos existentes, com CSS específico prefixado pela feature;
- claro/escuro na aplicação, mas PDF sempre em tema editorial claro controlado.

### 6.3 Componentes visuais reutilizáveis

- `CoverPage`: cidade, período, marca e status da versão;
- `SectionDividerPage`: número/nome de seção e frase de intenção;
- `ReportMetricTable`: cabeçalho fixo, unidade, totais e notas;
- `ReportLineChart`: séries temporais, no máximo 3 linhas, marcação do último período;
- `ReportStackedBarChart`: composição por padrão/tipo;
- `ReportCompositionChart`: barras 100% ou barras pareadas absoluto/participação;
- `ReportHeatMatrix`: ano × padrão/tipologia/maturidade;
- `ReportPageState`: estado vazio/parcial/metodologia aberta com layout editorial;
- `MethodBadge`: selo pequeno, não intrusivo e excluível da versão final após aprovação;
- `SourceFooter`: fontes e premissas específicas da página.

## 7. Manifesto das 62 intenções editoriais

Criar `report-manifest.ts` com 62 entradas estáveis. Cada entrada deve ter:

```ts
interface ReportPageDefinition {
  id: string;
  referenceSlide: number;
  section: string;
  title: string;
  intent: string;
  template: string;
  dataPath?: string;
  requiredMetrics?: string[];
  showWhen?: (model: PanoramaReportModel) => boolean;
}
```

### 7.1 Abertura e institucional — páginas 1–10

1. Pesquisa de mercado — cidade, UF e ano;
2. capa da cidade;
3. visão, missão e valores;
4. Panorama Imobiliário — trimestre final;
5. sumário automático com números reais das páginas;
6. divisor Sobre o Secovi/FIERGS;
7. texto institucional;
8. política da qualidade;
9. divisor Objetivos;
10. objetivos parametrizados: lançamentos, oferta, vendas, estoque e preços.

Textos institucionais podem ser conteúdo estático versionado, pois não são dados de mercado. Não
copiar texto protegido sem fonte/autorização; usar conteúdo institucional já fornecido no material.

### 7.2 Lançamentos — páginas 11–19

11. divisor Análise de Lançamentos;
12. comparação dos primeiros trimestres;
13. totais anuais;
14. empreendimentos lançados por trimestre e segmento;
15. empreendimentos verticais por padrão;
16. unidades lançadas por trimestre e segmento;
17. unidades verticais por padrão;
18. VGV lançado por trimestre e segmento;
19. VGV vertical lançado por padrão.

Dados: contrato granular via `release_date`; VGV pode aparecer `Em validação`.

### 7.3 Vendas e IVV — páginas 20–27

20. divisor Análise de Vendas;
21. comparação dos primeiros trimestres;
22. totais anuais;
23. unidades vendidas por trimestre e segmento;
24. VGV vendido por trimestre e segmento;
25. unidades verticais vendidas por padrão;
26. VGV vertical vendido por padrão;
27. oferta, lançamentos, vendas e IVV por faixa de área.

Dados: endpoints `sales`/`ivv` e granular. Página 27 deve existir mesmo enquanto a fórmula por área
estiver aberta, usando `ReportPageState` no corpo quantitativo não confiável.

### 7.4 Resumo e mercado vertical — páginas 28–46

28. divisor Análise Geral do Mercado;
29. cartões/tabela de totais vertical, horizontal e mercado;
30. divisor Mercado Residencial Vertical;
31. oferta lançada/final por padrão;
32. participação da oferta por padrão;
33. oferta lançada/final por ano de lançamento;
34. oferta lançada/final por tipologia;
35. participação da oferta por tipologia;
36. ticket, área e R$/m² por tipologia;
37. gráfico de R$/m² por tipologia;
38. ticket, área e R$/m² por padrão;
39. gráfico de R$/m² por padrão;
40. série de preço médio do m² vertical;
41. matriz ano de lançamento × padrão — absolutos;
42. matriz ano de lançamento × padrão — participações;
43. maturidade da oferta por padrão — absolutos;
44. maturidade da oferta por padrão — participações;
45. maturidade da oferta por tipologia — absolutos;
46. maturidade da oferta por tipologia — participações.

Dados: `stock`, preços e granular. Para páginas 41–46, montar a estrutura real mesmo que algumas
células fiquem nulas; totais e participações só aparecem quando denominadores existirem.

### 7.5 Horizontal, VGV, narrativa e mapa — páginas 47–56

47. divisor Mercado Residencial Horizontal;
48. oferta horizontal por ano de lançamento;
49. ticket, área e R$/m² horizontal;
50. divisor VGV Geral;
51. VGV ofertado, disponível e vendido por padrão;
52. divisor Análises e Observações;
53. fatos determinísticos sobre segmento/padrão;
54. fatos determinísticos sobre coortes/tipologia/preços;
55. divisor Localização dos Empreendimentos;
56. mapa dos empreendimentos verticais.

Narrativa não usa LLM nesta entrega. Gerar apenas frases determinísticas a partir de métricas
presentes; se não houver base, exibir “Análise qualitativa será incorporada após validação”. O mapa
usa somente coordenadas da API e o mesmo universo quantitativo.

### 7.6 Créditos e encerramento — páginas 57–62

57. divisor Consultores do Estudo;
58. equipe e funções parametrizáveis;
59–62. sequência visual de encerramento.

Não inventar nomes de equipe. Se não houver configuração, usar cargos/funções ou estado editorial.

## 8. Sequência de implementação no terminal

### P0 — Segurança e base

1. confirmar `main`, `git status` e preservar alterações alheias;
2. ler `AGENTS.md`, guidelines de frontend, Design System, gabarito e decisões;
3. registrar o escopo da entrega no LIVE da Rebrain;
4. não alterar o Corretor nem arquivos de Edgar/Lucas;
5. não instalar dependência sem necessidade comprovada.

### P1 — Modelo e coleta compartilhada

1. criar `PanoramaReportModel` e contratos `ReportMetric`;
2. extrair formatadores e chaves temporais compartilhadas;
3. consolidar uma única coleta granular por segmento;
4. paralelizar endpoints temporais;
5. construir `buildPanoramaReportModel()` puro;
6. conectar o mesmo modelo ao Diagnóstico e ao Relatório;
7. remover qualquer acesso do relatório à fixture/gabarito;
8. testar `null`, zero real, ausência, paginação e somas dimensionais.

### P2 — Shell paginado definitivo

1. substituir `ReportPaginator` monolítico por manifest + templates;
2. criar toolbar com anterior, próxima, seletor de página, miniaturas e exportar PDF;
3. implementar contador `página atual / total`;
4. manter página selecionada ao atualizar dados compatíveis;
5. implementar `ReportPageState` para `partial/unavailable/open_method`;
6. garantir preview responsivo sem deformar 16:9;
7. garantir impressão de todas as páginas na ordem correta.

### P3 — Sistema visual e páginas editoriais

1. construir capa principal, capa da cidade e capa do Panorama;
2. construir sumário automático;
3. construir divisores das seções;
4. construir institucional, objetivos, créditos e encerramento;
5. criar rodapé, cabeçalho contextual, selo metodológico e numeração;
6. validar identidade Brain + Secovi/FIERGS e legibilidade projetada em tela.

### P4 — Lançamentos e Vendas

1. implementar páginas 12–19 com modelo real;
2. implementar páginas 21–26 com endpoints reais;
3. usar tabela comparativa para primeiros trimestres e tabela anual;
4. usar linhas para evolução e barras empilhadas para composição;
5. formatar unidades e R$ milhões sem arredondamento enganoso;
6. sinalizar VGV/segmento aberto sem ocultar a visualização disponível;
7. construir página 27 com layout final e estado metodológico quando necessário.

### P5 — Estoque, preços, coortes e maturidade

1. implementar resumo executivo 29;
2. implementar páginas 31–35 com oferta e participação;
3. implementar páginas 36–40 com preço/ticket/área;
4. implementar matrizes 41–46;
5. implementar horizontal 48–49;
6. usar a última fotografia válida até o fechamento, nunca a data atual;
7. manter dimensões vazias como `—`, sem completar com zero.

### P6 — VGV, narrativa e mapa

1. implementar página 51 com dados disponíveis da API e status por métrica;
2. gerar narrativas determinísticas 53–54 sem LLM;
3. implementar mapa 56 com coordenadas reais;
4. filtrar coordenadas inválidas e registrar cobertura;
5. mostrar lista/contagem alternativa se o mapa não puder renderizar;
6. manter mapa e universo quantitativo reconciliáveis.

### P7 — PDF e QA visual

1. revisar `@page`, margens, cores e `print-color-adjust`;
2. remover toolbar/sidebar/badges operacionais da impressão;
3. preservar selos metodológicos que fazem parte do relatório de validação;
4. testar todas as páginas sem overflow em 1366×768 e 1920×1080;
5. testar impressão Chrome/Edge em paisagem, escala 100%, gráficos e fontes;
6. verificar página por página contra título/intenção do catálogo de 62 slides;
7. comparar visualmente pelo menos capas, uma tabela, uma série, uma composição, uma matriz,
   narrativa e mapa;
8. conferir que nenhum número do gabarito aparece sem origem API;
9. conferir que mudar cidade/período altera conteúdo e invalida cache correto;
10. conferir tema claro/escuro da aplicação e tema fixo do PDF.

### P8 — Validação técnica e entrega

Executar:

```powershell
cmd /c npm test
cmd /c npm run build
cmd /c npm run check:live-docs -- HEAD~1 HEAD
git diff --check
```

Depois:

1. atualizar `LIVE_rebrain.md` e decisões/premissas;
2. registrar páginas prontas, parciais e indisponíveis;
3. fazer commit direto na `main`;
4. publicar na `main`;
5. resumir o que Diego verá, limitações metodológicas e os próximos ajustes com analistas.

## 9. Priorização para a demonstração de amanhã

Se o tempo exigir corte, preservar nesta ordem:

### Obrigatório para demo

- modelo real da API e ausência sem mock;
- shell paginado e PDF 16:9;
- manifest completo com 62 títulos/intenções;
- capas/divisores/sumário caracterizados;
- páginas de Lançamentos 12–19;
- páginas de Vendas 21–27;
- resumo 29;
- páginas verticais 31–40;
- estados editoriais completos nas páginas ainda não calculáveis;
- fontes, escopo e método visíveis;
- exportação PDF sem cortes.

### Alta prioridade

- matrizes 41–46;
- horizontal 48–49;
- VGV 51;
- narrativas determinísticas 53–54;
- mapa 56.

### Pode receber acabamento depois da demo

- reprodução ornamental exata das quatro telas de encerramento;
- miniaturas avançadas/reordenação;
- download direto do PDF sem diálogo nativo;
- LLM para narrativa;
- pixel matching total com o deck legado;
- curadoria de universo na UI.

Mesmo no corte mínimo, todas as 62 páginas devem existir no manifest e no PDF. Páginas sem método
fechado usam o estado editorial correto e nunca dados falsos.

## 10. Critérios de aceite

- [ ] uma única execução alimenta Diagnóstico e Relatório;
- [ ] nenhum valor de referência/fixture entra no runtime do PDF;
- [ ] 62 páginas/intenções existem em ordem estável;
- [ ] todas as páginas têm título, seção, fonte/estado e número;
- [ ] páginas com dados mostram valores reais da API;
- [ ] páginas sem cálculo seguro comunicam o estado sem números sintéticos;
- [ ] o relatório navega página a página e oferece visão geral;
- [ ] exportação/impressão gera PDF paisagem completo e sem cortes;
- [ ] gráficos têm unidade, legenda, recorte e leitura clara;
- [ ] tabelas não estouram a página e usam `—` para ausência;
- [ ] narrativas são determinísticas e não afirmam fatos ausentes;
- [ ] mapa usa coordenadas da API e informa cobertura;
- [ ] estados de carregamento, erro, vazio, parcial e sucesso estão cobertos;
- [ ] testes e build passam;
- [ ] documentação viva e decisões estão atualizadas;
- [ ] commit e push ocorreram diretamente na `main`.

## 11. Handoff obrigatório do Terra

Ao concluir, Terra deve informar:

1. commit publicado;
2. quantidade de páginas `ready`, `partial`, `unavailable` e `open_method`;
3. endpoints e chamadas reutilizadas;
4. páginas com visualização real;
5. páginas com estado metodológico;
6. resultado dos testes e build;
7. limitações visuais/PDF conhecidas;
8. roteiro de cinco minutos para apresentar ao Diego;
9. próximo plano objetivo para a rodada com os analistas.

## 12. CTA curto para execução

Terra, execute integralmente o plano `PLAN_TERRA_PDF_DEMO_DIEGO_v1.md` direto na `main`. Priorize o
PDF 16:9 completo e caracterizado, com as 62 intenções editoriais, dados exclusivamente vindos das
APIs e estados claros para metodologias ainda abertas. Reutilize uma única coleta por recorte,
implemente o `PanoramaReportModel`, manifest, templates, visualizações, preview e impressão sem
cortes; rode testes/build, atualize os documentos vivos, faça commit e publique. Ao final, entregue
o resumo técnico, a cobertura das páginas e um roteiro curto para apresentar ao Diego.
