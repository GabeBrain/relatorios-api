# Slide Maker — implementação da integração Lovable Cloud

Estado: implementação concluída e validada localmente em 12/11/2026; integração autorizada com a Fase8 de Diego e os commits até `fc3dda87`. Publicação da ponte e migration complementar pendentes; a base tem aplicação/conferência relatada por Diego/Lovable. Propósito: substituir a dependência de service role externa preservando o produto. `DEPLOY_GCP.md` é o roteiro operacional atualizado, incluindo instruções manuais e recuperação.

## Resultado esperado

Interface no Rebrain; processamento pesado, Claude, fontes e renderização no Cloud Run; tabelas, arquivos e progresso no Lovable Cloud existente (`mxinpvcqzbfbzjodhgtz`). A service role permanece exclusivamente nas Edge Functions gerenciadas. Agentes preparam código e consultas; Gabriel executa migrations, publicação da função e cadastro de segredo pelo Lovable. Sem migração para outro banco.

GCP já preparado: projeto `brain-rebrain-slide-maker`, número `475189392075`, região `southamerica-east1`, conta `inovacao.grupo.brain@gmail.com`, mesma cobrança profissional do BigQuery. Bucket `gs://brain-rebrain-slide-maker-slide-maker-marca`, três contas de serviço, repositório `slide-maker` e fila `slide-maker-fases` (uma tentativa, quatro execuções simultâneas). Anthropic versão 1 enabled conforme captura de Gabriel. Ativos ainda pendentes na última conferência; nenhum serviço publicado. Não recriar esses recursos.

## 1. Conciliar a base

- Conferir identidade, todos os remotes, fetch e alterações locais antes de implementar. Trabalhar na main conforme AGENTS.md.
- Inventariar e preservar alterações locais, inclusive instruções Lovable Cloud e LIVE desta sessão. Não fazer reset, sobrescrever ou incluir mudanças alheias em commit.
- Preparar reconciliação concreta; a regra do projeto exige autorização antes de pull/merge com árvore suja. Não inferir autorização de push deste plano.
- Ler fases recentes e contratos atuais após integração. O roteiro remoto ainda exige service role, inclusive no simulado; não executá-lo sem a adaptação.

## 2. Contrato da ponte

Nome proposto da função: `slide-maker-bridge`, em `supabase/functions/slide-maker-bridge/`. Cloud Run chama operações explicitamente permitidas, com validação de payload, limites de tamanho e erros sanitizados. Nunca aceitar SQL, tabela, filtro ou caminho arbitrário fornecido pelo cliente.

Mapear todos os métodos de `Repo`, `Armazenamento` e `Eventos`, incluindo criar/consultar trabalho, mudanças de estado condicionais, mensagens, arquivos, versões, relatórios, fases, rate limit, cancelamento e Broadcast. Preservar a autorização por token do trabalho nas rotas públicas. A ponte é servidor-servidor; credencial nunca vai ao navegador ou aos comandos do agente.

Autenticação proposta: segredo aleatório próprio, HMAC-SHA256 sobre versão do contrato, timestamp, nonce, método, caminho e hash do corpo. Verificação antes de acessar dados; tolerância de relógio curta, comparação segura e nonce consumido atomicamente para impedir replay. Rotação deve ser documentada. Desabilitar verificação JWT da plataforma somente nesta função, se necessário para o protocolo próprio, mantendo autenticação obrigatória no handler. Confirmar configuração efetiva pelo Lovable.

Mutações repetíveis usam chave de idempotência e resultado persistido; replay de assinatura e repetição legítima de operação são tratados separadamente. Não repetir geração paga automaticamente. Operações concorrentes (reserva de fase, rate limit, atualização esperada e conclusão) devem ser atômicas no banco, por funções SQL com acesso somente de backend. Nenhuma ampliação de anon/authenticated.

