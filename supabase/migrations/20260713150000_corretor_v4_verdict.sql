-- Corretor v4: loop de calibração na própria worklist.
alter table public.findings_v3
  add column if not exists verdict text check (verdict in ('bug', 'fp'));

comment on column public.findings_v3.verdict is
  'Veredito do analista: bug real ou falso positivo; v4 usa fp sem apagar o achado.';
