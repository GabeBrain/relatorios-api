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
