# Estimativas de vendas — plano técnico da V1 essencial

Data: 28/10/2026. Responsável: Gabriel. Executor previsto: Sol light. Estado: implementado e validado localmente; ensaio autenticado com API real concluído. Objetivo: fluxo integrado preparado para testes em produção após autorização final. V1 de interface não significa importação homologada.

**Direção vigente após grill de simplificação em 28/10:** a seção 9 substitui as escolhas de navegação, seleção, datas e saída das seções anteriores. A V1 anterior foi enviada em `ece2a76`; a simplificação está local e exige nova autorização de push. Regras matemáticas e limites científicos continuam válidos.

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

## 8. Execução em 28/10 — implementação e limites concretos

Main integrada por merge autorizado `86b716e`, incorporando `0e01278`, `079bdcd`, `1a82104` (Relatório API Excel: MCMV e garagem). Alterações não commitadas de FIERGS, README/FONTES e referência Corretor preservadas. Nenhuma escrita na API, push ou deploy. ZIP original preservado em `.local-inputs/estimativas-vendas/claude-design-v2-20261028/estimativas-vendas-prototipo-v2.zip`, com o SHA256 da seção 2; saiu de src após conferência de referências, sem mudança de conteúdo.

Implementação em `experience/`: universo multiterritorial autorizado e atômico, classificação na data escolhida, lista paginada de curvas, worker ES persistente, fila por prioridade, cache limitado, explorador temporal, comparação pareada, teste de várias datas, carteira/sobreposição e revisão de exportação. `EstimativasPage` aponta para a nova entrada; estudos anteriores e preparação operacional continuam acessíveis. Tokens canônicos preservados, SHA256 `0802b707b8c511e3367b1e4a235cea6a268edb9ac8f217a2beb965fc30874eac` igual à fundação SE. Usados Button/Input/Select/Dialog, Recharts, BrainLoadingState e GeoApiScopeEngine existentes.

Detalhes de escopo importantes:

- Data padrão é a mais recente do universo; uma linha sem dado nessa data não é deslocada automaticamente para outra. No detalhe, uma ação explícita oferece a última data anterior.
- Horizonte analítico 1–36 meses; não equivale a estimar períodos operacionais consecutivos. O pacote não libera linhas operacionais. Candidato XLSX tem 26 colunas, IDs em texto e campos pendentes vazios, marcado NÃO IMPORTAR. Com cadência desconhecida, as linhas são mensais analíticas identificadas no manifesto; não se declara que representam a coleta oficial.
- Exportação histórica não gera XLSX candidato sobre os períodos já existentes. Várias tipologias permanecem no resultado analítico do empreendimento e no histórico, sem rateio candidato.
- Agrupamento de 3/12 meses é relativo ao início da análise, explicitado na interface. Fluxos reportados só aparecem com duração documentada, intervalos completos e balanço conciliado. Na API atual essa evidência permanece ausente; comparação de saldos exatos pode continuar como histórico informado.
- Referência Finotti fica bloqueada antes do treinamento. O card resume um horizonte; os demais ficam recolhidos, e métodos são comparados por mesma amostra e origem. Relatório HTML curto acompanha CSV/JSON auditável. Testes em outras datas têm relatório próprio; o pacote do intervalo principal só vincula testes da sua configuração exata.
- Carteira usa todos os membros selecionados, sem tratar ausência como zero. Sobreposição exige escolher explicitamente até 12 linhas. Não há limite silencioso de membros na exportação.
- Cache quente do detalhe é reaproveitado sem debounce de cálculo; pedidos frios usam 300ms. Snapshot vai uma vez ao worker; lista não duplica os históricos completos. Cache máximo 256 entradas, com até quatro inventários e 256 resultados de lista. Prefetch de apenas duas datas vizinhas; nenhuma consulta nova durante filtros/exploração.
- Disponibilidade de métodos conferida para todo o universo em blocos de 16, com prioridade abaixo do detalhe/lista. O filtro com Finotti/com algum método/sem método só é liberado após essa classificação completa. Não restringe silenciosamente aos resultados já desenhados.

Baseline antes da mudança: 98 testes Vitest e 15 testes operacionais. Amostra real reproduzida por `scripts/diagnostics/estimativas-essential-replay.mjs`: todos os cinco perfis foram encontrados no snapshot de 1.996 empreendimentos, hash `e9318db6449f1f7cf8dac04ecf8c057d6e2f8b93a5c2a34f3c1a8ec39c6cc3f9`. Método mostrado: Finotti nos dois casos de referência, ritmo de estoque no antigo e no esgotado em data passada, constante no histórico curto. Entradas e resultados privados ficam em `.local-inputs/estimativas-vendas/essencial-v1-20261028/amostra-*`; nenhum registro aprovado para importação.

