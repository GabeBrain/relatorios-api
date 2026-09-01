# Matriz terminal — 40 comentários de Juliana no Panorama V3

**Data:** 01/set/2026
**Executor:** Terra
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Fonte:** `panorama-jundiai-2T2026 - corrigido.pdf`, 57 páginas, retorno de Juliana Guimarães
**Objetivo:** transformar cada anotação da analista em requisito verificável e executar esta matriz
junto do plano de universo horizontal da V3, sem perder as correções já concluídas na V2.

## Execução conjunta obrigatória

Este documento não substitui o plano técnico. O Terra deve executar os dois, como uma única tarefa:

1. [`PLAN_TERRA_PANORAMA_V3_UNIVERSO_HORIZONTAL_TERMINAL_2026-09-01.md`](./PLAN_TERRA_PANORAMA_V3_UNIVERSO_HORIZONTAL_TERMINAL_2026-09-01.md)
2. esta matriz `JG-01` a `JG-40`

O plano principal resolve coleta v2, retry, taxonomia, herança histórica, firewall de fontes,
circuit breaker do IVV e manifesto condicional. Esta matriz fecha a revisão editorial e visual
página por página. Um documento sem o outro é entrega incompleta.

## Regras globais de aceite

- Preservar tudo que já foi concluído na V2: fundos oficiais 16:9, capa, sumário/divisórias,
  progresso/ETA, equipe, encerramentos, preview/PDF/PPT espelho e normalização temporal multicidade.
- Aplicar a PRE-026: horizontal significa somente `Condomínio de Casas/Sobrados`.
- Aplicar a PRE-027: padrão de período observado; quando vier produto, herdar o último padrão
  socioeconômico anterior; sem anterior, `Não classificado`.
- Nenhuma correção visual pode mascarar dado indisponível como zero.
- Preview, PDF e PPT espelho devem usar o mesmo modelo, manifesto, textos e geometria.
- Cada ID abaixo termina com uma destas evidências: teste automatizado, screenshot 1920×1080,
  página do PDF gerado ou registro explícito de `not_applicable` porque a lâmina foi corretamente
  suprimida. “Ajustado no componente” sem output final não fecha item.
- A numeração `pN` é a página do PDF comentado pela Juliana, não necessariamente a posição final da
  V3 após a remoção condicional de lâminas.

## Matriz completa

