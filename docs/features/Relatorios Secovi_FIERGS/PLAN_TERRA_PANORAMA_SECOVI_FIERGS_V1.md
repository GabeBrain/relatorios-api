# Plano de aÃ§Ã£o â€” Terra â€” Panorama Secovi/FIERGS v1

**Data:** 2026-08-17
**Executor sugerido:** Terra
**Produto:** RelatÃ³rio Secovi/FIERGS
**Rota nova:** `/rebrain/panorama-secovi-fiergs`
**ReferÃªncia congelada:** `GABARITO_CONGELADO_PANORAMA_PIRACICABA_1T26_v1.md`
**Primeiro slice:** contratos e pÃ¡ginas de LanÃ§amentos â€” slides 12 a 19

## 1. Resultado esperado da v1

Uma pÃ¡gina autenticada da Rebrain que permita:

1. selecionar UF, municÃ­pio e trimestre com o `GeoApiScopeEngine`;
2. buscar dados somente apÃ³s escopo vÃ¡lido e aÃ§Ã£o explÃ­cita;
3. comparar Piracicaba 1T26 com o gabarito congelado;
4. visualizar o bloco de LanÃ§amentos em pÃ¡ginas 16:9;
5. navegar por pÃ¡ginas como em um PDF;
6. exportar/imprimir um PDF paginado com tabela, grÃ¡ficos e textos determinÃ­sticos;
7. exibir `[LLM NECESSÃRIO AQUI]` em blocos qualitativos ainda sem contrato;
8. registrar claramente premissas e divergÃªncias para retorno dos analistas.

A v1 nÃ£o precisa gerar PPTX. O artefato final inicial Ã© PDF. O modelo de pÃ¡gina deve, porÃ©m, ser
compatÃ­vel com futura geraÃ§Ã£o de PPTX e com reproduÃ§Ã£o fiel do template institucional.

## 2. Escolha de produto e arquitetura

### 2.1 PosiÃ§Ã£o no app

- Item direto em **Rebrain**: `RelatÃ³rio Secovi/FIERGS`.
- Rota lazy-loaded: `/rebrain/panorama-secovi-fiergs`.
- Manter `/rebrain/secovi` como produto existente; nÃ£o misturar os dois fluxos.
- Incluir na busca global e, quando o produto estiver utilizÃ¡vel, no card da Home.
- Badge inicial: `Em validaÃ§Ã£o Â· referÃªncia Piracicaba 1T26`.

### 2.2 Estrutura de feature

```text
src/features/panorama-secovi-fiergs/
  pages/PanoramaSecoviFiergsPage.tsx
  api.ts
  types.ts
  reference/
    piracicaba-1t26.ts
  contracts/
    launches.ts
  lib/
    aggregate-launches.ts
    compare-reference.ts
    format-report.ts
  hooks/
    use-panorama-query.ts
    use-panorama-comparison.ts
  components/
    ScopePanel.tsx
    ComparisonSummary.tsx
    ComparisonTable.tsx
    ReportPaginator.tsx
    ReportPage.tsx
    ReportExportButton.tsx
    launches/
      LaunchesQuarterTable.tsx
      LaunchesYearTable.tsx
      LaunchesTypeChart.tsx
      LaunchesStandardChart.tsx
  print/
    panorama-print.css
```

Primitives visuais devem vir de `src/components/ui/`. A feature Ã© dona de contratos, agregaÃ§Ãµes,
componentes de relatÃ³rio e adaptadores de API. NÃ£o criar novo primitive compartilhado na v1.

### 2.3 Dois modos sobre os mesmos dados

| Modo | Objetivo | ExibiÃ§Ã£o |
|---|---|---|
| ValidaÃ§Ã£o | desenvolvimento e homologaÃ§Ã£o | referÃªncia, calculado, diferenÃ§a, status, premissa |
| RelatÃ³rio | produto final | pÃ¡ginas limpas, grÃ¡ficos, tabelas, textos e fontes |

