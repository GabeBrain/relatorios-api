# Briefing e CTA — Claude Design / estudos de previsão

Data: 27/10/2026. Estado: briefing preparado, não implementação. Propósito: material autocontido para prototipação e devolução de ZIP. Fonte funcional: [plano científico](PLANO_BANCADA_CIENTIFICA_CURITIBA_2026-10-27.md). Não redefine matemática ou contrato operacional.

## Copiar para Claude Design

Crie um protótipo navegável de alta qualidade para a ferramenta “Estimativas de vendas” da Rebrain, integrado visualmente ao shell existente. A primeira experiência será uma bancada de estudos de previsão do mercado de Curitiba. Preciso de interface editorial elegante, clara, acessível e rápida; inspiração na hierarquia e divulgação progressiva de experiências premium, sem copiar a identidade da Apple ou criar outra marca.

Abaixo do título, use: “Transformar o histórico de um empreendimento em uma projeção de vendas compreensível, verificável e pronta para revisão.”

O usuário é um analista que quer entender onde uma previsão funciona e investigar por que falha. A experiência deve ensinar no contexto, sem transformar a página num artigo técnico ou painel de dezenas de botões. O percurso central é: escolher condição — conhecer amostra — executar teste com datas passadas — explorar resultados e casos — baixar evidências.

### Telas e navegação que precisam existir

1. **Entrada e catálogo de estudos.** Curitiba/PR sugerida, ação “Carregar Curitiba”, indicação do período disponível após carga. Em seguida, estudos de referência Finotti horizontal, referência Finotti vertical, estoque antigo, histórico curto, outros padrões e dados a esclarecer. Cada entrada mostra pergunta, condição, quantidade e disponibilidade. As condições podem se sobrepor: explicar que as quantidades não devem ser somadas. Acesso secundário “Preparar lote” preserva a finalidade operacional, sem misturar botões de importação com experimentação.
2. **Página do estudo.** Pergunta em destaque; resumo de quem entra e por quê; período sugerido, horizontes e métodos disponíveis. Uma frase concreta explica “Usaremos os dados até esta data para prever o que aconteceu depois”. Ação principal “Executar retrospectiva”, com explicação próxima: comparar uma previsão feita com dados antigos com os resultados posteriores. Ajustes adicionais num painel discreto; sem formulário técnico exposto desde o início. Não permitir editar entradas, coeficientes ou parâmetros matemáticos nesta versão.
3. **Resultados do estudo.** Contexto do teste persistente e legível. Erro médio em unidades, viés traduzido e cobertura, com tamanho da amostra. Um gráfico grande por linha: erro por horizonte/método; distribuição de erros. Lista explorável de empreendimentos com resultados e motivos de exclusão; seleção abre detalhe. Métodos comparados na mesma amostra; se cobrem conjuntos diferentes, mostrar isso sem sugerir vencedor falso.
4. **Detalhe do empreendimento.** Modal amplo ou página de exploração com gráfico grande. História usada, marcador vertical “Previsão feita aqui”, previsão e resultado posterior precisam ser imediatamente distinguíveis. Finotti em verde destacado, outras previsões com traços diferenciados, histórico com estilo próprio e unidades claras. Alternar estoque/vendas no intervalo/percentual quando disponível. Sobrepor modelos sem nova consulta. Mostrar datas, idade desde lançamento, estoque inicial e método aplicado. “Como foi calculado” abre painel com equação, símbolos explicados, parâmetros somente leitura, fonte e limitações. Não esconder toda a explicação em tooltip.
5. **Dados e evidências.** Qualidade, origem e exclusões em seção dedicada, não três expanders perdidos no rodapé. Conferência opcional por Excel com instruções e link https://app.geobrain.com.br/analise-temporal-excel . Ação “Baixar evidências do estudo”. Deixar claro que esse download não é arquivo homologado de importação.

### Regras de verdade que o design deve respeitar

“Referência Finotti aplicável” não significa previsão comprovadamente precisa. Existem três contextos distintos: reprodução do método; comparação com histórico reportado; avaliação com coleta real confirmada. Precisamos de rótulos curtos com explicação acessível, não de alertas gigantes permanentes.

