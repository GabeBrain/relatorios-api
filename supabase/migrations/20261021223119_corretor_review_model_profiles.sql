-- Adaptação aditiva. Mantém o finalizador consultivo anterior intacto e delega a ele.
begin;
alter table public.ia_passes
 add column rules_version text,
 add column extraction_version text,
 add column prompt_hash text;

create table public.corretor_review_validation_budgets (
 id text primary key,
 budget_usd numeric not null check(budget_usd>0 and budget_usd<=3),
 created_at timestamptz not null default now()
);
alter table public.corretor_review_validation_budgets enable row level security;
revoke all on public.corretor_review_validation_budgets from public,anon,authenticated;
grant select,insert,update on public.corretor_review_validation_budgets to service_role;
insert into public.corretor_review_validation_budgets(id,budget_usd) values('amanda-review-2026-10-21',3);
alter table public.corretor_executions add column validation_budget_id text references public.corretor_review_validation_budgets(id);
-- Vínculo administrativo para um canário completo pela interface, sem segredo no navegador.
create table public.corretor_review_validation_studies (
 study_id uuid primary key references public.studies_v3(id),
 budget_id text not null references public.corretor_review_validation_budgets(id),
 owner_hash text not null check(owner_hash ~ '^[a-f0-9]{64}$')
);
alter table public.corretor_review_validation_studies enable row level security;
revoke all on public.corretor_review_validation_studies from public,anon,authenticated;
grant select,insert on public.corretor_review_validation_studies to service_role;

alter function public.corretor_claim_batch(uuid,text,text,text,numeric) rename to corretor_claim_batch_pre_review;
alter function public.corretor_finish_batch(uuid,text,jsonb,numeric) rename to corretor_finish_batch_pre_review;
revoke all on function public.corretor_claim_batch_pre_review(uuid,text,text,text,numeric) from public,anon,authenticated;
revoke all on function public.corretor_finish_batch_pre_review(uuid,text,jsonb,numeric) from public,anon,authenticated;

