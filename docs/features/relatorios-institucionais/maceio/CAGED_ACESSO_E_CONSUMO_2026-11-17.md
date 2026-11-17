# CAGED — acesso observado e estimativa de consumo

17/11/2026 · Codex · investigação solicitada por Lucas · base `e8a067fb`, main limpa na abertura, origin único 0/0 após `git fetch --all`. Sem push, deploy, escrita BigQuery ou Monday. Os dry runs não executaram consultas de dados. Os SELECTs de conferência executaram somente leitura.

## Acesso observado

O plugin BigQuery instalado listou quatro projetos e executou `SELECT SESSION_USER(), 1` pelo projeto `project-d1ce8c6e-941c-4b31-8fd`, confirmando a conta do setor conectada. Não implica acesso pela identidade de workload do Cloud Run. Schemas das três tabelas novas e das duas views antigas de `basedosdados.br_me_caged` acessíveis.

Consulta efetiva por ano/mês nas tabelas novas encontrou somente janeiro–março de 2026. MOV: 4.303.726 / 4.508.213 / 4.825.112 registros; FOR: 52.153 / 78.822 / 76.185; EXC: 9.125 / 10.170 / 11.788. Job `job_2_eXN17SCZ7ecRwPiHjSPnqVT9ZD`, US. Catálogo anuncia setembro/2026. A [BD Pro](https://basedosdados.org/bdpro) informa seis meses de defasagem na versão aberta; compatível com o resultado observado. Não comprova assinatura ou permissões Pro da organização. Maio/junho não foram preenchidos com março.

Um dry run via `jobs.insert` confirmou `rowLevelSecurityApplied: true` e não devolveu `totalBytesProcessed`. Portanto, não há medição confiável dos bytes da consulta de histórico nesta sessão. A ausência da estatística não significa consumo zero. SQL conferido:

```sql
SELECT ano, sigla_uf,
  SUM(saldo_movimentacao) AS total,
  SUM(IF(cnae_2_secao = 'F', saldo_movimentacao, 0)) AS construction
FROM `basedosdados.br_me_caged.microdados_movimentacao`
WHERE ano BETWEEN 2020 AND 2026 AND (ano < 2026 OR mes <= 5)
GROUP BY ano, sigla_uf
```

Esse SQL é só uma sonda de custo/contrato, não a consulta final: não inclui ajustes, exclusões, histórico antigo nem cobertura integral do relatório.

## Fonte MTE conferida

A [página oficial de setembro/2026](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho/novo-caged/2026/setembro/pagina-inicial) aponta para a [pasta de tabelas](https://drive.google.com/drive/folders/1F89h6odTPGIGMb9eDiJKCute9W89QmqN). Drive conectado listou `2026/202609` e baixou o XLSX oficial, id `1HYU84SAj3uKU9M_Nop0V0FQKhWMb94Xr`: **45.069.487 bytes (45,1 MB decimais)**. Original mantido somente em `.local-inputs/relatorios-lucas/maceio/caged-2026-11-17/mte-202609.xlsx`, fora do Git.

Leitura efetiva de cabeçalhos e valores com openpyxl, sem regravar a planilha:

- Tabela 4: saldo por UF e atividade econômica **do mês, sem ajustes**. Contém construção e os setores de AL.
- Tabela 6.1: evolução mensal por atividade econômica **Brasil, com ajustes**, desde janeiro/2020.
- Tabela 7.1: evolução mensal por região/UF **total, com ajustes**, desde janeiro/2020.
- Tabelas 8/8.1: histórico municipal, não necessário ao recorte estadual dos slides 9–14.

**Limite:** esse XLSX isolado não comprova uma série histórica ajustada de construção por UF/setores de AL, nem 2017–2019. Não somar publicações mensais sem ajustes e rotular o resultado como histórico ajustado. Ainda é preciso fechar a fonte para esses cruzamentos (exportação oficial agregada ou processamento dos microdados), os vintages/revisões e o vínculo com as referências. A carga inicial desses históricos pode custar mais que a consulta por relatório.

Os dois PPTX locais foram abertos somente em leitura no PowerPoint e os slides 9–14 renderizados. Hashes preservados. Nas duas edições, o bloco compara histórico anual, ano corrente parcial e **mês de fechamento contra o mesmo mês do ano anterior**. O trimestral de junho não triplica automaticamente essa consulta, pois os gráficos de emprego da referência usam junho, não a soma abr–jun. Resultados locais em `caged-2026-11-17/{monthly,quarterly}-9..14.png`.

## Estimativa solicitada — somente bloco CAGED

Hipótese recomendada, ainda **não implementada**: importação fora da geração, tabela própria pequena de agregados, uma consulta consolidada em uma tabela para os seis slides, cache de aplicação por competência + versão da fonte. Mensal e trimestral leem o mesmo tipo de agregado.

| Saída | Leituras novas estimadas | Volume contabilizável por geração sem cache | Exemplo anual |
|---|---:|---:|---:|
| Mensal | 1 query / 1 tabela | cerca de 10 MB, se a leitura ficar abaixo do mínimo | 12 edições × 10 MB = 120 MB |
| Trimestral | 1 query / 1 tabela | cerca de 10 MB sob a mesma hipótese | 4 edições × 10 MB = 40 MB |
| Ambos | 16 gerações distintas | — | aproximadamente 160 MB/ano |

O mínimo da [tarifa on demand](https://cloud.google.com/bigquery/pricing) é 10 MB por tabela e por consulta. Duas consultas/tabelas podem elevar a estimativa para pelo menos 20 MB. Cache da aplicação evita nova query; cache de resultados BigQuery também não é cobrado quando efetivamente utilizado. Histórico atualizado deve invalidar o cache pela versão da publicação.

Referência tarifária consultada: US$6,25/TiB, região US, primeiro 1 TiB/mês gratuito por conta, compartilhado com os demais usos. Fora da franquia, 10 MB decimais ≈ US$0,000057 por geração; 160 MB ≈ US$0,00091 por ano. São custos de consulta, não orçamento total. Regime de reservas/capacidade, outra região, impostos/câmbio e outros usos alteram a cobrança real.

Se a base bruta considerada pelo usuário tiver **53 GB decimais**, uma varredura completa custaria aproximadamente **US$0,30** fora da franquia (`53e9 / 2^40 × 6,25`). Isso é cenário ilustrativo, não bytes medidos da consulta. Uma consulta que lê menos colunas/partições pode processar menos; `GROUP BY` ou poucas linhas no resultado não garantem redução dos bytes. Mensal e trimestral com o mesmo histórico de anos tendem a volumes parecidos. Não afirmar que trimestre custa três vezes o mensal.

Armazenamento proposto: algumas centenas de agregados por competência, histórico da ordem de poucos MB, a medir após fechar todos os recortes/revisões. O download de 45,1 MB por atualização do XLSX é tráfego/arquivo temporário, não 45,1 MB de leitura BigQuery por relatório. Doze downloads de tamanho igual seriam cerca de 541 MB/ano de transferência. Lovable não precisa armazenar XLSX/microdados; recebe apenas o resultado agregado.

## Retomada / ponte

Código da ponte localizado em `../Sistema Quanti/gcp/bigquery-proxy`: identidade vinculada ao Cloud Run, `PROXY_HMAC_SECRET`, assinatura de `${timestamp}.${body}`, rota fechada `/v1/rais-employees`. Rebrain usa `BIGQUERY_PROXY_URL` e `BIGQUERY_PROXY_HMAC_SECRET` em `supabase/functions/rais-employees-report/index.ts`. Não foram lidos/exportados secrets. RAIS anual não substitui CAGED.

Proposta: job Cloud Run agendado consulta publicação MTE, baixa apenas quando mudou, valida recortes/totais/revisões e publica agregados de forma atômica; nova rota HMAC fixa consulta esses agregados. [Agendamento oficial](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule), [carga em lote](https://docs.cloud.google.com/bigquery/docs/batch-loading-data). Nenhum agendador, tabela, job de carga ou serviço foi criado. Infraestrutura e política de retenção ainda a dimensionar; não prometer custo total zero.

Próximo: definir o caminho MTE versus BD Pro com Lucas; fechar a cobertura histórica UF × setor e política de revisão, produzir amostra agregada reconciliada e medir bytes/armazenamento; só então conectar os slides 9–14. Integração runtime, geração autenticada pela ponte e automação ainda pendentes. Sem push autorizado.
