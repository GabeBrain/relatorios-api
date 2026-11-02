# Estimativas de vendas — plano técnico da V1 essencial

Criado em 28/10/2026; direção atualizada em 02/11/2026. Responsável: Gabriel. Executor previsto: Sol light. Baseline anterior implementada e validada localmente, com ensaio autenticado de API registrado abaixo; reorganização da seção 14 implementada e validada localmente em 02/11, aguardando autorização final de envio/publicação. V1 de interface não significa importação homologada.

**Direção vigente em 02/11/2026 — VALIDADA LOCALMENTE:** seção 14 implementada, aprovada conceitualmente por Gabriel após o feedback de Diego de 30/10. Página principal orientada a território → prévia → Excel; gráficos e retrospectiva em Análise detalhada. A seção 14 substitui as decisões anteriores de navegação, posição dos filtros e composição do download principal. Seções 1–13 preservam histórico, fundamentos e evidências, não são uma lista de telas a recriar. Baseline anterior `c62e41e`, plano `aa39ce5` e integração autorizada `706eb96`; resultado e limites na seção 14.9. Sem push/deploy desta execução. Regras matemáticas e contrato científico continuam válidos.

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

## 12. Configurações laterais e transição estável — 28/10

Implementa o conceito aprovado posteriormente por Gabriel. A tela principal mantém busca, curvas, comparar e baixar. Pequeno ícone de ajustes à direita e resumo textual clicável abrem `AnalysisFilters`, agora painel lateral construído com Sheet existente. Projeção, previsão disponível, tipo/cidade, apresentação mapa/lista e informações do universo ficam agrupados nesse painel. `Marcar todos os Finotti` permanece ao lado do ícone como link discreto. Removida a ação `Incluir esgotados`: os esgotados ficam somente na galeria informativa; `Mostrar todos` inclui outros métodos e indisponíveis, preservando a exclusão de estoque zero. A análise histórica de períodos com estoque positivo não muda. Outros e esgotados são grupos separados no resumo, evitando dupla contagem.

`InventoryGallery` substitui a lista estreita: Dialog amplo, cantos12px locais solicitados, grid de três/duas/uma colunas, busca e paginação12/8/4itens conforme largura. Sem lista com rolagem própria; em janelas muito baixas o diálogo inteiro pode rolar para preservar acesso. Cada item mostra nome, cidade/ID, último registro e motivo. Nenhuma mudança de seleção, parâmetros ou consulta API ao visitar a galeria.

Comparação passa a narrar a tarefa: `Comparar curvas` → `Escolha dois ou mais empreendimentos no mapa` → `Comparar N curvas`; concluir seleção volta à exploração, preservando o conjunto marcado e seu rótulo de download. Pulso breve de até duas repetições, sem animação com movimento reduzido. Filtros nunca mudam silenciosamente o conjunto de exportação. No grid, controles alternáveis de vista e ordem ficam empilhados, mostram o estado atual e anunciam a próxima ação pelo nome acessível. Trocar mini/detalhado ou nome/vendas não chama a API.

### Contrato do quadro exibido

O detalhe permanece montado ao navegar. `useBufferedAnalysis` separa a solicitação atual do quadro publicado. A identidade completa inclui hash do snapshot, ID, data, duração, métodos e versões (`specKey`). Nome, datas, estoque, vendas e gráfico vêm sempre do mesmo resultado publicado. Enquanto o próximo cálculo está pendente, o quadro anterior permanece identificado e esmaecido, com identidade Brain informando o destino; controles e exportação ficam desabilitados, mas as setas continuam disponíveis. Respostas antigas ou com identidade divergente não são promovidas. Falha preserva o quadro anterior com mensagem e tentativa novamente, sem apresentá-lo como resultado novo.

Até dois vizinhos da ordem visual são preparados em baixa prioridade usando o cache existente. Detalhe tem prioridade0 e vizinhos3; o snapshot não é reenviado e não há nova consulta externa. A duração escolhida no detalhe acompanha a navegação; cada próximo empreendimento usa seu último registro como início atual. Layout do gráfico permanece reservado, transição de opacidade respeita movimento reduzido, sem espera artificial fixa.

### Evidência desta revisão

