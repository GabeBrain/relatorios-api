# Assimilação da interface e revisão do fluxo — Corretor V3

15/10/2026 · Gabriel · **Plano preparado; implementação não iniciada.**

**Atualização de execução em15/10:** A0 e A1 executados e validados localmente; [resultado](./RESULTADO_A0_A1_INTERFACE_V3_2026-10-15.md),279 testes/2 condicionais pulados e dez passes offline. Rotas/carteira/resumo/cadastro neutro prontos para revisão antes de push. Registro inicial abaixo preservado; A2–A6 continuam planejados. Sem nova IA ou migrations.

**Continuidade autorizada em15/10:** A0/A1 enviados em416488d. [Primeira fatia A2/A3 e bancada A4](./RESULTADO_CONTINUIDADE_A2_A3_BANCADA_2026-10-15.md) validada localmente com283 testes/17 verificações SQL e materiais reais em serviços simulados. A2 parcial: UI/login prontos, autorização completa de tabelas legadas/guest controlado pendentes. A3 parcial: armazenamento autenticado sem perfil, fontes imutáveis e snapshot manual; automação por execução/guest/deduplicação pendentes. A4 parcial: render PDF real, não conversão automática PPTX. Nova migration/função preparadas, não ativadas. Sem IA paga.

## 1. Objetivo e baseline

Incorporar a composição aprovada do Claude Design ao produto React existente, com navegação coerente, materiais rastreáveis e revisão humana ao lado do documento. Preservar motores, evidências, IDs e decisões; não substituir aplicação por HTML de demonstração.

Baseline local `1f61fa5`; fetch origin/main em `1afa119`, três commits à frente da cópia local, diferença em arquivo TypeScript gerado. Sem upstream. Não confundir registro Git de deploy com comportamento observado no site. Gabriel informou publicação. Alterações documentais FIERGS e entrada própria no LIVE continuam locais e devem ser preservadas.

Referência recebida: `src/features/corretor/ref_interface_userDesign/corretor-v3.zip`, SHA256 `e8a04de251a4ee47b6b57b347828fcc536294d34808249d85a6147b47dfdc9f0`. Três telas atuais (Main, NovoEstudo, Revisao) e sete de apoio da rodada anterior. `support.js` do editor não incluído; visualização feita por materialização estática local em1440px, fontes externas bloqueadas. Não é teste funcional do editor nem validação mobile. Insumos e capturas em `.local-inputs/design-review-20261015/`.

O ZIP é insumo bruto, não código de produção: preservar original e origem; na execução verificar referências antes de classificá-lo/movê-lo para `.local-inputs/`. Versionar este plano, decisões e derivados mínimos, nunca importar `DCLogic`, dados fictícios ou tokens alternativos no bundle.

## 2. Decisões fechadas com Gabriel

- Marca **Geobrain**. Fundação visual: `SE/System Design/`; copiar tokens sem alteração, reutilizar primitives existentes e CSS restrito à feature. Composição Claude: lista compacta, filetes, poucos blocos, slide amplo, evidência ao lado, mapa navegável, amarelo na ação principal. Adaptar fontes/cores/raios do ZIP à fundação SE. Shell da plataforma permanece acessível, com modo de foco recolhível na bancada.
- Projeto = um estudo específico. Mesmo cliente/cidade não implica mesmo projeto. Nova versão é continuação escolhida explicitamente; sem merge automático por nome.
- Cadastro opcional. Nome sugerido pelo arquivo; cidade confirmável quando identificada; cliente/tipo/prazo opcionais. Ausência de cadastro: estado neutro “Sem cadastro prévio” e “Completar cadastro”, sem campos vazios espalhados. Não inferir tipo vocacional a partir de um default para todo estudo.
- Biblioteca pública de estudos, inclusive sem login. Autenticado: Meus estudos / Compartilhados comigo / Todos. Compartilhamento é organização, não autorização de leitura. Sem IP como identidade, sem autoria inventada para legados.
- Visitante consulta e inicia novo estudo sem autoria. Para alterar revisão existente, adicionar versão, registrar decisão ou concluir: modal “Entrar com Geobrain”, mesma conta, retomada da intenção após sucesso. Conta autenticada pode colaborar em estudo existente; autoria do estudo e autor da decisão são campos diferentes.
- Arquivo idêntico reconhecido por conteúdo: oferecer continuar análise existente, sem nova cobrança automática. Nome semelhante só sugere versão. Reuso de análise depende também de fontes/configuração/versão de regras/cobertura.
- Estudo principal em área de upload; planilhas opcionais abaixo com explicação de benefício. Nova versão pergunta usar planilhas anteriores ou atualizar. Preservar arquivos e conjunto efetivamente utilizados.
- Abrir estudo leva ao resumo; revisão por ordem dos slides, com filtro de gravidade. Slide e observação lado a lado, evidência localizada somente quando suportada. Mapa recolhível, legível em estudos longos.
- “Já ajustei no arquivo” é provisório. “Não é erro” dispensa justificativa obrigatória. “Aceitar nesta entrega” registra aceite consciente. Correção confirmada exige nova versão e reconferência com cobertura daquele problema.
- Conclusão exige tratamento de todas as pendências; ajuste provisório não habilita concluir. Exportar não é obrigatório. Relatório distingue declaração humana, aceite, falso positivo e correção verificada.
- Decisões compatíveis com evidência inalterada sobrevivem à nova versão; mudanças relevantes reabrem, preservando histórico. Menos alertas não comprova melhoria. Custo novo exige lote/orçamento antes de qualquer processamento pago.

