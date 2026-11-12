# Plano técnico — Assistente de Projetos: entrada direta e acesso único

19/10/2026 · Gabriel / Codex · **Preparado para autorização de execução integral. Produto não alterado nesta preparação.**

## 1. Decisão e resultado esperado

Fonte: [revisão histórica e proposta](REVISAO_USABILIDADE_E_PROPOSTA_RETORNO_2026-10-19.md), feedback Diego/Gabriel e orientação posterior de Gabriel.

- Recuperar a composição de duas opções da referência `a901df2`, preservando os motores e o fluxo contínuo atuais.
- Opções: **Revisar estudo** e **Sugestão de análise**. Para a segunda, usar **somente esse título**, sem subtítulo explicativo nem a frase adicional sobre o papel do analista. Padronizar o nome na entrada, preparo, aba e cabeçalho do resultado. Mensagens necessárias de cobertura, custo, andamento e erro continuam disponíveis.
- Única autenticação no bloco já existente do menu da plataforma, com a conta **Geobrain**, habilitando API e identidade dos estudos em qualquer rota. Retirar formulário/modal/botão de login próprio do Corretor.
- Meus estudos inclui tudo iniciado pela conta, mesmo sem cadastro ou análise completos. Biblioteca Todos os estudos permanece acessível como antes.
- Excel antes da análise, cadastro opcional, preparação em uma página e uma confirmação para iniciar o lote completo. Manter evidência única, mapa visível e decisões humanas.
- Executar T0–T7 na ordem, em uma única autorização de implementação. Push, deploy e IA paga continuam separados da execução local.

### Invariantes

Não trocar modelo, prompt, critérios Brain, preços, regras de detecção ou gabaritos para atender a esta mudança visual. Não restaurar um arquivo antigo completo sobre a versão atual. Preservar estudos/versões/IDs, autoria, fontes, materiais, resultados, decisões e contabilidade. A quantidade de alertas não é critério de sucesso da interface.

Sem nova autenticação por IP, email declarado no cliente ou token opaco interpretado como identidade. Nenhuma senha será guardada em estado persistente, logs ou documentos. Sem novo provedor de login, lista de emails ou secret.

## 2. Baseline e sincronização

Conferência de 19/10: remoto único `origin`, main local `bb0f22a`, origin/main `d3463d7`, **30 atrás/zero à frente**. Diferença: relatórios institucionais SP, documentação, rota SP e tipos gerados; nenhum Corretor novo no intervalo. A implementação deve refazer fetch/contadores: esses números não são autorização para ignorar mudanças posteriores.

Alterações locais a preservar: duas documentações FIERGS, entrada FIERGS em LIVE_rebrain, ZIP de referência e documentos desta revisão. Fontes brutas/capturas/saídas de ensaio ficam em `.local-inputs/`; código, plano, contratos e evidências pequenas são versionados.

### T0 — preparar uma base reproduzível

1. Ler AGENTS raiz/projeto, planejamento vigente e proposta semanal, LIVE Corretor/Rebrain e fundação SE.
2. Inventariar todos os remotos, fazer fetch, comparar main com cada remoto e registrar arquivos locais/hashes. Não imprimir segredos ou conteúdo de sessões.
3. Após autorização expressa de sincronização incluída no CTA: guardar alterações locais identificadas, atualizar por `--ff-only`, restaurar e conferir conteúdos. Não usar rebase/reset de histórico nem incluir outras frentes no commit.
4. Se houver divergência real ou sobreposição substantiva nova, seguir AGENTS e apresentar o conflito. Não resolver código alheio por inferência. Entradas LIVE somativas mantêm todas as adições.
5. Registrar referência visual de setembro e snapshot local atual. Congelar os casos/decisões disponíveis para comparação sem escrita remota.
6. Conferir dependências já publicadas por leitura segura quando houver acesso: `corretor-access`, ledger de execução e migration consultiva. Distinguir confirmação do Lovable, schema observado e teste real. Não reaplicar migrations antigas por suposição.

**Saída:** base integrada identificada, arquivos alheios preservados, manifesto de ensaio com commits/casos/limites. Se faltar acesso remoto administrativo, prosseguir com implementação e ensaios simulados, registrando ativação real como pendente.

## 3. Arquitetura do acesso único

