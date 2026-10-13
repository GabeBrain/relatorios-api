# Reanálise com teto de US$ 2 — 13/10/2026

**Estado: três reanálises concluídas e relatórios novos verificados no banco/site.** Gabriel autorizou US$ 2 como teto total do lote Campos do Jordão, SJC VAP e SJC v2. Nenhum código de produto ou prompt alterado; alterações FIERGS locais preservadas. Isso conclui a execução paga do lote, não o aceite humano de todos os alertas.

## Custo e controle

Controle de admissão sequencial antes de cada chamada, com limite total compartilhado e reserva conservadora do custo máximo por resposta. Modelos efetivamente solicitados: texto gpt-4o; imagem gpt-4o-mini, com releituras gpt-4o. Sem ata nova. Todas as retomadas descontam o custo anterior; nenhuma reanálise adicional de CJ/VAP foi feita para resolver a falha de captura final.

**US$ 1,397146 calculados pelos tokens retornados**, mais **US$ 0,065703 reservados** para quatro respostas sem uso confirmado. Total conservador **US$ 1,462849**, abaixo de US$ 2; saldo conservador US$ 0,537151. 247 tentativas de função capturadas nas três execuções, incluindo texto, imagens, releituras e retomadas; quatro sem resposta de uso. Esses valores usam a tabela de preços do app, não constituem confirmação da fatura do provedor.

Custos acumulados no app: CJ US$ 0,73549805; VAP US$ 0,95875580; v2 US$ 0,69365850. O aumento registrado pelo app é inferior à contabilidade da automação porque a tentativa inicial não chegou à consolidação/registro de todos os passes. **Não usar apenas o delta do app como custo total desta sessão.** Auditoria de cobrança real permanece uma limitação.

## Resultado por estudo

**Campos do Jordão — 153 slides:** versão 4 do mesmo PPTX, relatório novo às 16:18 Brasília. 38 registros anteriores → 53 preservados/inseridos; 15 IDs novos, 28 registros mudaram de pendente para corrigido automaticamente; 22 registros permanecem pendentes. 23/41 tabelas fecham na soma, fonte 22/23 valores iguais, cruzamentos 9/21 iguais. Os 28 encerramentos refletem novas leituras/reconciliação, não edição do PPTX e não 28 erros humanos comprovadamente solucionados. Novos achados incluem OBSERTÓRIO nos slides 65–68, Avalição no s131, concordância s23/s149, faixas/lacunas e aviso de soma insegura em 14 slides. Há duplicatas textuais de uma mesma causa após a retomada, preservadas para revisão.

**SJC VAP — 145 slides:** versão 2 do mesmo PPTX, relatório novo às 16:45 Brasília. 33 → 49 registros; 16 IDs novos, 26 encerramentos automáticos; 22 pendentes. 52/61 tabelas fecham, fonte 10/11 iguais, cruzamentos 57/59 iguais. Novos achados incluem “são esperado”, “Churrasqueria”, “Shor Stay”, rótulo “Arté 35 m²” e divergências de tabela. “Concorrentes Compactos” foi acusado de concordância sem apresentar correção plausível: candidato forte a falso positivo; não alterar veredito humano automaticamente. Títulos que dizem erro em “short”/“Avaliação” podem descrever a forma correta enquanto a evidência contém “Shor”/“Avalição”: redação do cartão precisa melhorar; não descartar como FP apenas pelo título.

**SJC v2 — 107 slides:** versão 2 do mesmo PPTX, relatório novo às 16:53 Brasília. 22 → 32 registros; 10 IDs novos, 13 mudanças automáticas para corrigido; 18 pendentes. 43/46 tabelas fecham, fonte 4/10 iguais e 1/1 cruzamento igual. O mesmo pacote de 12 Excel coincide com o inventário salvo das duas versões SJC; isso não comprova que as planilhas são historicamente corretas para o deck anterior.

Nenhum registro anterior excluído nos três estudos. Não havia vereditos humanos/ignorados nos snapshots iniciais consultados; não houve aceite ou entrega do estudo pela automação. Preservar histórico das versões e não confundir “corrigido” automático com arquivo corrigido. Cobertura por tabela pode mudar quando a extração muda, portanto proporções antigas/novas não medem precisão sem pareamento das tabelas/imagens.

## Limitações operacionais

Primeira automação encerrou espera antes de consolidar CJ; leituras parciais ficaram no cache e achados DET foram gravados. Retomada usou cache e repetiu texto; custo de ambas incluído no teto. CJ concluiu na retomada. SJC VAP exibiu conclusão, mas um GET final falhou por ECONNRESET; consulta posterior confirmou relatório/custo/achados, sem reanálise paga. SJC v2 concluiu normalmente. As quatro respostas sem uso confirmado ficam reservadas, não consideradas gratuitas.

O bug do botão “Reconferir (DET R$ 0)” iniciar fase paga por cache legado continua presente; esta rodada foi autorizada e protegida externamente por orçamento. Próxima implementação deve exigir confirmação de lote/estimativa no próprio app antes da fase paga. Não repetir chamadas pagas para validar um prompt ainda não alterado. As dez regressões com fixtures anteriores permanecem referência; nesta sessão não houve alteração de produto nem execução nova de testes de código.

## Handoff e próximo passo

1. Corrigir o gate de custo da reconferência.
2. Adjudicar os alertas novos/encerrados usando as imagens persistidas: começar por “Concorrentes Compactos”, duplicatas textuais e sumas substituídas por aviso de leitura insegura. Preservar erros literais OBSERTÓRIO/Avalição/são esperado/Shor Stay demonstrados pela evidência, sujeito ao original.
3. Separar leitura equivocada, erro real e redação ruim do cartão; registrar antes/depois por causa, sem medir sucesso por redução de contagem.

Evidências brutas ignoradas: `.local-inputs/paid-corpus-1791918408203/` (primeira CJ), `1791918825131/` (CJ/VAP), `1791920970301/` (v2), `final-paid-audit.json` (GET final dos três estudos), com tokens por chamada, snapshots e capturas. Pareamento dos insumos: [retese gratuito anterior](./RETESTE_CJ_SJC_2026-10-13.md). Nenhuma chave/credencial deve ser copiada desses logs para documentação versionada.

Monday: [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102) — `12700802102`. Sem escrita no Monday.
