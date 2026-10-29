# SP — conteúdo e fontes dos 85 slides

**Ampliação INCC autorizada29/10:**26–30implementados com VGL trimestral/móvel12meses, os mesmos recortesMCMV e participação anual por segmento. Valores mensais corrigidos peloINCC-DI até o último mês disponível, em base única; nominais reconciliados na releitura. Reutiliza releases, índicesDIversionadosjan2021–set2026. Ausência impede apenasVGL; demais páginas continuam disponíveis. Supera pendênciasINCC mencionadas abaixo. Revisão humana/índices futuros/exportação permanecem pendentes.

**Lote vigente29/10 —23–25 e32–38:**23/24 e37/38 comparam lançamentos/vendas por tipologia/segmento nos mesmos meses dos dois anos;25Top10bairros por unidades com denominador municipal integral e reconciliação cadastral;32–36séries trimestrais/móveis12meses/MCMV e participação anual de vendas. Negativos preservados; anual com negativos usa quadro, sem área percentual. Essas implementações superam as pendências antigas desses números descritas abaixo.26–30aguardam integração INCC-DI e base: fonte/planilha recebidas, divergências registradas emDECISOES.85posições continuam sem equivaler85conteúdos concluídos.

**Estado vigente29/10 — estrutura original:** pedido explícito do usuário de manter ordem/numeração originais. Visualizador com85posições, das quais várias continuam pendentes, sem inserir os antigos complementos no fluxo. Slide2apresentação;13contagem/histórico de empreendimentos;23/24,37/38,47/48tipologias/segmentos. Os logs abaixo sobre46posições/complementos são histórico superado, não a navegação vigente.

**Lote13–22:** dez componentes analíticos: empreendimentos/unidades × trimestral,12meses,trimestralMCMV,12mesesMCMV,participaçãoanual. Cadastro reaproveitado para empreendimentos, séries municipais de lançamentos jan2021…mês disponível para unidades.17trimestres/37pontos móveis; anual2021…atual, parciais e meses equivalentes explícitos. Recortes ficam pendentes se padrão/cobertura faltar. Reconstrução cadastral e vigência histórica dos segmentos exigem revisão real; implementação local não é homologação. [Decisão vigente](DECISOES.md).

**Lote de 20 complementos — 16/10:** posições 27/28 Alto; 29/30 Compacto; 31/32 Econômico; 33/34 Luxo; 35/36 Médio; 37/38 Médio-Alto; 39/40 Standard. Em cada dupla, lançamentos/vendas nos mesmos meses dos dois anos. Posições 41–43 são quadros por padrão e 44–46 quadros por tipologia, em lançamentos/vendas/oferta. Usam as artes 18/32/46 e os dados existentes, sem consultas adicionais. Os sete padrões não são renomeados pelos quatro segmentos. Não correspondem a vinte novos slides do PPTX original. Sem preços/INCC, mapas, IVV ou granular presumidos. Navegação total de 46 inclui pendências e complementos; não traduzir para percentual dos 85 slides originais.

**Lote complementar de 12 páginas — 16/10:** posições locais 15–17 Compactos; 18–20 MCMV; 21–23 Médio Padrão; 24–26 Luxo. Em cada trio: lançamentos, vendas e oferta, com evolução mensal e comparação da mesma janela anual. Reuso das artes originais 18/32/46 e dados Padrão já consultados. São detalhamentos complementares, sem correspondência um-para-um com doze slides do PPTX; não substituem séries trimestrais completas, móveis de 12 meses ou páginas de preços/INCC/mapas. Vigência histórica da classificação e retorno real de 2025 ainda por revisar. Preenchimento conjunto pelo botão **Conferir históricos**, sem consultas extras.

**Lote16/10:** comparativos de lançamentos/vendas/oferta preparados nas páginas12/13/14, com artes18/32/46 e ação única **Conferir históricos**. Usam os mesmos meses nos dois anos e estoque no fechamento. São comparativos de janela curta, não preenchimento das curvas longas/móveis do modelo inteiro. Dados históricos reais ainda por testar na sessão pessoal;2025 de QA é fictício.

