# Plano de ação — recuperação segura da coleta multicidades do Panorama

**Data:** 06/10/2026
**Escopo:** motor compartilhado do Panorama Secovi/FIERGS (`src/features/panorama-secovi-fiergs`), para qualquer quantidade **N ≥ 1** de municípios selecionados. FIERGS 1T2023–2T2026 é o caso de aceitação inicial, não uma exceção de runtime.
**Objetivo:** recuperar falhas transitórias apenas nas cidades incompletas, apresentar erro útil quando a recuperação se esgotar e impedir que um relatório de cobertura incompleta pareça concluído ou seja exportado.

## Baseline e limites da evidência

- A auditoria recebida em `assets/auditoria-fiergs-2t2026.csv` registra 38/39 reconciliações `match`; `sales.vertical.city` ficou `unavailable` porque Gravataí, São Leopoldo e Viamão não concluíram a coleta. O CSV identifica as cidades, mas não a operação, HTTP/status nem erro original. Portanto **não há causa-raiz confirmada** para aquela tentativa.
- O commit `41c3396` já fez cinco condomínios de Alvorada/Cachoeirinha aparecerem na auditoria; os dois restantes ficam em Gravataí/Viamão, ausentes da coleta. Não atribuir a falha de transporte à regra de produto.
- Em reprodução direta em 06/10, os mesmos endpoints, parâmetros e paginação responderam **141/141 HTTP 200** nas dez cidades, usando duas cidades e até seis chamadas simultâneas. As 80 páginas temporais por padrão levaram 16,8–22,6 s (média 19,6 s); a coleta granular e por tipologia foi muito mais rápida. São medições pontuais, não prova de disponibilidade futura. Evidências locais ignoradas pelo Git: `.tmp/fiergs-city-full-flow-10city-diagnostic.json` e `.tmp/fiergs-city-full-flow-diagnostic.json`.
- Hoje `collectByCity` guarda sucesso/falha de cada cidade, mas só faz uma rodada. `harvestCity` busca o histórico e nove consultas temporais; a requisição granular tem retry/fallback, enquanto as temporais geralmente não têm retry. O modelo é montado mesmo em estado `partial`; a reconciliação bloqueia PDF/PPT só no final. A página usa React Query por chave de recorte e `retry: 0`; refetch da página refaz todas as cidades. A auditoria FIERGS serializa aviso de cidades faltantes sem erro técnico por cidade.
- O remoto `origin/main` estava **um commit à frente** do `main` local em 06/10 (`b49b804`, Sinduscon), com árvore suja por arquivos não relacionados. Não integrar nem publicar durante a elaboração deste plano.

## Contrato de segurança

1. `N` é a lista deduplicada e validada do escopo, não uma constante FIERGS. Sucesso integral exige cada cidade requerida concluída no mesmo recorte `{entidade, UF, cidades, período, versão do motor}`. Uma cidade única também pode ser recuperada; com `N > 1`, nunca somar somente as concluídas como se fossem o universo inteiro.
2. **Não afrouxar** as guardas de reconciliação, não imputar zero, não converter `null` em zero e não autorizar exportação parcial. Dados históricos concluídos podem ficar em memória durante a tentativa, mas não virar PDF/PPT final até o portão de completude passar.
3. Diferenciar *cidade com coleta incompleta* de *indicador opcional indisponível*. Definir por entidade/motor quais contratos são necessários para construir o cubo e quais ausências têm aviso não bloqueante. A presença de uma resposta qualquer não prova completude; `HTTP 200` com payload inválido/vazio para fonte obrigatória não é sucesso.
4. Retry só para falha transitória (`timeout/rede`, 408, 429, 5xx) e com limite. `401/403` exige reautenticação/permissão; `400/404/405/422` e erro de contrato exigem correção da integração, sem repetição cega. Respeitar `Retry-After` quando disponível; não criar rajadas novas contra a API.
5. Cancelamento e troca de recorte invalidam a tentativa anterior. Não juntar cidades de escopos diferentes nem respostas de uma geração antiga com uma nova. Não reintroduzir o cancelamento involuntário do fallback por re-renderização/React Query.

## Portões de execução

