# Evidências — Panorama Maceió / SINDUSCON-AL

## 23/11/2026 — PPTX editável mensal e trimestral

Código `276a69dc`; [contrato, ensaios e limites](EXPORTACAO_PPTX_2026-11-23.md). Downloads reais 82/87 páginas, objetos DrawingML e auditoria; PowerPoint abriu/renderizou 169 páginas e conservou alteração numérica após salvar/reabrir cópias das duas edições. 311 casos únicos aprovados, lint/tipos/build; interface desktop claro/celular escuro com espera lenta, cancelamento, erro HTTP e retry. Imobiliário sintético/CAGED real; geração autenticada do usuário e deploy não observados. Push autorizado expressamente por Lucas.

## 17/11/2026 — CAGED MTE, incluindo fonte antiga

[Entrega, contratos, hashes e limites](CAGED_INTEGRACAO_2026-11-17.md). Pilotos reais de setembro/2026 e dezembro/2019; quatro totais de setembro conciliados com XLSX MTE.123testes Maceió,6Python,4Edge,3rota,9regressões do proxy aplicando patch em cópia temporária.144cenários visuais+24revisões setoriais e12cenários da página real com CAGED sintético/lento. Tipos/lint/build no fechamento. Código local, sem bootstrap histórico completo, ativação remota ou geração autenticada. Sem push/Monday. Teste lento não adiciona atraso em produção; nota metodológica de 2020 permanece fora do gráfico original.

## 16/11/2026 — Continuação21–40, CAGED adiado

[Entrega e contratos](SLIDES_21_40_2026-11-16.md).58testes Maceió, tipos/lint/build;320casos de lâminas e8cenários da página real com API interceptada, incluindo índice não escolhido/escolhido e falha do núcleo. Originais preservados por SHA256. Sem coleta autenticada, consulta BigQuery ou exportação nova. Informação de Lucas: BigQuery do setor já conectado ao Rebrain, integração CAGED fica para depois.

## 16/11/2026 — Slides1–20 no padrão visual original

[Entrega, fontes, validações e limites](SLIDES_01_20_2026-11-16.md).51testes aprovados (47Maceió+4layout), tipos/lint/build;160casos de lâminas e8cenários de geração com API interceptada. Arte extraída em memória no PowerPoint com hashes originais preservados. CAGED9–14sem integração; nenhuma consulta autenticada, exportação ou homologação declarada. `ARTE.md` anterior não versionado preservado.

Comandos, versões, resultados e limites de cada verificação. Nada aqui declara homologação.

## 16/11/2026 — inventário OOXML (sessão Claude)

**Ambiente:** Windows 11, Python 3.14.6, repositório em `main` (base `90304aa7`).

**Integridade dos originais** — `Get-FileHash -Algorithm SHA256` sobre a pasta
`Referências - Maceió SINDUSCON` da Área de Trabalho:

- `5.2026_Panorama_Maceio_Sinduscon_AL_VAP_01jul_16h05.pptx` → `1ec1cd87364c56fae9d75616f1708e4ed89b8e3f9fb66167e4e31a439111c6c9` (27.375.769 bytes) — **confere** com REFERENCIAS.json.
- `Brain_Panorama_Maceio_Sinduson_AL_06.2026_vApres.pptx` → `351eeed288f1479f792f2848bf955198ad620916ed573034c2a1a0e14f6b4a14` (26.373.126 bytes) — **confere**.

**Extração** — script Python (stdlib `zipfile` + `ElementTree`, somente leitura) percorrendo
`ppt/presentation.xml` → `sldIdLst` → relationships, na ordem real de apresentação. Por slide: títulos,
textos, tabelas (linhas×colunas e células), caches de gráfico (tipos, séries, categorias, valores),
contagem de imagens e notas. Saída em `.local-inputs/relatorios-lucas/maceio/inventario/{maio_2026,junho_2026}.json`
(local, não versionado). Resultado: 82 slides (maio) e 87 (junho), ordem idêntica à numeração do MAPA_SLIDES.md.
Contagem de gráficos embutidos: 42 (maio) e 48 (junho).

**Periodicidade** — comprovada pelos caches: maio com categorias mensais (`mai/24`…`mai/26`, 25 pontos;
seriais Excel convertidos em datas nos acumulados) e junho com categorias trimestrais (`2T/22`…`2T/26`,
17 pontos) e semestrais (`1S25`/`1S26`).

## 16/11/2026 — Etapa 2: estrutura e rota oculta (sessão Claude)