## 3. Contrato de navegação e telas

Rotas canônicas propostas, mantendo `studyId` existente como identificador:

- `/corretor`: carteira.
- `/corretor/novo`: envio e preparação.
- `/corretor/estudos/:studyId/resumo`: resultado inicial e próximo passo.
- `/corretor/estudos/:studyId/revisao`: bancada.
- `/corretor/estudos/:studyId/materiais`: apresentação e fontes por versão.
- `/corretor/estudos/:studyId/historico`: documentos, execuções e decisões.
- `/corretor/estudos/:studyId/relatorio`: relatório da revisão/execução escolhida.

URLs antigas `/corretor?study=...`, `/corretor/analise?study=...`, `/corretor/projetos/:studyId` e `/:id/relatorio` recebem adaptadores/redirects, preservando destino equivalente e contexto. Não duplicar estado de seleção com efeito que reabre o estudo após Voltar. O bug atual limpa `selectedId`, mas mantém `study` na URL.

Busca, filtro, escopo pessoal e página na URL da carteira; versão, execução, slide e filtro na bancada. Voltar aos estudos tem destino explícito, inclusive após acesso direto ou nova aba; não depende apenas de history(-1). Preservar filtros/posição ao retornar, sem aceitar URL externa como retorno. Abas não acionam análise. Browser voltar/avançar e reload reproduzem o mesmo contexto. Alteração não salva exige aviso pertinente; operação persistida deve continuar observável fora da tela.

Carteira: resumo paginado do servidor, sem carregar findings de todos os estudos; mostrar contagens com significado (“4 graves de 12 pendências”), estado e atualização. Mini mapa agregado para documentos longos, com legenda, nunca 214 barras microscópicas. Não confundir cobertura com gravidade ou estudo revisado com análise integral.

Resumo: categorias, gravidade, pendências, cobertura/limitações e CTA Revisar pendências. Campos opcionais e detalhes técnicos sob demanda. Estados de pré-análise, parcial, falha, sem achados e revisado têm ações distintas.

Bancada: documento ocupa maior área; painel de observações do slide, uma expandida, origem e comparação legíveis; zoom/abrir evidência, anterior/próximo e mapa expansível. Sem coordenadas confiáveis, mostrar recorte/trecho e rótulo de limite, não contorno inventado. Navegar em todos os slides ou somente pendentes precisa ser explícito. No mobile alternar documento/observações sem comprimir ambos.

## 4. Frentes de implementação e ordem

As frentes de apresentação e comportamento avançam juntas por entrega. Não requer agentes paralelos. O gate de dados/acesso precede publicação das novas ações; a bancada visual pode avançar com fixtures enquanto persistência é preparada.

### A0 — congelar base e contratos

Sincronizar todos os remotos conforme autorização/regras, preservando trabalho local. Registrar frontend/Edge/migrations efetivamente observados. Congelar IDs e decisões dos casos Rolândia, CJ, SJC VAP/v2; manter dez passes de regressão e expectativas existentes. Conferir planos anteriores, tokens, rotas e schema remoto disponível. Separar conclusões locais de produção.

