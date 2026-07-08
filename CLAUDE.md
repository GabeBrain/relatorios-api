# CLAUDE.md

## Documentos vivos por projeto (regra de sincronização)

Três projetos convivem neste repo — **Dashboard GeoBrain** (Edgar), **Área Quanti** (Lucas) e
**Rebrain/plataforma** (Gabriel) — cada um com um documento vivo em `docs/projetos/`
(eixos: **Desenvolvimentos**, **Etapas**, **Pendências**).

Ao concluir uma alteração relevante que será enviada via `git push`, atualize o doc vivo do
projeto afetado (entrada nova em *Desenvolvimentos* + ajuste de *Etapas*/*Pendências*) **antes
do push**. Após `pull`/merge, leia as entradas novas para se situar. Convenção completa em
`docs/projetos/README.md`.

- Dashboard GeoBrain → `docs/projetos/LIVE_dashboard-geobrain.md`
- Área Quanti → `docs/projetos/LIVE_area-quanti.md`
- Rebrain → `docs/projetos/LIVE_rebrain.md`

## Corretor de Vocacionais

Ao modificar qualquer parte do **Corretor | Estudos Vocacionais** (`src/features/corretor/`, `supabase/functions/analyze-slide/`, migrations relacionadas ou documentação da feature), atualize o documento vivo:

`docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`

Registre mudanças por versão, separando regras determinísticas, regras IA/LLM, POCs e regras removidas.
