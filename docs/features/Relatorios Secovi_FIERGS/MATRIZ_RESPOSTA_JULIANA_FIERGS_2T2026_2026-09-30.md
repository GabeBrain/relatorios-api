# Matriz de resposta à Juliana — FIERGS 2T2026

| Comentário | Slides | Correção entregue | Evidência / aceite técnico |
|---|---:|---|---|
| Incluir variações como no slide 9 | 11, 14, 22, 26, 33 | comparativo equivalente padronizado | rótulos e períodos cobertos por testes |
| Incluir comparativo por semestre | 15, 16, 27, 28, 35, 39 | `1S2025 × 1S2026`, sem renomear 12 meses como semestre | testes de fluxo, fotografia e período incompleto |
| Soma fecha 99,9% | 25, 30 | rateio determinístico do décimo residual | percentuais exibidos fecham em `100,0%` |
| Incluir “dormitórios” | 29 | nomenclatura editorial completa | `1 Dormitório` a `4 ou + Dormitórios` no arquivo final |
| Vendas não batem | 25, 29–31, 40 | fechamento granular único | padrão, tipologia, cidade e área = `1.091`, delta zero |
| Legenda em cima do gráfico | 31 | removida a redundância e aplicadas margens próprias | slide final inspecionado sem sobreposição |
| Estoques não batem | 35–37, 40, 57–58 | fotografia granular única | dimensões = `5.251`, delta zero |
| Não entendi esse slide | 41 | indisponibilidade executiva explícita | anual não reconstruído a partir do trimestre |
| Ajustar rótulos | 43 | densidade limitada e eixo compacto | raster do PPTX inspecionado sem tooltip/colisão |
| Desconsiderar chácaras | 63–65 e derivados | filtro transversal da política FIERGS | zero chácaras no runtime |
| Oferta lançada/final não bate | 63–64 | produto e coorte usam o cubo ativo completo | `129 / 30.476 / 3.365`, delta zero |
| Média dos loteamentos | 65 | somente loteamentos aberto e fechado | regra coberta por regressão de domínio |
| Dar zoom nos mapas | 67–69 | bounds, padding e limite de zoom | dez cidades enquadradas; zoom 9 e legendas validadas |

## Arquivos para validação

- `.tmp/fiergs-homologacao-2T2026/panorama-fiergs-2T2026-homologacao.pptx`
- `.tmp/fiergs-homologacao-2T2026/panorama-fiergs-2T2026-homologacao.pdf`
- `.tmp/fiergs-homologacao-2T2026/fiergs-2T2026-reconciliacao.csv`

## Decisão ainda dependente da Juliana

Somente o aceite editorial do pacote. Não há decisão numérica ou metodológica pendente para gerar os arquivos; o slide 41 permanece explicitamente indisponível até existir fonte histórica auditável por faixa de área.