**Saída:** matriz atual→novo, inventário de limites/dados legados e critérios abaixo. Sem chamadas IA. Se acesso administrativo faltar, continuar no ambiente isolado e indicar precisamente dependência Lovable.

### A1 — primeira fatia utilizável: navegação, cadastro e estrutura

Alterar `App.tsx`, `CorretorProjectsPage.tsx` e fronteira da `CorretorV3Page.tsx`. Criar `StudyLayout`, navegação Resumo/Revisão/Materiais/Histórico e adaptadores de rotas. Extrair seleção/retorno para hook de rota. Corrigir imediatamente ida/volta e retirar placeholders de cadastros ausentes. Aplicar composição da carteira e resumo com os dados já confiáveis. Manter revisão atual embutida como transição, sem dizer que a nova bancada está pronta.

**Aceite:** entrar pela carteira, abrir projeto, revisar, voltar, trocar estudo, usar browser back/forward, reload e link direto sem reabrir estudo errado; busca/filtro/página preservados. Legado sem cadastro permanece utilizável e não ganha autoria inferida. Nenhuma análise disparada por navegação.

### A2 — identidade, leitura pública e escrita autenticada

Reusar `corretor-access` e cliente de sessão; criar `GeobrainAuthDialog` com intenção pendente tipada (ação, estudo, versão), executada uma única vez após login. Cancelar não altera registros; sessão expirada permite retomada sem perder contexto. Não registrar senha em logs. Nome e autoria vêm de identidade verificada, sem expor emails/tokens na biblioteca pública.

O contrato privado atual NÃO implementa a decisão de biblioteca pública: `corretor_projects.owner_id NOT NULL`, membros como autorização, originais atrelados ao cadastro e inserts apenas do owner. Planejar migration aditiva: separar identidade técnica do estudo, autoria opcional e perfil de cadastro; tratar compartilhamentos como atalhos/notificações internas. Não exigir perfil completo para persistir material.

Leitura pública disponibiliza estudo e evidências necessárias à revisão, com projeção de dados apropriada. Download público dos binários originais não foi explicitamente decidido; propor download autenticado inicialmente, mantendo visualização pública, e apresentar essa distinção antes de ativar a política. Não tornar bucket inteiro público para resolver navegação.

Criação sem conta deve passar por operação controlada de servidor para novo rascunho/upload, com limites de tamanho/formato, idempotência e permissão temporária limitada ao envio iniciado; sem exigir do usuário códigos ou credenciais extras. Autoria fica ausente. Essa capacidade não permite editar um estudo existente. Toda decisão/versão/conclusão existente exige identidade GeoBrain válida no servidor. Revogar caminhos legados que permitam burlar via REST, não apenas ocultar botão. Exclusão/administração não são liberadas por essa regra de colaboração.

**Aceite:** visitante lista e cria novo estudo; não altera estudo de terceiro por UI nem API. Autenticado registra decisão com autoria correta; Meus/Compartilhados/Todos retornam conjuntos certos. Cancelar login mantém tudo intacto; sucesso retoma uma vez. Nenhum dado privado de conta na resposta pública. Migrations verificadas localmente e ativadas no Lovable em etapa explícita.

### A3 — materiais, versões e execuções reproduzíveis

Extrair ingestão da página monolítica para serviço/hooks; reusar upload TUS/hashes e extração existentes. Entidades conceituais aditivas: documento/versão imutável, ativo original, conjunto de fontes imutável, execução com versão do motor/escopo/configuração/custo/cobertura. Reanalisar mesmos bytes cria execução, não nova versão. O cadastro comercial continua opcional.

Guardar PPTX e planilhas brutas, hashes/bytes/nome, processamento derivado e vínculo de fonte por execução. Nova versão deve oferecer reaproveitar ou atualizar fontes, nunca sobrescrever fonte histórica. Detectar duplicata exata por SHA256 (compatibilidade SHA1 legado), pedir continuação explícita, impedir corrida/duplo upload. Nome normalizado apenas sugere vínculo.

Fingerprint de reuso = documento + conjunto de fontes + motor/configuração/escopo compatíveis. Cache parcial informa cobertura; não finge análise concluída. Upload interrompido, arquivo incompatível e falha de confirmação não viram material salvo. Análise paga só após lote/estimativa confirmados; orçamento reavaliado quando material/escopo muda.

