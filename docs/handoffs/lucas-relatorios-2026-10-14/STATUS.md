# Estado do handoff

## Comparativos por segmento — 16/10/2026

Lucas pediu o próximo lote. Páginas 9/10/11 recebem barras dos dois anos a partir da mesma consulta **Conferir históricos** usada em 12–14, sem nova coleta. Regra SP de Lucas aplicada aos dois anos, com vigência histórica a confirmar pelo analista. Totais dos segmentos reconciliados; estoque somente no último mês, base não positiva sem percentual. Em falha da consulta, gráfico atual permanece sem histórico. Reuso das artes 24/38/48, canvas e navegação existentes. 100 testes SP, tipagem/lint/build aprovados; QA 2025 fictício, retorno real ainda não observado pelo agente.

Retomar: Conferir dados reais → Conferir históricos → Ampliar slides → 9–14. Revisar o retorno real e classificação antes de séries longas ou novos indicadores. Férias a partir de 19/10 sem agenda ou retorno presumido. Abertura: main limpa, fetch sem novidade, 20 commits locais sobre origin desde 15/10 às 11h55. Sem push, publicação, geração real, Monday ou alteração em Corretor/Quanti/Secovi/FIERGS.

## Lote de históricos — 16/10/2026

- **Pedido atual:** Lucas aprovou entregar/revisar blocos completos. Lançamentos/vendas/oferta agora têm uma ação **Conferir históricos**, substituindo a ação isolada visível do checkpoint abaixo. Páginas12/13/14 usam as artes originais18/32/46.
- **Escopo:** mesmos meses dos dois anos, duas amostras e seis séries municipais curtas; normalmente8requests, até2páginas por série. Releitura igual ao baseline e balanços dos dois anos obrigatórios. Uma falha bloqueia o lote inteiro. Fluxos acumulados e estoque somente no último mês; sinais negativos preservados e base não positiva sem porcentagem.
- **Validação:** 99 testes SP e15cenários Edge aprovados com zero chamadas reais. Gráficos e ampliação revisados.2025 de QA inteiramente fictício; não é observação do provedor. Tipagem/lint/build finais registrados na entrega.
- **Retomar/testar:** na rota SP selecionar capital/3T2026, Conferir dados reais → Conferir históricos → Ampliar slides → páginas12–14. Enviar resultado ou divergência sem credenciais. Ampliar histórico longo/móvel/preços só depois de avaliar essa janela real. Férias desde19/10 e retorno não presumido, sem agenda automática.
- **Git/limites:** base `047e5bf`, origin em dia com a base e19commits locais desde15/10 às11h55 na abertura. Sem push, publicação, estudo real, coleta longa ou Monday. Nenhuma mudança autoral nos domínios Secovi/FIERGS/Corretor/Quanti.

## Checkpoint retomado — 16/10/2026

**Fechamento da retomada:** checkpoint salvo em `0c6e3c2`; merge autorizado `1ca206a` integrou os três remotos sem conflitos. Tipagem SP/lint aprovados, build final pós-merge aprovado e15cenários Edge refeitos com zero chamadas reais/erros e rótulos sem sobreposição. Os83testes SP passaram na retomada. Captura final `.local-inputs/relatorios-lucas/sp/template-review-1792160752992/slide-12-synthetic-2025.png`; continua com2025 fictício. Próximo passo imediato é a ação autenticada abaixo, não uma nova implementação. Sem push.