119Vitest/18arquivos aprovados: novos testes verificam A→B→C com B atrasado, mudança de duração sem relabelar valores antigos, rejeição de identidade divergente e paginação/busca da galeria. Tipos e lint dirigidos aprovados. Diagnóstico reproduzível `scripts/diagnostics/estimativas-settings-browser.mjs`: desktop1440 claro/escuro e celular390, galeria12/4itens por página, configuração aplicada sobre dados carregados, seleção guiada e navegação rápida com400ms de atraso deliberado por cálculo. Fontes sintéticas explicitamente identificadas; duas chamadas iniciais por cenário e zero extras na exploração. Regressão de seis jornadas de detalhe/backtest/comparação/Excel24linhas e replay real de Maragogi1440/390 preservados, incluindo13pontos históricos. Capturas/logs ignorados em `.local-inputs/estimativas-vendas/configuracoes-20261028/`. Sem nova coleta autenticada nesta revisão, motores intactos, publicação e aceite no site pendentes. Evidência agregada no campo `settingsAndBuffer` do JSON do mapa.

Implementação `b0757b2` enviada a origin/main em28/10 por autorização vigente de Gabriel. Gate documental aprovado; alterações paralelas preservadas. Publicação e comportamento desta revisão no site ainda não conferidos.

### Refinamento posterior — ações compactas e nome de navegação

**Aceite posterior em28/10:** Gabriel confirmou nesta conversa que conferiu a interface em produção e aprovou por ora, após envio `9d14f2a`. Frente encerrada neste estágio; retomada condicionada à comprovação do formato final de saída para Nicolas/Belogic. Evidência é o relato do usuário, sem nova inspeção do agente ou comprovação do hash servido. Não implica homologação do arquivo de importação nem validação estatística adicional. Os limites de produção nos registros anteriores abaixo descrevem o estado antes desse aceite.

Pedido de Gabriel: eliminar a faixa vazia das ações comparar/baixar, retirar hover com fundo amarelo/verde e usar `Estimativas aprovadas` no lugar de Finotti na navegação. Ações comparar, baixar, marcar e configurar agora compartilham o cabeçalho das curvas; instrução/contagem de seleção só aparece durante comparação. Botões transparentes, sem sombra; atenção por varredura verde breve somente nas letras (hover/foco ou comparação pronta), com movimento reduzido respeitado. Não foi ampliado o alvo visual com fundo colorido; áreas de clique confortáveis continuam preservadas.

`Estimativas aprovadas` é o nome de produto solicitado para o mesmo conjunto de referência matemática calculável. Não altera o critério de cálculo nem comprova aprovação estatística, elegibilidade operacional ou homologação de importação. Identificadores internos, autoria Finotti na metodologia, modelos e arquivos rastreáveis permanecem intactos. Filtro/resumo/ações e ausência de referência nos minicards usam o novo vocabulário; a descrição das configurações esclarece seu alcance.

Validação desta mudança:28testes da experiência/9arquivos, tipos/lint/build aprovados. Navegador local1440 claro/escuro e390 confirmou quatro ações agrupadas, fundos transparentes e sombra ausente em hover, retirada da faixa antiga, painel/galerias/carrossel preservados e zero errosJS/overflow horizontal. Seis jornadas de comparação/backtest/Excel24linhas também passaram; fontes sintéticas identificadas, sem nova API real. Capturas revisadas em `.local-inputs/estimativas-vendas/configuracoes-20261028/`. A primeira tentativa de teste foi bloqueada pela revisão automática por limite de uso; nenhuma execução ocorreu naquela tentativa. Retomada explicitamente pedida por Gabriel e gates concluídos. Nova publicação no site ainda não conferida.

## 13. Prévia da base exportável — 29/10/2026

Gabriel reabriu a interface aceita em produção para incluir uma prévia no modal de exportação antes de apresentar a ferramenta. Escopo: até50linhas, colunas atuais de `previsoes.xlsx`, arrastar para reordenar, ocultar/restaurar colunas e fazer o download corresponder à configuração mostrada. Não é confirmação do contrato final Nicolas/Belogic.

**Referência consultada:** `Quanti/quanti-system-hub/src/routes/projetos.$id.tsx`, componente `BasePreviewPanel` e `useColumnVisibility`: tabela compacta de coletas, cabeçalho fixo, ação de ocultar no cabeçalho e recuperação de colunas ocultas. Quanti consultado somente para leitura; sem copiar dependências, filtros de status ou acesso à base. Adaptação em `ExportPreview` usa primitives Rebrain Button/DropdownMenu e os tokens canônicos; modal ampliado até1440px, textos resumidos e rodapé de download preservado. Mantida identificação breve de arquivo para revisão/importação não homologada.

