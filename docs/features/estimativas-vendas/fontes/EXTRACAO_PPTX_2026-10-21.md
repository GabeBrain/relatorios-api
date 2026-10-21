# Extração de referência — PPTX Finotti,21/10/2026

Texto dos objetos de cada slide e dados em cache dos gráficos nativos. Derivado pequeno para consulta/reprodução da regra. Não inclui reconhecimento de imagens, layout, código do simulador ou dados individuais. Resultados são relatos do autor, não testes reproduzidos nesta preparação.

Arquivo, hash e proveniência: ver MANIFESTO.md e FONTES_E_DECISOES.md.

## Slide 1

Equação de vendas
de empreendimentos horizontais
Loteamentos abertos e fechados lançados a partir de 2020
1

## Slide 2

Resumo
 executivo
Fechado começa mais forte e termina mais devagar
Até 50% vendido os padrões não diferem estatisticamente. Depois disso o Fechado desacelera: esgota em 46 meses (mediana), contra 31 do Aberto (p = 0,001).
A equação calibrada é a que mais acerta
Erro médio de 9,1 p.p. no % vendido dos 24 meses seguintes, contra 11,1 p.p. da média do último trimestre e 12,0 p.p. da média de 12 meses. Venceu nos 100 sorteios de amostra.
O ganho é maior nos primeiros meses de vendas
Com 3 meses de vendas, o erro cai de 18,2 para 12,7 p.p. A partir de 12 meses a vantagem diminui, mas a equação continua na frente.
RECOMENDAÇÃO
Adotar a equação da curva de vendas como método padrão para estimar as vendas mês a mês até o esgotamento
Sempre apresentar a estimativa com a faixa de erro. Usar o simulador para gerar a tabela mensal de unidades.
9,1 p.p.
erro médio da equação no teste
2

## Slide 3

A BASE ANALISADA
674 empreendimentos, 1.371 tipologias e 55.876 registros mensais.
Usamos
 os lançamentos de jan/2020 a jul/2026
, esgotados e ativos, observados até set/2026.
Loteamento Aberto:
160 empreendimentos (98 esgotados, 62 ativos)
Loteamento Fechado:
206 empreendimentos (83 esgotados, 123 ativos)
366
empreendimentos
129,8 mil
unidades lançadas
18
cidades
15,2 mil
meses de vendas observados
10,7%
de distratos sobre a venda bruta
3

## Slide 4

Composição
 da amostra
366 empreendimentos lançados de 2020 a 2026, em 18 cidades
Empreendimentos por padrão e situação
Lançamentos por ano
* 2026: lançamentos até jul/2026.
4

## Slide 5

Testes
 de forma funcional
Sete equações ajustadas à curva média de cada padrão, por mínimos quadrados ponderados
Forma
Equação
Parâm.
R² Aberto
R² Fechado
Weibull
1 − e^−(t/λ)^k
2
0,995
0,995
Weibull com salto inicial
a + (1 − a)(1 − e^−(t/λ)^k)
3
0,998
0,995
Hiperbólica
t ÷ (a + b·t)
2
0,998
0,968
Logarítmica
a + b·ln t
2
0,954
0,991
Gompertz
a·e^(−b·e^(−c·t))
3
0,971
0,958
Logística
K ÷ (1 + e^(−r(t − t₀)))
3
0,959
0,947
Exponencial
a(1 − e^(−c·t))
2
0,954
0,845
Escolhida: Weibull
Única com R² ≥ 0,995 nos dois padrões usando só 2
parâmetros
..
Weibull com salto
R² semelhante, mas o salto inicial estimado sai negativo, o que não tem leitura prática. O parâmetro extra não se paga.
Hiperbólica
Boa no Aberto (0,998), fraca no Fechado (0,968). Não serve para os dois padrões.
5

## Slide 6

Aberto e Fechado
 vendem em ritmos diferentes
Teste de log-rank sobre o tempo até cada marco de vendas (Kaplan-Meier, considerando os ativos)
% de empreendimentos ainda com estoque
Mediana de meses até cada marco
Marco de vendas
Aberto
Fechado
p-valor
50% vendido
6 meses
4 meses
0,536
70% vendido
9 meses
10 meses
0,118
80% vendido
11 meses
14 meses
0,011
90% vendido
15 meses
23 meses
< 0,001
Esgotado
31 meses
46 meses
0,001
Leitura:
os dois padrões chegam a 50% vendido no mesmo ritmo. A diferença está na segunda metade das vendas.
Aos 24 meses o Aberto está 5,4 p.p. à frente (IC 95% bootstrap: +0,6 a +10,3 p.p.). Por isso cada padrão tem a sua equação.
6

## Slide 7

A equação
 de previsão por padrão
A curva passa pelo ponto já observado e a forma k se ajusta ao estágio do empreendimento
A(t) = 1 − (1 − Aₙ) ^ (t / n)^k
k = (c₀ + c₁·ln n) + (c₂ + c₃·ln n) · ln[−ln(1 − Aₙ)]
n: meses no mercado · Aₙ: % vendido até o mês n · A(t): % vendido previsto no mês t > n. Quando A(t) chega a 95%, o saldo é vendido em linha reta em 5 meses (Aberto) ou 6 meses (Fechado), a mediana observada entre 95% e 100%.
Coeficiente
Aberto
Fechado
c₀
0,186
0,061
c₁
0,291
0,227
c₂
-0,382
-0,382
c₃
-0,019
-0,037
Ajuste por mínimos quadrados não lineares sobre todas as origens n = 1 a 48 e os 36 meses seguintes de cada empreendimento.
Valor de k por estágio (Fechado)
Meses
20%
40%
60%
80%
3 meses
0,94
0,59
0,35
0,11
6 meses
1,14
0,77
0,51
0,26
12 meses
1,34
0,94
0,67
0,40
24 meses
1,53
1,12
0,83
0,55
Colunas: % vendido até hoje. Quanto maior o % já vendido, menor o k: quem vendeu muito cedo tende a desacelerar.
Exemplo:
Fechado com 300 lotes e 150 vendidos em 6 meses. k = 0,63. Previsão: 66% vendido no mês 12, 75% no mês 18 e esgotamento no mês 67.
7