- **Interrupção:** o pedido de pausa de 15/10 interrompeu a gravação do checkpoint; código do comparativo ficou em arquivos locais, sem commit, e foi recuperado em 16/10. Base publicada/local anterior desta entrega: commit local `95519cf`, sem push.
- **Preparado:** botão **Conferir histórico de lançamentos**, reconferência da raiz, releitura dos lançamentos atuais e consulta dos mesmos meses do ano anterior; página 12 reutiliza a arte do slide 18. Hoje a janela é julho/agosto2025 × julho/agosto2026; datas derivam do trimestre e mês efetivamente conferido.
- **Guardas:** até duas páginas por janela, filtros/paginação preservados, retry/cancelamento, ausência diferente de zero, mesmos grupos, releitura atual igual ao município por mês e padrão. Mudança de fechamento/delta bloqueia o comparativo. Base anterior zero não gera porcentagem. Troca de escopo/identidade/trimestre invalida o resultado.
- **Evidência:** 83 testes SP aprovados na retomada. Diagnóstico anterior: 15 cenários Edge, zero chamadas reais e rótulos sem sobreposição após ajuste. Histórico2025 de teste é fictício; os 20.000 e +21,8% de QA não são observações de mercado. Resposta histórica real ainda depende do login pessoal de Lucas. Build anterior ao último ajuste de rótulos aprovado; concluir verificação final após integração.
- **Git:** fetch de 16/10 encontrou 3 remotos novos e 16 locais desde15/10 às11h55; Lucas autorizou merge preservando ambos, sem push. Remotos `22352d6`/`5a3075a`/`b6cf823` alteram tipos gerados Supabase e cache de compilação. Mensagem de deploy não comprova execução pelo agente; nenhuma função/migration será publicada nesta retomada.
- **Próxima ação humana:** na rota SP, selecionar SP/São Paulo/3T2026 → Conferir dados reais → Conferir histórico de lançamentos → Ampliar slides → página12. Conferir o retorno ou o bloqueio, sem compartilhar token. Depois delimitar histórico de vendas/oferta; curva longa desde2022 e móvel12meses continuam pendentes.
- **Limites/pausa:** sem coleta longa, geração de estudo, push, publicação ou Monday. Secovi/FIERGS/Corretor/Quanti preservados. Férias desde19/10, sem trabalho/retorno presumidos; retomar por este checkpoint e `sp/PLAN.md`.

## Conferência municipal julho/agosto — 15/10/2026

- **Estado atual:** transporte curto e botão “Conferir dados reais” preparados localmente, com amostra da raiz e três séries municipais. Replay das respostas reais recebidas: julho/agosto fecham e aparecem como **parcial até agosto** (24.351 lançadas, 26.824 vendas, estoque 124.706). Empreendimentos pendente de coleta granular; sem exportação/coleta longa. [Plano e próximo portão](../../features/relatorios-institucionais/sp/PLAN.md).
- **Evidência:** 369 testes/44 arquivos, tipagem SP/lint/build e dez verificações de UI local aprovados. Browser e requisições interceptados com respostas registradas; agente não executou consulta autenticada ao provedor. Tipagem global conserva três falhas do Corretor, sem edição do domínio alheio.
- **Retomada:** testar o novo botão com login pessoal no ambiente autorizado; depois delimitar coleta granular/fechamento uniforme e reconciliação com gabarito. Setembro segue fora se a raiz for agosto. Férias desde 19/10, janela 22–25/10 estimada, sem trabalho/retorno presumidos.
- **Git:** base `387ce41` incorpora os dois commits de Gabriel autorizados. Código/fixture de testes/evidências em commit local próprio; sem push, geração real ou Monday, conforme decisão de Lucas.

## Primeira estrutura SP autorizada e validada localmente — 15/10/2026

- **Estado atual:** primeira fatia G2 com fixtures sintéticas, em `/rebrain/relatorios-institucionais/sp`; menu “SP institucional”. Quatro indicadores, proteção do fechamento da raiz, escopo autorizado e estados de página. [Plano/retomada](../../features/relatorios-institucionais/sp/PLAN.md) e [validação/limites](../../features/relatorios-institucionais/sp/EVIDENCIAS.md). Sem novo estudo real ou homologação.
- **Validação:** 351 testes/43 arquivos, tipos isolados SP, lint/build e oito verificações de UI local (desktop/mobile, claro/escuro) aprovados. Typecheck global com três erros paralelos no Corretor preservados; ver evidência. API de mercado não chamada pelo agente. Dados recebidos nas consultas manuais não substituem reconciliação integral.
- **Regra confirmada pelo dev via Lucas:** cortar histórico por `typologies_history[].period <= period` da raiz. Exemplo recebido tem raiz agosto e histórico setembro; sistema não pode liberar 3T completo com esse limite. Não inferir fechamento pelo dia 01, máximo do histórico ou calendário.
- **Pausa:** operação informa fechamento dia 20 do mês seguinte +2–3 dias de analista; setembro estimado 22–25/10, sem garantia/API observada. Férias desde 19/10, sem retorno/trabalho presumidos. Gabriel coordena decisão durante ausência; não atribuído trabalho novo automaticamente.
- **Git/escopo:** merge `e29460d` autorizado preserva oito commits remotos e quatro locais. Código novo SP e links de shell; nenhuma alteração autoral em Corretor/Quanti/Secovi/FIERGS. Commit local da fatia identificável pelo histórico do plano. **Sem push**, conforme decisão mantida por Lucas; sem publicação, geração real ou Monday.

