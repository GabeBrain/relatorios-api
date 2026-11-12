# Evidência da Fase 3 — universo horizontal multiperíodo FIERGS

**Data:** 01/10/2026

**Portão:** G3

**Base de entrada:** commit `7a5f7c6` (G2 aprovado)

**Recortes de regressão:** FIERGS 4T2025 e FIERGS 2T2026

## Resultado

O portão G3 foi aprovado. Produto horizontal, coorte e consolidado VGV agora partem do mesmo conjunto canônico de empreendimentos aceitos pela política FIERGS no fechamento selecionado.

| Período | Empreendimentos | Unidades lançadas | Oferta final | Guardas |
|---|---:|---:|---:|---:|
| 4T2025 | 121 | 28.413 | 2.840 | 21/21 |
| 2T2026 | 129 | 30.476 | 3.365 | 21/21 |

Não foram fixados períodos, cidades ou totais. A regra decorre da entidade e do contrato temporal: a janela inicial limita séries de lançamentos, mas não elimina da fotografia de mercado atual projetos horizontais anteriores que continuam no universo homologável.

## Causa confirmada do delta de 4T2025

O consolidado VGV consumia `launchCube`, filtrado a partir de 1T2021. Produto e coorte horizontal já consumiam o cubo completo de fechamento.

Os 63 empreendimentos removidos somente do consolidado foram todos lançados antes da janela. Eles explicam integralmente os deltas:

- `121 - 58 = 63` empreendimentos;
- `28.413 - 11.563 = 16.850` unidades lançadas;
- `2.840 - 2.364 = 476` unidades finais.

### Decomposição dos 63 empreendimentos por cidade

| Cidade | Empreendimentos | Lançadas | Finais |
|---|---:|---:|---:|
| Cachoeirinha | 10 | 1.894 | 0 |
| Canoas | 6 | 1.541 | 16 |
| Eldorado do Sul | 5 | 3.060 | 116 |
| Gravataí | 17 | 3.562 | 67 |
| Guaíba | 5 | 2.142 | 221 |
| Novo Hamburgo | 5 | 579 | 0 |
| São Leopoldo | 10 | 2.597 | 11 |
| Viamão | 5 | 1.475 | 45 |
| **Total** | **63** | **16.850** | **476** |

### Decomposição por subtipo

| Subtipo | Empreendimentos | Lançadas | Finais |
|---|---:|---:|---:|
| Loteamento fechado | 28 | 4.305 | 224 |
| Loteamento aberto | 34 | 12.438 | 252 |
| Condomínio de casas | 1 | 107 | 0 |
| **Total** | **63** | **16.850** | **476** |

A decomposição por chave de empreendimento está em `evidencias/MATRIZ_FIERGS_4T2025-projects.csv`. Todos os registros possuem o efeito documentado “presente no fechamento; removido apenas pelo filtro de data de lançamento”.

## Política de chácaras

As chácaras continuam excluídas transversalmente antes das agregações. Na coleta de 4T2025, a política rejeitou 2 projetos e 67 unidades finais; em 2T2026, rejeitou 2 projetos e 48 unidades finais. Nenhum projeto `condominio_chacaras` chegou ao runtime homologável.

## Alteração metodológica

- Séries de fluxo de lançamentos continuam limitadas por `scope.startQuarter`.
- Produto, preços, coorte e consolidado horizontal de “mercado atual” usam a fotografia completa em `scope.endQuarter` para FIERGS.
- O Secovi-SP preserva a política histórica da janela.
- Quando o consolidado divergir do cubo horizontal canônico, PDF e PPT ficam não homologáveis.

## Guardas adicionadas

O manifesto passou de 18 para 21 invariantes críticas. Foram acrescentadas:

- `horizontal.projects.consolidated`;
- `horizontal.launched.consolidated`;
- `horizontal.final.consolidated`.

Uma fixture propositalmente divergente comprova o bloqueio quando o consolidado usa universo diferente da coorte.

## Evidências autenticadas

- `.tmp/fiergs-phase3-reconciliation-4T2025.json`: `homologable: true`, consolidado `121/28.413/2.840`.
- `.tmp/fiergs-phase3-reconciliation-2T2026.json`: `homologable: true`, consolidado `129/30.476/3.365`.

Os dois artefatos possuem delta zero nas sete guardas horizontais: três de coorte, três de consolidado e uma da política de chácaras.

## Arquivos afetados

- `src/features/panorama-secovi-fiergs/report/model.ts`
- `src/features/panorama-secovi-fiergs/domain/reconciliation.ts`
- `src/features/panorama-secovi-fiergs/__tests__/report-model.test.ts`
- `src/features/panorama-secovi-fiergs/__tests__/reconciliation-guards.test.ts`
- `scripts/fiergs-sales-reconciliation.mts`

## Verificações

- Testes focados: 4 arquivos e 68 testes aprovados.
- Suíte completa FIERGS: 30 arquivos e 240 testes aprovados.
- `npm run build`: aprovado.
- `npx tsc --noEmit -p tsconfig.app.json`: a validação encontrou somente `TS2307` no arquivo local e não versionado `src/features/corretor/lib/v3/__tests__/rolandia-v067.test.ts`, por ausência de `@xmldom/xmldom`. O arquivo pertence a trabalho paralelo do Corretor, não foi modificado nem incorporado ao commit desta fase. O build versionado passou.

Avisos já existentes de Recharts em JSDOM, Browserslist e tamanho de chunks não causaram falhas.

## Pendências

- Contagem e deduplicação dos mapas: Fase 4.
- Comparativos contextuais por trimestre: Fase 5.
- Ampliação final das guardas de exportação e homologação visual: Fases 6 e 7.

## Commit

Commit isolado identificado pela mensagem `fix(fiergs): reconcile horizontal closing universe`.