### Contrato de apresentação e download

- `exportColumns.ts` é fonte única das13colunas analíticas já existentes, sem mudar nomes, dados, arredondamento ou ordem padrão. `forecastTable` projeta as linhas na ordem escolhida; o componente limita somente a visualização às primeiras50. O Excel exporta todas as linhas do conjunto congelado.
- Arraste pelo ícone do cabeçalho; `Alt+←/→` e menu Mover esquerda/direita cobrem teclado e telas de toque. Menus permitem ocultar; colunas ocultas reaparecem como ações de restauração, adicionadas ao final. Restaurar colunas recupera as13na ordem original. Última coluna não pode ser ocultada; validação rejeita layout vazio, duplicado ou desconhecido. Número da linha é auxiliar, fora do arquivo.
- Coluna oculta é omitida da aba `previsoes`, não apenas escondida visualmente no XLSX. A aba `leia_me` permanece e registra colunas exportadas/omitidas, origem e limites do arquivo. O usuário pode ocultar inclusive campos de rastreabilidade no analítico; a descrição e a aba de revisão preservam o estado não homologado.
- `previsoes.csv` dentro do pacote de evidências usa o mesmo layout escolhido; manifesto registra seleção/omissões e hashes são recalculados. Histórico, métricas e arquivo estrutural `CANDIDATO_NAO_IMPORTAR.xlsx` continuam completos e no contrato anterior de26colunas, sem personalização implícita da estrutura candidata.
- Mudança de conjunto reinicia configuração/contagem e não exibe um plano antigo como atual. Durante geração do arquivo os controles ficam desabilitados. Sem edição de células, ordenação de linhas, filtros de linhas, novos modelos ou novas chamadas API para personalizar colunas. Alterações de colunas ficam na sessão do modal, sem persistir base privada.

### Verificação

Testes reabrem XLSX72linhas e comparam as primeiras50com a projeção da prévia, preservando IDcom zeros, texto iniciado por `=`, booleano `false`, nulo e precisão numérica. Pacote CSV/manifesto/integridade conferidos. Teste de componente cobre limite50, teclado e arraste. Navegador1440claro/escuro e390: arraste real em desktop e teclado em tela estreita, ocultar/restaurar e restaurar padrão, Excel completo72linhas com12colunas após ocultar cidade, correspondência célula a célula com prévia, ausência de errosJS/overflow e somente duas chamadas sintéticas iniciais. Referência de dados controlada, sem nova coleta autenticada. [Evidência agregada](EVIDENCIAS_PREVIA_EXPORTACAO_2026-10-29.json). Capturas e arquivos privados de teste em `.local-inputs/estimativas-vendas/export-preview-20261029/`, ignorados. Navegador conectado indisponível; usado Chromium headless local. Produção desta revisão ainda não conferida.


## 14. Fluxo de entrega com Análise detalhada — plano de 02/11/2026

**Estado em 02/11: implementado e validado localmente; autorização final de push/deploy pendente.** Autor: Gabriel / sessão. Fonte da decisão: conversa fornecida por Gabriel com Diego, 30/10, 16h22–16h55, e confirmação de Gabriel nesta conversa. Diego pediu busca por cidade e download na página principal, prévia no lugar dos gráficos e acesso superior a Análise detalhada; também pediu filtros mais visíveis. Não é uma nova aprovação das regras ou do formato de importação. As imagens recebidas demonstram a interface usada pelo revisor, sem comprovar hash de produção ou homologação.

### 14.1 Resultado e fronteiras

Entregar uma página operacionalmente simples: escolher território autorizado, conferir previsões em tabela e baixar Excel. Preservar curvas, comparação, retrospectiva, metodologia e conferência opcional por Excel em uma vista secundária da mesma ferramenta, com os mesmos dados já carregados. Não remover motores ou os módulos científicos/operacionais para simplificar a navegação.

Esta entrega muda a organização da experiência e a seleção do arquivo principal; não cria lote liberado para importação. A expressão de produto `Estimativas aprovadas` continua significando referência matemática disponível. Regras de coleta/estimativa, quatro períodos, cadência, alternância, estoque, origem histórica, granularidade e preço mantêm seus estados documentados; uma regra desconhecida não recebe aprovação implícita. Histórico e exportação atual não se tornam prova de coleta real.

