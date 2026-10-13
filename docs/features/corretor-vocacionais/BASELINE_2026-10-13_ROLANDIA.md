# Baseline e handoff — Corretor V3 — Rolândia — 13/10/2026

Primeiro bloco do plano semanal de Gabriel: 2 horas reservadas, dentro de 6 horas na semana. Reserva não é tempo medido. Esta sessão estabelece baseline local e lê produção; não reexecuta IA paga nem altera registros do estudo no site.

## Git, versão e publicação

- Início: `main`, árvore limpa, único remoto `origin`, fetch concluído, `origin/main...main = 0/0`, HEAD `85b0005`. C/D v0.67 pertencem a `35c0656` de 01/10, já integrado em `origin/main`. “Sem commit” no resumo era documentação desatualizada.
- Frontend público: `https://geobrain-relatorios.lovable.app/corretor`, HTTP 200 e página real aberta por Playwright, sem erro JavaScript. Bundles observados: `index-BhsRMaE5.js` e `CorretorV3Page-oi5FefQw.js`. O módulo contém `textos_svg`, `formatos_confirmados` e o checklist de sumários consecutivos: presença de C/D no frontend confirmada. O bundle não fornece SHA Git de build; não atribuir exatamente HEAD ao deploy.
- Backend: resultado real de Rolândia de 02/10 contém `Prsidente` (s9) e `são esperado novos 3.476 domicílios` (s23). Isso comprova revisão textual funcional naquele processamento e esses dois achados; não comprova revisão atual do prompt, modelo efetivamente utilizado ou ID de deploy. Não há acesso de gestão ao backend disponível nesta sessão. `analyze-table-image`, `analyze-ata-image` e `analyze-consulting-suggestion` também permanecem sem versão de deploy identificada. Sugestão de Análise não foi executada.
- Nenhuma Edge Function foi chamada nesta sessão. No browser, chamadas a `/functions/v1/` foram bloqueadas antes da execução. Nenhum achado foi marcado corrigido/ignorado e nenhum estudo criado.

## Caso congelado

Caso compartilhado V02, escolhido por PPTX de 78 slides, 13 Excel brutos, fixture de visão e triagem manual documentada. Toledo fica como regressão: existem dois decks de mesmo nome com bytes distintos no catálogo; não trocá-los silenciosamente.

Insumos existentes sob a raiz SE, sem novas cópias:

- `_UPLOADS_TESTE/Corretor_V3_Rolandia/02_APRESENTACAO_SELECIONAR_DEPOIS/Brain_Vocacional_Vertical_Housi_Av. Castro Alves_Rolandia - PR_v1.pptx`.
- `_UPLOADS_TESTE/Corretor_V3_Rolandia/01_PLANILHAS_SELECIONAR_TODAS/`: selecionar as 13 planilhas xlsx/xlsm.
- SHA-1 PPTX: `736dc564c1dcc68a567c5c37f8a63f3d5857f779`. Igual à versão armazenada do estudo real `50e36e0c-02f3-4224-ab4f-cfb522a26801`. Os 13 hashes das planilhas brutas também coincidem com o inventário da fonte persistida desse estudo.
- Fixture versionada: `src/features/corretor/lib/v3/__tests__/fixtures/rolandia-replay.json`, 44 leituras antigas, fonte derivada antiga. O replay opcional de Excel substitui a fonte em memória pelo mesmo extrator usado pelo upload do app; não modifica a fixture.
- Gabarito humano parcial: triagem slide a slide descrita em `PLAN_v067_rolandia.md` e feedback histórico em `calibracao/feedback-2026-07/`. Não existe ainda um conjunto completo de 21 rótulos adjudicados para calcular recall. O manifesto antigo de agosto pediu versão erro × final; a triagem de outubro é outra evidência, não esse par ausente. Não afirmar cobertura 18/21 nem zero FP geral.

Snapshot derivado pequeno e versionado: [rolandia.json](./calibracao/baseline-2026-10-13/rolandia.json). Contém hashes, baseline antes/depois, fonte inventariada e os 15 achados históricos relevantes; não contém chaves de acesso. HTML, screenshot, respostas brutas e logs locais ficam em `.local-inputs/baseline-20261013/` ignorada.

## Resultado e matriz de revisão

Replay com fonte antiga e depois com Excel bruto: **mesmos 11 cartões**, 32 candidatas, 27/30 tabelas conferidas, 9/16 comparações de fonte iguais e 22/22 cruzamentos iguais. Extração bruta: 13 arquivos, 15 blocos, aviso de cobertura parcial de absorção. Bases/revenda/locação/lazer/anúncios são inventariados, não integralmente confrontados por este extrator.

Produção, resultado salvo de 02/10: 15 registros de achados; UI mostra 13 para revisar e dois itens de comunicação. 29/30 tabelas-imagem e 36 tabelas nativas conferidas, 9/18 valores de fonte iguais e 22/22 cruzamentos iguais. Custo acumulado histórico US$ 0,2506, não custo novo. Não comparar as contagens como se fossem passes equivalentes: replay exclui revisão textual ao vivo e cobertura da ata e utiliza leituras antigas.

