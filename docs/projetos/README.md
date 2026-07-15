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

1. **Desenvolvimentos** — log cronológico das alterações relevantes (o que mudou, por quê,
   arquivos tocados, autor). Entrada nova no topo.
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
- **O quê:** <resumo da mudança>
- **Por quê:** <motivo/contexto>
- **Arquivos:** `caminho/arquivo.ts`, ...
- **Impacto em Etapas/Pendências:** <o que virou ✅ ou o que abriu de novo>
```