Não incluir: novos modelos, alteração de coeficientes, edição de dados, preenchimento de preço/distratos, rateio de tipologias, novas permissões, escrita Geobrain ou criação de backend. Preservar o contrato candidato separado de 26 colunas e a proteção NÃO IMPORTAR.

### 14.2 Jornada e composição da tela

1. **Entrada:** título Estimativas de vendas e seletor territorial existente, sem banner ou frases promocionais. Preservar regiões, várias UFs e cidades; cidade prevalece sobre UF e UF sobre região. Catálogo autorizado do GeoApiScopeEngine continua obrigatório. A simplificação não limita o usuário a uma só cidade.
2. **Consulta:** BrainLoadingState com etapa, progresso real e cancelamento; consultar uma vez e promover somente snapshot completo. Erro permite tentar novamente. Dados anteriores permanecem identificados, sem permitir baixar um novo território com números antigos.
3. **Página principal carregada:** resumo curto do território e da consulta. Navegação superior com `Previsões` (ativa) e `Análise detalhada`. `Alterar local`, `Atualizar dados` e `Dados e metodologia` são ações secundárias próximas, sem uma faixa exclusiva vazia. Atualizar é a ação explícita de recarga externa.
4. **Filtros abertos:** cidade quando houver mais de uma, tipo e `Prever por`, inicial 12 meses. Durações existentes 1/3/6/12/24/36; usar Select/combobox Brain ou seletor compacto acessível, sem calendário e sem slider. Rótulo curto persistente explica: `Os filtros definem o arquivo abaixo`. Busca opcional por nome/ID filtra o conjunto inteiro, não apenas as primeiras 50 linhas, e tem limpeza visível. Mostrar cidade como cidade/UF e usar chave estável para homônimas em estados diferentes.
5. **Entrega:** título curto `Prévia das previsões`, quantidade de empreendimentos com previsão, total de linhas e indicação `50 de N linhas` quando aplicável. Renderizar ExportPreview inline em largura útil, sem abrir modal para chegar à tabela. Uma única ação primária, `Baixar previsões em Excel`, junto do resumo/tabela. `Baixar relatório e evidências` secundária. Manter próximo ao download: `Arquivo para revisão; formato de importação ainda não homologado`.
6. **Não incluídos:** link com contagem abre InventoryGallery ampla e paginada com nomes, IDs e motivos. Separar esgotados, referência indisponível e falha de cálculo; não somar categorias sobrepostas como se fossem pessoas distintas. Pendências operacionais de um empreendimento presente no analítico não são exclusão automática desse analítico e ficam distinguíveis das exclusões de linhas do candidato. Não despejar listas longas na página ou em um expander pequeno.
7. **Análise detalhada:** mapa/lista, exploração individual, comparação, métodos, dados e backtest preservados. Retorno `Previsões` recupera filtros, tabela e colunas. Não repetir consulta nem exigir refazer seleção. Gráficos não são requisito de download na página principal.

O seletor de disponibilidade de métodos, apresentação mapa/lista e controles de comparação permanecem na análise detalhada. Filtros essenciais do arquivo ficam expostos na principal; não manter cópias contraditórias escondidas no painel direito. Sem grandes fundos amarelos em ações secundárias, sem toggle minúsculo para selecionar arquivo, sem nova biblioteca de UI. Respeitar tokens canônicos, temas e cantos locais já aprovados.

### 14.3 Composição determinística do arquivo principal

Criar uma função pura de seleção do recorte de entrega, com entrada snapshot, inventário completo, disponibilidade concluída e filtros; devolver IDs ordenados estáveis e motivos. Cidade/UF, tipo e busca filtram TODOS os empreendimentos antes do limite de prévia. Excluir estoque zero na última data válida do empreendimento e itens sem referência Finotti calculável. Não usar índices de página do mosaico, os primeiros 50 registros, disponibilidade parcialmente calculada ou a seleção do modo Comparação como entrada.

O arquivo inicial inclui automaticamente todos os itens calculáveis desse recorte, sem botão Marcar todos ou seleção card a card. Cada empreendimento usa seu último mês válido, preservado na coluna `inicio`; não deslocar todos à última data global. A duração escolhida se aplica a cada início individual. Resultado mensal analítico não comprova cadência oficial mensal e não autoriza estimar períodos operacionais consecutivos.

