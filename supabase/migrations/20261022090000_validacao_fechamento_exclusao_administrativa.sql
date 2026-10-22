-- Somente o administrador SQL (postgres/Supabase Dashboard) pode excluir.
-- A aplicação mantém somente leitura/inclusão pela Edge Function existente.
create or replace function public.validacao_fechamento_bloquear_alteracao_aprovacao()
returns trigger
language plpgsql
security invoker
as $$
begin
  if TG_OP = 'DELETE' and current_user = 'postgres' then
    return OLD;
  end if;
  raise exception 'Aprovações só podem ser excluídas pelo administrador no Supabase; alterações não são permitidas.';
end;
$$;

revoke update, delete on public.validacao_fechamento_aprovacoes from anon, authenticated, service_role;
