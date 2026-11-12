# 07 — Escolha de modelo na API do Claude

Avaliação para o sistema de qualificação de apresentações via API. Dados de modelos e preços consultados na documentação oficial em 06/11/2026. **Reconfirmar antes de implementar**, porque modelos e preços mudam.

---

> **Decisão de 12/11/2026 (Diego):** o sistema usa **Claude Opus 5.5 com effort `medium` em todas as fases**. A análise abaixo fica como registro e base para reavaliação futura (§5).

## 1. Modelos disponíveis (nov/2026)

| Modelo | API ID | Entrada / saída (US$ por milhão de tokens) | Contexto | Saída máx. | Latência |
|---|---|---|---|---|---|
| Claude Fable 5.1 | `claude-fable-5-1` | 10 / 50 | 1M | 128K | mais lenta |
| Claude Opus 5.5 | `claude-opus-5-5` | 4 / 20 | 1M | 128K | moderada |
| **Claude Sonnet 5.5** | `claude-sonnet-5-5` | **2 / 10** | 1M | 128K | rápida |
| Claude Haiku 5.5 | `claude-haiku-5-5` | a partir de 0,10 / 0,50 | 1M | 128K | a mais rápida |

Todos aceitam texto e imagem e têm tool use e pensamento adaptativo. Sonnet e Opus não cobram adicional por contexto longo. Batch API tem 50% de desconto. Leitura de cache custa US$ 0,10 por milhão de tokens no Sonnet. Busca na web custa US$ 10 por 1.000 buscas.

## 2. Resposta curta

**Sim, dá para usar o Sonnet 5.5 como modelo principal.** Ele cobre o que o pipeline exige:
- Contexto de 1M tokens: cabem a base de conhecimento (~40K), um e-book de 100 páginas e o deck prévio na mesma chamada.
- Visão: necessária para ler PDFs com gráficos e para o QA visual por thumbnails.
- Tool use e pensamento adaptativo: necessários para orquestrar scripts (PptxGenJS, render, lint) e para a pesquisa da etapa 1b.
- Velocidade: a documentação o descreve como a melhor combinação de velocidade e inteligência.
- Custo: metade do Opus 5.5.

**Recomendação: arquitetura híbrida.** Sonnet faz o grosso do trabalho. Opus fica com os dois pontos onde a qualidade de julgamento mais pesa: a narrativa (que passa pelo gate) e a revisão independente. Validar com avaliação antes de fixar (§5).

## 3. Modelo por etapa (proposta)

| Etapa (doc 03) | Natureza | Modelo sugerido | Por quê |
|---|---|---|---|
| 0 Intake e perguntas | Leitura de briefing e geração de perguntas | Sonnet 5.5 | Estruturado e curto |
| 1 Inventário (texto, números, citações) | Extração | Sonnet 5.5 (ou Haiku 5.5 em lote) | Haiku é indicado para extração de alto volume; Sonnet é mais seguro em PDF diagramado |
| 1b Atualização e localização | Pesquisa web + síntese | Sonnet 5.5 | Bom em tool use; custo de busca baixo |
| 2 Diagnóstico | Análise | Sonnet 5.5 | — |
| **3 Narrativa (tese, blocos, títulos)** | **Julgamento editorial** | **Opus 5.5** | É o que diferenciou o deck ADIT (tese, tensão, localização). Uma chamada só, custo pequeno |
| 4 Produção (`deck_spec.json` → código) | Geração de código e JSON | Sonnet 5.5 | Forte em código; volume alto de saída |
| **5 Revisor (rubrica + thumbnails)** | **Avaliação crítica independente** | **Opus 5.5** | Revisor mais forte que o produtor pega mais falhas |
| 5 Correções | Edição | Sonnet 5.5 | — |
| 6 Roteiro e notas | Redação | Sonnet 5.5 | — |
| Lint determinístico | Script | — (sem modelo) | Python |

Se o orçamento não for restrição, rodar tudo em Opus 5.5 também é viável (§4). A documentação o indica como ponto de partida recomendado para a maioria dos trabalhos de conhecimento.

## 4. Custo estimado por apresentação

Premissas de um job tipo ADIT, com e-book de 100 páginas e deck de ~40 slides, num loop agêntico com várias chamadas:
- Entrada acumulada: ~1,5M tokens (base + PDF reenviados a cada turno, ~80% em cache).
- Saída: ~150K tokens (código, JSON, textos).
- ~20 buscas na web.

| Cenário | Estimativa por deck |
|---|---|
| Tudo em Sonnet 5.5 | ~US$ 2–4 |
| Híbrido (Sonnet + Opus na narrativa e na revisão) | ~US$ 3–6 |
| Tudo em Opus 5.5 | ~US$ 5–9 |

São estimativas de ordem de grandeza, não orçamento. Medir com o campo `usage` das respostas nos primeiros jobs. **Prompt caching** da base de conhecimento e do material-fonte é o maior redutor de custo: escreve uma vez e lê a 5% do preço.

Conclusão: o custo por deck é pequeno perto de horas de consultor em qualquer cenário. A escolha deve ser guiada por **qualidade e latência**, não por preço.

## 5. Como decidir com dados (avaliação antes de fixar)

1. Montar um conjunto de avaliação com os jobs já feitos: domicílios vagos, retrofit ACATE (versão A) e retrofit ADIT (versão B, referência), mais 2–3 decks de `exemplos/`.
2. Rodar o pipeline em três configurações: **tudo Sonnet**, **híbrido** e **tudo Opus**.
3. Avaliar com a rubrica do doc 05 §2 (revisor fixo em Opus, às cegas quanto à configuração) e com o lint 🔒.
4. Critério: se o tudo-Sonnet ficar a ≤ 0,3 ponto do híbrido na média e sem perder em **Tese**, **Atualidade** e **Relevância local**, usar tudo-Sonnet. Caso contrário, híbrido.
5. Reavaliar a cada nova versão de modelo.

## 6. Notas de implementação

- No Sonnet 5.5, definir `temperature`, `top_p` ou `top_k` retorna erro 400. Controlar o comportamento com o parâmetro `effort` (padrão `high`) e o pensamento adaptativo.
- PDFs grandes: enviar o texto extraído por página e as imagens só das páginas com gráficos ou ilustrações relevantes. Fica mais barato e mais preciso que mandar o PDF inteiro em toda chamada.
- Fixar o ID do modelo no código (`claude-sonnet-5-5`, `claude-opus-5-5`) e registrar o modelo usado no `relatorio.md` de cada job.
- Fontes: [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) · [Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) · [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
