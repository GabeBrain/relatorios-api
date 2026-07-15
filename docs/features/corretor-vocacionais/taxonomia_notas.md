# Taxonomia das notas de revisão → catálogo de regras do corretor

**Virada conceitual (08/jul/2026):** as notas em balão nos estudos ("Ajustar o erro da
fórmula", "verificar essa taxa") **não são bugs a sinalizar** — são as **instruções de correção
que o analista humano escreve hoje**. Nos estudos reais que vamos receber **essas notas não
existirão**: o estudo chega cru e **o corretor é o substituto desse trabalho humano**.

Consequência dupla:
1. **As notas são a especificação do catálogo de regras** — cada nota revela um tipo de
   verificação que o humano faz. Fazemos engenharia reversa delas.
2. **As notas são o gabarito (ground truth)** — sabemos em qual slide havia um problema real e
   de que tipo. Os 2 estudos anotados viram um **conjunto de validação rotulado**: removendo as
   notas, o corretor deve reproduzir os mesmos achados a partir do dado. Métrica = recall/precisão.

## Corpus minerado (36 notas → tipos de erro)

| Tipo de erro | Motor | Nota(s) — evidência | Slides |
|---|---|---|---|
| `CROSS_TABLE_MISMATCH` — mesmos valores em tabelas/slides diferentes (rendas, lacunas, pop./domic.) | DET *se* houver dado | "Ajustar com as mesmas rendas do slide"; "Ajustar com os valores que pedi na tabela de lacunas geral"; "verificar essas informações de População e Domicílios" | Ita 27,59,60 · Mrk 121-151 |
| `PROJECTION_FORMULA` — fórmula de projeção correta (depende da taxa nacional) | DET c/ fórmula da analista | "Ajustar o erro da fórmula"; "Ajustar depois que arrumar a taxa do Brasil" | Ita 35,36,41 |
| `VALUE_PLAUSIBILITY` — valor fora de faixa/estranho, outlier, (não-)monotonicidade | DET (faixas/monotonic.) + IA (julgamento) | "me parece que está errada"; "60% ao ano, é muita coisa"; "está meio estranho para loteamento aberto"; "unidade maior com 2 vagas e valor do m² menor, está estranho"; "valores de m² altos/baixos" | Ita 60,85,95,96,120,122 · Mrk 76 |
| `WRONG_CONTEXT` — dado de OUTRO estudo/cidade vazado (copy-paste) | DET (cidade/estado) + IA | "Essas informações são do estudo do Brooklin, por favor corrigir" | Mrk 27,28 |
| `BINNING_RULE` — regra de agrupamento de faixas | DET | "Agrupar acima de R$34.360" | Mrk 41 |
| `LAYOUT` — largura de coluna, quebra de palavra (**cosmético**) | fora de escopo (conteúdo) | "Ajustar a largura da coluna para a palavra não ficar quebrada" | Ita 73,74,84-86,95,96 |
| `META` — reprocessar após ajuste (consequência, não regra) | — | "Refazer a análise após os ajustes"; "verificar se não tem mais nada de aberto" | Ita 41,74 |

## O que isso ensina sobre a arquitetura

1. **A maioria das correções humanas é sobre NÚMEROS e CONSISTÊNCIA CRUZADA**
   (`CROSS_TABLE_MISMATCH`, `PROJECTION_FORMULA`, `VALUE_PLAUSIBILITY`). Todas dependem de **ter o
   dado numérico** — que nestes estudos está **preso em imagem** (ver `achados_fase_a.md`).
   → **A Fase C (extração de visão dos números) deixa de ser opcional: é caminho crítico.**
   Sem os números, o corretor não reproduz o que o humano fez.
2. **`LEFTOVER_NOTE` é rebaixada** de "tipo de erro principal" para **rede de segurança**
   (se um estudo real vier com nota, avisa). Seu valor real foi ser este corpus.
3. **Layout/cosmético está fora de escopo** — o corretor audita conteúdo, não formatação.
4. **DET vs IA fica definido pela evidência:** cidade/estado, binning, fórmula (com a fórmula) e
   monotonicidade são DET; "está estranho"/plausibilidade semântica precisam de IA cirúrgica.

## Uso como validação (norte da calibração)

- Congelar `notas_como_labels`: `{estudo, slide, tipo, texto}` a partir da tabela acima.
- Rodar o corretor **ignorando as notas** (fingir estudo cru).
- **Recall** = % de notas que o corretor reproduziu; **Precisão** = achados corretos / total.
- O loop com a analista ajusta tolerâncias mirando recall alto sem inflar falso positivo.
