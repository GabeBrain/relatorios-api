# SP capital — primeiro mapeamento

**Avanço 15/10 — montagem local:** Lucas confirmou a consulta autenticada por capturas: julho/agosto e balanços com diferença zero. Acrescentada prévia navegável com capa, indicadores e evolução mensal, alimentada pelo resultado da consulta, sem novas chamadas ou exportação. Trimestre permanece parcial; contagem de empreendimentos, cobertura granular, revisão editorial e setembro pendentes. Próximo: revisar as páginas com Lucas e delimitar a cobertura granular. Férias desde 19/10 mantidas, sem execução presumida durante a ausência.

15/10/2026 · Lucas/Codex · Estrutura e conferência municipal curta implementadas localmente. Testes com respostas reais de julho/agosto fornecidas por Lucas; execução autenticada do novo botão ainda não observada. Sem push.

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

**Próximo portão:** executar o novo botão com login pessoal no ambiente autorizado e confrontar seu resultado com o replay. Depois delimitar a coleta granular para os quatro indicadores e fechamento consistente na cidade; não iniciar varredura longa automaticamente. Reconciliação 2T com gabarito da mesma fotografia, recortes MCMV, INCC/preços, IVV, narrativa, gráficos/paginação e exportação seguem abertos. O agente não teve navegador pessoal/credencial para executar a consulta real; o teste usa respostas recebidas via mocks, sem alegação de runtime autenticado validado.

**Previsão operacional informada por Lucas:** operação fecha dia 20 do mês seguinte e analista leva mais 2–3 dias; estimativa de dados de setembro na API em 22–25/10. Informação humana, não SLA ou data de liberação automática. O `period` observado na raiz continua sendo o limite efetivo.

**Pausa:** férias a partir de 19/10, retorno não informado. Retomar por este plano e pelo [STATUS](../../../handoffs/lucas-relatorios-2026-10-14/STATUS.md), conferindo Git antes de alterar. Gabriel coordena decisões durante a ausência, sem entrega presumida.
