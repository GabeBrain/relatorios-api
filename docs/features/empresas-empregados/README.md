# Empresas e Empregados — área de trabalho

Pasta de referência da nova página **Empresas e Empregados** do ambiente Rebrain.

- **Rota planejada:** `/rebrain/empresas-empregados`
- **Monday:** [reBrain — Empresas e Empregados](https://brain381753.monday.com/boards/18398428946/pulses/12880655319) — `12880655319`
- **Fonte de Empregados:** RAIS, publicada pela Base dos Dados no BigQuery.
- **Fonte futura de Empresas:** Dados Abertos de CNPJ da Receita Federal; fora da V1.
- **Estado:** requisitos da V1 fechados; implementação de Empregados ainda não iniciada.
- **Plano terminal:** [`PLAN_LUNA_EMPREGADOS_V1_2026-09-03.md`](PLAN_LUNA_EMPREGADOS_V1_2026-09-03.md).

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

## Escopo fechado da primeira versão

Empregados e Empresas são relatórios independentes. A V1 implementa somente **Empregados**:
um município e um ano por relatório, exploração web e XLSX gerado localmente. O backend valida o
Bearer GeoBrain, consulta a RAIS no BigQuery e compartilha snapshots agregados pelo Supabase entre
usuários e sessões. O sistema registra auditoria técnica, mas não oferece histórico na interface.

Empresas aparece apenas como capacidade desabilitada. O `DEVELOPMENT.md` descreve a futura fonte
Receita/CNPJ e orienta seus contratos, mas nenhum download, batch, banco ou relatório de Empresas
faz parte desta versão.
