# Arquivos pesados removidos do repositório local

Registro leve dos documentos-fonte movidos para fora do repo em **2026-07-26**, durante a
limpeza de espaço pré-relatório novo do Rebrain. Nenhum deles estava versionado no git
(cobertos pelo `.gitignore`), então **não há cópia no histórico** — os originais foram
movidos para `C:\Users\GaloD\Desktop\SE\_backup_estudos\` (fora do repo).

Os derivados que o app/pipeline realmente usam **permanecem no repo**: `ir/*.ir.json`,
`calibracao/*.csv` + `*.labels.json` e `visao/` (manifest + complementos do piloto).
O gabarito da calibração Marka/Tancredo está congelado desde 13/jul/2026.

| Arquivo | Tamanho | Última modificação | Papel que cumpriu |
|---|---|---|---|
| `Teste IA Masterplan.pptx` | 261,04 MB | 2026-07-05 | Estudo-exemplo p/ extração de IR (`ir/Teste IA Masterplan.ir.json`) |
| `Vocacional_Horizontal(Av. Itaipava)_Elio_Winter_Itajai_SC_estudo exemplo.pptx` | 156,70 MB | 2026-07-08 | Estudo-exemplo; IR + calibração (`calibracao/*.ir.secao.csv`) + piloto de visão (`visao/piloto/ita_*`) |
| `Vocacional_e_Quanti_CONTRUTORA_REGIONAL_GO_Estudo_Unificado_V3_05_maio.pptx` | 141,64 MB | 2025-05-05 | Estudo-exemplo p/ extração de IR |
| `Vocacional_Marka Prime_Tancredo_Sao Paulo - SP_estudo exemplo.pptx` | 92,48 MB | 2026-07-08 | Estudo-exemplo do gabarito Marka/Tancredo; IR + calibração + labels + piloto de visão (`visao/piloto/mrk_*`) |
| `Estudo Vocacional do terreno - Parque Anhanguera e Jardim Atlântico .pdf` | 21,67 MB | 2026-05-21 | Referência histórica citada em `DESIGN_corretor_v2.md` (178 págs) |

**Se precisar re-rodar** `ir_extractor.py` / `scan_imagens.py` sobre esses estudos (ex.:
mudança no formato do IR), recupere os originais do backup acima ou do drive da Brain.

Permanecem no repo (versionados de propósito):
- `Vocacional_Marka Prime_Reduzido.pptx` (34 MB) — fixture do teste real
  `src/features/corretor/lib/v3/__tests__/ata-image.test.ts`.
- `Vocacionais_parametros_de_correcao.pptx` (3,3 MB) — rubrica fonte de verdade das regras.
