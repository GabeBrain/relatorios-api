# Plano API, dossiê retrospectivo e simulador Rebrain — 22/10/2026

**Direção de Gabriel nesta sessão:** Gabriel/Codex conduzem a implementação e o dossiê na Rebrain. Edgar trabalha em paralelo como referência para contrato, sem bloquear a investigação independente via APIs já acessíveis. Este plano atualiza a divisão operacional descrita no pacote de 21/10, sem atribuir prazo ou entrega a Edgar.

## Viabilidade comprovada por leitura, ainda sem backtest

Autenticação local já configurada em `.secrets/geobrain.env` (ignorada pelo Git), sem exibir valores. Em 22/10, `/public-api/monitored-cities` e `POST /public-api/v2/building-with-history-internal` responderam HTTP 200. A sondagem somente leitura usou `scripts/diagnostics/estimativas-api-audit.mjs`, sem persistir payload bruto nem enviar dados à origem. A rota interna aceita `type=Horizontal`, UF, cidade, paginação e Bearer. A UI deverá usar a sessão Geobrain e o `GeoApiScopeEngine`, que pagina as cidades autorizadas.

| Cidade | Horizontais | Linhas históricas | Brutas−distratos=líquidas | Meses líquidos negativos | Lançados 2020+ com rótulo aberto/fechado explícito e `estimation=0` no cadastro |
|---|---:|---:|---:|---:|---:|
| Fortaleza/CE | 43 | 2.965 | 2.956/2.956 linhas comparáveis | 95 | 4 |
| Blumenau/SC | 38 | 1.754 | 1.609/1.609 linhas comparáveis | 117 | 22 |

As duas cidades tinham uma página cada, sem duplicata de `(empreendimento, tipologia, período)` na amostra consultada; o último período encontrado foi 2026-09. Blumenau oferece o primeiro recorte para ensaio. Os números de 4 e 22 são **candidatos antes dos gates de qualidade**, não amostra final nem evidência de observação real. A API devolveu `estimation` somente no cadastro do empreendimento (Fortaleza: 36 valor `0`, 7 valor `1`; Blumenau: 38 valor `0`); não vimos marcador por linha mensal. Confirmar semântica e fonte de verdade por competência antes de usar meses como gabarito.

O histórico inclui `period`, `typology_id`, `pattern`, `qty`, `typology_stock`, `sold_in_period`, `gross_sales`, `distractions` e `time_on_sale`. `pattern` mistura rótulos de produto aberto/fechado com padrão socioeconômico e `Futuro`; mapear o tipo somente com evidência temporal válida. O normalizador atual de Validação de Fechamento converte ausência numérica em zero e pode silenciar falha de uma faixa de consulta; o adaptador estatístico deve consumir o payload bruto e preservar `null`, falha e proveniência. As 212 linhas com venda líquida negativa nas duas cidades mostram que o avaliador em memória de 21/10, que as rejeita, ainda não serve diretamente para a base real.

## O que o dossiê pode demonstrar

1. **Reprodução:** comparar a implementação congelada dos coeficientes publicados e o exemplo 300/150/6 com o slide. Já realizada localmente; cauda mensal e bandas não foram reproduzidas.
2. **Validação independente:** medir, em empreendimentos observados e elegíveis obtidos pelas APIs, curva original versus médias dos últimos 3/12 meses e regra IVV operacional quando seu contrato estiver confirmado. Isso testa utilidade na base disponível, incluindo erros por mês, trimestre e estágio.
3. **Reprodução do estudo Finotti:** somente se recebermos exatamente o funil de 366 empreendimentos, os filtros, o snapshot até 2026-09, o código/MD e o protocolo dos 100 sorteios. Sem isso, não chamar o resultado de réplica dos 9,1 pontos percentuais; reportar diferença de população, origem, cauda e métrica.
4. **Fortalecimento do modelo:** primeiro congelar e avaliar os coeficientes do PPT fora da amostra. Calibração alternativa ou bandas empíricas, se justificadas, usam treino separado e novo identificador de versão, com teste preservado. Não ajustar parâmetros nos mesmos casos usados para alegar ganho.

## Execução em fatias

### A. Contrato e snapshot auditável

