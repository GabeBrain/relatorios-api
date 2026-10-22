# Estimativas de vendas — Finotti / SID / Geobrain

**Atualização vigente — Goiânia e Drive Finotti, 22/10:** [inventário, metodologia e revisão da bancada](REFERENCIAS_FINOTTI_DRIVE_2026-10-22.md). Referência completa horizontal/vertical com cauda e faixas originais reproduzidas; API com até oito chamadas paralelas, seleção automática, histórico preservado e modelos preparados juntos. Página local contra API real: 641 cadastros, 640 projeções automáticas e gráficos em 16,18s; 185 no suporte Finotti, demais com ritmo recente quando disponível. Isso não prova precisão observada nem cobertura das faixas nessa cidade. Rastreabilidade em [evidências agregadas](EVIDENCIAS_GOIANIA_FINOTTI_2026-10-22.json). Alteração atual local, sem push/deploy; expansão anterior enviada até `88dd256`. Estados anteriores abaixo são históricos.

**Estado local em 22/10 — expansão executada:** bancada de comparação simultânea, carteira, detalhe, Horizontal/Vertical, motores experimentais e retrospectiva implementados. [Resultado, testes e limites](RESULTADO_EXPANSAO_LOCAL_2026-10-22.md) e [evidências agregadas](EVIDENCIAS_EXPANSAO_2026-10-22.json). Sem push/deploy da expansão. Faixas reais permanecem sem promoção; a estrutura estatística foi testada, mas a calibração reportada não sustenta a sombra na interface. As atualizações anteriores abaixo são histórico.

Pacote inicial de contexto técnico e continuidade, preparado em **21/10/2026** por Gabriel/Codex.

**Estado em 21/10: motor horizontal e ensaio retrospectivo em memória preparados localmente.** O exemplo 300/150/6 foi reproduzido matematicamente. Não há rota, arquivo Geobrain importado, comparação em base real ou homologação.

**Atualização em 22/10:** o pacote e o motor já estão em `origin/main`; acesso autenticado somente leitura à API confirmado em Fortaleza e Blumenau. O [plano do dossiê e simulador](PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md) registra qualidade da fonte, cortes retrospectivos e gates da interface. Gabriel/Codex conduzem esta frente; Edgar apoia dúvidas de acesso/contrato em paralelo. Nenhum backtest real ou tela foi entregue nesta atualização.

## Ordem de leitura

1. [MANIFESTO.md](MANIFESTO.md): objetivo, escopo, responsáveis, metodologia, arquitetura, evidências e pendências.
2. [FONTES_E_DECISOES.md](FONTES_E_DECISOES.md): reunião19/10, email21/10 e regras anteriores registradas no Monday.
3. [fontes/EXTRACAO_PPTX_2026-10-21.md](fontes/EXTRACAO_PPTX_2026-10-21.md): texto e dados nativos dos gráficos do PPTX recebido.
4. [CONTRATO_E_VALIDACAO.md](CONTRATO_E_VALIDACAO.md): contrato candidato, lacunas e critérios do primeiro teste.
5. [CTA_NOVA_SESSAO.md](CTA_NOVA_SESSAO.md): texto para iniciar a conversa técnica.
6. [REPRODUCAO_E_HANDOFF.md](REPRODUCAO_E_HANDOFF.md): resultado numérico, limites do motor e recorte revisável para Edgar.
7. [PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md](PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md): sondagem autenticada, plano estatístico e interface de testes.
8. [PLANO_PAGINA_EDITORIAL_API_2026-10-22.md](PLANO_PAGINA_EDITORIAL_API_2026-10-22.md): execução técnica da primeira página funcional só por API, com visual editorial, seleção individual/carteira e exportação de revisão.
9. [CTA_IMPLEMENTACAO_PAGINA_API.md](CTA_IMPLEMENTACAO_PAGINA_API.md): comando para iniciar essa implementação.
10. [AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md](AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md): estrutura e limites do Excel real da Análise Temporal, consulta ao manual Geobrain e contraste de escopo com a API.

## Onde avançar

Repositório: `Relatorios API/relatorios-api`, dentro da raiz SE. Motor, ensaio e interface em `src/features/estimativas-vendas/`; rota `/rebrain/estimativas-vendas` criada. A integração de retorno ao Geobrain continua em aberto.

Fontes brutas locais: `.local-inputs/estimativas-vendas/2026-10-21/`, na raiz do repo. Contém PPTX, cópia do manifesto de integridade, extração JSON e transcrição do corpo do email. O diretório já é ignorado pelo `.gitignore`. Um clone remoto recebe os derivados/documentação, mas precisa receber o PPTX local separadamente.

