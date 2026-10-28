# Estimativas de vendas — plano técnico da V1 essencial

Data: 28/10/2026. Responsável: Gabriel. Executor previsto: Sol light. Estado: planejamento; nenhuma mudança de runtime nesta entrega. Objetivo: concluir numa execução o fluxo integrado, validá-lo localmente e prepará-lo para testes em produção. Publicação exige autorização explícita; V1 de interface não significa importação homologada.

## 1. Resultado e limites

Na rota `/rebrain/estimativas-vendas`: selecionar universo autorizado, ver empreendimentos com curvas, explorar previsão/backtest, selecionar conjunto e baixar pacote rastreável. Preservar a jornada operacional e os motores existentes. Não substituir trabalho real por demonstrações do ZIP.

Usar como fontes: [contrato de saída](CONTRATO_E_VALIDACAO.md), [plano científico e evidências existentes](PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md), [briefing de experiência](CTA_CLAUDE_DESIGN_ESTUDOS_2026-10-27.md). Este plano é a fonte de execução da próxima interface; o plano científico mantém regras matemáticas e registro da versão anterior. Em conflito, condições científicas e contrato prevalecem sobre o protótipo.

Entregar análise e pacote de revisão mesmo sem contrato externo. Não habilitar envio ao Geobrain, importar dados, editar coeficientes, inventar rateio entre tipologias, preencher preço/distratos ou gerar faixas sem método. Não treinar modelos novos nesta entrega. Não alterar ferramentas paralelas.

## 2. Inspeção do ZIP v2 e decisões de aproveitamento

Origem: `src/features/estimativas-vendas/estimativas-vendas-prototipo-v2.zip`, fornecido por Gabriel. SHA256: `dc961e4201b9b72ad1898a047871e2fee3695e544c0c149e5de16ba7dfd89da1`. Extração inspecionada em `.local-inputs/estimativas-vendas/claude-design-v2-20261028/estimativas-vendas-v2/`. Foram lidos README, motor, serviço de cálculo e exportação; não houve ensaio visual/navegação do ZIP nesta preparação. Alegações de acessibilidade do README não são verificações nossas.

Adotar como inspiração: lista de 15 curvas por página, explorador amplo com anterior/próximo, duas alças temporais, separação zoom/protocolo, seleção independente de filtros, resumo de teste e revisão do conjunto. Reaproveitar somente ativos aprovados; shell, primitives e tokens vêm da Rebrain/System Design.

Rejeitar explicitamente:

- `engine.js`: vertical é horizontal multiplicado por 0,82; histórico mínimo de 3 meses/2 trimestres; domínio genérico de 48 meses; clamp de fração vendida; nenhum desses itens substitui nossos motores.
- Bloqueio geral de origem desconhecida do protótipo: preservar exploração identificada quando calculável, sem liberar lote operacional.
- Backtest Finotti anterior ao treinamento: manter o bloqueio existente, não apenas trocar o rótulo para exploratório e calcular.
- `compute.js` criado de texto/Blob e fallback síncrono: usar worker ES existente, cancelar tarefas e rejeitar respostas antigas.
- Suposição de coleta trimestral sempre em trimestre civil: usar evidência de intervalo; datas da API não comprovam cadência oficial.
- Exportação sempre a partir da última data global: o período do arquivo deve ser explicitamente revisado e corresponder à execução selecionada.
- CSV mínimo demonstrativo, ZIP artesanal, endpoints `/universos`, `/comparacoes`, `/exportacoes`, bibliotecas sugeridas e sessionStorage: não são contratos nem infraestrutura existente.
- Logo textual, latência simulada, dados demo e tokens alternativos: não entram no produto.
- Universo parcial como sucesso: manter snapshot anterior identificado e bloquear pacote do universo novo até consulta completa.

## 3. Base real a reutilizar

