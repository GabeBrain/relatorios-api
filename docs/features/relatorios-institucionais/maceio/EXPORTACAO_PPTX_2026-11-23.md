# Exportação PowerPoint editável — Maceió

23/11/2026 · Lucas / Codex · código `276a69dc`. Pedido confirmado para Maceió mensal e trimestral; Lucas autorizou push ao concluir. Base `a08fd296`, main limpa, origin único atualizado por fetch (0/0).

## Contrato da entrega

O botão **Baixar PPTX editável** fica na prévia dos slides. Exige geração concluída, dados em memória e blueprint do mesmo período/recorte. Exporta todas as posições, inclusive páginas editoriais e avisos de indisponibilidade: 82 no mensal, 87 no trimestral. Não coleta novamente dados imobiliários ou CAGED.

Reutiliza `shared/native-pptx.ts` e `shared/pptx-audit.ts`, sem alterar os consumidores Fortaleza/SP. Textos, valores das células, linhas, barras e outras formas dos gráficos são objetos DrawingML editáveis; gráficos usam formas separadas, sem planilha de dados vinculada. Artes, fotos, logos e mapas já rasterizados na referência continuam imagens substituíveis. Não promete converter pixels dessas artes em texto ou gráfico nativo. Fonte Tahoma necessária na máquina de edição.

Arquivos: `maceio-mensal-AAAA-MM-editavel.pptx` e `maceio-trimestral-NTAAAA-editavel.pptx`. Dimensões 16:9. A fonte dos números é exatamente a geração da prévia; não são usados valores antigos das imagens como dados novos. Pendências e bases parciais não são silenciosamente substituídas por zero.

## Proveniência, espera e cancelamento

Worker próprio prepara somente o diagnóstico agregado da exportação. A chave de sessão/token não é enviada; nenhum CSV identificado ou histórico bruto é embutido. Notas de cada página trazem situação, motivo, método, avisos de base parcial e competência CAGED. Auditoria agregada em `customXml/maceio-audit.xml`, ligada à apresentação; não despejar JSON nas notas de texto.

BrainLoadingState existente mostra etapa, tempo real e páginas efetivamente convertidas. Cancelar termina o worker ou interrompe a conversão; mudança de seleção/geração descarta o resultado antigo. Erro permite tentar novamente; portal de exportação é removido ao terminar/cancelar. Bibliotecas PPTX são importadas sob demanda. Imagens de referência têm bytes atualizados para evitar reaproveitar falha HTTP em cache; atributos dos nós de exportação são restaurados mesmo em erro. Apenas assets do relatório são lidos nessa fase, sem consultas à API de mercado.

## Validação e limites

- Suíte completa Maceió mais conversor compartilhado: 310 testes/34 arquivos aprovados; acrescentada e aprovada mais uma regressão de recuperação HTTP (seis casos no arquivo de exportação). **311 casos únicos aprovados**. Testes cobrem 82/87 páginas, ordem, geração incompatível, textos nativos, notas/customXml, ausência de captura de lâmina, cancelamento, worker sem token, conclusão tardia, retry e limpeza do portal.
- Build final de produção (inclui TypeScript), lint dos sete arquivos e `git diff --check` aprovados. Avisos existentes de bundle/xlsx/Browserslist preservados, sem erro de build.
- Downloads reais pelo Edge headless: outubro/2026 mensal em desktop 1440 claro e 3T2026 trimestral em celular 390 escuro. Espera deliberadamente lenta para inspecionar identidade Brain, cancelamento/reinício, falha HTTP de imagem e retry mensal. Sucesso sem overflow. Worker, componentes e conversor reais; nenhuma chamada autenticada de mercado.
- Pacotes reabertos: mensal **82 slides, 4.309 textos, 5.411 formas, 82 imagens** (17.568.080 bytes); trimestral **87 slides, 4.389 textos, 5.623 formas, 87 imagens** (18.543.829 bytes). Formas incluem caixas de texto. Cada imagem corresponde à arte da referência, não à captura dos dados calculados. Notas por página e auditoria agregada conferidas, sem IDs da fixture; setembro CAGED explícito no relatório de outubro. XMLs verificados no navegador e abertura nativa confirmada.
- **PowerPoint instalado:** abriu ambos os arquivos pela API COM e renderizou as **169 páginas** em PNG. Em uma cópia de cada edição, alterado texto numérico da tabela IVV de 900 para 901; arquivo salvo, fechado e reaberto com alteração preservada. Os arquivos originais de conferência não foram alterados. Verificados visualmente 24 slides representativos em duas folhas de contato, além de IVV/tabela em resolução completa: capas, mapa, CAGED, séries/negativos, ranking, escoamento, IVV, preços, estágios e comercial.
- Evidências locais ignoradas: `.local-inputs/relatorios-lucas/maceio/pptx-2026-11-23/`, incluindo os PPTX, `package-results.json`, `monthly-powerpoint-results.json`, `quarterly-powerpoint-results.json`, capturas da interface e renders do PowerPoint. Não são arquivos de números reais homologados nem devem substituir nova geração do usuário.

Os ensaios imobiliários usam fixtures; CAGED usa snapshot real verificado. Isso comprova o mecanismo de exportação e a edição, não homologa números reais do usuário. Não havia token pessoal para reexecutar API imobiliária autenticada. Nova geração autenticada e observação do deploy Lovable continuam verificações distintas. Sem escrita Monday ou alteração nos módulos paralelos.
