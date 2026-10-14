# Execução D0 e D1 e primeira fatia da carteira

14/10/2026 · Gabriel · base `08d70dd`, origin/main um commit atrás da main local após fetch. **Carteira/cadastro/contrato de originais implementados e validados localmente. Ativação remota ainda depende de identidade e migration no backend Lovable.** [Proposta](./PROPOSTA_LANCAMENTO_2026-10-14.md). Sem IA paga, push, escrita de registros humanos ou upload real em produção.

## D0: identidade e armazenamento reais

Consulta somente leitura ao host do app `mxinpvcqzbfbzjodhgtz.supabase.co`, em14/10/2026 21:05UTC:

- `studies_v3`: HTTP200, **50 registros, 58 versões e 15 estudos V3**. São estudos, não projetos únicos confirmados; a projeção anterior com14 é baseline histórica.
- `/auth/v1/user` com a identidade pública usada na consulta: HTTP403. Isso não testa um usuário autenticado real e não comprova que nenhum usuário tenha sessão.
- `/storage/v1/bucket`: HTTP200/lista vazia para esse papel. Não significa zero objetos nem zero buckets no backend; acesso administrativo não está disponível.
- Login lateral atual chama `/auth/login` GeoBrain e guarda token no auth-store; novo cadastro privado depende de identidade Supabase validada via `getUser()`. Token GeoBrain não foi aceito como sessão Supabase por inferência. Broker do preview é mecanismo do editor, não prova de identidade do usuário final.
- Conector Supabase continua sem listar esse projeto. Não foram usadas credenciais dos outros três projetos para consultar ou modificar este. Schema/políticas realmente aplicados, ocupação/limites do bucket e ponte de identidade permanecem dependências de publicação.

**Decisão de implementação:** leitura compatível dos estudos antigos; cadastro/originais novos somente após identidade validada, negando usuário anônimo. Migration aditiva com proprietário e membros explicitamente associados; não infere autoria do legado. Nova sessão/login ou ponte GeoBrain→Supabase não foram criados. É necessário validar qual mecanismo já é suportado pelo backend Lovable e integrá-lo antes de habilitar o compartilhamento em produção.

## D0: custos reais recebidos

Gabriel forneceu print do Cloud Usage, transcrito em [evidência](./CUSTO_REAL_PRINT_2026-10-14.json). Período/plano/volume em GB não aparecem na imagem.

| Categoria | Uso em créditos | Coberto pela franquia | Diferença aproximada |
|---|---:|---:|---:|
| Database server | 22,00 | 20,70 | 1,30 |
| Database storage | 0,00 | não discriminado | 0,00 |
| Network | 1,77 | 1,70 | 0,07 |
| Compute | 1,45 | 1,38 | 0,07 |
| Storage de arquivos | 0,10 | 0,09 | 0,01 |
| AI / Connectors / Realtime | 0,00 | não discriminado | 0,00 |

**Total das categorias superiores:25,32 créditos; cobertura explicitada23,87; diferença aproximada1,45**, considerando arredondamento do painel. Não somar Database22 +Database server22 novamente. Esse é consumo do projeto inteiro, com outros módulos; não taxa mensal atribuível ao Corretor. AI0 é essa categoria de cobrança, não prova de que chamadas diretas a outro fornecedor custaram zero historicamente.

Relato “8GB por projeto” é hipótese do usuário; não aparece no print. Espaço de banco e objetos Storage são categorias distintas. Não tratar storage de arquivos como limitado a8GB nem deduzir US$/GB de0,10 crédito sem volume e período. Valor real em créditos está confirmado pelo print; plano, franquia em GB, conversão contratual de crédito e preço incremental por GB ainda não estão confirmados. Próximo de custo: Cloud Usage/Advanced settings com período, ocupação e tarifa; medir bytes dos objetos com acesso administrativo.

Modelo de450MB/projeto/10novos semana continua referência de dimensionamento, com custos públicos Supabase explicitamente condicionais. Não transformar US$2,99 em promessa de fatura Lovable. Nenhum custo de IA novo desta execução.

## D1 e primeira fatia implementada

