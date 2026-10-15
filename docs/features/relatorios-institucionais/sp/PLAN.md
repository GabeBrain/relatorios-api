# SP capital — primeiro mapeamento

**Regra confirmada e aplicada — 15/10:** Lucas informou Compactos=Compacto; MCMV=Econômico; Médio Padrão=Standard+Médio+Médio-Alto; Luxo=Alto+Luxo. Os slides 24/38/48 (posições 9/10/11) agora recebem gráficos com essa regra SP, preservando os três totais e a parcial julho/agosto. Sem consulta nova. Próximo conteúdo: planejar a janela/cobertura das séries históricas, antes de qualquer coleta adicional. Comparações anuais, setembro e exportação seguem pendentes.

**Segmentos — 15/10:** Lucas confirmou os três slides por tipologia com capturas reais; somas batem com os totais municipais. Slides 24/38/48 preparados com artes originais nas posições 9/10/11, explicitamente pendentes. Lucas ainda não tem a regra dos sete padrões→quatro segmentos; aguardar analista para preencher. O detalhamento original da API está em **Ver padrões recebidos da API**, reaproveitando a consulta municipal sem nova coleta.

**Tipologias — 15/10:** implementados os slides 23/37/47 na prévia (posições 6/7/8). Após conferir os totais reais, usar **Conferir tipologias**: nova amostra de fechamento e R/V/O por Tipologia, no mesmo limite curto (até duas páginas por fonte). Somas mensais, estoque inicial/final e totais devem coincidir com a consulta municipal; diferença ou fechamento alterado bloqueiam os gráficos. Layout original, percentuais do período parcial, sem comparação anual presumida. Testes usam distribuição sintética identificada, não dados reais de dormitórios; próxima validação é o botão na sessão pessoal de Lucas. Sem exportação/coleta granular.

**Próximo conteúdo — 15/10:** [mapa dos 85 slides](MAPA_SLIDES.md) concluído por leitura OOXML e inspeção visual do modelo completo. Próximo bloco: lançamentos/vendas/oferta por tipologia (23/37/47), com layout original e contrato de dados a conferir. Padrões 24/38/48 dependem da conversão dos sete grupos da API para quatro segmentos do PPT; não presumir Econômico=MCMV. Históricos, INCC, IVV e mapas têm fontes e limites explicitados no mapa. Nenhuma nova coleta nesta rodada.

**Correção visual 15/10:** prévia substitui os cards genéricos por capa e quatro páginas com artes do PPTX original, escala 16:9 e ampliação. Séries mensais julho/agosto, sem comparativos históricos presumidos. Revisão local no Edge concluída; exportação/PPTX editável e demais slides permanecem pendentes. Merge remoto `dbb7330` autorizado por Lucas preservou `75ef905`, sem push.

**Avanço 15/10 — montagem local:** Lucas confirmou a consulta autenticada por capturas: julho/agosto e balanços com diferença zero. Acrescentada prévia navegável com capa, indicadores e evolução mensal, alimentada pelo resultado da consulta, sem novas chamadas ou exportação. Trimestre permanece parcial; contagem de empreendimentos, cobertura granular, revisão editorial e setembro pendentes. Próximo: revisar as páginas com Lucas e delimitar a cobertura granular. Férias desde 19/10 mantidas, sem execução presumida durante a ausência.

15/10/2026 · Lucas/Codex · Estrutura e conferência municipal curta implementadas localmente. Lucas apresentou capturas da consulta autenticada com julho/agosto e balanços zerados; testes do agente continuam com replay, sem acesso ao token pessoal. Sem push.

**Entrega pretendida:** núcleo vertical do **3T2026 (01/07–30/09)**. O PPTX do **2T2026** é referência histórica, não fonte dos números do próximo trimestre.

| Indicador | Slide do PPTX | Fonte candidata no motor | Tratamento proposto |
|---|---:|---|---|
| Empreendimentos lançados | 13 | Histórico por empreendimento | Contar IDs distintos com lançamento na janela |
| Unidades lançadas | 18 | Mesmo histórico, `total_units`/tipologias | Somar unidades dos empreendimentos lançados na janela |
| Vendas líquidas | 32 | Série municipal `sales`, campo `liquid_sales` | Movimento do trimestre, preservando distratos e sinal |
| Oferta final | 46 | Série municipal `stock` + histórico granular | Estoque no fechamento, incluindo empreendimentos antigos |

Slides identificados pela ordem real do PPTX, não por blocos do texto extraído. Fontes candidatas exigem comprovação de cobertura/método em SP. Valores do gabarito, fórmulas e pendências estão na [matriz](MATRIZ_INDICADORES.csv); referências técnicas em [evidências](EVIDENCIAS.md).

**Disponível localmente:** menu/busca “SP institucional”, rota lazy `/rebrain/relatorios-institucionais/sp`, GeoApiScopeSelector/useGeoApiScope e primitives existentes. Ação principal “Conferir dados reais”: uma amostra de empreendimento e séries municipais paginadas (vendas, lançamentos, estoque); limite de duas páginas por série, cancelamento/retry. Não coleta os milhares de históricos. Ação secundária “Ver prévia com dados de teste” permanece separada. Troca de escopo/identidade/trimestre cancela e invalida resultados; sem exportação.

**Julho/agosto:** consulta municipal aparece como **parcial do 3T até agosto**, com unidades lançadas/vendas/estoque e balanços mensais. Replay das respostas reais recebidas: 24.351 lançadas, 26.824 vendas líquidas, estoque final 124.706; deltas mensais zero. Empreendimentos permanece indisponível: uma amostra não comprova a contagem ou fechamento de toda a cidade. Setembro não entra na soma se a raiz indica agosto; não há liberação por calendário.

**Contrato desta fatia:** histórico limitado ao menor entre o fim selecionado e `period` da raiz, conforme orientação do dev da API transmitida por Lucas. Fechamentos ausentes/divergentes, cobertura insuficiente, falta de observações e deltas bloqueiam indicadores. Contagens por ID, vendas mensais com sinal e estoque histórico no fechamento têm testes sintéticos; o adaptador/API real e o método completo SP continuam por comprovar. Políticas Secovi/FIERGS preservadas, sem renomear suas entidades.

**Próximo portão:** conferir os slides agrupados na sessão de Lucas e delimitar uma primeira janela histórica com cobertura/fotografia comparáveis. Regra dos segmentos confirmada por Lucas para este SP; não presumir vigência em todo o histórico. Totais e tipologias pessoais já foram apresentados em capturas; cobertura granular e fechamento consistente da cidade continuam pendentes. Não iniciar varredura longa automaticamente. Reconciliação 2T com gabarito da mesma fotografia, INCC/preços, IVV, narrativa, gráficos completos e exportação seguem abertos. O agente não acessou navegador pessoal/credencial; capturas e testes não homologam o estudo integral.

**Previsão operacional informada por Lucas:** operação fecha dia 20 do mês seguinte e analista leva mais 2–3 dias; estimativa de dados de setembro na API em 22–25/10. Informação humana, não SLA ou data de liberação automática. O `period` observado na raiz continua sendo o limite efetivo.

**Pausa:** férias a partir de 19/10, retorno não informado. Retomar por este plano e pelo [STATUS](../../../handoffs/lucas-relatorios-2026-10-14/STATUS.md), conferindo Git antes de alterar. Gabriel coordena decisões durante a ausência, sem entrega presumida.
