# Corretor de Vocacionais — Regras Live

Documento vivo para acompanhar regras determinísticas, regras de LLM, artefatos de extração e decisões operacionais do **Corretor | Estudos Vocacionais**.

Este arquivo deve ser atualizado sempre que uma regra for adicionada, removida, renomeada, reclassificada entre `DET`/`IA`, ou quando o fluxo do corretor mudar em `src/features/corretor/`, `supabase/functions/analyze-slide/`, `supabase/migrations/` ou `docs/features/corretor-vocacionais/`.

## Como atualizar

1. Nunca apagar o histórico de versões anteriores sem motivo explícito.
2. Para mudanças novas, criar uma seção `Versão X.Y — data` no topo do histórico.
3. Marcar cada regra com um status:
   - `RUNTIME`: aplicada hoje pelo app.
   - `POC`: existe como prova de conceito/script, mas não está integrada ao app.
   - `PLANEJADA`: documentada para v2, ainda sem implementação runtime.
   - `REMOVIDA`: existia antes e foi retirada.
4. Informar a fonte técnica/documental da mudança.
5. Separar regras `DET` de regras `IA/LLM`.

## Versão 0.36 — 2026-07-13 — Corretor v5 WS-2: relatório de entrega (attestation, RUNTIME)

Os findings `ok:true` (tabelas que fecham, cruzamentos consistentes) eram descartados — o
corretor só mostrava problemas. WS-2 guarda o trabalho POSITIVO: `runPhase2` monta um
`AnalysisReport` (tabelas extraídas/verificadas, imagens analisadas, tabelas nativas) salvo em
`studies_v3.relatorio`. Nova rota read-only imprimível **`/corretor/:id/relatorio`**
(`CorretorReportPage`): "Verificado ✓" (contadores), apontamentos por tipo (corrigidos/
pendentes/total), decisões do analista (assumidos/ignorados/FP) e rodapé de geração. Link
"Relatório" aparece no selo de entregue. `loadDeliveryReport` combina o snapshot + contagens
vivas de `findings_v3`. Migration `20260713170000_corretor_v5_relatorio.sql`. Suíte 47 verdes.

## Versão 0.35 — 2026-07-13 — Corretor v5 WS-0 + WS-1: higiene + portão da ata (RUNTIME)

Execução do `PLAN_corretor_v5_fluxo.md` pelo Opus (branch `feat/corretor-v5-fluxo`).

**WS-0 — higiene:** `build` roda `tsc --noEmit` (o crash da v0.33 seria pego); fix
`wl.completeness→completude`; `projectionFindings` usa `maxYear >= ano+3` (fim do falso
negativo); checklist estrutural exclui capa/sumário por seção (não por índice fixo);
`confidenceOf` rebaixa `WRONG_CONTEXT` de visão não confirmada para nível 2; cruzamento de
tabelas nativas carrega `origem: 'DET'` (novo campo opcional em `Finding`); `DeckRuler` usa
grid `auto-fill` (as classes `grid-cols-16/20` não existiam).

**WS-1 — portão da ata (mudança de maior alavancagem):** `runFullAnalysis` dividida em
`runPhase1` (DET + ata, barata) e `runPhase2` (texto + visão + cruzamentos, paga). Entre elas,
o novo `AtaGateCard` bloqueia os passes pagos: o analista **confirma/edita cidade, UF e os
pedidos da ata** antes de gastar. Sem ata detectada, vira formulário obrigatório de cidade/UF
— fecha o buraco do `cidade: null` no upload (o CITY_NAME rodava cego). `confirmAta` persiste a
régua validada + `ata_confirmada`. `runFullAnalysis` mantida como composição (testes verdes).

**Migration:** `20260713160000_corretor_v5_ata_gate.sql` — colunas `ata_confirmada` e `uf` em
`studies_v3`. **DET-only:** as fases pagas dependem das edges (visão/texto), então o teste novo
cobre `confidenceOf` (UF texto=1, visão não confirmada=2, escalonada=1). Suíte: 47 verdes.

## Versão 0.34 — 2026-07-13 — Revisão da v0.33 (1 fix aplicado) + plano do Corretor v5 (docs)

Revisão do commit `561f7f9` (Claude): A1–A4/B1–B6 conferidos como corretos. **1 bug corrigido
direto no working tree:** `wl.completeness` → `wl.completude` em `CorretorV3Page.tsx` — a aba
padrão crashava ao abrir qualquer estudo (Vite não roda typecheck no build; `tsc --noEmit`
agora passa limpo). Ajustes menores apontados para o WS-0 do plano novo: `grid-cols-16/20`
inexistentes no Tailwind (régua cai p/ 12 col), guarda de anos futuros da projeção pode gerar
falso negativo, `slice(5)` do checklist estrutural é frágil, `WRONG_CONTEXT` de visão não
confirmada deveria ser nível 2, origem `IA_visao` em cruzamento de tabelas nativas.

Novo plano de fluxo: `PLAN_corretor_v5_fluxo.md` (executor: Opus) — portão da ata antes dos
passes pagos, relatório de entrega (attestation), modo triage por teclado, reconferência sem
atrito e vista da calibradora; file watch (File System Access) registrado como WS-F futuro.

## Versão 0.33 — 2026-07-13 — Precisão Coverage 90 + Corretor v4 (RUNTIME)

Implementados os ajustes obrigatórios da revisão e as fatias v4.0–v4.3 da interface.

| Área | Mudança runtime |
|---|---|
| Precisão A1–A4 | Projeção só roda em SOCIO/ABSORÇÃO com título explícito e maioria de anos futuros; lacunas classificam eixo antes de cruzar; população/domicílios só usam coluna `count`/grandeza; fonte só é cobrada em dado nativo ou imagem analisada. |
| Precisão B1–B6 | Faixas equivalentes são comparadas numericamente; fichas podem ser encontradas por texto e têm limite visual próprio; checklist ignora capa/sumário e completa 1.1–8.4; UF se limita a contexto contratado; visão volta a pingar antes do texto e a estimativa distingue ficha. |
| v4.0 | `confidenceOf` classifica cada achado como **Erro**, **Provável** ou **Verificar**; header e filtro não chamam todos de erro. |
| v4.1–v4.2 | Área de trabalho em abas Completude, Problemas e Por slide; régua do deck; grupos por causa raiz e ação em lote. |
| v4.3 | Botão **Não é erro (FP)** persiste veredito em `findings_v3.verdict`; nível 3 pode ser entregue só após confirmação, níveis 1–2 bloqueiam. |

**Migration aplicada:** `20260713150000_corretor_v4_verdict.sql` (Gabriel, 13/jul). Não há Edge Function alterada
nesta rodada. Testes unitários de precisão/confiança e build foram atualizados; falta a
calibração real Marka/Itajaí/GO para declarar a meta quantitativa.

## Versão 0.32 — 2026-07-13 — Revisão do Coverage 90 + design UI/UX v4 (docs, sem mudança de regra)

Revisão de código dos commits `aae1be3`/`dfe6bbb` (Claude, a pedido do Gabriel). Nenhuma regra
mudou nesta versão — dois documentos novos orientam as próximas:

- `REVIEW_coverage_90_ajustes.md` — 4 geradores de falso positivo a corrigir **antes** da
  homologação (A1 projeção disparando em "oferta por ano"; A2 lacunas cruzando eixos
  diferentes; A3 `grandTotal` comparando grandeza errada; A4 SOURCE_MISSING em mapa não
  analisado) + melhorias B1–B6 e observações. Ordem de execução no próprio doc.
- `DESIGN_uiux_corretor_v4.md` — redesign da interface para o volume/natureza novos dos
  achados: hierarquia de confiança em 3 níveis (Erro/Provável/Verificar), área de trabalho em
  3 abas (Completude, Problemas, Por slide), evolução do card com botão "Não é erro" (loop de
  calibração) e fatias v4.0–v4.3.

## Versão 0.31 — 2026-07-13 — Coverage 90: WS2–WS8 conectados ao passo único (BETA, validação real pendente)

Os workstreams restantes do `PLAN_coverage_90.md` agora rodam no fluxo v3, sem chamada de IA
adicional além da visão já existente. Todos começam como **BETA**: a meta não é alegar 90% sem
os IRs reais e a calibração humana.

