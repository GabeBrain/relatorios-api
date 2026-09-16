-- Validação do Fechamento: aprovações auditáveis e imutáveis de divergências.
-- A UI não acessa esta tabela diretamente; somente a Edge Function exclusiva
-- usa service_role para ler e inserir registros.

create table if not exists public.validacao_fechamento_aprovacoes (
  approval_key text primary key,
  city text not null,
  building_id text not null,
  typology_id text not null,
  period text not null,
  field text not null,
  divergence text not null,
  rule text not null,
  approved_by_email text not null,
  approved_at timestamptz not null default now()
);

create index if not exists validacao_fechamento_aprovacoes_city_idx
  on public.validacao_fechamento_aprovacoes (city, approved_at desc);

alter table public.validacao_fechamento_aprovacoes enable row level security;

revoke all on public.validacao_fechamento_aprovacoes from anon, authenticated;
grant select, insert on public.validacao_fechamento_aprovacoes to service_role;

create or replace function public.validacao_fechamento_bloquear_alteracao_aprovacao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Aprovações da Validação do Fechamento são imutáveis.';
end;
$$;

drop trigger if exists validacao_fechamento_aprovacoes_immutable
  on public.validacao_fechamento_aprovacoes;

create trigger validacao_fechamento_aprovacoes_immutable
before update or delete on public.validacao_fechamento_aprovacoes
for each row execute function public.validacao_fechamento_bloquear_alteracao_aprovacao();
