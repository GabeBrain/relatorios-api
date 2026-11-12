-- Consulta técnica somente leitura. Executar no SQL Editor por operador autorizado.
-- Depende de 20261019203600_corretor_recommendation_model_profiles.sql.
-- Não chama IA, não reprocessa documentos, não altera permissões ou dados.
-- Gerações: período de criação; chamadas: período de contabilização.
select public.corretor_recommendation_usage(now()-interval '30 days',now());

-- Cada geração, com todos os lotes/compilação somados: custo já inclui raciocínio.
select study_id,version_n,execution_id,model,profile_id,reasoning_effort,usage_origin,
       prompt_version,price_version,state,spent_usd,reserved_usd,
       input_tokens,cached_tokens,output_tokens,reasoning_tokens,
       reasoning_reported_calls,provider_calls,coverage,created_at,completed_at
from public.corretor_recommendations
where created_at>=now()-interval '30 days'
order by created_at desc;

-- Modelo efetivo por chamada. O alias solicitado não é o snapshot retornado.
select study_id,execution_id,batch_hash,requested_model,model,profile_id,
       reasoning_effort,pricing_snapshot,service_tier,usage_origin,
       input_tokens,cached_tokens,output_tokens,reasoning_tokens,custo_usd,
       latency_ms,finish_reason,provider_request_id,created_at
from public.ia_passes
where tipo='recomendacao' and created_at>=now()-interval '30 days'
order by created_at desc;

-- Retornos desconhecidos ficam separados do gasto confirmado; não reenviar.
-- Não expõe textos/contextos privados nesta consulta.
select e.id execution_id,e.study_id,e.version_n,e.state,e.spent_usd,e.reserved_usd,
       e.confirmed_context->>'model' requested_model,
       e.confirmed_context->'profile'->>'id' profile_id,
       b.batch_hash,b.state batch_state,b.reserved_usd batch_reserved_usd,
       b.response->>'model' reported_model,
       b.response->>'serviceTier' reported_service_tier,
       b.response->>'inputTokens' reported_input_tokens,
       b.response->>'outputTokens' reported_output_tokens
from public.corretor_executions e
join public.corretor_execution_batches b on b.execution_id=e.id
where e.purpose='recommendation' and b.state='unknown'
order by e.created_at desc;
