# AGENTS.md

<!-- PROTOCOLO-SESSAO v1 -->
## Protocolo de sessão

Vale para qualquer agente (Claude, Codex, Lovable) e qualquer pessoa trabalhando neste repo.
Existe para que toda sessão comece do mesmo ponto e termine com o trabalho visível para os outros.
Nada aqui bloqueia trabalho.

### Abertura — antes de alterar qualquer arquivo

1. `git fetch origin`
2. Comparar: `git rev-list --left-right --count origin/main...main`
3. Agir conforme o caso:

| Situação | O que fazer |
|---|---|
| Em dia, árvore limpa | Seguir. Não dizer nada. |
| Atrás do remoto, árvore limpa | `git pull --ff-only` e **avisar em uma linha** o que entrou. |
| Atrás do remoto, árvore suja | **Não puxar.** Avisar o que há de novo lá e perguntar antes. |
| À frente do remoto | Avisar quantos commits locais existem e desde quando. Não empurrar sozinho. |
| Divergiu (à frente **e** atrás) | Avisar e perguntar. Nunca resolver merge sem o humano. |

Nunca usar `git pull` sem `--ff-only`, e nunca `rebase`/`reset` de histórico já publicado — os
repos são conectados ao Lovable e reescrever histórico corrompe o projeto do outro lado.

### Fechamento — ao encerrar uma entrega

1. Commit isolado, com `git add <caminhos>` explícito. **Nunca** `git add .` ou `-A`: há agentes
   trabalhando em paralelo na mesma árvore.
2. Entrada no documento vivo do projeto, quando a alteração for relevante.
3. **Reportar o que ficou local:** quantos commits estão à frente do remoto e desde quando.
4. **Perguntar se quer enviar.** Nunca fazer `git push` por conta própria — o push dispara
   build/deploy no Lovable e é decisão de quem está tocando a entrega.

Trabalho que não volta para o remoto é invisível para o resto do time e para qualquer leitura
automática. Isso não é regra de conformidade: é a diferença entre o time ver seu avanço ou não.

### Vínculo com o Monday

Toda entrada de documento vivo que corresponda a um card traz o campo:

