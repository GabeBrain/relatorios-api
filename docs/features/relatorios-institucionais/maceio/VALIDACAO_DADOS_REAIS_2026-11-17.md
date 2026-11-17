# Maceió — bloqueios após a coleta real — 17/11/2026

## Atualização posterior — diagnóstico (3), decisões e correções

Recebido `maceio-mensal-2026-05-diagnostico (3).json`, gerado às19:36:20UTC:12disponíveis/48fontes/22editoriais;63consultas imobiliárias completas, zero falhas. Garden/Cobertura deixaram de bloquear após `1c63413f`, liberando7slides. Dos48pendentes,6são CAGED e42imobiliários.32têm como primeiro bloqueio Pilar; não significa que os demais dados desses slides já estejam homologados.

Decisões expressas de Lucas nesta sessão, posteriores às restrições registradas abaixo:

- **Famílias:** Compacto→Compactos; Econômico→MCMV; Standard/Médio/Médio-Alto→Médio Padrão; Alto/Luxo→Luxo. Aplicadas aos gráficos agrupados, cadastro de lançamentos e estágio por família, mensal/trimestral. Padrões desconhecidos continuam pendentes.
- **Varredura vazia:** após pedir registrar a interpretação de Pilar/Coqueiro Seco para depois, Lucas decidiu: “se não teve nada considera0então, pois se a varredura concluiu e deu0provavelmente é0mesmo”. Competências sem linhas em consulta completa contam como zero no mercado pesquisado. Não é comprovação de inexistência no município inteiro. Falhas, consultas parciais e campos nulos/inválidos dentro de linhas continuam indisponíveis. Reconciliação entre estoque granular e municipal permanece obrigatória. A decisão fica em `criteria.emptyPeriods` e os meses derivados em `sources.*.zeroMonths`; auditoria bruta conserva `null` e `missingMonths`, sem fingir resposta explícita da API.

Correções adicionais:

- Grupos numéricos por dormitórios passam a ser aceitos como os equivalentes textuais; nenhuma tipologia desconhecida é convertida.
- Produtos horizontais reconhecem rótulos explícitos em `work` e demais campos, inclusive `Condomínio de Casas/Sobrados` e `Condomínio de Chácaras`. “Fechado” isolado e padrões de preço como “Econômico” não definem produto. Chácaras permanecem em categoria própria, sem serem somadas a casas ou lotes.
- Escoamento preserva Médio-Alto como categoria própria, evitando excluir esse padrão recebido da API.
- Tabela histórica do IVV preserva os meses válidos e mostra `null` nas competências com balanço inválido, com motivo datado em advertências. Média anual considera só meses reconciliados, explicitamente. Série mensal mantém o bloqueio de balanço inválido; nenhuma quantidade é ajustada para fechar.
- Nota de preços corrigida: universo inclui Garden/Cobertura, sem a antiga descrição incorreta “somente Padrão”.

**Limites que continuam:** fluxos granulares ausentes nos slides47/48 não são inferidos de capacidade ou preço; produtos sem identificação explícita continuam pendentes; divergências reais de estoque continuam bloqueadas. Com novos primeiros bloqueios removidos, outros campos não disponíveis podem aparecer na próxima geração. Não afirmar que todos os42slides imobiliários foram liberados.

Validação headless:156testes Maceió/14arquivos aprovados, incluindo as duas edições, famílias, produtos, tipos numéricos, consultas completas vazias, erros/campos nulos, reconciliação e preservação de meses válidos do IVV. Sem token Geobrain ou acesso ao Opera para executar geração real neste ambiente. Após publicação autorizada, solicitar novo JSON mensal/trimestral; não substituir conferência real por fixture. CAGED, SP e outros motores sem alteração.

## Evidência recebida

