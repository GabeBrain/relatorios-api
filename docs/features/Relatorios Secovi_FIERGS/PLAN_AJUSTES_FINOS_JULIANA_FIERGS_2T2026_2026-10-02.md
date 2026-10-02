# Plano de ação — ajustes finos da Juliana, FIERGS 2T2026

**Data:** 02/10/2026
**Entrada:** `assets/panorama-fiergs-rs-2T2026 (1).pptx` (72 slides) e e-mail: “Segue para ajustes finos. De dados não identifiquei mais nenhum erro.”
**Estado:** G0–G4 concluídos localmente em 02/10/2026. Testes, build, PDFs/PPTs de regressão e inspeção concluídos; implementação em `a95e039` e documentação/evidências em commit local separado. Sem push.
**Escopo:** apresentação e composição do estudo FIERGS, preservando os indicadores já reconciliados e a regressão 4T2025.

## Leitura rastreável do retorno

| Slide no PPTX recebido | Texto da Juliana | Leitura e cuidado |
|---|---|---|
| 48 | “Excluir essa linha” | A anotação está posicionada sobre `Não classificado`, linha sem preço, ticket ou área. Remover apenas a linha inteiramente vazia da tabela de preço por padrão; não apagar resíduos reais das tabelas de oferta. |
| 55 | “Aqui precisa incluir o %” | A coluna `Disponibilidade s/O.L.` exibe traços. Juliana quer um percentual, mas Oferta Lançada visível usa a janela 1T2023–2T2026 e Oferta Final inclui estoque de coortes antigas: dividir essas duas colunas seria metodologicamente incorreto. |
| 55 | “Ficou zerado aqui, mas tem estoque” | `4 ou + Dormitórios` tem zero lançamento na janela e 2 unidades em estoque de coortes anteriores. É uma diferença de universo, não evidência de erro no estoque. Exibir `0` como dado observado quando couber, sem transformar ausência de dado em zero, e explicar a coexistência. |
| 58 | “Esse e o 60 estão iguais, acho que duplicou e excluiu as análises de tempo médio por tipologia e padrão e a do VGV” | Os slides 58 e 60 não são idênticos, mas repetem 7/52/70 empreendimentos e 1.196/17.918/11.362 lançamentos horizontais. O 58 acrescenta unidades por empreendimento; o 60, disponibilidade. As páginas oficiais 59–60 de tempo médio foram retiradas na revisão anterior, e o antigo slot de VGV foi usado para o novo consolidado horizontal. A revisão atual pede recuperar as análises, não apenas renomear páginas. |

**Fato versus interpretação:** o e-mail aprova a leitura dos dados da versão recebida; não aprova automaticamente a metodologia de um novo percentual nem os quadros que ainda não estavam no arquivo. O pedido atual de recuperar tempo médio atualiza a orientação anterior de eliminar os slides oficiais 59–60. A nota de 58 não especifica qual dos dois quadros horizontais deve sobreviver; o plano prioriza manter o quadro por produto pedido anteriormente e suprimir a repetição somente após conferir que nenhum indicador exclusivo se perde.

## Portões de execução

### G0 — Baseline e mapeamento editorial

1. Confirmar `git remote -v`, `git fetch --all`, divergência, árvore e dono dos arquivos; preservar alterações não relacionadas, especialmente `src/features/corretor` e a pasta não versionada `src/features/corretor/referencia_ajustes/`.
2. Registrar em Markdown o PPTX, os textos/posições das três anotações, a correspondência entre número exibido e ID oficial, a sequência atual 48–64, e quais páginas carregam tempo médio, VGV e cada indicador horizontal. Não confundir slides **exibidos** 58/60 com IDs oficiais.
3. Capturar uma base numérica por tipologia para 2T2026 e 4T2025: Oferta Lançada da janela, Oferta Lançada histórica da mesma tipologia, Oferta Final, cobertura/denominador e unidades sem tipologia. Registrar fonte e período do snapshot; a GeoBrain é mutável.

**Portão:** matriz de páginas e universos assinada na evidência; nenhuma exclusão ou novo percentual antes de definir o denominador e seu alcance.

### G1 — Limpeza pontual da tabela de preços (slide 48)

1. No componente da tabela de preço por padrão, ocultar `Não classificado` **somente** se ticket, área e R$/m² forem todos ausentes; se houver preço real em outro recorte, manter a linha. Não esconder `Médio-Alto` nem alterar a agregação geral ou as guardas de completude do cubo.
2. Testar os estados: linha residual totalmente vazia; parcialmente preenchida; ausente; subtotal inalterado. Conferir preview, PDF e PPT espelho.

**Portão:** a linha vazia desaparece sem mudar números ou descartar resíduos auditáveis.

### G2 — Disponibilidade e coorte antiga (slide 55)

1. Separar no modelo, por tipologia, o lançamento **histórico elegível para o estoque de fechamento** do lançamento **da janela editorial**. Reconciliar os dois com a oferta final e explicitar projetos/linhas sem denominador observável.
2. Calcular a disponibilidade, quando defensável, como `Oferta Final ÷ Oferta Lançada histórica da mesma tipologia × 100`. Rotular inequivocamente `Disponibilidade sobre O.L. histórica` e explicar em nota que a coluna de Oferta Lançada mostrada pertence à janela selecionada. Não calcular `Final ÷ Lançada da janela`; não produzir infinito, valor acima de 100% sem análise, fallback silencioso ou percentual inventado.
3. Para `4 ou + Dormitórios`, distinguir zero observado na janela de dado indisponível; manter as 2 unidades finais. Se o denominador histórico for zero ou não confiável, exibir `—` apenas nessa linha com justificativa objetiva, enquanto as demais linhas calculáveis recebem percentuais.
4. Testar tipologias com lançamento antigo/estoque presente, janela sem lançamentos, denominador ausente, residual tipológico real, e ambos os períodos de regressão. Verificar que totais e percentuais não insinuem a mesma base quando os universos diferem.

