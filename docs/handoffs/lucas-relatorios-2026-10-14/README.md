# Handoff Lucas — relatórios automatizados

14/10/2026 · preparado por Gabriel/Codex · destino: `GabeBrain/relatorios-api`, main.

## Decisão de escopo

Gabriel direcionou **somente a próxima frente de relatórios automatizados** ao Lucas. Corretor V3 e unificação da base Quanti 2026 continuam com Gabriel. Não atribuir essas duas frentes ao Lucas por referências antigas no planejamento. Não alterar o Corretor, Sinduscon Curitiba, CID ou ADM nesta tarefa.

Lucas inicia férias na segunda-feira **19/10**, segundo Gabriel. Janela disponível: restante de 14/10, quinta 15 e sexta 16. O pacote não impõe quatro entregas completas nesse intervalo. Objetivo proposto: habilitar contexto/acessos, fechar a matriz do piloto SP e, se a disponibilidade real permitir, implementar uma fatia reconciliável. Antes das férias, registrar exatamente o que ficou, como retomar e quem decide/publica. Não presumir data de retorno ou trabalho durante as férias.

## Comece aqui — ordem de leitura

**Lucas abre a raiz do repo no Codex.** Este handoff é o ponto de entrada; os planos/evidências futuros de cada modelo ficam na [área permanente de relatórios institucionais](../../features/relatorios-institucionais/README.md). O acionamento e a saudação humana estão definidos em [06 — CTA](06_CTA_CODEX_E_MENSAGEM.md), antes de qualquer implementação.

1. [Acessos e ambiente](01_ACESSOS_E_AMBIENTE.md): o que foi observado aqui e o que só a máquina do Lucas pode comprovar.
2. [Baseline e mapa técnico](02_BASELINE_E_MOTOR.md): motor existente, políticas diferentes e documentos históricos.
3. [Materiais e decisões dos próximos modelos](03_FONTES_E_MODELOS.md): links diretos, períodos, prioridades e lacunas.
4. [Estratégia de validação](04_VALIDACAO_E_ENTREGA.md): dados antes de aparência; testes locais antes de ensaio real.
5. [Plano curto do piloto SP](05_PILOTO_SP_E_FECHAMENTO.md): portões, limites e estado para pausa nas férias.
6. [CTA para o Codex do Lucas](06_CTA_CODEX_E_MENSAGEM.md).
7. [Estado da transferência](STATUS.md): registro vivo deste pacote, não lista de tarefas dadas como executadas.

Não é necessário ler centenas de documentos cronologicamente. Este pacote aponta para as fontes de verdade, não as duplica. `fontes/modelos.json` é o catálogo pequeno e versionado dos nove PPTX diretos. Os binários permanecem no Drive; downloads e ensaios ficam em `.local-inputs/relatorios-lucas/`, ignorados pelo Git. Evidências derivadas pequenas, contratos e matrizes devem ser versionados. Não copiar `.env`, tokens, sessões, payloads sensíveis ou `node_modules` para o pacote.

## Estado que Lucas recebe

- FIERGS 2T2026 teve aceite final de Juliana, informado por Gabriel e registrado no Monday em 13/10. O subitem ainda está Em andamento; esse rótulo não desfaz o aceite e não foi editado por esta sessão.
- Secovi possui código, gabaritos e histórico de avaliação específicos. A afirmação de Gabriel de que os dois estão prontos é contexto de produto; o aceite final localizado no Monday nesta revisão é do FIERGS. Não atribuir o mesmo aceite ao Panorama SP institucional, que é **novo**.
- FIERGS já aceita cidade/conjunto autorizado em uma UF. Saída real do conjunto Canoas/Esteio/São Leopoldo foi revisada; evidências completas dos demais recortes têm os limites documentados.
- Novos modelos: SP institucional mensal/trimestral, Fortaleza/SINDUSCON, Maceió/SINDUSCON e Recife/ADEMI. Ainda não estão implementados como novos destinos do menu.
- Github `Kriptonyano` tem `write` no repo, confirmado pela API em 14/10. Não prova token do Geobrain, login Lovable, acesso Drive ou toolchain na máquina dele.
- Pacote preparado localmente; publicação e recebimento pelo Lucas devem constar em [STATUS](STATUS.md). Não executar push sem autorização do humano da sessão.

## Contexto de outras entregas — não expandir o escopo

[ADM V2](https://brain381753.monday.com/boards/18398428946/pulses/13237486342), owner Lucas, está Em andamento. Atualização dele de 13/10 registra depreciação/patrimônio/fornecedores feitos; integrações, orçamentos e reservas aguardam Viviane. O card anterior e ADM base estão Concluídos. São declarações do card, não testes feitos aqui. Repo ADM não identificado entre os repositórios acessíveis; não clonar um homônimo ou pedir acesso a RH para esta entrega.

CID foi sincronizado localmente por fast-forward em 14/10 até `ddd2fa6` (monitor de custos) e `9714577` (revisão documental). Isso contextualiza a origem do Lucas, não transfere manutenção do CID para esta tarefa nem comprova deploy.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203). Leitura liberada; mudanças em responsáveis/status/comentários exigem pedido explícito. Não houve reassignment ou mensagem externa nesta preparação.