| WS | Regra RUNTIME | Implementação |
|---|---|---|
| 2 | `CROSS_TABLE_MISMATCH` / `TOTALS_EQUALITY` | cruza faixas de renda SOCIO×ABSORÇÃO, população/domicílios, lacunas próximas e consolidada×oferta; usa tabelas nativas e de visão. |
| 3 | `ATA_COVERAGE` | checklist DET de pedidos/dúvidas e “Produto proposto”; ausência de evidência textual é apresentada como **conferir**, não como prova final de ausência. |
| 4 | `STRUCTURE_MISSING` | checklist granular 1.1–8.1 do deck de parâmetros sobre título/texto; itens de mapa/imagem seguem β até calibração. |
| 5 | `TEMPORAL_WINDOW` / `PROJECTION_FORMULA` | janela ano atual+1…+6 e série contra taxa explícita/ritmo interno; fórmula oficial A&R ainda é pendência humana. |
| 6 | `VALUE_PLAUSIBILITY` | fichas técnicas entram no passe visual; extração de unidades e checagens de preço÷m², vagas e tickets em tom “verificar”. |
| 7 | `SOURCE_MISSING` / `REQUIRED_NOTE` / `EXCLUSION_RULE` | visão informa fonte visível; nota de segunda moradia e exclusões Gardens/Duplex/Coberturas são checadas. |
| 8 | `REQUIRED_NOTE` / `VALUE_PLAUSIBILITY` | consolidada exige média R$/m²+estoque; VSO preenchido com estoque zero é sinalizado. |

**IA/visão:** `analyze-table-image` passa a devolver `unidades[]` e `tem_fonte`, além de
`locais_visiveis[]`; `CACHE_SCHEMA` 5→6 para uma única releitura por imagem. Requer deploy da
function. Regras, testes e limites operacionais estão em `OPERACAO_coverage_90.md`.

Validação local: testes de regras finais + notas/contexto verdes e build de produção verde.
**Pendente antes de declarar aceite:** deploy, Marka/Itajaí/GO, harness com IR real e fórmula
oficial de projeção. O catálogo foi corrigido para refletir o estado BETA (não PLENO/MOCK).

## Versão 0.30 — 2026-07-13 — Coverage 90: WS1 cidade/UF em imagens (BETA, aguarda calibração real)

Implementada a primeira regra de alto recall do `PLAN_coverage_90.md`:

| Camada | Mudança |
|---|---|
| IA/visão | `analyze-table-image` transcreve `locais_visiveis[]` (cidade/UF/bairro) e marca se o local é protagonista de título/legenda. |
| DET pós-ata | `wrongUfFindings` detecta uma UF brasileira divergente no texto/título (ex.: `São Paulo – MS` quando a ata diz `SP`). |
| Comparação | `wrongContextFromVisibleLocales` emite `WRONG_CONTEXT` só para cidade protagonista diferente da cidade da ata; ignora Brasil e títulos comparativos Estado/Brasil. |
| Cache | `vision_cache` v4→v5: todas as imagens são relidas uma vez para trazer locais visíveis. |

Testes unitários: cidade divergente, controles sem FP e UF divergente. Build limpo. **Pendente de
calibração:** deploy de `analyze-table-image` + Marka/Itajaí para medir o aceite (≥13/15 e zero FP).

## Versão 0.29 — 2026-07-13 — Coverage 90: WS0 harness e isolamento das notas A&R

O IR agora classifica formas com preenchimento amarelo e texto vermelho como `notas_revisao`,
retirando-as de `textos` antes dos passes de IA. `LEFTOVER_NOTE` mantém a rede de segurança em
produção, mas o harness ignora esse tipo para não contar a própria instrução humana como acerto.

Novo harness `recall-marka.test.ts`: carrega as 96 formas do gabarito, fixa 57 labels ancoradas
nota→regra e mede o recall DET quando `CORRETOR_CALIBRATION_IR` aponta para o IR local gitignored.
Sem o artefato, informa explicitamente que a métrica ainda não é mensurável. Testes e build limpos.

## Versão 0.28 — 2026-07-13 — Cidade/UF da ata passa a ter evidência literal

Cidade é parâmetro crítico do `CITY_NAME`; não pode depender de uma inferência opaca da visão.
A extração agora pede `localizacao_fonte`: transcrição literal do trecho da ata que contém a
cidade/UF. A edge deriva e normaliza `cidade`/`uf` a partir desse trecho antes de persistir;
sem trecho explícito, ambos ficam nulos. O card expõe a fonte para conferência humana.

`ATA_CACHE_SCHEMA` 5→6 força a nova leitura dos registros já cacheados. Requer redeploy de
`analyze-ata-image` e reconferência do estudo.

## Versão 0.27 — 2026-07-13 — Ata preserva detalhes literais de produto e localização

Validação visual da ata real Tancredo/Marka: os campos estruturados vieram corretos, mas a
síntese perdia informação contratada relevante. Exemplo: “2 dorm **com e sem sacada**” virava
somente `dorms: [2]`; e a dúvida “Se necessário é possível **fasear**” saiu truncada.

| Ajuste | Resultado |
|---|---|
| `produto.observacoes[]` | Preserva detalhes literais que não cabem na régua numérica, como sacada. |
| `observacoes_localizacao[]` | Preserva Via Dutra, aeroporto, Parque CECAP e demais fatos de localização. |
| Prompt | Proíbe parafrasear/truncar dúvidas e pedidos, incluindo a última palavra do bullet. |
| Cache da ata v5 | Reprocessa extrações anteriores para carregar os novos campos; `ata: null` continua não-cacheável. |
| Card | Mostra os novos detalhes, sem esconder o dado original da ata. |

Verificação local: 5/5 testes do localizador e build de produção limpos. Requer redeploy de
`analyze-ata-image` e uma reconferência para atualizar a ata persistida.

## Versão 0.26 — 2026-07-12 — Correção da seleção da ata no slide de capa (Marka/Tancredo)

O teste real `Vocacional_Marka Prime_Reduzido` revelou um falso-negativo da Fase B: a ata é
um cartão/imagem inserido no slide 1, sobre uma imagem de fundo. O localizador antigo usava
apenas tamanho intrínseco e enviava o fundo grande para a edge; a edge respondia corretamente
`ata: null`.

| Ajuste | Arquivo | Resultado |
|---|---|---|
| Localizador por layout | `lib/v3/ata-image.ts`, `pptx-media.ts` | Cruza `rId` da imagem com posição/tamanho no slide, prioriza imagem inserida e usa fundo full-slide apenas como fallback. Aceita cartão ≥400×300 / 20 KB. |
| Cache de nulo | `lib/v3/ia-ata.ts` | `ata: null` não é mais reutilizada nem gravada: tentativa antiga errada não bloqueia a nova seleção. |
| Prompt | `analyze-ata-image` | Declara explicitamente o padrão slide decorativo + cartão branco de briefing. |
| Regressão | `ata-image.test.ts` | PPTX real do Marka seleciona `ppt/media/image30.png`, o cartão da ata. |

Verificação local: 5/5 testes do localizador e build de produção limpos. **Requer redeploy** de
`analyze-ata-image`; depois, reenviar/reconferir o PPTX para executar a nova extração.

## Versão 0.25 — 2026-07-11 — Ata Fase B: extração no passo único + cidade alimenta o CITY_NAME

Gabriel (11/jul): "as atas sempre estarão no 1º slide → localizar e extrair já no upload".
Fase B do `PLAN_ata_estrela_guia.md` implementada (antecipada):

| Item | Arquivo | Detalhe |
|---|---|---|
| Estágio `ata` no passo único | `lib/v3/pipeline.ts` | Roda ANTES do texto: `findAtaImage` → `extractAtaFromImage` → a **cidade extraída vira a régua do CITY_NAME** (antes o passo único passava `cidade: null` → CITY_NAME rodava cego). Best-effort: falha na ata nunca bloqueia o resto (cidade cai no fallback). Novo estágio no banner + estimativa (`estimateAtaPass`) + teto |
| Persistência | `lib/v3/db.ts` (`saveAta`), migration `20260711130000_studies_v3_ata.sql` | `studies_v3.ata jsonb` + copia `cidade`. **⚠ Aplicar.** |
| Card no workspace | `components/AtaCard.tsx` (novo) | ata extraída vira card permanente (cliente, cidade/UF, produto, pedidos, dúvidas). Sem ata → cai no painel de teste manual (`AtaTestPanel`, fase A). Read-only nesta fatia (edição fica p/ depois) |
| Card da homepage | `pages/CorretorV3Page.tsx` | mostra a cidade do estudo |
| Passe de custo | — | registra `visao_ata` em `ia_passes` (custo acumula no estudo) |

Fluxo: upload → DET → **ata** (cidade) → texto (com cidade) + visão em paralelo, tudo automático.
29/29 testes verdes, build limpo. **⚠ Aplicar:** migration `20260711130000` (+ a `20260711120000`
de `visao_ata` e o deploy de `analyze-ata-image` da v0.24).

Próximo (Fase C, após teste real): `ATA_COVERAGE` — pedidos/dúvidas viram checklist verificado
contra o estudo (DET keywords + IA no julgamento). Edição da ata pelo analista também entra aí.

## Versão 0.24 — 2026-07-11 — Ata Fase A IMPLEMENTADA: extração (imagem + DOCX) + painel de teste

