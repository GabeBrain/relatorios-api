-- SQL Editor administrativo do backend mxinpvcqzbfbzjodhgtz.
-- Somente leitura: não inicia avaliação, não altera lotes e não chama IA.
-- Não conceder acesso público às tabelas técnicas.
select e.study_id, e.id as execution_id, e.state as execution_state,
       b.function_name, b.state as batch_state, b.created_at,
       b.response->>'finishReason' as finish_reason,
       b.response->>'errorCode' as error_code,
       b.response->'validationErrors' as invalid_fields,
       b.response->>'error' as error_message,
       b.response->>'outputTokens' as output_tokens,
       b.response->>'reasoningTokens' as reasoning_tokens,
       coalesce(length(b.response->>'invalidOutput'),0) as invalid_output_characters,
       (coalesce(b.response->>'refusal','') <> '') as has_refusal,
       b.cost_usd, b.reserved_usd
from public.corretor_executions e
join public.corretor_execution_batches b on b.execution_id=e.id
where e.study_id in (
 '5b389531-9190-41b5-8acf-5b035fa0f4ce'::uuid,
 '32a2234c-89a9-4dfc-9eaf-be4fa63df6e9'::uuid
)
and b.response ? 'error'
order by b.created_at desc limit 5;

-- Se finish_reason=stop e error_code/invalid_fields ausentes, a resposta antiga
-- ainda usa a mensagem genérica. Para análise local do formato, exportar a
-- coluna response do lote específico para JSON privado (sem owner_hash).
-- Não reenviar o estudo para tentar reconstruir a resposta já contabilizada.
