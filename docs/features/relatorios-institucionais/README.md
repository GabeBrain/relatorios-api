# Relatórios institucionais — área de trabalho permanente

14/10/2026 · contexto inicial em [handoff Lucas](../../handoffs/lucas-relatorios-2026-10-14/README.md).

## Onde trabalhar

**Contrato obrigatório para todos os modelos:** [interface compartilhada e equivalência dos padrões](PADRAO_COMPARTILHADO.md), confirmado por Lucas em24/11/2026. Navegação/numeração/modal como Maceió; animação de carregamento como SP institucional; componentes e classificação únicos em `shared/`. Aplica-se também à próxima inclusão dos modelos01/02. Não pedir novamente o de-para por cidade.

**Modelo 03 — 24/11/2026:** [gerador comum, recortes dos 16 projetos e evidências](modelo-03/README.md). Rota oculta com três periodicidades, entidade e RM selecionável; INCC-DI, 58 contratos de indicadores, JSON/CSV/PPTX. Implementação/testes locais, sem geração imobiliária autenticada ou publicação. Maceió existente preservado.

**Maceió — continuação21–40,16/11:** [fontes, composições e limites](maceio/SLIDES_21_40_2026-11-16.md). Prévia1–40dos modelos82/87; MCMV22/33separado, rankings/tipologias reconciliados, VGL/VGVcom índice explícito e oferta no fechamento. CAGED adiado por Lucas (BigQuery do setor já conectado ao Rebrain, informação do usuário).58testes,320casos de slides e8de página interceptada. Sem coleta autenticada/homologação/exportação nova; próximo41–60.

**Maceió — primeiros20slides,16/11:** [prévia visual, fontes e limites](maceio/SLIDES_01_20_2026-11-16.md). Mensal/trimestral com navegação e arte original; cadastro e histórico de lançamentos independentes do balanço curto. CAGED9–14pendente,21em diante/exportação ainda em implantação.51testes,160casos visuais e8cenários de página com API interceptada; sem geração autenticada ou homologação.

**Maceió — inventário comprovado e estrutura, 16/11:** [plano](maceio/PLAN.md), [mapa de slides](maceio/MAPA_SLIDES.md), [matriz](maceio/MATRIZ_INDICADORES.csv), [decisões](maceio/DECISOES.md) e [evidências](maceio/EVIDENCIAS.md). Periodicidade comprovada por extração OOXML: maio = mensal (82), junho = trimestral 2T2026 (87); recorte 7/6 municípios por edição (Coqueiro Seco só na mensal). Estrutura implantada em `src/features/relatorios-institucionais/maceio/` com rota oculta `/rebrain/relatorios-institucionais/maceio` (sem menu, decisão de Lucas). Fontes, prévia de conteúdo, exportação e homologação pendentes. Handoff original: [IMPLANTACAO_CLAUDE.md](maceio/IMPLANTACAO_CLAUDE.md).

**Fortaleza — arquivos reais e referências, 16/11:** [comparação mensal/trimestral e correção dos títulos](fortaleza/COMPARACAO_REFERENCIAS_2026-11-16.md). Mensal agosto comparado a julho no período comum; lançamentos de julho e VGV na mesma base conferem. Preços, estoque, casas e padrões divergem e seguem para o analista. Títulos dos mapas e IVV corrigidos no gerador; valores dos anexos preservados.

**Fortaleza 2T2026 — diagnóstico real, 16/11:** [causa dos 64 bloqueios e correção da coleta](fortaleza/COLETA_TRIMESTRAL_64_SLIDES_2026-11-16.md). O núcleo reprovado pulava os 45 históricos municipais e 10 detalhados; consultas agora independentes, com guardas por fonte preservadas. Regressores reproduzem o resumo real 8/64/17. Nova geração autenticada necessária para conferir as respostas reais das fontes antes não consultadas.

**Fortaleza mensal/trimestral — revisão geral, 13/11:** [correções, fontes e limites](fortaleza/REVISAO_TRIMESTRAL_2026-11-13.md). Histórico parcial por tipologia bloqueia preços; fontes reprovadas são consultadas novamente. Cabeçalhos mensais/trimestrais e referência zero do IVV corrigidos. 287 testes, 604 cenários visuais, quatro cenários de recuperação e downloads PPTX/PDF 60/89 conferidos. Primeira revisão enviada por autorização de Lucas; geração autenticada e homologação continuam pendentes.

**SP — revisão do analista,11/11:** [correções, comparação dos artefatos e retomada](sp/CORRECOES_ANALISTA_2026-11-11.md). Tahoma nativo, sumário30pt, trimestre no subtítulo, Top10 percentual e fotos/exportação revisados localmente. Escoamento adiado por Lucas; preços/histórico dependem de conciliação de método e base, sem travar os demais ajustes. Sem publicação deste lote.

**Fortaleza mensal1–60 e JSON,10/11:** [estado atual](fortaleza/MENSAL_SLIDES_56_60_DIAGNOSTICO_2026-11-10.md). Prévia completa em posições editoriais, com equipes editáveis57/58e diagnóstico automático para baixar. Pendentes: fontes reais/revisão/homologação e exportação; nenhum slide mensal após60. Novo lote local.

**Fortaleza mensal46–55:** [estado atual](fortaleza/MENSAL_SLIDES_46_55_2026-11-10.md). Prévia1–55dos60originais, IVV da RM e tabelas. Próximo56–60; fontes/metodologia/homologação/exportação pendentes. Novo lote local.

