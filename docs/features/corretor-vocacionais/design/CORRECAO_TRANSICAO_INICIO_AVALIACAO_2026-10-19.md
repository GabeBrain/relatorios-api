# Transição de início da avaliação — 19/10/2026

## Diagnóstico e mudança

Gabriel informou que aplicou a migration de exclusão, publicou e testou com sucesso. Essa confirmação é relato do usuário, sem verificação independente em produção nesta sessão.

Ao iniciar uma avaliação, registro do estudo, armazenamento local, atualização da lista e abertura do estudo aconteciam antes de `analysis.running`. A seleção de um estudo ainda sem relatório podia remontar a preparação. Na saída, a limpeza do indicador interno também antecedia o término do orquestrador.

Adicionado estado visual de transição independente da seleção e do relatório. Inicia no clique confirmado, permanece durante registro e finalização e só termina no `finally` do percurso. Durante processamento, preserva o banner com etapas e pausa; entre operações, informa preparação ou abertura dos resultados. Abrange envio novo e retomada. Erros, interrupções e conferência de localização continuam encerrando o estado: não se apresenta análise completa sem relatório.

Sem alteração de motor, prompt, orçamento, chamadas, materiais, versões ou decisões humanas. Sem migration ou Edge nova.

## Evidência e limite

- TypeScript e ensaio browser local aprovados. Script reproduzível: `scripts/diagnostics/corretor-start-transition-browser.mjs`.
- PPTX real de Campos do Jordão e 11 planilhas; registro atrasado 1,5 segundo, processamento e banco simulados, nenhuma escrita remota ou IA paga. Duas verificações aprovadas, sem erros de página: tela de preparação não retorna e resultado é alcançado.
- Evidência bruta ignorada: `.local-inputs/continuous-browser-1792435101005/result.json`.
- A breve parada relatada também pode incluir custo de extração no navegador. Esta correção trata a transição confirmada pelo código; não comprova eliminação de toda pausa de CPU no dispositivo do usuário.
- Falta Publish e repetição do início no site. Push não equivale a verificação em produção.

## Comunicação

E-mail de anúncio revisado na conversa, sem informação financeira; não enviado pelo agente.

Regressão nesta rodada: 330 testes aprovados, zero falhas e dois ignorados. ESLint dirigido aprovado.
