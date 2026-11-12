---
description: Qualifica uma apresentação de ponta a ponta (briefing → atualização → narrativa → deck → QA → entrega)
argument-hint: <pasta do job, ex. jobs/2026-11-adit-retrofit>
---

> ⚠️ **SUBSTITUÍDO em 12/11/2026.** Este documento descreve o desenho antigo (projeto Claude Code com pastas `jobs/` e comando `/qualificar`). O sistema em desenvolvimento segue `docs/features/apresentacoes/INSTRUCOES_DESENVOLVIMENTO.md` no repositório `relatorios-api`. Mantido só como histórico; não usar como instrução.

Qualifique a apresentação do job em `$ARGUMENTS` seguindo `docs/03-processo-de-qualificacao.md`.

1. **Intake** — Leia `$ARGUMENTS/briefing.yaml` e os anexos. Confira os campos críticos (`modo`, `responsavel`, `evento_nome_oficial`, `cidade`, `data`, `palestrante`, `publico`, `tempo_fala_min`, `identidade`, `objetivo`, `pode_pesquisar`). Se faltar algo, faça UMA rodada com as perguntas do doc 04 §2 que ainda estiverem em aberto, com opção recomendada em cada. Se `auto_aprovar: true`, aplique os defaults e siga.
2. **Inventário** — Extraia texto, números (com página), citações, imagens e ilustrações da entrada. Monte `trabalho/inventario.json`, `trabalho/fontes.json` e `trabalho/assets/`.
3. **Atualização e localização** — Se `pode_pesquisar: true`: pesquise o que mudou desde a publicação, 2–3 fatos da cidade do evento e o contexto "por que agora". Registre em `trabalho/atualizacao.md` com fonte e data.
4. **Diagnóstico** — Agente `diagnosticador` → `trabalho/diagnostico.md` (inclui ativos visuais disponíveis).
5. **Narrativa** — `trabalho/narrativa.md` (tese, evento, blocos, título-afirmação por slide, visual, origem do dado, etiqueta "atualizado", tempo). Se `auto_aprovar` for false, PARE e apresente a narrativa com o diagnóstico em até 5 linhas e a lista do que foi atualizado.
6. **Produção** — `deck_spec.json` → `build_deck.js` com a identidade escolhida (`brain` ou `material-fonte`).
7. **QA** — Render + `lint_pptx.py` + agente `revisor`. Corrija até zero falhas 🔒 e notas ≥ 4 (máx. 3 ciclos).
8. **Complementares** — Roteiro com ponte para a sessão seguinte, sem as expressões vetadas pelo manual; notas do orador; QR code; versões extras. Último slide = slide final do `responsavel`.
9. **Entrega** — `saida/` + `relatorio.md` (antes → depois, decisões automáticas, atualizações com fonte, pendências, QA). Responda com um resumo de 3–5 linhas e a lista de arquivos.
