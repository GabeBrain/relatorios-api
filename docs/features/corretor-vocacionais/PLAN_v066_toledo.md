# Plano técnico v0.66 — correções da rodada de Toledo e resumo de acertos (30/set/2026)

Para quem mantém o Corretor. Origem: rodada do estudo de Toledo (`Rua Raimundo Leonardi_VAP_03ago_12h`,
13 planilhas vinculadas), triada à mão contra as imagens dos slides. Resultado: 5 itens mostrados (1 falso),
4 erros reais não mostrados e um defeito que desliga a revisão de texto em todos os estudos.

## 1. Revisão de texto nunca leu o texto (crítico)

- **Sintoma:** 110 slides revisados com 2.310 tokens de entrada (≈ 230 por lote = só as instruções).
- **Causa:** `supabase/functions/analyze-text-batch/index.ts` monta `blocks` com título, texto e tabelas de cada slide, mas o prompt não os inclui (desde a criação, commit `ba19d46`, 09/jul). O modelo revisa um prompt vazio; o achado de concordância “inventado” de Campos do Jordão vem daí.
- **Mudança:** incluir `blocks` no prompt, depois das regras e antes do formato de resposta.
- **Efeito esperado:** ~10–15 mil tokens de entrada por estudo com gpt-4o-mini (≈ R$ 0,02); a âncora de evidência (v0.61) continua descartando citação que não exista no slide.
- **Deploy:** exige publicar a Edge Function `analyze-text-batch`.

## 2. Faixa omitida não pode sumir no aviso de cobertura

- **Sintoma:** s30 (renda) — todas as colunas somam ~92% do total declarado (falta uma faixa). As leituras discordaram e o achado foi agrupado em “tabelas sem conferência segura”.
- **Regra:** `checkTableSums` marca `omittedBand` quando ≥ 2 colunas ficam abaixo do total na mesma proporção (dispersão ≤ 3 p.p.). Esse padrão é estrutural: não depende de um dígito lido, e sim de todas as colunas concordarem. Achado com `omittedBand` fica fora do aviso agrupado e vale **Provável**, mesmo com leituras discordantes.
- **Arquivos:** `audit/engine.ts`, `audit/model.ts`, `v3/ia-vision.ts`, `v3/deck-reconcile.ts`.

## 3. Totais de lacunas com uma única confirmação

- **Sintoma:** s67 (tipologia × metragem) soma 1.481 lançadas; s68 (tipologia × preço) soma 1.295; Oferta Final igual (457) nos dois. O s67 não tem a nota de exclusão; o s68 tem. A regra de consenso (v0.61) exige dois slides concordando.
- **Regra:** além do consenso, acusa com UM par quando (a) os dois totais são confirmados por uma margem da própria leitura e (b) exatamente um dos dois slides traz a nota de exclusão — é o padrão “tabela sem exclusão × tabela com exclusão”. Provável.
- **Arquivo:** `v3/cross-table.ts`.

## 4. Raios: tempo e distância até ponto de interesse não é raio do estudo

- **Sintoma:** s14 (“Hospital … 2 min 950 m”) acusado como “raio estranho ao padrão”.
- **Regra:** `RADII` ignora pares “N min + distância (m/km)” no mesmo texto ou em textos vizinhos do slide, e slides de entorno com pontos de interesse. Raio do estudo continua sendo lido de rótulos de Z.I./raio.
- **Arquivo:** `audit/ir-rules.ts`.

## 5. Disponibilidade ausente onde há oferta

- **Sintoma:** s68, bloco “Dispon. S/O.L.”, coluna “Acima de R$ 10.000”: célula mesclada “-” onde a oferta lançada é 83 (2 dorm.) e 149 (3 dorm.) e a final é 18 e 40 — os percentuais (21,7% e 26,8%) sumiram.
- **Regra:** para cada slide de lacunas com os blocos Lançada, Final e Dispon., uma coluna em que TODAS as linhas com oferta lançada > 0 estão vazias no bloco de disponibilidade é “percentual ausente” (`FORMAT_MISMATCH`, Provável), citando os valores esperados.
- **Arquivo:** `v3/cross-table.ts`.

## 6. Resumo de acertos

- **Objetivo:** dar dimensão do que foi conferido e bateu, sem competir com os erros.
- **Dados (gravados no snapshot `relatorio`, sem migração — é jsonb):**
  - tabelas-imagem lidas e que fecham (`tabelasVerificadas` / `tabelasExtraidas`, já existe);
  - tabelas nativas conferidas (`tabelasNativas`, já existe);
  - valores comparados com as planilhas e quantos batem (novo: `fonte.comparados`, `fonte.batem`);
  - cruzamentos entre tabelas feitos e quantos batem (novo: `cruzamentos.feitos`, `cruzamentos.batem`).
- **Onde:** um bloco curto “O que bateu” no topo da lista, depois da análise, com até quatro números, em cor neutra; substitui o tooltip “o que foi conferido”.
- **Arquivos:** `v3/source-crosscheck.ts` (estatística das comparações), `v3/cross-table.ts` (contagem), `v3/pipeline.ts` (`AnalysisReport`), `pages/CorretorV3Page.tsx`.

## 7. Limites que ficam

- “R$ 7.716,00,00” (s41/s43) e precisão “25%” (s68): a leitura de imagem normaliza o texto; só um prompt que preserve o texto literal das células resolve, com custo de releitura. Fica para depois.

## 8. Validação

1. Testes sintéticos para cada regra (2–6) e suíte do Corretor.
2. Replay sem custo (leituras em cache) de Toledo, Campos do Jordão e SJC (VAP e v2) — nenhum erro real anterior pode sumir; FPs novos contados.
3. `tsc`, lint, `vite build`; commit isolado; push; texto para o Lovable publicar `analyze-text-batch`.

## 9. Resultado da execução (30/set)

Replay sem custo, regras v0.66, mesmas leituras em cache:

| Estudo | Antes | Depois | Mudança |
|---|---|---|---|
| Toledo | 5 (1 FP) | 5 (0 FP) | +s30 faixa omitida (Provável); −s14 raio falso |
| Campos do Jordão | 9 | 10 | +s86×s88 total 462×447 como achado próprio (forma de exclusão) |
| SJC VAP | 6 | 6 | sem mudança; erros reais mantidos |
| SJC v2 | 8 | 8 | sem mudança |

Ajustes feitos durante a validação:

- **Item 3:** “um par basta” passou a exigir a FORMA de uma exclusão — o slide sem nota é o maior e a diferença é ≤ 20%. Sem isso, o SJC ganhava 1.060 × 450 (leitura errada de um bloco). Exigir leitura estável não separava os casos (perdia o 462 × 447 real do CJ).
- **Item 5 retirado:** “disponibilidade ausente” acertou 0 e errou 5 nos quatro estudos — a visão deixa vazias células que existem na imagem. O caso do s68 do Toledo continua sem detecção.
- **Limite do Toledo s67 × s68 (1.481 × 1.295):** as leituras em cache desses slides são ruins (o s67 leu 940 como total geral; o s68 tem releitura discordante), então nenhuma regra confirma o total sem acusar leitura errada. Depende de leitura melhor, não de regra.

Resumo de acertos medido: Toledo — 10 de 11 valores iguais às planilhas, 11 de 11 cruzamentos, 46 de 52
tabelas-imagem fecham; CJ — 22 de 23, 9 de 20, 28 de 44; SJC VAP — 10 de 11, 65 de 69, 57 de 67.
