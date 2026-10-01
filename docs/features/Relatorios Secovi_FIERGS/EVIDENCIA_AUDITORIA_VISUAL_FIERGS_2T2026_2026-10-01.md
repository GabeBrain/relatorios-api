# Evidência — auditoria visual FIERGS 2T2026

Data: 2026-10-01  
Artefato auditado: `assets/panorama-fiergs-rs-2T2026 (1).pdf`  
SHA-256: `29555DABE5B82A4CDD059439264F8A85FDBBA093EB3A7A2B219AFB21438EA8DC`  
Extensão da inspeção: 75 de 75 páginas.

## Resultado da auditoria

Os números e as séries estavam presentes. As duas anomalias confirmadas eram de apresentação e serialização:

1. Os cartões comparativos reutilizados nas lâminas por padrão/MCMV recebiam apenas os ajustes de tamanho. A estrutura-base de grid, as colunas azuis e a separação entre valor e período estava indevidamente limitada ao contêiner `.panorama-fiergs-quarterly`. Isso produzia números e períodos concatenados e colunas invisíveis.
2. O gráfico trimestral de preço por m² aplicava a redução genérica de densidade, ocultando deliberadamente alguns rótulos. Nos rótulos preservados, valor e variação tinham apenas 12 px de separação, o que dava aparência de legenda sobreposta.

Não foi encontrada evidência de perda de dados nessas duas ocorrências. Não houve alteração de números, agregações, fontes ou regras específicas para 2T2026/4T2025.

## Correções aplicadas

- O layout-base dos comparativos passou a pertencer ao componente `.panorama-fiergs-context-comparisons`, independentemente da família de lâmina que o utiliza.
- A altura das colunas comparativas passou a ser escrita diretamente no elemento, preservando-a na serialização usada pelo PDF/PPT.
- A série de preço por m² passou a publicar valor e variação em todas as barras observadas.
- Valor e variação ganharam separação vertical, tipografia mais compacta e contorno branco para leitura sobre o gráfico.
- A primeira barra não exibe mais um travessão de variação, pois não existe período anterior no recorte.

## Regressões automatizadas

- Teste estrutural confirma que os comparativos das lâminas por padrão existem e que todas as colunas possuem altura percentual serializável.
- Teste da política de rótulos confirma cobertura integral das 14 barras do recorte 1T2023–2T2026.
- Suíte FIERGS: 32 arquivos, 263 testes aprovados.
- Build de produção: `tsc --noEmit && vite build` aprovado.

Avisos de largura zero do Recharts aparecem somente no ambiente JSDOM dos testes, que não executa layout real; não houve falha de teste. Os avisos já existiam e não representam o PDF gerado no navegador.

## Arquivos afetados

- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`
- `src/features/panorama-secovi-fiergs/print/panorama-print.css`
- `src/features/panorama-secovi-fiergs/__tests__/chart-labels.test.ts`
- `src/features/panorama-secovi-fiergs/__tests__/fiergs-editorial-blocks.test.tsx`

## Comportamento esperado após nova publicação

- Os comparativos exibem duas colunas azuis, valores, períodos e variação como blocos separados em qualquer tipo de lâmina.
- O gráfico de R$/m² exibe o valor de cada trimestre e, a partir do segundo, sua variação contra o trimestre imediatamente anterior, sem colisão visual.
- O resultado continua independente do período selecionado e mantém as regressões numéricas já aprovadas para FIERGS 4T2025 e 2T2026.

## Confirmação no PDF pós-publicação

Artefato: `assets/panorama-fiergs-rs-2T2026 (2).pdf`

SHA-256: `F17168D1702FB9FA4FC50F6D73FDA16F54E2A4C32F80CA4ADAC3390E3765A78C`

Inspeção: 75 de 75 páginas.

Resultado confirmado:

- os comparativos trimestrais e semestrais exibem novamente as duas colunas, valores, períodos e variação;
- o gráfico de preço por m² exibe as 14 barras do recorte, com valor e variação separados e legíveis;
- não houve regressão visual nas séries de lançamentos, vendas, oferta e IVV;
- não foi identificada sobreposição crítica no restante do documento.

**Decisão:** correção visual aprovada no artefato e liberada para homologação funcional.