| ID | Página | Comentário convertido em requisito | Implementação/aceite obrigatório |
|---|---:|---|---|
| JG-01 | 4 | Aumentar fonte. | Recalibrar todos os textos dinâmicos desta institucional contra o fundo oficial. No PDF a 100%, título e corpo precisam ser legíveis, sem corte, sobreposição ou redução automática abaixo do restante da mesma família. Screenshot comparativo obrigatório. |
| JG-02 | 5 | Aumentar fonte. | Mesmo contrato de JG-01, verificado especificamente na página 5; não aceitar correção global sem captura desta página. |
| JG-03 | 6 | Aumentar fonte. | Mesmo contrato de JG-01, verificado especificamente na página 6; preservar hierarquia entre título, subtítulo e corpo. |
| JG-04 | 8 | Aumentar fonte. | Mesmo contrato de JG-01, verificado especificamente na página 8; conferir preview e PDF. |
| JG-05 | 10 | Horizontal somente condomínios de casas; corrigir fundos inconsistentes nas colunas de variação; retirar cinza de “Residencial Horizontal”. | Consumir apenas o universo PRE-026. Colunas da mesma função usam o mesmo tratamento visual; branco fica somente onde a semântica editorial exigir. O rótulo horizontal não recebe fundo cinza isolado. |
| JG-06 | 11 | Repetir os ajustes da página 10. | Aplicar integralmente JG-05 na página equivalente e gerar evidência própria. |
| JG-07 | 12 | Confirmar horizontais somente como condomínios; mostrar rótulo `0`; incluir 2T26; fundo branco apenas nos segundos trimestres. | Filtrar PRE-026; configurar gráfico para renderizar zero; eixo contém o fechamento selecionado `2T2026`; regra de fundo identifica trimestre por valor, não por posição. |
| JG-08 | 13 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-09 | 14 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-10 | 15 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-11 | 16 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-12 | 17 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-13 | 19 | Repetir os ajustes da página 10. | Aplicar integralmente JG-05 na tabela/gráfico equivalente. |
| JG-14 | 20 | Repetir os ajustes da página 10. | Aplicar integralmente JG-05 na tabela/gráfico equivalente. |
| JG-15 | 21 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-16 | 22 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-17 | 23 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-18 | 24 | Repetir os ajustes da página 12. | Aplicar integralmente JG-07; teste/screenshot específico. |
| JG-19 | 25 | Metragens iguais ao formato do 1T26; IVV não pode aparecer todo zerado. | Reusar faixas, ordem e labels da referência 1T26. IVV usa dado válido; o `500` de `group_by=Tipologia` abre circuito e vira indisponibilidade explícita, nunca série de zeros. |
| JG-20 | 27 | Mercado horizontal somente condomínios de casas; formatação condicional na última coluna. | Aplicar PRE-026 antes de qualquer agregação. Última coluna usa escala/ícones condicionais da referência e comunica sinal também sem depender só de cor. |
| JG-21 | 29 | Inserir formatação condicional. | Reproduzir regra visual da métrica, incluindo zero/neutro, positivo, negativo, nulo e indisponível; validar claro/escuro, preview e PDF. |
| JG-22 | 31 | Subtotal deve somar lançados após 2024 e ficar depois da linha de 2026. | Calcular somente anos `> 2024`; ordenar anos e inserir subtotal após 2026. Teste com anos anteriores prova que não entram. |
| JG-23 | 34 | Inserir formatação condicional no R$/m². | Aplicar regra ao valor de R$/m², preservando formatação monetária, nulos e fonte. Screenshot e teste de classes/estado. |
| JG-24 | 36 | Inserir formatação condicional no R$/m². | Mesmo contrato de JG-23 na página equivalente, com evidência própria. |
| JG-25 | 38 | Trocar para gráfico de barras e mostrar variação entre períodos. | Usar barras, calcular `atual − anterior` e percentual somente com denominador válido; exibir sinal/unidade, tratar primeiro período e zero anterior sem infinito. |
| JG-26 | 39 | Corrigir subtotal “após 2024” e sua posição. | Mesmo contrato matemático e visual de JG-22, validado nesta tabela. |
| JG-27 | 40 | Corrigir subtotal “após 2024” e sua posição. | Mesmo contrato matemático e visual de JG-22, validado nesta tabela. |
| JG-28 | 40 | Inserir formatação condicional. | Aplicar formatação condicional sem alterar a lógica do subtotal JG-27; evidenciar os dois comentários separadamente. |
| JG-29 | 42 | Inserir formatação condicional. | Aplicar estados positivo/negativo/neutro/nulo/indisponível com acessibilidade e paridade PDF. |
| JG-30 | 42 | Corrigir percentuais “bem errados”. | Identificar numerador e denominador no modelo; percentuais de participação fecham 100% dentro da tolerância de arredondamento e nunca somam médias percentuais. Teste com fixture e total visível. |
| JG-31 | 44 | Inserir formatação condicional e corrigir percentuais. | Cumprir conjuntamente JG-29 e JG-30 nesta página, sem reutilizar percentuais de outro recorte. |
| JG-32 | 45 | Considerar apenas condomínios de casas. | Aplicar PRE-026 no cubo, não no componente. Dossiê lista IDs aceitos/rejeitados e a página não recebe loteamentos por nenhuma fonte secundária. |
| JG-33 | 46 | Tabela anual horizontal deve seguir o formato da vertical. | Reusar o mesmo componente/estrutura, colunas, ordem, subtotal, unidades, formatação condicional e estados da tabela vertical; mudar apenas segmento/fonte filtrada. |
| JG-34 | 47 | Não enviar página sem empreendimentos ativos. | Manifesto condicional remove a página antes de numerar sumário/PDF/PPT. Testar zero ativos e ao menos um ativo. Não renderizar página vazia/zerada. |
| JG-35 | 49 | Incluir condomínio de casas, se houver, após o subtotal Vertical. | Ordem fixa: linhas verticais → subtotal Vertical → condomínios aceitos → total geral aplicável. Se não houver aceito, não criar linha vazia. |
| JG-36 | 51 | Remover textos sobre loteamentos e a expressão “API GeoBrain”. | Narrativa usa “Condomínio de Casas” e linguagem de mercado; busca automatizada no output não encontra `loteamento` nem `API GeoBrain` nesta página. Fatos continuam rastreáveis no dossiê técnico. |
| JG-37 | 52 | Não considerar loteamentos; escrever “2 Dormitórios”, não número `2` solto. | Aplicar PRE-026 e helper editorial singular/plural (`1 Dormitório`, `2 Dormitórios`); proibir label numérico isolado. |
| JG-38 | 52 | Preços precisam bater; não fazer média de horizontal com vertical. | Calcular preço/ticket/R$/m² por segmento separadamente, com ponderador e fonte explícitos. Total combinado não pode ser apresentado como preço médio. Testes provam separação. |
| JG-39 | 53 | Mapa GeoBrain não carregou. | Só incluir mapa quando token Mapbox válido e coordenadas carregarem. Em erro, estado humano e ação de retry; para exportação homologada, página só entra após markers/tiles prontos. Sem token, manifesto suprime a página ou bloqueia exportação conforme decisão vigente, nunca envia mapa quebrado. |
| JG-40 | 56 | “Foto do Consultor” apareceu sem foto. | Com foto válida, renderizar imagem e alt. Sem foto, usar estado visual aprovado sem texto-placeholder, ícone quebrado ou espaço de imagem fingindo conteúdo. Conferir equipe/consultor no PDF. |