**Portão numérico:** cada percentual tem numerador/denominador rastreáveis e guardas de consistência; divergência crítica ou cobertura insuficiente interrompe a publicação daquele indicador e vira pergunta objetiva, não chute.

### G3 — Tempo médio, VGV e redundância horizontal (slides 58/60)

1. Restaurar duas análises distintas de **tempo médio da oferta lançada e final**, uma por tipologia e outra por padrão, usando as agregações de maturidade já existentes. Conferir faixa temporal, coorte e rótulo `tempo médio`: se a fonte só sustentar categorias de estágio/idade, não apresentar uma média em meses não observada. Mostrar a análise como indisponível, com causa, quando faltar cobertura; não preencher com zeros.
2. Restaurar **VGV ofertado/disponível/vendido** com a fonte e os subtotais vertical, horizontal e total compatíveis com o cubo e a política FIERGS. Separar fluxo lançado da janela e fotografia de estoque; não somar denominadores de universos distintos. Revisar o componente `VgvSlide` antes de reutilizá-lo e testar unidades monetárias, projetos distintos, totais e valores ausentes.
3. Manter o consolidado horizontal **por produto** pedido por Juliana, inclusive sua média de unidades lançadas por empreendimento com fórmula explícita. Comparar o slide horizontal de oferta por tipo com ele: retirar a página redundante se seus números exclusivos forem recolocados de forma clara ou comprovadamente cobertos por outra página. Não remover a disponibilidade horizontal sem alternativa legível.
4. Atualizar manifesto, roteamento, sumário, numeração exibida, preview, PDF e PPT juntos. IDs oficiais estáveis; sem assumir que o estudo continuará com 72 páginas. Auditar todas as páginas 48–66 para evitar novo deslocamento editorial.

**Portão editorial:** Juliana encontra, uma vez cada, as análises de tempo por tipologia, tempo por padrão, VGV e consolidado horizontal; páginas 58/60 não repetem a mesma informação essencial. As séries e o VGV têm matrizes de fonte e cobertura antes da renderização.

### G4 — Regressão e inspeção do entregável

1. Rodar testes unitários/contratuais de `src/features/panorama-secovi-fiergs`, TypeScript e `npm run build`. Gerar estudos reais FIERGS **2T2026 e 4T2025** após as mudanças; auditar CSV/matrizes de oferta, vendas, estoque, maturidade e VGV. Não fixar valores de runtime nem exceções por trimestre.
2. Inspecionar visualmente cada página tocada no PDF e no PPT, incluindo linha removida, percentuais/nota, 4+ dormitórios, tempo médio, VGV, horizontal e sumário. Confirmar que a parte de dados aprovada pela Juliana permanece estável ou explicar qualquer mudança de snapshot da GeoBrain.
3. Registrar evidência em Markdown com comparativos antes/depois, fontes, decisões e ressalvas. Atualizar o resumo de homologação e `docs/projetos/LIVE_rebrain.md`. Fazer commits locais isolados com `git add` explícito; conferir divergência remota antes de pedir autorização para push. O push dispara publicação e não deve ser presumido pelo plano.

**Aceite para novo envio:** sem divergências numéricas críticas, sem páginas redundantes, com os três blocos solicitados presentes ou sua ausência tecnicamente justificada. Solicitar à Juliana validação editorial dos novos percentuais e das análises restauradas; a frase “sem erros nos dados” refere-se à versão anterior.

## Notas para o próximo e-mail

- Agradecer a confirmação de que ela não encontrou mais erro de dados; não dizer que o estudo inteiro está homologado.
- Resumir os ajustes efetivamente realizados **somente após** os portões: linha vazia removida, disponibilidade com base histórica explicitada, explicação de 4+ dormitórios e reorganização de tempo médio/VGV/horizontal.
- Dizer em uma frase que `0` lançamentos na janela pode coexistir com estoque de empreendimentos mais antigos; não apresentar o estoque como erro nem esconder suas 2 unidades.
- Se a disponibilidade histórica não for calculável em alguma tipologia, declarar a limitação e pedir a definição dela, em vez de prometer percentual para toda linha.
- A página institucional ainda usa a arte de 22 anos; o usuário tratará a substituição com o marketing. Não pedir o material à Juliana novamente, nem anunciar essa página como final.
- Se os valores mudarem na GeoBrain antes do próximo PDF, informar o snapshot e a causa comprovada; não repetir 16.110 como meta fixa.

**Rascunho condicionado à execução:** “Oi, Juliana! Obrigado pela nova conferência e pela confirmação dos dados. Ajustamos a linha vazia, esclarecemos a disponibilidade e o estoque de coortes anteriores e reorganizamos a sequência para incluir as análises de tempo médio e VGV sem repetição do quadro horizontal. Você consegue conferir a nova versão? A página institucional segue em atualização com o marketing. Fico à disposição.” Adaptar apenas ao que for efetivamente entregue e às limitações demonstradas.
