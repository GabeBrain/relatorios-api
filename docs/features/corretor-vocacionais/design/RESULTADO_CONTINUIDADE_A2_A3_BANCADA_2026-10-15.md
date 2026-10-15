# Continuidade — identidade, materiais e bancada real

15/10/2026 · Gabriel · **Primeira fatia validada localmente; A2/A3/A4 parciais.**

## Publicação de A0/A1

`416488d` enviado com autorização; fetch posterior0/0, check:live-docs aprovado. Contém carteira compacta, cadastro opcional, resumo e retorno de revisão preservando contexto. Código no Git não comprova deploy do frontend. Continuação abaixo apresentada em comentário antes do envio autorizado nesta sessão; dependências de migration/função e aceite real permanecem.

## Materiais para Gabriel subir

Pasta SE: `_UPLOADS_TESTE/Corretor_V3_Campos_do_Jordao/`.

- Apresentação: `02_APRESENTACAO_SELECIONAR_DEPOIS/Brain_Vocacional_Vertical_Housi_Jardim Monte Bello_Campos do Jordao - SP_vAP_27jul.pptx`.
- Planilhas: selecionar os11 arquivos de `01_PLANILHAS_SELECIONAR_TODAS/`.
- Prévia complementar para bancada: repositório `.local-inputs/cj-real-preview/Campos-do-Jordao-previa.pdf`,153 páginas. Não é outro estudo; é exportação local do mesmo PPTX. Fonte original não foi alterada, SHA256 final `8a8cd47f305054ce9814dcabd75731850586e7a60572172698efc9600d7b88c4` igual ao caso congelado.

Não reenviar como estudo independente se o sistema reconhecer o mesmo conteúdo; continuar o existente. Sem nova IA paga. Os arquivos não foram enviados ao backend real por esta sessão: os testes disponíveis usaram serviços interceptados.

## O que foi implementado nesta fatia

### Identidade e colaboração — parte de A2

- Modal contextual **Entrar com Geobrain**, usando `corretor-access` existente; mesma conta, sem lista de emails. Continua uma única ação após sucesso; cancelar, falhar ou trocar de rota não executa a intenção.
- Decisão, fonte de estudo existente, nova versão, conclusão e exclusão agora pedem login no fluxo da interface antes de agir. A reconciliação histórica automática ao abrir não é executada para visitante sem identidade validada.
- Novos estudos poderão receber `created_by` da sessão verificada via trigger, sem inferir autoria de antigos. Campos pessoais são limpos ao mudar sessão. Meus estudos/Compartilhados/Todos leem contratos novos quando disponíveis; sem migration, mensagem de dependência e biblioteca geral conservada. Interface de compartilhar ainda não implementada.
- **Limite fundamental:** políticas legadas amplas de `studies_v3/findings_v3/study_versions/study_sources_v3` não foram substituídas nesta migration. Portanto o gate da interface não é garantia de bloqueio direto via REST para os dados legados. A2 NÃO está concluído nem homologado como autorização completa. Antes de considerar esse aceite fechado, migrar criação visitante para operação controlada de rascunho e depois restringir todas as escritas legadas no servidor sem quebrar ingestão pública. Não anunciar “anônimo não altera por API” com este lote.

### Materiais — primeira fatia de A3

- Novo armazenamento `corretor-materiais`, independente de perfil comercial; originais PPTX/XLSX/XLSM e prévias PDF/PNG com hashes, bytes, versão, autor da operação e objeto imutável. O contrato antigo continua acessível para recuperar arquivos já guardados.
- Upload TUS retomável; registro só confirma após objeto existente/tamanho e vínculo de versão. PPTX deve coincidir por SHA1 com versão; recuperação verifica SHA256/bytes e SHA1 quando disponível. Retry não sobrescreve arquivo.
- As11 planilhas podem ser guardadas e processadas no navegador pelo extrator existente. Conjunto imutável guarda arquivos de origem e payload; RPC ativa a fonte derivada em transação, sem apagar conjuntos anteriores. Próxima versão pode escolher reaproveitar ou atualizar. Usar fontes não dispara IA nem reconferência automaticamente.
- Botão para registrar snapshot manual do estado atual, com achados/decisões/report e conjunto de fonte quando correspondência é demonstrada. Se houver somente fonte derivada antiga, fica `legacy_derived`, sem inventar originais. Registro manual não é uma nova execução do motor nem reconstrução do histórico.
- **Limites:** persistência automática de cada execução e de cada novo envio visitante, separação completa versão/execução, retomada de guest upload, deduplicação global de estudos e linha do tempo dos snapshots ainda faltam. Este lote não os declara entregues. Planilhas devem ser adicionadas pela área nova de Materiais para guardar os binários; o caminho legado de vinculação preserva apenas a fonte derivada.

### Bancada — prova real e primeira integração A4

- Apresentação à esquerda, observações reais persistidas à direita, navegação de slide na URL, mapa recolhível até153 slides testados, zoom e layout em coluna nas telas menores. Lista anterior continua disponível como alternativa. Usa adaptador de apresentação já existente; decisões/status legados preservados, novos estados de A5 não implementados.
- Render PDF.js importado lazy, uma página por vez; PDF complementar selecionado localmente ou derivado remoto. Arquivo bruto PPTX não é reconstruído em HTML. Sem prévia, pode mostrar recorte persistido claramente rotulado como parcial. Sem coordenadas confiáveis, não desenha contorno inventado.
- Endpoint público `corretor-material-preview` assina apenas derivados registrados `preview_pdf/preview_slide` por120s. Bucket permanece privado; PPTX e Excel exigem sessão Geobrain via políticas de Storage. Acesso público à biblioteca não expõe download de binários originais nesta fatia.
- Prévia fornecida pelo usuário é rotulada; igualdade de páginas não comprova conteúdo/ordem. Falta validação/conversão servidor vinculada ao hash do PPTX para confirmação automática da correspondência visual. PNGs derivados têm número de slide informado; evitar automatizar destaque antes desse contrato.