Fase A do `PLAN_ata_estrela_guia.md` no ar — **provar que a LLM lê a ata**. Nenhuma regra nova
ainda; só extrai e mostra para o Gabriel validar no olho (⏸ Pausa A).

| Peça | Arquivo | Detalhe |
|---|---|---|
| Utilidades de mídia compartilhadas | `lib/v3/pptx-media.ts` (novo) | dims PNG/JPEG, sha1, parse de rels — extraídas de `table-images.ts` sem mudar comportamento (regressão do localizador de tabelas segue verde) |
| Localizador da ata | `lib/v3/ata-image.ts` (novo) | imagem GRANDE (≥60 KB, ≥900×600) nos slides 1–4, melhor = menor slide/maior área. Lógica própria (o localizador de tabelas a descarta) |
| Edge de extração | `supabase/functions/analyze-ata-image/` (novo) | 1 ata (imagem OU texto) → JSON fechado `{cliente,cidade,uf,produto{…},preco,duvidas_cliente[],pedidos_analista[]}`; transcrição fiel dos bullets; campo ausente = null. **Deploy:** `supabase functions deploy analyze-ata-image` |
| Cliente + cache | `lib/v3/ia-ata.ts` (novo) | cache-first no `vision_cache` (chave `ata:<sha1>`); `extractAtaFromImage` / `extractAtaFromText`; registra passe `visao_ata` |
| DOCX (formato futuro) | `lib/v3/ata-docx.ts` (novo) | `word/document.xml` → texto (fflate+DOMParser); vai ao ramo texto da edge (~10× mais barato, sem visão) |
| Painel de teste | `components/AtaTestPanel.tsx` (novo) | card β no workspace: sobe .pptx/.docx → **imagem × JSON lado a lado** p/ validação campo a campo; mostra custo. Manual (não ligado ao passo único ainda) |
| Migration | `20260711120000_ia_passes_visao_ata.sql` | amplia check de `ia_passes.tipo` p/ incluir `visao_ata`. **⚠ Aplicar.** |

Testes: localizador acha a ata no slide 2 do fixture, ignora tabelas, devolve null sem ata;
DOCX real (Grupo Impper) extrai texto + sha1. Gerador ganhou `--fixture ata`. 29/29 verdes.

**⏸ PAUSA A (próximo passo do Gabriel):** subir 2–3 estudos reais no painel β, conferir campo a
campo (cidade/UF e pedidos_analista 100%; resto ≥90%), testar o DOCX real, registrar acerto por
campo + modelo + custo. Só então parte a Fase B (ata alimenta o passo único). **Deploy** da edge
e **migration** antes de testar.

## Versão 0.23 — 2026-07-11 — Plano aprovado: Ata como estrela-guia (extração → parâmetros → cobertura)

Decisão do Gabriel (11/jul): motores de imagem considerados confiáveis o suficiente; próximo
foco é a **ata de abertura** (hoje imagem colada nos slides iniciais; futuro DOCX). Plano
completo com **pausas obrigatórias de teste** em
[`PLAN_ata_estrela_guia.md`](./PLAN_ata_estrela_guia.md):

- **Fase A** — provar a extração (localizador da ata-imagem + edge `analyze-ata-image` com
  JSON fechado + painel de teste imagem×JSON + bônus DOCX grátis). **⏸ Pausa A**: Gabriel
  valida campo a campo em 2–3 estudos reais (aceite: cidade/UF e pedidos_analista 100%).
- **Fase B** — ata alimenta o passo único: cidade extraída vai para a IA de texto (conserta
  o **bug latente do CITY_NAME rodando com `cidade: null`**), `studies_v3.ata jsonb`,
  card editável (hipótese verificada pelo analista). **⏸ Pausa B**.
- **Fase C** — `ATA_COVERAGE` sai de MOCK: pedidos/dúvidas → checklist DET (keywords,
  grátis) + IA só no julgamento semântico; aceite = zero falso-✅. Gerador ganha ata
  sintética com pedido ausente proposital. **⏸ Pausa C**.

Nenhuma regra mudou nesta versão (registro de plano). Migrations previstas: check de
`ia_passes.tipo` + `visao_ata` (fase A) e `studies_v3.ata jsonb` (fase B).

## Versão 0.22 — 2026-07-11 — Generalização: semântica declarada + verificada (fim do whack-a-mole)

Resposta à pergunta do Gabriel ("não vou poder atualizar o código a cada estudo"). Duas mudanças
que trocam heurística curativa por **invariante generalizante**:

**#1 — % só é validado se for PARTICIPAÇÃO** (`engine.ts`, `checkPercentConsistency`). A coluna de
% só entra no cross-check se ela mesma **soma ≈100**. Isso mata a classe inteira "coluna com % no
cabeçalho que não é participação" — Var.%, Cresc.%, taxa YoY, "Vendas s/ O.L." — sem lista de
nomes. Estrutural: participação soma 100, taxa não.

**#2 — Semântica declarada + verificada** (edge + motor). A visão agora **classifica** cada tabela
e a validação usa isso como **hipótese, sempre conferida pela aritmética** (classificar errado é
pego):
- Edge (`analyze-table-image`): pede `col_kinds` (label/count/**share**/**rate**/**measure**/other),
  `total_kind` (sum/mean/mixed/none) e `share_of` (qual coluna cada % percentua). **⚠ Redeploy.**
- `checkTableSums`: coluna `measure`/`rate`/`share` não é somável → suprime o falso positivo de
  soma **mesmo quando a heurística min/max não pegaria** (ex.: média ponderada fora do intervalo).
  Duas pistas independentes (aritmética OU semântica), basta uma — mantém FP baixo sem esconder
  erro de soma real (uma `count` continua checada).
- `checkPercentConsistency`: `rate` nunca vira participação; `share_of` dá o pareamento exato
  (não depende de "coluna à esquerda"). A aritmética continua sendo o juiz (share ainda tem de
  somar 100; % tem de bater com abs/total).

Por que generaliza: quem conhece o contexto de cada tabela é o modelo que a leu; quem dá a
garantia é a aritmética. Cobre layouts nunca vistos sem código novo por estudo. Limite honesto
mantido (`custos_visao_reais.md`): tabela **sem** total nem % = zero redundância = nenhuma
validação possível; garantia definitiva = tabela nativa no PPT.

`CACHE_SCHEMA` 3→4 (semântica só é populada em nova extração → reprocessa uma vez, dentro do teto).
**⚠ Redeploy** `analyze-table-image`. Regressão: 25/25 testes (Var.%, measure suprimindo FP,
share_of pareando, e o dígito mal lido ainda sendo pego).

## Versão 0.21 — 2026-07-11 — 2ª rodada de feedback: totais deslocados + subtotal no meio

Mais dois falsos positivos do teste real do Gabriel, ambos corrigidos no lado da **validação**
(rodam sobre o cache existente, sem custo novo):

| Problema observado | Correção | Arquivo |
|---|---|---|
| **s28 — totais deslocados**: a visão derrubou o rótulo "Total" e os valores escorregaram uma célula à esquerda (16.848.551 caiu na coluna de rótulos, 100 sob "SP Absoluto") → toda coluna comparava com o total errado | `toExtracted` realinha: 1ª célula dos totais é **número** enquanto as linhas têm rótulo de texto → reinsere "Total" no início | `ia-vision.ts` |
| **s39 — subtotal no meio**: "A partir de 2022" re-agrega 2022+ → somar todas as linhas conta os anos 2× (Nº: 90 ≠ 49) | Detecção data-driven em `checkTableSums`: se colunas falham e **excluir uma mesma linha** deixa TODAS as colunas somáveis consistentes, a linha é subtotal (dígito mal lido não passa no teste — excluir a linha errada quebra as colunas certas) | `engine.ts` |
| Prompt da edge endurecido: "totals começa com o rótulo e tem exatamente um item por coluna"; "linhas de agregação intermediária ficam em rows" | Reduz os dois modos de falha na origem. **⚠ Redeploy:** `supabase functions deploy analyze-table-image` | `analyze-table-image/index.ts` |

Regressão com as tabelas reais (s28 deslocada, s39 com subtotal + variante adulterada que NÃO
pode se esconder atrás do subtotal): 20/20 testes verdes. Sem migration nova; achados falsos já
salvos podem ser marcados "ignorado".

## Versão 0.20 — 2026-07-11 — Feedback do teste real: médias ≠ somas, pareamento do %, zoom no retry

Ajustes após o 1º teste do Gabriel com estudo real (3 problemas reportados):

