# Resumo v0.67 — rodada de Rolândia (01/out/2026)

Plano de origem: [PLAN_v067_rolandia.md](./PLAN_v067_rolandia.md). Medição: replay sem custo de IA em 5 estudos (Toledo, CJ,
SJC VAP, SJC v2, Rolândia). Só avança se nenhum erro real anterior sumir; todo achado novo é conferido na imagem.

| Bloco | Estado | Commit |
|---|---|---|
| A (E1, E2) | feito e publicado | 44c9242 |
| B (E3–E6) | feito e publicado | df75819 |
| C (E7–E9) | validado localmente nos cinco estudos; sem push | — |
| D (E10–E12) | código e testes locais concluídos; deploy E10 e validação no site pendentes | — |

**Atualização de execução (01/out/2026):** suíte focada 45/45 e build passaram. Replays finais: Toledo 5 achados (46/52 tabelas), CJ 10 (28/44), SJC VAP 7 (57/67), SJC v2 8 (41/45) e Rolândia 11 (27/30). E10 usa `gpt-4o` no passe textual, mas não foi publicado: o conector Supabase negou permissão. E11 removeu o FP `//` no replay Rolândia; E12 detecta slide final a conferir e 3 seções sem conteúdo. A validação visual das seções e a medição real de texto ainda exigem site/deploy. Nenhum push foi feito. Consulte o registro técnico e handoff na seção “Registro de execução” do plano.

## Feito

- **Replay fiel:**
  - `bmpToPngJs` (`pptx-media.ts`) converte BMP para PNG sem canvas. Antes, o Node descartava todas as tabelas em BMP
    e a medição não refletia o site.
  - O replay lê e grava a fixture (`CORRETOR_REPLAY_FIXTURE` / `_SAVE`); a de Rolândia está versionada.
- **E1 — mapas em BMP fora da visão** (`table-images.ts`): teto de 500 KB aplicado ao PNG convertido.
  - Tabelas em BMP viram PNGs de 12 a 34 KB; mapas, de 1 a 5 MB, e os maiores derrubavam a Edge Function.
  - Rolândia caiu de 49 para 32 candidatas e a SJC v2 de 86 para 74, sem perder tabela.
- **E2 — recado do analista pelo texto** (`pptx-to-ir.ts › isConversationalNote`): vocativo mais marca de conversa.
  - O detector antigo só via caixa amarela com letra vermelha.
  - Pega os s1, s10 e s38, e o s10 deixa de ser "vazamento de outra cidade".
- **E3 — deslocamento impossível** (`ir-rules.ts › travelSpeedFindings`): acima de 150 km/h, na mesma linha de texto.
  Pega "950 km | 3 min" no s17.
- **E4 — raios acumulados** (`nested-radii.ts`): "Até N km" absoluto não pode diminuir com o raio, no slide e na
  planilha.
  - Exige linha alinhada às colunas; sem isso, saíam falsos positivos no CJ e na SJC v2.
  - Pegou o s34 (3 km com 4.833 alugados contra 4.924 em 2 km) e um erro na planilha Dom.p Tipo (3 km com 1.428
    apartamentos contra 1.524 em 2 km).
- **E5 — mesmo empreendimento entre slides** (`entity-consistency.ts`): a ficha de planta única precisa caber na
  faixa de R$/m² das lacunas. Pega o Boulevard (R$ 5.120/m² fora de "Até R$ 5.000").
  - Âncora só em texto nativo.
  - Lacuna com o mesmo escopo das fichas (total lançado entre 90% e 100% da soma delas).
  - Faixas que somam a coluna Total.
  - Leitura do gpt-4o sem discordância (campo novo `reliable`). Sem essas travas, eram 6 falsos positivos (SJC s77 e
    s81, CJ s87).
- **E6 — linha da tabela de empreendimentos** (unidades, disponibilidade, preço ÷ R$/m²): só em tabela nativa,
  porque a visão perde sub-linhas mescladas (Toledo s123, Rolândia s45).

Resultado no fim do bloco B: Rolândia passou de 9 para 14 achados, com 0 falso positivo nos outros 4 estudos e 199
testes verdes.

## Implementado no bloco C, sem commit

- **E7 — texto de SVG** (`pptx-to-ir.ts`, `ir.ts › textos_svg`, `ia-text.ts`): fica fora de `textos`, porque no SVG
  os valores e os rótulos vêm em listas separadas. Expõe o 5,2% do s31 e "Churrasqueria" do s61.
- **E8 — divergência repetida vira um cartão** (`source-crosscheck.ts › groupSameDivergence`).
  - Junta s32+s33 e s46+s47 em Rolândia, e s31+s32 na SJC v2.
  - Avisa que a planilha pode estar desatualizada quando o deck repete o valor.
- **E9 — formato literal** (`format-checks.ts › literalFormatIssues`, `ir-rules.ts › nativeFormatFindings`): ano com
  ponto, ",00,00", espaço duplo e limite superior em ",01".
  - Pegou "2.023" na SJC VAP s73, erro real.
  - Em Rolândia não pega: as imagens dos s22, s23 e s36 são estreitas demais para serem lidas, e a visão normaliza
    o ",00,00" do s37.
- **Para fechar:**
  - rodar a suíte e o lint (dois testes de `source-crosscheck.test.ts` foram atualizados para o cartão agrupado);
  - acrescentar os testes do bloco C;
  - fazer o commit e o push.

## A fazer

- **E10 — revisão de texto no gpt-4o, com prompt de concordância e nomes digitados errado.** Hoje dá 1 achado em 63
  slides e deixa passar "são esperado" e "Prsidente". Exige deploy de `analyze-text-batch` e validação no site, porque
  não há cache de texto.
- **E11 — "//" só vira achado com duas leituras concordando.** Remove o falso positivo do s67.
- **E12 — seções vazias pelo nome** (`structure-checklist.ts`). Os s73–s75 são três sumários seguidos e o s78 está em
  branco, mas hoje o checklist diz só "1 ausente".
- **Fechamento:** entrada v0.67 no `LIVE_regras…`, tabela final no plano e texto para o Lovable.

## Pendências registradas

- **Tabelas pequenas:** ler tabelas de 440 a 700 px de largura e de altura abaixo de 200 px (s22, s23, s36, s40, s43).
  Precisa de leitura nova, então só dá para validar no site.
- **Sub-linhas mescladas:** reler no gpt-4o as tabelas de empreendimento com sub-linhas, para as E5 e E6 usarem
  imagem.
- **Nível do achado da E5:** não rebaixar para Verificar pela nota de exclusão. A exclusão não explica unidades na
  faixa errada.
- **Planilha `02. SOCIODEMOGRAFIA`:** avisar a equipe que mantém o modelo. A condição de ocupação traz 66,5% / 20,1% /
  13,4% no raio maior em Rolândia, CJ e SJC v2, o que indica fórmula fixa no modelo.
- **Não commitar:** `src/features/corretor/referencia_ajustes/` (cerca de 430 MB).
