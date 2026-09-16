-- Empresas (piloto): somente agregados de estabelecimentos; nunca CNPJs individuais.
-- A carga é feita por job externo. A aplicação lê apenas a view publicada.

create table if not exists public.empresas_estab_manifesto (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  estabelecimentos_particao date not null,
  empresas_particao date not null,
  simples_lido_em timestamptz,
  query_version text not null,
  methodology_version text not null,
  fonte text not null default 'Base dos Dados · CNPJ · BigQuery',
  origem_estabelecimentos_modificado_em timestamptz,
  origem_estabelecimentos_linhas bigint,
  origem_estabelecimentos_bytes bigint,
  origem_empresas_modificado_em timestamptz,
  origem_empresas_linhas bigint,
  origem_empresas_bytes bigint,
  bytes_processados bigint,
  linhas_geradas integer,
  status text not null default 'staging' check (status in ('staging', 'ok', 'falha')),
  erro_codigo text,
  gerado_em timestamptz not null default now(),
  publicado_em timestamptz,
  unique (competencia, query_version, methodology_version)
);

create table if not exists public.empresas_estab_municipio (
  manifesto_id uuid not null references public.empresas_estab_manifesto(id) on delete cascade,
  id_municipio char(7) not null,
  cnae_secao char(2) not null,
  porte char(2) not null,
  matriz_filial smallint not null check (matriz_filial in (1, 2)),
  -- Estado da tabela simples no momento da carga; não representa uma foto histórica.
  regime_simples text not null check (regime_simples in ('mei', 'simples', 'nenhum')),
  quantidade integer not null check (quantidade >= 0),
  primary key (manifesto_id, id_municipio, cnae_secao, porte, matriz_filial, regime_simples)
);

create index if not exists empresas_estab_municipio_lookup_idx
  on public.empresas_estab_municipio (id_municipio, manifesto_id);

create or replace view public.empresas_estab_municipio_publicado
with (security_invoker = true) as
select
  f.manifesto_id,
  m.competencia,
  m.estabelecimentos_particao,
  m.empresas_particao,
  m.simples_lido_em,
  m.query_version,
  m.methodology_version,
  m.fonte,
  f.id_municipio,
  f.cnae_secao,
  f.porte,
  f.matriz_filial,
  f.regime_simples,
  f.quantidade
from public.empresas_estab_municipio f
join public.empresas_estab_manifesto m on m.id = f.manifesto_id
where m.status = 'ok';

alter table public.empresas_estab_manifesto enable row level security;
alter table public.empresas_estab_municipio enable row level security;

-- Nenhum papel de cliente lê ou escreve fatos/manifestos diretamente.
revoke all on table public.empresas_estab_manifesto from anon, authenticated;
revoke all on table public.empresas_estab_municipio from anon, authenticated;
revoke all on table public.empresas_estab_municipio_publicado from anon, authenticated;

comment on table public.empresas_estab_manifesto is
  'Auditoria e publicação atômica do agregado CNPJ por competência.';
comment on column public.empresas_estab_manifesto.simples_lido_em is
  'A tabela simples não possui foto por competência; registra quando seu estado atual foi lido.';
comment on column public.empresas_estab_municipio.regime_simples is
  'Estado cadastral atual de Simples/MEI, não regime histórico da competência.';
