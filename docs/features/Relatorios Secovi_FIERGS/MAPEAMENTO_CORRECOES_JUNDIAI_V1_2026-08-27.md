# Mapeamento consolidado de correções — Panorama Jundiaí — V1

**Data do mapeamento:** 2026-08-27
**Fonte analisada:** `src/features/panorama-secovi-fiergs/assets/exportados/panorama-jundiaí-1T2026 - Corrigido.pdf`
**Relatório:** Jundiaí/SP · 1T2026 · 62 slides
**Analista:** Juliana (`juuhg`, nas anotações do PDF)
**Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`

## 1. Objetivo e precedência

Este documento consolida o primeiro retorno da analista sobre o PDF de Jundiaí com o mapa técnico
já existente do Panorama. Ele complementa, sem substituir:

1. [`MAPEAMENTO_FASE0_PIRACICABA_1T26.md`](./MAPEAMENTO_FASE0_PIRACICABA_1T26.md);
2. [`GABARITO_CONGELADO_PANORAMA_PIRACICABA_1T26_v1.md`](./GABARITO_CONGELADO_PANORAMA_PIRACICABA_1T26_v1.md);
3. [`DECISOES_E_PREMISSAS_PANORAMA.md`](./DECISOES_E_PREMISSAS_PANORAMA.md).

Quando houver conflito de apresentação ou regra de produto, o comentário explícito da analista neste
PDF prevalece sobre a reprodução do deck de Piracicaba. O gabarito de Piracicaba continua servindo
como referência estrutural e matemática onde Juliana não se pronunciou.

## 2. Inventário do retorno

- 62 slides inspecionados visualmente.
- 28 comentários internos encontrados em 27 slides.
- Slides comentados: `2, 3, 14–19, 23, 31, 33–46, 48, 49 e 51`.
- O comentário do slide 23 estende as correções dos gráficos de lançamentos a toda a seção de vendas,
  portanto afeta também os slides `24–26`.
- Juliana informou que **não revisou/corrigiu o resumo do Panorama**. Assim, os slides de resumo e
  narrativa sem comentário não podem ser tratados como homologados.

### Vocabulário de execução

- `V1-CORRIGIR`: requisito objetivo para a próxima entrega.
- `V1-VALIDAR`: não há mudança editorial pedida, mas o aceite exige teste/inspeção.
- `V2-ADIADO`: fora da V1 por decisão de escopo registrada.

## 3. Correções transversais recebidas por e-mail

| ID | Pedido | Diagnóstico no código atual | Decisão para V1 | Aceite |
|---|---|---|---|---|
| G-01 | Selecionar mais de uma cidade | `PanoramaScope.city` é escalar e `GeoApiScopeSelector` seleciona um município. | `V1-CORRIGIR`: permitir múltiplas cidades autorizadas, inicialmente dentro da mesma UF; consultar cada cidade e consolidar o modelo com rastreabilidade. | Capa, título, nome do arquivo e metodologia exibem o conjunto de cidades; somas e médias usam regra explícita; nenhuma cidade fora de `/monitored-cities` entra no recorte. |
| G-02 | Dados não podem parar em 1T/26 | A lista de trimestres termina em `1T2026` na página. | `V1-CORRIGIR`: gerar opções dinamicamente até o trimestre corrente e/ou último período coberto, mantendo início histórico do produto. | O seletor oferece períodos posteriores a 1T/26 quando válidos; `end_period`, capa, gráficos, tabelas e nome do PDF usam o trimestre selecionado. |
| G-03 | Universo Secovi: verticais + somente Condomínio de Casas no horizontal | As consultas trazem todo `Horizontal` e a interface o rotula como condomínio de casas. | `V1-CORRIGIR`: criar política de universo por entidade; a política Secovi aceita todos os verticais e apenas o subtipo horizontal canônico de Condomínio de Casas. | Nenhum loteamento/outro horizontal aparece como Cond. de Casas; o mesmo universo abastece lançamentos, vendas, estoque, preços, VGV, coortes e mapa. |
| G-04 | Ajustar tabelas ao “novo padrão Rebrain” | Nenhuma referência, especificação ou exemplo foi fornecido. | `V2-ADIADO`: manter a identidade Secovi atual e corrigir somente defeitos objetivos, vazios, ordem, rótulos e legibilidade. | Pendência registrada sem bloquear V1. Não inventar um novo padrão visual. |
| G-05 | Baixar também em PPT | Runtime atual entrega PDF rasterizado; não há gerador PPTX. Monday de 24/08 registra adiamento alinhado com Teresa. | `V2-ADIADO`. | PDF permanece a exportação da V1; backlog de PPTX editável permanece separado. |

## 4. Mapeamento slide a slide dos comentários

| Slide | Conteúdo observado | Comentário da analista | Correção resolvida para a V1 | Ponto técnico principal | Aceite específico |
|---:|---|---|---|---|---|
| 2 | Capa municipal Jundiaí 2026 | “Ajustar Layout” | Recalibrar cidade/ano sobre a arte neutra oficial, usando o slide 2 do deck como régua. Não aplicar o “novo padrão Rebrain”, que é V2. | `official-cover.ts`, `ReportPaginator.tsx`, `panorama-print.css` | Cidade, ano, logos e painel vermelho sem corte/sobreposição em preview e PDF 1920×1080. |
| 3 | Sobre o Secovi — visão, missão e valores | “Esse slide precisa ser o slide 7” | Mover esta lâmina para a posição de saída 7, preservando 62 páginas; os conteúdos das posições 4–7 avançam uma posição. Separar `referenceSlide` de `outputOrder`. | `report/manifest.ts`, navegação, sumário, export | A antiga lâmina 3 é a página 7 no preview/PDF; sequência 1–62 contínua e sumário correto. |
| 14 | Empreendimentos lançados por trimestre | “não está aparecendo o primeiro período do gráfico” | Exibir explicitamente o tick/rótulo do primeiro trimestre da série. | `TimeChart`, `XAxis` | Primeiro e último períodos visíveis; 17 trimestres preservados. |
| 15 | Empreendimentos lançados por padrão | “não está aparecendo o primeiro período do gráfico, caixa de texto do residencial vertical muito grande” | Mesma correção do primeiro período; reduzir a faixa “Residencial Vertical” para não comprimir gráfico/rótulos. | `TimeChart`, `.panorama-segment-band` | Primeiro período visível; faixa proporcional; gráfico sem perda de área útil. |
| 16 | Unidades lançadas por trimestre | “não está aparecendo o primeiro período do gráfico” | Aplicar a regra de eixo do slide 14. | `TimeChart` | Primeiro e último períodos visíveis. |
| 17 | Unidades lançadas por padrão | “mesmo comentários da página 15” | Primeiro período visível e faixa “Residencial Vertical” reduzida. | `TimeChart`, CSS | Mesmo aceite do slide 15. |
| 18 | VGV lançado por trimestre | “idem comentário pag 16 — rótulos sobrepostos” | Exibir primeiro período e criar estratégia determinística para afastar/ocultar rótulos que colidem, preservando valores em tooltip. | `TimeChart`, renderização de labels | Sem sobreposição perceptível em 1920×1080; nenhum ponto fica sem valor acessível. |
| 19 | VGV lançado por padrão | “mesmos comentários pág 15” | Primeiro período visível e faixa de segmento reduzida; aplicar também prevenção de colisão de rótulos da família. | `TimeChart`, CSS | Sem corte, primeiro período visível, faixa proporcional e labels legíveis. |
| 23 | Unidades vendidas por trimestre | “todos os gráficos dessa sessão precisam seguir os comentários da sessão de lançamentos” | Propagar as correções dos slides 14–19 para todos os gráficos de vendas `23–26`: primeiro período, faixa dos gráficos por padrão e colisões de rótulos. | Família `TimeChart` | Slides 23–26 passam pelo mesmo teste visual parametrizado dos slides 14–19. |
| 31 | Oferta lançada/final por padrão | “melhorar layout, faixa de valor sem nada, nº de emp sem nada, precisa ajustar” | Remover placeholders vazios: preencher número de empreendimentos por padrão com IDs distintos; preencher faixa de valor apenas se houver campo/regra autoritativa. Se não houver, remover a coluna da V1 em vez de exibir travessões. Ajustar largura após definir colunas. | Cubo granular de mercado, `OfferTableSlide` | Nenhuma coluna inteiramente vazia; contagens reconciliadas com o universo vertical; tabela legível. |
| 33 | Oferta por ano de lançamento | “Agregar até 2022, incluir linha de subtotal com os dados lançados até 2024, incluir linha do total geral” | Linhas: `Até 2022`, `2023`, `2024`, `Subtotal até 2024`, anos posteriores individualmente e `Total geral`. Percentuais e disponibilidade recalculados após agrupamento. | `CohortTableSlide`, helper de coortes | Não há lista longa 2000–2022; subtotal e total fecham em empreendimentos, lançada e final. |
| 34 | Oferta por tipologia | “ajustar layout. Tipologia deve ser ... 1 Dormitório; 2 Dormitórios; 3 Dormitórios; 4 ou + Dormitórios” | Canonizar rótulos e ordenar exatamente `1, 2, 3, 4 ou + Dormitórios`; categorias desconhecidas ficam explicitamente em “Não classificado” somente se existirem. | Normalizador/ordenador de domínio, `OfferTableSlide` | Ordem e grafia exatas; totais preservados. |
| 35 | Participação por tipologia | “Idem comentário slide 34” | Consumir a mesma taxonomia e ordem canônica do slide 34. | `OfferChartSlide` | Barras na mesma ordem da tabela; percentuais fecham 100% dentro da tolerância. |
| 36 | Ticket/área/R$/m² por tipologia | “Mesmos comentários sobre padrão do nome dos dormitórios” | Aplicar os mesmos rótulos e ordem canônica do slide 34. | `PriceTableSlide` | Tabela na ordem 1→4+; média não é calculada por média simples de categorias. |
| 37 | Gráfico de preço por tipologia | “Idem comentário slide 35” | Mesma taxonomia/ordem do slide 35 e mesma média ponderada do slide 36. | `PriceChartSlide` | Barras 1→4+ e linha de média idêntica ao total homologado da tabela. |
| 38 | Ticket/área/R$/m² por padrão | “Aqui deixar apenas empreendimentos VERTICAIS e ... Compacto, Econômico, Standard, Médio, Médio-Alto, Alto, Luxo” | Filtrar universo vertical e ordenar pelos sete padrões canônicos. Excluir loteamentos, horizontais, Super Luxo vazio e categorias fora da política Secovi. | Política de universo + ordenação de padrões | Apenas os sete padrões, na ordem exata; nenhum dado horizontal misturado. |
| 39 | Gráfico de preço por padrão | “Mesmos comentários página anterior” | Mesma política e ordem do slide 38. | `PriceChartSlide` | Barras exatamente na ordem canônica; linha de média do universo vertical. |
| 40 | Evolução do preço por m² vertical | “Trocar para gráfico em barra” | Substituir linha por barras trimestrais, mantendo 17 períodos, valores, destaques anuais e comparações. | Componente específico de barras para série temporal | 17 barras, primeiro/último período visíveis, sem colisão de rótulos. |
| 41 | Oferta por ano × padrão | “Mesmos comentários sobre ano de lançamento e padrão”; “oferta lançada está zerada” | Aplicar agrupamento de anos do slide 33, ordem de padrões do slide 38 e alimentar oferta lançada pelo cubo granular, não por série ausente. Incluir subtotal até 2024 e total. | `CohortMatrixSlide`, modelo de coortes | Oferta lançada/final não zerada quando há registros; linhas/colunas e totais reconciliam com slides 31 e 33. |
| 42 | Participação ano × padrão | “Idem página anterior” | Derivar percentuais exclusivamente da matriz corrigida do slide 41. | `CohortMatrixSlide`/participação | Mesmos grupos/ordem; percentuais por universo fecham 100%; sem `NaN`. |
| 43 | Maturidade por padrão | “Apenas Vertical, tudo está zerado” | Implementar cubo de maturidade vertical (`Planta`, `Construção`, `Pronto`) e preencher lançada/final por padrão. | Adaptador granular e `MaturitySlide` | Valores não zerados para Jundiaí quando há base; soma das faixas = total vertical. |
| 44 | Participação de maturidade por padrão | “idem slide anterior” | Derivar participações do slide 43, mantendo apenas vertical e ordem canônica de padrão. | `MaturitySlide` | Percentuais derivados dos mesmos absolutos; totais reconciliados. |
| 45 | Maturidade por tipologia | “idem comentários sobre padrão dos nomes da tipologia, e tudo está zerado” | Implementar maturidade vertical por tipologia e usar rótulos/ordem do slide 34. | Adaptador granular e `MaturitySlide` | Faixas preenchidas; soma por tipologia = total vertical; nomes corretos. |
| 46 | Participação de maturidade por tipologia | “idem slide anterior” | Derivar participações do slide 45. | `MaturitySlide` | Percentuais derivados dos absolutos e ordem 1→4+. |
| 48 | Oferta horizontal por ano | “idem comentário sobre agrupamento dos anos das análises anteriores” | Usar agrupamento do slide 33 no universo horizontal permitido pela política Secovi. | `CohortTableSlide` | `Até 2022`, subtotal até 2024 e total geral; apenas Condomínio de Casas. |
| 49 | Ticket/área/R$/m² horizontal | “abrir por padrão — APENAS HORIZONTAL” | Substituir a única linha agregada por linhas de padrão do universo horizontal autorizado. | `PriceTableSlide` | Linhas por padrão, somente horizontal permitido; total/média coerentes. |
| 51 | VGV geral | “primeiro emp verticais, uma linha de subtotal dos verticais, aí os dados dos horizontais e uma linha do total geral. Qde de emp está zerada” | Estruturar blocos: padrões verticais → `Subtotal vertical` → padrões horizontais permitidos → `Total geral`; preencher empreendimentos por IDs distintos. | `VgvSlide`, cubo granular por segmento/padrão | Contagem não zerada; subtotais e total fecham para empreendimentos, unidades e VGV. |

## 5. Regras canônicas extraídas do retorno

Estas decisões deixam de ser detalhes isolados de slide e devem existir como funções/contratos únicos:

1. **Ordem de tipologias:** `1 Dormitório`, `2 Dormitórios`, `3 Dormitórios`,
   `4 ou + Dormitórios`.
2. **Ordem dos padrões verticais Secovi:** `Compacto`, `Econômico`, `Standard`, `Médio`,
   `Médio-Alto`, `Alto`, `Luxo`.
3. **Agrupamento de coortes:** `Até 2022`, `2023`, `2024`, `Subtotal até 2024`, anos posteriores,
   `Total geral`.
4. **Universo Secovi:** todos os empreendimentos verticais + apenas Condomínio de Casas no segmento
   horizontal; a regra vale para todas as análises, não apenas para os slides comentados.
5. **Gráficos temporais:** primeiro e último período sempre visíveis; rótulos não se sobrepõem;
   slides por padrão usam faixa de segmento compacta.
6. **Ausência de dado:** não exibir coluna inteiramente vazia nem converter ausência em zero.
7. **Agregação:** tabelas derivadas compartilham a mesma base; percentuais, gráficos, subtotais e
   totais não recalculam universos diferentes.

## 6. Cobertura dos 62 slides para o aceite da V1

| Faixa | Situação após o retorno | Ação de aceite |
|---|---|---|
| 1–10 | Slides 2 e 3 comentados; demais não aprovados individualmente. | Corrigir 2/3 e fazer regressão visual/ordem em 1–10. |
| 11–19 | Família de lançamentos comentada de forma direta. | Corrigir 14–19 e confirmar que 12/13 mantêm totais após política de universo. |
| 20–27 | Slide 23 estende a regra aos gráficos 23–26. | Regressão de 21/22/27 e teste visual parametrizado em 23–26. |
| 28–29 | Juliana não revisou o resumo. | `V1-VALIDAR`: manter contratos atuais, conferir universo/matemática e marcar como não homologado pela analista. |
| 30–46 | Correções extensas em todos os slides quantitativos exceto divisória 30 e participação 32. | Corrigir 31 e 33–46; validar 32 contra a base corrigida do 31. |
| 47–51 | Correções em 48, 49 e 51. | Corrigir e reconciliar com os mesmos universos verticais/horizontais. |
| 52–54 | Resumo/narrativas não revisados pela Juliana. | `V1-VALIDAR`: gerar apenas fatos determinísticos dos contratos corrigidos; não declarar homologação editorial. |
| 55–56 | Sem comentário. | Regressão do mapa com a nova política Secovi; apenas verticais conforme manifesto. |
| 57–62 | Sem comentário. | Regressão de assets e encerramento; nenhuma mudança funcional. |

## 7. Corte de escopo V1 × V2

### Entra na V1

- multi-cidade;
- trimestre dinâmico após 1T/26;
- política de universo Secovi;
- todos os 28 comentários resolvidos conforme a matriz;
- regressão das 62 páginas, preview e PDF;
- atualização da documentação e resposta de fechamento à Juliana.

### Fica para V2

- novo padrão visual de tabelas da Rebrain, até existir referência aprovada;
- exportação PPT/PPTX editável;
- edição livre de comentários/análises e inclusão manual de novos slides.

## 8. Critério de fechamento da V1

A V1 só pode ser reenviada quando:

- [ ] cada linha `V1-CORRIGIR` acima tiver teste ou evidência visual;
- [ ] os 62 slides forem inspecionados no preview e no PDF de Jundiaí;
- [ ] multi-cidade tiver um caso real com duas cidades;
- [ ] período posterior a 1T/26 tiver sido consultado quando disponível;
- [ ] o universo Secovi não contiver horizontais fora de Condomínio de Casas;
- [ ] subtotais/totais dos slides 31, 33–46, 48, 49 e 51 fecharem entre si;
- [ ] slides de resumo/narrativa forem descritos como “não revisados pela Juliana”, e não aprovados;
- [ ] layout novo de tabelas e PPTX estiverem registrados como V2, sem aparecer como falha da V1.