- Implementar adaptador paginado e limitado por cidade com token da sessão, `GeoApiScopeEngine`, timeout, cancelamento, falha explícita, ID estável, competência e payload bruto preservado em `.local-inputs/estimativas-vendas/` apenas no ensaio local. Registrar momento, escopo, versão, contagem e SHA-256 do snapshot; nunca registrar Bearer. Para a UI, buscar sob demanda e não incorporar base bruta no build.
- Definir `observed | estimated | unknown` por **período**, sem inferir que `estimation=0` atual prova todo o passado. Solicitar a Edgar somente a localização/semântica desse marcador ou fonte alternativa de observação, e significado de `IVV BET`; conferir também revisões de unidades, data de lançamento e se `sold_in_period` é líquido. Enquanto a origem mensal não for inequívoca, o dossiê é exploratório e não gera métrica de validação real.
- Produzir funil de elegibilidade por cidade: data de lançamento, produto, oferta positiva e estável ou revisão identificada, meses consecutivos, venda/estoque reconciliados, dados observados nos dois lados do corte, janela do modelo e motivo individual de exclusão. Casos com distratos maiores que vendas não viram zero por conveniência; registrar comportamento e definir política explícita.

### B. Motor retrospectivo e comparação justa

- Evoluir `retrospective.ts` para séries mensais com valores ausentes, vendas líquidas negativas e revisões de oferta como estados distintos. Excluir ou tratar cada situação por regra documentada, sem clamp oculto. Não deixar histórico futuro afetar seleção de parâmetros, oferta de origem ou previsão.
- Origem por empreendimento nos meses 3, 6, 12, 18, 24 e 36 quando elegíveis; horizontes 1, 3, 6, 12 e 24 meses, separando o limite de 36 meses futuros calibrados. Curva, média3 e média12 recebem exatamente a mesma informação até o corte. A regra IVV atual entra como quarto método apenas após contrato.
- Reportar erro absoluto no acumulado vendido em pontos percentuais, erro em unidades/vendas do período e estoque, viés assinado, mediana, percentil90, cobertura e motivos de omissão. Comparações agregadas usam apenas pares avaliáveis pelos métodos comparados; exibir também exclusões, para não melhorar artificialmente a média ao omitir casos difíceis ou cauda após95%.
- Evitar vazamento entre origens do mesmo empreendimento ao separar treino/teste. No dossiê inicial os coeficientes Finotti ficam fixos; amostras e origens de teste não recalibram nada. Para eventual recalibração, split por empreendimento, sementes registradas e teste final guardado.

### C. Empreendimentos isolados e conjuntos

- Painel por empreendimento: observado até o corte, projeção da curva, médias, resultado posterior oculto/mostrado no ensaio, tabela mensal de unidades/acumulado/estoque e motivos de alerta. Mostrar caso forte, mediano e pior caso, sem escolher somente exemplos favoráveis.
- Painel de conjunto: fixar membros antes do horizonte, calcular cada empreendimento no seu próprio estágio e **somar unidades projetadas**, comparando com a soma observada da mesma carteira e das mesmas competências. Mostrar erro de cada membro e do conjunto, por cidade, produto, coorte de lançamento e tamanho. Não aplicar a equação de um empreendimento diretamente ao percentual agregado como se fosse equivalente.
- Dossiê versionável com metodologia, funil, denominadores, métricas, subgrupos, sensibilidade a lacunas/cauda, casos de erro e limites. Gráficos e saídas brutas locais ignoradas; só evidência agregada pequena e decisões entram no Git.

### D. Interface de teste na Rebrain

- Rota candidata `/rebrain/estimativas-vendas`, lazy, dentro do shell e autenticação existentes. Etapas na tela: escolher cidade autorizada ou importar snapshot local, revisar qualidade/elegibilidade, selecionar empreendimento ou carteira e mês de corte, executar comparação, inspecionar gráfico/tabela/dossiê e exportar resultado de revisão.
- Usar tokens Geobrain já copiados no projeto, primitives shadcn e estados de carregamento, vazio, erro, escopo inválido e dado de origem desconhecida. A interface distingue observado, estimado e projeção por texto e legenda. Sem bandas central/ampla do slide até receber método; uma banda empírica futura teria rótulo e versão próprios.
- Não criar arquivo importável no Geobrain até confirmar com Edgar IDs, competência, arredondamento, flags e contrato de retorno. A primeira exportação é só relatório de revisão, sem escrita na origem.

## Gates para disponibilizar

