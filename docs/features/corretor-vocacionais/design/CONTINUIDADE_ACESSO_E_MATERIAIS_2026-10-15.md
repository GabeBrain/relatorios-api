# Continuidade — acesso e materiais — 15/10/2026

## Atualização de decisão — acesso geral autenticado

Gabriel dispensou a lista de emails: v0.70.2 remove `CORRETOR_ALLOWED_EMAILS` do código. Para ativar, sincronizar e republicar `corretor-access`, sem informar esse secret e sem migration nova. Login GeoBrain válido permanece obrigatório; políticas privadas de cada projeto continuam. Esta decisão substitui a exigência de lista nos passos históricos abaixo. Validar produção com uma conta real e isolamento de outro usuário permanece necessário; sem IA paga.

## Estado verificável

Gabriel autorizou o push após informar a aplicação da migration inicial. `08d70dd` e `eb0faa1` foram enviados a origin/main; fetch posterior 0/0. Consulta remota encontrou as três tabelas privadas e recusou o papel público (401/42501). Isso não substitui teste das políticas com identidades reais. O frontend público consultado ainda não apresentou o chunk da carteira; Git não comprova deploy.

## Continuação preparada localmente

- Login habitual GeoBrain no Corretor passa por `corretor-access`: credenciais verificadas no upstream fixo, lista explícita de emails autorizados e sessão Supabase emitida no servidor. Não exige outra senha ou envio de email. Segredos administrativos não chegam ao frontend. Lista vazia nega acesso.
- Permissão assinada em `app_metadata`, com validade de 180 minutos; `user_metadata` não concede acesso. A migration complementar `20261014213854_corretor_access_claims.sql` aplica essa condição às políticas privadas. **Ainda não aplicada remotamente.**
- Função ausente (404) preserva o login GeoBrain anterior com aviso explícito de materiais indisponíveis; recusas de autorização não têm fallback. Outros módulos conservam o login anterior.
- Busca, filtro, página, aba e versão ficam na URL. Paginação de 20 itens é do cliente; consulta agregada/paginação no servidor permanece evolução posterior.
- Motores, prompts, achados e decisões humanas preservados. Nenhuma IA paga, upload real ou mudança em vereditos de produção.

## Evidências e limites

- Suíte registrada: 270 testes aprovados e dois condicionais pulados (`.local-inputs/next-stages-suite-final.log`). Testes adicionais do cliente/login foram executados separadamente: oito aprovados. Não somar contagens sobrepostas.
- Doze controles SQL passaram em Postgres PGlite isolado com Auth/Storage simulados: isolamento, membro leitor, idempotência, autoria, objeto ausente/tamanho, papel anônimo, permissão assinada e expiração. Resultado em `.local-inputs/launch-d0/migration-access-test.json`.
- Chromium com snapshots Rolândia/CJ/VAP e serviços simulados: login integrado, paginação/reload, retorno com filtro, aba de histórico, quatro larguras e recuperação de PPTX sintético de 97.108 bytes em outro contexto. `.local-inputs/projects-browser-1792015011418/result.json`; não é recuperação de um original real.
- Tipos/lint passaram após o último ajuste de seleção de versão pela URL. Build e browser tinham passado antes desse último ajuste; a repetição final foi bloqueada pelo serviço de aprovação automática por falta de créditos do workspace, antes da execução. O bloqueio é operacional, não uma classificação da ação como insegura. Não contornado.
- Dez passes de materiais permanecem na última verificação da fatia anterior, sem alteração de gabaritos/motores; não foram executados novamente nesta continuação.
- Conector sem permissão administrativa nesse backend: função não publicada nem políticas de duas identidades verificadas em produção. Custo de armazenamento continua limitado pelo print do projeto inteiro; ocupação em GB/tarifa Lovable não confirmadas.

## Ativação no Lovable — ordem

1. Concluir build, suíte e browser da árvore final quando o serviço de aprovação estiver disponível; revisar diff isolado antes de novo push.
2. Aplicar a migration **complementar** `20261014213854_corretor_access_claims.sql`, após a inicial já informada por Gabriel. Não reaplicar a inicial indiscriminadamente.
3. Configurar `CORRETOR_ALLOWED_EMAILS` com emails exatos autorizados, separados por vírgula; publicar a função `corretor-access`. Usar segredos Supabase existentes do servidor, nunca no código do cliente. Sem IA paga.
4. Publicar frontend. Conferir bundle/rota nova no site, não apenas commit.
5. Usar Reemitir no login normal. Salvar um cadastro, associar um PPTX real conhecido por hash e recuperá-lo em outro navegador. Conferir bloqueio de uma segunda identidade sem vínculo e acesso de membro leitor autorizado; registrar IDs/bytes/hashes, sem expor credenciais.
6. Comparar achados/decisões antes/depois. Concluir somente com original recuperado íntegro e isolamento comprovado. Depois avançar para Excel bruto e snapshots de execução; histórico completo/entrega D4–D6 continuam abertos.

### Retomada autorizada para push — 15/10

Gabriel informou também a aplicação da migration complementar; confirmação remota das políticas continua pendente. Push explicitamente autorizado. Fetch encontrou três commits novos do Lovable (`f31b72e`, `7071edc`, `daf0af5`): tipos do banco, bun.lock e arquivo gerado de TypeScript. Sincronização autorizada separadamente, realizada por fast-forward com alterações locais preservadas/restauradas sem conflito, incluindo FIERGS. Build final e 23 testes focados aprovados; o bloqueio anterior de aprovação não se repetiu. Ensaio browser inicial encontrou servidor local desligado, sem requisições externas/mutações; repetição com servidor ativo e suíte completa registradas no fechamento abaixo.

Fechamento da validação: **276 testes aprovados/2 condicionais pulados**, suíte completa e AuthBlock/AppLayout; browser repetido aprovado (`.local-inputs/projects-browser-1792064261395/result.json`), login simulado, histórico/filtro/paginação após reload e recuperação em novo contexto. Build aprovado (`.local-inputs/access-push-build.log`). Sem chamadas de IA paga. Motores/gabaritos/decisões preservados. Bloqueio de validação final encerrado; limites de produção permanecem.

Estado: validado localmente para commit/push autorizado; publicação da função/frontend e recuperação real ainda pendentes. Alterações FIERGS preservadas. Corretor segue com Gabriel; planejamento de seis horas não equivale a tempo medido. Monday não alterado.
