# REVIEW — Ajustes do Coverage 90 (commits `aae1be3` + `dfe6bbb`)

**Data:** 2026-07-13 · **Revisor:** Claude (a pedido do Gabriel) · **Executor dos ajustes:** Codex
**Veredito geral:** a implementação seguiu o plano com fidelidade e boas decisões (IDs estáveis
+ upsert `ignoreDuplicates`, bump único de cache v6 para os 3 campos novos, funções puras com
teste, catálogo honesto BETA, `OPERACAO_coverage_90.md`). **Nenhum bug de corretude que quebre
o fluxo.** Porém há **4 geradores de falso positivo de alta probabilidade** que, se forem para
a homologação como estão, estouram o orçamento de FP (≤15%) e queimam a confiança da analista
logo no primeiro teste. Corrigir os itens A antes de rodar o roteiro de homologação.

> **Status de execução — v0.33 (Codex, 13/jul):** A1–A4 implementados e cobertos por testes
> unitários. B1, B3, B4, B5 e B6 implementados; B2 recebeu fallback por texto e limites próprios
> para ficha, mas sua validação no PPTX real continua parte da homologação. A suíte local passou.

---

## A — Corrigir ANTES da homologação (geradores de FP)

### A1. `projectionFindings` dispara em tabelas de oferta por ano (FP grave)

[cross-table.ts](../../../src/features/corretor/lib/v3/cross-table.ts) — o gatilho é
`/projec|varia/.test(titleOf(ref))`, e `titleOf` concatena **título + colunas**. Toda tabela
"Oferta lançada por **ano de lançamento**" tem colunas de anos (2018–2025) e frequentemente uma
coluna "Var. %" → casa com `/varia/` → dispara:
- `TEMPORAL_WINDOW`: esperado 2027–2032 vs encontrado 2018–2025 → **6 mismatches por tabela**;
- `PROJECTION_FORMULA` via `checkProjectionSeries`: vendas anuais reais são irregulares por
  natureza → "variação anual irregular" em quase toda linha.

**Fix:**
1. Restringir a seções `SOCIO`/`ABSORCAO` (`ref.secao`);
2. Gatilho pelo **título do slide/tabela apenas** (sem colunas), com `/proje[çc][ãa]o|proje[çc][õo]es/`;
3. Guarda extra: só rodar TEMPORAL_WINDOW/PROJECTION quando a **maioria dos anos detectados é
   futura** (`>= anoCorrente`) — projeção olha para frente, histórico de lançamento olha para trás.

### A2. Lacunas: cruzamento de tabelas com EIXOS diferentes (FP garantido)

`crossTableFindings` compara `rowLabels` de **qualquer par** de tabelas LACUNAS a ≤5 slides de
distância. Mas as três análises têm eixos de LINHA diferentes por design (parâmetro 5.1–5.3):
tipologia×metragem (linhas=tipologia), tipologia×preço (linhas=tipologia), preço×metragem
(linhas=faixas de preço). Comparar 5.1 com 5.3 → mismatch de rótulos **sempre**, mesmo em
estudo correto.

**Fix:** classificar o eixo das linhas antes de parear — função `rowAxis(labels)` que devolve
`'tipologia' | 'preco' | 'metragem' | 'outro'` (heurística: `/dorm|tipolog|studio|loft/`,
`/r\$/`, `/m²|m2/`). Só comparar pares com o MESMO eixo. O que o parâmetro manda comparar entre
eixos é o conjunto de **bins de colunas** (metragem/preço) — para isso usar `binsFromColumns`
(hoje privada em `ia-vision.ts`; mover para `engine.ts` e exportar) e comparar os conjuntos.

### A3. `grandTotal` compara grandezas erradas (FP em população/domicílios)

`grandTotal` pega o **primeiro numérico** da linha de totais — que pode ser a coluna de `%`
(≈100) — ou, no fallback, soma a **primeira coluna numérica** (de novo, pode ser share).
Comparar tabela A (total=população 1.394.000) com tabela B (total=100,0 do %) → mismatch falso.

**Fix:** escolher a coluna pelo sinal certo, nesta ordem:
1. `colKinds` da visão: primeira coluna `count`;
2. header casando com a grandeza que motivou o par (`/popula/`, `/domic/`) — a regex do measure
   já existe no chamador, passar para `grandTotal(table, pattern)`;
3. senão, desistir do par (não comparar é melhor que comparar errado).
Adicionar também guarda de **escala**: se `max(a,b)/min(a,b) ≥ 900` e ≤1100, é quase certamente
mil×unidade — comparar normalizado e dizer no detail que a escala difere (isso é um achado útil,
não um mismatch bruto).

### A4. `sourceFindingsFromVision` flagra slides que a visão nunca olhou

[coverage-rules.ts](../../../src/features/corretor/lib/v3/coverage-rules.ts) — `hasData` inclui
`n_imagens > 0`. Mapas (≥1 MB) são **excluídos** das candidatas da visão, logo nunca entram em
`sourceSlides` — todo slide de mapa das seções SOCIO/ABSORCAO/LACUNAS sem fonte em texto vira
`SOURCE_MISSING`, sem que ninguém tenha olhado a imagem. São ~10 mapas por estudo → dezenas de
achados sem ação, exatamente o motivo do desligamento original da regra (09/jul).