### Diagnóstico a corrigir

`AuthBlock.tsx` usa `loginCorretor` apenas quando pathname começa com `/corretor`; fora daí realiza somente login da API. `GeobrainAccessProvider` cria outro formulário para operações que exigem `requireProjectIdentity`. O provider atual fica dentro de AppLayout/Routes; o formulário do menu está no shell, fora desse contexto. Token da API e sessão de estudo podem divergir. O bloco Autenticado também pode ser exibido apenas porque existe token armazenado, mesmo expirado.

### T1 — serviço e estado compartilhados

**Arquivos principais:** `src/components/layout/AuthBlock.tsx`, `src/components/layout/AppLayout.tsx`, `src/store/auth-store.ts`, `src/App.tsx`, `src/features/corretor/lib/project-access.ts`, `components/GeobrainAccessProvider.tsx`, `lib/geobrain-access-context.ts`.

1. Criar núcleo compartilhado em `src/features/shared/geobrain-session/`, reutilizando o contrato server-side existente. Responsabilidades: entrar, restaurar, reconhecer identidade dos estudos, renovar, sair, pedir foco no formulário do menu e cancelar intenção. Evitar chamadas duplicadas e ciclos de renovação.
2. Colocar o provider dentro de BrowserRouter e acima de AppLayout. Assim menu e páginas usam a mesma instância. Manter adapter de `useGeobrainAccess` para os chamadores atuais; ele consulta acesso e encaminha ao menu, sem modal próprio.
3. Login/renovação pelo menu em qualquer rota deve confirmar o token API e a sessão de estudos. Verificar identidade e habilitação vigente pelos mecanismos atuais (`getUser` e claims validadas pelo servidor); não promover o email do auth-store a autorização.
4. Reconhecer sessão existente válida na restauração. Token antigo sem identidade correspondente não permite inventar autoria; orientar renovação no próprio menu quando necessário, sem segundo formulário.
5. Estado interno explícito: restaurando, sem acesso, acesso completo, somente API, expirado, falha. A interface do usuário continua sendo um único bloco; não expor duas telas ou pedir dois logins.
6. Anunciar acesso completo somente após confirmação de ambos. Em indisponibilidade da ponte, preservar acesso API quando possível e informar o problema no menu. Credencial recusada não dispara fallback que contorne a recusa. Não exibir carteira pessoal vazia como se uma falha fosse ausência de estudos.
7. Ao concluir login: invalidar consultas pessoais, perfis, materiais e permissões; atualizar o menu e a carteira. Controlar respostas atrasadas para que uma tentativa de conta A não substitua login mais recente da conta B.
8. Expiração/saída/reemissão devem coordenar os acessos. Não exibir Autenticado com token expirado. A saída limpa identidade/consultas privadas e cancela intenções, mas conserva estudos e arquivos locais. Falha ao encerrar a sessão de estudos não pode manter operações pessoais ativas no cliente por um estado antigo.
9. Não modificar o cliente Supabase gerado ou seu armazenamento de preview para criar um atalho de identidade. Preservar o comportamento das APIs dos demais módulos.

**Aceite:** autenticar no menu em `/inicio` e entrar depois no Corretor habilita Meus estudos e operações permitidas; o mesmo ocorre iniciando no Corretor. Sessão válida não pede repetição; expirada não aparece como completa; nenhum formulário novo é renderizado no Corretor.

### T2 — ações que precisam da conta, pelo mesmo formulário

1. `ensureAccess(action)` deve continuar retornando uma promessa booleana, com uma intenção ativa por vez, sem iniciar ação antes de autorização efetiva.
2. Expandir/focar o bloco existente no menu, inclusive na lateral recolhida/mobile. Usar os campos de login atuais. Motivo da autenticação pode ser comunicado brevemente no próprio menu.
3. Login válido resolve a intenção uma única vez; cancelamento, rota alterada, saída ou troca de conta resolvem falso. Cancelar não salva cadastro, marca decisão, inicia IA nem muda a posição de revisão.
4. Exibir cancelamento contextual no próprio bloco quando houver intenção pendente; não criar modal de credenciais. Recuperar foco na ação original quando viável.
5. Não persistir callback, senha ou intenção executável em localStorage. Reentrada após reload restaura a página/rascunho, sem repetir silenciosamente a ação anterior.
6. Preservar checagem no servidor; alteração do ponto de entrada não amplia permissões de leitura/escrita.

