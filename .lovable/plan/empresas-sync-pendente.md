# Sincronizar Empresas com a fonte — pendente

Preservação do plano anterior, sem execução nesta tarefa.

- Consultar competência e atualização da origem por endpoint barato de metadados na ponte `sistema-quanti-bigquery-proxy` (Cloud Run, fora deste repositório).
- Criar controle de competência, sonda diária e fila de municípios publicados desatualizados.
- Reprocessar em lotes com limite de concorrência e orçamento de leitura; servir o agregado anterior enquanto a atualização não termina.
- Exibir competência e atualização pendente em Empresas; manter atualização manual.
- Dependência: endpoint externo de metadados e definição de sua integração. Sem ele não há detecção automática barata.