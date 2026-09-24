# Briefing para IA geradora de apresentações — desenvolvimento do Panorama FIERGS

## Instrução de uso

Use todo o texto abaixo como fonte autoritativa para criar uma apresentação executiva sobre o desenvolvimento do novo **Panorama FIERGS — Região Metropolitana de Porto Alegre** no ambiente Rebrain. A apresentação será enviada por e-mail para gestores e participantes do projeto em 25 de setembro de 2026. Ela deve funcionar sem apresentação oral: cada página precisa comunicar uma conclusão clara, mas sem virar um documento excessivamente textual.

Não invente números, funcionalidades, validações ou datas. Não apresente como concluído o que ainda depende do token cartográfico ou da validação do analista. Não trate diferenças numéricas como erros confirmados da API: elas podem decorrer do congelamento histórico, exclusões, reclassificações ou tratamentos manuais empregados no relatório de referência. Diferencie claramente implementação editorial, validação técnica, validação visual e homologação metodológica.

## Resultado esperado

Crie uma apresentação executiva de **12 slides, formato 16:9**, em português do Brasil, com narrativa de projeto, decisões, evidências e próximos passos. O público inclui direção, área de inteligência, analistas e responsáveis pela plataforma. O tom deve ser seguro, transparente e orientado a resultado: mostrar que o relatório automatizado está editorialmente concluído, tecnicamente testado e pronto para a homologação final, sem esconder as duas dependências restantes.

Use títulos que expressem conclusões, não apenas temas. Prefira diagramas, linhas do tempo, cartões de status, comparações antes/depois e matrizes compactas. Evite paredes de texto, ilustrações genéricas de inteligência artificial, excesso de ícones, gradientes chamativos, imagens de pessoas artificiais e elementos meramente decorativos. Quando houver muita informação, transforme-a em agrupamentos visuais com hierarquia clara.

## Direção visual

Adote linguagem corporativa compatível com a Brain/Rebrain e com o Panorama FIERGS:

- fundo predominantemente branco;
- verde oliva Brain como cor principal;
- amarelo como destaque pontual;
- azul apenas para comparativos e estados secundários;
- preto ou grafite nos títulos;
- tipografia Montserrat nos títulos e Source Sans 3 nos textos, ou equivalentes próximos caso não estejam disponíveis;
- números principais grandes e legíveis por audiência 50+;
- margens generosas, alinhamentos rigorosos e no máximo uma mensagem principal por slide;
- tabelas apenas quando valores exatos forem essenciais;
- gráficos e diagramas com rótulos diretamente visíveis, sem depender de legendas pequenas.

A apresentação deve parecer um relatório profissional de transformação de produto e dados, não um pitch comercial de tecnologia.

## Contexto do projeto

A Rebrain já abrigava diferentes produtos e relatórios, entre eles o Relatório Secovi e o antigo Relatório Secovi/FIERGS. A criação de um novo recorte FIERGS exigiu organizar a arquitetura do produto e evitar nomes ambíguos. O novo produto foi definido como **Recorte FIERGS — RM Porto Alegre**, com dez municípios analisados e exclusão de Porto Alegre do universo numérico. O objetivo foi automatizar um estudo antes produzido em uma apresentação manual de 75 slides, preservando seu contrato editorial e sua lógica de negócio, mas corrigindo inconsistências de desenho, melhorando a leitura e incorporando rastreabilidade.

Municípios do recorte: Alvorada, Cachoeirinha, Canoas, Eldorado do Sul, Esteio, Gravataí, Guaíba, Novo Hamburgo, São Leopoldo e Viamão. Porto Alegre aparece no mapa territorial de contexto, mas não integra a consolidação numérica do preset.

O deck oficial do 4T25 foi tratado como **contrato editorial**, e não como molde visual rígido. Isso significa preservar sequência, seções, dimensões analíticas e intenção de cada página, sem copiar irregularidades, desalinhamentos, fontes pequenas ou soluções manuais difíceis de automatizar.

## Arquitetura de dados e confiabilidade

