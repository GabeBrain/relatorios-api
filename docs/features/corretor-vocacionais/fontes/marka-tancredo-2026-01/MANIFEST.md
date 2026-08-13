# Marka Prime · Tancredo Neves · Guarulhos – SP · janeiro/2026

| | |
|---|---|
| **Estudo** | Vocacional_Marka Prime_Tancredo_Sao Paulo - SP |
| **study_id** | `a9695980-a3bb-4390-9567-bc5210c3e758` |
| **Cliente (ata)** | Kenuy / Brain · Guarulhos/SP (bairro São Roque) |
| **Analista** | `cp:lastModifiedBy` do PPTX local: **Ana Paula Kingeski** (`dc:creator`: BRAIN42) |
| **Origem** | TransferNow `20260813LfYODS2t`, enviado 13/ago/2026, **expira 20/ago/2026** |
| **Volume** | 46 arquivos · 829,5 MB — **baixar seletivamente** |

✅ **Material recebido e extraído em 13/ago/2026** — 11 planilhas em `excel/`, 3 PPTX + 2 PDF em
`estudo/`. Os ~463 MB do estudo Brooklin aninhado, os KML/KMZ e os PDFs de projeto do cliente foram
descartados na extração.

## Três versões, três estados — o gabarito por diff está completo

| Versão | sha1 | Último a salvar | Modificado |
|---|---|---|---|
| `_V1.pptx` (149,8 MB) | `a60e4730a83ef8…` | Gabriel Ferreira dos Santos | 25/fev/2026 |
| `_V2_28fev_20h15.pptx` (95,6 MB) | `a91cf194070ee4…` | Gabriel Ferreira dos Santos | 04/mar/2026 |
| `_Vfinal_27abr_2025_8h45.pptx` (95,7 MB) | `8c3930d5712ab7…` | **Ana Paula Kingeski** | 27/abr/2026 |

**Nenhuma bate com a do banco** (`9ea6baefb3f9…`, o `_estudo exemplo.pptx` em `_backup_estudos/`) —
são quatro pontos distintos da mesma série. A troca de mão na Vfinal (do Gabriel Ferreira para a Ana
Paula) sugere que a revisão final foi feita por outra pessoa, o que torna o diff V2 → Vfinal o mais
próximo de "erros que o revisor encontrou".

## O que baixar (≈ 105 MB dos 829 MB)

**→ `estudo/`** — a sequência de versões é o material mais valioso do pacote:

| Arquivo | Tamanho | Papel |
|---|---|---|
| `4. VERSOES/…_Vfinal_27abr_2025_8h45.pptx` | 97,9 MB | versão final |
| `2. SOCIODEMOGRAFIA/Projeto SP/…_V2_28fev_20h15.pptx` | 97,9 MB | intermediária |
| `2. SOCIODEMOGRAFIA/Projeto SP/…_V1.pptx` | 153,4 MB | primeira — **opcional**, pesada |

**V1 → V2 → Vfinal é o gabarito por diff**: cada número que mudou foi um erro que a analista achou.
Baixar ao menos **V2 e Vfinal**; a V1 só se houver espaço.

**→ `excel/`** — de `3. CONCORRENCIA/` e `2. SOCIODEMOGRAFIA/` (nível raiz, ≈ 7,4 MB):

`Analise Vertical Otimizada - HIS 1.xlsm` · `- HIS 2.xlsm` · `- HMP.xlsm` · `- Primaria.xlsm` ·
`Esgotados - Ate 2 km.xlsm` · `Revenda casas cond.xlsm` · `1. OnMaps (5.xlsm` ·
`2. Populacao e Domicilios.xlsx` · `3. Pontos de Interesse ok.xlsx` · `5. Financiamento.xlsx` ·
`Cenarios - 3 Anos ok.xlsm`

## ⚠️ Não baixar: `2. SOCIODEMOGRAFIA/Projeto SP/`

São **~470 MB de outro estudo** (Marka Prime **Brooklin**/São Paulo) aninhado por engano dentro da
pasta do Tancredo, com sua própria árvore `1. MATERIAL DO CLIENTE` / `2. SOCIODEMOGRAFIA` /
`3. CONCORRENCIA` / `4. VERSOES` e uma duplicata completa dos Excel. Fora de escopo — **exceto** as
duas versões do Tancredo que estão soltas ali dentro (V1 e V2, listadas acima).

## Formato vs. Rolândia/Toledo — o nome muda, a aba não

⚠️ **Correção da leitura anterior.** Pelos nomes, este pacote parecia "outra geração de template".
**Abrir os arquivos desmentiu**: as abas são a mesma família dos pacotes de jul/2026.

| Papel | Nome aqui | Abas |
|---|---|---|
| Oferta consolidada | `Analise Vertical Otimizada - HIS 1/HIS 2/HMP/Primaria`, `Esgotados - Ate 2 km` | as mesmas da `Consolidada` de jul/26 + `VSO` e `R$TIPO` |
| Sociodemografia | `1. OnMaps (5` | subconjunto de `02. SOCIODEMOGRAFIA` — mesmos nomes de aba |
| Absorção | `Cenarios - 3 Anos ok` | `TAXAS`, `DOMICÍLIOS POR RENDIMENTO`, `ABSORÇÃO`, `GRAFICOS` — **idênticas** |
| População/domicílios | `2. Populacao e Domicilios` | `População`, `Domicilios` — **idênticas** |
| Revenda | `Revenda casas cond` | mesmo vocabulário (`Análise`, `Bairro`, `Tipologia`, `MINICLUSTER *`) |

**O que de fato muda** (e é o que o extrator precisa absorver):

- Cabeçalho de `Ano` e `Tipologia` na **linha 6**, não na 5 como em jul/2026.
- `Oferta         Final` (com espaços múltiplos internos) no lugar de `Oferta Atual`;
  `Vendas s/ O.L.` no lugar de `Vendas`; `Disp. s/ O.L.` no lugar de `Disp. Sobre Lançados`.
- Recorte por **segmento de produto** (HIS 1, HIS 2, HMP, Primária) em vez de raio — o rótulo sai do
  nome do arquivo, mas a estrutura interna é a mesma.
- `1. OnMaps (5.xlsm` tem o nome truncado com parêntese aberto: mais uma prova de que nome de arquivo
  não serve de âncora.

Detalhe completo em [`../README.md`](../README.md).

## Derivados

| Derivado | Estado |
|---|---|
| `calibracao/notas_marka_tancredo.labels.json` | ✅ gabarito das ~84 notas, congelado desde 13/jul |
| `calibracao/*.ir.secao.csv` | ✅ calibração de seção |
| `<slug>.fonte.json` | 🔲 aguarda extrator da geração jan/2026 |
| diff V2 × Vfinal | 🔲 aguarda download |
