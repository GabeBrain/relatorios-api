## 19/10/2026 — Entrada unificada e estudos agrupados

Gabriel pediu eliminar a passagem redundante pelos dois cards. A carteira agora incorpora a preparação existente (PowerPoint, Excel e objetivo), seguida dos estudos salvos. Organização Recentes/Por cidade/Por mês com grupos visíveis, seletores de grupo/contagens e calendário nativo para data de recebimento. Busca, escopo pessoal/compartilhado, paginação e filtros preservados; retorno ao estudo conserva grupo e data na URL. Preparar com conta atualiza a carteira na mesma página. Cidade ausente/data ausente não são inventadas; tags derivam dos registros existentes. Sem nova taxonomia persistida ou cadastro obrigatório. Reutiliza preparação e pipeline, sem alterar motores/prompts/decisões/custos. Tipos TypeScript e ESLint dirigidos aprovados; sem novo ensaio browser ou regressão de materiais nesta mudança. Não transferir os resultados da rodada anterior para este recorte. Push autorizado; frontend no Lovable e verificação visual em produção pendentes. Sem migration, Edge nova ou IA paga.

## 19/10/2026 — Retorno de usabilidade do Assistente: validado localmente

T0–T7 executados no recorte local: duas entradas diretas, somente Sugestão de análise, autenticação compartilhada no menu, Meus estudos incompletos, Excel antes da análise e retomada contínua, revisão direta e três áreas. Base d3463d7 sincronizada preservando documentos FIERGS/ZIP. 327 testes aprovados/2 ignorados, dez passes materiais, navegador15+9+8 verificações com serviços simulados, tipos/lint/build aprovados. Teste adicional de retomada com fonte preservada aprovado. Motores/prompts/servidor intactos. Sem IA paga, banco remoto, deploy ou push. Login real e produção pendentes; nenhuma migration/Edge nova para este lote. Evidência: docs/features/corretor-vocacionais/design/RESULTADO_RETORNO_USABILIDADE_ASSISTENTE_2026-10-19.md. Próximo: revisar resultado, autorizar push e publicar frontend; retestar acesso real sem processamento pago. Reservas não são horas medidas; não aprova a ordem integral da semana provisória.

# Decisões de Frontend — Rebrain

### 2026-10-16 — Preparação compartilhada e recomendação por versão

- **Contexto:** recomendador existente perdeu acionamento na troca da landing; materiais sem confirmação visual, geração sem histórico/contabilidade de custo integrada.
- **Decisão:** dois objetivos na mesma preparação, materiais preservados e preenchimento oliva/check só após entrada válida; Recomendação lazy dentro de StudyLayout, por versão. Previsão/limite antes da geração; resultado público salvo permite copiar/baixar/reabrir sem original ou IA. Button/Input/Select/Progress e tokens SE intactos, sem biblioteca ou primitive novo.
- **Consequência:** custo e resultado persistidos pelo servidor; pausa não perde memos e desconhecido não repete. Consulta de histórico falha explicitamente; recomendação não substitui revisão nem interpreta Excel/raster. Métricas financeiras na calibração, separadas dos falsos positivos. Loading de versões encerrado também em falha; troca de arquivo/objetivo bloqueada durante geração na preparação.
- **Estado:** validado localmente com materiais reais e serviços simulados; ativação coordenada de migration/duas funções/frontend e qualidade consultiva real pendentes. [Evidências](../features/corretor-vocacionais/design/RESULTADO_RECOMENDADOR_E_METRICAS_2026-10-16.md).

### 2026-10-16 — Rascunho separado da carteira pessoal do Corretor

- **Complemento posterior de Gabriel (v0.73.2):** apresentação válida preparada com conta já registra estudo pendente, sem exigir cadastro/cidade/planilhas ou executar IA. Reutiliza a operação atômica existente e o ID no início explícito, com nova conferência de identidade/hash/versão/estado. Isso substitui a decisão anterior de só registrar o envio no início da avaliação para usuários autenticados; visitante continua local. Cancelar formulário não publica seus campos. Originais remotos não são prometidos por esse registro.

- **Contexto:** rascunho sobrevivia ao registro; autoria imutável não incluía cadastro salvo posteriormente na conta.
- **Decisão:** consumir preparação após vínculo durável, conservando planilhas por hash; rascunho antigo analisado abre resultado. Carteira pessoal une autoria e propriedade do cadastro; salvar/retornar atualizam consulta sem editar autoria. Campos com ícones Lucide e primitives/tokens existentes.
- **Consequência:** visitante não recebe autor inventado; vínculo posterior exige cadastro salvo. PDF é complementar; cache local não promete acesso entre dispositivos. Correção só frontend, sem mudar motores ou decisões.
- **Estado:** validado localmente com serviços simulados, produção pendente. Evidência `docs/features/corretor-vocacionais/design/RESULTADO_RASCUNHO_CARTEIRA_2026-10-16.md`.

