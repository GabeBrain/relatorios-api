-- Aditiva. Não reprecifica histórico nem altera permissões de leitura existentes.
begin;

alter table public.corretor_recommendations
 add column profile_id text,
 add column config_version text,
 add column reasoning_effort text,
 add column endpoint text,
 add column service_tier text,
 add column pricing_snapshot jsonb,
 add column usage_origin text,
 add column reasoning_tokens bigint check(reasoning_tokens>=0),
 add column reasoning_reported_calls integer not null default 0 check(reasoning_reported_calls>=0);

alter table public.ia_passes
 add column profile_id text,
 add column config_version text,
 add column reasoning_effort text,
 add column reasoning_tokens integer check(reasoning_tokens>=0 and reasoning_tokens<=output_tokens),
 add column finish_reason text,
 add column requested_service_tier text,
 add column service_tier text,
 add column pricing_snapshot jsonb,
 add column usage_origin text;

-- Só identifica o perfil quando a combinação histórica o demonstra.
-- Não infere origem, esforço ou detalhamento de raciocínio inexistente.
update public.corretor_recommendations set profile_id='mini-legacy-2026-10-16',config_version='recommendation-v1'
 where model='gpt-4o-mini' and prompt_version='brain-2026-09-15-v1' and price_version='openai-2026-10-16';
update public.ia_passes set profile_id='mini-legacy-2026-10-16',config_version='recommendation-v1'
 where tipo='recomendacao' and requested_model='gpt-4o-mini'
 and prompt_version='brain-2026-09-15-v1' and price_version='openai-2026-10-16';

create index corretor_recommendations_profile_date on public.corretor_recommendations(profile_id,created_at desc);
create index ia_passes_recommendation_profile_date on public.ia_passes(profile_id,created_at desc) where tipo='recomendacao';

create or replace function public.corretor_finish_batch(p_execution uuid,p_hash text,p_response jsonb,p_cost numeric)
returns void language plpgsql security definer set search_path='' as $$
declare b public.corretor_execution_batches; e public.corretor_executions;
 consult boolean; profiled boolean; final_text text; profile jsonb; rates jsonb; expected_cost numeric;
