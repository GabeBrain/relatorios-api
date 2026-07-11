# PLAN — Corretor v3: passo único, homepage nova, evidência visual e aposentadoria da v1

Aprovado por Gabriel em 2026-07-11. Este documento é **autossuficiente para implementação**
(escrito para uma sessão futura executar sem depender da conversa). Contexto de fundo:
`DESIGN_corretor_v3.md` (arquitetura), `LIVE_regras_corretor_vocacionais.md` v0.14–0.16
(estado atual), `custos_visao_reais.md` (economia).

> **STATUS (2026-07-11): TODAS AS FASES IMPLEMENTADAS** — build/typecheck/lint/testes limpos.
> Detalhe por fase em `LIVE_regras_corretor_vocacionais.md` v0.18. Pendências operacionais:
> aplicar migration `20260711100000_corretor_v3_evidencias.sql` (bucket). **Deixado p/ próxima
> rodada** (precisa do app rodando c/ Supabase real p/ validar): overlay bbox por célula na
> imagem (Fase 3, exige mudar a edge `analyze-table-image` + `schema_version` no `vision_cache`);
> deleção física dos arquivos-fonte da v1 (hoje só saíram do bundle, preservados no repo).

## Decisões desta rodada (Gabriel, 11/jul)

| Decisão | Escolha |
|---|---|
| Disparo da IA | **Auto-run total no upload** — botões "Aprofundar com IA" e "Números das tabelas" deixam de existir como ações; viram estágios internos do pipeline |
| Orçamento | **Teto por estudo: R$ 4,00** na fase de testes (constante configurável; subir depois). Estimativa > teto → pede confirmação; abaixo → roda direto. Botão "Pausar IA" sempre visível |
| Legado v1 | **Somente leitura** (cards + achados + thumbnails históricos). NÃO converter em estudos v3 retomáveis |
| Motores v1 | Aposentar: página de análise slide-a-slide, pdfjs, edge `analyze-slide`. Rota `/auditoria` → redirect `/corretor` |
| Evidência visual | Imagem real da tabela, **grande** (não thumbnail), com destaque gráfico da região do erro + cartão-prova ao lado (híbrido) |
| Arquivos de teste | Criar **gerador de estudo sintético** com gabarito (ver Fase 5) para testar barato |

## Números de referência (estudo 100 slides / 84 tabelas-imagem, gpt-4o-mini, R$ 5,16/US$)

- Triagem DET: R$ 0, segundos (gargalo é memória do browser: `unzipSync` ~2-3× o tamanho do .pptx).
- IA texto: ~R$ 0,03 (~7 batches, ~20 s).
- IA visão 1ª vez: ~R$ 1,80 real (~25k tokens/imagem no mini); reanálises ~R$ 0 (vision_cache).
- Total 1ª passada ~R$ 1,85 → **cabe no teto de R$ 4 com folga**.
- Storage de evidências: ~3-13 MB/estudo → centavos/ano no Supabase. Irrelevante.

---

## Fase 0 — Fix do estimador de visão (BUG, fazer primeiro)

`calculateImageTokens` em `src/features/corretor/lib/cost-calculator.ts` usa a fórmula do
gpt-4o (85 base + 170/tile) para **todos** os modelos. O gpt-4o-mini tem multiplicador de
imagem próprio: **~2.833 tokens base + ~5.667 por tile de 512px**. Resultado: o painel
estima ~R$ 0,26 para 84 tabelas, mas o billing real é ~R$ 1,80 (**subestima ~7×**). O custo
cobrado está certo (vem do `usage` da OpenAI); a estimativa prévia é que mente.

**Implementar:**
1. `calculateImageTokens(widthPx, heightPx, detail, model)` — nova assinatura com `model: ModelId`;
   quando `gpt-4o-mini`, aplicar base 2833 + 5667/tile; senão manter 85 + 170/tile.
2. Atualizar chamadores: `estimateVisionPass` em `lib/v3/ia-vision.ts:43` (passar o model) e
   `estimateProjectCost` (v1, vai ser aposentada — atualizar só se ainda compilar).
