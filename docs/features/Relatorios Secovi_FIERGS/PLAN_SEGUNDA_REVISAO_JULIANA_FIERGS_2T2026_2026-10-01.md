# Plano de ação — segunda revisão da Juliana, Panorama FIERGS 2T2026

**Data:** 01/10/2026
**Estado:** planejado; nenhuma correção deste ciclo implementada
**Fonte:** `assets/panorama-fiergs-rs-2T2026.pptx` (75 slides; SHA-256 `9AEAA0C95BF5ABE819F2D1FBA92C1B66A5EFC5E21B10D3104FE5EFB9E1666644`) e e-mail da Juliana. As observações estão em objetos da apresentação, não necessariamente em threads de comentários do PowerPoint.

## Objetivo e limites

Resolver **cada apontamento** da segunda revisão, preservar as análises que Juliana aprovou e produzir novo PDF/PPT auditável. O e-mail considera a abertura correta, exceto o slide institucional, e concentra os erros na **Oferta Lançada** e nos **preços médios**. Não alterar números manualmente, não criar exceções de período, não misturar universos distintos para obter coincidência visual e não modificar `src/features/corretor` nem `src/features/corretor/referencia_ajustes/`. Manter FIERGS 2T2026 e 4T2025 como regressões, além de Secovi-SP e recortes livres.

## Matriz completa dos apontamentos

| Slide(s) | Apontamento da Juliana | Entrega e critério de aceite |
|---|---|---|
| 4 | Capa institucional desatualizada: informa 22 anos; são 23. | Solicitar arte institucional vigente/editável. Substituir o asset somente após recebimento ou autorização explícita para atualizar o existente; conferir texto, marca, enquadramento e PDF/PPT. Não inventar material institucional. |
| 36 | Eliminar “Não classificado”; Oferta Lançada 54.761 parece incorreta frente aos 15.950 anteriores. | Reconciliar universo histórico versus lançamentos no intervalo selecionado; exibir oferta lançada da janela nos cortes por tipologia, com total 15.950 **somente se** as linhas granulares comprovarem esse valor. Não ocultar faltantes válidos por filtro cosmético. |
| 37 | Empreendimentos eram 134; Oferta Lançada era 15.950; eliminar “Não classificado”. | Aplicar a mesma regra de coorte nos cortes por padrão; provar soma por empreendimento e categoria. Distinguir contagem de projetos lançados na janela de estoque total na data. |
| 41 | Ocultar quando a tabela anual não puder ser calculada; mostrar somente com dados suficientes. | Condicionar a inclusão da página a uma fonte anual auditável, sem fabricar dado ou deixar página-vazia. Ajustar navegação, sumário, numeração exibida, exportação e testes para os dois estados. |
| 51–52 | Médias não coincidem com os gráficos de preço da seção anterior. | Reconciliar séries e tabelas por município, empreendimento, tipologia, fonte, período, ponderador e cobertura. Unificar regra ou explicitar indicadores diferentes, conforme evidência e aceite metodológico; tabela e gráfico devem concordar entre si e com a série quando rotulados como a mesma média. |
| 54–56 | Repetem divergência de Oferta Lançada/empreendimentos dos 36–37 e “Não classificado”. | Fazer quadros de maturidade consumirem a mesma definição de lançamentos na janela; reconciliar todos os subtotais e rótulos. Não aplicar correção apenas aos primeiros slides. |
| 59–60 | Eliminar. | Remover do manifesto/exportações e revisar encadeamento editorial, sumário, referências e testes; não apenas esconder no PDF. |
| 61 | Eliminar apresentação atual por padrão e deixar, como no 63, Condomínio de Casas, Loteamento Aberto e Loteamento Fechado, com média e quantidade de empreendimentos, lançada e final independentemente do padrão. | Substituir a página por consolidado de **três produtos horizontais**, sem duplicar o 63; definir e exibir a natureza/ponderação da “média” antes de publicar. Validar projetos, lançada e final por produto e total. |
| 64 | Conferir números, possivelmente incorretos como no vertical. | Auditar coortes horizontais independentemente; aplicar a definição de Oferta Lançada escolhida para o relatório, preservando a oferta final como fotografia de fechamento quando apropriado. Confrontar 63 e 64 sem assumir que todos os indicadores têm o mesmo universo. |
| 65–66 | Trocar “Média Geral” por “Média Loteamentos” e calcular somente com lotes abertos e fechados. | Construir um agregado específico de loteamentos; excluir Condomínio de Casas do denominador em todas as métricas da linha/linha média. Tabela, linha média do gráfico, legenda e eventual exportação devem usar exatamente o mesmo agregado. |

