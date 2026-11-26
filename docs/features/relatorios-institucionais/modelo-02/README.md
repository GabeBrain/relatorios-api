# Institucionais Imprensa — panoramas regionais

**Revisão visual reaberta — 26/11/2026:** [Plano de correção visual do Sul](PLANO_CORRECAO_VISUAL_SUL_2026-11-26.md). Base: PPTX real de 92 páginas na pasta Desktop/Auditorias. Correções ainda planejadas; a validação sintética anterior não equivale ao aceite visual desta geração.

26/11/2026 · Codex/Lucas · implantação inicial na base `07c09ad4`.

**Histórico da implementação publicada:** [execução do plano de correção em 26/11/2026](EXECUCAO_2026-11-26.md). Nome solicitado: Institucionais Imprensa. As seções abaixo descrevem a implantação inicial; matrizes, sequência editorial, gráficos nativos e validação revisada estão no registro vigente.

Rota atual: `/rebrain/relatorios-institucionais/institucionais-imprensa`; a rota antiga redireciona.

## Acesso e configuração

Rota lazy `/rebrain/relatorios-institucionais/modelo-02`, sem item em menu, Home ou busca. Formulário: região do Brasil, trimestre, **mês automático de encerramento** e ano. A periodicidade inicial é somente trimestral. Lucas confirmou março/junho/setembro/dezembro; períodos ainda não encerrados são recusados.

Regiões disponíveis conforme municípios autorizados do token. `useGeoApiScope` carrega o catálogo paginado compartilhado; o adaptador regional deriva os municípios das UFs oficiais da região e valida esse recorte antes das chamadas pesadas. Não há fallback IBGE nem seleção de cidades de outra região. UFs sem municípios autorizados são listadas, e totais referem-se apenas ao recorte com acesso, sem afirmar cobertura integral do estado/região.

## Referências verificadas