NÃ£o duplicar cÃ¡lculo. Ambos recebem um Ãºnico `PanoramaReportModel` validado.

## 3. Contrato tÃ©cnico mÃ­nimo

### 3.1 Identidade de uma mÃ©trica

```ts
type MetricStatus = 'approved' | 'reconciled' | 'assumed' | 'open_method';

interface MetricContract {
  id: string;
  title: string;
  unit: 'count' | 'currency' | 'currency_millions' | 'percent' | 'area';
  dimensions: string[];
  source: string;
  formula: string;
  status: MetricStatus;
  tolerance: { absolute?: number; relative?: number };
  consumers: number[]; // slides/pÃ¡ginas de referÃªncia
  notes?: string[];
}
```

### 3.2 Resultado comparÃ¡vel

```ts
interface ComparisonCell {
  metricId: string;
  coordinates: Record<string, string>;
  expected: number | null;
  actual: number | null;
  absoluteDifference: number | null;
  relativeDifference: number | null;
  result: 'match' | 'different' | 'missing_reference' | 'missing_api' | 'not_comparable';
  assumptionIds: string[];
}
```

### 3.3 Modelo de relatÃ³rio

```ts
interface PanoramaReportModel {
  scope: { uf: string; city: string; endQuarter: string; generatedAt: string };
  dataQuality: { warnings: string[]; incompleteMetrics: string[] };
  sections: PanoramaSection[];
  narrative: { deterministic: string[]; qualitative: string[] };
  provenance: { endpoint: string; fetchedAt: string; filterSummary: string }[];
}
```

O relatÃ³rio nÃ£o deve ler diretamente o formato cru da API. Toda visualizaÃ§Ã£o consome esse modelo.

## 4. Contratos de LanÃ§amentos â€” primeiro slice

| ID | MÃ©trica | DimensÃµes | Fonte candidata | Estado |
|---|---|---|---|---|
| `launch.projects.quarter.type` | empreendimentos lanÃ§ados | trimestre, tipo | `building-with-history` por `release_date` | `assumed` |
| `launch.projects.quarter.vertical_standard` | empreendimentos verticais | trimestre, econÃ´mico/demais | granular por padrÃ£o no lanÃ§amento | `assumed` |
| `launch.units.quarter.type` | unidades lanÃ§adas | trimestre, tipo | `temporal-analysis-city/releases` | `assumed` |
| `launch.units.quarter.vertical_standard` | unidades verticais | trimestre, econÃ´mico/demais | `releases`/granular | `assumed` |
| `launch.vgv.quarter.type` | VGV lanÃ§ado | trimestre, tipo | granular: unidades Ã— preÃ§o no lanÃ§amento | `open_method` |
| `launch.vgv.quarter.vertical_standard` | VGV vertical lanÃ§ado | trimestre, padrÃ£o agregado | granular | `open_method` |
| `launch.mcmv.year.share` | participaÃ§Ã£o MCMV | ano, base: projetos/unidades/VGV | proxy a aprovar | `open_method` |
| `launch.variation.yoy` | variaÃ§Ã£o 1T contra 1T anterior | mÃ©trica, tipo | derivada | `reconciled` |
| `launch.annual.total` | total e mÃ©dia trimestral do ano | ano, mÃ©trica, tipo | soma da sÃ©rie trimestral | `reconciled` |

### Premissas provisÃ³rias permitidas

- `Vertical` e `Horizontal` devem usar a taxonomia normalizada da API.
- â€œCondomÃ­nio de Casasâ€ Ã© a apresentaÃ§Ã£o do segmento horizontal no PDF.
- PadrÃ£o por perÃ­odo deve preferir o histÃ³rico da tipologia no trimestre; fallback sÃ³ se explÃ­cito
  e registrado como warning.