**Atualização de classificação:** Lucas confirmou a regra sete→quatro em 15/10; slides 24/38/48 já têm distribuição parcial, reaproveitando os padrões municipais. Regra e autoria em `DECISOES.md`; referências anteriores a agrupamento pendente são o histórico da preparação, não o estado atual. Comparação anual continua pendente.

**Estado atual:** Lucas apresentou as três tipologias reais reconciliadas em capturas. Artes 24/38/48 estão preparadas com classificação pendente; Lucas ainda não possui a regra sete→quatro segmentos. Padrões originais podem ser inspecionados na tela sem nova coleta. O inventário registra dependências completas e não deve ser lido como slides todos implementados.

**Atualização 15/10:** bloco 23/37/47 implementado em prévia com consulta curta por Tipologia e comparação contra os totais municipais. O inventário abaixo registra as dependências completas do modelo; séries/comparações anuais continuam pendentes. Respostas reais por dormitório ainda não observadas pelo agente; fixtures de distribuição são sintéticas e exclusivas de testes/diagnóstico.

15/10/2026 · Lucas/Codex. Referência: [PPTX original 2T2026](https://docs.google.com/presentation/d/1WhyrfFEoFeA9dam9w_F8CYWm8y1VotMB/edit). Ordem conferida em `presentation.xml`, textos e caches dos gráficos lidos; os 85 slides foram renderizados em leitura pelo PowerPoint e inspecionados em pranchas. Originais/capturas locais em `.local-inputs/relatorios-lucas/sp/full-reference/`, sem alteração do arquivo. Hash no [catálogo único](../../../handoffs/lucas-relatorios-2026-10-14/fontes/modelos.json).

**Resultado prático:** cinco páginas já têm prévia local (1/13/18/32/46), com julho/agosto. Isso não significa cinco slides completos: gráficos históricos, variações e escoamento ainda não estão preenchidos. O próximo bloco de dados é tipologia (23/37/47); padrão (24/38/48) depende primeiro da correspondência entre os grupos da API e do modelo. Não é necessário aguardar setembro para preparar esses componentes, mas o 3T completo permanece bloqueado pelo fechamento.

## Fontes e estados

Os endpoints abaixo foram conferidos no [OpenAPI versionado](../../../../src/assets/openapi/api-geobrain.json), não consultados novamente nesta rodada. Um endpoint documentado é **candidato**, sem prova de equivalência metodológica com o dashboard usado pelo analista.

| Código | Fonte e contrato a verificar |
|---|---|
| R | `/temporal-analysis-city/releases`: `releases_in_period`; `group_by=Padrão` ou `Tipologia`. Resposta real também trouxe `vgv_release`, ausente no schema versionado. |
| V | `/temporal-analysis-city/sales`: `liquid_sales`, `vgv_liquid_sales`; preservar sinais/distratos. |
| O | `/temporal-analysis-city/stock`: `stock`, `vgv_stock`; fotografia do mês, nunca somar estoques mensais. |
| H | `/building-with-history`: ID/data de lançamento/bairro/coordenadas/padrão e `typologies_history` por período. Corte `history.period <= root.period`, cobertura/deduplicação antes de agregação. |
| P | `/temporal-analysis-city/medium-prices` e `/medium-prices-meter`: médias por padrão/tipologia. Universo, pesos e exclusões ainda não demonstrados. |
| J | `/temporal-analysis-city/ivv`: valor por mês/grupo. Fórmula e agregação trimestral ainda não demonstradas. |
| X | Fonte externa a confirmar: INCC e perfil populacional/consumo. Nenhuma série nova obtida. |
| E | Analista/Marketing: texto, equipe, contatos, material institucional e aprovação. |
| A | Artes/layout do próprio PPTX. Reaproveitar a composição, sem carregar números antigos como atuais. |

**Prévia** = já aparece localmente, parcial. **Arte** = pode reaproveitar layout, ainda não montado. **Dados** = precisa de nova fonte/cobertura ou regra. **Editorial** = decisão/revisão humana. Nenhum desses estados equivale a homologação.

## Inventário completo

| Slide | Conteúdo observado no original | Fontes | Estado e o que falta para o novo período |
|---:|---|---|---|
| 1 | Capa Brain | A | Prévia: arte original preservada; contexto parcial fica no visualizador. |
| 2 | Sobre este relatório: local, tipo e período | A/E | Arte: trocar 2T por 3T2026 parcial, manter São Paulo capital/vertical. |
| 3 | Grupo Brain e marcas | A/E | Editorial: confirmar marcas/contatos atuais antes de reutilizar. |
| 4 | Sobre a Brain, números institucionais | A/E | Editorial: números estão em imagem; Marketing confirma vigência, não recalcular pela API. |
| 5 | GeoBrain, plataforma e números de cobertura | A/E | Editorial: métricas comerciais em imagem; confirmar versão atual. |
| 6 | Sumário e navegação | A | Arte: refletir apenas páginas efetivamente montadas; não anunciar bloco pronto sem conteúdo. |
| 7 | Perfil de São Paulo: população e consumo | X/A | Dados: ano/fonte/base territorial dos percentuais e mapa a confirmar; não copiar 25,6%/39,6%. |
| 8 | Divisória: destaques do estudo | A | Arte: manter layout; conteúdo depende dos slides 9–11. |
| 9 | Destaque: participação MCMV nos lançamentos | R/H/E | Editorial: classificação MCMV, participação no ano/12 meses e prova de recorde; texto antigo não reutilizável. |
| 10 | Destaque: vendas MCMV e comparação anual | V/H/E | Editorial: universo MCMV e janelas equivalentes; revisão do analista. |
| 11 | Destaque: recorde de lançamentos em 12 meses | R/H/E | Editorial: série completa, IDs distintos e prova do recorde antes de redigir. |
| 12 | Divisória: lançamentos verticais | A | Arte: reaproveitar sem números. |
| 13 | Empreendimentos lançados, série trimestral | Cadastro /building por ID/data/padrao atual | Previa implementada: Trimestral. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 14 | Empreendimentos lançados, móvel 12 meses | Cadastro /building por ID/data/padrao atual | Previa implementada: Movel 12 meses. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 15 | Empreendimentos lançados MCMV, trimestral | Cadastro /building por ID/data/padrao atual | Previa implementada: Trimestral MCMV. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 16 | Empreendimentos MCMV, móvel 12 meses | Cadastro /building por ID/data/padrao atual | Previa implementada: Movel 12 meses MCMV. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 17 | Participação anual dos empreendimentos por segmento | Cadastro /building por ID/data/padrao atual | Previa implementada: Participacao anual por segmento. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 18 | Unidades lançadas, série trimestral | R municipal por mes/padrao | Previa implementada: Trimestral. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 19 | Unidades lançadas, móvel 12 meses | R municipal por mes/padrao | Previa implementada: Movel 12 meses. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 20 | Unidades lançadas MCMV, trimestral | R municipal por mes/padrao | Previa implementada: Trimestral MCMV. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 21 | Unidades lançadas MCMV, móvel 12 meses | R municipal por mes/padrao | Previa implementada: Movel 12 meses MCMV. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 22 | Participação anual das unidades lançadas por segmento | R municipal por mes/padrao | Previa implementada: Participacao anual por segmento. Cobertura/segmentos historicos reais em revisao; parcial e falhas explicitas. |
| 23 | Lançamentos por tipologia, comparação com mesmo trimestre anterior | R | Dados: `group_by=Tipologia`, soma de fluxos; trazer base comparável e reconciliar com total. |
| 24 | Lançamentos por segmento, comparação anual | R/H | Prévia: agrupamento confirmado por Lucas aplicado à parcial atual; comparação histórica pendente. |
| 25 | Top 10 bairros por unidades lançadas | H | Dados: bairro normalizado, lançamentos na janela e denominador de toda a cidade; sem usar só top 10 como total. |
| 26 | VGL trimestral em R$ milhões, corrigido INCC | R/H/X | Dados: validar `vgv_release` real e método de correção, série/índice/mês-base do INCC. |
| 27 | VGL corrigido INCC, móvel 12 meses | R/H/X | Dados: corrigir valores conforme contrato antes de acumular, com janela completa. |
| 28 | VGL MCMV trimestral, corrigido INCC | R/H/X | Dados: INCC mais classificação MCMV; não exibir valor nominal sob título de valor corrigido. |
| 29 | VGL MCMV corrigido INCC, móvel 12 meses | R/H/X | Dados: mesmas regras do 28 e janela completa. |
| 30 | Participação anual no VGL por segmento | R/H/X | Dados: segmentos e universo; confirmar se a participação usa VGL nominal ou corrigido. |
| 31 | Divisória: vendas verticais | A | Arte: reaproveitar sem números. |
| 32 | Vendas líquidas, série trimestral | V | Prévia: julho/agosto disponíveis; faltam série histórica e variações com janelas equivalentes. |
| 33 | Vendas líquidas, móvel 12 meses | V | Dados: 12 meses completos por ponto; manter vendas negativas. |
| 34 | Vendas MCMV, trimestral | V/H | Dados: classificação MCMV e mesma janela das vendas gerais. |
| 35 | Vendas MCMV, móvel 12 meses | V/H | Dados: classificação e janela móvel completa. |
| 36 | Participação anual das vendas por segmento | V/H | Dados: histórico desde 2021, segmentos e denominadores; tratar participação com fluxos negativos explicitamente. |
| 37 | Vendas por tipologia, comparação anual | V | Dados: `group_by=Tipologia`, soma de vendas líquidas e base equivalente. |
| 38 | Vendas por segmento, comparação anual | V/H | Prévia: classificação confirmada aplicada, preservando vendas líquidas; comparação histórica pendente. |
| 39 | Top 10 bairros por vendas líquidas | H | Dados: validar `sold_in_period` versus vendas líquidas municipais; bairro/cobertura/distratos. |
| 40 | VGV vendido trimestral, corrigido INCC | V/X | Dados: `vgv_liquid_sales` recebido é candidato nominal; corrigir somente com índice/mês-base confirmados. |
| 41 | VGV vendido corrigido INCC, móvel 12 meses | V/X | Dados: correção validada e janela móvel completa. |
| 42 | VGV vendido MCMV trimestral, corrigido INCC | V/H/X | Dados: classificação MCMV mais correção e cobertura. |
| 43 | VGV vendido MCMV corrigido INCC, móvel 12 meses | V/H/X | Dados: mesmas regras do 42 e janela completa. |
| 44 | Participação anual no VGV vendido por segmento | V/H/X | Dados: segmentos, série anual e definição nominal/corrigida da participação. |
| 45 | Divisória: oferta | A | Arte: atualizar nota de período antiga ao montar. |
| 46 | Oferta final histórica e escoamento por padrão | O/H/V | Prévia: estoque agosto disponível; curva e escoamento pendentes. Confirmar denominador e janela de vendas do escoamento. |
| 47 | Oferta por tipologia, comparação anual | O | Dados: `group_by=Tipologia`, fotografia do fechamento e base equivalente anterior. |
| 48 | Oferta por segmento, comparação anual | O/H | Prévia: quatro segmentos confirmados, fotografia agosto; comparação histórica pendente. |
| 49 | Divisória: VSO/IVV | A | Arte: reaproveitar sem números. |
| 50 | IVV, série trimestral | J/V/O | Dados: contrato de IVV trimestral; não somar nem tirar média simples dos índices mensais automaticamente. |
| 51 | IVV por área útil, tabela MCMV/demais padrões | H/J | Dados: faixas de área, oferta inicial/final, lançamentos/vendas e fórmula; agregados atuais não cruzam metragem. |
| 52 | Divisória: evolução dos preços | A | Arte: reaproveitar sem números. |
| 53 | Evolução R$/m², média geral | P/H | Dados: pesos/universo, corte temporal e cálculo trimestral antes das variações. |
| 54 | Evolução R$/m², 1 dormitório | P/H | Dados: tipologia e método de preço comparável; não média de médias sem pesos. |
| 55 | Evolução R$/m², 1 dormitório sem MCMV | H/P | Dados: exclusão MCMV não consta como filtro do endpoint temporal; requer contrato granular. |
| 56 | Evolução R$/m², 2 dormitórios | P/H | Dados: tipologia, pesos e histórico. |
| 57 | Evolução R$/m², 2 dormitórios sem MCMV | H/P | Dados: mesma exclusão pendente do 55 e histórico. |
| 58 | Evolução R$/m², 3 dormitórios | P/H | Dados: tipologia, pesos e histórico. |
| 59 | Evolução R$/m², 4 dormitórios | P/H | Dados: confirmar agrupamento 4/4+ e histórico. |
| 60 | Divisória: preços por tipologia e padrão | A | Arte: reaproveitar sem números. |
| 61 | Ticket médio por sete padrões e média geral | P/H | Dados: sete grupos coincidem nominalmente com API; ainda faltam universo/pesos e fotografia válida. |
| 62 | R$/m² por sete padrões e média geral | P/H | Dados: preço por área e média ponderada conforme método; não derivar média geral pela média dos sete valores. |
| 63 | Ticket por dormitório, com recortes MCMV/MAP | P/H | Dados: tipologia mais cruzamento de segmentos; confirmar significado de MAP e pesos. |
| 64 | R$/m² por dormitório, com recortes MCMV/MAP | P/H | Dados: mesmas classificações do 63 e definição da área privativa. |
| 65 | Divisória: estado atual do mercado | A | Arte: reaproveitar sem números. |
| 66 | Estoque por ano de lançamento e idade da oferta | H/O/E | Dados: fotografia de cada tipologia por coorte; incluir lançamentos antigos. Texto revisado após total reconciliar. |
| 67 | Mapa de estoque, visão ampla | H/A | Dados: coordenadas válidas, estoque positivo no fechamento, classes/legenda e base cartográfica licenciada. |
| 68 | Mapa de estoque, aproximação | H/A | Dados: mesma fotografia e classes do 67, enquadramento distinto. |
| 69 | Tabela de estoque por padrão, MCMV e faixa 4 | O/H/E | Dados: sete grupos para totais, preços para subfaixa e regra MCMV vigente; texto/limites antigos não são regra nova. |
| 70 | Mapa por padrão, visão ampla | H/A | Dados: coordenadas, classificação e universo do fechamento; legenda original a confirmar. |
| 71 | Mapa por padrão, aproximação | H/A | Dados: mesma base/classificação do 70. |
| 72 | Tabela de estoque por dormitório e destaques | O/H/E | Dados: tipologia, fotografia e denominador; texto depende dos percentuais reconciliados. |
| 73 | Estoque cruzado por dormitório e metragem | H/O/E | Dados: `number_bedroom`, `private_area`, `typology_stock`, limites de faixa e cruzamento completo. |
| 74 | Mapa por R$/m², visão ampla | H/A | Dados: preço/m² válido no fechamento, coordenadas e cortes da legenda. |
| 75 | Mapa por R$/m², aproximação | H/A | Dados: mesma fotografia e faixas do 74. |
| 76 | Oferta lançada/final por estágio e tipologia | H | Dados: apesar do título “tempo médio”, gráficos são Planta/Construção/Pronto; validar `building_status` histórico e pesos. Não usar `time_on_sale` como substituto. |
| 77 | Oferta lançada/final por estágio e segmento | H | Dados: mesmos estágios do 76, classificação de segmentos e bases de oferta lançada/final. |
| 78 | Tabela VGV ofertado/disponível por padrão | H/O/V | Dados: ticket, unidades lançadas/vendidas/estoque e valores compatíveis na mesma fotografia; não multiplicar qualquer média pelo total. |
| 79 | Mapa por VGV da oferta final, visão ampla | H/A | Dados: soma de `vgv_stock` por empreendimento, coordenadas/classes; conciliar com total municipal. |
| 80 | Mapa por VGV da oferta final, aproximação | H/A | Dados: mesma fotografia e classes do 79. |
| 81 | Divisória: consultores | A/E | Arte: vincular à equipe confirmada, não presumir autoria do novo estudo. |
| 82 | Equipe técnica nominal e fotos | E/A | Editorial: confirmar responsáveis e funções da edição 3T2026. |
| 83 | Consultoria, pessoas e fotos | E/A | Editorial: confirmar composição e material autorizado atualizado. |
| 84 | Imprensa e veículos | E/A | Editorial: confirmar versão institucional; imagem do modelo não prova atualização. |
| 85 | Encerramento e contato Brain | E/A | Editorial: confirmar endereço/contatos, preservar identidade. |

## Sequência de montagem

1. **Tipologias — 23/37/47:** preparar três gráficos com os layouts correspondentes. Próxima leitura curta proposta: R/V/O com `group_by=Tipologia`, mesma cidade/tipo e somente meses efetivamente fechados. Conferir soma por dormitório contra os três totais já conhecidos; grupos ausentes não viram zero. Reaproveitar a consulta Padrão existente para totais de controle. Não misturar parcial julho/agosto com trimestre anterior completo em percentuais de variação.
2. **Segmentos — 24/38/48:** confirmar a classificação antes de reagrupar. API: Alto, Compacto, Econômico, Luxo, Médio, Médio-Alto, Standard. Modelo: Compactos, MCMV, Médio Padrão, Luxo. As sete categorias já recebidas podem alimentar diagnóstico; não são prova da conversão em quatro. No slide 69, limites de preço e faixa 4 também precisam de data/regra explícitas.
3. **Histórico — 18/19/32/33/46:** começar por um indicador e uma janela curta pareada ao PPT, conferir cobertura e data de extração; só depois estender a série. Séries trimestrais do modelo começam em 2T2022; móveis de 12 meses mostram junho/2023 em diante e exigem pelo menos julho/2022 para o primeiro ponto; participações anuais começam em 2021. Isso exige um plano de volume separado, não ampliar a consulta atual silenciosamente.
4. **Granular — 13 e blocos 25/39/51/66–80:** planejar paginação, checkpoint, cancelamento e custo para a cidade antes de buscar milhares de históricos. Fechamentos heterogêneos exigem uma política confirmada, não escolher o maior mês nem supor que a amostra representa todos.
5. **Preços/IVV/INCC e revisão:** fechar contratos de médias, índices e MCMV; depois preencher gráficos e textos do analista. Exportação editável/auditoria só após fonte e reconciliação suficientes.

**Artes de apoio:** 2/6/divisórias podem ser montadas sem novos números; 3–5/7/82–85 exigem confirmação do conteúdo institucional. Isso não fecha os indicadores nem justifica percentual de conclusão por número de slides.

## Regras técnicas que afetam a montagem

- **Período:** `data.period` da raiz limita o histórico de cada empreendimento; a amostra observada permite apenas uma conferência parcial municipal, não certifica toda a cidade. Dia 01 representa referência mensal. Setembro não libera por calendário.
- **Comparações:** preferir janelas idênticas, mesma fonte e fotografia. Para apresentar o original 3T2025 × 3T2026 completo, esperar setembro fechado. Uma versão parcial deve declarar a janela real e adaptar rótulos, sem manter percentuais trimestrais antigos.
- **INCC:** VGL/VGV enviados por Lucas têm valores, mas não provam correção monetária. Não preencher páginas “corrigido pelo INCC” com valores nominais.
- **Schemas:** a documentação local de R não declara `vgv_release`, embora a resposta real o contenha. Registrar/validar o contrato real antes de criar dependência. `sold` no histórico é acumulado; não somar como fluxo. `sold_in_period` ainda precisa conciliar com `liquid_sales`.
- **Mapas e tabelas em imagens:** os mapas 67–80 e alguns quadros são figuras no PPTX, não conectores de dados. Reutilizar a imagem antiga não atualiza o mercado. Gerar nova composição só quando a base e legenda estiverem verificadas.
- **Contexto histórico:** estoque junho API recebido (127.179) difere do PPTX (118.362). Não emendar as duas fotografias para produzir uma curva única sem explicação/reconciliação.

## Retomada

Mapeamento concluído; nenhuma nova coleta de API, geração de relatório, publicação ou Monday nesta rodada. O próximo trabalho de implementação é o bloco 23/37/47 com contrato de tipologia e leitura curta delimitada; MCMV/INCC/IVV permanecem decisões metodológicas abertas. Férias de Lucas desde 19/10, retorno não informado: este mapa e `PLAN.md` guardam a retomada, sem trabalho agendado durante a ausência. Previsão humana de setembro em 22–25/10 não substitui a raiz observada.
**Atualização 16/10 — segmentos:** páginas locais 9/10/11, artes originais 24/38/48, agora com comparação dos mesmos meses de dois anos após **Conferir históricos**. Sem requests adicionais; classificação SP de Lucas e totais reconciliados. Vigência histórica a revisar; retorno real de 2025 pendente. Não equivale a séries anuais completas desde 2021.