Arquivos grandes trafegam por URLs assinadas restritas ao bucket, trabalho e objeto, com validade curta. A ponte emite autorização e confirma metadados; não transporta apresentações inteiras em JSON/base64. Conferir upload, download, workspace, relatório e expiração/renovação. Broadcast contém somente sinalização mínima; consulta periódica existente continua funcionando.

## 3. Implementar

- Criar handler da ponte, contratos compartilhados e adaptadores HTTP do Cloud Run.
- Alterar `server.ts`, `config.ts`, repositório, armazenamento e emissão de eventos para eliminar a exigência de service role no Cloud Run, inclusive no simulado. Não deixar fallback implícito para acesso administrativo.
- Conferir a base original, já relatada como aplicada. Lovable registrou o DDL em `drizzle/migrations/0000_slide_maker.sql` e criou os buckets pela ferramenta Storage; o INSERT de buckets da migration original não é aceito nesse ambiente. Não repetir a base nem executar todas as migrations pendentes.
- Criar migration complementar pelo mecanismo de geração do projeto/CLI para nonce, idempotência e operações atômicas necessárias. O nome real só será definido quando o arquivo for gerado. Inspecionar policies genéricas de Storage que possam alcançar buckets novos, preservando as outras ferramentas.
- Atualizar `DEPLOY_GCP.md`, README do serviço e LIVE com nomes finais, ordem de publicação e rollback. Gerar pacote manual reproduzível com preflight, migrations exatas e verificações; não inventar aplicação remota.

## 4. Validar antes de publicar

- Testar assinatura ausente/inválida, corpo alterado, relógio expirado, replay e operações desconhecidas: nenhuma escrita nesses casos.
- Testar concorrência, duplicação da tarefa, resultado repetido, retomada/cancelamento e isolamento entre trabalhos; erros de rede não podem duplicar efeitos.
- Verificar permissões SQL em banco de teste, URLs assinadas e caminhos inválidos; cobrir arquivos grandes sem proxy pelo handler.
- Executar testes existentes do serviço e frontend afetados, tipos/lint/build e fluxo simulado ponta a ponta contra a ponte. Diferenciar mocks de infraestrutura real.
- Não executar Claude pago nesta etapa. Não desabilitar isolamento para fazer o teste passar.

## 5. Publicação e aceite

1. Gabriel aplica manualmente as migrations conferidas no Lovable, cadastra o segredo e publica `slide-maker-bridge` pelo fluxo disponível. Código no Git não comprova publicação. Entregar instrução exata ao Lovable e consulta de verificação.
2. Cadastrar o mesmo segredo de integração no Secret Manager e conceder acesso só à conta runtime. Configurar URL da ponte no Cloud Run. Gerar segredo sem exibição em chat/log/arquivo versionado; transferência ao Lovable por entrada segura. Não usar service role como substituto.
3. Diego envia os 20 ativos de marca nos caminhos de B1 e confere contagem/nomes. Autenticação gcloud no computador dele via login oficial da conta profissional; nunca copiar caches de autenticação.
4. Executar build e publicar com `AGENTE=simulado`; guardar ID do build/revisão, testes e URL real. Verificar configuração do bucket de origem do Cloud Build se a conta build precisar de leitura.
5. Validar saúde, banco, Storage, eventos, fluxo completo, retomada e downloads reais. `isolamento.aprovado=true` é requisito para agente real. Se bwrap falhar, diagnosticar e propor solução antes de ativar Claude.
6. Configurar `VITE_SLIDE_MAKER_AGENT_URL` com URL verificada, publicar frontend pelo fluxo do projeto e validar interface autenticada por token do trabalho, incluindo versões e relatórios privados.
7. Com autorização explícita de consumo, ativar agente real e executar trabalho dourado 1. Medir custo real, duração e qualidade; US$5–9 do roteiro é estimativa, não gasto comprovado. Falha retorna ao simulado ou revisão anterior; preservar dados e evitar retries pagos automáticos.

## Instruções finais para Gabriel