- â€œEconÃ´micoâ€ Ã© uma categoria de padrÃ£o. NÃ£o chamar de MCMV enquanto o critÃ©rio nÃ£o for aprovado.
- VGV lanÃ§ado incompleto deve aparecer como `metodologia pendente`, nÃ£o como zero.
- PerÃ­odos retroativos obrigam refetch/reagregaÃ§Ã£o de toda a janela.

## 5. Fontes e otimizaÃ§Ã£o de chamadas

1. Carregar cidades monitoradas via `GeoApiScopeEngine`, incluindo paginaÃ§Ã£o de `links.next`.
2. Exigir UF, municÃ­pio e trimestre antes de habilitar **Comparar dados**.
3. NÃ£o disparar `building-with-history` a cada mudanÃ§a de controle.
4. A aÃ§Ã£o explÃ­cita cria uma chave de consulta canÃ´nica: token fingerprint + UF + cidade + trimestre.
5. Cancelar requisiÃ§Ã£o anterior quando o usuÃ¡rio submeter outro escopo.
6. Usar React Query para cache, deduplicaÃ§Ã£o, retry controlado e estado de erro.
7. Fazer uma coleta granular reutilizÃ¡vel por todos os contratos que dependam dela.
8. Se endpoints temporais forem usados, executar apenas os conjuntos necessÃ¡rios ao bloco aberto.
9. NÃ£o buscar novamente ao alternar ValidaÃ§Ã£o â†” RelatÃ³rio.
10. Mostrar origem, recorte e horÃ¡rio da coleta no resultado.

NÃ£o usar `municipios-br.json` como fallback. Falha do escopo geogrÃ¡fico bloqueia a carga e oferece
**Tentar novamente**.

## 6. PÃ¡ginas da primeira versÃ£o do PDF

O relatÃ³rio deve usar pÃ¡ginas 16:9 (`13.333in Ã— 7.5in`), coerentes com o PPTX de referÃªncia.

| PÃ¡gina v1 | ConteÃºdo | Origem aproximada |
|---:|---|---|
| 1 | capa parametrizada: cidade, UF, trimestre, ano | slides 1/4 |
| 2 | sumÃ¡rio do recorte e qualidade dos dados | novo/melhorado |
| 3 | tabela de lanÃ§amentos por primeiros trimestres | slide 12 |
| 4 | tabela de lanÃ§amentos por ano | slide 13 |
| 5 | empreendimentos lanÃ§ados por tipo | slide 14 |
| 6 | empreendimentos verticais por padrÃ£o | slide 15 |
| 7 | unidades lanÃ§adas por tipo | slide 16 |
| 8 | unidades verticais por padrÃ£o | slide 17 |
| 9 | VGV lanÃ§ado por tipo | slide 18 |
| 10 | VGV vertical por padrÃ£o | slide 19 |
| 11 | premissas, fontes e itens metodolÃ³gicos pendentes | novo/melhorado |

Na primeira versÃ£o, pÃ¡ginas com MCMV ou VGV sem mÃ©todo aprovado devem exibir uma nota editorial
clara. Texto qualitativo nÃ£o implementado usa literalmente `[LLM NECESSÃRIO AQUI]`.

### EstratÃ©gia de PDF v1

- Construir o relatÃ³rio como HTML/CSS paginado; cada `ReportPage` Ã© uma pÃ¡gina isolada.
- GrÃ¡ficos Recharts usam SVG e preservam nitidez na impressÃ£o.
- CSS de impressÃ£o: `break-after: page`, `print-color-adjust: exact`, margens zeradas e tamanho 16:9.
- BotÃ£o **Exportar PDF** abre a impressÃ£o nativa com o documento preparado; â€œSalvar como PDFâ€
  mantÃ©m texto e SVG vetoriais sem nova dependÃªncia.
- Playwright usa `page.pdf()` para gerar o artefato automatizado de QA e conferir paginaÃ§Ã£o.
- Download PDF direto, sem diÃ¡logo, fica para uma etapa posterior caso o fluxo nativo seja rejeitado.

