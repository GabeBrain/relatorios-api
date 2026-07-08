# AGENTS.md

## Documentos vivos por projeto (regra de sincronização)

O repositório abriga três projetos — **Dashboard GeoBrain** (Edgar), **Área Quanti** (Lucas) e
**Rebrain/plataforma** (Gabriel). Cada um tem um documento vivo em [`docs/projetos/`](docs/projetos/README.md)
com três eixos: **Desenvolvimentos**, **Etapas** e **Pendências**.

Sempre que você fizer uma alteração relevante (novo motor, endpoint, regra, correção
significativa, mudança de fluxo/UI) que será sincronizada via git (`push`), **atualize o doc
vivo do projeto afetado** antes do push: adicione uma entrada em *Desenvolvimentos* e ajuste
*Etapas*/*Pendências*. Ao dar `pull`/merge, leia as entradas novas para se situar.
Ver a convenção completa em [`docs/projetos/README.md`](docs/projetos/README.md).

- Dashboard GeoBrain → `docs/projetos/LIVE_dashboard-geobrain.md`
- Área Quanti → `docs/projetos/LIVE_area-quanti.md`
- Rebrain → `docs/projetos/LIVE_rebrain.md`

### Ritual de saudação (revisão de status)

Quando a interação começar com uma **saudação** ("oi", "olá", "bom dia", "boa tarde",
"boa noite" e variações), antes de responder ao pedido:

1. Verifique o que mudou desde o último sync (`git log`/`git status` e o diff dos docs) e
   **reconcilie os documentos vivos** dos projetos afetados: atualize **Etapas** (marque o que
   virou ✅/🟡) e **Pendências** (remova o resolvido, registre o que surgiu). Se nada mudou,
   apenas confirme que os docs continuam fiéis ao estado atual.
2. Ao final da resposta, **pergunte se há algum bug específico mais urgente** a tratar.
3. Se não houver, ofereça **uma sugestão de próximo passo natural** — derivada das *Etapas*
   em andamento (🟡) ou das *Pendências* de maior prioridade no doc vivo do projeto ativo.

## Corretor de Vocacionais

Sempre que alterar qualquer comportamento, regra, prompt, schema, migração, extração ou fluxo relacionado ao **Corretor | Estudos Vocacionais**, atualize também:

`docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`

Use uma nova seção de versão no documento live quando regras forem adicionadas, removidas, renomeadas, reclassificadas entre determinísticas e IA/LLM, ou quando o fluxo de análise mudar.
