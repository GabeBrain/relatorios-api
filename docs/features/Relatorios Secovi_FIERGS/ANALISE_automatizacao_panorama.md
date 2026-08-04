# Panorama Imobiliário (Secovi/FIERGS) — Análise de Automatização

**Data:** 2026-07-26 · **Material analisado:** `Panorama_Secovi_SP_Piracicaba_1T26_vApres_28MAI_13h50.pptx` (62 slides),
`Inventario_Slides_Panorama_Piracicaba_1T26.xlsx`, `PPT Institucional_2026 - Widescreen_NOVO (1).pptx`.
**Objetivo:** subsidiar o plano de ação de automatização a discutir com o head da área.

## 1. Anatomia do deck (o que descobrimos abrindo o arquivo)

| Bloco | Slides | Natureza técnica |
|---|---|---|
| Institucional/estático (capas, Secovi, objetivos, equipe, encerramento) | 1–11, 20, 28, 30, 47, 50, 52, 55, 57–62 (~24) | Fixo — só muda cidade/trimestre na capa |
| Gráficos/tabelas **nativos** do PowerPoint | 14–19, 23–26, 40 (11) | Editáveis; dados embutidos no pptx (séries Vertical/Cond. de Casas, Econômico/Demais, trimestres 1T22→1T26) |
| Tabelas/gráficos **colados como imagem** (prints de Excel) | 12–13, 21–22, 27, 29, 31–39, 41–46, 48–49, 51, 56 (~25) | **Não estruturados** — atualização hoje = refazer no Excel e re-colar print |
| Textos analíticos com números embutidos | 31, 33–36, 38, 48–49, 53–54 | Frases derivadas dos dados ("73,0% do total (1.088 unidades) são de 2 quartos…") |

**Constatação central:** ~40% do conteúdo quantitativo do deck vive como *imagem*, não como dado.
Esse é o maior custo de atualização hoje e o maior obstáculo para automação plena — mas também o maior ganho potencial.

## 2. Cobertura pela API GeoBrain

### Coberto diretamente (endpoints `temporal-analysis-city/*`, por cidade/UF, trimestre, `group_by` Padrão|Tipologia, filtro Vertical/Horizontal)

- Unidades lançadas por trimestre/ano e por padrão → `releases` (slides 16–17)
- Vendas líquidas + **VGV vendido** por trimestre/padrão → `sales` (`vgv_liquid_sales`) (slides 23–26)
- Estoque/oferta final + VGV do estoque → `stock` (`vgv_stock`) (slides 31–32, 51)
- Preço médio por m² por período → `medium-prices-meter` (slide 40); ticket médio → `medium-prices`
- IVV por período → `ivv` (slide 27, com ressalva do recorte — ver gaps)

### Derivável de `building-with-history` (base granular por empreendimento, com tipologias, preços, datas e lat/long)

- Contagem de **empreendimentos** lançados por trimestre (slides 14–15) — via `release_date`
- Oferta lançada × final por ano de lançamento, padrão e tipologia (slides 33–35, 41–42, 48)
- Ticket, área e R$/m² por tipologia e por padrão (slides 36–39, 49)
- Tempo médio da oferta (slides 43–46) — idade do estoque via `release_date`
- Mapa de localização dos empreendimentos (slide 56) — lat/long já usados no Dashboard GeoBrain
- Textos analíticos determinísticos (53–54) — todos os números citados saem dos agregados acima

### Gaps e pontos de metodologia (levar para o head)

1. **VGV lançado** (slides 18–19): `releases` não retorna VGV. Estimável por `building-with-history`
   (unidades × preço de tipologia no lançamento) — **metodologia a validar com os analistas**.
2. **% MCMV** (slides 15, 17, 19, 25–26): não existe flag MCMV na API. Proxy possível
   (padrão Econômico e/ou teto de preço) — **precisa do critério oficial do analista**.
3. **IVV/oferta por faixa de área útil** (slide 27): `group_by` só aceita Padrão|Tipologia (dorms);
   recorte por m² teria de ser calculado por nós a partir da base granular.
4. **Ajustes retroativos** ("entrou empreendimento retroativo no 3T24", slide 14): a base muda o
   passado; qualquer automação precisa recalcular a série inteira a cada edição, e a nota de rodapé é
   conhecimento humano — fica como campo editável.
5. **Profundidade histórica**: o deck começa em 1T/22 (dado pontual 4T/21) — confirmar que o token
   Secovi cobre esse histórico nas cidades-alvo.
6. **Risco já conhecido**: no caso dos apontamentos da Juliana mapeamos divergências entre números da
   API e números do analista. Antes de automatizar, **reproduzir Piracicaba 1T26 inteiro via API e
   comparar número a número** com este deck (teste de aderência).

**Veredito de cobertura:** essencialmente **todo o conteúdo quantitativo é obtível pela API**
(direto ou derivado), com 2 lacunas de metodologia (VGV lançado, MCMV) e nenhuma dependência
obrigatória de exportação manual de outras plataformas identificada até aqui.

## 3. Camadas de automatização (incremental — cada uma já entrega valor)

- **Camada 1 — "Dados prontos" (ganho rápido, baixo risco):** tela no Rebrain (mesmo padrão
  GeoApiScopeEngine dos Relatórios Secovi) em que o analista escolhe cidade + trimestre e baixa um
  **XLSX espelhando as tabelas do Panorama** (uma aba por bloco de slides). O trabalho manual cai de
  "consultar, montar e conferir" para "colar no modelo". Reuso direto de `TestesArquitetura.tsx`
  (fluxo `building-with-history` + `exportXLSX` já existem).
- **Camada 2 — Visualização web:** replicar os gráficos-chave na própria tela (linhas por trimestre,
  padrão, preços) para QA visual antes de exportar — e de quebra vira produto navegável.
- **Camada 3 — Geração do PPTX:** gerar o deck a partir do template institucional, preenchendo
  gráficos nativos, tabelas e textos-template (pptxgenjs no browser ou python-pptx server-side).
  Pré-requisito one-off: **reconstruir os ~25 slides-imagem como objetos nativos** no template.
  Depois disso, atualização trimestral vira botão + revisão humana.
- **Camada 4 — Textos analíticos:** frases determinísticas geradas dos agregados (números sempre
  batem) + observações qualitativas assistidas por LLM, com revisão do analista.

## 4. Proposta de plano de ação (sugestão para a conversa)

1. **Teste de aderência (1º passo, sem UI):** script que consulta a API para Piracicaba e confronta
   com os números deste deck. Sai uma matriz "bate / não bate / não tem" — decide tudo o que vem depois.
2. **Fechar metodologia** de VGV lançado e MCMV com os analistas.
3. **Entregar Camada 1** (tela + XLSX) como primeiro release.
4. **Decidir ambição** das Camadas 2–3 conforme resultado do teste e apetite do head
   (o custo relevante da Camada 3 é a reconstrução única do template, não o código).

## Fragilidades a deixar explícitas

- Números publicados mudam retroativamente na base — automação precisa reprocessar séries completas.
- Sem validação numérica prévia (item 4.1), automatizar pode industrializar divergências.
- Slides-imagem: sem a reconstrução do template, a automação para na Camada 1–2.
- Notas de contexto do analista (retroativos, eventos locais) permanecem manuais por design.
