# PLAN — Correção da agregação trimestral de vendas no Relatório Secovi

**Data:** 2026-08-04
**Responsável pela implementação:** Terra
**Rota afetada:** `/rebrain/secovi`
**Arquivo principal atual:** `src/pages/TestesArquitetura.tsx`

> **Estado em 2026-08-04:** implementação e testes automatizados concluídos; falta somente
> a homologação manual no ambiente da área, com o token e a linha da Rubi.

## 1. Ticket e critério de aceite

Relato da área:

> Quando o relatório da Secovi é gerado, ele só considera o último mês do período.
> Empreendimentos com vendas em um mês anterior ao último mês do trimestre não são
> contabilizados corretamente.

O exemplo da **Rubi** funciona como gabarito:

| Fechamento | Venda | Estoque |
|---|---:|---:|
| 11/2025 | 49 | 607 |
| 12/2025 | 300 | 307 |
| 03/2026 | 100 | 207 |
| 06/2026 | 18 | 189 |

Resultado atual no Excel:

- `Vendas líquidas 4T2025 = 300`
- `Vendas líquidas 1T2026 = 100`
- `Vendas líquidas 2T2026 = 18`

Resultado esperado:

- `Vendas líquidas 4T2025 = 49 + 300 = 349`
- `Vendas líquidas 1T2026 = 100`
- `Vendas líquidas 2T2026 = 18`
- `Estoque por Tipologia = 189` — estoque continua sendo posição, portanto usa o
  fechamento mais recente e **não** é somado.

## 2. Causa confirmada

Em `buildRows`, os históricos são ordenados por data e percorridos corretamente, mas
o acumulador trimestral é substituído a cada registro:

```ts
qSales[q] = toNum(e.sold_in_period);
```

Assim, novembro grava `49` e dezembro substitui por `300`. O mesmo pressuposto de
"último registro" aparece em:

- `*Vendidos no trimestre`: usa `last.sold_in_period`;
- `VGV Vendas Brutas`: usa `last.sold_in_period × last.price`;
- estimativa de distratos: mantém apenas o último cálculo do trimestre.

O campo `sold_in_period` representa fluxo entre fechamentos. Isso é demonstrado pela
própria Rubi: o estoque cai `607 → 307 → 207 → 189` enquanto as vendas informadas são
`300 → 100 → 18`. Portanto, havendo mais de um fechamento no mesmo trimestre, as
vendas precisam ser somadas.

## 3. Princípio de agregação

Separar métricas de **fluxo** de métricas de **posição**:

| Métrica | Regra trimestral |
|---|---|
| `sold_in_period` | Somar todos os registros do trimestre |
| VGV de vendas | Somar `sold_in_period × preço do respectivo fechamento` |
| Distratos estimados | Somar os intervalos calculáveis do trimestre; não publicar total parcial |
| Estoque | Usar o registro mais recente do trimestre final |
| Preço, área, vagas, disponibilidade | Usar o registro mais recente aplicável |
| Quantidade lançada/preço de lançamento | Preservar a regra de origem já usada pelo relatório |

Valores negativos de `sold_in_period` devem ser preservados na soma, pois podem
representar ajuste/distrato registrado pela base. `null` significa ausência de dado e
não deve apagar o acumulado; zero é um valor válido.

## 4. Implementação proposta

### Fase A — Extrair uma função pura e testável

Criar:

`src/features/relatorios-secovi/quarterly-history.ts`

Responsabilidades:

1. Receber os registros de uma única `typology_id`.
2. Ordená-los cronologicamente.
3. Ignorar períodos inválidos com segurança.
4. Agrupar cada registro por trimestre.
5. Devolver, por trimestre:
   - `sales`;
   - `hasSalesData`;
   - `grossSalesVgv`;
   - `estimatedCancellations`;
   - `lastEntry`;
   - informação de cobertura necessária para não apresentar estimativa parcial.

Formato sugerido:

```ts
interface QuarterlyHistory {
  sales: number;
  hasSalesData: boolean;
  grossSalesVgv: number | null;
  estimatedCancellations: number | null;
  lastEntry: Record<string, unknown>;
}

function aggregateTypologyHistoryByQuarter(
  entries: Record<string, unknown>[],
): Map<string, QuarterlyHistory>
```

Regras internas:

- `sales += sold_in_period ?? 0`;
- `hasSalesData` fica verdadeiro se ao menos um registro possuir venda numérica,
  inclusive zero;
- `lastEntry` é o registro de maior período dentro daquele trimestre;
- VGV acumula venda multiplicada pelo preço do mesmo registro;
- se houver venda sem preço utilizável, não inventar VGV: retornar `null` para o
  trimestre ou registrar cobertura incompleta;
- distrato de um intervalo continua usando
  `estoqueAtual - estoqueAnterior + vendas`;
- se qualquer intervalo necessário do trimestre não puder ser calculado, o distrato
  trimestral deve ser `null`, evitando publicar uma soma parcial como se fosse completa.

Também corrigir `periodToQuarter`: `new Date(...)` inválido não lança exceção. Conferir
`Number.isNaN(date.getTime())` antes de formar o trimestre.

### Fase B — Integrar no relatório

Em `buildRows`:

1. Substituir `qSales`/`qDistratos` construídos por sobrescrita pelo resultado da função
   pura.
2. Preencher cada `Vendas líquidas <trimestre>` com a soma daquele trimestre.
3. Preencher `*Vendidos no trimestre` com a soma do trimestre final do relatório,
   e não com `last.sold_in_period`.
