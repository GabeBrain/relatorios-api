-- Fonte numérica estruturada por estudo. Mantida fora de studies_v3 para a
-- listagem do Corretor não transferir centenas de KB por card.
create table if not exists public.study_sources_v3 (
  study_id uuid primary key references public.studies_v3(id) on delete cascade,
  filename text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.study_sources_v3 enable row level security;

create policy "anon_all_study_sources_v3" on public.study_sources_v3
  for all using (true) with check (true);

comment on table public.study_sources_v3 is
  'fonte.json validado usado pelo SOURCE_CROSSCHECK; carregado apenas ao abrir o estudo';