## Portões transversais

### Fontes — JG-01 a JG-04

Juliana não determinou um tamanho numérico. Portanto, o Terra não deve inventar um único `font-size`
global. Deve calibrar cada papel tipográfico contra a referência institucional e entregar:

- captura 1920×1080 das quatro páginas;
- PDF visto a 100% com texto legível;
- nenhuma caixa com overflow, clipping ou redução automática distinta entre páginas equivalentes;
- Montserrat para headings e Source Sans 3 para corpo, conforme Design System;
- teste visual que impeça regressão para o tamanho anterior.

### Formatação condicional — JG-20, JG-21, JG-23, JG-24, JG-28, JG-29 e JG-31

- Centralizar regra semântica por métrica; não espalhar comparações numéricas nos componentes.
- Definir explicitamente positivo, negativo, neutro, nulo e indisponível.
- Cor não pode ser o único sinal: usar valor, sinal, ícone ou texto.
- Preview e exportações devem preservar o mesmo estado.

### Percentuais e preços — JG-30, JG-31 e JG-38

- Registrar fórmula, numerador, denominador, ponderador e recorte no dossiê.
- Participações fecham 100% com tolerância apenas de arredondamento.
- Taxas e preços não são somados; médias ponderadas exigem peso compatível.
- Vertical e Condomínio de Casas permanecem separados.

### Páginas condicionais — JG-34 e JG-39

- A decisão de incluir página acontece no manifesto, antes do sumário e da paginação.
- Preview, PDF e PPT espelho precisam ter exatamente a mesma quantidade e ordem.
- Página suprimida recebe evidência `not_applicable` no checklist, não screenshot vazio.

## Cenários mínimos de homologação

1. **Jundiaí · 2T2026:** nenhum horizontal aceito; JG-34 prova supressão; gráficos não exibem
   loteamentos; 2T26 aparece nos blocos aplicáveis.
2. **Praia Grande · 2T2026:** seis condomínios aceitos; JG-05/JG-07/JG-20/JG-32/JG-35/JG-38
   demonstram o universo filtrado e a herança histórica.
3. **Baixada multicidades:** IVV por tipologia indisponível sem zeros; demais nove séries seguem;
   mapa só entra se carregado.
4. **Campinas ou Ribeirão Preto:** empreendimento aceito apenas pelo histórico prova que a regra não
   depende de `standard` atual nem nome comercial.
5. **Fixture visual controlada:** positivos, negativos, zero, nulo e indisponível para todas as
   formatações condicionais; percentuais fechando 100%; subtotal com anos antes/depois de 2024.

## Checklist de evidências do Terra

- [ ] tabela `JG-01` a `JG-40` preenchida com status e caminho da evidência;
- [ ] screenshots das páginas institucionais 4, 5, 6 e 8;
- [ ] screenshots de cada família de gráfico/tabela repetida;
- [ ] PDF Jundiaí sem bloco horizontal e PDF Praia Grande com seis aceitos;
- [ ] PPT espelho com a mesma paginação do PDF;
- [ ] dossiê com universo, herança, fórmulas, exclusões, retries e circuit breaker;
- [ ] busca textual negativa para “loteamento” e “API GeoBrain” nas narrativas Secovi;
- [ ] mapa e consultor verificados nos estados com/sem recurso;
- [ ] testes da feature, typecheck, build, browser QA e `check:live-docs` aprovados.

## CTA único para o Terra

> Execute como uma única tarefa terminal o
> `PLAN_TERRA_PANORAMA_V3_UNIVERSO_HORIZONTAL_TERMINAL_2026-09-01.md` e esta matriz
> `MATRIZ_TERMINAL_40_COMENTARIOS_JULIANA_PANORAMA_V3_2026-09-01.md`. Preserve tudo que já funciona
> na V2. Implemente primeiro retry/circuit breaker, universo PRE-026, herança PRE-027 e firewall de
> fontes; depois feche individualmente JG-01 a JG-40. Não marque comentário repetido como concluído
> sem evidência da página correspondente. Disponibilize a V3 ao lado da V2 para homologação, gere os
> cenários Jundiaí, Praia Grande e Baixada, e entregue preview, PDF, PPT espelho, dossiê e matriz com
> 40/40 evidências. Não promova a V3 a padrão e não faça push sem autorização humana.
