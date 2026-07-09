# Custos em R$ — extração por imagem vs tabelas nativas no PowerPoint

Material para a conversa com o time de analistas (09/jul/2026).
Premissas: preços OpenAI vigentes (jul/2026) e **câmbio R$ 5,16/US$**.

## Preços de referência (jul/2026)

| Modelo | Input | Output | Uso proposto |
|---|---|---|---|
| gpt-4o-mini | US$ 0,15/M tokens | US$ 0,60/M | Triagem/extração padrão |
| gpt-4o | US$ 2,50/M | US$ 10,00/M | Confirmação de casos ambíguos |
| Batch API | −50% | −50% | Extração não é urgente → usar sempre que possível |

> Imagens são cobradas em tokens por "tiles" de 512px. Uma tabela típica dos estudos
> (~1300×450 a 3200×600 px) ≈ 3–4 tiles. No 4o-mini os tokens de imagem têm multiplicador
> (~2.833 base + ~5.667/tile) ≈ **20–26 mil tokens por imagem**; no 4o, ~600–800 tokens.
> Output (JSON da tabela) ≈ 800–1.200 tokens.

## Custo por imagem de tabela (extração + JSON)

| Cenário | US$/imagem | **R$/imagem** |
|---|---|---|
| gpt-4o-mini | ~US$ 0,0036 | **~R$ 0,019** |
| gpt-4o-mini via Batch | ~US$ 0,0018 | **~R$ 0,009** |
| gpt-4o (confirmação) | ~US$ 0,0115 | **~R$ 0,059** |

Com margem para 1 retry em ~20% das imagens + validação: usar **R$ 0,02–0,08/imagem** como faixa de trabalho.

## Custo por estudo (~75–115 imagens numéricas únicas, com cache por sha1)

| Cenário | **R$/estudo (1ª passada)** |
|---|---|
| Tudo em 4o-mini | **R$ 1,50 – 2,30** |
| Misto (mini + 4o nos ambíguos ~20%) | **R$ 2,40 – 3,70** |
| Tudo em 4o (máxima confiança) | **R$ 4,40 – 6,80** |

Versões novas do estudo (v2, v3…): só imagens **alteradas** reprocessam (cache) — tipicamente
+R$ 0,50–2,00 por versão.

## Custo anual (cenários)

| Volume | 4o-mini | Misto | 4o |
|---|---|---|---|
| 50 estudos/ano, 2 versões | R$ 125–190 | R$ 200–310 | R$ 370–570 |
| 150 estudos/ano, 2 versões | R$ 380–580 | R$ 600–930 | R$ 1.100–1.700 |
| 300 estudos/ano, 3 versões | R$ 900–1.400 | R$ 1.400–2.200 | R$ 2.600–4.100 |

**Tabela nativa no PPT: R$ 0 — em todos os cenários, para sempre.**

## ⚠ A leitura honesta dos números

O custo **direto** de API é modesto (dezenas a poucos milhares de R$/ano). O argumento
financeiro completo para tabelas nativas tem 3 componentes, e o maior **não** é a API:

| Componente | Por imagem (LLM) | Tabela nativa |
|---|---|---|
| **1. API OpenAI** | R$ 380–4.100/ano conforme volume/modelo | **R$ 0** |
| **2. Risco de dígito errado** | Visão pode ler 12.143 como 12.113. Mitigamos com checagem cruzada (tabelas com totais se auto-validam), mas tabelas sem redundância carregam incerteza residual → **um bug falso na frente do cliente custa mais que um ano de API** | **Zero por construção** |
| **3. Engenharia + operação** | Pipeline de visão: fila, cache, retries, validação, monitoramento — construção e manutenção contínuas (horas de dev valem mais que a API) | Extração = ler XML (já pronta no `ir_extractor.py`) |

**Conclusão para a conversa:** o pitch não é "vamos economizar API" — é *"com tabela nativa, a
auditoria fica **exata, instantânea e de graça**; com imagem, fica boa-mas-probabilística,
minutos mais lenta e com um pipeline inteiro para manter"*. Os R$ da API são o argumento
quantificável; exatidão e simplicidade são o argumento decisivo.

## Proposta de transição (gradual, sem dor)

1. Começar pelas tabelas **que o analista mais corrige** (gabarito): lacunas, renda/socio, projeção/absorção.
2. Mapas e fotos continuam imagem (não são tabelas).
3. Cada tabela migrada sai da fila de visão **imediatamente** (cache por sha1 detecta).
4. Meta sugerida: novos estudos com as ~6-10 tabelas-chave nativas ⇒ ~80% do valor da auditoria numérica a custo zero.

## Fontes

- [Pricing | OpenAI API](https://developers.openai.com/api/docs/pricing)
- [GPT-4o mini API Pricing (June 2026)](https://devtk.ai/en/models/gpt-4o-mini/)
- [OpenAI API Pricing 2026](https://pecollective.com/tools/openai-api-pricing/)
- [Cotação USD/BRL — Investing.com](https://br.investing.com/currencies/usd-brl) (R$ 5,16 em 09/jul/2026)
