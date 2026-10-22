-- Backend mxinpvcqzbfbzjodhgtz, SQL Editor administrativo.
-- SOMENTE LEITURA. Não reinicia IA, não encerra execuções nem libera reservas.
-- Estudo atual edda49da / execução confirmada pelas 37 linhas de ia_passes.
select e.id as execution_id, e.state as execution_state,
       e.budget_usd as execution_budget_usd,
       e.spent_usd as execution_spent_usd,
       e.reserved_usd as execution_reserved_usd,
       b.batch_hash, b.function_name, b.state as batch_state, b.created_at,
       b.cost_usd,
       b.response->>'error' as error_message,
       b.response->>'errorCode' as error_code,
       b.response->>'finishReason' as finish_reason,
       b.response->'validationErrors' as invalid_fields,
       e.confirmed_context->'reviewProfile'->>'id' as expected_profile,
       e.confirmed_context->'reviewProfile'->>'serviceTier' as expected_tier,
       e.confirmed_context->'reviewProfile'->>'inputMax' as input_max,
       e.confirmed_context->'reviewProfile'->'maxOutput'->>b.function_name as output_max,
       -- Mantém os metadados técnicos, sem imagens, conteúdo extraído ou owner_hash.
       b.response - 'tables' - 'findings' - 'ata' - 'invalidOutput'
                  - 'locais_visiveis' - 'unidades' - 'anomalias_formato' as response_metadata
from public.corretor_executions e
join public.corretor_execution_batches b on b.execution_id=e.id
where e.id='5ef5c1a9-a3fd-48ba-9c51-cfbec6016778'::uuid
  and (b.state <> 'completed' or b.response ? 'error')
order by b.created_at;

-- Se uma linha vier unknown sem response, a chamada/retorno não foi confirmado;
-- isso não prova ausência de processamento. Preservar e reconciliar antes de retry.
