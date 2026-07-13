# Ajustes na página "Validação do Fechamento"

## 1. Segmentador de granularidade (`VFHeader.tsx`)
- Adicionar a label `<label class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Visualização</label>` acima do grupo de chips `vf-chip-group`.
- Envolver label + `vf-chip-group` em um container com as classes:
  ```
  flex flex-wrap items-end gap-3 flex-1 min-w-[320px]
  ```
- Ajustar o layout do header para manter o botão "Filtros", o seletor `GeoApiScopeSelector` e o novo segmentador sem quebras visuais.

## 2. Ordenação dos filtros (`aggregate.ts`)
Alterar `extractVFOptions` para exibir as opções temporais do mais recente para o mais antigo:
- **Ano**: `years` em ordem decrescente (ex.: 2026, 2025, 2024…).
- **Trimestre**: `quarters` em ordem decrescente por ano e, dentro do mesmo ano, por trimestre decrescente (ex.: 04T/26, 03T/26… 01T/25).
- **Período**: já está decrescente (YYYY-MM); manter comportamento.

## 3. Tabela resumo alinhada à direita (`ResumoTable.tsx`)
- O wrapper `vf-card overflow-auto` da tabela `vf-resumo` deve iniciar com a barra de rolagem no máximo à direita, deixando a coluna **"% Var. Total"** visível por padrão.
- Implementar via `useRef` + `useLayoutEffect`/`useEffect` chamando `scrollTo({ left: scrollWidth, behavior: 'auto' })` assim que os dados forem renderizados.
- Garantir que o comportamento seja reexecutado quando `granularity` ou `buckets` mudarem.

## 4. Verificação
- Build passa sem erros.
- Visualização no preview confirma:
  - label "Visualização" acima do segmentador;
  - anos/trimestres/períodos em ordem decrescente;
  - tabela resumo exibe a coluna "% Var. Total" sem precisar rolar manualmente.

## Arquivos afetados
- `src/features/validacao-fechamento/VFHeader.tsx`
- `src/features/validacao-fechamento/aggregate.ts`
- `src/features/validacao-fechamento/ResumoTable.tsx`
- `docs/projetos/LIVE_rebrain.md` (atualização do doc vivo, se aplicável)