### 2026-10-15 — Fidelidade ao PowerPoint no canvas SP

- **Contexto:** Lucas pediu a formatação do modelo original na prévia do relatório.
- **Decisão:** somente o canvas SP usa a paleta e Tahoma do PPTX, com artes originais em 16:9 e dados dinâmicos sobrepostos. Shell e controles continuam com tokens/primitives Brain; ampliação usa Dialog existente.
- **Consequência:** canvas mantém fundo claro também no tema escuro e escala sem refluír a composição. Artes estáticas não são objetos editáveis de PPTX. Exportação, comparações históricas e demais páginas não são liberadas por essa prévia.

### 2026-10-15 — Preparação contínua e visualizador único no Corretor

- **Contexto:** upload iniciava ata/transição antes dos Excel; imagens duplicadas e triagem estreita prejudicavam decisão.
- **Decisão:** página de preparação local com comando único/limite confirmado; registro de lotes no servidor antes de IA; `StudySlideViewer` compartilhado, página sob demanda e texto abaixo; diálogo amplo de revisão com decisões assíncronas. Catálogo em rota lazy de referência. Reutiliza Button/Input/Select/Dialog/Progress e tokens SE idênticos.
- **Consequência:** novo protocolo exige migration e publicação coordenada das funções/frontend; arquivo completo antigo continua dependência real para prévias. Conversor local não é serviço hospedado. Decisões e motores conservados; tabela de execução não ganha acesso público. O texto acessível de fechar do primitive Dialog foi traduzido para português.
- **Estado:** validado localmente, limites/ativação em `docs/features/corretor-vocacionais/design/RESULTADO_FLUXO_CONTINUO_E_REVISAO_2026-10-15.md`; não produção.


### 2026-10-15 — Autenticação contextual e PDF complementar na bancada Corretor

- **Contexto:** token de API não basta para a identidade de escrita; evidências recortadas não representam slide inteiro. PowerPoint local omitiu slides ocultos na exportação padrão.
- **Decisão:** provider de intenção cancelável usa login Geobrain existente e retoma uma vez; visualizador PDF.js lazy por página, com comparação de contagem de páginas e distinção entre documento/recorte. PDF é prévia fornecida da versão, sem fingir conversão automática PPTX ou localização de erro.
- **Consequência:** materiais novos independem de cadastro comercial, mas requerem migration/função. Login UI não fecha autorização das tabelas legadas; gate servidor e criação visitante controlada são pendências explícitas. Domínio, tokens e shell existentes reutilizados; snapshot manual não é execução automática.
- **Escopo:** primeira fatia local A2/A3/A4; sem adoção global de novo visualizador nem mudança dos motores/decisões.

### 2026-10-15 — Estudo como contexto de rota persistente no Corretor

- **Contexto:** seleção local e parâmetro study divergiam; Voltar limpava seleção e efeito reabria o estudo. Carteira e revisão tinham navegações desconectadas.
- **Decisão:** rotas canônicas `/corretor/estudos/:studyId/:section`, contexto de carteira sanitizado na URL, áreas por links acessíveis e adaptadores de links legados. Carteira abre resumo; revisão atual lazy dentro de StudyLayout é transição para A4. Estado do resumo reinicia por estudo; consulta estrita trata erro sem falso zero.
- **Consequência:** back/forward/reload/links diretos reproduzem contexto; nenhum motor ou decisão é alterado. Cadastro opcional não bloqueia leitura/revisão. Composição Claude adapta aos tokens SE v0.1 existentes; sem copiar o runtime do editor ou seus tokens alternativos. Paginação servidor e permissões públicas são etapas posteriores.
- **Escopo:** somente Corretor A0/A1, validado localmente; outras features e shell preservados.

Registro leve de exceções e decisões duradouras às [Guidelines de Frontend](./FRONTEND_GUIDELINES.md).
Não use para changelog de feature; mudanças funcionais continuam nos documentos vivos dos projetos.

### 2026-10-15 — Identidade privada do Corretor e navegação recuperável

- **Contexto:** token GeoBrain não representa automaticamente identidade Supabase para originais privados; carteira perde contexto se estado ficar só no componente.
- **Decisão:** mesmo formulário habitual usa ponte no servidor somente em rotas Corretor, com permissão assinada e lista explícita; manter busca/filtro/página/aba/versão na URL. Reusar primitives e tokens SE existentes.
- **Consequência:** ativação depende de função e migration complementar; 404 informa indisponibilidade e mantém acesso GeoBrain legado, sem fabricar identidade. Paginação atual é cliente, com consulta existente; evolução de servidor continua pendente.
- **Escopo:** `/corretor/*`, sem mudança nos motores ou regras humanas. Continuação local, produção não verificada.

