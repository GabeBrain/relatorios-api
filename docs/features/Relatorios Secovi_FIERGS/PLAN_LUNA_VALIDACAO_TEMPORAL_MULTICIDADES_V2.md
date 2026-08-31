# Plano terminal — Luna — consistência temporal multicidades V2

**Data:** 31/ago/2026
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Escopo de homologação:** SP · Guarujá · Praia Grande · Santos · São Vicente · fechamento `2T2026`.
**Pré-requisito obrigatório:** credencial GeoBrain fornecida ao processo por variável efêmera ou sessão autenticada. Não copiar token, e-mail ou senha para `.env`, código, fixture versionada, log ou PDF.

## Estado de execução — Codex, 31/ago/2026

O motor já foi ajustado nesta árvore de trabalho:

- `domain/temporal-normalization.ts` normaliza cada município antes do consolidado;
- fluxos mensais são somados, mas total trimestral explícito tem precedência;
- estoque, IVV e preços usam o último snapshot disponível até o fechamento;
- `periodToQuarter` reconhece `2T2026` e `2ºT/2026`;
- testes de unidade e integração cobrem mês + trimestre, snapshot e regressão no modelo.
- IVV, ticket e preço por m² passaram a usar **média ponderada pelo estoque final** da mesma cidade,
  período, segmento e recorte; se o endpoint não devolver estoque correspondente, a média simples é
  fallback explícito para preservar o dado, nunca um peso zero fabricado.
- auditoria autenticada de horizontais no fallback legado: Guarujá (0/7), Praia Grande (3/65), Santos
  (0/0) e São Vicente (0/3) de Condomínios de Casas aceitos. Loteamentos, outros e subtipo não
  comprovado ficam fora da política Secovi; não excluir condomínios.
- o endpoint `v2/building-with-history` respondeu 401 ao token da sessão; a V2 deve registrar se
  usou o fallback legado e a paridade de autenticação v2 continua pendência de infraestrutura.

Portanto, a tarefa da Luna começa pelo **preview/PDF multicidades autenticado** e pela auditoria de
aceite; não deve reimplementar o normalizador sem evidência que contradiga o contrato acima. A coleta
de prédios deve informar se utilizou v2 ou o fallback legado.

## Evidência já observada

- `POST /public-api/auth/login` respondeu com token válido usando credencial local autorizada.
- `GET /temporal-analysis-city/sales` de Santos respondeu com datas de fechamento trimestral.
- A mesma chamada para Guarujá retornou 100 linhas e **22 períodos distintos** na janela de 17 trimestres, incluindo `2022-06-01`, `2022-07-01`, `2022-09-01`, `2022-10-01` e `2022-12-01`.

Logo, não assumir uma frequência única por cidade, endpoint ou trimestre. A implementação atual concatena as
linhas antes de classificá-las; isso é o defeito a provar/corrigir.

## Resultado esperado

Entregar a auditoria reproduzível que demonstre, por cidade/endpoint/grupo/segmento, o período efetivamente
usado em cada trimestre e o preview/PDF das quatro cidades. Nenhuma página V2 multicidades entra no
manifesto antes desse portão passar.

## Fase 0 — preservar e medir o comportamento atual

1. Criar script de diagnóstico local, fora do bundle, por exemplo
   `scripts/audit-panorama-temporal-multicity.mts`.
2. Autenticar somente em memória. Aceitar `GB_ACCESS_LOGIN` e `GB_ACCESS_PW` no ambiente do processo;
   falhar com instrução clara se estiverem ausentes.
3. Paginar até `meta.last_page` para cada combinação:
   - cidades: Guarujá, Praia Grande, Santos, São Vicente;
   - endpoints: `sales`, `stock`, `ivv`, `medium-prices`, `medium-prices-meter`;
   - `group_by`: Padrão e Tipologia;
   - período: `2022-04-01` a `2026-06-30`.
4. Salvar somente um resumo não sensível em `.tmp/`: quantidade de linhas, `period` distintos,
   formato de cada período, primeiro/último observado e páginas lidas. Não salvar payload bruto no Git.
5. Confirmar se existem chaves trimestrais explícitas (`1T2026`, variantes) ou somente datas.

Comando alvo para o operador, após fornecer as variáveis apenas à sessão atual:

```powershell
cmd /c npx tsx scripts/audit-panorama-temporal-multicity.mts --uf SP --cities "Guarujá,Praia Grande,Santos,São Vicente" --end-quarter 2T2026
```

## Fase 1 — contrato de normalização

Criar módulo puro, sugerido em `src/features/panorama-secovi-fiergs/domain/temporal-normalization.ts`.

Cada linha normalizada deve conservar:

```ts
type PeriodKind = 'month' | 'quarter' | 'unknown';
type TemporalObservation = {
  city: string;
  endpoint: string;
  group: string;
  segment: 'Vertical' | 'Horizontal';
  observedPeriod: string;
  periodKind: PeriodKind;
  quarter: Quarter | null;
  value: number | null;
};
```

Regras:

| Métrica | Normalização municipal por trimestre | Consolidação |
|---|---|---|
| `sales` / VGV vendido | se houver observação trimestral, usar somente ela; senão somar meses distintos do trimestre | somar cidades normalizadas |
| `stock` / VGV estoque | escolher a observação mais recente até o fim do trimestre | somar snapshots municipais |
| `ivv` | escolher fechamento municipal; não somar nem média de períodos | só consolidar com peso homologado; sem peso, exibir por cidade ou estado metodológico aberto |
| preços | escolher fechamento municipal | média ponderada apenas com denominador homologado |

`unknown` deve manter o dado fora do total e gerar aviso de cobertura; jamais virar zero.

## Fase 2 — testes de regressão

Criar fixture pequena, sem dados de cliente, contendo:

- uma cidade com três meses no trimestre;
- uma cidade com uma observação trimestral no mesmo trimestre;
- uma cidade que mistura mês e trimestre;
- um período textual trimestral (`2T2026`);
- snapshot e taxa com meses diferentes de atualização.

Cobrir pelo menos:

1. `2T2026`, `2026-06-01` e `06/2026` são reconhecidos;
2. venda mensal soma três meses;
3. venda trimestral não é triplicada;
4. mistura mensal + trimestral tem precedência explícita e aviso;
5. estoque pega o último snapshot, não a soma;
6. IVV não é somado;
7. total multicidade é igual à soma dos totais municipais já normalizados;
8. período ilegível resulta em `null`/aviso, não em `0`;
9. paginação não perde períodos depois da página 1.

## Fase 3 — integração e QA

1. Integrar o normalizador antes de `marketBlock` e substituir a concatenação cega em `api.ts`.
2. Adicionar cobertura temporal e avisos ao `PanoramaReportModel`.
3. Regerar o relatório das quatro cidades em `2T2026`.
4. Comparar, por trimestre, o consolidado contra a soma dos quatro municípios para vendas e estoque.
5. Só após o aceite numérico, inserir as três páginas condicionais multicidades no manifesto V2.

## Comandos de aceite

```powershell
cmd /c npm test -- --run src/features/panorama-secovi-fiergs
cmd /c npm run typecheck
cmd /c npm run build
git diff --check
```

## Handoff da Luna

Informar sem segredos:

- cobertura por cidade/endpoint e frequência identificada;
- regra aplicada para cada métrica;
- diferenças antes/depois por trimestre;
- testes executados;
- se o relatório multicidades ficou apto ou bloqueado;
- arquivos alterados e pendências metodológicas.
