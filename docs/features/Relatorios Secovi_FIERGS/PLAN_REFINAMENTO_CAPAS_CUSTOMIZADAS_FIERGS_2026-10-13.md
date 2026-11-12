# Refinamento das capas FIERGS personalizadas — plano e execução

Data: 13/10/2026. Base: `a69028a`; main em 0/0 após fetch. Pedido: revisar três PDFs e um CSV pós-aceite, melhorar capas personalizadas e executar os ajustes claros. A versão regional aceita permanece baseline.

## R0 — revisar os insumos

Origem: `src/features/panorama-secovi-fiergs/assets/pos_aceite_eval/`. Materiais brutos locais, não ativos do produto. Preservar caminhos fornecidos e ignorar especificamente essa pasta; futuras saídas vão em `.local-inputs/`. Nenhum arquivo bruto será commitado.

PDFs: preset (14), 69 páginas; Canoas isolada, 68; Canoas/Esteio/São Leopoldo, 69. Todos rasterizados, sem texto pesquisável. Revisão visual das páginas por folhas de contato e ampliação dos pontos suspeitos; hashes e thumbnails em `.local-inputs/fiergs-capas-20261013/`.

CSV disponível: conjunto de três cidades; 265 empreendimentos, três cidades concluídas, 42 reconciliações críticas match, nenhum delta crítico. Há 29 rejeições por classificação e sete avisos existentes. Ausência de dois CSVs impede declarar auditoria integral do preset e de Canoas. Não recolher API nem mudar números para suprir os arquivos ausentes.

Achados confirmados: capa do conjunto dominada pela contagem e sem nomes; página territorial com três nomes assimétricos no grid fixo; margens/espaço em branco desproporcionais; página 43 de Canoas (oficial 47) imprime placeholder de 4 dormitórios sem série. Títulos suspeitos nas miniaturas estão completos nas páginas ampliadas: não corrigir um falso defeito. Médias/estoques/guardas preservados nesta rodada.

Portão: distinguir revisão visual de prova numérica; registrar limitações dos CSVs ausentes.

## R1 — composição das capas

Criar componentes próprios para capa e território personalizados, com identidade central existente, paleta/token SE v0.1 e hierarquia de título, nomes, UF, fechamento e janela. Preservar integralmente ramo oficial, mapa regional e imagens institucionais.

- Uma cidade: nome em destaque, alinhamento central e UF separada; tamanho ajustado para nomes longos sem corte.
- Duas a quatro cidades curtas: título curto e nomes reais em blocos centrados e simétricos. Evitar repetir a contagem como manchete.
- Muitos nomes ou nomes muito longos: título de abertura estável e resumo de quantidade/UF; lista completa na lâmina territorial, sem truncar ou omitir cidades.
- Lista territorial: centralizar conteúdo e última linha; uma/duas/três colunas conforme quantidade e comprimento. Usar margem segura idêntica nos dois lados. Paginar com capacidade menor para nomes longos e distribuir páginas para evitar continuação com um único nome.
- Footer mostra janela, fechamento e continuação quando aplicável; singular/plural correto, sem `município(s)`.

Portão: testes para 1/2/3/4/5/12/13/23 cidades, nomes longos, odd rows, ordem invertida e outro estado; nenhuma cidade perdida. Verificar visualmente screenshots e geometria do DOM em 960×540/1920×1080 e preview estreito. Sem API ou novo estudo real.

## R2 — páginas de preço sem série

Compartilhar resolução da série por dormitório entre manifesto e renderer. Omitir apenas a página cuja tipologia não tem nenhum valor finito observado no intervalo; zero observado permanece. Registrar em avisos/CSV código, tipologia e ID oficial, mantendo a numeração/sumário derivados do manifesto. Não usar indicador de outra tipologia para preencher ausência e não alterar séries/preços.

Portão: Canoas sem 4 dormitórios não imprime placeholder; série zero não é removida; preset com cobertura mantém as páginas. Mesma sequência no preview, PDF e PPT.

## R3 — validação, documentação e entrega

