# Plano vivo de execução — FIERGS RM Porto Alegre

Atualizado em: 2026-09-24

## Objetivo

Entregar o Panorama FIERGS com o mesmo contrato editorial do deck oficial de 75 slides, preservando sequência, conteúdo e lógica analítica, com acabamento visual aprimorado pela Rebrain. A paridade numérica do fechamento 4T25 permanece separada da implementação editorial até a confirmação do universo histórico pelo analista responsável.

## Estados

- `DONE`: implementado e verificado automaticamente.
- `HUMAN`: implementado, aguardando conferência visual do usuário.
- `DOING`: em implementação.
- `NEXT`: próximo item executável sem dependência externa.
- `BLOCKED`: depende de credencial, fonte ou decisão externa.
- `TODO`: ainda não iniciado.

## Plano e andamento

| Etapa | Entrega | Estado | Critério de conclusão / dependência |
|---:|---|---|---|
| 1 | Congelar contrato editorial FIERGS em 75 posições | DONE | Preview, PDF e PPT usam manifesto próprio, sem herdar sequência Secovi |
| 2 | Sistema visual FIERGS/Rebrain | DONE | Montserrat/Source Sans 3, hierarquia 50+ e paridade preview/PDF aceitas |
| 3 | Capa territorial RM Porto Alegre | DONE | Mapa, título e trimestre dinâmicos; sem percentuais socioeconômicos |
| 4 | Nove aberturas oficiais | DONE | Fundo oficial e terminologia FIERGS nas posições corretas |
| 5 | Lançamentos verticais — slides 8–22 | DONE | Séries e distribuições por padrão, tipologia, bairro/cidade concluídas |
| 6 | Vendas e oferta — slides 23–37 | DONE | Arquitetura FIERGS, fluxo, acumulados, padrão, tipologia, cidade e estoque concluídos |
| 7 | MCMV, bairros/cidades e dormitórios | DONE | Séries MCMV de lançamentos/vendas, cidade em barras e quatro séries por dormitórios implementadas |
| 8 | IVV, preços e mercado vertical — slides 38–61 | DONE | IVV, dormitórios, tabelas, gráficos e matrizes usam componentes e densidade editorial FIERGS |
| 9 | Horizontal completo — slides 62–66 | DONE | Quatro produtos FIERGS, coortes, preço médio e faixa de R$/m² separados do vertical |
| 10 | Três mapas — slides 67–69 | BLOCKED | Roteamento e estado controlado corrigidos; fundo cartográfico requer `VITE_MAPBOX_ACCESS_TOKEN` local/publicado e novo deploy |
| 11 | Bancada cidade/empreendimento | BLOCKED | CSV por empreendimento/rejeição disponível; deltas finais dependem da relação oficial de IDs/exclusões do analista |
| 12 | Paridade numérica 4T25 | BLOCKED | Requer regra/data de congelamento e eventuais exclusões do analista |
| 13 | Comparação visual dos 75 slides | DONE | Teste 5 comparado integralmente ao deck oficial e Teste 6 confirmou no PDF as correções dos slides 5, 57 e 58 |
| 14 | Performance da coleta multi-cidade | HUMAN | FIERGS: 2 cidades e teto global de 6 requisições implementados e testados; falta registrar tempo da geração publicada |

## Pontos de teste humano

1. Estrutura: conferir ordem, títulos e presença das 75 posições.
2. Capa e aberturas: conferir equilíbrio, mapa, terminologia e quebras.
3. Lançamentos 8–22: comparação lado a lado com o deck oficial.
4. Vendas/oferta: verificar fechamento interno antes da paridade externa.
5. IVV/preços/horizontal: conferir categorias, unidades e legibilidade.
6. Mapas: depois da sincronização do token, conferir pontos, enquadramento e legendas.
7. Entrega: PDF e PPT completos, sem overflow ou páginas divergentes.

## Sincronização de chaves — ação do usuário

Variável necessária: `VITE_MAPBOX_ACCESS_TOKEN`.

1. Adicionar token público Mapbox (`pk...`) ao `.env` local.
2. Adicionar a variável nos ambientes Production e Preview da publicação.
3. Autorizar os domínios Rebrain/preview nas restrições do token, se existirem.
4. Fazer novo deploy: variáveis `VITE_` são incorporadas durante o build.

Sem o token, as páginas 67–69 permanecem no livro como diagnóstico controlado; não são removidas. Isso preserva a paginação e evidencia que a exportação ainda não está pronta para entrega.

## Preparação para validação metodológica

Perguntas a levar ao analista:

- data exata de congelamento da base do 4T25;
- exclusões manuais e respectivos IDs;
- reclassificações entre vertical e horizontal;
- tratamento de vendas líquidas, distratos e revisões posteriores;
- universo usado nos slides por cidade;
- disponibilidade de planilha ou relação dos empreendimentos do fechamento.