Scripts de evidência: `estimativas-essential-browser.mjs` (cenários sintéticos controlados), `estimativas-essential-live.mjs` (UI local com API real autenticada e medições), `estimativas-essential-replay.mjs` (fonte congelada). Ver o [registro agregado de verificação](EVIDENCIAS_FLUXO_ESSENCIAL_V1_2026-10-28.json) para resultados finais e caminhos locais. Execuções interrompidas também ficam preservadas no diretório local; não são evidência de sucesso.

Ensaio autenticado local: 1.996 empreendimentos/21 páginas HTTP200, carga em 76,17s e primeira curva em 78,06s. Vinte interações: p50 95,80ms, p95 546,42ms; zero novas chamadas de histórico na exploração e zero erros JavaScript. Pacote real baixado/reaberto: 12 linhas analíticas, 12 candidatas, 26 cabeçalhos, IDs em texto, flag Sim e preço/brutas/distratos vazios; `importable=false`. Não extrapolar essas medições para outros recortes ou produção. Medição da API precedeu apenas a alteração visual de ordem das réguas; cálculos/cache/exportador iguais, e a disposição final é conferida separadamente na matriz browser.

Falhas de instrumentação tratadas: seletor de município sem nome acessível esperado pelo teste; tentativa de data anterior ao histórico disponível; leitura de elemento de fundo por role durante modal. As duas últimas chegaram às 21 respostas200, sem erro JavaScript; a terceira também gerou pacote, mas só a execução final com `result.json` é considerada completa. Avisos do npm em stderr provocaram status de PowerShell enganoso; build final capturado por subprocesso nativo confirmou saída0. Avisos existentes: Browserslist desatualizado, XLSX com imports estáticos/dinâmicos e chunks grandes. Não foram alterados módulos paralelos para suprimi-los.

Pendências externas preservadas: contrato Belogic, origem por período, cadência oficial, rateio por tipologia, preço, reconciliação e validação independente Finotti. Não bloqueiam exploração honesta ou pacote analítico; impedem declarar lote homologado. A disponibilidade no ambiente de produção depende de autorização final e verificação após publicação.

## 9. Simplificação após grill — decisões e execução em 28/10

### Decisões confirmadas por Gabriel

- Entrada contém título, seletor geográfico único e ação Carregar empreendimentos. Retirados banner, texto promocional, abas de modalidades e entrada de IDs. Região opcional, vários estados e várias cidades; cidades prevalecem sobre todos os estados, estados prevalecem sobre região. Não completar silenciosamente estados sem cidades selecionadas.
- Antes da carga, nenhum parâmetro temporal. Depois da carga, usar o último período disponível de cada empreendimento e previsão de 12 meses. Data inicial individual visível no card, gráfico, comparação e planilha. Falta de histórico continua indisponível; não vira dado novo.
- Finotti calculável aparece primeiro, sem seleção automática. Demais empreendimentos aparecem num resumo acessível e em Mostrar todos. O domínio de Finotti permanece o auditado; não flexibilizado para aumentar a lista.
- Card é botão de seleção com `aria-pressed`, pulso breve e destaque oliva persistente; redução de movimento desativa animação. Explorar curva é ação separada, não muda seleção. Marcar todos os Finotti substitui a seleção pelo conjunto inteiro do território carregado e deixa visíveis apenas esses registros. Mostrar todos restaura visualização sem desmarcar. Busca/filtros comuns não alteram seleção.
- Comparações começam em percentual acumulado vendido e tempo após a previsão, mês0/+1/+2 etc.; cada origem permanece visível. Calendário é alternativa. Detalhe individual começa em vendas líquidas acumuladas em unidades, conversão direta da fração acumulada da equação; fluxo mensal e estoque permanecem leituras alternativas.
- Sliders, arraste de início e campos de calendário removidos. Anterior/próximo percorrem apenas os registros disponíveis, inclusive intervalos trimestrais não civis. Lista de períodos e durações rápidas alteram a análise; zoom é independente. Backtest continua no mesmo gráfico, sem inventar observações em intervalos ausentes.
- Saída principal é Baixar previsões: revisão curta e download de `previsoes.xlsx`, aba previsoes com uma linha por empreendimento/mês futuro, IDs, local, data inicial, mês previsto, método/versão, vendas líquidas e estoque. Relatório/histórico/evidências em ação secundária. Nenhuma planilha é declarada homologada para importação.
- Preparar lote e Estudos científicos deixam de ser jornadas separadas. Gabriel autorizou retirar também seu código de interface. Foram removidos os componentes dessas páginas, detalhes/CSS exclusivos, exploração legada de EstimativasPage e worker antigo sem consumidor. Mantidos motores, estudo puro, políticas de seleção, rastreabilidade, conferência Excel e seus testes reutilizados pela versão única.