Exportações Geobrain recebidas em22/10 e preservadas em `.local-inputs/estimativas-vendas/2026-10-22-geobrain-temporal/`, com hashes na [auditoria](AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md): `relatorio_analitico.xlsx` é relatório agregado da Análise Temporal; `empreendimentos_export_22-10-2026T10_37_55.xlsx` é cadastro de204 verticais. Nenhum contém base horizontal por competência/flag ou contrato de retorno. O manual da plataforma pode ser consultado no repo `Assistente IA - Linkages/manual-assistant-web/content/manual/`.

Antes da implementação, ler `AGENTS.md` do repo e da raiz SE. Manter `docs/projetos/LIVE_rebrain.md`, diário pessoal e plano semanal de Gabriel atualizados. UI nova exige System Design Geobrain e diretrizes frontend do repo. Filtros/API geográficos devem seguir GeoApiScopeEngine. Não criar AGENTS/CLAUDE paralelos para substituir essas regras.

## Próxima entrega

Implementar a página editorial por API conforme o plano novo, mantendo o resultado exploratório quando a origem por competência for desconhecida. A [terceira exportação auditada](AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md) traz IDs de empreendimento/tipologia, venda líquida e estoque: 124 tipologias horizontais conciliaram por ID com a API em 09/2026; os totais dos oito fechamentos trimestrais também bateram com a Série Histórica. Ela serve de controle do adaptador, mas não contém `bases.estimation` por competência nem formato de retorno. `bases.ivv_batch_id` só rastreia atualizações IVV em lote, conforme resposta de Evandro encaminhada por Diego. Parâmetros, motor, leitura API, validação de exportação, futura importação/exportação operacional e interface são camadas separadas. Intervalos estatísticos e modelo vertical ainda pendem. O PPT não comprova qualidade na base corrente nem autoriza retorno automático ao Geobrain.

**Curitiba reforça a entrada direta por API:** outra exportação detalhada conciliou os 371 empreendimentos/693 tipologias horizontais e todas as 14.154 vendas líquidas e 14.154 posições de estoque numéricas comparáveis entre 11/2024 e 09/2026. Há valores na API onde o Excel mostra `-`, e um vertical da planilha ausente na API; portanto a auditoria de cobertura e a origem por base/período continuam pendentes. A interface horizontal não precisa de download manual para executar o cálculo. Ver [auditoria e limites](AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md).

