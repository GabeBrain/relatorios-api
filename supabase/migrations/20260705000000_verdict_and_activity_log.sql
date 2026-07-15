-- Migration: veredito de revisão (Corretor) + log de atividade por IP
--
-- 1. slide_errors.verdict — a analista marca cada erro como bug real ('bug')
--    ou falso positivo ('fp'). NULL = pendente. Base do loop de calibração
--    do Corretor v2 (ver docs/features/corretor-vocacionais/DESIGN_corretor_v2.md).
-- 2. activity_log — trilha de auditoria leve por IP (sem login por enquanto,
--    decisão registrada em 05/jul/2026). INSERT apenas via service role
--    (edge function log-activity); anon só lê.

-- ============================================================
-- 1. VEREDITO DE REVISÃO
-- ============================================================

alter table public.slide_errors
  add column if not exists verdict text
  check (verdict in ('bug', 'fp'));

-- anon precisa de UPDATE para salvar o veredito (mesmo modelo de acesso
-- das demais policies do Corretor — ver SECURITY_NOTES.md item 1)
create policy "anon_update_errors"
  on public.slide_errors for update
  using (true)
  with check (true);

-- ============================================================
-- 2. LOG DE ATIVIDADE (por IP)
-- ============================================================

create table if not exists public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action     text not null,
  detail     text not null default '',
  ip         text not null default ''
);

create index if not exists activity_log_created_at_desc_idx
  on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

-- Leitura aberta (feed da Home); escrita SOMENTE via service role
-- (edge function log-activity captura o IP do request) — sem policy de
-- INSERT para anon de propósito.
create policy "anon_select_activity"
  on public.activity_log for select
  using (true);