**Implementado:** `src/features/relatorios-institucionais/maceio/` com `references.json` (gerado do
inventário real: 82+87 posições, hashes, drive ids, 16:9), `model.ts` (recorte por edição com validação
integral contra o catálogo autorizado via GeoApiScopeEngine, período mensal/trimestral, blueprint local
nas posições originais com progresso e cancelamento) e `MaceioInstitutionalPage.tsx` (seleção de
periodicidade/período, `BrainLoadingState` em overlay, abas Estrutura/Referências/Metodologia).
Rota lazy `/rebrain/relatorios-institucionais/maceio` registrada apenas em `App.tsx` — **sem** item em
`AppLayout`, `CommandPalette` ou `Home`, por decisão de Lucas (D3).

**Validações executadas:**

- `vitest` do módulo: 16 testes novos de `model.test.ts`, todos aprovados (posições preservadas,
  recorte 7/6 municípios, cidade ausente relatada sem encolher o conjunto, períodos, cancelamento, progresso).
- Regressão `src/features/relatorios-institucionais`: 672 testes, 671 aprovados; a única falha foi
  timeout de 5s em `sp/market-details.test.tsx` sob carga da suíte (o mesmo arquivo passa isolado em 2,6s),
  flutuação pré-existente sem relação com os arquivos tocados.
- `tsc --noEmit` exit 0; `eslint` nos arquivos novos e `App.tsx` exit 0; `npm run build` exit 0 com
  `MaceioInstitutionalPage` em chunk lazy próprio (31,97 kB).

**Não verificado (limite de ambiente):** comportamento em runtime no navegador (estados de carregamento,
escopo real do token, claro/escuro, mobile) — sem sessão autenticada do Geobrain nesta sessão. Equivalente
headless adotado: asserções sobre o blueprint e o escopo no vitest; a varredura visual parametrizada
(padrão `scripts/diagnostics/fortaleza-*-visual.mjs`) entra quando houver conteúdo de páginas a verificar.

## 16/11/2026 — Bloco 3: núcleo municipal vertical (sessão Claude)

**Implementado:** `market.ts` (reconciliação do balanço oferta anterior + lançamentos − vendas = oferta final,
por padrão e total, preservando vendas negativas e sem transformar ausência em zero), `api.ts`
(`collectMaceioMarket`: amostra de recorte, três fontes `temporal-analysis-city/{releases,sales,stock}` por
município com paginação curta validada, guardas de competência/universo, retry por cidade preservando
sucessos do mesmo recorte), `useMaceioMarket.ts` (etapas validar → fontes → balanços → prévia, cancelamento,
invalidação por token/escopo/período, fonte reprovada reconsultada no retry — nunca congelada no cache),
`MaceioGenerationPanel`/`MaceioMarketPanel` e ligação na página ("Gerar prévia vertical").

**Validações executadas:**

- 42 testes do módulo Maceió (modelo, mercado, API com request injetado e hook), incluindo: conjunto mensal
  exige os 7 municípios com Coqueiro Seco; links de paginação não mudam host/escopo; 401 sem repetição de
  credenciais e sem vazamento de corpo/erro da fonte; 429 com Retry-After; cancelamento sem resultado parcial;
  retry refaz fonte recebida mas reprovada; relatório serializado nunca contém o token.
- `tsc --noEmit` e `eslint` exit 0; `npm run build` exit 0 (chunk lazy 51,87 kB).
- Regressão `relatorios-institucionais` + `panorama-secovi-fiergs`: 1181/1186 aprovados (2 pulados).
  As 3 falhas são timeouts de 5s **pré-existentes** nesta máquina: `sp/market-details.test.tsx` (passa isolado)
  e 2 casos de `panorama-secovi-fiergs/__tests__/free-scopes-selection.test.tsx`, que falham também isolados
  com `git status` vazio para aquela pasta — ocorrem na base, sem relação com os arquivos desta entrega.

**Não verificado (limite de ambiente):** consulta autenticada real à API Geobrain (sem sessão nesta máquina);
o fixture injeta as respostas. Uma geração autenticada do recorte AL é necessária antes de qualquer
afirmação sobre as respostas reais das fontes.

**Limites da verificação da Etapa 1:**

- Extração estrutural não substitui conferência visual: slides achatados como imagem (emprego, IVV líquidas,
  IVV por área útil, horizontal, comercial) ainda precisam de render dos originais para mapear a composição.
- Nenhuma fonte de dados foi consultada; nenhum valor foi reproduzido; a matriz de indicadores está com
  `estado_metodologico = Não executado` em todas as linhas.
- Nenhuma declaração de runtime: a implantação (Etapa 2) ainda não existia no início desta sessão.
