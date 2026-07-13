## Diagnóstico

O site publicado devolve **404** em `/data/quanti/base-2020.json` porque a pasta `public/data/quanti/` está listada no `.gitignore` (padrão `quanti`) — o arquivo de 6,6 MB existe apenas no sandbox local e nunca é versionado nem incluído no bundle publicado.

## Solução: mover a base para o Lovable Cloud Storage

Repo continua leve, novas bases (2019/2021/…) entram por upload sem `git push`, e o carregamento continua 100% client-side (fetch → cache → agregação em memória).

### Passos

1. **Criar bucket público** `quanti-datasets` (Lovable Cloud Storage).
2. **Upload** de `public/data/quanti/base-2020.json` para `quanti-datasets/base-2020.json` e capturar a URL pública.
3. **Registry dinâmico** — atualizar `src/features/area-quanti/dashboard/datasets.ts` para apontar a base 2020 para a URL do bucket. Manter a shape `{ id, label, url }` para que novas bases entrem só adicionando um item.
4. **Loader resiliente** — em `useQuantiDataset.ts`, melhorar a mensagem de erro (status + URL) e manter o cache por URL.
5. **Limpeza** — remover `public/data/quanti/base-2020.json` do sandbox (não é mais fonte) e manter `quanti` no `.gitignore` para evitar recommits acidentais de bases grandes.
6. **Doc vivo** — registrar em `docs/projetos/LIVE_area-quanti.md` que a fonte oficial passou a ser o bucket `quanti-datasets` e como subir novas bases.

### Como adicionar bases futuras (2019, 2021, 2022…)

- Fazer upload do JSON convertido no bucket `quanti-datasets`.
- Adicionar uma linha em `DATASETS` (`{ id, label, url }`).
- Nenhuma alteração de código nos gráficos/filtros — o dashboard já lê pelo registry.

### Fora do escopo

- Migração para tabela relacional (fica como próxima evolução se as bases passarem de ~50 MB somadas).
- Alterações nos gráficos, KPIs ou filtros.
