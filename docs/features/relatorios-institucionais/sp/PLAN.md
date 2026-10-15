# SP capital — primeiro mapeamento

15/10/2026 · Lucas/Codex · Primeira fatia G2 autorizada por Lucas e implementada localmente com dados fictícios. Sem push.

**Entrega pretendida:** núcleo vertical do **3T2026 (01/07–30/09)**. O PPTX do **2T2026** é referência histórica, não fonte dos números do próximo trimestre.

| Indicador | Slide do PPTX | Fonte candidata no motor | Tratamento proposto |
|---|---:|---|---|
| Empreendimentos lançados | 13 | Histórico por empreendimento | Contar IDs distintos com lançamento na janela |
| Unidades lançadas | 18 | Mesmo histórico, `total_units`/tipologias | Somar unidades dos empreendimentos lançados na janela |
| Vendas líquidas | 32 | Série municipal `sales`, campo `liquid_sales` | Movimento do trimestre, preservando distratos e sinal |
| Oferta final | 46 | Série municipal `stock` + histórico granular | Estoque no fechamento, incluindo empreendimentos antigos |

Slides identificados pela ordem real do PPTX, não por blocos do texto extraído. Fontes candidatas exigem comprovação de cobertura/método em SP. Valores do gabarito, fórmulas e pendências estão na [matriz](MATRIZ_INDICADORES.csv); referências técnicas em [evidências](EVIDENCIAS.md).

**Disponível localmente:** menu e busca “SP institucional”, rota lazy `/rebrain/relatorios-institucionais/sp`. Reutiliza GeoApiScopeSelector/useGeoApiScope, Select, Alert e Table existentes. Catálogo pessoal autorizado antes de qualquer prévia; somente SP capital. Ação explícita “Ver prévia com dados de teste”; sem coleta de mercado/exportação. Exemplo 2T fechado mostra quatro contagens; exemplo 3T com raiz em agosto mantém indicadores indisponíveis. Troca de UF/cidade/trimestre/identidade invalida o resultado.

**Contrato desta fatia:** histórico limitado ao menor entre o fim selecionado e `period` da raiz, conforme orientação do dev da API transmitida por Lucas. Fechamentos ausentes/divergentes, cobertura insuficiente, falta de observações e deltas bloqueiam indicadores. Contagens por ID, vendas mensais com sinal e estoque histórico no fechamento têm testes sintéticos; o adaptador/API real e o método completo SP continuam por comprovar. Políticas Secovi/FIERGS preservadas, sem renomear suas entidades.

**Próximo portão:** transporte real delimitado, fechamento consistente na cidade e reconciliação 2T com a mesma fonte/fotografia do gabarito. O usuário confirmou São Paulo no catálogo e trouxe consultas manuais; isso não equivale à coleta granular completa. Mensal, recortes MCMV, INCC/preços, IVV, destaques editoriais, gráficos/paginação e exportação ficam para próximas fatias aprovadas.

**Previsão operacional informada por Lucas:** operação fecha dia 20 do mês seguinte e analista leva mais 2–3 dias; estimativa de dados de setembro na API em 22–25/10. Informação humana, não SLA ou data de liberação automática. O `period` observado na raiz continua sendo o limite efetivo.

**Pausa:** férias a partir de 19/10, retorno não informado. Retomar por este plano e pelo [STATUS](../../../handoffs/lucas-relatorios-2026-10-14/STATUS.md), conferindo Git antes de alterar. Gabriel coordena decisões durante a ausência, sem entrega presumida.
