# Recuperação do VGV por consulta à API

27/11/2026 · Codex/Lucas · Base `0d712957` · Pedido de Lucas: corrigir para buscar o valor na API. Continuação da autorização de publicação da mesma frente.

## O que o relatório passa a consultar

As cinco regiões usam o mesmo fluxo. A coleta normal mantém quatro séries municipais e histórico vertical por cidade autorizada. Ao concluir uma fonte de lançamentos/vendas com campo monetário inválido, o coletor agenda somente os meses afetados:

1. Nova consulta ao mesmo `/public-api/temporal-analysis-city/releases` ou `/sales`, por `Padrão`, do primeiro ao último dia do mês.
2. Se a resposta corrigida não puder ser utilizada, consulta o mesmo endpoint e mês com `group_by=Tipologia` e `type[]=Vertical`.

São chamadas autenticadas com o token pessoal já usado pelo relatório, na fila existente, sem cache. Preservados limite de duas chamadas ativas, intervalo de 500 ms, paginação completa, validação de cidade/UF/segmento, retentativas, pausa global 429 e cancelamento. Meses únicos por fonte geram no máximo uma recuperação por padrão e uma alternativa por tipologia. Fonte válida não gera chamadas adicionais.

O total de tarefas do painel é atualizado quando as novas consultas são descobertas, antes de concluir a tarefa que as originou. O relatório continua com cinco fontes principais por cidade; tentativas de recuperação ficam anexadas à fonte original, com HTTP, contagem de requisições e horário próprios.

## Quando o valor pode ser utilizado

**Nova resposta por padrão:** fonte completa, mesmos grupos, mesmas unidades por grupo e valores monetários já conhecidos preservados a meio centavo. Todos os campos monetários do mês precisam ser válidos. Uma visão derivada usa a resposta corrigida; a resposta original não é sobrescrita. Recuperação utilizável tanto no total quanto nos padrões.

**Alternativa por tipologia:** fonte completa e no mesmo escopo, competências/grupos sem duplicação, quantidades inteiras e todos os valores monetários válidos. A soma mensal de unidades precisa coincidir exatamente com a soma por padrão. O dinheiro recebido passa a compor somente o total municipal/regional daquele mês; não é distribuído entre padrões. Se faltarem padrões, sua composição permanece parcial.

A cobertura temporal continua sendo verificada pelo calculador de unidades existente antes de aceitar o total alternativo. Para cada mês, aplica-se o mesmo INCC-DI até o fechamento e a mesma conversão para milhões. Zero e dinheiro negativo são aceitos quando observados na resposta alternativa, nunca inferidos do saldo líquido de unidades.

Se a API continuar sem dinheiro válido, retornar vazio, falhar ou divergir nas unidades, o valor permanece pendente com o diagnóstico anterior. Não há uso de preço cadastral atual, diferença de estoque, rateio ou preenchimento presumido. Esta mudança não recompõe fotografias históricas ausentes anteriores a 2T2025.

## Auditoria e interface

- `sources[].monetaryRecovery` no JSON registra mês, estratégia (`pattern-refetch`, `reconciled-typology-total`, `unresolved`), resolução, escopo (`patterns-and-total`, `total-only`, `none`), nominal/quantidades reconciliadas e metadados das tentativas. Não exporta respostas brutas ou credenciais.
- As ocorrências monetárias originais ficam preservadas e ganham referência ao resultado/escopo da recuperação. CSV contém linhas `recuperacao-monetaria`, além das ocorrências originais; Insights/ressalvas explicam a origem alternativa e a restrição ao total.
- Reutilizados `ReportLoading`/`ReportGenerationPanel`, controles e Insights existentes. Mensagem real da coleta identifica `Recuperar VGV`, mês, município e agrupamento; tarefas adicionais integram os contadores reais.
- Alterações confinadas ao Modelo 02; fórmulas e coleta do Modelo 03 não foram alteradas nesta entrega.

## Validação e limite real

Suítes 02/03 aprovadas com 218 testes, seguidas de seis casos adicionais no teste de recuperação (16 casos finais nesse arquivo;224 casos distintos ao todo). Cobertura inclui cinco regiões, a aplicação dos seis agregados reais de Santa Cruz do Sul com resposta alternativa sintética, novo valor por padrão, trimestre/acumulado por tipologia, sinais/zero observado, divergência, dinheiro nulo, falha HTTP, cancelamento, escopo e ausência de consultas extras para fonte válida. Build/typecheck e lint dirigido aprovados.

Quatro cenários Edge headless passaram na **página real** com API interceptada: resposta corrigida por padrão, recuperação por tipologia em 390 px, divergência recusada e cancelamento em 429. Houve espera deliberada de 1,4 s nas consultas adicionais; painel Brain/tempo/progresso/cancelamento visíveis e captura inspecionada. JSON baixado pela ação real da página e reaberto, com estratégia e valor trimestral conferidos. Sem exceções/overflow. Evidências locais ignoradas em `.local-inputs/relatorios-lucas/modelo-02/recovery-browser-2026-11-27/`.

**Esses ensaios não comprovam a resposta autenticada real de Santa Cruz.** Não há token pessoal configurado para script nesta sessão. Após deploy, Lucas precisa gerar novamente o Sul/3T2026: a página fará as consultas com o login dele e o novo JSON mostrará se houve resposta utilizável. Não afirmar que o montante de maio já foi obtido. As outras regiões ainda precisam de arquivos reais.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain 381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`. Sem escrita.
