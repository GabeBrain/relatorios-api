# Maceió — interface da prévia e diagnóstico JSON — 17/11/2026

## Pedido e comportamento

Lucas apontou que o inventário de páginas, rótulos “sem texto”/“conteúdo editorial a revisar” e seletor de fórmula de preços fugiam do padrão do produto. Também pediu o total aguardando fonte e exportação JSON, já existentes nos outros relatórios.

- A página mantém a ação **Gerar relatório**, os filtros e a navegação/arte originais; remove a ação **Conferir estrutura** e o inventário duplicado. O blueprint interno continua existindo para organizar a geração.
- Seletores de critérios de preços e índice saem da prévia. Os gráficos de preços usam o critério já implementado `stock-weighted` (ponderação pelo estoque histórico positivo). Isso elimina a escolha por geração, sem significar homologação do original. Regra detalhada permanece no cálculo e na origem do slide; critério também aparece no JSON. Não altera funções puras nem os domínios paralelos.
- INCC continua `unconfirmed`: nenhuma série é selecionada por suposição. VGL/VGV corrigidos permanecem bloqueados e contados como pendência de critério. Ausência de fonte também continua bloqueando os indicadores.
- A mensagem técnica detalhada do indicador fica no painel recolhível **Origem e conferência deste slide**; o slide mantém seu estado visível de fonte pendente.
- **Diagnóstico da geração** reutiliza o padrão Fortaleza: preparo automático em worker ao concluir a geração, BrainLoadingState, cancelar, tentar novamente e baixar JSON. Informa total de slides, disponíveis, aguardando fonte, revisão editorial e aguardando critério. Fonte pendente é contada por resultado real dos builders, não pelo inventário estático.

## Contrato de diagnóstico

Schema `maceio-diagnostic-v1`: seleção explícita, período, referência, situação e agregados calculados por slide, resumo que fecha em 82/87, metadados de cobertura e versão CAGED, critérios e limites de homologação. Não exporta a chave da sessão, token, fotos, projetos ou históricos individuais. Dados brutos ficam apenas na memória já utilizada pela coleta; o worker recebe campos permitidos da geração e devolve somente o diagnóstico calculado.

O diagnóstico usa o mesmo critério de preços da prévia. Troca de seleção/geração termina o worker e invalida o arquivo anterior; conclusão tardia é ignorada. Diagnóstico não executa nova coleta de API nem publica dados.

## Validação e limites

Testes do módulo: 126 aprovados, incluindo 3 novos testes do diagnóstico; mais 3 testes da exportação/cancelamento/retry aprovados. Typecheck, lint dos arquivos alterados e build de produção aprovados. Script de página `scripts/diagnostics/maceio-diagnostic-page-visual.mjs`: 12 cenários aprovados, sem erros de página, com fonte sintética paginada, demora deliberada apenas no QA, mensal/trimestral e desktop/mobile nos temas claro/escuro, sem inventário/seletor, preços renderizados e download real do arquivo JSON. Cada arquivo baixado foi parseado: 82/87 slides, resumo reconciliado, disponibilidade CAGED coerente com sucesso/vazio/erro e ausência de token/histórico bruto. Capturas e arquivos ficam em `.local-inputs/relatorios-lucas/maceio/diagnostic-2026-11-17/page`. Captura desktop revisada visualmente.

Não houve geração autenticada contra fontes reais, nova implantação Cloud Run ou push desta interface. Carga CAGED remota, execução `caged-mte-loader-fm8vj`, foi informada pelo usuário como tendo concluído junho/2017 com ajustes às 14h06 de Brasília; histórico completo, rota do proxy e Scheduler continuam pendentes. Essa carga não depende desta mudança de frontend.

**Monday:** [Panorama Maceió / SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406169) — `13149406169`. Sem escrita no Monday.