Deltas prioritários: 3T25 (`634` atual versus `138` oficial), 4T25 (`3.082` versus `2.554`), ausência de Canoas na fonte municipal, volume anômalo de Guaíba e diferença entre vendas consolidadas (`1.135`) e municipais (`2.334`).

## Registro de decisões

- O deck oficial é contrato editorial, não molde visual rígido.
- A Rebrain melhora alinhamento, legibilidade e hierarquia sem mudar o conteúdo esperado.
- API Socio fica fora desta entrega; a capa territorial não exibirá os dois percentuais socioeconômicos.
- Rota GeoBrain interna permanece principal, com pública + retries como fallback.
- Números atuais não serão artificialmente corrigidos antes da confirmação do universo histórico.
- O FIERGS mantém 75 posições mesmo sem mapa ou dado metodologicamente aprovado.
- O formato visual sugerido pelo Sinduscon passa a ser referência alternativa do FIERGS: série histórica acompanhada de comparação gráfica do trimestre e do acumulado pertinente.
- A regra comparativa futura será contextual ao fechamento: `2T × 2T` e `1S × 1S`; `3T × 3T` e `9M × 9M`; `4T × 4T` e `ano × ano`. Fluxos podem ser acumulados; estoque, preço e taxas usam fechamento ou ponderação adequada.
- A migração visual equivalente do Secovi fica registrada como pendência posterior, sem alterar sua saída nesta entrega.
- O mapeamento de fidelidade, melhorias e concessões da automação fica congelado em `MAPEAMENTO_TRADEOFFS_AUTOMACAO_FIERGS_TESTE5_2026-09-24.md`; diferenças futuras devem ser avaliadas contra esse contrato, não apenas contra a aparência do deck manual.

## Histórico de avanços

