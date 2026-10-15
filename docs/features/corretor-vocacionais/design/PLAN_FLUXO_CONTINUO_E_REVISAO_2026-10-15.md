# Plano — preparação contínua, evidências e revisão legível

**Data:** 15/10/2026. **Responsável:** Gabriel. **Estado:** proposta técnica preparada com simulação local; nenhuma alteração de produto nesta rodada. **Base conferida:** `48949a7`, `main`/`origin/main`0/0 após fetch. Alterações FIERGS e ZIP preservadas. O usuário pediu plano e CTA, não sua execução nem push.

Este plano complementa A2/A3/A4 do `PLAN_ASSIMILACAO_INTERFACE_V3_2026-10-15.md` e substitui as decisões de apresentação rejeitadas no teste humano. A validação local anterior não significou aceite de usabilidade. A sessão anterior publicou interface e aviso; os prints atuais mostram problemas reais que precisam ser tratados no fluxo.

## 1. Diagnóstico por caso observado

1. **PowerPoint dispara a transição cedo demais.** `handleNew`/drop chamam `ingestNew`; ela cria o estudo, executa `openStudy(id)` e chama `startPhase1AndGate`. A escolha de Excel fica para depois da mudança de contexto. `runPhase1` pode chamar `extractAtaFromImage`, com custo, antes da confirmação da fase2. A palavra “triagem gratuita” não descreve essa sequência inteira. Alvos: `CorretorV3Page.tsx`, `pipeline.ts`, `PreAnalysisCard.tsx`.
2. **Aviso com faixa amarela repete uma falha de sequência.** `PreAnalysisNotice.tsx` e `.cp-pre-analysis-notice` adicionam um bloco de explicação depois da transição. Retirar esse formato. O estado pertence ao título e ao comando da etapa, com frase curta, sem filete decorativo ou avisos repetidos.
3. **Preparação misturando controles e dados.** `PreAnalysisCard` põe escolhas de planilhas e estatísticas com caixas semelhantes. `Stat` é informativo, não controla a análise. O botão de início fica desabilitado até escolher planilhas, mas o motivo está num rodapé pequeno. Não fazer números parecerem botões.
4. **Catálogo dentro de todos os estudos.** `<RulesCard />` está montado na revisão. A expansão recente aumentou a distração. Retirar do fluxo operacional e colocar uma área de referência acessível pela carteira. Catálogo não comprova execução das regras no estudo.
5. **Imagem duplicada.** `ReviewBench` desenha `evidenceImage`; `V3FindingCard` repete a mesma imagem. Consolidar a renderização num único visualizador e manter explicação/decisões abaixo.
6. **Inglês apresentado diretamente.** `ia-text.ts` usa `raw.description` como título e detalhe. O prompt de `analyze-text-batch` fala de revisão em português, mas não impõe idioma dos campos da resposta. Também há strings de interface como “worklist”, modelos/códigos e siglas sem função para o usuário. A correção deve cobrir respostas antigas e novas, sem reprocessar achados só para traduzir.
7. **Achado textual não tem slide completo.** A extração produz texto/XML e alguns recortes; ela não renderiza a apresentação inteira. `ReviewBench` depende de preview_pdf/preview_slide ou evidenceImage. Sem prévia, cai para texto. É uma lacuna de materiais/renderização, não apenas de CSS. A função `corretor-material-preview` entrega URLs de prévias registradas; não converte PPTX.
8. **Triagem estreita e ações ambíguas.** `TriageOverlay` usa `max-w-2xl`, barra `max-w-md` e imagem `max-h-64`. “Aceitar” somente avança e mantém pendente; não significa corrigir ou aprovar a entrega. Ações chamam callbacks sem esperar a gravação. Redesenhar largura e clareza das decisões, com falha/salvamento visíveis antes de avançar.

Os prints são a evidência humana desta rodada. Não se atribui causa de abandono aos usuários. O inventário anterior17V3/4 incompletos é histórico daquela consulta, não nova medição desta sessão.

## 2. Fluxo único proposto