### Implementação e evidência

`buildingSpec` resolve origem individual para worker/cache/exportação; o manifesto identifica as datas de cada membro. Comparação relativa tem função pura própria; não soma trajetórias com origens distintas como se fossem uma carteira no mesmo calendário. A leitura Carteira na mesma data exige registros em uma data comum, escolhida explicitamente; sem data comum, fica indisponível.

`forecastWorkbook` gera Excel analítico direto, independente de número de tipologias. Isso não distribui previsões entre tipologias: cada linha é do empreendimento. O candidato antigo de 26 colunas permanece apenas na evidência secundária, com restrições e rótulo NÃO IMPORTAR. Histórico e resultados existentes não são sobrescritos.

Testes atualizados: 109 Vitest em 14 arquivos, 15 Node operacionais; tipos, lint e build aprovados. Sete testes das páginas retiradas deixaram de existir; três testes novos cobrem escopo geográfico, origem individual/Excel e navegação por datas reais. Golden tests horizontal/vertical e contratos científicos não foram removidos. Corrigida também uma opção `exact` não aceita pelo tipo `getByRole` num teste do Excel recebido da main, sem alteração de runtime desse módulo.

Diagnóstico reproduzível: `scripts/diagnostics/estimativas-simple-browser.mjs`; fonte sintética controlada, 1440/768/390 claro/escuro, seleção e substituição do conjunto, detalhe/backtest sem calendários ou sliders, comparação relativa e reabertura de Excel com 24 linhas para dois empreendimentos cujos históricos terminam em meses diferentes. Duas chamadas de coleta e zero adicionais durante exploração/exportação, zero erros JS ou overflow. Evidências brutas ignoradas em `.local-inputs/estimativas-vendas/simplificacao-20261028/`; [registro agregado](EVIDENCIAS_SIMPLIFICACAO_2026-10-28.json). API real não foi reconsultada nesta revisão; as medições autenticadas da seção 8 pertencem à versão anterior. Navegador conectado indisponível; usado Chromium automatizado local. Sem push/deploy desta revisão.


## 10. Mapa de curvas — execução autorizada em 28/10

Objetivo: panorama após carregar o território, alternando entre mosaico mini, mosaico detalhado e lista. A seleção, filtros, detalhe, comparação e Excel continuam compartilhados.

Implementação: resumos leves calculados no worker em blocos de 16, com cache por snapshot, duração e data; prioridade abaixo do detalhe e descarte de respostas antigas. O motor Finotti permanece intacto. Miniaturas SVG mostram percentual acumulado vendido, histórico contínuo apenas entre meses observados, previsão tracejada e marca inicial. Lacunas não são interpoladas. Cor representa unidades previstas, nunca confiança. Escala explícita considera todo o conjunto filtrado e permanece igual entre páginas. Sem referência recebe hachura.

Mosaico com até 500 cards por página, áreas semelhantes e alvos confortáveis; modo detalhado mostra nome, ID, início, estoque e vendas. Clicar seleciona com sombra oliva; foco atualiza faixa de inspeção. Explorar curva é ação separada. Ordenação por vendas só é liberada após todos os resumos estarem disponíveis. Paginação não altera seleção. Filtros e densidade não consultam novamente a API.

Gates: testes de equivalência do resumo com o motor, lacunas, ordenação, seleção compartilhada e respostas antigas; typecheck, lint, build e jornada de navegador em telas larga e estreita. Conferir 146, 478 e mais de 500 itens com dados sintéticos identificados. Evidências pequenas versionadas; imagens e logs locais ignorados. Atualizar LIVE, mapa de design e acompanhamento. Push autorizado nesta sessão; publicação e comportamento em produção dependem do ambiente e do teste humano. Nenhuma homologação de importação.

### Blocos técnicos e aceite

