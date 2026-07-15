-- Migration: Corretor v3.3 (Fase A da ata) — amplia ia_passes.tipo p/ 'visao_ata'
--
-- A extração da ata de abertura é um passe de IA como os demais (registrado em
-- ia_passes, custo acumulado em studies_v3.custo_total). O check antigo só aceitava
-- texto/visao_tabela/visao_mapa. Idempotente: dropa o check e recria com a lista nova.

alter table public.ia_passes drop constraint if exists ia_passes_tipo_check;

alter table public.ia_passes
  add constraint ia_passes_tipo_check
  check (tipo in ('texto', 'visao_tabela', 'visao_mapa', 'visao_ata'));
