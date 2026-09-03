# Empresas e Empregados — área de trabalho

Pasta de referência da nova página **Empresas e Empregados** do ambiente Rebrain.

- **Rota planejada:** `/rebrain/empresas-empregados`
- **Monday:** [reBrain — Empresas e Empregados](https://brain381753.monday.com/boards/18398428946/pulses/12880655319) — `12880655319`
- **Fonte prevista:** RAIS, publicada pela Base dos Dados no BigQuery.
- **Estado:** descoberta e definição de requisitos; nenhuma implementação de produto iniciada.

## Materiais a depositar aqui

- `DEVELOPMENT.md` anexado por Diego no card do Monday;
- workbooks XLSX usados em Blumenau e Rio Verde;
- consultas SQL ou notas metodológicas que tenham acompanhado os workbooks;
- exemplos de saída esperada e comentários de quem utiliza o relatório.

Arquivos reais podem conter dados sensíveis ou ser grandes. Antes de versioná-los, conferir conteúdo,
tamanho e necessidade de anonimização. Se o material for apenas insumo transitório, registrar sua
origem neste README e mantê-lo fora do Git após produzir fixtures ou documentação derivada.

## Referência técnica já localizada

O protótipo atual está fora deste repositório, em `Sistema-Quanti/Sistema Novo`:

- `scripts/build-rais-municipio-workbook.mjs` — gerador municipal baseado em vínculos RAIS;
- `Detalhes de Desenvolvimento/Docs/datagoal/16-workbook-rais-municipal-bigquery.md` — contrato e validação de Rio Verde/GO.

Esse protótipo é evidência e ponto de partida. A nova feature deverá possuir contrato próprio,
backend protegido, cache/auditoria no Supabase do Rebrain e experiência web orientada a pessoas.
