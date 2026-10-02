# Evidência G4 — Exportação editorial e estruturas sem dados

**Data:** 02/10/2026  
**Estado do portão:** implementação de código e testes concluída; aceite visual dos artefatos finais pendente.

## Alterações verificáveis no código

- As notas explicativas e as fórmulas de apoio são ocultadas apenas no contexto de exportação; permanecem disponíveis nas referências do app. Não foram adicionadas notas estáticas aos PDFs/PPTs.
- O manifesto omite páginas/grupos dimensionais somente quando o modelo confirma ausência de observações publicáveis ou fonte indisponível. Valores observados iguais a zero mantêm a estrutura.
- A tabela granular de VGV retira colunas monetárias integralmente nulas, mantendo colunas com zero observado e valores positivos/negativos observados.
- Vendas líquidas negativas e disponibilidades inferiores a 0% ou superiores a 100% permanecem visíveis e geram aviso. Nenhum número foi fixado para 2T2026 ou 4T2025.
- O painel dinâmico e a auditoria CSV compartilham os avisos e registram o motivo e a decisão de omissão.

## Evidências de execução

- `npx.cmd vitest run src/features/panorama-secovi-fiergs`: **33 arquivos, 274 testes aprovados**.
- `npx.cmd vite build`: havia passado em execução anterior à última rodada de refinamentos. A repetição final nesta sessão foi bloqueada antes da compilação pelo ambiente (`esbuild`: acesso negado ao diretório `../../../..` e impossibilidade de resolver `vite.config.ts`); não atribuir esse resultado ao código sem nova execução em ambiente liberado.
- ESLint focado nos cinco arquivos alterados: zero erros; quatro avisos `react-refresh/only-export-components` já associados às exportações utilitárias em `MarketSlides.tsx`.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: falha apenas em fixtures preexistentes de `src/features/corretor/lib/audit/__tests__/structure-empty-sections.test.ts` (campos obrigatórios ausentes). A feature FIERGS não aparece nos erros e nenhum arquivo de Corretor foi modificado.
- Playwright abriu a rota da aplicação, mas o ambiente local não estava autenticado e não permitiu gerar o relatório. **Não foram gerados nesta rodada PDF, PPT ou CSV atualizados para os dois períodos.** Os artefatos em `.tmp` são de execução anterior e não servem para aprovação visual desta implementação.

## Decisão do portão

O código e os testes estão prontos para a validação por artefatos, mas G4 **não recebe aceite visual** nesta execução. Para fechar, gerar com sessão autenticada os arquivos FIERGS 2T2026 e 4T2025 (PDF/PPT e auditoria CSV), então conferir avisos, páginas omitidas, colunas, zeros, negativos e divergências frente aos dados de origem. Sem esses artefatos não é possível declarar regressão visual nem homologação final.
