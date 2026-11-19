# Decisões — Panorama Maceió / SINDUSCON-AL

Registro de fatos comprovados, hipóteses e decisões. Atualizado a cada entrega.

## 19/11/2026 — Cadência leve, espera automática e progresso por etapa

- **D29 — Pedido posterior de Lucas:** substituir o intervalo2segundos após cada resposta por500ms entre inícios de chamada e até2requisições em andamento. Nenhuma consulta removida.429pausa global por Retry-After válido (mínimo1segundo), ou60segundos sem cabeçalho válido. Continua retentando após as pausas até recuperar ou o usuário cancelar, em vez de encerrar após dois429. Intervalo aumenta até2segundos após429e volta gradualmente ao piso500mscom sucessos; respostas em andamento não liberam novas chamadas durante a pausa. Não representa cota oficial conhecida.
- **D30 — Espera e percentuais:** BrainLoadingState/tempo real/cancelamento preservados; aviso específico **Aguardando resposta da API — retomada automática após a pausa**, mantido mesmo quando outra requisição termina. Cada etapa tem percentual/barra: fontes por unidades efetivamente processadas nos coletores (municípios/fontes; páginas de uma fonte não são uma nova fonte), estrutura por posições realmente organizadas, etapas indivisíveis0→100somente ao concluir. Pausas não avançam percentual.100%significa processamento concluído, não homologação dos dados; fontes com falhas mantêm estadoConferir.
- Visual reutiliza Progress/Button/BrainLoadingState; sem novo primitive ou mudança transversal. Testes com relógio controlado cobrem sobreposição limitada, intervalos, pausa global mesmo com sucesso concorrente,429repetidos/recuperação e cancelamento.

## 19/11/2026 — Conferência identificada dos estoques

- **D28 — Pedido de Lucas:** disponibilizar uma forma de investigar a diferença entre municipal e detalhamento e entre API e original, sem escolher arbitrariamente192ou226. Novo arquivo separado `estoque-conferencia.json` contém todos os municípios da edição, totais de cada fonte por grupo, diferenças por padrão cadastral e dormitórios, registros de estoque da competência por empreendimento/tipologia com nome/ID, oferta inicial, área, padrão, status atual/histórico e estágio histórico quando fornecidos. Inclui futuros com marca explícita de exclusão e conserva fontes parciais/valores nulos/duplicações na auditoria.
- O agregado municipal não fornece IDs: o arquivo localiza os grupos e lista os cadastros a conferir, mas não prova quais IDs foram incluídos no total municipal. Padrão/status atuais são identificados como cadastrais, sem chamar isso de fotografia histórica. Sem novos endpoints/chamadas, tokens, endereços, dados de contato ou payloads brutos; diagnóstico agregado original permanece sem identificadores. Usa a geração existente no worker, com descarte na troca de geração/cancelamento/erro.
- Referência maio conferida no slide62: Maceió3704/RM469; API no diagnóstico(8): capital4160em ambos os caminhos, RM362municipal/396granular. SomenteMarechaldiverge entre endpoints (192×226), mas o original difere também na capital. Não classificar essas duas diferenças como uma única causa.
- Lucas também relatou confirmação do headGeoBrain: padrão econômico/Standard/etc.em horizontal identifica condomínio de casas/sobrados, pois loteamentos não possuem esse padrão. Regra recebida, ainda pendente de implementação específica; não declarar esta exportação como implementação dessa classificação.

## 19/11/2026 — IVV por área: somente contribuições e área desconhecida explícita

- **D27 — Correção dentro do pedido de Lucas para resolver os slides restantes:** diagnóstico(8) confirma63fontes concluídas,47disponíveis/13pendentes. Ranking25reconciliou com D25. IVV47/48atingiu a validação de área: auditoria registra uma observação com área zero em cada mês, sem provar sua contribuição individual.
- A tabela exige área apenas dos registros que contribuem para a respectiva coluna: estoque positivo nas fotografias inicial/final, fluxo não zero nos lançamentos/vendas. Registros sem contribuição não bloqueiam por área inválida. Unidades contribuintes sem área positiva são preservadas em linha **Área não informada**, nunca atribuídas à primeira faixa ou excluídas dos totais. Auditoria bruta e dados da API intactos; sem preenchimento pelo cadastro atual. Reconciliação municipal mensal e balanços de cada faixa continuam obrigatórios.
- A divergência vertical de Marechal226×192continua separada. Foi solicitada decisão explícita sobre qual fonte deve reger os quadros; nenhuma escolha aplicada enquanto a resposta estiver pendente. Não prometer zero pendências sem executar nova geração real.

