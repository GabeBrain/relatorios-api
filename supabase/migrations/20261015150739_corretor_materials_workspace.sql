-- Materiais independentes do cadastro comercial; aditiva, sem backfill de autoria.
alter table public.studies_v3 add column if not exists created_by uuid references auth.users(id) default auth.uid();
create function public.corretor_keep_study_author() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.created_by:=null;
  if auth.uid() is not null then if public.corretor_access_enabled() then new.created_by:=auth.uid(); end if; end if;
 elsif new.created_by is distinct from old.created_by then raise exception 'Study author is immutable'; end if;
 return new;
end $$;
create trigger corretor_keep_study_author before update on public.studies_v3 for each row execute function public.corretor_keep_study_author();
create trigger corretor_assign_study_author before insert on public.studies_v3 for each row execute function public.corretor_keep_study_author();
create table public.corretor_material_assets (
 id uuid primary key default gen_random_uuid(), study_id uuid not null references public.studies_v3(id),
 version_id uuid not null references public.study_versions(id),
 kind text not null check(kind in ('pptx','sheet','preview_pdf','preview_slide')),
 slide_n int check(slide_n>0), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 sha1 text check(sha1 ~ '^[a-f0-9]{40}$'), bytes bigint not null check(bytes>0 and bytes<=536870912),
 path text not null unique, original_name text not null check(length(original_name) between 1 and 300),
 created_by uuid not null references auth.users(id) default auth.uid(), created_at timestamptz not null default now(),
 unique(study_id,version_id,kind,sha256), check((kind='preview_slide')=(slide_n is not null))
);
create index corretor_assets_study_version on public.corretor_material_assets(study_id,version_id);
create table public.corretor_source_sets (
 id uuid primary key default gen_random_uuid(), study_id uuid not null references public.studies_v3(id),
 version_id uuid not null references public.study_versions(id), fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 file_ids uuid[] not null, payload jsonb not null, created_by uuid not null references auth.users(id) default auth.uid(),
 created_at timestamptz not null default now(), unique(study_id,version_id,fingerprint)
);
create table public.corretor_analysis_snapshots (
 id uuid primary key default gen_random_uuid(), study_id uuid not null references public.studies_v3(id),
 version_id uuid not null references public.study_versions(id), source_set_id uuid references public.corretor_source_sets(id),
 source_scope text not null check(source_scope in ('persisted_set','legacy_derived','no_source')),
 report jsonb, findings jsonb not null, reason text not null, created_by uuid not null references auth.users(id) default auth.uid(),
 created_at timestamptz not null default now()
);
create table public.corretor_study_shares (
 study_id uuid not null references public.studies_v3(id), user_id uuid not null references auth.users(id),
 shared_by uuid not null references auth.users(id) default auth.uid(), created_at timestamptz not null default now(),
 primary key(study_id,user_id)
);
alter table public.corretor_material_assets enable row level security;
alter table public.corretor_source_sets enable row level security;
alter table public.corretor_analysis_snapshots enable row level security;
alter table public.corretor_study_shares enable row level security;
revoke all on public.corretor_material_assets,public.corretor_source_sets,public.corretor_analysis_snapshots,public.corretor_study_shares from anon,authenticated;
grant select on public.corretor_material_assets,public.corretor_source_sets,public.corretor_analysis_snapshots to anon,authenticated;
grant select,insert on public.corretor_study_shares to authenticated;
grant insert on public.corretor_material_assets,public.corretor_source_sets,public.corretor_analysis_snapshots to authenticated;
create policy material_read on public.corretor_material_assets for select to anon,authenticated using(true);
create policy material_insert on public.corretor_material_assets for insert to authenticated with check(
 public.corretor_access_enabled() and created_by=auth.uid()
 and exists(select 1 from public.study_versions v where v.id=version_id and v.study_id=corretor_material_assets.study_id
  and (kind<>'pptx' or v.sha1=corretor_material_assets.sha1))
 and path=study_id::text||'/'||version_id::text||'/'||sha256||'/'||kind||case when slide_n is null then '' else '-'||slide_n::text end
 and exists(select 1 from storage.objects o where o.bucket_id='corretor-materiais' and o.name=path and (o.metadata->>'size')::bigint=bytes)
);
create policy source_set_read on public.corretor_source_sets for select to anon,authenticated using(true);
create policy source_set_insert on public.corretor_source_sets for insert to authenticated with check(
 public.corretor_access_enabled() and created_by=auth.uid()
 and exists(select 1 from public.study_versions v where v.id=version_id and v.study_id=corretor_source_sets.study_id)
 and cardinality(file_ids)>0 and cardinality(file_ids)<=100
 and not exists(select 1 from unnest(file_ids) f(id) where not exists(select 1 from public.corretor_material_assets a where a.id=f.id and a.study_id=corretor_source_sets.study_id and a.kind='sheet'))
);
create policy snapshot_read on public.corretor_analysis_snapshots for select to anon,authenticated using(true);
create policy snapshot_insert on public.corretor_analysis_snapshots for insert to authenticated with check(
 public.corretor_access_enabled() and created_by=auth.uid()
 and exists(select 1 from public.study_versions v where v.id=version_id and v.study_id=corretor_analysis_snapshots.study_id)
 and ((source_set_id is null and source_scope in ('legacy_derived','no_source'))
 or (source_scope='persisted_set' and exists(select 1 from public.corretor_source_sets s where s.id=source_set_id and s.study_id=corretor_analysis_snapshots.study_id)))
);
create policy share_read on public.corretor_study_shares for select to authenticated using(user_id=auth.uid() or shared_by=auth.uid());
create policy share_insert on public.corretor_study_shares for insert to authenticated with check(public.corretor_access_enabled() and shared_by=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit)
 values('corretor-materiais','corretor-materiais',false,536870912) on conflict(id) do nothing;
create policy material_object_read on storage.objects for select to authenticated using(bucket_id='corretor-materiais' and public.corretor_access_enabled());
create policy material_object_insert on storage.objects for insert to authenticated with check(
 bucket_id='corretor-materiais' and public.corretor_access_enabled()
 and exists(select 1 from public.study_versions v where v.id::text=(storage.foldername(name))[2] and v.study_id::text=(storage.foldername(name))[1])
);
-- Nenhum UPDATE/DELETE: materiais, conjuntos e snapshots são imutáveis.
create function public.activate_corretor_source_set(p_study uuid,p_version uuid,p_fingerprint text,p_files uuid[],p_payload jsonb,p_name text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if not public.corretor_access_enabled() then raise exception 'Identity required'; end if;
 insert into public.corretor_source_sets(study_id,version_id,fingerprint,file_ids,payload)
 values(p_study,p_version,p_fingerprint,p_files,p_payload)
 on conflict(study_id,version_id,fingerprint) do nothing;
 select id into result from public.corretor_source_sets where study_id=p_study and version_id=p_version and fingerprint=p_fingerprint and payload=p_payload and file_ids=p_files;
 if result is null then raise exception 'Source set not confirmed'; end if;
 insert into public.study_sources_v3(study_id,filename,payload,updated_at) values(p_study,p_name,p_payload,now())
 on conflict(study_id) do update set filename=excluded.filename,payload=excluded.payload,updated_at=excluded.updated_at;
 return result;
end $$;
revoke all on function public.activate_corretor_source_set(uuid,uuid,text,uuid[],jsonb,text) from public,anon;
grant execute on function public.activate_corretor_source_set(uuid,uuid,text,uuid[],jsonb,text) to authenticated;