**Aceite:** arquivo repetido não gera duplicata/cobrança; nova versão preserva a anterior e suas planilhas; recuperação em outro navegador verifica hashes. Visitante consegue persistir novo estudo sem cadastro comercial. Arquivo não suportado recebe orientação clara. Começar com PPTX/XLSX já suportados; PDF só entra após comprovar pipeline e cobertura, não por ícone do protótipo.

### A4 — renderização real e bancada

Antes de prometer o slide inteiro, ensaiar visualização de PPTX real com gráficos/tabelas/imagens/fontes nos casos existentes. Inventariar representações completas versus recortes persistidos; escolher renderer/conversão compatível com ambiente Lovable e medir custo/latência/bytes. Infraestrutura paga nova requer orçamento antes da contratação/uso. Não usar HTML ilustrativo do ZIP como reprodução fiel.

Contrato do visualizador: página completa disponível, somente evidência disponível, original necessário, renderização em andamento ou falha. Coordenadas vinculadas à versão e ao artefato; sem localização confiável mostrar trecho/recorte e comparação. Pré-render/cache por hash, carregamento sob demanda e limpeza de memória; não renderizar 214 slides simultaneamente.

Componentes propostos: `ReviewWorkspace`, `SlideViewer`, `FindingPanel`, `EvidenceComparison`, `SlideNavigator`, `ReviewProgress`. Reusar pipeline/guardas atuais por adaptador de leitura; separar gravidade de confiança e cobertura. Mapas expansíveis, legenda, teclado, zoom e foco; shell global recolhível por contexto, sem alterar outros módulos.

**Aceite:** CJ/Rolândia com evidência real e estado de disponibilidade correto; comparação tabela×texto e coluna ambígua legíveis; estudo de150/214slides navegável sem estouro de memória. Ausência de render completo fica explícita. Modo parcial não conta como aceite de renderização integral.

### A5 — decisões, reconferência e conclusão

Modelo novo separa decisão humana de resultado do sistema. Eventos anexados com estudo/versão/execução/achado/ator/data e controle otimista; rejeitar edição concorrente silenciosa. Estados mínimos: pendente; ajustado declarado/aguarda reconferência; não é erro; aceito na entrega; corrigido confirmado. Campos legados `pendente/corrigido/ignorado` não bastam: criar adaptador conservador, não converter ignorado automaticamente em aceite nem corrigido legado em correção comprovada.

Preservação entre versões exige correspondência demonstrável de regra/acusação/evidência/contexto/fonte; hash só do número do slide ou nome não basta. Reordenação de slides pode manter correspondência; ambiguidade reabre para conferência sem apagar a decisão original. Alteração da fonte também invalida reuso quando relevante.

Reconferência só confirma correção com cobertura da regra e evidência pertinente; ausência fora do escopo não resolve alerta. Preservar controles verdadeiros e mecanismos de deduplicação/custo existentes. Cada nova versão reabre seu próprio ciclo de revisão; revisão anterior permanece registrada.

Conclusão atômica no servidor vinculada à versão/execução e revisão das decisões: bloquear pendentes e “já ajustei” não reconferidos; aceitar não-é-erro/aceito/corrigido confirmado. Se houver conteúdo não analisado, apresentar cobertura e registrar ciência explícita dessa limitação, sem afirmar validação integral. Mudança concorrente de decisão/versão impede concluir um estado desatualizado. Histórico com snapshots novos; legado rotulado como parcial, sem reconstrução fictícia.

**Aceite:** “Já ajustei” nunca habilita sozinho Concluir; negativo da reconferência reabre; falso positivo preservado quando evidência igual; mudança relevante reabre; conflitos não sobrescrevem; anônimo não decide/conclui por API.

### A6 — relatório, jornada completa e publicação

Adaptar `CorretorReportPage` para relatório padrão por revisão concluída com versão, fontes, cobertura, achados e decisões; distinguir declarado/verificado/aceito. Disponível sem exportação obrigatória, exportação sob demanda com conteúdo coerente com o registro congelado. Identidade técnica/PII não vazam no relatório público.

Ensaio completo: visitante cria estudo → encontra duplicata ou análise → resumo → login contextual → decisões → nova versão/planilhas → reconferência → conclusão → relatório → retorno à carteira/novo navegador. Reusar corpus e caches antes de qualquer IA paga.

