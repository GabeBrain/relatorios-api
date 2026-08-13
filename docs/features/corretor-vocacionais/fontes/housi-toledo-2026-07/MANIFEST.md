# Housi · Toledo – PR · julho/2026

| | |
|---|---|
| **Estudo** | Brain_Vocacional_Vertical_Housi_Rua Raimundo Leonardi (V3 no banco) |
| **study_id** | `17062ca6-9814-43b4-a6bf-9f61e0c7db1e` |
| **Cliente (ata)** | Housi · Toledo/PR |
| **Analista** | Daniela (a confirmar pelo `docProps/core.xml` quando o PPTX chegar) |
| **Origem** | TransferNow `2026081372Tn4tFg`, enviado 13/ago/2026, **expira 20/ago/2026** |
| **Volume** | 25 arquivos · 77,7 MB |

> ⏳ **Material ainda não baixado.** O TransferNow exige sessão de browser — o
> `/dl/{id}/download` devolve 307 para a landing page. Baixar pelo navegador e depositar em
> `excel/` e `estudo/` conforme abaixo. O inventário veio da API pública do transfer.

## Inventário esperado

**→ `estudo/`**

| Arquivo | Tamanho |
|---|---|
| `4. VERSOES/Brain_Vocacional_Vertical_Housi_Rua Raimundo Leonardi_VAP_03ago_12h.pptx` | 58,7 MB |
| `4. VERSOES/…_VAP_03ago_12h.pdf` | 12,5 MB |

⚠️ **Só uma versão.** O banco tem o estudo como `_V3`; o pacote traz `_VAP_03ago_12h`. Conferir o
sha1 na chegada — se forem diferentes, **é o par erro/final** e destrava o gabarito por diff. Se for
o mesmo arquivo, ainda falta a versão com erro.

**→ `excel/`** (achatar a árvore de pastas do transfer, preservando os nomes)

| Origem no transfer | Arquivo |
|---|---|
| `2. SOCIODEMOGRAFIA/` | `02. SOCIODEMOGRAFIA 2 raios.xlsm` · `03. ABSORCAO LANCAMENTOS - ZI.xlsm` · `03. ABSORCAO LANCAMENTOS -.xlsm` · `1.Populacao de Domicilios.xlsx` |
| `2. SOCIODEMOGRAFIA/Dados/` | 5 exports crus do IBGE: `populacao` · `domicilios-por-tipo-de-moradia` · `domicilios-por-condicao-de-ocupacao` · `domicilios-por-faixa-de-rendimento-familiar` · `domicilios-por-numero-de-moradores` |
| `3. CONCORRENCIA/` | `1.CONSOLIDADA 1 KM.xlsm` · `1.CONSOLIDADA 2 KM.xlsm` · `2.Tabela Lacunas.xlsm` · `00. Base - Revenda e Locacao.xlsx` · `02. Revenda - Apartamento.xlsm` · `03. Locacao - Apartamento.xlsm` · `04. Area de Lazer - Z.I. Total.xlsx` · `3. Area de Lazer.xlsx` · `area de lazer.xlsx` · `arbnb.xlsx` |

`1. MATERIAL DO CLIENTE/` (4 KML/KMZ, 33 KB) não é fonte numérica — **não precisa** entrar.

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
