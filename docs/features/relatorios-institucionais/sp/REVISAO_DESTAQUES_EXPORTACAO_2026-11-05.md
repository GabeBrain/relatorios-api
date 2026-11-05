# SP — destaques, divisórias, comparação numérica e PowerPoint

05/11/2026 · usuário / Codex. Usuário autorizou publicar junto da otimização da coleta e pediu PPTX editável para enviar o relatório completo à conferência.

## Correções de apresentação e recorte

- Slide9: participação MCMV usa janeiro até o mês de fechamento, como a referência; deixa de usar somente o trimestre. O acumulado12meses continua sendo janela própria, incluindo o fechamento e os11meses anteriores. Meses ausentes não viram zero nem permitem substituir ano por trimestre.
- Slide10: texto separa vendas líquidas MCMV do trimestre, mesmo período do ano anterior, mercado total em12meses e MCMV em12meses. Não atribui o total do mercado ao programa. Redação varia conforme sinal/base da comparação, sem repetir a chamada antiga.
- Slide11: total, variação e empreendimentos continuam calculados; comentários operacionais removidos do conteúdo do slide. Não se afirma recorde histórico completo a partir de37pontos.
- Comentários sobre padrão/API, reconstituição cadastral e vigência não compõem os destaques. A metodologia permanece identificada no diagnóstico. Classificação SP confirmada anteriormente preservada; não há reclassificação para forçar coincidência com a edição antiga.
- Séries trimestrais destacam os mesmos trimestres em cada ano. As divisórias8/12/31/45/49/52/60/65/81 reutilizam a arte original, renderizada em1280×720. Na45, somente o marcador fixo06/2026 foi removido na cópia em memória; fonte não salva. Hashes e origem em assets/divider-sources.json. Artes estáticas não são novos dados observados.

## Divergências comprovadas, sem causa presumida

Valores gerados abaixo foram fornecidos nos prints do usuário, não recolhidos pelo agente:

|Indicador|Original|Gerado no print|
|---|---:|---:|
|Lançamentos MCMV12meses, texto9|127.778|129.529|
|Lançamentos MCMV12meses, gráfico21|127.788|129.529|
|Demais segmentos12meses|52.481|52.781|
|Lançamentos totais12meses|180.269|182.310|
|Empreendimentos12meses|560|574|
|Empreendimentos2T2026|119|131|
|Lançamentos MCMV2T2026, gráfico20|30.291|32.257|
|Vendas MCMV2T2026|29.065|26.443|
|Vendas MCMV2T2025|20.064|20.081|
|Vendas MCMV12meses, gráfico35|106.437|102.159|

O gráfico19 do original fecha180.269; gráfico21 fecha127.788. A diferença52.481 coincide com os demais segmentos citados no texto9, enquanto127.778 do texto difere10unidades do próprio gráfico. O gráfico33 fecha160.142 vendas totais e o35 fecha106.437 MCMV: a chamada de160mil no10 se refere ao mercado total. Além disso, a soma dos gráficos trimestrais do primeiro semestre é59.395/81.202=73,14475%, enquanto texto9 cita73,9% e gráfico22 mostra73,85233%. Registrar inconsistência entre elementos da referência; não escolher um deles como verdade por conveniência.

Diferenças restantes entre fonte atual e referência não foram atribuídas automaticamente a atualização, distratos, filtro ou erro. Não há nova coleta autenticada nem prova mensal da geração do usuário nesta sessão. Correção do recorte e da redação não resolve, por si, diferenças de base.

## Diagnóstico que permite comparar o relatório inteiro

O checklist v1 recebe highlightAudit com numeradores, denominadores, períodos e meses de cada soma, e numericAudit com25séries de tendências e demais dados agregados de tabelas/preços/áreas. Sem token, históricos individuais ou coordenadas/nomes dos projetos de mapa. Exportação disponível para conferência não é aprovação analítica.

O comparador offline `scripts/diagnostics/sp-reference-audit.py` lê o PPTX original e o novo JSON ou o PPTX gerado. Percorre85posições e extrai textos/caches de gráficos. Faz reconciliação por série/período nas25posições de tendências; demais posições ficam como inventário para revisão, sem aprovação numérica automática. Valores monetários exigem revisão explícita da escala/base. O checklist antigo enviado não possui séries: gera85inventários e zero séries comparáveis, com cobertura declarada.

```powershell
python scripts/diagnostics/sp-reference-audit.py --reference <original.pptx> --generated <gerado.pptx-ou-checklist.json> --output .local-inputs/sp-comparacao.json
```

## Exportação de conferência

Botão **Baixar PPTX editável**, com85posições na ordem original, a partir de uma cópia fixa da geração atual. Não dispara coleta GeoBrain nem tenta preencher slides pendentes. Estado disponível/parcial/pendente, textos e valores continuam os da geração. Alteração do relatório ou saída da página cancela o trabalho; não baixa arquivo parcial. BrainLoadingState com etapa/contador real, erro recuperável e cancelamento. A árvore de captura é reutilizada durante o progresso.

Motor PptxGenJS/html-to-image já usado no Panorama; extrator adaptado aos textos SVG do SP. Títulos, rótulos, valores e células dinâmicos são caixas de texto nativas. Artes estáticas, mapas e desenho dos gráficos são imagens; não se promete gráfico nativo com workbook editável. Notas da primeira página incluem SP_AUDIT_JSON com a mesma auditoria numérica do checklist. Assim o arquivo enviado pelo usuário carrega os dados agregados necessários, sem depender de transcrever prints.

## Limites e próximos passos

Gerar o2T2026 após publicação e enviar o PPTX da mesma geração; confrontar diagnóstico numérico, referência e recortes. Não repetir a coleta pesada apenas por abrir/exportar. Homologação, fonte realmente ausente e atualidade das artes institucionais permanecem independentes. Resultado de teste sintético não comprova correção de dados reais. Evidências finais de testes, navegador, Office e publicação ficam no EVIDENCIAS.md e no LIVE Rebrain.
