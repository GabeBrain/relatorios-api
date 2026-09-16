alter table public.empresas_estab_manifesto add column if not exists id_municipio char(7);

update public.empresas_estab_manifesto m
set id_municipio = sub.id_municipio
from (
  select distinct on (manifesto_id) manifesto_id, id_municipio
  from public.empresas_estab_municipio
  order by manifesto_id, id_municipio
) sub
where sub.manifesto_id = m.id and m.id_municipio is null;

delete from public.empresas_estab_manifesto where id_municipio is null;

alter table public.empresas_estab_manifesto alter column id_municipio set not null;

alter table public.empresas_estab_manifesto
  drop constraint if exists empresas_estab_manifesto_competencia_query_version_methodo_key;

do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.empresas_estab_manifesto'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) = 'UNIQUE (competencia, query_version, methodology_version)';
  if c is not null then
    execute format('alter table public.empresas_estab_manifesto drop constraint %I', c);
  end if;
end $$;

create unique index if not exists empresas_estab_manifesto_municipio_competencia_key
  on public.empresas_estab_manifesto (id_municipio, competencia, query_version, methodology_version);

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

revoke all on table public.empresas_estab_manifesto from anon, authenticated;
revoke all on table public.empresas_estab_municipio from anon, authenticated;
revoke all on table public.empresas_estab_municipio_publicado from anon, authenticated;

comment on column public.empresas_estab_manifesto.id_municipio is
  'Município do agregado: cada município possui seu próprio manifesto por competência.';