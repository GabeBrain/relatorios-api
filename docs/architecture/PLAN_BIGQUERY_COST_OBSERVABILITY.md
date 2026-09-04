# Plano — Governança de custo e observabilidade BigQuery

**Estado:** pendência de plataforma Rebrain. Não implementado em runtime.

## Objetivo

Dar visibilidade de uso e custo aos relatórios que consultam BigQuery, sem expor SQL, dados de
usuários ou credenciais no navegador e sem criar uma consulta de metadados a cada abertura de tela.

## Fontes e responsabilidades

| Fonte | O que responde | Limite |
|---|---|---|
| Auditoria do produto no Supabase | solicitações, usuário interno, cache-hit compartilhado, duração, erro, bytes retornados pelo backend | não representa desconto/crédito real da conta de billing |
| `INFORMATION_SCHEMA.JOBS_BY_PROJECT` | jobs efetivos, labels, bytes processados/faturados, cache do BigQuery, slots e falhas | mínimo de 10 MB por leitura; dados por projeto, não saldo da conta |
| Exportação do Cloud Billing | valor cobrado, créditos, descontos e consumo por conta/projeto/SKU | latência de faturamento; exige dataset de billing autorizado |

## Contrato comum para novos relatórios

1. Todo job BigQuery enviado por backend recebe as labels `product`, `feature`, `version` e
   `environment`.
2. Toda execução de relatório grava, no banco de produto, status, cache-hit, duração, IDs de jobs,
   bytes processados e bytes faturados quando disponíveis.
3. Cada tipo de consulta define `maximumBytesBilled`; ultrapassar o teto gera erro de produto
   compreensível, nunca uma execução ilimitada.
4. O browser só consome uma API administrativa agregada. Não recebe SQL, e-mail, ID bruto de job,
   token ou acesso direto ao BigQuery/Supabase administrativo.

## Coleta e tela administrativa futura

- Edge/Cloud Run administrativo com acesso somente-leitura a `JOBS_BY_PROJECT`, executado por
  agendamento diário ou sob ação explícita de administrador; persistir agregados diários para a UI.
- Configurar exportação de Cloud Billing para BigQuery e usar essa fonte para o custo financeiro
  efetivo, créditos e consumo total da conta. `JOBS_BY_PROJECT` fica como telemetria operacional.
- Painel interno: consumo mensal por feature, bytes contra teto, cache-hit do produto, economia
  estimada, p95 de duração, falhas, top recortes e tendência diária.
- Guardrails: orçamento/alertas na conta de billing, quota diária por projeto e limites por query.

## Primeiro caso — RAIS Empregados

- O cache de produto já é compartilhado no Supabase por município + ano + versões.
- O proxy define `useQueryCache: false`; portanto `cache_hit` do produto é a métrica de economia
  relevante, e não o cache temporário do BigQuery.
- Histórico anual deve ter seu próprio limite de 3 GiB por geração e cache por município + versão.
- Não fazer pré-carga nacional enquanto a telemetria e a política de retenção não estiverem prontas.

## Critérios para iniciar

- [ ] Definir administrador/roles da tela de custos.
- [ ] Habilitar exportação de Cloud Billing em dataset autorizado.
- [ ] Criar agregação diária sem dados pessoais/SQL bruto.
- [ ] Definir orçamento, alertas e limites por feature.
- [ ] Validar uma feature adicional além de RAIS antes de tratar o painel como padrão da plataforma.
