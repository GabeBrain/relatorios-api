# PLAN — Cobertura 90–95% dos parâmetros de correção (Corretor v3)

**Data:** 2026-07-13 · **Autor do plano:** Gabriel + Claude · **Executor:** Codex
**Baseline:** ~35% das notas ancoradas em parâmetros são reproduzidas pelo pipeline v3 hoje.
**Meta:** ≥90% de recall sobre o gabarito anotado (ver §1), sem inflar falso positivo
(orçamento de FP: ≤ 15% dos achados nos dois estudos de calibração).

Leia antes de começar:
- `taxonomia_notas.md` — as notas dos estudos anotados são a especificação E o gabarito.
- `DESIGN_corretor_v3.md` — arquitetura do fluxo (triagem DET → IA texto/visão → worklist).
- `LIVE_regras_corretor_vocacionais.md` — histórico de regras; **atualize-o a cada workstream
  concluído** (obrigatório pelo CLAUDE.md).
- `calibracao/notas_marka_tancredo.labels.json` — gabarito extraído do estudo Marka/Tancredo
  (96 shapes; os com `red_text: true` são notas reais da analista A&R).
- `Vocacionais_parametros_de_correcao.pptx` — deck de 12 slides com os parâmetros oficiais.

## Estado real do pipeline hoje (verificado no código em 13/jul)

O que RODA em `lib/v3/pipeline.ts` (`runFullAnalysis`):

| Estágio | Regras vivas | Arquivo |
|---|---|---|
| DET sobre IR | `LEFTOVER_NOTE`, `ABSOLUTE_SUM` (tabelas nativas), `RADII`, `STRUCTURE_MISSING` (7 seções macro). `SOURCE_MISSING` **desligada** (`RULES_ENABLED`) | `lib/audit/ir-rules.ts` |
| IA texto (batch) | `SPELLING`, `CITY_NAME` (cidade vem da ata), `COHERENCE` | `lib/v3/ia-text.ts` + edge `analyze-text-batch` |
| IA visão (tabelas-imagem) | extração → `ABSOLUTE_SUM` (`checkTableSums`), `PERCENTAGE_SUM` (`checkPercentConsistency`), `BINNING_RULE` (`detectBinGap`) | `lib/v3/ia-vision.ts` + edge `analyze-table-image`, `CACHE_SCHEMA = 4` |
| Ata (Fase B) | extração de `AtaData` (cidade alimenta CITY_NAME); `ATA_COVERAGE` ainda **MOCK** | `lib/v3/ia-ata.ts`, `lib/v3/ata-image.ts` |

⚠️ Armadilha: `CROSS_TABLE_MISMATCH` e `TEMPORAL_WINDOW` constam como `PLENO` no
`lib/error-catalog.ts`, mas **só existem em `lib/audit/fixtures.ts` (demo v2)** — não há
implementação no pipeline. Este plano corrige isso; ao final, o `mode` de cada tipo no
catálogo deve refletir a realidade.

## Ordem de execução e ganho estimado

| WS | Entrega | Notas do gabarito cobertas | Esforço |
|---|---|---|---|
| WS0 | Harness de recall (medição antes/depois) | — (infra) | M |
| WS1 | Cidade/UF na visão + WRONG_CONTEXT | ~17 (Guarulhos ×15, Brooklin ×2, capa SP–MS) | M |
| WS2 | CROSS_TABLE_MISMATCH no v3 | ~12 (rendas, lacunas geral, consolidadas Z.I.) | G |
| WS3 | ATA_COVERAGE Fase C (MOCK → BETA) | ~5 (lacunas de vagas ×3, produto proposto, distâncias) | G |
| WS4 | STRUCTURE_MISSING granular (checklist 1.1–8.4) | ~3 (mapeamento físico, revenda, entorno) | M |
| WS5 | TEMPORAL_WINDOW + PROJECTION_FORMULA (heurística) | ~2 ("arrumar erro da fórmula" ×2) | M |
| WS6 | Fichas técnicas na visão + VALUE_PLAUSIBILITY | ~10 (vagas × m² × ticket, slide 76) | G |
| WS7 | SOURCE_MISSING religada escopada + REQUIRED_NOTE + EXCLUSION_RULE | parâmetros slides 3, 8, 11–12 | M |
| WS8 | Regras novas das notas recorrentes (consolidada, VSO) | ~6 (médias/estoque ×3, VSO ×3) | P |