**Preparar materiais → Conferir informações e custo → Iniciar avaliação → Acompanhar → Revisar.**

A pessoa permanece em `/corretor/novo` durante toda a preparação. Selecionar PPTX apenas identifica e prepara o arquivo: hash, tamanho, extração local, sugestão de cidade e contagens. Não abre revisão, não cria execução paga e não chama IA de ata. Texto de andamento: “Preparando apresentação”, nunca “Avaliando slides”.

Após o PPTX, a seção seguinte fica visível: **“Incluir planilhas de cálculo?”**, benefício em uma frase, botão **“Adicionar planilhas Excel”**, lista de nomes com remover/substituir e opção explícita **“Continuar sem planilhas”**. Planilhas continuam opcionais; decidir não incluir é suficiente. Aceitar Excel antes ou depois do PPTX sem perder seleção. Cancelar o seletor não equivale a escolher sem planilhas.

Na mesma página: cidade, UF, outras cidades quando pertinentes, lista de arquivos e informação de cobertura. Cliente, tipo de estudo e prazo continuam opcionais; autoria vem do Geobrain quando autenticado. A preparação anônima continua possível, sem criar uma conta paralela.

**“Antes de iniciar”** apresenta contagens como texto/lista, sem caixas de ação. Se houver uma ação para inspecionar páginas, ela será um link explícito “Ver páginas”, com destino funcional; caso contrário, não haverá cursor/hover/borda de botão. Contagens de conteúdo disponível não serão chamadas de conteúdo já avaliado.

Um único botão principal: **“Iniciar avaliação”**, junto da estimativa atual de custo. Só habilita com apresentação válida, cidade/UF válidas, escolha sobre planilhas e estimativa pronta. Razão da pendência aparece junto do campo pertinente. Nenhuma etapa paga, inclusive ata, começa antes desse comando. Um limite adicional de orçamento pode exigir confirmação específica, sem duplicar confirmações quando não necessário.

Depois da confirmação, aparece o acompanhamento real, conservando nome e materiais do estudo. Apenas depois do relatório concluído segue à revisão; falha/pausa mantém estado incompleto com ação de retomar. O fim do upload não é o fim da avaliação. Preferir persistir execução interrompida e retomar, sem exigir uma nova infraestrutura de fila em segundo plano nesta rodada.

## 3. Plano de implementação em ordem

### F0 — referências e critérios (preparado nesta sessão)

- Congelar prints relatados, base Git e exemplos do corpus. Protótipo: `PROTOTIPO_FLUXO_CONTINUO_2026-10-15.html`; é simulação, não usa motores/banco/IA. Contagens/custo são ilustrativos e estão assim identificados.
- Usar Campos do Jordão: PPTX de153slides,11Excel, PDF completo16.950.728bytes e imagens reais23/68/153, todos já locais. Conferida nesta sessão a ordem do PPTX de referência:153 páginas, sem divergência entre ordem de apresentação e nomes slideN.xml. A frase “são esperado” está na página23; “OBSERTÓRIO” aparece no texto-fonte das páginas66/68. Nenhum achado recebe página diferente por aproximação.
- Critérios de legibilidade e ações abaixo passam a ser parte do aceite, não só ausência de erro JavaScript/overflow.

### F1 — preparação contínua e confirmação anterior à análise

**Arquivos:** extrair de `CorretorV3Page` um `StudyPreparationPage`/`StudyPreparationForm` e um controlador `useStudyPreparation`; adaptar `PreAnalysisCard`, `PreAnalysisNotice`, rotas em `App.tsx` e estilos scoped.

