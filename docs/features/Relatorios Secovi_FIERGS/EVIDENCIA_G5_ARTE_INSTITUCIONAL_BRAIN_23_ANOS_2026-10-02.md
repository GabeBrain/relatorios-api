# Evidência G5 — arte institucional Brain 2026

**Data:** 02/10/2026  
**Estado:** substituição direta da lâmina “Sobre a Brain” aplicada; revisão do deck final exportado ainda depende de geração autenticada.

## Fonte e alteração

- Fonte recebida no workspace: `assets/Slides-Institucionais-Brain-2026.pptx`, apresentação 16:9 com sete lâminas.
- A primeira lâmina é uma composição raster 1920 × 1080 que informa **23 anos**, 1.000 cidades brasileiras, 9.200 estudos de mercado, 50.000 entrevistas anuais e R$ 380 bi em VGV pesquisados.
- O asset `src/features/panorama-secovi-fiergs/assets/fiergs/slide-04-institutional.jpg`, que era a página “Sobre a Brain” com 22 anos, foi substituído pela composição da primeira lâmina do novo PPTX. A renderização local do asset foi inspecionada visualmente e confirma 23 anos.
- O PPTX fonte permanece no workspace como arquivo local não versionado; o commit contém apenas o asset que a aplicação usa e esta evidência.

## Conferência das demais lâminas

- A lâmina 2 do novo PPTX traz as mesmas três marcas e os mesmos telefones que o atual slide institucional 3. O texto extraído confirma equivalência de conteúdo; não foi identificada atualização numérica nessa página.
- As lâminas 3–6 apresentam material de produto GeoBrain, processo de coleta, indicadores institucionais e cases; não são substitutas diretas das páginas de créditos/equipe do relatório FIERGS.
- A lâmina 7 aborda o documentário que também aparece no material institucional atual. A inspeção XML/textual encontrou o mesmo tema e depoimentos, mas o fundo é vetorial editável e não foi possível renderizar o PowerPoint completo em modo headless: o Office instalado recusou automação invisível (`Application.Visible = false`). Por isso não afirmo equivalência visual nem substituo páginas adicionais sem uma exportação visual aprovada.
- Nenhuma lâmina institucional nova foi acrescentada ao estudo além da troca direta da página de 22 para 23 anos; isso evita alterar a narrativa/tamanho do relatório com páginas de apresentação comercial sem solicitação específica.

## Limite de homologação

A alteração do asset foi feita, mas PDF/PPT autenticados de FIERGS 2T2026 e 4T2025 ainda precisam ser gerados e revisados para confirmar a página incorporada em cada exportação. Esta evidência não substitui a conferência final dos artefatos nem declara G4/G6 aprovados.

## Validação do código após a troca

- `npx.cmd vitest run src/features/panorama-secovi-fiergs`: **33 arquivos, 274 testes aprovados**.
- `npx.cmd vite build`: **aprovado**. Avisos conhecidos: Browserslist antiga, pacote XLSX compartilhado entre imports estáticos/dinâmicos e chunks maiores que 500 kB.
- PDF/PPT de regressão não foram gerados nesta sessão por falta de sessão autenticada no app.