WS1 primeiro porque é o erro mais repetido do estudo e o mais barato (mexe num prompt +
comparação string). WS2 é o maior ganho estrutural. WS5–WS8 são independentes entre si.

---

## WS0 — Harness de recall (fazer PRIMEIRO, é a régua de tudo)

**Problema:** sem medição automática, cada WS "parece" pronto. O gabarito existe
(`calibracao/notas_marka_tancredo.labels.json`), falta o harness.

### 0.1 Extrair notas de revisão no `pptx-to-ir.ts`

Em `lib/audit/pptx-to-ir.ts`, ao montar o IR, detectar shapes de nota da analista
(preenchimento sólido amarelo `FFFF00`±tol E ≥1 run com cor `FF0000`/`C00000`±tol) e:
- movê-los para um campo novo `notas_revisao: string[]` no `IrSlide` (tipo em `lib/audit/ir.ts`);
- **excluí-los de `textos`** — senão o corretor "cola" lendo a resposta da analista, e a
  IA de texto/COHERENCE processa lixo;
- `LEFTOVER_NOTE` (ir-rules) continua olhando `notas_edicao` (speaker notes) e passa a
  também sinalizar `notas_revisao` **em produção** (estudo real não deve ter caixa amarela);
  no harness, esse tipo é ignorado (ver 0.2).

Referência de detecção: script `extrai_notas.py` usado para gerar o labels.json
(fill amarelo no `<p:spPr>` + `<a:srgbClr>` vermelho nos `<a:rPr>` do shape).

### 0.2 Teste de recall