1. **Contrato de prévia — `experience/mosaic.ts`.** `CurveTile` contém ID, início efetivo, disponibilidade Finotti, motivo, estoque inicial/final, vendas previstas e séries percentuais relativas. `buildTiles` chama `predictCase` com o mesmo modelo e duração, sem ajustar parâmetros ou calcular avaliações retrospectivas. Valores ausentes permanecem nulos. O teste confronta estoque final, vendas e percentual com `analyzeCase` completo. Miniaturas usam até 36 meses anteriores, eixo percentual 0–100 e eixo temporal comum de −36 até a duração selecionada; pontos isolados permanecem visíveis, sem unir lacunas.
2. **Processamento — `runtime.ts` e `analysis.worker.ts`.** Nova tarefa `tiles`, prioridade 4, abaixo do detalhe/lista e classificação. Snapshot enviado uma vez. Chave inclui hash, IDs, data, duração, métodos e versões. Blocos de 16 permitem atender interações entre blocos; o cancelamento de uma vista impede promover sua resposta atrasada. Cache existente continua limitado a 256 tarefas. Nenhuma alteração no pool de até oito chamadas de coleta nem requisição adicional por filtro, densidade ou ordenação.
3. **Composição — `CurveMap.tsx` e `mosaic.css`.** Mapa é vista inicial; lista permanece alternativa. Cards mini mostram curva e quantidade; detalhados mostram nome/ID, estoque e data. A faixa de inspeção reúne cidade, data, valores e motivo de indisponibilidade. Foco por teclado, toque ou ponteiro atualiza a inspeção; clique seleciona, `Explorar curva` é separado. Até 500 miniaturas ou 60 detalhados por página, com área mínima de clique de 44 px e distribuição responsiva. Não há caixas vazias desenhadas nem largura proporcional a vendas. A última linha pode ficar incompleta para preservar áreas comparáveis.
4. **Semântica visual.** Cor varia de zero até o maior volume previsto no conjunto filtrado inteiro, não por página; não indica precisão ou probabilidade. Até concluir o processamento, escala fica em preparação e ordenação por vendas desabilitada. Empreendimentos sem Finotti têm hachura e histórico disponível, sem curva projetada inventada. Claro/escuro preservam contraste mesmo após seleção; pulso breve respeita movimento reduzido. Tokens canônicos não são alterados.
5. **Integração — `ExperiencePage.tsx`.** Seleção central compartilhada entre mapa/lista, detalhe e exportação. `Marcar todos` continua substituindo o conjunto por todos os Finotti do universo; `Mostrar todos` recupera os demais sem desmarcar. Mapa não dispara análises completas de centenas de imóveis; essas análises ficam para lista visível, detalhe, comparação e revisão do Excel. Filtros não mudam silenciosamente a composição do arquivo.
6. **Validação.** Testes unitários de equivalência, lacunas, datas próprias e bloqueio temporal; teste de componente com resposta antiga chegando após mudança de duração; regressão da seleção compartilhada. Navegador local com fontes sintéticas identificadas de 146/478/501 itens, paginação, densidade, ordenação, seleção e telas 1440/768/390. Jornada completa de detalhe, backtest, comparação e reabertura do Excel de 24 linhas mantém sua regressão própria. Build, tipos, lint e gate documental antes do commit/push explícito. Base real e publicação exigem conferência posterior; não extrapolar os tempos sintéticos para SLA da API.

### Resultado local

Blocos implementados. 114 testes Vitest em 16 arquivos, 15 testes Node operacionais, tipos, lint sem avisos e build aprovados. Quatro cenários de mosaico e seis da jornada completa em Chromium local passaram, sem erros JS ou overflow. No ensaio sintético, mapa pronto em 903–1590 ms após iniciar a carga; somente duas chamadas de coleta por cenário e nenhuma extra na exploração. Excel reaberto com 24 linhas e datas iniciais distintas. Ajuste de contraste no tema escuro conferido visualmente; tokens canônicos idênticos. [Evidências agregadas](EVIDENCIAS_MAPA_CURVAS_2026-10-28.json). Navegador conectado indisponível, usado Chromium headless local; API real não foi reconsultada. Implementação `8ae89a3` enviada a origin/main com autorização em 28/10; aceite de produção permanece pendente.

### Refinamento editorial posterior — controles expostos

Após testar o panorama, Gabriel pediu reduzir caixas e expanders. A revisão mantém o motor e o fluxo e muda a composição: resumo territorial aberto, filtros/duração/tipo como grupos de botões visíveis, busca e seleção de cidade com sublinhado discreto, sem painéis delimitadores. `AnalysisFilters.tsx` concentra esses controles; cidade só aparece quando há mais de uma. Informações extensas de outros empreendimentos/esgotados abrem Dialog, sem esconder ações ou filtros em expanders. Download permanece na barra de seleção.

