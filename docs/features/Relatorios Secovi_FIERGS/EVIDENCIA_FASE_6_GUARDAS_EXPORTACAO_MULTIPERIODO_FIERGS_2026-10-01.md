# Evidência da Fase 6 — guardas de exportação multiperíodo FIERGS

**Data:** 01/10/2026

**Portão:** G6

**Base de entrada:** commit `473d60c` (G5 aprovado)

## Resultado

O portão G6 foi aprovado. PDF e PPT espelho agora compartilham uma única decisão de bloqueio e consultam as 23 invariantes críticas em três pontos:

1. na interface, antes de habilitar os botões;
2. no início do job de exportação;
3. no host, imediatamente antes da captura das páginas.

Uma divergência ou indisponibilidade crítica impede ambos os formatos. A auditoria CSV permanece disponível para diagnóstico.

## Universos reais liberados

As coletas autenticadas preservadas nas fases anteriores comprovam:

| Período | Guardas críticas | Resultado | Exportação esperada |
|---|---:|---|---|
| FIERGS 4T2025 | 23/23 `match` | `homologable: true` | PDF e PPT liberados |
| FIERGS 2T2026 | 23/23 `match` | `homologable: true` | PDF e PPT liberados |

Artefatos:

- `.tmp/fiergs-phase4-reconciliation-4T2025.json`;
- `.tmp/fiergs-phase4-reconciliation-2T2026.json`.

## Invariantes protegidas

As 23 linhas críticas abrangem:

- vendas verticais por padrão, tipologia, cidade e área;
- estoque vertical temporal, área, tabelas por padrão e tipologia, coorte e maturidade;
- universo de projetos usado nas ponderações de preço;
- horizontal por coorte e consolidado: projetos, lançadas e finais;
- exclusão transversal de chácaras;
- unicidade das chaves dos mapas;
- correspondência entre empreendimentos georreferenciados e marcadores renderizados.

Todas carregam fonte, fórmula, universo, período, total canônico, total dimensional, delta, tolerância, criticidade e status.

## Decisão única de bloqueio

Foi criada `panoramaExportBlockReason(report)`. A função:

- não interfere no Secovi-SP;
- bloqueia FIERGS quando `homologable` é falso;
- recalcula diretamente as linhas críticas e bloqueia mesmo se um manifesto trouxer `homologable: true` indevidamente;
- considera `different` e `unavailable` como impeditivos;
- informa quantidade e identificadores das primeiras invariantes divergentes.

Isso evita decisões diferentes entre a tela, o estado global e o host de rasterização.

## Testes negativos

Foram comprovados:

- delta de vendas bloqueando exportação;
- delta horizontal bloqueando PDF e PPT em 2T2026 e 4T2025;
- dimensão de estoque indisponível bloqueando exportação;
- manifesto forjado com `homologable: true` e linha crítica divergente continuando bloqueado;
- empreendimento georreferenciado ausente do mapa bloqueando exportação;
- duplicidade de chave do cubo tornando o relatório não homologável.

## Testes positivos

Fixtures reconciliadas de 2T2026 e 4T2025, com 23/23 invariantes em `match`, iniciam normalmente os jobs de PDF e PPT.

## Arquivos afetados

- `src/features/panorama-secovi-fiergs/export-store.ts`
- `src/features/panorama-secovi-fiergs/components/PanoramaExportHost.tsx`
- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`
- `src/features/panorama-secovi-fiergs/__tests__/reconciliation-guards.test.ts`

## Verificações

- Testes focados de guardas, host e contrato de PDF: 3 arquivos e 20 testes aprovados.
- Suíte completa FIERGS: 30 arquivos e 249 testes aprovados.
- `npm run build`: aprovado.
- `npx tsc --noEmit -p tsconfig.app.json`: permanece interrompido somente pelo arquivo local e não versionado `src/features/corretor/lib/v3/__tests__/rolandia-v067.test.ts`, que importa `@xmldom/xmldom` não instalado. Nenhum arquivo do Corretor foi modificado ou incorporado.

Avisos já existentes de Recharts em JSDOM, Browserslist e tamanho de chunks não causaram falhas.

## Pendências

- Gerar PDF e PPT reais de 4T2025 e 2T2026.
- Inspecionar visualmente as páginas críticas e comparar com as auditorias.
- Montar a matriz final antes/depois e o pacote de homologação para Juliana.

Esses itens pertencem à Fase 7.

## Commit

Commit isolado identificado pela mensagem `test(fiergs): gate multiperiod exports on reconciliation`.
