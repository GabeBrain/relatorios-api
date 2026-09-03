# Adicionar Base Unificada 2024 ao dashboard Quanti

Incluir a base de 2024 no seletor de bases da Área Quanti, seguindo exatamente o mesmo processo já usado para 2019, 2020 e 2025.

## O que será feito

1. Converter `Base_Unificada_2024.xlsx` (aba `Dados`, 25.361 respondentes úteis, 97 colunas) para o mesmo formato JSON colunar das outras bases, ignorando a linha 2 (texto das perguntas) na contagem e nos gráficos — ela é preservada apenas como mapa `questions` para os rótulos.
2. Normalizar os campos canônicos (estado, cidade, cidade de empreendimento, ano da pesquisa, idade, renda estimada, lat/lng) do mesmo jeito que as demais bases, garantindo KPIs, histograma, mapa e cruzamento universal funcionando.
3. Subir o arquivo `base-2024.json` para o bucket de datasets no backend (Lovable Cloud Storage), junto das outras bases.
4. Registrar a nova base em `src/features/area-quanti/dashboard/datasets.ts` como "Base Unificada 2024", posicionada em ordem cronológica no seletor.
5. Verificar no preview que a base carrega, que a contagem de entrevistas bate e que KPIs/gráficos/mapa respondem.
6. Registrar a entrada em `docs/projetos/LIVE_area-quanti.md`.

## Detalhes técnicos

- Extração via script Python (openpyxl/pandas) gerando `{ id, label, count, generated_at, columns, questions, rows }`, idêntico ao esquema já lido por `useQuantiDataset.ts` (`expandColumnarDataset`).
- Sanitização de `NaN`/`Infinity` e de encoding (mojibake) antes de gravar o JSON, como nas bases anteriores.
- Upload para o bucket `quanti-datasets` com o caminho `base-2024.json`; nenhuma alteração é necessária em gráficos, filtros ou agregações.