## 19/11/2026 — Ritmo de chamadas GeoBrain

- **D26 — Lucas pediu somente diminuir o ritmo:** manter endpoints, paginação, amostras e consultas existentes, sem eliminar chamadas ou introduzir cache novo. Todos os coletores imobiliários da geração mensal/trimestral passam pela mesma fila: uma requisição ativa, intervalo de2segundos após cada resposta. O limite de aproximadamente30chamadas/minuto é uma escolha conservadora local, não uma cota confirmada do provedor.
- HTTP429 pausa a fila pelo `Retry-After` válido (mínimo2segundos); sem cabeçalho válido,60segundos. Retenta uma vez após a pausa; persistindo429, não envia as consultas enfileiradas/seguintes e encerra a geração com mensagem específica. Cancelamento continua possível durante a espera, mantendo BrainLoadingState e tempo real existentes. Não há bypass de autenticação, fonte, escopo ou cálculo; CAGED e outros motores não foram alterados.
- Evidência real: diagnóstico(7) teve63/63fontes imobiliárias bloqueadas por429 e54slides pendentes. Não comprova qual é a cota, sua janela ou chave (conta/token/IP). A nova cadência precisa ser conferida numa geração autenticada após publicação.

## 19/11/2026 — Lançamentos derivados da oferta inicial histórica

- **D25 — Nova autorização de Lucas, posterior a D20:** após conferir os endpoints, Lucas autorizou combinar data de lançamento do empreendimento com `qty` (oferta inicial) da fotografia histórica da tipologia. Usado quando o fluxo explícito está ausente/nulo/vazio: no mês de lançamento entra a oferta inicial histórica; nas demais competências elegíveis entra zero. Fluxo explícito válido, inclusive zero, prevalece; valor explícito inválido não é substituído. Cadastro atual e diferença entre estoques não são usados.
- Ranking por bairro e IVV por área, mensal/trimestral, usam a mesma regra. Cada mês deve reconciliar ao total municipal; IVV mantém também vendas, estoques e balanços por faixa. Etapas/revisões que não sejam explicadas pela coorte continuam bloqueadas. Notas/advertências dos valores calculados e critérios do JSON identificam a derivação e a autorização; auditoria bruta conserva campos ausentes, sem alterar os registros da API.
- Diagnóstico real(6):46disponíveis/14fontes/22editoriais; três pendências de lançamentos são candidatas a esta regra, mas sua liberação real ainda não foi observada. As outras onze dependem da diferença de estoque vertical de Marechal Deodoro (226granular versus192municipal,34unidades), que esta decisão não autoriza ajustar nem ignorar.

## 19/11/2026 — Classificação por quartos e conferência antes dos slides

- **D23 — Regra automática autorizada por Lucas:** horizontal com tipo ainda indefinido e `number_bedroom` inteiro positivo em alguma tipologia da **fotografia da competência selecionada** recebe Condomínio de Casas/Sobrados (grupo de arte existente: Condomínio de Casas). Tipos explícitos da API, exclusão de Chácaras e D21 têm prioridade. Zero, nulo, campo ausente, booleano, fração ou texto não numérico não ativam a regra. Cadastro atual ou fotografias posteriores não substituem a competência histórica. Vaga de garagem não é requisito; é evidência auxiliar quando disponível na fotografia. Área positiva/600m²/zero quartos não determina loteamento aberto ou fechado: identificação explícita continua necessária.
- **D24 — Conferência no site:** aviso com quantidade e tabela antes dos slides, usando a mesma lista do CSV, com município/nome/ID/rótulos daAPI e quartos/área/garagem disponíveis. Classificados automaticamente saem das pendências/CSV e aparecem em detalhes próprios, com motivo e evidências; JSON conserva apenas regra/contagens por município, sem nomes/IDs. Dados brutos e classificações da origem não são sobrescritos. Mantidos recorte, completude/parcial, futuros, deduplicação e esgotados da lista.
- Lucas inicialmente pediu edição/memória de correções porID, mas depois adiou essa funcionalidade. Na última clarificação, **manteve expressamente os dez empreendimentos deD21como casas**. Não criar formulário/localStorage/tabela no backend para novas correções nesta etapa. Liberação geral de relatórios parciais também fica para depois; guardas de campos, escopo e reconciliação atuais permanecem.

