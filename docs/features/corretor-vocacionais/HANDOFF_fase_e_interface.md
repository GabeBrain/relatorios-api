# HANDOFF — Fase E: Interface v2 do Corretor + máximo de tipos de erro reconhecíveis

**Para a próxima sessão de trabalho (ops).** Este doc contém todo o contexto e as instruções
para continuar sem depender da conversa anterior. **Nenhum código foi escrito ainda** — este é
o plano aprovado pelo Gabriel em 09/jul/2026.

## 0. Contexto mínimo (ler antes)

| Doc | O que dá |
|---|---|
| [`regras_em_linguagem_natural.md`](./regras_em_linguagem_natural.md) | As 24 regras (6 RUNTIME, 8 POC, 10 planejadas) + 11 bases de conhecimento |
| [`taxonomia_notas.md`](./taxonomia_notas.md) | Virada conceitual: notas do analista = especificação + gabarito |
| [`DESIGN_corretor_v2.md`](./DESIGN_corretor_v2.md) | Arquitetura 3 camadas + estratégia de fases (0→E) |
| [`fase_c_visao.md`](./fase_c_visao.md) + `visao/piloto/*.json` | Pipeline de visão + 6 complementos reais extraídos e validados |
| [`achados_fase_a.md`](./achados_fase_a.md) | 81 achados DET reais nos 2 estudos |

**Decisões vigentes:** tabelas em **imagem são o padrão** (gestor, 09/jul); estudos = PPTX;
atas futuras = DOCX; IA mínima com cache por sha1; app atual (`/auditoria`) analisa PDF
slide-a-slide via `analyze-slide` (OpenAI) — a v2 muda o paradigma para **auditoria do estudo**.

## 1. Objetivo da Fase E

1. **Interface de auditoria v2**: sair do "lista de slides" para **relatório por
   seção → tipo de erro → achado**, com veredito da analista (bug real × falso positivo)
   alimentando a calibração.
2. **Máximo de tipos de erro reconhecíveis JÁ NA TELA** — mesmo os com pendência de base de
   conhecimento entram em modo degradado (ver §3), para os analistas validarem em teste.
3. **Visualização específica por tipo de erro** (ver §4) — entender os mais comuns e dar a
   cada um uma renderização própria.
4. **Persistência de thumbnails**: mudar de "só slides com erro" para **"todas até o veredito,
   depois podar as OK"** (ver §5).

## 2. Estado do código hoje (onde mexer)

- `src/features/corretor/` — feature completa: `pages/CorretorPage.tsx` (lista/arquivo),
  `pages/CorretorAnalysisPage.tsx` (análise slide-a-slide, pdfjs no browser),
  `store/analysis-store.ts` (**enum de 5 tipos — precisa crescer**), `store/archive-store.ts`,
  `lib/openai-analyzer.ts` (chama edge function), `lib/archive-db.ts` (persistência
  Supabase: `projects`, `slides`, `slide_errors` + bucket `slide-thumbnails`),
  `lib/report-generator.ts`, `lib/cost-calculator.ts`.
- `supabase/functions/analyze-slide/index.ts` — prompt v1 hardcoded (5 regras IA).
- Scripts POC (referência de lógica, portar para TS): `rules_ir.py`, `valida_complemento.py`,
  `crosscheck_piloto.py`, `scan_imagens.py`.
- Fixtures reais para desenvolver a UI **sem gastar IA**: `visao/piloto/*.complemento.json`
  (têm até `bugs_evidenciados` prontos) e `achados_fase_a.md`.

## 3. Expandir o enum de tipos de erro — todos, com modo degradado

Novo enum em `analysis-store.ts` (e tabela `slide_errors.type`):

