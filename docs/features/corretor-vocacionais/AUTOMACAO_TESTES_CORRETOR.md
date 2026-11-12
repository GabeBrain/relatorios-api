# Rodada automática de materiais — Corretor V3

13/10/2026 — execução de Gabriel/Codex, derivada da baseline `04edc0d`. Objetivo: tirar Gabriel da repetição operacional de testes e devolver somente regressões, lacunas de material, dúvidas de negócio e orçamento de novas leituras.

## Um comando

```powershell
npm run test:corretor:materials -- --browser
```

Sem `--browser`, executa somente os testes offline. `--only=rol` seleciona Rolândia; IDs restantes: `tol`, `cj`, `vap`, `v2`. `--browser-only` consulta resultados já existentes no site sem repetir os replays. Se os insumos estiverem em outro lugar, `CORRETOR_TEST_INPUT_ROOT` indica a raiz que contém as pastas `Corretor_V3_*`.

O agente executa o comando depois de alterações no Corretor e analisa o relatório, sem pedir ao usuário para reproduzir as etapas. Isso é uma automação executável, não um agendamento novo. O material bruto continua no custodiante local; não existe CI remoto com acesso automático a esses PPTX/Excel.

## O que é verificado automaticamente

1. SHA-256 dos cinco decks, das fixtures e de todos os Excel de cada pacote. Arquivo mudado não substitui a baseline silenciosamente.
2. Cinco replays com fonte e visão congeladas: Rolândia, Toledo, Campos do Jordão e SJC VAP/v2.
3. Cinco replays adicionais pelo extrator de Excel bruto do app. A extração nova é comparada com o passe da fonte congelada, mantendo o contexto de cada versão. SJC VAP/v2 usam o mesmo pacote disponível para confrontar as duas versões, sem tratar igualdade como aceite humano do pareamento.
4. Comparação por ID, conteúdo integral dos achados e contagens de cobertura. Mesmo total de cartões com um erro real removido exige revisão. Ordem dos cartões pode mudar sem acusar regressão.
5. Inventário dos oito casos do catálogo compartilhado e dos PPTX catalogados ainda sem replay. Disponibilidade dos não testados é conferida por caminho; seu conteúdo não é declarado validado.
6. Com `--browser`, abre a rota pública `/corretor`, localiza os estudos correspondentes, espera os achados carregarem, captura screenshot/texto e registra os achados persistidos. Registra falhas HTTP, de rede e JavaScript, com o caso associado.

Browser usa Playwright headless, viewport 1440×900. A consulta bloqueia Edge Functions e mutações Supabase. Não faz upload, não clica Reconferir/Entregar e não altera status humano. A análise textual e visão novas continuam fora da rodada; nenhum custo novo de LLM é gerado pelo roteiro. Browser não confirma versão atual das funções e não transforma um estudo histórico em reanálise.

## Saídas e critérios

Cada execução cria `.local-inputs/corretor-regression/<data-hora-pid>/`, sem sobrescrever rodadas anteriores. Há `report.md`, `report.json`, logs e JSON por passe, além de screenshots se o navegador foi solicitado. As saídas brutas são locais e ignoradas pelo Git.

- `pass`: igualdade com a referência técnica nessa pista; não significa zero erros de negócio.
- `review`: achados removidos/novos/alterados, cobertura diferente ou extração incompleta.
- `blocked`: arquivo/fixture ausente, hash alterado, erro de execução ou ambiente indisponível.
- Browser `read`: página e dados existentes lidos; `unavailable`: nome não encontrado ou ambíguo; `guard_blocked`: abertura tentou escrita bloqueada pelo teste, sem comprovar renderização completa; `error`: falha ao abrir/carregar.

O comando termina com código 1 quando uma pista obrigatória não passa, quando o navegador solicitado tem caso indisponível ou erro JavaScript. Assim, uma consulta pulada não vira aprovação geral. O agente deve distinguir regressão do motor, divergência de fonte, falha de infraestrutura e material ainda sem gabarito.

Manifesto e expectativas: `calibracao/automacao/cases.json` e `*.expected.json`. Quatro fixtures de visão/fonte antigas que estavam em `.tmp` foram incorporadas como derivados pequenos necessários para reproduzir os testes. Rolândia reutiliza sua fixture já versionada. Nenhum binário bruto entrou no Git.

As expectativas são congeladas; o roteiro nunca as atualiza automaticamente para esconder falhas. Mudanças exigem motivo, evidência e revisão do caso. Elas protegem comportamento anterior; a matriz humana de acertos/FP/omissões continua separada em `BASELINE_2026-10-13_ROLANDIA.md`.

## Resultado e fila de avanço

Primeira rodada: dez passes offline preservados (cinco fontes congeladas + cinco extrações brutas), com 11/5/10/7/8 achados. Pacotes: 13 Excel Rolândia, 13 Toledo, 11 CJ e 12 SJC, compartilhados entre VAP/v2. Total de 49 planilhas únicas e cinco apresentações nessa seleção. Três testes do comparador aprovados, incluindo perda de achado com contagem igual e mudança de número/cobertura.

No navegador, Rolândia/CJ foram lidos; SJC VAP/v2 foram localizados com leitura dos registros, mas a renderização completa ficou bloqueada por tentativa de escrita automática. Ao todo 108 registros persistidos foram capturados; Toledo não apareceu na lista V3. Falhas `TypeError: Failed to fetch` em SJC correspondem a PATCH em `findings_v3` bloqueados pela proteção de leitura. O código `CorretorV3Page.tsx`/`resolveInvalidFindings` reconcilia achados antigos ao abrir o estudo, tentando marcar alguns como corrigidos. Nenhuma dessas escritas ocorreu no teste. Essa pista fica parcial e o comando retorna 1; não atribuir as falhas a um defeito espontâneo de produção, nem converter leitura parcial em homologação do aplicativo inteiro.

Evidência pequena: [resultado de 13/10](./calibracao/automacao/result-2026-10-13.json). Inventário: 18 PPTX distintos disponíveis no catálogo; cinco nessa suíte e 13 ainda sem replay. Esses 13 incluem versões alternativas, não 13 estudos novos. Resultado final: dez passes offline aprovados; navegador parcial pelos motivos acima, zero chamadas pagas e zero mutações Supabase executadas.

Materiais ainda sem replay nesta suíte: Marka Tancredo, Itajaí, ECO João Pessoa e Regional/GO. Há referências locais; não é necessário pedir novos decks para continuar os cinco casos atuais. Para ampliar a validação de outros usos, é necessário resolver o pareamento/cronologia de Marka e completar fonte numérica/gabarito de Itajaí/João Pessoa/Regional, conforme catálogo. Não gastar IA antes de definir o que cada caso novo deve provar.

Próximo ciclo automático: preservar regressão, comparar resultado existente de Boulevard com a fixture, tratar causas demonstradas e retestar. Gabriel entra para adjudicar dúvidas de dado/escopo, aceitar a saída do caso completo e autorizar lote pago quando houver necessidade. “No mistakes” é objetivo de rigor; não é garantia produzida por um teste verde ou por instalar um skill.

Monday: [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102) — `12700802102`. Sem escrita no Monday.
