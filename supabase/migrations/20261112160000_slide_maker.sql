-- Slide Maker — fundação de dados (docs/features/apresentacoes/INSTRUCOES_DESENVOLVIMENTO.md §7 e §15.1).
--
-- Regra de acesso: estas tabelas e buckets NÃO têm nenhuma policy. anon e authenticated não leem nem
-- escrevem. Todo acesso passa pelo serviço gcp/slide-maker-agent (service role), que valida o token
-- do trabalho. Diferente do Corretor (SECURITY_NOTES §1), arquivos de clientes não ficam legíveis
-- para quem descobrir a URL do Supabase.
--
-- Retenção (§15.1 item 2): entrada/ e trabalho/ por 180 dias; versões e relatório permanecem.

create table public.slide_maker_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  titulo text check (titulo is null or char_length(titulo) between 1 and 200),
  contexto text check (contexto is null or char_length(contexto) <= 500),
  -- Identifica o autor; NÃO autoriza nada (§8). Sempre minúsculo e do domínio Brain.
  colaborador_email text not null
    check (colaborador_email = lower(colaborador_email) and colaborador_email ~ '^[^@[:space:]]+@brain\.srv\.br$'),
  responsavel text check (responsavel in ('fabio', 'guilherme', 'finoti', 'outro')),
  estado text not null default 'rascunho' check (estado in (
    'rascunho', 'analisando', 'aguardando_respostas', 'pesquisando_e_narrando', 'aguardando_aprovacao',
    'produzindo', 'revisando', 'entregue', 'ajustando', 'erro', 'cancelado')),
  fase_em_curso text check (fase_em_curso in ('F1', 'F2', 'F3', 'F4')),
  erro_fase text check (erro_fase in ('F1', 'F2', 'F3', 'F4')),
  versao_atual integer not null default 0 check (versao_atual >= 0),
  -- sha256 (hex) do token de 32 bytes devolvido uma única vez no POST /jobs.
  token_acesso_hash text not null check (token_acesso_hash ~ '^[0-9a-f]{64}$'),
  erro text,
  -- Preenchido pelo job de limpeza quando entrada/ e trabalho/ forem apagados (180 dias).
  arquivos_expurgados_em timestamptz,
  check ((estado = 'erro') = (erro_fase is not null))
);
comment on table public.slide_maker_jobs is 'Slide Maker: um trabalho (deck). Sem policies: acesso só pelo serviço com service role.';
create index slide_maker_jobs_recentes on public.slide_maker_jobs (created_at desc);
create index slide_maker_jobs_email on public.slide_maker_jobs (colaborador_email, created_at desc);

create table public.slide_maker_mensagens (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.slide_maker_jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  autor text not null check (autor in ('usuario', 'agente', 'sistema')),
  tipo text not null check (tipo in (
    'texto', 'arquivos', 'perguntas', 'respostas', 'narrativa', 'aprovacao', 'progresso', 'entrega', 'erro')),
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object')
);
create index slide_maker_mensagens_job on public.slide_maker_mensagens (job_id, created_at);

create table public.slide_maker_arquivos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.slide_maker_jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  nome text not null check (char_length(nome) between 1 and 255),
  mime text not null,
  bytes bigint not null check (bytes >= 0),
  storage_path text not null unique,
  origem text not null check (origem in ('entrada', 'saida'))
);
create index slide_maker_arquivos_job on public.slide_maker_arquivos (job_id, created_at);

create table public.slide_maker_versoes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.slide_maker_jobs (id) on delete cascade,
  versao integer not null check (versao > 0),
  created_at timestamptz not null default now(),
  storage_path text not null,
  deck_spec jsonb,
  mudancas text[] not null default '{}' check (cardinality(mudancas) <= 3),
  qa jsonb,
  unique (job_id, versao)
);

create table public.slide_maker_relatorios (
  job_id uuid not null references public.slide_maker_jobs (id) on delete cascade,
  versao integer not null check (versao > 0),
  markdown text not null,
  fontes jsonb,
  created_at timestamptz not null default now(),
  primary key (job_id, versao)
);

-- Registro de cada execução de fase (§15.1 item 9). Sem custo (fora da v1, §11).
--  · uma fase por trabalho, garantida pelo índice único parcial abaixo;
--  · rate limit por e-mail e por IP que vale entre instâncias do Cloud Run;
--  · idempotência com o Cloud Tasks (tarefa_nome único).
create table public.slide_maker_fases (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.slide_maker_jobs (id) on delete cascade,
  fase text not null check (fase in ('F1', 'F2', 'F3', 'F4')),
  status text not null default 'enfileirada'
    check (status in ('enfileirada', 'executando', 'concluida', 'erro', 'cancelada')),
  colaborador_email text not null,
  ip inet,
  tarefa_nome text unique,
  criada_em timestamptz not null default now(),
  iniciada_em timestamptz,
  finalizada_em timestamptz,
  erro text
);
create unique index slide_maker_fases_uma_por_job on public.slide_maker_fases (job_id)
  where status in ('enfileirada', 'executando');
create index slide_maker_fases_email on public.slide_maker_fases (colaborador_email, criada_em desc);
create index slide_maker_fases_ip on public.slide_maker_fases (ip, criada_em desc);

create function public.slide_maker_touch_updated_at() returns trigger
  language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end $$;
create trigger slide_maker_jobs_touch before update on public.slide_maker_jobs
  for each row execute function public.slide_maker_touch_updated_at();
revoke all on function public.slide_maker_touch_updated_at() from public, anon, authenticated;

-- RLS ligada e nenhuma policy: anon e authenticated ficam sem acesso. service_role ignora RLS.
alter table public.slide_maker_jobs enable row level security;
alter table public.slide_maker_mensagens enable row level security;
alter table public.slide_maker_arquivos enable row level security;
alter table public.slide_maker_versoes enable row level security;
alter table public.slide_maker_relatorios enable row level security;
alter table public.slide_maker_fases enable row level security;

revoke all on table public.slide_maker_jobs from anon, authenticated;
revoke all on table public.slide_maker_mensagens from anon, authenticated;
revoke all on table public.slide_maker_arquivos from anon, authenticated;
revoke all on table public.slide_maker_versoes from anon, authenticated;
revoke all on table public.slide_maker_relatorios from anon, authenticated;
revoke all on table public.slide_maker_fases from anon, authenticated;

-- Buckets privados (§7.2). Sem policy em storage.objects: só o serviço acessa; downloads por URL
-- assinada de curta duração. "do update" garante privado mesmo se o bucket já existir.
insert into storage.buckets (id, name, public, file_size_limit) values
  ('slide-maker-entrada', 'slide-maker-entrada', false, 52428800),
  ('slide-maker-saida', 'slide-maker-saida', false, 209715200),
  ('slide-maker-trabalho', 'slide-maker-trabalho', false, null)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
