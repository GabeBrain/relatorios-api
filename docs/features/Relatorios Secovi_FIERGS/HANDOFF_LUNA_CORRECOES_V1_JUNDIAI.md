# Handoff Luna — trilha B (aguardando Opus)

**Status:** `LUNA_INTEGRATED_READY_FOR_COMMIT`
**Base confirmada:** `d66c5e5` · `main`
**Data:** 2026-08-27
**Portão:** `HANDOFF_OPUS_CORRECOES_V1_JUNDIAI.md` recebido com `Status: OPUS_READY`

## Trabalho concluído antes do portão

- Manifesto separado entre posição de saída (`page`) e lâmina de referência (`referenceSlide`).
- Lâmina de referência 3 movida para a posição de saída 7; referência 4 ocupa a posição 3.
- Seção institucional ajustada para começar na posição 5.
- `Content` passou a renderizar assets e componentes pela referência editorial, preservando a posição
  de saída para navegação, sumário e exportação.
- Teste de contrato adicionado para garantir 62 posições, 62 referências únicas e a permuta 3↔7.

## Verificação

- `npm.cmd test -- src/features/panorama-secovi-fiergs/__tests__/pdf-export.test.ts` — 3 testes aprovados.
- O teste precisou de permissão elevada porque o sandbox bloqueou a leitura do `vitest.config.ts`.

## Integração concluída

- Consumidores adotaram `cities[]` via `scopeCityLabel`/`scopeCitySlug` e a página passou a permitir
  seleção de múltiplos municípios monitorados.
- Períodos de fechamento passaram a ser gerados dinamicamente por `availableEndQuarters`.
- Slides 31–51 passaram a consumir `model.granular`, com ausência explícita, tipologias/padrões
  canônicos, subtotais e totais do cubo.
- A coluna “Faixa de Valor” é removida quando `valueRangeAvailable` é falso.
- A permuta institucional referência 3 → posição 7 foi integrada ao render/export.
- Erros cruzados de typecheck foram corrigidos em `ReportPaginator.tsx`, `pdf-export.ts` e no
  callback SVG de `dashboard-geobrain/Charts.tsx`.

## Verificação integrada

- `npx tsc -p tsconfig.app.json --noEmit` — aprovado.
- `npm.cmd test` — 27 arquivos / 230 testes aprovados.
- `npm.cmd run build` — bundle de produção gerado; avisos de Browserslist/importação dinâmica não
  bloqueantes.
- QA HTTP local da rota — HTTP 200. O executável `agent-browser` não está instalado nesta sessão;
  inspeção visual autenticada e geração do PDF real continuam como passo operacional no ambiente com
  token.

## Próximo passo

Revisar o diff final, atualizar os documentos vivos e criar o único commit combinado. Não fazer push
sem autorização.
