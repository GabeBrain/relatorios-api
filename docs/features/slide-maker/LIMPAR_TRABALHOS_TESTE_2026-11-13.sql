-- Slide Maker — remover trabalhos de diagnóstico/teste da lista "Todos os trabalhos" (Lovable Cloud).
-- Executar MANUALMENTE no SQL do Lovable, projeto mxinpvcqzbfbzjodhgtz. Não remove trabalhos reais.
-- Critério: criados até 13/11/2026 por e-mails de teste OU com títulos de diagnóstico/E2E.
-- O trabalho dourado 1 e o 164ecad0… (mantido para auditoria por Gabriel, ver evidencias/2026-11-13_infra.json) NÃO entram.

-- 1) CONFERÊNCIA — rode primeiro e confira a lista (esperado em 13/11 à tarde: os 6 itens visíveis
--    na interface + os ensaios do testar-infra.py). Anote a contagem.
select id, created_at, colaborador_email, titulo, estado
from public.slide_maker_jobs
where created_at < timestamptz '2026-11-14 00:00:00-03'
  and (
    colaborador_email in ('slide-maker-diagnostico@brain.srv.br', 'teste.e2e@brain.srv.br')
    or titulo like '[DIAGNOSTICO GOOGLE]%'
    or titulo like '[DIAGNÓSTICO SINTÉTICO]%'
    or titulo = 'E2E — Domicílios vagos'
  )
  and titulo not ilike 'Dourado%'
  and id <> '164ecad0-35d0-4875-bd6f-19f00f120d22'
order by created_at;

-- Caminhos no Storage desses trabalhos (para apagar depois pela ferramenta de Storage do Lovable,
-- nos buckets slide-maker-entrada, slide-maker-saida e slide-maker-trabalho; prefixo = id do trabalho).
select a.job_id, a.storage_path
from public.slide_maker_arquivos a
join public.slide_maker_jobs j on j.id = a.job_id
where j.created_at < timestamptz '2026-11-14 00:00:00-03'
  and (
    j.colaborador_email in ('slide-maker-diagnostico@brain.srv.br', 'teste.e2e@brain.srv.br')
    or j.titulo like '[DIAGNOSTICO GOOGLE]%'
    or j.titulo like '[DIAGNÓSTICO SINTÉTICO]%'
    or j.titulo = 'E2E — Domicílios vagos'
  )
  and j.titulo not ilike 'Dourado%'
  and j.id <> '164ecad0-35d0-4875-bd6f-19f00f120d22'
order by a.job_id;

-- 2) REMOÇÃO — mensagens, arquivos, versões, relatórios e fases saem em cascata.
--    Troque 0 pela contagem anotada na conferência: se não bater, nada é apagado.
do $$
declare
  esperado constant integer := 0;  -- <- contagem da conferência
  removidos integer;
begin
  delete from public.slide_maker_jobs
  where created_at < timestamptz '2026-11-14 00:00:00-03'
    and (
      colaborador_email in ('slide-maker-diagnostico@brain.srv.br', 'teste.e2e@brain.srv.br')
      or titulo like '[DIAGNOSTICO GOOGLE]%'
      or titulo like '[DIAGNÓSTICO SINTÉTICO]%'
      or titulo = 'E2E — Domicílios vagos'
    )
    and titulo not ilike 'Dourado%'
    and id <> '164ecad0-35d0-4875-bd6f-19f00f120d22';
  get diagnostics removidos = row_count;
  if removidos <> esperado then
    raise exception 'Esperado %, removeria %: nada foi apagado.', esperado, removidos;
  end if;
  raise notice 'Removidos: %', removidos;
end $$;
