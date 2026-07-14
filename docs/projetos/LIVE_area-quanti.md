# Área Quanti — Documento Vivo

**Responsável:** Lucas · **Rota:** `/quanti` · **Página:** [`src/pages/AreaQuanti.tsx`](../../src/pages/AreaQuanti.tsx)

Doc vivo do projeto. Ver a convenção e a regra de atualização em [`README.md`](./README.md).
Atualize **Desenvolvimentos / Etapas / Pendências** sempre que sincronizar uma alteração relevante.

---

## Motor / arquitetura atual (dashboard operacional — 2026-07-13)

Área dedicada aos **dados quantitativos da Brain**, hoje operando com dashboard client-side em
`/quanti` e base da **Base Unificada 2020** hospedada no Lovable Cloud Storage.

- **Estado atual — dashboard operacional.** [`AreaQuanti.tsx`](../../src/pages/AreaQuanti.tsx)
  carrega o dashboard Banco Quanti com KPIs, filtros, gráficos, mapas, rankings e análise cruzada.
- **Fonte atual:** `base-2020.json` no bucket `quanti-datasets`, gerado a partir de
  `Base_Unificada_2020-2.xlsx`.
- **Regra da planilha:** linha 1 = variáveis, linha 2 = texto das perguntas desconsiderado,
  dados válidos a partir da linha 3.

**O que já está pronto:** exploração da base 2020 com processamento 100% client-side e registro
de datasets em `src/features/area-quanti/dashboard/datasets.ts`.

---

## 1. Desenvolvimentos

### 2026-07-14 — Contraste de tabelas no modo escuro — Lovable
- **O quê:** ajuste visual localizado na aba Banco Quanti para que a Análise Cruzada Universal e os heatmaps de Intenção de Compra/Cruzamentos respeitem os tokens do tema escuro. Controles de visualização, botões CSV/XLSX, selects, tabela pivot, cabeçalho, linhas alternadas, total e células/labels de heatmap agora usam `--qd-surface`, `--qd-surface-2`, `--qd-border`, `--qd-text` e `--qd-text-muted`, eliminando fundos brancos/cinzas claros e textos escuros sem contraste no dark mode.
- **Correção adicional:** a visualização `Tabela dinâmica` da Análise Cruzada deixou de cair no fallback de barras agrupadas; agora a tabela é renderizada como tabela e gráficos só aparecem para visualizações gráficas.
- **Layout:** os gráficos da Análise Cruzada ganharam mais altura mínima, margens internas e eixo Y responsivo para rótulos longos, deixando barras, pizza/rosca e treemap menos apertados.
- **Filtros:** a barra lateral passou a oferecer também `Cidade (empreendimento)` (`cidade_original`), além de `Cidade (coleta)`, respeitando o filtro de Estado quando aplicado. A aba de filtros agora inicia fechada e abre como pop-in sobre o dashboard; o botão superior exibe ícone + texto `Filtros`.
- **Barras agrupadas:** cruzamentos universais com muitas séries agora ordenam as barras de cada grupo do maior para o menor, calculam altura por categoria conforme a quantidade de barras, ampliam o eixo Y, separam categoria principal do filtro secundário, inserem respiro entre grupos, exibem valor ao lado da barra e usam legenda superior centralizada para evitar leitura distante.
- **Métricas:** `Quantidade` voltou a mostrar apenas número bruto; foi adicionada a métrica `Quantidade + %` para exibir número de registros acompanhado da participação percentual.
- **Mapa:** mapa do Brasil e mapas municipais ganharam controles de zoom in/out/reset, área rolável e navegação por arraste do mouse para facilitar busca por municípios.
- **Layout geográfico:** o card `Distribuição por região` saiu da seção Ranking e passou a ocupar o espaço abaixo do mapa interativo, dentro do bloco `Brasil por estado`.
- **Intenção de compra:** todos os cruzamentos de intenção foram agrupados na seção `Intenção de Compra`, com intenção como coluna e o filtro analisado como linha; cada card inicia em `%` e ganhou seletor para `%`, `Quantidade` e `Quantidade + %`.
- **Ranking:** cards `Top 10 cidades` e `Top 10 estados` foram removidos por redundância com os rankings geográficos já existentes.
- **Perfil demográfico:** o card `Geração` ganhou botão informativo com as faixas de nascimento usadas para Geração Silenciosa, Baby Boomers, Geração X, Geração Y/Millennials e Geração Z.
- **Recolhimento:** a seção `Análise Cruzada (pivot dinâmico)` agora inicia recolhida e abre/fecha pelo cabeçalho, reduzindo o peso visual inicial do dashboard.
- **Pizza/Rosca:** rótulos passam a exibir nome + valor/percentual dentro da fatia quando há espaço; fatias pequenas usam chamada externa com linha guia. A legenda foi movida para a lateral direita.
- **Bugfix:** pizza/rosca agora usam o valor calculado da métrica selecionada; ao escolher `% do total`, os rótulos exibem percentuais reais em vez da contagem base formatada como porcentagem.
- **Contraste numérico:** no modo escuro, labels numéricos de gráficos voltaram a usar o texto claro do tema; o amarelo Brain fica restrito aos KPIs principais.
- **Por quê:** integrar essas áreas ao modo escuro sem alterar a paleta global nem qualquer função de cálculo, filtro, gráfico ou exportação.
- **Arquivos:** `src/features/area-quanti/dashboard/aggregate.ts`, `src/features/area-quanti/dashboard/CrossAnalysis.tsx`, `src/features/area-quanti/dashboard/Charts.tsx`, `src/features/area-quanti/dashboard/FiltersSidebar.tsx`, `src/features/area-quanti/dashboard/geo/GeoMap.tsx`, `src/features/area-quanti/dashboard/QuantiDashboard.tsx`, `src/features/area-quanti/dashboard/Rankings.tsx`, `src/features/area-quanti/dashboard/types.ts`, `src/features/area-quanti/dashboard/dashboard.css`.

