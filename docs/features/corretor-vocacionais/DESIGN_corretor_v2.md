# Corretor de Vocacionais v2 — Documento de Design (em construção)

> Status: **conceitual / pré-implementação**. Registro das decisões e do entendimento
> até aqui (Fase 4). Ainda não há código novo. Autor da rubrica de correção: analista da
> Brain (A&R). Interlocutor técnico do cliente interno: Diego.

## Documentos de origem

| Documento | Papel |
|---|---|
| [`Vocacionais_parametros_de_correcao.pptx`](./Vocacionais_parametros_de_correcao.pptx) | **Rubrica de correção** (12 slides). Fonte de verdade das regras de auditoria de um Estudo Vocacional. |
| [`Ata_Reuniao_Briefing_..._Impper_....docx`](./Ata_Reuniao_Briefing_Grupo_Impper_Sao_Jose_do_Rio_Preto.docx) | **Exemplo de ata de abertura** (insumo de entrada de um estudo). Não é regra — é o "contrato" que o estudo deve cumprir. |

## Pedido da analista (resumo)

1. Programar a IA para aplicar os **parâmetros de correção** (a rubrica).
2. **Ideia adicional (alto valor):** ensinar a ferramenta a ler a **ata de abertura** do estudo
   e **cruzá-la com o estudo entregue** — ao menos no nível de tópicos/seções — para garantir
   que tudo que foi pedido na ata está contemplado. A ata traz: endereço/coordenadas, metragem
   do terreno, tipo do estudo, produto pretendido, dúvidas do cliente, orientações gerais ao
   analista e, principalmente, **instruções para análises extras**.
3. Após a programação, a analista inicia os **testes**.

## Filosofia central: **mínimo de IA**

Decisão do Gabriel: quanto menos IA, melhor — buscar o máximo de **consistência** e
**eficiência**. Fundamento: uma regra **determinística** é simultaneamente mais barata e mais
consistente que a IA. A IA só é usada onde o problema é genuinamente **semântico** (ler texto
livre) ou **visual** (comparar mapa × gráfico). Toda verificação numérica/estrutural é empurrada
para código auditável.

## O gargalo real não é "IA vs regra" — é a EXTRAÇÃO

As regras determinísticas só funcionam se números, títulos, legendas e notas forem extraídos com
fidelidade do PDF do estudo. A pergunta que define ~80% da arquitetura:

**O PDF do estudo tem camada de texto ou é imagem achatada?**
- **Com texto** (export normal PPTX→PDF): extração determinística via `pdfjs` (já no projeto),
  quase sem IA. Implementação atual hoje **rasteriza** e manda à visão da OpenAI — caro e menos
  confiável; substituível.
- **Só imagem**: exige OCR/visão (caminho caro). Manter como fallback.

## Arquitetura proposta (3 camadas)

```
CAMADA 1 · EXTRAÇÃO
  Estudo (PDF) → texto / tabelas / títulos / legendas / notas
  Ata (PDF/DOCX) → requisitos estruturados (checklist)
  Determinístico onde há texto; IA só como fallback/semântica

CAMADA 2 · MOTOR DE REGRAS (100% determinístico)
  somas de coluna · totais iguais · janela de 6 anos ·
  consistência entre tabelas · batimento IBGE · regras de exclusão ·
  presença de fonte/notas · completude de estrutura · cobertura da ata

CAMADA 3 · SEMÂNTICA (IA mínima e cirúrgica)
  ortografia · leitura da ata → requisitos · mapa × gráfico (visual) ·
  casamento fuzzy de "análises extras"
```

## Catálogo de regras (rubrica → tipo de erro → motor)

Legenda motor: **DET** = determinístico · **IA** = precisa de IA · **DET+extração** = det. desde
que a extração entregue o dado.

