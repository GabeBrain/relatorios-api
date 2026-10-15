-- Execuções e respostas de lotes. Nenhuma permissão nova de escrita pública.
create table public.corretor_executions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies_v3(id) on delete cascade,
  version_n integer not null,
  document_sha1 text not null,
  context_hash text not null,
  confirmed_context jsonb not null default '{}'::jsonb,
  owner_hash text not null,
  budget_usd numeric not null check (budget_usd > 0 and budget_usd <= 100),
  spent_usd numeric not null default 0,
  reserved_usd numeric not null default 0,
  state text not null default 'prepared' check (state in ('prepared','running','interrupted','failed','completed')),
  engine text not null default 'continuous-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(study_id, version_n, context_hash)
);
create table public.corretor_execution_batches (
  execution_id uuid not null references public.corretor_executions(id) on delete cascade,
  batch_hash text not null,
  function_name text not null,
  state text not null check (state in ('running','completed','unknown')),
  reserved_usd numeric not null,
  cost_usd numeric,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key(execution_id,batch_hash)
);
alter table public.corretor_executions enable row level security;
alter table public.corretor_execution_batches enable row level security;
revoke all on public.corretor_executions, public.corretor_execution_batches from anon, authenticated;
grant select,insert,update on public.corretor_executions,public.corretor_execution_batches to service_role;

-- Todas as operações são chamadas exclusivamente pela Edge com service_role.
create or replace function public.corretor_claim_batch(p_execution uuid, p_owner text, p_hash text, p_function text, p_reserve numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e public.corretor_executions; b public.corretor_execution_batches;
begin
  select * into e from public.corretor_executions where id=p_execution and owner_hash=p_owner for update;
  if not found then raise exception 'Execução não autorizada'; end if;
  select * into b from public.corretor_execution_batches where execution_id=e.id and batch_hash=p_hash;
  if found then
    if b.state='completed' then return jsonb_build_object('cached',true,'response',b.response); end if;
    raise exception 'Lote em andamento ou com retorno desconhecido. Não repetir cobrança';
  end if;
  if e.state='completed' then raise exception 'Execução já concluída'; end if;
  if e.state not in ('prepared','running') then raise exception 'Confirme a retomada antes de processar'; end if;
  if p_reserve <= 0 or e.spent_usd+e.reserved_usd+p_reserve>e.budget_usd then raise exception 'Limite autorizado insuficiente para o próximo lote'; end if;
  insert into public.corretor_execution_batches values(e.id,p_hash,p_function,'running',p_reserve,null,null,now());
  update public.corretor_executions set reserved_usd=reserved_usd+p_reserve,state='running',updated_at=now() where id=e.id;
  return jsonb_build_object('cached',false);
end $$;
create or replace function public.corretor_finish_batch(p_execution uuid,p_hash text,p_response jsonb,p_cost numeric)
returns void language plpgsql security definer set search_path=public as $$
declare b public.corretor_execution_batches;
begin
  perform 1 from public.corretor_executions where id=p_execution for update;
  select * into b from public.corretor_execution_batches where execution_id=p_execution and batch_hash=p_hash for update;
  if not found or b.state<>'running' then raise exception 'Lote não está em execução'; end if;
  if p_cost<0 or p_cost>b.reserved_usd then raise exception 'Custo fora da reserva: exige reconciliação'; end if;
  update public.corretor_execution_batches set state='completed',response=p_response,cost_usd=p_cost where execution_id=p_execution and batch_hash=p_hash;
  update public.corretor_executions set spent_usd=spent_usd+p_cost,reserved_usd=reserved_usd-b.reserved_usd,updated_at=now() where id=p_execution;
  -- Custo contabilizado por lote, mesmo se o navegador fechar antes do relatório.
  update public.studies_v3 s set custo_total=s.custo_total+p_cost from public.corretor_executions e where e.id=p_execution and s.id=e.study_id;
  if p_cost>0 then
    insert into public.ia_passes(study_id,tipo,escopo,custo_usd,input_tokens,output_tokens)
      select e.study_id,case b.function_name when 'analyze-text-batch' then 'texto' when 'analyze-ata-image' then 'visao_ata' else 'visao_tabela' end,
        'Execução registrada · lote confirmado',p_cost,(p_response->>'inputTokens')::integer,(p_response->>'outputTokens')::integer
      from public.corretor_executions e where e.id=p_execution;
  end if;
end $$;
revoke all on function public.corretor_claim_batch(uuid,text,text,text,numeric) from public,anon,authenticated;
revoke all on function public.corretor_finish_batch(uuid,text,jsonb,numeric) from public,anon,authenticated;
grant execute on function public.corretor_claim_batch(uuid,text,text,text,numeric) to service_role;
grant execute on function public.corretor_finish_batch(uuid,text,jsonb,numeric) to service_role;

-- Criação atômica para novos envios idênticos. Invoker mantém as políticas existentes.
create or replace function public.corretor_prepare_study(p_name text,p_sha1 text,p_slides integer,p_file text,p_findings jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result_id uuid;
begin
  if p_sha1 !~ '^[a-f0-9]{40}$' or p_slides<1 or jsonb_typeof(p_findings)<>'array' then raise exception 'Apresentação inválida'; end if;
  perform pg_advisory_xact_lock(hashtextextended('corretor-new:'||p_sha1,0));
  select v.study_id into result_id from public.study_versions v join public.studies_v3 s on s.id=v.study_id
    where v.sha1=p_sha1 and s.generation='v3' order by v.created_at limit 1;
  if found then return jsonb_build_object('id',result_id,'created',false); end if;
  insert into public.studies_v3(nome,generation) values(p_name,'v3') returning id into result_id;
  insert into public.study_versions(study_id,n,sha1,n_slides,arquivo) values(result_id,1,p_sha1,p_slides,p_file);
  insert into public.findings_v3(study_id,rule_id,tipo,familia,slide_ref,titulo,detalhe,payload,status,origem,primeira_versao)
    select result_id,f->>'id',f->>'type',case when f->>'slideRef' ~ '^s[0-9]+$' then 'local' else 'relacional' end,
      f->>'slideRef',f->>'title',coalesce(f->>'detail',''),f,'pendente','DET',1 from jsonb_array_elements(p_findings) f;
  return jsonb_build_object('id',result_id,'created',true);
end $$;
revoke all on function public.corretor_prepare_study(text,text,integer,text,jsonb) from public;
grant execute on function public.corretor_prepare_study(text,text,integer,text,jsonb) to anon,authenticated;