- `source.ts`: leitura, paginação de até 8 requisições simultâneas, retries e cancelamento. Tipos/cidades não podem multiplicar esse limite.
- `operational/OperationalPage.tsx`: seleção de cidades/UF/região/IDs e classificação operacional. Extrair funções reutilizáveis sem apagar essa página.
- `scientific/study.ts`: inventário, `predictCase`, `runStudy`, validação de protocolo, métricas e proteção contra futuro. `StudyDataset` hoje pressupõe cidade/UF únicas; evoluir por adaptador compatível, sem concatenar cidades num campo semântico.
- `scientific/client.ts` e `study.worker.ts`: hoje criam worker por tarefa e reenviam dataset; melhorar para exploração repetida.
- `scientific/portfolio.ts`: total nulo se faltar previsão de integrante; preservar.
- `scientific/evidence.ts`: manifesto/ZIP e proteção de células CSV; ampliar, não substituir por código do ZIP.
- `StudyDetail`, `StudyCharts`, `StudyPortfolio`, `Editorial` e CSS: aproveitar partes úteis. Manter gráficos existentes/Recharts e primitives Radix, sem introduzir outro motor gráfico por estética.
- `BrainLoadingState`, `GeoApiScopeSelector`, `useGeoApiScope`, autenticação existente e lazy loading são obrigatórios.

## 4. Contratos internos e estados

Criar módulo `experience/` sob a feature para orquestração/UI; manter ciência em `scientific/` e políticas em `operational/`. Nomes abaixo são propostos; adaptar sem duplicar funções equivalentes.

`UniverseSnapshot`: schema/version, hash, fetchedAt, scope solicitado e cidades efetivamente autorizadas/consultadas, páginas por cidade/tipo, complete, buildings compactados e evidência por período. Cada empreendimento preserva sua cidade/UF. Deduplicação por ID com conflito explícito; não somar o mesmo empreendimento duas vezes.

`AnalysisSpec`: snapshotHash, IDs, início YYYY-MM, duração em meses, métodos/versionamento, medida, agrupamento e protocolo científico. Zoom e busca são estado visual, fora dos argumentos matemáticos. Usar chave estável, listas ordenadas e resultados imutáveis.

`Availability`: separar três dimensões: calculabilidade por método; possibilidade/qualidade do backtest; elegibilidade operacional. Cada dimensão retorna estado e códigos de motivo. Não transformar flag atual em origem histórica. Esgotado é estoque zero na data escolhida; ausência não é zero.

`SelectionDraft`: IDs explícitos, revisão incremental e hash do snapshot. Busca/filtros não removem membros. Nova consulta exige revisar/confirmar composição; não transferir resultados antigos para novo snapshot.

`ExportPlan`: IDs congelados, spec/hash, finalidade análise/candidato operacional, incluídos/excluídos por arquivo, método de cada membro, datas e pendências por campo. Resultados de backtest vinculados por chave exata, não por ter aberto um card alguma vez.

Estados independentes de consulta e cálculo: idle/loading/ready/error/cancelled; cálculo adicional queued/computing/stale/ready/unavailable. Troca de token encerra workers, limpa dados/cache/seleção; nunca persistir token ou base privada em URL/localStorage. URL pode conter controles não sensíveis, validados ao restaurar.

## 5. Implementação em sequência, sem entregas parciais como conclusão

### A. Baseline e amostra de contrato

Conferir AGENTS, fetch e divergência antes de editar. Na preparação havia 3 commits remotos e 2 locais divergentes, além de alterações paralelas. Não resolver merge/rebase automaticamente. Integração requer autorização conforme AGENTS, sem bloquear desenho e testes isolados.

Executar baseline dos testes da feature e operacionais; registrar resultados atuais em vez de presumir que 98+15 continuam iguais. Preservar casos Finotti de referência.