- **Monday:** [Nome do card](https://brain381753.monday.com/boards/<board>/pulses/<itemId>) — `<itemId>`

O link é obrigatório, não só o número: quem lê o doc precisa chegar ao card em um clique, e o
Radar usa o ID para cruzar commits com cards. Sem esse campo, a entrega não aparece no card
correspondente.

Board principal: `Backlogs & Roadmaps` — `18398428946`.
Board de execução semanal: `Entregas` — `18398428948`.
<!-- FIM PROTOCOLO-SESSAO -->

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

As alterações podem vir do **Lovable**, do **Codex do Lucas** (sobretudo Área Quanti) ou da equipe.
Registre no doc o autor/origem real, mas determine o ambiente pela funcionalidade alterada — nunca
pela ferramenta que gerou o commit. Antes de push/merge, execute
`npm run check:live-docs -- <base> <head>`.

## Fluxo de entrega: `main` direta

Este repositório valida as entregas pela publicação da **`main`**. Portanto, todo trabalho de
produto deve ser desenvolvido, testado, documentado e commitado diretamente na `main`.

- Não criar branches de feature, correção ou experiência; uma feature pode ficar isolada na
  estrutura de `src/features/`, mas sua integração Git é direta na `main`.
- Antes de iniciar alterações, confirmar `git branch --show-current` = `main`, atualizar a base e
  checar a árvore de trabalho.
- Antes de publicar, executar as validações aplicáveis e `npm run check:live-docs -- <base> <head>`.
- Branches locais criadas por engano devem ter seus commits aplicados na `main` e ser removidas
  após a confirmação de que não há trabalho exclusivo nelas.

## Padrão obrigatório: GeoApiScopeEngine

Para qualquer tela que use filtros geográficos e chamadas à API GeoBrain, usar o padrão
`GeoApiScopeEngine` (`src/features/shared/geo-api-scope-engine/`). Fluxo obrigatório:

1. Carregar `/public-api/monitored-cities` (paginando `links.next`).
2. Limitar UF/município às cidades disponíveis para o token.
3. Exigir UF antes de município; ao trocar UF, limpar município.
4. Bloquear chamadas pesadas de histórico até escopo válido.
5. Sem fallback silencioso para `municipios-br.json` (IBGE) — em erro, exibir a falha
   ao usuário e não carregar dashboard/relatório.

Referência funcional original: Relatórios Secovi (`src/pages/TestesArquitetura.tsx`).
Dashboard GeoBrain e CID legado usam o mesmo padrão. Consuma via
`GeoApiScopeSelector` + `useGeoApiScope` do módulo compartilhado.

### Identificação do colaborador (foco por projeto)

Para personalizar as sugestões, descubra **quem é o colaborador ativo** rodando
`git config user.name` e `git config user.email` e cruze com o mapa abaixo. O **projeto foco**
dessa pessoa determina qual doc vivo priorizar nas sugestões de próximo passo.

| Colaborador | git user.email | Projeto foco | Doc vivo |
|---|---|---|---|
| Gabriel | `gabriel.gomes@brain.srv.br` | Rebrain (plataforma) | `docs/projetos/LIVE_rebrain.md` |
| Edgar | _(a confirmar)_ | Dashboard GeoBrain | `docs/projetos/LIVE_dashboard-geobrain.md` |
| Lucas | _(a confirmar)_ | Área Quanti | `docs/projetos/LIVE_area-quanti.md` |

Se a identidade não bater com ninguém do mapa, **pergunte em qual projeto a pessoa está focando**
antes de sugerir próximos passos. O foco é um padrão, não uma trava: se a pessoa pedir algo de
outro projeto, atenda normalmente.

### Ritual de saudação (resumo de status por ambiente)

Quando a interação começar com uma **saudação** ("oi", "olá", "bom dia", "boa tarde",
"boa noite" e variações), antes de responder ao pedido:

1. Consulte `git status`, `git log` desde as entradas mais recentes e os três docs vivos. Não
   altere docs apenas por cumprimentar: reconcilie-os somente quando um commit/merge relevante
   estiver sem registro ou quando Etapas/Pendências estiverem comprovadamente desatualizadas.
2. Responda com um **resumo por ambiente/funcionalidade** (Dashboard GeoBrain, Área Quanti e
   Rebrain, incluindo suas features): última alteração relevante com **data, autor e nome da
   funcionalidade**, estado da etapa e até duas pendências prioritárias. Diga claramente se
   houver árvore de trabalho suja ou `documentação pendente`.
3. Para cada commit relevante sem doc vivo, registre (ou proponha registrar, se faltar contexto)
   uma entrada com ambiente, autor, hashes e impacto em Etapas/Pendências, conforme
   `docs/projetos/README.md`. Commits pequenos de uma só entrega podem ser agrupados.
4. **Depois de apresentar as pendências mais latentes**, pergunte se há algum bug específico que o
   autor queira endereçar. Se não houver, sugira um próximo passo natural focado no projeto do
   colaborador ativo, derivado das Etapas/Pendências.

## Guidelines de frontend — Rebrain

Antes de desenvolver ou alterar interface React, leia
`docs/architecture/FRONTEND_GUIDELINES.md` e o `DESIGN_SYSTEM.md`. Classifique o pedido, reutilize
o padrão/componente existente e cubra os estados de página aplicáveis. Páginas de feature são lazy
por padrão; exceções duradouras (novo primitive, token, fluxo ou desvio de lazy-loading) devem ser
registradas em `docs/architecture/FRONTEND_DECISIONS.md`. No handoff, informe o padrão reutilizado e
os estados verificados. Essas regras se aplicam a Lovable, Codex do Lucas e qualquer outro autor.

## Corretor de Vocacionais

Sempre que alterar qualquer comportamento, regra, prompt, schema, migração, extração ou fluxo relacionado ao **Corretor | Estudos Vocacionais**, atualize também:

`docs/features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`

Use uma nova seção de versão no documento live quando regras forem adicionadas, removidas, renomeadas, reclassificadas entre determinísticas e IA/LLM, ou quando o fluxo de análise mudar.