**Direção de interface de Gabriel em 22/10:** a primeira página usa API como fonte e oferece, desde a v1, escolha **opcional** de Excel da [Análise Temporal Excel](https://app.geobrain.com.br/analise-temporal-excel) para conferir valores por ID/competência localmente. A tela comunica filtros de exportação, diferenças e cobertura; o arquivo não é enviado ao servidor nem substitui a API no motor. O [plano editorial atualizado](PLANO_PAGINA_EDITORIAL_API_2026-10-22.md) e o [CTA](CTA_IMPLEMENTACAO_PAGINA_API.md) descrevem gráficos amplos, laboratório da equação, narrativa inspirada nos slides Finotti e limites de observação.

Monday: [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074). Esta documentação não alterou o card.

## Implementação local da página — 22/10/2026

Rota `/rebrain/estimativas-vendas` criada no shell Rebrain. A interface lê o histórico Horizontal paginado da API, permite selecionar cidade monitorada e até 20 empreendimentos, corte, curvas individuais e soma de carteira, comparadores de 3/12 meses, estoque, laboratório 300/150/6, tabela e exportações CSV/JSON. O Excel opcional é lido no navegador para comparação separada de estoque/venda por ID/tipologia/competência; não alimenta a projeção. Linhagem mensal permanece `unknown`, e o retrospectivo observado segue bloqueado. A elegibilidade conservadora exclui lacunas mensais, vendas negativas, revisões de unidades e duplicatas; por isso a cobertura real pode ser baixa. Não há cauda, bandas, retorno Geobrain nem garantia de paridade visual/browser nesta sessão.

Verificação: `npm.cmd run typecheck` e ESLint dos arquivos tocados passaram; testes Vitest e build foram tentados, mas o esbuild recebeu `Access is denied` ao ler a configuração sob o sandbox. Fetch remoto também falhou por rede; remoto conhecido estava 2 atrás/6 à frente antes das edições. Não houve push/deploy. Evidência de fonte existente: `AUDITORIA_EXPORT_TEMPORAL_2026-10-22.md`; a paridade Curitiba 14.154/14.154 e Guarapuava/Maringá 124/124 é auditoria anterior, não foi reproduzida pela nova UI nesta sessão.

**Verificação complementar:** execução fora do sandbox concluiu Vitest 10/10 e build Vite. A ressalva de bloqueio inicial de Vitest/build acima é histórica desta sessão. Ainda falta ensaio real da interface e do Excel de Curitiba no navegador.

**Correção de 22/10 após teste em produção:** a seleção podia resultar em 0 elegíveis e gráfico vazio. O histórico inclui rótulos Futuro anteriores ao lançamento junto de Loteamento Fechado; a elegibilidade agora usa só competências explicitamente abertas/fechadas e conserva ausências/negativos/revisões como exclusões. Motivos aparecem na lista e junto ao gráfico vazio. A captura mostrou 3/3 excluídos, mas não expôs o município; os IDs da captura não foram encontrados nas duas fixtures locais. Não afirmar que esses três casos passaram a ser elegíveis sem reteste na mesma cidade.


**Diagnóstico dos IDs da captura, Rio Branco/AC, 22/10:** consulta API somente leitura encontrou 47297 Swiss Park Rio Branco – 2ª Fase (primeira competência 05/2022, setembro/2026 = mês 53), 46458 Cidade Jardim (08/2019, mês 86) e 46456 Residencial Portal Ipê (01/2018, mês 105). Todos excedem o domínio 1–48 no corte da imagem. O histórico disponível tem 19, 23 e 23 competências, respectivamente, e vendas líquidas negativas (9, 15 e 1 linhas); não há regra validada para transformar intervalos sem linha em zero. Não existe corte comum dentro dos primeiros 48 meses para os três, pois Portal Ipê termina esse domínio antes de Swiss Park começar. A página agora mostra o mês e o último corte possível por empreendimento; isso explica a ausência da curva sem extrapolar a equação. Dados pessoais/credenciais não foram registrados.


**Rio Branco/AC — correção da curva, 22/10:** a leitura paginada retorna 21 empreendimentos; 13 apresentam loteamento horizontal explícito, e todos têm lacunas mensais em 09/2026. O filtro anterior exigia cadência completa para a própria curva e, portanto, zerava a cidade. No corte, 9/13 excedem 48 meses, 9/13 estão em 95% ou mais pelo acumulado, e 9/13 têm ao menos uma venda líquida negativa (contagens sobrepostas). O ID 52093 Ecovillage é o caso avaliável: mês 39, 348 unidades, estoque 72, 276 vendidas acumuladas; a soma de vendas reportadas também é 276. Seu padrão é Loteamento Fechado, k≈0,65735, e a curva parte de 79,31% em 09/2026. A projeção agora usa o estoque no corte **somente se** for completo por tipologia e reconciliar exatamente com as vendas acumuladas; sem essa conciliação, exclui. Lacunas/negativos não viram zero: médias 3/12 meses ficam ausentes e a origem observada/estimada permanece desconhecida. Dados de consulta: API Geobrain interna v2, somente leitura, em 22/10; script de diagnóstico bruto permanece ignorado em .local-inputs/estimativas-vendas/. Não é backtest nem validação de acurácia.

**Curitiba/PR — lista, corte e carregamento, 22/10:** a consulta autenticada da API trouxe 371 empreendimentos em quatro páginas. A interface anterior restringia a lista a 94 com rótulo horizontal explícito e ainda cortava o resultado da busca em 50; a altura do seletor mostrava poucas linhas por vez. Agora os 371 IDs ficam pesquisáveis, com filtro opcional “Somente com curva neste corte”. No corte 09/2026, o motor considerou 22 elegíveis; elegibilidade pode mudar ao alterar a competência. O mês de corte é o ponto de partida da previsão: somente histórico até ele alimenta unidades, vendas e estoque de origem. O histórico posterior não é usado para provar acurácia porque a origem observada/estimada de cada competência ainda não é conhecida. O filtro não altera os critérios matemáticos nem transforma ausências em zero.

Ensaio local no navegador, com a API real e sem escrita: 371/371 na lista; filtro 22/371; busca pelo ID 87338 (Ybá Village) e seleção geraram 1/1 curva elegível. A consulta e a leitura de Excel opcional usam o componente de carregamento com logo Brain; o fallback de navegação lazy da Rebrain também usa o componente compartilhado. Captura e script de ensaio ficam em `.local-inputs/estimativas-vendas/`, ignorados pelo Git. Typecheck, ESLint, 16 testes focados e build passaram. Esta evidência confirma a operação local da página, não a publicação nem a precisão retrospectiva da equação.


**22/10 — expansão solicitada por Gabriel:** [Plano de modelos, retrospectiva e faixas de previsão](PLANO_EXPANSAO_MODELOS_E_FAIXAS_2026-10-22.md) preparado para horizontais, verticais, comerciais e mistos. Distingue limites do ajuste Finotti de proteções do adaptador; prevê extrapolação identificada, parâmetros próprios, modelos de fluxos e faixas calibradas de 50%/80%. Plano com testes e critérios de promoção; nenhuma nova curva ou banda implementada nesta etapa.
