# Fortaleza — prioridade mensal e lançamentos verticais

10/11/2026 · Lucas / Codex · base `03d3301`, main, único origin, fetch atualizado e árvore inicialmente limpa/0–0. PPTX mensal acessível pelo Drive, download local com SHA256 igual ao catálogo. Sem consulta autenticada GeoBrain ou escrita no Monday.

## Entrega desta fatia

Mensal passa a ser o padrão; competência inicial no mês anterior ao calendário atual, inclusive janeiro → dezembro do ano anterior. Mês/ano continuam selecionáveis. Trimestral preservado sem coleta histórica adicional. Modelo editorial de julho/2026 não determina a competência dos números.

| Slide mensal original | Estado |
|---|---|
| 1–10 | Prévia anterior preservada |
| 11 | Empreendimentos verticais lançados na capital, Econômico/demais, 25 meses e acumulado no ano |
| 12 | Pendente: unidades incluindo vertical/comercial/casas; não substituído por vertical |
| 13 | Unidades verticais lançadas na capital, Econômico/demais, histórico e acumulado |
| 14 | Pendente: unidades da RM com identificação de casas; não substituído por vertical |
| 15 | Unidades verticais lançadas nas quatro cidades da RM, mesmo contrato do13 |
| 16–60 | Continuação pendente: valores/INCC, vendas, oferta, preços, IVV, tabelas, equipe e exportação |

Treze composições implementadas no mensal, não quinze páginas completas nem relatório concluído. Após reforço do Lucas, navegação segue1–15sem saltos:12/14mantêm arte/título próprios e aviso explícito de fonte em preparação. São posições pendentes, não lâminas de dados concluídas. Prioridade é concluir essas duas antes de avançar ao bloco seguinte. Rota continua fora do menu/painel. Base anterior já publicada em03d3301; esta fatia local depende de autorização própria de push.

## Fontes, cálculo e cobertura

- **11:** IDs distintos do cadastro conferido, `release_date`, Fortaleza/Vertical. Não conta unidades como empreendimentos. Padrão desconhecido/ID duplicado bloqueia; horizontal desconhecido não impede este gráfico exclusivamente vertical. Cadastro atual sujeito a revisão, sem comprovar fases/amostra histórica ou equivalência ao início de vendas do analista.
- **13/15:** `/public-api/temporal-analysis-city/releases`, `releases_in_period`, `type[]=Vertical`, `group_by=Padrão`, por município autorizado. RM = Aquiraz, Caucaia, Eusébio e Maracanaú, sem capital. Uma cidade faltante bloqueia RM, preservando capital disponível.
- **Comparativos:**25meses encerrados no mês escolhido. Total compara mês atual com mesmo mês do ano anterior. Econômico/demais comparam janeiro até esse mês nos dois anos. Base anterior zero: —. Demais = os seis padrões conhecidos restantes. Sem reclassificar preços pelo teto editorial do MCMV.
- **Completude:** sete padrões explícitos por cidade/mês, inclusive zeros reais. Mês/grupo ausente, duplicado, desconhecido, número negativo/inválido, recorte incompatível e soma insegura não viram zero ou consolidado parcial. Exigência conservadora ainda precisa ser confrontada com token real.
- **Coleta:**25meses, até3páginas/300linhas por cidade; esperado175linhas/2páginas. Cinco cidades adicionam10requests de histórico à coleta anterior, excluindo retries. Filtros preservados sem seguir URL externa do provedor; paginação/metadados/total conferidos, requests sequenciais e retry transitório existente.
- **Ciclo:** mesma ação consulta histórico, cancelamento compartilhado, nova geração atualiza fontes. Retry reaproveita cidades concluídas da mesma janela/sessão; período/escopo/token invalidam resultado/cache. Falha histórica mantém núcleo municipal e etapa Fontes em atenção. Navegação não chama API.

Insights recolhíveis explicam origem, janela, totais, linhas/requests e bases dos percentuais; não viram nota técnica na lâmina. Arte original sem cifras históricas, SVG dinâmico e Montserrat local. GeoApiScopeEngine/BrainLoadingState/Button/Tabs/Dialog reutilizados, sem novo primitive global ou edição em SP/Secovi/FIERGS.

## Evidências e limites

- Fortaleza89casos e16regressões selecionadas Secovi/FIERGS (reconciliação2T2026/4T2025, lançamentos e vendas):105casos distintos. Primeira rodada104aprovados/1asserção ambígua de interface (mensagem tanto no aviso quanto diagnóstico). Asserção corrigida e arquivo reexecutado5/5. Nenhuma falha funcional residual dessa rodada; não é suíte integral do Panorama. Falha anterior firewall-fontes não reavaliada/corrigida.
- Tipagem/build e lint dirigidos aprovados; avisos anteriores Browserslist/chunks preservados.
- Edge headless com provedores interceptados: mensal padrão, julho/2026, geração automática,11/13/15 em1440/390 claro/escuro, sem overflow horizontal, navegação sem requests, histórico lento Brain, fonte ausente/vazia e cancelamento. `scripts/diagnostics/fortaleza-monthly-visual.mjs`, Vite5179; capturas/resultados ignorados em `.local-inputs/relatorios-lucas/fortaleza/monthly-visual/`.
- Original aberto pelo Office somente em leitura para renderizar e extrair arte11–15, fonte e renders novos inspecionados visualmente.12/14são pendências explícitas na ordem oficial. Estilo aproximado do original, sem equivalência pixel a pixel declarada. Nenhum PPTX Fortaleza novo exportado. Fontes e proveniência em `assets/monthly/README.md`.

Próximo foco mensal: tipagem granular para12/14 e loteamentos; VGL/VGV com índice/base comprovados; vendas/oferta/preços/IVV, demais tabelas e exportação. Amostra/empresas ainda sem fonte própria. Ensaio autenticado delimitado e homologação pendentes; testes sintéticos não comprovam números reais, deploy ou aceite.
