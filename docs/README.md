# Documentação — relatorios-api

Índice da documentação do projeto.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [`projetos/`](./projetos/README.md) | **Documentos vivos** dos três projetos do repo (Dashboard GeoBrain, Área Quanti, Rebrain), cada um com os eixos **Desenvolvimentos / Etapas / Pendências**. Contém a **regra de atualização por sincronização** (push/pull). |
| [`architecture/`](./architecture/) | Referências transversais de arquitetura e design: **DESIGN_SYSTEM.md** (design system da plataforma), **migration-paridade-v1.md** (histórico da migração Streamlit → React) e **SECURITY_NOTES.md** (dívidas de segurança conhecidas). |
| [`features/corretor-vocacionais/`](./features/corretor-vocacionais/) | Contexto da feature **Corretor \| Estudos Vocacionais**: ata de briefing (Grupo Impper), PPTX com os parâmetros de correção e o documento live [`LIVE_regras_corretor_vocacionais.md`](./features/corretor-vocacionais/LIVE_regras_corretor_vocacionais.md), que deve ser atualizado quando regras/fluxos mudarem. |
| [`features/relatorios-secovi/`](./features/relatorios-secovi/) | Planilhas de referência dos **Relatórios SECOVI** (Barretos) usadas na construção da página `TestesArquitetura`. |
| [`features/cid-validacao/`](./features/cid-validacao/) | Notebook de validação de dados **CID**, base da página de Validação de Base. |

> Documentos aqui são **contexto e referência** — não são carregados em runtime pelo app.
> O código legado do Mapa (aposentado) e suas fontes de dados estão documentados em
> [`../src/legacy/mapa/DATA_SOURCES.md`](../src/legacy/mapa/DATA_SOURCES.md).
