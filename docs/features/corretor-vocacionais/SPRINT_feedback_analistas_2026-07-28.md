# Sprint de correção — Feedback dos analistas (28/jul/2026)

**Fontes:** apontamentos de **Daniele Nunes** (Rolândia), **Beatriz Pontes** (Housi/São José dos
Campos) e **Lucas Finoti** (Housi/São José dos Campos) — primeiros usos reais do Corretor.
**Verificação em banco (28/jul):** 102 achados em 4 estudos (22–24/jul). Números que ancoram o sprint:

| Estudo | Achados | Triados | FP confirmados |
|---|---|---|---|
| Rolândia v1 (Daniele) | 17 | 17 | **17 (100%)** |
| Housi Sebastião v2 | 20 | 19 | **19 (100% dos triados)** |
| Housi Sebastião v1 | 39 | 0 | — (pendentes) |
| Housi Raimundo v1 | 26 | 0 | — (pendentes) |

Distribuição por tipo (4 estudos): `WRONG_CONTEXT` 54, `SOURCE_MISSING` 33, `CROSS_TABLE_MISMATCH` 7,
`ABSOLUTE_SUM` 6, `STRUCTURE_MISSING` 4, `SPELLING` 2. **Este é, na prática, o início da homologação
real** — e o resultado é o inverso da meta (FP ≤15%): nos estudos triados o FP foi ~100%.

> Leitura honesta: o motor *encontrou* pouca coisa falsa e nada substantivo que os analistas
> confirmassem como bug real; e **deixou passar 3 erros reais** que o Lucas achou manualmente.
> O sprint ataca as duas pontas: matar as famílias de FP e abrir as capacidades que faltaram.

---

## Parte 1 — Falsos positivos: causa-raiz por família

### CH-1 · Checklist estrutural acusa "ausente" o que vive em mapa/imagem (Daniele)
- **Evidência (banco):** payload do `structure` da Rolândia — os itens `missing` são exatamente os
  de mapa/imagem: Endereço, Lat/long, Acessos, Distância ao centro, Mapas (densidade, renda,
  verticalização, propriedade, localização, R$/m², estoque, área média), Consolidada, Fichas.