## 19/11/2026 — CSV de todos os produtos horizontais não identificados

- **D22 — Ampliação solicitada por Lucas:** após diagnóstico(5) mostrar produtos sem tipo identificado além dos dez Fechado confirmados, Lucas pediu adaptar o CSV para exportar esses empreendimentos também. A lista identificada agora inclui qualquer produto horizontal sem correspondência, inclusive Econômico/Standard/Médio sem tipo explícito e campos vazios, preservando os rótulos originais em seis colunas. Exporta referência, completude, município, ID, nome, motivo da conferência e lançamento. Continua separada do JSON agregado e usa a geração em memória, sem nova consulta.
- Mantidos recorte AL/municípios/segmento, exclusão de lançamentos futuros, deduplicação, aviso de lista parcial, registros esgotados, proteção de fórmulas/aspas e exclusão de Chácaras/casos já classificados, inclusive D21. Não converte produto desconhecido nem muda cálculos. Botão passa a “Baixar produtos sem classificação (CSV)” e arquivo termina em `horizontal-conferencia.csv`, mensal/trimestral.

## 19/11/2026 — Dez produtos Fechado identificados como Condomínio de Casas

- **D21 — Exceção por identificação, sem regra geral:** Lucas informou expressamente que somente os dez empreendimentos abaixo, identificados no relatório, devem converter o rótulo ambíguo `Fechado` para `Condomínio de Casas`. Aplicado aos dois modelos, exigindo ID e município correspondentes, UF AL e segmento Horizontal. Não depende do nome cadastral, que pode sofrer revisão. Produtos com categoria explícita continuam com ela; exclusão de Chácaras (D16) prevalece. Outros IDs, municípios e registros Fechado permanecem para conferência e no CSV de pendências.

| ID | Município | Empreendimento informado |
|---|---|---|
| 7980 | Barra de São Miguel | Barra Beach Residencial |
| 12692 | Maceió | Residencial Jardim Das Violetas |
| 20502 | Maceió | Residencial Varandas Do Parque |
| 7984 | Marechal Deodoro | Denilson Amorim Boulevard |
| 425 | Marechal Deodoro | Residencial Amazonas |
| 28486 | Marechal Deodoro | Residencial Ilha Da Crôa |
| 21639 | Marechal Deodoro | Residencial Porto Grande I |
| 21640 | Marechal Deodoro | Residencial Porto Grande II |
| 422 | Marechal Deodoro | Villas De Santa Rita |
| 28491 | Rio Largo | Residencial Alba Canuto |

Registro versionado em `classification.ts`; critérios agregados identificam a política sem exportar IDs/nomes no diagnóstico. Não altera estoque/preço/área, nem dispensa reconciliação bruta. Não representa homologação dos demais indicadores.

## 18/11/2026 — Continuidade das fontes e CAGED verificado

- **D19 — Contingência identificada CAGED:** escolha técnica do Codex dentro do pedido de Lucas para corrigir as fontes pendentes. BigQuery confirmou117meses/23.751agregados reais; consulta online permanece prioritária e, em falha de transporte/5xx/404, usa cópia agregada verificada, importada sob demanda. Origem/versão/data e falha online visíveis na interface/JSON, fora da arte. Não contorna401/403/429ou resposta200inválida; não substitui competência ausente. Não representa nova homologação metodológica pelo analista. [Proveniência, contrato e provas](CAGED_CONTINGENCIA_2026-11-18.md), implementação`e67ac127`.
- **D20 — Dependências de dados/analista:** Lucas confirmou que os10`Fechado`ainda aguardam o analista. Para lançamentos por tipologia ausentes, respondeu que consultará o analista sobre a fonte. Não derivar lançamentos de capacidade/estoque nem adotar de-para presumido. Marechal283×192precisa de conferência peloJSONv2. Pedido amplo de corrigir fontes não autoriza inventar esses valores.