Novo `lib/v3/__tests__/recall-marka.test.ts` (padrão do `pipeline-det.test.ts`):
1. Carrega o labels.json (copiar para `__tests__/` como fixture pequena — só JSON, nunca o PPTX).
2. Tabela de mapeamento nota→tipo esperado (hardcoded no teste, derivada de §"Mapeamento
   nota → regra" abaixo). Notas subjetivas/layout ficam num array `FORA_DE_ESCOPO` explícito.
3. Roda **as partes DET** do pipeline sobre o IR do estudo (`ir/*.ir.json` local, gitignored —
   o teste faz `skip` se o arquivo não existir, como já é feito para os PPTX pesados).
4. Para os passes de IA (visão/texto), usar fixtures de payload de cache quando disponíveis;
   caso contrário o teste cobre só o recall DET e reporta o teto atingível.
5. Imprime: `recall = cobertas/ancoradas`, lista de notas não cobertas por tipo.

**Critério de aceite do plano inteiro:** esse teste reportando ≥90% nas ancoradas.

### Mapeamento nota → regra (gabarito de referência)

| Slides (Marka/Tancredo) | Nota (resumo) | Tipo esperado | WS |
|---|---|---|---|
| 12 | capa "São Paulo – MS", estudo é Guarulhos | `WRONG_CONTEXT`/`CITY_NAME` | WS1 |
| 27, 28 | "informações do estudo do Brooklin" | `WRONG_CONTEXT` | WS1 |
| 31–36, 38–44, 46, 48–55 | "precisa ser os dados de Guarulhos" | `WRONG_CONTEXT` (visão) | WS1 |
| 41, 90 | "Agrupar acima de R$34.360" / "Abrir até 15mil" | `BINNING_RULE` (já vivo — validar) | — |
| 59, 60 | "mesmas rendas do slide domicílios por faixa de renda" | `CROSS_TABLE_MISMATCH` | WS2 |
| 109, 125, 139 | "ajustes nas consolidadas conforme Z.I total" | `CROSS_TABLE_MISMATCH` | WS2 |
| 121–123, 136–138, 149–151 | "ajustar com as lacunas: Até 20m²…" / "valores da tabela geral" | `CROSS_TABLE_MISMATCH` + `BINNING_RULE` | WS2 |
| 22 | "incluir distância aeroporto / Parque CECAP" | `ATA_COVERAGE` | WS3 |
| 25 | "faltou produto proposto (enviado na ata)" | `ATA_COVERAGE` | WS3 |
| 92, 124, 152 | "faltou tabela de lacunas de vagas, conforme ata" | `ATA_COVERAGE` | WS3 |
| 24 | "não foi realizado mapeamento físico?" | `STRUCTURE_MISSING` | WS4 |
| 96 | revenda não saiu (nota do próprio analista) | `LEFTOVER_NOTE` (vivo) + `STRUCTURE_MISSING` | WS4 |
| 89, 90 | "arrumar erro da fórmula" | `PROJECTION_FORMULA` | WS5 |
| 74, 75, 76 | vagas × m² × ticket implausíveis (10 notas) | `VALUE_PLAUSIBILITY` | WS6 |
| 71, 72, 73 | "trazer médias R$/m² / total do estoque — TODOS os estudos" | `REQUIRED_NOTE` (consolidada) | WS8 |
| 119, 134, 147 | "VSO mensal errado p/ estoque zero" | `VALUE_PLAUSIBILITY` (VSO) | WS8 |
| 17–21, 23, 49, 53, 63–64, 67, 94, 101 | ruas/entorno/norte/índice da mancha/simulações/mapa feio | FORA_DE_ESCOPO (subjetivas ou nível-2 de mapas) | — |

---

## WS1 — Cidade/UF na visão + WRONG_CONTEXT (maior nº de notas)

**Por quê:** `CITY_NAME` só enxerga TEXTO do IR. As tabelas sociodemográficas são
**imagens** exportadas do GeoBrain com "São Paulo" estampado — hoje invisível ao corretor.
Parâmetro slide 3: "Cidade **e Estado** precisa validar se é o do estudo".

### 1.1 Edge `analyze-table-image` (em `supabase/functions/analyze-table-image/`)

Adicionar ao JSON de saída da extração, por imagem (não por tabela):
```json
"locais_visiveis": [{ "texto": "São Paulo", "tipo": "cidade|uf|bairro" }]
```
Instrução no prompt: transcrever QUALQUER nome de cidade/UF/bairro visível na imagem
(títulos, legendas, rodapés, barras de busca de mapa), literal, sem deduzir.

### 1.2 `lib/v3/ia-vision.ts`

- `CACHE_SCHEMA: 4 → 5` (obriga releitura; comentar o porquê como nas versões anteriores).
- `RawTable`/`CachePayload`: acrescentar `locais_visiveis`.
- `runVisionPass` e `processImage` recebem `expected: { cidade: string; uf?: string }`
  (o `pipeline.ts` já tem `cityUsed` e `ata?.uf` — passar ambos).
- Comparação (função pura exportada, com teste): normalizar (casefold, sem acento);
  cidade visível ≠ cidade do estudo → `Finding` tipo `WRONG_CONTEXT`, viz `overlay`,
  `evidenceSha1` da imagem, detail citando o local visto e o esperado.
  **Whitelist para não gerar FP:** "Brasil", o nome do ESTADO do estudo, e cidades citadas
  como referência comparativa quando a tabela é claramente comparativa (título contém
  "Brasil" ou "Estado") — nesse caso só sinalizar se a cidade errada aparece como
  PROTAGONISTA (primeira linha/título). Começar conservador: sinalizar apenas
  cidade ≠ esperada em título/legenda principal.

### 1.3 UF no texto (DET, grátis)

Em `lib/audit/ir-rules.ts`, nova regra DET `wrongUfFindings(ir, uf)`: regex
`/\b(?:–|-|\/)\s*([A-Z]{2})\b/` sobre títulos+textos; UF detectada ≠ UF do estudo →
`WRONG_CONTEXT`. Pega o caso da capa "São Paulo – MS". `irToFindings` ganha parâmetro
opcional `ctx?: { cidade?: string; uf?: string }` (o pipeline chama de novo após a ata,
ou roda essa regra à parte no estágio da ata — escolher o mais simples e documentar).
Cuidado com siglas que não são UF (ex.: "Z.I", "A&R") — validar contra a lista das 27 UFs.

### Aceite WS1
- Estudo Marka: ≥13 dos 15 slides "Guarulhos" sinalizados; s12 (UF) e s27/28 sinalizados.
- Estudo Itajaí: **zero** novo achado de cidade (lá não há esse erro — é o teste de FP).

---

## WS2 — CROSS_TABLE_MISMATCH ligado ao v3

**Por quê:** parâmetros slides 4, 5, 8, 10 e 12 são todos "X deve bater com Y em outro
slide". O motor de comparação já existe (`crossBands` em `lib/audit/engine.ts`), mas nada
alimenta ele no v3.

### 2.1 Expor as tabelas extraídas pela visão

`VisionPassResult` ganha `tables: ExtractedTableRef[]` onde
`ExtractedTableRef = { slide: number; secao: string | null; titulo: string | null; sha1: string; table: ExtractedTable }`.
`processImage` já monta `ext` — só coletar. Zero custo novo (payload já está no cache).

### 2.2 Novo módulo `lib/v3/cross-table.ts` (funções puras + testes)

Entrada: tabelas nativas do IR (reusar `irTableToExtracted` — exportá-la de `ir-rules.ts`)
+ `tables` da visão. Saída: `Finding[]`.

Implementar 4 checagens, nesta ordem de valor:

**a) População/Domicílios consistentes na sociodemografia** (parâmetros slides 4–5).
Classificar cada tabela por assinatura do título/colunas (regex: `/popula[çc][ãa]o/i`,
`/domic[íi]lios/i`). Para cada grandeza, coletar o TOTAL (linha/coluna Total) de todas as
tabelas da seção SOCIO na mesma Z.I. Todos os totais da mesma grandeza devem ser iguais
(tolerância 0,5 absoluto; se houver escala — mil/milhões — normalizar por heurística de
magnitude e registrar no detail). Divergência → um finding `sidebyside` com os pares.

