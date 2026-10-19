-- Exclusão lógica: remove da carteira sem apagar materiais, decisões e consumo.
-- Aplicar pelo SQL Editor. Não há DELETE nem alteração de políticas existentes.
begin;
alter table public.studies_v3 add column if not exists deleted_at timestamptz;
alter table public.studies_v3 add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- O helper privado precisa ler execuções protegidas; a API pública não recebe
-- permissão de leitura dessas tabelas. Toda chamada valida a identidade Geobrain.
create schema if not exists corretor_internal;
create or replace function corretor_internal.trash_study(p_study_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not public.corretor_access_enabled() then
    raise exception 'Entre novamente pelo menu Geobrain para excluir o estudo.' using errcode='42501';
  end if;
  if not exists(select 1 from public.studies_v3 where id=p_study_id) then
    raise exception 'Estudo não encontrado ou acesso indisponível.' using errcode='42501';
  end if;
  if exists(select 1 from public.corretor_executions where study_id=p_study_id and state in ('prepared','running')) then
    raise exception 'Aguarde a avaliação terminar ou pause antes de excluir o estudo.';
  end if;
  update public.studies_v3 set deleted_at=clock_timestamp(),deleted_by=auth.uid()
    where id=p_study_id and deleted_at is null;
  if exists(select 1 from public.studies_v3 where id=p_study_id and deleted_at is not null) then return true; end if;
  raise exception 'A exclusão não foi confirmada. O estudo foi preservado.';
end $$;
revoke all on function corretor_internal.trash_study(uuid) from public,anon;
grant usage on schema corretor_internal to authenticated;
grant execute on function corretor_internal.trash_study(uuid) to authenticated;
create or replace function public.corretor_trash_study(p_study_id uuid)
returns boolean language sql security invoker set search_path='' as $$
  select corretor_internal.trash_study(p_study_id);
$$;
revoke all on function public.corretor_trash_study(uuid) from public,anon;
grant execute on function public.corretor_trash_study(uuid) to authenticated;

-- Um reenvio idêntico pode começar de novo, sem ressuscitar o registro excluído.
create or replace function public.corretor_prepare_study(p_name text,p_sha1 text,p_slides integer,p_file text,p_findings jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result_id uuid;
begin
  if p_sha1 !~ '^[a-f0-9]{40}$' or p_slides<1 or jsonb_typeof(p_findings)<>'array' then raise exception 'Apresentação inválida'; end if;
  perform pg_advisory_xact_lock(hashtextextended('corretor-new:'||p_sha1,0));
  select v.study_id into result_id from public.study_versions v join public.studies_v3 s on s.id=v.study_id
    where v.sha1=p_sha1 and s.generation='v3' and s.deleted_at is null order by v.created_at limit 1;
  if found then return jsonb_build_object('id',result_id,'created',false); end if;
  insert into public.studies_v3(nome,generation) values(p_name,'v3') returning id into result_id;
  insert into public.study_versions(study_id,n,sha1,n_slides,arquivo) values(result_id,1,p_sha1,p_slides,p_file);
  insert into public.findings_v3(study_id,rule_id,tipo,familia,slide_ref,titulo,detalhe,payload,status,origem,primeira_versao)
    select result_id,f->>'id',f->>'type',case when f->>'slideRef' ~ '^s[0-9]+$' then 'local' else 'relacional' end,
      f->>'slideRef',f->>'title',coalesce(f->>'detail',''),f,'pendente','DET',1 from jsonb_array_elements(p_findings) f;
  return jsonb_build_object('id',result_id,'created',true);
end $$;
commit;

-- Verificação sem mutação:
-- select column_name from information_schema.columns where table_schema='public'
--   and table_name='studies_v3' and column_name in ('deleted_at','deleted_by');
-- select to_regprocedure('public.corretor_trash_study(uuid)');
-- Não testar chamando a função com um estudo real sem querer removê-lo da carteira.
-- Recuperação administrativa pontual: UPDATE studies_v3 SET deleted_at=NULL,deleted_by=NULL
-- WHERE id=<id>; somente após conferir se o mesmo arquivo já foi reenviado como outro estudo.
