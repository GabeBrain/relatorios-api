# Evidência da Fase 5 — comparativos contextuais multiperíodo FIERGS

**Data:** 01/10/2026

**Portão:** G5

**Base de entrada:** commit `38cf8e5` (G4 aprovado)

## Resultado

O portão G5 foi aprovado. Os comparativos contextuais agora respondem explicitamente ao trimestre de fechamento, sem a antiga condição genérica `trimestre >= 2` que mantinha “1º semestre” em relatórios de 3T e 4T.

| Fechamento | Comparativo contextual | Fluxos | Fotografias de estoque/IVV |
|---|---|---|---|
| 1T | 1T anterior × 1T atual | valor do 1T | fotografia do 1T |
| 2T | 1S anterior × 1S atual | soma 1T + 2T | fotografia do 2T |
| 3T | 9M anterior × 9M atual | soma 1T + 2T + 3T | fotografia do 3T |
| 4T | ano anterior × ano atual | soma 1T + 2T + 3T + 4T | fotografia do 4T |

O FIERGS 4T2025 passa a exibir `COMPARATIVO ANUAL`, com rótulos `2024` e `2025`. O FIERGS 2T2026 preserva `COMPARATIVO 1º SEMESTRE`, com `1S2025` e `1S2026`.

## Causa confirmada

Três consumidores do relatório chamavam a função de comparação com:

```text
firstSemester: Number(endQuarter[0]) >= 2
```

Essa condição era verdadeira para 2T, 3T e 4T. Por isso, um fechamento anual continuava destacando apenas o primeiro semestre, embora a série disponível cobrisse o ano completo.

## Alteração metodológica

- A política contextual passou a ser determinada pelo trimestre final.
- Fluxos só são acumulados quando todos os trimestres necessários estão presentes.
- Métricas de fotografia usam exclusivamente o fechamento equivalente.
- Ausência permanece `null`; não é convertida em zero.
- Variação não é calculada quando o período anterior é zero ou quando qualquer lado está incompleto.
- O comparativo trimestral equivalente continua disponível ao lado do contextual.
- O acumulado móvel de 12 meses continua separado e não é chamado de semestre ou ano-calendário.

## Tipos editoriais

Foram formalizados os tipos:

- `quarter`;
- `first_semester`;
- `nine_months`;
- `year_to_date` — apresentado editorialmente como `COMPARATIVO ANUAL` no 4T;
- `rolling_12_months`.

## Casos de teste

A suíte cobre:

- 1T2025: `1T2024 × 1T2025`;
- 2T2026: `1S2025 × 1S2026`;
- 3T2025: `9M2024 × 9M2025`;
- 4T2025: `2024 × 2025`;
- fluxo incompleto sem total artificial;
- fotografia sem soma de trimestres;
- período anterior igual a zero sem divisão inválida;
- acumulado móvel de 12 meses com nomenclatura independente;
- renderização do deck de 75 páginas em 4T2025 sem “1º semestre” nos blocos contextuais.

## Arquivos afetados

- `src/features/panorama-secovi-fiergs/domain/period-comparisons.ts`
- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`
- `src/features/panorama-secovi-fiergs/__tests__/period-comparisons.test.ts`
- `src/features/panorama-secovi-fiergs/__tests__/fiergs-editorial-blocks.test.tsx`

## Verificações

- Testes focados: 2 arquivos e 7 testes aprovados.
- Suíte completa FIERGS: 30 arquivos e 243 testes aprovados.
- `npm run build`: aprovado.
- `npx tsc --noEmit -p tsconfig.app.json`: permanece interrompido somente pelo arquivo local e não versionado `src/features/corretor/lib/v3/__tests__/rolandia-v067.test.ts`, que importa `@xmldom/xmldom` não instalado. Nenhum arquivo do Corretor foi modificado ou incorporado.

Avisos já existentes de Recharts em JSDOM, Browserslist e tamanho de chunks não causaram falhas.

## Pendências

- Generalização final e teste de bloqueio das exportações: Fase 6.
- Geração e inspeção visual dos artefatos 4T2025 e 2T2026: Fase 7.

## Commit

Commit isolado identificado pela mensagem `fix(fiergs): adapt contextual comparisons by quarter`.