## Modelo

```md
### AAAA-MM-DD — <decisão curta>
- **Contexto:** <qual problema recorrente ou trade-off existe>
- **Decisão:** <o padrão adotado>
- **Consequência:** <o que passa a ser esperado e o custo aceito>
- **Escopo:** `<módulos/rotas>`
```

### 2026-08-19 — Trabalho longo de feature roda no shell, não na rota
- **Contexto:** a exportação do Panorama rasteriza 62 lâminas do DOM por ~90 s. Presa ao componente
  da rota, ela morre assim que o usuário navega para outra página — e obriga a esperar parado.
- **Decisão:** trabalho longo que depende do DOM fica num *host* montado pelo `AppLayout`, fora do
  `<Routes>`, comandado por um store leve. Um portão (`PanoramaExportGate`) assina só o store e
  importa o host com `lazy()` quando há job ativo, preservando o lazy-loading da rota. O progresso
  aparece num card fixo com ação de cancelar, visível em qualquer página.
- **Consequência:** o padrão vale para exportações e processamentos longos de outras features. Custo
  aceito: enquanto o job roda, o DOM pesado fica montado no shell; o host deve desmontá-lo ao
  terminar ou cancelar, e o estado não sobrevive a recarregar a página.
- **Escopo:** `src/features/panorama-secovi-fiergs/{export-store.ts,components/PanoramaExport*}`, `src/App.tsx`

### 2026-09-04 — Carregamentos e seleções usam superfícies Brain compartilhadas
- **Contexto:** telas de dados tinham *skeletons* sem contexto e controles nativos com aparência
  inconsistente. Isso aumentava a incerteza nas consultas RAIS e fazia novos fluxos divergirem
  visualmente desde a primeira entrega.
- **Decisão:** o estado compartilhado `BrainLoadingState` comunica etapa, marca e tempo decorrido
  real para operações assíncronas; os primitives `Select`, `Popover` e `Command` adotam a mesma
  superfície Brain (borda verde sutil, raio amplo e sombra leve). Combobox pesquisável continua a
  ser `Popover` + `Command`; escolha finita, `Select`.
- **Consequência:** novas telas não usam `<select>` nativo nem ETA inventado. A alteração dos
  primitives tem alcance global, por isso cada uso existente deve conservar contraste, teclado e
  foco ao ser alterado.
- **Escopo:** `src/components/{feedback/BrainLoadingState.tsx,ui/{select,popover,command}.tsx}` e
  telas consumidoras, inicialmente `src/features/empresas-empregados/`.

### 2026-09-04 — Páginas de relatório usam cabeçalho editorial leve
- **Contexto:** títulos de relatórios coexistiam como cards hero, barras simples e blocos isolados,
  o que fragmentava a leitura ao navegar entre AELO, Secovi e as novas páginas Rebrain.
- **Decisão:** o padrão comum é uma faixa `border-b` com categoria, título, subtítulo de recorte e
  contexto secundário opcional. Badges de marca não pertencem ao cabeçalho de página; a identidade
  já está no shell.
- **Consequência:** relatórios novos adotam o padrão imediatamente; relatórios existentes migram
  apenas quando forem tocados, sem refatoração visual em massa.
- **Escopo:** `docs/architecture/DESIGN_SYSTEM.md` e páginas de relatório, inicialmente
  `src/features/empresas-empregados/pages/EmpresasEmpregadosPage.tsx`.

<!-- novas decisões acima desta linha -->
### 2026-10-14 — Corretor orientado por projetos com revisão compatível
- **Contexto:** geração do produto e versões do estudo disputavam navegação; originais limitados ao navegador e cadastro incompleto.
- **Decisão:** carteira lazy em `/corretor`, cadastro/área em `/corretor/projetos/:studyId`; revisão anterior em `/corretor/analise`, query antiga `study` preservada. Primitives existentes e composição scoped com tokens SE, sem mudar o shell geral. Upload TUS importado só ao usar o material.
- **Consequência:** histórico identifica limites; identidade GeoBrain não se torna permissão Supabase por inferência. Recuperação remota requer migration/acesso confirmado; indisponibilidade é visível. Módulo preserva motores e decisões humanas. Sem novo primitive/token global.
- **Escopo:** `src/features/corretor/pages/CorretorProjectsPage.tsx`, `lib/projects.ts`, `styles/projects.css` e rotas `App.tsx`. Validação local documentada na execução D0/D1; produção pendente.
- **Ajuste de composição:** `AppLayout` recolhe a lateral automaticamente abaixo de768px somente nas rotas Corretor, com expansão em sobreposição/Escape; preferência desktop preservada. O teste de overflow sozinho não detectou o conteúdo comprimido; bancada mede também a largura útil e inspeciona capturas. Shell dos demais módulos segue comportamento anterior.
