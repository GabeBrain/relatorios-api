-- Corretor v5 / WS-2: relatório de verificação (attestation). Guarda o que FOI
-- verificado e fechou (tabelas, cruzamentos, raios) — hoje os findings ok:true são
-- descartados, então esse snapshot é a única memória do trabalho positivo do corretor.
alter table public.studies_v3
  add column if not exists relatorio jsonb;

comment on column public.studies_v3.relatorio is
  'v5: snapshot do que foi verificado e fechou na análise (tabelas ok, cruzamentos ok, raios, custo).';