**b) Faixas de renda: sociodemografia × absorção** (parâmetro slide 8: "as faixas devem
ser as mesmas apresentadas em Domicílios por faixa de renda"). Extrair rótulos de faixa
(`rowLabels`) da tabela "domicílios por faixa de renda" (SOCIO) e da tabela de absorção
(ABSORCAO); comparar com `crossBands`. Mismatch → finding citando os dois slides.
Cobre as notas s59/s60 ("ajustar as rendas como orientado").

**c) Lacunas: geral × por tipologia** (notas s122/137/150 "valores que pedi na tabela de
lacunas geral"; parâmetro slide 12: oferta final igual nas três análises). Na seção
LACUNAS de cada Z.I.: a **oferta final total** deve ser idêntica nas 3 tabelas
(tipologia×metragem, tipologia×preço, preço×metragem); os bins de metragem devem ser o
MESMO conjunto entre a tabela geral e as quebras. Divergência → finding por par.

**d) Consolidada × análises de oferta** (parâmetro slide 10; é o `TOTALS_EQUALITY`).
Total de oferta lançada e oferta atual da CONSOLIDADA deve bater com o total de cada
análise "por padrão / por tipologia / por ano de lançamento" da mesma Z.I. Emitir como
`TOTALS_EQUALITY`. Cobre indiretamente s109/125/139 (consolidadas de Z.I.s secundárias
divergentes da Z.I. total → aparece como mismatch entre si).

Agrupamento por Z.I.: usar `secao` + posição no deck (slides entre dois marcadores de
Z.I.). O IR tem `secao_canonica`; se não houver marcador de Z.I., tratar o estudo como
Z.I. única e registrar a limitação no finding `ok: true` de cobertura.

### 2.3 Wiring no `pipeline.ts`

Após `Promise.all` de texto+visão: `crossTableFindings(irTables, vision.tables)` →
concatenar em `visionFindings` (estágio novo `'cruzamento'` no `Stage` é opcional; pode
entrar no estágio `visao` para não mexer na UI ainda).

