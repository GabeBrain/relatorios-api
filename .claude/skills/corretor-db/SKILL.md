---
name: corretor-db
description: Consulta o banco do Corretor de Vocacionais direto pelo terminal — achados por estudo/slide/tipo, payload completo da visão, imagem-evidência, custo por estudo contra o teto e estado real da triagem. Use ao investigar um falso positivo relatado por analista, ao conferir se um estudo foi processado por inteiro, ao apurar custo de análise, ou sempre que a pergunta for "o que o motor gravou para este erro?".
---

# Consulta ao banco do Corretor

`scripts/corretor-db.mjs` lê o Supabase do Corretor pelo PostgREST usando a chave anon do `.env`
(as políticas são `anon_all_*`). **Somente leitura** — nenhum comando escreve.

## Comandos

```bash
node scripts/corretor-db.mjs estudos                      # panorama: custo, processamento, pendentes, triagem
node scripts/corretor-db.mjs custo                        # custo por estudo contra o teto + passes por tipo
node scripts/corretor-db.mjs triagem                      # marcação humana vs. reconciliação automática
node scripts/corretor-db.mjs achados <estudo> [filtros]   # --tipo --status --slide --origem
node scripts/corretor-db.mjs achado <estudo> <rule_id>    # payload completo · --img <dir> baixa o PNG
node scripts/corretor-db.mjs arquivos [--hash] [dir...]   # quais PPTX temos, quais faltam, autor de cada um
node scripts/corretor-db.mjs raw "<query PostgREST>"      # escape hatch
```

`<estudo>` aceita uuid, prefixo do uuid, trecho do nome **ou cidade** (`toledo`, `marka`, `17062ca6`).

## Fluxo para investigar um falso positivo

1. `achados <estudo> --tipo <TIPO>` para localizar o `rule_id`.
2. `achado <estudo> <rule_id> --img <dir>` para o payload e o PNG.
3. **Ler a imagem** com a ferramenta Read e comparar com o que o motor extraiu. A pergunta útil é
   sempre a mesma: *a visão leu errado, ou leu certo e a regra julgou mal?* São defesas diferentes —
   ancoragem/prompt no primeiro caso, guardrail determinístico no segundo.
4. Reproduzir em teste com o corpus de `docs/features/corretor-vocacionais/calibracao/`
   (`npx vitest run rolandia-real`, `feedback-2026-07`) antes de mexer em regra.

## O que ler no payload

- `viz.table.columns` × `viz.table.totals` — **se os tamanhos divergem, o casamento por posição está
  suspeito**: a visão emite o array de totais compacto, pulando as células vazias que o rótulo
  "Total" atravessa, e o motor casa por índice. O script emite um alerta quando isso acontece.
- `viz.badColumns` / `viz.badRows` — índices que a regra reprovou.
- `viz.notes` — a frase exata mostrada ao analista.
- `escalated: true` — houve divergência na autovalidação e o passe subiu para o modelo maior.

## Como ler o estado do processamento

Deduzido dos passes gravados em `ia_passes`, porque o portão da ata cobra na fase 1 e texto+visão só
rodam depois da confirmação:

| Rótulo | Significa |
|---|---|
| `completo` | texto + visão rodaram |
| `PAROU no portão da ata` | só o passe da ata — **o estudo nunca foi analisado**; os "pendentes" na tela são só a triagem DET grátis do upload |
| `sem passe de visão` | texto rodou, visão não |
| `só triagem DET` | nenhum passe de IA |

## Arquivo-fonte e autoria

Reprocessar um estudo **exige o PPTX original**: o pipeline extrai as imagens dos bytes e o banco
não guarda o arquivo (`study_versions` tem só `sha1`, `n_slides` e o nome). `arquivos` cruza o que
o banco registrou com o que existe no disco.

- O `sha1` do banco é o **do arquivo inteiro**, então o casamento é definitivo.
- Sem `--hash`, casa por nome — rápido, mas perde arquivo renomeado. Com `--hash`, indexa todos os
  PPTX encontrados por sha1 e acha onde quer que esteja (custa ler alguns GB).
- **Não há nome de analista no banco.** A ata traz `cliente` e `projeto`; o nome da pessoa só existe
  no `docProps/core.xml` do PPTX (`dc:creator` e `cp:lastModifiedBy`), que o comando extrai quando o
  arquivo está local.

## Cuidados

- `status` mexido **sem** `verdict` é reconciliação automática, não julgamento humano. Só
  `verdict = 'fp' \| 'bug'` prova que alguém olhou — é o que `triagem` separa.
- O `activity_log` **não** instrumenta o Corretor (só requisições do API Explorer). Não dá para saber
  por ele quem abriu ou triou um estudo.
- Findings ficam por `(study_id, rule_id)`; o `rule_id` é estável por conteúdo, então sobrevive à
  reconferência.
