# Checkpoint — Corretor, 28/jul/2026 (retomar em 29/jul)

Fechamento do dia. O sprint de FPs do feedback dos analistas andou muito: **v0.44 → v0.49** do
[LIVE do Corretor](./LIVE_regras_corretor_vocacionais.md), 6 commits na `main`, 78 testes verdes.
Este documento existe para retomar amanhã **sem reler o histórico**.

---

## 1. Onde paramos: 2 ajustes desenhados, aguardando decisão do Gabriel

Discutimos os dois no fim do dia. O diagnóstico está feito; falta a decisão de produto para
implementar.

### Ajuste A — Somas que não fecham (comentário da analista sobre garden/cobertura)

Investigado no estudo **Raimundo Leonardi V3** (`17062ca6-9814-43b4-a6bf-9f61e0c7db1e`,
Toledo/PR) — 39 achados: 32 `LEFTOVER_NOTE`, 6 `ABSOLUTE_SUM`, 1 `STRUCTURE_MISSING`.

**Descoberta central: o comentário da analista NÃO explica esses 6 erros.** São três causas
distintas, e cada uma pede tratamento próprio:

| Causa | Slides | Evidência | Tratamento proposto |
|---|---|---|---|
| **A. Tabela paginada** (dominante) | s42, s43, s98, s100, s101 | O trio `1099 / 702 / 397` se repete como "Total" em s42 **e** s43, com linhas diferentes (12 e 24). É o total do conjunto inteiro repetido em cada fatia. | Detectar total declarado repetido entre slides vizinhos → não acusar por fatia. Melhor ainda: somar as fatias e conferir contra o total (vira checagem de verdade) |
| **B. Leitura ruim da visão** | s43, s61 | s43 tem linha duplicada ("Jardim Real" repetido); s61 acusa `soma 479,9 ≠ total 298` numa coluna de **contagem** — 479,9 é % somada por engano | Guardrail de plausibilidade de tipo por coluna. **Adiar** — mesmo tema do teste de modelo |
| **C. Exclusão declarada (CH-6, o caso da analista)** | s43 e afins | Coluna Status mistura `Comercialização` e **`Esgotado`**; o rodapé do estudo declara: *"Unidades garden, duplex e coberturas não são apresentadas na análise para evitar distorções de preço e metragem"* | Antes de acusar soma, procurar exclusão declarada no texto do slide (`não são apresentadas\|desconsidera\|ocultamos\|esgotados\|garden\|duplex\|cobertura`) |

> ✅ **DECISÃO (A) TOMADA em 31/jul — “Verificar”** (Gabriel seguiu a recomendação). Implementada em
> `v3/declared-exclusions.ts`; ver v0.50 do [LIVE do Corretor](./LIVE_regras_corretor_vocacionais.md).
>
> ~~⚠️ DECISÃO PENDENTE (A): com exclusão declarada, o achado deve **sumir** ou virar
> **"Verificar"**? Recomendação: *Verificar* — o total pode não fechar por exclusão legítima
> **ou** por erro real, e só quem lê o apêndice sabe. Suprimir só se na prática nunca compensar olhar.~~

**Ordem sugerida de implementação:** (1) tabela paginada — é o que mais reduz ruído aqui;
(2) CH-6 exclusão declarada; (3) plausibilidade de coluna fica para depois.

### Ajuste B — Notas de edição vazadas deixam de ser "Erro"

**32 dos 39 achados** do estudo são `LEFTOVER_NOTE` — sozinhas afogam todo o resto. E o conteúdo
não é erro:

> *"Deixar somente as bordas com cores, o restante do raio deve ser transparente. Vale para todos os mapas"*
> *"As cores dos raios acabam misturando com as informações das camadas nos outros mapas"*
> *"Ajustar a legenda. Melhor pegar a legenda do geobrain"*

É **comunicação entre analista e A&R**. Tratar como erro gera alarde falso E desperdiça
informação: a nota diz o que precisa ser corrigido.

**Proposta (alinhada com o Gabriel):**
- Sair do catálogo de erros → categoria própria (**"Comunicação da revisão"**), fora da contagem
  Erro/Provável/Verificar
- **Um item agregado** em vez de 32: "Há 32 comentários de revisão em 14 slides (s18, s24, s31…)",
  expansível