Congelar cinco casos revisáveis de Curitiba a partir do snapshot local existente: tipologia única aplicável, múltiplas tipologias, estoque antigo, esgotado atual com estoque passado e histórico insuficiente/origem desconhecida. Escolher por condições verificadas, não inventar IDs. Gerar evidência local de entrada, motivos, método, linhas possíveis e bloqueios. Se uma combinação não existir, declarar ausência e cobrir contrato com fixture sintética identificada. Não colocar dados privados brutos no Git.

### B. Universo e classificação

Implementar `useUniverse`/`UniverseSelector` reutilizando escopo operacional. Região/UF/cidades/IDs funcionam como entradas distintas dentro do catálogo autorizado. Para IDs sem endpoint direto comprovado, mostrar previamente abrangência da busca; não inventar endpoint.

Consultar cidades/tipos sequencialmente com paginação paralela existente: máximo global 8. Progresso real, cancelamento, retry e atomicidade da promoção do snapshot. Dados incompletos não substituem snapshot completo. Registrar restrição de cidades não autorizadas sem ampliar permissão.

Após carga: classificar todos, mostrar lista imediatamente e calcular curvas visíveis. Default: data mais recente disponível do universo e 12 meses, medida estoque. Se um empreendimento não tem dado nessa data, oferecer sua última data como ação explícita, sem deslocar silenciosamente a origem por membro.

Política de apresentação versionada: Finotti quando aplicável; senão stock-trend calculável; senão constante, sempre com rótulo exploratório e motivo. Se todos indisponíveis, histórico e motivo. Isso escolhe uma visualização, não um método validado ou autorização operacional.

### C. Worker, scheduler e cache

Evoluir worker ES para carregar snapshot uma vez, indexar dados e processar jobs identificados. Prioridades: empreendimento aberto, linhas visíveis, seleção, prefetch. Processar em blocos com oportunidades de cancelamento; se término for necessário, recriar e reinicializar worker de forma explícita.

Separar job de previsão de job de avaliação futura. A função preditiva recebe somente dados até o início escolhido. Cache limitado por LRU (valor inicial 256 entradas, configurável internamente), incluindo snapshot, método/versão, ID, início, duração e protocolo. Só recortar caminho máximo se teste comprovar independência do horizonte para aquele motor; não copiar essa suposição do protótipo.

Prefetch inicial: página visível e duas datas vizinhas do detalhe. Não calcular todo produto cartesiano de datas, modelos e empreendimentos. Agendamento cancelável e resposta com requestId/generation; último pedido válido vence. Agrupamento/zoom reaproveitam resultados. Exportação só usa resultado estável correspondente ao plano congelado.

### D. Lista e explorador temporal

Criar `ForecastList`, `ForecastExplorer`, `TimeControls`, `AnalysisSettings` e reducer/hook de estado. Lista de 15 linhas por página, curva larga por linha, esgotados recolhidos com nomes/IDs e contagem. Seleção independente de abrir detalhe.

Explorador com histórico, linha vertical de início, previsão e série posterior no mesmo gráfico. Campos de mês e sliders acessíveis são obrigatórios; arraste direto do marcador usa a mesma função de atualização. Teclado, toque, limites e labels. Mover início mantém duração; mover fim altera duração. Debounce inicial 300ms e commit ao soltar; zoom nunca muda cálculo.

Início passado ativa comparação histórica automaticamente, sem botão de executar. Resultados posteriores usam apenas datas/intervalos efetivamente disponíveis; não exigir a última data global para declarar disponibilidade de um caso. Limitar comparação ao trecho observado, mantendo horizonte solicitado visível. Ao voltar à previsão atual, restaurar duração anterior.

Durante cálculo: gráfico anterior opaco, identificado pela data antiga, pulso somente na camada afetada e BrainLoadingState compacto; sem overlay geral. Bloquear card/exportação desatualizados; erro preserva resultado anterior identificado. Redução de movimento elimina pulso.

### E. Agregação e backtest