## 18/11/2026 — Universo horizontal e INCC confirmados pelo analista

- **D16 — Chácaras excluídas:** Lucas confirmou com o analista que Condomínio de Chácara/Chácaras não participa das análises nem aparece no relatório. Aplicado ao mensal/trimestral, capital/RM, oferta/capacidade/contagem, distribuição anual e médias. A reconciliação entre fonte granular e municipal continua sobre o universo bruto antes da exclusão; divergências não são apagadas. A auditoria agregada pode conservar os rótulos recebidos como evidência da fonte.
- **D17 — Série monetária:** INCC-DI confirmado pelo analista, comunicado por Lucas em 18/11. Mantida a configuração existente para as duas edições e o mês-base de fechamento; isso não homologa automaticamente outros métodos ou campos nominais.
- **D18 — Fechado exige conferência:** o analista quer os empreendimentos classificados somente como `Fechado`. Não autoriza converter para Loteamento Fechado. A lista CSV separada, solicitada expressamente por Lucas, contém referência, completude, município, ID, nome, campos com o rótulo e lançamento. Usa a geração em memória, sem nova API/persistência; exclui chácaras e produtos explicitamente identificados. Inclui registros esgotados, pois o pedido é cadastral, sem presumir estoque ativo; lançamentos posteriores ao fechamento ficam fora. Ausência de nome/data é sinalizada; coleta incompleta identifica lista parcial. O diagnóstico JSON permanece agregado e não recebe nomes/IDs individuais.
- **Evidência:** implementação `38700781`; [validação desta sessão](VALIDACAO_DADOS_REAIS_2026-11-17.md). Lucas autorizou o push para gerar novo relatório e encaminhar o JSON. Geração real/publicação Lovable ainda não observadas pelo agente.

## 17/11/2026 — CAGED MTE autorizado

- **D12 — Fonte MTE:** Lucas autorizou a integração pelo MTE, em lugar de depender da cobertura recente BD Pro. D7 permanece como histórico do adiamento anterior. Importador estatístico/ajustes 2017–2019 e MOV/FOR/EXC desde 2020, com agregados e revisões; [contratos e evidências](CAGED_INTEGRACAO_2026-11-17.md).
- **D13 — Comparativos reutilizáveis por versão:** conservar snapshots imutáveis de cada fonte e atualizar os períodos afetados por revisões. Não assumir que um ano encerrado é irretificável. Comparação mensal e ano parcial também no trimestral, conforme o fechamento do original.
- **D14 — Original sem marca de quebra:** Lucas perguntou se a marca existia no original; render 9–14 não a apresenta. Manter a composição original sem nota nova de quebra no gráfico. Registrar a diferença metodológica/2020 na origem e documentação, sem afirmar equivalência metodológica homologada.
- **D15 — Infraestrutura existente:** reaproveitar identidade/transporte/HMAC da ponte Empresas/Empregados; frontend recebe só agregados. Sem chaves privadas ou microdados no Lovable. Publicação, bootstrap completo e agendamento são etapas remotas separadas, ainda não executadas.

## 16/11/2026 — Continuação com Codex

- **D7 — CAGED adiado:** Lucas informou BigQuery do setor já conectado ao Rebrain e pediu continuar a implantação, deixando CAGED para depois. Código RAIS/ponte Empresas localizado; acesso real não exercitado. Não confundir conexão informada do produto com autenticação disponível ao agente.
- **D8 — INCC explícito:** série de Maceió ainda não comprovada; prévia começa sem índice escolhido. INCC-DI é opção explícita para conferência, com origem/mês-base visíveis e guarda por competência; não adotar automaticamente por ser usado em Fortaleza.
- **D9 — MCMV:** logo dos originais comprova recorte específico22/33. Não mostrar o total vertical nessas posições nem converter Econômico em MCMV por inferência.
- **D10 — Rankings:** exigir fluxo explícito por tipologia, identificação/bairro e soma reconciliada ao total municipal. Sem substituir fluxos por estoque/capacidade. Divergência ou campos ausentes mantêm a página em conferência.
- **D11 — Continuação:** navegação1–40mantém posições originais dos dois modelos; próximos41–60. Rota continua oculta e exportação segue posterior à implantação do conjunto.