## Montagem local — 15/10/2026

Classificação posterior confirmada diretamente por Lucas: Compactos=Compacto; MCMV=Econômico; Médio Padrão=Standard/Médio/Médio-Alto; Luxo=Alto/Luxo. Aplicada aos slides 24/38/48, posições 9/10/11, sobre padrões já consultados; três totais preservados e layouts revisados. A pendência anterior de regra está resolvida para este piloto SP. Retomada: conferir na sessão pessoal, delimitar histórico e sua comparabilidade; vigência histórica não presumida. Sem nova coleta, push, publicação ou Monday; férias19/10 mantidas.

Lucas apresentou as três capturas reais por tipologia, com totais reconciliados. Avanço seguinte autorizado: artes por segmento (24/38/48, posições 9/10/11) preparadas; dados não preenchidos porque Lucas ainda não tem a regra de agrupamento. Tabela dos sete padrões originais reaproveita consulta atual. Retomada depende de regra/fonte/vigência do analista; não assumir Econômico=MCMV. Sem nova coleta/API, geração real, publicação ou Monday; férias19/10 preservadas.

Tipologias autorizadas e implementadas: usar **Conferir dados reais** e depois **Conferir tipologias** na mesma rota. Slides 23/37/47 ocupam as posições 6/7/8 da prévia; conferência mensal/total e raiz alterada impedem mistura de fontes. Provedor real por dormitório ainda não observado; testes têm distribuição sintética explícita. Retomada: validar botão na sessão pessoal, então classificação de padrões e plano histórico. Férias desde 19/10 mantidas; nenhuma coleta longa, exportação, push, publicação ou Monday.

Mapeamento posterior autorizado: [85 slides e fontes](../../features/relatorios-institucionais/sp/MAPA_SLIDES.md), incluindo imagens institucionais, recortes MCMV, janelas históricas, INCC/IVV e mapas. Próximo bloco delimitado: 23/37/47 por tipologia; padrão exige contrato sete→quatro categorias. Somente leitura local/PPTX e diagnóstico nesta rodada, sem novos requests ao GeoBrain, relatório gerado ou publicação. Retomada nas férias permanece documental, sem agendamento.

Correção autorizada após revisão de Lucas: manter formatação do PPTX. Capa e quatro páginas usam artes originais, dados dinâmicos e escala/ampliação 16:9. Conferidas capturas das cinco páginas e ampliação no Edge com replay e zero chamadas reais. Comparações históricas, demais slides e exportação continuam pendentes. Retomada: revisar estas páginas com Lucas; depois delimitar cobertura granular e conteúdo histórico. Pausa desde 19/10 mantida, sem agenda automática. Merge `dbb7330` autorizado, preservando `75ef905` e histórico local; sem push.

Lucas enviou capturas da consulta autenticada com 24.351 lançamentos, 26.824 vendas e estoque 124.706; balanços julho/agosto zerados. Acrescentadas três páginas de prévia (capa, indicadores, evolução mensal) sem coleta adicional ou exportação. Testes SP: 43 aprovados; tipagem e lint aprovados. Próximo: revisão visual com Lucas, depois contrato de cobertura granular. Setembro continua condicionado ao fechamento real; previsão humana 22–25/10 não substitui `data.period`. Férias desde 19/10, sem trabalho/retorno presumidos. Sem push ou Monday; Secovi/FIERGS e Corretor preservados.

## G1 — mapeamento aprovado por Lucas — 15/10/2026

