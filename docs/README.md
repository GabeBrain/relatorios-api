# Documentação — relatorios-api

Índice da documentação do projeto.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [`architecture/`](./architecture/) | Referências transversais de arquitetura e design: **DESIGN_SYSTEM.md** (design system da plataforma) e **migration-paridade-v1.md** (histórico da migração Streamlit → React). |
| [`features/corretor-vocacionais/`](./features/corretor-vocacionais/) | Contexto da feature **Corretor \| Estudos Vocacionais**: ata de briefing (Grupo Impper) e PPTX com os parâmetros de correção. Base para evoluir o prompt de análise em `supabase/functions/analyze-slide`. |
| [`features/relatorios-secovi/`](./features/relatorios-secovi/) | Planilhas de referência dos **Relatórios SECOVI** (Barretos) usadas na construção da página `TestesArquitetura`. |
| [`features/cid-validacao/`](./features/cid-validacao/) | Notebook de validação de dados **CID**, base da página de Validação de Base. |

> Documentos aqui são **contexto e referência** — não são carregados em runtime pelo app.
> O código legado do Mapa (aposentado) e suas fontes de dados estão documentados em
> [`../src/legacy/mapa/DATA_SOURCES.md`](../src/legacy/mapa/DATA_SOURCES.md).