## Falha real encontrada e corrigida

O PowerPoint está instalado localmente e exportou o PPTX em modo somente leitura, macros desabilitadas e sem janela da apresentação. A primeira exportação PDF omitiu sete slides ocultos:153 slides viraram146 páginas. Isso deslocaria evidências e referências.

Correção do experimento: incluir os slides ocultos só na cópia em memória antes da exportação; nunca salvar alteração no PPTX. Correção no produto: quantidade de páginas diferente de `nSlides` bloqueia a exibição com instrução de exportar incluindo ocultos. Teste com PDF propositalmente errado confirmou bloqueio. Depois exportação completa renderizou153 páginas, inclusive último slide. O caso mostra por que a numeração precisa ser conferida, não inferida pela aparência.

Captura também mostrou largura máxima herdada de768px comprimindo documento e números. Ajustada apenas na bancada para usar largura da área e permitir reflow das ações. Mantidos tokens SE.

## Validação registrada

- **283 testes aprovados/2 condicionais pulados**: suíte Corretor, shell/login e quatro testes de modal (cancelamento, sucesso uma vez, erro, troca de rota). Onze testes focados finais e tipagem passaram depois dos ajustes de sessão.
- **17 verificações SQL em PGlite isolado**: sem objeto/tamanho errado, material sem cadastro, autor forjado, imutabilidade, ativação idempotente, conflito de fingerprint, rollback da fonte, versão errada, leitura pública, negação de escrita em tabelas novas, autoria nova/imutável. Auth/Storage simulados; não são políticas reais de produção nem verificação dos caminhos legados.
- **11 Excel brutos reais de CJ** no browser: upload, extração de15 blocos, conjunto de11 originais, recuperação com hash, snapshot ligado ao conjunto e reload. Armazenamento/autenticação/banco totalmente simulados. `.local-inputs/materials-browser-1792078147483/result.json`.
- **PDF real de153páginas**: canvas com conteúdo, slides23/68/153, mapa, zoom, mobile390/320 sem overflow e decisão cancelada sem escrita/IA. `.local-inputs/real-bench-1792078587027/result.json` e capturas, após correção de filtros/ações. Script `corretor-real-bench.mjs`; somente a comparação de quantidade é automática, não a equivalência completa de conteúdo.
- **Reteste completo A1:** carteira/resumo/revisão, volta/back/forward/reload/erros, hash de achados antes/depois igual; zero tentativa de escrita/função no caso. `.local-inputs/a1-browser-1792078260875/result.json`.
- **Dez passes offline dos cinco estudos e Excel** reexecutados, gabaritos intactos. `.local-inputs/a23-materials-regression.log`; baseline anterior preservada. Sem nova IA.
- Build/tipagem/lint da composição aprovados; avisos gerais de chunk/Browserslist antigos permanecem. Função nova Edge passou `deno check` em cópia isolada (`.local-inputs/a23-deno-check.log`); publicação não realizada nesta rodada. PowerPoint export é evidência local; conversor não foi instalado nem disponibilizado na nuvem.

Scripts: `corretor-materials-migration.mjs`, `corretor-materials-browser.mjs`, `corretor-real-bench.mjs`; insumos e capturas em `.local-inputs/`. O serviço de aprovação bloqueou uma repetição por falta de créditos; na retomada o teste foi autorizado e passou. Sem contornar a aprovação, sem custo IA novo.

## Ativação e próximos passos

1. Commit isolado/check:live-docs e push autorizados na sessão. A0/A1 já enviados; verificar o hash da continuação no fechamento. Não tratar envio ao Git como ativação em produção.
2. Aplicar no Lovable `20261015150739_corretor_materials_workspace.sql` (NOVA migration, não a antiga já aplicada). Backup/ensaio de compatibilidade dos fluxos legados antes da ativação. Ela adiciona materiais/fontes/snapshots e autoria; não fecha autorização das tabelas legadas.
3. Publicar `corretor-material-preview` e frontend. `corretor-access` continua sendo login existente, sem secret novo. Sem IA paga.
4. Entrar com conta real, abrir CJ existente, guardar PPTX/11planilhas/prévia, recuperar em outro navegador e conferir hashes, numeração/decisões. Sem acesso administrativo a esse backend pelo conector e sem credencial pessoal, esta sessão não realizou esse aceite em produção.
5. Concluir A2: ingestão visitante controlada, autorização REST completa nas tabelas legadas, compartilhamento operacional e projeção pública do cadastro. Concluir A3: snapshots automáticos por execução, deduplicação, material visitante e histórico real. Evoluir A4: conversão em serviço compatível/custo e comparação/seleção por evidência. A5/A6 permanecem abertas.

Não pedir IA paga para validar estilo, navegação ou render PDF. Custos novos de conversor/armazenamento só após medir lote e apresentar orçamento. FIERGS preservado, nenhuma escrita Monday, horas não medidas e reservas semanais intactas.