## 16/11/2026 — inventário inicial

### Fatos comprovados (extração OOXML dos originais)

- **Maio/2026 é a edição mensal** (82 slides): séries de 25 meses, rankings "MAIO/2026", IVV mensal.
- **Junho/2026 é a edição trimestral 2T2026** (87 slides): séries de 17 trimestres (2T/22–2T/26),
  acumulado semestral 1S25 vs 1S26, rankings "2T 2026", participações 2T/2025 vs 2T/2026.
- Recorte: mensal lista 7 municípios (com Coqueiro Seco); trimestral lista 6 (sem Coqueiro Seco).
- A edição trimestral tem bloco exclusivo **mercado vertical comercial Maceió** (posições 79–82) e separa
  as tabelas de oferta final Maceió/RM (61–65); a mensal consolida (62–64) e tem slide exclusivo de
  **tempo de escoamento do estoque** (posição 41).
- VGL/VGV trazem a nota "Valores atualizados pelo INCC" no original.
- Vendas RM mensais têm valor negativo no cache (jun/24 = −8): distratos aparecem com sinal.
- Vários slides analíticos estão achatados como imagem no original (IVV líquidas, IVV por área útil,
  emprego/CAGED, blocos horizontal e comercial): a composição real exige render; os dados virão de fonte,
  não da imagem.

### Decisões desta sessão

| # | Decisão | Base | Status |
|---|---|---|---|
| D1 | Manifesto com posições originais preservadas: 82 (mensal) e 87 (trimestral), sem renumeração | Handoff + extração | Adotada |
| D2 | Recorte municipal por edição: mensal = 7 cidades, trimestral = 6; nenhuma união/exclusão automática | Slide 7 de cada original | Adotada |
| D3 | Acesso somente por rota `/rebrain/relatorios-institucionais/maceio`, sem item em menu/busca/início | Pedido de Lucas em 16/11 | Adotada |
| D4 | Reutilizar padrão de operação Fortaleza (page/model/blueprint/GeoApiScopeEngine) e exportador nativo compartilhado, sem copiar regras locais de Fortaleza/Secovi/FIERGS | Handoff | Adotada |
| D5 | Ordem dos slides gerados = ordem exata do original; padrão visual idêntico à arte Maceió | Pedido de Lucas em 16/11 | Adotada (fidelidade visual verificada por bloco na Etapa 3) |
| D6 | Núcleo de coleta vertical nasce no módulo Maceió (não extraído de Fortaleza nesta sessão): evita regressão nos 672 testes de Fortaleza; extração transversal fica para quando o contrato estiver comprovado em runtime pelos dois consumidores (ou com Recife) | AGENTS.md: extensão transversal exige testes dos consumidores existentes | Adotada |

### Hipóteses em aberto (não implementar sem comprovação)

- Fórmulas de IVV, escoamento, tempo médio de oferta e ponderação de preços.
- Fonte/endpoint de cada indicador (coluna `fonte_endpoint` da matriz está "a confirmar").
- Natureza das vendas (brutas vs líquidas) por slide.
- Critério de padrões locais (Compacto…Super Luxo) e eventual faixa econômica.

### Perguntas objetivas ao analista

1. **Coqueiro Seco**: a diferença de recorte entre maio (7 municípios) e junho (6) é mudança de escopo
   permanente, erro de uma edição, ou recorte distinto por periodicidade? Qual conjunto vale para novas edições?
2. **INCC**: qual fonte/versão/mês-base é usada na correção de VGL/VGV e do VGV ofertado?
3. **IVV líquidas** (mensal 46 / trimestral 45): qual a fórmula e por que separada do IVV principal?
4. **Horizontal**: o bloco cobre casas e loteamentos ou apenas um dos produtos?
5. **Preço m²**: média simples por unidade em oferta ou ponderada? Qual denominador de área?