Essa estratÃ©gia entrega PDF real e testÃ¡vel cedo. Rasterizar a tela com canvas nÃ£o Ã© recomendado
como base, pois degrada texto, grÃ¡ficos e acessibilidade.

## 7. Etapas de execuÃ§Ã£o do Terra

### T0 â€” FundaÃ§Ã£o e rota

- Criar feature e rota lazy.
- Adicionar navegaÃ§Ã£o Rebrain e busca global.
- Criar fallback contextual de lazy-loading e erro recuperÃ¡vel.
- Montar header, badge de validaÃ§Ã£o e `ScopePanel` com `GeoApiScopeSelector`.

**Aceite:** rota abre sem carregar dataset pesado; claro/escuro e desktop/mobile funcionam.

### T1 â€” ReferÃªncia executÃ¡vel

- Converter os valores de lanÃ§amentos do gabarito em `reference/piracicaba-1t26.ts`.
- Adicionar IDs estÃ¡veis e tolerÃ¢ncias.
- Validar internamente as reconciliaÃ§Ãµes do gabarito antes de comparar API.

**Aceite:** testes provam que sÃ©ries trimestrais somam os anuais e econÃ´mico + demais = vertical.

### T2 â€” Adaptadores de API

- Implementar `api.ts` sem regra de negÃ³cio.
- Buscar lanÃ§amentos diretos e base granular necessÃ¡ria.
- Normalizar perÃ­odo, tipo, padrÃ£o, unidades, preÃ§o e data de lanÃ§amento.
- Guardar warnings de cobertura e campos ausentes.

**Aceite:** fixture da API produz um payload normalizado estÃ¡vel; erros nÃ£o viram arrays vazios.

### T3 â€” Motor de contratos

- Implementar agregaÃ§Ãµes puras dos nove contratos de lanÃ§amentos.
- Separar valores brutos de valores formatados.
- Implementar variaÃ§Ãµes, totais anuais, mÃ©dia por trimestre observado e tolerÃ¢ncias.
- Tratar denominador zero como `null/â€”`.

**Aceite:** o motor reproduz o gabarito quando alimentado pela fixture de referÃªncia.

### T4 â€” Tela de comparaÃ§Ã£o

- Resumo com contadores: bate, diverge, ausente API, sem mÃ©todo.
- Tabela filtrÃ¡vel por mÃ©trica, perÃ­odo, tipo e status.
- Detalhe da cÃ©lula: fÃ³rmula, fonte, esperado, calculado, diferenÃ§as e premissas.
- AÃ§Ã£o secundÃ¡ria para abrir a pÃ¡gina do relatÃ³rio correspondente.

**Aceite:** nenhuma divergÃªncia fica comunicada apenas por cor; filtro alterado invalida o resultado.

### T5 â€” VisualizaÃ§Ãµes e pÃ¡ginas

- Criar tabelas e grÃ¡ficos a partir do `PanoramaReportModel`.
- Implementar paginaÃ§Ã£o, miniaturas e navegaÃ§Ã£o anterior/prÃ³xima.
- Reaproveitar cores/tipografia do Design System e caracterÃ­sticas do template institucional.
- Gerar textos quantitativos por template determinÃ­stico.

**Aceite:** tabela, grÃ¡fico, texto e comparaÃ§Ã£o usam exatamente o mesmo dado agregado.

### T6 â€” ExportaÃ§Ã£o PDF

- Implementar stylesheet de impressÃ£o 16:9.
- Ocultar shell, filtros e controles na impressÃ£o.
- Repetir rodapÃ© com fonte, cidade, trimestre e nÃºmero da pÃ¡gina.
- Evitar que conteÃºdo atravesse pÃ¡ginas.

**Aceite:** PDF tem 11 pÃ¡ginas, nenhuma pÃ¡gina em branco, grÃ¡ficos nÃ­tidos e textos selecionÃ¡veis.

### T7 â€” QA automatizado e visual