- **Continuação:** Lucas autorizou seguir o plano e manteve sem push. Navegadores indisponíveis nesta sessão e credenciais de diagnóstico não configuradas; login informado no site não acessível ao agente. API de dados/catálogo ainda não verificados. Alternativa de acesso e balanço histórico em [EVIDENCIAS](../../features/relatorios-institucionais/sp/EVIDENCIAS.md): 2T26 fecha exatamente; seis de 16 intervalos históricos têm deltas sem causa demonstrada. Próximo depende de token pessoal local ou disponibilização da sessão do navegador, sem segredo no chat. Nenhuma geração/implementação iniciada.
- **Escopo atualizado:** entrega pretendida SP capital/3T2026 (julho–setembro), referência histórica 2T2026. Lucas aprovou mapear quatro indicadores; implementação G2 e ensaio real não autorizados.
- **Entrega:** [mapa curto e próximo portão](../../features/relatorios-institucionais/sp/PLAN.md), matriz com quatro gabaritos 2T e quatro contratos candidatos 3T, decisões/evidências técnicas vinculadas. Slides reais 13/18/32/46 e caches extraídos do PPTX original; sem delta calculado ou cobertura API presumidos. G1 documental parcial, método/fonte SP ainda a comprovar.
- **Acesso Drive observado:** pasta listada, texto e original do PPTX SP lidos via conector Suporte Geobrain (`clientebrain@gmail.com`), conta pessoal de Lucas não comprovada. Bruto ignorado em `.local-inputs/relatorios-lucas/sp/`, hash no catálogo existente. Lucas informou token autenticado no site; agente não leu/copiou token nem verificou catálogo/API.
- **Git:** fetch encontrou divergência 1/1; Lucas autorizou merge sem push. `bffb3c6` preserva `d360b35` e o trabalho remoto de Gabriel `416488d`; LIVE aditivo conferido sem perdas/duplicações de conteúdo. Corretor continua Gabriel, sem alteração autoral nessa frente.
- **Validação:** 26 testes offline/4 arquivos aprovados após bloqueio inicial de sandbox; detalhes em [EVIDENCIAS](../../features/relatorios-institucionais/sp/EVIDENCIAS.md). Sem API de dados, geração real, publicação ou Monday. Código de produto intocado; sem regressão completa/build/site nesta rodada.
- **Retomada:** ler `sp/PLAN.md`, conferir Git conforme AGENTS, validar catálogo autorizado e obter aprovação para leitura delimitada de dados antes da reconciliação. A decisão principal é fluxo de vendas e fotografia de estoque de SP; guardas atuais FIERGS não são contrato SP. Pausa a partir de 19/10 mantida, retorno não presumido. Registros em commit local, sem push autorizado.

## Ativação solicitada por Lucas — 15/10/2026

Registro desta sessão substitui os campos históricos “NÃO TESTADO” somente nos itens comprovados abaixo. Histórico de preparação preservado. Handoff localizado e lido neste checkout; ativação documental/offline realizada, G0 parcial. Isso não comprova acessos pessoais, capacidade disponível, aceite do piloto ou validação do produto.

### Ambiente e evidências sanitizadas

- **Máquina:** `LUCAS`, Windows/PowerShell; workspace `C:\Users\Usuario\Desktop\Sistemas Brain\Banco Quanti`. Apesar do nome da pasta, o remote é `https://github.com/GabeBrain/relatorios-api.git`.
- **Identidade:** Lucas identificado pelo pedido desta sessão. Git local configurado como `Codex Test <codex-test@example.local>`; configuração preservada. Conta GitHub autenticada NÃO TESTADA; não inferir `Kriptonyano` pela configuração Git ou pelo nome da máquina.
- **Git — OK:** único remote `origin`, branch `main`, árvore inicialmente limpa. `git fetch --all` executado com permissão de ambiente após bloqueio de escrita em `.git/FETCH_HEAD`; comparação confirmou 47 atrás/0 à frente. `git pull --ff-only` avançou `b49b804` → `1afa119`, sem merge/rebase/reset. Comparação posterior `origin/main...main`: 0/0, árvore limpa antes deste registro. Sem `upstream` configurado.
- **Toolchain — presença OK:** `node --version` = `v24.19.0`; `npm.cmd --version` = `11.17.0`. `node_modules` e `package-lock.json` presentes; não houve instalação, validação de consistência das dependências, build ou typecheck.
- **Preflight — OK:** `node scripts/handoffs/relatorios-preflight.mjs`: origem esperada, main `1afa119`, zero alterações, refs 0/0 após fetch. `.env` presente, `.env.local` ausente. Valores de credenciais não impressos.
- **Testes do diagnóstico — OK:** `node --test scripts/handoffs/relatorios-preflight.test.mjs`: 4 aprovados/0 falhas. Inclui catálogo de nove IDs únicos, links locais, matriz de 23 colunas, whitelist/sanitização e ausência de rede/mutação no modo offline. Não são regressões de produto.
- **Mapbox — presença parcial:** chave `VITE_MAPBOX_ACCESS_TOKEN` declarada em `.env`; ausente nas variáveis do processo. Verificação retornou somente booleanos; valor, validade e renderização NÃO TESTADOS. Uma tentativa inicial via `node -e` falhou por quoting do PowerShell; substituída por diagnóstico `Select-String -Quiet` sem imprimir conteúdo.
- **NÃO TESTADO por limite deliberado desta ativação offline:** permissão GitHub da conta atual (`--github` não executado), Drive/abertura do PPTX SP, login Rebrain, token/catálogo GeoBrain e autorização da capital, Lovable/publicação, mapas em runtime, navegador/conectores. Não houve tentativa de login ou erro de permissão desses serviços observado; confirmação depende de sessão pessoal autorizada. Histórico de write de 14/10 não substitui isso.
- **Limite de validação:** produto, regressões Secovi/FIERGS 2T2026/4T2025, interface e deploy não executados nesta rodada documental. Equivalente headless para a próxima fatia: contratos/fixtures positivos e negativos + regressões locais existentes antes de qualquer ensaio autorizado. Preflight não homologa o motor.