### 2026-07-13 — Reversão da cor da barra superior no modo claro — Lovable
- **O quê:** ajuste em `src/features/area-quanti/dashboard/dashboard.css` para que o token `--qd-area-topbar-bg` volte a ser `var(--qd-surface)` (branco) no modo claro, mantendo `#1B1E28` apenas no modo escuro. O azul `#2563EB` retorna como cor da aba ativa no modo claro; o amarelo `#F8D000` permanece no modo escuro. Tokens CSS `--qd-tab-active`, `--qd-tab-inactive` e `--qd-tab-inactive-hover` foram criados para garantir alto contraste em ambos os temas sem duplicar classes.
- **Por quê:** a cor `#1B1E28` foi aplicada indesejadamente no modo claro; a solicitação do usuário era para deixá-la apenas no modo escuro, preservando o visual claro original da barra de abas (`Banco Quanti` / `Sobre`).
- **Arquivos:** `src/features/area-quanti/dashboard/dashboard.css`, `src/pages/AreaQuanti.tsx`.

### 2026-07-13 — Barra superior do Área Quanti no padrão de contraste escuro — Lovable
- **O quê:** repaginação da barra de abas (`Banco Quanti` / `Sobre`) em `src/pages/AreaQuanti.tsx` para fundo `#1B1E28` (mesmo padrão do dark mode do dashboard), aba ativa em amarelo Brain `#F8D000`, abas inativas em cinza claro com hover de alto contraste, e aplicação do token `--qd-text` no título/conteúdo da aba Sobre. Importação do `dashboard.css` e classe `qd-root` no container garantem que os tokens sejam reutilizados sem duplicação.
- **Por quê:** uniformizar a identidade visual da Área Quanti e eliminar a quebra de contraste (fundo branco + azul) que existia na barra de navegação.
- **Arquivos:** `src/pages/AreaQuanti.tsx`, `src/features/area-quanti/dashboard/dashboard.css`.

### 2026-07-13 — Mapa BR em tons de amarelo + Análise Cruzada com todas as 92 colunas — Lovable
- **O quê:** (1) mapa BR e municipal repaginados: rampa amarela (claro → âmbar profundo) para o heat, cinza mais escuro (`#c8c8c8`) para UFs/municípios sem registros, piso de intensidade elevado para que estados com poucas pesquisas já se destaquem do "sem dados", divisas visíveis (`#4d4d4d`, `1px` estados / `0.6px` cidades) e legenda com swatch dedicado "sem dados"; seleção em verde Brain para contraste com o amarelo. (2) `base-2020.json` regenerado com **todas as 92 colunas** da planilha (antes: 19), incluindo mapa `questions` (texto da linha 2 usado como rótulo). `detectFieldSchema` agora expõe todas as colunas do dataset — só exclui identificadores (`respondent_id`, `survey_id`, `Código`), coordenadas (`lat/lng/latitude/longitude`), sufixos `_original/_texto_original/_raw/_hash` e duplicatas normalizadas (`Cidade/Estado/idade_numerica/Data/Status`). Resultado: **76 colunas elegíveis** nos seletores "Agrupar por" e "Comparar com", com rótulos vindos da pergunta original quando disponível. (3) Legenda dentro das barras do gráfico da Análise Cruzada (padrão já adotado nos demais gráficos).
- **Por quê:** deixar o heat mais legível conforme paleta Brain, permitir cruzar qualquer variável da base (incluindo perguntas específicas de pesquisa) sem depender de whitelist no código, e alinhar leitura de barras com o padrão do dashboard.
- **Arquivos:** `src/features/area-quanti/dashboard/geo/GeoMap.tsx`, `src/features/area-quanti/dashboard/aggregate.ts` (`detectFieldSchema`), `src/features/area-quanti/dashboard/CrossAnalysis.tsx`, `src/features/area-quanti/dashboard/QuantiDashboard.tsx`, `src/features/area-quanti/dashboard/types.ts`; objeto `quanti-datasets/base-2020.json` no Lovable Cloud Storage (regerado com 92 colunas + `questions`).