Criar funções puras de agregação com contratos de intervalo. Estoque/acumulado: saldo na data final; fluxo: soma dos intervalos completos. Mensal/trimestral/anual são leituras quando dados permitem. Sem interpolação de observação e sem transformar ausência em zero. Cadência desconhecida pode permitir comparar saldos exatos, mas não validar fluxo mensal. Percentual exige denominador estável e explícito.

Reusar `runStudy` e métricas existentes. Para linhas posteriores no gráfico, ampliar obtenção de labels para datas disponíveis dentro do horizonte, mantendo validações de oferta/tipologias/origem. Não desenhar pontos não avaliáveis como coleta confirmada. Congelar amostra e comparar métodos no mesmo conjunto de datas/alvos.

`BacktestCard`: método/versão, medida, início, horizonte solicitado/avaliado, MAE, viés previsto menos informado, cobertura em empreendimentos e comparações, origem e frase curta. Um ponto vira diferença naquele período. Agrupar por horizonte e origem; média por empreendimento antes de média do conjunto. Evitar MAPE, R², vencedor universal e nota de confiança.

Bloquear Finotti congelado para datas anteriores ao treinamento, como hoje. Outros métodos podem permitir backtest nesse período. Histórico informado de origem desconhecida continua distinto de avaliação com coleta real. Ausência de backtest não bloqueia download de análise, mas é registrada. Sem novas faixas calibradas.

Card disponível em tela e download HTML autocontido com CSS de impressão; CSV/JSON auditável acompanhante. Não adicionar dependência PDF nesta V1.

### F. Seleção, carteira e pacote

Criar `SelectionBar`, `ExportReview` e serviço puro `buildExportPlan`. Ação explícita selecionar todos com Finotti disponível no recorte; indicação de quantos podem apenas ser analisados e quantos têm pendências operacionais. Sobrepor até 12 curvas legíveis, com seleção explícita do subconjunto; carteira e exportação podem conter todos, sem truncamento silencioso.

Carteira congela membros/data/método e só apresenta total completo quando todos têm valores compatíveis. Eventual subtotal precisa de rótulo e lista de membros; comparar erro da carteira separado dos erros individuais.

Pacote de análise ZIP com `previsoes.csv`, `historico_utilizado.csv`, `resumo.html`, `manifesto.json`, `backtests.csv`, `exclusoes.csv`. Sem backtest, arquivo com cabeçalho e indicação explícita no resumo. Resumo descreve exatamente os membros e períodos exportados; snapshot/protocolo/versões e contagens reconciliam com linhas dos arquivos. Não exportar dados de contato/endereço não necessários. Sanitizar HTML e fórmulas CSV.

Distinguir projeção futura de execução histórica: exportar o intervalo selecionado, explicitamente identificado; nunca mudar automaticamente para a última data como no ZIP. Linhas de backtest não se tornam novas linhas operacionais sobre períodos já existentes.

Adicionar XLSX candidato de 26 colunas somente para linhas cuja granularidade esteja resolvida: preservar ordem e nomes do contrato, IDs como texto, datas nos formatos existentes e `Foi estimado?=Sim`. Tipologia única precisa de ID estável; várias tipologias permanecem no CSV analítico do empreendimento, fora das linhas candidatas sem regra de distribuição. Campos não definidos ficam células vazias, nunca zero/cópia, com motivos em arquivo separado; convenção é candidata, não aceite Belogic. Se não houver linha elegível estruturalmente, informar e entregar pacote analítico, sem arquivo aparentemente preenchido.

Não confundir mapeamento estrutural com elegibilidade operacional: linhas candidatas com cadência/origem pendentes devem ser claramente identificadas como NÃO IMPORTAR e ficar separadas de qualquer futuro lote liberado. Regras de quatro períodos/estoque/alternância não são relaxadas. Arredondamento do motor Finotti é preservado; outros modelos mantêm valores analíticos não arredondados, sem arredondamento operacional inventado. Por intervalo, conferir conservação estoque inicial menos vendas líquidas = estoque final quando essa hipótese é válida.

