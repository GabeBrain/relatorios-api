# Projetos — Documentos Vivos

Este repositório abriga **três projetos** que evoluem em paralelo, cada um tocado
majoritariamente por uma pessoa, mas colaborados via git. Cada projeto tem um
**documento vivo** próprio que registra seu estado de desenvolvimento.

| Projeto | Responsável | Documento vivo | Rota principal |
|---|---|---|---|
| **Dashboard GeoBrain** | Edgar | [`LIVE_dashboard-geobrain.md`](./LIVE_dashboard-geobrain.md) | `/dash-geobrain` |
| **Área Quanti** | Lucas | [`LIVE_area-quanti.md`](./LIVE_area-quanti.md) | `/quanti` |
| **Rebrain** (plataforma) | Gabriel | [`LIVE_rebrain.md`](./LIVE_rebrain.md) | `/inicio`, `/rebrain/*`, `/auditoria`, `/qualidade/*`, `/apis/*` |

> A feature **Corretor \| Estudos Vocacionais** pertence ao Rebrain, mas mantém seu
> próprio doc vivo detalhado em
> [`../features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md`](../features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md).
> O doc do Rebrain apenas referencia esse arquivo — mudanças de regra do Corretor vão lá.

## Os três eixos de cada documento

Cada doc vivo é organizado nos mesmos três eixos:

1. **Desenvolvimentos** — log cronológico das alterações relevantes (ambiente/funcionalidade,
   o que mudou, por quê, arquivos tocados, autor e commits). Entrada nova no topo.
2. **Etapas** — o roadmap/marcos do projeto e o status de cada um.
3. **Pendências** — backlog, bloqueios, dívidas técnicas e decisões em aberto.

## Convenção de atualização (regra de sincronização)

**Sempre que o repositório sincronizar (`git push` ou `git pull`/merge), o doc vivo do
projeto afetado pela alteração deve ser atualizado** — antes ou logo após a interação que
introduziu a mudança. Na prática:

- **Antes de um `push`**: se sua alteração é relevante (novo motor, endpoint, regra, correção
  significativa, mudança de fluxo/UI), adicione uma entrada em **Desenvolvimentos** e ajuste
  **Etapas**/**Pendências** conforme o caso.
- **Depois de um `pull`/merge**: leia as entradas novas do(s) doc(s) para se situar sobre o
  que mudou no trabalho dos colegas.

## Fluxo de trabalho e publicação

A publicação é validada a partir da **`main`**. Assim, o repositório adota fluxo direto: cada
alteração deve ser implementada, testada, documentada e commitada na `main`, mantendo o isolamento
por módulo/feature no código e não por branch Git.

- Antes de editar: confirmar que a branch atual é `main` e que a árvore está limpa.
- Antes do push: rodar a suite proporcional ao impacto e `npm run check:live-docs -- <base> <head>`.
- Não abrir pull request nem branch para trabalho regular. Caso uma branch seja criada por engano,
  aplique somente os commits pretendidos na `main`, confirme o resultado e exclua a branch local.

### Fonte de verdade e conciliação

O **commit/merge é a evidência técnica** e o documento vivo é a **leitura operacional** dessa
evidência. Um não substitui o outro. Para impedir que se desencontrem:

- Todo commit relevante precisa indicar, na mensagem ou no doc, o **ambiente/funcionalidade**
  afetado; se tocar mais de um, registre cada um.
- Antes do push, inclua na entrada do doc os hashes curtos dos commits que ela resume. Um conjunto
  de commits pequenos da mesma entrega pode virar uma única entrada.
- Depois de pull/merge, compare os commits novos com os docs dos ambientes alterados. Se faltar
  documentação, crie a entrada retroativa com o autor real do commit e ajuste Etapas/Pendências.
- Não crie entrada para formatação/typo isolado; quando a alteração mudar comportamento,
  integração, regra, UX, dado ou entrega, a documentação é obrigatória.

Alterações puramente triviais (formatação, typo, ajuste de comentário) não exigem entrada.

### Marcadores de status (vocabulário compartilhado)

Reaproveitamos o vocabulário do doc vivo do Corretor:

- `RUNTIME` — aplicado hoje pelo app.
- `POC` — existe como prova de conceito/script, ainda não integrado.
- `PLANEJADA` — documentada, sem implementação runtime.
- `REMOVIDA` — existia antes e foi retirada.

Para **Etapas** usamos também: ✅ concluída · 🟡 em andamento · 🔲 não iniciada.

## Modelo de entrada (Desenvolvimentos)

```
### AAAA-MM-DD — <título curto> — <autor>
- **Ambiente/funcionalidade:** `<rota ou módulo>` — <nome compreensível da capacidade alterada>
- **O quê:** <resumo da mudança>
- **Por quê:** <motivo/contexto>
- **Arquivos:** `caminho/arquivo.ts`, ...
- **Commits:** `<hash-curto>`, ...
- **Impacto em Etapas/Pendências:** <o que virou ✅ ou o que abriu de novo>
```

## Contrato de resumo em saudações

Uma saudação abre uma revisão rápida do estado compartilhado, não uma alteração automática de
documentação. O resumo deve ser baseado em `git status`, commits desde a última entrada dos docs
e em **todos os documentos vivos**, organizado por ambiente. Para cada ambiente, informar: última
alteração relevante (data, autor e funcionalidade), status atual e até duas pendências prioritárias.
Se houver commit relevante sem entrada, sinalizar explicitamente `documentação pendente` e
propor/registrar a conciliação antes do próximo push.

## Origens de alteração e proteção do fluxo

As mudanças podem chegar por **Lovable**, pelo **Codex do Lucas** (especialmente na Área Quanti)
ou pela equipe/Codex interno. A origem identifica quem produziu a alteração, mas **não substitui a
classificação por ambiente**: ela é determinada pela rota/módulo e pelo comportamento alterado.

- A validação exige um doc vivo de projeto quando há mudança de runtime e exige o doc detalhado
  adicional para o Corretor. Ela roda no `push` da `main` e deve ser executada localmente antes da
  publicação.
