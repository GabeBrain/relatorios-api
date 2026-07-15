-- Migration: conclusão de revisão do Corretor (persistência de thumbnails)
--
-- Fase E (§5 do HANDOFF_fase_e_interface.md): as thumbnails passam a ser
-- persistidas para TODOS os slides (não só os com erro), para auditar falsos
-- negativos. Ao concluir a revisão, as imagens dos slides sem erro são podadas.
--
-- projects.reviewed_at — carimbo de "revisão concluída". NULL = em revisão.

alter table public.projects
  add column if not exists reviewed_at timestamptz;

-- anon precisa de UPDATE em projects para marcar a revisão como concluída
-- (mesmo modelo de acesso das demais policies do Corretor — ver SECURITY_NOTES.md item 1)
create policy "anon_update_projects"
  on public.projects for update
  using (true)
  with check (true);