begin
 select * into e from public.corretor_executions where id=p_execution for update;
 if not found then raise exception 'Execução não encontrada'; end if;
 select * into b from public.corretor_execution_batches where execution_id=p_execution and batch_hash=p_hash for update;
 if not found or b.state<>'running' then raise exception 'Lote não está em execução'; end if;
 if p_cost is null or p_cost<0 or p_cost>b.reserved_usd then raise exception 'Custo fora da reserva: exige reconciliação'; end if;
 consult:=b.function_name='analyze-consulting-suggestion';
 profiled:=consult and e.confirmed_context ? 'profile';
 if consult and (e.purpose<>'recommendation' or p_response->>'inputTokens' is null or p_response->>'outputTokens' is null
   or (p_response->>'inputTokens')::integer<0 or (p_response->>'outputTokens')::integer<0
   or coalesce((p_response->>'cachedTokens')::integer,0) not between 0 and (p_response->>'inputTokens')::integer
   or (p_response->>'reasoningTokens')::integer<0 or (p_response->>'reasoningTokens')::integer>(p_response->>'outputTokens')::integer)
 then raise exception 'Uso consultivo inválido'; end if;
 if profiled then
  profile:=e.confirmed_context->'profile'; rates:=profile->'prices';
  if p_response->>'profileId' is distinct from profile->>'id'
    or p_response->>'configVersion' is distinct from profile->>'configVersion'
    or p_response->>'requestedModel' is distinct from profile->>'model'
    or p_response->>'promptVersion' is distinct from profile->>'promptVersion'
    or p_response->>'priceVersion' is distinct from profile->>'priceVersion'
    or p_response->>'reasoningEffort' is distinct from profile->>'reasoningEffort'
    or p_response->>'requestedServiceTier' is distinct from profile->>'serviceTier'
    or p_response->>'serviceTier' is distinct from profile->>'serviceTier'
  then raise exception 'Configuração divergente: exige reconciliação'; end if;
  expected_cost:=(((p_response->>'inputTokens')::numeric-coalesce((p_response->>'cachedTokens')::numeric,0))*(rates->>'input')::numeric
    +coalesce((p_response->>'cachedTokens')::numeric,0)*(rates->>'cached')::numeric
    +(p_response->>'outputTokens')::numeric*(rates->>'output')::numeric)/1000000;
  -- Arredondamento JSON/IEEE, não licença para usar preço diferente.
  if expected_cost is null or abs(expected_cost-p_cost)>0.000000000001 then raise exception 'Preço divergente: exige reconciliação'; end if;
 end if;

 update public.corretor_execution_batches set state='completed',response=p_response,cost_usd=p_cost where execution_id=p_execution and batch_hash=p_hash;
 update public.corretor_executions set spent_usd=spent_usd+p_cost,reserved_usd=reserved_usd-b.reserved_usd,updated_at=now() where id=p_execution;
 update public.studies_v3 set custo_total=custo_total+p_cost where id=e.study_id;
 if p_cost>0 or consult then
  insert into public.ia_passes(study_id,tipo,escopo,custo_usd,input_tokens,output_tokens,execution_id,batch_hash,
   requested_model,model,prompt_version,price_version,cached_tokens,latency_ms,provider_request_id,
   profile_id,config_version,reasoning_effort,reasoning_tokens,finish_reason,requested_service_tier,service_tier,pricing_snapshot,usage_origin)
  values(e.study_id,case b.function_name when 'analyze-text-batch' then 'texto' when 'analyze-ata-image' then 'visao_ata' when 'analyze-consulting-suggestion' then 'recomendacao' else 'visao_tabela' end,
   'Execução registrada · lote confirmado',p_cost,(p_response->>'inputTokens')::integer,(p_response->>'outputTokens')::integer,e.id,p_hash,
   p_response->>'requestedModel',p_response->>'model',p_response->>'promptVersion',p_response->>'priceVersion',coalesce((p_response->>'cachedTokens')::integer,0),(p_response->>'latencyMs')::integer,p_response->>'requestId',
   case when profiled then profile->>'id' end,case when profiled then profile->>'configVersion' end,
   case when profiled then profile->>'reasoningEffort' end,(p_response->>'reasoningTokens')::integer,p_response->>'finishReason',
   p_response->>'requestedServiceTier',p_response->>'serviceTier',
   case when profiled then jsonb_build_object('currency','USD','per_tokens',1000000,'price_version',profile->>'priceVersion')||rates end,
   case when profiled then e.confirmed_context->>'usageOrigin' end);
 end if;
 if consult then
  update public.corretor_recommendations set input_tokens=input_tokens+(p_response->>'inputTokens')::integer,
   cached_tokens=cached_tokens+coalesce((p_response->>'cachedTokens')::integer,0),output_tokens=output_tokens+(p_response->>'outputTokens')::integer,
   reasoning_tokens=case when p_response->>'reasoningTokens' is null then reasoning_tokens else coalesce(reasoning_tokens,0)+(p_response->>'reasoningTokens')::integer end,
   reasoning_reported_calls=reasoning_reported_calls+case when p_response->>'reasoningTokens' is null then 0 else 1 end,
   provider_calls=provider_calls+1,provider_latency_ms=provider_latency_ms+coalesce((p_response->>'latencyMs')::integer,0),
   has_truncated_memo=has_truncated_memo or coalesce(p_response->>'finishReason' in ('length','content_filter') and p_response ? 'batch',false),updated_at=now()
   where execution_id=e.id;
  if p_response ? 'suggestion' then
   final_text:=nullif(trim(p_response->>'suggestion'),'');
   update public.corretor_recommendations set content=final_text,
    state=case when final_text is null then 'failed' when has_truncated_memo or p_response->>'finishReason' in ('length','content_filter') then 'partial' else 'completed' end,
    error_message=case when final_text is null then 'O provedor retornou uso, mas não retornou texto consultivo.' else null end,completed_at=now(),updated_at=now()
    where execution_id=e.id;
   update public.corretor_executions set state=case when final_text is null then 'failed' else 'completed' end,updated_at=now() where id=e.id;
  end if;
 end if;