Originais na [pasta de modelos](https://drive.google.com/drive/folders/139aKOxC4clvhHe0uXsRJ8lhdIK5cdaYA), baixados integralmente no Desktop de Lucas em `Relatorios Institucionais Imprensa - Referencias Regionais`. Integridade ZIP/tamanhos conferidos; texto/ordem das páginas extraídos. Os cinco arquivos têm dimensões16:9 e tema XML idêntico. Não houve revisão visual integral dos280slides originais.

| Região | Referência4T2025 | Páginas |
|---|---|---:|
| Sul | [Original](https://drive.google.com/file/d/1qyf-cxVGI8f4Sqoup5EAlyyhZbaxgqal/view) |53|
| Sudeste | [Original](https://drive.google.com/file/d/1MN2kQn2bvK_LIbocVlY1fD4zngdwjJDW/view) |55|
| Nordeste | [Original](https://drive.google.com/file/d/1D1jTzwL7AH5-lAmfBeZCtK-Gi_EUkbs-/view) |66|
| Norte | [Original](https://drive.google.com/file/d/1-s28txxkUxixx0q0lZZ3nEfxy4bJtPoB/view) |54|
| Centro-Oeste | [Original](https://drive.google.com/file/d/1DrL5mGdBRKOrTajMNe8PyHD1nOGAmYzX/view) |52|

Fundos originais das cinco capas e logo extraídos, com manifesto/hash em `assets/manifest.json`. Título, região, trimestre e ano permanecem textos editáveis. O núcleo da apresentação é adaptado; não se declara réplica integral52–66slides. Cases, equipe, contatos e números institucionais antigos não foram copiados como atuais; população/cobertura populacional ficam fora desta primeira versão até integrar fonte atualizada.

## Indicadores e política de dados

- Destaques do residencial vertical geral, MCMV e Luxo: trimestre selecionado, anterior e mesmo trimestre do ano anterior.
- Lançamentos e vendas líquidas: oito trimestres, padrões brutos, UF e acumulado no ano; VGL/VGV de fluxo em milhões corrigidos pelo INCC-DI do fechamento.
- Comparativo de lançamentos/vendas/estoque; oferta por padrão e tipologia, inclusive por UF; preços históricos por m² ponderados pelo estoque positivo; comparação anual por UF e rankings de municípios. Norte/Centro-Oeste preservam quadro adicional de valorização observado nas referências.
- Reuso aditivo de `createCalculator` do Modelo03: expostos `temporal` e `notices`, sem mudar cálculos, classificações ou formulário daquele modelo. Mesmo calendário de pesquisa e fotografias históricas; sem preço/estoque cadastral como substituto da competência.
- Equivalência global via `standard-families.ts`: Compactos=Compacto; MCMV=Econômico; Médio Padrão=Standard/Médio/Médio-Alto; Luxo=Alto/Luxo. Padrões desconhecidos e categorias brutas permanecem nos quadros; não se presume enquadramento legal MCMV.
- Divergências de estoque municipal/detalhado e padrão/tipologia ficam explícitas, sem ajustes artificiais. Fontes/competências/campos ausentes não viram zero. Uma célula regional não soma silenciosamente apenas os municípios completos. Histórico detalhado parcialmente inválido segue a política existente de isolamento e ressalva dos cadastros excluídos.
- Plano por município: releases/Padrão, sales/Padrão, stock/Padrão, stock/Tipologia e detalhes/Vertical. Sem locação, horizontal ou comercial. Séries na janela necessária para os oito trimestres e o acumulado comparável do ano anterior, limitada a2021; detalhes pelo contrato histórico existente. Comparativos anteriores à cobertura inicial ficam sem valor, não zero.
- Coleta: duas filas e portão global500ms; páginas sequenciais e validação de origem/total/sequência.429 pausa ambas as filas por Retry-After/60s e retoma; cancelamento e401/403 interrompem. Sem cache novo e sem promessa de duração autenticada.

## Mapas das capitais

Somente a capital de cada UF, incluindo Brasília/DF. Não se usa a RM no lugar da capital. Exemplo Sul: Curitiba, Florianópolis e Porto Alegre; Norte: Rio Branco, Macapá, Manaus, Belém, Porto Velho, Boa Vista e Palmas. As27capitais estão no catálogo estático de região/UF e são cruzadas com o catálogo autorizado, por nome normalizado.

Empreendimentos verticais com oferta histórica positiva no fechamento; todas as tipologias da fotografia válida contribuem. Coordenadas cadastrais válidas, dentro de limites continentais do Brasil, sem inventar localização. **Não foi feita validação por polígono municipal**; o município é o declarado/filtrado pela API, e coordenadas não comprovam a posição histórica. Ausentes/inválidas, bases excluídas e conflitos são contados. Fonte sem fotografia, capital sem acesso ou todos os empreendimentos sem coordenadas tornam o mapa pendente, sem marcar ausência como oferta zero.

Até60empreendimentos por continuação, com subdivisão espacial adicional para conjuntos de ao menos12pontos com extensão maior que20km. Pontos válidos aparecem em exatamente uma página e não são movidos, descartados ou empurrados para bordas. Coordenadas coincidentes podem se sobrepor; IDs/nomes e posições constam na conferência CSV. Base Mapbox do módulo compartilhado `map-tiles`, com adaptador largo4×2tiles para aproveitar o slide sem recortar imagens no PPTX; falta/falha de base é indicada na imagem, preservando pontos quando possível. Após20s sem resposta, tiles são sinalizados como indisponíveis; exportação não espera indefinidamente.

## Interface, arquivos e privacidade

Reutilizados `ReportLoading`/`ReportGenerationPanel` do SP e `ReportSlideControls` de Maceió, com etapas/percentuais reais, tempo, pausa e cancelar, dentro da página sem cobrir o menu. Menu móvel recolhe em sobreposição, mantendo o02oculto na navegação. `Select`, `Input`, `Button`, `Tabs`, `Alert` e `BrainLoadingState` existentes; Insights sob demanda. Cálculos e JSON/CSV em worker cancelável. Mudança de região/período/token descarta geração/exportação anterior.

JSON `modelo-02-diagnostic-v1`: identidade, seleção/mês/período, referência, municípios/UFs/capitais, critérios, fontes/HTTP sanitizados, categorias, meses observados/exigidos/ausentes, campos de preços faltantes, agregados, resumo de estados, todas as células/ressalvas e mapa de páginas físicas. Dados individuais dos empreendimentos e coordenadas não são serializados no JSON; mapas exportam contagens/cobertura. Sem token, headers, senha, endereço, contato ou corpo bruto.

CSV completo: posições lógicas, todas as células/ressalvas, agregados das fontes e conferência das localizações (ID/nome, latitude/longitude, padrão e estoque). Esta conferência é explícita e separada do JSON agregado; sem endereço/contato/histórico cadastral bruto. BOM e proteção contra fórmulas em rótulos. Texto numérico negativo permanece número.

PPTX usa o mesmo SVG da prévia com `native-pptx`: texto, tabelas, gráficos e marcadores em objetos DrawingML editáveis; fundos/logos/bases cartográficas são imagens. Diagnóstico em `customXml/modelo02-audit.xml`, notas por página, mesmo número/ordem de páginas físicas da prévia. Exportação não reconsulta mercado. Tabelas têm continuações de12linhas, sem truncar registros. Rótulos longos podem ser abreviados no desenho; valores integrais permanecem nos arquivos.

## Validações e limites do ambiente

- 26 testes finais do Modelo 02: cinco regiões, trimestre/mês, calendário, zero/ausência, fonte incompleta, exclusão de cidade de outra UF/região, capital≠RM, mais60pontos, extensão geográfica, coordenadas inválidas, padrões desconhecidos, privacidade e CSV. Suíte integrada de142testes/12arquivos antes dos ajustes finais de enquadramento/cobertura e amostra vazia (Modelo03, shell e layout incluídos), sem regressões;26testes02aprovados no fechamento. Tipos/lint/build de produção aprovados.
- Sete cenários Edge headless: Sul desktop claro com quatro municípios e65empreendimentos em Curitiba; Norte celular escuro; mercado comprovadamente sem oferta; falha do catálogo, vazio, sem token e429/cancelar. Zero chamadas pesadas sem escopo. JSON/CSV/PPTX baixados/reabertos;36páginas físicas no caso Sul, com dois mapas de Curitiba e marcadores como geometrias nativas. Mudança de ano descarta prévia/exports. Capturas de capa/gráfico/carregamento/mapas/insights inspecionadas.
- Base cartográfica configurada no ambiente respondeuHTTP200/PNG em chamada real sem expor a chave. Ensaio adicional no navegador com ruas reais e dados imobiliários sintéticos, incluindo PPTX, aprovado; enquadramento largo e capturas inspecionados. Os ensaios de mercado usam rede interceptada: **não houve coleta imobiliária autenticada nem homologação dos números de mercado**. Não se afirma tempo real de produção, paridade integral com os originais ou deploy.
- Evidências ignoradas em `.local-inputs/relatorios-lucas/modelo-02/visual-2026-11-26*`; roteiro versionado `scripts/diagnostics/modelo02-visual.mjs` (opção `--real-basemap` só libera Mapbox; mercado continua interceptado).
- Sem migration, Edge Function ou backend novo. Publicação exige autorização de Lucas; sem escrita Monday.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`.