- Separar selecionar/preparar de iniciar. Novo handler guarda `presentation`, `excelFiles`, `sourceChoice`, `city`, `uf`, `otherCities`, `estimate` e erros locais. `ingestNew` deixa de ser callback direto do input/drop.
- Fazer parsing/hash em tarefa cancelável; trocar PPTX cancela resultado anterior e invalida estimativa/cidade derivada, sem vincular fontes silenciosamente ao estudo errado. Mostrar arquivos selecionados e escolha de reaproveitamento quando aplicável.
- Extração local e consulta somente leitura ao cache podem ocorrer na preparação. Dividir função hoje chamada `startPhase1AndGate`: nenhuma chamada de extração IA antes da confirmação. O custo estimado deve incluir ata + texto + visão ainda não disponível em cache.
- Usar cidade sugerida por nome/texto e entrada manual antes de IA. Se a ata paga trouxer contexto divergente depois, não sobrescrever informação confirmada: pausar na mesma sequência e pedir confirmação somente da divergência.
- Criar estudo/versão após intenção confirmada, com estado de execução rastreável; antes disso guardar rascunho local. Duplicata exata deve oferecer abrir o existente, sem nova IA; nome parecido apenas sugere vínculo. Nenhum remanejamento automático dos estudos existentes.
- Remover faixa amarela e texto repetitivo do aviso. Título “Preparar estudo” e frase “O estudo está preparado e ainda não foi avaliado” bastam junto da confirmação. Cor continua tendo função nos níveis do mapa, não como decoração universal.
- Levar pedidos da ata que exigem edição para seção clara de informação, nunca novo acordeão escondido nem seção técnica obrigatória no caminho principal.

**Concluído quando:** subir PPTX primeiro mantém a tela e mostra Excel; Excel primeiro continua aceito; fechar o seletor não avança; sem planilhas é escolha explícita; zero chamadas pagas antes do botão; duplo clique inicia uma vez; erro não apaga arquivos/campos; não surge página antiga durante a preparação.

### F2 — estado de execução e retomada confiável

**Arquivos/contratos:** adaptador `preparation-draft.ts`, registros de execução/etapas no Supabase, migration aditiva, `pipeline.ts`, `db.ts`, funções chamadas pelo motor. Reusar tabelas de versões, material_assets/source_sets/snapshots onde aplicável.

- Rascunho no navegador guarda metadados e referências aos arquivos locais; respeitar resultado de gravação no IndexedDB e não prometer recuperação em outro computador sem persistência remota. Quando autenticado, usar armazenamento já previsto em A2/A3. Não introduzir login obrigatório só para preparar.
- Registro da execução: `study_id`, `version_id`, identidade dos materiais/fontes, estado, custo autorizado, gasto conhecido, etapas/lotes concluídos, última atualização, erro seguro, versão do motor e contexto confirmado. Estados mínimos: preparado, avaliando, interrompido, falhou, concluído. Relação com campos legados explícita; `relatorio` só em conclusão real.
- Início/reentrada com operação atômica por estudo/versão/chave da execução, impedindo dois cliques/abas de repetir o mesmo lote. Guardar retorno de cada lote antes de avançar. Após falha de rede com resultado desconhecido, não repetir cobrança cegamente: reconciliar registro/cache ou pedir retomada delimitada.
- Sair/recarregar conserva preparação; se a execução depende do navegador, marcar interrupção e retomar etapas faltantes. Não prometer execução em segundo plano sem serviço que a sustente.
- Confirmar custo no servidor para o lote aprovado, não apenas no botão. Não ampliar permissões públicas de tabelas por conveniência; usar o contrato de identidade existente e operação de servidor delimitada para o fluxo visitante. Se essa proteção ainda não estiver operacional, não declarar A2 encerrada nem ampliar processamento público.
- Relatório, fontes e achados vinculados à mesma execução/versão. Reuso de decisões humanas exige equivalência da evidência; nenhuma limpeza automática de achados para melhorar contadores.

**Concluído quando:** reload na preparação e interrupção na avaliação retomam o ponto correto; lote não duplica em duas abas; não há custo novo sem consentimento; estudo interrompido nunca parece concluído; arquivo ausente é solicitado uma vez no contexto correto.

### F3 — slide completo e uma única representação da evidência

**Arquivos:** `ReviewBench`, `PdfSlide`, `StudyMaterials`, `materials.ts`, novos `StudySlideViewer`/`useStudyPreview`, manifesto de renderização; avaliar serviço de conversão em etapa técnica própria.

