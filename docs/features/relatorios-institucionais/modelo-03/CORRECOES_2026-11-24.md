# Modelo 03 — diagnóstico Curitiba e interpretação geográfica dos originais

24/11/2026 · Codex/Lucas · base `fb8cfbf7`. Lucas autorizou publicar ao terminar esta rodada. Escopo exclusivo do motor Modelo 03; motores próprios de Maceió, Fortaleza e SP preservados.

## Diagnóstico recebido

`modelo-03-curitiba-quarterly-2026-3-diagnostico.json`: 97 posições, 35 disponíveis, 23 aguardando fonte e 39 editoriais. As 99 fontes estavam concluídas, sem falha de transporte. A geração é **3T2026**, não mensal.

| Causa | Posições no JSON | Referência ADEMI-PR | Correção comum |
|---|---|---|---|
| Exigência mensal sobre pesquisa trimestral/zero pós-esgotamento | 14, 16, 22, 24, 26, 28, 34, 35, 37 | 49, 51, 57, 59, 61, 63, 69, 70, 72 | Validar calendário da pesquisa; zero somente confirmado pelo histórico completo |
| Econômico sem agrupamento MCMV | 17, 18, 29, 30 | 52, 53, 64, 65 | Aplicar correspondência explicitamente confirmada por Lucas |
| Balanço IVV divergente | 41–43 | 76–78 | Calcular fórmula com dados observados e registrar delta, sem reescrever estoques |
| Fotografia incompleta em Almirante Tamandaré | 51–54, 58, 59, 81 | 86–89, 93, 94, 142 | Isolar empreendimento inconsistente, indicar base parcial e preservar contribuintes válidos |

O arquivo não exporta cadastros individuais. Os **16 quadros de agregados** foram reproduzidos pelo script `scripts/diagnostics/modelo03-replay.mjs`, sem pendências no replay. Este usa os agregados reais; a ponte de detalhes é construída por grupo para conferir zeros, não reproduz o cadastro individual. Os **sete quadros detalhados** foram cobertos por regressões sintéticas de fotografias incompletas; dependem de nova geração autenticada para confirmar seus resultados reais. Não declarar 23/23 homologados a partir deste replay.

Evidência local ignorada pelo Git: `.local-inputs/relatorios-lucas/modelo-03/replay-curitiba-3T2026.json`, com SHA256 do JSON de entrada, método, valores e avisos. Agregados de fechamento reproduzidos: Curitiba/RM, oferta final **11.599 / 3.208**; lançamentos3T **2.465 / 1.581**; vendas3T **2.966 / 1.175**. São valores retornados pelo diagnóstico, não uma coleta nova nem reconciliação com material antigo.

## Regras aplicadas

