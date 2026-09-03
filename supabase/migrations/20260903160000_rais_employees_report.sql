-- Empresas e Empregados / V1
-- Cache agregado e auditoria do relatório de Empregados.
-- Não há tabelas, storage ou policies para Empresas nesta versão.

create table if not exists public.rais_employee_snapshots (
  id uuid primary key default gen_random_uuid(),
  municipality_ibge text not null check (municipality_ibge ~ '^[0-9]{7}$'),
  municipality_name text not null,
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  year integer not null check (year between 1985 and 2100),
  query_version text not null,
  methodology_version text not null,
  source text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  lease_expires_at timestamptz,
  attempt_count integer not null default 1,
  total_employees integer not null default 0,
  salary_missing_or_zero integer not null default 0,
  missing_cbo integer not null default 0,
  total_links_in_year integer,
  average_salary numeric,
  median_salary numeric,
  bytes_processed bigint,
  query_duration_ms integer,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_ibge, year, query_version, methodology_version)
);

create table if not exists public.rais_employee_sectors (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.rais_employee_snapshots(id) on delete cascade,
  code text not null,
  name text not null,
  employees integer not null default 0,
  percentage numeric not null default 0,
  average_salary numeric,
  median_salary numeric,
  created_at timestamptz not null default now(),
  unique (snapshot_id, code)
);

create table if not exists public.rais_employee_occupations (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.rais_employee_snapshots(id) on delete cascade,
  code text not null,
  major_group text not null,
  family text not null,
  occupation text not null,
  employees integer not null default 0,
  percentage numeric not null default 0,
  average_salary numeric,
  median_salary numeric,
  created_at timestamptz not null default now(),
  unique (snapshot_id, code)
);

create table if not exists public.rais_employee_query_runs (
  id uuid primary key default gen_random_uuid(),
  requester_id text not null,
  requester_email text,
  ip_hash text,
  municipality_ibge text not null,
  uf text not null,
  year integer not null,
  snapshot_id uuid references public.rais_employee_snapshots(id) on delete set null,
  cache_hit boolean not null default false,
  status text not null default 'started' check (status in ('started', 'cache_hit', 'generated', 'pending', 'failed')),
  error_code text,
  bigquery_job_ids text[] not null default '{}',
  bytes_processed bigint,
  bytes_billed bigint,
  duration_ms integer,
  query_version text not null,
  application_version text not null default 'employees-v1',
  created_at timestamptz not null default now()
);

create index if not exists rais_employee_snapshots_ready_idx on public.rais_employee_snapshots(status, updated_at desc);
create index if not exists rais_employee_sectors_snapshot_idx on public.rais_employee_sectors(snapshot_id);
create index if not exists rais_employee_occupations_snapshot_idx on public.rais_employee_occupations(snapshot_id);
create index if not exists rais_employee_runs_created_idx on public.rais_employee_query_runs(created_at desc);
create index if not exists rais_employee_runs_requester_idx on public.rais_employee_query_runs(requester_id, created_at desc);

alter table public.rais_employee_snapshots enable row level security;
alter table public.rais_employee_sectors enable row level security;
alter table public.rais_employee_occupations enable row level security;
alter table public.rais_employee_query_runs enable row level security;

-- A UI usa exclusivamente a Edge Function. Não conceder acesso ao anon/authenticated.
revoke all on public.rais_employee_snapshots from anon, authenticated;
revoke all on public.rais_employee_sectors from anon, authenticated;
revoke all on public.rais_employee_occupations from anon, authenticated;
revoke all on public.rais_employee_query_runs from anon, authenticated;
grant select, insert, update, delete on public.rais_employee_snapshots to service_role;
grant select, insert, update, delete on public.rais_employee_sectors to service_role;
grant select, insert, update, delete on public.rais_employee_occupations to service_role;
grant select, insert, update, delete on public.rais_employee_query_runs to service_role;

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
  claimed uuid;
begin
  insert into public.rais_employee_snapshots (
    municipality_ibge, municipality_name, uf, year, query_version, methodology_version, source,
    status, lease_expires_at
  ) values (
    p_municipality_ibge, p_municipality_name, p_uf, p_year, p_query_version, p_methodology_version, p_source,
    'processing', now() + make_interval(secs => p_lease_seconds)
  ) on conflict (municipality_ibge, year, query_version, methodology_version) do nothing;

  select * into existing from public.rais_employee_snapshots s
  where s.municipality_ibge = p_municipality_ibge and s.year = p_year
    and s.query_version = p_query_version and s.methodology_version = p_methodology_version
  for update;

  if existing.status = 'ready' then
    return query select existing.id, false, existing.status, 0;
  end if;

  if existing.status = 'processing' and existing.lease_expires_at is not null and existing.lease_expires_at > now() then
    return query select existing.id, false, existing.status,
      greatest(1000, extract(epoch from (existing.lease_expires_at - now()))::integer * 1000);
  end if;

  delete from public.rais_employee_sectors where snapshot_id = existing.id;
  delete from public.rais_employee_occupations where snapshot_id = existing.id;
  update public.rais_employee_snapshots s set
    status = 'processing', lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    attempt_count = s.attempt_count + 1, last_error_code = null, updated_at = now()
  where s.id = existing.id;
  claimed := existing.id;
  return query select claimed, true, 'processing'::text, 0;
end;
$$;

create or replace function public.rais_finish_snapshot(p_snapshot_id uuid, p_total_employees integer, p_salary_missing_or_zero integer, p_missing_cbo integer, p_total_links_in_year integer, p_average_salary numeric, p_median_salary numeric, p_bytes_processed bigint, p_query_duration_ms integer)
returns void language sql security definer set search_path = public as $$
  update public.rais_employee_snapshots set status = 'ready', lease_expires_at = null,
    total_employees = p_total_employees, salary_missing_or_zero = p_salary_missing_or_zero,
    missing_cbo = p_missing_cbo, total_links_in_year = p_total_links_in_year,
    average_salary = p_average_salary, median_salary = p_median_salary,
    bytes_processed = p_bytes_processed, query_duration_ms = p_query_duration_ms,
    last_error_code = null, updated_at = now()
  where id = p_snapshot_id;
$$;

create or replace function public.rais_fail_snapshot(p_snapshot_id uuid, p_error_code text)
returns void language sql security definer set search_path = public as $$
  update public.rais_employee_snapshots set status = 'failed', lease_expires_at = null,
    last_error_code = left(p_error_code, 120), updated_at = now() where id = p_snapshot_id;
$$;

revoke all on function public.rais_claim_snapshot(text, text, text, integer, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.rais_finish_snapshot(uuid, integer, integer, integer, integer, numeric, numeric, bigint, integer) from public, anon, authenticated;
revoke all on function public.rais_fail_snapshot(uuid, text) from public, anon, authenticated;
grant execute on function public.rais_claim_snapshot(text, text, text, integer, text, text, text, integer) to service_role;
grant execute on function public.rais_finish_snapshot(uuid, integer, integer, integer, integer, numeric, numeric, bigint, integer) to service_role;
grant execute on function public.rais_fail_snapshot(uuid, text) to service_role;
