# Validação do Fechamento — multi-cidade, resumo por cidade e % de fechamento

## 1. Seleção de múltiplas cidades (até 10)

O seletor atual permite 1 UF + 1 município. Passa a permitir marcar até 10 municípios da UF
selecionada, com botão "Carregar" para disparar as consultas.

- Novo componente `VFCityMultiSelect` (dentro de `validacao-fechamento/`), alimentado pela
  lista de cidades monitoradas do `GeoApiScopeEngine` (`useGeoApiScope`) — sem fallback IBGE.
- Trocar UF limpa a seleção de cidades.
- Ao atingir 10 cidades, as demais opções ficam desabilitadas com aviso "limite de 10 cidades".
- As consultas rodam em paralelo (uma por cidade) e o resultado é concatenado em uma
  **base única** de empreendimentos, com deduplicação por `building_id`.
- Barra de progresso mostra cidades concluídas / total; se uma cidade falhar, as demais
  continuam e o erro dela é exibido.

## 2. Header: filtro "Cidades carregadas"

Nova div no header, no mesmo padrão visual (label em cima, controle de 36px embaixo):

- Label: **Cidades carregadas**
- Seleção de **apenas 1 cidade por vez**, listando somente as cidades efetivamente carregadas,
  mais a opção "Todas".
- Esse filtro afeta as guias Resumo e Detalhamento (recorta a base única); a guia
  "Resumo por cidade" continua mostrando todas as cidades carregadas.
- A cidade ativa também aparece na barra de filtros ativos.

## 3. Nova guia "Resumo por cidade"

Terceira aba, ao lado de Resumo e Detalhamento. Mesma tabela do Resumo (mesmas medidas,
mesmas linhas de variação, mesma rolagem iniciando à direita), porém repetida em blocos —
um bloco por cidade carregada, com o nome da cidade como cabeçalho de seção.
Reaproveita `ResumoTable` e `computeResumo`, apenas particionando as linhas por cidade.

## 4. Linha "% de fechamento da cidade"

Nova linha na tabela Resumo (e em cada bloco do Resumo por cidade), exibida como medidor
de 0% a 100% (barra + valor).

Cálculo: para cada período do bucket, percentual de `building_id` distintos que possuem ao
menos um registro de `typologies_history` com `period` igual ao período de referência,
sobre o total de `building_id` distintos da cidade na base carregada.

```text
% fechamento = distintos(building_id com histórico no período) / distintos(building_id) 
```

## 5. Ícone (i) por medida

Cada medida da tabela (incluindo o % de fechamento) ganha um ícone `(i)` ao lado do nome,
com popover descrevendo a regra de cálculo — mesmo padrão já usado nos rankings do
Dash Geobrain.

## Detalhes técnicos

- `src/features/dashboard-geobrain/api.ts`: `fetchBuildings` já aceita `city` opcional; a
  orquestração multi-cidade fica em um novo hook `use-vf-data.ts` em
  `src/features/validacao-fechamento/`, que chama `fetchBuildings` por cidade, agrega o
  progresso e devolve `Building[]` unificado. `useDashboardData` não é alterado (evita
  regressão no Dash Geobrain).
- `aggregate.ts`: `ClosureRow` já carrega `city`; adicionar filtro por cidade em
  `applyVFFilters`, e nova métrica `pct_fechamento` em `METRICS` com `format: 'percent'`
  (novo formato) e agregação por `building_id` distinto no período.
- `ResumoTable.tsx`: suporte a `format: 'percent'` com renderização de medidor, e coluna
  de rótulo com o ícone (i)/popover; sem alterar a lógica de rolagem existente.
- `VFHeader.tsx`: adiciona o multi-select de cidades (carga) e o seletor "Cidades carregadas".
- `ValidacaoFechamento.tsx`: estado `selectedCities[]` + `activeCity`, persistidos no
  `sessionStorage` junto ao restante do estado; nova aba `resumo-cidade`.
- Atualizar `docs/projetos/LIVE_rebrain.md` com as mudanças.