**Fix:** só considerar `hasData` quando (a) há tabela/gráfico **nativo**, ou (b) o slide teve
**candidata analisada** pela visão (passar a lista de slides candidatos, não só os com fonte).
Slide com imagem não analisada = sem veredito, não vira achado.

---

## B — Melhorias de precisão (fazer em seguida, não bloqueiam deploy)

### B1. Faixas de renda: comparar limites numéricos, não strings

`crossBands` compara rótulo normalizado (espaço/case). "Até R$ 2.000" vs "De R$0 a R$2.000"
→ mismatch textual em par legítimo. Parsear os limites (reusar a lógica de `binsFromColumns`)
e comparar numericamente; cair para string só quando não parseia. Reduz FP no cruzamento
SOCIO×ABSORCAO quando a formatação difere de fonte para fonte.

### B2. Ficha técnica: validar a detecção contra o deck real

A detecção é só `FICHA_TITLE = /ficha\s+t[ée]cnica/i` sobre `titulo` do IR **e** as candidatas
ainda passam pela heurística dimensional de tabela (15–500 KB, aspect ≥1,2). Risco real: os
slides s74–76 do Marka terem título tipo "1/7" (o título do IR é heurístico) ou a ficha pesar
>500 KB → **zero candidatas de ficha** e o WS6 silenciosamente não roda. Verificar no PPTX real;
se falhar: (a) marcar como ficha também quando o texto do slide contém `ficha técnica`;
(b) relaxar `MAX_KB`/aspect apenas para `tipo: 'ficha'`.

### B3. Checklist estrutural: sumário satisfaz tudo

`structureChecklistFinding` testa os padrões contra o corpus do **deck inteiro** — um slide de
sumário/índice que lista as seções faz todo item passar mesmo com a seção ausente (era
exatamente o caso da nota s24: "mapeamento físico" pode constar no índice e não existir).
**Fix:** exigir match em **título de slide** (ou nas 2 primeiras linhas), ignorando os
primeiros ~5 slides (capa/sumário/objetivos). Além disso, o dicionário implementado omitiu
itens do plano: 2.4.1/2.5.1/2.7.1/2.8.1 (mapas), 4.9/4.10 (preços), 8.2–8.4 (quebras de
revenda) — completar ou registrar a omissão no LIVE doc como decisão.

### B4. `wrongUfFindings` em listas de referência

Menção legítima a outra praça ("Rio de Janeiro - RJ" numa lista de comparáveis/benchmark) vira
`WRONG_CONTEXT`. Mitigação barata: ignorar slides cuja seção é `MERCADO` quando a UF estranha
aparece junto de ≥2 cidades diferentes no mesmo slide (padrão de lista), ou limitar a regra a
capa + SOCIO + ABSORCAO. Manter BETA e observar na homologação — só agir se aparecer FP real.

### B5. UX de progresso da visão regrediu

No `pipeline.ts`, `attachEvidenceImages` + o `onStage visao` final saíram do `.then` do
`visionPromise` para depois do `Promise.all` — o banner da visão agora só mostra os findings
quando o passe de TEXTO também termina. Restaurar o comportamento progressivo: emitir os
findings crus da visão no `.then` (como era) e emitir os cruzamentos num estágio próprio
(`'cruzamento'`) depois do `Promise.all` — de quebra a UI ganha visibilidade do WS2.

### B6. Estimativa de custo desatualizada

`estimateVisionPass` mantém `outputTokens = 700`/imagem, mas o payload agora inclui
`locais_visiveis`, `tem_fonte` e (nas fichas) `unidades` — fichas reais produzem 1.500–2.500
tokens de saída. Subir para ~900 nas tabelas e ~2.000 quando `tipo === 'ficha'`, senão o
orçamento mostrado antes de rodar fica sistematicamente otimista.

---

## C — Observações (sem ação obrigatória)

1. **Harness DET-only:** o `recall-marka.test.ts` mede só o teto DET (cross/visão ficam de
   fora porque dependem do payload da visão). Próximo passo natural: exportar os payloads do
   `vision_cache` do estudo Marka para um fixture JSON local (gitignored) e medir o recall
   completo offline. Sem isso, o número que o teste imprime vai parecer baixo mesmo com tudo
   funcionando.
2. **`registerIaPass`** aceita `'visao_ata'` na página mas o tipo da função declara
   `'texto' | 'visao_tabela' | 'visao_mapa'` — TS deixou passar por ser `any` no client do
   Supabase. Alinhar o union (cosmético).
3. **Duplo `FICHA_TITLE.test`** em `findTableImages` (uma vez para o guard, outra no objeto) —
   micro; usar a variável `ficha` já calculada.
4. Elogios que valem registro: o realinhamento do fluxo de UF pós-ata reexecutando `irToFindings`
   com IDs estáveis é a solução certa; `wrongContextFromVisibleLocales` com `principal: true`
   e whitelist Brasil/Estado ficou conservador do jeito que o plano pedia; a separação
   `notas_revisao` no IR com teste sintético de PPTX está limpa.

## Ordem sugerida para o Codex

1. A1 → A2 → A3 → A4 (mesmo PR: "precisão dos cruzamentos");
2. rodar o roteiro do `OPERACAO_coverage_90.md` (etapas 2–6) e registrar recall/FP no LIVE doc;
3. B1–B6 conforme os FPs observados na homologação priorizarem;
4. registrar tudo como v0.32+ no `LIVE_regras_corretor_vocacionais.md`.