**Aceite:** operação exige conta → menu é aberto/focado → cancelar conserva estado; autenticar autoriza somente a operação original, uma vez. Nenhuma ação da conta anterior continua após troca de identidade.

## 4. Entrada, carteira e nomenclatura

### T3 — composição direta

**Arquivos:** `CorretorProjectsPage.tsx`, `StudyPreparationPage.tsx`, `StudyRecommendation.tsx`, `styles/projects.css`, `study-navigation.ts`; extrair componentes de entrada/carteira se necessário.

1. Cabeçalho **Assistente de Projetos**. Duas superfícies grandes imediatamente visíveis: Revisar estudo e Sugestão de análise. Segunda opção sem texto adicional explicativo, conforme decisão de Gabriel.
2. Manter ícones e hierarquia SE, sem novo token/lib visual. Reutilizar Button/Input/Select/Progress; tokens copiados da fundação permanecem byte a byte iguais. Evitar faixa decorativa amarela ou terceira ação principal disputando com as duas opções.
3. Clicar em uma opção abre o preparo com finalidade explícita. Guardar finalidade no contexto da preparação; trocar opção preserva arquivos/campos compatíveis e não inicia IA. Estudo com geração em andamento bloqueia troca de arquivo/finalidade até pausa/retorno seguro.
4. Lista abaixo: nome, cidade quando disponível, situação e data; pendências só quando há análise correspondente. Busca, filtro, paginação e contexto de retorno preservados.
5. Todos os estudos permanece público conforme regra existente. Meus estudos aparece com identidade confirmada, incluindo preparações/cadastros/análises incompletos. Filtro pessoal não pode transformar erro de identidade em lista vazia nem reatribuir autoria.
6. Compartilhamentos e análises anteriores continuam acessíveis como capacidades secundárias. Ocultar repetição Sem cadastro prévio/Completar cadastro na lista; dados comerciais permanecem opcionais em Dados do estudo, sem apagar o cadastro existente.
7. Retirar chamadas principais Gerar recomendação/Recomendação consultiva da composição nova. Usar Sugestão de análise no lugar correspondente; comandos operacionais continuam verbos claros, como Preparar sugestões, Retomar e Copiar texto.
8. Preservar texto consultivo já salvo e prompt/modelo/preço atuais. Esta entrega não altera os títulos internos do conteúdo gerado nem regenera resultados para mudar aparência.

**Aceite:** ambas as finalidades são identificáveis na primeira tela e acessíveis com um clique; não existe Entrar com Geobrain na carteira; lista e filtros continuam utilizáveis em desktop/mobile, com foco/contraste adequados.

## 5. Preparação e avaliação contínuas

### T4 — um preparo, uma confirmação, um processamento

**Arquivos:** `StudyPreparationPage.tsx`, `CorretorV3Page.tsx`, `lib/account-preparation.ts`, `lib/v3/{local-materials,pptx-store,execution,pipeline}.ts`, `lib/recommendations.ts`.

