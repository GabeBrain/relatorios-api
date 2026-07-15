-- Migration: Corretor v3.2 — cache de extração de visão (Fase C produtizada)
--
-- Uma imagem de tabela extraída NUNCA é reprocessada: o payload fica cacheado
-- por sha1 da imagem. Compartilhado entre estudos/versões (a mesma imagem
-- reaproveitada em outro deck sai de graça).

create table if not exists public.vision_cache (
  sha1 text primary key,
  payload jsonb not null,           -- { tables: [{ title, columns, rows, totals? }] }
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.vision_cache enable row level security;

create policy "anon_all_vision_cache" on public.vision_cache
  for all using (true) with check (true);