Os arquivos abaixo foram implementados. Seguir a seção final de `DEPLOY_GCP.md` para aplicação manual; SQL e função ainda não foram publicados no Lovable. Validar estado existente antes de aplicar.

### Arquivos que você receberá

- Migration existente: `supabase/migrations/20261112160000_slide_maker.sql`.
- Migration complementar: `supabase/migrations/20261112200554_slide_maker_bridge.sql`, gerada pela CLI; nonce, idempotência, RPCs e reserva transacional.
- Função: `supabase/functions/slide-maker-bridge/index.ts` e dependências necessárias, com instrução para o Lovable publicar a versão correta.
- `DEPLOY_GCP.md` revisado, com passo a passo manual, preflight e consultas que confirmem tabelas, permissões, buckets, idempotência e versão publicada. O pacote local não substitui os arquivos versionados.
- Conferência SQL: `docs/features/slide-maker/VERIFICAR_LOVABLE_CLOUD_2026-11-12.sql`. Credencial: `scripts/slide-maker/cadastrar-bridge.py`, executado por Gabriel, com opção explícita de recopia sem criar outra versão.

### Chaves e configurações

1. `ANTHROPIC_API_KEY` no Cloud Run vem do segredo Google `slide-maker-anthropic-api-key`. Já cadastrado por você: versão1 enabled. Origem: chave da conta de serviço Anthropic `rebrain-slide-maker`. Não precisa buscar a chave antiga do Lovable.
2. `SLIDE_MAKER_BRIDGE_SECRET` será o nome da nova credencial nos Secrets do Lovable; no Google, `slide-maker-bridge-secret`. O mesmo valor aleatório será gerado por nosso procedimento seguro e inserido nos dois lugares. Não existe em um painel antigo para recuperar. A implementação entregará o procedimento de transferência sem chat/log e sem persistência desnecessária.
3. `SLIDE_MAKER_BRIDGE_URL` será a URL efetivamente publicada da função. Conferir pelo Lovable e por chamada autenticada; não presumir disponibilidade por formar uma URL.
4. `VITE_SLIDE_MAKER_AGENT_URL` será a URL efetivamente publicada do Cloud Run. É pública e vai à configuração frontend conforme o padrão do Rebrain.
5. `SUPABASE_SERVICE_ROLE_KEY` permanece gerenciada internamente no Lovable. Não procurar, exportar ou cadastrar no Google. O segredo vazio `slide-maker-supabase-service-role-key` perde a função no novo desenho; só remover depois de confirmar ausência de referências, sem mexer nas credenciais de outras ferramentas.

### O que fica manual com você

Aplicar as migrations exatas após preflight; inserir a credencial no formulário seguro do Lovable; solicitar/publicar a função preparada e devolver os resultados das verificações. Para publicação do frontend, seguir o fluxo habitual do Lovable. Não enviar valores secretos ou tokens de trabalho no chat. O agente executará as etapas Google que estiverem autorizadas; os ativos ficam com Diego.

## CTA de implementação

Implemente integralmente o plano `docs/features/slide-maker/PLANO_LOVABLE_CLOUD_2026-11-12.md` no Rebrain. Leia AGENTS.md, confira remotos/identidade e prepare a conciliação da main preservando todas as alterações locais. Resolva a etapa Git conforme a regra de autorização do projeto, sem reset ou mistura de trabalho paralelo. Implemente a ponte autenticada Lovable Cloud, os adaptadores de dados/Storage/eventos, migrations complementares necessárias e testes. Atualize o roteiro de deploy e entregue o pacote manual para Gabriel com caminhos reais, nomes de chaves, geração/transferência segura e consultas de verificação. Aproveite o projeto Google e a chave Anthropic já preparados. Não extraia service role, não faça migrations diretamente no Lovable, não publique nem faça push sem a autorização aplicável e não execute chamadas pagas. Conclua todo o trabalho local autorizado e apresente os passos manuais concretos que bloqueiam a validação remota. Registre a execução no LIVE e no acompanhamento da raiz SE.