- **Causa:** [`structure-checklist.ts:57-58`](../../src/features/corretor/lib/audit/structure-checklist.ts#L57-L58)
  procura o item por **título + 2 primeiras linhas de texto** do slide. Conteúdo que é imagem
  (mapas, consolidada printada, ficha) não tem texto → `missing`. O aviso "β: confirme ausências
  que dependem de mapa" existe no detalhe, mas a UI pinta ✗ vermelho igual — o analista lê "ausente".
- **Correção:**
  1. Classificar cada item do `CHECKLIST` como `textual` ou `visual` (novo campo).
  2. Itens `visual`: cruzar com evidências que já temos de graça — títulos dos slides
     (`Renda domiciliar`, `Mapa de...`), candidatas de imagem detectadas no slide e payloads do
     `vision_cache` (tabelas extraídas com título compatível) — antes de acusar.
  3. O que ainda ficar sem evidência vira **terceiro estado "conferir (imagem)"** com ícone
     próprio (não o ✗ de ausente). `missing` vermelho fica reservado a item sem *nenhum* sinal.
- **Aceite:** re-rodar Rolândia → os ~15 itens sublinhados pela Daniele saem de `missing`.

### CH-2 · "Cidade divergente na imagem" em capas, fotos e institucionais (Beatriz + Lucas) — a maior família
- **Evidência (banco):** 54 `WRONG_CONTEXT`, quase todos `iavis-context-*`. Inclui
  **"brasileiras" tratada como cidade** (`iavis-context-24c8d196b2-brasileiras`) — e esse mesmo
  sha1 aparece em **3 estudos**: como o cache de visão é por imagem, uma imagem institucional do
  template errada gera o FP em *todo* estudo que a contenha. "São Paulo" em estudo de São José
  dos Campos (RM, institucional da Brain) dominou: 23 achados no Housi v1.
- **Causa:** [`ia-vision.ts:211-247`](../../src/features/corretor/lib/v3/ia-vision.ts#L211-L247)
  (`wrongContextFromVisibleLocales`) aceita qualquer `tipo: "cidade"` devolvido pela visão, sem
  validar que o texto **é** um município, e roda em qualquer seção (capa, fotos de mapeamento,
  fichas). É a materialização do risco **P2** da revisão v0.42.
- **Correção (client-side — payload já está no cache, re-rodar custa R$ 0):**
  1. **Validar contra a base IBGE** (já usada pelo `wrongCityFindings` DET): texto que não é
     município → descarta ("brasileiras" morre aqui).
  2. **Escopo de seção:** só acusar em seções de dados (SOCIO/ABSORCAO/MERCADO/LACUNAS);
     CAPA/IDENTIFICACAO/OBJETIVOS/ENTORNO/fichas/mapeamento ficam de fora (capa e institucional
     citam a Brain/SP legitimamente).
  3. **Vizinhança legítima:** não acusar capital do próprio UF / municípios da mesma RM quando o
     slide é comparativo ou de contexto — começar conservador: exigir que a cidade estranha seja
     de **outro UF** OU apareça como protagonista (título da imagem), senão rebaixar para "Verificar".
  4. Consertar também o DET `wrongCityFindings` (validar sigla contra lista de UFs — o caso
     "Santos – FC" da revisão).
- **Aceite:** Housi v1/v2 re-abertos → os 18 FP triados no v2 são auto-reconciliados (mesmo
  mecanismo do guardrail de BINNING da v0.41); zero achados novos em capa/institucional.

### CH-3 · Pareamento indevido de tabelas no CROSS_TABLE (Daniele)
- **Evidência (banco):** os 5 FP da Rolândia são precisamente: `cross-renda-28-37` e
  `cross-renda-29-37` — a **LEGENDA do mapa de renda** (s28) pareada com a tabela de absorção
  (s37); e `cross-lacunas-bins-51-52`, `52-53`, **`53-53`** — as lacunas 5.1/5.2/5.3 comparadas
  entre si (metragem × preço = colunas de unidades diferentes **por desenho**), incluindo uma
  tabela comparada com outra do MESMO slide.
- **Causa:** [`cross-table.ts:109-118`](../../src/features/corretor/lib/v3/cross-table.ts#L109-L118)
  qualifica por `/renda/` no título — legenda de mapa tem "Faixas de Renda" no título e passa;
  [`cross-table.ts:138-154`](../../src/features/corretor/lib/v3/cross-table.ts#L138-L154) usa
  `binRows` entre eixos diferentes comparando **faixas de coluna** — mas 5.1 tem colunas em m² e
  5.2 em R$/m²: nunca deveriam ser comparadas.
- **Correção:**
  1. **Excluir legendas:** tabela com ≤2 colunas, e/ou título/célula "LEGENDA", e/ou proveniente
     de imagem classificada como mapa, não entra no pareamento de renda.
  2. **Unidade das faixas:** `binsFromColumns` passa a detectar a unidade (m², R$, min, km);
     `binRows` só compara faixas da **mesma unidade** — cruzamento metragem×preço deixa de existir.
  3. **Guard óbvio:** `left.slide !== right.slide` (ou exigir refs distintas) no laço de lacunas.
  4. Shape mínimo para o pareamento renda SOCIO×ABSORÇÃO: nº de faixas compatível e valores
     monetários dos limites com interseção — legenda de 7 cores não casa com tabela de 8 faixas.
- **Aceite:** re-rodar Rolândia → 0 `CROSS_TABLE_MISMATCH`; teste de regressão com fixture da
  legenda s28 + lacunas 51/52/53.

### CH-4 · "Dado sem fonte" com FONTE visível no slide (Beatriz + Daniele: 33 achados, 11/11 FP na Rolândia)
- **Causa provável (diagnosticar primeiro):** o rodapé `FONTE: BRAIN | ELABORAÇÃO: BRAIN` desses
  decks vive no **layout/master** do PPTX (padrão do template novo) — o extrator IR lê os shapes
  do slide, não do master, então `slide.fontes` vem vazio; e
  [`coverage-rules.ts:44-56`](../../src/features/corretor/lib/v3/coverage-rules.ts#L44-L56) acusa.
  Hipótese alternativa: fonte dentro da própria imagem, com `tem_fonte` falho na visão.
- **Correção:**
  1. **Diagnóstico** com um PPTX real dos feedbacks: confirmar onde o rodapé mora (shape do
     slide × placeholder do layout × master).
  2. Se for master/layout: estender `pptx-to-ir.ts` para herdar placeholders de rodapé do
     layout/master na extração de `fontes` (ganho global — vale para outras regras).
  3. Fallback conservador: se **todos** os slides numéricos do deck acusam fonte ausente,
     é assinatura de template (fonte no master) → suprimir a família inteira e emitir 1 achado
     informativo único ("fonte não detectável no texto — conferir template").
- **Aceite:** re-rodar Rolândia e Housi → `SOURCE_MISSING` só em slide que realmente não tem rodapé.

### CH-5 · Soma "não fecha" comparando com o total da coluna vizinha (Lucas)
- **Evidência:** achado `ABSOLUTE_SUM` no Housi — "Coluna «Oferta Lançada»: soma 1187 ≠ total
  39.8". O 39,8 é o **total da coluna % (Disp.)** — a linha de total veio desalinhada da extração
  de visão (células mescladas/offset).
- **Correção:**
  1. Alinhar o total por **header**, não por índice posicional; se a linha de total tem menos
     células que o header, abster.
  2. Checagem de plausibilidade: total com formato incompatível com a coluna (ex.: coluna de
     inteiros vs total com vírgula decimal, ordem de grandeza 30× menor) → abster ou "Verificar".
- **Aceite:** fixture com a tabela consolidada do print; a auto-validação linha×coluna×total já
  existente passa a rejeitar o pareamento deslocado.

### CH-6 · Totais que não fecham **por desenho** — exclusões declaradas (Beatriz)
- **Feedback:** "o total nunca vai bater porque ocultamos esgotados, gardens e coberturas; a
  tabela completa fica no apêndice". O deck **declara** isso na NOTA TÉCNICA/Obs. do slide.
- **Correção:** antes de acusar `ABSOLUTE_SUM`/consolidada×oferta, procurar no texto do slide (e
  no `tem_fonte`/notas da visão) padrão de exclusão declarada
  (`não são considerad|desconsidera|ocultam?os|exceto|esgotados|garden|cobertura|duplex`).
  Encontrou → rebaixar para "Verificar" com a nota citada na evidência (nunca "Erro").
- **Aceite:** slides de lacunas/consolidada da Beatriz não geram "Erro" de soma.

---

## Parte 2 — Falsos negativos: o que o Lucas achou e o motor não (novas capacidades)

| # | Erro real | Capacidade que falta | Viabilidade |
|---|---|---|---|
| FN-1 | Boxes de verticalização no mapa (s33) ≠ gráfico do slide anterior (5,7/1,7/4,3% vs valores do s32) | **Consistência cross-slide de valores**: a visão já extrai os boxes dos mapas (`locais_visiveis`/valores); comparar % e valores-âncora entre slides adjacentes da mesma métrica | Média — dados já saem da visão; falta a regra de pareamento slide N × N±1 |
| FN-2 | Taxa de crescimento usada na absorção (0,9% a.a., s38) ≠ taxa apresentada antes (1,7%) | **Registro de parâmetros do estudo**: extrair as constantes declaradas (taxa a.a., raios, cenários) na 1ª aparição e conferir reuso no restante do deck | Média-alta — os valores estão em texto ("taxa de crescimento de X% a.a.") e em tabelas de visão |
| FN-3 | Texto chama a Z.I. de 2 km de "Secundária" quando é "Primária" (s41) | **Semântica de Z.I.**: DET puro — mapear a convenção do deck (menor raio = primária, próximo = secundária…) a partir das legendas/títulos e flagrar rótulo trocado | ✅ **IMPLEMENTADO 28/jul** (`ziLabelFindings`) — o deck declara a convenção no s19 e a regra confere o uso |

FN-3 entra neste sprint (DET barato). FN-1/FN-2 são o **tema do próximo**: exigem um passo novo
de "memória do estudo" (valores-âncora por métrica), que também é a fundação para outros
cruzamentos cross-slide.

---

## Parte 3 — Plano do dia (ordem de execução)

**Status 28/jul — 7 dos 8 itens IMPLEMENTADOS** (v0.44–0.45 do LIVE; 71 testes verdes, tsc + build ok).
Fase 1 offline (banco) + Fase 2 com o **PPTX real da Rolândia**. Falta apenas CH-6 e os FN-1/FN-2,
que dependem do Housi v2.

**Aceite medido no deck da Rolândia: 17 achados (100% FP) → 1** — e o restante é ausência real.

| # | Item | Famílias | Status | Impacto |
|---|---|---|---|---|
| 1 | CH-2: IBGE + escopo de seção no contexto de visão (+ UF no DET + `sameCity` p/ typo da ata) | WRONG_CONTEXT | ✅ 28/jul | **54 achados** |
| 2 | CH-3: legendas fora + unidade das faixas + guard same-slide | CROSS_TABLE | ✅ 28/jul | 7 (os 2 "pendentes" do Housi também eram legenda) |
| 3 | CH-6: abstenção por exclusão declarada | ABSOLUTE_SUM/consolidada | 🔲 aguarda Housi v2 | parte dos 6 |
| 4 | CH-5: total desalinhado (soma bate com total de outra coluna → abstém) | ABSOLUTE_SUM | ✅ 28/jul | resto dos 6 |
| 5 | CH-1: itens `visual` + terceiro estado "a conferir em imagem" | STRUCTURE | ✅ 28/jul | 19 itens acusados → **1 ausência real** |
| 6 | CH-4: fonte em **tabela 1×1** (não era o master) — corrigido nos 2 extratores | SOURCE_MISSING | ✅ 28/jul | **11 da Rolândia zeraram** (33 no total) |
| 7 | FN-3: `ziLabelFindings` DET de Z.I. primária/secundária | novo | ✅ 28/jul | 1º FN do Finoti coberto |
| 8 | Auto-reconciliação (`lib/v3/reconcile.ts`): FPs legados encerram ao abrir o estudo | WRONG_CONTEXT, CROSS_TABLE, wrong-city | ✅ 28/jul | fecha o loop com as analistas |

### Correção de rumo registrada (CH-4)

A hipótese documentada abaixo — rodapé herdado do **master/layout** — **estava errada**. O IR real
mostrou o texto `FONTE: …` presente no `slide22.xml`, mas dentro de uma **tabela de 1 célula**;
`slideLayout35.xml` e `slideMaster10.xml` não contêm "FONTE". Os extratores varriam apenas
`<p:sp>` (caixas de texto) e as tabelas eram parseadas noutro caminho, sem alimentar `fontes`.
Correção aplicada em `pptx-to-ir.ts` e `ir_extractor.py`.

**Regressão:** cada correção ganha fixture derivada do achado real do banco (os vereditos FP da
calibradora viram o corpus de teste). Meta de saída do sprint: re-rodar os 4 estudos e cair de
~100% FP para **≤15% FP** nos achados remanescentes, sem perder os achados legítimos
(soma real do s43 do Housi deve continuar disparando).

---

## Parte 4 — Estratégia de categorização (rascunho para discussão)

Todo FP observado cai numa de **4 categorias**, e cada uma tem um antídoto padrão:

1. **Escopo/abstenção** — a regra roda onde não deveria (capa, legenda, mesmo slide, exclusão
   declarada). *Antídoto:* portões de contexto ANTES da comparação; na dúvida, abster
   (filosofia já usada no guardrail v0.41). → CH-2b, CH-3, CH-6.
2. **Validação de entidade** — o dado comparado não é o que a regra pensa ("brasileiras" não é
   cidade; 39,8 não é o total da coluna; "FC" não é UF). *Antídoto:* validar contra vocabulário
   fechado (IBGE, UFs, header da coluna, unidade da faixa). → CH-2a, CH-5.
3. **Cobertura de extração** — o dado existe no deck mas não chega ao motor (item em mapa,
   fonte no master). *Antídoto:* ampliar a extração (master/layout, títulos de imagem, payload
   de visão) e, enquanto não cobre, **sinalizar incerteza em vez de ausência**. → CH-1, CH-4.
4. **Capacidade inexistente** — o erro real precisa de um cruzamento que o motor ainda não faz
   (cross-slide, parâmetros do estudo, semântica de Z.I.). *Antídoto:* backlog priorizado por
   frequência nos feedbacks. → FN-1..3.

**Processo contínuo proposto:** feedback do analista → veredito FP na calibradora (já em
produção) → cada FP classificado nas categorias 1–3 vira fixture de regressão + correção; cada
erro humano não pego (categoria 4) vira candidato a regra com o slide real como gabarito. A
tabela "Saúde por regra" do `/corretor/calibracao` passa a ser o painel do sprint: regra com
%FP alto = próxima da fila. Isso transforma a homologação num ciclo mensurável em vez de uma
etapa única.

**Riscos a vigiar:** (a) sobre-correção — apertar CH-2 demais pode silenciar o caso Brumadinho
(`Curitiba – MG`), que é real: manter o teste; (b) o P1 da revisão (custo de visão sem filtro de
seção) segue aberto — os 4 estudos reais pagaram visão em fotos/institucionais que nunca
deveriam ter sido candidatas; reavaliar o filtro junto com CH-2.