### Proposta mínima — aguardando confirmação de Lucas

1. **Próxima rodada G1:** SP institucional, São Paulo capital, referência 2T2026, núcleo vertical. Inventariar somente páginas do núcleo e preencher matriz de empreendimentos/unidades lançados na janela, vendas líquidas e oferta final: fonte, granularidade, universo, período, cobertura, fórmula e deltas. Confirmar acesso pessoal ao material antes de declarar leitura do deck. Não há matriz reconciliada nesta ativação.
2. **Fora dessa fatia inicial:** maio mensal (fonte mensal ainda a comprovar), INCC, médias sem MCMV, comparativos de 12 meses, narrativa e apêndices; registrar pendências explícitas, sem aproximações ou números fixos.
3. **G2 separado e condicionado:** após contrato demonstrado e confirmação específica de Lucas, implementar identidade própria SP e núcleo trimestral reconciliável, reutilizando motor/manifesto/guardas. Não usar `fiergs-rs` como SP. Rotas/menu/feature ainda não criados; não implementar como efeito desta proposta.

### Pausa e retomada a partir de 19/10

- Férias de Lucas começam em **19/10/2026**; retorno não informado. Não programado trabalho durante a ausência nem presumida disponibilidade em 15–16/10.
- **Feito:** sincronização Git, leitura AGENTS/índice 01–06/STATUS/área permanente, resumo humano, inspeção inicial do motor/políticas/coleta/reconciliação/exportação e diagnóstico offline. **Não feito:** G1 aprofundado, implementação G2, coleta/API de dados, estudo real, publicação ou escrita Monday. Zero custo de coleta/geração/IA pago acionado nesta ativação; tempo de trabalho não medido.
- **Estado publicado observado:** código Git recebido em `1afa119`; versão do site não verificada. Nenhum novo piloto publicado ou aceito. Registro desta ativação fica em commit documental local, sujeito a autorização de push; localizar por `git log -1 --oneline -- docs/handoffs/lucas-relatorios-2026-10-14/STATUS.md`.
- **Retomar:** ler esta seção e o índice; executar `git remote -v`, `git fetch --all`, `git status --short`, `git branch --show-current` e comparar cada remote conforme AGENTS; então `node scripts/handoffs/relatorios-preflight.mjs`. Não puxar sobre árvore suja nem resolver divergência automaticamente.
- **Decisão pendente:** Lucas confirmar G1 acima; G2/ensaio real/publicação exigem decisões posteriores. Acessos pessoais continuam pendentes. Gabriel coordena a próxima decisão na ausência, sem compromisso automático de implementar/homologar. Corretor V3 e Quanti 2026 seguem com Gabriel; Secovi/FIERGS, Sinduscon Curitiba, CID e ADM preservados.
- **Destino futuro:** contratos/planos/decisões/evidências em `docs/features/relatorios-institucionais/sp/` quando G1 começar; brutos em `.local-inputs/relatorios-lucas/sp/`, fora do Git. Sem pastas vazias antecipadas, credenciais ou diário pessoal de Gabriel alterado.
- **Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência documental, sem escrita no serviço.