- Entrada `/corretor` mostra a carteira. `/corretor/projetos` e `/corretor/projetos/:studyId` têm links persistentes. `/corretor?study=...` preserva acesso anterior; fluxo atual de ingestão/revisão permanece em `/corretor/analise`. Gerações antigas acessíveis por Arquivo/filtro e V1 pelo fluxo anterior; componentes/motores existentes preservados.
- Carteira pesquisável por nome/cliente/cidade/responsável, filtros Em andamento/Todos/Arquivo; não declara falso sucesso ao falhar consulta. Nomes amigáveis são sugestões até salvar cadastro. A listagem ainda usa consulta existente de estudos/status; resumo agregado/paginação no servidor é evolução posterior, importante para520novos/ano.
- Cadastro progressivo: nome, cliente, cidade/UF, analista/revisor, competência e prazo. Criação de rascunho e vínculo explícito a estudo existente; sem merge automático de homônimos. Salvar exige confirmação do servidor e controle otimista por `updated_at`; erro conserva campos. Vincular estudo previamente sem vínculo é permitido, vínculo já definido é imutável no banco.
- Área do projeto: Visão geral, Materiais, Histórico. Abre a revisão atual com mesmos IDs e decisões. Histórico informa registros antigos/possíveis reanálises com os mesmos bytes e não promete comparação completa. Novos snapshots de runs, entrega congelada, compartilhamento por interface e banco de Excel bruto são próximas fatias.
- Originais desta fatia são **PPTX por versão existente**. Antes de enviar, SHA-1 deve coincidir com a versão; SHA-256 e bytes guardados no vínculo. Upload retomável TUS, chunk6MB, objeto imutável. Se o objeto já existe, retry tenta somente finalizar o vínculo. RPC confirma objeto/tamanho e relação projeto/versão antes de marcar disponibilidade.
- Recuperação exige identidade/acesso e confere tamanho/SHA-1/SHA-256 antes de devolver ao cofre local. Falha/quota no IndexedDB não vira mensagem de arquivo disponível; agora `savePptx` espera commit da transação. Guardar PPTX não cria render completo de slides nem preserva automaticamente Excel bruto.
- Migration gerada pela CLI2.121.0, `20261014210853_corretor_projects_originals.sql`: três entidades privadas, acesso proprietário/membro leitor, storage privado até512MiB/PPTX e RPC invoker. Sem backfill de autoria, sem alterações às tabelas de achados. Assinaturas de membros e sessão no servidor são precondições; migration não aplicada remotamente.

## Verificações e defeitos corrigidos durante a execução

1. **262 testes Corretor aprovados, dois condicionais pulados**; quatro novos testes de acesso, arquivo de outra versão, download alterado e retry do vínculo. Dez passes dos cinco estudos com fonte/Excel bruto aprovados; expectativas não alteradas. Motores/decisões humanas preservados.
2. **Postgres isolado PGlite:** dez verificações de SQL/políticas aprovadas: objeto ausente/tamanho errado rejeitados, idempotência, autoria imutável, isolamento de usuário, membro leitor e bucket privado. A primeira tentativa revelou recursão das políticas de membros; corrigida por chave composta projeto/proprietário e políticas diretas. Ambiente usa schemas Auth/Storage simulados; não prova comportamento Supabase/Storage real.
3. **Chromium local:** snapshots de Rolândia/CJ/VAP para carteira, cadastro e seleção de projeto; serviço inteiramente simulado, sem chamadas de funções. Carteira1440/1024/390/320 sem overflow; cadastro confirmado, TUS97108bytes, original disponível em outro contexto após recuperar/verificar hash. PPTX sintético `teste_corretor.pptx` explicitamente associado só na fixture; não representa o original real CJ.
4. Teste do upload identificou que o SDK retorna `error` também para HEAD404/objeto ausente; corrigido para permitir criação nesse caso e bloquear outros erros de consulta. Repetição completa passou. Busca/estado vazio e modal foram conferidos na proposta; nova bancada conferiu principalmente carteira/cadastro/material/recuperação.
5. Tipos/lint/build locais aprovados; teste do shell desktop existente também passou. Primitive Button/Input/Dialog/Tabs/Select/Progress existentes, lazy loading e import dinâmico TUS; composição scoped usa tokens SE existentes. Tokens originais não modificados, SHA-256 `0802b707b8c5…30874eac` igual à fundação. Modo claro/escuro e modal Escape/retorno de foco conferidos. O ensaio revelou que o shell global comprimia o conteúdo em320px apesar de não haver overflow; correção **restrita às rotas Corretor** recolhe a lateral no mobile, abre sobreposição temporária e fecha com Escape sem mudar preferência desktop. Medição agora inclui264px de largura útil em320px. Teclado completo/zoom200% e drawer com leitor de tela ainda requerem ensaio adicional; não declarar acessibilidade integral pelo teste básico.

Evidências locais: `.local-inputs/launch-d0/result.json`, `migration-test.json`, `migration-final.log`, `launch-suite.log`, `launch-materials.log`, `launch-build-final.log`; `.local-inputs/projects-browser-1792013162086/result.json` e capturas. `scripts/diagnostics/corretor-projects-browser.mjs` reproduz bancada em app localhost5176; exige snapshot local, não consulta produção. CLI `migration list --local` não conectou porque não há instância Supabase/Docker em54322; a alternativa PGlite verificou SQL localmente. Não declarar migrations aplicadas pela existência do arquivo.

## Estado real e próximo passo

**D0 diagnóstico e custos em créditos: documentados; identidade integrada, ocupação/tarifa e políticas remotas ainda pendentes. D1 experiência básica validada localmente com snapshots. D2/D3 primeira fatia implementada e validada em ambientes controlados, sem ativação remota.** Nenhuma promessa de recuperação de arquivo real em outro computador foi publicada.

Antes da ativação: confirmar ponte de identidade, aplicar migration revisada no Lovable, verificar políticas com duas identidades reais e testar um original conhecido por hash, sem reanálise paga. Começar por CJ ou Rolândia, conferindo download em novo navegador e achados/vereditos antes/depois. Fazer inventário dos Excel brutos na fatia seguinte. Não subir os cinco pacotes em lote antes desse caso completo.

Apresentar resultado antes do push conforme pedido. Commit isolado exclui FIERGS. Reservas semanais/tempo não medido preservados; Corretor continua com Gabriel. Monday: [Corretor V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102), sem escrita.