### Aceite WS2
- Marka: mismatch de rendas s59/s60 × slide "domicílios por faixa de renda"; mismatch de
  lacunas geral × tipologia (s121-123 e réplicas nas outras Z.I.s).
- Itajaí: reproduz as notas s27/59/60 do corpus (rendas e pop./domicílios).
- Sem FP novo em tabelas comparativas Brasil/Estado (grandezas diferentes não comparam).
- `error-catalog.ts`: `CROSS_TABLE_MISMATCH` e `TOTALS_EQUALITY` com `mode` verdadeiro
  (`PLENO`/`BETA` conforme o que ficou de fato).

---

## WS3 — ATA_COVERAGE Fase C (MOCK → BETA)

**Por quê:** 5 notas do gabarito são "faltou X que a ata pediu". A extração da ata já
funciona (Fases A/B): `AtaData.pedidos_analista`, `duvidas_cliente`, `produto`.
Seguir o `PLAN_ata_estrela_guia.md` (Fase C) onde este plano não detalhar.

### 3.1 Novo módulo `lib/v3/ata-coverage.ts`

Para cada item de `pedidos_analista + duvidas_cliente` (+ item sintético "produto proposto"
quando `ata.produto != null`):
1. **Passo DET (grátis):** extrair palavras-chave do pedido (substantivos: "lacunas",
   "vagas", "aeroporto", "CECAP", "produto") e procurar em títulos+textos do IR
   (normalizados). Match forte → `status: 'ok'` com slide de evidência.
2. **Passo LLM (barato, 1 chamada):** só para os itens SEM match — batch único para a edge
   `analyze-text-batch` estendida (ou edge nova `check-ata-coverage`) com: lista de itens
   pendentes + índice do estudo (nº, título e 1ª linha de cada slide — não o texto inteiro).
   Resposta: `{ item, coberto: bool, slide?: number, justificativa }`.
3. Finding único tipo `ATA_COVERAGE`, viz `checklist` (o tipo `checklist` já existe em
   `VizPattern`), com um item por pedido; itens não cobertos ficam `missing` e o finding
   fica `ok: false`.

Regra canônica adicional (DET): se a ata menciona produto (torres/unidades/tipologias),
o estudo deve ter a seção "produto proposto" (regex em títulos). É a nota s25, que a
analista marcou como "orientação para TODOS os projetos".

### 3.2 Wiring

`pipeline.ts`: após a ata e o IR prontos (antes/paralelo à visão), rodar cobertura; custo
somado ao passe da ata. `error-catalog.ts`: `ATA_COVERAGE` → `BETA`.

### Aceite WS3
- Marka: "lacunas de vagas" (pedido da ata) → item missing; "produto proposto" → missing.
- Estudo com ata 100% coberta → finding `ok: true` (checklist todo verde), zero ruído.

---

## WS4 — STRUCTURE_MISSING granular (checklist do deck de parâmetros)

**Por quê:** o parâmetro slides 1–2 é um checklist numerado 1.1–8.4; o motor atual só
checa 7 seções macro. A analista avisa: "é muito comum não vir revendas nem mapeamento físico".

### 4.1 Dicionário de itens em `lib/audit/structure-checklist.ts`

Um array `CHECKLIST: { id: string; label: string; secao: AuditSection; patterns: RegExp[]; obrigatorio: boolean }[]`
com os itens do deck (ids = numeração do parâmetro):

- 1.1 endereço · 1.2 lat/long · 1.3 área do terreno · 1.4 acessos · 1.5 entorno
  varejo/serviços · 1.6 entorno revendas · 1.7 mapeamento físico · 1.9 distância ao centro
- 2.1 dados cidade/estado/Brasil · 2.2 variação população · 2.3 variação domicílios ·
  2.4(+.1) população por renda + mapa densidade · 2.5(+.1) domicílios por renda + mapa renda ·
  2.6 por moradores · 2.7(+.1) por tipo + mapa verticalização · 2.8(+.1) por ocupação + mapa propriedade
