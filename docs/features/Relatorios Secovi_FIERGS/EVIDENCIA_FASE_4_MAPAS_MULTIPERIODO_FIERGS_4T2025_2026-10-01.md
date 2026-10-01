# Evidência da Fase 4 — mapas reconciliáveis FIERGS

**Data:** 01/10/2026

**Portão:** G4

**Base de entrada:** commit `713b55b` (G3 aprovado)

**Recortes de regressão:** FIERGS 4T2025 e FIERGS 2T2026

## Resultado

O portão G4 foi aprovado. A contagem `626` observada no relatório 4T2025 está correta: ela representa empreendimentos únicos do universo homologável, e não linhas de tipologia ou snapshots repetidos.

| Período | Linhas do cubo | Chaves únicas | Coordenadas válidas | Sem coordenada válida | Marcadores por mapa | Vertical | Horizontal |
|---|---:|---:|---:|---:|---:|---:|---:|
| 4T2025 | 626 | 626 | 626 | 0 | 626 | 505 | 121 |
| 2T2026 | 648 | 648 | 648 | 0 | 648 | 519 | 129 |

Os três mapas — padrão, estoque e preço — consomem a mesma coleção deduplicada. Portanto, cada um renderiza 626 empreendimentos em 4T2025 e 648 em 2T2026.

## Fatos confirmados

- O cubo granular já possui uma linha por chave canônica `UF/cidade#buildingId` nos dois períodos reais.
- `626 = 505 verticais + 121 horizontais` em 4T2025.
- `648 = 519 verticais + 129 horizontais` em 2T2026.
- Todos os empreendimentos aceitos nas duas coletas possuem latitude e longitude finitas e dentro dos limites cartográficos.
- Chácaras rejeitadas pela política não entram no cubo nem nos mapas.
- Tipologias e snapshots históricos são consolidados dentro do empreendimento antes da construção dos marcadores.

Assim, não houve redução artificial do número 626. A mudança tornou a deduplicação explícita, auditável e protegida contra regressão.

## Fluxo auditado

```text
universo homologável do cubo
        ↓ chave canônica única
empreendimentos únicos
        ↓ coordenada finita e dentro dos limites
empreendimentos georreferenciados
        ↓ coleção única compartilhada
mapa por padrão = mapa de estoque = mapa de preço
```

## Implementação

- A localização agora carrega `projectKey`.
- A coleção de mapas é construída por `Map<projectKey, location>`, permitindo no máximo um marcador por empreendimento.
- Coordenadas são validadas para latitude `[-85.05112878, 85.05112878]` e longitude `[-180, 180]`.
- Os três mapas usam a mesma coleção `report.locations`.
- A chave React do marcador passou a ser a chave canônica, não nome mais índice.
- O rótulo editorial passou de “pontos georreferenciados” para “empreendimentos georreferenciados”.

## Guardas adicionadas

O manifesto passou de 21 para 23 invariantes críticas:

- `map.projects.unique`: quantidade de linhas do cubo deve ser igual à quantidade de chaves únicas;
- `map.projects.rendered`: empreendimentos únicos com coordenada válida devem ser iguais às chaves efetivamente renderizadas.

Uma fixture repete propositalmente o mesmo cubo e comprova que:

- somente um marcador é produzido por chave;
- a duplicidade no cubo torna o relatório não homologável.

Outra fixture remove um empreendimento georreferenciado da coleção renderizada e comprova o bloqueio da exportação.

## Evidências autenticadas

- `.tmp/fiergs-phase4-reconciliation-4T2025.json`: 626/626 chaves, 626/626 marcadores, 23/23 guardas, `homologable: true`.
- `.tmp/fiergs-phase4-reconciliation-2T2026.json`: 648/648 chaves, 648/648 marcadores, 23/23 guardas, `homologable: true`.

## Arquivos afetados

- `src/features/panorama-secovi-fiergs/types.ts`
- `src/features/panorama-secovi-fiergs/report/model.ts`
- `src/features/panorama-secovi-fiergs/domain/reconciliation.ts`
- `src/features/panorama-secovi-fiergs/components/MarketSlides.tsx`
- `src/features/panorama-secovi-fiergs/__tests__/report-model.test.ts`
- `src/features/panorama-secovi-fiergs/__tests__/reconciliation-guards.test.ts`
- `scripts/fiergs-sales-reconciliation.mts`

## Verificações

- Testes focados de modelo, guardas e mapas: aprovados.
- Suíte completa FIERGS: 30 arquivos e 242 testes aprovados.
- `npm run build`: aprovado.
- `npx tsc --noEmit -p tsconfig.app.json`: permanece interrompido somente pelo arquivo local e não versionado `src/features/corretor/lib/v3/__tests__/rolandia-v067.test.ts`, que importa `@xmldom/xmldom` não instalado. O trabalho paralelo do Corretor não foi modificado nem incorporado.

Avisos já existentes de Recharts em JSDOM, Browserslist e tamanho de chunks não causaram falhas.

## Pendências

- Comparativos contextuais por trimestre: Fase 5.
- Generalização final das guardas de exportação: Fase 6.
- Geração e inspeção visual dos artefatos: Fase 7.

## Commit

Commit isolado identificado pela mensagem `fix(fiergs): reconcile unique map projects`.
