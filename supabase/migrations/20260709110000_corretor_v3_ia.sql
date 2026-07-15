-- Migration: Corretor v3.1 — passes de IA (texto/visão) com custo por estudo
--
-- Cada execução de IA vira uma linha em ia_passes; o custo acumula em
-- studies_v3.custo_total. Modelo de acesso anon = demais tabelas do Corretor.

create table if not exists public.ia_passes (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies_v3(id) on delete cascade,
  tipo text not null check (tipo in ('texto', 'visao_tabela', 'visao_mapa')),
  escopo text,                       -- ex.: "121 slides · 11 batches · gpt-4o-mini"
  custo_usd numeric not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ia_passes enable row level security;

create policy "anon_all_ia_passes" on public.ia_passes
  for all using (true) with check (true);