Antes da interface, foram validadas as premissas de aquisição e equivalência dos dados. A rota interna do GeoBrain tornou-se a fonte principal, com a rota pública e retries como fallback. A arquitetura foi aplicada sem quebrar o comportamento já existente do Secovi-SP. A coleta FIERGS foi otimizada para executar duas cidades simultaneamente, com teto global de seis requisições; as consultas granulares vertical e horizontal também foram paralelizadas dentro do mesmo limitador. Essa abordagem reduz o tempo total sem provocar rajadas descontroladas contra a API.

Foi criado um cubo granular e uma auditoria CSV com identificação do empreendimento, cidade, segmento, padrão, trimestre, lançamentos, vendas, oferta, preços, cobertura e motivos de rejeição. Esse artefato permite investigar divergências por cidade e empreendimento, em vez de comparar apenas totais consolidados.

As regras metodológicas distinguem fluxos e fotografias:

- lançamentos, vendas e VGV são fluxos e podem ser acumulados;
- estoque e oferta final são fotografias de fechamento e nunca devem ser somados entre trimestres;
- IVV e preços exigem médias ou ponderações adequadas;
- o mercado vertical é separado dos quatro produtos horizontais aceitos pela política FIERGS;
- números não são corrigidos artificialmente para reproduzir um PDF histórico.

## Etapas realizadas

O trabalho foi estruturado e executado nas seguintes frentes:

1. Confirmação do recorte territorial e inspeção do contrato de dados.
2. Definição da política horizontal FIERGS.
3. Criação do preset de dez cidades, sem Porto Alegre no universo numérico.
4. Criação de seletor e arquitetura própria de entidade, evitando que o relatório fosse apenas uma variação visual do Secovi.
5. Registro estável das 75 posições editoriais.
6. Incorporação de capa, fundos e aberturas institucionais oficiais.
7. Implementação de lançamentos, vendas e oferta.
8. Implementação de MCMV, análises por cidade e bairro, séries por dormitórios, IVV, preços e mercado vertical.
9. Implementação do mercado horizontal completo, separado do vertical.
10. Preparação dos três mapas e de seu estado controlado de indisponibilidade.
11. Criação da bancada de diferenças por cidade e empreendimento.
12. Comparação visual e semântica das 75 páginas, incluindo paridade entre preview e PDF.
13. Otimização da coleta multi-cidade.
14. Seis ciclos sucessivos de geração, inspeção e refinamento do PDF.

## O que foi implementado no relatório

O relatório final possui 75 páginas e nove blocos editoriais. Foram implementados:

- capa territorial dinâmica da RM Porto Alegre;
- página metodológica com dez municípios, dois segmentos e 75 lâminas automatizadas;
- sumário dinâmico e alinhado;
- nove aberturas de seção com os fundos oficiais;
- séries trimestrais completas de lançamentos, empreendimentos, vendas, VGV, oferta, IVV e preços;
- acumulados de 12 meses sem janelas incompletas;
- comparativos contextuais: trimestre contra trimestre equivalente e acumulado coerente com o fechamento — semestre no 2T, nove meses no 3T e ano no 4T;
- distribuições por padrão, tipologia, cidade e bairro;
- análises MCMV/Econômico versus demais padrões;
- séries de preço por dormitório, incluindo quatro ou mais dormitórios;
- oferta por coorte, maturidade, padrão e tipologia;
- matriz de tipologia por 12 faixas de metragem da FIERGS;
- matriz de área mínima, média e máxima, R$/m² mínimo, médio e máximo e oferta final;
- bloco horizontal com quatro produtos, coortes e faixas de preço próprios;
- equipe e encerramentos institucionais;
- exportação em PDF e estrutura preparada para PPT;
- auditoria CSV para reconciliação metodológica.

## Melhorias deliberadas sobre a referência manual

A nova versão não reproduz defeitos apenas para parecer idêntica. As principais melhorias foram:

- sistema visual consistente, com hierarquia tipográfica legível por audiência 50+;
- alinhamentos, margens e ocupação de página uniformes;
- rankings horizontais para categorias desbalanceadas, substituindo colunas decorativas difíceis de comparar;
- linhas para séries temporais, tornando tendências mais claras;
- tabelas quando valores exatos e reconciliação são mais importantes que ornamentação;
- comparativos gráficos contextuais inspirados na diretriz apresentada por Fábio, Marcos e Diego, substituindo quadros comparativos pouco intuitivos;
- indicadores e períodos sempre identificados diretamente;
- estados explícitos de indisponibilidade, em vez de páginas vazias, zeros falsos ou dados duplicados;
- conteúdo metodológico dinâmico no lugar de claims comerciais e QR codes que envelhecem;
- separação real entre produtos verticais e horizontais;
- rodapés discretos e padronizados;
- auditabilidade por empreendimento e cidade.

