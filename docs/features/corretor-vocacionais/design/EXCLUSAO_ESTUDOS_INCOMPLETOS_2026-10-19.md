# Exclusão de estudos incompletos — 19/10/2026

## Diagnóstico

Antes, a lixeira estava dentro do cabeçalho da revisão. O retorno antecipado para preparação de um estudo incompleto não renderizava esse cabeçalho; por isso não havia exclusão naquele estado. A carteira não oferecia lixeira. Limpar e começar outro removia apenas o rascunho do navegador, deixando o registro autenticado na carteira.

O DELETE físico anterior também tinha dois problemas: cadastros, materiais e snapshots possuem referências que podem bloquear a operação; outras referências usam cascade e podem apagar consumo/execuções. Não existe uma garantia de exclusão com todos esses vínculos pelo método antigo. Foi substituído por exclusão lógica, sem apagar os registros técnicos.

## Comportamento aplicado

- Lixeira nomeada na linha de cada estudo e no cabeçalho geral, inclusive preparação incompleta, sugestão e arquivos/histórico. Uma lixeira no estudo incompleto aberto, sem duplicar a do cabeçalho interno.
- Preparação autenticada com registro já salvo: lixeira remove da carteira, pede login e confirmação.
- Preparação apenas local, inclusive erro de arquivo: lixeira descarta o rascunho deste navegador; não faz exclusão no site. Limpar e começar outro mantém sua semântica anterior de trocar materiais sem apagar registros salvos.
- Cancelar login ou confirmação não altera o estudo. Sem justificativa obrigatória.
- Sucesso só após retorno booleano verdadeiro do banco; migration ausente ou operação recusada mantém o estudo visível e mostra erro explícito.
- Atualiza a carteira, volta ao menu após excluir dentro do estudo e limpa apenas a preparação local cujo hash corresponda ao arquivo excluído. Não limpa rascunho de outro estudo.
- Estudos removidos não aparecem nas carteiras nem no relatório direto do frontend atual. Reenvio idêntico cria um novo registro ativo; o antigo permanece preservado, sem ressuscitar silenciosamente decisões anteriores.

## Migration necessária — ainda não aplicada remotamente

Aplicar pelo SQL Editor antes do Publish:

`supabase/migrations/20261019182241_corretor_study_trash.sql`

Adiciona deleted_at/deleted_by; RPC pública invoker chama helper privado com identidade Geobrain validada, necessário para consultar execuções protegidas sem dar ao cliente acesso à tabela financeira. Apenas autenticados executam. Execuções prepared/running bloqueiam remoção; interrompidas/finalizadas não exigem relatório completo para excluir. Não altera as permissões de leitura dos estudos nem introduz exclusão por visitante.

Atualiza a deduplicação atômica para considerar somente registros ativos, mantendo a trava por hash e os contratos do upload. Não faz backfill destrutivo, DELETE ou remoção de arquivos do storage. Não libera espaço ocupado por originais; limpeza física será tarefa separada, caso necessária. Intervenção técnica pode recuperar registro, após conferir reenvios.

Até aplicar a migration, listas continuam compatíveis com o schema anterior, mas o botão de excluir informa a atualização pendente. **O push, sozinho, não habilita a exclusão nova no site. Nenhuma Edge Function nova.** Nenhum SQL remoto ou estudo real foi alterado nesta sessão.

## Evidências locais

- `corretor-study-trash-sql.mjs`: sete verificações em PostgreSQL local em memória, usando a migration real. Visitante/identidade não habilitada recusados; execução ativa bloqueada; exclusão com referência de material funciona; repetição idempotente; consumo, materiais, decisões e execuções preservados; mesmo arquivo pode ser reenviado sem reutilizar registro excluído.
- `DeleteStudyButton.test.tsx` e preparação: oito testes focados aprovados; cancelamento de login/confirmação não remove; falha do banco não tira da interface; fluxo de duas etapas sem planilhas continua sem iniciar no primeiro clique.
- `corretor-study-trash-browser.mjs`: quatro verificações com serviços simulados: lixeira em estudo incompleto na carteira e dentro do estudo, cancelamento, remoção confirmada, retorno e reload sem ressuscitar registro. Zero chamadas de IA e zero erros de página.
- Tipos/lint e build local. Suíte completa e contagem final no LIVE. Logs em `.local-inputs/study-trash-*`.

Limite: PostgreSQL e browser foram locais/simulados; permissões/schema efetivamente publicados ainda precisam da aplicação e conferência humana. Não declarar exclusão funcionando em produção antes disso. Primeiro teste real deve usar um estudo descartável, depois de aplicar o SQL.