- 2026-09-22: preset corrigido para 10 cidades, sem Porto Alegre.
- 2026-09-22: capa institucional limpa, página branca de cidades e fundo oficial de aberturas incorporados.
- 2026-09-22: primeiro diagnóstico numérico do recorte de 10 cidades documentado.
- 2026-09-23: plano consolidado e iniciado; contrato editorial próprio em implementação.
- 2026-09-23: manifesto efetivo FIERGS passou a ter 75 posições estáveis, inclusive mapas sem token.
- 2026-09-23: capa territorial dinâmica criada com mapa oficial e sem dependência da API Socio.
- 2026-09-23: nove aberturas vinculadas ao fundo oficial e aos títulos do deck FIERGS.
- 2026-09-23: slides trimestrais de empreendimentos, unidades e VGV receberam série exclusivamente vertical, variações anuais e comparação semestral.
- 2026-09-23: acumulados de 12 meses e distribuição de lançamentos por bairro/cidade incorporados ao primeiro bloco.
- 2026-09-23: download `Auditoria CSV` adicionado ao FIERGS com IDs, cidade, segmento, padrão, trimestre, lançamentos, vendas, oferta, preços, cobertura e rejeições.
- 2026-09-23: coleta FIERGS otimizada para duas cidades simultâneas com teto global de seis requisições; Secovi preservado em uma cidade e teto quatro; granular vertical/horizontal paralelizado dentro do mesmo limitador.
- 2026-09-23: Teste 1 do PDF/CSV revisado. Abertura duplicada e roteamento das três lâminas de mapa foram corrigidos; sem token, mapas agora exibem indisponibilidade controlada em vez de página branca.
- 2026-09-23: FIERGS passou a usar Montserrat em hierarquia e Source Sans 3 em leitura. Eixos trimestrais usam forma curta, amostragem adaptativa e rótulos de valores priorizados em fechamentos anuais e quatro trimestres recentes; acumulados de 12 meses não exibem janelas parciais.
- 2026-09-23: distribuições dos slides 10, 13, 15–18 e 21 deixaram de reutilizar componentes Secovi; padrão e tipologia derivam do cubo granular do trimestre de lançamento.
- 2026-09-23: etapa 6 implementada no padrão FIERGS: vendas verticais trimestrais e 12 meses, padrão, tipologia e cidade, VGV vendido e oferta final. Fluxos são somados; estoque permanece fotografia e seus comparativos anuais usam o fechamento, nunca soma de snapshots.
- 2026-09-23: orientação de Fábio/Marcos, encaminhada por Diego, incorporada como referência visual alternativa: substituir quadros comparativos temporais por gráficos de trimestre e acumulado contextual. Aplicar no FIERGS nesta primeira versão após o Teste 2; Secovi permanece como pendência separada.
- 2026-09-23: Teste 2 recebido. O Sumário FIERGS passou a ocupar a largura editorial da lâmina, com margens simétricas, maior distância do título, distribuição vertical uniforme e paginação tabular alinhada à direita.
- 2026-09-23: Teste 2 mostrou que a supressão seletiva de ticks/valores parecia ausência de dados. A regra foi revista: todos os trimestres usam eixo compacto e todos os valores observados aparecem; os trimestres equivalentes ao fechamento recebem placa verde.
- 2026-09-23: achados que entram nas etapas 7–8: substituir pares hoje duplicados por recortes MCMV/padrão, harmonizar a página municipal com barras FIERGS, ampliar comparativos anuais e substituir tabelas Secovi pequenas dos slides 39–61 por layouts FIERGS. O slide 47 requer componente real de 4 dormitórios. Mapas 67–69 estão corretamente diagnosticados, mas continuam dependentes do token.
- 2026-09-23: etapa 7 implementada para teste: os pares duplicados viraram séries MCMV/padrão de lançamentos e vendas, a comparação municipal usa barras e os slides 44–47 usam as séries temporais de R$/m² por dormitório.
- 2026-09-23: comparativos contextuais automatizados no FIERGS: trimestre equivalente mais acumulado coerente com o fechamento (`1S`, `9M` ou ano); snapshots e taxas não são acumulados. O slide 39 deixou de exibir preço por engano e passou a consumir IVV.
- 2026-09-23: Teste 3 revisado. A grade FIERGS passou a usar densidade editorial por complexidade: distribuições ganharam KPI integrado, barras e rótulos maiores; tabelas simples ocupam mais área; gráficos de preço cresceram; matrizes de coorte, maturidade e VGV mantêm escala compacta sem herdar o vazio do Secovi.
- 2026-09-23: etapas 8 e 9 promovidas para validação humana. Os slides 38–61 receberam hierarquia e ocupação FIERGS, e o bloco horizontal 62–66 preserva os quatro produtos da política FIERGS em componentes e agregações próprios.
- 2026-09-23: Teste 4 confirmou divergência entre preview e exportação nos rótulos destacados dos gráficos. O `html-to-image` não preservava de forma confiável classes CSS dentro dos SVGs customizados do Recharts: retângulo e texto caíam no preenchimento preto padrão. Cor, contorno, fonte e tamanho passaram a ser atributos inline; teste automatizado protege a paridade. Tipografia temporal e distribuições também foram ampliadas para audiência 50+, e o KPI de total perdeu faixa lateral/fundo, ficando centralizado.
- 2026-09-24: paridade visual considerada concluída por decisão do usuário; o Teste 5 passa a ser regressivo. Auditoria semântica dos 75 registros eliminou heranças inadequadas nos slides 57/58 com componentes próprios de tipologia × metragem e faixa de preço por tipologia. O slide 41 deixa explícito que IVV anual por faixa não pode ser reconstruído com o cubo trimestral atual, em vez de duplicar o slide 40.
- 2026-09-24: Teste 5 comparado página a página com os 75 renders oficiais. O mapeamento consolidou como decisões permanentes os comparativos contextuais, rankings horizontais, tabelas auditáveis e estados honestos de indisponibilidade. A revisão encontrou e corrigiu a ponderação parcial do IVV, que podia gerar percentuais acima de 2.000%; o slide 57 voltou às 12 faixas de área FIERGS, o 58 recuperou área, R$/m² e oferta, e o 5 ganhou conteúdo metodológico dinâmico sem congelar claims promocionais.
- 2026-09-24: Teste 6 recebido com 75 páginas. O PDF confirmou a nova composição metodológica do slide 5, as 12 faixas e orientação FIERGS no slide 57 e a matriz completa de área, R$/m² e oferta no 58. O pico de IVV de 2.033,3% em 1T22 permanece mesmo após a correção do acumulador, indicando valor anômalo já presente na fonte temporal ou no universo histórico; passa a integrar a reconciliação com o analista, sem correção artificial. As páginas 67–69 permanecem corretamente bloqueadas apenas pelo token Mapbox.
- 2026-09-24: diagnóstico autenticado do IVV localizou a principal anomalia em Canoas: o endpoint pronto devolve 6.900% para Econômico, 241,7% para Standard e 131,3% para Médio no 1T22. Gravataí e Novo Hamburgo também possuem percentuais acima de 100%. Pela identidade do Dashboard GeoBrain de Edgar, Canoas resulta em 18,65% e as dez cidades em 16,28%. O FIERGS passou a calcular IVV por `Σ vendas líquidas ÷ Σ (estoque final + vendas líquidas)`, preservando o comportamento do Secovi. O seletor de período agora aplica o intervalo no segundo clique e fecha sem botões de confirmação; comparativos laterais usam colunas proporcionais, e as variações anuais receberam tipografia maior.