- 3.1 absorção Z.I. total · 3.1.1 cenários de absorção
- 4.1–4.4 mapas de empreendimentos (localização, R$/m², estoque, área média) ·
  4.5 consolidada · 4.6–4.8 oferta lançada/atual (padrão, ano, tipologia) ·
  4.9–4.10 preços (tipologia, padrão)
- 5.1–5.3 lacunas (tipologia×metragem, tipologia×preço, preço×metragem)
- 6 fichas técnicas · 7.1 futuros lançamentos · 8.1–8.4 revenda (mapa, bairro, tipologia, ticket)

Detecção: regex sobre `titulo` + primeiras linhas de `textos` de cada slide do IR
(ex.: 1.7 → `/mapeamento\s+f[íi]sico/i`; 8.x → `/revenda/i`). Calibrar contra os DOIS
estudos exemplo e o estudo GO (os títulos reais estão nos `.ir.json` da pasta `ir/`).

### 4.2 Substituir `structureFinding` em `ir-rules.ts`

- Um finding por seção-mãe (Identificação, Sociodemografia, …) com checklist dos subitens
  (`status: ok | missing`), em vez de um finding único macro.
- Multiplicidade de Z.I.s (parâmetro slide 2: "se houver mais Z.I.s, as análises se
  repetem"): se o IR detectar >1 Z.I. (heurística: títulos com "Z.I", "zona de influência",
  raios distintos por bloco), itens 4.x/5.x/8.x são exigidos por Z.I.; senão, uma vez.
  Se a detecção de Z.I. for frágil, degradar com honestidade: checar 1× e anotar no detail.
- `mode` no catálogo: `BETA` (dicionário v1 a calibrar com a analista).

### Aceite WS4
- Marka: 1.7 mapeamento físico → missing (nota s24); revenda presente (não flagra).
- Itajaí: rodar e conferir com a Juliana quais misses são reais antes de subir tolerância.

---

## WS5 — TEMPORAL_WINDOW + PROJECTION_FORMULA

### 5.1 TEMPORAL_WINDOW (DET puro, `ir-rules.ts` ou `cross-table.ts`)

Parâmetro slide 3: projeção de população/domicílios deve cobrir **6 anos** (hoje 2027–2032).
- Detectar tabelas/colunas de projeção: colunas cujo cabeçalho é ano `20\d\d` em tabelas
  com título `/proje|varia[çc][ãa]o anual/i` (nativas E extraídas pela visão).
- Regra: janela = `[anoCorrente+1, anoCorrente+6]` (derivar de `new Date()`, não hardcode).
  Faltando ano ou janela deslocada → finding `TEMPORAL_WINDOW`, viz `sidebyside`
  (esperado × encontrado). Slides irmãos (população × domicílios) devem usar a MESMA janela.

### 5.2 PROJECTION_FORMULA (heurística BETA agora; fórmula oficial depois)

A analista se ofereceu para passar a fórmula oficial (parâmetro slide 3) — **há uma ação
humana pendente: Gabriel pedir a fórmula à analista A&R.** Até lá, heurística DET que
já pega os erros reais ("Arrumar erro da fórmula", s89/90):
- Em série de projeção (valores ano a ano + taxa % informada), verificar
  `valor[n] ≈ valor[n-1] × (1 + taxa)` (tolerância 1% relativo). Se a tabela traz a taxa
  anual e algum ano não segue, flag com a linha exata.
- Se não há taxa na tabela: checar consistência interna — a variação ano-a-ano deve ser
  monotônica e de razão ~constante (desvio da razão média > 20% → suspeita, severidade baixa).
- Estruturar como `checkProjectionSeries(table, spec?)` em `engine.ts`, com `spec` opcional
  `{ formula: 'compound'; taxa?: number }` — quando a fórmula oficial chegar, vira só um
  `PROJECTION_SPEC` de config (`lib/v3/config.ts`), sem retrabalho.
- `mode`: `MOCK` → `BETA`.

---

## WS6 — Fichas técnicas na visão + VALUE_PLAUSIBILITY