1. Usar a mesma preparação para novo envio e retomada, distinguindo `new` de `resume` por estudo/versão/hash. Retomada não cria outro estudo ou nova versão apenas por recarregar a página.
2. Sequência em uma página: PPTX → Excel opcional → cidade/UF pertinentes à revisão → previsão/limite → iniciar. Não cobrar ou abrir tela de ata ao selecionar arquivo. PDF continua prévia complementar, sem prometer ingestão como apresentação principal.
3. Preservar verde/check/nomes/quantidade após preparação válida; remoção/erro/cancelamento refletem o estado real. Não dizer que arquivo está remoto quando só está no navegador.
4. Revisão com planilhas: aguardar preparo/persistência local e extração de fonte antes do início. Sem planilhas: decisão explícita de continuar com a limitação numérica, na mesma página. Cadastro comercial não bloqueia o fluxo.
5. Conta autenticada registra a preparação incompleta como hoje; visitante conserva rascunho sem autoria inventada. Duplicata global abre/reutiliza o estudo existente, preservando decisões e materiais. Conferir troca de conta entre seleção e início.
6. Após uma confirmação de custo: chamar o controlador atual e percorrer estrutura/ata, texto/imagens, cruzamentos e gravação sem novos portões obrigatórios de interface. Mostrar progresso e erro reais. Não exibir painéis legados de pré-processamento como tarefas separadas para o analista.
7. Na retomada, recuperar contexto/arquivo/fonte da versão e reutilizar lotes conhecidos. Respeitar confirmação de custo e reservas pendentes; nunca liberar reserva desconhecida ou reiniciar pagamento automaticamente.
8. Consumo do rascunho após vínculo durável conserva planilhas por hash. Voltar e escolher novo estudo deve começar vazio após a conclusão, mantendo materiais do estudo acessíveis.
9. Sugestão de análise reutiliza os mesmos materiais disponíveis, com cobertura/custo próprios. Excel/PDF/imagens não passam a ser declarados como interpretados pelo recomendador textual. Resultado consultivo não conclui revisão nem altera decisões.
10. Situações para o usuário: preparado/aguardando análise, em processamento, interrompido, resultado disponível, revisão registrada. Ausência de relatório completo não exibe zero erros, não libera conclusão e não se apresenta como estudo aprovado.

**Aceite:** upload completo → uma confirmação → resultado; falha/pausa → estado incompleto recuperável, sem perder dados ou repetir lote conhecido. O caminho novo e a retomada de estudos antigos obedecem à mesma preparação, sem devolver usuário à tela legada.

## 6. Abertura e revisão dos estudos

### T5 — trabalho direto e navegação compatível

**Arquivos:** `StudyLayout.tsx`, `StudySummary.tsx`, `CorretorProjectsPage.tsx`, `CorretorV3Page.tsx`, `StudyMaterials.tsx`, `ReviewBench.tsx`, `StudyQuickReview.tsx`, `study-navigation.ts`, `App.tsx`.

1. Criar resolução de destino explícita, baseada em registro existente da versão: revisão com relatório → revisão; somente resultado consultivo → sugestão; execução/preparação incompleta → retomada correspondente. Não inferir finalidade por custo, quantidade de alertas ou nome do arquivo.
2. Para a lista, obter metadados mínimos das sugestões da página visível em lote, sem baixar todos os textos nem fazer uma chamada por estudo. Ausência da tabela consultiva não deve impedir consulta das revisões existentes; registrar indisponibilidade corretamente.
3. Inserir resumo curto de apontamentos/cobertura na própria revisão. Remover a obrigação de abrir Resumo antes da tarefa principal. Não duplicar cabeçalho de estudo, custo, botões de voltar ou preview.
4. Navegação principal: **Revisão**, **Sugestão de análise**, **Arquivos e histórico**. Materiais, versões e cadastro continuam acessíveis nessa área secundária; não esconder mapa, evidência ou ações de revisão em accordions.
5. Preservar rotas `/resumo`, `/revisao`, `/recomendacao`, `/materiais`, `/historico`, projetos antigos e query `study`, com destino equivalente ou adapter. Pode manter nomes técnicos existentes na URL e renderizar a composição nova; não é necessário migrar IDs/URLs para trocar rótulos.
6. Preservar `version`, `carteira`, busca, filtro, página e escopo pessoal nos links. Retorno é sempre local/sanitizado, sem recursão de query ou redirecionamento externo. Back/forward/reload e estudo A→B não reabrem seleção antiga por efeito local.
7. Versão antiga sem snapshot de revisão não recebe os achados atuais como se fossem daquele momento. Exibir histórico disponível com limite explícito; não inventar auditoria retrospectiva.
8. Manter imagem única grande, texto/decisões abaixo, mapa preenchido por estado/confiança, português e triagem ampla. Ausência de prévia não exclui achado; imagens disponíveis continuam acessíveis. Decisões aguardam salvamento e cancelamento de login não avança item.
9. Cadastro fica opcional. Conclusão continua humana e protegida por estado/cobertura; sugestão salva, alerta ignorado ou baixa contagem não viram prova de correção do arquivo.

**Aceite:** abrir estudo chega ao trabalho pertinente sem resumo intermediário; cinco entradas/URLs antigas não expõem telas legadas nem perdem contexto. Arquivos/histórico continuam recuperáveis e decisões são as mesmas antes/depois.

