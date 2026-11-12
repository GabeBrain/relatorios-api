# Revisor Luna high — resultado e dependências de publicação

## Estado da entrega

Fechamento Git de 21/10: push concluído até `fe5c7f9`, incluindo `829f862` e os commits Finotti `30ab046`/`a199e7e`, estes autorizados expressamente por Gabriel. [CI técnico aprovado](https://github.com/GabeBrain/relatorios-api/actions/runs/39693170276): tipos da aplicação, testes focados, build e Deno das quatro funções. Documentação viva e contrato do protocolo também aprovados nesse SHA. Arquivos locais FIERGS e referência de interface permaneceram fora do envio. Isso comprova o código enviado, não aplicação da migration ou funcionamento em produção.

Implementação e validação local concluídas no escopo demonstrado. **Não verificado em produção.** O backend correto não aparece nem no conector nem na CLI administrativa disponíveis; sem chave de serviço local para os lotes. Nenhuma migration remota, deploy, alteração de estudo real, decisão humana ou geração paga executados. Gasto desta sessão: **US$0,00**. Teto autorizado: **US$3,00**, substituindo os US$5 do planejamento inicial.

Publicação e reteste real seguem o pacote `PUBLICACAO_REVISOR_LUNA_2026-10-21.md`. Implementação principal no commit local **829f862**, com complemento de retenção de falhas e documentação neste fechamento. Há dois commits anteriores de Finotti na main local; não são implicitamente autorizados para envio por este trabalho. **Push aguarda a decisão específica solicitada sobre esses dois commits; CI remoto desta entrega ainda não executado.**

## Etapas

| Etapa | Resultado |
|---|---|
| R0 | Confronto documentado em `MATRIZ_GUAJAJARAS_REGRAS_2026-10-21.md`; arquivo real extraído, derivados numéricos identificados. |
| R1 | Regras e filtros ajustados; faixas e somas existentes preservadas; contraexemplos exercitados. |
| R2 | Texto, ata e visão novos em Luna/high; configuração técnica compartilhada, controlador escolhe perfil e recusa cliente desatualizado; legado preservado. |
| R3 | Cache novo por perfil/tarefa/extração; hash original das evidências preservado; relatório identifica perfil para cruzamentos posteriores. |
| R4 | Migration aditiva criada e executada em PostgreSQL em memória; ledger existente mantido, consumo/versões/raciocínio detalhados e orçamento global de validação protegido. |
| R5 | Suíte local, tipos, lint, build, dez passes e percurso isolado executados; CI técnica adicionada, execução remota depende do push. |
| R6 | A/B congelados e dry-run conferido. Nenhum teste com provedor: acesso ao backend e publicação pendentes. |
| R7 | Migration, ordem de funções e prompt Lovable no pacote único. Sem publicação remota nesta sessão. Push condicionado ao escopo dos commits de saída. |
| R8 | Pendente após publicação: chamada real Luna em cada tarefa, qualidade, latência, consumo e percurso completo sob o teto global. |
| R9 | Diagnóstico, matriz, regras, acompanhamento e resposta à Amanda preparados. Email não enviado; convite de reteste condicionado a R8. |

## O que mudou

- Cruzamento de valores de propriedade, verticalização e renda com categoria/recorte identificáveis; solicita conferir conceito/período, sem inferir verdade. Não mistura percentual com absoluto, anel com acumulado ou anos explicitamente distintos.
- Unidade “hab.” em página de domicílios vira pista de coerência sem Excel, com evidência literal e nível Verificar.
- Categoria Rotativa presente em outro bloco da mesma imagem pode explicar contagem incompleta; substituir apenas o alerta de soma da tabela correspondente, sem inventar valores.
- Pedidos da ata não contam como atendidos por aparecerem na própria ata/repetição. Referência textual não é atestado de atendimento completo.
- Recados e respostas em caixas comuns são separados; extração real Guajajaras separou 51 caixas, contra 22 antes. No 105 restaram título, marcador e a frase sobre Zaira; nenhuma confirmação externa de mercado realizada.
- Perfil `luna-high-review-2026-10-21`, flag técnica `ACTIVE_REVIEW_PROFILE`, modelos por tarefa e limites totais 16.384 tokens para texto/ata e 32.768 para tabela-imagem. Limites incluem raciocínio.
- Sem troca automática para 4o depois de Luna. Confiança não é promovida pelo nome Luna. Leituras históricas mini/4o mantêm sua origem; cache novo não invalida/reprocessa o acervo.
- Retomada usa o perfil persistido, cache/hashes legados e retrato da classificação de texto anterior quando necessário. Novas regras semânticas/ata ficam fora da retomada legada. Reversão técnica altera novas execuções, sem mudar contratos em andamento.
- Folhas retornam consumo e falha explícita para JSON inválido, truncamento e recusa. Uso confirmado é contabilizado mesmo sem resultado válido; desconhecido conserva reserva, sem retry automático.
- Controlador persiste modelo solicitado/efetivo, perfil, esforço, regras/extração/prompt/hash/preços, cache, raciocínio, tier, duração e identificação do provedor. Contagem de raciocínio não é somada novamente à saída.
- O frontend usa o custo confirmado pelo controlador quando disponível, sem duplicá-lo em replay. Custos continuam fora da interface do analista.
- Correção incidental na triagem rápida: alvo de teclado pode ser o documento, não um Element com `closest`. Aparência/tokens preservados. Luna não foi exposto no seletor V1, cujo endpoint não foi migrado.
- Sugestão de análise e seu prompt não foram migrados novamente; testes antigos foram alinhados ao perfil Luna já ativo, mantendo cobertura explícita mini legado.

## Evidências locais

Diretório de execução: `.local-inputs/review-luna-20261021/`; brutos e saídas completas ignorados pelo Git.

- Suíte Corretor: **355 testes aprovados / 2 ignorados**, 52 arquivos aprovados, `suite-release.log`, código de saída 0. Inclui restauração do texto legado. Casos ignorados dependem de insumos/execução não configurados e não contam como aprovação.
- Regressão de materiais: dez passes aprovados, cinco baseline + cinco Excel bruto, rodada final `.local-inputs/corretor-regression/2026-10-21T23-01-56.651Z-23844/report.json`. Nenhum achado antigo removido/alterado; sete novos alertas justificados e fixados por hash em `review-deltas-2026-10-21.json`. Baseline original intocada.
- Comparador de regressão: quatro testes Node aprovados; qualquer diferença fora do antes/depois exato continua bloqueada.
- PostgreSQL em memória: **13 verificações aprovadas** em `sql-result.json`, incluindo preço/perfil, idempotência, erro com uso, reserva desconhecida sob teto global, legado, recomendação delegada, permissões e proteção contra sobrescrever um finish confirmado depois de falha da resposta de rede.
- Deno: quatro funções checadas com configuração strict. Aplicação: `tsc -p tsconfig.app.json --noEmit`; a chamada sem `-p` no tsconfig raiz não é prova suficiente e não foi usada isoladamente como aceite.
- Build final `npm run build` concluído em 27,69s, código de saída 0, com aviso preexistente de tamanho de chunk. Lint dirigido aprovado; tipos explícitos da aplicação e quatro funções Deno aprovados.
- Navegador automatizado isolado: `.local-inputs/review-luna-browser-1792623135033/result.json`, quatro verificações aprovadas, zero erros e escrita remota/IA zero. PPTX + 11 Excel reais, registro simulado atrasado, chegada ao resultado, perfil/modelos enviados e saída/reabertura. Backend e provedor simulados, não qualidade da extração real.
- Guajajaras: `matrix-observed.json`, quatro conflitos/pistas semânticos, uma categoria e sobreposição existentes observados com evidência derivada explicitada. Não equiparar a ensaio Luna.
- Lotes A/B: manifests locais e hashes conferidos em dry-run; A tem 12 tarefas, B prepara estudo técnico de Rolândia e exige percurso completo real posteriormente.

Os testes encontraram um confronto percentual/absoluto incorreto na primeira implementação; corrigido antes de aprovar a nova regra, com teste negativo específico. Falhas iniciais do roteiro de navegador eram seletores de controle legado oculto/nome bruto; o roteiro final usa saída visível e link amigável. Não foram usadas ações forçadas para contornar interface.

Fechamento de retenção: resultado inválido ou com perfil/tier divergente fica guardado no lote privado para reconciliação, mantendo a reserva e sem repetir provedor. A atualização para unknown só afeta lote ainda running; não sobrescreve um finish já confirmado. Texto visível inválido do provedor é preservado como evidência privada, sem persistir raciocínio interno. Deno e os 25 testes focados foram revalidados após esse complemento (`focused-retention.log`).

## Migration e publicação

Arquivo criado pela CLI: `supabase/migrations/20261021223119_corretor_review_model_profiles.sql`.

Ela delega ao finalizador consultivo existente, sem reescrevê-lo, e acrescenta a validação de perfil/consumo do revisor. Tabelas técnicas têm acesso restrito a service_role. O orçamento global considera gastos e reservas pendentes de todos os lotes vinculados; um canário de interface pode ser vinculado administrativamente a esse mesmo teto/proprietário local.

Ordem: migration → três folhas (`analyze-ata-image`, `analyze-text-batch`, `analyze-table-image`) → `corretor-execution` → Publish frontend → testes reais. Não redesplegar `analyze-consulting-suggestion` sem alteração nela.

## Limitações que permanecem

Não recuperamos a saída antiga ou o documento anterior à revisão de Amanda. Os valores soltos de renda do 27 não foram ligados por suposição aos recortes. A associação SVG do 30 usada na regra foi derivada do diagnóstico, não testada com Luna. Mercado atual, homônimos e qualidade visual integral dos mapas não foram verificados.

A documentação não declara todos os apontamentos antigos resolvidos, desempenho superior ou disponibilidade da nova revisão em produção. O email está pronto, mas só deve afirmar que pode testar novamente após a publicação e R8.
