# Corretor — rascunho, carteira pessoal e envio de materiais

## Estado

Correção v0.73.1 conferida localmente em 16/10, sem push ou publicação no site. Base sincronizada em `b6cf823` após autorização, preservando documentos FIERGS/ZIP. Os três commits Lovable atualizaram tipos/arquivo gerado; o código Corretor vinha de `178a96b`.

Gabriel informou que a análise publicada funciona e trouxe retorno Lovable sobre migration de execução aplicada e quatro deployments. São evidências informadas, sem nova verificação administrativa ou análise real pelo agente nesta sessão.

## Antes e depois

1. **Novo estudo repetia o envio anterior.** `preparation:*` nunca era consumido. Agora o rascunho termina após registro durável/informações iniciais, antes da IA. Abrir duplicata confirmada também consome o rascunho sem reanalisar. Cancelar a abertura ou falhar antes do vínculo conserva a preparação. Interrupção posterior fica no estudo registrado.
2. **Rascunhos anteriores à correção.** Recuperação confere se o hash já pertence a estudo V3 analisado; nesse caso limpa e oferece “Abrir resultado”. Preparações não analisadas continuam recuperáveis. “Limpar e começar outro” exige confirmação sem excluir estudos. Análise V2 não substitui avaliação V3.
3. **Materiais locais.** Transação do navegador conserva apenas planilhas selecionadas sob o hash da apresentação. Materiais oferece download com indicação de disponibilidade neste navegador. Originais por hash e prévias PDF não são apagados. Não há envio automático para armazenamento remoto. Campos pequenos são gravados sem atraso deliberado e o início suspende a gravação do rascunho.
4. **Meus estudos ignorava cadastro posterior.** Consulta une estudos criados pela identidade verificada e estudos cujo cadastro pertence à conta, sem duplicação. Salvar cadastro atualiza a lista pessoal. Nenhuma autoria ou política muda. Preencher sem salvar não cria vínculo; visitante sem associação continua em Todos os estudos.
5. **Lista desatualizada/filtrada.** Voltar do estudo recarrega a carteira. Filtro inicial inclui todos os atuais, inclusive concluídos; filtros explícitos na URL são respeitados. Vazio por filtro oferece limpeza; ausência de vínculo explica como acessar Todos os estudos. Falha de consulta pessoal não vira lista vazia. Abas selecionadas têm contraste/marcador.
6. **Envio reconhecível.** Superfícies clicáveis com ícones de 32px, PPTX/Excel, nome do arquivo e contagem de planilhas. PDF tem ícone e papel explícito de prévia complementar na revisão, sem fingir entrada substituta do motor. Ícones também em Materiais/abertura de PDF. Sem faixa decorativa, mesmos tokens SE e primitives existentes.

## Evidências locais

- **289 testes aprovados, zero falhas, dois condicionais pulados**: `.local-inputs/flow-fix-20261016-tests.json`, `success: true`. Cinco casos novos cobrem rascunho antigo, descarte confirmado, cadastro pessoal, visitante e falha de consulta. O shell redirecionou aviso Browserslist como erro; JSON registra sucesso dos testes.
- **Dez passes gratuitos**, baseline e Excel bruto para Rolândia, Toledo, Campos do Jordão e São José dos Campos VAP/v2: `.local-inputs/corretor-regression/2026-10-16T14-33-40.688Z-27644/report.md`. Gabaritos intactos; não prova ausência de erros no estudo inteiro.
- **Materiais reais, serviços interceptados**: `scripts/diagnostics/corretor-continuous-browser.mjs`, `.local-inputs/continuous-browser-1792161362026/result.json`, quinze verificações aprovadas/zero erros JavaScript. PPTX Campos do Jordão, onze Excel e PDF da mesma versão; duplicata sem IA, execução nova com fornecedor simulado, Novo estudo vazio, planilhas recuperáveis, páginas23/41/66/68/153, login cancelado sem avanço, Rolândia/Tijucas preservados. Corpus/decisões inalterados. Preparação1440/1024/390/320 e revisão390/320.
- **Carteira/conta simuladas**: `scripts/diagnostics/corretor-portfolio-flow-browser.mjs`, `.local-inputs/portfolio-flow-1792161677795/result.json`. Cadastro aparece em Meus estudos imediatamente/após reload; retorno busca novo estado, concluído aparece e filtro vazio se recupera. Uma gravação simulada, zero funções chamadas, zero erros. Ícones medidos32px nas quatro larguras e capturas claro/escuro; cores computadas conferem contraste após a transição. Identidade exclusivamente de teste, sem credencial válida.
- Tipagem real `tsc -p tsconfig.app.json --noEmit`, ESLint dos arquivos tocados e build aprovados. Build final28,19s em `.local-inputs/flow-fix-20261016-build-final.log`, avisos preexistentes Browserslist/chunks. Revisão React: efeitos canceláveis, estados explícitos, nomes acessíveis e primitives existentes, sem dependência nova.
- Tokens raiz/produto idênticos: SHA256 `0802b707b8c511e3367b1e4a235cea6a268edb9ac8f217a2beb965fc30874eac`.

