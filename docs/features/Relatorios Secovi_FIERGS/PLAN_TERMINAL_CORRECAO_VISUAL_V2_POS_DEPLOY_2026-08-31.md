# Tarefa terminal — correção visual integral do Panorama V2 pós-deploy

**Data:** 31/ago/2026
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Origem do diagnóstico:** inspeção da produção pós-deploy, código atual e dois PPTX em `assets/nova ref/`.
**Objetivo:** fazer preview e PDF usarem exatamente o sistema visual 2026 dos arquivos-fonte, remover toda a moldura legada e informar progresso/tempo restante durante coleta e exportação.

## Execução registrada — 31/ago/2026

- **Fundos:** `scripts/export-panorama-v2-backgrounds.ps1` exporta e valida em 1920×1080 os fundos institucionais. A capa usa `cover-report.png`, derivado do slide 1 da Baixada com somente cidade/trimestre neutralizados; logos e geometria permanecem no PNG.
- **Casca e paginação:** as referências 1, 4 e 56 não entram no manifesto. O livro V2 tem **59 páginas** e usa contagem derivada de `PANORAMA_REPORT_MANIFEST.length` na rota, no leitor e no PDF. `Sheet` é full-bleed, sem `Footer`, `secovi-cover.jpg` ou `secovi-footer.jpeg` no caminho V2.
- **Camadas dinâmicas:** cidade(s), trimestre, títulos, tabelas, consultor e slots continuam HTML sobre o fundo. Os gradientes/polígonos reconstruídos em CSS foram neutralizados para as páginas V2.
- **Progresso/ETA:** cada cidade emite 11 unidades de trabalho concluídas (empreendimentos e dez séries temporais), seguidas de consolidação e preparação. A barra acessível é determinada; ETA usa velocidade observada depois de duas unidades e o PDF calcula o equivalente por página capturada.
- **QA:** `tests/panorama-v2-visual.spec.ts` interceptou APIs com fixture, comparou o mesmo `Sheet` em preview e export, salvou as seis capturas críticas e baixou `panorama-v2.pdf` de 59 páginas. O PNG e o PDF ficam em `.tmp/`, fora do Git. Testes de contrato e build de produção passaram.

### Refinamento após homologação visual

- O ETA não usa mais relógio em atualização contínua: só recebe novo cálculo quando uma unidade da coleta conclui e nunca pode aumentar entre etapas. O rótulo passou a indicar `Até …`.
- O exportador oculta somente o retângulo decorativo horizontal do slide de conteúdo; a geometria, o degradê e a marca superior permanecem exatamente os institucionais.
- O slide de equipe usa uma grade central 2×3: perfis fixos maiores na primeira linha e segunda linha limpa/equivalente para consultor e analistas, sem rótulos ou caixas-guia.
- Referências 60–62 usam `closing-report.png`, exportado do slide 37 da Baixada Santista, sem overlay HTML.

## Diagnóstico confirmado

1. A primeira página continua legada porque o manifesto ainda começa na referência 1, e `Content`
   renderiza `p === 1` com `secovi-cover.jpg`, a capa vermelha antiga. A capa municipal V2 só aparece
   depois, na referência 2.
2. Os fundos V2 atuais são aproximações em gradientes e polígonos CSS (`panorama-v2-*`). Eles não foram
   exportados dos PPTX; por isso parecem semelhantes, mas não idênticos.
3. `Sheet` injeta `Footer` em todas as páginas. O grid reserva `0.68in`/`6.2cqw` para o rodapé antigo,
   reduzindo capa, sumário, divisórias, consultor e equipe. O padrão 2026 não usa essa barra.
4. O deck institucional contém quatro slides vazios que são os fundos canônicos dos mesmos layouts do
   estudo da Baixada. Portanto, os fundos podem ser exportados sem texto congelado e usados como camada
   full-bleed, mantendo textos/dados dinâmicos em HTML.
5. O carregamento do relatório só expõe `isPending/isFetching`. A paginação das lâminas só existe depois
   que o modelo está pronto; ela não mede a coleta. Já a exportação PDF possui progresso real por página.
6. A interface ainda exibe “62 páginas” em textos fixos, embora o manifesto ativo tenha outra contagem.

## Mapa canônico dos fundos

Fonte de fundo: `PPT Institucional_2026 - Widescreen_NOVO (1).pptx`.
Referência editorial: `Brain_Panorama_Secovi_SP_Baixada Santista_2T26_VAP_06Ago_16h40.pptx`.

| Família V2 | Fundo vazio institucional | Slides equivalentes da Baixada | Uso no relatório |
|---|---:|---|---|
| Capa | 1 · `slideLayout1` | 1 | primeira e única capa, cidades e trimestre dinâmicos |
| Divisória | 2 · `slideLayout2` | 3, 22, 33 | aberturas de seção |
| Escuro/equipe | 3 · `slideLayout3` | 35, 36 | consultor e equipe técnica |
| Conteúdo claro | 4 · `slideLayout5` | 2 e 4–34 | sumário, tabelas, gráficos e análises |
| Encerramento | 5/6 · layouts 7/6 | 37 | fechamento institucional, conforme a entidade |

Os PNGs devem ser exportados em 16:9 na resolução de produção (1920×1080), sem redimensionamento,
recorte ou reconstrução CSS. Logos, linhas e grafismos que pertencem ao fundo ficam no PNG; cidade,
trimestre, títulos, listas, dados e pessoas variáveis continuam em HTML.

## Implementação obrigatória

### P0 — casca da página

