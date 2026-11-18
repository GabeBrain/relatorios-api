# SP — diagnóstico real e seleção das fontes de preços

12/11/2026 · Codex · base `a4ea3a25`, main.

## Evidência recebida

Usuário forneceu `sp-2T2026-2026-06-diagnostico.json`, geração 2T2026 com fechamento em junho. SHA-256: `c1df3a157f56869b6ee7355acfee23ce6198e19ad968753ead1f85c703b32e87`. O arquivo é evidência da geração do usuário, não de uma consulta autenticada executada pelo agente.

Fixture de regressão conserva somente os agregados de preços, metadados de fontes e motivos de indisponibilidade em `src/features/relatorios-institucionais/sp/__tests__/price-diagnostic-2026-11-12.json`. Não inclui credenciais ou históricos individuais. Os preços municipais do grupo 4 não constavam numericamente no diagnóstico antigo: sua seleção nova é testada com respostas inventadas da mesma estrutura, sem atribuir valores sintéticos ao mercado.

## Causas e comportamento corrigido

| Slides | Evidência do JSON | Comportamento |
|---|---|---|
| 53 | Consulta sem agrupamento retornou sete preços por mês, todos com grupo vazio; nenhuma média geral única. | Preserva essa falha municipal na auditoria e recupera a série granular inteira, quando há observações calculadas válidas. Método identificado na prévia, gráfico e JSON. Não completa pontos isolados misturando métodos. |
| 59 | Fonte Tipologia entregou grupos `1`, `2`, `3`, `4`; código só reconhecia `4+`. | Aceita quatro dormitórios e mantém esse rótulo. Somente uma categoria explícita `4+` usa “quatro ou mais”; as duas categorias nunca são unidas para preencher lacunas. |
| 61/62 | Sete barras por padrão possuem preços; linha geral ficou vazia pela duplicidade da fonte sem agrupamento. | Barras municipais preservadas. Linha geral usa a média granular conferida quando disponível e completa, explicitamente identificada como calculada. Não é uma média dos preços dos padrões nem uma média geral municipal homologada. |
| 63/64 | Baseline tem valores completos de total/MCMV/MAP para os quadros, mas o adaptador municipal apagava MCMV/MAP. | Quadros usam integralmente o cálculo granular: total e subdivisões mantêm população e ponderação comuns. Não mistura coluna municipal com cartões granulares. |
| 56 | Disponível nessa geração. | Preservado. |
| 55/57 | Oito competências com ausência de fotografia ou divergência de estoque. | Continuam parciais; nenhuma guarda foi relaxada. |

## Limites preservados

A série granular geral possui apenas cinco pontos válidos de 2T2025 a 2T2026. Oito pontos de 2T2023 a 1T2025 permanecem sem medição. A primeira ocorrência é o empreendimento 64094 sem fotografia em junho/2023; as demais incluem diferenças de estoque entre históricos e municipal. A correção transforma o slide 53 de indisponível em parcial, sem simular histórico completo.

No fechamento, o cálculo geral já presente no arquivo é R$ 12.369,940178/m² e ticket de R$ 778.123,665097, ponderados por 127.840 unidades em oferta positiva. Esses são os valores do método granular existente, não uma conciliação com a média editorial do relatório manual. Não homologam a metodologia integral ou fabricam o agregado municipal ausente.

Os cards recuperados conservam, por exemplo, 1 dormitório: R$/m² MCMV 9.664,465791 e MAP 17.161,922731; valores de referência extraídos do diagnóstico, não constantes do runtime. Fontes municipais originais e ambos os baselines continuam exportados separadamente. Auditoria passa a identificar métodos da série, da linha geral e dos quadros por dormitório.

## Verificação e retomada

- Regressões de seleção e composição incluem o JSON real e respostas sintéticas com sete linhas anônimas/grupo 4, ausência, erro, duplicata e lacunas. Casos abrangem 1T/2T/3T/4T, anos diferentes e trimestre parcial, sem regra especial para 2T2026.
- Edge headless: 50 casos com rede externa bloqueada, 1440/390, fontes válidas/lacuna/vazio/erro/estrutura observada. Zero erro de página e overflow; captura do slide 62 inspecionada. Componentes de slides e notas metodológicas existentes reutilizados; coleta, progresso Brain e cancelamento não foram alterados.
- Build/tipos e lint dirigidos aprovados. Suíte SP:342testes/38arquivos aprovados com concorrência limitada. Um teste de geração usava espera de DOM de apenas um segundo; passou a aguardar conclusão real por até quatro segundos, sem relaxar asserções. Limites de tempo da primeira rodada sob build paralelo foram repetidos com concorrência limitada.

Próximo: envio/publicação autorizados; usuário gera novamente o recorte e envia diagnóstico para confirmar preços do grupo 4 e estados reais. A investigação do agregado municipal único e a reconciliação com o método do analista continuam abertas. Não houve nova consulta GeoBrain, geração autenticada, envio de mensagens ou publicação pelo agente. Fortaleza permanece pausado; seus arquivos preparatórios não entram nesta entrega.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`, referência apenas.

## 12/11/2026 — SP: preços históricos observados sem barras vazias

Novo diagnóstico do usuário (SHA-256 `504aa4d5fd114879fb8ff4af4719655b0ea94af64e2086a9da20f006f4ae27fd`) confirma médias por estoque positivo nos 13 períodos de cada slide 53/55/57. A guarda de estoque negativo em uma tipologia bloqueava as amostras históricas, inclusive o recorte de dois dormitórios sem negativo próprio. Agora permite exibir a média observada com cobertura parcial; negativos não ponderam preços e permanecem na auditoria. Não reconcilia estoque/população, não altera o fechamento nem calcula variações envolvendo parciais. Validação: 351 testes SP em 39 arquivos, tipos e lint dirigidos aprovados. Teste novo confere 13 pontos em 53/55/57 e preserva bloqueio de fechamento inválido. Sem nova observação em navegador autenticado; verificação headless do cálculo, com dados sintéticos. Métodos com esgotadas continuam indisponíveis por preços ausentes (99 tipologias no geral, 25 em um dormitório e 24 em dois no fechamento); não comprovam equivalência ao analista. Sem novas consultas API ou mudança de coleta. Fortaleza preservado.

