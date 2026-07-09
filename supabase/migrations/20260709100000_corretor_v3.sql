-- Migration: Corretor v3 — fluxo unificado de correção (DESIGN_corretor_v3.md)
--
-- Sessão de correção persistida: o analista de mercado sobe versões do PPTX,
-- corrige a worklist até 0 pendentes e entrega ao A&R. IDs de achado são
-- estáveis por conteúdo (rule_id) → diff entre versões por set difference.
-- Modelo de acesso anon = demais tabelas do Corretor (ver SECURITY_NOTES.md item 1).

create table if not exists public.studies_v3 (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  status text not null default 'em_correcao' check (status in ('em_correcao', 'pronto')),
  custo_total numeric not null default 0,
  created_at timestamptz not null default now(),
  concluded_at timestamptz
);

create table if not exists public.study_versions (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies_v3(id) on delete cascade,
  n int not null,
  sha1 text,
  n_slides int not null default 0,
  arquivo text,
  created_at timestamptz not null default now(),
  unique (study_id, n)
);

create table if not exists public.findings_v3 (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies_v3(id) on delete cascade,
  rule_id text not null,               -- id estável por conteúdo (ex.: note-41-0)
  tipo text not null,                  -- ErrorType do catálogo
  familia text not null check (familia in ('local', 'relacional')),
  slide_ref text not null,
  titulo text not null,
  detalhe text not null default '',
  payload jsonb,                       -- Finding completo (viz etc.) p/ render
  status text not null default 'pendente' check (status in ('pendente', 'corrigido', 'ignorado')),
  origem text not null default 'DET',  -- DET | IA_texto | IA_visao
  primeira_versao int not null default 1,
  resolvido_na_versao int,
  created_at timestamptz not null default now(),
  unique (study_id, rule_id)
);

alter table public.studies_v3 enable row level security;
alter table public.study_versions enable row level security;
alter table public.findings_v3 enable row level security;

create policy "anon_all_studies_v3" on public.studies_v3
  for all using (true) with check (true);
create policy "anon_all_study_versions" on public.study_versions
  for all using (true) with check (true);
create policy "anon_all_findings_v3" on public.findings_v3
  for all using (true) with check (true);
