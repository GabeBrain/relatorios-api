# Dossiê de status — Panorama Secovi/FIERGS

**Data:** 17/08/2026 · **Rota:** `/rebrain/panorama-secovi-fiergs` · **Base:** `main`

## Decisão de status

O Panorama está apto como demonstração parcial de estrutura, coleta e identidade, mas **não está apto para publicação como relatório reproduzido fielmente**. Há dois bloqueios funcionais explícitos: exportação PDF e contratos das páginas 29–56.

Não existe bloqueio de acesso ao material oficial: os dois PPTX estão no repositório e o PowerPoint local exportou as páginas corporativas com sucesso.

## Estado por área

| Área | Estado | Evidência | Próxima ação |
|---|---|---|---|
| Escopo e coleta | Parcialmente pronto | Filtros usam `GeoApiScopeEngine`; modelo consulta APIs por recorte | Consolidar campos granulares no cubo de mercado |
| Capa e institucional inicial | Parcial | Estrutura e assets iniciais presentes; ajustes de fidelidade ainda são visuais | QA slide a slide 1–28 |
| Lançamentos/Vendas | Parcial | Tabelas e séries existentes, com metodologia ainda aberta em blocos | Homologar universos/fórmulas |
| Mercado imobiliário 29–56 | **Incorreto** | Páginas distintas ainda recebem `stock.units`/`MetricTable` | Substituir por contratos e visuais próprios |
| Consultores/encerramentos 57–62 | Pronto visualmente | PNGs oficiais 1920×1080 extraídos do Panorama de referência | Conferir apenas preview/PDF publicado |
| PDF | **Não pronto** | Abre aba vazia e conta 1/61; geração é DOM capture lenta/frágil | Reescrever exportador direto |

## PDF — causa e decisão para amanhã

### O que existe hoje

O botão ainda chama `window.print()` no `ReportPaginator`; uma ponte global tenta interceptar o clique, localizar elementos ocultos e capturar 61 páginas com `html-to-image`. A aba é aberta antes do Blob existir, por isso ela fica branca. O contador `Gerando PDF: n de 61` é o processo de rasterizar, uma por uma, cada página HTML.

Esse desenho é inadequado porque há duas orquestrações concorrentes (handler React legado + ponte global), a falha de um slide pode interromper o arquivo inteiro e o visualizador só recebe o PDF no fim.

### Desenho correto

1. Remover completamente `window.print`, a ponte global e a árvore `hidden print:block`.
2. Criar `PanoramaPdfExportController` React com estado próprio: `idle`, `preparing`, `capturing(n/61)`, `assembling`, `ready`, `error`.
3. Renderizar cada slide em root offscreen explícito, aguardar fontes/imagens/gráficos, rasterizar em PNG/JPEG 1920×1080 e descartar canvas a cada página.
4. Montar o PDF com `pdf-lib`: **um frame por página 16:9**. Isto é exatamente “pegar a imagem de cada slide e colocá-la em um PDF”; não há necessidade de PPTX nem edição nesta fase.
5. Somente depois de o Blob estar pronto, abrir uma aba contendo o viewer PDF. Para não sofrer bloqueio de popup, a aba pré-aberta deve exibir “Preparando PDF…” e ser redirecionada para a Blob URL ao concluir.
6. Ao falhar, manter a tela atual e mostrar o slide/etapa causador; nunca abrir uma aba branca sem diagnóstico.
7. Smoke E2E: gerar PDF de fixture, abrir via `pdfjs-dist`, validar 61 páginas, 16:9, sem página branca e com miniaturas de capa, tabela, gráfico, mapa e slide corporativo.

**Aceite do PDF:** um clique; após conclusão, viewer nativo com 61 páginas navegáveis e botão de download do próprio navegador. Sem diálogo de impressão, sem nova chamada à API e sem página branca.

## Repetição de dados — causa comprovada

O mapa atual no `ReportPaginator` encaminha as referências **29, 31–35, 41–46, 48 e 56** para `r.stock.units`; 36/38 usam o mesmo ticket, 37/39/49 o mesmo preço/m². Em seguida, todas são renderizadas por `MetricTable`. Portanto, os títulos são diferentes, mas o dataset, a dimensão e o visual permanecem iguais.

Isto explica exatamente as telas enviadas: “Ano de lançamento × padrão”, “Maturidade por padrão” e suas participações não têm, hoje, ano de lançamento, estágio de obra, percentuais nem data bars.

## Contrato mínimo por bloco a implementar

| Referências | Dimensão/fórmula | Saída |
|---|---|---|
| 29 | segmento × oferta lançada/final/disponibilidade | matriz resumo |
| 31–32 | padrão × lançada/final e participação | tabela + gráfico |
| 33 | ano de lançamento | tabela de coortes |
| 34–35 | tipologia e participação | tabela + gráfico |
| 36–40 | ticket, área e R$/m² por tipologia/padrão/série | tabelas, barras e linha |
| 41–42 | ano × padrão, absoluto e percentual | matriz/data bars |
| 43–46 | Planta/Construção/Pronto × padrão/tipologia | matrizes e participações |
| 48–49 | somente horizontal | coorte e preços |
| 51 | VGV monetário | matriz monetária |
| 53–54 | fatos dos modelos acima | narrativa determinística |
| 56 | coordenadas válidas | mapa |

Se uma dimensão não vier de endpoint algum, a página deve declarar cobertura ausente. Não pode receber uma tabela de estoque por padrão como substituto.

## Material oficial já pronto

Os assets finais abaixo foram exportados do deck `Panorama_Secovi_SP_Piracicaba_1T26_vApres_28MAI_13h50.pptx` e estão prontos para preview/PDF:

| Referência | Arquivo |
|---:|---|
| 57 | `assets/corporate/panorama-57.png` |
| 58 | `assets/corporate/panorama-58.png` |
| 59 | `assets/corporate/panorama-59.png` |
| 60 | `assets/corporate/panorama-60.png` |
| 61 | `assets/corporate/panorama-61.png` |
| 62 | `assets/corporate/panorama-62.png` |

## Próxima sessão — ordem obrigatória

1. Reescrever o PDF em componente React direto e aprovar o smoke de 61 páginas.
2. Criar registry de slides e teste antirrepetição.
3. Criar `PanoramaMarketCube` e adaptadores dos campos granulares.
4. Implementar 29, 31–35, 41–46 primeiro — são os erros visuais mais evidentes.
5. Implementar preços, horizontais, VGV, narrativas e mapa.
6. QA lado a lado com o PPT em 1920×1080 e somente então nova publicação.

## Validações já executadas

- Typecheck: aprovado.
- Testes: 141 aprovados.
- Build de produção: aprovado.
- Limite: essas validações não substituem QA visual autenticado, nem provam que o PDF do recorte real conclui.