| Problema observado | Correção | Arquivo |
|---|---|---|
| **Falso positivo em linha de MÉDIA**: "Vendas s/ O.L.: soma 387,8 ≠ total 82,2" — a linha final era média, não soma (idem "Média Geral" em tabelas de m²/R$/m²) | Heurística em `checkTableSums`: se o valor declarado cai **entre o mínimo e o máximo** da coluna, é média (soma de 2+ positivos nunca fica nesse intervalo) → não é achado | `engine.ts` |
| **Falso positivo em massa no cross-check %**: o % da Oferta Final era pareado com a 1ª coluna numérica da tabela (m² Mínimo) → "24 seria 10,4%…" ×4 | Pareamento novo: % valida **só contra a coluna imediatamente à esquerda** (arranjo padrão dos estudos: "Oferta Lançada \| % \| Oferta Final \| %"); tabelas com vários % validam cada par; denominador que é média não vale | `engine.ts` (`checkPercentConsistency`) |
| **Dígito trocado persistiu** (34.090 lido como 34.909, coluna única sem % → só a soma flagra, e a re-leitura no 4o repetiu o erro) | Re-leitura do escalonamento agora vai com a **imagem ampliada 2×** (OffscreenCanvas, cap 2048px) — mais pixels por dígito na leitura decisiva. `CACHE_SCHEMA` 2→3: reprocessa leituras cacheadas (inclusive a do 34.909) | `ia-vision.ts` (`upscaleForRetry`) |
| **Card obsoleto** "Números presos em imagem — depende da Fase C" aparecia mesmo com a visão rodando automática | `coverageFinding` removido do motor (a Fase C está produtizada; números em imagem SÃO auditados). Achados antigos desse tipo já salvos podem ser marcados "ignorado" | `ir-rules.ts` |

Testes de regressão com as tabelas **reais** das capturas (tipologias s47, padrões s37):
16/16 verdes. Sem migration nova (o schema bump reusa a coluna `schema_version` da v0.19).

## Versão 0.19 — 2026-07-11 — Exatidão da visão: cross-check %↔absoluto + escalonamento p/ 4o

Reação ao bug real do Gabriel (visão leu 100.198 como 116.817). Três reforços contra dígito mal lido:

| Reforço | O que faz | Arquivo |
|---|---|---|
| **Cross-check %↔absoluto** (regra DET nova) | Em tabela com coluna Absoluto + %, cada % tem de bater com `abs_linha/total`. Pega dígito mal lido **mesmo quando a soma fecha** e aponta a **linha exata**. No caso do Gabriel: linha 3 extraída = 17,2% do total, mas a tabela diz 14,7% → flag cirúrgico. Erros minúsculos (linha 6, 45 unidades) ficam no ruído do arredondamento. | `lib/audit/engine.ts` (`checkPercentConsistency`), achado tipo `PERCENTAGE_SUM` |
| **Escalonamento mini→4o** | Se a leitura do modelo econômico **não fecha** (soma ou %↔abs), a MESMA imagem é re-lida no `gpt-4o` (OCR melhor) antes de incomodar o analista. Fica com a leitura que fecha; se ambas falham, mantém a do 4o e marca "provável bug real". Custo sobe só nas tabelas que falham (preço por-modelo correto). | `lib/v3/ia-vision.ts` (`processImage`, `payloadIsClean`) |
| **Versionamento do `vision_cache`** | `schema_version` + `model`: extração antiga (schema < atual) é **reprocessada** — leitura ruim não fica presa por sha1 para sempre. | migration `20260711110000_vision_cache_schema.sql` |

Teste de regressão com os números **reais** do bug: `lib/audit/__tests__/percent-consistency.test.ts`
(aponta a linha 3, ignora a linha 6, null sem par abs+%). Gerador ganhou tabela Absoluto+% (slide 6)
para exercitar o cross-check e o escalonamento ao vivo. **⚠ Aplicar:** migration `20260711110000`
(além da `20260711100000` de evidências). Na 1ª análise após aplicar, as imagens já cacheadas
reprocessam (schema subiu p/ 2).

Fragilidades ainda em aberto (documentadas p/ decisão): tabela **sem** total nem % → sem
auto-validação; recorte/zoom na imagem antes de enviar (mais resolução/dígito); OCR determinístico
(Textract/Document AI) como 2ª opinião; e a garantia estrutural real = **tabela nativa no PPT**.

## Versão 0.18 — 2026-07-11 — v3.3 IMPLEMENTADA: passo único + homepage + evidência + legado v1

Plano de `PLAN_corretor_v3_passo_unico.md` executado (build/typecheck/lint/testes limpos):

| Fase | Entrega | Arquivos |
|---|---|---|
| **0** | Fix do estimador: `calculateImageTokens(w,h,model)` aplica multiplicador do mini (2.833+5.667/tile). Estimativa de 84 tabelas passa de ~R$ 0,26 → ~R$ 1,5-2,1 (bate com o real). | `lib/cost-calculator.ts`, teste `lib/__tests__/cost-calculator.test.ts` |
| **1** | **Passo único**: upload dispara DET + texto + visão automático (fim dos botões "Aprofundar"/"Números"). Teto R$ 4 (`lib/v3/config.ts`) → acima pede confirmação (`BudgetModal`), abaixo roda direto. Banner vivo com custo + **Pausar** (AbortSignal). Visão paralela (5 simultâneas → ~10min vira ~2-3min). | `lib/v3/pipeline.ts`, `lib/v3/config.ts`, `lib/v3/ia-vision.ts` (concorrência+abort), `lib/v3/ia-text.ts` (abort) |
| **2** | Homepage nova: dropzone herói (drag-and-drop) + seções Em correção / Prontos / Legado v1. | `pages/CorretorV3Page.tsx` (`StudySection`/`StudyCard`) |
| **3** | Evidência visual: imagem de tabela com achado sobe p/ bucket `corretor-evidencias` (best-effort, dedup sha1) e aparece **grande no card** ao lado da prova (soma calc×decl). Campos `evidenceSha1`/`evidenceImage` no Finding. **Overlay/bbox por célula fica p/ próxima rodada** (exige mudar a edge + `schema_version` no cache). | `lib/v3/evidence.ts`, `lib/audit/model.ts`, migration `20260711100000_corretor_v3_evidencias.sql` |
| **4** | Legado v1 **somente leitura** (`LegacyV1Panel`, lê `projects/slides/slide_errors` + thumbnails). `/auditoria*` → redirect `/corretor`. Menu perde "Auditoria (v1)". **pdfjs removido do bundle** (−474 KB): motores v1 fora do grafo (arquivos preservados no repo). | `components/LegacyV1Panel.tsx`, `App.tsx`, `AppLayout.tsx` |
| **5** | Gerador de estudo sintético + gabarito + teste de regressão DET (recall 100%, FP 0). | `docs/.../gera_estudo_teste.py`, `lib/v3/__tests__/pipeline-det.test.ts` |

**⚠ Aplicar no Supabase:** migration `20260711100000_corretor_v3_evidencias.sql` (cria o bucket
`corretor-evidencias`). Sem ela, a análise roda normal, só a imagem-evidência não aparece
(upload é best-effort). As edges `analyze-text-batch`/`analyze-table-image` já estavam deployadas.

## Versão 0.17 — 2026-07-11 — Plano aprovado: passo único + homepage + evidência visual + aposentadoria v1

Decisões de Gabriel (11/jul), plano completo em [`PLAN_corretor_v3_passo_unico.md`](./PLAN_corretor_v3_passo_unico.md):

1. **Auto-run total**: IA de texto + visão disparam sozinhas no upload (fim dos botões
   "Aprofundar"/"Números"); teto de **R$ 4/estudo** na fase de testes (acima → confirma).
2. **Bug de estimativa mapeado**: `calculateImageTokens` ignora o multiplicador de imagem
   do gpt-4o-mini (~2.833 base + 5.667/tile) → painel subestima visão ~7× (R$ 0,26 vs
   R$ 1,80 reais em 84 imagens). Fix é a Fase 0 do plano. O custo cobrado (via `usage`)
   sempre esteve correto.
3. **Evidência visual**: imagens de tabela com achado passam a ser persistidas
   (bucket `corretor-evidencias`) e exibidas grandes com overlay na região do erro +
   cartão-prova ao lado (híbrido).
4. **Legado v1 somente leitura**; motores v1 (analyze-slide, pdfjs, análise slide-a-slide)
   serão aposentados; `/auditoria` → redirect `/corretor`.
5. **Gerador de estudo sintético** (`gera_estudo_teste.py`, a criar) com erros injetados +
   gabarito JSON, para testar o pipeline por ~R$ 0,20/rodada.

Nenhuma regra mudou nesta versão (só decisões de produto/fluxo).

## Versão 0.16 — 2026-07-09 — v3.2: números das imagens (Fase C produtizada)

O reconhecimento numérico a partir das imagens saiu do piloto manual e entrou no app:

| Item | Arquivo | Detalhe |
|---|---|---|
| Edge de visão | `supabase/functions/analyze-table-image/` | 1 imagem → JSON `{tables:[{title,columns,rows,totals}]}`; números pt-BR convertidos; dígito ilegível = null (nunca inventa); legendas de mapa ignoradas. **Deploy:** `supabase functions deploy analyze-table-image`. |
| `vision_cache` | migration `20260709120000` | sha1 da imagem → payload. Cada imagem é paga **1× para sempre** (compartilhado entre estudos/versões). **Aplicar.** |
| Localizador | `lib/v3/table-images.ts` | Porte do `scan_imagens.py` p/ o navegador: rels→slides de seções numéricas, dims via header PNG/JPEG, heurística de tabela (15-500KB, ≥700px larg., aspecto ≥1.2), dedupe sha1. Verificado nos PPTX reais: **Marka 46 / Itajaí 32 candidatas** (inclui as do piloto: s41/s59/s60). |
| Passe de visão | `lib/v3/ia-vision.ts` | cache-first → edge → **auto-validação** `checkTableSums` (linha×coluna×total; tolerância ±n/2) → achados `ABSOLUTE_SUM` (com aviso "pode ser dígito mal lido — confira na imagem") e `BINNING_RULE` (furo de faixa via cabeçalhos). |
| Painel | `CorretorV3Page` | "Números das tabelas (imagem)": localiza candidatas, mostra quantas já estão no cache, custo estimado antes, progresso por imagem; achados com selo IA. |

Custo estimado: ~R$ 0,02/img (mini) → estudo completo ~R$ 0,7–1,0 na 1ª vez, ~R$ 0 nas seguintes (cache).

## Versão 0.15 — 2026-07-09 — v3.1 (IA de texto) + navegação sem rail + SOURCE_MISSING off

**Feedback do 1º teste do Gabriel aplicado:**

1. **Navegação sem menu duplo** — `/corretor` perdeu o rail lateral: agora é **landing com
   cards** dos estudos (status, pendentes, custo de IA) → clica → workspace com "← voltar".
   Só o menu global da plataforma permanece.
2. **`SOURCE_MISSING` desativada** — regra determinística desligada por flag
   (`RULES_ENABLED` em `ir-rules.ts`): veio do doc de parâmetros recente, mas na prática o
   time não preenche fonte/elaboração. Reativável na flag. (Marka: 35→17 achados.)
3. **v3.1 — Aprofundar com IA (texto)**:
   - Edge function `analyze-text-batch` (deploy pendente: `supabase functions deploy analyze-text-batch`):
     SPELLING/CITY_NAME/COHERENCE sobre o **texto do IR**, até 20 slides/chamada, prompt
     conservador, JSON estrito. Mesmo modelo de CORS/rate-limit do analyze-slide.
   - Cliente `lib/v3/ia-text.ts`: batches de 12, **custo estimado antes de rodar**
     (Marka completo: ~US$ 0,004 no mini ≈ **R$ 0,02/estudo** — vs ~R$ 6 da visão v1),
     IDs estáveis por conteúdo (`iatxt-<slide>-<tipo>-<hash>`).
   - Painel roxo "Aprofundar com IA" no workspace: seletor de modelo, estimativa, progresso
     por lote; achados entram na worklist com selo **IA**; custo acumula em
     `studies_v3.custo_total` + linha em `ia_passes` (migration `20260709110000` — **aplicar**).
   - Integridade: rodar IA exige o .pptx da versão atual (sha1 validado; arquivo ≠ vN → orienta Reconferir).
4. **Fix no diff**: `recheck()` agora compara só achados **DET** — achados de IA não são mais
   dados como resolvidos indevidamente no re-upload (só um novo passe de IA os resolve).

## Versão 0.14 — 2026-07-09 — v3.0: fluxo unificado no ar (`/corretor`)

Primeira fatia da v3 (`DESIGN_corretor_v3.md`) implementada — o fluxo completo sem IA:

| Item | Arquivo | Detalhe |
|---|---|---|
| Migration | `supabase/migrations/20260709100000_corretor_v3.sql` | `studies_v3`, `study_versions`, `findings_v3` (rule_id estável, status pendente/corrigido/ignorado, familia local/relacional, resolvido_na_versao). **⚠ Aplicar no Supabase.** |
| Persistência | `lib/v3/db.ts` | criar estudo, listar/retomar sessões, status por achado, `recheck()` com diff por rule_id (sumiu→corrigido; persiste e estava corrigido→volta a pendente; novo→insere), concluir. |
| Página | `pages/CorretorV3Page.tsx` (rota **`/corretor`**) | Rail de estudos (retomar sessão) → upload .pptx → triagem DET (R$0) → worklist (por slide + entre-slides) com status → barra de progresso rumo a zero → **Reconferir** (sobe versão corrigida, banner resolvidos/persistem/novos) → **Entregar** (só com 0 pendentes). |
| Navegação | `AppLayout` | "Corretor (v3)" no menu; v1 renomeada "Auditoria (v1)" até a aposentadoria (v3.3). |

Decisões desta rodada (Gabriel): rota `/corretor`; analista dispara IA livremente (v3.1+);
calibração bug/fp segue camada separada (analista-calibradora) do status de correção.

## Versão 0.13 — 2026-07-09 — PPTX → IR no navegador (upload direto do estudo)

O extrator saiu do Python e passou a rodar **no navegador**: o analista sobe o **`.pptx`**
padrão na Auditoria v2 e o IR é gerado na hora, sem servidor e sem custo.

| Item | Arquivo | Detalhe |
|---|---|---|
| Extrator TS | `lib/audit/pptx-to-ir.ts` | Porte fiel do `ir_extractor.py`: zip via `fflate` (decompacta só os XMLs de slide), XML via `DOMParser`. Texto por shape, seção canônica, tabelas (números pt-BR), fontes, notas de edição, imagens, flag resposta-múltipla. Gráficos ficam para a 2ª rodada. |
| Upload | `AuditoriaV2Page` | Botão "Carregar estudo (.pptx)" aceita `.pptx` **e** `.ir.json`; extração no cliente. |
| Dep | `fflate` | Lib de zip (~8 KB). |

**Verificação decisiva:** o extrator TS produz IR **idêntico ao Python** nos 2 estudos reais —
slides (143/165), tabelas (47/36), notas de edição (22/14), fontes (58/77) e a **distribuição
completa de seções** batem exatamente. tsc/eslint/build limpos. Responde à dúvida do Gabriel:
agora sobe-se o PowerPoint direto, o `.ir.json` deixa de ser pré-requisito.

## Versão 0.12 — 2026-07-09 — Mapas/raios (nível 1) + persistência de thumbnails

**Item 1 — Mapas/raios (nível 1 DET).** Regra `RADII` sobre o IR (`ir-rules.ts`): raios
canônicos = maior legenda modal; sinaliza slide com raio **estranho** ao canônico (subconjuntos
passam). Novo padrão de visualização **mapa** (`MapViz`): chips esperado × detectado.
Verificado no IR real: Itajaí acha 3 slides com "15 min" num estudo 10/20/30 (s91/s92/s101);
Marka consistente. Nível 2 (visão sobre a imagem do mapa) segue planejado.

**Item 2 — Persistência de thumbnails (§5 do handoff).** Migration `20260709` (`projects.reviewed_at`
+ policy). `archive-db.ts`: passa a **persistir a thumbnail de TODOS os slides** (não só com erro);
`getThumbnailUrl` (URL assinada, bucket privado); `markProjectReviewedInDb` **poda as imagens dos
slides OK** ao concluir a revisão. UI (`CorretorPage`): thumbnail no card de erro + botão
"Concluir revisão" + selo "Revisão concluída". Racional: auditar **falso negativo** (o corretor
disse OK e tinha bug) — evidência que antes não guardávamos.

> ✅ Migration `20260709` **aplicada no Supabase em 2026-07-09** (Gabriel). Persistência de
> thumbnails + poda na conclusão da revisão ativas em produção.

## Versão 0.11 — 2026-07-09 — Ingestão de IR no navegador (estudos reais)

A Auditoria v2 deixou de depender das fixtures: agora carrega o **`.ir.json` de qualquer
estudo** (o mesmo artefato do `ir_extractor.py`) e roda o motor DET no browser.

| Item | Arquivo | Detalhe |
|---|---|---|
| Tipos do IR | `lib/audit/ir.ts` | Espelho do schema `ir_version 1` + mapa seção canônica → seção de auditoria. |
| Motor DET sobre o IR | `lib/audit/ir-rules.ts` | Porte TS do `rules_ir.py`: LEFTOVER_NOTE, SOURCE_MISSING, soma de tabelas nativas (ABSOLUTE_SUM), cobertura de seções, diagnóstico de números-em-imagem. |
| Upload na UI | `AuditoriaV2Page` | Botão "Carregar .ir.json" → vira um estudo no seletor, com veredito e export próprios. |

**Verificação decisiva:** o parser TS rodado sobre os 2 IR reais **reproduz a Fase A**
(Itajaí 22 notas + 23 fonte; Marka 14 + 19) e o diagnóstico de números-em-imagem dispara (0
tabelas numéricas). Se o estudo trouxer **tabelas nativas**, a soma determinística acende
sozinha — a prova viva do argumento de `custos_visao_reais.md`. Build/typecheck/lint limpos.

