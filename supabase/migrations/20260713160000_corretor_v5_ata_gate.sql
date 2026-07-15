-- Corretor v5 / WS-1: portão da ata. A cidade/UF confirmada pelo analista antes
-- dos passes pagos vira a régua do CITY_NAME/WRONG_CONTEXT. A flag evita reabrir
-- o portão em estudos já confirmados.
alter table public.studies_v3
  add column if not exists ata_confirmada boolean not null default false,
  add column if not exists uf text;

comment on column public.studies_v3.ata_confirmada is
  'v5: analista confirmou/editou cidade/UF/pedidos da ata antes da análise paga.';
comment on column public.studies_v3.uf is
  'v5: UF do estudo (da ata ou informada no portão); alimenta WRONG_CONTEXT.';
