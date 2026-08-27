# Plano de correções visuais e de fluxo — Panorama — até o slide 33

**Data:** 2026-08-27
**Origem:** primeira revisão visual do relatório em tela, imagens 1–10 do usuário
**Escopo:** filtros/geração + slides 1–33
**Card:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`
**Estado:** `READY_FOR_IMPLEMENTATION`

## 1. Objetivo desta rodada

Corrigir primeiro os problemas perceptíveis “vendo por cima”, validar por prints equivalentes aos
enviados e só depois avançar para a inspeção integral do PDF, slide a slide. Esta rodada não reabre
PPTX nem o novo padrão geral de tabelas da Rebrain.

## 2. Diagnóstico consolidado das imagens

| Imagem | Observação | Causa atual confirmada/provável | Direção de correção |
|---:|---|---|---|
| 1 | Lista nativa alta; perdeu busca; precisa selecionar várias cidades e mostrar seleção abaixo. | Multi-cidade foi ligada com `<select multiple>` nativo, enquanto o seletor anterior usava popover pesquisável. | Criar seletor múltiplo pesquisável no padrão anterior, com checkboxes e chips/legenda abaixo. |
| 2 | Skeletons reaparecem mesmo com relatório pronto. | React Query pode refazer consulta ao foco após `staleTime`; a tela mostra skeleton em qualquer `isFetching`, inclusive background refetch, ao mesmo tempo que mantém `report.data`. | Desativar refetch automático da consulta pesada; separar carga inicial de atualização explícita. |
| 3 | Slide 2: cidade cruza a linha e a linha não está centrada no bloco vermelho. | Cidade/ano são injetados por pseudo-elemento único sobre uma linha já gravada no bitmap oficial. | Substituir overlay por elementos DOM separados: cidade, regra centralizada e ano. |
| 4–5 | Rodapé correto até 10 e cortado depois. | Até 10, rodapé está “assado” na imagem oficial. Depois, `Footer` recorta uma imagem 16:9 inteira numa faixa de `5.1cqw`, menor que a área útil inferior do asset. | Tornar o rodapé dinâmico uma linha fixa do grid da lâmina e renderizar crop inferior com altura suficiente. |
| 6 | Números dos gráficos pequenos. | Eixo/legenda em `.88cqw` e labels em `.72cqw`. | Criar escala tipográfica mínima legível para preview e PDF 1920×1080. |
| 7 | Caixas de destaque se sobrepõem. | Offsets fixos (`-10` e `+18`) não consideram proximidade entre séries. | Aplicar política de colisão por ponto e prioridade visual. |
| 8 | Rótulos zero colidem com trimestres no eixo X. | Todo ponto recebe label; zero fica sobre a baseline, próximo ao tick. | Não renderizar labels pontuais iguais a zero; manter valor no tooltip e na tabela. |
| 9 | Faixa “Residencial Vertical” continua grande. | Badge atual tem `28cqw`, margem negativa e padding largo. | Trocar por tag compacta de largura intrínseca, com acento amarelo elegante. |
| 10 | Linhas/categorias sem ordem lógica. | `labels(...).slice(...)` preserva ordem da API e corta antes de ordenar. | Ordenar por domínio antes de limitar/renderizar; proibir `slice` antes da ordenação. |

## 3. Frente A — seletor múltiplo de cidades (imagem 1)

### Comportamento desejado

1. Manter a experiência anterior: caixa fechada, busca digitável e lista em popover.
2. Cada cidade possui checkbox; o popover permanece aberto para seleção múltipla.
3. O trigger mostra “Selecione municípios”, uma cidade, ou “N cidades selecionadas”.
4. Abaixo da caixa, mostrar uma legenda/chips com todas as cidades selecionadas.
5. Cada chip pode remover a cidade; oferecer “Limpar seleção”.
6. Trocar UF limpa chips, busca e município-ponte do `GeoApiScopeEngine`.
7. As opções continuam exclusivamente vindas de `/monitored-cities`; sem fallback IBGE.
8. A ordem dos chips e do payload deve ser determinística, preferencialmente alfabética.

### Implementação proposta

- Criar `PanoramaCityMultiSelect.tsx` dentro da feature, composto com `Popover`, `Command`,
  `Checkbox`/checkmark e `Badge`.
- Reaproveitar a interação do `dashboard-geobrain/MultiSelect.tsx`, sem criar dependência cruzada
  entre features; extrair primitive compartilhado somente se surgir segundo consumidor Rebrain.
- Manter `cities[]` como contrato canônico e `GeoScope.city` apenas como ponte de validação do engine.

### Aceite por print/teste

- Print com popover fechado e chips visíveis.
- Print com busca filtrando uma cidade e três cidades marcadas.
- Testes: busca, toggle, remoção por chip, troca de UF e payload com múltiplas cidades.

## 4. Frente B — período inicial/final num único seletor (imagem 1)

### Comportamento desejado

1. Um único controle “Período da análise”.
2. Popover em grade por ano, exibindo os trimestres disponíveis.
3. Primeiro clique define o início; segundo clique define o fim.
4. Intervalo completo recebe destaque contínuo; início e fim têm destaque mais forte.
5. Se o segundo clique for anterior ao primeiro, inverter de forma previsível ou reiniciar pelo menor.
6. Default sugerido: `1T2022 → 2T2026`.
7. Bloquear geração quando início > fim ou quando faltar uma das pontas.
8. Capa, nome do arquivo, API e séries devem refletir o intervalo completo.

### Mudança de contrato

- Evoluir `PanoramaScope` de apenas `endQuarter` para `startQuarter` + `endQuarter`.
- A API usa ambas as pontas em `start_period`/`end_period`.
- O modelo deixa de assumir janela fixa de 17 trimestres e gera exatamente o intervalo selecionado.
- Calibrações municipais continuam usando o mesmo intervalo; referências congeladas declaram início
  e fim explicitamente.

### Aceite

- Default visual `1T22 – 2T26`.
- Casos: um trimestre, virada de ano, intervalo invertido, trimestre sem dados e período longo.
- Testar que capa/PDF/query key recebem as duas pontas.

## 5. Frente C — impedir carregamento/refetch repetido (imagem 2)

### Causa

`useQuery` usa o comportamento padrão de refetch ao retornar o foco quando os dados ficam stale. A
tela renderiza skeleton com `report.isFetching`, mesmo quando `report.data` já existe. Por isso o
usuário vê simultaneamente skeletons e o relatório pronto.

### Correção

1. `refetchOnWindowFocus: false` e `refetchOnReconnect: false` para esta consulta pesada.
2. Gerar novamente somente por ação explícita do usuário.
3. Renderizar skeleton apenas em `isPending`/primeira geração sem dados.
4. Se houver atualização explícita com relatório anterior, manter as páginas e mostrar indicador
   pequeno “Atualizando relatório…”, sem skeleton de página inteira.
5. Usar query key primitiva e estável: UF, cidades ordenadas, início, fim e entidade.
6. Abortar request anterior ao gerar outro recorte.
7. Avaliar `retry: 0` para evitar uma segunda coleta completa silenciosa; erro oferece “Tentar novamente”.

### Teste de regressão

- Contador mock de chamadas permanece em 1 após aguardar além do `staleTime`, trocar de aba e voltar.
- Clique em “Gerar relatório” com novo intervalo produz exatamente uma nova coleta.
- Relatório pronto nunca aparece junto com skeletons grandes.

## 6. Frente D — capa municipal do slide 2 (imagem 3)

### Correção estrutural

- Remover a composição `content: cidade + quebra + ano` do pseudo-elemento.
- Criar overlay semântico com três elementos independentes:
  - cidade acima da regra;
  - regra cinza horizontal centralizada no bloco vermelho;
  - ano abaixo da regra.
- Usar o centro real do painel vermelho como referência, não coordenada baseada no texto.
- Escalar cidade longa sem cruzar regra nem sair do painel.
- Corrigir também título/aria-label do slide 2, hoje herdado como “Piracicaba”, para a cidade real.

### Aceite

- Jundiaí, Piracicaba e um nome longo.
- Regra centralizada; nenhum glifo toca a regra; ano alinhado ao centro.
- Mesmo resultado no preview e no PDF.

## 7. Frente E — rodapé dinâmico a partir do slide 11 (imagens 4–5)

### Correção estrutural

1. `Sheet` passa a usar grid: `minmax(0, 1fr) var(--panorama-footer-height)`.
2. Conteúdo deixa de calcular altura manualmente com `calc(100% - 5.1cqw)`.
3. Rodapé usa o recorte inferior do asset com `object-fit: cover`/`object-position: bottom` ou asset
   previamente recortado, com altura aproximada de `6.2cqw` a ser calibrada.
4. Texto de fonte fica dentro da área segura e não disputa espaço com o wordmark.
5. Lâminas com rodapé baked continuam sem rodapé duplicado.

### Aceite

- Comparar slides 10, 11, 12, 14, 25, 27 e 33.
- Linhas completas dos dois lados; “Realização / Secovi-SP | Brain” inteiro e centralizado.
- Zero corte em preview, deck offscreen e PDF 1920×1080.

## 8. Frente F — legibilidade e colisões nos gráficos (imagens 6–8)

### Tipografia

- Eixo X e legenda: mínimo visual equivalente a `1.0cqw`.
- Labels comuns: `0.9–1.0cqw`.
- Labels destacados: `1.0–1.1cqw`, padding proporcional e contraste AA.
- Testar em largura real do relatório, não apenas zoom do navegador.

### Política de labels

1. Valor `0`: não desenhar label no ponto; tooltip continua exibindo zero.
2. Labels não-zero: manter, com distância mínima da linha e do eixo.
3. Séries próximas no mesmo trimestre: uma label acima e outra abaixo com distância mínima.
4. Caixas destacadas que ainda colidirem: deslocar horizontalmente dentro da área do chart, sem
   ultrapassar bordas.
5. Primeiro/último tick continuam obrigatórios.

### Aceite

- Slides 14–19 e 23–26 sem label sobre tick/legenda.
- Nenhum par de caixas sobreposto nas séries da imagem 7.
- Zeros legíveis no tooltip, mas ausentes como rótulo sobre a baseline.

## 9. Frente G — tag compacta “Residencial Vertical” (imagem 9)

Substituir a faixa de 28cqw por uma tag de largura intrínseca:

- fundo amarelo apenas atrás do texto, ou texto com pequena barra vertical amarela;
- altura aproximada de `2.1–2.4cqw`;
- sem margem negativa;
- padding horizontal curto e tracking moderado;
- preservar espaço vertical do gráfico.

Aplicar à família de padrão nos slides 15, 17, 19, 25 e 26. Aceite: tag claramente identificável,
mas com menos presença que o título e o gráfico.

## 10. Frente H — ordenação semântica de linhas e séries (imagem 10)

### Regra única

- Trimestres: cronológicos.
- Tipologias: 1, 2, 3, 4 ou + Dormitórios.
- Padrões: Compacto, Econômico, Standard, Médio, Médio-Alto, Alto, Luxo.
- Área/faixas numéricas: limite inferior crescente.
- Coortes: Até 2022, anos, subtotal, posteriores, total geral.
- Maturidade: Planta, Construção, Pronto, Total.

### Correção

- Criar helper de ordenação para as labels de fallback da API.
- Ordenar antes de qualquer `.slice()`.
- `AreaIvvSlide` não pode usar ordem de inserção de `labels(...)`; deve usar ordem numérica/canônica.
- Tabela, gráfico, legenda e narrativa devem consumir a mesma sequência.

### Aceite

- Slide 27 exibe 1, 2, 3, 4+ (ou faixas de área crescentes, conforme o dado real), nunca 3, 2, 4, 1.
- Teste com payload propositalmente embaralhado produz ordem canônica.

## 11. Sequência recomendada de implementação

1. P0 — testes de reprodução e snapshots das imagens 1–10.
2. P1 — contrato `startQuarter/endQuarter` e range picker.
3. P2 — seletor múltiplo pesquisável e chips.
4. P3 — controle de query/refetch e estados de carregamento.
5. P4 — grid de lâmina, capa 2 e rodapé.
6. P5 — tipografia, colisão, zeros e tag compacta dos gráficos.
7. P6 — ordenação canônica em todos os consumidores até o slide 33.
8. P7 — testes, typecheck real, build e PDF de comparação.

## 12. Matriz de prints para homologação desta rodada

| Print | Estado obrigatório |
|---|---|
| Filtros fechados | multi-select compacto, chips e período `1T22 – 2T26`. |
| Filtros abertos | busca ativa, múltiplos checks e range de trimestres destacado. |
| Relatório pronto após troca de aba | sem skeleton e sem nova chamada. |
| Slide 2 | cidade/regra/ano sem colisão. |
| Slides 10 e 12 | rodapés visualmente equivalentes e completos. |
| Slide 14 | números legíveis, zeros sem colisão e primeiro/último período. |
| Slide 25 | tag compacta e labels sem sobreposição. |
| Slide 27 | linhas em ordem lógica. |
| Slide 33 | rodapé completo e coortes ordenadas. |

## 13. Fora desta rodada

- Revisão detalhada dos slides 34–62, que será feita com o próximo PDF trazido pelo usuário.
- Novo padrão global de tabelas Rebrain, ainda sem referência.
- PPTX editável.
- Homologação editorial dos textos de resumo.