```
PERCENTAGE_SUM · ABSOLUTE_SUM · TOTALS_EQUALITY · CROSS_TABLE_MISMATCH · BINNING_RULE ·
TEMPORAL_WINDOW · PROJECTION_FORMULA · IBGE_MISMATCH · CITY_NAME/WRONG_CONTEXT · RADII ·
MAP_CHART_MISMATCH · STRUCTURE_MISSING · SOURCE_MISSING · REQUIRED_NOTE · EXCLUSION_RULE ·
LEFTOVER_NOTE · SPELLING · COHERENCE · VALUE_PLAUSIBILITY · ATA_COVERAGE
```

Estratégia "funciona já, mesmo com pendência" — cada tipo tem um dos 3 modos:

| Modo | Tipos | Como habilitar já |
|---|---|---|
| **PLENO** (regra completa) | PERCENTAGE_SUM, ABSOLUTE_SUM, CROSS_TABLE_MISMATCH, BINNING_RULE, TEMPORAL_WINDOW, LEFTOVER_NOTE, SOURCE_MISSING, CITY_NAME, SPELLING, COHERENCE, RADII | Portar lógica dos POC .py para TS; IA v1 já cobre os 5 últimos |
| **DEGRADADO** (roda com aproximação, marcado "β") | VALUE_PLAUSIBILITY (faixas fixas por tipo de produto + monotonicidade, sem IA), STRUCTURE_MISSING (dicionário SECOES v0, pré-calibração), TOTALS_EQUALITY e EXCLUSION_RULE (onde houver números extraídos), WRONG_CONTEXT (lista de cidades ≠ cidade do estudo no texto do IR) | Implementar com o que existe; achados marcados como "confiança β" na UI |
| **MOCK** (aparece na UI com dado do piloto, motor pendente) | PROJECTION_FORMULA (falta fórmula), IBGE_MISMATCH (falta fonte), ATA_COVERAGE (falta extração de ata), MAP_CHART_MISMATCH (ver §6) | Renderizar com fixtures do piloto para os analistas validarem a VISUALIZAÇÃO enquanto a base não chega |

> Regra de honestidade na UI: todo achado exibe seu modo (PLENO/β/mock) — analista nunca
> confunde demonstração com auditoria real.

## 4. Visualizações por tipo de erro (espec. de UI)

Agrupar os 20 tipos em **6 padrões de visualização** (cada padrão = 1 componente):

1. **Overlay na thumbnail** (apontar ONDE) — CITY_NAME, SPELLING, LEFTOVER_NOTE,
   SOURCE_MISSING, REQUIRED_NOTE: thumbnail do slide com bounding box/realce + balão com o
   texto do problema. (v1 já tem `location` textual da IA; overlay pode começar como banner
   ancorado + evoluir para bbox.)
2. **Tabela com células marcadas** (provar O NÚMERO) — PERCENTAGE_SUM, ABSOLUTE_SUM,
   TOTALS_EQUALITY, EXCLUSION_RULE: renderizar a tabela extraída (complemento/IR) com a
   célula/coluna inconsistente em vermelho + a soma calculada vs declarada.
3. **Comparação lado a lado** (provar a DIVERGÊNCIA) — CROSS_TABLE_MISMATCH, WRONG_CONTEXT,
   TEMPORAL_WINDOW: dois cards (slide A × slide B) com os valores/rótulos divergentes
   alinhados e destacados. Fixture pronta: s41×s59×s60 e s121×s122 do piloto.
4. **Linha de faixas** (provar o FURO) — BINNING_RULE: régua horizontal com as faixas
   desenhadas em sequência; furo/sobreposição pintado. Fixture: furo 9501–10000 do s122.
5. **Mapa + métricas** (computação visual) — RADII, MAP_CHART_MISMATCH: ver §6.
6. **Checklist de estrutura** — STRUCTURE_MISSING, ATA_COVERAGE: lista de
   seções/pedidos-da-ata com presente ✅ / ausente ❌ / não-verificável ⚠.

Tela principal: **sumário do estudo** (score por seção, contagem por tipo, custo IA da
rodada) → drill-down por seção → lista de achados com a visualização do seu padrão →
botões de veredito (bug real / falso positivo / não sei) por achado.