3. Validar: estimativa para 84 imagens ~1400×450 no mini deve dar ~US$ 0,32-0,40 (~R$ 1,7-2,1).

## Fase 1 — Pipeline de passo único (upload → tudo analisado)

Refatorar o fluxo do `CorretorV3Page.tsx` (hoje: upload → triagem → usuário clica painéis de IA)
para **orquestrador automático**. Sugestão: extrair `lib/v3/pipeline.ts` com uma função
`runFullAnalysis(file, opts, callbacks)` que a página consome.

**Sequência no upload (novo estudo E reconferir — mesmo caminho):**

```
1. PPTX → IR (cliente)                          → achados DET renderizam imediatamente
2. findTableImages + estimateTextPass + estimateVisionPass
   → custo total estimado da rodada (banner)
3. Se estimativa ≤ teto: dispara em paralelo, sem perguntar:
   a) runTextPass (batches como hoje)
   b) runVisionPass PARALELIZADO (ver abaixo)
   c) upload das imagens-evidência (Fase 3)
   Se estimativa > teto: modal de confirmação com o valor.
4. Achados de IA pingam na worklist conforme chegam (selo por origem).
```

**Regras:**
- **Teto**: `const BUDGET_STUDY_BRL = 4` + `const FX_BRL_PER_USD = 5.16` (constantes num
  módulo de config do corretor, ex. `lib/v3/config.ts`). Comparação: custo estimado da
  rodada em USD × FX vs teto. Exibir sempre em R$ para o analista.
- **Pausar IA**: botão no banner de progresso; aborta os passes pendentes (as chamadas já
  feitas ficam no cache — nada se perde). Retomar = re-disparar (cache pula o já feito).
- **Banner de custo vivo**: "Análise completa · ~R$ 1,90 estimado · R$ 1,42 gasto · 61/84
  tabelas · [Pausar]". Some quando termina; custo consolidado no card do estudo.
- **Paralelizar a visão**: `runVisionPass` hoje é `for` sequencial (~8-14 min p/ 84 imagens).
  Mudar para pool de **5 concorrentes** (`Promise` pool simples; cuidado: manter upsert no
  vision_cache por imagem e agregação thread-safe dos contadores). Meta: ~2-3 min.
- **Reconferir**: mesmo pipeline; DET diff grátis como hoje (`recheck`), IA texto re-roda só
  slides cujo texto mudou (comparar hash do texto do slide entre versões), visão só imagens
  fora do cache. O caso comum de 2ª rodada deve custar centavos.
- Registrar cada passe em `ia_passes` como hoje (`registerIaPass`).

## Fase 2 — Homepage nova do Corretor (`/corretor`)

Substituir a landing atual por:

```
┌─────────────────────────────────────────────────────┐
│  Corretor de Estudos            [dropzone herói]    │
│  "Arraste o .pptx — análise completa automática"    │
├─────────────────────────────────────────────────────┤
│  EM CORREÇÃO        │ PRONTOS P/ A&R │ LEGADO v1    │
│  cards: pendentes,  │ cards: selo,   │ cards 🗄     │
│  progresso→0, custo │ data, custo    │ read-only    │
└─────────────────────────────────────────────────────┘
```

- **Dropzone é a ação principal da página** (subir arquivo abre direto o workspace com o
  pipeline da Fase 1 rodando).
- Cards de estudo: nome, cidade, versão atual, pendentes/total, custo acumulado (R$),
  barra de progresso rumo a zero. Clique → workspace ("← voltar" como hoje).
- Seção **Legado v1** colapsada por padrão (ver Fase 4).

## Fase 3 — Evidência visual (imagem grande + destaque + prova)

Hoje nenhuma imagem é persistida no v3 (o `vision_cache` guarda só JSON). Implementar:

1. **Storage**: bucket `corretor-evidencias` (novo). Durante o passe de visão, para cada
   imagem que **gerou achado**, subir os bytes (`c.bytes` já está em memória em
   `runVisionPass`) como `<sha1>.<ext>`. Dedup natural por sha1 (não re-subir se existir).
   Guardar o path no `payload.viz` do achado (campo novo, ex. `evidenceImage: string`).
