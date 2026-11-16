# Mapa de slides — Panorama Maceió / SINDUSCON-AL

16/11/2026 · gerado por extração OOXML dos originais na ordem real de `presentation.xml` (não lexicográfica).
Fontes: `5.2026_Panorama_Maceio_Sinduscon_AL_VAP_01jul_16h05.pptx` (SHA256 `1ec1cd87…c6c9`, 82 slides) e
`Brain_Panorama_Maceio_Sinduson_AL_06.2026_vApres.pptx` (SHA256 `351eeed2…4a14`, 87 slides). Hashes completos
em [REFERENCIAS.json](REFERENCIAS.json). Inventário bruto (títulos, textos, tabelas, caches de gráfico) em
`.local-inputs/relatorios-lucas/maceio/inventario/` (local, não versionado).

## Periodicidade comprovada pelo conteúdo

- **Maio/2026 = edição MENSAL.** Séries de linha com 25 meses (mai/24–mai/26), rankings "MAIO/2026",
  acumulados 12 meses mensais (seriais Excel convertidos), IVV mensal.
- **Junho/2026 = edição TRIMESTRAL (2T2026).** Séries de linha com 17 trimestres (2T/22–2T/26), barras de
  acumulado semestral "ACUMULADO JAN.–JUN." (1S25 vs 1S26), rankings "2T 2026", participações por trimestre
  (2T/2025 vs 2T/2026), bloco extra de mercado vertical comercial, tabelas de oferta final separadas
  Maceió/RM. O nome do arquivo não traz "trimestral"; a comprovação é pelos caches de gráfico.

## Recorte municipal comprovado (slide 7 de cada edição)

- Maio (mensal): Maceió, Pilar, Marechal Deodoro, Paripueira, Rio Largo, Barra de São Miguel e **Coqueiro Seco** (7 municípios).
- Junho (trimestral): os mesmos **sem Coqueiro Seco** (6 municípios).
- A causa da diferença não está comprovada (mudança de recorte entre edições ou por periodicidade). Tratar como
  recorte por edição; **não** unir automaticamente nem excluir município em silêncio. Pergunta aberta ao analista
  em [DECISOES.md](DECISOES.md).

## Colunas

Pos = posição original (preservada no manifesto, sem renumeração) · Bloco = seção do sumário ·
Classe = editorial (capa/divisória/equipe/fechamento) ou analítico (dado) · Recorte = detectado por texto do slide ·
Composição = objetos extraídos do OOXML · Janela = detectada dos caches de gráfico (p = pontos) ·
Fonte candidata = hipótese a confirmar na matriz de indicadores, **não** fonte homologada.

Slides analíticos com composição "2 img" e janela "—" têm o gráfico achatado como imagem no original
(ex.: IVV líquidas, IVV por área útil, blocos horizontal e comercial, emprego/CAGED). A composição real
exige conferência por render; o conteúdo virá de fonte de dados, não da imagem.

## Maio/2026 — mensal, 82 posições

