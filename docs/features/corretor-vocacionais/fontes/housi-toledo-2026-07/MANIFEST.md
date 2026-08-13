# Housi · Toledo – PR · julho/2026

| | |
|---|---|
| **Estudo** | Brain_Vocacional_Vertical_Housi_Rua Raimundo Leonardi (V3 no banco) |
| **study_id** | `17062ca6-9814-43b4-a6bf-9f61e0c7db1e` |
| **Cliente (ata)** | Housi · Toledo/PR |
| **Analista** | Daniela (a confirmar pelo `docProps/core.xml` quando o PPTX chegar) |
| **Origem** | TransferNow `2026081372Tn4tFg`, enviado 13/ago/2026, **expira 20/ago/2026** |
| **Volume** | 25 arquivos · 77,7 MB |

✅ **Material recebido e extraído em 13/ago/2026** — 19 planilhas em `excel/`, 1 PPTX + 1 PDF em
`estudo/`. Os 4 KML/KMZ do material do cliente foram descartados (não são fonte numérica).

## Versão recebida — é o par erro/final

| | |
|---|---|
| Arquivo | `Brain_Vocacional_Vertical_Housi_Rua Raimundo Leonardi_VAP_03ago_12h.pptx` (58,7 MB) |
| sha1 | `c99440357bf055…` — **não bate com o do banco** (`9dccac7172c9…`, V3) |
| Autor | `dc:creator` BR-41 · **`cp:lastModifiedBy`: Lucas Finoti** · modificado 03/ago/2026 |

O banco analisou a **V3**; este é o **VAP de 03/ago**, posterior. Ou seja: o que está no banco é a
versão **com erro** e esta é a **corrigida** — o diff destrava o gabarito.

🔔 **Provável "Housi v2 do Lucas Finoti"**, pendência aberta desde 28/jul que destrava FN-1
(verticalização cross-slide s33 × s32) e FN-2 (taxa 0,9% × 1,7%) — ver
[`../../SPRINT_feedback_analistas_2026-07-28.md`](../../SPRINT_feedback_analistas_2026-07-28.md) §2.
Falta o PPTX da V3 para o diff completo; hoje só temos os achados dela no banco.

**→ `excel/`** (achatar a árvore de pastas do transfer, preservando os nomes)

| Origem no transfer | Arquivo |
|---|---|
| `2. SOCIODEMOGRAFIA/` | `02. SOCIODEMOGRAFIA 2 raios.xlsm` · `03. ABSORCAO LANCAMENTOS - ZI.xlsm` · `03. ABSORCAO LANCAMENTOS -.xlsm` · `1.Populacao de Domicilios.xlsx` |
| `2. SOCIODEMOGRAFIA/Dados/` | 5 exports crus do IBGE: `populacao` · `domicilios-por-tipo-de-moradia` · `domicilios-por-condicao-de-ocupacao` · `domicilios-por-faixa-de-rendimento-familiar` · `domicilios-por-numero-de-moradores` |
| `3. CONCORRENCIA/` | `1.CONSOLIDADA 1 KM.xlsm` · `1.CONSOLIDADA 2 KM.xlsm` · `2.Tabela Lacunas.xlsm` · `00. Base - Revenda e Locacao.xlsx` · `02. Revenda - Apartamento.xlsm` · `03. Locacao - Apartamento.xlsm` · `04. Area de Lazer - Z.I. Total.xlsx` · `3. Area de Lazer.xlsx` · `area de lazer.xlsx` · `arbnb.xlsx` |

`1. MATERIAL DO CLIENTE/` (4 KML/KMZ, 33 KB) não é fonte numérica — **não precisa** entrar.

## Números verdadeiros — confirmam os totais do estudo

`1.CONSOLIDADA 1 KM` e `2 KM`, aba `Padrão`, linha Total:

| Recorte | Empreend. | Oferta Lançada | Oferta Atual | Vendas (derivada) |
|---|---|---|---|---|
| Até 1 Km | **28** | **1.099** | **397** | 702 |
| Até 2 Km | **19** | **665** | **141** | 524 |

Batem **exatamente** com os totais declarados nos slides s42/s43/s98 (1.099 / 702 / 397) e
s100/s101 (665 / 524 / 141). **Os totais do estudo estavam certos o tempo todo** — os
`ABSOLUTE_SUM` nunca foram sobre total errado.

O que o Excel revela é a **contagem de linhas**:

- 2 Km: s100 (11 linhas) + s101 (8) = **19** = os 19 empreendimentos do Excel ✅ — por isso o par
  fecha na bala depois da v0.51.
- 1 Km: s42 (12) + s43 (24) = **36 linhas para 28 empreendimentos** → a visão leu **8 linhas
  fantasma**. É a causa real do 434 + 1355 = 1789 ≠ 1.099, e confirma que o veredito "Verificar" do
  conjunto é o correto.

## Ambiguidade que quebraria um extrator por nome

`03. ABSORCAO LANCAMENTOS - ZI.xlsm` e `03. ABSORCAO LANCAMENTOS -.xlsm` **não são duplicatas**:

| Arquivo | Domicílios | Absorção total |
|---|---|---|
| `- ZI` | 23.499 | 8.362,2 |
| `-` (sufixo vazio) | 56.405 | 19.362,9 |

Z.I. × cidade. Escolher pelo nome pegaria o escopo errado em silêncio.

## Diferenças de formato vs. Rolândia (medidas pelos nomes, 13/ago)

Mesma geração, **nomes instáveis**:

- **Acentuação some**: `ABSORÇAO`→`ABSORCAO`, `Locação`→`Locacao`, `Área`→`Area`.
- **Prefixo numérico varia**: `01. Consolidada - 1 Km_verificação - OK` × `1.CONSOLIDADA 1 KM`.
- **Raios diferem**: Rolândia tem 1 Km / 3 Km / Z.I. Total; Toledo tem 1 KM / 2 KM. **A quantidade de
  consolidadas não é fixa** — tem de sair do nome do arquivo.
- **Novos aqui**: `2.Tabela Lacunas.xlsm` e a pasta `Dados/` com o **IBGE cru** (fonte primária,
  melhor que a aba processada).
- **Ambiguidades**: duas `ABSORCAO LANCAMENTOS` (uma `- ZI`, outra com sufixo vazio) e dois arquivos
  de área de lazer (`3. Area de Lazer.xlsx` × `area de lazer.xlsx`).

## Derivados

| Derivado | Estado |
|---|---|
| `calibracao/toledo-2026-08/sum-payloads.json` | ✅ existe — 6 payloads de soma, fixa `toledo-real.test.ts` |
| `<slug>-erro.ir.json` / `<slug>-final.ir.json` | 🔲 aguarda o PPTX |
| `<slug>.fonte.json` | 🔲 aguarda o extrator |