- Remover a frase “Livro 16:9 com 62 intenções editoriais...” abaixo do título da rota.
- Substituir todos os textos fixos “62 páginas” por `PANORAMA_REPORT_MANIFEST.length`.
- Remover a referência 1 legada do manifesto V2. A primeira página deve ser a capa municipal dinâmica
  baseada no fundo canônico de layout 1; não pode existir capa vermelha anterior.
- Transformar `Sheet` em uma tela 16:9 full-bleed, sem `Footer` global e sem linha reservada no grid.
- Remover `secovi-cover.jpg` e `secovi-footer.jpeg` do caminho de renderização V2. Não apagar os arquivos
  enquanto a V1 histórica ainda puder referenciá-los.
- Fonte e elaboração, quando necessárias, pertencem ao componente da página de dados e não a uma barra
  global. Capa, sumário, divisórias, equipe, consultor e encerramento não recebem rodapé legado.

### P1 — ativos exatos e composição dinâmica

- Criar script reproduzível para exportar os slides institucionais 1–6 para
  `assets/official_v2/backgrounds/`; não editar o PPTX-fonte.
- Nomear por função (`cover.png`, `divider.png`, `dark-team.png`, `content.png`, `closing.png`) e criar
  manifesto TypeScript explícito por família visual; não escolher fundo por número mágico espalhado.
- Trocar os gradientes/polígonos de `.panorama-v2-city-cover`, `.panorama-v2-divider`,
  `.panorama-v2-summary`, `.panorama-v2-consultant` e `.panorama-v2-team` pelos PNGs canônicos.
- Recalibrar as caixas de texto sobre o fundo exportado usando os slides da Baixada como régua. A capa
  mantém cidades linha a linha e o trimestre a uma distância fixa da última cidade.
- Consultor e equipe devem ocupar 100% do quadro 16:9. Manter Fábio, Marcos e Teresa; manter três slots
  editáveis/vazios para consultor e analistas sem qualquer compressão causada por rodapé.
- Sumário deve usar o fundo de conteúdo e continuar calculando títulos/faixas pelo manifesto real.

### P2 — progresso e ETA honestos

- Adicionar contrato `PanoramaGenerationProgress` com fase, concluído, total, percentual e início.
- Instrumentar `harvestCity`: cada cidade possui 11 unidades lógicas concluíveis (prédios + dez séries
  temporais). Emitir avanço quando cada unidade termina, inclusive em erro conhecido.
- Reservar faixas: coleta 0–90%, consolidação do modelo 90–98%, montagem da prévia 98–100%.
- Calcular ETA pela velocidade observada da execução atual:
  `restante = (tempoDecorrido / unidadesConcluídas) × unidadesRestantes`.
- Antes de haver amostra suficiente, mostrar “Calculando tempo restante...”. Depois, mostrar
  “Cerca de 5 min restantes”, arredondado; nunca prometer um número fixo ou derivado da quantidade de
  páginas. Reiniciar o cálculo em nova geração e cancelar atualizações após `AbortSignal`.
- Exibir barra determinada com `role="progressbar"`, percentual, etapa atual e cidades concluídas.
- Reutilizar o progresso real já existente na exportação PDF e acrescentar ETA por página capturada.

## Arquivos principais

- `pages/PanoramaSecoviFiergsPage.tsx`
- `components/PanoramaLoadingState.tsx`
- `components/ReportPaginator.tsx`
- `components/PanoramaExportHost.tsx`
- `report/manifest.ts`
- `api.ts`
- `domain/collection.ts`
- `print/panorama-print.css`
- `types.ts`
- `assets/official_v2/backgrounds/`
- novo script em `scripts/` para exportar/validar os fundos

## Critérios de aceite

1. A rota não mostra o subtítulo “Livro 16:9...”.
2. A primeira lâmina é a capa branca/cinza 2026 idêntica ao PPTX, com cidade(s) e trimestre dinâmicos.
3. Nenhuma página V2 exibe a capa vermelha, `secovi-cover.jpg` ou o rodapé `Secovi-SP | Brain` legado.
4. Fundos de capa, conteúdo, divisória e equipe são comparação pixel a pixel dos slides vazios
   exportados; não são aproximações CSS.
5. Equipe e consultor usam toda a altura 16:9 e mantêm as áreas editáveis previstas.
6. Sumário, navegação, aba e PDF usam a contagem real do manifesto.
7. Durante a coleta, percentual nunca regride; ETA aparece só após amostra suficiente e converge ao
   tempo real. Falha parcial nomeia a cidade e não marca 100% como sucesso silencioso.
8. PDF e preview usam o mesmo `Sheet`, os mesmos fundos e a mesma geometria.
9. Testes cobrem primeiro slide, ausência de footer, mapeamento de fundos, progresso monotônico,
   cancelamento e ETA. Typecheck, testes da feature e build passam.
10. QA final compara, no mínimo: capa, sumário, uma divisória, uma tabela, consultor e equipe, em preview
    e PDF, contra os PPTX-fonte.

## Comandos de execução e aceite

```powershell
git status --short
cmd /c npm test -- --run src/features/panorama-secovi-fiergs
cmd /c npm run typecheck
cmd /c npm run build
git diff --check
```

## CTA para a tarefa terminal

> Execute integralmente `PLAN_TERMINAL_CORRECAO_VISUAL_V2_POS_DEPLOY_2026-08-31.md`. Comece exportando
> e validando os fundos vazios do PPT institucional; depois elimine a capa/rodapé legados e só então
> recalibre os overlays dinâmicos. Implemente progresso por unidades reais de coleta e ETA observado,
> não por paginação nem tempo fixo. Gere evidências visuais de capa, sumário, divisória, tabela,
> consultor e equipe em preview e PDF. Não faça commit/push antes de todos os critérios de aceite.