**Por quê:** o maior bloco de notas de um único slide (~10 no s74–76) é plausibilidade de
vagas × m² × ticket nas fichas técnicas. Não está no deck de parâmetros — confirmar com a
analista se entra no deck — mas o padrão é 100% mecanizável e recorrente.

### 6.1 Incluir FICHAS no passe de visão

`lib/v3/table-images.ts`: `SECOES_NUMERICAS` não inclui fichas. Investigar como a seção
aparece no IR (`secao_canonica` dos slides de ficha nos `.ir.json`; provavelmente `MERCADO`
ou sem seção). Se os slides de ficha já entram como MERCADO, o filtro dimensional pode
estar descartando as imagens (fichas têm layout diferente) — ajustar heurística OU marcar
candidatas por título do slide (`/ficha t[ée]cnica/i`) com limites dimensionais próprios.

### 6.2 Prompt de extração de ficha

A ficha não é tabela de somas — é lista de unidades. Na edge `analyze-table-image`,
quando o contexto indicar ficha (passar `tipo: 'ficha'` no body), extrair:
```json
"unidades": [{ "tipologia": "2 dorms", "m2": 65.0, "vagas": 1, "preco": 550000, "preco_m2": 8461 }]
```
(bump de `CACHE_SCHEMA` já coberto pelo WS1 se feito junto; senão, 5 → 6).

### 6.3 Checagens DET `checkUnitPlausibility(unidades)` em `engine.ts`

Derivadas literalmente das notas do s74–76:
1. `preco_m2` informado ≠ `preco / m2` (tolerância 2%) → erro aritmético.
2. **Monotonicidade vaga:** dentro do mesmo empreendimento, unidade COM vaga com
   `preco_m2` MENOR que unidade sem vaga (mesma tipologia/metragem ±10%) → flag.
3. Unidade maior com mais vagas e `preco_m2` menor que a menor → flag (severidade baixa —
   pode ser legítimo, o texto do finding deve dizer "verificar").
4. Faixa de vagas × metragem: `m2 < 45 && vagas >= 2` → flag ("37m² com 2 vagas?").
5. Duplicidade: mesma `m2`, mesmas `vagas`, `preco_m2` muito diferente (>15%) → flag;
   gardens/coberturas com MESMA metragem do tipo → flag.
6. Ticket idêntico para metragens diferentes (>10% de diferença de área) → flag.
Todos emitem `VALUE_PLAUSIBILITY`, viz `table` com linhas marcadas, texto SEMPRE em tom
de "verificar" (a analista escreve "está estranho", não "está errado" — manter a semântica).

### Aceite WS6
- Marka s74–76: ≥7 das 10 notas reproduzidas; Itajaí s120/122 (m² alto/baixo) sinalizadas.
- FP: rodar no estudo GO e revisar manualmente os flags de ficha antes de dar por pronto.

---

## WS7 — SOURCE_MISSING escopada + REQUIRED_NOTE + EXCLUSION_RULE

### 7.1 SOURCE_MISSING religada com visão (parâmetros slides 3, 8, 11)

