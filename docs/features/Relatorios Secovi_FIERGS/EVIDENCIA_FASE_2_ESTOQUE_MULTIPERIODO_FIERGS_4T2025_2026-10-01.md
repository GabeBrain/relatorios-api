# Evidência da Fase 2 — estoque vertical multiperíodo FIERGS

**Data:** 01/10/2026

**Portão:** G2

**Base de entrada:** commit `e8ecd89` (G1 aprovado)
**Recortes de regressão:** FIERGS 4T2025 e FIERGS 2T2026

## Resultado

O portão G2 foi aprovado. No recorte autenticado de 4T2025, oferta final por padrão, tipologia, área, coorte, maturidade e as bases de preço passaram a derivar da mesma fotografia vertical canônica. Todas as dimensões de unidades fecham em **5.855**, com delta zero. As bases de preço usam os mesmos **505 empreendimentos verticais**.

Não foram fixados números, cidades ou períodos no runtime. A regra é condicionada à política da entidade FIERGS e preserva o comportamento do Secovi-SP.

## Hipótese avaliada e causa confirmada

A hipótese era que parte das lâminas de mercado atual aplicava indevidamente o início da janela de lançamentos (`1T2021`) à fotografia de estoque encerrada em `4T2025`.

Isso foi confirmado. O total `5.448` excluía **407 unidades** de estoque pertencentes a projetos lançados antes da janela, embora essas unidades ainda estivessem presentes na fotografia de fechamento. A diferença contém 22 empreendimentos e 24 linhas tipológicas:

| Cidade | Unidades excluídas | Empreendimentos afetados |
|---|---:|---:|
| Canoas | 329 | 5 |
| Gravataí | 33 | 3 |
| Guaíba | 3 | 1 |
| Novo Hamburgo | 38 | 10 |
| São Leopoldo | 2 | 2 |
| Viamão | 2 | 1 |
| **Total** | **407** | **22** |

A matriz detalhada por empreendimento e tipologia está preservada em:

- `evidencias/MATRIZ_FIERGS_4T2025-projects.csv`;
- `evidencias/MATRIZ_FIERGS_4T2025-typologies.csv`.

## Decisão metodológica

- Fluxos de lançamentos continuam respeitando `scope.startQuarter`.
- A fotografia de mercado atual FIERGS no `scope.endQuarter` inclui todo projeto ainda com oferta, mesmo quando seu lançamento antecede a janela escolhida.
- Padrão, tipologia, área, coorte, maturidade e ponderações de preço passam a consumir o mesmo cubo de fechamento vertical.
- O universo horizontal e o VGV consolidado permanecem deliberadamente para a Fase 3.
- Mapas e comparativos contextuais permanecem para as Fases 4 e 5.

## Matriz antes/depois

| Dimensão vertical | Antes | Depois | Delta final |
|---|---:|---:|---:|
| Série/área canônica | 5.855 | 5.855 | 0 |
| Padrão | 5.448 | 5.855 | 0 |
| Tipologia | 5.448 | 5.855 | 0 |
| Coorte | 5.448 | 5.855 | 0 |
| Maturidade por padrão | 5.448 | 5.855 | 0 |
| Maturidade por tipologia | 5.448 | 5.855 | 0 |
| Projetos na base de preço por padrão | janela parcial | 505 | 0 contra o universo canônico |
| Projetos na base de preço por tipologia | janela parcial | 505 | 0 contra o universo canônico |

## Auditoria de fontes

A execução autenticada foi gravada localmente em `.tmp/fiergs-phase2-reconciliation-4T2025.json`. Ela produziu 18 invariantes críticas com status `match` e `homologable: true`.

A fonte agregada de padrão retornou uma anomalia bruta isolada em Guaíba (`93` contra `24` no cubo granular, diferença de `69`). Esse agregado não foi somado ao fato canônico: o runtime deriva padrão e tipologia das mesmas chaves granulares de fechamento, resultando em `5.855 = 5.855`. A ocorrência permanece registrada como diferença de fonte, não como ajuste manual.

## Guardas adicionadas

O manifesto de reconciliação passou de 11 para 18 invariantes, acrescentando bloqueios para:

- tabela de estoque por padrão;
- tabela de estoque por tipologia;
- estoque por coorte;
- maturidade por padrão;
- maturidade por tipologia;
- universo de projetos usado em preços por padrão;
- universo de projetos usado em preços por tipologia.

Uma fixture divergente em maturidade por tipologia comprova que a exportação é bloqueada quando uma dessas dimensões deixa de fechar.

## Arquivos afetados

- `src/features/panorama-secovi-fiergs/report/model.ts`
- `src/features/panorama-secovi-fiergs/domain/reconciliation.ts`
- `src/features/panorama-secovi-fiergs/__tests__/report-model.test.ts`
- `src/features/panorama-secovi-fiergs/__tests__/reconciliation-guards.test.ts`
- `scripts/fiergs-sales-reconciliation.mts`

## Verificações

- Execução autenticada FIERGS 4T2025: `homologable: true`; 18/18 invariantes críticas reconciliadas.
- Suíte completa FIERGS: **30 arquivos, 239 testes aprovados**.
- TypeScript: `npx tsc --noEmit -p tsconfig.app.json` aprovado.
- Build: `npm run build` aprovado.
- `git diff --check`: aprovado; somente avisos esperados de normalização LF/CRLF.

Os avisos de dimensão zero do Recharts em JSDOM, Browserslist desatualizado e tamanho de chunks já existentes não causaram falha.

## Riscos e pendências

- O conjunto horizontal ainda apresenta universos distintos e será tratado no G3.
- A contagem de mapas será auditada no G4.
- O comparativo anual de 4T será tratado no G5.
- A anomalia do agregado bruto de padrão em Guaíba deve continuar visível na auditoria de fontes, mas não substitui o cubo granular reconciliável.

## Commit

O hash do commit isolado será registrado após a inclusão explícita somente dos arquivos desta fase.