O pedido de análise principal deve solicitar somente `finotti-reference`. Não basta aplicar um rótulo à função `present`: ela hoje escolhe o primeiro método disponível e pode usar comparadores. Validar antes de publicar o plano que cada integrante incluído possui referência/versionamento corretos; jamais substituir silenciosamente por stock-trend ou constant no arquivo principal. Reutilizar buildExportPlan e adicionar a validação específica na fronteira de entrega, sem modificar comportamento legítimo dos exportadores exploratórios existentes.

Conjunto vazio: indicar motivo e permitir rever local/filtros, sem Excel vazio aparentemente bem-sucedido. Se todos estiverem sem referência, contagens e galeria continuam úteis. Se um cálculo falhar, mostrar tentativa novamente e bloquear a entrega daquele pedido; não reduzir silenciosamente a seleção para produzir um arquivo parcial. Indisponibilidades esperadas classificadas entram nos motivos antes de formar o conjunto, não em catch genérico.

As dimensões são separadas: referência calculável, possibilidade de backtest e elegibilidade operacional. Mostrar resumo objetivo das pendências operacionais, sem tratar `importavel=false` como erro de download analítico ou usar o nome Estimativas aprovadas para prometer aceite de importação. Não alterar limiares nem decidir granularidade externa nesta implementação.

### 14.4 Estado e fronteiras dos componentes

Reutilizar ExperiencePage como raiz de sessão: autenticação, UniverseSnapshot, AnalysisRuntime e ciclo de vida permanecem compartilhados. Introduzir navegação local `previsoes | analise` em vez de nova página que refaça carga. Preservar rota pública/lazy atuais. A vista principal é padrão após carga; alternar vistas mantém sessão sem duplicar workers.

Separar estado em três partes: filtros de entrega (cidade/UF, tipo, busca, duração); configuração de exploração (data histórica, medida, métodos, zoom, seleção de comparação); layout da exportação (ordem/visibilidade das colunas). Inicializar a análise na primeira abertura com contexto atual da entrega; depois preservar sua exploração independentemente. Ajustes exploratórios não alteram o arquivo principal. Ao voltar, mostrar o contexto do arquivo da principal, sem copiar o início histórico escolhido no backtest. Troca de universo completo limpa seleções e pedidos das duas vistas; troca de token limpa também snapshot/cache, incluindo prévia.

Refatoração proposta, adaptando nomes ao código existente sem duplicação:

- `useForecastDelivery` ou equivalente: composição de IDs, spec latest/Finotti, preparação cancelável, resultado publicado, geração e layout de colunas.
- `deliveryScope.ts`: seletor puro, chave de identidade e validações de conjunto/método; sem API e sem matemática nova.
- `ForecastDelivery`: barra compacta de filtros, resumo, ExportPreview e ações inline.
- `ExportContent`: extrair de ExportReview a apresentação/preparação reutilizável necessária. ExportReview permanece wrapper Dialog para exportações explícitas individuais ou de conjuntos da análise. Não copiar seu efeito de preparação integral para dois lugares ativos ao mesmo tempo.
- `DetailedAnalysis`: composição atual de mapa/lista, ComparisonMode, ForecastExplorer e PortfolioExplorer; manter props e estado necessários fora de um componente que perde tudo ao desmontar.
- `AnalysisFilters`: retirar da principal; manter somente configurações exploratórias na análise. Não misturar filtros do arquivo e da visualização com o mesmo nome e efeitos diferentes.
- `exportColumns.ts`, `ExportPreview`, `forecastWorkbook`, `downloadPackage`: manter uma fonte para cabeçalhos e transformação. Reutilizar componentes/primitives existentes e CSS prefixado, sem nova dependência.

Manter estado de análise/cache na raiz ou reducer ao trocar vista, mas pausar jobs de mapa/prefetch quando a análise não estiver visível. Não deixar todos os gráficos montados ocultos consumindo CPU. Tratar restauração de foco e botão Voltar do diálogo sem quebrar a navegação principal.

### 14.5 Identidade, cancelamento e desempenho

Chave de preparação: hash do snapshot + IDs ordenados + datas efetivas por empreendimento + duração + métodos/versões. Mudança de recorte invalida a entrega imediatamente e cancela/ignora tarefas obsoletas. Só publicar tabela, contagens, métodos e ações juntos, a partir do mesmo plano estável. Usar geração/requestId; não depender só da identidade de arrays/objetos recriados em render.