- Todo achado local tem ligação com versão e página. Visualizador resolve na ordem: página completa da mesma versão → recorte realmente persistido → trecho textual com indisponibilidade de imagem registrada. Nunca chama um recorte de slide inteiro e nunca fabrica uma página a partir de uma frase.
- Para o caso de aceite, associar o PDF real já existente ao PPTX correto e servir suas153páginas. Antes de produzir prévias automaticamente, fazer prova de conversão de PPTX real e medir fidelidade, fontes/gráficos, tempo, memória e bytes. A Edge atual não fornece essa conversão.
- Render automático exige um serviço apropriado, com interface `render(documentHash, version) -> manifest/pages`. Escolha de hospedagem/fornecedor e custo requerem prova e orçamento antes de uso pago. PDF da mesma versão é alternativa operacional enquanto se fecha esse serviço; não é prova de conversão automática concluída.
- Manifesto: hash original, versão, conversor/versão, quantidade e ordem das páginas, inclusão dos ocultos, dimensões e hash de cada saída. Contagem igual sozinha não prova correspondência. Ordem deve vir de presentation.xml/rels, não de suposição geral sobre nome de arquivo; o corpus atual não exibiu divergência, mas o controle será coberto.
- Considerar slides ocultos: o export padrão anterior omitiu7 páginas. Não alterar/salvar o original. Validar título/texto e conteúdo visual em23,41,66,68 e153. Usar hash da versão para impedir prévia velha em estudo corrigido.
- Uma imagem grande por vez, alinhada à esquerda e usando a largura do documento; explicação e decisões abaixo como padrão. Reutilizar o mesmo visualizador na revisão rápida. Tirar `<img>` do cartão quando ele está dentro da bancada; comparação entre fontes diferentes deve ser explicitamente rotulada e não duplicar a mesma figura.
- Várias evidências do mesmo slide são selecionáveis por nome/achado, sempre com uma imagem principal; achado relacional oferece os slides envolvidos e comparação explícita. Zoom e abertura ampliada funcionais, sem esticar imagem pequena para fingir detalhe. Destaque de região apenas com coordenadas comprovadas.
- Carregar páginas sob demanda, com vizinhas limitadas e descarte de canvas/URLs. Não renderizar153/214 páginas ao mesmo tempo.
- Estudo antigo sem arquivo completo mantém texto/recorte; ação curta de recuperar original em Materiais ou barra da revisão, sem caixa vazia gigante. A falta de imagem não apaga o erro. A fatia de render não passa no aceite enquanto os exemplos de achado textual23/66 não mostrarem a página real.

**Concluído quando:** exemplos dos prints mostram a página correta, maior, uma vez; texto/ações abaixo; slides23/66 têm contexto visual; fonte indisponível não gera slide inventado; nova versão não reutiliza prévia errada.

### F4 — português e hierarquia de informação

**Arquivos:** `ia-text.ts`, `text-review.ts`, `analyze-text-batch/index.ts`, demais produtores de mensagens, componentes de revisão/triagem/relatório, catálogo centralizado.

- Camada única `presentFindingPt` compartilhada por cartão, triagem, resumo e relatório. Títulos humanos vêm do catálogo em português; detalhe distingue observação, trecho original e sugestão quando sustentada. Não repetir o mesmo texto no título e na primeira linha.
- Prompt exige campos descritivos em português do Brasil; termos técnicos internos continuam estáveis no contrato. Validar resposta; não confiar somente na instrução ao modelo.
- Para registros antigos, adapter de apresentação com regras explícitas para padrões conhecidos (ex.: “Misspelling of …” → “Possível erro de grafia em …”), preservando nomes/números/trecho literal. Casos não reconhecidos usam título em português e evidência estruturada sem inventar correção; manter payload original auditável. Revisão de detalhes não convertíveis deve ser registrada, sem silenciosamente perder uma acusação.
- Não chamar IA paga para traduzir em lote sem orçamento. Mudança de idioma não muda rule_id, status, confiança, decisão ou deduplicação; preservar original bruto.
- Texto da interface integralmente em português: “lista de apontamentos”, “Não é erro”, mensagens de falha/salvamento, rótulos e ajuda. Códigos como SPELLING/PERCENTAGE_SUM, nomes de modelos e tags de implementação saem do caminho principal. Trecho literal de documento e nomes próprios permanecem como no original, mesmo quando contêm outro idioma.
- Etiquetas somente de confiança, categoria, slide e estado que ajudem a decidir; detalhes técnicos acessíveis em referência administrativa, sem invadir a revisão.