## 7. Validação integral

### T6 — contratos, materiais e navegador

Executar sem chamadas reais de IA. Provedores e escritas de ensaio são interceptados; nunca alterar estudos reais para fabricar comparação.

**Identidade e shell**

- Login em `/inicio`, relatório e Corretor, seguido de navegação entre módulos: API e Meus estudos reconhecidos, sem segundo formulário.
- Sessão já válida; API antiga sem sessão; ponte indisponível; credencial recusada; expiração; relógio próximo ao vencimento; sair; reemitir; trocar conta; resposta de login atrasada.
- Ação pendente → autenticar/cancelar/mudar rota/trocar conta; uma execução no máximo, sem salvar ou avançar ao cancelar. Menu recolhido/mobile e foco por teclado.
- Asserção de ausência de novo formulário/dialog de credenciais nas páginas Corretor; preservação das chamadas API dos demais módulos.

**Preparação/carteira/navegação**

- Duas opções na entrada; segunda com título exato Sugestão de análise e sem frase adicional. Nenhum provedor ao selecionar/trocar objetivo.
- PPTX/Excel nos dois sentidos de seleção; seletor cancelado; arquivo inválido; remover última planilha; swap de apresentação; reload; consumo correto do rascunho; novo estudo vazio após concluir.
- Conta vê preparação abandonada/cadastro parcial/interrupção; visitante e registros legados sem autor inventado; duplicata preserva estudo/decisões.
- Estudo com revisão, somente sugestão, ambos, incompleto e original ausente. Resumo embutido, três áreas, materiais e histórico, retorno/back/forward/reload e links antigos com versão/filtro.
- Quatro larguras: 1440/1024/390/320, temas claro/escuro, teclado, contraste, área útil e ausência de corte; imagem única, mapa visível e triagem ampla.

**Motores/dados/custo**

- Repetir os dez passes de baseline/Excel dos cinco estudos: Rolândia, Toledo, Campos do Jordão, São José dos Campos VAP e v2. Não alterar gabaritos para obter aprovação.
- Proteger anos verdadeiros/falsos positivos, tabela × conclusão, duplicatas distintas e reconferência de alertas fora do escopo. Preservar decisões humanas e IDs nos snapshots simulados.
- Confirmar custo antes de todos os passos pagos, replay sem cobrança, orçamento recusado antes do provedor e retorno desconhecido bloqueado. Uma sugestão completa não conclui revisão.
- Conferir equivalência das contagens/fontes/status/custo antes/depois da mudança visual sobre o mesmo corpus. Diferença precisa de explicação; menos alertas não aprova o teste.

**Ferramentas e evidências**

- Vitest nos componentes/serviços tocados e suíte Corretor; testes do AuthBlock/shell por alcance global.
- TypeScript real: `npx tsc -p tsconfig.app.json --noEmit`; lint dos tocados; `npm run build`; `npm run check:live-docs -- <base> <head>` no fechamento.
- Reutilizar `npm run test:corretor:materials` e diagnósticos de carteira/preparação/custo do repo; adaptar seletores para o novo contrato sem enfraquecer suas asserções. Navegador local com APIs interceptadas, material real CJ/PDF/Excel e replays existentes.
- Guardar resultado, origem dos materiais, hashes, capturas e limitações em `.local-inputs/`; produzir manifesto pequeno e relatório versionados. Os 320 testes/10 passes da entrega anterior são baseline histórica, não resultado presumido desta execução.
- Tipagem Deno/contratos locais se função for alterada. Sem mudança de servidor, não criar migration/deploy de Edge para uma alteração só de composição.

**Aceite:** T1–T5 demonstrados; regressões aprovadas ou limite explícito por acesso/ambiente, sem declarar resolvido o que não foi observado. Produção/conta humana são aceites separados da simulação local. O caso integral de omissões da Ana depende do pareamento do material e gabarito humano, não da aprovação desta interface.

## 8. Entrega e publicação

### T7 — entrega para revisão

