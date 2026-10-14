# Corretor de Estudos — proposta de lançamento e plano de execução

14/10/2026 · Gabriel · **Proposta para aprovação, sem implementação de produto/deploy.** Base consultada `e0c9d98`, main/origin 0/0 após fetch. [Protótipo navegável](./prototipo-lancamento.html) com dados demonstrativos. O protótipo não altera estudos nem gera análises.

## Decisão proposta

Transformar a entrada do Corretor numa carteira de projetos, com uma área persistente para cada estudo: contexto, materiais, revisões, versões e entrega. O benefício do lançamento é conseguir entender e continuar o trabalho, inclusive em outro computador, com prova do que foi conferido. A aparência acompanha essa organização.

Hipóteses da proposta enquanto as duas perguntas de descoberta estão sem resposta: equipe interna compartilhada, analista e revisor; prioridade em organizar os projetos existentes e tornar a revisão clara. Compartilhamento com clientes e portal externo ficam fora do primeiro lançamento. Retenção proposta: preservar originais, versões e decisões durante 36 meses, sem exclusão automática no lançamento; confirmar política institucional antes de ativar descarte. Os cenários de custo também cobrem acúmulo por três anos.

Não confundir três identidades: **geração do produto** (V1/V2/V3), **versão do arquivo** e **execução da análise**. Reanalisar os mesmos bytes deve criar execução nova, não fingir uma nova versão do estudo. A versão do motor fica nos detalhes da execução; o analista vê nome, data e resultado.

## Diagnóstico da experiência atual

- Código da landing contém tabs V3 Atual / V2 Testes anteriores / V1 Legado, filtros de situação e busca; existem recursos úteis, mas a arquitetura da navegação ainda expõe a evolução técnica do software.
- Nome técnico do PPTX domina a identificação. Faltam cadastro de cliente/projeto, responsáveis, prazo, tipo e referência temporal estruturados no contrato `StudyV3`.
- Revisão usa uma página extensa com cartões, filtros de confiança, uma régua de todos os slides e ações por achado. Captura local `closure-browser-1792007523169/review.png` mostra muito espaço intermediário e leitura em fonte pequena; é evidência de bancada, não captura atual de produção.
- `pptx-store.ts` guarda só os oito PPTX recentes no IndexedDB do navegador. `study_versions` guarda nome/hash/quantidade de slides, sem caminho remoto do original. Evidências persistidas não equivalem ao slide completo.
- `study_sources_v3` tem uma fonte derivada por estudo e atualização por substituição. A nova experiência precisa preservar o conjunto de fontes efetivamente usado por versão/execução.
- `findings_v3` é a projeção atual por `(study_id, rule_id)`. Acrescentar uma linha do tempo visual sem snapshots por execução daria aparência de histórico completo que a base não comprova.
- Listagem atual busca estudos com versões e estados de todos os achados. Com 520 novos estudos/ano, propor paginação e resumo agregado; evitar carregar todo payload/arquivo para abrir a carteira.
- Migrations locais criaram políticas amplas de acesso e bucket público de evidências. Antes de hospedar originais completos, conferir políticas realmente aplicadas e identidade do usuário; o cadastro de analista não pode substituir autorização no servidor. O conector Supabase não listou o projeto `mxinpvcqzbfbzjodhgtz`; plano/fatura e políticas atuais desse projeto não foram consultados.

## Direção visual e referências

**Identidade:** SE/System Design v0.1, extensão de comportamento da plataforma e decisão Vocacionais de 13/10. Oliva profundo, superfície papel, títulos Archivo, números tabulares, raio 2px, amarelo somente na ação principal. Tokens já copiados no repositório permanecem byte a byte; mudanças de composição são scoped ao Corretor. Não redesenhar os outros módulos do Rebrain.

**POC Vocacionais:** adotar largura controlada, alinhamentos recorrentes, tabela legível, contexto antes de número, dados recuperáveis e indicação de salvamento real. A decisão mais recente voltou à lateral funcional/recolhível; não aplicar a orientação antiga de retirar toda sidebar nem as pílulas da referência anterior.

