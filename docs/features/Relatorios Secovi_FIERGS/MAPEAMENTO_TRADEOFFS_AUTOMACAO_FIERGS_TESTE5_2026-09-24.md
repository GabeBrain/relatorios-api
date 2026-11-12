# FIERGS RM Porto Alegre — vistoria do Teste 5 e trade-offs da automação

**Data:** 2026-09-24  
**Sistema avaliado:** PDF de 75 páginas, 960 × 540 pt, 12,7 MB  
**Referência:** `Panorama_FIERGS_RM_Porto_Alegre_4T25.pptx` e seus 75 renders oficiais  
**Saída avaliada:** `panorama-alvorada-cachoeirinha-canoas-e-mais-7-4T2025 (5).pdf`

## Veredito

A versão 5 já preserva a sequência, os nove blocos, as principais dimensões analíticas e o encerramento do material oficial. A saída do sistema é mais consistente, legível e auditável que a referência em séries históricas, comparativos e tabelas. A automatização não exige voltar ao desenho antigo.

As diferenças residuais se dividem em três grupos:

1. **Melhorias deliberadas:** hierarquia tipográfica, comparativos contextuais, tabelas consistentes, séries completas e rodapés discretos.
2. **Trade-offs aceitáveis:** gráficos viram tabelas quando a tabela comunica melhor valores exatos; peças promocionais fixas viram conteúdo metodológico que não envelhece; páginas sem fonte autoritativa declaram indisponibilidade.
3. **Dependências externas:** mapas sem token e números que dependem do congelamento/exclusões do analista.

## Matriz completa por bloco e página