## Evidência já disponível; hipóteses ainda abertas

- O cubo vertical completo registra **519 empreendimentos / 54.761 unidades lançadas / 5.251 finais**. Ao restringir **lançamentos à janela 1T2023–2T2026**, aparecem **134 empreendimentos / 15.950 lançadas**. Portanto, 54.761 não é necessariamente erro aritmético, mas representa outro universo; a métrica rotulada “Oferta Lançada” na seleção atual precisa refletir a coorte correta. Estoque final e vendas não devem ser filtrados automaticamente junto com a coorte de lançamentos.
- As 63 unidades residuais “Não classificado” vêm de empreendimento lançado em 3T2022, fora da janela escolhida. Isso explica sua exclusão **da oferta lançada da janela**, não autoriza suprimir qualquer residual genuíno de outras métricas ou períodos.
- O horizontal completo registra **129 empreendimentos / 30.476 lançadas / 3.365 finais**; a janela de lançamentos registra **39 / 8.402**. A regra exata para cada coluna do 61/63/64 precisa ser documentada antes de substituir números. “Oferta final” pode ter universo mais amplo que “lançada no período”; percentuais que dividem uma pela outra exigem coorte consistente ou rótulo explícito.
- Na revisão, a série de preço por tipologia e os quadros 51–52 divergem: por exemplo, uma tipologia aparece como **11.392** na série e **11.867** no quadro; outras aparecem como **6.034/5.507**, **9.342/9.053** e **9.469/7.402**. A causa **ainda não foi demonstrada**: podem diferir fonte, filtro temporal, disponibilidade de preço ou ponderador. O total 6.537 coincidente não prova equivalência das aberturas.
- A página 41 já sinaliza indisponibilidade de fonte anual; a solicitação nova é **omiti-la** na ausência de dados, em vez de exibir aviso.

## Execução em uma rodada, com portões internos

### G0 — Congelar baseline e rastreabilidade

1. Registrar hash e extração das anotações do PPTX, versão de código, recorte, dados/fonte e artefatos atuais. Separar o que Juliana aprovou do que pediu mudança.
2. Capturar matrizes de saída atuais para 2T2026 e 4T2025, por cidade, projeto, tipologia/produto, padrão, fonte e período. Registrar fatos confirmados e hipóteses separadamente em `EVIDENCIA_SEGUNDA_REVISAO_JULIANA_FIERGS_2T2026_2026-10-01.md`.
3. Verificar status/remotes antes de editar; preservar alterações paralelas. Sem `git add .`/`-A`.

**Portão:** há baseline reproduzível e lista completa dos slides afetados.

### G1 — Oferta Lançada e universo de referência

1. Identificar onde o runtime mistura histórico integral, coorte de lançamento e fotografia de fechamento; rastrear contratos da API, modelo, agregações e consumidores 36, 37, 54–56, 61, 63–64.
2. Formalizar métricas distintas: `launchedInSelectedWindow`, `projectsLaunchedInSelectedWindow`, `closingAvailableStock` e, se necessário, estoque do mesmo cohort. Definir filtro inclusivo de trimestre e comportamento para data ausente, cancelamentos e duplicidade de empreendimento.
3. Reconciliar cada dimensão com a linha granular e implementar seletor compartilhado, sem números fixos. Remover “Não classificado” da **coorte de lançamento** apenas quando comprovadamente fora dela; preservar categoria derivada se houver ausência real dentro da coorte.
4. Revisar percentuais como disponibilidade sobre lançada para garantir numerador e denominador comparáveis; se não forem, trocar métrica/rótulo ou apresentar indisponibilidade fundamentada.

**Portão crítico:** totais e dimensões fecham em 2T2026 e 4T2025, sem regressão em vendas, oferta final, horizontal e outros presets. Não prosseguir aos ajustes editoriais se houver delta crítico aberto.

### G2 — Preços médios verticais e loteamentos

