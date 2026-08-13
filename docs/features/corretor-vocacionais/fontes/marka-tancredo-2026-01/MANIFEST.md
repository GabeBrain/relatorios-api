# Marka Prime · Tancredo Neves · Guarulhos – SP · janeiro/2026

| | |
|---|---|
| **Estudo** | Vocacional_Marka Prime_Tancredo_Sao Paulo - SP |
| **study_id** | `a9695980-a3bb-4390-9567-bc5210c3e758` |
| **Cliente (ata)** | Kenuy / Brain · Guarulhos/SP (bairro São Roque) |
| **Analista** | `cp:lastModifiedBy` do PPTX local: **Ana Paula Kingeski** (`dc:creator`: BRAIN42) |
| **Origem** | TransferNow `20260813LfYODS2t`, enviado 13/ago/2026, **expira 20/ago/2026** |
| **Volume** | 46 arquivos · 829,5 MB — **baixar seletivamente** |

> ⏳ **Material ainda não baixado** (mesmo motivo do Toledo: gate de browser).
> O PPTX que o banco analisou **já está em disco** (`_estudo exemplo.pptx`, sha1 `9ea6baefb3f9…`,
> em `_backup_estudos/`) — do transfer interessa o **Excel** e as **versões anteriores**.

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

## Diferenças de formato vs. Rolândia/Toledo (medidas pelos nomes, 13/ago)

**Geração diferente de template** — jan/2026 contra jul/2026:

| Papel | Rolândia / Toledo | Marka |
|---|---|---|
| Oferta consolidada | `Consolidada - <raio>` | **`Analise Vertical Otimizada - <segmento>`** (HIS 1, HIS 2, HMP, Primária) |
| Sociodemografia | `02. SOCIODEMOGRAFIA.xlsm` | **`1. OnMaps (5.xlsm`** |
| Absorção | `03. ABSORÇAO LANÇAMENTOS` | **`Cenarios - 3 Anos ok.xlsm`** |
| Lacunas | `2.Tabela Lacunas.xlsm` (Toledo) | ausente |
| Recorte | por **raio** (1/2/3 Km, Z.I.) | por **segmento de produto** (HIS/HMP/Primária) |

Há ainda `Esgotados - Ate 2 km.xlsm` e `Revenda casas cond.xlsm`, sem equivalente nos outros dois.
Nome truncado com parêntese aberto (`1. OnMaps (5.xlsm`) confirma que **não dá para casar por nome
exato em lugar nenhum**.

**Consequência:** o extrator precisa de **mapa de abas por geração**, não um só. O de jul/2026 está
medido em [`../README.md`](../README.md); o de jan/2026 só depois de abrir estes arquivos.

## Derivados

| Derivado | Estado |
|---|---|
| `calibracao/notas_marka_tancredo.labels.json` | ✅ gabarito das ~84 notas, congelado desde 13/jul |
| `calibracao/*.ir.secao.csv` | ✅ calibração de seção |
| `<slug>.fonte.json` | 🔲 aguarda extrator da geração jan/2026 |
| diff V2 × Vfinal | 🔲 aguarda download |