- Rodar testes unitÃ¡rios, integraÃ§Ã£o, build e Playwright.
- Gerar PDF/screenshot do conjunto de lanÃ§amentos.
- Comparar lado a lado com slides 12â€“19.
- Registrar divergÃªncias no log de decisÃµes; nÃ£o alterar fÃ³rmula silenciosamente.

**Aceite:** relatÃ³rio passa nos critÃ©rios da seÃ§Ã£o 8.

## 8. EstratÃ©gia de testes

### 8.1 Testes de contrato

- Todos os 17 trimestres existem e estÃ£o ordenados.
- Soma por tipo reconcilia com total mercado.
- EconÃ´mico + demais reconcilia com vertical.
- Soma trimestral reconcilia com 2022â€“2025; 2026* usa apenas trimestres disponÃ­veis.
- Empreendimentos sÃ£o distintos; tipologias do mesmo empreendimento nÃ£o duplicam a contagem.
- VGV sem preÃ§o suficiente resulta em `null` + warning.
- Ajuste retroativo altera o trimestre histÃ³rico e o anual correspondente.
- VariaÃ§Ã£o com base zero nÃ£o gera infinito.
- FormataÃ§Ã£o nÃ£o modifica valor bruto.

### 8.2 Estados de interface

- escopo vazio;
- UF sem municÃ­pio;
- cidade sem dados;
- carregamento inicial e refetch;
- erro de cidades monitoradas;
- erro parcial e total da API;
- sucesso sem referÃªncia para outra cidade;
- sucesso comparÃ¡vel em Piracicaba 1T26;
- mudanÃ§a de filtro apÃ³s resultado;
- submissÃ£o duplicada bloqueada.

### 8.3 Teste A/B visual

Para cada pÃ¡gina de lanÃ§amentos:

1. **A â€” referÃªncia:** recorte do slide correspondente.
2. **B â€” produto:** screenshot da `ReportPage` no mesmo aspecto 16:9.
3. Comparar hierarquia, tÃ­tulos, unidades, legenda, ordem das sÃ©ries, densidade e legibilidade.
4. Separar resultado em:
   - paridade numÃ©rica;
   - paridade semÃ¢ntica;
   - fidelidade visual;
   - melhoria deliberada.
5. DiferenÃ§a visual deliberada precisa de justificativa, nÃ£o de tolerÃ¢ncia arbitrÃ¡ria.

NÃ£o exigir pixel perfect na v1. Exigir que a leitura seja igual ou melhor e que nenhum dado mude de
significado. Quando a direÃ§Ã£o decidir pela reproduÃ§Ã£o fiel, criar snapshots especÃ­ficos de paridade.

### 8.4 Matriz mÃ­nima de visual

| SuperfÃ­cie | Viewports/tema |
|---|---|
| Tela de validaÃ§Ã£o | desktop claro/escuro; mobile claro/escuro |
| PÃ¡gina individual | 16:9 claro; zoom de 80% a 125% |
| PDF | Chromium PDF; inspeÃ§Ã£o das 11 pÃ¡ginas |
| Tabela longa | sem corte; cabeÃ§alho legÃ­vel |
| GrÃ¡fico | rÃ³tulos sem colisÃ£o; legenda e unidade presentes |

## 9. Respostas dos analistas e governanÃ§a

Cada retorno deve virar uma entrada no documento de decisÃµes com:

- ID estÃ¡vel (`ANA-001`);
- data e autor;
- slide/mÃ©trica afetada;
- regra usada na versÃ£o atual;
- evidÃªncia enviada pelo analista;
- decisÃ£o tomada;
- impacto em dados, visual ou texto;
- versÃ£o a partir da qual vale;
- testes alterados/adicionados.

O gabarito v1 permanece congelado. Se a resposta mudar o que Ã© considerado correto, criar gabarito
v2 e manter teste de migraÃ§Ã£o explicando a diferenÃ§a.

## 10. NÃ­veis de automaÃ§Ã£o alcanÃ§Ã¡veis