## Limitações e próximo passo

Sem escrita no banco/site, IA real, migration ou alteração de Edge. Publicar somente frontend após revisão; nenhuma função precisa ser republicada por esta entrega. Conferir na conta real de Gabriel: cadastro aparece em Meus estudos, resultado conserva decisões e Novo estudo volta vazio. Só depois registrar verificado em produção.

Rascunho continua único por navegador, sem isolamento de edições simultâneas em várias abas. Arquivos locais dependem do navegador e não prometem acesso entre dispositivos. Render hospedado, compartilhamento completo e autorização legada continuam nos planos anteriores.

Referência: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser). Organização usa `created_by` e `owner_id` existentes, sem editar autoria ou confiar em metadados editáveis pelo usuário.

## Complemento v0.73.2 — tudo que a conta iniciou aparece em Meus estudos

Gabriel esclareceu que a carteira pessoal deve incluir avaliações não finalizadas e cadastro incompleto. Registros já persistidos não tinham filtro de conclusão/cadastro, mas a preparação anterior ao botão Iniciar ficava apenas local. **Esse intervalo foi corrigido.**

- Após extrair/validar a apresentação, uma identidade autenticada registra estudo pendente pela mesma operação atômica existente. Não exige cidade, UF, Excel, cliente ou cadastro comercial. Autoria é atribuída pelo servidor; nenhum autor anterior é alterado. Visitante continua local sem vínculo inventado.
- O original é guardado no cache por hash para retomada neste navegador. Ao iniciar explicitamente, o registro criado na preparação é reaproveitado; conta, hash, versão e estado pendente são conferidos novamente. Estudo já analisado/versão alterada não é reiniciado por esse caminho. Ata/texto/imagens seguem condicionados à confirmação de custo; cadastro parcial não bloqueia a carteira.
- Essa orientação substitui o trecho anterior de que toda seleção de PowerPoint é incapaz de criar estudo: **com conta, agora registra o estudo; não executa IA.** Os campos comerciais continuam opcionais. Cancelar um formulário não publica os textos digitados; o estudo já iniciado na conta permanece visível independentemente de salvar esse cadastro.
- A página vazia antes de selecionar apresentação válida não cria estudo sem arquivo. Estudos visitantes não são automaticamente transferidos para uma conta posterior. Preparações duplicadas de outro autor não reatribuem autoria; abrir estudo existente é diferente de iniciar uma avaliação nova.
- **295 testes passaram, dois condicionais pulados**, `.local-inputs/account-preparation-20261016-tests.json`. Seis controles novos: registro sem cadastro/cidade, visitante, deduplicação, estudo concluído/de outra conta, mudança de versão/hash e troca de identidade. Tipagem real, lint e build aprovados; `.local-inputs/account-preparation-20261016-build.log`.
- **Oito verificações de carteira** em `.local-inputs/portfolio-flow-1792162545597/result.json`: apresentação real153slides preparada, cidade apagada, sem cadastro/planilhas nem início de IA, já visível em Meus estudos como pendente; reload conserva o item. Início explícito reutiliza o mesmo ID, seguido de indisponibilidade simulada do controlador; estudo permanece na carteira sem relatório e sem chegar a provedor. Uma criação simulada e um `start` simulado (resposta503); nenhuma chamada real de função/IA ou escrita no site.
- **Quinze controles do percurso anterior** repetidos e aprovados em `.local-inputs/continuous-browser-1792162558132/result.json`, incluindo visitante, duplicata, planilhas, previews e decisões. Os dez passes de baseline/Excel da v0.73.1 seguem preservados: nenhum motor ou gabarito foi alterado; não houve nova rodada desses dez neste complemento.

Estado local, sem push. Usa somente frontend/RPC já existente, sem migration ou redeploy de função. Depois da publicação, conferir no login real que um envio abandonado antes da análise aparece como pendente. Recuperação dos materiais em outro computador continua dependendo da cópia remota explícita em Materiais.
