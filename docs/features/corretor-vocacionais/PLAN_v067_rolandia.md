# Plano técnico v0.67 — rodada de Rolândia: cobertura (recall) sem perder precisão (01/out/2026)

Para quem mantém o Corretor. Origem: análise `027020ec` de `Brain_Vocacional_Vertical_Housi_Av. Castro Alves_Rolandia - PR_v1`
(78 slides, 13 planilhas, regras v0.66, US$ 0,29), triada à mão slide a slide contra as imagens e as planilhas.

## 0. Diagnóstico

| | Quantidade |
|---|---|
| Cartões mostrados | 12 |
| Cartões úteis (erro real) | 9, cobrindo 6 problemas distintos |
| Falso positivo | 1 (s67 “//m²”) |
| Ruído | 2 (s9–s17 “não lidas” são mapas; s24 “sem conferência” fecha inteiro) |
| Erros reais NÃO mostrados | 15 (4 graves, 4 médios, 7 de formato/digitação) |

Precisão boa, recall ≈ 40%. Os erros que escaparam se agrupam em cinco lacunas de regra, e nenhuma é específica
de Rolândia:

1. **Comentário interno** em caixa de cor do tema (s1, s10, s38): o detector só reconhece caixa amarela com letra vermelha.
2. **Mesmo empreendimento com atributos diferentes** em slides diferentes (Boulevard 52 m²/R$ 5.120 × 54 m²/R$ 4.960).
3. **Plausibilidade física**: deslocamento impossível (“950 km | 3 min”), raios aninhados decrescentes (3 km < 2 km).
4. **Conferência dentro da linha** da tabela de empreendimentos (32 + 64 ≠ 100).
5. **Formato que a visão não vê** (“2.027”, “,00,00”, “,01” como limite superior) e **texto de SVG** nunca lido.

Mais dois defeitos de custo/ruído: mapas em BMP vão para a visão (≈ 40% dos tokens; os maiores derrubam a Edge
Function) e cartões repetidos para a mesma causa (s32+s33, s46+s47).

## 1. Etapas

Ordem por custo/benefício. Cada etapa: regra geral, onde mexe, teste sintético, critério de aceite.

### E1. Mapas em BMP fora da leitura (ruído + custo) — P0, ~1 h

- **Causa:** `table-images.ts:116` usa `BMP_MAX_KB = 40 MB` porque BMP não comprime. Depois de `bmpToPng`, mapas viram PNGs de 1–5 MB e passam; tabelas em BMP viram PNGs de 25–37 KB.
- **Mudança:** após a conversão, aplicar `MAX_KB` (500 KB) ao PNG resultante; acima disso, descartar sem relatar (é mapa/foto). Manter o filtro de pixels atual.
- **Teste:** `table-images` com BMP sintético de ruído (PNG grande) → descartado; BMP de tabela (PNG pequeno) → candidato.
- **Aceite:** Rolândia sem o cartão “5 imagens não lidas”; tokens da visão caem ≥ 30%; nenhuma tabela-imagem perdida nos 5 estudos (Toledo, CJ, SJC VAP, SJC v2, Rolândia).

### E2. Detector de comentário interno por texto — P0, ~2 h

- **Causa:** `pptx-to-ir.ts:38` `isReviewNoteShape` exige preenchimento amarelo + texto vermelho. As notas de Rolândia são retângulos com `accent1` do tema.
- **Mudança:** novo critério textual, independente da cor, em `pptx-to-ir.ts`: parágrafo de caixa de texto com **vocativo no início** (`^Nome,` — nome próprio seguido de vírgula) **e** marca de 1ª pessoa/conversa (`fiquei|fiz|eu |conforme falei|não sei|na dúvida|você`). Vai para `notas_revisao`, que já alimenta `reviewNotesFinding` e o portão de entrega.
- **Mensagem:** `wrongCityFindings`/`CITY_NAME` ignoram texto que já é nota de revisão (o s10 deixa de ser “vazamento de outro estudo” e passa a ser comentário interno).
- **Risco:** frase de relatório começando com nome + vírgula (“Rolândia, por sua vez, …”). Exigir as duas marcas e excluir nomes de cidade (`municipioOficial`).
- **Teste:** os três textos de Rolândia → nota; “Rolândia, por sua vez, apresenta…” → não é nota.
- **Aceite:** s1, s10 e s38 no item de comentários de revisão; 0 novos em Toledo, CJ e SJC (ou só notas reais, conferidas à mão).

### E3. Plausibilidade de deslocamento — P1, ~1 h

- **Regra:** em `ir-rules.ts`, reaproveitar `TRAVEL_PAIR` (v0.66): para cada par distância + tempo, velocidade implícita > 150 km/h ou < 1 km/h → “unidade de distância provavelmente errada” (`FORMAT_MISMATCH`, Provável), citando a velocidade (“950 km em 3 min = 19.000 km/h”).
- **Teste:** “950 km | 3 min” acusa; “1,4 km | 3 min”, “950 m | 3 min” e “12 km | 15 min” não.
- **Aceite:** s17 de Rolândia acusado; 0 novos nos outros 4 estudos.

### E4. Raios aninhados não decrescentes — P1, ~2 h

- **Regra:** para tabelas (nativas, imagem e planilha) com colunas de recorte `Até 1 km | Até 2 km | Até 3 km` (e cidade quando for a última camada), valores **absolutos** da mesma linha devem ser não decrescentes. Violação > 1% → Provável (“3 km tem 4.833 alugados, menos que os 4.924 de 2 km — raios contêm uns aos outros”).
- **Onde:** `audit/engine.ts` (nova checagem sobre `ExtractedTable` com `colKinds` count) e `source-crosscheck.ts` (mesma checagem na planilha, origem “planilha”).
- **Cuidado:** só raios **acumulados** (“Até N km”); recortes em anel (“de 1 a 2 km”) ficam fora. Percentuais ficam fora.
- **Teste:** linha 1.920 / 4.924 / 4.833 acusa; anel “1–2 km” não.
- **Aceite:** s34/planilha de condição de ocupação de Rolândia acusados; nenhum FP nos outros 4.

### E5. Consistência do mesmo empreendimento entre slides — P1, ~4 h

- **Regra:** em `cross-table.ts` (ou novo `v3/entity-consistency.ts`), coletar atributos por **nome de empreendimento** de três fontes: texto dos slides (“Boulevard / 52m² | R$ 5.120/m² | 87 uni”, fichas “Oferta Lançada: 192 / Oferta Final: 87”), tabelas-imagem de empreendimentos (colunas Empreendimento, m², R$/m², Oferta) e tabela por padrão. Mesmo nome + atributo com valores diferentes (tolerância de arredondamento da v0.60) → Provável, listando cada slide e valor.
- **Extra barato:** verificar se o valor cai na faixa certa das lacunas (R$ 5.120/m² não pertence a “Até R$ 5.000/m²”), usando `binFromLabel`.
- **Cuidado:** empreendimento com várias tipologias tem várias linhas; comparar por (nome, tipologia) quando houver tipologia, e a média só com média.
- **Teste:** Boulevard 52/5.120 em 3 slides × 54/4.960 em 2 → um achado com os 5 slides.
- **Aceite:** Boulevard de Rolândia acusado; revisar à mão os achados novos nos outros 4 estudos (meta: 0 FP).

### E6. Linha da tabela de empreendimentos — P2, ~2 h

- **Regras** sobre tabela-imagem com colunas `Oferta Lançada` e `Unidades por Tipologia`:
  - soma das unidades por tipologia do empreendimento (sub-linhas mescladas) = oferta lançada, salvo nota de exclusão no slide (aí Verificar, citando a nota);
  - `Disp. (%)` ≈ oferta atual / lançada;
  - `Preço / m²` ≈ `R$/m²` (tolerância 2%, por arredondamento da área).
- **Onde:** `audit/engine.ts`, reaproveitando `summableValues` para as células mescladas.
- **Aceite:** s40/s45 (96 × 100) como Verificar com a nota citada.

### E7. Texto dos SVGs — P2, ~2 h

- **Causa:** `table-images.ts` só aceita PNG/JPEG/BMP; SVG embutido (s8, s31, s61) não é lido, e o slide parece vazio.
- **Mudança:** em `pptx-to-ir.ts`, para imagens `.svg`, extrair `<text>`/`<tspan>` e anexar a `textos` do slide (marcado como origem SVG). Custo zero, sem visão.
- **Efeito:** o s31 passa a expor 5,2% (confirma o erro dos s32/s33 e entra no cruzamento com a planilha); “Churrasqueria” do s61 entra na revisão de texto.
- **Aceite:** IR de Rolândia com os textos do s31 e do s61; replay sem novos FPs.

### E8. Agrupar cartões da mesma causa — P2, ~2 h

- **Regra:** em `deck-reconcile.ts`, achados `SOURCE_CROSSCHECK` com mesmo (rótulo, valor do slide, valor da planilha) em slides diferentes viram um cartão com todos os slides.
- **Mensagem:** quando o mesmo valor divergente aparece em ≥ 2 slides (87 nos s43, s45, s46, s47, s55), acrescentar “o deck é consistente neste valor — a planilha pode estar desatualizada”.
- **Aceite:** Rolândia passa de 12 para 10 cartões sem perder informação.

### E9. Regras determinísticas de formato no texto e nos rótulos — P2, ~2 h

- **Regras** em `format-checks.ts`, aplicadas ao texto nativo, às células nativas e às células lidas:
  - ano com separador de milhar (`\b[12]\.\d{3}\b` em coluna/linha “Ano” ou sequência de anos);
  - decimal duplicado (`,\d{2},\d{2}`), espaço duplo dentro de valor (“R$  7.716”);
  - limite superior de faixa terminado em `,01` quando as outras terminam em `,00`;
  - precisão divergente na mesma coluna (“8,10%” com o resto em uma casa).
- **Limite conhecido:** nas imagens, a visão tende a normalizar (“,00,00” some). Para imagem, só vale o que a leitura transcrever.
- **Aceite:** s22/s23 (anos) e s36 (“,01”, “8,10%”) acusados como formato.

### E10. Revisão de texto com mais recall — P3, ~1 h + medição

- **Hoje:** 63 slides, 7,7 mil tokens de entrada, 87 de saída, 1 achado. Escaparam “são esperado” (s23) e “Prsidente” (s9).
- **Mudança:** testar `gpt-4o` no lugar de `gpt-4o-mini` só nesta etapa (< R$ 0,05 por estudo) e explicitar no prompt concordância verbal/nominal e nomes próprios digitados errado. A âncora de evidência (v0.61) segue descartando citação inexistente.
- **Aceite:** replay dos 5 estudos com contagem de achados de texto; FP de texto ≤ 1 por estudo.
- **Deploy:** exige publicar `analyze-text-batch`.

### E11. Falso positivo de símbolo duplicado — P3, ~1 h

- **Regra:** em `format-checks.ts` `visionFormatIssues`, símbolo duplicado (“//”, “%%”) só vira achado quando as duas leituras (escalada) concordam, ou quando a leitura é única e o rótulo irmão da mesma coluna não segue o mesmo padrão.
- **Aceite:** s67 de Rolândia some; casos reais de símbolo duplicado nos testes existentes continuam.

### E12. Seções sem conteúdo com nome — P3, ~1 h

- **Regra:** em `structure-checklist.ts`, sumários (“Conteúdo” com a lista 01–06) em slides consecutivos sem slide de conteúdo entre eles → “seção 04 (Avaliação da Consultoria) e 05 (Recomendação) sem conteúdo”. Slide final em branco → Verificar.
- **Aceite:** Rolândia mostra o nome das seções vazias no lugar de “1 ausente”.

### Fica de fora (anotado para depois)

- Densidade “15 hab./km²” (s25): plausibilidade de densidade dá FP fácil (área rural); só voltar com mais exemplos.
- Coluna “abaixo ou acima da média” do s45: precisa saber qual média a planilha usa.
- Título repetido para conteúdos diferentes (s31 e s34 “Domicílios por tipo”): baixo valor.

## 2. Validação (vale para todas as etapas)

1. Teste sintético por regra em `lib/v3/__tests__/rolandia-v067.test.ts`; suíte completa do Corretor verde.
2. Fixture de Rolândia: leituras da visão em cache → `fixtures/rolandia-vision-readings.json`, para replay sem custo como o do SJC.
3. Replay dos 5 estudos (Toledo, CJ, SJC VAP, SJC v2, Rolândia) com tabela antes × depois: achados, FP conferidos à mão, erros reais mantidos e contagem do “O que bateu”.
4. `tsc`, lint, `vite build`; commits por grupo (E1–E2, E3–E6, E7–E9, E10–E12); push; texto para o Lovable quando houver Edge Function (só E10).
5. Entrada v0.67 no `LIVE_regras_corretor_vocacionais.md`.

**Metas de saída em Rolândia:** ≥ 18 dos 21 problemas cobertos (hoje 6), 0 FP, sem o cartão de mapas não lidos, custo da visão ≤ US$ 0,20.
**Metas nos outros 4 estudos:** nenhum erro real anterior perdido e no máximo 1 FP novo por estudo.

## 3. Esforço e ordem

| Bloco | Etapas | Esforço | Deploy de Edge Function |
|---|---|---|---|
| A — ruído e notas | E1, E2 | ~3 h | não |
| B — regras de coerência | E3, E4, E5, E6 | ~9 h | não |
| C — leitura e formato | E7, E8, E9 | ~6 h | não |
| D — refinamentos | E10, E11, E12 | ~3 h + medição | sim (E10) |

Total ≈ 2,5 dias de trabalho; o bloco A sozinho já tira o ruído e pega os 3 comentários internos.

## 4. Para executar

Quando for executar, use o comando abaixo (pode trocar os blocos):

> Execute o `PLAN_v067_rolandia.md`, blocos A a D, nesta ordem. Antes de começar, gere a fixture de Rolândia.
> Depois de cada bloco, rode o replay dos 5 estudos e só siga se nenhum erro real anterior sumir. Registre o
> resultado na seção 5 deste arquivo e faça commit e push ao final de cada bloco. No fim, me passe a tabela
> antes × depois e o texto para o Lovable, se houver Edge Function.

## 5. Resultado da execução

Replay sem custo sobre as leituras em cache (`.tmp/v067/run.sh`, comparação em `.tmp/v067/diff.cjs`). Fixture de
Rolândia (leituras + fonte): `lib/v3/__tests__/fixtures/rolandia-replay.json`, lida com `CORRETOR_REPLAY_FIXTURE`.

**Ajuste prévio ao baseline:** o replay em Node não convertia BMP (`bmpToPng` depende de `OffscreenCanvas`), então
as tabelas em BMP de Rolândia e da SJC v2 ficavam fora da medição. Entrou `bmpToPngJs` (BMP 24/32 bits → PNG em JS
puro, com o deflate do fflate) como reserva quando não há canvas. O navegador continua usando o canvas. O baseline
abaixo já lê os BMPs; por isso a SJC v2 aparece com 10 achados em vez de 8.

### Bloco A (E1, E2)

| Estudo | Candidatas | Achados | Tabelas que fecham | Mudança |
|---|---|---|---|---|
| Toledo | 60 → 60 | 5 → 5 | 46/52 | — |
| CJ | 57 → 57 | 10 → 10 | 28/44 | — |
| SJC VAP | 93 → 93 | 6 → 6 | 57/67 | — |
| SJC v2 | 86 → 74 | 10 → 10 | 41/45 | 12 mapas em BMP fora da visão, sem perder tabela |
| Rolândia | 49 → 32 | 9 → 10 | 27/30 | 17 mapas fora; +comentários de revisão (s1, s10, s38) |

Nos PNGs convertidos, as tabelas em BMP ficam entre 12 e 34 KB e os mapas entre 1,1 e 5 MB, então o teto de 500 KB
separa os dois grupos com folga. Nenhum erro real anterior sumiu.

### Bloco B (E3–E6)

| Estudo | Achados | Mudança |
|---|---|---|
| Toledo | 5 → 5 | — |
| CJ | 10 → 10 | — |
| SJC VAP | 6 → 6 | — |
| SJC v2 | 10 → 10 | — |
| Rolândia | 10 → 14 | +s17 “950 km \| 3 min” (19.000 km/h); +s34 3 km com 4.833 alugados < 4.924 de 2 km; +Boulevard s55 × s52 (R$ 5.120/m² fora de “Até R$ 5.000/m²”); +planilha Dom.p Tipo: 3 km com 1.428 apartamentos < 1.524 de 2 km |

O último achado da tabela é um erro real que a triagem manual não tinha visto. Ele confirma o problema da
verticalização: 3 km (5,9%) abaixo de 2 km (9,1%) não tem como acontecer com raios acumulados.

**Ajustes feitos durante a validação:**

- **E3:** pares distância + tempo só valem dentro da mesma linha de texto. Quando as caixas eram juntadas, o “3 min” de
  uma caixa casava com o “12 km” da caixa seguinte.
- **E4:** a tabela só entra quando cada linha tem o mesmo número de valores e de colunas. No CJ s34, o cabeçalho
  agrupado (5 colunas para 11 valores) fazia aparecer “14 < 14”, e na SJC v2 s33 aparecia “5.150 < 164.641”.
- **E5:**
  - A âncora é o texto nativo (fichas e legendas de mapa). Das lacunas, só entra bloco com escopo igual ao das
    fichas: o total lançado precisa ficar entre 90% e 100% da soma das fichas. Isso tira as lacunas de segmento,
    como “Compactos” no SJC s81.
  - As faixas do bloco precisam somar a coluna Total, e a leitura precisa ser confiável (gpt-4o, sem releitura
    discordante; campo novo `reliable` no `ExtractedTableRef`). No SJC s77, o gpt-4o-mini deslocou uma coluna sem
    quebrar a soma: a imagem fecha certinho.
- **E6:** ficou restrita a tabelas nativas. A visão perde sub-linhas mescladas: o mini embaralhou o s45 de
  Rolândia, e até o gpt-4o leu 45 + 45 como 45 no Toledo s123. Por isso o 96 × 100 do s45 de Rolândia continua sem
  detecção, porque a tabela é imagem.

**Padrão visto em três estudos, sem regra por enquanto:** a coluna do raio maior da condição de ocupação traz
66,5% / 20,1% / 13,4% em Rolândia (3 km), no CJ (4 km) e na SJC v2 (6 km). Os números são idênticos em cidades
diferentes, o que aponta para uma fórmula fixa no modelo da planilha `02. SOCIODEMOGRAFIA`. Vale avisar a equipe
que mantém o modelo.
