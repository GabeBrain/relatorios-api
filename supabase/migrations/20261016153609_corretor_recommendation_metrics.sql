-- Recomendação independente do relatório de correção. Biblioteca pública aprovada;
-- contexto, reservas e respostas intermediárias continuam privados na execução.
alter table public.corretor_executions add column purpose text not null default 'review' check(purpose in ('review','recommendation'));
alter table public.corretor_executions add column estimated_usd numeric check(estimated_usd>=0);
alter table public.ia_passes drop constraint if exists ia_passes_tipo_check;
alter table public.ia_passes add constraint ia_passes_tipo_check check(tipo in ('texto','visao_tabela','visao_mapa','visao_ata','recomendacao'));
alter table public.ia_passes add column execution_id uuid references public.corretor_executions(id) on delete set null;
alter table public.ia_passes add column batch_hash text;
alter table public.ia_passes add column requested_model text;
alter table public.ia_passes add column model text;
alter table public.ia_passes add column prompt_version text;
alter table public.ia_passes add column price_version text;
alter table public.ia_passes add column cached_tokens integer not null default 0 check(cached_tokens>=0);
alter table public.ia_passes add column latency_ms integer check(latency_ms>=0);
alter table public.ia_passes add column provider_request_id text;
create unique index ia_passes_execution_batch on public.ia_passes(execution_id,batch_hash) where execution_id is not null;
create index ia_passes_recent_usage on public.ia_passes(created_at desc);
-- Mantém operações legadas, mas novos passes consultivos só são escritos pelo servidor.
create policy recommendation_pass_insert on public.ia_passes as restrictive for insert to anon,authenticated with check(tipo<>'recomendacao' and execution_id is null and batch_hash is null);
create policy recommendation_pass_update on public.ia_passes as restrictive for update to anon,authenticated using(tipo<>'recomendacao' and execution_id is null) with check(tipo<>'recomendacao' and execution_id is null and batch_hash is null);
create policy recommendation_pass_delete on public.ia_passes as restrictive for delete to anon,authenticated using(tipo<>'recomendacao' and execution_id is null);

create table public.corretor_recommendations (
 id uuid primary key default gen_random_uuid(),
 execution_id uuid not null unique references public.corretor_executions(id) on delete cascade,
 study_id uuid not null references public.studies_v3(id) on delete cascade,
 version_id uuid not null references public.study_versions(id) on delete cascade,
 version_n integer not null, document_sha1 text not null,
 model text not null, prompt_version text not null, price_version text not null,
 state text not null default 'prepared' check(state in ('prepared','running','interrupted','failed','unknown','completed','partial')),
 estimated_usd numeric not null, budget_usd numeric not null,
 spent_usd numeric not null default 0, reserved_usd numeric not null default 0,
 input_tokens bigint not null default 0, cached_tokens bigint not null default 0, output_tokens bigint not null default 0,
 provider_calls integer not null default 0, total_requests integer not null, provider_latency_ms bigint not null default 0,
 has_truncated_memo boolean not null default false,
 coverage jsonb not null, content text, error_message text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz
);
create index corretor_recommendations_study_version on public.corretor_recommendations(study_id,version_n,created_at desc);
alter table public.corretor_recommendations enable row level security;
revoke all on public.corretor_recommendations from anon,authenticated;
grant select on public.corretor_recommendations to anon,authenticated;
grant select,insert,update on public.corretor_recommendations to service_role;
create policy recommendation_library_read on public.corretor_recommendations for select to anon,authenticated using(true);

create function public.corretor_sync_recommendation_execution() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.purpose='recommendation' then
  update public.corretor_recommendations set spent_usd=new.spent_usd,reserved_usd=new.reserved_usd,budget_usd=new.budget_usd,
   state=case when state in ('completed','partial') then state when new.reserved_usd>0 and exists(select 1 from public.corretor_execution_batches b where b.execution_id=new.id and b.state='unknown') then 'unknown' else new.state end,
   updated_at=now() where execution_id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.corretor_sync_recommendation_execution() from public,anon,authenticated;
grant execute on function public.corretor_sync_recommendation_execution() to service_role;
create trigger corretor_sync_recommendation_execution after update on public.corretor_executions for each row execute function public.corretor_sync_recommendation_execution();

