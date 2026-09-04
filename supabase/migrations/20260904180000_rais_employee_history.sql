-- Histórico V1 de Empregados: somente vínculos ativos anuais por município.
-- Cache compartilhado, auditável e separado do snapshot anual detalhado.

create table if not exists public.rais_employee_history_snapshots (
  id uuid primary key default gen_random_uuid(),
  municipality_ibge text not null check (municipality_ibge ~ '^[0-9]{7}$'),
  municipality_name text not null,
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  query_version text not null,
  methodology_version text not null,
  source text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  lease_expires_at timestamptz,
  attempt_count integer not null default 1,
  first_year integer not null default 1985,
  last_year integer not null default 1985,
  point_count integer not null default 0,
  bytes_processed bigint,
  query_duration_ms integer,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_ibge, query_version, methodology_version)
);

create table if not exists public.rais_employee_history_points (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.rais_employee_history_snapshots(id) on delete cascade,
  year integer not null check (year between 1985 and 2100),
  active_employees integer not null check (active_employees >= 0),
  created_at timestamptz not null default now(),
  unique (snapshot_id, year)
);

create table if not exists public.rais_employee_history_query_runs (
  id uuid primary key default gen_random_uuid(),
  requester_id text not null,
  requester_email text,
  ip_hash text,
  municipality_ibge text not null,
  uf text not null,
  snapshot_id uuid references public.rais_employee_history_snapshots(id) on delete set null,
  cache_hit boolean not null default false,
  status text not null default 'started' check (status in ('started', 'cache_hit', 'generated', 'pending', 'failed')),
  error_code text,
  bigquery_job_ids text[] not null default '{}',
  bytes_processed bigint,
  bytes_billed bigint,
  duration_ms integer,
  query_version text not null,
  application_version text not null default 'employees-history-v1',
  created_at timestamptz not null default now()
);

create index if not exists rais_employee_history_ready_idx on public.rais_employee_history_snapshots(status, updated_at desc);
create index if not exists rais_employee_history_points_snapshot_idx on public.rais_employee_history_points(snapshot_id, year);
create index if not exists rais_employee_history_runs_created_idx on public.rais_employee_history_query_runs(created_at desc);
create index if not exists rais_employee_history_runs_requester_idx on public.rais_employee_history_query_runs(requester_id, created_at desc);

alter table public.rais_employee_history_snapshots enable row level security;
alter table public.rais_employee_history_points enable row level security;
alter table public.rais_employee_history_query_runs enable row level security;

revoke all on public.rais_employee_history_snapshots from anon, authenticated;
revoke all on public.rais_employee_history_points from anon, authenticated;
revoke all on public.rais_employee_history_query_runs from anon, authenticated;
grant select, insert, update, delete on public.rais_employee_history_snapshots to service_role;
grant select, insert, update, delete on public.rais_employee_history_points to service_role;
grant select, insert, update, delete on public.rais_employee_history_query_runs to service_role;

create or replace function public.rais_claim_history_snapshot(
  p_municipality_ibge text,
  p_municipality_name text,
  p_uf text,
  p_query_version text,
  p_methodology_version text,
  p_source text,
  p_lease_seconds integer default 180
) returns table(snapshot_id uuid, acquired boolean, snapshot_status text, retry_after_ms integer)
language plpgsql security definer set search_path = public
as $$
declare
  existing public.rais_employee_history_snapshots;
  inserted_snapshot_id uuid;
begin
  insert into public.rais_employee_history_snapshots (
    municipality_ibge, municipality_name, uf, query_version, methodology_version, source,
    status, lease_expires_at
  ) values (
    p_municipality_ibge, p_municipality_name, p_uf, p_query_version, p_methodology_version, p_source,
    'processing', now() + make_interval(secs => p_lease_seconds)
  ) on conflict (municipality_ibge, query_version, methodology_version) do nothing
  returning id into inserted_snapshot_id;

  if inserted_snapshot_id is not null then
    return query select inserted_snapshot_id, true, 'processing'::text, 0;
    return;
  end if;

  select * into existing from public.rais_employee_history_snapshots s
  where s.municipality_ibge = p_municipality_ibge
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

  delete from public.rais_employee_history_points where snapshot_id = existing.id;
  update public.rais_employee_history_snapshots s set
    municipality_name = p_municipality_name, uf = p_uf, source = p_source,
    status = 'processing', lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempt_count = s.attempt_count + 1, last_error_code = null, updated_at = now()
  where s.id = existing.id;
  return query select existing.id, true, 'processing'::text, 0;
end;
$$;

create or replace function public.rais_finish_history_snapshot(
  p_snapshot_id uuid,
  p_first_year integer,
  p_last_year integer,
  p_point_count integer,
  p_bytes_processed bigint,
  p_query_duration_ms integer
) returns void language sql security definer set search_path = public
as $$
  update public.rais_employee_history_snapshots set status = 'ready', lease_expires_at = null,
    first_year = p_first_year, last_year = p_last_year, point_count = p_point_count,
    bytes_processed = p_bytes_processed, query_duration_ms = p_query_duration_ms,
    last_error_code = null, updated_at = now()
  where id = p_snapshot_id;
$$;

create or replace function public.rais_fail_history_snapshot(p_snapshot_id uuid, p_error_code text)
returns void language sql security definer set search_path = public
as $$
  update public.rais_employee_history_snapshots set status = 'failed', lease_expires_at = null,
    last_error_code = left(p_error_code, 120), updated_at = now() where id = p_snapshot_id;
$$;

revoke all on function public.rais_claim_history_snapshot(text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.rais_finish_history_snapshot(uuid, integer, integer, integer, bigint, integer) from public, anon, authenticated;
revoke all on function public.rais_fail_history_snapshot(uuid, text) from public, anon, authenticated;
grant execute on function public.rais_claim_history_snapshot(text, text, text, text, text, text, integer) to service_role;
grant execute on function public.rais_finish_history_snapshot(uuid, integer, integer, integer, bigint, integer) to service_role;
grant execute on function public.rais_fail_history_snapshot(uuid, text) to service_role;