1. Criar `RESULTADO_RETORNO_USABILIDADE_ASSISTENTE_2026-10-19.md` e manifesto: antes/depois de acesso, entrada, preparo, revisão, dados, ensaios, decisões de apresentação e limites reais.
2. Atualizar LIVE Corretor/Rebrain, FRONTEND_DECISIONS, mapa SE, plano semanal e acompanhamento pessoal. Distinguir preparado, validado localmente, publicado no Git e verificado em produção.
3. Revisão React dos múltiplos componentes tocados: efeitos/limpeza, corridas de identidade, dependências, duplicação de chamadas, lazy loading, foco, nomes acessíveis e erros. Sem biblioteca/token novo para esta composição.
4. Commit(s) isolados em main com caminhos explícitos, sem alterações de outras frentes. Verificar diferenças restantes e contadores de cada remoto. Não fazer push nesta execução.
5. Apresentar resultado e caminho do material para teste humano. Informar exatamente quais migrations/funções/publicação serão necessárias. A expectativa é frontend; reaproveitar a ponte existente, sem migration nova prevista. Se o contrato backend precisar mudar, documentar a necessidade e seu ensaio antes de pedir deploy.
6. Após autorização de push, enviar, conferir remoto e depois coordenar publicação. Confirmar dependências pendentes de 16/10 sem reaplicar migrations já existentes. Git não comprova deploy.
7. Reteste real sem pagamento: login único, carteira pessoal, estados/rotas e materiais. Quando credencial/admin não estiver disponível, entregar roteiro de conferência e marcar pendente. Não reutilizar credenciais de outra pessoa nem reivindicar aceite de Diego por um teste simulado.

### Recuperação em caso de falha

Antes de publicar, corrigir no lote local. Depois de publicar, usar correção pontual/commit de apresentação anterior compatível com os contratos atuais, sem rollback do schema ou restauração do motor de setembro. Preservar dados/decisões/lotes e reservas desconhecidas. Uma indisponibilidade de autenticação não deve provocar repetição de processamento nem reatribuição de estudos.

## 9. Limites de autonomia desta execução

O CTA abaixo autoriza sincronizar preservando alterações locais, implementar T0–T7, corrigir defeitos do recorte, executar ensaios gratuitos/simulados e documentar/commitar. Não autoriza push, deploy, migração remota, IA paga, envio de mensagem/email/Monday ou ampliação de motor/modelo. Dependências de acesso/produção ficam explícitas enquanto o trabalho independente prossegue.

Não é preciso pedir aprovação entre T1–T6 para decisões rotineiras já definidas. Solicitar intervenção quando uma regra do AGENTS exigir resolução humana de conflito ou quando uma dependência real impedir um critério; entregar todo o restante disponível. Nenhum aceite será inventado para declarar plano integral publicado.

## 10. CTA — execução completa em um pedido

> Execute T0–T7 do `PLAN_RETORNO_USABILIDADE_ASSISTENTE_2026-10-19.md`, do início ao fechamento, sem parar entre etapas para decisões já definidas. Autorizo preservar as alterações locais e sincronizar a main com origin conforme as regras do projeto. Recupere as duas entradas diretas, use apenas “Sugestão de análise”, unifique o acesso no menu Geobrain e mantenha Meus estudos, Excel antes da análise e o fluxo contínuo. Preserve motores, prompts, custos, materiais, versões e decisões humanas; valide os percursos e os dez passes de regressão com os materiais disponíveis. Não faça IA paga ou alterações remotas sem autorização específica. Atualize a documentação e o acompanhamento semanal e apresente o resultado completo antes do push.

## Estado de execução

19/10: T0–T5 implementados e T6 validado localmente; T7 documentado para revisão antes do push. Ver RESULTADO_RETORNO_USABILIDADE_ASSISTENTE_2026-10-19.md para evidências, limites e publicação. Sem IA paga, banco remoto ou deploy. Autenticação real e produção permanecem pendentes da publicação autorizada.

### Atualização do fechamento e decisão posterior

Lote T0–T7 enviado em `5dbdd85`/`02af50d`. Ajustes posteriores autorizados: `034e3f4` (aviso/foco do login) e `96f19f0` (preparação diretamente na entrada, estudos agrupados abaixo). Esta última decisão substitui a apresentação de dois cards de T3; não desfaz objetivos, Excel, fluxo contínuo ou preservação dos motores. Consulte o resultado consolidado para os motivos e a validação específica de cada lote. Publish e aceite em produção pendentes; nenhum novo processamento pago ou backend remoto executado.