| Pos | Título | Bloco | Classe | Recorte | Composição | Janela | Fonte candidata |
|---|---|---|---|---|---|---|---|
| 1 | (sem texto) | Capa/abertura | editorial | — | 1 img | — | Editorial |
| 2 | MACEIÓ E REGIÃO METROPOLITANA | Capa/abertura | editorial | Maceió | 6 img | — | Editorial |
| 3 | (sem texto) | Capa/abertura | editorial | — | 1 img | — | Editorial |
| 4 | (sem texto) | Capa/abertura | editorial | — | 1 img | — | Editorial |
| 5 | (sem texto) | Capa/abertura | editorial | — | 1 img | — | Editorial |
| 6 | SUMÁRIO | Sumário | editorial | Brasil/UF | 1 img | — | Editorial |
| 7 | MACEIÓ E REGIÃO METROPOLITANA | Cidades do estudo | editorial | Maceió | 1 img | — | Editorial |
| 8 | EMPREGO | Emprego | editorial | — | 2 img | — | Editorial |
| 9 | SALDO DO EMPREGO FORMAL NO BRASIL / CONSTRUÇÃO CIVIL | Emprego | analítico | Brasil/UF | 3 img | — | CAGED (externa) |
| 10 | DESEMPENHO POR ESTADO / SALDO TOTAL | Emprego | analítico | Brasil/UF | 1 img | — | CAGED (externa) |
| 11 | DESEMPENHO POR ESTADO / SALDO CONSTRUÇÃO CIVIL | Emprego | analítico | Brasil/UF | 1 img | — | CAGED (externa) |
| 12 | SALDO DO EMPREGO FORMAL EM ALAGOAS / CONSTRUÇÃO CIVIL | Emprego | analítico | Alagoas | 2 img | — | CAGED (externa) |
| 13 | SALDO POR SETOR DE ATIVIDADE / ALAGOAS | Emprego | analítico | Alagoas | 1 img | — | CAGED (externa) |
| 14 | DESEMPENHO POR ESTADOS / REGIÃO NORDESTE | Emprego | analítico | Brasil/UF | 1 img | — | CAGED (externa) |
| 15 | LANÇAMENTOSVERTICAIS | Lançamentos verticais | editorial | — | 2 img | — | Editorial |
| 16 | EMPREENDIMENTOS VERTICAIS LANÇADOS | Lançamentos verticais | analítico | — | gráfico lineChart, 1 img | mensal mai/24–mai/26 (25p) | API Geobrain + INCC (VGL) |
| 17 | EMPREENDIMENTOS VERTICAIS LANÇADOS POR PADRÃO | Lançamentos verticais | analítico | Maceió + RM | gráfico areaChart, 1 img | categorias (6: 2021…) | API Geobrain + INCC (VGL) |
| 18 | EMPREENDIMENTOS VERTICAIS LANÇADOSACUMULADO 12 MESES | Lançamentos verticais | analítico | Maceió + RM | tabela 4×3, gráfico lineChart, 1 img | mensal nov/21–mai/26 (50p) | API Geobrain + INCC (VGL) |
| 19 | UNIDADES VERTICAIS LANÇADAS | Lançamentos verticais | analítico | Maceió + RM | tabela 4×2, gráfico lineChart, 1 img | mensal mai/24–mai/26 (25p) | API Geobrain + INCC (VGL) |
| 20 | UNIDADES VERTICAIS LANÇADASACUMULADO 12 MESES | Lançamentos verticais | analítico | Maceió + RM | tabela 4×3, gráfico lineChart, 1 img | mensal jul/21–mai/26 (50p) | API Geobrain + INCC (VGL) |
| 21 | UNIDADES VERTICAIS LANÇADAS POR PADRÃO | Lançamentos verticais | analítico | Maceió + RM | gráfico areaChart, 1 img | categorias (6: 2021…) | API Geobrain + INCC (VGL) |
| 22 | UNIDADES VERTICAIS LANÇADAS | Lançamentos verticais | analítico | Maceió + RM | gráfico lineChart, 2 img | mensal mai/24–mai/26 (25p) | API Geobrain + INCC (VGL) |
| 23 | UNIDADES VERTICAIS LANÇADAS POR TIPOLOGIA | Lançamentos verticais | analítico | Maceió + RM | gráfico barChart, 1 img | mensal mai/25–mai/26 (2p) | API Geobrain + INCC (VGL) |
| 24 | UNIDADES VERTICAIS LANÇADAS POR PADRÃO | Lançamentos verticais | analítico | Maceió + RM | gráfico barChart, 1 img | mensal mai/25–mai/26 (2p) | API Geobrain + INCC (VGL) |
| 25 | UNIDADES VERTICAIS LANÇADAS POR BAIRRO – MAIO/2026 | Lançamentos verticais | analítico | Maceió | gráfico barChart, 1 img | categorias (3: Tabuleiro Do Marti…) | API Geobrain + INCC (VGL) |
| 26 | VGL – VALOR GERAL LANÇADO (em R$ milhões) | Lançamentos verticais | analítico | Maceió + RM | tabela 4×2, gráfico lineChart, 1 img | mensal mai/24–mai/26 (25p) | API Geobrain + INCC (VGL) |
| 27 | VGL (R$ EM MILHÕES)ACUMULADO 12 MESES | Lançamentos verticais | analítico | — | tabela 4×3, gráfico lineChart, 1 img | mensal abr/23–mai/26 (38p) | API Geobrain + INCC (VGL) |
| 28 | VGL (R$ EM MILHÕES) VERTICAL | Lançamentos verticais | analítico | Maceió + RM | gráfico areaChart, 1 img | categorias (6: 2021…) | API Geobrain + INCC (VGL) |
| 29 | VENDASVERTICAIS | Vendas verticais | editorial | — | 2 img | — | Editorial |
| 30 | UNIDADES VERTICAIS VENDIDAS | Vendas verticais | analítico | Maceió + RM | tabela 4×2, gráfico lineChart, 1 img | mensal mai/24–mai/26 (25p) | API Geobrain + INCC (VGV) |
| 31 | UNIDADES VERTICAIS VENDIDAS ACUMULADO 12 MESES | Vendas verticais | analítico | — | tabela 4×3, gráfico lineChart, 1 img | mensal abr/23–mai/26 (38p) | API Geobrain + INCC (VGV) |
| 32 | UNIDADES VERTICAIS VENDIDAS | Vendas verticais | analítico | Maceió + RM | gráfico areaChart, 1 img | categorias (6: 2021…) | API Geobrain + INCC (VGV) |
| 33 | UNIDADES VERTICAIS VENDIDAS | Vendas verticais | analítico | Maceió + RM | tabela 4×2, gráfico lineChart, 2 img | mensal mai/24–mai/26 (25p) | API Geobrain + INCC (VGV) |
| 34 | UNIDADES VERTICAIS VENDIDAS POR TIPOLOGIA | Vendas verticais | analítico | Maceió + RM | gráfico barChart, 1 img | mensal mai/25–mai/26 (2p) | API Geobrain + INCC (VGV) |
| 35 | UNIDADES VERTICAIS VENDIDAS POR PADRÃO | Vendas verticais | analítico | Maceió + RM | gráfico barChart, 1 img | mensal mai/25–mai/26 (2p) | API Geobrain + INCC (VGV) |
| 36 | UNIDADES VERTICAIS VENDIDAS POR BAIRROS (MACEIÓ) E POR CIDADES – MAIO 2026 | Vendas verticais | analítico | Maceió + RM | gráfico barChart, gráfico barChart, 1 img | categorias (9: Tabuleiro Do Marti…); categorias (3: Maceió-AL…) | API Geobrain + INCC (VGV) |
| 37 | VGV – VALOR GERAL VENDIDO (em R$ milhões) | Vendas verticais | analítico | — | tabela 4×2, gráfico lineChart, 1 img | mensal mai/24–mai/26 (25p) | API Geobrain + INCC (VGV) |
| 38 | VGV (em R$ milhões)ACUMULADO 12 MESES | Vendas verticais | analítico | Maceió + RM | tabela 4×3, gráfico lineChart, 1 img | mensal abr/23–mai/26 (38p) | API Geobrain + INCC (VGV) |
| 39 | OFERTA | Oferta | editorial | — | 2 img | — | Editorial |
| 40 | OFERTA FINAL VERTICAL | Oferta | analítico | — | tabela 4×2, gráfico lineChart, 1 img | mensal mai/24–mai/26 (25p) | API Geobrain |
| 41 | TEMPO DE ESCOAMENTO DO ESTOQUE EM MESES | Oferta | analítico | Maceió | gráfico barChart, 1 img | categorias (7: Super Luxo…) | API Geobrain |
| 42 | OFERTA FINAL POR TIPOLOGIA | Oferta | analítico | Maceió + RM | gráfico barChart, 1 img | mensal mai/25–mai/26 (2p) | API Geobrain |
| 43 | OFERTA FINAL POR PADRÃO | Oferta | analítico | Maceió + RM | gráfico barChart, 1 img | mensal abr/25–abr/26 (2p) | API Geobrain |
| 44 | ÍNDICE DE VELOCIDADE DE VENDAS / IVV | VSO/IVV | editorial | — | 2 img | — | Editorial |
| 45 | IVV (%) MACEIÓ | VSO/IVV | analítico | Maceió | gráfico lineChart, 1 img | mensal mai/24–mai/26 (25p) | API Geobrain |
| 46 | ÍNDICE DE VELOCIDADE DE VENDAS LÍQUIDAS | VSO/IVV | analítico | Maceió | 2 img | — | API Geobrain |
| 47 | IVV POR ÁREA ÚTIL EM m² VERTICAL Maio 2026 | VSO/IVV | analítico | Maceió | 2 img | — | API Geobrain |
| 48 | IVV POR ÁREA ÚTIL EM m² VERTICAL Acumulado 12 meses | VSO/IVV | analítico | Maceió | 2 img | — | API Geobrain |
| 49 | EVOLUÇÃO DOS PREÇOS | Evolução dos preços | editorial | — | 2 img | — | Editorial |
| 50 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | mensal mai/25–mai/26 (13p) | API Geobrain |
| 51 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | mensal mai/25–mai/26 (13p) | API Geobrain |
| 52 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | mensal mai/25–mai/26 (13p) | API Geobrain |
| 53 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | mensal mai/25–mai/26 (13p) | API Geobrain |
| 54 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | mensal mai/25–mai/26 (13p) | API Geobrain |
| 55 | PREÇOS POR TIPOLOGIA E PADRÃO | Preços por tipologia e padrão | editorial | — | 2 img | — | Editorial |
| 56 | TICKET MÉDIO POR PADRÃO RESIDENCIAL MACEIÓ E REGIÃO METROPOLITANA (R$ Mil) | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart+lineChart, 1 img | categorias (7: Compacto…) | API Geobrain |
| 57 | PREÇO MÉDIO M²/PRIVATIVO POR PADRÃO RESIDENCIAL | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart+lineChart, 1 img | categorias (7: Compacto…) | API Geobrain |
| 58 | PREÇO MÉDIO M²/PRIVATIVO POR PADRÃO | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart+lineChart, 1 img | categorias (7: Compacto…) | API Geobrain |
| 59 | TICKET MÉDIO POR TIPOLOGIA (R$ Mil) | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (4: 1 Dormitório…) | API Geobrain |
| 60 | PREÇO MÉDIO M²/PRIVATIVO POR TIPOLOGIA | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (4: 1 Dormitório…) | API Geobrain |
| 61 | ESTADO ATUAL DO MERCADO RESIDENCIAL VERTICAL | Estado atual do mercado residencial vertical | editorial | Brasil/UF | 2 img | — | Editorial |
| 62 | OFERTA FINAL POR ANO DE LANÇAMENTO | Estado atual do mercado residencial vertical | analítico | Maceió + RM | tabela 8×5, 1 img | — | API Geobrain |
| 63 | OFERTA FINAL POR PADRÃO | Estado atual do mercado residencial vertical | analítico | Maceió + RM | tabela 9×6, 1 img | — | API Geobrain |
| 64 | OFERTA FINAL POR TIPOLOGIA | Estado atual do mercado residencial vertical | analítico | Maceió + RM | tabela 6×5, 1 img | — | API Geobrain |
| 65 | OFERTA FINAL POR TIPOLOGIA E METRAGEM | Estado atual do mercado residencial vertical | analítico | Maceió | tabela 12×6, 1 img | — | API Geobrain |
| 66 | MÍNIMO, MÉDIA E MÁXIMO DO PREÇO POR TIPOLOGIA | Estado atual do mercado residencial vertical | analítico | Maceió | tabela 7×8, 1 img | — | API Geobrain |
| 67 | OFERTA LANÇADA | Estado atual do mercado residencial vertical | analítico | Maceió + RM | gráfico barChart, gráfico barChart, 1 img | categorias (4: 1 DORM…); categorias (4: 1 DORM…) | API Geobrain |
| 68 | TEMPO MÉDIO DA OFERTA LANÇADA FINAL POR PADRÃO | Estado atual do mercado residencial vertical | analítico | Maceió + RM | gráfico barChart, gráfico barChart, 1 img | categorias (4: COMPACTOS…); categorias (4: COMPACTOS…) | API Geobrain |
| 69 | VGV OFERTADO E DISPONÍVEL POR PADRÃO | Estado atual do mercado residencial vertical | analítico | Maceió + RM | tabela 10×8, 1 img | — | API Geobrain |
| 70 | MERCADO HORIZONTAL MACEIÓ | Mercado horizontal Maceió | editorial | Maceió | 2 img | — | Editorial |
| 71 | OFERTA LANÇADA E FINAL POR TIPO | Mercado horizontal Maceió | analítico | Maceió | 2 img | — | API Geobrain (horizontal) |
| 72 | OFERTA LANÇADA E FINAL POR ANO DE LANÇAMENTO | Mercado horizontal Maceió | analítico | Maceió | 2 img | — | API Geobrain (horizontal) |
| 73 | PREÇO MÉDIO DO M² PRIVATIVO POR TIPOLOGIA | Mercado horizontal Maceió | analítico | Maceió | 2 img | — | API Geobrain (horizontal) |
| 74 | MERCADO HORIZONTAL RM MACEIÓ | Mercado horizontal RM | editorial | Maceió | 2 img | — | Editorial |
| 75 | OFERTA LANÇADA E FINAL POR TIPO- RM de MACEIÓ | Mercado horizontal RM | analítico | RM | 2 img | — | API Geobrain (horizontal) |
| 76 | OFERTA LANÇADA E FINAL POR ANO DE LANÇAMENTO - RM de MACEIÓ | Mercado horizontal RM | analítico | RM | 2 img | — | API Geobrain (horizontal) |
| 77 | PREÇO MÉDIO DO M² PRIVATIVO POR TIPOLOGIA - RM de MACEIÓ | Mercado horizontal RM | analítico | RM | 2 img | — | API Geobrain (horizontal) |
| 78 | CONSULTORES DO ESTUDO | Consultores/equipe | editorial | — | 2 img | — | Editorial |
| 79 | EQUIPE TÉCNICA | Consultores/equipe | editorial | — | 7 img | — | Editorial |
| 80 | (sem texto) | Fechamento | editorial | — | 1 img | — | Editorial |
| 81 | (sem texto) | Fechamento | editorial | — | 1 img | — | Editorial |
| 82 | (sem texto) | Fechamento | editorial | — | 1 img | — | Editorial |