## Versão 0.10 — 2026-07-09 — Auditoria v2 vira instrumento de validação

A demo `/auditoria/v2` passou de "visualização" a **ferramenta de teste com o analista**:

| Item | Arquivo | Detalhe |
|---|---|---|
| Persistência de vereditos | `lib/audit/session.ts` | Vereditos (bug/fp/não sei) salvos em localStorage — sessão sobrevive a reload. |
| Export do dataset rotulado | `session.ts → exportReviewCsv` | Botão "Exportar revisão": CSV (estudo, seção, tipo, modo, motor, slide, título, checagem, **nota-gabarito**, veredito) — é o dado de recall/precisão. |
| Calibração ao vivo | `AuditoriaV2Page` painel | Recall = confirmados/gabarito; conta falsos positivos. Verificado via tsx: 3/3 gabarito → recall 100%. |

Fecha o loop da estratégia: o analista revê os achados, dá veredito, exporta → **conjunto
rotulado** para medir o corretor contra o trabalho humano. Build/typecheck/lint limpos.

## Versão 0.9 — 2026-07-09 — Fase E: Auditoria v2 no app (demo com fixtures)

Interface v2 implementada no app (`/auditoria/v2`), rodando sobre as **fixtures reais do
piloto** — custo de IA **R$ 0**. Segue o `HANDOFF_fase_e_interface.md`.

### O que entrou no código

| Item | Arquivo | Detalhe |
|---|---|---|
| Catálogo central de erros | `src/features/corretor/lib/error-catalog.ts` | 21 tipos com metadados (modo PLENO/β/MOCK, padrão de visualização, motor). `ErrorType` da v1 agora vem daqui (retrocompatível). |
| Motor DET em TS | `lib/audit/engine.ts` | Porte de `valida_complemento.py`/`crosscheck_piloto.py`: soma linha/coluna/total, faixas cruzadas, furo de bin. Verificado: s41 e s121 fecham (igual ao piloto Python). |
| Fixtures do piloto | `lib/audit/fixtures.ts` | 22 achados (Itajaí 10 + Marka 12) a partir das tabelas reais + notas-gabarito. Reproduz as notas do analista via engine. |
| Visualizações | `components/audit/FindingCard.tsx` | 4 renderizadores: tabela com células marcadas, comparação lado-a-lado, régua de faixas, texto/checklist. |
| Página | `pages/AuditoriaV2Page.tsx` | Sumário + cobertura dos 21 tipos + achados por seção + veredito (bug/fp/não sei) por achado. |

### Modos (honestidade na UI)

Cada achado exibe seu modo: **PLENO** (regra completa), **β** (aproximação, validar), **demo/MOCK**
(visualização com fixture, motor pendente). Os 21 tipos aparecem entre os 2 estudos.
Build/typecheck/lint limpos.

## Versão 0.8 — 2026-07-09 — Decisão do gestor + inventário de regras

- **Decisão (gestor da área):** tabelas em **imagem seguem como padrão** por enquanto — testes
  avançam sobre esse formato. Médio prazo (semanas): conversas com a área de elaboração sobre
  tabelas nativas; alternativa a explorar depois: **pré-análise dos Excels de trabalho**
  (antes dos prints), batendo os números direto na origem.
- **Inventário completo de regras em linguagem natural:**
  [`regras_em_linguagem_natural.md`](./regras_em_linguagem_natural.md) — 24 regras (6 RUNTIME
  no app v1, 8 POC validadas em script, 10 planejadas) + as 11 bases de conhecimento que as
  sustentam (3 pendentes: fórmula de projeção, fonte IBGE, extração de atas).
- **Próximo foco:** aparência do app de correção e visualização de erros (Fase E).

## Versão 0.7 — 2026-07-09 — Piloto expandido: notas reproduzidas + custos em R$

Piloto expandido para **6 complementos** (pares de validação cruzada). Resultado central:
**o corretor reproduziu as notas da analista a partir dos números crus** — recall total no
escopo pilotado, mais um bug bônus que ela não anotou.

### Achados do cross-check (`crosscheck_piloto.py`)

| Regra | Achado | Nota-gabarito reproduzida |
|---|---|---|
| `CROSS_TABLE_MISMATCH` | Ita s59 faixa 4 «21.831–30.572» ≠ s41/s60 «25.710–34.360» | "Ajustar com as mesmas rendas do slide" |
| `CROSS_TABLE_MISMATCH` | Mrk s121×s122 Oferta Lançada 12.143 ≠ 5.478 (mesma Z.I.) | "Ajustar com os valores…tabela de lacunas geral" |
| `TEMPORAL_WINDOW` | Ita s59 projeta 2026-2031, s60 projeta 2025-2030 (irmãos) | "verificar essa taxa…" / rubrica 6 anos |
| `BINNING_RULE` | Mrk s122: furo de faixa R$/m² (9501–10000 inexistente) | **bônus — não anotado pela analista** |

### Calibração aprendida

- `valida_complemento.py`: 107 OK, 13 "inconsistências" — todas off-by-1/2 em projeções =
  **arredondamento de exibição** (células arredondadas individualmente). Política: tolerância
  ±n/2 unidades em tabelas de projeção (não ±0.5).

### Custos em R$ (para a conversa com os analistas)

[`custos_visao_reais.md`](./custos_visao_reais.md): extração por imagem ≈ **R$ 0,02–0,08/img**
→ **R$ 1,50–6,80/estudo** → R$ 380–4.100/ano conforme volume/modelo. Tabela nativa: **R$ 0**.
Argumento decisivo não é a API: é **exatidão por construção + pipeline zero**.

## Versão 0.6 — 2026-07-09 — Fase C iniciada: piloto de visão validado

Piloto da extração de números presos em imagem — **provado de ponta a ponta**
(design completo em [`fase_c_visao.md`](./fase_c_visao.md)):

| Item | Status | Detalhe |
|---|---|---|
| `scan_imagens.py` | `POC` (versionado) | Manifest de imagens por slide com sha1 (chave do cache): 487 refs → 334 únicas → **154 únicas em seções numéricas** → 28 no gabarito. |
| `visao/piloto/*.complemento.json` | versionado | 2 extrações-piloto (Ita s41 renda, Mrk s121 lacunas) no schema `ir_complemento_visao/v0` — espelha `linhas_num` do IR. |
| `valida_complemento.py` | `POC` (versionado) | Checagens DET sobre os complementos: **48 OK, 0 inconsistências**. Redundância linha×coluna×total **auto-valida a extração** (dígito errado quebra soma). |
| Argumento econômico p/ analistas | documentado | Tabela nativa no PPT = 0 chamadas de visão para sempre + exatidão por construção; transição sugerida começando por lacunas/renda/absorção. Ver `fase_c_visao.md`. |

## Versão 0.5 — 2026-07-08 — Virada: notas = especificação + gabarito

**Reinterpretação decisiva.** As notas em balão dos estudos ("Ajustar o erro da fórmula",
"verificar essa taxa") **não são bugs a sinalizar** — são as **instruções do analista humano**,
que o corretor vem **substituir**. Nos estudos reais elas não virão. Logo:

- **`LEFTOVER_NOTE` rebaixada** de tipo principal para **rede de segurança**.
- As 36 notas viram **catálogo de tipos de erro** (engenharia reversa) + **gabarito de validação**
  (recall/precisão). Taxonomia minerada em [`taxonomia_notas.md`](./taxonomia_notas.md).

### Tipos de erro derivados das notas reais

| Tipo | Motor | Origem |
|---|---|---|
| `CROSS_TABLE_MISMATCH` | DET (se houver dado) | "mesmas rendas do slide", "valores da tabela de lacunas geral", pop./domicílios |
| `PROJECTION_FORMULA` | DET c/ fórmula da analista | "erro da fórmula", "taxa do Brasil" |
| `VALUE_PLAUSIBILITY` | DET (faixa/monotonic.) + IA | "está estranho", "60% é muita coisa", "unidade maior + 2 vagas + m² menor" |
| `WRONG_CONTEXT` | DET (cidade/estado) + IA | "informações do estudo do Brooklin, corrigir" |
| `BINNING_RULE` | DET | "agrupar acima de R$34.360" |
| `LAYOUT` | **fora de escopo** | "ajustar largura da coluna" |

### Impacto na arquitetura

A maioria das correções humanas depende de **números presos em imagem** → a **extração de
visão dos números (Fase C) vira caminho crítico**, não opcional. Sem ela, o corretor não
reproduz o que o humano faz. Estratégia reordenada no `DESIGN_corretor_v2.md` (Fase 0→E).

## Versão 0.4 — 2026-07-08 — Fase A: motor de regras DET sobre o IR