2. **UI do achado numérico (híbrido)**: no `FindingCard` (ou componente novo
   `EvidenceImageCard`), duas colunas:
   - Esquerda: **imagem original da tabela em tamanho generoso** (largura total do card,
     lightbox no clique), com **overlay de destaque** na linha/coluna problemática.
   - Direita: cartão-prova como hoje (soma calculada × declarada, células marcadas).
   Racional registrado: imagem = *onde no material dele*; prova = *por quê está errado*.
   Nenhum dos dois sozinho fecha o loop.
3. **Overlay/bbox**: pedir à edge `analyze-table-image` que devolva, junto das tabelas,
   as **coordenadas aproximadas** (fração da imagem, 0-1) de cada linha e coluna
   (`rowBounds: [{y0,y1}]`, `colBounds: [{x0,x1}]`). Sobrepor `<div>` absoluto
   semi-transparente vermelho na região da linha/coluna que falhou a soma. Custo extra de
   output: ~100-200 tokens/imagem (aceitável). **Invalida o cache antigo**: mudar o formato
   do payload → adotar `schema_version` no `vision_cache` e reprocessar na demanda quando
   a versão do payload for antiga (só as imagens exibidas precisam).
   - Fallback: se a visão não devolver bounds confiáveis, mostrar a imagem sem overlay
     (nunca bloquear a evidência por falta de bbox).
4. **Achados de texto**: NÃO fazer bbox de pixel (decisão mantida: sem renderização de
   slide). Continuar destacando o trecho no texto do IR.
5. **Poda**: ao concluir o estudo (`concludeStudy`), manter as evidências (são o histórico);
   ao **deletar** o estudo, remover os objetos órfãos do bucket (checar se outro estudo
   referencia o mesmo sha1 antes).

## Fase 4 — Legado v1 (leitura) e aposentadoria dos motores

**Dados v1** (ver `lib/archive-db.ts`): tabelas `projects`, `slides`, `slide_errors` +
bucket `slide-thumbnails`.

1. **Leitura**: seção "Legado v1" na homepage lista os `projects` antigos. Clique → view
   somente-leitura (nome, data, custo, achados por slide com thumbnails que existirem).
   Reusar o mínimo possível do código v1 — ideal: um componente novo enxuto
   (`LegacyV1View.tsx`) que só lê `archive-db`.
2. **Aposentar**: remover rotas/páginas `CorretorPage`/`CorretorAnalysisPage` (análise
   slide-a-slide), `openai-analyzer.ts`, dependência pdfjs (checar se mais alguém usa antes
   de remover do package.json), edge `analyze-slide` (deixar deployada mas remover do
   código? NÃO — remover do repo e desdeployar; o legado é leitura pura, não re-analisa).
3. **Redirect**: `/auditoria` e sub-rotas → `/corretor` (Navigate do react-router).
   Item "Auditoria (v1)" sai do menu (`AppLayout`).
4. Código v1 preservado no histórico do git (não precisa de pasta `legacy/`).

## Fase 5 — Gerador de estudos de teste (pedido do Gabriel)

**Problema**: os PPTX reais têm 35-270 MB e custam ~R$ 2/análise. Para iterar barato,
gerar estudos sintéticos pequenos (~15 slides, < 5 MB, ~8 tabelas-imagem ≈ R$ 0,20/rodada)
com **erros injetados conhecidos** + **gabarito exportado** → mede recall/FP automaticamente.

**Entregável**: `docs/features/corretor-vocacionais/gera_estudo_teste.py`
(python-pptx + Pillow). Uso: `python gera_estudo_teste.py --cidade Itajai --out teste_v1.pptx`.
Emite também `teste_v1.gabarito.json` (lista `{slide, type, detail}` de cada erro injetado).

**Restrições DURAS do gerador** (senão o motor não enxerga — tudo verificado no código atual):

