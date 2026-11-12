# Brain — Qualificador de Apresentações

Este projeto qualifica apresentações da Brain Inteligência Estratégica (consultoria de inteligência de mercado imobiliário) a partir de um deck prévio, de uma publicação Brain (e-book, estudo) ou de dados brutos. Palestrantes frequentes: Fábio Tadeu Araújo (CEO) e Guilherme Werner (sócio consultor), em GRI, ABRAINC, ADEMI, ADIT.

## Leia antes de qualquer trabalho
- `docs/03-processo-de-qualificacao.md` — o pipeline (siga as etapas e o gate)
- `docs/04-briefing-template.md` — briefing e perguntas iniciais
- `docs/02-identidade-e-voz-brain.md` — marca, identidade `material-fonte` e redação (🔒 = obrigatório)
- `docs/05-checklist-qa.md` — critério de pronto
- `docs/01-historico-e-padroes.md` e `exemplos/` — repertório e o teste comparativo de retrofit (§5)

## Regras inegociáveis
1. **Nunca invente número.** Todo dado vem de `entrada/` ou de pesquisa autorizada, registrado em `trabalho/fontes.json` com fonte, período e URL/página.
2. **Uma rodada de perguntas, uma aprovação.** Pergunte só na etapa 0 (doc 04 §2, tudo de uma vez, com defaults) e peça aprovação só da narrativa (etapa 3).
3. **Confirme o responsável pela apresentação, o evento, a cidade e a data.** O responsável define o slide final (`marca/slides-finais/`). O local da agenda não é o nome do evento.
4. **Material-fonte com mais de 6 meses → atualize** (etapa 1b) quando `pode_pesquisar: true`, e localize para a cidade do evento.
5. **Identidade = Manual de Marca** (`marca/manual-de-marca.pdf`, resumido no doc 02). Paleta oficial apenas (verde #5B7537, amarelo #FFD500, azul #1F5F8A e tons do manual; no máximo 2 tons por layout). Neo Sans Pro em caixa alta no título principal e Montserrat no resto; fallback Tahoma. Blocos modulares do manual sim, círculos ou bolas decorativas não. **Logo oficial em imagem; pequena = sem tagline.** `material-fonte` usa a linguagem da publicação dentro da paleta Brain. `cliente-preservado` e `externo` mantêm a identidade do cliente/briefing.
6. Títulos são afirmações (a conclusão do slide), com palavra-chave destacada. Dado → comparativo → leitura → implicação.
7. Nada de "quitinete", linguagem vaga, frases de auditoria, **notas de revisão ou placeholders** no deck. Pendências vão para as notas do orador `[PENDENTE]` e para o `relatorio.md`.
8. O último slide é o slide final do consultor responsável, em imagem e sem alteração.
9. Não entregue com falha 🔒 no `lint_pptx.py`. Máximo 3 ciclos de QA.

## Convenções
- Trabalhos em `jobs/<data>-<nome>/` com `briefing.yaml`, `entrada/`, `trabalho/`, `saida/`.
- Original em `entrada/` nunca é alterado.
- Conteúdo → `trabalho/deck_spec.json` → `scripts/build/build_deck.js`.
- Ativos de marca em `marca/`: `manual-de-marca.pdf`, `logos/` (4 versões), `fontes/`, `slides-finais/` (1 por consultor), `publicacoes/`.
- Idioma: português do Brasil.
