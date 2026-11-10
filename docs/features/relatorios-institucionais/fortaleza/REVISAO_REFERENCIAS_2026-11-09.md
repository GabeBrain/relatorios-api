# Fortaleza — revisão dos originais e base estrutural

09/11/2026 · Lucas / Codex · base Git `c78a7c1` sobre origin/main `ecbc34f`. Pedido: conferir material e preparar base tomando FIERGS/SP como referências, sem acesso no painel e sem publicação.

## Fontes comprovadas

Os dois IDs do [catálogo original](../../../handoffs/lucas-relatorios-2026-10-14/fontes/modelos.json) retornaram PPTX no parent esperado. Download bruto autenticado do conector, arquivos locais ignorados em `.local-inputs/relatorios-lucas/fortaleza/`; sem mudança no Drive. Links temporários de download e conteúdo de credenciais não foram versionados.

| Referência | SHA-256 do original | Bytes | Slides reais | Partes de gráfico | Dimensão EMU |
|---|---|---:|---:|---:|---|
| Junho/2T2026 | `9627305db0022997961cd8feb37523cca49111ee8277947a0e4544b5bc66a78a` | 20.323.736 | 89 | 49 | 12192000 × 6858000 |
| Julho/2026 | `296fe59a14cb914e84c070700a177fe999950aab54468ea261ade2167fa245a8` | 10.025.584 | 60 | 47 | 12192000 × 6858000 |

Contagem/ordem: `ppt/presentation.xml` e seus relacionamentos, não ordem alfabética de arquivos nem blocos de texto. Conferidos XML de todas as páginas, títulos, tabelas, imagens e referências de gráficos. Os 89/60 blocos da rodada anterior coincidem com a sequência real; só agora há comprovação binária. O [MAPA_BLOCOS](MAPA_BLOCOS.md) conserva a evidência inicial. Manifesto pequeno derivado em `src/features/relatorios-institucionais/fortaleza/references.json`, com fonte/hash/contagens/ordem e títulos, sem números de mercado ou binários.

## Revisão visual amostral

Office inicialmente falhou ao iniciar COM no sandbox (`80080005`); execução aprovada fora do isolamento abriu ambos os originais em modo sem janela, somente leitura. Renderizados 12 PNGs a 1280×720: junho 1/2/10/16/40/45/55 e julho 1/10/40/47/52. Inspecionados visualmente nesta rodada junho 1/10/16/40/45 e julho 47. Amostra, não homologação visual de todos os 149 slides.

- **Identidade:** capa Sinduscon-CE/CPES roxa/verde, parceiros e rodapé próprios. Conteúdo com fundo claro, cabeçalho azul, verde/ciano, marca CPES. Não substituir pelos assets FIERGS/SP para representar Fortaleza.
- **Junho 10:** composição trimestral e semestral no mesmo slide; comparação exige janelas explícitas. Não reduzir a uma série mensal única.
- **Junho 16:** o próprio slide mostra subtotal vertical 1.829 e “Total” 32. Revisão visual confirma que o 32 não é erro de extração textual. Sem inferir intenção do subtotal ou copiar esse número como regra de cálculo.
- **Junho 40:** oferta por padrão separa vertical, horizontal e comercial. Estrutura diferente dos fluxos com loteamentos em painéis separados; contrato por página.
- **Junho 45:** exclusões do preço vertical RM estão visíveis no estudo. Não são exclusões globais de estoque ou vendas.
- **Julho 47:** abertura junho RM 3.380 e fechamento julho 4.013 na mesma tabela, com lançamentos 1.099 e vendas líquidas 466. Confere a identidade agregada nesse quadro; não prova método/cobertura do backend nem compara a mesma fotografia do deck junho.

Ponderação, INCC, teto/classificação MCMV e revisões de fotografia seguem [DECISOES](DECISOES.md). Não houve consulta de API para explicar divergências. Original é gabarito histórico de apresentação, não base contínua nem aprovação de fórmulas.

## Base preparada

- Rota lazy `/rebrain/relatorios-institucionais/fortaleza`; nenhuma entrada adicionada a Home/AppLayout/CommandPalette. AppLayout recebeu somente extensão do comportamento mobile já existente para esta rota.
- GeoApiScopeSelector/useGeoApiScope consultam somente catálogo autorizado. UF antes de município, sem IBGE; conjunto Fortaleza/RM exige todos os cinco, sem aceitar subconjunto silencioso.
- Periodicidade mensal/trimestral separada, competência e abertura de estoque explícitas no modelo. Estrutura local conserva ordem das 60/89 páginas e fonte/hash. As páginas aparecem como dados a integrar ou conteúdo editorial a revisar; nenhum total fictício ou gráfico preenchido com números do original.
- BrainLoadingState overlay acompanha catálogo com tempo real e processamento local cancelável; troca de filtros/token invalida resultado e operação. Sem botões de coleta/geração/exportação de estudo real nesta base.
- Abas Estrutura, Referências e Metodologia; links para os dois originais. Não é um relatório pronto, nem implementação do desenho editorial dos 149 slides.

## Retomada técnica

Na raiz: iniciar `npm.cmd run dev -- --host 127.0.0.1 --port 5179 --strictPort`; abrir a rota acima. Diagnóstico reproduzível: `node scripts/diagnostics/fortaleza-base-visual.mjs`, Edge headless, somente localhost e catálogo sintético, demais redes abortadas. Evidências/capturas ficam locais em `.local-inputs/relatorios-lucas/fortaleza/ui/`.

Antes de conectar fonte: confirmar mesma competência/universo, cobertura/autorização e campos mensais. Seguir os portões de PLAN e registrar decisões, preservando consumidores existentes e sem liberar exportação com lacunas ocultas.