Novo arquivo `maceio-mensal-2026-05-diagnostico (1).json`, gerado às18:23:53UTC:5disponíveis/55fontes/0critérios/22editoriais. **As49fontes verticais e14horizontais estão completas, sem falhaHTTP/contrato.** Cadastro/lançamentos dos7municípios também completos. Assim, as correções de transporte de `2cea2276` foram observadas na coleta real; isso não prova a validade dos indicadores.

Bloqueios atuais:

- Pilar e Coqueiro Seco: todas as séries verticais e histórico detalhado vazios, apesar de paginação completa. Rio Largo tem séries vazias e1registro detalhado. Não converter essas situações automaticamente em zero.
- Outros municípios apresentam quantidades de linhas muito diferentes na janela de65meses, exigindo cobertura por competência.
- Slide17: correspondência entre padrões da API e famílias do original ainda não identificada.
- Slides41/47–60/62–69: código exige literalmente `type_of_typology == Padrão` no histórico ou cadastro da tipologia; demais valores, inclusive ausentes, bloqueiam o slide inteiro. O diagnóstico anterior não incluía os rótulos efetivos desse campo.
- Slide42: grupo/competência inválido no estoque por tipologia; o JSON não distingue grupo vazio de rótulo desconhecido.
- Slide46: balanço municipal divergente em2021-03; não é falha de transporte e não deve ser escondido.
- Slides71/73/75/77: produto horizontal não identificado; necessário conferir campos reais antes de mapear categoria.

## Esclarecimento do usuário e decisão ainda aberta

Ao ser perguntado sobre inclusão de tipologias diferentes, Lucas respondeu **“Defina tipologia diferente”**. Isso **não autoriza** mudar universo. Esclarecido: é o campo `type_of_typology`, diferente de dormitórios e padrão de preço; chamar qualquer valor diferente de Padrão de “especial” foi impreciso, pois os valores reais não constam do JSON. Nenhuma tipologia foi incluída/excluída por nova regra neste lote; guardas e números permanecem inalterados.

## Auditoria agregada preparada

O JSON passa a incluir, por fonte, somente evidência agregada permitida:

- grupos recebidos, meses observados e ausentes;
- somas mensais de estoque, vendas, lançamentos e capacidade, com contagem de valores ausentes; mês sem linhas permanece `null`, zero explícito permanece0;
- rótulos/contagens de `type_of_typology` no histórico e no cadastro, padrões/famílias e campos candidatos de produto horizontal;
- primeira/última competência de lançamento e quantidade de datas inválidas, sem IDs, nomes, endereços ou linhas individuais.

Usa os dados já presentes na geração; não faz nova consulta nem grava no backend. Permite identificar os valores concretos necessários para reparar correspondências e cobertura sem adivinhação. O arquivo recebido não permite retroativamente calcular essa auditoria: não contém os registros individuais. Após publicação autorizada, um novo diagnóstico da geração é necessário.

Lucas pediu deixar esse estilo detalhado como padrão. Aplicado automaticamente aos dois modelos de Maceió, com `auditVersion` e `collection` (fontes solicitadas, concluídas, falhas e vazios completos) separados da situação dos slides. [Convenção de diagnóstico](../../../architecture/REPORT_DIAGNOSTIC_STANDARD.md) passa a orientar criação/evolução dos demais diagnósticos, sem migrar os outros motores ou suas regras neste lote.

Limite: auditoria ainda local; sem tokenGeobrain ou controle Opera, não há nova coleta real pelo agente. Resolver classificações/meses continua pendente de evidência agregada real; não registrar a tarefa de fontes como concluída. CAGED continua fora do escopo.

Validação local:10testes de auditoria/diagnóstico/exportação aprovados, incluindo contagens/rótulos reais da fixture, ausência versus zero, transporte completo vazio versus validação pendente, privacidade e cancelamento/retry. Tipos/lint e build final aprovados. Não foi observado download com essa auditoria na geração real do usuário; precisa de publicação autorizada e novo diagnóstico. O fluxo visual de exportação existente foi preservado.

**Monday:** [Panorama Maceió / SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406169) — `13149406169`. Sem escrita.
