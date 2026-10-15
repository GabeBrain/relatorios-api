# SP capital — primeiro mapeamento

15/10/2026 · Lucas/Codex · G1 documental em andamento; G2 não autorizado.

**Entrega pretendida:** núcleo vertical do **3T2026 (01/07–30/09)**. O PPTX do **2T2026** é referência histórica, não fonte dos números do próximo trimestre.

| Indicador | Slide do PPTX | Fonte candidata no motor | Tratamento proposto |
|---|---:|---|---|
| Empreendimentos lançados | 13 | Histórico por empreendimento | Contar IDs distintos com lançamento na janela |
| Unidades lançadas | 18 | Mesmo histórico, `total_units`/tipologias | Somar unidades dos empreendimentos lançados na janela |
| Vendas líquidas | 32 | Série municipal `sales`, campo `liquid_sales` | Movimento do trimestre, preservando distratos e sinal |
| Oferta final | 46 | Série municipal `stock` + histórico granular | Estoque no fechamento, incluindo empreendimentos antigos |

Slides identificados pela ordem real do PPTX, não por blocos do texto extraído. Fontes candidatas exigem comprovação de cobertura/método em SP. Valores do gabarito, fórmulas e pendências estão na [matriz](MATRIZ_INDICADORES.csv); referências técnicas em [evidências](EVIDENCIAS.md).

**Próximo portão:** conferir catálogo autorizado para São Paulo e, com autorização de leitura delimitada de dados, provar cobertura julho/agosto/setembro, natureza das vendas e fechamento de estoque. Comparar 2T2026 com o gabarito da mesma janela/fotografia, explicando diferenças; não comparar os números de 3T com os de 2T como se fossem deltas de reconciliação.

**Antes de G2:** decidir contrato próprio SP, cobertura de ausências, deduplicação, fonte canônica e guardas. Sem copiar a política FIERGS ou usar `fiergs-rs` como SP. Mensal, recortes MCMV, INCC/preços, IVV, narrativa, acumulados e apêndices ficam fora desta primeira fatia; portanto não é o relatório integral.

**Pausa:** férias a partir de 19/10, retorno não informado. Retomar por este plano e pelo [STATUS](../../../handoffs/lucas-relatorios-2026-10-14/STATUS.md), conferindo Git antes de alterar. Gabriel coordena decisões durante a ausência, sem entrega presumida.
