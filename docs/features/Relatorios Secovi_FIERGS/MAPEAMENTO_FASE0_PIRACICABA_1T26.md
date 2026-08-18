# Fase 0 — mapa integral de paridade — Panorama Secovi/FIERGS

**Referência canônica:** Piracicaba/SP · 1T2026 · fechamento 03/2026  
**Deck fonte:** `Panorama_Secovi_SP_Piracicaba_1T26_vApres_28MAI_13h50.pptx`  
**Destino V1:** `/rebrain/panorama-secovi-fiergs` · preview no navegador + PDF paginado 16:9  
**Estado:** escopo fechado para implementação; métodos ainda sem aceite humano permanecem explicitamente sinalizados.

## 1. Decisões fechadas nesta fase

1. A V1 entrega **preview no browser e PDF paginado**, ambos com os **62 slides** do deck de referência. PPTX editável não faz parte desta versão.
2. O slide 5 é a fonte de verdade da estrutura de navegação. No app, ele ganha um sumário lateral por seção; no PDF, mantém a página fiel e recebe links internos/bookmarks.
3. A capa municipal (slide 2) é parte da paridade visual. Não pode continuar omitida do manifesto nem ser tratada como capa redundante.
4. Asset institucional pode ser exportado do PPTX e usado diretamente. Conteúdo parametrizável preserva o layout, mas troca somente dados/cidade/período. Tabelas, gráficos, mapa e narrativas precisam de contrato próprio: uma imagem de referência nunca substitui cálculo desconhecido.
5. O resultado sempre distingue **paridade visual com o deck** de **método homologado pelo analista**. Uma página sem método preserva sua estrutura e exibe a condição editorial; não recebe `0`, mock ou tabela repetida.

## 2. Evidências consultadas

- O deck primário possui **62 slides** e tamanho nativo **13,333 × 7,5 pol. (16:9)**.
- Foram inspecionados todos os slides no próprio PPTX (textos, imagens, tabelas e gráficos nativos), além do catálogo e das séries do [gabarito congelado](./GABARITO_CONGELADO_PANORAMA_PIRACICABA_1T26_v1.md).
- Há gráficos nativos em 14–19, 23–26 e 40; as tabelas e boa parte dos gráficos de mercado são imagens/objetos colados no deck. Slides 57–62 já têm PNGs oficiais exportados em `src/features/panorama-secovi-fiergs/assets/corporate/`.
- A exportação visual automática pelo PowerPoint não está disponível nesta sessão por ausência de sessão COM interativa. Isso não bloqueia o mapa: o PPTX, seus objetos e o gabarito são a evidência de referência. Antes do aceite visual, o QA deve exportar o deck em 1920×1080 no ambiente com PowerPoint e comparar lado a lado.

## 3. Estrutura de navegação

| Seção do sumário | Slides | Destino no app |
|---|---:|---|
| Sobre o SECOVI-SP | 6–10 | institucional |
| Análise de Lançamentos | 11–19 | lançamentos |
| Análise de Vendas | 20–27 | vendas |
| Análise Geral do Mercado | 28–29 | resumo |
| Mercado Residencial Vertical | 30–46 | vertical |
| Mercado Residencial Horizontal | 47–49 | horizontal |
| VGV Geral | 50–51 | vgv |
| Análises e Observações | 52–54 | narrativa |
| Localização dos Empreendimentos | 55–56 | mapa |
| Consultores do Estudo | 57–62 | créditos e encerramento |

O preview mostra a seção atual, páginas inicial/final, estado metodológico agregado e a lista de slides. Um clique no item do sumário desloca o preview ao slide; anterior/próxima continuam disponíveis. No PDF, o sumário aponta para páginas e o documento contém bookmarks com a mesma árvore.

## 4. Matriz de estado Piracicaba 1T26

`APPROVED` só pode significar aceite documentado de analista. Como ainda não há retorno de analista registrado, nenhum cálculo quantitativo é promovido a esse estado nesta Fase 0.

