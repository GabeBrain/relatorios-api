# Corretor v3 — Design da unificação (v1 + v2 → um fluxo)

Decidido em 2026-07-09 (Gabriel + Claude). A v3 **absorve tudo** da v1 (IA, custo,
persistência, arquivo) e da v2 (PPTX→IR, motor DET, worklist, calibração) num único fluxo
de trabalho, desenhado a partir do `DESIGN_fluxo_correcao_analista.md` (6f).

## Objetivo em uma frase

O **analista de mercado** sobe o PPTX e sai com o estudo **pronto para o A&R**
(0 pendentes), gastando o **mínimo de IA possível** e vendo o custo antes de gastar.

## Decisões de fundação (Gabriel, 09/jul)

| Decisão | Escolha |
|---|---|
| Formato de entrada | **Só PPTX** (material real do analista; PDF morre com a v1) |
| Uso de IA | **Por demanda com orçamento** (triagem DET grátis; passes de IA são botões com custo estimado, rodáveis por porção) |
| Persistência | **Supabase desde o início** (sessão retomável, histórico, gestor enxerga) |
| Destino da v1 | **v3 substitui tudo** (`/auditoria` vira v3; v1/demo-v2 aposentadas, código preservado; histórico v1 legível) |

## Insight técnico do PPTX-only (economia extra)

Com o IR entregando **todo o texto** do estudo, a "revisão visual por slide" da v1
(screenshot → OpenAI) deixa de ser necessária para a maioria das regras:

- `SPELLING`, `CITY_NAME`/`WRONG_CONTEXT`, `COHERENCE` → rodam sobre **texto do IR**
  (chamadas de texto, ~10× mais baratas que visão, em batch de N slides).
- **Visão fica cirúrgica**: só para **imagens de tabela** (extração numérica, Fase C) e
  **mapas** (nível 2) — e essas imagens são arquivos de mídia do zip, extraíveis
  **diretamente** (como `scan_imagens.py` provou), **sem renderizar slide**.
- Thumbnail/evidência por slide: usar as próprias imagens de mídia do slide (não o render).

Consequência: **o pipeline inteiro roda a partir de um único artefato (.pptx), sem PDF e
sem renderização**, e o custo de IA por estudo cai vs v1.

## O fluxo (5 estágios, uma área de trabalho por estudo)

```
1 TRIAGEM     upload .pptx → IR no navegador → motor DET → achados em segundos, R$ 0
2 APROFUNDAR  botões com custo estimado, por porção:
              a) texto-IA (ortografia/cidade/coerência, batch)         ~R$ 0,3-1/estudo
              b) números das tabelas-imagem (edge visão + cache sha1)  ~R$ 1,5-7/estudo
              c) mapas (nível 2, perguntas objetivas por mapa único)
3 CORRIGIR    worklist 6f: sequencial por slide + entre-slides; status
              pendente/corrigido/ignorado; progresso rumo a zero
4 RECONFERIR  re-upload da versão corrigida → diff (resolvidos/persistentes/novos);
              IA re-roda SÓ no que mudou (cache por sha1 de slide/imagem)
5 ENTREGAR    0 pendentes → selo "pronto para A&R" + relatório + histórico
```

## O que a v3 absorve de onde

| Peça | Origem | Papel na v3 |
|---|---|---|
| PPTX→IR no navegador (`pptx-to-ir.ts`) | v2 | Estágio 1 (e base de tudo) |
| Motor DET + catálogo 21 tipos + visualizações | v2 | Estágios 1 e 3 |
| Worklist sequencial+relacional (6f slice 1) | v2 | Estágio 3 |
| Edge function IA + custo por token | v1 | Estágio 2 (adaptada p/ texto-batch + visão cirúrgica) |
| Extração numérica com cache sha1 (schema v0 pilotado) | Fase C | Estágio 2b — **produtizar aqui** |
| Persistência projects/slides/erros/vereditos + poda | v1 | Estágio 5 (schema novo `*_v3`, histórico v1 legível) |
| Export CSV de calibração + recall vs gabarito | v2 | Transversal (loop com a analista continua) |
| Sessão/status/diff (6f slices 2-3) | 6f | Estágios 3-4 — **implementar dentro da v3**, não na demo v2 |

## Modelo de dados (Supabase, novo)

```
studies_v3        id, nome, cidade, raios, criado_por, status (em_correcao|pronto), custo_total
study_versions    id, study_id, n (1,2,…), sha1_pptx, n_slides, criado_em
findings_v3       id, study_id, rule_id_estavel, tipo, slide_ref, familia (local|relacional),
                  payload_viz (jsonb), status (pendente|corrigido|ignorado), origem (DET|IA_texto|IA_visao),
                  primeira_versao, resolvido_na_versao?
ia_passes         id, study_id, tipo (texto|visao_tabela|visao_mapa), escopo, custo, tokens, criado_em
vision_cache      sha1_imagem → payload extraído (nunca reprocessa)
```

IDs de achado **estáveis por conteúdo** (já é assim no motor) → o diff entre versões é set
difference; `resolvido_na_versao` materializa o loop.

## Plano de entrega (fatias verticais, cada uma utilizável)

1. **v3.0 — esqueleto do fluxo (R$ 0)**: rota nova única, estágios 1→3→4→5 sem IA
   (triagem DET, worklist com status, re-upload/diff, concluir). Supabase `*_v3`.
2. **v3.1 — IA de texto**: edge function de batch-texto (ortografia/cidade/coerência sobre IR),
   orçamento antes, custo por passe registrado.
3. **v3.2 — números das imagens (Fase C produtizada)**: edge de visão p/ tabelas-imagem +
   `vision_cache`; destrava CROSS_TABLE/BINNING/somas nos estudos só-imagem.
4. **v3.3 — mapas nível 2 + aposentadoria formal da v1** (redirect, migração de leitura do
   histórico antigo).

Cada fatia termina com teste da sessão real (Itajaí/Marka + gabarito): tempo-até-zero,
residual ao A&R, taxa de FP.

## Pendências de decisão (menores, decidir durante a v3.0)

- Nome/rota da área (ex.: `/corretor` ou manter `/auditoria`).
- Quem pode disparar passes de IA (analista livre × aprovação do gestor por orçamento).
- Papel da calibração (bug/fp) na v3: mantém-se como visão da analista-calibradora (Juliana)
  separada do status de correção do analista de mercado.