| Evidência / caso esperado | Replay com Excel bruto | Resultado salvo no site | Avaliação da baseline |
|---|---|---|---|
| s23 PR 4.216.017 × 4.216.107 e unidade Brasil hab. × dom. | ambos detectados | ambos detectados | acertos anteriores preservados |
| s32/s33 verticalização 5,7% × 5,16% | um cartão agrupado | um cartão agrupado | acerto preservado |
| s17 950 km em 3 min | detectado | detectado | acerto preservado |
| raio acumulado menor: aluguel s34 e apartamento na fonte | detectados | dois achados na fonte | divergência de procedência a revisar, problema não ignorado |
| Boulevard s55/s52 R$ 5.120/m² em faixa errada | Provável | não consta nos 15 registros | omissão confirmada no conjunto salvo, causa ainda não identificada |
| `Prsidente`, `são esperado` | passe textual não executado | dois achados com evidência literal | sucesso histórico de texto observado; não mensuração nova de E10 |
| s37 espaço duplo em valor | não consta | detectado | diferença entre leituras antigas e produção; revisar imagem antes de adjudicar |
| s67 `//` conhecido como FP | ausente | ausente | FP anterior não reaparece nos conjuntos observados |
| seção 02 Sociodemografia acusada vazia | falso alerta antes da correção | falso alerta visível no site | FP confirmado: população/renda/domicílios presentes e classificados SOCIO |
| seções 04/05 e s78 vazio | alertas mantidos | alertas presentes | aceite humano da ausência real ainda pendente |
| anos e formatos s22/s23/s36; soma mesclada s45; SVG s61 | lacunas já registradas | sem achados correspondentes no conjunto salvo | candidatos a omissão pela triagem anterior; não declarar tabela lida como cobertura |

## Correção prioritária executada

v0.67.1 local: o checklist passa a reconhecer Sociodemografia quando slides de conteúdo classificados `SOCIO` têm métricas próprias de população, domicílios, renda ou moradores. Não depende do título literal do capítulo. Sumários ficam fora dessa prova. Uma menção de população em slide `MERCADO` continua insuficiente.

Rolândia: três seções supostamente vazias passam a duas (04/05). Os outros dez achados são integralmente idênticos; o cartão estrutural permanece. Regressão com fixtures existentes: Toledo 5, CJ 10, SJC VAP 7, SJC v2 8; linhas dos quatro estudos iguais às de 01/10. A correção está validada localmente, ainda não publicada nem verificada em produção.

Validação: 21 testes focados (estrutura, Rolândia e ingestão Excel), cinco replays, `npm run typecheck`, lint dos três TypeScript alterados e `npm run build` passaram. Build tem avisos conhecidos de browserslist/chunks. Não executada suíte global nesta sessão.

## Reproduzir com Lucas

Na raiz `relatorios-api`, com dependências já instaladas, execute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/corretor-baseline.ps1
```

Para outro caminho de insumos, forneça `-InputRoot` com a pasta `Corretor_V3_Rolandia`. Para preservar rodadas separadas, use `-Output .local-inputs/minha-rodada/rolandia.json`. O script confere PPTX/pasta Excel/fixture, restaura variáveis ao terminar e não cai para consulta ao banco quando a fixture fornecida está ausente. Compatível com o nome Rolândia no PowerShell Windows.

Esperado após correção: 11 achados, 27/30 tabelas, 9/16 fonte, 22/22 cruzamentos; somente seções 04/05 no alerta dinâmico. Conferir o snapshot antes/depois. O roteiro não revalida IA textual, extração da ata, persistência nem upload pelo navegador.

Para revisão humana agora, abrir o estudo salvo Rolândia de 02/10 em `/corretor`; não apertar reanálise para apenas consultar. Revisar as linhas da matriz usando PPTX e Excel pareados. Um estudo novo no mesmo banco pode reutilizar visão por hash; não é necessário ambiente separado para esse reteste funcional.

## Próximo bloco e critérios de avanço

1. Prioridade de cobertura: esclarecer Boulevard ausente no site e tabelas pequenas s22/s23/s36. Começar por leituras já existentes de produção, se disponíveis, para comparar com a fixture; não acionar LLM automaticamente. Preservar os três cruzamentos de fonte já detectados e os quatro replays de regressão.
2. Identificar revisão do backend por registro de deploy ou resposta de gestão, incluindo `analyze-text-batch` e `analyze-table-image`. Resultado de 02/10 não prova a versão da função de hoje.
3. Fechar gabarito humano por problema: real/FP/editorial/indeterminado, slide, evidência e correção esperada. Só então calcular omissões e precisão/recall com denominador explícito.
4. Se nova visão/texto for necessária, apresentar número de imagens/slides, modelos, tokens estimados, máximo orçado e o que o lote precisa resolver. Custo novo desta sessão: zero chamadas pagas; não há lote novo autorizado.
5. Enviar a correção local após autorização de push; retestar o checklist no site. Concluir um caso completo de upload → Excel → IA → achados → revisão → saída antes de declarar a meta semanal cumprida. Handoff preparado não representa acordo de execução de Lucas.

Monday (somente referência): [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102). Nenhuma escrita no Monday nesta sessão.
