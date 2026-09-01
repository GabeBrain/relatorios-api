# Matriz 40/40 — estado e evidência de cada comentário

**Data:** 01/set/2026
**Base:** [`MATRIZ_TERMINAL_40_COMENTARIOS_JULIANA_PANORAMA_V3_2026-09-01.md`](../MATRIZ_TERMINAL_40_COMENTARIOS_JULIANA_PANORAMA_V3_2026-09-01.md)
**Dossiê:** [`DOSSIER_V3_2026-09-01.md`](./DOSSIER_V3_2026-09-01.md)

## Como ler

- **`pN`** é a página do PDF comentado pela Juliana; **`ref`** é o `referenceSlide` do manifesto.
  A correspondência foi confirmada rasterizando o PDF, não deduzida.
- **Estado**: `done` · `not_applicable` (lâmina corretamente suprimida pelo manifesto) · `blocked`.
- **Evidência** cita o caminho concreto. Captura de página vive em
  `.tmp/opus-panorama-v3/evidencias/<cenário>/pNN.png` (pasta ignorada pelo Git); teste vive no repo.
- Comentário repetido **não** herda evidência do irmão: cada linha aponta a sua própria página.

Abreviações de evidência:

| Sigla | Significa |
|---|---|
| `T:jg` | `src/features/panorama-secovi-fiergs/__tests__/jg-comentarios-juliana.test.ts` |
| `T:render` | `src/features/panorama-secovi-fiergs/__tests__/jg-render-paginas.test.tsx` |
| `T:pol` | `__tests__/opus-domain-policy.test.ts` |
| `T:agg` | `__tests__/opus-cube-aggregations.test.ts` |
| `T:pdf` | `__tests__/pdf-export.test.ts` |
| `E:<cen>/pNN` | captura da página NN do cenário, gerada por `tests/panorama-v3-jg.spec.ts` |

**Numeração por cenário.** A posição da página muda com a supressão condicional, que é justamente o
que JG-34 e JG-39 pedem. Jundiaí tem 55 páginas (sem o bloco horizontal), Praia Grande 58 e a
Baixada 61 (com as três comparações municipais). As referências `E:` abaixo usam a numeração do
cenário citado; o `manifesto.json` de cada pasta lista título e posição de todas as lâminas.

---

## Matriz