4. Preencher `*Distratos no trimestre` com a agregação do trimestre final, respeitando
   `null` quando a estimativa estiver incompleta.
5. Calcular `VGV Vendas Brutas` com a soma mensal ponderada pelo preço de cada registro
   no trimestre final.
6. Manter `VGV Distratos = 0` enquanto a API não fornecer esse valor diretamente,
   preservando a limitação já comunicada na interface.
7. Manter estoque, preço atual, disponibilidade e demais snapshots baseados no último
   registro; nunca somar snapshots mensais.

Não alterar a coleta da API nem o `GeoApiScopeEngine`: os dados necessários já chegam
em `typologies_history`; o defeito está somente na transformação para o Excel.

### Fase C — Testes automatizados

Criar:

`src/features/relatorios-secovi/__tests__/quarterly-history.test.ts`

Casos obrigatórios:

1. **Regressão Rubi:** novembro/2025 `49` + dezembro/2025 `300` resulta em
   `4T2025 = 349`; março/2026 resulta em `1T2026 = 100`; junho/2026 resulta em
   `2T2026 = 18`.
2. **Último mês zerado:** janeiro `5`, fevereiro `7`, março `0` resulta em `12`,
   e não zero.
3. **Entradas fora de ordem:** o resultado e o snapshot final permanecem corretos.
4. **Mês ausente:** somar apenas os fechamentos existentes, sem exigir três registros.
5. **Venda negativa:** `10 + (-1) = 9`.
6. **Venda nula:** não apagar vendas anteriores; distinguir trimestre sem dado de
   trimestre com venda zero.
7. **Tipologias separadas:** duas `typology_id` do mesmo empreendimento não podem ser
   misturadas.
8. **Snapshot:** estoque trimestral/final deve ser o último valor, nunca a soma.
9. **VGV:** usar o preço de cada fechamento na multiplicação antes de somar.
10. **Período inválido:** ignorar sem criar trimestre `NaN`.

Se possível, exportar `buildRows` ou criar uma camada fina testável para acrescentar um
teste de integração que confira as colunas finais do objeto `Row`, não apenas o helper.

Comandos de verificação:

```powershell
cmd /c npm test
cmd /c npm run build
```

Critério automatizado:

- todos os testes existentes continuam verdes;
- novos testes de agregação verdes;
- TypeScript e build de produção sem erro.

## 5. Homologação manual com Gabriel/Amanda

### Preparação

1. Publicar a versão corrigida no ambiente usado pela área.
2. Acessar `/rebrain/secovi`.
3. Usar o mesmo escopo geográfico, tipos e status do relatório reportado.
4. Gerar novamente o Excel abrangendo desde o 4T/2025.

### Conferência mínima

Na linha da tipologia de **Rubi** mostrada no ticket, confirmar:

| Campo | Esperado |
|---|---:|
| Vendas líquidas 4T2025 | 349 |
| Vendas líquidas 1T2026 | 100 |
| Vendas líquidas 2T2026 | 18 |
| Estoque por Tipologia | 189 |

Depois selecionar ao menos mais dois empreendimentos:

- um com vendas em dois ou três meses do mesmo trimestre;
- um com vendas somente no último mês.

Para cada linha, abrir o histórico da tipologia no GeoBrain e conferir:

```text
Excel do trimestre = soma da coluna Venda de todos os fechamentos daquele trimestre
Estoque no Excel = estoque do fechamento mais recente
```

Também verificar:

- nenhuma tipologia duplicada ou ausente;
- trimestres antigos que tinham um único fechamento permanecem iguais;
- aba `ESGOTADOS` segue a mesma regra;
- nome das abas e download do XLSX continuam funcionando;
- totais/gráficos da tela, se exibidos, continuam coerentes com o arquivo exportado.

### Evidências para fechar o ticket

Guardar:

1. print do histórico da Rubi;
2. print ou recorte do novo Excel mostrando `349 / 100 / 18 / 189`;
3. resultado dos testes automatizados;
4. link/identificador da versão publicada.

## 6. Critério de pronto

O ajuste só está concluído quando:

- o caso Rubi retorna `349` no 4T/2025;
- vendas de meses anteriores ao último fechamento entram no trimestre;
- métricas de posição continuam usando o último fechamento;
- testes e build passam;
- a exportação foi homologada no ambiente usado pela área;
- `docs/projetos/LIVE_rebrain.md` foi atualizado com a conclusão;
- `.claude/settings.local.json` permanece fora do commit.

## 7. Resposta pronta para o ticket

Usar somente após publicação e homologação:

> Olá, Amanda e Diego! Identificamos a causa do problema no Relatório Secovi. Na
> consolidação trimestral, cada fechamento mensal estava substituindo o anterior,
> fazendo com que apenas o último mês do trimestre aparecesse no Excel.
>
> Ajustamos a regra para somar as vendas de todos os fechamentos pertencentes ao
> trimestre, mantendo estoque, preço e disponibilidade como posição do fechamento
> mais recente. Também validamos o caso da Rubi: o 4T/2025 passou a considerar as
> 49 vendas de novembro mais as 300 de dezembro, totalizando 349 unidades.
>
> A correção foi testada e publicada no Relatório Secovi da Rebrain. Podem, por
> favor, gerar novamente a planilha e nos confirmar se o resultado está correto
> para os demais empreendimentos?
