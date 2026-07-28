# Corpus de fixtures — feedback dos analistas (jul/2026)

Snapshot do Supabase (28/jul/2026) com os dados dos 4 primeiros estudos reais do Corretor
(Rolândia/Daniele; Housi Toledo e Housi São José dos Campos/Beatriz+Lucas). Base do reteste
offline do `SPRINT_feedback_analistas_2026-07-28.md` — as regras são funções puras, então estes
JSONs permitem reproduzir os achados sem PPTX e sem custo de IA.

| Arquivo | Conteúdo |
|---|---|
| `studies.json` | os 4 estudos (id, nome, cidade/UF da ata, status) |
| `findings.json` | os 102 achados com status + veredito humano (`verdict: "fp"` = gabarito de FP) |
| `vision-payloads.json` | 34 payloads do `vision_cache` (schema v7) referenciados pelos achados — input puro das regras de visão |
| `rolandia-v1.ir.json` | **IR completo do deck da Rolândia** (78 slides, 62 KB) extraído do PPTX real em 28/jul — permite rodar o motor DET inteiro sem o arquivo de 162 MB. Fixa o aceite em `rolandia-real.test.ts` |

Observações importantes descobertas no snapshot:
- **Housi SJC v1 tem typo na cidade da ata** ("São José **do** Campos") → os FPs onde a própria
  cidade correta foi acusada vêm de comparação exata; a correção CH-2 precisa de matching tolerante.
- **Rolândia está com `cidade/uf` null** — WRONG_CONTEXT não roda sem cidade esperada (consistente
  com os achados observados).
- O sha1 `24c8d196b2…` ("brasileiras") aparece em 3 estudos — imagem institucional do template.

Gabarito de uso nos testes: achado com `verdict: "fp"` deve **deixar de ser gerado** pela regra
corrigida; achado pendente/legítimo (ex.: `iavis-sum-*` do s43 confirmado no 4o) deve **continuar**.