O princípio adotado foi: **fidelidade à informação e à intenção editorial, com melhoria do desenho e da capacidade de atualização**.

## Cheques e testes realizados

Foram executados cheques técnicos, visuais, semânticos e metodológicos:

- typecheck aprovado;
- build de produção aprovado;
- testes automatizados focados nos componentes editoriais, séries temporais, roteamento das 75 posições e renderização;
- teste que impede regressão para componentes genéricos nas posições FIERGS;
- teste de ponderação parcial para evitar mistura incorreta entre linhas com e sem peso de estoque;
- confirmação das 75 páginas no PDF;
- inspeção lado a lado contra os 75 renders oficiais;
- revisão específica de capa, sumário, aberturas, lançamentos, vendas, oferta, preços, vertical, horizontal e encerramentos;
- validação de que preview e PDF preservam destaques e rótulos SVG;
- revisão de fontes, eixos, números, densidade e legibilidade;
- seis versões sucessivas do relatório exportado;
- Teste 6 confirmando no PDF a nova página metodológica, as 12 faixas de metragem e a matriz completa de área, preço e oferta.

Durante os testes, foram corrigidos problemas concretos: abertura duplicada, roteamento dos mapas, herança visual inadequada do Secovi, séries duplicadas, eixos sobrepostos, números pequenos, diferenças entre preview e PDF, perda de estilos SVG na rasterização, ocupação insuficiente das páginas, componentes semânticos incorretos nos slides 41, 57 e 58 e uma falha possível de ponderação parcial do IVV.

## Trade-offs assumidos conscientemente

Algumas diferenças em relação ao deck manual são decisões, não defeitos:

- peças institucionais estáveis permanecem como imagens oficiais; conteúdo analítico é reconstruído dinamicamente;
- gráficos viram tabelas quando o valor exato é a informação principal;
- tabelas viram rankings quando comparação e ordenação são a informação principal;
- a capa não contém os indicadores socioeconômicos de população e potencial de consumo, pois isso exigiria incorporar uma nova API fora do escopo atual;
- o slide anual de IVV por área declara indisponibilidade porque o cubo atual não permite reconstruí-lo com segurança; não se duplica o trimestre nem se somam taxas;
- mapas permanecem nas posições 67–69 com diagnóstico controlado enquanto o token cartográfico não está configurado;
- a equipe é dinâmica e mostra apenas as pessoas atualmente configuradas, sem congelar o cadastro antigo;
- o sistema representa a fotografia atual da fonte, enquanto o relatório de referência pode conter congelamentos e intervenções manuais ainda não documentados.

## Estado atual

Classifique visualmente o projeto da seguinte forma:

- **Concluído:** arquitetura editorial própria; preset territorial; 75 posições; sistema visual; capa; aberturas; lançamentos; vendas; oferta; MCMV; cidade e bairro; dormitórios; IVV e preços; mercado vertical; mercado horizontal; auditoria CSV; paralelização; preview; PDF; comparação visual integral; Teste 6.
- **Pronto tecnicamente, aguardando infraestrutura:** três mapas, páginas 67–69.
- **Pronto para homologação metodológica:** reconciliação numérica do 4T25 com o analista.

O produto está editorialmente concluído. Não restam blocos funcionais a desenhar ou implementar. As pendências não representam falta de arquitetura; são dependências de credencial e confirmação do universo histórico.

## Pendência 1 — mapas

É necessário sincronizar a variável `VITE_MAPBOX_ACCESS_TOKEN` no ambiente local e nos ambientes de Preview e Production, autorizar os domínios Rebrain caso o token possua restrições e realizar novo deploy. Depois disso, validar:

- carregamento do fundo cartográfico;
- enquadramento dos dez municípios;
- marcadores e coordenadas;
- classificação por padrão, tipologia e produto;
- legendas e contagens;
- equivalência entre preview e PDF.

Hoje os slides exibem um estado controlado de “mapa base indisponível”, mantendo paginação, título, escopo e contagem de pontos. Não há mapa fictício nem requisição incompleta.