end $$;
revoke all on function public.corretor_finish_batch(uuid,text,jsonb,numeric) from public,anon,authenticated;
grant execute on function public.corretor_finish_batch(uuid,text,jsonb,numeric) to service_role;

-- Só o controlador técnico pode consultar estes contratos/agregados.
create function public.corretor_recommendation_profile_schema() returns integer
language sql stable security invoker set search_path='' as $$ select 1 $$;
revoke all on function public.corretor_recommendation_profile_schema() from public,anon,authenticated;
grant execute on function public.corretor_recommendation_profile_schema() to service_role;

create function public.corretor_recommendation_usage(p_since timestamptz default now()-interval '30 days',p_until timestamptz default now())
returns jsonb language sql stable security invoker set search_path='' as $$
 with rec as (
  select * from public.corretor_recommendations where created_at>=p_since and created_at<p_until
 ), generations as (
  select model,profile_id,config_version,reasoning_effort,prompt_version,price_version,usage_origin,
   count(*) generations,count(distinct study_id) studies,
   count(*) filter(where state='completed') completed,count(*) filter(where state='partial') partial,
   count(*) filter(where state='failed') failed,count(*) filter(where state='unknown' or reserved_usd>0) unknown,
   round(count(*) filter(where state='completed')::numeric/nullif(count(*),0),4) completion_rate,
   sum(spent_usd) cost_usd,sum(reserved_usd) reserved_usd,sum(estimated_usd) estimated_usd,
   avg(spent_usd) mean_cost_usd,percentile_cont(0.5) within group(order by spent_usd) median_cost_usd,
   sum(input_tokens) input_tokens,sum(cached_tokens) cached_tokens,sum(output_tokens) output_tokens,
   sum(reasoning_tokens) reasoning_tokens,sum(reasoning_reported_calls) reasoning_reported_calls,sum(provider_calls) provider_calls,
   sum(spent_usd)*1000/nullif(sum(input_tokens),0) cost_per_1000_input_tokens,
   avg((coverage->>'readableSlides')::numeric) mean_readable_slides,
   avg(extract(epoch from (completed_at-created_at))) mean_elapsed_seconds,
   sum(provider_latency_ms)::numeric/nullif(sum(provider_calls),0) mean_provider_latency_ms
  from rec group by model,profile_id,config_version,reasoning_effort,prompt_version,price_version,usage_origin
 ), calls as (
  select model,requested_model,profile_id,config_version,reasoning_effort,prompt_version,price_version,usage_origin,service_tier,finish_reason,
   count(*) calls,sum(custo_usd) cost_usd,sum(input_tokens) input_tokens,sum(cached_tokens) cached_tokens,
   sum(output_tokens) output_tokens,sum(reasoning_tokens) reasoning_tokens,count(reasoning_tokens) reasoning_reported_calls,
   avg(latency_ms) mean_latency_ms,percentile_cont(0.5) within group(order by latency_ms) median_latency_ms
  from public.ia_passes where tipo='recomendacao' and created_at>=p_since and created_at<p_until
  group by model,requested_model,profile_id,config_version,reasoning_effort,prompt_version,price_version,usage_origin,service_tier,finish_reason
 ), details as (
  select id,execution_id,study_id,version_id,version_n,document_sha1,model,profile_id,reasoning_effort,prompt_version,price_version,usage_origin,
   state,spent_usd,reserved_usd,estimated_usd,input_tokens,cached_tokens,output_tokens,reasoning_tokens,reasoning_reported_calls,
   provider_calls,total_requests,provider_latency_ms,coverage,created_at,completed_at from rec
 )
 select jsonb_build_object('since',p_since,'until',p_until,
  'generations',coalesce((select jsonb_agg(to_jsonb(g)) from generations g),'[]'::jsonb),
  'calls',coalesce((select jsonb_agg(to_jsonb(c)) from calls c),'[]'::jsonb),
  'details',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from details d),'[]'::jsonb))
$$;
revoke all on function public.corretor_recommendation_usage(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.corretor_recommendation_usage(timestamptz,timestamptz) to service_role;

commit;
