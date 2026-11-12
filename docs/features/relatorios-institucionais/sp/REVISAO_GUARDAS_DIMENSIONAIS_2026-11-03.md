# SP — revisão das guardas por dimensão

03/11/2026 · Codex, solicitado pelo usuário após o diagnóstico do slide39.

## Resultado

A igualdade por padrão estava embutida na validação comum de cada fotografia de estoque. Por isso, diferenças entre o cadastro e a série municipal podiam impedir preços gerais, dormitórios, coortes e mapas que não usam padrão. A tabela51 também exigia igualdade de todos os sete padrões, embora só distinga Econômico/MCMV nas faixas pequenas. Corrigida a dependência: total e integridade são comuns; classificação é exigida no recorte que a utiliza.

Não comprova que a API esteja errada ou que tenha ocorrido reclassificação. Os valores do usuário no39 totalizam38.658 nas duas fontes; os testes adicionais abaixo simulam divergências para verificar a regra geral.

## Mapa da revisão

| Slides | Conferência aplicável e decisão |
|---|---|
| 1–12,49,52,60,65,81–85 | Conteúdos editoriais/divisórias e destaques derivados dos mesmos resultados municipais/contagem. Nenhuma reconciliação cruzada por padrão removida. |
| 13–17 | Contagem de empreendimentos por identidade/data original, separada das unidades; recortes classificados dependem da classificação. Sem igualdade artificial entre número de projetos e unidades. |
| 18–22,26–30,32–36,40–44,46,50 | Séries municipais históricas e monetárias. Preservadas cobertura, valores, janela, releitura da mesma fonte e respectivos padrões. Diferença entre duas leituras do mesmo endpoint pode significar mudança de snapshot; não deve ser confundida com classificação cadastral de outra fonte. INCC ausente continua impedindo a correção monetária, sem bloquear unidades. |
| 23,37,47 | Tipologias: períodos/fontes completos e totais contra município; não exigem coincidência entre nomes de tipologia e nomes de padrão. |
| 24,38,48 | Comparativos por segmento realmente usam classificação; guardas mantidas. |
| 25 | Bairro de lançamento: cadastro íntegro e unidades contra total municipal, sem comparar cada bairro a um padrão. |
| 39 | Correção anterior preservada: trimestre e cada mês conferidos; padrão divergente vira ressalva. Sem bairro só quando todos os movimentos/coberturas comprovam zero. |
| 51 | Total e fluxos mensais, estoque de abertura/final, área e Econômico/MCMV necessários. Distribuição dos outros seis padrões não impede a tabela. Estoque intermediário não exige classificação que a tabela não apresenta. Fluxos MCMV divergentes continuam impeditivos. |
| 53,54,56,58,59 | Preço geral/por dormitório: fotografia completa e estoque total conferido, preço/área/dormitórios quando usados. Discrepância apenas por padrão deixa ressalva e não apaga a média. |
| 55,57 | Excluem MCMV: além das guardas de preço, exigem conciliação do Econômico em cada fotografia. Outros padrões podem divergir entre si sem impedir esse recorte. |
| 61,62 | Cada padrão é conferido individualmente. Apenas categorias divergentes ficam sem média; categorias conferidas e média geral são preservadas. Gráfico pode mostrar só a média geral quando todas as categorias estão pendentes. |
| 63,64 | Médias gerais por dormitório não dependem de padrão. Divergência no Econômico retira somente MCMV/MAP; gráfico geral permanece, checklist parcial. |
| 66,67,68,72,73,74,75,76,79,80 | Coortes, mapas gerais/preço/VGV, dormitórios, metragem e estágios por tipologia usam estoque total conferido. Mantêm guardas próprias de área, estágio, capacidade, preço e coordenadas, sem veto genérico por padrão. |
| 69,70,71,78 | Mostram padrão; discrepância da classificação continua impeditiva, em renderizador e checklist. |
| 77 | Mostra segmentos: compara os quatro grupos agregados. Troca de padrões dentro do mesmo segmento não impede; troca entre segmentos divergente continua impeditiva. |

## Transparência e integridade

- Página reutiliza Alert e detalhes recolhidos para mostrar competências/categorias e valores divergentes, sem novas consultas ou automação.
- Checklist/JSON distingue disponível com ressalva, parcial e bloqueado. Renderizadores usam a mesma decisão dimensional para evitar checklist disponível com slide bloqueado, ou o inverso.
- Nenhuma tolerância numérica, rateio, estimativa, zero presumido ou dado descartado. Identidades/conflitos, escopo, cobertura, estoque ausente, totais diferentes e medições incompletas continuam protegidos.
- Outros motores e a automação geral adiada pelo usuário permanecem fora desta alteração.

## Validação e limites

251 testes SP/21arquivos aprovados, incluindo sete regressões dimensionais. Simulações cobrem troca Alto/Luxo no mesmo segmento, Econômico/Compacto entre segmentos, divergência de vendas fora do Econômico, estoque intermediário, total diferente, valor ausente e média geral isolada. Semântica dos renderizadores e checklist testada. Uma primeira execução concorrente excedeu5s na renderização de28slides; execução final completa com dois workers e timeout15s passou, sem mudar os testes do produto.

Tipos completos, lint dirigido e build aprovados (build final exit0). Um redirecionamento PowerShell tratou avisos de stderr como erro; execução direta confirmou o código de saída. Avisos anteriores de tamanho de chunks/Browserslist permanecem.

Edge local1440/claro, modo dirigido22posições, mais cenários específicos: visões gerais disponíveis, mapas/tabelas por padrão bloqueados, MCMV/MAP parcial com preço geral presente. Três capturas inspecionadas: `dimensions-general-price-available.png`, `dimensions-pattern-map-blocked.png`, `dimensions-bedroom-mcmv-partial.png`. Parciais, múltiplos períodos/2027, cancelamento/retry, falha/vazio e mapas também passaram. Zero erros de página, zero chamadas GeoBrain reais;48respostas Mapbox200. Fontes de mercado simuladas; não é ensaio autenticado ou homologação. Logs e capturas em`.local-inputs/`, fora do Git.

Reteste no token real e observação do deploy continuam necessários. Nenhuma confirmação de que todos os slides terão fonte suficiente no período real; a correção remove dependências indevidas, sem garantir disponibilidade artificial.