create or replace function public.corretor_finish_batch(p_execution uuid,p_hash text,p_response jsonb,p_cost numeric)
returns void language plpgsql security definer set search_path=public as $$
declare b public.corretor_execution_batches; e public.corretor_executions; consult boolean; final_text text;
begin
 select * into e from public.corretor_executions where id=p_execution for update;
 select * into b from public.corretor_execution_batches where execution_id=p_execution and batch_hash=p_hash for update;
 if not found or b.state<>'running' then raise exception 'Lote não está em execução'; end if;
 if p_cost is null or p_cost<0 or p_cost>b.reserved_usd then raise exception 'Custo fora da reserva: exige reconciliação'; end if;
 consult:=b.function_name='analyze-consulting-suggestion';
 if consult and (e.purpose<>'recommendation' or p_response->>'inputTokens' is null or p_response->>'outputTokens' is null or (p_response->>'inputTokens')::integer<0 or (p_response->>'outputTokens')::integer<0 or coalesce((p_response->>'cachedTokens')::integer,0) not between 0 and (p_response->>'inputTokens')::integer) then raise exception 'Uso consultivo inválido'; end if;
 update public.corretor_execution_batches set state='completed',response=p_response,cost_usd=p_cost where execution_id=p_execution and batch_hash=p_hash;
 update public.corretor_executions set spent_usd=spent_usd+p_cost,reserved_usd=reserved_usd-b.reserved_usd,updated_at=now() where id=p_execution;
 update public.studies_v3 set custo_total=custo_total+p_cost where id=e.study_id;
 if p_cost>0 or consult then
  insert into public.ia_passes(study_id,tipo,escopo,custo_usd,input_tokens,output_tokens,execution_id,batch_hash,requested_model,model,prompt_version,price_version,cached_tokens,latency_ms,provider_request_id)
  values(e.study_id,case b.function_name when 'analyze-text-batch' then 'texto' when 'analyze-ata-image' then 'visao_ata' when 'analyze-consulting-suggestion' then 'recomendacao' else 'visao_tabela' end,
    'Execução registrada · lote confirmado',p_cost,(p_response->>'inputTokens')::integer,(p_response->>'outputTokens')::integer,e.id,p_hash,
    p_response->>'requestedModel',p_response->>'model',p_response->>'promptVersion',p_response->>'priceVersion',coalesce((p_response->>'cachedTokens')::integer,0),(p_response->>'latencyMs')::integer,p_response->>'requestId');
 end if;
 if consult then
  update public.corretor_recommendations set input_tokens=input_tokens+(p_response->>'inputTokens')::integer,
   cached_tokens=cached_tokens+coalesce((p_response->>'cachedTokens')::integer,0),output_tokens=output_tokens+(p_response->>'outputTokens')::integer,
   provider_calls=provider_calls+1,provider_latency_ms=provider_latency_ms+coalesce((p_response->>'latencyMs')::integer,0),has_truncated_memo=has_truncated_memo or coalesce(p_response->>'finishReason'='length' and p_response ? 'batch',false),updated_at=now()
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

-- Apenas agregados públicos da biblioteca; sem contexto, proprietário ou respostas privadas.
grant select on public.ia_passes to anon,authenticated;
create function public.corretor_ai_usage() returns jsonb language sql stable security invoker set search_path='' as $$
 with recent as (select * from public.ia_passes where created_at>=now()-interval '30 days'),
 groups as (select tipo,coalesce(model,'Modelo não registrado') model,count(*) calls,
  coalesce(sum(input_tokens),0) input_tokens,coalesce(sum(cached_tokens),0) cached_tokens,
  coalesce(sum(output_tokens),0) output_tokens,coalesce(sum(custo_usd),0) cost_usd,round(avg(latency_ms)) latency_ms
  from recent group by tipo,coalesce(model,'Modelo não registrado')),
 daily as (select (created_at at time zone 'America/Sao_Paulo')::date as "day",sum(custo_usd) cost_usd from recent group by 1),
 rec as (select count(*) total,count(*) filter(where state='completed') completed,count(*) filter(where state='partial') partial,
  count(*) filter(where state='unknown' or reserved_usd>0) unknown,
  coalesce(sum(spent_usd),0) spent_usd,coalesce(sum(reserved_usd),0) reserved_usd,coalesce(sum(estimated_usd),0) estimated_usd
  from public.corretor_recommendations where created_at>=now()-interval '30 days')
 select jsonb_build_object('since',now()-interval '30 days','groups',coalesce((select jsonb_agg(to_jsonb(g) order by cost_usd desc) from groups g),'[]'::jsonb),
  'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d."day") from daily d),'[]'::jsonb),'recommendations',(select to_jsonb(r) from rec r));
$$;
revoke all on function public.corretor_ai_usage() from public;
grant execute on function public.corretor_ai_usage() to anon,authenticated,service_role;