**Publicação:** migrations aditivas/compatíveis primeiro, funções depois, frontend por último; ensaiar reversão de leitura para interface anterior sem apagar dados novos. UI antiga de rollback não pode ignorar novas regras de decisão/conclusão: desabilitar escrita incompatível. Apresentar resultado/diff/evidências antes do push conforme autorização vigente; confirmar deploy real de frontend/funções e retestar no site. Não encerrar pela existência do commit.

## 5. Critérios de teste e evidência

- Rotas: carteiras com filtro/página, estudo A→revisão→carteira→B, acesso direto, URL antiga, aba nova, reload, back/forward, login cancelado/sucesso/expirado e versão inexistente.
- Visual: desktop1440/1024 e mobile390/320, zoom200%, textos longos, teclado/Escape/foco, contraste e estados loading/vazio/falha/parcial. Benchmark de carteira500+ estudos e documento214slides com dados sintéticos identificados, consulta paginada, sem carga integral dos achados.
- Persistência: duas identidades e visitante, acesso direto API, criação sem perfil, compartilhamento, fonte imutável, upload interrompido, hash inválido e nova versão concorrente. Estado real do servidor é o critério, não apenas toast.
- Revisão: dez passes originais congelados dos cinco estudos; casos Rolândia/CJ/SJC, duplicatas, anos, coluna ambígua, falso positivo e erro verdadeiro. Daniele: usar print como referência, não afirmar original completo preservado; visual precisa mostrar tabela×conclusão e limite da evidência.
- Gabaritos não mudam para acomodar implementação. Registrar antes/depois, regressão e impedimento por caso. Aprovação de testes de UI não comprova precisão global do motor.
- Rodar testes proporcionais ao lote; suíte/regressão completa nos pontos que alteram adaptadores, decisões e conclusão. Não repetir análises pagas por mudança visual. Logs/capturas grandes em `.local-inputs/`; manifesto pequeno e resultados no documento da etapa.

## 6. Ordem de entrega e dependências

Primeiro lote recomendado: **A0+A1**, com percurso real carteira→resumo→revisão→carteira e cadastro neutro. Em seguida **A2+A3** fecham identidade/persistência; prova de renderização A4 pode ser investigada em paralelo lógico. Bancada A4 sobre esses contratos; decisões A5; fechamento A6. Não publicar botões com comportamento apenas simulado.

Dependências explícitas: administração Lovable para migrations/funções; render de documento fiel; schema de autoria opcional e snapshots; disponibilidade dos originais; tarifa/ocupação ainda não confirmadas. Custo desta preparação zero IA; execução inicial usa replay/local. Não assumir autorização de US$2 histórica como orçamento atual. Ler biblioteca pública não implica aprovar consumo pago ilimitado de visitante: gate de custo permanece, mecanismo de orçamento do servidor deve ser verificado antes de habilitar geração paga pública.

Plano amplo não cabe automaticamente nas seis horas reservadas. Medir o primeiro lote, registrar impedimentos e replanejar sem atribuir horas retroativas ou compromisso a Lucas. Gabriel permanece responsável. Não alterar Monday sem pedido explícito.

Em cada entrega: atualizar este plano, LIVE de regras (versão planejada/runtime distinguida), LIVE_rebrain, decisões frontend e mapa SE quando interface mudar; diário e plano semanal com evidência/estado/próximo passo. Preservar outras frentes com staging explícito. Não copiar a política pública para outras features.

## 7. CTA de execução

> Execute o PLAN_ASSIMILACAO_INTERFACE_V3_2026-10-15.md. Comece por A0 e A1: sincronize preservando alterações locais, corrija a navegação de entrada/saída dos estudos, adote cadastro opcional sem alertas artificiais e integre carteira e resumo com a composição aprovada. Prepare os contratos das próximas etapas, preserve motores/decisões e os dez passes de regressão, use materiais existentes e não faça IA paga. Atualize os documentos e apresente a primeira fatia funcionando com evidências antes do push.

As fases A2–A6 são continuidade planejada, não execução presumida ao autorizar apenas o primeiro lote.


### 15/10 — retirada da landing legada solicitada por Gabriel
Carteira única, novo envio assimilado e bancada sem alternância para lista antiga. Validação local e limites em `RETIRADA_LANDING_LEGADA_2026-10-15.md`. Push autorizado; produção a conferir. Escopo A2/A3 anterior permanece parcial.