Preservar tela Preparar lote e conferência Excel existente. Não implementar upload genérico que substitua a API; Excel continua conferência opcional. Não escrever no Geobrain.

## 6. Testes de aceite obrigatórios

1. Domínio: golden tests Finotti inalterados; futuro modificado não altera previsão anterior; referência anterior ao treinamento bloqueada; dados desconhecidos não promovidos a observados.
2. Temporal: duas alças, limites, duração, ausência, trimestre não civil, intervalos incompletos, saldo versus fluxo, oferta revisada e esgotado atual reincluído em teste passado.
3. Concorrência: pico de requisições <=8, retry/cancel, resposta antiga descartada, token trocado limpa sessão, atualização parcial não promove universo; filtros/sliders não fazem nova chamada API.
4. Seleção: filtros não alteram membros; carteira incompleta não vira total; métodos comparados em amostra pareada; zero não confunde ausência.
5. Exportação: reabrir ZIP e XLSX com bibliotecas, conferir IDs/datas/ordem/flags/nulos, número de linhas, ausência de duplicação, conservação, sanitização, hashes e vínculo dos backtests. CSV analítico não é rotulado como contrato Geobrain. Nenhum histórico sobrescrito.
6. Integração: carga → lista → detalhe → arraste → comparação → card → seleção → revisão → pacote, incluindo cinco casos de contrato. Testar sem resultados e sem linha candidata.
7. Browser: 1440/768/390, claro/escuro, teclado/toque, foco/restauração, movimento reduzido, Brain em carregamento lento, erro/cancelamento, zero overflow e erros JS. Adaptar scripts `estimativas-scientific-browser.mjs`/`-live.mjs`; manter cenário operacional.
8. Gates: `npx.cmd vitest run src/features/estimativas-vendas`, `node scripts/diagnostics/estimativas-operational.test.mjs`, typecheck/build e lint dos arquivos tocados. Não trocar testes por novas contagens sem examinar falhas.

Medir carga, primeira curva, cálculo de detalhe e cache quente com dataset e máquina registrados. Metas locais de UX: feedback no próximo frame, cache quente sem spinner de página; reportar p50/p95 de pelo menos 20 interações de detalhe, não prometer tempo fixo de API. Comparar com baseline anterior e investigar regressões. Testes sintéticos de rede não comprovam API real: realizar pelo menos uma leitura autenticada e preservar evidência local quando acesso disponível.

## 7. Fechamento e produção V1

Concluir todos os blocos A–F e gates numa execução; não encerrar ao terminar a estética. Documentar impedimentos externos com comportamento correto e candidato revisável, sem inventar autorização/semântica. A falta de homologação não impede interface de análise; impede declarar importabilidade.

Atualizar este plano com implementação/evidências, FRONTEND_DECISIONS se houver decisão duradoura, LIVE_rebrain, MAPA_SISTEMAS e acompanhamento de Gabriel. Documentar regressões e pendências reais. Guardar ZIP bruto e capturas em `.local-inputs/`; fonte privada não entra no Git. Commit isolado e staging explícito, preservando alterações paralelas.

Antes de produção: resolver divergência Git com autorização, executar gate de docs, obter autorização de push/publicação, conferir SHA publicado e testar rota autenticada em produção. Smoke: universo pequeno, previsão, backtest de baseline, exportação e reabertura do arquivo; verificar console/rede e controles de acesso. Só então registrar verificado em produção. Se acesso não existir, entregar roteiro concreto para Gabriel e manter pendência. Rollback por commit reversível apenas das mudanças da feature, sem reset de main nem reversão de trabalho de terceiros.

Definição de pronto: fluxo completo verificável, motores preservados, exportação consistente com seleção e período, limites visíveis, testes/evidências registrados e pacote preparado para publicação autorizada. Homologação Belogic, política de preço, linhagem histórica e novos modelos continuam frentes externas ou posteriores.