- Não bloqueia a entrega por si só; entra no relatório como checklist do que a revisão pediu
- **Usar como pista dirigida** (a parte mais valiosa): a nota é gabarito parcial gratuito. Cruzar
  com os achados do mesmo slide → subir confiança; se o motor não achou nada ali, sinalizar
  "a revisão apontou algo que eu não detectei" — insumo direto de calibração
- A rede de segurança original (estudo entregue não deve ter nota) continua válida, mas o lugar
  dela é o **portão de entrega**, não a worklist

> ✅ **DECISÃO (B) TOMADA em 31/jul — (b) avisa e pede confirmação** (Gabriel seguiu a recomendação).
> Implementada no `handleConclude` do `CorretorV3Page`; ver v0.50 do LIVE do Corretor.
>
> ~~⚠️ DECISÃO PENDENTE (B): na entrega final, comentário no arquivo **(a)** bloqueia,
> **(b)** avisa e pede confirmação, ou **(c)** só informa no relatório? Recomendação: **(b)** —
> mas depende de o PPTX que sai do corretor passar ou não por outra etapa depois.~~

---

## 2. O que foi entregue hoje (contexto para retomar)

Todos na `main`, com push feito. Nenhum exige migration; **só `analyze-ata-image` precisa de deploy**.

| Commit | O quê |
|---|---|
| `b89c7d5` | Sprint Fase 1+2: CH-1/2/3/4/5, FN-3, reconciliação. **Rolândia: 17 achados → 1** |
| `e2e9cb1` | Ata não lida: separador sem barra (“Rolândia PR”), ata multi-estudo (chips), comentários sobrepostos. **Requer deploy** |
| `f978afa` | Plural dos chips ("4 verificars" → "4 a verificar") e "deck" → "estudo" |
| `cb948ad` | Seção canônica do template novo; MERCADO passa a exigir fonte |
| `f11a289` | Slide de mapa não é cobrado por fonte (`isMapSlide`) — 15 slides isentos |
| `0052231` | **Ancoragem textual** contra cidade alucinada pela visão (caso s45) |

### Aprendizados que valem carregar

- **CH-4:** a hipótese "fonte no master" estava errada — o rodapé é uma **tabela 1×1**. Padrão do
  template novo da Brain; vale para futuras regras de extração.
- **s28/s29 reclassificados:** foram aceitos como erro real na triagem, mas são **mapas** como os
  outros (100% do conteúdo tabular é LEGENDA). A regra "mapa não leva fonte" prevaleceu.
- **Novo tipo de FP (v0.49):** até então a visão lia certo e a *regra* julgava mal; no s45 a
  **entrada é falsa** (cidade inferida dos bairros "Centro"/"Jardim Das Américas"). Defesa:
  ancoragem no texto transcrito. Dos 5 achados com tabela extraída, os 5 eram inferência.

---

## 3. Pendências que seguem abertas

- **Housi v2 (Lucas Finoti)** — ainda não recebido. Destrava **FN-1** (verticalização cross-slide,
  s33 × s32) e **FN-2** (taxa 0,9% × 1,7%), combinados como "próximo momento".
- **Teste A/B de modelo de visão** — o Gabriel perguntou se modelo melhor reduziria alucinações.
  Resposta curta: provavelmente sim, mas não elimina; a ancoragem é determinística e custa R$ 0,
  valendo para qualquer modelo. O s45 vira caso-âncora concreto para medir. Lembrar que já existe
  **escalonamento automático** para `gpt-4o` quando a auto-validação diverge.
- **Deploy pendente:** `supabase functions deploy analyze-ata-image` (prompt + normalização de
  cidade/UF mudaram; `ATA_CACHE_SCHEMA` 6 → 7 força releitura).
- Pendências antigas do sprint: ver `SPRINT_feedback_analistas_2026-07-28.md` §3 e as P1–P7 da
  revisão v0.42.

---

## 4. Como retomar amanhã

1. Ler este arquivo e as decisões pendentes (A) e (B) acima.
2. Reteste sem PPTX continua disponível: `npx vitest run rolandia-real` e `feedback-2026-07`
   (corpus em `calibracao/feedback-2026-07/`, inclui `rolandia-v1.ir.json`).
3. Para inspecionar o estudo do Toledo no banco:
   `study_id = 17062ca6-9814-43b4-a6bf-9f61e0c7db1e`.
4. Implementar na ordem: tabela paginada → CH-6 → notas de edição como categoria própria.
