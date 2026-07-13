# DESIGN — UI/UX do Corretor v4 (interface e fluxo pós-Coverage 90)

**Data:** 2026-07-13 · **Autores:** Gabriel + Claude · **Executor:** Codex
**Escopo:** interface e fluxo do `/corretor` (`pages/CorretorV3Page.tsx` e componentes).
Não muda motor nem regra — consome o que o Coverage 90 já produz. Aplicar DEPOIS dos ajustes
do `REVIEW_coverage_90_ajustes.md` (itens A), porque o volume/qualidade dos achados muda a
calibragem visual.

> **Status de execução — v4.0–v4.3 (13/jul):** implementadas na página do Corretor: confiança,
> abas, completude, grupos/ações em lote, FP e entrega gradada. A decisão aplicada foi entrega
> com nível 3 mediante confirmação; o veredito usa `findings_v3.verdict` (migration v4); a régua
> usa seção+pino, sem thumbnails. Falta validar a jornada com a analista na homologação real.

## Por que redesenhar agora

A UI atual (worklist "por slide" + "entre slides", cards `V3FindingCard`, banner de custo)
foi desenhada para ~15–30 achados, quase todos locais e quase todos DET-certeza. O Coverage 90
muda três coisas de uma vez:

1. **Volume:** um estudo de 150 slides pode passar de 60 achados. Lista plana vira paredão.
2. **Natureza:** entraram achados **relacionais** (par de slides: `s59 × s41`), **checklists**
   (ata, estrutura — "falta algo no estudo", não "erro no slide") e **suspeitas** ("está
   estranho, verificar" — plausibilidade, fórmula heurística, fonte).
3. **Consequência de errar o tom:** se uma suspeita aparecer com a mesma cara de um erro
   provado e a analista descobrir que era falso, ela desconfia do conjunto inteiro. A
   hierarquia de confiança é o item mais importante deste redesign.

## Princípios (decidir empates por eles)

1. **Confiança explícita antes de tudo** — o analista precisa saber, sem ler o detail, se o
   corretor está AFIRMANDO ou PERGUNTANDO.
2. **Toda afirmação com evidência à vista** — número apontado + imagem/par de origem no card.
3. **O objetivo do fluxo é zero pendências** — cada tela responde "quanto falta?".
4. **Um problema, um item** — o mesmo erro raiz não deve gerar N cards para triar.
5. **Custo visível antes de gastar** — mantido da v3, não regride.

## 1. Hierarquia de confiança (a mudança nº 1)

Três níveis, derivados de dados que os findings JÁ carregam (`origem`, tipo, `detail` com
"confirmado no gpt-4o", modo BETA do catálogo):

| Nível | Rótulo na UI | Cor/ícone | O que entra | Verbo dos textos |
|---|---|---|---|---|
| 1 | **Erro** | vermelho, ⛔ | DET sobre dado nativo; DET sobre leitura confirmada no 4o (escalonada); WRONG_CONTEXT com evidência literal | "não fecha", "diverge" |
| 2 | **Provável** | laranja, ⚠ | DET sobre leitura da visão não escalonada; cruzamentos entre tabelas de fontes diferentes | "não bate — confira na imagem" |
| 3 | **Verificar** | âmbar/neutro, 👁 | VALUE_PLAUSIBILITY, PROJECTION_FORMULA heurística, SOURCE_MISSING, itens `missing` de checklist | "está estranho", "sem evidência" |

Implementação: função pura `confidenceOf(finding): 1|2|3` em `lib/v3/` (mapeia tipo + origem +
marcador de escalonamento — hoje está embutido no texto do detail; extrair para um campo
`escalated?: boolean` no `Finding` na próxima passada do motor). Badge no `V3FindingCard`,
cor da borda esquerda do card, e contadores separados na barra de progresso
("3 erros · 5 prováveis · 12 a verificar" — NUNCA "20 erros").

## 2. Estrutura da área de trabalho: 3 abas + resumo fixo

Substituir a página única rolável por três visões (tabs ou segmented control), com um
**cabeçalho fixo de progresso** comum:

```
┌──────────────────────────────────────────────────────────────┐
│ Estudo Marka Prime · Guarulhos/SP · v2       custo R$ 3,20   │
│ ⛔ 3 erros  ⚠ 5 prováveis  👁 12 verificar   ▓▓▓▓▓░░ 12/20    │
├──────────────────────────────────────────────────────────────┤
│ [ Completude ]  [ Problemas ]  [ Por slide ]                 │
└──────────────────────────────────────────────────────────────┘
```

### Aba 1 — Completude (nova; primeira coisa que o analista vê)

Junta o que hoje fica espalhado (AtaCard, checklist estrutural perdido na lista):
- **Card da Ata** (existente) + **checklist de cobertura da ata** (`ATA_COVERAGE`): cada pedido
  com ✓/✗ e link para o slide de evidência quando `ok`.
- **Checklist estrutural** (`STRUCTURE_MISSING`): os itens 1.1–8.x agrupados por seção-mãe,
  colapsados quando a seção está 100%.
- **Vista geral do deck**: régua horizontal de slides (1…N) com as seções coloridas e um pino
  nos slides com achado — dá o mapa mental do estudo em um olhar e serve de navegação
  (clicar no pino → aba Por slide naquele slide).

Racional: "faltou a tabela de lacunas de vagas" precisa aparecer ANTES de a pessoa começar a
corrigir célula por célula — é retrabalho estrutural, muda o plano de correção.

### Aba 2 — Problemas (nova; agrupamento por causa raiz)

Lista agrupada por **tipo de achado**, ordenada por confiança e depois por contagem:
- Grupo colapsável: `WRONG_CONTEXT (17) — dados de outra cidade` com os cards dentro.
- **Achados relacionais** mostram o par com o `sidebyside` viz existente (`VizSwitch` já
  renderiza) e citam os dois slides como chips clicáveis (`s59`, `s41`).
- **Ação em lote por grupo:** "marcar grupo como corrigido" / "ignorar grupo" — os 15
  "precisa ser de Guarulhos" são UMA decisão, não 15 cliques. (A persistência por rule_id já
  suporta: iterar `updateFindingStatus`.)
- Grupos de nível 3 (Verificar) começam **colapsados** — reduz a sensação de paredão.

### Aba 3 — Por slide (a atual, mantida)

A worklist sequencial existente, com dois ajustes:
- filtro por nível de confiança (chips ⛔/⚠/👁 no topo);
- quando um achado relacional é marcado corrigido aqui, o card espelhado no outro slide
  recebe o mesmo status automaticamente (mesmo `rule_id` — já é assim; garantir que a UI
  re-renderiza o espelho).

## 3. O card de achado (evolução do `V3FindingCard`)

Anatomia fixa, nesta ordem:
1. **Linha 1:** badge de confiança + tipo (label do catálogo) + chips de slide(s).
2. **Linha 2:** título — sempre no padrão "o quê + onde" ("Coluna % não bate com a absoluta").
3. **Evidência** (colapsada por padrão nos níveis 2–3, aberta no nível 1): o viz atual
   (`VizSwitch`) + **thumbnail da imagem de origem quando houver `evidenceSha1`** com a
   possibilidade de abrir em tamanho real (lightbox simples). A analista decide olhando a
   imagem, não confiando na transcrição.
4. **Rodapé de ações:** Corrigido · Ignorar · **Não é erro (FP)**. O terceiro botão é novo na
   v3 (existia como veredito na v1/v2): grava o veredito para a calibração SEM sumir com o
   card na hora (vira estado "descartado como FP", cinza). É o loop com a Juliana.

## 4. Fluxo do analista (jornada revisada)

```
upload .pptx
   → banner de análise (mantido: custo vivo + pausar)
   → cai na aba COMPLETUDE (não na lista de erros)
        · resolve o estrutural primeiro (o que falta produzir)
   → aba PROBLEMAS (corrige por causa raiz, em lote quando der)
   → aba POR SLIDE (varredura final, o que sobrou)
   → Reconferir (mantido: re-upload → diff resolvidos/persistem/novos)
        · o diff ganha os contadores por confiança também
   → Entregar (mantido: só com 0 pendentes de nível 1 e 2;
        nível 3 "verificar" pode ser entregue com justificativa — decidir com o gestor)
```

A última regra é uma decisão de produto embutida no design: **pendência de nível 3 não deve
bloquear a entrega** do mesmo jeito que um erro provado, senão o analista aprende a marcar
"ignorado" no atacado e o sinal morre. Propor: entrega liberada com nível 3 aberto exige um
clique de confirmação ("Entregar com 4 itens não verificados").

## 5. O que NÃO fazer nesta rodada

- Não redesenhar o rail/home de estudos (funciona).
- Não mexer no BudgetModal/banner de custo além dos contadores.
- Não introduzir biblioteca nova de UI — compor com os componentes existentes.
- Não construir editor de correção dentro da ferramenta (a correção acontece no PowerPoint;
  o corretor é o mapa).

## 6. Fatias de entrega (cada uma utilizável)

1. **v4.0 — confiança:** `confidenceOf` + badges + contadores no header + filtro na worklist
   atual. Menor esforço, maior efeito. Sem abas ainda.
2. **v4.1 — abas + Completude:** estrutura de 3 abas; aba Completude com ata-coverage,
   checklist estrutural e régua do deck.
3. **v4.2 — Problemas:** agrupamento por tipo, ação em lote, relacionais com par lado a lado.
4. **v4.3 — FP loop + entrega gradada:** botão "Não é erro", regra de entrega com nível 3,
   diff por confiança no Reconferir.

Critério de sucesso (medir na sessão real com a analista): tempo-até-zero menor que a sessão
v3 equivalente; nenhum uso de "ignorar em lote" para esconder nível 1–2; % de FP reportado
pelo botão novo registrado no LIVE doc.

## Pendências de decisão (Gabriel)

- Entrega com nível 3 aberto: livre com confirmação (proposta) ou bloqueada como hoje?
- "Não é erro" alimenta a mesma tabela de veredito da calibração v1/v2 ou tabela nova `*_v3`?
- A régua do deck (aba Completude) usa thumbnails reais (custo de render) ou só seção+pino
  (proposta: só seção+pino nesta rodada)?