Testes focados de capas/layout/manifesto/avisos, regressões sintéticas 2T2026/4T2025 e tipos isolados da feature. Revisão visual real em Chromium com HTML derivado dos componentes/CSS finais e rede bloqueada, sem iniciar coleta ou geração longa. Evidências locais em `.local-inputs/`, decisões e resultados neste documento e LIVE Rebrain. Atualizar mapa System Design, plano semanal e diário SE.

Commit isolado com git add explícito; não tocar Corretor/Sinduscon ou incorporar brutos. Fetch/diferença remota antes de eventual publicação; autorização anterior cobriu a entrega já enviada, esta correção permanece local até novo pedido de publicação. Após publicar, Gabriel gera novamente os PDFs e traz os CSVs faltantes para fechar G5. Aceite regional anterior não é reaberto.

## Resultado da execução

R0–R3 concluídos localmente. Capas/território personalizados usam `CustomFiergsCovers.tsx`, composição pura em `custom-cover-layout.ts` e CSS scoped com tokens SE; os ramos oficiais continuam usando suas capas/arte/mapa anteriores. Quatro nomes na abertura formam 2×2; três formam uma linha central; listas territoriais equilibram páginas por quantidade e comprimento, com última linha centralizada. Nomes muito longos limitam a três itens por página, sem truncamento.

O helper `observedDormitoryPriceGroup` agora é compartilhado entre renderer e manifesto. A ausência de uma tipologia omite somente a respectiva lâmina e emite `DORMITORY_PRICE_SERIES_PAGE_OMITTED`. Zero finito continua visível; preço/estoque/fórmulas não foram alterados. Expectativa para a mesma fonte de Canoas: uma página a menos, retirando o placeholder oficial 47; novas contagens dependem dos dados coletados.

Validações:

- `npx.cmd vitest run src/features/panorama-secovi-fiergs --silent`: **327 testes / 39 arquivos aprovados**, incluindo regressões sintéticas 2T2026/4T2025. Após completar a proveniência da fixture, os 14 testes novos passaram novamente.
- `npx.cmd tsc --noEmit -p .local-inputs/fiergs-recortes-livres/tsconfig.json`: aprovado. A limitação anterior do typecheck app global no Corretor permanece documentada; esse módulo não foi alterado.
- `node scripts/diagnostics/fiergs-custom-cover-visual.mjs`: **81 verificações aprovadas**, sem overflow, corte de texto, sobreposição de cards com header/footer ou assimetria; larguras 480, 960 e 1920 px, até 23 cidades e nomes longos. Chromium recebe HTML dos componentes reais/CSS finais com rede bloqueada. A captura é de preview local, não um novo PDF publicado. Artefatos e JSON em `.local-inputs/fiergs-capas-20261013/`.
- `npm.cmd run build`: aprovado, Vite em 21,74 s; warnings existentes de Browserslist/chunks/xlsx, sem novo erro. Revisão React preservou componentes declarados no módulo e regras puras sem estado/efeito/fetch; acesso às cidades e cálculo numérico não tocados.
- Preset preservado nos testes de branch, capas e manifesto. Inputs mantidos no caminho original, agora ignorado especificamente; nenhuma movimentação nem inclusão de brutos.

Evidências de entrada por SHA-256: preset PDF `baac41d70c072305ec3f4ed2c7bb874facc2b6830658952212316910556b1201`; Canoas PDF `dd54e0230f0b18c5d155f3e6000ab1f9f80e9174d901b76d006ae6869b0ec6c3`; conjunto PDF `cf0454e8ae4f6da4ee0526419a55bcd40bb6c913e4d109b6660ab3f039d11e20`; CSV conjunto `51c8b5cec5d40263ec00c3de762fc0c0b71b7f38aee0f1038a59c908cceb6657`.

Pendências: publicação desta revisão e nova saída real para validar pipeline/fontes de exportação; dois CSVs faltantes para conferência numérica dos outros recortes. G5/G6 ainda não fechados; nenhum e-mail enviado.