**Linkages:** evidência legível junto da afirmação, fonte abrindo em tamanho completo, ações secundárias discretas e modais com foco/Escape. O corretor precisa de uma bancada de revisão, não de uma conversa de chat obrigatória. Usar a mesma lateral global existente; evitar empilhar duas barras laterais permanentes.

Referências externas de comportamento, consultadas em 14/10/2026:

- [Linear Projects](https://linear.app/docs/projects): contexto, recursos e atividade reunidos por projeto. Adaptar à revisão de estudo, sem copiar processos de desenvolvimento.
- [Figma version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history): versões nomeadas, autor/data e navegação no histórico. Comparação de conteúdo deve explicitar o que é realmente comparável.
- [Carbon Data Table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines): carteira pesquisável com filtros, seleção e ações consistentes, em vez de uma parede de cartões.
- [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): leitura e ações se reorganizam em telas estreitas; tabelas técnicas podem ter scroll próprio.

## Arquitetura da informação

No menu global, renomear o destino do corretor para **Corretor de Estudos** (avaliar se “Assistente de Projetos” continua agregador de outras funções antes de renomeá-lo). Dentro do módulo: **Projetos**, **Minha revisão**, **Arquivo**. Custos e qualidade ficam em visão secundária do módulo, somente após existir dado confiável; não reservar menu para telas vazias. “Novo projeto” é ação, não destino.

1. **Projetos:** tabela com nome amigável, cliente, cidade/UF, responsável, fase, pendências verificadas/a verificar, última atividade e próxima ação. Busca por nome/código/cliente/cidade; filtros salvos pessoais; padrão “Em andamento”. Nome de arquivo aparece nos materiais. Sem placar de “precisão” derivado da queda de alertas.
2. **Área do projeto:** cabeçalho persistente com nome/código/local/tipo/responsável, versão selecionada e ação principal. Abas **Visão geral · Revisão · Materiais · Histórico · Entrega**. Prazo e responsável podem ser preenchidos depois; não bloquear upload por campos comerciais.
3. **Visão geral:** último trabalho, próximo passo, cobertura e impedimentos; contexto do terreno/objetivo/competência; linha do tempo resumida. Mostrar “original não recuperado” quando só existe evidência parcial. Nenhum “analisado completamente” baseado apenas em execução sem falha.
4. **Revisão:** lista compacta de questões à esquerda e evidência/decisão à direita. Ao selecionar, mostrar slide completo quando disponível, recorte marcado, número/tabela de origem e explicação curta. Filtros “Erros confirmados”, “Prováveis”, “Precisa conferir”, “Decisões registradas”; confiança, situação e veredito são conceitos separados. Ação principal contextual: “Confirmar erro”, “Não é erro”, “Preciso conferir”. “Correção informada” fica distinta de “Correção verificada”. Atalhos opcionais com ajuda, sem interceptar digitação. No mobile, lista e detalhe em passos separados.
5. **Materiais:** grupos Apresentações, Planilhas e Bases, Referências/Briefing, Entregas. São filtros de papéis, não árvore de pastas arbitrária. Exibir nome original, competência, enviado por/em, tamanho, versão vinculada e estado do upload. Mesmos bytes reutilizados por referência. Permitir download original e restauração de vínculo, sem sobrescrever o objeto anterior.
6. **Histórico:** duas linhas de evento claras: “Arquivo revisado enviado” e “Análise executada”. Autor/data, motivo, motor/modelo, fontes usadas, cobertura, custo previsto/real e estado. Comparar novos/persistentes/não reavaliados/correções verificadas; mudança de regra sem mudança de arquivo não é mérito de correção do analista. Slides renumerados exigem mapa por conteúdo e confirmação se ambíguo; não casar automaticamente só pelo número.
7. **Entrega:** checklist de pendências e limitações, aceite de pessoa identificada, arquivo final e relatório congelado. Registra a revisão exata entregue; mudanças posteriores não alteram pacote anterior. “Arquivado” é organização, não exclusão.

**Legado:** mover V1/V2 para “Arquivo → Análises anteriores”. Preservar leitura e URLs. Relacionar a projeto somente por escolha humana ou hash idêntico comprovado, nunca por nome/cidade parecidos. O mesmo município pode ter vários terrenos/clientes. Um estudo órfão recebe cadastro provisório sem inventar cliente/autor.

## Cadastro progressivo

Entrada mínima: nome amigável (sugerido do arquivo e editável), tipo do estudo e PPTX. Cidade/UF sugeridas com confirmação antes da análise. Sistema preenche código interno, criador, data e estado de armazenamento. Permitir rascunho durante upload; só “Guardado” após confirmação remota.

Contexto complementar: cliente/contratante, empreendimento/terreno, endereço/coordenadas quando conhecidos, objetivo, competência da base, analista responsável, revisor, prazo e notas internas. Tipo controla checklist: vocacional vertical, panorama regional ou outro suportado; tipo sem contrato mostra cobertura limitada, não ausência de seções como erro. Cadastros de cliente/membro reutilizam entidades da plataforma quando houver contrato adequado, evitando duplicação.

Não exigir CPF/CNPJ/contato pessoal para revisar um PPTX. Evitar criar um CRM completo. Exportação externa exclui notas internas por padrão. Papéis propostos: analista edita materiais; revisor registra aceite; gestor acompanha; administração gerencia acesso/retencão. Perfis são permissões verificadas no backend, com equipe compartilhada conforme hipótese.

## Base técnica proposta

Modelo incremental, migrations aditivas e adaptadores para o motor atual:

| Entidade | Contrato essencial |
|---|---|
| `corretor_projects` | id, workspace_id, code, display_name, client_id opcional, tipo, cidade/UF/código territorial, contexto, owner_id, reviewer_id, prazo, status, archived_at, created_by, timestamps |
| `corretor_project_studies` | project_id, study_id, relação de vínculo; inicialmente um estudo corrente por projeto. Manter IDs legados e permitir vínculos confirmados sem fusão física |
| `corretor_assets` | id, workspace_id, storage_path, sha256, bytes, mime, original_name, role, uploaded_by, status uploading/ready/failed; chave única por workspace/hash quando houver política de deduplicação |
| `corretor_version_assets` | study_version_id, asset_id, papel, competência, source_set_id; conjunto imutável de insumos utilizados |
| `corretor_analysis_runs` | id, study_version_id, source_set_id, motor/prompt/schema/modelos, input_hash, job_status, custo estimado/autorizado/real, cobertura, início/fim, idempotency_key |
| `corretor_run_findings` | run_id, rule_id, payload original, evidências, regra avaliada; snapshot append-only. `findings_v3` continua projeção compatível durante transição |
| `corretor_review_events` | run/finding, ator, decisão anterior/nova, justificativa, timestamp, versão de concorrência. Evento humano nunca sobrescrito pelo replay |
| `corretor_deliveries` | versão/run aceitos, aprovador, instante, manifest de arquivos/hash, limitações e relatório congelado |

Fontes derivadas grandes e IR podem ir para objetos JSON comprimidos por execução; metadados pesquisáveis no Postgres. Snapshots de payload não devem duplicar imagens base64. Cache compartilhável apenas dentro do escopo autorizado e chave que inclua hash, motor, prompt e schema; não compartilhar conteúdo entre clientes por deduplicação global presumida.

Upload direto ao storage privado com retomada, status/progresso e confirmação de integridade; não passar PPTX de 174 MB como JSON por função. [Supabase recomenda uploads retomáveis para arquivos maiores que 6 MB](https://supabase.com/docs/guides/storage/uploads/resumable-uploads). Validar limites reais do backend Lovable antes de escolher endpoint. Indexar projeto/status/updated_at, versões por study_id/n, runs por version_id/data e eventos por finding/data; paginação por cursor. Finalização idempotente: objeto pronto → registro de versão confirmado; falha deixa tentativa recuperável, nunca versão aparentemente pronta sem arquivo.

Originais imutáveis por hash; nova revisão cria vínculo novo. “Restaurar” escolhe versão anterior como base de novo trabalho e conserva a linha do tempo. Evitar novas versões para bytes idênticos, mas aceitar novo run com novas fontes/motor. Duplo clique, upload interrompido, duas pessoas revisando, resposta atrasada e escrita de custo parcial precisam de tratamento explícito.

**Slide completo:** guardar PPTX não cria uma miniatura fiel automaticamente. Primeira fatia mostra evidência existente com aviso de recorte. Para página completa, piloto de renderização PPTX→PDF/imagens em trabalhador isolado com fontes e comparação visual, ou PDF enviado pelo analista e pareado por versão. Não usar IA generativa para reconstruir slides; não prometer fidelidade do renderizador antes de medir. Geração/armazenamento de previews está orçada como hipótese abaixo; processamento não tem orçamento fechado.

**Controle de acesso:** confirmar mecanismo real do Rebrain e sua ponte de identidade; token GeoBrain usado para consultar APIs não deve ser presumido como sessão Supabase. Usar autenticação existente validável no servidor ou ponte com claims assinadas. Buckets privados e políticas por associação à equipe/projeto; links assinados transitórios são detalhe técnico, não “sessão secreta” pedida ao analista. Verificar leitura/escrita cruzada, troca de workspace e proteção de notas internas. Não migrar silenciosamente evidências públicas já referenciadas: manifest, cópia, links compatíveis e retirada planejada.

## Medição e projeção de armazenamento

[Medição reproduzível](./ARMAZENAMENTO_MEDICAO_2026-10-14.json): cinco PPTX de referência pesam 57,3 a 174,1 MB; média **120,1 MB**. Planilhas por pacote: média **8,1 MB**; média 122,8 slides. SJC VAP/v2 compartilham fonte: a amostra é conveniente, não estatisticamente independente. Originais únicos desses cinco pacotes totalizam **0,634 GB**, descontadas duplicatas por hash. Isso não é o total do storage atual.

O snapshot disponível contém 14 registros de estudos; inclui histórico/testes e não demonstra 14 projetos únicos atuais. Projeção conservadora usa 14 como acervo inicial, com o mesmo tamanho hipotético por projeto. Consultar contagem e bytes reais na implementação. A serialização do snapshot mede 0,681 MB, sem representar ocupação física de tabelas/índices/cache/banco.

**Cenário recomendado:** 450 MB por projeto no ciclo, composto aproximadamente por três PPTX ×120,1 MB + três conjuntos de Excel ×8,1 MB +65,3 MB para PDFs/previews/derivados. É reserva de planejamento; não prevê três cópias idênticas nem limite de retenção. Cenário mínimo 150 MB (uma versão), intensivo 900 MB (seis versões). Dez estudos/semana =520/ano, média43,33/mês; não40/mês.

| Cenário | Acervo inicial modelado | Após 12 meses | Após 24 meses | Após 36 meses |
|---|---:|---:|---:|---:|
| Uma versão, 150 MB | 2,1 GB | 80,1 GB | 158,1 GB | 236,1 GB |
| Três versões, 450 MB | 6,3 GB | 240,3 GB | 474,3 GB | 708,3 GB |
| Seis versões, 900 MB | 12,6 GB | 480,6 GB | 948,6 GB | 1.416,6 GB |

Fórmula: `GB(m) = (14 + 520*m/12) * MB_por_projeto/1000`, retenção de todas as versões no período. O storage cresce em média 19,5 GB/mês no cenário recomendado. Reprocessar os mesmos arquivos acrescenta só derivados/eventos realmente novos.

**Referência de tarifa, não previsão da fatura Lovable:** [Supabase Storage](https://supabase.com/docs/guides/storage/pricing) informa 100 GB incluídos no Pro e US$0,0213/GB-mês excedente. Cenário recomendado: valor bruto do espaço US$5,12/mês no fim do primeiro ano, ou **US$2,99/mês de excedente** se todos os 100 GB estiverem disponíveis; no segundo ano US$7,97 de excedente; no terceiro US$12,96. Por projeto de450 MB, espaço bruto equivale a **US$0,0096/mês**, cerca de um centavo de dólar. O mínimo de150 MB fica sem excedente no primeiro ano; o intensivo900 MB resulta em US$8,11/mês de excedente no fim do primeiro ano. Cifras são custo mensal naquele ponto, não total anual nem média das parcelas.

[Supabase Pro](https://supabase.com/pricing) parte de US$25/mês, inclui franquias e tem despesas adicionais de compute conforme configuração. Essa assinatura não está somada ao “excedente de arquivos”. Não contratar outro backend para economizar poucos dólares antes de medir o que já está contratado. Franquias compartilhadas com outros módulos podem estar consumidas: usar `max(0, GB_corretor - franquia_restante)*tarifa`.

**Lovable real:** a [documentação de uso](https://docs.lovable.dev/features/project-usage) separa banco, storage, rede e compute em créditos de execução; a página consultada não publica uma tabela numérica por GB suficiente para fechar esta fatura. Projeto backend não listado no conector Supabase acessível. Portanto não aplicar US$25 ou a franquia100GB ao Lovable como fato. Confirmar em More → Cloud → Usage o consumo e as tarifas efetivas do workspace. [Cloud](https://docs.lovable.dev/features/cloud) usa a fundação Supabase, mas isso não estabelece equivalência comercial dos planos.

**Rede e banco:** três downloads integrais de120,1 MB para cada um dos43,33 novos estudos/mês ≈15,6 GB/mês, antes de previews e acessos ao acervo. Referência pública [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress): US$0,09/GB não cacheado, US$0,03 cacheado, após franquias independentes. Uma provisão de40 GB/mês teria valor bruto US$3,60 se toda a rede fosse não cacheada; não é medição. Previews sob demanda e listas paginadas evitam baixar todo PPTX ao navegar. Reservar inicialmente5 MB de metadados por projeto dá2,67 GB em534 projetos; ocupação física, índices, snapshots de cada run e cache exigem medição, não se confundem com bytes de objetos.

**Backup:** o [backup do banco](https://supabase.com/docs/guides/platform/backups) não inclui os objetos do Storage. Preservação real exige cópia dos objetos e teste de restauração do manifest. Uma segunda cópia integral leva o cenário recomendado no ano1 para480,6 GB de objetos somados; tarifa depende do destino e tráfego de cópia. Não contabilizada como inclusa no valor US$2,99. IA, renderização de slides, computação, assinatura Lovable, impostos e câmbio ficam separados. Não houve processamento pago nesta proposta.

## Plano de ação para implementação

| Fase | Trabalho concreto | Critério de conclusão / dependência |
|---|---|---|
| D0 — confirmar contratos | Validar hipótese de equipe/retencão, runtime, identidade, políticas, quota/tarifa; inventário real de arquivos/versões, lista de migração por hash | Decisões registradas; não começar upload remoto amplo sem acesso por projeto; preservar referências e 258 testes/dez passes |
| D1 — aprovar experiência | Avaliar protótipo com CJ/Rolândia, nomes longos, vazio/erro/upload parcial; ensaio analista→revisor | Conseguir localizar projeto, entender próxima ação, achar evidência e versão entregue sem orientação; layout1440/1024/390/320 e teclado |
| D2 — carteira e cadastro | Separar `CorretorV3Page` em páginas/hooks/componentes; rotas `/corretor/projetos`, `/corretor/projetos/:id`, abas com URL, redirects legados; cadastro progressivo | Projetos atuais acessíveis, links antigos preservados, refresh/voltar conserva contexto, filtro/paginação eficientes. Sem trocar motor |
| D3 — materiais duráveis | Migrations aditivas, assets/vínculos, storage privado, upload retomável, hash/idempotência, conferência e rollback; preencher originais dos cinco casos pareados | Abrir em novo navegador e recuperar mesmo PPTX/Excel por hash, retomar falha de rede, acesso indevido negado; nenhum “Guardado” prematuro |
| D4 — runs e histórico | Separar arquivo/run; snapshots de fontes/achados; eventos humanos concorrentes; versão nomeada/comparação; migrar legado com origem incerta explícita | Mesmo arquivo não duplica versão; run novo não apaga decisões; fontes da execução anterior recuperáveis; redução de alertas não gera sucesso falso |
| D5 — bancada de revisão | Lista/detalhe, evidência próxima, fonte e números por coluna, filtros, decisões, comparação; render piloto se autorizado | 43 classificações do corpus CJ/VAP/v2 rastreáveis por ID/limite; positivos/FP preservados, escopo parcial visível, controles de custo antes de qualquer chamada paga |
| D6 — entrega e lançamento | Aceite humano, pacote imutável, histórico legado em Arquivo, observabilidade de bytes/custo/latência; documentação e treinamento curto | Uma jornada completa com analista/revisor, recuperação em outro dispositivo, pacote final reproduzível; confirmação de bundle/funções publicados |

Implementação deve preservar a contagem por caso. Testes necessários: permissões/leitura cruzada, concorrência, upload interrompido, rollback de migração, regressão dos motores, confirmação/cancelamento de custo e teclado/reflow. Não estimar todo redesenho como cabendo nas seis horas reservadas da semana. Para o próximo bloco de duas horas, priorizar D0 e validar D1; replanejar explicitamente a implementação após medir esses contratos. Sem compromisso de execução de Lucas.

Migração por etapas: schema novo vazio → backfill idempotente em dry-run → leitura compatível → escrita nova validada → leitura nova controlada. Enquanto snapshots históricos não existem, indicar “histórico parcial” e não reconstruir decisões passadas por inferência. Rollback retorna ao adaptador anterior preservando entidades novas; não apagar originais. Publicação só após revisão da entrega, separada do aceite visual.

## Verificação da proposta

Protótipo HTML aberto no Chromium com rede externa bloqueada; carteira/revisão em1440/1024/390/320 px sem overflow global nem erro JavaScript. Busca/vazio, abas, decisão simulada, modal/Escape e cálculo de240,3GB conferidos. Capturas desktop/mobile inspecionadas; fontes podem usar fallback local quando Archivo não está instalada. O protótipo simplifica a navegação mobile e os dados dos projetos: não testa autenticação, salvamento, render PPTX nem integração. Evidências em `.local-inputs/design-proposal-20261014/`. Simulador de custo é ferramenta da proposta, não novo destino obrigatório no produto.

Medição reproduzível com `python scripts/diagnostics/corretor-storage-sizing.py --input-root C:/Users/GaloD/Desktop/SE/_UPLOADS_TESTE`, a partir dos cinco casos do manifesto. Projeção usa parâmetros explícitos, sem inferir consumo da conta. Tokens de produto intactos; nenhum motor, migração ou arquivo original foi alterado. Fases D0–D6 permanecem propostas, não execução concluída por existir este artefato.

## CTA para execução

“Execute D0 e D1 da proposta de lançamento do Corretor, valide os contratos reais de identidade/armazenamento e o protótipo com os estudos existentes. Depois implemente a primeira fatia carteira + cadastro + recuperação de materiais, seguindo a dependência D2→D3. Preserve os motores, decisões humanas, 258 testes e dez passes; sem IA paga. Apresente resultado e custos confirmados antes do push/deploy.”

Fase de proposta concluída; runtime permanece v0.69.1 no Git, produção não revalidada por este trabalho. Monday: [Corretor V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102), sem escrita no card.