`rules_ir.py` — motor de regras determinísticas **puro sobre o IR JSON** (zero IA). Rodado nos
2 estudos reais. Relatório completo em [`achados_fase_a.md`](./achados_fase_a.md).

### Regras implementadas (todas `RUNTIME` como POC executável, motor DET)

| Regra | Itajaí | Marka | O que faz |
|---|---|---|---|
| `LEFTOVER_NOTE` | 22 | 14 | Notas internas de edição esquecidas no deck (de `notas_edicao` do IR). |
| `SOURCE_MISSING` | 23 | 19 | Slide com tabela/gráfico sem "fonte/elaboração" **em texto**. Falsos positivos quando a fonte está em imagem. |
| `PERCENTAGE_SUM` | 0 | 0 | Séries/colunas proporcionais que não fecham 100% (ignora resposta múltipla). Sem material aqui. |
| `TEMPORAL_WINDOW` | 3 | 0 | Janela de projeção SOCIO ≠ 2027–2032. Confirmar janela canônica com a analista. |

### Achado estrutural decisivo

Nos 2 estudos, **os números estão presos em imagem** (tabelas c/ número parseado = **0/47** e
**0/36**; imagens = 264 e 225). As tabelas nativas são legendas de mapa. As regras numéricas de
consistência ficam **sem material** → destrava só na **Fase C** (visão pontual sobre as imagens
de tabela, com cache) ou com estudos que tragam tabelas nativas.

### Artefatos

| Item | Status | Detalhe |
|---|---|---|
| `rules_ir.py` | `POC` (versionado) | Motor DET puro sobre IR. `python rules_ir.py` roda em `ir/*estudo exemplo.ir.json`. |
| `calibracao/*.secao.csv` | versionado | Tabela `slide, titulo, secao_detectada, secao_correta` p/ a analista preencher (**Fase B**). |
| `achados_fase_a.md` | versionado | Relatório de achados (snapshot reproduzível). |

## Versão 0.3 — 2026-07-08 — Amostras reais + ata como imagem

Chegaram **2 estudos vocacionais reais e completos** (muito maiores que as 2 amostras de
teste anteriores), que passam a ser a base de calibração do plano v2.

### Amostras (locais, gitignored — pesadas)

| Estudo | Tipo | Slides | Tabelas | Fonte-em-texto | Notas edição |
|---|---|---|---|---|---|
| Itajaí/SC — Élio Winter (Av. Itaipava) | Horizontal (lotes) | 143 | 47 | 56 | 22 |
| Marka Prime / Tancredo — Guarulhos/SP | Vertical (8 torres, 1.912 un.) | 165 | 36 | 77 | 14 |

> Arquivos `*_estudo exemplo.pptx` adicionados ao `.gitignore` (157 MB e 93 MB — acima do
> limite do GitHub). Vivem locais; o IR é regenerável via `ir_extractor.py`.

### Achados

| Achado | Status | Detalhe |
|---|---|---|
| **Ata no slide 1 é IMAGEM, não texto** | `LACUNA` | Em ambos os estudos a ata está no slide 1, mas como print (`pic`/`blip`), não como texto. O IR v1 extrai do slide 1 só o título ("Vocacional Horizontal/Vertical"). Todo o conteúdo da ata (produto pretendido, dúvidas do cliente, instruções ao analista) é invisível ao extrator atual. |
| **Regressão da seção canônica v0** | `POC` | Em estudos reais o dicionário v0 deixa muitos slides sem seção: **64/143 (Itajaí)** e **48/165 (Marka)** como `(sem seção)`. Reforça a urgência da calibração (item 2 do plano) — agora com material real. |
| **Ata como contrato de auditoria** | `PLANEJADA` | A ata traz o "pedido do cliente" (ex.: Itajaí — "slide separado com previsão de entrega checada na conferência da base"). É a fonte natural das **regras cruzadas ata × estudo**. Decisão de formato de ingestão em aberto (ver abaixo). |

### Decisão em aberto — formato de ingestão da ata

A ata não deve depender de OCR/visão sobre um print. Alinhar com o time para que a ata venha
como **documento textual separado e leve** (`.docx`/`.txt`/`.md`) por estudo — versionável e
parseável direto, sem passo de imagem. Ver proposta de convenção de artefatos por estudo.

## Versão 0.2 — 2026-07-07 — IR versionado e validado

Entregável 1 do plano v2 (DESIGN_corretor_v2.md): a **Representação Intermediária (IR)**
saiu de "não rastreado" para artefato versionado e validado nas 2 amostras PPTX.

### O que mudou

| Item | Status | Detalhe |
|---|---|---|
| `ir_extractor.py` | `POC` (agora versionado) | PPTX → IR JSON (`ir_version: 1`). Parser XML real (`xml.etree`, só stdlib), não mais regex sobre XML cru. |
| `docs/features/corretor-vocacionais/ir/` | derivado, **gitignored** | Saídas `.ir.json` por estudo (~0,2 MB cada); regeneráveis a partir das amostras locais. |
| Seção canônica v0 | `POC` | Dicionário título→seção embutido no extrator (`SECOES`): CAPA, LACUNAS, ABSORCAO, IDENTIFICACAO, SOCIO, MERCADO, ENTORNO, CONCLUSAO. Ordem importa (específico antes de genérico: "TABELA DE LACUNAS … Z.I." é LACUNAS, não IDENTIFICACAO). **Calibrar com a analista** — é o item 2 do plano. |

### Schema do IR (v1)

```
{ ir_version, arquivo, sha1, gerado_em, n_slides,
  slides: [ { n, titulo, secao_canonica,
              textos[]          // texto POR SHAPE (parágrafos unidos)
              fontes[]          // parágrafos "FONTE: … | ELABORAÇÃO: …" íntegros
              notas[]           // notas explicativas (*, nota:, obs.)
              notas_edicao[]    // candidatos a LEFTOVER_NOTE
              tabelas[]         // { n_linhas, n_colunas, linhas (raw), linhas_num (pt-BR parseado) }
              graficos[]        // { arquivo, titulo_grafico, series: [{nome, categorias, valores}] }
              n_imagens,
              flags: { resposta_multipla } } ] }
```

### Sintomas resolvidos vs. POC v2

- **Fragmentação de runs** (quebrava a detecção de FONTE): resolvida agrupando texto
  por shape/parágrafo. Ex.: `'FONTE: IBGE 2022 | ELABORAÇÃO: BRAIN'` agora sai íntegro.
- **Título de slide**: usa o placeholder oficial (`<p:ph type="title">`); fallback
  heurístico pula legendas de fonte/notas.
- **Números pt-BR** parseados uma vez no IR (`linhas_num`): "1.234,56" → 1234.56,
  "82%" → 82.0, "R$ 5.000" → 5000.0.

### Validação (prova de suficiência do IR)

`PERCENTAGE_SUM` reimplementada como função pura **só sobre o IR JSON** (sem tocar no
PPTX) reproduziu os achados do `poc_extractor.py` no estudo GO: **9 candidatos a bug +
1 explicado por resposta múltipla**, agora com seção canônica anexada (todos em
`MERCADO`; ex.: slide 143 «Tabelas de preço | Apartamento de 90m²» soma=112%).

Números por amostra (IR final):

| Estudo | Slides | Tabelas | Gráficos | Fonte-em-texto | Notas de edição | Sem seção (v0) |
|---|---|---|---|---|---|---|
| GO (Construtora Regional) | 203 | 7 | 77 | 42 | 4 | 97 |
| Masterplan | 333 | 100 | 9 | 161 | 3 | 211 |

O "sem seção" alto é esperado: slides de conteúdo interno (mapas, fotos, empreendimento
individual) não têm título de seção — a segmentação v1 (item 2 do plano) deve propagar a
seção do último slide-título para os slides seguintes, além de calibrar o dicionário.

## Versão 0.1 — 2026-07-07 — Inventário inicial

### Escopo atual em runtime

O fluxo atual do app é:

`PDF -> rasterização por página no frontend -> imagem JPEG/base64 -> edge function analyze-slide -> OpenAI Vision -> JSON de erros -> histórico Supabase`

Arquivos principais:

| Arquivo | Papel |
|---|---|
| `src/features/corretor/components/NewProjectForm.tsx` | Upload/configuração de nova análise. |
| `src/features/corretor/pages/CorretorAnalysisPage.tsx` | Rasteriza PDF, processa slides em paralelo e salva resultado. |
| `src/features/corretor/lib/openai-analyzer.ts` | Chama a edge function `analyze-slide`. |
| `supabase/functions/analyze-slide/index.ts` | Valida request, monta prompt, chama OpenAI e normaliza resposta. |
| `src/features/corretor/store/analysis-store.ts` | Tipos aceitos de erro e estado da análise. |
| `src/features/corretor/lib/archive-db.ts` | Persistência de projetos, slides, erros e vereditos. |
| `src/features/corretor/pages/CorretorPage.tsx` | Histórico e revisão bug real x falso positivo. |

