# SP institucional — geração automática e insights

05/11/2026 · Codex, a pedido do usuário · base `93f9bce`, main.

## Comportamento

Após autenticação e seleção de município autorizado, ano e trimestre, **Gerar relatório** executa oito etapas: disponibilidade municipal, empreendimentos, lançamentos, vendas, oferta/IVV, tipologias, históricos detalhados e preparação dos 85 slides. A ordem original e as fórmulas permanecem preservadas. A seleção de ano é dinâmica; trimestre parcial usa somente meses confirmados. Uma nova geração consulta novamente a disponibilidade, permitindo descobrir o fechamento posterior.

Cada etapa mostra situação, mensagem e trabalho efetivamente concluído: fontes, janelas históricas, páginas, empreendimentos processados ou slides conferidos. Não há progresso estimado por tempo nem promessa de duração. Enquanto o volume não foi confirmado, a tela informa essa condição. A etapa detalhada troca explicitamente de unidade ao passar da paginação para processamento local; a porcentagem refere-se à unidade apresentada, não ao tempo restante da geração inteira.

O fluxo reaproveita `GeoApiScopeSelector/useGeoApiScope`, componentes shadcn e `BrainLoadingState`: overlay na consulta municipal inicial e operation nas etapas seguintes, com marca Brain, tempo decorrido e cancelamento. Os dados municipais já ficam acessíveis nos insights durante as demais etapas. A montagem/exportação aparece após o término ou interrupção, com as pendências da geração identificadas; disponibilidade não representa homologação.

**Refinamento visual posterior, 05/11:** a pedido do usuário, o overlay inicial fica contido em um cartão relativo na área do relatório (`position: absolute`). O modal/portal global foi removido: menu e navegação permanecem acessíveis, sem prender foco ou bloquear a tela inteira. Marca Brain, progresso e botão de cancelamento são preservados; consultas e regras não mudam.

## Falhas, cancelamento e retomada

- Falha ou cobertura municipal inválida impede iniciar fontes pesadas.
- Falha nas demais fontes não descarta resultados nem impede etapas independentes. O relatório identifica a fonte indisponível.
- Cancelar aborta a execução e preserva as etapas já concluídas. Retomar usa a mesma sessão; repete etapas interrompidas, não iniciadas ou que falharam. Uma etapa concluída com ressalvas permanece identificada; para atualizar todas as fontes, usar Gerar relatório novamente.
- Quando a oferta falhou, recuperá-la também recalcula os detalhamentos dependentes, reaproveitando os históricos brutos se a coleta anterior foi completa.
- Bairros, áreas, preços e mapas compartilham uma coleta v2. Abrir slides não dispara consultas adicionais. A paginação mantém o limite anterior de três trabalhadores e todas as verificações de cobertura, repetição e cancelamento.
- Respostas de execuções anteriores não podem sobrescrever uma retomada. Trocar trimestre, município, token ou desmontar a página aborta e invalida os resultados. Duplo clique não inicia duas gerações.
- Históricos brutos ficam apenas em memória na sessão; não entram no estado visual nem no checklist. Autenticação não é incluída nos diagnósticos exportados.

## Insights para o analista

Uma aba separa memória de cálculo, cobertura/pendências e diagnóstico técnico. Mantém indicadores com fórmulas, conciliação mensal completa, diferenças por grupo, acumulados anuais e de 12 meses, segmentos confirmados e proveniência dos campos. Esperado = oferta inicial + lançamentos − vendas líquidas; diferença = informado − esperado. Diferenças não são atribuídas automaticamente a distratos ou reclassificações.

Observações técnicas permanecem na área do analista. Ressalvas extensas dos históricos são montadas somente ao expandir, em blocos de 50, evitando milhares de elementos na renderização inicial. As regras numéricas, INCC-DI, bases, sinais e restrições de fonte dos slides permanecem sob os contratos anteriores.

## Verificação e limites

Regressão final: **289 testes em 33 arquivos aprovados** (287 SP e dois de seleção FIERGS), tipagem/build aprovados e lint dirigido sem erros nem avisos nos arquivos novos/finalizados. O build mantém os avisos anteriores de tamanho dos chunks e atualização de Browserslist. Casos específicos cobrem coleta compartilhada, falhas independentes, retomada, reprocessamento dependente, cancelamento inicial e intermediário, bloqueio por catálogo, mudança de autenticação/escopo, duplo clique e callbacks tardios.

Ensaio reproduzível: `node scripts/diagnostics/sp-auto-generation.mjs`. Usa Edge headless e intercepta todas as consultas de negócio com dados sintéticos; autenticação também sintética. Capturas/resultados locais ficam em `.local-inputs/relatorios-lucas/sp/auto-generation/`. O ensaio percorre desktop/celular e temas claro/escuro, respostas lentas, falha independente, cancelamento/retomada e ausência de dados. A implementação não altera políticas Secovi/FIERGS.

Não foi executada consulta autenticada real nem medida nova de tempo da API real nesta rodada. O ganho entregue é a sequência automática e o reaproveitamento de consultas, sem prometer reduzir a latência do provedor. Permanecem pendentes o ensaio real do analista e a reconciliação das divergências numéricas já documentadas no plano de contenção. O novo fluxo foi explicitamente autorizado; substitui a interface manual anteriormente mantida para conferência.

**Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; somente referência, sem escrita no Monday.