| Páginas | Referência | Sistema v5 | Diferença/trade-off | Revisão da oportunidade | Decisão |
|---|---|---|---|---|---|
| 1 | Capa Brain | Mesma peça institucional | Sem perda | Imagem integral é correta por ser fixa | Manter |
| 2 | Capa promocional FIERGS/GeoBrain | Capa limpa do estudo, trimestre dinâmico | Remove mockup de celular e chamada comercial | A capa do relatório deve identificar estudo e período; o anúncio envelhece | Manter sistema |
| 3–4 | Institucionais Brain | Mesmas peças integrais | Sem perda | Slides fixos não devem ser reconstruídos | Manter |
| 5 | Peça promocional GeoBrain com números e QR | “Sobre o estudo” muito vazio | Conteúdo promocional fixo foi substituído por metodologia | Evitar claims e QR desatualizados é correto, mas o vazio não era necessário | **Melhorado após Teste 5:** três cartões de escopo, segmentos e cobertura |
| 6 | Sumário com rodapé verde | Sumário branco, alinhado e dinâmico | Menos decoração, paginação sempre atual | Melhor legibilidade e elimina manutenção manual | Manter sistema |
| 7 | Mapa, título, período e percentuais socioeconômicos | Mapa, título, período e 10 municípios; sem percentuais | API Socio deliberadamente fora do escopo | Não vale adicionar nova dependência só para dois indicadores | Manter; registrar ausência |
| 8 | Abertura Lançamentos | Fundo oficial integral | Sem perda | — | Manter |
| 9, 11, 12, 14, 20, 22 | Séries históricas com quadros anuais/semestrais | Série completa + comparativo contextual à direita | Troca quadros por visual Sinduscon/Fábio | Melhor leitura: trimestre e acumulado pertinente ao fechamento | Manter sistema |
| 10, 13, 17, 18, 21 | Barras/colunas por padrão ou tipologia | Ranking horizontal com total, participação e top 3 | Menos “gráfico decorativo”, mais comparação direta | Melhor para audiência 50+ e categorias desbalanceadas | Manter sistema |
| 15–16 | Comparação vertical × casas e percentuais MCMV | MCMV/Econômico × demais padrões, série trimestral/12 meses | Segmentação passa a refletir a intenção editorial FIERGS | Evita misturar casas em uma análise intitulada vertical | Manter sistema |
| 19 | Barras por bairro/cidade | Dois rankings paralelos | Visual mais compacto e automatizável | Preserva as duas dimensões e melhora ordenação | Manter sistema |
| 23 | Abertura Vendas | Fundo oficial integral | Sem perda | — | Manter |
| 24, 26, 32–33 | Séries e barras comparativas | Série completa + comparativos contextuais | Mesma decisão das séries de lançamentos | Mais consistente entre blocos | Manter sistema |
| 25, 29–31 | Distribuições de vendas | Rankings horizontais; cidade em barras | Layout mais limpo e números maiores | Nenhuma dimensão relevante perdida | Manter sistema |
| 27–28 | Vendas por padrão/acumulado | MCMV × demais padrões | Mesma política do lançamento | Evita duplicação das páginas 24/26 | Manter sistema |
| 34 | Abertura Oferta | Fundo oficial integral | Sem perda | — | Manter |
| 35 | Oferta final histórica | Série e comparativo de fechamento | Sistema não soma snapshots | Metodologicamente superior à soma de estoque | Manter sistema |
| 36–37 | Duas colunas comparativas | Tabelas condicionais com lançada, final, participação e disponibilidade | Mais densidade e menos apelo visual | A tabela contém mais informação e é auditável; fonte foi ampliada | Manter sistema |
| 38 | Abertura VSO/IVV | Fundo oficial integral | Sem perda | — | Manter |
| 39 | IVV entre 12,7% e 27,8% na referência | V5 exibiu pico de 2.033,3% | Não é trade-off visual: ponderação parcial corrompia o indicador | Acumulador misturava valor ponderado e sem peso no mesmo numerador | **Corrigido após Teste 5**, com teste de regressão |
| 40 | IVV por área no trimestre | Tabela por faixas com oferta anterior/final, lançamentos, vendas e IVV | Sistema contém mais rastreabilidade | Métrica granular usa identidade contábil e não depende do endpoint quebrado por tipologia | Manter sistema |
| 41 | IVV por área no ano | Indisponibilidade explícita | Histórico anual por área não existe no cubo atual | Duplicar o trimestre ou somar taxas seria pior | Manter indisponível até fonte autoritativa |
| 42 | Abertura Preços | Fundo oficial integral | Sem perda | — | Manter |
| 43–47 | Colunas de evolução do R$/m² | Linhas temporais, total e 1–4+ dormitórios | Troca coluna por linha | Linha comunica tendência melhor; todos os trimestres permanecem visíveis | Manter sistema |
| 48 | Abertura Tipologia/Padrão | Fundo oficial integral | Sem perda | — | Manter |
| 49–52 | Colunas de ticket e preço | Tabelas + gráficos de barras com média | Mais precisão e menos ornamento | A combinação tabela/gráfico cobre valor exato e comparação | Manter sistema |
| 53 | Abertura Mercado Vertical | Fundo oficial integral | Sem perda | — | Manter |
| 54 | Oferta por ano de lançamento | Tabela de coortes com lançada, final e disponibilidade | Sistema acrescenta reconciliação | Melhor completude | Manter sistema |
| 55–56 | Oferta por padrão/tipologia | Tabelas condicionais mais completas | Visual menos colorido | Mais informação, totais e disponibilidade | Manter sistema |
| 57 | Matriz metragem × dormitórios em 12 faixas | V5 usava faixas canônicas mais largas e matriz transposta | A simplificação reduzia fidelidade desnecessariamente | O cubo possui área suficiente para reproduzir as faixas FIERGS | **Melhorado após Teste 5:** 12 faixas e orientação da referência |
| 58 | Área mín./média/máx., R$/m² mín./média/máx. e oferta | V5 continha apenas R$/m² | Perda de conteúdo não exigida pela automação | Todos os campos existem no cubo | **Melhorado após Teste 5:** área, preço e oferta restaurados |
| 59–60 | Barras empilhadas de maturidade | Matrizes numéricas por tipologia/padrão | Perde leitura visual imediata, ganha exatidão | Para muitas categorias, tabela é mais auditável; gráfico seria redundante | Manter sistema; gráfico é melhoria futura opcional |
| 61 | VGV por padrão | Matriz completa com empreendimentos, ticket, unidades e VGV | Sistema é mais denso | Contém mais informação e subtotais | Manter sistema |
| 62 | Abertura Mercado Horizontal | Fundo oficial integral | Sem perda | — | Manter |
| 63–66 | Oferta, coorte e preço dos quatro produtos | Tabelas próprias FIERGS | Layout mais neutro e menos condicional | Preserva os quatro produtos e separa o horizontal do vertical | Manter; shares são melhoria opcional no 63 |
| 67–69 | Mapas completos com fundo e marcadores | Estado controlado “mapa base indisponível”, contagens e escopo | Fundo cartográfico ausente | Não há alternativa honesta sem token; marcadores não devem aparecer em mapa fictício | Bloqueado por `VITE_MAPBOX_ACCESS_TOKEN` |
| 70 | Abertura Consultores | Fundo oficial integral | Sem perda | — | Manter |
| 71 | Equipe em fundo claro com cinco pessoas | Três pessoas disponíveis em fundo azul | Diferença de cadastro, não de automação | O sistema deve usar apenas pessoas/fotos configuradas, sem congelar equipe antiga | Manter dinâmico; completar cadastro se necessário |
| 72–75 | Encerramentos institucionais | Mesmas peças integrais | Sem perda | — | Manter |

