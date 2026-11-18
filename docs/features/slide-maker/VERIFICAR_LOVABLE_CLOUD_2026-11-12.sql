-- Somente leitura: executar ANTES de aplicar SQL, e novamente depois. Não repetir migrations existentes.
select tablename from pg_tables where schemaname='public' and tablename like 'slide\_maker\_%' escape '\' order by tablename;

select c.relname, c.relrowsecurity as rls,
  has_table_privilege('anon',c.oid,'SELECT') as anon_select,
  has_table_privilege('anon',c.oid,'INSERT') as anon_insert,
  has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,
  has_table_privilege('authenticated',c.oid,'INSERT') as authenticated_insert,
  has_table_privilege('service_role',c.oid,'SELECT') as service_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relname like 'slide\_maker\_%' escape '\' order by c.relname;

select id,public,file_size_limit from storage.buckets
where id in ('slide-maker-entrada','slide-maker-saida','slide-maker-trabalho') order by id;

-- Policies genéricas podem alcançar buckets novos. Revisar qual/with_check/roles sem apagar policies alheias.
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where (schemaname='public' and tablename like 'slide\_maker\_%' escape '\') or (schemaname='storage' and tablename='objects')
order by schemaname,tablename,policyname;

select p.proname,p.prosecdef as security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'slide_maker_bridge_%' order by p.proname;

-- Esperado após ambas migrations: 8 tabelas/RLS ativa; anon/authenticated false;
-- 3 buckets public=false; nenhuma policy nas 8 tabelas; 2 RPCs invoker e somente service_role executa.
-- Não consultar conteúdo de trabalhos, tokens, segredos ou resultados idempotentes para compartilhar no chat.
