# CTA — expansão e comparação de empreendimentos

**Execução local em 22/10:** bancada e motores implementados; testes, auditoria real e condicionantes de faixas/comercial estão no [resultado da execução](RESULTADO_EXPANSAO_LOCAL_2026-10-22.md). Estado validado localmente, sem push/deploy. O texto de preparação abaixo preserva o protocolo original.

Estado: preparado em 22/10/2026, por solicitação de Gabriel. Executar junto de `PLANO_EXPANSAO_MODELOS_E_FAIXAS_2026-10-22.md`. Esta direção substitui a composição centrada em um único empreendimento; detalhes individuais permanecem acessíveis.

## Direção de experiência

A página abre como bancada de comparação. Priorizar hierarquia clara, espaço, transições discretas e conteúdo progressivo, inspirados na intenção de experiências premium citada pelo usuário. Identidade, tokens e comportamento acessível vêm do System Design Geobrain. Referências externas não autorizam copiar estilos nem criar paleta própria.

- Barra compacta de recorte e resumo: cidade, produto, corte e modelo; filtros avançados recolhíveis. Seleção por busca em painel lateral, com contagem e ações selecionar resultados/limpar, sempre delimitadas ao conjunto carregado. Não selecionar registros ocultos implicitamente.
- Visão padrão: grade de pequenos múltiplos, um gráfico por empreendimento, com origem, previsão, faixa quando calibrada, nome, estágio e condição de dados. Em desktop amplo, duas colunas; três apenas se cada gráfico continuar legível. Em telas estreitas, uma coluna. Cartões não viram miniaturas para caber mais.
- Renderizar inicialmente até 12 gráficos, com paginação explícita e contagem total. Esse limite de apresentação não limita a carteira nem exclui membros do cálculo. Separar membros selecionados de gráficos visíveis; arquitetura de execução em lotes/cancelamento para seleções grandes.
- Modos complementares: Comparar, Carteira e Tabela. Carteira soma unidades dos membros fixados; exibe cobertura e exclusões. Comparação sobreposta aceita até cinco curvas destacadas pelo usuário, com lista/legenda interativa; nunca sobrepor centenas de linhas.
- Comparar por calendário ou idade do empreendimento. Em percentual, usar escala comum de 0–100%; em unidades, comunicar escala comum ou escala própria. Nunca misturar as duas unidades no mesmo eixo. Cortes e horizontes incompatíveis devem aparecer explicitamente.
- Grade usa os mesmos filtros e modelo. Comparações de vários modelos ficam no detalhe do empreendimento ou em seleção reduzida. Preservar nome/modelo/ID e critérios ao trocar de modo.
- Abrir detalhe em Dialog amplo: gráfico grande, metodologia recolhível ao lado, parâmetros, resultados posteriores, qualidade e tabela. Celular usa superfície de tela cheia com rolagem própria. Fechar restaura posição/foco/seleção; Escape, foco contido e título acessível. Evitar modais aninhados. Conteúdo principal permanece navegável sem abrir detalhe.
- Tooltip compartilhado onde os períodos forem comparáveis; seleção de legenda, destaque e alternância de faixas sem depender de hover. Teclado/toque e tabela oferecem acesso equivalente às informações.
- Carregamento Brain: preservar estrutura e seleção; etapa e tempo reais. Véu opaco/desfoque apenas quando a operação bloqueia de fato o contexto, com cancelar quando suportado. Atualizações locais não apagam gráficos válidos nem fingem que dados anteriores já correspondem ao filtro novo. Respeitar redução de movimento e evitar animação de cada ponto em centenas de séries.
- Comunicação curta: “Dados até…”, “Previsão experimental”, “Cenário informado”, “Faixa ainda não estimada”. Detalhes técnicos em painel de metodologia. Estado sem curva mantém cartão com razão e ação útil; jamais some silenciosamente da carteira.

## Comando de execução

> Execute integralmente o plano `docs/features/estimativas-vendas/PLANO_EXPANSAO_MODELOS_E_FAIXAS_2026-10-22.md`, incorporando a direção de experiência deste `CTA_EXPANSAO_MULTIPLOS_EMPREENDIMENTOS.md`.
>
> Recupere AGENTS da raiz SE e do repositório, planejamento vigente, README/MANIFESTO da feature, System Design Geobrain e diretrizes frontend. Confira todos os remotos, sincronize conforme as regras e preserve alterações paralelas. Trabalhe na main.
>
> Comece por classificação dos produtos, idade, periodicidade e linhagem dos dados; implemente retrospectiva reproduzível, referências simples e modelos candidatos versionados. Avance por etapas até a interface funcional de comparação simultânea, carteira e detalhe. Ofereça cenários explícitos quando faltar suporte para previsão. Mantenha o Finotti original como referência; extrapolações e modelos de vertical/comercial recebem nomes, parâmetros e domínio próprios. Não invente categorias/contratos da API ou regras operacionais.
>
> Implemente faixas de previsão de 50%/80% somente quando houver calibração e avaliação independentes; sem amostra suficiente, entregue a estrutura e o estado de indisponibilidade. Execute os testes matemáticos, de contrato, vazamento, retrospectiva, faixas e carteira definidos no plano. Diferencie testes sintéticos, série reportada e observação comprovada no dossiê.
>
> Construa a grade de múltiplos empreendimentos com gráficos legíveis, paginação, comparação normalizada, carteira agregada, filtros responsivos e detalhe acessível. Use tokens existentes, primitives compartilhados e carregamento Brain. Faça inspeção em 390, 768, 1440 e 1920 pixels, claro/escuro, teclado e redução de movimento. Teste 1, 5, 20 e 100 selecionados com dados sintéticos, separadamente do ensaio API real; confirmar desempenho, paginação, soma de membros não visíveis e exportação completa. Não ampliar limites de seleção sem preparar processamento e cancelamento.
>
> Entregue página local funcional, código e parâmetros separados, testes executados, dossiê reproduzível, evidências e lista objetiva de dependências que restarem. Atualize README, LIVE Rebrain, mapa System Design, diário e plano semanal de Gabriel. Registre a diferença entre preparado, validado localmente e produção. Este CTA autoriza implementação e ensaios de leitura; push e deploy da expansão dependem de autorização específica.
