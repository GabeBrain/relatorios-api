-- Primeira fatia: cadastro e originais privados. Aditiva; sem backfill de autoria presumida.
create table public.corretor_projects (
  id uuid primary key default gen_random_uuid(),
  study_id uuid unique references public.studies_v3(id),
  owner_id uuid not null references auth.users(id),
  display_name text not null check (length(trim(display_name)) between 1 and 240),
  client_name text not null default '', study_type text not null default 'vocacional_vertical',
  city text not null default '', uf text not null default '', analyst text not null default '',
  reviewer text not null default '', due_date date, reference_period text not null default '',
  notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,owner_id)
);
create index corretor_projects_owner_updated on public.corretor_projects(owner_id,updated_at desc);
create function public.touch_corretor_project() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.study_id is not null and new.study_id is distinct from old.study_id then raise exception 'Study association is immutable'; end if;
  new.updated_at=clock_timestamp(); return new;
end $$;
create trigger touch_corretor_project before update on public.corretor_projects for each row execute function public.touch_corretor_project();
create table public.corretor_project_members (
  project_id uuid not null references public.corretor_projects(id),
  user_id uuid not null references auth.users(id),
  owner_id uuid not null references auth.users(id),
  foreign key(project_id,owner_id) references public.corretor_projects(id,owner_id),
  primary key(project_id,user_id)
);
create index corretor_members_user on public.corretor_project_members(user_id,project_id);
alter table public.corretor_projects enable row level security;
alter table public.corretor_project_members enable row level security;
create policy project_read on public.corretor_projects for select to authenticated
  using (owner_id=(select auth.uid()) or exists(select 1 from public.corretor_project_members m where m.project_id=id and m.user_id=(select auth.uid())));
create policy project_insert on public.corretor_projects for insert to authenticated
  with check(owner_id=(select auth.uid()) and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy project_update on public.corretor_projects for update to authenticated
  using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
-- SELECT de membros não consulta projects, evitando recursão de políticas.
create policy member_read on public.corretor_project_members for select to authenticated using(user_id=(select auth.uid()) or owner_id=(select auth.uid()));
create policy member_insert on public.corretor_project_members for insert to authenticated
  with check(owner_id=(select auth.uid()));
create policy member_delete on public.corretor_project_members for delete to authenticated
  using(owner_id=(select auth.uid()));
grant select,insert,update on public.corretor_projects to authenticated;
grant select,insert,delete on public.corretor_project_members to authenticated;
revoke all on public.corretor_projects,public.corretor_project_members from anon;

create table public.corretor_originals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.corretor_projects(id),
  version_id uuid not null references public.study_versions(id),
  path text not null unique, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  sha1 text not null check(sha1 ~ '^[a-f0-9]{40}$'), bytes bigint not null check(bytes>0),
  original_name text not null, created_at timestamptz not null default now(),
  unique(project_id,version_id)
);
create index corretor_originals_project_created on public.corretor_originals(project_id,created_at desc);
alter table public.corretor_originals enable row level security;
create policy original_read on public.corretor_originals for select to authenticated
  using(exists(select 1 from public.corretor_projects p where p.id=project_id));
create policy original_insert on public.corretor_originals for insert to authenticated
  with check(exists(select 1 from public.corretor_projects p join public.study_versions v on v.study_id=p.study_id
    where p.id=project_id and p.owner_id=(select auth.uid()) and v.id=version_id and v.sha1=corretor_originals.sha1)
    and path=project_id::text||'/'||version_id::text||'/'||sha256||'.pptx'
    and exists(select 1 from storage.objects o where o.bucket_id='corretor-originais' and o.name=path and (o.metadata->>'size')::bigint=bytes));
grant select,insert on public.corretor_originals to authenticated;
revoke all on public.corretor_originals from anon;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('corretor-originais','corretor-originais',false,536870912,array['application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict(id) do nothing;
create policy original_object_read on storage.objects for select to authenticated
  using(bucket_id='corretor-originais' and exists(select 1 from public.corretor_projects p where p.id::text=(storage.foldername(name))[1]));
create policy original_object_insert on storage.objects for insert to authenticated
  with check(bucket_id='corretor-originais' and exists(select 1 from public.corretor_projects p join public.study_versions v on v.study_id=p.study_id
    where p.id::text=(storage.foldername(name))[1] and v.id::text=(storage.foldername(name))[2] and p.owner_id=(select auth.uid())));
-- Sem UPDATE/DELETE de originais: objeto é imutável e retry usa o mesmo caminho.
create function public.register_corretor_original(p_project uuid,p_version uuid,p_path text,p_sha256 text,p_sha1 text,p_bytes bigint,p_name text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; stored_size bigint;
begin
  if auth.uid() is null then raise exception 'Identity required'; end if;
  if not exists(select 1 from public.corretor_projects p join public.study_versions v on v.study_id=p.study_id
    where p.id=p_project and p.owner_id=auth.uid() and v.id=p_version and v.sha1=p_sha1) then raise exception 'Version or identity mismatch'; end if;
  if p_path<>p_project::text||'/'||p_version::text||'/'||p_sha256||'.pptx' then raise exception 'Invalid path'; end if;
  select (o.metadata->>'size')::bigint into stored_size from storage.objects o where o.bucket_id='corretor-originais' and o.name=p_path;
  if stored_size is null or stored_size<>p_bytes then raise exception 'Object not confirmed'; end if;
  select id into result from public.corretor_originals where project_id=p_project and version_id=p_version and path=p_path and sha256=p_sha256 and bytes=p_bytes;
  if result is not null then return result; end if;
  insert into public.corretor_originals(project_id,version_id,path,sha256,sha1,bytes,original_name)
  values(p_project,p_version,p_path,p_sha256,p_sha1,p_bytes,p_name) returning id into result;
  return result;
end $$;
revoke all on function public.register_corretor_original(uuid,uuid,text,text,text,bigint,text) from public,anon;
grant execute on function public.register_corretor_original(uuid,uuid,text,text,text,bigint,text) to authenticated;
