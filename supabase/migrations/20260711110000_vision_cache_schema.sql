-- Migration: Corretor v3.3 — versionamento do cache de visão + modelo usado
--
-- Ao melhorar a extração/validação (cross-check %↔absoluto, escalonamento p/ 4o),
-- o cache antigo precisa ser reprocessado — senão uma leitura ruim fica presa por
-- sha1 para sempre. `schema_version` marca a versão da lógica que gerou o payload:
-- o cliente ignora (re-extrai) entradas com schema_version < atual. `model` guarda
-- qual modelo produziu a leitura final (mini ou, após escalonamento, 4o).

alter table public.vision_cache
  add column if not exists schema_version int not null default 1,
  add column if not exists model text;

-- entradas anteriores (schema 1) serão reprocessadas na próxima análise que as tocar.