Cada card do mapa passa a ser um artigo com dois botões irmãos: corpo selecionável `aria-pressed` e `Explorar curva` no rodapé, sem botões aninhados nem alterar seleção ao explorar. Foco retorna ao acionador ao fechar o detalhe. Cards mini ganham largura mínima de132px e cantos8px, exceção local solicitada explicitamente pelo usuário; tokens globais permanecem intactos. A faixa de inspeção fica aberta, sem botão duplicado nem moldura. Cor, hachura, eixos e contratos científicos preservados. Controles de densidade/ordenação/vista usam estado ativo sublinhado, com área confortável de44px.

Refinamento validado localmente:23testes da experiência, tipos/lint/build, quatro cenários de mosaico e seis da jornada completa. Navegador confirmou filtros expostos, exploração dentro do card sem alterar seleção, paginação, densidade, comparação, backtest e Excel24linhas. Sem errosJS, overflow ou chamadas extras. Dados sintéticos identificados, claro/escuro1440/768/390; nenhuma nova API autenticada nem confirmação desta revisão em produção. Evidência agregada no campo `editorialRefinement` do JSON acima; capturas de controles adicionadas ao diagnóstico reproduzível.

## 11. Exploração direta, comparação explícita e histórico espaçado — 28/10

Decisão posterior de Gabriel: clique no card abre o detalhe; seleção por clique existe somente com `Comparação` ativada acima dos cards. Substitui a regra de clique das seções9/10. A composição selecionada continua explícita, mas a barra inferior foi retirada: contagem, limpar e comparar ficam acima do mapa. Comparar exige ao menos dois itens e recebe pulso discreto, desativado com movimento reduzido. Baixar todos os Finotti abre revisão do conjunto completo quando não há seleção; com seleção, o rótulo informa o conjunto selecionado. Não há importação automática.

O detalhe concentra a curva em largura integral e quatro indicadores abertos. Não usa expanders nem painel lateral de texto. Medidas, duração e métodos são botões expostos. Explicação científica, dados e backtest são vistas próprias; informações não foram apagadas para reduzir a tela. Desktop1440×1000 comporta a visão principal sem rolagem; celular390×1000 mantém rolagem vertical para legibilidade, sem overflow horizontal. Setas laterais discretas navegam na ordem efetiva do mosaico, incluindo a ordenação por vendas e filtros, sem recalcular o universo. Fechar retorna ao acionador quando ele permanece disponível.

**Histórico completo versus início da projeção:** todos os registros disponíveis são exibidos, sem limite visual de três/dez anos. A projeção atual começa após o último registro válido, e não no primeiro registro da série. O seletor antigo `Começar a previsão` saiu da vista principal. Datas anteriores são escolhidas somente na vista Backtest, usando exclusivamente os registros anteriores àquela data e comparando com dados posteriores quando válidos. O corte de treinamento congelado Finotti continua setembro/2026; exibir histórico antigo não libera retrospectiva Finotti antes disso.

**Diagnóstico Maragogi:** duas consultas autenticadas somente leitura, Horizontal/Vertical, HTTP200:25empreendimentos. Max Tulum — BlocoB,75803, possui13meses com registros numéricos válidos de2023-10 a2026-09, principalmente em intervalos trimestrais. Os dados existiam; `connectNulls=false` com `dot=false` ocultava registros isolados na grade mensal. Agora os pontos são visíveis e há uma ligação pontilhada apenas visual entre registros. Os meses intermediários continuam nulos no domínio, tabela, métricas e exportação; nenhuma venda mensal foi inventada nem cadência oficial presumida. O tooltip não usa essa ligação como nova observação. Miniaturas continuam preservando lacunas com pontos isolados.

Reprodução: `scripts/diagnostics/estimativas-maragogi-history.mjs` (`--replay` evita API) e `estimativas-maragogi-browser.mjs` (snapshot gravado, sem token real no navegador). Brutos/capturas em `.local-inputs/estimativas-vendas/maragogi-historico-20261028/`, ignorados. SnapshotSHA256 `c46b2742f82d3b787229c78a9d71515328b2dfe2b04d4405ba0b9a2d4e55bb49`. Teste de navegador contou13pontos históricos em desktop e celular, conferiu carrossel ordenado, ausência de barra inferior, clique exploratório, comparação mínima de dois e zero chamadas externas na exploração. 115Vitest/16arquivos aprovados, incluindo histórico maior que dez anos sem preencher lacunas. Regressões sintéticas do mapa e seis jornadas completas/Excel24linhas também aprovadas. Evidência agregada no campo `directExploration` do JSON de evidências do mapa. Produção desta revisão ainda não conferida.
