# Processador Sinduscon Curitiba

Serviço que recebe uma planilha `.xlsx` e altera a planilha com `openpyxl`, preservando estilos, bordas, preenchimentos, filtros, larguras e alturas da aba de origem. O arquivo é processado em diretório temporário e não é persistido. Arquivos `.xls` devem ser salvos previamente como `.xlsx` no Excel.

## Deploy

```bash
gcloud run deploy sinduscon-workbook-processor --source gcp/sinduscon-workbook-processor --region <REGIAO> --allow-unauthenticated
```

Após o deploy, configurar `VITE_SINDUSCON_PROCESSOR_URL` no ambiente do frontend com a URL pública do serviço e publicar o frontend. O serviço aceita somente `POST /process`, arquivos de até 15 MB e origens `lovable.app` ou localhost.
