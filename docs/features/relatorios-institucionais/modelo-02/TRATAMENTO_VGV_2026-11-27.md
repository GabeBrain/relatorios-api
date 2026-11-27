# Tratamento de VGV indisponível — cinco regiões

27/11/2026 · Codex/Lucas · Base `2d8e0533` · Lucas autorizou a correção e o push da investigação nesta sessão.

## Contrato e comportamento

A especificação local `src/assets/openapi/api-geobrain.json`, schema `SalesResource`, permite `vgv_liquid_sales` do tipo `number | null`. Essa resposta contém vendas líquidas e VGV líquido, sem valores brutos e distratos que permitam recompor o dinheiro. O [caso real do Sul](ANALISE_SUL_REAL_2026-11-27.md) tem saldo líquido de unidades zero e campo monetário inválido/ausente no diagnóstico agregado.

Tratamento implementado:

- VGV nulo, ausente, vazio ou numericamente inválido fica indisponível nas janelas e grupos afetados; nenhuma conversão automática para zero ou estimativa por preço atual.
- Zero monetário observado é preservado. VGV vendido negativo também é preservado, inclusive com saldo líquido de unidades zero.
- Unidades e outros períodos/grupos continuam independentes. Totais e acumulados monetários que incluam a linha desconhecida continuam sem valor; não se somam apenas os contribuintes completos sob o rótulo de total regional.
- Mensagem específica informa município/UF, competência, grupo, campo e tipo de ausência. Quando as vendas líquidas são zero, explica por que isso não comprova dinheiro zero.
- O calculador compartilhado dos Modelos 02/03 ganhou a mensagem contextual antes da validação numérica existente. Fórmulas, INCC, calendário e política de cobertura foram preservados.
- No Imprensa, JSON inclui `monetaryTreatmentVersion: 2026-11-27-v1` e `sources[].monetaryIssues`: cidade/UF/mês/grupo/métrica/campo, motivo (`absent`, `null`, `empty`, `invalid`), unidades válidas e indicador `zeroNetSales`. Sem valor bruto inválido, credenciais ou cadastros individuais. Campos aditivos preservam o schema existente.
- CSV acrescenta linhas `pendencia-monetaria`. Critério e ressalvas aparecem nos Insights existentes e nas exportações. Ressalvas geradas ao calcular acumulados e composição permanecem nos quadros correspondentes, sem vazar para o quadro seguinte de unidades por estado.

**O tratamento não recupera o montante desconhecido de Santa Cruz do Sul/Compacto/maio2026.** VGV vendido de 2T2026 e acumulado de 2026 continuam pendentes de valor válido/contrato do provedor. A melhoria torna a causa explícita e verificável; não corrige a origem por suposição. Lacunas históricas anteriores a 2T2025 e os diagnósticos reais das outras quatro regiões continuam frentes abertas.

## Validação

- 208 testes em 14 arquivos dos Modelos 02/03, incluindo regressão dos seis agregados reais e 12 casos novos de tratamento monetário, cinco regiões, ausência versus zero, sinais, isolamento entre grupos, JSON/CSV e Insights.
- Build de produção (inclui typecheck) e lint dirigido aprovados.
- Quatro cenários Edge headless com rede externa bloqueada: VGV nulo e zero válido, 1440 claro e 390 escuro; Insights renderizados, sem overflow ou exceções, JSON e CSV pelo worker real. Captura de celular inspecionada. Evidências ignoradas em `.local-inputs/relatorios-lucas/modelo-02/monetary-browser-2026-11-27/`.
- Reutilizado o componente `Insights` e a apresentação de critérios/ressalvas existentes; nenhum primitive, rota ou fluxo de carregamento alterado. Cenários de loading, escopo, erro de catálogo e cancelamento permanecem cobertos pelos testes existentes, sem alegar nova observação autenticada desses fluxos.
- Sem nova coleta autenticada e sem confirmação do deploy Lovable. Push autorizado por Lucas; nenhuma escrita Monday.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`.