| ID | p | ref | Requisito | Estado | Evidência |
|---|---:|---:|---|---|---|
| JG-01 | 4 | 7 | Aumentar fonte — "Sobre o SECOVI-SP" | `done` | `E:jundiai/p04` · `T:render` (regra `cqw`, sem `vw`/`clamp`) |
| JG-02 | 5 | 3 | Aumentar fonte — visão, missão e valores | `done` | `E:jundiai/p05` · `T:render` |
| JG-03 | 6 | 8 | Aumentar fonte — política da qualidade | `done` | `E:jundiai/p06` · `T:render` |
| JG-04 | 8 | 10 | Aumentar fonte — objetivos do estudo | `done` | `E:jundiai/p08` · `T:render` |
| JG-05 | 10 | 12 | Horizontal só condomínio de casas; fundos das colunas de variação; sem cinza isolado no rótulo | `done` | `E:jundiai/p10`, `E:praia-grande/p10` · `T:render` (célula de segmento uniforme, rótulo `Condomínio de Casas`) · `T:jg` (PRE-026) |
| JG-06 | 11 | 13 | Idem 10, na tabela anual | `done` | `E:jundiai/p11`, `E:praia-grande/p11` |
| JG-07 | 12 | 14 | Rótulo `0` visível; 2T26 presente; branco só nos 2ºs trimestres | `done` | `E:jundiai/p12` · `T:render` (`pointLabelPlan`: zero renderiza; placa por valor do trimestre; série contém 2T2026) |
| JG-08 | 13 | 15 | Idem 12 — empreendimentos por padrão | `done` | `E:jundiai/p13` |
| JG-09 | 14 | 16 | Idem 12 — unidades lançadas | `done` | `E:jundiai/p14` |
| JG-10 | 15 | 17 | Idem 12 — unidades por padrão | `done` | `E:jundiai/p15` |
| JG-11 | 16 | 18 | Idem 12 — VGV lançado | `done` | `E:jundiai/p16` |
| JG-12 | 17 | 19 | Idem 12 — VGV por padrão | `done` | `E:jundiai/p17` |
| JG-13 | 19 | 21 | Idem 10 — vendas por trimestre | `done` | `E:jundiai/p19` |
| JG-14 | 20 | 22 | Idem 10 — vendas por ano | `done` | `E:jundiai/p20` |
| JG-15 | 21 | 23 | Idem 12 — unidades vendidas | `done` | `E:jundiai/p21` |
| JG-16 | 22 | 24 | Idem 12 — VGV vendido | `done` | `E:jundiai/p22` |
| JG-17 | 23 | 25 | Idem 12 — unidades vendidas por padrão | `done` | `E:jundiai/p23` |
| JG-18 | 24 | 26 | Idem 12 — VGV vendido por padrão | `done` | `E:jundiai/p24` |
| JG-19 | 25 | 27 | Metragens do 1T26; IVV não pode estar zerado | `done` | `E:jundiai/p25`, `E:baixada/p25` · `T:jg` (faixas do gabarito; IVV pela PRE-009 do cubo; base ausente → `null`; oferta anterior nunca negativa) |
| JG-20 | 27 | 29 | Horizontal só condomínio; formatação condicional na última coluna | `done` | `E:jundiai/p27`, `E:praia-grande/p27` · `T:render` (rótulo do universo; estado declarado na célula) |
| JG-21 | 29 | 31 | Inserir formatação condicional | `done` | `E:jundiai/p29` · `T:jg` (cinco estados, sinal redundante) |
| JG-22 | 31 | 33 | Subtotal soma lançados **após 2024** e vem **depois** de 2026 | `done` | `E:jundiai/p31` · `T:pol`, `T:agg`, `T:jg` (anos ≤2024 provadamente fora; posição after-2026; sem linha vazia) |
| JG-23 | 34 | 36 | Formatação condicional no R$/m² — por tipologia | `done` | `E:jundiai/p34` |
| JG-24 | 36 | 38 | Formatação condicional no R$/m² — por padrão | `done` | `E:jundiai/p36` |
| JG-25 | 38 | 40 | Gráfico de barras com variação entre períodos | `done` | `E:jundiai/p38` (barras + `▲/▼` por período; primeiro período e denominador zero → `—`) |
| JG-26 | 39 | 41 | Subtotal "após 2024" e sua posição — matriz ano × padrão | `done` | `E:jundiai/p39` · `T:agg` |
| JG-27 | 40 | 42 | Subtotal "após 2024" e sua posição — participação | `done` | `E:jundiai/p40` · `T:agg` |
| JG-28 | 40 | 42 | Formatação condicional, sem alterar o subtotal de JG-27 | `done` | `E:jundiai/p40` (mesma página, requisito distinto: linha de subtotal destacada **e** células com estado) |
| JG-29 | 42 | 44 | Formatação condicional — maturidade por padrão | `done` | `E:jundiai/p42` · `T:jg` |
| JG-30 | 42 | 44 | Percentuais "bem errados" | `done` | `E:jundiai/p42` · `T:jg` (cada coluna divide pelo próprio total e fecha 100%; o denominador antigo, único e final, **não** fecha) |
| JG-31 | 44 | 46 | Formatação condicional **e** percentuais — maturidade por tipologia | `done` | `E:jundiai/p44` · `T:jg` |
| JG-32 | 45 | 47 | Apenas condomínios de casas | `done` (Praia Grande) · `not_applicable` (Jundiaí) | `E:praia-grande/p45` — divisor do bloco horizontal, presente porque há 2 condomínios aceitos; em Jundiaí a lâmina não existe (0 aceitos em 56 horizontais) · `T:jg`, replay 11/11 |
| JG-33 | 46 | 48 | Tabela anual horizontal no formato da vertical | `done` (Praia Grande) · `not_applicable` (Jundiaí) | `E:praia-grande/p46` — mesmo `CohortTableSlide` da vertical: mesmas colunas, mesma formatação condicional e o mesmo `Subtotal lançados após 2024` antes do `Total geral` |
| JG-34 | 47 | 49 | Sem empreendimentos ativos, excluir a página | `done` | `E:praia-grande/p47` com oferta ativa; `E:jundiai` **não tem** a lâmina — 55 páginas contra 58 · `T:jg` (suprime com `finalUnits = 0`; mantém com oferta ativa) · `T:render` |
| JG-35 | 49 | 51 | Condomínio de casas após o subtotal Vertical | `done` | `E:praia-grande/p49` — ordem impressa: padrões verticais → `Subtotal vertical` → `Condomínio de Casas · Econômico` / `· Standard` → `Subtotal horizontal` → `Total geral`. `E:jundiai/p46` prova o outro lado: sem aceito, nenhuma linha horizontal é criada · `T:jg` |
| JG-36 | 51 | 53 | Remover textos de loteamento e "API GeoBrain" | `done` | `E:praia-grande/p51`, `E:jundiai/p48` · `T:render` + assertiva na spec: busca negativa por `loteamento` e `api geobrain` no **deck inteiro** dos três cenários |
| JG-37 | 52 | 54 | Sem loteamento; "2 Dormitórios", não `2` solto | `done` | `E:praia-grande/p52` (lê "3 Dormitórios"), `E:jundiai/p49` · `T:jg` (`typologyDisplayLabel`) |
| JG-38 | 52 | 54 | Preços batem; sem média de horizontal + vertical | `done` | `E:praia-grande/p52` — mesma página de JG-37, requisito distinto: "No residencial vertical… R$ 534.736 e R$ 8.600/m²" e "Em Condomínio de Casas… R$ 545.000 e R$ 5.920/m². Os dois segmentos não são combinados em uma média única." O ticket vertical fecha com o `Subtotal vertical` de `E:praia-grande/p49` · `T:render` |
| JG-39 | 53 | 55/56 | Mapa não carregou | `done` | `E:praia-grande/p53` (divisor) e `E:praia-grande/p54` (mapa com tiles, marcadores numerados e atribuição); `E:jundiai/p50–51` idem · `T:jg` (sem token, divisor **e** mapa saem juntos; com token, a lâmina existe) · `T:pdf` |
| JG-40 | 56 | 59 | "Foto do Consultor" sem foto | `done` | `E:jundiai/p54`, `E:praia-grande/p57` — sem moldura tracejada e sem o texto "FOTO DO CONSULTOR" · `T:render` (sem placeholder quando não há foto; com foto, `img` com `alt`) |

