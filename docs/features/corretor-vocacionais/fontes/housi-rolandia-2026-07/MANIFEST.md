# Housi · Rolândia – PR · julho/2026

| | |
|---|---|
| **Estudo** | Brain_Vocacional_Vertical_Housi_Av. Castro Alves_Rolândia - PR_v1 |
| **study_id** | `480a93d2-e61d-4d16-a174-4e99622ad57f` |
| **Cliente (ata)** | Housi |
| **Analista** | Daniela — `cp:lastModifiedBy` do PPTX: **Dani Nunes** (`dc:creator`: BR-41) |
| **Recebido** | Excel em 13/ago/2026 (pedido do Gabriel); PPTX desde 28/jul/2026 |

## O que chegou

| Pasta | Conteúdo | Tamanho |
|---|---|---|
| `estudo/` | 1 PPTX, 78 slides, sha1 `736dc564c1dc…` | 163 MB |
| `excel/` | 13 planilhas de trabalho | 14 MB |

⚠️ **Falta a versão com erro** deste estudo — só temos a entregue. Pedida à Daniela junto com o
Toledo; quando chegar, entra como `..._vERRO.pptx` e destrava o gabarito por diff
(ver [`../README.md`](../README.md)).

### Planilhas e o que alimentam

| Arquivo | Slides |
|---|---|
| `02. SOCIODEMOGRAFIA.xlsm` (23 abas) | s22–s34 |
| `01. POPULACAO E DOMICÍLIOS.xlsx` | s22, s23 |
| `03. ABSORÇAO LANÇAMENTOS - Rolândia.xlsm` | s35–s37 |
| `01. Consolidada - 1 Km / 3 Km / Z.I. Total.xlsm` (26 abas cada) | s39–s53 |
| `00. Base - Rolândia 06.2026.xlsx` | s40–s45 (base bruta) |
| `02. Revenda - Apartamento.xlsm` · `00. Base - Revenda e Locação.xlsx` · `05. Análise - Anúncios.xlsx` | s63–s67 |
| `03. Locação - Apartamento.xlsm` | s68–s72 |
| `00. Base - Área de Lazer.xlsx` · `04. Área de Lazer - Z.I. Total.xlsx` | s57–s61 |

## Derivados

| Derivado | Estado |
|---|---|
| `../../calibracao/feedback-2026-07/rolandia-v1.ir.json` | ✅ existe (78 slides) — fixa `rolandia-real.test.ts` |
| `../../calibracao/<slug>/rolandia.fonte.json` | 🔲 pendente — extrator do pacote Excel |
| gabarito por diff erro × final | 🔲 bloqueado: falta a versão com erro |

## Achados já obtidos deste material

Cruzamento Excel × deck em 12/ago revelou **3 erros reais** que nenhuma regra atual pega, porque são
internamente consistentes — detalhe em [`../../FP_sessao_2026-08-12.md`](../../FP_sessao_2026-08-12.md)
(FN-04): verticalização de Rolândia (5,7% × 5,16% real, em 2 slides), domicílios do PR
(4.216.017 × 4.216.107) e rótulo "hab." numa linha de domicílios.

## Descarte

Ainda **não descartar**: o `fonte.json` não existe, então o pacote Excel é a única cópia da verdade
numérica. Descartar só depois do extrator rodar e dos testes ficarem verdes — aí registrar em
[`../../ARQUIVOS_REMOVIDOS.md`](../../ARQUIVOS_REMOVIDOS.md).