create function public.corretor_claim_batch(p_execution uuid,p_owner text,p_hash text,p_function text,p_reserve numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare budget_id text; ceiling numeric; committed numeric;
begin
 select validation_budget_id into budget_id from public.corretor_executions where id=p_execution and owner_hash=p_owner;
 if budget_id is not null then
  -- Uma trava única para todos os lotes e tentativas desta autorização. Reservas desconhecidas contam.
  select budget_usd into ceiling from public.corretor_review_validation_budgets where id=budget_id for update;
  if not exists(select 1 from public.corretor_execution_batches where execution_id=p_execution and batch_hash=p_hash) then
   select coalesce(sum(spent_usd+reserved_usd),0) into committed from public.corretor_executions where validation_budget_id=budget_id;
   if p_reserve is null or p_reserve<=0 or committed+p_reserve>ceiling then raise exception 'Teto global de validação insuficiente'; end if;
  end if;
 end if;
 return public.corretor_claim_batch_pre_review(p_execution,p_owner,p_hash,p_function,p_reserve);
end $$;

create function public.corretor_finish_batch(p_execution uuid,p_hash text,p_response jsonb,p_cost numeric)
returns void language plpgsql security definer set search_path='' as $$
declare e public.corretor_executions; p jsonb; r jsonb; expected numeric; long_input boolean;
begin
 select * into e from public.corretor_executions where id=p_execution for update;
 if not found then raise exception 'Execução não encontrada'; end if;
 p:=e.confirmed_context->'reviewProfile';
 if p is not null then
  if e.purpose<>'review' or p->>'id'<>'luna-high-review-2026-10-21'
    or p_response->>'profileId' is distinct from p->>'id'
    or p_response->>'configVersion' is distinct from p->>'configVersion'
    or p_response->>'reasoningEffort' is distinct from p->>'reasoningEffort'
    or p_response->>'promptVersion' is distinct from p->>'promptVersion'
    or p_response->>'rulesVersion' is distinct from p->>'rulesVersion'
    or p_response->>'extractionVersion' is distinct from p->>'extractionVersion'
    or p_response->>'priceVersion' is distinct from p->>'priceVersion'
    or p_response->>'requestedModel' is distinct from 'gpt-6-luna'
    or p_response->>'serviceTier' is distinct from p->>'serviceTier'
    or p_response->>'requestedServiceTier' is distinct from p->>'serviceTier'
    or p_response->>'promptHash' is null
    or p_response->>'inputTokens' is null or p_response->>'outputTokens' is null
    or (p_response->>'inputTokens')::integer<0 or (p_response->>'outputTokens')::integer<0
    or coalesce((p_response->>'cachedTokens')::integer,0) not between 0 and (p_response->>'inputTokens')::integer
    or (p_response->>'reasoningTokens')::integer<0 or (p_response->>'reasoningTokens')::integer>(p_response->>'outputTokens')::integer
  then raise exception 'Uso ou perfil de revisão divergente'; end if;
  r:=p->'prices'->'gpt-6-luna'; long_input:=(p_response->>'inputTokens')::integer>272000;
  expected:=(((p_response->>'inputTokens')::numeric-coalesce((p_response->>'cachedTokens')::numeric,0))*(r->>'input')::numeric*(case when long_input then 2 else 1 end)
    +coalesce((p_response->>'cachedTokens')::numeric,0)*(r->>'cached')::numeric*(case when long_input then 2 else 1 end)
    +(p_response->>'outputTokens')::numeric*(r->>'output')::numeric*(case when long_input then 1.5 else 1 end))/1000000;
  if expected is null or p_cost is null or abs(expected-p_cost)>0.000000000001 then raise exception 'Preço de revisão divergente'; end if;
 end if;

 -- Idempotência, saldo, passe e recomendação continuam no contrato transacional anterior.
 perform public.corretor_finish_batch_pre_review(p_execution,p_hash,p_response,p_cost);
 if p is not null then
  if not exists(select 1 from public.ia_passes where execution_id=p_execution and batch_hash=p_hash) then
   insert into public.ia_passes(study_id,tipo,escopo,custo_usd,input_tokens,output_tokens,execution_id,batch_hash)
    values(e.study_id,'texto','Revisão registrada',p_cost,(p_response->>'inputTokens')::integer,(p_response->>'outputTokens')::integer,p_execution,p_hash);
  end if;
  update public.ia_passes set profile_id=p->>'id',config_version=p->>'configVersion',reasoning_effort=p->>'reasoningEffort',
    rules_version=p->>'rulesVersion',extraction_version=p->>'extractionVersion',prompt_hash=p_response->>'promptHash',
    usage_origin=e.confirmed_context->>'usageOrigin',pricing_snapshot=jsonb_build_object('currency','USD','per_tokens',1000000,'price_version',p->>'priceVersion','long_input',long_input)||r
    where execution_id=p_execution and batch_hash=p_hash;
  if p_response ? 'error' then
   update public.corretor_executions set state='failed',updated_at=now() where id=p_execution;
  end if;
 end if;
end $$;

create function public.corretor_review_profile_schema() returns integer
language sql stable security invoker set search_path='' as $$ select 1 $$;
revoke all on function public.corretor_review_profile_schema() from public,anon,authenticated;
grant execute on function public.corretor_review_profile_schema() to service_role;
revoke all on function public.corretor_claim_batch(uuid,text,text,text,numeric) from public,anon,authenticated;
revoke all on function public.corretor_finish_batch(uuid,text,jsonb,numeric) from public,anon,authenticated;
grant execute on function public.corretor_claim_batch(uuid,text,text,text,numeric) to service_role;
grant execute on function public.corretor_finish_batch(uuid,text,jsonb,numeric) to service_role;
commit;