1. Criar matriz de reconciliação para slides 43–52 (incluindo 51–52): cada linha granular, período, valor de R$/m², área, quantidade ponderadora, disponibilidade e origem da série versus quadro.
2. Determinar a definição aprovada da média (simples por imóvel/empreendimento, ponderada por unidade/área ou outra comprovada pela fonte). Documentar exclusões e ausência de dados; não escolher a série como canônica só porque é mais antiga.
3. Aplicar seletor comum a tabelas, gráficos, legendas e total quando eles declararem a mesma métrica; testar cada tipologia e agregado. Se a fonte não sustentar equivalência, diferenciar nomes e solicitar decisão da Juliana antes da homologação.
4. Para slides 65–66, derivar `Média Loteamentos` exclusivamente dos produtos Loteamento Aberto e Fechado, inclusive ticket/área/R$/m² quando mostrados; preservar as linhas de Condomínio de Casas sem contaminarem a média.

**Portão crítico:** nenhuma média com mesmo nome diverge entre seção, tabela e gráfico; matriz e ponderadores registrados, inclusive casos sem preço.

### G3 — Composição editorial e página horizontal

1. Omitir 41 quando a matriz anual não estiver disponível; manter a página quando fonte real e completa existir. Remover 59–60 de preview, PDF e PPT.
2. Reestruturar 61 em três produtos horizontais com contagens e médias comprovadas; confirmar que não replica confusamente o 63. Revisar 64 segundo a matriz do G1.
3. Refatorar manifesto/paginação de modo condicional, sem confiar em números de página antigos como índice de array. Conferir sumário, links, títulos, IDs estáveis, ordem e contagem gerada: **73 páginas** se 41 indisponível; **74** se disponível, partindo do contrato atual de 75 e retirando 59–60.

**Portão:** inspeção página a página do preview/PDF/PPT nos dois estados da página 41, sem páginas vazias, saltos ou rótulos obsoletos.

### G4 — Material institucional e pendências de decisão

1. Pedir à Juliana a capa/slide institucional mais recente (preferencialmente arquivo editável e autorização de uso). Sem esse material, registrar **pendência externa**; não gerar imagem substituta nem tratar o slide 4 como homologado.
2. Confirmar com ela, se a fonte não resolver inequivocamente, o que “média” do novo slide 61 significa e se as páginas horizontais 63–64 devem mostrar lançamentos da janela ou universo histórico com rótulos distintos. Para 51–52, apresentar matriz e propor definição única de preço médio caso haja duas metodologias legítimas.
3. Preparar perguntas sucintas para o próximo e-mail; não bloquear G1–G3 por material institucional ausente, mas não anunciar homologação final do slide 4.

### G5 — Regressões, evidências e entrega

1. Testes unitários dos seletores e matrizes; testes de contrato para preview/PDF/PPT, estados da página 41, remoção 59–60, legenda 65–66, tipologias e universos 2T2026/4T2025. Testar `npx vitest run src/features/panorama-secovi-fiergs`, `npx tsc --noEmit -p tsconfig.app.json` e `npm run build`; registrar falhas preexistentes separadamente.
2. Gerar estudo novo em 1T2023–2T2026 e regressão 4T2025; comparar exportações com as matrizes e revisar visualmente os slides tocados. Validar que a parte inicial aprovada pela Juliana não mudou indevidamente.
3. Atualizar documentação técnica, resumo para homologação e documento vivo Rebrain antes de eventual publicação. Fazer commits locais isolados (métricas, preços, composição, documentação) com `git add` explícito. Não incluir o PPTX de entrada nem arquivos de terceiros por engano; **push somente com autorização específica**, pois dispara deploy no Lovable.

**Aceite final:** cada linha da matriz acima possui evidência de correção ou pendência externa explícita; nenhum delta numérico crítico permanece; o material enviado à Juliana distingue o que foi corrigido do que depende dela.

## Texto para o próximo e-mail à Juliana — itens que dependem dela

> Juliana, obrigado pela revisão. Estamos ajustando a Oferta Lançada, os gráficos de preço e a composição das páginas que você sinalizou. Você poderia nos enviar a versão institucional mais recente do slide que hoje informa 22 anos (preferencialmente editável)? No novo consolidado horizontal, a “média” desejada é a de preço por m², ticket ou outra? Se a auditoria mostrar duas metodologias válidas de preço/coorte horizontal, enviaremos a comparação objetiva antes de fechar a versão final.

Não enviar esse texto automaticamente; adaptar após os portões técnicos para perguntar somente o que ainda estiver realmente indefinido.
