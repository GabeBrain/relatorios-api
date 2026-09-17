# Sincronizar Empresas com a fonte

Objetivo: quando a fonte (CNPJ via BigQuery) publicar dados novos, os municípios já carregados passam a mostrar os números atualizados sem que ninguém precise clicar em "Atualizar dados deste município".

## Situação atual (verificada)

- A competência é um valor fixo escrito dentro da função de materialização (`2026-07-01`). Nada hoje consulta a fonte para saber se ela mudou.
- O manifesto de cada município guarda a competência usada, mas os campos de "data de modificação da origem" vieram vazios nas três cidades já carregadas.
- Cada materialização de cidade custa ~2,9 GB de leitura no BigQuery, então sincronizar tudo às cegas gastaria cota rapidamente.

Conclusão: dá para sincronizar, mas antes precisamos de uma forma **barata** de perguntar à fonte "qual é a competência mais recente?" — sem varrer a base.

## Como vai funcionar

1. **Sonda de competência (custo quase zero).** Uma consulta de metadados descobre a partição mais recente disponível na fonte e a data em que ela foi atualizada. Esse valor passa a ser gravado no projeto como "competência corrente da fonte", com a data da última verificação.
2. **Verificação automática diária.** Uma rotina agendada roda a sonda uma vez por dia. Se a competência da fonte for igual à última conhecida, nada acontece (nenhum custo).
3. **Quando a fonte muda.** Os municípios já publicados entram numa fila de reprocessamento e são materializados aos poucos (limite por execução, para respeitar a cota de 1 TiB/mês). Enquanto o novo dado não chega, a cidade continua mostrando o dado antigo — com um aviso de que há uma competência mais nova sendo carregada.
4. **Na tela.** O cabeçalho de Empresas passa a mostrar a competência exibida e, quando aplicável, "atualização disponível / em processamento". O botão manual continua existindo para forçar a atualização de uma cidade específica na frente da fila.

## Detalhes técnicos

- A competência deixa de ser constante no código: passa a vir de uma tabela de controle (`empresas_fonte_estado`: competência corrente, data de modificação da origem, verificado_em) alimentada pela sonda.
- Nova função `empresas-source-check`: chama a ponte pedindo apenas metadados da tabela de origem; compara com a tabela de controle; se houver mudança, marca os municípios publicados como desatualizados.
- Nova função `empresas-sync-worker` (agendada, com trava de concorrência): pega N municípios desatualizados por execução e chama a materialização já existente, reaproveitando manifesto, `mergeAggregatedRows` e publicação por município. N configurável, começando baixo.
- Agendamento via cron do banco (pg_cron/pg_net) chamando as duas funções — sonda diária, worker em intervalos curtos enquanto houver fila.
- `empresas-report` passa a devolver, junto do relatório, a competência exibida e um sinalizador de "atualização pendente" para o cabeçalho.
- A leitura por cidade continua vindo do agregado salvo: nenhuma consulta ao BigQuery no caminho do usuário.

## Dependência externa

A sonda de metadados precisa de um endpoint na ponte `sistema-quanti-bigquery-proxy` (Cloud Run), que fica fora deste repositório. Duas saídas:

- **A:** eu escrevo o SQL/spec do endpoint de metadados para você aplicar lá, e implemento tudo aqui já apontando para ele.
- **B:** implemento tudo aqui e, até o endpoint existir, a verificação usa a competência que a própria materialização reporta (só detecta mudança quando uma cidade é atualizada manualmente) — funciona, mas sem detecção automática.

Sem a sonda, o passo 2 não tem como ser barato. Recomendo o caminho A.
