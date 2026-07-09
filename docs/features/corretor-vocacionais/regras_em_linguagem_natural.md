# Regras do Corretor — em linguagem natural (inventário completo)

Lista de **tudo que o corretor analisa hoje**, em português claro, para avaliação das regras
e das bases de conhecimento. Atualizado em 09/jul/2026.

Legenda de status: **RUNTIME** = roda no app hoje · **POC** = roda em script versionado
(`docs/features/corretor-vocacionais/*.py`), ainda fora do app · **PLANEJADA** = catalogada,
sem implementação.

---

## A. Regras em produção no app (`/auditoria`) — IA por slide

O app v1 envia **cada slide como imagem** para a OpenAI com um prompt fixo
(`supabase/functions/analyze-slide/index.ts`). As regras pedidas no prompt:

1. **Nome da cidade (`CITY_NAME`)** — RUNTIME · IA
   Em qualquer lugar do slide (título, busca, legenda, rodapé, tabela), se aparecer nome de
   cidade, tem que ser a cidade do estudo. Qualquer outra cidade é erro.
2. **Ortografia (`SPELLING`)** — RUNTIME · IA
   Todo texto legível é verificado contra erros de português.
3. **Somas de percentual (`PERCENTAGE_SUM`)** — RUNTIME · IA
   Em tabelas numéricas, cada coluna de % deve somar 100% na linha Total.
4. **Raios do estudo (`RADII`)** — RUNTIME · IA
   Referências a raios/zonas de tempo devem ser exatamente os raios contratados (ex.: 10/20/30 min).
5. **Coerência texto × tabela (`COHERENCE`)** — RUNTIME · IA
   Números citados no texto descritivo devem bater com os valores da tabela do mesmo slide.
6. **Pular slide sem texto** — RUNTIME · IA
   Slide só com foto (sem palavras/números) é marcado "sem revisão" e não gasta análise.

> Limitação conhecida da v1: análise **slide a slide, sem memória** — não enxerga
> inconsistências ENTRE slides (que são a maioria das correções reais do analista).

## B. Regras determinísticas sobre o IR — POC validado (`rules_ir.py`)

Rodam sobre o texto/estrutura extraídos do PPTX, **custo zero de IA**:

7. **Nota de edição esquecida (`LEFTOVER_NOTE`)** — POC · DET
   Comentários internos do revisor vazados no deck ("verificar", "ajustar", "corrigir",
   "pendente"…). Após a virada conceitual, é **rede de segurança** (estudos reais não devem
   ter notas).
8. **Fonte ausente (`SOURCE_MISSING`)** — POC · DET
   Slide com tabela/gráfico deve indicar "FONTE: … / ELABORAÇÃO: …" em texto. (Falso positivo
   possível quando a fonte está dentro da imagem.)
9. **Somas de percentual determinística (`PERCENTAGE_SUM`)** — POC · DET
   Igual à regra 3, mas calculada exatamente (sem IA) quando os números existem no PPTX;
   ignora slides marcados "resposta múltipla".
10. **Janela temporal de projeção (`TEMPORAL_WINDOW`)** — POC · DET
    Projeções da seção socioeconômica devem cobrir a janela canônica de 6 anos (hoje
    2027–2032 — **confirmar com a analista**).

## C. Regras cruzadas sobre números extraídos de imagem — POC validado (piloto Fase C)

Rodam sobre os números extraídos por visão (`valida_complemento.py`, `crosscheck_piloto.py`).
No piloto, **reproduziram as notas da analista sem lê-las**:

11. **Somas absolutas (`ABSOLUTE_SUM`)** — POC · DET
    Cada linha e coluna de valores absolutos deve fechar no total declarado da tabela
    (tolerância ±n/2 em tabelas de projeção, por arredondamento de exibição).
12. **Consistência entre tabelas (`CROSS_TABLE_MISMATCH`)** — POC · DET
    Valores que aparecem em mais de um slide devem ser idênticos: faixas de renda iguais em
    todos os slides que as usam; totais de oferta iguais entre tabelas da mesma Z.I.;
    população/domicílios iguais em toda a seção socio.