## 5. Mudança na persistência de thumbnails (aprovada)

Hoje (`archive-db.ts`): upload **só dos slides com erro**; slides OK descartados com a sessão.
**Mudar para**: upload de **todas** as thumbnails ao arquivar (~20-25 MB/estudo) → após o
**veredito final** da revisão, **podar** as imagens dos slides confirmados OK (mantém as com
erro). Racional: o caso mais valioso da calibração é o **falso negativo** (corretor disse OK,
tinha bug) — hoje é exatamente a evidência que não guardamos. Implementar: flag de
"revisão concluída" no projeto → job de poda (`storage.remove`).

## 6. Mapas, raios e computações visuais — plano pragmático

Contexto: os mapas dos estudos são **imagens** (fundo cartográfico + círculos de raio +
pontos). Não há camada geo estruturada. Estratégia em 3 níveis (do barato ao caro):

1. **Nível 1 (DET, já)** — RADII textual: o IR já traz os rótulos ("Até 10 min" etc.) das
   legendas; validar contra os raios do projeto é string-match (regra 4 da v1 vira DET, sem IA).
2. **Nível 2 (visão pontual, β)** — perguntas objetivas à visão sobre a imagem do mapa, 1
   chamada por mapa único (cache sha1): "quantos círculos concêntricos?", "os rótulos dos
   raios são 10/20/30 min?", "a legenda bate com as cores presentes?". Formato de resposta
   JSON fechado. Custo ~R$ 0,02-0,06/mapa (ver `custos_visao_reais.md`).
3. **Nível 3 (MAP_CHART_MISMATCH, mock por enquanto)** — comparar valores do mapa com o
   gráfico/tabela do slide: exige extrair rótulos numéricos de dentro do mapa (visão de alta
   resolução, zoom por tile). Prototipar só depois que 1 e 2 estiverem validados.

Na UI (padrão 5): thumbnail do mapa + card lateral "raios esperados vs detectados" +
status por checagem. Fixtures dos mapas: Ita s27 (Z.I.), Mrk s27/28 (Z.I. do Brooklin —
caso real de WRONG_CONTEXT em mapa).

## 7. Ordem de implementação sugerida (para a próxima sessão)

1. Enum novo + migração `slide_errors` (compatível com dados v1 existentes).
2. Motor DET em TS (`src/features/corretor/lib/rules-engine.ts`): portar `rules_ir.py` +
   `valida_complemento.py` + `crosscheck_piloto.py`. Entrada: IR JSON + complementos.
   (O IR ainda é gerado por script Python — ingestão de PPTX no browser fica para depois;
   por ora aceitar upload do `.ir.json` + complementos na UI de teste.)
3. Componentes de visualização (padrões 2, 3, 4 primeiro — têm fixtures reais prontas).
4. Tela sumário → seção → achado com vereditos.
5. Persistência: todas as thumbnails + poda pós-veredito.
6. Mapas nível 1 (DET) e nível 2 (visão β) por último.

**Critério de pronto da fase:** analista consegue abrir um estudo de teste (fixtures do
piloto), ver TODOS os 20 tipos na tela (cada um no seu modo PLENO/β/mock, com visualização
própria) e dar veredito por achado — sem custo de IA além do já cacheado.

## 8. Pendências externas (não bloqueiam a fase, destravam modos)

| Pendência | Quem | Destrava |
|---|---|---|
| Fórmula da projeção de 6 anos | analista (Juliana) | PROJECTION_FORMULA → PLENO |
| Fonte IBGE Censo 2022 (API/CSV) | definir c/ time | IBGE_MISMATCH → PLENO |
| Calibração `calibracao/*.secao.csv` | analista | STRUCTURE_MISSING → PLENO, roteamento |
| Ata em DOCX (próximos estudos) | time de elaboração | ATA_COVERAGE → PLENO |
| Tabelas nativas / Excels de origem | conversa médio prazo | aposenta a visão de números |
