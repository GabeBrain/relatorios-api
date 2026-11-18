# Base de Conhecimento — Qualificação de Apresentações (Brain)

Base de instruções para o Claude Code automatizar o processo de **qualificação de apresentações** a partir de um deck prévio, de uma publicação Brain ou de dados brutos — reestruturar narrativa, atualizar e localizar dados, aplicar identidade, criar frases de impacto, roteiro de fala e QA visual.

**Objetivo operacional:** sair de ~6–10 interações por apresentação para **1 rodada de perguntas + 1 aprovação de narrativa + 1 entrega**.

---

## Origem do conteúdo

Consolidada a partir dos trabalhos realizados com o Claude entre o 1º semestre e nov/2026 (GRI, INC Campinas/ABRAINC, ADEMI Day, IBRADIM, Lotesphere, COMPLAN, ADIT Cidades, Piracicaba, Rio Preto, Santander, EBEN, propostas comerciais etc.) e do padrão consultivo da skill `brain-avaliacao-recomendacao`.

> Heurísticas marcadas **[calibrar]** devem ser ajustadas com os decks finais reais em `exemplos/`. O deck **Retrofit_ADIT_Cidades_2026** é a primeira referência de "como fica bom" para o modo `evento-de-estudo`.

## Histórico de versões

| Versão | Data | Mudanças |
|---|---|---|
| v1 | out/2026 | Base inicial |
| v3.1 | 12/11/2026 | Revisão pré-desenvolvimento: Neo Sans liberada em números de destaque (doc 02 §4, M8); D2 rebaixada a ALERTA até calibração; heurística de 40 min marcada como não verificada; docs 06 e `comando-qualificar` marcados como substituídos pelas instruções do `relatorios-api`; decisão Opus 5.5 effort medium no doc 07 |
| v3 | nov/2026 | **Manual de Marca incorporado** ao doc 02 (paleta completa com HEX, máx. 2 tons, tipografia e fallback Tahoma, blocos modulares e gradientes diagonais permitidos, iconografia, fotografia, tom de voz e expressões vetadas). **Logos oficiais**, com regra "pequena = sem tagline". **Slide final por consultor** e pergunta obrigatória "quem é o responsável". Novas checagens M5–M8, T10–T11, E3. Novo doc 07: escolha de modelo na API (Sonnet × Opus) |
| v2 | nov/2026 | Teste comparativo de retrofit (doc 01 §5). Novo modo `evento-de-estudo`; identidade `material-fonte`; etapa 1b (atualização e localização); briefing com evento, palestrante, público, atualização e forma, e roteiro de 14 perguntas iniciais; novas checagens (nota de revisão, placeholder, ortografia, capa × briefing, consistência de indicadores, fonte defasada); rubrica com atualidade, relevância local, voz humana, riqueza visual e acabamento |

---

## Documentos (ordem de leitura)

| # | Arquivo | Para quê | Quem consome |
|---|---------|----------|--------------|
| 00 | `README.md` | Visão geral, índice e versões | Você / dev |
| 01 | `01-historico-e-padroes.md` | Inventário, transformações recorrentes e teste comparativo | Claude Code (contexto) |
| 02 | `02-identidade-e-voz-brain.md` | Marca, identidade `material-fonte`, tom, redação | Claude Code (regras duras) |
| 03 | `03-processo-de-qualificacao.md` | **O pipeline**: modos, etapas, gate, saídas | Claude Code (orquestração) |
| 04 | `04-briefing-template.md` | Briefing e perguntas iniciais | Você (preenche) / Claude (pergunta) |
| 05 | `05-checklist-qa.md` | Verificações automáticas + rubrica | Scripts + subagente revisor |
| 06 | `06-arquitetura-claude-code.md` | **Substituído** pelas instruções de desenvolvimento no repositório `relatorios-api`; mantido como histórico | — |
| 07 | `07-modelo-api.md` | Qual modelo usar em cada etapa via API, custo e plano de avaliação | Dev |
| — | `CLAUDE.md` | Arquivo para a raiz do projeto | Claude Code (carrega sempre) |
| — | `comando-qualificar.md` | **Substituído** (slash command do desenho antigo); mantido como histórico | — |

---

## Como colocar em uso (resumo)

1. Crie o repositório conforme `06-arquitetura-claude-code.md`.
2. Copie `CLAUDE.md` para a raiz e `comando-qualificar.md` para `.claude/commands/qualificar.md`.
3. Copie os docs 01–05 para `docs/`.
4. Monte `marca/` com o manual de marca, `logos/` (4 versões de `logo_brain/`), `fontes/` (Neo-sans + Montserrat), `slides-finais/` (de `slide_final_consultores/`) e os decks de referência em `exemplos/` (incluir o deck ADIT Cidades).
5. Para cada trabalho: crie `jobs/<nome>/`, coloque a entrada em `entrada/`, preencha `briefing.yaml` (ou deixe o Claude perguntar) e rode `/qualificar jobs/<nome>`.
