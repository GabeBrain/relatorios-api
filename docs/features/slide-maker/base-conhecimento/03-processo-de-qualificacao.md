# 03 — Processo de qualificação (pipeline)

Pipeline que o Claude Code executa ao receber `jobs/<nome>/` com `entrada/` (deck prévio, publicação ou dados + anexos) e `briefing.yaml`.

```
[0 Intake] → [1 Inventário] → [1b Atualização e localização] → [2 Diagnóstico] → [3 Narrativa] ══GATE══
          → [4 Produção] → [5 QA loop] → [6 Complementares] → [7 Entrega]
```

**Princípio central:** perguntar **uma vez** (etapa 0, tudo junto) e pedir aprovação **uma vez** (gate da etapa 3). Todo o resto é decidido pelas regras desta base e registrado no relatório.

---

## Etapa 0 — Intake

1. Ler `briefing.yaml` (doc 04) e os anexos (para inferir o que for possível: tema, data da publicação, parceiros, imagens).
2. Validar campos **críticos**: `modo`, `responsavel`, `evento_nome_oficial`, `cidade`, `data`, `palestrante`, `publico`, `tempo_fala_min`, `identidade`, `objetivo`, `pode_pesquisar`.
3. Se faltar algo → **uma única rodada** com as perguntas do doc 04 §2 que ainda estiverem em aberto (máx. 4 blocos), cada uma com opção recomendada.
4. Defaults (aplicados com `auto_aprovar: true` ou sem resposta — sempre registrados no relatório):
   - `modo`: `evento-de-estudo` se a entrada principal é uma publicação Brain; `evento` se é dado bruto.
   - `identidade`: `material-fonte` se a publicação tem linguagem visual própria; senão `brain`.
   - `pode_pesquisar`: **true** quando a fonte tem mais de 6 meses em relação à data do evento.
   - `n_blocos`: 3–4 (≤ 10 min) · 4–5 (15–20 min) · 6–7 (≥ 30 min).
   - `uso_do_deck`: `palco`.
   - Nunca usar o nome do local como nome do evento: se não houver o nome oficial, perguntar.
   - `responsavel`: sempre perguntar se estiver vazio. É a pergunta 1 do doc 04 §2 e define o slide final.

## Etapa 1 — Inventário

- Deck prévio: `extract_pptx.py` → `trabalho/inventario.json` + thumbnails.
- Publicação (PDF): texto por página, mapa de capítulos, **números com página de origem**, citações literais com atribuição, imagens e ilustrações extraíveis (`extract_pdf_assets.py`) → `trabalho/inventario.json` + `trabalho/assets/`.
- Planilhas: indicadores calculados com o script salvo em `trabalho/`.
- Registrar em `trabalho/fontes.json` cada dado: valor, período, fonte, página. **Nenhum número entra no deck sem estar aqui.**

## Etapa 1b — Atualização e localização (novo)

Executar quando `pode_pesquisar: true`. Resultado em `trabalho/atualizacao.md` e `fontes.json` (origem `pesquisa:` + URL + data de acesso).

1. **O que mudou desde a publicação?** Para cada tema-chave do estudo (leis, programas, resultados, mercado), buscar fatos posteriores à `data_publicacao_fonte`. Ex. retrofit: novos programas municipais, resultados do Requalifica/Reviver, adesão à subvenção.
2. **Localização:** 2–3 fatos da cidade/estado do evento (lei, programa, número local, case local).
3. **Contexto "por que agora":** 1–3 dados de contexto amplo (internacional, sustentabilidade, tendência) com fonte primária ou institucional.
4. **Dados internos da pasta** que conversem com o tema (ex.: Censo de domicílios vagos) — conferir consistência com números públicos citados.
5. Slides com dado atualizado recebem a etiqueta "atualizado <ano>".
6. Dado da publicação que pode estar defasado e **não** foi atualizado → nota `[PENDENTE]` nas notas do orador + relatório (nunca no slide).

## Etapa 2 — Diagnóstico

`trabalho/diagnostico.md`:
- **Tese atual** e tese proposta em 1 frase.
- **Mapa de conteúdo**: para cada slide/capítulo → `manter | reescrever | fundir | apêndice | cortar` + motivo.
- **Problemas**: título descritivo, número sem comparativo, gráfico sem fonte, excesso de texto, dado defasado, violações de marca.
- **Lacunas**: dados que a narrativa pede e não existem → relatório.
- **Ativos visuais** disponíveis (ilustrações, fotos de cases, logos) e onde usar.

## Etapa 3 — Narrativa (GATE)

`trabalho/narrativa.md`:

```
TESE: <1 frase>
EVENTO: ADIT Cidades 2026 · Florianópolis · nov/2026 · Fábio Tadeu Araújo
TEMPO: [a confirmar] · SLIDES: 41 · PÚBLICO: misto · IDENTIDADE: material-fonte

[Abertura] capa · metodologia do estudo (+QR) · roteiro dos blocos
[Bloco 1 · Por que agora] 4. <título-afirmação> — visual — fonte (atualizado 2026?) — 1 min
...
[Síntese] condições numeradas · frase-manifesto · SLIDE FINAL DO RESPONSÁVEL (imagem de marca/slides-finais/)
APÊNDICE / CORTADO: ...
```

Estrutura recomendada para `evento-de-estudo` (calibrada no caso ADIT):
1. Capa → 2. Como o estudo foi feito (+capa do material e QR) → 3. Roteiro dos blocos
4. **Por que agora** (contexto Brasil + mundo + sustentabilidade)
5. **Conceito** (o que é / não é; linha do tempo; finalidades; quando faz sentido)
6. **Benchmarks** (internacional com foto + deep-dive com "Lição"; nacional)
7. **Regulação / ambiente** (caixa de ferramentas; tabela por cidade **atualizada**; leitura BRAIN)
8. **Mercado** (números do estudo)
9. **A voz de quem faz** (quanti + especialistas + quali com mitos e tensões)
10. **Síntese BRAIN** (condições numeradas) → slide final do consultor responsável

Heurísticas de tamanho **[calibrar]**: ~1 slide/min de fala, divisores contam ~15 s; palco de 15 min ≈ 14–16; 30 min ≈ 25–28; 40 min ≈ 38–42 (**não verificado:** estimado supondo que o deck ADIT Cidades, de 41 slides, tinha ~40 min de fala; confirmar o tempo real). Referências: ADEMI HIS 15; INC Campinas 21; GRI Immersion 27; ADIT Cidades 41 (tempo de fala a confirmar); Lotesphere 45.

**Gate:** parar e apresentar `narrativa.md` + diagnóstico em 5 linhas + lista do que foi atualizado na 1b. Com `auto_aprovar: true`, seguir direto (e dizer isso na entrega).

## Etapa 4 — Produção

| Situação | Técnica |
|---|---|
| `brain` | PptxGenJS sobre layouts Brain (capa, divisor, conteúdo, fechamento) |
| `material-fonte` | PptxGenJS com layouts derivados da publicação (`trabalho/identidade.md`), ilustrações extraídas, etiquetas e marca-texto |
| `cliente-preservado` | Edição de XML do PPTX original |
| Gráficos | Nativos e editáveis; fotos com crédito |

Regras: layouts com espaços reservados (editáveis); seções por bloco; objetos nomeados; notas do orador em todos os slides; todo dado com rodapé de fonte.

Marca (doc 02):
- Logo do layout de conteúdo = **sem tagline**, versão positiva ou negativa conforme o fundo. Com tagline só em capa e fechamento institucional, em tamanho grande (≥ 2″ de largura).
- Recortar `Logo-Brain.png`, que tem canvas quadrado com margem, antes de inserir.
- Paleta do manual (§3), no máximo 2 tons por layout. Neo Sans caixa alta só no título principal.
- Último slide = imagem do slide final do `responsavel`, em tela cheia (e dos coapresentadores, na ordem de fala).

## Etapa 5 — QA em loop

1. Render → thumbnails. 2. `lint_pptx.py` (doc 05 §1). 3. Revisor (doc 05 §2) sem histórico. 4. Corrigir até zero 🔒 e notas ≥ 4 — máx. 3 ciclos.

## Etapa 6 — Complementares

`roteiro.md` (tempo acumulado, frase de transição, ponte para a sessão seguinte), notas do orador, slides avulsos, versão sem valores, versão resumo.

## Etapa 7 — Entrega

`saida/` + `relatorio.md`: antes → depois; decisões automáticas; **o que foi atualizado e com qual fonte**; orientação ao analista (pendências `[PENDENTE]`, dados a conferir); resultado do QA.

---

## Variações por modo

| Modo | Etapas alteradas |
|---|---|
| `evento` | Completo; roteiro obrigatório |
| `evento-de-estudo` | 1b obrigatória se fonte > 6 meses; slide de metodologia + QR; identidade `material-fonte` por padrão; estrutura recomendada da etapa 3 |
| `abertura` | 3–4 blocos; preparar as perguntas do painel |
| `moderacao` | Pula 4; entrega principal é `moderacao.md` |
| `resumo-brain` | Meta de slides agressiva |
| `cliente-preservado` | Edição XML; marca do cliente |
| `reaproveitamento` | 1b obrigatória; reposicionar títulos para o novo público |
| `consolidacao` | Narrativa = parecer |
| `proposta` | Contexto → objetivos → metodologia → entregáveis → cronograma → investimento |
| `externo` | Paleta do briefing; regras de clareza mantidas |
