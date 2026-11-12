# Evidência da Fase 6 — clareza visual FIERGS 2T2026

## Resultado executivo

A Etapa 6 foi concluída tecnicamente sem alterar números de origem. Os ajustes atuam somente na apresentação derivada: nomenclaturas, arredondamento exibido, densidade de rótulos, margens, estado de indisponibilidade e enquadramento/legendas dos mapas.

## Decisões por slide

| Slides | Decisão | Evidência técnica |
|---|---|---|
| 25 e 30 | percentuais publicados fecham em `100,0%` | rateio determinístico do resíduo de décimos, preservando distratos negativos e retornando indisponível quando o denominador é zero |
| 29 | tipologias usam a nomenclatura editorial completa | entradas como `1`, `2 dormitórios` e `4 quartos` são exibidas como `1 Dormitório`, `2 Dormitórios` e `4 ou + Dormitórios` |
| 31 | ranking de cidades não recebe legenda redundante | classe editorial específica e margens próprias; total, barras, valores e participações permanecem visíveis |
| 41 | estado executivo de indisponibilidade | mantido no fluxo, sem fabricar o anual: a fonte não possui composição histórica auditável por faixa de área para os quatro trimestres |
| 43 | menor densidade de rótulos e eixos compactos | no máximo nove rótulos de barra, preservando extremos, fechamento e trimestres equivalentes; eixo usa trimestre compacto |
| 67–69 | enquadramento e leitura dos mapas | bounds explícitos dos pontos válidos, padding de um tile, zoom máximo 12 para múltiplos pontos, mosaico máximo `5 × 4`, legenda por padrão e escalas de estoque e R$/m² |

## Integridade dos dados

- Nenhum valor foi digitado ou corrigido manualmente.
- O arredondamento modifica apenas os percentuais exibidos; valores absolutos e total canônico permanecem intactos.
- Distratos negativos continuam no total e na participação.
- O slide 41 não replica a fotografia trimestral sob um rótulo anual.
- Coordenadas inválidas continuam descartadas e a ausência de token/fundo cartográfico permanece explícita.

## Regressões automatizadas

- fechamento percentual após formatação, inclusive com distrato;
- denominador zero sem percentual fabricado;
- nomenclatura editorial de dormitórios;
- limite e preservação dos rótulos relevantes na série densa;
- bounds, zoom, dimensões máximas do mosaico e posições internas ao quadro;
- presença das três legendas de mapa;
- 75 páginas e proporção 16:9 preservadas pelo teste de manifesto/exportação.

## Verificação executada

- `npx tsc --noEmit -p tsconfig.app.json`: aprovado;
- `npx vitest run src/features/panorama-secovi-fiergs`: `235/235` testes aprovados;
- `npm run build`: aprovado (`tsc --noEmit` + Vite).

Permanecem apenas avisos conhecidos: dimensões zero do Recharts no JSDOM, base Browserslist desatualizada e chunks grandes no Vite.

## Estado do portão

A Fase 6 está **concluída tecnicamente**. A inspeção humana do novo PDF e PowerPoint com o recorte autenticado de dez cidades continua reservada à Fase 8, pois é o portão integrado de homologação; este documento não antecipa essa aprovação visual final.
