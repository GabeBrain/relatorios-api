# Revisão das evidências após reanálise — 13/10/2026

**Estado: revisão técnica concluída para o recorte abaixo; correções de produto e vereditos no banco não executados.** Push autorizado de `1573258`/`b159c3c` concluído, origin/main 0/0 antes desta revisão. Nenhuma IA nova, gasto adicional ou alteração de status/veredito. Documentos FIERGS locais preservados.

Entradas: snapshots dos três estudos após [reanálise autorizada](./REANALISE_ORCAMENTO_2USD_2026-10-13.md), texto nativo dos PPTX pareados e nove PNG públicos persistidos. [Manifesto visual com URLs, hashes e decisão](./calibracao/automacao/review-images-2026-10-13.json). Não extrapolar este recorte para os 53/49/32 registros ou precisão global.

## Falsos positivos confirmados

- **SJC VAP s70, `iatxt-70-spelling-1p3nh6a`:** “Concorrentes Compactos” tem concordância correta; é título descritivo. Acusação exige continuação/conclusão e contexto para Pátio São José, sem demonstrar erro linguístico. FP semântico, evidência nativa literal confirmada. A presença do trecho no slide não valida a acusação.
- **CJ s45, `iavis-format-34bf9eac86`, e s56, `iavis-format-5039684ae6`:** os PNG mostram limite superior **R$ 36.511,00**; cache/alerta dizem **36.511,01**. Dois FP de OCR confirmados. Não relaxar globalmente a regra de limites nem tratar ambas as leituras como verdade.
- **VAP s31, `iavis-pct-9767fb66f7-0`:** imagem mostra Até 6 km: **6.614**, total **45.835**, percentual **14,4%**. Cálculo 14,430% fecha. Cache usou **19,2%**, pertencente à coluna SP. FP por associação entre coluna e percentual, não erro da tabela.

São **quatro registros confirmados FP** neste recorte (um textual, três visuais). Proposta de adjudicação; não escritos como FP no banco nesta sessão.

## Alertas sem fundamento suficiente / editoriais

- **VAP s142** acusa “vocacional” separado do restante dos títulos; **v2 s99/s100/s104** acusam a capitalização da mesma palavra. O texto nativo é rótulo de sumário, não contém grafia incorreta. Recorte textual não comprova defeito visual nem convenção obrigatória de caixa. Quatro registros sem evidência suficiente para erro automático; requer layout/regra editorial para qualquer decisão diferente.
- **v2 s87, `iatxt-87-spelling-9grnbp`:** “Identificação do terreno e determinação da Z.I.” não apresenta a falta de concordância alegada. FP semântico proposto. **`iatxt-87-spelling-qklo0a`** trata “mercado imobiliário” em minúscula como erro sem demonstrar convenção; editorial não comprovado.
- **VAP s134:** a frase “sustenta a recomendação...” começa em minúscula depois de um bloco de tópicos. Texto sozinho não resolve se é continuação da oração “O conjunto das evidências...” ou nova frase. Não adjudicar automaticamente.

Não usar lista de palavras como filtro global; poderia ocultar erros reais em outro contexto. Requerer erro/correção específica e plausível, separando ortografia de preferência visual.

## Erros verdadeiros e redação ruim de cartões

Texto nativo confirma **OBSERTÓRIO** (CJ s65–68), **Avalição** (CJ s131), **são esperado** (CJ s23, VAP s24, v2 s22), **uma uma** (VAP s125), **Shor Stay** (VAP s126/s127), **um custos** (VAP s135), **São José dos Campo** (VAP/v2 s7), **A cidade ... é conhecido** (v2 s12), **Churrasqueria** (VAP s101/v2 s75). Preservar esses alertas. Cartões “erro na palavra Avaliação/short” nomeiam a forma correta, mas a evidência mostra o erro: melhorar a redação sem descartar o achado.

**v2 s9:** texto nativo contém “Estrada Municipal Joel de Paula” e “Estrada Municipal Joel de Paiva” no mesmo slide. Há inconsistência real entre nomes; a revisão não determina qual é o nome oficial. Alertar a divergência interna com os dois trechos, sem inventar correção de nome próprio.

