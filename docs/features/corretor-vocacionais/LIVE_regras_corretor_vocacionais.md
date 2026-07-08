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