Foi desligada por FP (fonte embutida na imagem). Agora a visão pode responder:
- Na extração (`analyze-table-image`), campo novo `tem_fonte: boolean` ("há a palavra
  FONTE:/Elaboração: visível na imagem?").
- Regra: slide das seções SOCIO/ABSORCAO/LACUNAS com dado (tabela nativa OU imagem de
  tabela) sem fonte em TEXTO (`s.fontes`) **e** sem fonte na IMAGEM → finding.
- `RULES_ENABLED.SOURCE_MISSING` vira config por seção; manter cap (25) e severidade baixa.
- Só ativar depois de medir FP nos 3 estudos (se o time realmente nunca preenche, discutir
  com a analista antes de ligar por padrão — histórico no comentário do `RULES_ENABLED`).

### 7.2 REQUIRED_NOTE (parâmetro slide 8)

DET: slide(s) de absorção (`ABSORCAO`) devem conter a nota "desconsidera… 2ª/segunda
moradia" (regex tolerante a variações). Ausente → `REQUIRED_NOTE`. `BETA` → vivo.

### 7.3 EXCLUSION_RULE (parâmetros slides 11–12)

DET sobre a seção LACUNAS:
- A nota explicativa das lacunas deve mencionar a exclusão de Gardens, Duplex e Coberturas
  (regex nos textos dos slides de lacunas). Ausente → `EXCLUSION_RULE`.
- Relação de esgotados (slide 12): na análise tipologia×metragem a oferta lançada INCLUI
  esgotadas; nas outras duas, não → logo `oferta_lançada(tip×met) ≥ oferta_lançada(tip×preço)`
  e as duas últimas iguais entre si. Violação → `EXCLUSION_RULE` com os números.
  (Depende das tabelas extraídas do WS2 — reusar `ExtractedTableRef`.)

### 7.4 IBGE_MISMATCH — adiar (não bloqueia a meta)

Exige fonte de referência externa (Censo 2022 por município). Deixar `MOCK` e registrar
no LIVE doc como pendência com a URL do parâmetro (slides 6–7). Nenhuma nota do gabarito
depende disso.

---

## WS8 — Regras novas das notas recorrentes (rápidas)

### 8.1 Consolidada: médias R$/m² e total de estoque obrigatórios (notas s71–73)

A analista: "essa orientação se aplica a TODOS os estudos". DET sobre a tabela consolidada
extraída (visão): deve existir linha/coluna de média R$/m² e total de estoque
(regex nos rótulos: `/m[ée]dia/i` + `/R\$\/?m/i`, `/estoque/i`). Ausente → `REQUIRED_NOTE`
(ou novo detail sob `TOTALS_EQUALITY` — decidir e documentar no LIVE doc).

### 8.2 VSO mensal só com estoque > 0 (notas s119/134/147)

DET sobre consolidada extraída: linha com `estoque == 0` E coluna VSO mensal/vendas-mês
preenchida (≠ 0/–) → `VALUE_PLAUSIBILITY` citando o empreendimento. Rótulos: `/VSO/i`,
`/estoque/i`, `/vendid[ao]s?\s*\/?\s*m[êe]s/i`.

---

## Regras do jogo para o executor

1. **Medir antes/depois:** rodar o harness (WS0) no fim de CADA workstream e anotar o
   recall no LIVE doc. Se um WS não mover o número esperado, investigar antes de seguir.
2. **FP é tão ruim quanto FN:** todo finding novo nasce com texto "verificar/conferir"
   quando a evidência é indireta. Tolerâncias começam largas e apertam com a calibração.
3. **Custo:** nenhuma chamada de visão nova além da releitura por bump de `CACHE_SCHEMA`
   (1×/imagem) e do passe de fichas (WS6). Batch de texto da ata-coverage: 1 chamada.
   Atualizar `estimate*` correspondentes para o orçamento continuar honesto.
4. **Bump de cache:** WS1 + WS6 + 7.1 mexem no prompt de visão — fazer os três campos
   novos (`locais_visiveis`, `unidades`, `tem_fonte`) **num único bump** se possível,
   para não pagar releitura duas vezes.
5. **Testes:** cada função pura nova (cross-table, plausibility, checklist, projeção) com
   teste unitário de caso real do gabarito + caso limpo (sem flag). Padrão dos testes
   existentes em `lib/audit/__tests__/` e `lib/v3/__tests__/`.
6. **Não versionar PPTX/IR pesados** (gitignore já cobre); fixtures de teste são JSON pequenos.
7. **`error-catalog.ts` sincronizado:** ao final, `mode` de cada tipo = realidade do pipeline.
8. **LIVE doc:** uma entrada de versão por WS em `LIVE_regras_corretor_vocacionais.md`
   (obrigação do CLAUDE.md), separando DET × IA e citando arquivos.
9. **Pendência humana (não é do Codex):** Gabriel pede a fórmula oficial de projeção à
   analista A&R (destrava PROJECTION_FORMULA pleno) e valida com ela o checklist do WS4.