| Bloco / slides | Estado atual | Regra, divergência ou bloqueio |
|---|---|---|
| Estrutura, capas, divisores, institucional e encerramento | Paridade visual | Sem cálculo; reproduzir fielmente por asset/template. |
| Lançamentos — empreendimentos/unidades verticais (12–17) | `RECONCILED` | `building_id` distinto + `release_date`; `total_units` no lançamento fecha 17/17 trimestres. |
| Lançamentos horizontais (12–17) | `DIVERGENT` | API contém empreendimentos adicionais; identificar IDs e submeter curadoria, sem exclusão silenciosa. |
| VGV lançado e MCMV (18–19) | `OPEN_METHOD` | Fórmula oficial de VGV e critério MCMV não foram aprovados. |
| Vendas e VGV vendido (21–26) | `ASSUMED` | Exigem confronto entre fluxo temporal e cálculo granular antes de promoção. |
| Oferta, disponibilidade e resumo (27, 29, 31–35) | `ASSUMED` / `RECONCILED` parcial | Disponibilidade = oferta final / oferta lançada; ainda falta coleta autenticada e universo final por dimensão. |
| IVV e faixa de área (27) | `RECONCILED` parcial | Fórmula: vendas / (estoque anterior + lançamentos); falta validação dimensional por faixa. |
| Ticket, área e preço/m² (36–40, 49) | `OPEN_METHOD` | População, peso e data de fotografia da média não estão definidos. |
| Coortes e maturidade (33, 41–46, 48) | `OPEN_METHOD` | Coorte por `release_date` é candidata; regra Planta/Construção/Pronto precisa de aceite. |
| VGV geral (51) | `OPEN_METHOD` | Preferir valor bruto da fonte; identidade entre lançado, estoque e vendido ainda não fecha. |
| Narrativas (53–54) | `ASSUMED` | Apenas fatos determinísticos de contratos promovidos; qualitativo/editorial fica pendente. |
| Mapa (56) | `OPEN_METHOD` | Falta definir universo exato de marcadores e reconciliar coordenadas. |

## 5. Contratos e cálculos por bloco

| Contrato | Slides consumidores | Fonte/cálculo alvo | Aceite técnico mínimo |
|---|---:|---|---|
| `launch.projects` | 12–15 | `building-with-history`; `building_id` distinto por `release_date` | vertical fecha o gabarito nos 17 trimestres |
| `launch.units` | 12–17 | `total_units` na fotografia de lançamento; contraprova `typologies_history.qty` | soma por tipo/padrão e por trimestre consistente |
| `launch.vgv` | 12–19 | candidatos: `vgv_total` ou unidades × preço no lançamento | fórmula oficial e campos ausentes definidos; enquanto isso, `OPEN_METHOD` |
| `sales.units` / `sales.vgv` | 21–26 | fluxo trimestral: soma mensal de `sold_in_period`; VGV contra preço da mesma origem | vertical + horizontal = total; anual = soma trimestral |
| `stock.units` | 27, 29, 31–35, 41–48 | último snapshot do fechamento; oferta lançada por coorte | dimensões somam o mesmo universo, sem estoque negativo |
| `availability` | 29, 31–35 | oferta final / oferta lançada | 0–100% e denominador explícito |
| `ivv` | 27 | vendas / (estoque anterior + lançamentos) | contraprova equivalente e faixas somando o total |
| `prices` | 36–40, 49 | `medium-prices` / `medium-prices-meter` ou granular ponderado | peso, população e data confirmados |
| `cohorts` / `maturity` | 33, 41–46, 48 | ano de `release_date`; idade no fechamento ou estágio aprovado | grupos exclusivos e soma igual ao universo |
| `stock.vgv` | 51 | campo bruto de VGV de estoque, separado de VGV lançado/vendido | identidade contábil explicada ou estado aberto |
| `narrative.facts` | 53–54 | templates sobre contratos promovidos | cada frase aponta para uma métrica/versionamento |
| `locations` | 56 | mesmo universo vertical + lat/lon válidos | marcadores = lista exibida; duplicidades e fora do município tratadas |

## 6. Especificação visual completa