## Preparação por Gabriel/Codex — 14/10/2026

**Publicação confirmada em 14/10:** Gabriel autorizou; `be413e4` e `0bac636` enviados em `ffd8924..0bac636` para origin/main. Fetch posterior 0/0; check:live-docs aprovado. Três alterações documentais FIERGS anteriores permanecem locais, fora da publicação. Lucas já pode atualizar o checkout e acionar o CTA. Recebimento por Lucas, testes na máquina dele e execução do piloto continuam pendentes. Este registro documental não é entrega de um novo relatório.

Complemento de recepção: CTA exige saudação “Olá, Lucas!”, resumo humano/arquitetura/papel do orquestrador e três leituras essenciais. Ativação limitada a leitura/checks offline, sem implementação automática. Área permanente de documentação em `docs/features/relatorios-institucionais/`; código específico ali recomendado na feature correspondente quando aprovado, sem mover motor antigo. Pacote local, ainda sem confirmação de recebimento/publicação.

- Escopo decidido por Gabriel: Lucas recebe relatórios automatizados; Gabriel mantém Corretor V3/Quanti 2026. Férias Lucas a partir de 19/10; retorno não informado.
- Conhecimento: pasta indexada, nove referências diretas com links e alertas, documentação original apontada, roteiro de acessos/testes/pausa. Binários não duplicados no Git.
- Acesso GitHub observado: `Kriptonyano`, `write` em `GabeBrain/relatorios-api` (API read-only, 14/10). Referência de identidade: handoff Quanti setembro. Não houve alteração de permissões.
- Acesso pessoal Drive/API/Rebrain/Lovable e toolchain do Lucas: **NÃO TESTADO nesta rodada**. Preencher abaixo na máquina dele.
- ADM V2 confirmado no Monday; repo não identificado entre acessos GitHub disponíveis, não clonado. CID/ADM não são escopo transferido.
- Código/execução: não implementados os quatro novos modelos; sem teste de API, estudo real, concessão de credenciais ou escrita Monday. G0/G1 do Lucas ainda não executados.
- Base do repo na preparação: `ffd8924` em main; três alterações documentais FIERGS preexistentes preservadas. Pacote/diagnóstico versionáveis em commit isolado; registrar hash no fechamento da sessão. Publicação/recebimento ainda pendentes.
- Preflight/links: quatro testes Node aprovados (catálogo nove IDs únicos, links locais resolvíveis, permissões por whitelist, ausência de rede/mutação no modo padrão e sanitização de falha). Diagnóstico offline executado na máquina de Gabriel: Node v24.14.1, main `ffd8924`, origem correta, refs cache 0/0; env/dependências somente presença, sem leitura dos valores. Lint dos dois scripts aprovado. Nenhum teste de produto/estudo real foi repetido. Evidência local não substitui ambiente do Lucas.

## Recebimento e ambiente do Lucas — preencher sem segredos

Data/máquina/conta GitHub: NÃO TESTADO.
Repo/SHA/main/remotes/divergência/dirty: NÃO TESTADO.
Node/npm/dependências: NÃO TESTADO.
Permissão GitHub da conta desta máquina: NÃO TESTADO.
Drive: abrir/ler um PPTX do catálogo: NÃO TESTADO.
Rebrain/Lovable: login pessoal/rota/histórico/permissão publicação: NÃO TESTADO.
Geobrain: token pessoal válido/catálogo/cidades do piloto, sem coleta: NÃO TESTADO.
Mapbox: presença/configuração, sem valor: NÃO TESTADO.
Conectores/navegador/sandbox: NÃO TESTADO.

## Piloto e pausa

Modelo/periodicidade/escopo escolhido: a decidir no G0/G1.
Matriz/contratos/gabarito congelado: pendente.
Regras comprovadas/hipóteses/deltas: pendente.
Arquivos/commits/testes: nenhum avanço do piloto registrado.
Última versão publicada e observada no site: não existe novo piloto publicado.
Autorização de ensaio/push: não recebida para o piloto.
Aceite identificado: nenhum para os quatro novos modelos.
Bloqueios e próximo comando: executar G0/G1 pelo CTA; registrar fronteira exata antes da pausa.