**CJ s149:** “espera-se maiores taxas” justifica revisão de concordância, mas o cartão a chama nominal quando é verbal. Erro útil, classificação/redação a corrigir.

**CJ s41, PNG:** “Abaixo de R$ 27.511,00” sobrepõe “R$ 27.320,01 a R$ 36.511,00”. Alerta de faixas real; imagem comprova o problema. **VAP s73:** anos **2.023/2.024/2.025** com ponto estão escritos sob Ano Lançamento; preservar controle positivo da regra ano/quantidade. **VAP s76/v2 s60:** **Arté 35 m²** aparece no cabeçalho; preservar erro literal.

## Duplicatas e achados antigos sem revalidação

**CJ s23:** `iatxt-23-spelling-1rymahj` e `iatxt-23-spelling-nzaj8a` descrevem o mesmo “são esperado”, um cita duas palavras e o outro a frase inteira. **CJ s68:** `iatxt-68-spelling-17y5cgv` e `iatxt-68-spelling-17o4xso` descrevem o mesmo OBSERTÓRIO na fonte. Dois pares de duplicatas no mesmo slide; preservar um problema com os trechos relacionados, sem apagar histórico. OBSERTÓRIO em slides diferentes e Shor Stay s126/s127 são ocorrências distintas, não duplicatas a suprimir.

Achados antigos **CJ s12 `iatxt-12-spelling-13khwc0`** e **VAP s12 `iatxt-12-spelling-10w0xzm`** não encontram a frase acusada no texto nativo do slide atual; busca nos SVG do pacote também não encontra os trechos. CJ s12 contém ofertas de revenda, VAP s12 legenda do entorno. Não regenerados como novos na rodada, mas ainda persistem: a fase textual não encerra antigos com o mesmo mecanismo da visão. Marcar como evidência desatualizada/não conferida, não como erro atual comprovado. Possível contexto em imagem não foi integralmente renderizado nesta revisão; evitar acusação de “alucinação comprovada do deck inteiro”.

## Somas: preservar divergência, corrigir leitura e exigir escopo

**VAP s28/v2 s26:** PNG de renda mostra oito valores SP somando **15.019.248**, contra total **16.256.029**; diferença **1.236.781**. Há divergência visual observável. No cache VAP, último valor **9.947.578** foi lido como **4.947.578**, produzindo acusação incorreta **10.019.248 × 16.256.029**. Portanto não é FP integral: preservar a divergência, corrigir a explicação e conferir faixa omitida/escopo no original. Não sugerir trocar o total para o valor do OCR.

CJ s41/s45/s56 são tabelas grandes com cabeçalhos multicamadas. Nesta revisão os nove PNG cobrem cabeçalhos, controles e duas somas; **não adjudicam todos os 14/7/2 slides de soma insegura** nem os 28/26/13 encerramentos automáticos da rodada. Aviso “não conferido” não prova que a tabela passou. Precisamos de transcrição conferida/cálculo por coluna para completar esse aceite; reduzir a contagem de erros não comprova melhora.

## Próxima implementação recomendada, sem nova IA por enquanto

1. Gate obrigatório de custo na reconferência antes de texto/visão pagos, preservando o DET gratuito.
2. Rechecagem textual: revalidar evidência de achados legados no slide atual; agrupar duplicatas no mesmo slide/tipo/trecho, preservando ocorrências em slides distintos e histórico humano.
3. Validação do conteúdo da acusação: evidência literal é necessária, mas não suficiente. Exigir correção linguística plausível; separar preferência de caixa/layout. Congelar Concorrentes Compactos/Identificação como negativos e os erros literais acima como positivos.
4. Casos OCR: ancorar porcentagens por coluna e não confiar em literal sem correspondência à imagem. Usar os três FP visuais como negativos e renda/faixas/ano/Arté como controles; nenhum relaxamento global de soma/tolerância.

Revisão técnica documentada; implementação/reteste e decisão final de veredito ainda pendentes. Custo novo desta revisão zero. Materiais/transcrições brutos em `.local-inputs/review-20261013/`, ignorados pelo Git; manifesto pequeno versionado. Não houve mudança de prompt/código, novas chamadas pagas, deploy ou alteração no Monday.

Monday: [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102) — `12700802102`.
