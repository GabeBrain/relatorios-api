# Revisão do PDF FIERGS 2T2026 (6) e aba Avisos — 02/10/2026

## Evidência observada

- Arquivo local: `assets/panorama-fiergs-rs-2T2026 (6).pdf`, 70 páginas rasterizadas. A avaliação visual foi feita por pranchas de todas as páginas; não equivale a uma nova auditoria numérica da base.
- A página física 4 apresenta a arte institucional de 23 anos recebida do marketing.
- As páginas físicas 34 e 51 têm imagem renderizada idêntica (mesmo hash SHA-256), ambas com a tabela de oferta por tipologia. Correspondem às lâminas oficiais 36 e 56.
- A página física 5 anuncia 75 lâminas automatizadas, contagem incompatível com as 70 páginas exportadas.
- A página física 47 mostra rótulos “Médio-Alto” e “Não classificado” sem coluna de R$/m². Isso representa ausência de preço observado, não zero; a tabela pode conter outros campos válidos.
- Comparativos, oferta final, VGV, mapas e venda líquida negativa estão visualmente presentes. A Juliana comunicou que não identificou novos erros de dados; o PDF isolado não permite provar uma reconciliação nova de todas as fontes.

## Decisões e alterações

- Remover somente a segunda ocorrência oficial 56; o manifesto passa de 70 para 69 páginas no caso desta exportação, sem alterar números do relatório. A contagem na lâmina “Sobre o estudo FIERGS” deriva do manifesto ativo, inclusive em outros períodos.
- Filtrar nos gráficos de preço por padrão/tipologia somente categorias sem R$/m² finito. Preservar zero observado, conservar linhas com outros indicadores na tabela e registrar categorias omitidas em Avisos e na auditoria CSV.
- Ordenar abas como `Relatório`, `Avisos`, `Metodologia`, `Glossário`, `Fórmulas`. A aba Relatório não exibe o painel de avisos nem contagem no rótulo.
- Não modificar a arte institucional nem números da base. Não alterar `src/features/corretor`.

## Portão de verificação

- Testes de manifesto e renderização FIERGS aprovados. Regressão específica de preço ausente versus zero adicionada.
- `tsc --noEmit -p tsconfig.app.json` continua falhando apenas por fixtures incompletas preexistentes em `src/features/corretor/lib/audit/__tests__/structure-empty-sections.test.ts` (fora do escopo protegido).
- Ainda é necessário publicar, gerar e conferir PDF/PPT/CSV autenticados de 2T2026 e 4T2025 antes de declarar homologação editorial final ou enviar a versão atualizada à Juliana.