1. **Dossiê interno:** pelo menos um recorte real com origem mensal confiável, snapshot reproduzível, casos elegíveis/excluídos explícitos e comparação pareada revisável. Quantidade e qualidade serão reportadas, sem inventar mínimo de aceitação.
2. **Simulador de teste na Rebrain:** cálculo e observação claramente separados, estados de erro/ausência, testes matemáticos e de contrato, tipagem/lint/build, verificação local desktop/mobile e tema claro/escuro. Atualizar `System Design/MAPA_SISTEMAS.md` ao criar a UI.
3. **Publicação e retorno operacional:** revisão de Gabriel, push e deploy autorizados separadamente; depois verificar sessão, escopo territorial, resultados reais e exportação em ambiente publicado. Retorno importável e integração nativa são gates posteriores.

## Esclarecimento posterior em22/10

Diego encaminhou resposta de Evandro de20/10: `bases.estimation` é a única flag do empreendimento estimado na base/período; `bases.ivv_batch_id` rastreia atualizações de valores por IVV em lote. Isso resolve a função dos campos, **mas não mostra a flag por competência na API de histórico sondada**. A proposta de Gabriel é conferir uma exportação real do Geobrain contra a API numerosa. A primeira UI será apenas de leitura por API e exportação de revisão; upload e arquivo de retorno aguardam o exemplo. Ver [plano detalhado da página](PLANO_PAGINA_EDITORIAL_API_2026-10-22.md).

**Exportação recebida depois:** o Excel da Análise Temporal é agregado, sem IDs de empreendimento ou `bases.estimation`, e mistura dois municípios/tipos na captura. É útil para checagem de apresentação, produto e futuro controle agregado, não para o contrato de retorno nem para o retrospectivo individual. Guarapuava está no catálogo API do token (29 horizontais/1.167 linhas); Guaratuba não está e retornou HTTP 422. [Auditoria e manual](AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md) detalham zeros, periodicidade, IVV e o recorte necessário para comparação justa.

**Nova exportação detalhada em 22/10:** a Análise Temporal Excel trouxe 851 tipologias de Guarapuava/Maringá e 24 blocos rotulados por mês. Os 72 IDs horizontais e 124 IDs de tipologia coincidem com os da API; em 09/2026, venda líquida e estoque conciliam em 124/124 linhas cada. Somados nos oito fechamentos trimestrais entre 4T/2024 e 3T/2026, ambos os tipos reproduzem exatamente as duas tabelas de Série Histórica fornecidas por Gabriel. Logo, o **gate de paridade de IDs e medidas para esse snapshot está atendido**. Adicionar ao dossiê o validador de exportação por `(empreendimento, tipologia, competência)` antes do ensaio estatístico. Não interpretar os 24 rótulos como 24 meses de vendas: os valores de vendas estão concentrados nos fechamentos trimestrais e `-` em 10/2026 significa ausência. A flag `bases.estimation` por base/competência e a regra de periodicidade ainda faltam; essa paridade não torna o backtest observado homologável nem define ida/retorno. [Evidência](AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md).

**Curitiba confirma API como entrada direta para Horizontal, com ressalva de cobertura:** 371 empreendimentos/693 tipologias coincidem por ID com a exportação; lançamento, unidades por tipologia e todos os 14.154 pares numéricos de venda líquida e estoque em 11/2024–09/2026 bateram. A API tem ainda 116 estoques e 65 vendas preenchidos onde o Excel usa `-`. Para Vertical, 1.606/1.607 empreendimentos coincidem e 113.476 pares de cada medida batem, mas o Excel inclui uma tipologia de 11 unidades ausente da API. Logo, **não exigir exportação para operar a UI horizontal**; manter comparação de snapshots como gate de auditoria. Não declarar equivalência integral de completude ou observação real: as diferenças de cobertura e `bases.estimation` por período ainda precisam ser explicadas. Comparar por cidade, tipo, ID, competência, ausência/zero e instante do snapshot; não converter valor extra da API em gabarito observado. [Auditoria](AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md).

## Dependências objetivas

Edgar pode esclarecer em paralelo: fonte/semântica do marcador **por competência** observado/estimado; contrato do arquivo de ida/volta; distinção de rótulos horizontal aberto/fechado e revisões de oferta; código/MD do Finotti e regra da cauda/bandas se disponíveis. O restante — adaptador, auditoria, comparação, dossiê e UI — segue nesta frente sem aguardar acesso novo, respeitando os gates acima.
