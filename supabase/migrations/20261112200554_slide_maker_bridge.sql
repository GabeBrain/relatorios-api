-- Lovable Cloud: service_role permanece no backend gerenciado.
-- Nonces e resultados idempotentes são privados; cada mutação e seu resultado são uma transação.
create table public.slide_maker_bridge_nonces (
  nonce uuid primary key,
  created_at timestamptz not null default clock_timestamp()
);
create index slide_maker_bridge_nonces_age on public.slide_maker_bridge_nonces(created_at);
create table public.slide_maker_bridge_calls (
  id uuid primary key,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index slide_maker_bridge_calls_age on public.slide_maker_bridge_calls(created_at);
alter table public.slide_maker_bridge_nonces enable row level security;
alter table public.slide_maker_bridge_calls enable row level security;
revoke all on public.slide_maker_bridge_nonces, public.slide_maker_bridge_calls from public, anon, authenticated;
grant select, insert, update, delete on public.slide_maker_bridge_nonces, public.slide_maker_bridge_calls to service_role;
grant select, insert, update on public.slide_maker_jobs, public.slide_maker_mensagens,
  public.slide_maker_arquivos, public.slide_maker_versoes, public.slide_maker_relatorios,
  public.slide_maker_fases to service_role;

create function public.slide_maker_bridge_nonce(p_nonce uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  -- Janela de assinatura é 120s. Manter nonces por 10min e limpar em lotes indexados.
  delete from public.slide_maker_bridge_nonces where nonce in
    (select nonce from public.slide_maker_bridge_nonces where created_at < clock_timestamp() - interval '10 minutes' limit 1000);
  insert into public.slide_maker_bridge_nonces(nonce) values(p_nonce) on conflict do nothing;
  return found;
end $$;
revoke all on function public.slide_maker_bridge_nonce(uuid) from public, anon, authenticated;
grant execute on function public.slide_maker_bridge_nonce(uuid) to service_role;

create function public.slide_maker_bridge_dispatch(p_operation text, p_args jsonb, p_key uuid, p_hash text, p_nonce uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  result jsonb; previous public.slide_maker_bridge_calls%rowtype;
  d jsonb := p_args->0; patch jsonb; row_json jsonb; job public.slide_maker_jobs%rowtype;
begin
  if jsonb_typeof(p_args) <> 'array' or jsonb_array_length(p_args) > 3 or p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_arguments';
  end if;
  if not public.slide_maker_bridge_nonce(p_nonce) then raise exception 'replay'; end if;
  -- Mesmo key serializado entre conexões. O resultado vazio/null também é persistido.
  perform pg_advisory_xact_lock(hashtextextended('slide-maker-call:' || p_key::text, 0));
  select * into previous from public.slide_maker_bridge_calls where id = p_key;
  if found then
    if previous.request_hash <> p_hash then raise exception 'idempotency_conflict'; end if;
    return previous.result;
  end if;
  case p_operation
  when 'reservarEvento' then
    select * into job from public.slide_maker_jobs where id=(d->>'job_id')::uuid;
    if not found then result:=null;
    else
      if d->>'ip' is not null then perform pg_advisory_xact_lock(hashtextextended('slide-maker-ip:' || (d->>'ip'),0)); end if;
      perform pg_advisory_xact_lock(hashtextextended('slide-maker-email:' || job.colaborador_email,0));
      row_json := public.slide_maker_bridge_dispatch('atualizarJob',jsonb_build_array(job.id,d->>'estado_esperado',d->'patch'),gen_random_uuid(),p_hash,gen_random_uuid());
      if row_json is null then result:=null;
      else
        patch := public.slide_maker_bridge_dispatch('criarFase',jsonb_build_array(jsonb_build_object('job_id',job.id,'fase',d->>'fase','colaborador_email',job.colaborador_email,'ip',d->>'ip')),gen_random_uuid(),p_hash,gen_random_uuid());
        result := jsonb_build_object('job',row_json,'fase',patch);
      end if;
    end if;
  when 'criarJob' then
    insert into public.slide_maker_jobs(colaborador_email,titulo,contexto,token_acesso_hash)
      values(d->>'colaborador_email',d->>'titulo',d->>'contexto',d->>'token_acesso_hash') returning to_jsonb(slide_maker_jobs.*) into result;
  when 'obterJob' then
    select to_jsonb(j) into result from public.slide_maker_jobs j where id=(p_args->>0)::uuid;
  when 'obterJobs' then
    if jsonb_array_length(d)>200 then raise exception 'invalid_arguments'; end if;
    select coalesce(jsonb_agg(to_jsonb(j)), '[]') into result from public.slide_maker_jobs j
      where id in (select value::uuid from jsonb_array_elements_text(d));
  when 'atualizarJob' then
    patch := p_args->2;
    if jsonb_typeof(patch)<>'object' or exists(select 1 from jsonb_object_keys(patch) k where k not in
      ('titulo','contexto','responsavel','estado','fase_em_curso','erro_fase','versao_atual','erro','arquivos_expurgados_em')) then raise exception 'invalid_arguments'; end if;
    select to_jsonb(j) into row_json from public.slide_maker_jobs j where id=(p_args->>0)::uuid for update;
    if row_json is not null then
      row_json := row_json || patch;
      update public.slide_maker_jobs j set
        titulo=x.titulo, contexto=x.contexto, responsavel=x.responsavel, estado=x.estado,
        fase_em_curso=x.fase_em_curso, erro_fase=x.erro_fase, versao_atual=x.versao_atual,
        erro=x.erro, arquivos_expurgados_em=x.arquivos_expurgados_em
      from jsonb_populate_record(null::public.slide_maker_jobs,row_json) x
      where j.id=(p_args->>0)::uuid and j.estado=p_args->>1 returning to_jsonb(j) into result;
    end if;
  when 'listarJobsEquipe' then
    if (p_args->>0)::int not between 1 and 200 then raise exception 'invalid_arguments'; end if;
    select coalesce(jsonb_agg(to_jsonb(j)), '[]') into result from
      (select * from public.slide_maker_jobs where estado<>'cancelado' order by created_at desc limit (p_args->>0)::int) j;
  when 'inserirMensagem' then
    insert into public.slide_maker_mensagens(job_id,autor,tipo,conteudo)
      values((d->>'job_id')::uuid,d->>'autor',d->>'tipo',d->'conteudo') returning to_jsonb(slide_maker_mensagens.*) into result;
  when 'listarMensagens' then
    select coalesce(jsonb_agg(to_jsonb(m) order by created_at,id), '[]') into result from public.slide_maker_mensagens m where job_id=(p_args->>0)::uuid;
  when 'inserirArquivo' then
    if split_part(d->>'storage_path','/',1) not in ('slide-maker-entrada','slide-maker-saida') or
       split_part(d->>'storage_path','/',2) <> d->>'job_id' or d->>'storage_path' ~ '(^|/)\.\.(/|$)' then raise exception 'invalid_arguments'; end if;
    insert into public.slide_maker_arquivos(job_id,nome,mime,bytes,storage_path,origem)
      values((d->>'job_id')::uuid,d->>'nome',d->>'mime',(d->>'bytes')::bigint,d->>'storage_path',d->>'origem') returning to_jsonb(slide_maker_arquivos.*) into result;
  when 'listarArquivos' then
    select coalesce(jsonb_agg(to_jsonb(a) order by created_at,id), '[]') into result from public.slide_maker_arquivos a where job_id=(p_args->>0)::uuid;
  when 'inserirVersao' then
    if split_part(d->>'storage_path','/',1) <> d->>'job_id' or d->>'storage_path' ~ '(^|/)\.\.(/|$)' then raise exception 'invalid_arguments'; end if;
    insert into public.slide_maker_versoes(job_id,versao,storage_path,deck_spec,mudancas,qa)
      values((d->>'job_id')::uuid,(d->>'versao')::int,d->>'storage_path',d->'deck_spec',
        array(select jsonb_array_elements_text(d->'mudancas')),d->'qa') returning to_jsonb(slide_maker_versoes.*) into result;
  when 'listarVersoes' then
    select coalesce(jsonb_agg(to_jsonb(v) order by versao), '[]') into result from public.slide_maker_versoes v where job_id=(p_args->>0)::uuid;
  when 'salvarRelatorio' then
    insert into public.slide_maker_relatorios(job_id,versao,markdown,fontes)
      values((d->>'job_id')::uuid,(d->>'versao')::int,d->>'markdown',d->'fontes')
      on conflict(job_id,versao) do update set markdown=excluded.markdown,fontes=excluded.fontes;
    result := null;
  when 'criarFase' then
    -- Ordem global de locks evita deadlock. Limites valem entre instâncias Cloud Run.
    if d->>'ip' is not null then perform pg_advisory_xact_lock(hashtextextended('slide-maker-ip:' || (d->>'ip'),0)); end if;
    perform pg_advisory_xact_lock(hashtextextended('slide-maker-email:' || (d->>'colaborador_email'),0));
    select * into job from public.slide_maker_jobs where id=(d->>'job_id')::uuid for update;
    if not found or job.colaborador_email <> d->>'colaborador_email' then raise exception 'invalid_arguments'; end if;
    if (select count(*) from public.slide_maker_fases where colaborador_email=job.colaborador_email and status in ('enfileirada','executando'))>=3
      or (select count(*) from public.slide_maker_fases where colaborador_email=job.colaborador_email and criada_em>=clock_timestamp()-interval '1 hour')>=10
      or (d->>'ip' is not null and (select count(*) from public.slide_maker_fases where ip=(d->>'ip')::inet and criada_em>=clock_timestamp()-interval '1 hour')>=40)
      then raise exception 'rate_limit'; end if;
    insert into public.slide_maker_fases(job_id,fase,colaborador_email,ip)
      values(job.id,d->>'fase',job.colaborador_email,(d->>'ip')::inet) returning to_jsonb(slide_maker_fases.*) into result;
  when 'obterFase' then
    select to_jsonb(f) into result from public.slide_maker_fases f where id=(p_args->>0)::uuid;
  when 'atualizarFase' then
    patch := p_args->2;
    if jsonb_typeof(patch)<>'object' or exists(select 1 from jsonb_object_keys(patch) k where k not in
      ('status','tarefa_nome','iniciada_em','finalizada_em','erro')) then raise exception 'invalid_arguments'; end if;
    select to_jsonb(f) into row_json from public.slide_maker_fases f where id=(p_args->>0)::uuid for update;
    if row_json is not null then
      row_json := row_json || patch;
      update public.slide_maker_fases f set status=x.status,tarefa_nome=x.tarefa_nome,iniciada_em=x.iniciada_em,finalizada_em=x.finalizada_em,erro=x.erro
      from jsonb_populate_record(null::public.slide_maker_fases,row_json) x
      where f.id=(p_args->>0)::uuid and f.status in (select jsonb_array_elements_text(p_args->1)) returning to_jsonb(f) into result;
    end if;
  when 'faseAtiva' then
    select to_jsonb(f) into result from public.slide_maker_fases f where job_id=(p_args->>0)::uuid and status in ('enfileirada','executando');
  when 'contarFasesDesde' then
    select to_jsonb(count(*)) into result from public.slide_maker_fases
    where criada_em >= (p_args->>1)::timestamptz
      and (not(d ? 'colaborador_email') or colaborador_email=d->>'colaborador_email')
      and (not(d ? 'ip') or ip=(d->>'ip')::inet);
  when 'contarFasesAtivasPorEmail' then
    select to_jsonb(count(*)) into result from public.slide_maker_fases where colaborador_email=p_args->>0 and status in ('enfileirada','executando');
  else raise exception 'invalid_arguments';
  end case;
  insert into public.slide_maker_bridge_calls(id,request_hash,result) values(p_key,p_hash,result);
  -- Retenção curta de respostas privadas; 24h excede a janela de retry de transporte.
  delete from public.slide_maker_bridge_calls where id in
    (select id from public.slide_maker_bridge_calls where created_at<clock_timestamp()-interval '24 hours' limit 100);
  return result;
end $$;
revoke all on function public.slide_maker_bridge_dispatch(text,jsonb,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.slide_maker_bridge_dispatch(text,jsonb,uuid,text,uuid) to service_role;