## Slide 8

Três formas
 de estimar demanda
Teste cego com metade da base sorteada aleatoriamente
366
empreendimentos 2020+
183
treino: ajustam a equação
183
teste: projeções comparadas com as vendas reais
(a)
Equação da curva de vendas
A equação do padrão, calibrada com o % vendido até o mês n. É o método do simulador.
(b)
Média do último trimestre
Vendas líquidas dos últimos 3 meses ÷ 3, repetidas todo mês até esgotar.
(c)
Média dos últimos 12 meses
Vendas líquidas dos últimos 12 meses ÷ 12 (ou desde o lançamento, se n < 12), repetidas até esgotar.
Como medimos:
projeções feitas com 3, 6, 12, 18, 24 e 36 meses de vendas (734 projeções). Erro = diferença absoluta entre o % vendido projetado e o real, em p.p., média dos 24 meses seguintes. Repetimos o sorteio 100 vezes para checar a estabilidade.
8

## Slide 9

A equação da curva
 é a que mais acerta
Erro médio absoluto nos 24 meses seguintes (p.p. do % vendido), por meses de vendas já observados
9,1 p.p.
(a) Equação da curva
melhor em 47% dos casos
11,1 p.p.
(b) Média do trimestre
melhor em 37% dos casos
12,0 p.p.
(c) Média de 12 meses
melhor em 16% dos casos
9

## Slide 10

Como funciona
 o simulador
1
Entradas
Padrão, unidades lançadas, meses no mercado e unidades vendidas (líquidas). Mês de lançamento é opcional.
2
Cálculo
Calcula Aₙ e k e aplica a equação do padrão até 95% vendido. O saldo final é vendido em 5 ou 6 meses.
3
Saída
Tabela com as unidades estimadas por mês até o esgotamento, estoque e % vendido, com faixa central e faixa ampla.
4
Uso
Indicadores de vendas em 12 meses, ritmo e mês de esgotamento. Botão para copiar a tabela para o Excel.
10

## Gráfico nativo — ppt/charts/chart1.xml

Dados em cache, sem reinterpretação de escala/eixo:

- Série 1: ["Esgotados", "Loteamento Aberto", "Loteamento Fechado", "98", "83"]
- Série 2: ["Ativos", "Loteamento Aberto", "Loteamento Fechado", "62", "123"]

## Gráfico nativo — ppt/charts/chart2.xml

Dados em cache, sem reinterpretação de escala/eixo:

- Série 1: ["Lançamentos", "2020", "2021", "2022", "2023", "2024", "2025", "2026*", "45", "58", "64", "59", "60", "58", "22"]

## Gráfico nativo — ppt/charts/chart3.xml

Dados em cache, sem reinterpretação de escala/eixo:

- Série 1: ["Loteamento Aberto", "0", "12", "24", "36", "48", "60", "100", "99.4", "98.8", "97.5", "95", "94.4", "93.1", "92.4", "91.8", "88.5", "86.5", "84.5", "83.1", "79.599999999999994", "76.7", "73.8", "70.2", "68.7", "68", "67.2", "64.2", "64.2", "61", "60.2", "59.4", "57.8", "57.8", "57", "51.4", "51.4", "50.6", "49.7", "49.7", "48", "46.3", "43.6", "42.8", "41", "40.1", "40.1", "40.1", "38.200000000000003", "37.299999999999997", "36.200000000000003", "36.200000000000003", "35.200000000000003", "33.200000000000003", "33.200000000000003", "33.200000000000003", "32.1", "30.9", "30.9", "30.9", "30.9", "30.9", "29.5", "28.1", "28.1", "25.3", "25.3", "21.9"]
- Série 2: ["Loteamento Fechado", "0", "12", "24", "36", "48", "60", "100", "100", "98.1", "95.2", "95.2", "95.2", "95.2", "94.6", "94.1", "92.6", "92.1", "90.5", "89.5", "86.8", "85.7", "83.5", "82.9", "81.8", "81.2", "81.2", "79.900000000000006", "76.2", "74.3", "73.599999999999994", "73.599999999999994", "73.599999999999994", "72.2", "70.099999999999994", "70.099999999999994", "67.8", "66.3", "66.3", "64", "62.3", "60.6", "60.6", "60.6", "60.6", "57.6", "56.6", "56.6", "56.6", "55.5", "53.3", "52.1", "51", "49.8", "49.8", "49.8", "48.4", "47", "47", "47", "45.3", "45.3", "45.3", "45.3", "43", "40.6", "40.6", "40.6"]

## Gráfico nativo — ppt/charts/chart4.xml

Dados em cache, sem reinterpretação de escala/eixo:

- Série 1: ["(a) Equação da curva", "3 meses", "6 meses", "12 meses", "18 meses", "24 meses", "36 meses", "12.7", "10.9", "8.6999999999999993", "6.9", "5.8", "3.8"]
- Série 2: ["(b) Média do trimestre", "3 meses", "6 meses", "12 meses", "18 meses", "24 meses", "36 meses", "18.2", "12.6", "9", "7.4", "6.6", "4.2"]
- Série 3: ["(c) Média de 12 meses", "3 meses", "6 meses", "12 meses", "18 meses", "24 meses", "36 meses", "18.2", "15.1", "11.5", "7.4", "6.1", "4.0999999999999996"]
