# `.secrets/` — credenciais locais de execução

Pasta para credenciais que **scripts locais** precisam e que **não podem ir para o Git**.

Por que ela existe: neste repositório o `.env` **é versionado de propósito** (o Lovable builda a
partir dele e lê as `VITE_SUPABASE_*`). Colocar uma senha ali a publicaria no GitHub. O `.gitignore`
ignora `.secrets/*` inteiro e libera apenas `README.md` e os `*.example`.

## Uso

```powershell
Copy-Item .secrets\geobrain.env.example .secrets\geobrain.env
# preencha GEOBRAIN_EMAIL e GEOBRAIN_PASSWORD (ou apenas GEOBRAIN_TOKEN)
node scripts/panorama-evidence.mjs --uf SP --cities "Guarujá,Praia Grande,Santos,São Vicente" --quarter 2T2026
```

O relatório sai em `.tmp/panorama-evidencia-<trimestre>.json` e `.md` (pasta ignorada pelo Git).

## Regras

- Nunca commitar `.secrets/geobrain.env` nem colar seu conteúdo em issue, PR, doc vivo ou chat.
- Nenhum script deve imprimir valor de credencial: o `panorama-evidence.mjs` só ecoa nomes de chave.
- Credencial vazada em histórico do Git não se apaga com `rm`: troque a senha.
