# Decisões e premissas — Panorama Secovi/FIERGS

Documento vivo para recuperar decisões tomadas durante implementação e homologação. O gabarito
congelado não deve ser usado como log mutável.

## Estados

- `ASSUMED`: hipótese operacional usada para avançar.
- `OPEN`: depende de analista/produto/API.
- `RECONCILED`: fecha matematicamente com o deck, mas ainda não foi confirmado pelo analista.
- `APPROVED`: confirmada por responsável identificado.
- `REJECTED`: hipótese descartada, com substituta documentada.

## Premissas atuais

| ID | Estado | Tema | Premissa/questão | Recuperação futura |
|---|---|---|---|---|
| PRE-001 | ASSUMED | escopo | fechamento de 1T26 = posição de março/2026 | confirmar em segunda cidade |
| PRE-002 | ASSUMED | segmentos | Horizontal da API representa Condomínio de Casas no relatório | validar taxonomia real |
| PRE-003 | ASSUMED | empreendimentos | contagem de lançados é distinta por building e `release_date` | comparar slides 12/14 |
| PRE-004 | OPEN | VGV lançado | unidades × preço de lançamento por produto | obter fórmula oficial |
| PRE-005 | OPEN | MCMV | padrão Econômico pode ser proxy, mas não será rotulado MCMV sem aceite | obter critério oficial |
| PRE-006 | OPEN | preços | média ponderada de ticket, área e R$/m² ainda é desconhecida | teste de aderência/API |
| PRE-007 | OPEN | maturidade | Planta/Construção/Pronto usa 0–6/7–36/37+ meses; origem da idade não confirmada | validar com analista |
| PRE-008 | ASSUMED | padrões | “Especial” no slide 44 é alias editorial de Compacto | confirmar nomenclatura |
| PRE-009 | RECONCILED | IVV | vendas / (estoque anterior + lançamentos) reconciliado no slide 27 | manter teste de fórmula |
| PRE-010 | RECONCILED | disponibilidade | oferta final / oferta lançada | manter reconciliação |
| PRE-011 | ASSUMED | PDF | v1 usa HTML/SVG paginado e impressão nativa 16:9 | reavaliar download direto |
| PRE-012 | ASSUMED | narrativa | fatos são templates determinísticos; qualitativo exibe `[LLM NECESSÁRIO AQUI]` | tratar LLM por último |
| PRE-013 | OPEN | mapa | universo exato de marcadores do slide 56 não está documentado | comparar coordenadas/contagem |

## Template para retorno do analista

## Execução T0–T2

| ID | Estado | Tema | Premissa/questão | Recuperação futura |
|---|---|---|---|---|
| PRE-018 | RECONCILED | lançamentos verticais | `building_id` distinto por `release_date` reconcilia 17/17 trimestres; `total_units` também reconcilia as unidades verticais | promover ao relatório após homologação visual |
| PRE-019 | ASSUMED | exclusões | curadoria local inicial usa `release_only`, preserva motivo/autor/data e não recalcula o relatório até aceite | persistir em backend/versionar com o primeiro retorno do analista |

## Premissas de implementaÃ§Ã£o v1

| ID | Estado | Tema | Premissa/questÃ£o | RecuperaÃ§Ã£o futura |
|---|---|---|---|---|
| PRE-014 | ASSUMED | adaptador API | `building-with-history` Ã© consolidado por empreendimento e trimestre antes dos contratos; unidades e VGV somam tipologias, empreendimento conta uma vez | validar com payload real e regra oficial de `release_date` |
| PRE-015 | OPEN | VGV incompleto | preÃ§o ausente mantÃ©m VGV do perÃ­odo como `null` e expÃµe warning; nÃ£o Ã© convertido em zero | confirmar disponibilidade e semÃ¢ntica de `release_price` |
| PRE-016 | ASSUMED | calibraÃ§Ã£o | a bancada compara candidatos de `release_date`, `total_units`, `typologies_history.qty` e `temporal-analysis-city/releases`, sem alterar o contrato do relatÃ³rio | promover somente o mÃ©todo aprovado nos 17 trimestres |
| PRE-017 | ASSUMED | curadoria | analista pode excluir empreendimento/grupo com escopo global, de lanÃ§amento, perÃ­odo ou mÃ©trica; exclusÃ£o em grupo congela IDs e nunca reescreve o gabarito | validar governanÃ§a e persistÃªncia com analistas |

```md
### ANA-000 — título

- **Data/autor:**
- **Slide/métrica:**
- **Versão afetada:**
- **Regra vigente:**
- **Retorno/evidência:**
- **Decisão:**
- **Estado:** APPROVED | RECONCILED | ASSUMED | REJECTED | OPEN
- **Impacto em cálculo:**
- **Impacto em apresentação:**
- **Teste adicionado/alterado:**
- **Gabarito novo necessário:** sim | não
```

## Decisões dos analistas

Nenhuma registrada até 2026-08-17.