## Pendência 2 — conversa com o analista

A homologação numérica requer uma resposta autoritativa sobre:

- data exata de congelamento da base do 4T25;
- relação de empreendimentos e respectivos IDs incluídos ou excluídos;
- exclusões manuais aplicadas ao relatório oficial;
- reclassificações entre vertical e horizontal;
- tratamento de vendas líquidas, distratos e revisões posteriores;
- universo usado em cada análise municipal;
- eventual planilha intermediária utilizada na produção do deck oficial.

Deltas prioritários para a conversa:

- lançamentos verticais do 3T25: 634 na fotografia atual contra 138 no deck oficial;
- lançamentos verticais do 4T25: 3.082 na fotografia atual contra 2.554 no deck oficial;
- ausência de Canoas em determinada fonte municipal;
- volume anômalo de Guaíba;
- vendas consolidadas de 1.135 contra soma municipal de 2.334;
- pico de IVV de 2.033,3% em 1T22, que permanece depois da correção do acumulador e indica anomalia já presente na série temporal ou diferença de universo histórico;
- preço mínimo de R$/m² em uma tipologia que merece confirmação da fonte.

Não propor corrigir esses números manualmente. O objetivo é identificar a regra ou os empreendimentos responsáveis, incorporar uma política reproduzível e registrar a decisão na auditoria.

## Mensagem final da apresentação

Concluir com a seguinte ideia, reescrita de modo executivo:

> O Panorama FIERGS deixou de ser uma apresentação manual isolada e tornou-se um produto reproduzível da Rebrain: 75 páginas, arquitetura própria, dados rastreáveis, atualização multi-cidade, comparativos consistentes e exportação validada. O desenho editorial e a automação estão concluídos. Para a entrega definitiva, faltam apenas habilitar o fundo cartográfico e homologar com o analista o universo histórico usado no fechamento oficial do 4T25.

## Estrutura sugerida dos 12 slides

1. **O Panorama FIERGS tornou-se um produto automatizado da Rebrain** — visão geral, objetivo e estado atual.
2. **O desafio combinava 75 páginas, dez municípios e regras históricas não documentadas** — complexidade inicial.
3. **Primeiro validamos fontes e metodologia; depois construímos a interface** — sequência de trabalho.
4. **Uma arquitetura própria separou o FIERGS do Secovi sem duplicar a plataforma** — entidades, preset e reutilização segura.
5. **O pipeline agora coleta, consolida, audita e exporta o estudo completo** — fluxo visual da API ao PDF/PPT/CSV.
6. **Os nove blocos e as 75 posições do deck oficial foram preservados** — mapa de cobertura editorial.
7. **A automação melhorou legibilidade e comparação sem alterar a intenção analítica** — antes/depois e decisões visuais.
8. **Seis ciclos de teste converteram observações visuais em regras permanentes** — linha do tempo Testes 1–6.
9. **A qualidade foi verificada em código, conteúdo e arquivo exportado** — matriz de testes e evidências.
10. **Trade-offs foram documentados para evitar regressões e ajustes arbitrários** — fidelidade, tabelas/gráficos, ausência de dados e auditabilidade.
11. **Restam somente duas dependências externas** — Mapbox e homologação com o analista.
12. **O produto está pronto para fechamento e replicação** — conclusão, próximos passos e responsáveis.

## Requisitos adicionais para a IA

- Inclua notas do apresentador com duas ou três frases por slide.
- Para o slide 8, use uma linha do tempo com os seis testes e seus principais aprendizados.
- Para o slide 9, use três colunas: técnico, visual e metodológico.
- Para o slide 10, apresente “referência manual”, “decisão automatizada” e “benefício”.
- Para o slide 11, use dois cartões grandes de pendência, cada um com ação, dependência, validação e critério de encerramento.
- Não use os valores divergentes como KPIs de desempenho; apresente-os apenas como itens de reconciliação.
- Não afirme que o IVV de 2.033,3% foi corrigido. A falha potencial de ponderação foi corrigida, mas o valor persiste e aguarda validação da fonte/universo.
- Não apresente a ausência do mapa como falha geral do relatório: a composição está pronta e aguarda exclusivamente a credencial Mapbox.
- Gere uma versão editável e preserve as notas do apresentador.
