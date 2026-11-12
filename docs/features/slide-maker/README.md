# Slide Maker — documentação

Ferramenta do Rebrain (`/slide-maker`) que transforma o material enviado por um colaborador num deck
no padrão Brain, com perguntas, narrativa aprovada e ajustes pelo chat. Código: `src/features/slide-maker/`
(interface) e `gcp/slide-maker-agent/` (serviço no Cloud Run com o Claude Agent SDK).

| Arquivo | Para quê |
|---|---|
| `INSTRUCOES_DESENVOLVIMENTO.md` | Especificação e ordem de implementação. As respostas do Diego em §15.1 prevalecem sobre o resto do texto |
| `LIVE_regras_slide_maker.md` | **Regras vigentes:** versões do prompt, regras determinísticas × regras do LLM, calibrações. Atualize a cada mudança de comportamento do agente |
| `DEPLOY_GCP.md` | Roteiro de publicação (banco, GCP, deploy, ativação do agente real) |
| `PLANO_LOVABLE_CLOUD_2026-11-12.md` | Escopo, contrato e estado da integração por ponte autenticada |
| `VERIFICAR_LOVABLE_CLOUD_2026-11-12.sql` | Conferência manual somente leitura antes/depois do complemento da ponte |
| `base-conhecimento/` | Base v3 (narrativa, marca, briefing, QA). Vai para a imagem do agente em `kb/` e é a fonte única das regras de conteúdo |
| `referencia/build_domicilios_v3.js` | Build aprovado do teste "Domicílios vagos v3", de onde saiu a `lib/brain-deck` (histórico; não roda isolado) |
| `referencia/data_domicilios_v3.json` | Dados usados pela referência |
| `PROMPT_CLAUDE_CODE.md` | Prompt usado para abrir o desenvolvimento (histórico) |

Origem: testes conduzidos pelo Diego no Claude (Cowork), nov/2026. O repositório é público: fontes Neo Sans,
logos, slides finais e manual **não** ficam aqui. Eles ficam num bucket privado do GCS, baixado no build da
imagem (§15.1 item 1, `DEPLOY_GCP.md` B1).

Esta pasta se chamava `docs/features/apresentacoes/` até a Fase 8 (12/11/2026). Entradas antigas do
`docs/projetos/LIVE_rebrain.md` citam o caminho antigo.