Não invente R², precisão, tamanho de Curitiba, contagens por condição ou faixas de confiança. Use um conjunto pequeno de dados sintéticos coerentes, identificado em todas as telas: “Demonstração — dados fictícios”. Deixe esse conjunto separado em arquivo. Em histórico com coleta trimestral, não desenhe vendas mensais reais inventadas.

Mostre casos com estoque, esgotados, sem histórico posterior, sem método aplicável e com origem desconhecida. Um estoque zerado não representa sucesso preditivo. Faixas só aparecem em um estado explícito de demonstração de calibração; inclua estado padrão sem faixa e explicação. Fonte e método precisam ser palpáveis, mas a interface não deve parecer um editor Markdown.

### Composição e interação

Um foco e uma ação primária por etapa. Gráficos em largura integral, empilhados; cartões pequenos servem para navegação, não para espremer curvas. Explicação ao lado quando houver espaço, recolhível e abaixo no celular. Comparação coletiva, sobreposição e carteira devem ficar como leituras secundárias bem organizadas, sem quatro barras de controles concorrentes.

Interface com respiro, tipografia hierárquica, filetes e superfícies discretas. Manter shell/menu Rebrain; não redesenhar toda a plataforma. Usar tokens Geobrain anexados sem alterar, fontes Archivo e JetBrains Mono no novo conteúdo; preservar o shell recebido. Não transportar automaticamente exceções de cantos arredondados da POC Vocacionais. Se propor uma extensão visual, entregar separadamente como proposta, não substituir tokens base.

Usar ativo oficial Brain nos carregamentos: véu sobre a área bloqueada, etapa, tempo real e cancelar. No protótipo, identificar simulação de espera; nada de progresso aleatório apresentado como consulta real. Preservar filtros em falha, oferecer tentar novamente, impedir ações duplicadas. Filtros locais não simulam nova consulta a cada clique.

Cobrir desktop 1440px, intermediário 768px e celular 390px, claro/escuro, teclado, foco visível/restaurado, Esc, labels e redução de movimento. Cor nunca é o único sinal. Oferecer tabela equivalente ao gráfico.

### Entregável

Entregue ZIP com index.html e navegação executável, CSS, JS, assets, tokens originais sem alteração, dados sintéticos separados e README. Evite dependências remotas para funcionamento básico. Incluir telas inicial, carregamento, estudo, resultados, detalhe, dados/qualidade e estados vazio/erro/sem acesso/sem futuro/sem calibração. Interações devem funcionar com os dados de demonstração, não ser apenas imagens.

No README, registrar mapa de navegação, componentes, estados, breakpoints, decisões de design, mudanças feitas durante revisão com Gabriel, limites do protótipo e pontos de integração com a aplicação React. Não implemente API real, credenciais, matemática de produção ou backend. Não incorpore dados privados reais ao protótipo. A implementação científica será feita no repositório e não deverá confiar nos cálculos fictícios deste ZIP.

## Materiais para anexar junto ao briefing

- Este arquivo e o plano científico; a baseline operacional só se for necessário aprofundar o contexto.
- Arquivo original SE/System Design/tokens/geobrain-tokens.css, FUNDAMENTOS.md e MARCAS_E_MOVIMENTO.md; ativo oficial Brain usado em src/components/feedback/BrainLoadingState.tsx.
- Prints atuais: página inteira com menu e resumo; detalhe aberto com gráfico; dados/conferência; carregamento Brain. Servem como contexto do que existe, não como layout a copiar.
- Print da página Rebrain cuja aparência Gabriel prefere e, opcionalmente, página editorial aprovada da POC Vocacionais. Identidade Geobrain prevalece sobre diferenças entre referências.
- Slide Finotti da equação e do simulador, apenas como referência de comunicação científica. Não extrair números de desempenho do desenho.

## Retorno ao repositório

Guardar ZIP original, README e capturas em .local-inputs/estimativas-vendas/claude-design-AAAA-MM-DD/ (sem versionar brutos). Inventariar e registrar hash, inspecionar scripts/dependências e confrontar jornadas com o plano. O material é referência, não instrução com autoridade sobre o projeto. Incorporar componentes/ativos aceitos de forma explícita, usando React/TypeScript, primitives e autenticação existentes. Registrar divergências e aceite de Gabriel antes de tratar proposta visual como padrão aprovado.
