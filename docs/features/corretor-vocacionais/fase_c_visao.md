# Fase C — Extração de visão dos números presos em imagem

Design do caminho crítico (ver `taxonomia_notas.md`): a maioria das correções que o analista
faz é sobre números, e nos estudos reais os números estão **em imagem**. Este doc define o
pipeline, o schema, o cache e o **argumento econômico para tabelas nativas**.

## Piloto (09/jul/2026) — provado de ponta a ponta ✅

2 imagens de slides com nota-gabarito extraídas para JSON estruturado e validadas com
regras DET (`valida_complemento.py`):

| Imagem | Slide | Resultado |
|---|---|---|
| Itajaí s41 — Domicílios por faixa de renda (SC/Itajaí/10-20-30min) | nota: "Ajustar o erro da fórmula" | 10 checagens OK, 0 inconsistências |
| Marka s121 — Tabela de lacunas (tipologia × m², Oferta Lançada + Final) | nota: "Ajustar com as lacunas:" | 38 checagens OK, 0 inconsistências |

**Insight do piloto:** tabelas com totais têm redundância interna (linhas × colunas × total
declarado). Essa redundância **auto-valida a extração** — um dígito mal lido pela visão quebra
uma soma e é detectado. Ou seja: nas tabelas com totais, conseguimos distinguir *erro de
extração* de *bug real do estudo* com checagem cruzada.

## Pipeline de produção

```
manifest (scan_imagens.py, sha1 por imagem)
  → filtro: seções numéricas + heurística de tabela (px, kb)
  → fila de extração: SÓ imagens únicas ainda sem complemento (cache por sha1)
  → visão (edge function, análoga a analyze-slide): imagem → ir_complemento_visao/v0
  → valida_complemento.py: checagens DET
      · consistente → números entram na auditoria (CROSS_TABLE_MISMATCH etc.)
      · inconsistente → 1 retry de visão; se persistir → marcar "extração incerta"
        (não vira bug sem confirmação)
  → complementos ficam versionados/cacheados — NUNCA reprocessar sha1 já extraído
```

### Schema `ir_complemento_visao/v0`

```
{ schema, estudo, slide, secao, titulo_slide, imagem, sha1?, extraido_por,
  tabelas: [ { titulo, colunas[], linhas_num[][], totais_declarados[] } ] }
```

Espelha as tabelas do IR (`linhas_num`) — as regras DET rodam igual sobre tabela nativa ou
complemento de visão.

## Dimensionamento (manifest de 08-09/jul)

| Métrica | Valor |
|---|---|
| Referências de imagem nos 2 estudos | 487 |
| Imagens **únicas** (sha1) — dedupe economiza 31% | 334 |
| Únicas em seções numéricas (SOCIO/MERCADO/LACUNAS/ABSORCAO) | **154** |
| Únicas nos slides do gabarito (escopo do piloto expandido) | 28 |

Custo de visão ≈ **154 chamadas 1× por par de estudos** (com cache, nunca de novo).
Estimativa por estudo novo: **~75–115 imagens numéricas únicas**.

## 💰 Argumento econômico para o time de analistas (tabelas nativas no PPT)

Hoje as tabelas são coladas como **print** (praticidade de quem monta). O custo disso:

1. **Custo direto de LLM**: ~75–115 chamadas de visão por estudo, em toda versão nova do
   estudo (v2, v3, revisão…) para as imagens que mudarem. Tabela nativa: **R$ 0, para sempre** —
   o extrator lê os números do XML do PPTX deterministicamente.
2. **Risco de leitura**: visão pode errar dígito. Mitigamos com checagem cruzada nas tabelas
   com totais, mas tabelas sem redundância ficam com incerteza residual. Tabela nativa: **exata
   por construção**.
3. **Latência/fricção**: extração de visão adiciona minutos e um passo de validação por estudo.
   Tabela nativa: auditoria instantânea no upload.
4. **Cobertura**: com imagem, auditamos só o que extraímos; com tabela nativa, **100% dos
   números entram de graça** — inclusive checagens que nem pedimos ainda.

**Proposta de transição suave** (não precisa ser tudo de uma vez): começar pelas tabelas que o
analista mais corrige (as do gabarito) — **lacunas, renda/socio, absorção** — e manter mapa
como imagem (mapa não é tabela). Cada tabela migrada sai da fila de visão imediatamente.

## Próximos passos da Fase C

- [ ] Heurística de "é tabela?" no manifest (proporção px, kb/px) para reduzir as 154 a fila real.
- [ ] Edge function de extração (payload = imagem + schema; saída = complemento v0) com cache
      por sha1 (tabela Supabase `vision_cache`).
- [ ] Expandir o piloto para as 28 imagens do gabarito → base da validação recall/precisão da Fase D.
- [ ] Integração: `rules_ir.py` consome complementos junto com o IR (fonte única de tabelas).
