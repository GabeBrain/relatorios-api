# Legado — Mapa Geoespacial: fontes de dados

Este diretório (`src/legacy/mapa/`) preserva o código da funcionalidade **Mapa**, aposentada
funcionalmente do app ativo (a versão em produção passou a ser desenvolvida por outro time,
fora deste repositório). Nenhum arquivo aqui é importado pelo app ativo — o Vite faz
tree-shaking e nada disto entra no bundle.

Os datasets pesados que alimentavam o Mapa foram **removidos do working tree** para aliviar o
repositório (~85 MB entre `public/data/`, fontes brutas em `assets/` e o `dist/` local). Eles
continuam **recuperáveis pelo histórico git** — nada foi perdido.

## Datasets removidos

| Arquivo (caminho original) | Tamanho | Fonte / conteúdo | Gerado por |
|---|---|---|---|
| `public/data/ibge_municipios_2024_socio.geojson` | ~30 MB | Municípios brasileiros 2024 com indicadores socioeconômicos (IBGE) | `scripts/build_municipal_ibge_layer.py` |
| `public/data/pof_setores_2026/4106902.geojson` | — | Setores POF de Curitiba (código IBGE 4106902) | `scripts/build_setor_pof_curitiba_layer.py` |
| `public/data/study/current/*` e `public/data/study/kennedy/*` | ~7 MB cada | Estudo de caso Av. Kennedy (Curitiba): área default, empreendimentos, índice de setores, tipologias, sumário socioeconômico, KMZ do raio de 6 min | `scripts/build_study_ready_kennedy.py` |
| `assets/POF_Curitiba_Domicilios2022.geojson` | ~8 MB | Fonte bruta POF 2022 — domicílios Curitiba | fonte de entrada dos scripts |
| `assets/POF_Curitiba_Goiania_Maceio_Domicilios2022.geojson` | ~24 MB | Fonte bruta POF 2022 — domicílios Curitiba / Goiânia / Maceió | fonte de entrada dos scripts |
| `assets/relatorio_areas_selecionadas_.xlsx` | ~2 MB | Planilha de áreas selecionadas (apoio ao estudo) | manual |
| `assets/Curitiba_6 Min_Av Kennedy.kmz`, `*.kml`, `Empreendimentos Av Kennedy - *.kml` | — | Geometrias de raio de deslocamento e empreendimentos (comercialização / esgotados) | manual (Google Earth) |

Os scripts geradores estão preservados em `src/legacy/mapa/scripts/`.

## Como recuperar os dados

Os arquivos existem até o commit imediatamente anterior à remoção. Para localizar o commit e
restaurar um arquivo específico:

```bash
# Descobrir em que commit cada arquivo foi removido
git log --diff-filter=D --oneline -- public/data/

# Restaurar um arquivo (ou uma pasta) a partir do commit anterior à remoção
git checkout <commit_de_remocao>^ -- public/data/ibge_municipios_2024_socio.geojson
git checkout <commit_de_remocao>^ -- public/data/
```

Referência: o último commit **com** os dados presentes é `06cfb66` (`Reimplantou analyze-slide`).
Portanto, para restaurar tudo:

```bash
git checkout 06cfb66 -- public/data/
```

> Observação: `public/data/`, `*.geojson`, `*.kml` e `*.kmz` estão no `.gitignore`. Ao restaurar
> para retomar o desenvolvimento do Mapa, use `git add -f` se quiser versioná-los novamente, ou
> ajuste o `.gitignore`.