### Regras IA/LLM em runtime

Fonte: prompt hardcoded em `supabase/functions/analyze-slide/index.ts`.

| ID | Status | Motor | Regra | Observações |
|---|---|---|---|---|
| `CITY_NAME` | `RUNTIME` | `IA/LLM` | Qualquer cidade visível no slide deve ser a cidade configurada no projeto. | Vale para títulos, subtítulos, barras de busca, legendas, rodapés e tabelas. |
| `SPELLING` | `RUNTIME` | `IA/LLM` | Texto legível deve ser revisado quanto a erros de ortografia em português. | Regra global. |
| `PERCENTAGE_SUM` | `RUNTIME` | `IA/LLM` | Em tabelas numéricas, cada coluna de percentual deve somar 100% na linha total. | Apesar de ser logicamente determinística, hoje é aplicada pela visão da OpenAI. |
| `RADII` | `RUNTIME` | `IA/LLM` | Referências a raios/zonas de tempo devem bater com os raios configurados. | No design v2 tende a virar conceito de Z.I. primária/total/múltiplas Z.I.s. |
| `COHERENCE` | `RUNTIME` | `IA/LLM` | Números citados em texto descritivo devem coincidir com valores de tabela. | Verificação isolada por slide, sem memória entre slides. |
| `noReview` | `RUNTIME` | `IA/LLM` | Slides sem texto legível devem retornar `noReview: true`. | O app marca como `skipped`. |

Tipos aceitos hoje no frontend:

```ts
PERCENTAGE_SUM | CITY_NAME | RADII | SPELLING | COHERENCE
```

### Regras determinísticas operacionais em runtime

| Regra | Status | Motor | Fonte | Observações |
|---|---|---|---|---|
| Aceitar somente PDF no upload | `RUNTIME` | `DET` | `NewProjectForm.tsx` | A UI instrui exportar o PPTX como PDF. |
| Campos obrigatórios | `RUNTIME` | `DET` | `NewProjectForm.tsx` | Projeto, cidade, raios, arquivo e contagem de páginas. |
| Modelos permitidos | `RUNTIME` | `DET` | `analysis-store.ts`, `analyze-slide/index.ts` | `gpt-4o` e `gpt-4o-mini`. |
| Limite de payload | `RUNTIME` | `DET` | `analyze-slide/index.ts` | Base64 limitado a 7.000.000 caracteres. |
| Validação de request | `RUNTIME` | `DET` | `analyze-slide/index.ts` | `base64`, `slideNumber`, `total` e `model`. |
| CORS allowlist | `RUNTIME` | `DET` | `analyze-slide/index.ts`, `SECURITY_NOTES.md` | Localhost + `ALLOWED_ORIGINS`. |
| Rate limit best-effort | `RUNTIME` | `DET` | `analyze-slide/index.ts` | 30 req/min por IP, em memória. |
| Concorrência de processamento | `RUNTIME` | `DET` | `CorretorAnalysisPage.tsx` | `CONCURRENCY = 4`. |
| Salvar thumbnail só quando há erro | `RUNTIME` | `DET` | `archive-db.ts` | Apenas slides com erro e `imageDataUrl`. |
| Veredito bug real/falso positivo | `RUNTIME` | `DET` | `CorretorPage.tsx`, `archive-store.ts`, migration `20260705000000` | Base para calibração da v2. |

### Catálogo v2 planejado

Fonte: `docs/features/corretor-vocacionais/DESIGN_corretor_v2.md` e `Vocacionais_parametros_de_correcao.pptx`.

| ID proposto | Status | Motor proposto | Regra |
|---|---|---|---|
| `STRUCTURE_MISSING` | `PLANEJADA` | `DET` | Verificar presença das seções esperadas do estudo. |
| `CITY_STATE` | `PLANEJADA` | `DET+extração` | Cidade e Estado devem ser os do estudo. |
| `TEMPORAL_WINDOW` | `PLANEJADA` | `DET` | Projeção sociodemográfica deve cobrir janela de 6 anos. |
| `PROJECTION_FORMULA` | `PLANEJADA` | `DET` | Conferir fórmula de projeção quando a analista fornecer a fórmula. |
| `SOURCE_MISSING` | `PLANEJADA` | `DET` | Slides/análises devem indicar fonte e elaboração. |
| `CROSS_TABLE_MISMATCH` | `PLANEJADA` | `DET+extração` | População, domicílios, faixas de renda e totais devem bater entre tabelas relacionadas. |
| `ABSOLUTE_SUM` | `PLANEJADA` | `DET+extração` | Colunas de valor absoluto devem fechar no total. |
| `PERCENTAGE_SUM` | `PLANEJADA` | `DET+extração` | Percentuais devem fechar em 100%, respeitando exceções como resposta múltipla. |
| `IBGE_MISMATCH` | `PLANEJADA` | `DET` | Percentuais de domicílios devem bater com referência IBGE Censo 2022. |
| `MAP_CHART_MISMATCH` | `PLANEJADA` | `IA/visual` ou `DET` | Dados do mapa devem bater com gráfico correspondente. |
| `REQUIRED_NOTE` | `PLANEJADA` | `DET` | Notas obrigatórias devem aparecer, como absorção desconsiderando 2a moradia. |
| `TOTALS_EQUALITY` | `PLANEJADA` | `DET+extração` | Total de oferta lançada deve bater com unidades por tipologia e consolidada. |
| `EXCLUSION_RULE` | `PLANEJADA` | `DET+extração` | Lacunas devem desconsiderar Gardens, Duplex, Coberturas e, conforme análise, esgotados. |
| `SPELLING` | `PLANEJADA` | `IA/LLM` | Ortografia PT-BR. |
| `ATA_COVERAGE` | `PLANEJADA` | `IA+DET` | Verificar se tudo que a ata pediu foi contemplado no estudo. |
| `LEFTOVER_NOTE` | `PLANEJADA` | `DET` | Detectar notas internas de edição esquecidas no deck. Surgiu nos achados de POC. |

### POCs e extração determinística

| Arquivo | Status | Conteúdo |
|---|---|---|
| `docs/features/corretor-vocacionais/poc_extractor.py` | `POC` | Extrai tabelas/gráficos do PPTX por XML e executa `PERCENTAGE_SUM`, `LEFTOVER_NOTE`, `SOURCE_MISSING`. |
| `docs/features/corretor-vocacionais/ir_extractor.py` | `POC` | Gera IR JSON normalizado com slides, título, seção canônica, fontes, notas, tabelas, gráficos e flags. Atualmente não rastreado no git. |
| `docs/features/corretor-vocacionais/ir/*.ir.json` | `POC` | Saídas derivadas do IR para amostras reais. Atualmente não rastreadas no git. |

Decisão de arquitetura v2 registrada: preferir ingestão de PPTX em vez de PDF sempre que possível, porque o PPTX preserva dados estruturados de tabelas e gráficos. PDF fica como fallback visual/OCR.

### Documentos de referência

| Documento | Tipo de informação |
|---|---|
| `docs/features/corretor-vocacionais/Vocacionais_parametros_de_correcao.pptx` | Rubrica fonte de verdade das regras de correção. |
| `docs/features/corretor-vocacionais/Ata_Reuniao_Briefing_Grupo_Impper_Sao_Jose_do_Rio_Preto.docx` | Exemplo de ata/briefing, base futura para cobertura entre pedido e entrega. |
| `docs/features/corretor-vocacionais/DESIGN_corretor_v2.md` | Arquitetura v2, filosofia "mínimo de IA", catálogo regra -> tipo -> motor e achados de amostras. |
| `docs/architecture/SECURITY_NOTES.md` | RLS, CORS, rate limit, secrets e veredito de revisão. |
| `supabase/migrations/20260507000000_create_corretor_tables.sql` | Schema inicial do Corretor e policies abertas a anon. |
| `supabase/migrations/20260705000000_verdict_and_activity_log.sql` | Veredito `bug`/`fp` e log de atividade. |

## Próxima versão esperada

Abrir `Versão 0.3` quando uma destas mudanças acontecer:

- enum de erros crescer no frontend;
- alguma regra planejada virar função executável sobre o IR (catálogo executável — item 3 do plano);
- segmentação canônica v1 (propagação de seção + dicionário calibrado com a analista — item 2);
- chegada do material da analista: par ata↔estudo (`ATA_COVERAGE`), fórmula de projeção (`TEMPORAL_WINDOW`/`PROJECTION_FORMULA`), fonte IBGE (`IBGE_MISMATCH`);
- o fluxo do app mudar de PDF rasterizado para PPTX/IR;
- prompt do LLM mudar;
- regra for calibrada por veredito da analista;
- regra for removida ou reclassificada entre `DET` e `IA/LLM`.
