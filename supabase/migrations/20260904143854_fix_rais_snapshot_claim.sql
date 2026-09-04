-- RAIS Empregados: a primeira reserva deve ser entregue imediatamente à Edge
-- que a criou. Antes, a função retornava "processing" para a própria criadora
-- e nenhum processo assumia a geração do relatório.

create or replace function public.rais_claim_snapshot(
  p_municipality_ibge text,
  p_municipality_name text,
  p_uf text,
  p_year integer,
  p_query_version text,
  p_methodology_version text,
  p_source text,
  p_lease_seconds integer default 120
) returns table(snapshot_id uuid, acquired boolean, snapshot_status text, retry_after_ms integer)
language plpgsql security definer set search_path = public
as $$
declare
  existing public.rais_employee_snapshots;
  inserted_snapshot_id uuid;
begin
  insert into public.rais_employee_snapshots (
    municipality_ibge, municipality_name, uf, year, query_version, methodology_version, source,
    status, lease_expires_at
  ) values (
    p_municipality_ibge, p_municipality_name, p_uf, p_year, p_query_version, p_methodology_version, p_source,
    'processing', now() + make_interval(secs => p_lease_seconds)
  ) on conflict (municipality_ibge, year, query_version, methodology_version) do nothing
  returning id into inserted_snapshot_id;

  if inserted_snapshot_id is not null then
    return query select inserted_snapshot_id, true, 'processing'::text, 0;
    return;
  end if;

  select * into existing from public.rais_employee_snapshots s
  where s.municipality_ibge = p_municipality_ibge and s.year = p_year
    and s.query_version = p_query_version and s.methodology_version = p_methodology_version
  for update;

  if existing.status = 'ready' then
    return query select existing.id, false, existing.status, 0;
    return;
  end if;

  if existing.status = 'processing' and existing.lease_expires_at is not null and existing.lease_expires_at > now() then
    return query select existing.id, false, existing.status,
      greatest(1000, extract(epoch from (existing.lease_expires_at - now()))::integer * 1000);
    return;
  end if;

  delete from public.rais_employee_sectors where snapshot_id = existing.id;
  delete from public.rais_employee_occupations where snapshot_id = existing.id;
  update public.rais_employee_snapshots s set
    municipality_name = p_municipality_name, uf = p_uf, source = p_source,
    status = 'processing', lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempt_count = s.attempt_count + 1, last_error_code = null, updated_at = now()
  where s.id = existing.id;
  return query select existing.id, true, 'processing'::text, 0;
end;
$$;

revoke all on function public.rais_claim_snapshot(text, text, text, integer, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.rais_claim_snapshot(text, text, text, integer, text, text, text, integer) to service_role;