**Concluído quando:** “Misspelling of 'Observatório'”, “worklist”, códigos e erros brutos de serviço não aparecem na interface normal; textos literais permanecem intactos; não há achado/decisão perdido por tradução.

### F5 — revisão rápida ampla e comandos honestos

**Arquivos:** extrair `TriageOverlay` para `StudyQuickReview`, reusar `StudySlideViewer` e apresentação de achados; ajustar callbacks assíncronos, foco e estilos.

- Usar largura útil da janela com margens16–32px, sem max-w-2xl/max-w-md. Cabeçalho: posição, progresso flexível até o fechamento. Documento ocupa a área principal; texto e botões abaixo, sem segunda miniatura.
- Medir largura útil, não apenas overflow: em1440px, barra e área do documento devem ocupar ao menos90% da região disponível. Imagem respeita proporção; se precisar rolar para ler, não cortar ou cobrir conteúdo com rodapé fixo. Ações ficam após a explicação ou em área reservada, não sobre a imagem.
- Rótulos com consequência real: “Manter pendente e avançar” para a ação hoje chamada Aceitar. “Não é erro” registra falso positivo. “Já ajustei” é declaração, não prova de correção; preservar a proteção de reconferência de A5. Se o modelo legado ainda não distingue isso, adaptar o estado antes de oferecer uma conclusão enganosa.
- “Ignorar” deve explicar o efeito e conservar trilha; não converter automaticamente em aprovado. Ação por grupo só com equivalência demonstrada e escopo claro, não por categoria genérica. Se não houver contrato seguro, retirar comando de grupo desta fatia.
- Gravações retornam Promise; só avançar após sucesso. Login cancelado, rede falha ou permissão negada mantêm item/foco/contagem, sem simular decisão concluída. Impedir clique duplo e atalho durante gravação.
- Botões operáveis por teclado e foco visível. Setas navegam; atalhos de decisão explícitos; Enter não deve disparar decisão inesperada quando há botão/campo focado. Escape volta ao slide/posição de origem; voltar a item não infla contador. Progresso baseado em itens únicos tratados, distinto de resolução comprovada.

**Concluído quando:** grande área útil no desktop, reflow no celular, sem imagem duplicada/cortada; falha de salvar não avança; fechar/retomar conserva posição; toda ação tem significado verificável.

### F6 — catálogo na carteira, integração e publicação

- Extrair `RulesCard` para componente de referência alimentado pelo mesmo catálogo (`ERROR_CATALOG`), sem copiar listas. Na carteira, acesso secundário “O que o corretor verifica” para seção/página própria. Tirar montagem de preparação, análise, revisão e triagem.
- Não mostrar catálogo inteiro por padrão na carteira se competir com encontrar/retomar estudos. Página de referência tem retorno claro à carteira, em português, sem tratar capacidades como resultado obtido.
- Ensaiar uma jornada real de Campos do Jordão, preservando motores/decisões. Depois conferir Rolândia e estudo longo de214slides, com replay e fontes disponíveis. Documentar material ausente sem inventar cobertura.
- Ordem de ativação: migrations de estado/manifesto quando necessárias, funções alteradas, frontend; check de compatibilidade com estudos antigos. Mostrar resultado antes do push. Verificar versão efetivamente publicada e repetir percurso no site antes de declarar concluído.

## 4. Matriz de aceite e evidências

