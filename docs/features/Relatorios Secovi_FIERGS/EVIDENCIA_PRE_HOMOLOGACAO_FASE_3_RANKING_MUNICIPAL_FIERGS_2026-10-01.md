# Evidência pré-homologação — Fase 3: ranking municipal completo

**Data:** 01/10/2026

**Escopo:** página 31 do Panorama FIERGS

**Portão:** G3

## 1. Resultado

O ranking de vendas passa a representar as dez cidades do preset quando existe observação válida, inclusive uma venda líquida igual a zero. Eldorado do Sul deixa de ser eliminada pelo filtro genérico de distribuições e aparece com `0` e `0,0%`.

## 2. Comportamento implementado

- zero observado é preservado apenas na variante `is-city-ranking`;
- `null` continua significando ausência e não é convertido em zero;
- o ranking municipal aceita dez linhas, enquanto as demais distribuições mantêm o limite anterior;
- ordenação principal decrescente por vendas e desempate alfabético em português;
- cidades com zero não recebem medalha nem barra mínima artificial;
- o espaçamento vertical foi compactado somente no ranking municipal para acomodar dez municípios;
- o total continua sendo calculado sobre todas as observações, sem mudança numérica.

## 3. Caso de prova

Uma fixture com dez municípios, incluindo Eldorado do Sul com zero, produz:

- dez linhas visíveis;
- Eldorado do Sul na última posição com valor zero;
- participação zero;
- empates ordenados alfabeticamente;
- total idêntico à soma de todas as cidades.

A mesma linha zero continua oculta em distribuições que não são o ranking municipal, evitando alteração transversal no template.

## 4. Arquivos afetados

- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`;
- `src/features/panorama-secovi-fiergs/print/panorama-print.css`;
- `src/features/panorama-secovi-fiergs/__tests__/editorial-clarity.test.ts`;
- este documento.

Nenhum arquivo de mapas, Corretor ou artefato de entrada foi alterado.

## 5. Testes

| Verificação | Resultado |
|---|---|
| testes focais de clareza e renderização | 8/8 aprovados |
| suíte FIERGS | 31 arquivos, 258/258 testes aprovados |
| `npx tsc --noEmit -p tsconfig.app.json` | aprovado |
| `npm run build` | aprovado |

Avisos não bloqueantes preexistentes: dimensões zero do Recharts nos testes, Browserslist desatualizado, importação mista de `xlsx` e chunks superiores a 500 kB.

## 6. Portão G3

**APROVADO.** A página 31 suporta exatamente as dez cidades do preset, diferencia zero de ausência, mantém total e ordem estáveis e possui tratamento de layout específico para dez linhas.

**Commit isolado:** registrado no handoff do portão, pois um commit não pode conter o próprio hash de forma estável.
