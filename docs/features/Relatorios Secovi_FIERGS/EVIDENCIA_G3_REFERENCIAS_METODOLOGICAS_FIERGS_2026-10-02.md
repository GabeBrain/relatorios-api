# Evidência G3 — Metodologia, Glossário e Fórmulas

**Data:** 02/10/2026  
**Arquivos:** `PanoramaSecoviFiergsPage.tsx`, `ReportReferencePanels.tsx`, `GenerationNoticesPanel.tsx`.

## Interface entregue

- A navegação passa a exibir **Relatório**, **Metodologia**, **Glossário** e **Fórmulas**; o rótulo deixa de incluir “V4”.
- O painel **Avisos deste relatório** aparece antes dos controles de exportação e dentro de Metodologia; ambos consomem o mesmo objeto `report.notices` do modelo.
- Metodologia troca o conteúdo para FIERGS ou Secovi-SP conforme a entidade: território, período/fluxo versus fotografia, elegibilidade, deduplicação, dimensões, vendas, IVV, disponibilidade, ponderação de preços, maturidade, mapas e arredondamento.
- Glossário define empreendimento, lançamento e seus universos de oferta, venda líquida, disponibilidade, IVV, VGV, ticket, R$/m², tipologia, padrão e maturidade por faixa.
- Fórmulas apresentam entrada, operação, denominador, universo temporal, unidade, fonte, regra de omissão e bloco consumidor; a fórmula de IVV FIERGS não é apresentada como regra geral do Secovi-SP.
- Interface usa componentes Radix Tabs (navegação por teclado), cartões/tokens do tema e layout responsivo. A tabela de fórmulas tem rolagem horizontal em telas estreitas.
- Nenhuma nota estática foi adicionada ao PDF/PPT. O painel de avisos do recorte é do app; notas explicativas/metodológicas do deck de exportação são ocultadas pela regra do portão G2.

## Revisão e testes

- `report-reference-panels.test.tsx`: valida definições separadas por entidade, termos do glossário, fórmula específica, aviso municipal e sinal negativo observado.
- Suíte feature: **33 arquivos, 271 testes aprovados** no último run; `vite build` aprovado.
- Lint focado dos TSX/runtime: sem erros; sete alertas de Fast Refresh já existentes em módulos que exportam funções utilitárias junto com componentes.
- Playwright abriu a rota local e confirmou que a página monta. Sem autenticação local para carregar cidades/dados, os painéis condicionados a um relatório gerado não puderam ser inspecionados interativamente; a verificação dos componentes ocorreu nos testes de renderização.

## Decisões metodológicas

- Fórmulas são expostas apenas na forma que o modelo usa; pesos, fontes e universos diferenciam entidade e dimensão.
- Nulo segue distinto de zero, vendas negativas permanecem explícitas, e lacunas não recebem imputação.
- A dependência da arte institucional aprovada do Diego permanece pendente, fora destas abas e fora da versão final do deck.