| NÃ­vel | Entrega | Viabilidade | DependÃªncias |
|---:|---|---|---|
| 1 | XLSX com tabelas do Panorama | alta, curto prazo | contratos numÃ©ricos |
| 2 | visualizaÃ§Ãµes web interativas | alta | agregaÃ§Ãµes + Recharts |
| 3 | PDF genÃ©rico paginado e automatizado | alta na v1 | pÃ¡ginas HTML/CSS + print |
| 4 | PDF fiel ao deck atual | alta, esforÃ§o mÃ©dio | reconstruÃ§Ã£o dos layouts-imagem |
| 5 | PDF melhorado, mais claro e compacto | alta e recomendada | aprovaÃ§Ã£o editorial/analistas |
| 6 | PPTX editÃ¡vel fiel | mÃ©dia/alta, esforÃ§o maior | template nativo reconstruÃ­do + pptxgenjs/python-pptx |
| 7 | texto qualitativo assistido por LLM | alta tecnicamente, governanÃ§a necessÃ¡ria | prompt, fontes, revisÃ£o humana |

### AvaliaÃ§Ã£o objetiva

- **Planilhas:** conseguiremos gerar integralmente apÃ³s os contratos; Ã© o menor risco.
- **VisualizaÃ§Ãµes:** conseguiremos reproduzir e melhorar; Recharts jÃ¡ estÃ¡ disponÃ­vel.
- **PDF genÃ©rico limitado:** plenamente viÃ¡vel jÃ¡ no primeiro slice.
- **ReproduÃ§Ã£o fiel do relatÃ³rio:** viÃ¡vel porque temos o deck de 62 slides e o template
  institucional. Os ~25 slides-imagem precisarÃ£o ser reconstruÃ­dos como componentes nativos.
- **VersÃ£o melhorada:** tecnicamente mais simples que uma cÃ³pia exata e provavelmente melhor para
  leitura. Pode reduzir repetiÃ§Ã£o, usar visuais claros e manter um apÃªndice tabular completo.
- **PPTX editÃ¡vel:** possÃ­vel depois que o modelo de relatÃ³rio estiver estÃ¡vel; nÃ£o deve bloquear a
  primeira entrega em PDF.

## 11. RecomendaÃ§Ã£o de produto

Construir um Ãºnico motor e oferecer duas apresentaÃ§Ãµes:

1. **RelatÃ³rio executivo melhorado** â€” padrÃ£o final, mais curto, com grÃ¡ficos claros, textos
   determinÃ­sticos e tabelas detalhadas em apÃªndice.
2. **Modo de paridade** â€” usado na validaÃ§Ã£o, preserva a correspondÃªncia slide a slide com a
   referÃªncia Piracicaba 1T26.

O modo melhorado evita carregar para o futuro limitaÃ§Ãµes que existem apenas porque antigas tabelas
foram coladas como imagem. O modo de paridade dÃ¡ seguranÃ§a para provar que a mudanÃ§a visual nÃ£o
alterou os nÃºmeros.

## 12. CritÃ©rio de pronto do primeiro slice

- rota lazy e navegaÃ§Ã£o integradas;
- filtros via `GeoApiScopeEngine` e chamadas pesadas sob aÃ§Ã£o explÃ­cita;
- gabarito de lanÃ§amentos executÃ¡vel;
- contratos com IDs, fontes, fÃ³rmulas, tolerÃ¢ncias e status;
- tela de comparaÃ§Ã£o funcional;
- pÃ¡ginas 1â€“11 navegÃ¡veis;
- PDF paginado exportÃ¡vel;
- textos determinÃ­sticos e placeholder de LLM;
- testes unitÃ¡rios, integraÃ§Ã£o, Playwright, claro/escuro e mobile;
- premissas e divergÃªncias registradas;
- docs vivos atualizados antes de qualquer push relevante;
- `npm run check:live-docs -- <base> <head>` antes do push.
