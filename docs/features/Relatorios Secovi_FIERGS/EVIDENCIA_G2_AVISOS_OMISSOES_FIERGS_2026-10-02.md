# Evidência G2 — publicação parcial e avisos dinâmicos

**Data:** 02/10/2026  
**Escopo de código:** modelo, manifesto, renderizadores, exportação e auditoria CSV da feature Secovi/FIERGS.

## Decisões aplicadas

- `ReportGenerationNotice` é o registro comum para painel e CSV: código estável, gravidade, indicador, entidade, período, página de saída, IDs oficiais, motivo, fonte e decisão de exibição.
- `buildGenerationNotices()` deriva avisos do modelo, sem ler o DOM. Códigos implementados incluem coleta municipal parcial, avisos de lançamento, série horizontal não atribuível, cobertura parcial de VGV, faixa de valor indisponível, resíduo dimensional, venda líquida negativa, disponibilidade fora de 0–100%, diferença/indisponibilidade de reconciliação e páginas omitidas por falta de dados publicáveis.
- A omissão das quatro cópias editoriais também consta no painel e na auditoria. As notas detalham os IDs oficiais removidos; a sequência ativa permanece centralizada no manifesto.
- O CSV inclui linhas `aviso_geracao` com os mesmos códigos do painel, além de páginas e decisão de exibição.
- O manifesto FIERGS retira séries de vendas/preço quando `dataStatus` é `unavailable`, e quadros tipológicos/mapas quando não há linhas ou pontos publicáveis. A lâmina anual por faixa mantém o contrato de cobertura integral. A numeração é recalculada após cada omissão.
- Valores nulos e zeros permanecem distintos. Vendas líquidas negativas são mantidas. A disponibilidade FIERGS não é truncada nem suprimida por exceder 100% ou ser negativa; esses resultados recebem aviso de divergência e seguem visíveis.
- Notas explicativas e fórmulas de rodapé recebem `display:none` somente no deck de exportação PDF/PPT. Permanecem no código/funções de referência do app ou como aviso dinâmico, não no material entregue.

## Verificação

- `npx.cmd vitest run src/features/panorama-secovi-fiergs`: **33 arquivos, 271 testes aprovados**. Inclui testes de ambos os períodos nas guardas de reconciliação, códigos de aviso no CSV, venda negativa, disponibilidade acima de 100%, manifesto condicional e ausência de notas na exportação.
- `npx.cmd vite build`: **aprovado**. Há alertas de bundle grande e dependência Browserslist antiga, não impeditivos para esta alteração.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: ainda retorna somente erros preexistentes em `src/features/corretor/lib/audit/__tests__/structure-empty-sections.test.ts` (fixtures `IrSlide` sem cinco campos obrigatórios). Nenhum arquivo Corretor foi alterado.
- `npx.cmd eslint` dos componentes/runtime da feature: sem erros; sete avisos `react-refresh/only-export-components` já existentes nos módulos grandes `MarketSlides.tsx` e `ReportPaginator.tsx`.
- Inspeção local do app confirmou carregamento da rota. A geração de relatório não pôde ser iniciada pelo navegador de verificação porque a sessão local não está autenticada; portanto, PDF/PPT regressivos ainda precisam ser gerados com a sessão autenticada antes do aceite final G6.

## Limites e pendências

- Ausência de credencial impede a captura neste navegador, não a geração no ambiente autenticado da aplicação. Nenhum dado foi substituído por fixture ou número fixo para simular os estudos.
- A arte institucional atualizada continua fora do escopo e pendente de confirmação/aprovação do Diego. O arquivo candidato encontrado localmente não foi incorporado.
- Confirmar no PDF/PPT autenticado que colunas inteiramente nulas desapareceram e que avisos correspondem às páginas removidas; revisar os dois períodos antes do portão G6.