**Fortaleza mensal36–45:** [estado atual](fortaleza/MENSAL_SLIDES_36_45_2026-11-10.md). Prévia1–45dos60slides; preços/IVV candidatos e insights, carregamento local. Próximo46–55; homologação/API real/exportação pendentes. Novo lote local.


**Fortaleza mensal —26–35,10/11:** [estado atual](fortaleza/MENSAL_SLIDES_26_35_2026-11-10.md). Prévia1–35na ordem dos60slides originais; VGV vendido, loteamentos e fotografias de oferta. Restam36–60/exportação e fontes/homologação pendentes. Carregamento local preservado; lote atual somente local até autorização de envio. Registros abaixo são históricos.

**Fortaleza — mensal12/14e16–25,10/11:** [estado atual](fortaleza/MENSAL_SLIDES_12_25_2026-11-10.md). Prévia1–25na ordem oficial, fontes segmentadas compartilhadas, VGL, loteamentos e início de vendas. Homologação/INCC provisório/fontes reais e26–60/exportação pendentes.1e1767epublicado; este novo lote local. Registros anteriores abaixo são históricos.

**Fortaleza — prioridade mensal,10/11:** [estado atual e próximos blocos](fortaleza/MENSAL_LANCAMENTOS_2026-11-10.md). Treze composições mensais:1–10 e11/13/15; histórico vertical25meses automático e insights.12/14 e16–60 pendentes; mensal completo/exportação/ensaio real ainda não concluídos. Rota oculta preservada. Descrições datadas abaixo são estados anteriores.

**Fortaleza — núcleo municipal vertical:** [fluxo automático e limites](fortaleza/NUCLEO_VERTICAL_2026-11-09.md), com seletor Mensal/Trimestral e referência mês/trimestre/ano. Integração local das fontes de lançamentos/vendas/oferta, ainda sem ensaio autenticado ou relatório completo. Acesso somente por rota; sem publicação.

**Fortaleza/SINDUSCON-CE — 09/11/2026:** [plano e estado da base](fortaleza/PLAN.md), [revisão dos originais](fortaleza/REVISAO_REFERENCIAS_2026-11-09.md). Base estrutural acessível somente em `/rebrain/relatorios-institucionais/fortaleza`, sem item no painel/menu. Ainda sem integração de indicadores, estudo real ou exportação.

Abrir **a raiz do checkout `relatorios-api`** no Codex/editor; comandos Git/npm partem da raiz, não da pasta de documentos. A documentação dos próximos modelos fica aqui. Criar `sp/`, `fortaleza/`, `maceio/` e `recife/` conforme cada modelo começar, sem antecipar pastas vazias como avanço.

Em cada modelo: `PLAN.md` (fatia/portões), `MATRIZ_INDICADORES.csv` (contrato/gabarito/deltas), `DECISOES.md` (fatos/hipóteses/decisões), `EVIDENCIAS.md` (comandos/versões/resultado/aceite). O catálogo inicial é [modelos.json](../../handoffs/lucas-relatorios-2026-10-14/fontes/modelos.json); acrescentar versões/fonte/hashes, sem criar cópias contraditórias do mesmo catálogo. Fichas só aparecem como prontas depois de executadas.

O handoff guarda **entrada, acessos e estado da transferência**, não toda a história futura. Seu STATUS aponta para planos/evidências aqui. `docs/projetos/LIVE_rebrain.md` é o índice vivo de entregas da plataforma. Não mover ou duplicar os históricos Secovi/FIERGS em `docs/features/Relatorios Secovi_FIERGS/`; usar links.

## Código e materiais

Proposta para composição específica dos novos modelos: `src/features/relatorios-institucionais/<modelo>/`, criando só quando G2 for aprovado. Não existe implementação nova nessa pasta nesta preparação. Extrair componentes comuns apenas se houver uso comprovado, respeitando o contrato do motor atual.

O motor que já funciona fica em `src/features/panorama-secovi-fiergs/`. Fontes, cubo, política e guardas devem ser reutilizados/estendidos de forma explícita, sem copiar o motor ou renomear a entidade FIERGS para representar SP. Uma extensão transversal exige testes dos consumidores existentes e configuração própria por modelo. Novas rotas são lazy e conectadas ao shell existente.

PPTX/PDF/XLSX brutos, CSVs de geração, caches, capturas e ensaios ficam em `.local-inputs/relatorios-lucas/<modelo>/` do checkout. São locais e ignorados; para compartilhar usar fonte Drive ou canal combinado. Versionar somente as matrizes/decisões/fixtures e evidências pequenas necessárias para reproduzir. Credenciais permanecem pessoais, fora do pacote/Git/chat.

## Papel do Lucas — orquestrador

Lucas escolhe com Gabriel a fatia, confirma acesso/capacidade, aprova decisões de escopo/editoriais, acompanha a evidência de dados/testes, decide quando pedir uma geração real e autoriza publicação conforme protocolo. Codex investiga código/fontes, propõe contrato, implementa a fatia aprovada e entrega evidência/limites. Não delegar ao agente aceitar divergências, decidir sozinho métodos sem fonte ou declarar homologação.

Abertura de sessão: resumo humano → estado/acessos → escolha de fatia → plano/matriz → implementação autorizada → testes → PDF/CSV pareados autorizados → avaliação/aceite. Na pausa: estado/commit/comando para retomar. Corretor V3/Quanti 2026 seguem com Gabriel; férias Lucas começam 19/10, sem data de retorno presumida.