### 2026-07-13 — Mapa BR político com drill-down + Análise Cruzada Universal — Lovable
- **O quê:** (1) substituído o choropleth de grade por um mapa político do Brasil (react-simple-maps) com drill-down UF → município, breadcrumb `Brasil › UF › Cidade`, tooltip com N e % da base, cor Brain verde e seleção destacada em amarelo `#F8D000`. Municípios carregados sob demanda via CDN (`tbrugz/geodata-br`) e cacheados em memória. Sincronizado com o store (`estado`/`cidade`). (2) Análise Cruzada agora é universal: detecta automaticamente as variáveis analíticas da base (categóricas e numéricas), oferece 7 métricas (`count`, `% total`, `% linha`, `% coluna`, `média`, `soma`, `mediana`) e 8 visualizações (tabela, barras agrupadas/empilhadas/100%, heatmap, pizza, rosca, treemap) — o app habilita só as compatíveis com a combinação. Toggle Tabela / Gráfico / Ambos, clique em barras/células filtra o dashboard inteiro.
- **Por quê:** navegação geográfica mais intuitiva e ferramenta de exploração agnóstica ao schema (funciona para futuras Bases Unificadas sem alteração de código).
- **Arquivos:** `src/features/area-quanti/dashboard/geo/{GeoMap.tsx,geo-utils.ts}`, `src/features/area-quanti/dashboard/CrossAnalysis.tsx` (reescrito), `src/features/area-quanti/dashboard/aggregate.ts` (`detectFieldSchema`, `crosstabUniversal`), `src/features/area-quanti/dashboard/QuantiDashboard.tsx`, `public/geo/br-states.json`.

### 2026-07-13 — Correção do JSON da Base Unificada 2020 — Lovable
- **O quê:** regeneração do `base-2020.json` ignorando a linha 2 da planilha e convertendo valores
  inválidos (`NaN`/infinitos) para `null`, garantindo JSON válido para o carregamento no dashboard.
- **Por quê:** corrigir o erro de abertura em `/quanti` causado por token `NaN` no arquivo JSON.
- **Arquivos:** `src/features/area-quanti/dashboard/useQuantiDataset.ts`; objeto
  `quanti-datasets/base-2020.json` no Lovable Cloud Storage.

### 2026-07-13 — Dashboard Banco Quanti operacional — Lovable
- **O quê:** implementação da aba Banco Quanti com filtros laterais, KPIs, gráficos, mapa do Brasil,
  rankings e pivot dinâmico exportável.
- **Por quê:** transformar a Base Unificada 2020 em uma experiência exploratória moderna e responsiva.
- **Arquivos:** `src/pages/AreaQuanti.tsx`, `src/features/area-quanti/dashboard/*`.

### 2026-07-08 — Base zero documentada — Gabriel
- **O quê:** criação deste doc vivo; registro de que a Área Quanti está em estágio de casca.
- **Por quê:** estabelecer a linha de base para o desenvolvimento do Lucas.
- **Arquivos:** `src/pages/AreaQuanti.tsx`.

<!-- novas entradas acima desta linha, mais recente no topo -->

---

## 2. Etapas

| # | Etapa | Status |
|---|---|---|
| 1 | Casca da página + rota `/quanti` | ✅ |
| 2 | Fonte inicial da Base Unificada 2020 no Lovable Cloud Storage | ✅ |
| 3 | Dashboard exploratório com filtros, KPIs, gráficos e mapas | ✅ |
| 4 | Análise cruzada dinâmica com exportação CSV/XLSX | ✅ |
| 5 | Definir contrato futuro da API/banco Quanti definitivo | 🔲 |
| 6 | Incluir novas safras/bases quantitativas no registry | 🔲 |

---

## 3. Pendências

- [ ] Definir o contrato futuro da API/banco Quanti definitivo (endpoints, autenticação e formatos).
- [ ] Padronizar o pipeline de geração/upload para novas bases (2019, 2021, 2022…).
- [ ] Validar com Lucas os campos prioritários adicionais além do schema atual do dashboard.