| Slides | Família visual de referência | Reprodução V1 almejada |
|---:|---|---|
| 1 | capa de pesquisa, texto editorial e marca | template fiel, cidade/ano parametrizados; manter assinatura e composição do deck |
| 2 | capa municipal com mapa, painel vermelho e marcas | template fiel obrigatório; Piracicaba/ano parametrizados; não omitir |
| 3 | visão, missão e valores | asset estático exportado do PPTX, salvo mudança institucional aprovada |
| 4 | abertura “Panorama imobiliário” | template de capa com cidade, UF, trimestre e ano; mesma composição do deck |
| 5 | sumário em fundo branco, título escuro, filete amarelo e links sublinhados | página fiel + links PDF; no app, a mesma taxonomia move a navegação lateral |
| 6, 9, 11, 20, 28, 30, 47, 50, 52, 55, 57 | divisores de seção | exportação de asset/template fiel; tipografia, marca, foto e hierarquia não devem ser trocadas por card genérico |
| 7–8, 10 | páginas institucionais e objetivos | asset estático ou template textual fiel; não usar o layout genérico atual |
| 12–13, 21–22 | tabelas comparativas e anuais | tabela 16:9 fiel: cabeçalho, cores, rodapé, tipografia, células de variação e notas; conteúdo vem dos contratos correspondentes |
| 14–19, 23–26, 40 | gráfico nativo + faixa anual + variações | componentes dedicados por gráfico, não uma única linha genérica; preservar legenda, cores, escala, rótulos, cards anuais e rodapé do deck |
| 27 | matriz de oferta, lançamentos, vendas e IVV por faixa | componente matriz específico, com faixas de área e regras de variação; não usar `MetricTable` |
| 29 | resumo vertical/horizontal/mercado | matriz-resumo com três universos e disponibilidade; contrato `stock.units` dimensional |
| 31, 33, 34, 41, 43, 45, 48 | tabelas de mercado com narrativa lateral/superior | componentes de tabela próprios por dimensão (padrão, coorte, tipologia ou maturidade), respeitando a hierarquia de colunas e texto analítico |
| 32, 35, 37, 39, 42, 44, 46 | gráficos derivados e participações | barras/matrizes dedicadas, derivadas da mesma tabela-base; nunca repetir a tabela de estoque |
| 36, 38, 49 | preço, área e ticket | tabela de três métricas com unidade/formatação monetária e comentário de contexto; só preencher após método de ponderação |
| 51 | VGV ofertado/disponível/vendido | matriz monetária com fonte e data explícitas; manter estrutura mesmo se uma coluna estiver aberta |
| 53–54 | narrativa analítica | texto determinístico por contrato promovido; reservar blocos editoriais para a entrega de edição posterior |
| 56 | mapa de empreendimentos | mapa cartográfico, base visual equivalente e marcadores do universo validado; não um plano cartesiano genérico |
| 58 | equipe/créditos | asset exportado do PPTX ou template de créditos idêntico, conforme necessidade de parametrização |
| 59–62 | encerramento visual | usar os PNGs oficiais existentes, sem recriação por CSS/HTML |

### Regras transversais de paridade

- Canvas de cada página: 1920×1080 na captura, equivalente ao 16:9 nativo.
- Rodapé, fonte e elaboração são elementos de template; não podem sumir entre famílias de página.
- Uma página de referência com tabela/gráfico em imagem exige reconstrução pelo contrato e QA visual. Reutilização raster direta só é válida para conteúdo estático.
- Cada slide no registry declara `sectionId`, `page`, `visualFamily`, `dataContracts`, `methodStatus`, `referenceAsset`, `qaState` e `fallbackNotice`.
- O preview e o PDF consomem o mesmo `PanoramaReportModel` e o mesmo registry; não há cálculo exclusivo do exportador.

## 7. Correções de escopo obrigatórias antes de chamar a V1 de fiel

1. Restaurar o slide 2 no manifesto e no PDF: são **62 páginas**, não 61.
2. Remover o uso de uma única `MetricTable` para 29, 31–35, 41–46, 48 e 56. Cada família listada acima recebe componente e contrato próprio.
3. Substituir as capas/divisores/corporativos genéricos por assets ou templates visualmente equivalentes ao PPTX.
4. Substituir o mapa cartesiano pela representação cartográfica definida para o slide 56.
5. Consolidar o exportador direto de PDF; não manter `window.print` ou ponte global como caminho de produto.

## 8. Critério de saída da Fase 0

A fase está concluída quando este mapa for a fonte de verdade do backlog e o time puder responder, para **todo** slide: qual é sua seção, seu visual, quais contratos o abastecem, que estado metodológico possui e como será verificado contra Piracicaba 1T26.

O próximo planejamento detalhado deve seguir a ordem: registry de 62 slides + sumário → PDF direto → templates/assets institucionais → contratos e componentes de Lançamentos/Vendas/Resumo → Mercado Vertical → Preços/Coortes/Maturidade → Horizontal/VGV/Mapa → QA visual lado a lado e homologação com analistas.