13. **Continuidade de faixas (`BINNING_RULE`)** — POC · DET
    Faixas de valores (R$/m², renda) não podem ter furo nem sobreposição (ex.: pegou
    "9001–9500 → acima de 10000", faixa 9501–10000 inexistente) e agrupamentos devem seguir a
    regra combinada (ex.: "agrupar acima de R$ 34.360").
14. **Janela temporal cruzada (`TEMPORAL_WINDOW` entre slides)** — POC · DET
    Slides irmãos de projeção devem usar a MESMA base e a MESMA janela de anos (pegou
    2026-2031 × 2025-2030 no mesmo estudo).

## D. Regras catalogadas — PLANEJADAS (rubrica da analista + taxonomia das notas)

15. **Estrutura completa (`STRUCTURE_MISSING`)** — DET · depende da calibração de seções (Fase B)
    Todas as seções obrigatórias do estudo presentes, na ordem (comum faltar entorno
    revendas e mapeamento físico).
16. **Fórmula de projeção (`PROJECTION_FORMULA`)** — DET · **pendente: fórmula com a analista**
    A projeção de demanda deve seguir a fórmula oficial (depende da taxa correta do Brasil).
17. **Batimento IBGE (`IBGE_MISMATCH`)** — DET · **pendente: definir fonte (API/CSV Censo 2022)**
    % de domicílios por tipo/condição de ocupação devem bater com o Censo 2022 do município.
18. **Mapa × gráfico (`MAP_CHART_MISMATCH`)** — IA/visual
    Dados exibidos no mapa devem corresponder ao gráfico/tabela correspondente.
19. **Nota obrigatória (`REQUIRED_NOTE`)** — DET
    Slides específicos exigem notas padrão (ex.: absorção deve dizer que desconsidera 2ª moradia).
20. **Regras de exclusão (`EXCLUSION_RULE`)** — DET
    Lacunas devem excluir Gardens, Duplex e Coberturas; tratamento de esgotados varia por análise.
21. **Igualdade de totais (`TOTALS_EQUALITY`)** — DET
    Total de oferta lançada = total de unidades por tipologia; consolidada bate com as análises.
22. **Cobertura da ata (`ATA_COVERAGE`)** — IA extrai + DET casa
    Tudo que o cliente pediu na ata deve existir no estudo (ex.: "slide separado com previsão
    de entrega checada na conferência da base").
23. **Plausibilidade de valores (`VALUE_PLAUSIBILITY`)** — DET (faixas) + IA (julgamento)
    Valores fora do padrão devem ser sinalizados: taxa de crescimento alta demais, m² fora da
    faixa do tipo de produto, monotonicidade quebrada (unidade maior + mais vagas + m² menor).
24. **Contexto errado (`WRONG_CONTEXT`)** — DET (cidade/UF) + IA
    Dados de OUTRO estudo vazados por copy-paste (caso real: "informações do estudo do Brooklin").

---

## Bases de conhecimento que sustentam as regras

| Base | Onde vive | Alimenta | Status |
|---|---|---|---|
| Parâmetros do projeto (cidade, raios, nº slides) | formulário do app → prompt | 1, 4 | RUNTIME |
| Prompt do revisor v1 | `analyze-slide/index.ts` (hardcoded) | 1–6 | RUNTIME |
| IR do estudo (texto, tabelas, gráficos, fontes, notas) | `ir_extractor.py` → `.ir.json` | 7–14 | POC |
| Dicionário de seções canônicas (`SECOES`) | `ir_extractor.py` | roteamento por seção, 15 | POC — **calibrar (Fase B)** |
| Padrões de texto (nota de edição, resposta múltipla, fonte) | regex em `rules_ir.py` | 7, 8, 9 | POC |
| Números extraídos de imagem (complementos de visão) | `visao/piloto/*.json` | 11–14, 21, 23 | POC (piloto manual; produção pendente) |
| Rubrica da analista (pptx de parâmetros) | `Vocacionais_parametros_de_correcao.pptx` | 15–21 | referência |
| Taxonomia das notas reais (gabarito) | `taxonomia_notas.md` | 12, 13, 16, 23, 24 + validação recall/precisão | versionada |
| Atas de abertura | imagem no slide 1 (futuros: DOCX) | 22 | pendente extração |
| Fórmula de projeção de 6 anos | **com a analista — não obtida** | 16 | pendente |
| Fonte IBGE Censo 2022 por município | **a definir (API/CSV)** | 17 | pendente |