## Junho/2026 — trimestral 2T2026, 87 posições

| Pos | Título | Bloco | Classe | Recorte | Composição | Janela | Fonte candidata |
|---|---|---|---|---|---|---|---|
| 1 | (sem texto) | Capa/abertura | editorial | — | 1 img | — | Editorial |
| 2 | MACEIÓ E REGIÃO METROPOLITANA | Capa/abertura | editorial | Maceió | 6 img | — | Editorial |
| 3 | (sem texto) | Capa/abertura | editorial | — | 1 img | — | Editorial |
| 4 | (sem texto) | Capa/abertura | editorial | — | 1 img | — | Editorial |
| 5 | (sem texto) | Capa/abertura | editorial | — | 1 img | — | Editorial |
| 6 | SUMÁRIO | Sumário | editorial | Brasil/UF | 1 img | — | Editorial |
| 7 | MACEIÓ E REGIÃO METROPOLITANA | Cidades do estudo | editorial | Maceió | 1 img | — | Editorial |
| 8 | EMPREGO | Emprego | editorial | — | 2 img | — | Editorial |
| 9 | SALDO DO EMPREGO FORMAL NO BRASIL / CONSTRUÇÃO CIVIL | Emprego | analítico | Brasil/UF | 3 img | — | CAGED (externa) |
| 10 | DESEMPENHO POR ESTADO / SALDO TOTAL | Emprego | analítico | Brasil/UF | 1 img | — | CAGED (externa) |
| 11 | DESEMPENHO POR ESTADO / SALDO CONSTRUÇÃO CIVIL | Emprego | analítico | Brasil/UF | 1 img | — | CAGED (externa) |
| 12 | SALDO DO EMPREGO FORMAL EM ALAGOAS / CONSTRUÇÃO CIVIL | Emprego | analítico | Alagoas | 2 img | — | CAGED (externa) |
| 13 | SALDO POR SETOR DE ATIVIDADE / ALAGOAS | Emprego | analítico | Alagoas | 1 img | — | CAGED (externa) |
| 14 | DESEMPENHO POR ESTADOS / REGIÃO NORDESTE | Emprego | analítico | Brasil/UF | 1 img | — | CAGED (externa) |
| 15 | LANÇAMENTOSVERTICAIS | Lançamentos verticais | editorial | — | 2 img | — | Editorial |
| 16 | EMPREENDIMENTOS VERTICAIS LANÇADOS | Lançamentos verticais | analítico | — | tabela 4×2, gráfico barChart, gráfico lineChart, 1 img | semestral 1S25–1S26 (2p); trimestral 2T/22–2T/26 (17p) | API Geobrain + INCC (VGL) |
| 17 | EMPREENDIMENTOS VERTICAIS LANÇADOS POR PADRÃO | Lançamentos verticais | analítico | Maceió + RM | gráfico areaChart, 1 img | categorias (6: 2021…) | API Geobrain + INCC (VGL) |
| 18 | EMPREENDIMENTOS VERTICAIS LANÇADOSACUMULADO 12 MESES | Lançamentos verticais | analítico | — | tabela 4×3, gráfico lineChart, 1 img | mensal nov/21–jun/26 (50p) | API Geobrain + INCC (VGL) |
| 19 | UNIDADES VERTICAIS LANÇADAS | Lançamentos verticais | analítico | — | tabela 4×2, gráfico lineChart, gráfico barChart, 1 img | trimestral 2T/22–2T/26 (17p); semestral 1S25–1S26 (2p) | API Geobrain + INCC (VGL) |
| 20 | UNIDADES VERTICAIS LANÇADASACUMULADO 12 MESES | Lançamentos verticais | analítico | — | tabela 4×3, gráfico lineChart, 1 img | mensal jul/21–jun/26 (50p) | API Geobrain + INCC (VGL) |
| 21 | PARTICIPAÇÃO DAS UNIDADES VERTICAIS LANÇADAS POR PADRÃO | Lançamentos verticais | analítico | Maceió + RM | gráfico areaChart, 1 img | categorias (6: 2021…) | API Geobrain + INCC (VGL) |
| 22 | UNIDADES VERTICAIS LANÇADAS | Lançamentos verticais | analítico | — | tabela 4×2, gráfico barChart, gráfico lineChart, 2 img | semestral 1S25–1S26 (2p); trimestral 2T/22–2T/26 (17p) | API Geobrain + INCC (VGL) |
| 23 | PARTICIPAÇÃO DAS UNIDADES VERTICAIS LANÇADAS POR TIPOLOGIA | Lançamentos verticais | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (2: 2T/2025…) | API Geobrain + INCC (VGL) |
| 24 | PARTICIPAÇÃO DAS UNIDADES VERTICAIS LANÇADAS POR PADRÃO | Lançamentos verticais | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (2: 2T/2025…) | API Geobrain + INCC (VGL) |
| 25 | RAKING DE LANÇAMENTOS POR BAIRRO – 2T 2026 | Lançamentos verticais | analítico | — | gráfico barChart, 1 img | categorias (2: Poço…) | API Geobrain + INCC (VGL) |
| 26 | VGL – VALOR GERAL LANÇADO (em R$ milhões) | Lançamentos verticais | analítico | — | tabela 4×2, gráfico barChart, gráfico lineChart, 1 img | semestral 1S25–1S26 (2p); trimestral 2T/22–2T/26 (17p) | API Geobrain + INCC (VGL) |
| 27 | VGL (em R$ milhões) ACUMULADO 12 MESES | Lançamentos verticais | analítico | — | tabela 4×3, gráfico lineChart, 2 img | mensal mai/23–jun/26 (38p) | API Geobrain + INCC (VGL) |
| 28 | VGL (R$ EM MILHÕES) VERTICAL | Lançamentos verticais | analítico | Maceió + RM | gráfico areaChart, 1 img | categorias (6: 2021…) | API Geobrain + INCC (VGL) |
| 29 | VENDASVERTICAIS | Vendas verticais | editorial | — | 2 img | — | Editorial |
| 30 | UNIDADES VERTICAIS VENDIDAS | Vendas verticais | analítico | — | tabela 4×2, gráfico lineChart, gráfico barChart, 1 img | trimestral 2T/22–2T/26 (17p); semestral 1S25–1S26 (2p) | API Geobrain + INCC (VGV) |
| 31 | UNIDADES VERTICAIS VENDIDAS ACUMULADO 12 MESES | Vendas verticais | analítico | — | tabela 4×3, gráfico lineChart, 1 img | mensal mai/23–jun/26 (38p) | API Geobrain + INCC (VGV) |
| 32 | PARTICIPAÇÃO DAS UNIDADES VENDIDAS POR PADRÃO | Vendas verticais | analítico | Maceió + RM | gráfico areaChart, 1 img | categorias (6: 2021…) | API Geobrain + INCC (VGV) |
| 33 | UNIDADES VERTICAIS VENDIDAS | Vendas verticais | analítico | — | tabela 4×2, gráfico barChart, gráfico lineChart, 2 img | semestral 1S25–1S26 (2p); trimestral 2T/22–2T/26 (17p) | API Geobrain + INCC (VGV) |
| 34 | PARTICIPAÇÃO DAS UNIDADES VERTICAIS VENDIDAS POR TIPOLOGIA | Vendas verticais | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (2: 2T/2025…) | API Geobrain + INCC (VGV) |
| 35 | PARTICIPAÇÃO DAS UNIDADES VERTICAIS VENDIDAS POR PADRÃO | Vendas verticais | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (2: 2T/2025…) | API Geobrain + INCC (VGV) |
| 36 | RANKING DE VENDAS POR BAIRRO (MACEIÓ) E POR CIDADE / 2T2026 | Vendas verticais | analítico | Maceió + RM | gráfico barChart, gráfico barChart, 1 img | categorias (6: Poço…); categorias (4: Maceió-AL…) | API Geobrain + INCC (VGV) |
| 37 | VGV – VALOR GERAL VENDIDO (em R$ milhões) | Vendas verticais | analítico | — | tabela 4×2, gráfico barChart, gráfico lineChart, 2 img | semestral 1S25–1S26 (2p); trimestral 2T/22–2T/26 (17p) | API Geobrain + INCC (VGV) |
| 38 | VGV (em R$ milhões) ACUMULADO 12 MESES | Vendas verticais | analítico | — | tabela 4×3, gráfico lineChart, 2 img | mensal mai/23–jun/26 (38p) | API Geobrain + INCC (VGV) |
| 39 | OFERTA | Oferta | editorial | — | 2 img | — | Editorial |
| 40 | OFERTA FINAL VERTICAL | Oferta | analítico | — | tabela 4×2, gráfico lineChart, 1 img | trimestral 2T/22–2T/26 (17p) | API Geobrain |
| 41 | OFERTA FINAL POR TIPOLOGIA | Oferta | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (2: 2T/2025…) | API Geobrain |
| 42 | OFERTA FINAL POR PADRÃO | Oferta | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (2: 2T/2025…) | API Geobrain |
| 43 | VSO / IVV | VSO/IVV | editorial | — | 2 img | — | Editorial |
| 44 | IVV (%) MACEIÓ | VSO/IVV | analítico | Maceió | gráfico lineChart, 1 img | mensal jun/24–jun/26 (25p) | API Geobrain |
| 45 | ÍNDICE DE VELOCIDADE DE VENDAS LÍQUIDAS | VSO/IVV | analítico | Maceió | 2 img | — | API Geobrain |
| 46 | IVV POR ÁREA ÚTIL EM m² VERTICAL Junho 2026 | VSO/IVV | analítico | Maceió | 2 img | — | API Geobrain |
| 47 | IVV POR ÁREA ÚTIL EM m² VERTICAL Acumulado 12 meses | VSO/IVV | analítico | Maceió | 2 img | — | API Geobrain |
| 48 | EVOLUÇÃO DOS PREÇOS | Evolução dos preços | editorial | — | 2 img | — | Editorial |
| 49 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | categorias (13: 2T23…) | API Geobrain |
| 50 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | categorias (13: 2T23…) | API Geobrain |
| 51 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | mensal mai/25–mai/26 (13p) | API Geobrain |
| 52 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | categorias (13: 2T23…) | API Geobrain |
| 53 | EVOLUÇÃO DOS PREÇOS – R$/M² VERTICAL MACEIÓ | Evolução dos preços | analítico | Maceió | gráfico barChart+lineChart, 1 img | categorias (13: 2T23…) | API Geobrain |
| 54 | PREÇOS POR TIPOLOGIA E PADRÃO | Preços por tipologia e padrão | editorial | — | 2 img | — | Editorial |
| 55 | TICKET MÉDIO POR PADRÃO RESIDENCIAL MACEIÓ E REGIÃO METROPOLITANA (R$ Mil) | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart+lineChart, 1 img | categorias (7: Compacto…) | API Geobrain |
| 56 | PREÇO MÉDIO M²/PRIVATIVO POR PADRÃO RESIDENCIAL | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart+lineChart, 1 img | categorias (7: Compacto…) | API Geobrain |
| 57 | PREÇO MÉDIO M²/PRIVATIVO POR PADRÃO | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart+lineChart, 1 img | categorias (7: Compacto…) | API Geobrain |
| 58 | TICKET MÉDIO POR TIPOLOGIA (R$ Mil) | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (4: 1 Dormitório…) | API Geobrain |
| 59 | PREÇO MÉDIO M²/PRIVATIVO POR TIPOLOGIA | Preços por tipologia e padrão | analítico | Maceió + RM | gráfico barChart, 1 img | categorias (4: 1 Dormitório…) | API Geobrain |
| 60 | ESTADO ATUAL DO MERCADO RESIDENCIAL VERTICAL | Estado atual do mercado residencial vertical | editorial | Brasil/UF | 2 img | — | Editorial |
| 61 | OFERTA FINAL POR ANO DE LANÇAMENTO | Estado atual do mercado residencial vertical | analítico | Maceió + RM | tabela 7×5, 1 img | — | API Geobrain |
| 62 | OFERTA FINAL POR PADRÃO | Estado atual do mercado residencial vertical | analítico | Maceió | tabela 9×7, 1 img | — | API Geobrain |
| 63 | OFERTA FINAL POR PADRÃO | Estado atual do mercado residencial vertical | analítico | RM | tabela 9×7, 1 img | — | API Geobrain |
| 64 | OFERTA FINAL POR TIPOLOGIA | Estado atual do mercado residencial vertical | analítico | Maceió | tabela 6×6, 1 img | — | API Geobrain |
| 65 | OFERTA FINAL POR TIPOLOGIA | Estado atual do mercado residencial vertical | analítico | RM | tabela 6×6, 1 img | — | API Geobrain |
| 66 | OFERTA FINAL POR TIPOLOGIA E METRAGEM | Estado atual do mercado residencial vertical | analítico | Maceió | tabela 12×6, 1 img | — | API Geobrain |
| 67 | MÍNIMO, MÉDIA E MÁXIMO DO PREÇO POR TIPOLOGIA | Estado atual do mercado residencial vertical | analítico | Maceió | tabela 7×8, 1 img | — | API Geobrain |
| 68 | OFERTA LANÇADA | Estado atual do mercado residencial vertical | analítico | Maceió + RM | gráfico barChart, gráfico barChart, 1 img | categorias (4: 1 DORM…); categorias (4: 1 DORM…) | API Geobrain |
| 69 | TEMPO MÉDIO DA OFERTA LANÇADA FINAL POR PADRÃO | Estado atual do mercado residencial vertical | analítico | Maceió + RM | gráfico barChart, gráfico barChart, 1 img | categorias (4: COMPACTOS…); categorias (4: COMPACTOS…) | API Geobrain |
| 70 | VGV OFERTADO E DISPONÍVEL POR PADRÃO | Estado atual do mercado residencial vertical | analítico | Maceió + RM | tabela 10×8, 1 img | — | API Geobrain |
| 71 | MERCADO HORIZONTAL MACEIÓ | Mercado horizontal Maceió | editorial | Maceió | 2 img | — | Editorial |
| 72 | OFERTA LANÇADA E FINAL POR TIPO | Mercado horizontal Maceió | analítico | Maceió | 2 img | — | API Geobrain (horizontal) |
| 73 | OFERTA LANÇADA E FINAL POR ANO DE LANÇAMENTO | Mercado horizontal Maceió | analítico | Maceió | 2 img | — | API Geobrain (horizontal) |
| 74 | PREÇO MÉDIO DO M² PRIVATIVO POR TIPOLOGIA | Mercado horizontal Maceió | analítico | Maceió | 2 img | — | API Geobrain (horizontal) |
| 75 | MERCADO HORIZONTAL RM MACEIÓ | Mercado horizontal RM | editorial | Maceió | 2 img | — | Editorial |
| 76 | OFERTA LANÇADA E FINAL POR TIPO- RM de MACEIÓ | Mercado horizontal RM | analítico | RM | 2 img | — | API Geobrain (horizontal) |
| 77 | OFERTA LANÇADA E FINAL POR ANO DE LANÇAMENTO - RM de MACEIÓ | Mercado horizontal RM | analítico | RM | 2 img | — | API Geobrain (horizontal) |
| 78 | PREÇO MÉDIO DO M² PRIVATIVO POR TIPOLOGIA - RM de MACEIÓ | Mercado horizontal RM | analítico | RM | 2 img | — | API Geobrain (horizontal) |
| 79 | MERCADO VERTICAL COMERCIAL MACEIÓ | Mercado vertical comercial Maceió | editorial | Maceió | 2 img | — | Editorial |
| 80 | OFERTA LANÇADA E FINAL POR PADRÃOMACEIÓ | Mercado vertical comercial Maceió | analítico | Maceió | 2 img | — | API Geobrain (comercial) |
| 81 | OFERTA LANÇADA E FINAL POR ANA DE LANÇAMENTOMACEIÓ | Mercado vertical comercial Maceió | analítico | Maceió | 2 img | — | API Geobrain (comercial) |
| 82 | PREÇO MÉDIO POR PADRÃOMACEIÓ | Mercado vertical comercial Maceió | analítico | Maceió | 2 img | — | API Geobrain (comercial) |
| 83 | CONSULTORES DO ESTUDO | Consultores/equipe | editorial | — | 2 img | — | Editorial |
| 84 | EQUIPE TÉCNICA | Consultores/equipe | editorial | — | 6 img | — | Editorial |
| 85 | (sem texto) | Fechamento | editorial | — | 1 img | — | Editorial |
| 86 | (sem texto) | Fechamento | editorial | — | 1 img | — | Editorial |
| 87 | (sem texto) | Fechamento | editorial | — | 1 img | — | Editorial |
