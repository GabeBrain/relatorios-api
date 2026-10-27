# Seleção e amostra operacional — 27/10/2026

Estado: seleção e arquivo candidato validados localmente; **não importar, não homologado**. Gabriel/sessão. Prioridade: arquivo para Nicolas/Belogic, revisão proposta com Diego em29/10 e preparação até30/10, condicionadas a contrato/aceite. Não houve push, deploy, escrita Geobrain, mensagem ou atualização Monday.

## O que a reunião efetivamente definiu

Fonte: SE/.local-inputs/reunioes/2026-10-26/transcricao_reuniao.txt, linhas74–144. Transcrição automática mistura vozes: inclusive respostas dirigidas a Edgar aparecem como Gabriel ou Speaker2. Preservar conteúdo, não usar etiquetas como prova de autoria.

- Linhas74–94: seleção antes do cálculo; quatro **períodos**, corrigindo explicitamente quatro meses; horizontal e vertical separados.
- Linhas97–116: investigar preço e preparar INCC; nenhuma série/fórmula final de preço aprovada nesse trecho.
- Linhas117–130: Excel para Nicolas, formato a conferir na tabela de destino; distratos explicitamente retirados. Venda/estoque e depois preço/venda líquida/estoque são mencionados. “Evolução da venda líquida” não estabelece um quarto campo nem se o valor é fluxo ou acumulado.
- Linhas131–144: arquivo até sexta e revisão quinta de manhã; disponibilidade de Nicolas é incerta. A discussão posterior de PPT refere-se ao relatório vocacional, não a esta entrega.
- [Card13096757074](https://brain381753.monday.com/boards/18398428946/pulses/13096757074), releitura27/10: atualizações5664089049 e5664210781 reiteram quatro períodos, seleção de tipologia, estoques0–5 e>30 para coleta,6–30 candidatos, alternância da metade e proibição de estimativas consecutivas.

## Busca do contrato

Consultados Drive (pasta-mãe e buscas “importação estimativas”, “importação”, “IVV”), cinco comentários do card e os dois anexos06/10, agora baixados/abertos. Gmail bloqueado por reautenticação; não alegar busca completa do correio. Nenhum exemplar comprovadamente aceito pela importação Belogic foi localizado nesse escopo.

Anexos3298910827/3298910845, preservados em `.local-inputs/estimativas-vendas/operacional-20261027/ivv-producao.xlsx` e `ivv-homologacao.xlsx`:

- Produção: uma aba,57 linhas de dados,31 colunas, sem IDs estáveis de base/empreendimento/tipologia demonstrados no cabeçalho; campo de estoque do empreendimento repetido.
- Homologação: Dicionário, Detalhes (856 linhas/32colunas) e Modelo calculo INCC. Há fórmulas de IVV, projeção de distratos e exemplos de INCC-M/DI; estes cálculos antigos não substituem a direção26/10 nem o motorFinotti.
- Dicionário: estoque do empreendimento = soma das tipologias no último período; periodicidade = atualização da cidade; Estimado = condição do último período; quantidade lançada = da tipologia; Vendido/Distratos/Líquido = acumulado dos três últimos períodos; Total Líquido = histórico inteiro. **Não mapear esses agregados para venda mensal.**
- O dicionário reforça o limiar por empreendimento como hipótese, mas ainda não confirma a aplicação no novo processo. Não unir por nome/área como se fossem IDs. Fórmulas CEILING dos anexos não são regra de arredondamento aprovada para o Finotti.
- O arquivo Produção tem estilo XML recusado pelo openpyxl; leitura alternativa SheetJS concluída sem alterar o original. Nenhuma fórmula externa/macros executadas.
- ManualGeobrain consultado: descreve relatórios e análise temporal; não foi encontrado contrato de importação de estimativas. Manifesto/manual baseline agosto2026 permanece distinto da API atual.

## Mapa de entrada e saída

Nomes da saída abaixo são **internos candidatos**, não cabeçalhos Geobrain. Fonte: IVV/Qlik por empreendimento/tipologia/competência; API e exportaçãoAnáliseTemporal não comprovam layout de retorno.

| Informação | Entrada conferida / interpretação | Saída candidata e pendência |
|---|---|---|
| Identidade | ID Empreendimento + ID Tipologia; guardar como texto | buildingId/typologyId; baseId nulo. Nicolas confirma chave, criação de base e idempotência |
| Competência | Mês de referência MM/AAAA; lançamento DD/MM/AAAA | cutoff, periodStart, competence emAAAA-MM; formato externo pendente |
| Granularidade | Cada linha é tipologia/período; modeloFinotti é empreendimento | Piloto calcula só empreendimento com uma tipologia; sem rateio; limiar de estoque agregado é hipótese |
| Periodicidade | Intervalos entre linhas não são cadastro oficial de cadência | cadenceMonths=1ou3, hipóteses separadas; trimestral projeta três meses e entrega diferença acumulada do intervalo, sem dividir por3 |
| Unidades | Qtd Lançada no corte | units; exige inteiro positivo/estável na janela candidata |
| Fluxo | Venda Líquida recebida pode representar intervalo de coleta | estimatedNetPeriod = acumulado final menos inicial; confirmar coluna-alvo |
| Acumulado | Quantidade menos estoque no corte, conforme referência | initialCumulative/estimatedCumulative; não somar fluxo parcial para reconstruir desde lançamento |
| Estoque | Estoque Final por tipologia; soma no empreendimento | initialStock/finalStock; final = inicial menos líquido previsto sob oferta constante |
| Tipo/padrão | Horizontal/Vertical e padrão no corte | Mantidos separados; sem fallback automático para método alternativo |
| Preço | Políticas em conflito:INCC, manter anterior mensal, estudosFinoti | price=null, pricePolicy=PENDENTE. Sem correção, conversão/m² ou preenchimentozero |
| Origem | Foi estimado? por linha; Sim/Não explícitos, outro valor desconhecido | intendedEstimation=true no alvo candidato; sem herdar flag atual do cadastro para histórico |
| Lote | ivv_batch_id não é flag de estimativa | Nulo até contrato; execução interna/hash não substituem ID do backend |
| Distratos/brutas | Distratos históricos podem existir | estimatedCancellations/estimatedGross nulos. Não prever distratos nem inventar brutas=líquidas |
| Arredondamento | Motor original arredonda acumulado inteiro | Fluxo por diferença de inteiros; sem CEILING adicional nem ajuste para caber no gabarito |

## Implementação e recorte

Núcleo puro `src/features/estimativas-vendas/operational/selection.mjs`, sem API/UI/escrita. Separado dos motores existentes. Seleção usa motivos múltiplos, não descarta registros sem explicação. Todos os resultados têm importable=false; não existe adaptador de importação nessa etapa.

Script `scripts/diagnostics/estimativas-operational-sample.mjs` reaproveita horizontal.js/vertical.js e parâmetros versionados. Lê os originais horizontal/Cuiabá/BH já auditados, com hash por fonte/modelo. Não atualiza a consulta nem declara que outubro está sem coleta hoje. Corte setembro/2026; mensal outubro e trimestral outubro–dezembro são hipóteses de revisão, não lote autorizado para meses futuros.

Política **conservadora proposta**: quatro posições consecutivas marcadasNão; quantidade constante; statusAtivo na janela; fluxo consistente com estoque; uma tipologia no empreendimento; idade suportada. Exigir quatro coletas reais, consecutividade e status em toda a janela vai além da regra textual de quatro períodos: revisar antes de promover a produção. Mudança de oferta, tipologia ausente, cadência irregular e flag desconhecida permanecem pendências, não zeros. Uma linha no alvo impede candidato; a ausência no snapshot antigo não prova ausência atual. Partição50/50 não foi inventada.

Resultado:2.305 empreendimentos das três fontes,4.610 avaliações (duas hipóteses de cadência por ID).3.974 avaliações orientadas à coleta;635pendentes;1candidato condicional calculado. Não interpretar esses números como seleção operacional de4.610 empreendimentos nem desempenho dos modelos. Razões se sobrepõem. Falta de candidato vertical/trimestral sob esta política não significa que não seja possível estimar esses produtos; não foram relaxadas condições para fabricar exemplos.

Caso: ID87699, tipologia152569, Jardim Terra Azul–Fase1, Campinas, LoteamentoAberto.845 unidades,833 acumuladas/12estoque emsetembro;4posiçõesjunho–setembro marcadasNão. Referência projeta835acumuladas, **2vendas líquidas e10estoque emoutubro**. Posição acima95% usa cauda do motor original; não é validação de precisão nem prova de queOctober precise estimativa. Guarda a versão e k≈0,263507.

## Arquivos e reprodução

Saídas brutas ignoradas em `.local-inputs/estimativas-vendas/operacional-20261027/`:
- `CANDIDATO_NAO_IMPORTAR_2026-10-27.xlsx`: estimativa candidata,10exemplos de seleção com motivos,4linhas históricas do caso e manifesto. Saída do motor congelada; fórmulasExcel apenas tornam conservação auditável, não recalibramFinotti.
- `amostra.json`: seleção completa, entradas da amostra, bloqueios e hashes. Valores nulos de preço/distratos não significamzero.
- Anexos antigos preservados para revisão da semântica.

Reprodução: `node --test scripts/diagnostics/estimativas-operational.test.mjs`; `node scripts/diagnostics/estimativas-operational-sample.mjs`; `python scripts/diagnostics/estimativas-operational-workbook.py`. Requer dependências existentes xlsx e Pythonxlsxwriter/openpyxl. Workbook relido em modo fórmula e valores cacheados; chaves, conservação e resultados conferidos. Evidência agregada versionada em `EVIDENCIAS_AMOSTRA_OPERACIONAL_2026-10-27.json`. Sem ensaio de importação ou validação visual no Excel nesta sessão.

## Perguntas prontas — não enviadas

1. **Nicolas/Edgar:** fornecer arquivo efetivamente aceito, preenchido com duas linhas, abas/cabeçalhos/ordem, tipos, formato de datas, casasdecimais e resultado esperado. Qual chave atualiza/cria base e impede duplicação?
2. **Edgar:** o limiar6–30 aplica-se ao estoque total do empreendimento, conforme dicionário06/10? Tipologias são apenas seleção/saída ou unidades independentes de estimação? Como calcular empreendimentos com vários padrões/tipologias sem rateio arbitrário?
3. **Edgar:** qual fonte oficial informa cadência e último período fechado? Os quatro períodos precisam ser consecutivos, completos e coletados? Podem conter estimativas antigas, desde que o último seja coleta?
4. **Edgar/Nicolas:** Foi estimado? da exportação equivale exatamente a bases.estimation por competência? Como obter base_id, origem de cada período e confirmação atual de que o alvo não tem coleta? Qual regra para metade/ímpares/novosentrantes e quem aprova a seleção?
5. **Nicolas:** qual campo recebe fluxo líquido do intervalo, acumulado e estoque? Trimestral recebe uma competência ou três? Campos distrato/bruta devem ser omitidos ou preservados? Quem grava estimation eivv_batch_id?
6. **Diego/Finoti/Edgar:** aprovar política mensal/trimestral de preço; manter último ou INCC-DI/M, janela de fatores e unidade? Pode o primeiro lote atualizar só vendas/estoque preservando preço explicitamente?
7. **Nicolas/Edgar:** quando voltar coleta, revisar competência estimada ou lançar diferença no período atual? Como separar alteração de oferta, venda e distrato real; qual aprovador, ambiente de teste e recibo de contagens antes/depois?

## Reconciliação candidata

Preservar snapshot anterior, proposta estimada e coleta posterior como registros distintos com chave/competência/versões. Comparar estoques e fluxo no mesmo intervalo e mesma oferta. Havendo mudança de quantidade/tipologia, encaminhar para revisão, sem atribuir diferença automaticamente a venda/distrato. Não distribuir erro pelo passado nem converter diferença negativa em distrato fictício. Correção no período corrente versus revisão histórica depende deNicolas/Edgar; bloquear gravação até decisão. Importação deve produzir recibo por chave, rejeições, valoresanteriores/novos e identificação do lote, com política de repetição definida. Nada disso foi executado no backend.