Durante atualização local manter o quadro anterior identificado e opaco, BrainLoadingState compacto, sem trocar apenas o título. Download e edição de colunas bloqueados até o novo quadro válido. Permitir cancelar o cálculo; resultado anterior não se torna arquivo do novo filtro. Sem espera artificial, spinner genérico ou progresso inventado. Alterações rápidas sucessivas só publicam a última válida.

API externa mantém máximo global de oito chamadas e atomicidade da carga; não adicionar um novo Promise.all ilimitado. Reutilizar worker/scheduler/cache existentes para cálculos; priorizar entrega e exploração ativa, cancelar filas obsoletas sem prejudicar outro consumidor do runtime. Após carga, filtros, duração, navegação, backtest e colunas não consultam API. Ao atualizar explicitamente, novo snapshot/hash invalida resultados antigos mesmo se os IDs forem iguais.

Preparação abrange todos os IDs escolhidos, em tarefas cooperativas canceláveis. Renderizar só 50 linhas não significa calcular/exportar só 50. Não aquecer todas as datas/métodos/cidades combinadas antecipadamente. Registrar número de requisições, tempo até a prévia, cálculo quente e tamanho do recorte no ensaio; sem prometer tempo universal.

### 14.6 Colunas, download e rastreabilidade

Preservar as 13 colunas atuais de FORECAST_COLUMNS, seus nomes e a ordem padrão; uma linha por empreendimento/mês previsto. IDs texto, precisão, nulos, flags, versões e arredondamentos continuam iguais. A tabela é uma amostra do mesmo ExportPlan integral, sem segunda montagem independente de linhas. Não introduzir ordenação de linhas que só afete a prévia.

Arrastar, ocultar, restaurar, teclado e alternativas de toque permanecem. Excel e previsoes.csv do pacote usam a mesma ordem/omissões atuais; leia_me e manifesto registram limites/layout. Histórico e candidato de 26 colunas não recebem ocultação implícita. Bloquear ocultação da última coluna. Layout persiste ao mudar duração, filtros e vista dentro do mesmo snapshot; reinicia ao carregar novo snapshot. Exportações do detalhe possuem layout próprio, sem alterar a principal.

Ao clicar Baixar congelar plano, layout e identidade, desabilitar alterações conflitantes até concluir e evitar duplo download. O arquivo deve corresponder integralmente ao quadro revisado. Tratar erro com nova tentativa sem repetir API e liberar controles ao final. Evidências devem descrever exatamente esse conjunto, distinguindo ausência de backtest de teste executado, e não aproveitar métricas de outra data/modelo.

Avisos ficam curtos na tela, completos no leia_me/manifesto. Nenhuma chamada de importação, nenhum dado histórico sobrescrito, nenhuma declaração de homologação. Planilha analítica com 13 colunas e candidato externo de 26 colunas continuam produtos distintos.

### 14.7 Sequência de implementação e pontos de revisão

- [x] **G0 — Base e preservação.** Ler AGENTS e fontes; fetch de todos os remotos, comparar refs, inventariar alterações paralelas, registrar baseline. Em 02/11: main local c62e41e, 15 commits atrás de origin/main, zero à frente; alterações remotas de relatórios SP não tocam esta feature, mas há árvore local suja. Não integrar automaticamente: obter autorização específica de integração conforme protocolo antes do merge; sem rebase/reset. Preparação documental pode prosseguir. Após integração autorizada, ler entradas novas e repetir baseline relevante.
- [x] **G1 — Contrato do recorte.** Implementar seleção pura/identidade e testes antes da UI; definir diferenças entre matemática, operação e backtest. Conferir que reference-only impede fallback. Proteger datas individuais e categorias de exclusão.
- [x] **G2 — Preparação compartilhada.** Extrair lógica de exportação sem duplicação; estado estável/cancelamento, Brain, layout e bloqueios de download. Preservar wrapper modal utilizado pelo detalhe.
- [x] **G3 — Página principal.** Aplicar navegação, filtros visíveis e ExportPreview inline. Carregar automaticamente o conjunto calculável completo; remover ações de seleção/comparação e gráficos desta vista. Tratar vazio/erro/atualização e motivos.
- [x] **G4 — Análise detalhada.** Reposicionar experiência existente, conservar exploração/backtest/galerias/Excel de conferência, retorno e independência da seleção. Pausar cálculos não visíveis. Não apagar jornada operacional legada nem suas rotas/acessos existentes sem tarefa específica de remoção.
- [x] **G5 — Verificação integrada.** Executar casos de aceite abaixo, reabrir arquivos, medir requisições e testar navegador/responsividade/temas. Corrigir regressões antes de concluir.
- [x] **G6 — Entrega revisável.** Atualizar evidência pequena, plano, LIVE_rebrain, mapa System Design e acompanhamento Gabriel. Commit isolado com staging explícito; apresentar resultado, limites, contagens reais, estado Git e pendências. Push/deploy dependem de autorização final específica da execução. Interface pronta isoladamente não conclui o plano.

