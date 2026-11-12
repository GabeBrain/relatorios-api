-- Permissão emitida só após login GeoBrain validado e conta habilitada no servidor.
-- Usa app_metadata (administrável pelo servidor), nunca user_metadata do usuário.
create function public.corretor_access_enabled() returns boolean language sql stable security invoker set search_path='' as $$
  select coalesce(auth.jwt()->'app_metadata'->>'corretor_enabled','false')='true'
    and coalesce((auth.jwt()->'app_metadata'->>'corretor_geo_until')::timestamptz > now(),false)
$$;
revoke all on function public.corretor_access_enabled() from public,anon;
grant execute on function public.corretor_access_enabled() to authenticated;
alter policy project_read on public.corretor_projects using(public.corretor_access_enabled() and
  (owner_id=(select auth.uid()) or exists(select 1 from public.corretor_project_members m where m.project_id=id and m.user_id=(select auth.uid()))));
alter policy project_insert on public.corretor_projects with check(public.corretor_access_enabled() and owner_id=(select auth.uid()) and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
alter policy project_update on public.corretor_projects using(public.corretor_access_enabled() and owner_id=(select auth.uid())) with check(public.corretor_access_enabled() and owner_id=(select auth.uid()));
alter policy member_read on public.corretor_project_members using(public.corretor_access_enabled() and (user_id=(select auth.uid()) or owner_id=(select auth.uid())));
alter policy member_insert on public.corretor_project_members with check(public.corretor_access_enabled() and owner_id=(select auth.uid()));
alter policy member_delete on public.corretor_project_members using(public.corretor_access_enabled() and owner_id=(select auth.uid()));
-- Originais e objetos consultam projects sob RLS; herdam identidade, permissão e validade.