| Alvo | Restrição (fonte no código) |
|---|---|
| Seções reconhecidas | Títulos dos slides devem casar com os regexes `SECOES` de `pptx-to-ir.ts:53` — ex.: "Estudo Vocacional — {Cidade}" (CAPA), "Identificação do Terreno e Zona de Influência", "Perfil Sociodemográfico — Faixas de Renda" (SOCIO), "Mercado — Oferta Lançada", "Absorção", "Lacunas de Mercado", "Entorno — Mapeamento Físico", "Conclusão e Recomendações" |
| Tabela-imagem detectável | PNG/JPEG **15-500 KB**, largura **≥ 700 px**, altura **200-1300 px**, aspecto **≥ 1,2**, colocada em slide de seção **SOCIO/MERCADO/LACUNAS/ABSORCAO** (`table-images.ts:9-15`) |
| LEFTOVER_NOTE | Texto que case `NOTA_RX`/`LEFTOVER` (`pptx-to-ir.ts:49-51`) — conferir no código COMO `notas_edicao` é populado antes de escolher onde injetar (caixa de texto vs notas do slide) |
| RADII | Legendas "Até 10 min / Até 20 min / Até 30 min" em ≥ 2 slides de mapa; 1 slide com "15 min" a mais → dispara `radii-<n>` (`ir-rules.ts:120-184`) |
| ABSOLUTE_SUM (DET) | 1 tabela **nativa** do PPT com linha "Total" que não fecha (`ir-rules.ts:86-118`) |
| ABSOLUTE_SUM (visão) | 1 tabela-imagem com uma célula adulterada (soma quebra); renderizar dígitos legíveis (fonte ≥ 14px na imagem) |
| BINNING_RULE (visão) | 1 tabela-imagem com faixas de renda no cabeçalho pulando um intervalo (ex.: "9001-9500" → "10001-10500") |
| SPELLING (IA) | 2-3 erros ortográficos em texto corrido (ex.: "empreedimento", "demandda") |
| CITY_NAME (IA) | 1 menção a cidade errada (ex.: "Florianópolis" num estudo de Itajaí) |
| COHERENCE (IA) | 1 texto que contradiz a própria tabela do slide (ex.: prosa diz "35%" e tabela mostra 53%) |
| Controles negativos | ≥ 2 tabelas-imagem CORRETAS e ≥ 3 slides limpos → medir falso positivo |
| STRUCTURE_MISSING | Flag `--sem-secao entorno` gera variante sem uma seção canônica |

**Crosscheck**: adaptar `crosscheck_piloto.py` (já existe) para comparar achados exportados
do app vs `*.gabarito.json` → imprime recall por tipo + FP. Rodar a cada fase como teste
de regressão do pipeline inteiro.

## Ordem de execução e critérios de aceite

Ordem: **0 → 5 → 1 → 2 → 3 → 4** (o gerador cedo (5) barateia o teste de todas as demais).

| Fase | Aceite |
|---|---|
| 0 | Estimativa do painel ≈ custo real do `usage` (±20%) num passe de visão real |
| 5 | `gera_estudo_teste.py` produz .pptx < 5 MB; triagem DET acha os erros DET injetados; crosscheck imprime recall/FP |
| 1 | Upload → worklist completa (DET+texto+visão) **sem nenhum clique**; visão 84 img em < 4 min; teto R$ 4 respeitado (modal só acima); Pausar funciona; reconferir do mesmo arquivo custa < R$ 0,10 |
| 2 | Homepage: dropzone herói + 3 seções; estudo novo criado pelo drop |
| 3 | Achado numérico mostra imagem original grande com destaque + cartão-prova; imagem persiste no bucket; cache com `schema_version` |
| 4 | `/auditoria` redireciona; projetos v1 legíveis na seção Legado; motores v1 removidos do bundle; build/typecheck/lint limpos |

**Ao final de cada fase**: atualizar `LIVE_regras_corretor_vocacionais.md` (nova versão no
topo) e, se tocar navegação/plataforma, `docs/projetos/LIVE_rebrain.md` — antes do push
(regra do CLAUDE.md).
