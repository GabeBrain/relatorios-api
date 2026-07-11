-- Migration: Corretor v3.3 — bucket de imagens-evidência das tabelas com achado
--
-- Ao rodar a visão, a imagem da tabela que gerou achado é persistida (por sha1)
-- para o analista VER o material original grande na tela de correção, ao lado da
-- prova (soma calculada × declarada). Dedup natural por sha1: a mesma imagem
-- reaproveitada em outro estudo não sobe de novo.
--
-- Storage é praticamente de graça (~centavos/ano p/ o volume de estudos), então
-- não há orçamento a gastar aqui. O upload no cliente é best-effort: se o bucket
-- ainda não existir, a análise segue normal (a evidência só não aparece).

insert into storage.buckets (id, name, public)
values ('corretor-evidencias', 'corretor-evidencias', true)
on conflict (id) do nothing;

-- leitura pública (imagens não sensíveis) + escrita liberada (mesmo modelo anon do resto do corretor)
create policy "corretor_evidencias_read" on storage.objects
  for select using (bucket_id = 'corretor-evidencias');

create policy "corretor_evidencias_write" on storage.objects
  for insert with check (bucket_id = 'corretor-evidencias');