**40/40 endereçados.** Nenhum `blocked`.

Os `not_applicable` de JG-32 e JG-33 valem **apenas para Jundiaí**, onde o manifesto suprime
corretamente a lâmina por não haver Condomínio de Casas elegível — e são `done` em Praia Grande, que
tem o bloco. **Nenhum item foi fechado só com `not_applicable`:** todos têm a página gerada em pelo
menos um cenário.

Até a página 44 a numeração de Jundiaí e de Praia Grande coincide com a do PDF comentado, de modo
que JG-01 a JG-31 são conferíveis página a página com o original. A partir daí Jundiaí perde as três
lâminas horizontais e Praia Grande ganha a lâmina de mapa, que estava ausente no PDF comentado — é
exatamente o que JG-34 e JG-39 pedem.

---

## Portões transversais

| Portão | Estado |
|---|---|
| Fontes (JG-01–04) — captura das quatro páginas, sem overflow, teste antirregressão | atendido |
| Formatação condicional — regra centralizada, cinco estados, cor nunca sozinha, paridade na exportação | atendido |
| Percentuais e preços — fórmulas no dossiê, participações fecham 100%, segmentos separados | atendido |
| Páginas condicionais — decisão no manifesto antes do sumário; preview, PDF e PPT com mesma ordem e contagem | atendido (`panoramaManifestOptions` como ponto único) |

## Checklist de evidências

- [x] tabela `JG-01`…`JG-40` com estado e caminho da evidência
- [x] capturas das institucionais 4, 5, 6 e 8
- [x] capturas de cada família de gráfico/tabela repetida (todas as páginas de cada cenário)
- [x] PDF de Jundiaí sem bloco horizontal
- [x] PDF de Praia Grande com condomínios aceitos
- [x] PPT espelho com a mesma paginação do PDF
- [x] dossiê com universo, herança, fórmulas, exclusões, retries e circuit breaker
- [x] busca textual negativa por "loteamento" e "API GeoBrain"
- [x] mapa e consultor verificados com e sem recurso
- [x] testes da feature (171), suíte completa (307), `tsc --noEmit`, `npm run build`
- [x] paridade medida preview = PDF = PPT nos três cenários (55 / 58 / 61 páginas)
- [ ] conferência visual manual em desktop e mobile, claro e escuro — **não executada**; ver limite abaixo

## Limites declarados

1. **Conferência visual manual não foi feita.** O relatório é uma lâmina 16:9 de largura fixa, sem
   variante mobile nem tema escuro na rota de exportação; a verificação equivalente executada foi a
   captura headless de **todas** as páginas em 1600×1000, mais o PDF e o PPT reais. Uma conferência
   humana em navegador continua recomendada antes da homologação com a analista.
2. **Reverificação ao vivo do contrato v2 ficou bloqueada** no fim da sessão: `POST /auth/login`
   passou a responder HTTP 422 sem emitir token. O universo horizontal foi verificado pelo replay do
   dataset autenticado de 01/set (924 horizontais, 24 municípios) através da política do produto,
   com divergência zero.
3. **`group_by=Padrão` falhou no transporte** em todas as séries das três coletas autenticadas,
   enquanto `group_by=Tipologia` respondeu 200. Registrado como medição, não diagnosticado; é a
   próxima pergunta para a manutenção da API.