| # Rubrica (slide) | Regra | Tipo de erro proposto | Motor |
|---|---|---|---|
| Estrutura (s1-2) | Todas as seções 1→8 presentes (índice numerado). Comum faltar 1.6 entorno revendas e 1.7 mapeamento físico | `STRUCTURE_MISSING` | DET (match de títulos numerados) |
| Socio (s3) | Cidade **e Estado** são os do estudo | `CITY_STATE` | DET+extração |
| Socio (s3) | Projeção deve ser de **6 anos (2027–2032)** | `TEMPORAL_WINDOW` | DET |
| Socio (s3) | Correção da fórmula de projeção | `PROJECTION_FORMULA` | DET (pegar fórmula com a analista) |
| Socio (todas) | **Fonte e elaboração** indicadas no slide | `SOURCE_MISSING` | DET (busca textual) |
| Socio (s4) | População/domicílios batem entre **TODAS** as tabelas da socio | `CROSS_TABLE_MISMATCH` | DET+extração |
| Socio (s5) | Cada coluna de **valor absoluto** fecha no total (todas as tabelas) | `ABSOLUTE_SUM` | DET+extração |
| Socio (s5) | Colunas de **%** fecham 100% no total (existente hoje) | `PERCENTAGE_SUM` | DET+extração |
| Socio (s6-7) | % domicílios por tipo / condição de ocupação batem com **IBGE Censo 2022** | `IBGE_MISMATCH` | DET (definir fonte IBGE) |
| Socio (s6-7) | Dados do **mapa** batem com o **gráfico** correspondente | `MAP_CHART_MISMATCH` | IA/visual (ou DET se ambos extraídos) |
| Absorção (s8) | Fonte/elaboração + nota "desconsidera absorção de 2ª moradia" | `REQUIRED_NOTE` | DET (busca textual) |
| Absorção (s8) | Faixas de renda = as mesmas de "Domicílios por faixa de renda" (socio) | `CROSS_TABLE_MISMATCH` | DET+extração |
| Mercado (s9) | Total de oferta lançada = total de unidades por tipologia | `TOTALS_EQUALITY` | DET+extração |
| Mercado (s10) | Oferta lançada/atual batem com o total da **consolidada** (todas as análises) | `CROSS_TABLE_MISMATCH` | DET+extração |
| Lacunas (s11) | Fonte/elaboração + nota explicativa | `REQUIRED_NOTE` | DET |
| Lacunas (s11-12) | Excluir Gardens, Duplex, Coberturas (e esgotados no s12) | `EXCLUSION_RULE` | DET+extração |
| Lacunas (s12) | Oferta final igual nas 3 análises; regra específica de esgotadas variando entre as análises | `EXCLUSION_RULE` | DET (lógica) |
| Global | Ortografia (PT-BR) | `SPELLING` | IA |
| Ata | Cobertura: tudo que a ata pediu está no estudo (tópicos + análises extras) | `ATA_COVERAGE` | IA (extrai ata) + DET (casa com estrutura) |

> Tipos atuais no código (`src/features/corretor/store/analysis-store.ts`):
> `PERCENTAGE_SUM | CITY_NAME | RADII | SPELLING | COHERENCE`. O enum precisa crescer para os
> tipos acima. `RADII` (5/10/15 min) dá lugar ao conceito de **Z.I. primária / Z.I. total /
> múltiplas Z.I.s** da rubrica.

## Mudança de paradigma vs implementação atual

- **Hoje:** revisão **visual, slide-a-slide, isolada** (1 chamada de visão OpenAI por slide, sem
  memória entre slides). Ver `supabase/functions/analyze-slide/index.ts` (prompt hardcoded).
- **v2:** **auditoria do estudo inteiro** — várias regras comparam tabelas de slides diferentes
  e exigem visão de completude. Não cabe no modelo "1 slide por vez".

## Perguntas que destravam a arquitetura (antes de codar)

1. **Os PDFs de estudo têm camada de texto?** → define visão vs extração de texto.
2. **Os estudos seguem o template numerado da rubrica** (`2.4)`, `4.5)` etc.)? → se sim, detecção
   de seção vira match de strings (trivial e determinística).
3. **As atas de abertura têm formato padronizado?** → schema fixo (alta confiança) vs IA de
   extração para texto livre.
4. **Fórmula da projeção de 6 anos** — pegar com a analista (ela se ofereceu no slide 3).
5. **Fonte de dados IBGE** para o batimento automático (API/CSV do Censo 2022, por município).

## Próximos passos

- [ ] **Coletar amostras reais**: 3-5 PDFs de estudos vocacionais + 3-5 atas de abertura.
      (No repo não há nenhum — buscar em outra pasta/drive.)
