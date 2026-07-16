do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read quanti-datasets') then
    create policy "Public read quanti-datasets"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'quanti-datasets');
  end if;
end $$;