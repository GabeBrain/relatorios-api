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

## Corretor de Vocacionais

Sempre que alterar qualquer comportamento, regra, prompt, schema, migração, extração ou fluxo relacionado ao **Corretor | Estudos Vocacionais**, atualize também:

`docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`

Use uma nova seção de versão no documento live quando regras forem adicionadas, removidas, renomeadas, reclassificadas entre determinísticas e IA/LLM, ou quando o fluxo de análise mudar.