- [ ] Responder as 5 perguntas acima com base nas amostras.
- [ ] Obter com a analista: fórmula da projeção de 6 anos e a fonte IBGE de referência.
- [ ] Só então: propor o schema de extração da ata + o desenho detalhado do motor de regras.

## 🔑 Achados das amostras reais (05/jul/2026) — decisivos

Chegaram 3 amostras (locais, **não versionadas** — ver `.gitignore`):

| Amostra | Formato | Tamanho | Slides/Págs |
|---|---|---|---|
| Estudo Parque Anhanguera e Jardim Atlântico | PDF | 22 MB | 178 págs |
| Teste IA Masterplan | PPTX | 261 MB | 333 slides |
| Vocacional+Quanti Construtora Regional GO (V3) | PPTX | 141 MB | 203 slides |

### Achado 1 — No PDF, as tabelas numéricas são IMAGEM
159/178 páginas têm texto, mas as **tabelas/gráficos de dados são renderizados como imagem**
(páginas de sociodemografia têm 0 dígitos como texto). Do PDF extraímos de forma confiável:
títulos, legendas `FONTE: … | ELABORAÇÃO: …`, notas e a **prosa descritiva** (que repete alguns
números). Os números tabulares, **não**. → No PDF, consistência numérica exigiria visão/OCR.

### Achado 2 — No PPTX, os números são DADOS ESTRUTURADOS (jackpot)
- **Masterplan:** 66 slides com **tabelas nativas** (`<a:tbl>`, 100 tabelas). Ex.: identificação
  do terreno como tabela real (endereço, lat/long, área).
- **GO:** **77 gráficos** com cache numérico (`<c:ser>/<c:cat>/<c:val>`). Ex.: faixas de renda
  `[0.82, 0.14, 0.04]` (fecham 100%).

**→ Decisão arquitetural: ingerir o PPTX, não o PDF.** No PPTX a família de consistência
numérica (somas, totais, cruzamentos, exclusões) volta a ser **100% determinística**. A IA cai
para quase zero (ortografia + leitura da ata + eventual mapa×gráfico visual). Isso responde a
Pergunta #1 de forma muito melhor do que "camada de texto do PDF".

### Achado 3 — A estrutura varia MUITO entre estudos
Nenhuma amostra usa a numeração da rubrica (`2.4)`, `4.5)`). Títulos são descritivos
("DADOS SOCIODEMOGRÁFICOS", "PROJEÇÃO DE DEMANDA VEGETATIVA"), a janela de projeção varia
(o estudo Anhanguera usa **2025–2030**, a rubrica cita 2027–2032 → a regra é "**6 anos de
span**", não anos fixos), e o escopo difere (Masterplan ≠ vocacional puro; GO é unificado
vocacional+quanti). → Detecção de seção deve ser **semântica/flexível por título**, nunca por
número fixo.

### POC rodando (`poc_extractor.py`) — já gera achados
Extrator determinístico (só stdlib) rodado sobre o estudo GO:
- **77 gráficos**: 54 séries fecham 100%; **7 candidatos a `PERCENTAGE_SUM`** (ex.: 60+25+20=
  **105%**; outro **106%**). Erros reais de soma, detectados **sem IA**.
- `SOURCE_MISSING`: heurístico ainda cru (marcou 49/49 = falso positivo; runs de texto
  fragmentam "FONTE"). Sintoma útil: a detecção de legenda de fonte precisa juntar runs por
  shape antes de buscar.

### Perguntas — status atualizado
1. ~~PDF tem texto?~~ → **Superada:** ingerir PPTX (dados estruturados). PDF vira fallback visual.
2. Template numerado? → **NÃO.** Detecção de seção por título/semântica.
3. Atas padronizadas? → **em aberto** (sem atas ainda; conseguir 2ª feira).
4. Fórmula da projeção de 6 anos → pegar com a analista.
5. Fonte IBGE para batimento → definir.

### Próximo marco
Com o par **ata ↔ estudo** (2ª feira), fechar o `ATA_COVERAGE`. Enquanto isso, o motor
determinístico sobre PPTX (tabelas + gráficos) já pode ser evoluído e testado nas amostras
atuais para levantar sintomas.

## Resultado do POC v2 (`poc_extractor.py`) nas amostras

Extrator determinístico (stdlib), com índice **gráfico→slide→título** e filtro de resposta
múltipla. Achados por estudo:

| Estudo | Slides | Tabelas nativas | Gráficos | `PERCENTAGE_SUM` (candidatos a bug) | `LEFTOVER_NOTE` |
|---|---|---|---|---|---|
| GO (Construtora Regional) | 203 | 7 | 77 | **9** (ex.: slide 143 «Tabelas de preço» = 112%; slide 130 = 106%) + 1 explicado por resposta múltipla | 4 (ex.: "Agrupar aqui nas 3 rendas", "Corrigir para cor") |
| Masterplan | 333 | 100 | 9 | 0 | 1 (falso positivo) |

Sintomas descobertos (guiam o design):
- **Resposta múltipla**: alguns gráficos passam de 100% de propósito (slide anotado
  "RESPOSTA MÚLTIPLA, TOTAL SUPERIOR A 100%") → a regra deve ignorá-los. Já implementado.
- **Notas de edição esquecidas** no deck entregue → nova regra `LEFTOVER_NOTE` (determinística,
  alto valor, nem estava na rubrica).
- **Fonte/elaboração** frequentemente está em **imagem**, não em texto (só 42/203 slides do GO
  têm "fonte" como texto) → checagem determinística tem alcance limitado aqui; validar com a
  analista se a exigência é textual.
- Detecção de **título de slide** precisa de heurística (o 1º run às vezes é um número-destaque).

## Plano de próximos passos (recomendado)

**Ordem: 1 → 2 → 3 → 4.** IA só entra depois do esqueleto determinístico calibrado.

1. **IR (Representação Intermediária)** — extrair cada estudo para um JSON normalizado
   (`slides[] → {n, titulo, secao_canonica, fontes[], notas[], tabelas[], graficos[]}`). É a
   fundação: as regras cruzadas da rubrica só existem sobre um IR (não dá para checar
   consistência entre slides lendo um XML por vez). **Próximo entregável concreto sugerido.**
2. **Segmentação canônica de seções** — dicionário de títulos/sinônimos → seção da rubrica
   (ex.: "DADOS SOCIODEMOGRÁFICOS"/"PERFIL SOCIODEMOGRÁFICO" → `SOCIO`). Habilita completude de
   estrutura e roteia cada regra ao slide certo. (Estudos NÃO usam a numeração da rubrica.)
3. **Catálogo de regras executável** — cada item da rubrica vira uma função pura sobre o IR:
   `{id, secao, entrada, motor: DET|IA, confiança, status}`. Começar pelas DET de alta
   confiança: `PERCENTAGE_SUM`, `ABSOLUTE_SUM`, `TOTALS_EQUALITY`, `LEFTOVER_NOTE`,
   `TEMPORAL_WINDOW`, `REQUIRED_NOTE`.
4. **Loop de calibração com a analista** — rodar nos 3 estudos → relatório por slide → analista
   marca bug real × falso positivo → ajustar tolerâncias e o mapa de seções. É o ciclo
   "gerar bugs e verificar sintomas".

### Dependências externas (buscar 2ª feira)
| Item | Destrava | Fonte |
|---|---|---|
| Par **ata ↔ estudo** do mesmo projeto | `ATA_COVERAGE` | cliente |
| **Fórmula da projeção de 6 anos** | `TEMPORAL_WINDOW` / `PROJECTION_FORMULA` | analista (se ofereceu) |
| **Fonte IBGE** (Censo 2022 por município) | `IBGE_MISMATCH` | definir API/CSV |

## Log de avanços

- **05/jul/2026** — Fase 4 iniciada (conceitual). Mapeados os 2 docs de contexto (rubrica +
  ata). Definida filosofia "mínimo de IA" e arquitetura em 3 camadas. Catálogo regra→erro→motor.
- **05/jul/2026** — 3 amostras recebidas (locais, gitignored). Achado decisivo: **ingerir PPTX,
  não PDF** (no PPTX os números são dados estruturados → consistência determinística).
- **05/jul/2026** — `poc_extractor.py` v1→v2: extrai tabelas/gráficos, mapeia anomalias a
  slide/título, filtra resposta múltipla, acha notas esquecidas. Rodado nos 2 PPTX com achados
  reais. **Parada combinada aqui**; retomar com material completo (ata + fórmula + IBGE).
