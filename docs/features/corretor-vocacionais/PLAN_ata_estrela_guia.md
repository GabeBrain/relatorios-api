# PLAN — Ata como estrela-guia do Corretor (extração → parâmetros → cobertura)

Aprovado por Gabriel em 2026-07-11. Documento **autossuficiente para implementação** por uma
sessão futura (Opus), com **pausas obrigatórias de teste** — cada fase termina num checkpoint
onde o Gabriel valida com material real ANTES de a próxima fase começar. Não implementar
B sem a pausa A aprovada; não implementar C sem a pausa B aprovada.

Contexto de fundo: `DESIGN_corretor_v3.md`, `LIVE_regras_corretor_vocacionais.md` v0.14–0.22,
`regras_em_linguagem_natural.md` (regra 22), `HANDOFF_fase_e_interface.md` §4 (padrão 6 checklist).

## Por que a ata é a estrela-guia

Hoje o corretor confere o estudo **contra si mesmo** (consistência interna: somas, raios,
notas vazadas). A ata é a **especificação contratada** — com ela o corretor passa a conferir
o estudo **contra o que o cliente pediu**. É a única regra capaz de pegar o pior erro possível:
o estudo internamente perfeito que **esqueceu de entregar o que foi pedido**.

## Estado atual (nada de extração existe)

| Peça | Estado | Onde |
|---|---|---|
| `ATA_COVERAGE` (regra 22) | **MOCK** — catálogo + fixture demo, motor nunca implementado | `lib/error-catalog.ts:78`, `lib/audit/fixtures.ts` (`ita-ata`) |
| Visualização checklist | pronta e renderizando (padrão 6) | `components/audit/FindingCard.tsx` (`kind:'text'` + `checklist`) |
| Base "Atas de abertura" | "imagem no slide 1 (futuros: DOCX) — pendente extração" | `regras_em_linguagem_natural.md` |
| Ata DOCX real de exemplo | 1 arquivo | `docs/features/corretor-vocacionais/Ata_Reuniao_Briefing_Grupo_Impper_Sao_Jose_do_Rio_Preto.docx` |
| Atas-imagem reais | coladas nos slides iniciais dos PPTX de exemplo da mesma pasta | — |
| Cidade do estudo | **BUG latente**: o passo único passa `cidade: null` → `runTextPass(city='')` → a regra CITY_NAME roda **sem saber a cidade certa** | `CorretorV3Page.tsx` (`handleNew` → `analyzeStudy({ cidade: null, … })`) |

## Formato real da ata (captura do estudo Tancredo, 11/jul)

Imagem de texto estruturado (fundo claro, destaques em ciano), tipicamente nos slides 1–4,
com blocos: **título/cliente** ("3. Tancredo @Kenuy / Brain"), **Produto pretendido**
(torres, unidades, dorms, metragens, % vagas, programa MCMV), **Terreno e localização**
(endereço, bairro, cidade/UF, área), **Preço** (R$/m² de viabilidade), **Dúvida do cliente**
(bullets) e **Analista da Rebrain** (pedidos explícitos, destacados). Cada bloco alimenta uma
camada distinta:

1. Parâmetros → régua das regras existentes (CITY_NAME, futura coerência de produto).
2. Dúvidas do cliente → o estudo precisa **responder** cada uma.
3. Pedidos ao analista → **entregáveis explícitos** (coração do ATA_COVERAGE).
4. Produto/preço → reforço do WRONG_CONTEXT (3 dorm num estudo de 2 dorm = vazamento).

---

## FASE A — Provar a extração (a pergunta do Gabriel: "a LLM lê a ata certo?")

Custo ~R$ 0,02–0,06/ata (visão, 1 imagem). Nenhuma regra nova ainda — só extrair e MOSTRAR.

### A1. Localizador da ata no PPTX — `lib/v3/ata-image.ts` (novo)

O localizador de tabelas (`lib/v3/table-images.ts`) **descarta** a ata de propósito (filtra
seções numéricas + heurística de tabela). Criar localizador próprio:

- Varrer rels dos **slides 1–4** (a ata mora no começo; aceitar parâmetro `maxSlide=4`).
- Candidata: imagem PNG/JPEG **grande** (≥ 500 KB OU ≥ 900×600 px — a ata é um print de
  página inteira; conferir contra os PPTX reais da pasta docs e ajustar limiares).
- Se houver mais de uma candidata, preferir a de **maior área** no menor nº de slide.
- Reusar de `table-images.ts`: leitura de dims PNG/JPEG, sha1, parse de rels (extrair
  helpers compartilhados ou duplicar 40 linhas — decisão do implementador; não quebrar
  o localizador de tabelas, que tem teste em `lib/v3/__tests__/pipeline-det.test.ts`).
- Exportar `findAtaImage(bytes, ir): Promise<AtaImageCandidate | null>` com
  `{ slide, sha1, bytes, mime, w, h, kb }`.

### A2. Edge function `analyze-ata-image` (nova)

Copiar o esqueleto de `supabase/functions/analyze-table-image/index.ts` (CORS por
ALLOWED_ORIGINS, rate-limit, validação, `response_format: json_object`, retries 429).
Prompt novo — extração de briefing, JSON FECHADO:

```
{"ata": {
  "cliente": "…", "projeto": "…",
  "cidade": "…", "uf": "…", "endereco": "…", "bairro": "…",
  "area_terreno_m2": 25000,
  "produto": { "torres": 8, "unidades": 1912, "dorms": [2], "m2_min": 36, "m2_max": 41,
               "vagas_pct": 50, "programa": "MCMV" },
  "preco_m2_viabilidade": 8500,
  "duvidas_cliente": ["Qual o mix ideal de metragens", …],
  "pedidos_analista": ["Trazer tabela de lacunas de vagas de garagem", …]
}}
```

Regras do prompt: números pt-BR → números JSON; campo não presente na ata = null (NUNCA
inventar); `duvidas_cliente` e `pedidos_analista` são **transcrição fiel** dos bullets
(são o insumo do checklist — não parafrasear); pedidos destacados/realçados entram em
`pedidos_analista`. Devolver também `inputTokens`/`outputTokens` (usage), como as demais.
Modelo: aceitar `gpt-4o-mini` e `gpt-4o` (ata é texto grande — mini deve bastar; o teste
da pausa A decide).

### A3. Cache + cliente — `lib/v3/ia-ata.ts` (novo)

- Cache no `vision_cache` (mesma tabela, sha1 da imagem, `schema_version` atual): payload
  `{ ata: {...} }`. Zero migration para o cache.
- `extractAta(candidate, model): Promise<AtaData>` — cache-first → edge → upsert.
- **Migration** `2026XXXX_ia_passes_ata.sql`: o check de `ia_passes.tipo` hoje só aceita
  `('texto','visao_tabela','visao_mapa')` → **ampliar para incluir `'visao_ata'`**
  (drop constraint + add com a lista nova; padrão idempotente como nas migrations recentes).
- Registrar o passe com `registerIaPass(studyId, 'visao_ata', …)`.

### A4. Painel de TESTE no workspace — validação no olho

No `CorretorV3Page` (workspace), um card colapsável "📋 Ata do projeto (β teste)":

- Botão "Localizar e extrair ata" (manual nesta fase — NÃO ligar no passo único ainda).
- Resultado em **duas colunas**: imagem da ata (grande, lightbox) × JSON extraído
  renderizado como definição amigável (cliente, cidade, produto…, listas de dúvidas e
  pedidos). Mostrar custo do passe.
- Se nenhuma candidata: "Ata não localizada nos slides 1–4".

### A5. Bônus barato: extração do DOCX (formato futuro, custo R$ 0)

`lib/v3/ata-docx.ts`: DOCX é zip com `word/document.xml` — extrair texto dos parágrafos
(`w:t`) com `fflate` + DOMParser (mesmo padrão do `pptx-to-ir.ts`). Enviar o TEXTO para a
mesma edge (aceitar `body.texto` como alternativa a `base64` — ramo sem imagem custa ~10×
menos). Testar com a ata DOCX real da pasta docs.

### ⏸ PAUSA A — teste com o Gabriel (não seguir para B sem isso)

1. Rodar o painel em **2–3 estudos reais** (Tancredo/Marka/Itajaí — PPTX da pasta docs).
2. Gabriel confere campo a campo contra a imagem: cidade/UF, produto, preço, e
   **principalmente** se `duvidas_cliente` e `pedidos_analista` vieram completos e fiéis.
3. Testar o DOCX real (A5) e comparar qualidade imagem × texto.
4. Registrar no LIVE: taxa de acerto por campo, modelo usado (mini bastou?), custo real.
5. **Critério de aceite:** cidade/UF e pedidos_analista 100% corretos nos estudos testados;
   demais campos ≥ ~90%. Se falhar: iterar prompt/modelo ANTES de construir B.

---

## FASE B — Ata vira os parâmetros do estudo (só após pausa A aprovada)

### B1. Integrar ao passo único

Em `lib/v3/pipeline.ts` (`runFullAnalysis`): estágio novo `ata` que roda ANTES da IA de
texto — `findAtaImage` → `extractAta` (cache-first). Com a cidade extraída, chamar
`runTextPass(ir, cidadeDaAta, …)` → **conserta o CITY_NAME rodando com cidade vazia**.
Falha na ata NUNCA bloqueia o resto (best-effort, como a evidência visual). Atualizar
`estimateFullAnalysis` (+1 imagem de visão quando houver candidata fora do cache) e o
`AnalysisBanner`/`STAGE_LABEL` com o estágio "Ata do projeto".

### B2. Persistir e exibir

- Migration: `studies_v3` ganha coluna `ata jsonb` (null = não extraída). Popular
  `studies_v3.cidade` com a cidade extraída (coluna já existe).
- Workspace: o painel da fase A vira o card permanente "Ata do projeto", **editável**
  (analista corrige a leitura — hipótese verificada, como sempre). Edição salva no jsonb.
- Card do estudo na homepage mostra a cidade.

### ⏸ PAUSA B — teste com o Gabriel

