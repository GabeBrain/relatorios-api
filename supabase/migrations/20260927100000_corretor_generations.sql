-- Separa a bancada histórica da geração preparada para handoff.
alter table public.studies_v3
  add column if not exists generation text;

update public.studies_v3 set generation = 'v2' where generation is null;

alter table public.studies_v3
  alter column generation set default 'v3',
  alter column generation set not null;

alter table public.studies_v3
  add constraint studies_v3_generation_check check (generation in ('v2', 'v3'));

comment on column public.studies_v3.generation is
  'v2=bancada histórica de testes; v3=fluxo com fonte numérica para handoff';