- **Fluxo:** PPTX primeiro, Excel primeiro, seletor cancelado, sem Excel explícito, troca de arquivo, duplicata, volta/forward/reload, falha no parsing, quota local, conta sem sessão, login cancelado, versão antiga.
- **Pagamento:** interceptar funções e provar zero chamadas de IA antes da confirmação; ata incluída no orçamento; cancelamento não chama motor; reentrada não cobra lote concluído; falha de resposta desconhecida não repete cegamente. Não usar autorização histórica deUS$2 como orçamento atual.
- **Visual:**1440/1024/390/320, zoom200%, títulos longos, contraste, foco/teclado. Inspecionar screenshots e dimensões, não aceitar só testes de seletores.
- **Evidência:** uma imagem principal,23/41/66/68/153, versão certa, slides ocultos, documento sem prévia, recortes múltiplos, relação entre slides, PDF de quantidade errada, PDF de quantidade igual mas versão errada.
- **Idioma:** respostas antigas em inglês, modelo simulado retornando inglês, termos originais em outro idioma, números/nomes preservados e erros de rede. Não traduzir o literal que sustenta o achado.
- **Decisões:** cancelamento de login, Promise rejeitada, concorrência, duplo clique, teclado, retorno, contadores e conclusão. Redução de alertas não comprova melhoria.
- **Regressão:** preservar dez passes existentes e controles de falso positivo/erro verdadeiro; executar regressão ao mudar adaptadores/pipeline/decisões. Comparar achados/estados antes/depois; não ajustar gabarito para acomodar UI.
- Registrar artefatos grandes em `.local-inputs/`; documento versionado com resultado, ambiente, hashes e limitações. Nenhum teste deve escrever no estudo real sem escopo autorizado.

## 5. Simulação realizada nesta preparação

Protótipo local com imagem verdadeira do slide23. Navegação simulada confirmou que escolher PPTX mantém preparação, decisão sobre Excel antecede início, seletor de modo leva a revisão ilustrativa com uma imagem e texto abaixo. Preparação inspecionada1440/1024/390; na triagem, barra e área documental1392px em janela1440 (96,7%). Sem erro de script. Na inspeção visual, o rodapé inicialmente sobrepunha a imagem; foi retirado o posicionamento fixo e a simulação repetida.

Arquivos: `PROTOTIPO_FLUXO_CONTINUO_2026-10-15.html`, `.local-inputs/prototype-continuous-20261015/result.json` e capturas. Servir a raiz do repo por HTTP local para carregar tokens/imagem relativos. A imagem vem de `.local-inputs/cj-real-preview/slide-23.png`, não é incluída no Git. Protótipo limitado a uma página de exemplo, estados simulados e sem backend; não comprova upload, geração de prévia, idempotência, processamento ou salvamento. Sua faixa identifica simulação, não será parte do produto.

## 6. Escopo, dependências e ordem de execução

Primeiro F1 e a parte de F2 necessária para não perder preparação/execução; em paralelo lógico, fechar prova de representação integral F3. F4 pode usar dados persistidos sem IA. F5 reutiliza F3/F4. F6 integra e verifica o percurso completo. Não delegar a terceiros sem alinhamento.

Sem chamadas pagas na preparação deste plano. Implementação inicial usa corpus/cache/simulações; infraestrutura de render ou lote real deve apresentar custo e quantidade antes. Os arquivos completos de estudos antigos podem ser indispensáveis; registros textuais sozinhos não bastam para reconstruir a página. Não declarar renderização automática pronta por ter carregado um PDF manualmente.

Não transformar este plano em promessa de execução dentro das seis horas semanais já reservadas; escopo ampliado por teste humano, medição futura. Registrar avanço no plano/diário da sessão, sem horas retroativas, e preservar frentes paralelas.

## 7. CTA

> Execute o PLAN_FLUXO_CONTINUO_E_REVISAO_2026-10-15.md. Comece pela preparação contínua: PowerPoint e planilhas na mesma página, conferência e orçamento antes de qualquer IA, sem transição automática nem avisos decorativos. Implemente retomada confiável, uma única prévia real do slide com texto abaixo, interface em português e revisão rápida ampla. Leve o catálogo para a carteira. Use Campos do Jordão e os materiais existentes, preserve decisões e os dez passes, valide a jornada completa e registre limitações reais. Não faça IA ou infraestrutura paga sem lote e orçamento. Apresente o resultado antes do push.
