# CLAUDE.md

As regras deste repositório vivem em `AGENTS.md`, fonte única lida também por Codex e Lovable. Este arquivo
mantém só o bloco do protocolo, por exceção registrada no Observatório (`claudeModo: bloco-proprio`), e
importa o resto. Não duplique regras aqui.

<!-- PROTOCOLO-SESSAO v3 -->
## Protocolo de sessão

Vale para qualquer agente (Claude, Codex, Lovable) e qualquer pessoa trabalhando neste repo.
Existe para que toda sessão comece do mesmo ponto e termine com o trabalho visível para os outros.
Nada aqui bloqueia trabalho.

### Abertura — antes de alterar qualquer arquivo

1. `git remote -v` — descubra **todos** os remotes antes de comparar qualquer coisa. Um fork tem
   dois: `origin` (a sua cópia) e `upstream` (o repositório do time). Não presuma que só existe um.
2. `git fetch --all` — em toda sessão, sem exceção. Os contadores abaixo valem apenas até o último
   fetch: um ref velho relata "em dia" com toda a confiança, e está errado.
3. Compare contra **cada** remote que existir:
   - `git rev-list --left-right --count origin/main...main`
   - `git rev-list --left-right --count upstream/main...main`, se houver `upstream`
4. Agir conforme o caso, **por remote**:

| Situação | O que fazer |
|---|---|
| Em dia, árvore limpa | Seguir. Não dizer nada. |
| Atrás do remoto, árvore limpa | `git pull --ff-only` e **avisar em uma linha** o que entrou. |
| Atrás do remoto, árvore suja | **Não puxar.** Avisar o que há de novo lá e perguntar antes. |
| À frente do remoto | Avisar quantos commits locais existem e desde quando. Não empurrar sozinho. |
| Divergiu (à frente **e** atrás) | Avisar e perguntar. Nunca resolver merge sem o humano. |

**Num fork, estar em dia com o `origin` não diz nada sobre o `upstream`.** É a leitura enganosa
mais comum: o `origin` limpo dá sinal verde enquanto o repositório do time está dezenas de commits
à frente. Relate os dois, sempre, mesmo que um esteja zerado.

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

### Quando você não consegue verificar

Agente sem navegador, sem token, sem credencial ou sem o serviço no ar não consegue confirmar
comportamento em runtime. Isso é limite de ambiente, não falha de tarefa. Nesse caso:

1. **Diga o que não deu para verificar, e por quê.** Nunca omita o passo, nunca conclua por
   plausibilidade, nunca escreva "funcionando" sobre o que você não observou.
2. **Proponha o equivalente headless.** Quase toda checagem manual tem uma versão automatizável:
   em vez de abrir a planilha no Excel, afirme sobre o objeto que a biblioteca gera antes de
   gravar. Costuma custar menos que o passo manual e passa a valer para sempre.
3. Só então siga com o resto da tarefa.

Relatar o limite é entrega, não desistência. Inventar a verificação é o único erro grave aqui.

### Conflito em documento vivo

Os `LIVE_*.md` são logs append-only: todo mundo insere no topo da mesma seção, então colidem em
qualquer trabalho paralelo mesmo sem ninguém discordar. Onde houver `.gitattributes` com
`LIVE_*.md merge=union`, o Git mantém os dois lados sozinho e não abre conflito.

Se ainda assim conflitar, **a resolução é somativa**: preserve todas as entradas dos dois lados,
em ordem decrescente de data. Nenhuma entrada é descartada, resumida ou reescrita — não existe
"escolher um lado" num log. Rotação também não descarta: entradas antigas são movidas sem edição
para `docs/projetos/historico/`, conforme a seção *Rotação* de `docs/projetos/README.md`.

Para conferir que nada se perdeu, use a identidade do merge de três pontos:

```
resolvido = base + (local − base) + (upstream − base)
```

**Somar os dois lados diretamente está errado** — duplica as entradas da base comum e produz um
número que nunca fecha.

### Vínculo com o Monday

**Regra fixa: nunca escreva no Monday por conta própria.**

O Monday é território humano. Nenhum agente — Claude, Codex, Lovable — cria card, comenta,
move status, altera prazo ou responsável sem que uma pessoa peça explicitamente, naquela
sessão, para fazer aquilo. Não há exceção por "a tarefa claramente terminou" nem por
"o commit dizia que concluiu".

O que fazer, em vez disso:

| Situação | Ação correta |
|---|---|
| O trabalho corresponde a um card | **Propor**: "isto fecha o card X — quer que eu comente lá?" e esperar |
| A pessoa pediu ("atualiza o Monday") | Fazer, e dizer o que foi escrito |
| Nenhuma das duas | Não tocar no Monday. Registrar no documento vivo |

Propor é bem-vindo; agir sozinho, não. A diferença é que a proposta custa uma linha e a
pessoa decide em dois segundos, enquanto um comentário indesejado já está no card de todo
mundo e não sai mais.

**Para leitura, o Monday é livre.** Consultar cards para entender contexto — o que está em
andamento, quem é o responsável, qual o escopo acordado — é encorajado, e é para isso que
existe o `MONDAY_MAP.md`. A restrição é só de escrita.

O que a automação faz sozinha: atualiza o painel do Observatório e regenera os documentos
vivos no Drive. O Monday fica de fora, por decisão.

#### Referência ao card no documento vivo

Toda entrada de documento vivo que corresponda a um card traz o campo:

- **Monday:** [Nome do card](https://brain381753.monday.com/boards/<board>/pulses/<itemId>) — `<itemId>`

O link é obrigatório, não só o número: quem lê o doc precisa chegar ao card em um clique.
Este campo é referência, não escrita — ele vive no documento, não no Monday.

Board principal: `Backlogs & Roadmaps` — `18398428946`.
Board de execução semanal: `Entregas` — `18398428948`.
<!-- FIM PROTOCOLO-SESSAO -->

@AGENTS.md