## Trade-offs transversais reavaliados

### 1. Fidelidade visual versus sistema visual consistente

O material oficial alterna rodapés, tabelas, cores e tamanhos. Copiar cada irregularidade aumentaria custo e reduziria legibilidade. O sistema mantém Montserrat/Source Sans, verde Brain, amarelo de ênfase e azul apenas nos comparativos. Esse trade-off já está no ponto correto.

### 2. Gráficos versus tabelas

O deck usa gráficos mesmo onde os valores exatos são o principal conteúdo. O sistema usa rankings para distribuições, linhas para tempo e tabelas para matrizes. A escolha é sistemática e melhora acessibilidade. Barras empilhadas de maturidade podem ser adicionadas no futuro, mas não são necessárias para completude.

### 3. Conteúdo fixo versus informação que envelhece

Institucionais estáveis permanecem como imagem integral. Claims comerciais, QR codes e números promocionais não foram congelados. O slide 5 agora comunica escopo do próprio estudo, reduzindo manutenção e risco de publicar propaganda vencida.

### 4. Ausência de dado versus preenchimento aparente

O slide 41 e os mapas mantêm a posição editorial, mas declaram a dependência. Isso é superior a duplicar trimestre como ano, desenhar mapa falso ou exibir zero como ausência.

### 5. Comparabilidade histórica versus fotografia atual da API

O sistema reproduz a fonte atual. O deck oficial pode conter congelamento, exclusões ou correções manuais. A auditoria CSV da versão 5 possui 780 registros e permite reconciliar o universo, mas não substitui a lista oficial do analista.

### 6. Preview versus PDF/PPT

O Teste 5 confirmou a correção dos estilos SVG: placas e números destacados aparecem no PDF como no preview. O teste automatizado impede regressão para retângulos pretos sem texto.

## Pendências reais depois desta revisão

1. Sincronizar `VITE_MAPBOX_ACCESS_TOKEN`, republicar e validar enquadramento, marcadores e legendas dos slides 67–69.
2. Obter do analista data de congelamento, IDs incluídos/excluídos, reclassificações e tratamento de distratos; calcular deltas sobre a auditoria CSV.
3. Registrar tempo total da geração publicada e, idealmente, tempo de coleta separado do tempo de rasterização das 75 páginas.
4. Gerar um PDF regressivo após as correções pós-Teste 5 do IVV e dos slides 5, 57 e 58.

## Conclusão

Não há justificativa para voltar ao desenho da referência. A versão automatizada já é mais consistente e completa na maior parte do livro. As oportunidades encontradas no Teste 5 eram localizadas e foram resolvidas sem sacrificar automação. O que resta depende de infraestrutura cartográfica, reconciliação humana do universo histórico e medição no ambiente publicado.