1. Upload de estudo real → ata aparece extraída automaticamente no workspace; cidade do
   card correta; passe registrado em `ia_passes` (`visao_ata`); custo dentro do teto.
2. Verificar que a IA de texto recebeu a cidade (um CITY_NAME plantado — ex. estudo de
   Guarulhos mencionando Florianópolis — deve ser pego **sem digitar cidade em lugar nenhum**).
3. Editar um campo da ata e recarregar (persistência ok).
4. **Critério de aceite:** fluxo sem nenhum clique além do upload; CITY_NAME funcional.

---

## FASE C — ATA_COVERAGE real (só após pausa B aprovada)

A regra 22 sai de MOCK: cada **pedido do analista** e **dúvida do cliente** vira um item
verificado no estudo. Arquitetura de sempre — DET barato primeiro, IA só no julgamento:

### C1. Camada DET (grátis) — `lib/audit/ata-rules.ts` (novo)

Para cada item da ata, extrair **termos-chave** (substantivos: "vagas de garagem",
"áreas de lazer", "mix de metragens", "fasear/faseamento") e casar contra o IR
(títulos + textos, case/acento-insensitive). Resultado por item:
- match forte (termo no TÍTULO de slide) → candidato `presente` (slideRef do match);
- match fraco (só em texto) → `verificar`;
- sem match → candidato `ausente`.

### C2. Camada IA (centavos) — julgamento semântico no batch de texto

Estender a edge `analyze-text-batch` (ou chamada dedicada — decisão do implementador)
com a pergunta: "o estudo responde/entrega ISTO? {item}. Slides candidatos: {texto dos
matches}". Só para itens `verificar`/`ausente` da C1 (os `presente` fortes não gastam IA).
Saída: `presente | ausente | nao_verificavel` + slide + justificativa de 1 linha.

### C3. Achado + UI

Um achado `ATA_COVERAGE` por estudo (relacional, seção `ATA`), viz checklist já existente:
item ✅ (com slideRef clicável) / ❌ / ⚠ não-verificável. `ok: true` quando todos ✅.
Status pendente/corrigido/ignorado como qualquer achado. Retirar o MOCK do catálogo
(`mode: 'PLENO'` com nota β) e a fixture demo.

### C4. Gerador de teste

`gera_estudo_teste.py`: novo slide 2 com **ata sintética** (imagem de texto com os blocos
reais: produto, cidade, 2 dúvidas, 2 pedidos — 1 pedido ATENDIDO por um slide existente,
1 pedido PROPOSITALMENTE ausente) → gabarito ganha `{type: ATA_COVERAGE, layer: VISION}`.
O crosscheck passa a medir recall do coverage também.

### ⏸ PAUSA C — teste com o Gabriel

1. Estudo sintético: o pedido ausente aparece ❌, o atendido ✅ com o slide certo.
2. Estudo real (Tancredo): os 2 pedidos + 3 dúvidas com veredito correto (conferir contra
   o estudo de verdade — o Gabriel sabe o que foi entregue).
3. Medir FP/FN e custo do julgamento; registrar no LIVE.
4. **Critério de aceite:** zero falso-✅ (pedido ausente marcado presente é o erro grave);
   falso-❌ tolerável se a justificativa deixar o analista decidir em segundos.

---

## Restrições duras (verificadas no código em 11/jul — conferir se ainda valem)

| Item | Fato | Fonte |
|---|---|---|
| `ia_passes.tipo` | check só aceita texto/visao_tabela/visao_mapa → migration obrigatória p/ `visao_ata` | `20260709110000_corretor_v3_ia.sql` |
| `studies_v3.cidade` | coluna já existe (text, null) — B2 só popula | `20260709100000_corretor_v3.sql:11` |
| Localizador de tabelas | NÃO tocar nos limiares (15–500 KB, ≥700 px, aspecto ≥1,2, seções numéricas) — tem teste de regressão | `lib/v3/table-images.ts:12-15` |
| `vision_cache` | tem `schema_version`+`model` (v0.19); payload da ata convive na mesma tabela por sha1 | `20260711110000_vision_cache_schema.sql` |
| Edge pattern | CORS/rate-limit/validação/json_object/retries — copiar de `analyze-table-image` | `supabase/functions/analyze-table-image/index.ts` |
| Teto de custo | `BUDGET_STUDY_BRL = 4` / FX 5,16 — a ata entra na estimativa do passo único (fase B) | `lib/v3/config.ts` |
| Semântica verificada | princípio vigente: extração da LLM é HIPÓTESE; ata editável pelo analista é a verificação humana | LIVE v0.22 |

## Deploys/migrations por fase

- **A:** deploy `analyze-ata-image` + migration do check de `ia_passes`.
- **B:** migration `studies_v3.ata jsonb`.
- **C:** redeploy `analyze-text-batch` (se estendida).

## Regra de encerramento de cada fase

Ao fim de CADA fase: atualizar `LIVE_regras_corretor_vocacionais.md` (versão nova no topo,
com os números da pausa de teste) e, se tocar navegação/plataforma, `docs/projetos/LIVE_rebrain.md`
— antes do push (CLAUDE.md). Build/typecheck/lint/testes limpos antes de cada pausa.