### 14.8 Critérios de aceite e testes obrigatórios

**Contratos puros/integrados:**

1. Mais de 50 linhas: prévia contém 50; arquivo contém todas. Mais de uma página do mapa não limita o conjunto. A ordem e os valores das 50 linhas exibidas correspondem à planilha reaberta.
2. Recorte com cidades homônimas de UFs diferentes, múltiplos tipos e busca: IDs, contagens e linhas corretos; limpar filtro recupera conjunto completo sem nova consulta. Cidade fora do catálogo nunca dispara histórico pesado.
3. Últimos registros diferentes: inicio individual e meses previstos corretos; duração 1/12/36 preserva regras do motor. Esgotado excluído da projeção atual, mas elegível para análise de estoque passado quando domínio permitir.
4. Referência indisponível com comparador disponível: fora do principal com motivo; jamais exportar comparador como Estimativa aprovada. Origens/cadência desconhecidas permanecem pendentes e importavel=false, sem transformar exploração em lote liberado.
5. Race A→B→C, B lento, cancelamento, erro de um integrante, troca de token/snapshot e atualização parcial: nenhuma tabela/download rotulada com dados de outro pedido; recuperação explícita e sem arquivo parcial silencioso.
6. Comparar itens, escolher data histórica e outro método, abrir exportação detalhada e voltar: arquivo principal intacto. Filtros de entrega alteram arquivo deliberadamente; filtros de exploração não alteram sua composição.
7. Colunas personalizadas sobrevivem a filtros/vistas no mesmo snapshot; novo snapshot restaura padrão. XLSX/CSV/manifesto coerentes, última coluna protegida, IDs/nulos/decimais/booleanos/textos iniciados por `=` preservados e seguros. Congelamento durante geração e bloqueio de clique duplo.
8. Motores/gabaritos científicos, limitação de treino Finotti, lacunas e ausência versus zero continuam protegidos; sem novo cálculo de confiança, cadência ou preço. Regressão da jornada operacional existente.

**Navegador e evidências:** testar 1440/768/390, claro/escuro, teclado e toque, foco/retorno, redução de movimento, tabela com rolagem horizontal contida e cabeçalho legível. Nenhum overflow da página. Cenários: carga lenta Brain, erro/retry/cancelar, nenhum histórico, zero calculáveis, sucesso com mais de 50 linhas, todos excluídos por filtro, download após personalizar colunas e ida/volta à análise. Sem erro JavaScript. Gráficos/backtest continuam funcionais e só montados na análise.

Instrumentar as requisições do cenário completo: máximo oito em voo na carga, zero extras ao filtrar/alternar vista/calcular/editar colunas. Fonte sintética deve ser identificada; usar replay real existente quando disponível sem publicar brutos. Uma fonte sem meses posteriores avaliáveis deve dizer Sem comparação válida, não forçar métricas.

Executar `npx.cmd vitest run src/features/estimativas-vendas`, `node scripts/diagnostics/estimativas-operational.test.mjs`, `npx.cmd tsc --noEmit -p tsconfig.app.json`, lint dirigido, `npm.cmd run build`, `git diff --check` e `npm.cmd run check:live-docs -- <base> <head>`. As contagens históricas de testes são baseline, não resultado dessa execução. Adaptar diagnósticos atuais de export-preview/settings/experience, preservando casos de domínio; inspecionar capturas, não apenas gerar screenshots.

Atualizar a evidência pequena existente de exportação com seção datada da nova jornada e link a este plano, sem reescrever resultados anteriores. Capturas, XLSX, logs e snapshots vão para `.local-inputs/estimativas-vendas/fluxo-entrega-20261102/`, ignorada. Registrar limites se navegador/API não estiverem disponíveis, sem declarar produção ou importação verificada.