### G0 — Instrumentação e contrato de completude

1. Mapear, por etapa de `harvestCity`, endpoint, grupo, página, tipo de falha, criticidade e regra atual de fallback. Confirmar a semântica de `CityHarvest`, `CollectionResult`, `PanoramaProvenance` e das reconciliações para `N=1`, `N=2` e o preset FIERGS.
2. Criar um erro tipado/sanitizado de coleta (`city`, `operation`, `endpoint` sem query sensível, `status`, `attempt`, `durationMs`, classe `transient/auth/contract/empty`). Propagar a causa original de `httpRequest`/`requestWithRetry` sem expor token, credencial ou corpo sensível. Instrumentar paginação, fallback interno→público e indicadores temporais.
3. Definir a matriz de fontes obrigatórias/opcionais por entidade e versão. Preservar o comportamento legítimo de indicadores parciais, mas falhar a cidade quando a fonte necessária para o relatório não foi obtida. Documentar os casos de payload inválido e ausência observável.

**Portão:** em uma falha simulada, cidade, operação, página, status e classe são identificáveis; nenhuma credencial aparece em log, UI ou CSV. A matriz de completude está registrada antes de alterar retries.

### G1 — Recuperação automática antes de construir o modelo

1. Generalizar `collectByCity`/orquestração para manter resultados completos por cidade e executar até **duas rodadas adicionais** apenas para as cidades transitórias que falharam. Não repetir cidades concluídas. Backoff com jitter e teto, respeitando `Retry-After`; manter os limites de concorrência por cidade e de chamadas globais em todas as rodadas.
2. Repetir a **cidade inteira** (incluindo histórico e fontes requeridas) para não misturar uma página nova com um cubo parcial da tentativa anterior. O resultado bem-sucedido substitui atomicamente a tentativa falha daquela cidade; deduplicar por chave canônica. Guardar `attempt` e intervalo de coleta na proveniência.
3. Antes de `mergeCubes`/`buildPanoramaReportModel`, exigir `completedCities.length === requestedCities.length` e ausência de falhas de fonte obrigatória. Se o limite for esgotado, retornar estado de recuperação/falha com os dados técnicos seguros das cidades faltantes, **sem montar um relatório parcial como produto final**. Se houver necessidade de manter preview parcial para diagnóstico, isolá-lo explicitamente da rota final e da exportação.
4. Definir validade da coleta em memória: mesmo recorte e mesma geração, sem reutilizar resultados após troca de filtros, logout ou expiração da sessão. Não prometer fotografia atômica da GeoBrain; registrar horários de início/fim e, se a recuperação exceder janela operacional definida, reiniciar o recorte em vez de misturar snapshots excessivamente distantes.

**Portão:** para qualquer `N`, uma cidade que falha uma vez e depois responde entra uma única vez no cubo final; erro persistente não produz relatório exportável; cancelamento não deixa geração anterior aparecer.

### G2 — Estado de recuperação e retry manual no app

1. Acrescentar ao progresso estados `tentando novamente`, cidade/etapa, rodada e contagem `concluídas/N`; não usar ETA sem base observada. Ao esgotar, mostrar lista de cidades e motivo em linguagem segura com ação **“Tentar cidades faltantes”** para falhas transitórias e ação apropriada para autenticação/contrato. Não pedir ao usuário que baixe um CSV para descobrir um erro de coleta.
2. Fazer o retry manual continuar **a mesma geração/recorte** a partir dos `CityHarvest` completos mantidos em estado de sessão, sem depender de `report.refetch()` que refaz todas as cidades. Desabilitar a ação durante tentativa em andamento; oferecer “Recomeçar coleta” quando o escopo, a autenticação ou a validade mudar.
3. Centralizar a decisão de exportação: somente modelo integral e reconciliação crítica aprovada liberam PDF/PPT. O preview parcial, se mantido, deve ser inequívoco e não portar controles que sugiram documento pronto. Não alterar os estados de carregamento, seleção geográfica ou acesso existentes sem necessidade.

**Portão:** usuário sabe qual cidade/operação falhou e o que tentar; não vê páginas finais que não poderá baixar; ao recuperar, recebe um único modelo atualizado, sem métricas ou avisos antigos persistentes.

