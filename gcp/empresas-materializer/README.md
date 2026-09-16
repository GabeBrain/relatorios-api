# Materializador Empresas — piloto

Cloud Run Job do piloto. Executa uma única competência validada, lê CNPJ no BigQuery e publica somente agregados no Supabase.

## Contratos obrigatórios

- `estabelecimentos` e `empresas` usam partições sincronizadas; o job recebe as duas datas explicitamente.
- `simples` é estado atual, não histórico; o manifesto registra `simples_lido_em`.
- o job deve fazer dry run com `maximumBytesBilled` antes da consulta real;
- nenhum CNPJ, razão social ou linha bruta sai do processo;
- a publicação usa `staging` e só muda para `ok` após validação de totais.

## Variáveis de ambiente

- `GCP_PROJECT_ID`, `BIGQUERY_LOCATION=US`, `BIGQUERY_MAX_BYTES_BILLED`;
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`;
- `CNAE_DIMENSION_TABLE` — tabela versionada divisão CNAE → seção;
- `COMPETENCIA`, `ESTABELECIMENTOS_PARTICAO`, `EMPRESAS_PARTICAO`.

O código executável e o deploy ficam pendentes até a localização do source do proxy atual ser disponibilizada; não misturar esse job com a rota online RAIS.