### 14.9 Execução local em 02/11 — resultado, evidências e limites

G0–G6 concluídos localmente. Base remota integrada por merge autorizado `706eb96`, mantendo o plano local `aa39ce5` e os15commits SP. Guardadas em stash nomeado e reaplicadas somente as cinco alterações documentais anteriores; quatro documentos conferidos integralmente contra o stash, com normalização Git de fins de linha; parágrafo FIERGS no LIVE e pasta Corretor não versionada preservados fora desta entrega. Nenhum rebase/reset, push, deploy ou mensagem externa.

`ForecastDelivery` é a vista padrão após carregar: filtros de cidade/UF, tipo, busca e duração ficam visíveis; prévia inline e Excel do conjunto inteiro calculável, com ação de download antes da tabela. `deliveryScope` separa esgotados e sem referência; só aceita Finotti, datas individuais e todas as linhas dos meses solicitados, sem fallback ou redução silenciosa. Referência matemática não libera importação. Motivos em InventoryGallery ampla/paginada; relatório/candidato continuam separados.

`useExportPlan` concentra preparação usada pela entrega e pelo modal ExportReview, com chave de snapshot/data/IDs/spec/versionamento, resposta mais recente, cancelamento cooperativo entre tarefas e retry. `ExportContent` concentra prévia/download, congela layout, bloqueia cliques repetidos e impede download após desmontagem da sessão. Snapshot promovido reinicia colunas mesmo se o conteúdo/hash for idêntico. Falha de consulta preserva o snapshot anterior identificado. Mantido runtime/worker/cache compartilhado; filas obsoletas deixam de receber tarefas sem cancelar indiscriminadamente jobs de outro consumidor.

Análise detalhada mantém mapa/lista, comparação, detalhe, carrossel, backtest, metodologia e Excel de conferência. Estado de filtro/seleção permanece na raiz, separado da entrega; gráficos desmontam fora da vista detalhada. Na primeira abertura a análise recebe o contexto de entrega; depois sua configuração é independente. Alternar vistas não faz consulta externa. Não foi necessário criar outra rota ou remover jornadas legadas. Primitives Button/Select/Dialog, identidade Brain e tokens canônicos preservados.

Validação final:129Vitest/23arquivos;15testes Node operacionais; typecheck do app, lint da experiência sem avisos e build aprovados. Build mantém avisos anteriores de Browserslist/XLSX/chunks. Motores, parâmetros, módulos scientific/expanded/operational e transporte de dados não foram alterados. Contratos de domínio, referências congeladas e limitação temporal dos testes permanecem protegidos.

Navegador: seis cenários1440/768/390, claro/escuro, prévia50/Excel72linhas e12colunas após ocultação; células/ordem conferidas ao reabrir XLSX, filtros sobre conjunto inteiro, persistência de colunas, seleção comparativa/backtest independentes e atualização com mesmo hash reiniciando padrão13colunas. Cinco estados adicionais: vazio, sem referência, cancelar consulta, erro/retry e território sem autorização. Zero errosJS/overflow horizontal. Duas consultas sintéticas iniciais e zero extras antes de atualização explícita. Fonte sintética identificada, atraso controlado350ms; tempos registrados são locais, sem promessa sobre API real. Teste de transporte existente confirma pico8com18páginas.

Replay real já preservado de Maragogi:25cadastros em1440/390;13pontos históricos de Max Tulum permanecem visíveis; carrossel, backtest e comparação aprovados. Desktop sem rolagem do detalhe, celular com rolagem vertical por legibilidade, sem overflow horizontal. Sem nova consulta autenticada; não comprova precisão ou origem observada dos dados.

Evidência pequena na chave `deliveryFlow20261102` de [evidências de exportação](EVIDENCIAS_PREVIA_EXPORTACAO_2026-10-29.json); scripts reproduzíveis e saídas/capturas em `.local-inputs/estimativas-vendas/fluxo-entrega-20261102/`. Capturas principais claro/escuro e celular inspecionadas. Navegador conectado indisponível após discovery/troubleshooting; utilizado Chromium headless local. Produção e formato final de importação continuam pendentes, sem declaração de homologação. Próximo: autorização de push/publicação e aceite humano da nova jornada.
