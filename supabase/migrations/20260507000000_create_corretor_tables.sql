-- Migration: Corretor | Estudos Vocacionais
-- Creates tables for the PDF slide analysis feature migrated from Corretor-Projetos-AeR
-- Project: mxinpvcqzbfbzjodhgtz

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),
  saved_at            timestamptz not null default now(),
  project_name        text not null,
  city_name           text not null,
  radii               text not null,
  model               text not null,
  total_slides        integer not null default 0,
  slides_ok           integer not null default 0,
  slides_with_errors  integer not null default 0,
  slides_skipped      integer not null default 0,
  slides_error        integer not null default 0,
  total_errors        integer not null default 0,
  total_cost          numeric not null default 0,
  total_input_tokens  integer not null default 0,
  total_output_tokens integer not null default 0,
  report_text         text not null default ''
);

create table if not exists public.slides (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  slide_number  integer not null,
  status        text not null,
  has_data      boolean not null default false,
  summary       text not null default '',
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cost          numeric not null default 0,
  image_path    text
);

create table if not exists public.slide_errors (
  id          uuid primary key default gen_random_uuid(),
  slide_id    uuid not null references public.slides(id) on delete cascade,
  type        text not null,
  severity    text not null,
  description text not null,
  location    text not null default ''
);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists slides_project_id_idx       on public.slides(project_id);
create index if not exists slide_errors_slide_id_idx   on public.slide_errors(slide_id);
create index if not exists projects_saved_at_desc_idx  on public.projects(saved_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- Corretor runs without user login (anon key only)
-- Tables are internal tooling — anon access is intentional
-- ============================================================

alter table public.projects    enable row level security;
alter table public.slides      enable row level security;
alter table public.slide_errors enable row level security;

-- projects
create policy "anon_select_projects"  on public.projects  for select  using (true);
create policy "anon_insert_projects"  on public.projects  for insert  with check (true);
create policy "anon_delete_projects"  on public.projects  for delete  using (true);

-- slides
create policy "anon_select_slides"    on public.slides    for select  using (true);
create policy "anon_insert_slides"    on public.slides    for insert  with check (true);

-- slide_errors
create policy "anon_select_errors"    on public.slide_errors for select using (true);
create policy "anon_insert_errors"    on public.slide_errors for insert with check (true);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public)
values ('slide-thumbnails', 'slide-thumbnails', false)
on conflict (id) do nothing;

-- Storage policies for slide-thumbnails (anon read/write for internal tooling)
create policy "anon_upload_thumbnails"
  on storage.objects for insert
  with check (bucket_id = 'slide-thumbnails');

create policy "anon_read_thumbnails"
  on storage.objects for select
  using (bucket_id = 'slide-thumbnails');

create policy "anon_delete_thumbnails"
  on storage.objects for delete
  using (bucket_id = 'slide-thumbnails');