### G3 — Auditoria e observabilidade compartilhadas

1. Registrar no modelo/proveniência a história das tentativas por cidade: concluída, recuperada, falha persistente, operação, classe, status, tentativas e latência; manter detalhes sensíveis fora do artefato. Exibir síntese no painel de avisos e, para FIERGS, linhas próprias na auditoria CSV. Para outros relatórios do mesmo motor, expor a mesma informação no app e em eventual exportação de auditoria, sem criar dependência do formato FIERGS.
2. Separar avisos `CITY_RECOVERED` (informativo, modelo integral) de `CITY_COLLECTION_FAILED` (bloqueante); não chamar `sales.vertical.city` de “delta” quando estiver `unavailable` por cobertura. A reconciliação continua verificando números após recuperação.
3. Registrar contagem e tempo de requests por grupo para comparar impacto da política de retry com a baseline de 141 chamadas. Preflight opcional somente se reduzir falhas mensuravelmente; uma primeira página 200 não substitui G1.

**Portão:** uma execução recuperada é auditável; uma execução falha aponta causa acionável. Nenhum aviso antigo permanece após mudar o recorte.

### G4 — Validação focada e regressões

1. Testes determinísticos de `N=1`, `N=2`, `N=10` e `N` arbitrário: todas concluem; uma falha e recupera; várias falham em rodadas distintas; falha persistente; 401/403; 429 com `Retry-After`; 5xx/timeout; payload inválido; cancelamento/troca de recorte; ausência de duplicação e limites de concorrência. Usar relógio e rede simulados; não depender da API real em CI.
2. Testes de integração do modelo/UI: relatório só é construído com cidades requeridas completas; reconciliação e exportação continuam bloqueadas em erro crítico; retry manual não refaz cidades concluídas; cidade recuperada aparece em todas as dimensões e no mapa uma vez; Secovi-SP multi-cidade e FIERGS compartilham a política. Verificar também um município único.
3. Executar apenas validações proporcionais ao código alterado (`vitest` focado, TypeScript/build conforme viabilidade), registrar erros preexistentes separadamente. Não rodar geração longa ou PDF por conta própria nesta implementação, conforme preferência atual de Gabriel; ele fará o ensaio no site com FIERGS 2T2026 e trará PDF/CSV. Antes do ensaio, validar em ambiente de desenvolvimento um fluxo sintético completo, incluindo falha e recuperação.

**Portão:** suíte focada aprovada, nenhuma regressão nos contratos Secovi, evidência de que o bloqueio não foi contornado. A homologação FIERGS permanece aberta até PDF/CSV real e aceite da Juliana.

### G5 — Entrega, publicação e acompanhamento

1. Atualizar evidência Markdown, `docs/projetos/LIVE_rebrain.md` e o diário semanal do SE com escopo, erro observado versus hipótese, arquivos, testes e estado real. Fazer commits isolados com `git add` explícito, sem tocar `src/features/corretor` ou arquivos locais alheios.
2. Antes de sincronizar, conferir `git remote -v`, `git fetch --all` e divergência de cada remoto. Há um commit Sinduscon novo no remoto e árvore local suja nesta data; não fazer pull/merge automático nem push sobre base desatualizada sem resolver o estado com Gabriel. O plano não autoriza publicação por si só.
3. Após publicação autorizada, Gabriel gera **FIERGS 1T2023–2T2026** no site. Conferir todas as cidades no CSV, condomínios de casas nas análises horizontais, zero invariantes críticas abertas e PDF baixável. Fazer um segundo ensaio multi-cidade Secovi em ambiente adequado; não declarar o fluxo “verificado em produção” só por testes locais. Juliana ainda precisa dar aceite ao estudo.

**Aceite:** fluxo recupera automaticamente falhas transitórias sem refazer cidades completas, fornece retry manual útil quando necessário, nunca apresenta/baixa relatório de universo incompleto como final e funciona para qualquer `N` selecionado. Observabilidade permite distinguir falha de rede/API, autenticação, contrato e dados vazios. Nenhum número é fixado no runtime.