- `survey-cadence.json`: cadastro derivado da [Lista de cidades monitoradas](https://docs.google.com/spreadsheets/d/1FGRGa_PB47CJwGBhww5owleHCp0b8pkE/edit), 357 municípios, UF/cidade/cadência/início, obtido em24/11. Metadado de periodicidade, **não autorização de acesso**. GeoApiScopeEngine continua obrigatório. Histórico realmente mensal com12 competências consecutivas prevalece sobre essa referência datada.
- Fluxos trimestrais/semestrais usam as observações dos períodos completos da cidade; não distribuem um total trimestral por meses inventados. Uma edição mensal continua podendo mostrar séries anuais/estoques válidos, mas meses sem decomposição ficam sem valor, com aviso. Zero não substitui ausência.
- MCMV = Econômico; Compactos = Compacto; Médio Padrão = Standard/Médio/Médio-Alto; Luxo = Alto/Luxo. Confirmado por Lucas nesta sessão, aplicado em detalhes, filtros e IVV por padrão. Categorias não mapeadas são preservadas, não descartadas.
- Fonte não concluída continua falha. Em detalhe concluído, empreendimento incompleto é retirado integralmente do quadro, com contagem, motivo e estoque observado excluído. Bases parciais são identificadas; cidade sem qualquer fotografia válida aparece sem cobertura e valores nulos, nunca oferta zero. Duplicata conflitante não conserva arbitrariamente o primeiro registro. Avisos persistem quando a fotografia é reutilizada do cache local do cálculo.
- Preço ausente não usa preço cadastral atual nem exclui unidades silenciosamente da ponderação: média fica sem valor e quantidades permanecem. Erro de uma célula/grupo não elimina automaticamente todas as cidades do slide.
- IVV = vendas / (oferta inicial + lançamentos). Se oferta final divergir, os valores observados e a diferença são preservados em advertências. Denominador zero continua sem índice; não é convertido em0%.
- JSON registra cadência, calendário esperado, agrupamento e modo geográfico. Campos de outra métrica não aparecem como falsos campos faltantes: ausência de `stock` numa fonte de vendas não é erro dessa fonte.

## Geografia dos 16 materiais

Foram inspecionados textos dos slides e séries dos gráficos em XML nos16PPTX, além dos mapas já conferidos na implantação. A evidência completa fica em `.local-inputs/relatorios-lucas/modelo-03/geography-audit-2026-11-24.json`. Isto verifica interpretação geográfica; não significa revisão visual integral ou reprodução de todos os layouts.

| Estudo | Interpretação | Evidência do original |
|---|---|---|
| Uberlândia | Cidade única | Séries Uberlândia:4,6,29 |
| Rio de Janeiro | Cidade única | Séries Rio de Janeiro:8,11,12,15 |
| Curitiba | Curitiba e RM agregada | Séries Curitiba/RM:46,48,49,51; preços86–87 |
| Joinville | Total combinado Joinville/Araquari; preços também por cidade | Séries conjuntas4,6,27; Joinville/Araquari42–43 |
| Niterói | Cidade única | Título e séries Niterói10–12; zonas locais |
| Rio Verde | Cidade única | Séries Rio Verde79,81,98; outras RMs no bloco nacional |
| Ponta Grossa | Cidade única | Séries Ponta Grossa2–4,21 |
| Blumenau | Cidade única | Título7, série8 e oferta31 |
| Itajaí/Navegantes | Comparação nominal das duas cidades; original também tem composições conjuntas | **13: duas séries Itajaí/Navegantes**,15:12meses;14: composição conjunta |
| Penha/Balneário Piçarras | Comparação nominal das duas cidades |13,15,16; composições conjuntas14,17 |
| São Luís | Cidade e RM agregada |12,14:São Luís/Região Metropolitana; padrão local13 |
| Campo Grande | Cidade única | Capa/títulos locais; não seguir nome residual Teresina e RM nos caches |
| Belém | Cidades nominais em comparação |12,14,38:Belém/Ananindeua; mapa inclui Marituba; sem chamar soma de todas de Ananindeua |
| Natal | Cidade e RM agregada; certos quadros de bairros cobrem ambas |10,12: cidades/RM; padrões locais11,15; bairros18,28 incluem RM |
| Boa Vista | Cidade única | Títulos e quadro local Boa Vista31; Recife é rótulo residual |
| Teresina | Cidade/RM agregada nos comparativos; detalhes conjuntos em quadros específicos |9,11 comparativos;10,16–18,27–29,34–35 identificam Teresina e RM; IVV39–40 identifica Teresina |

IDs e links de todos os originais permanecem em `PRESETS` e na aba Referências da tela. Itajaí/Navegantes: [original](https://drive.google.com/file/d/10gBZV-s8Ol51GCvse0wCr8nDuzDpLT14/view),13 possui duas séries no mesmo gráfico, não dois gráficos separados. O atual quadro de empreendimentos por ano do Modelo03 passa a incluir ambas as cidades. Penha/Piçarras segue a mesma distinção. O Modelo03 continua uma adaptação do molde comum: não reproduz cada posição/composição do PPTX específico.

Alertas da referência: caches incluem `Barra Velha` em Niterói, `Teresina e RM` em Campo Grande, `Recife` em Boa Vista e rótulos Curitiba/Salvador em outros decks. Não são prova de inclusão dessas cidades; não foram importados. Natal2T2026 tem nota “Sem Nísia Floresta” na oferta final; não se transforma essa exclusão histórica em regra automática de todas as competências. A seleção atual da API continua explícita, sujeita à conferência do analista.

## Validação e limites

73 testes Modelo03 aprovados, incluindo as três periodicidades,16recortes, fonte mensal com RM trimestral, cidade principal trimestral, agrupamento dos sete padrões, zero confirmado, fotografia parcial/totalmente inválida, duplicata conflitante, IVV divergente e bairros homônimos de cidades diferentes. Lint aprovado. Build aprovado; cenários Edge sintéticos Curitiba trimestral desktop e Itajaí trimestral desktop/mensal celular concluídos com JSON/CSV/PPTX baixados e lidos. Capturas inspecionadas.

Sem token pessoal de script para nova coleta imobiliária autenticada. Próxima geração real precisa confirmar os sete quadros detalhados e eventual lacuna adicional antes oculta pelo primeiro bloqueio. A rodada não inventa dados nem transforma todos os nulos em disponíveis numericamente.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`. Sem escrita no Monday.
