-- Corretor v5 / WS-5: fila da calibradora.
alter table public.findings_v3
  add column if not exists verdict_revisado boolean not null default false;

comment on column public.findings_v3.verdict_revisado is
  'v5: indica que um falso positivo já foi reconhecido pela calibradora; não muda o veredito original.';

create index if not exists findings_v3_fp_calibration_idx
  on public.findings_v3 (tipo, verdict_revisado)
  where verdict = 'fp';
