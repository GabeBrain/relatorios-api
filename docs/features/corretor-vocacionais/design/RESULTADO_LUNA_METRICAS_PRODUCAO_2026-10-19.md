# Resultado técnico — Luna e métricas por modelo

## Estado

19/10/2026: implementação local concluída, checagens estáticas aprovadas e envio autorizado. Sem SQL remoto, deploy, geração ou teste executado. A ativação em produção depende da sequência abaixo; push não comprova Luna publicado.

Plano executado: `PLAN_LUNA_SUGESTAO_METRICAS_PRODUCAO_2026-10-19.md`, L0–L6 e preparação/handoff de L7.

## Entrega

- Flag `ACTIVE_RECOMMENDATION_PROFILE = 'luna-high-2026-10-19'` em `supabase/functions/_shared/recommendation.ts`; catálogo fechado. Modelo `gpt-6-luna`, raciocínio high, processamento default/standard, teto total32.768 tokens por chamada. Raciocínio e texto compartilham esse teto.
- Perfil gpt-4o-mini legado, preços0,15/0,075/0,60 e limites1.200/3.500 preservados. Contextos conhecidos sem perfil continuam usando esse contrato, incluindo hashes dos lotes já pagos. Histórico não é reprecificado ou regenerado.
- Novas execuções guardam retrato completo do perfil, limites e preços no contexto confirmado pelo servidor. Cliente envia identidade da configuração cotada, não preço/modelo arbitrário. Configuração desatualizada bloqueia antes de gerar.
- Chamada Luna usa `max_completion_tokens`, `reasoning_effort`, `service_tier: default` e `store: false`. Provedor direto permanece OpenAI; nenhum prompt de negócio alterado.
- Uso retornado inclui modelo solicitado/efetivo, input/output/cache, reasoning quando informado, duração, finish reason, service tier e identificação. Resposta do lote conserva contagens originais; não se persiste cadeia de raciocínio interna.
- Raciocínio já faz parte de output_tokens, sem segunda cobrança. Preços Luna por milhão:0,10 entrada/0,01 cache/0,50 saída, versão19/10. SQL confere custo contra preços imutáveis da execução antes de contabilizar perfil novo.
- Um passe por lote, contabilização transacional existente e chave de unicidade preservados. Reservas e consumo de estudo/recomendação continuam reconciliados na mesma transação.
- Divergência de modelo, configuração, tarifa, tier ou contagens mantém retorno desconhecido, com reserva e evidência disponível para conferência. Não há fallback automático ou repetição de chamada.
- Guarda de schema bloqueia novos perfis antes de consumo quando a migration falta. Backend/frontend de versões mistas recusam iniciar/continuar com contrato divergente.
- Timeout de110s para OpenAI e130s no controlador, abaixo do idle timeout documentado de150s. Abortar a espera não garante cancelamento da execução/cobrança no provedor: retorno desconhecido exige reconciliação.
- Interface, motores de correção, materiais, versões, decisões e autenticação preservados. Custos e modelos continuam fora da jornada do analista.

## Migração para Gabriel

Aplicar **somente** `supabase/migrations/20261019203600_corretor_recommendation_model_profiles.sql` após as migrations anteriores já aplicadas. Arquivo gerado pelo CLI oficial2.121.0; não aplicado nesta sessão.

Adiciona perfil/configuração/esforço/preços/origem e detalhamento de raciocínio; atualiza a função transacional mantendo a assinatura e compatibilidade de revisão/legado. Identifica registros mini históricos apenas pela combinação conhecida, sem inferir esforço ou origem. Novos agregados técnicos e guarda de schema são executáveis apenas por service_role/proprietário, sem nova permissão pública. Políticas de leitura existentes permanecem.

O parser não verifica existência real de tabelas/colunas, permissões efetivas ou execução de triggers. Não substituir aplicação/homologação SQL por análise sintática.

## Ordem de publicação

1. Gabriel aplica `20261019203600_corretor_recommendation_model_profiles.sql`.
2. Lovable publica **analyze-consulting-suggestion** com o contrato compartilhado novo. Suporta pedidos legados e novos perfis.
3. Lovable publica **corretor-execution**, incluindo `recommendation.ts` e o mesmo contrato compartilhado.
4. Publicar frontend da main e atualizar a página antes de gerar.

Nenhuma chave nova foi criada. `OPENAI_API_KEY` existente é mantida; acesso real dessa chave ao Luna não foi consultado/confirmado. Não é necessário adicionar segredo para escolher o modelo. `CORRETOR_USAGE_ORIGIN` é opcional: ausente significa production; development é reservado para backend dedicado de desenvolvimento e não deve ser usado no projeto publicado.

Prompt mínimo para Lovable:

> Use o código atual da main sem reescrever. A migration 20261019203600_corretor_recommendation_model_profiles.sql será aplicada por mim; não a rode. Publique analyze-consulting-suggestion e depois corretor-execution, incluindo os arquivos compartilhados locais. Preserve segredos e permissões. Não faça chamadas à OpenAI, testes de geração ou alterações extras. Confirme somente os deploys. Depois farei Publish do frontend.

## Consulta dos usos de produção

`calibracao/CONSUMO_RECOMENDACOES_POR_MODELO.sql` entrega quatro consultas somente leitura: agregado, gerações, chamadas e reservas desconhecidas. Uso por operador autorizado no SQL Editor; não publicado na interface.

O agregado `corretor_recommendation_usage(since,until)` separa chamadas por modelo efetivo e gerações por modelo solicitado/perfil. Inclui médias/medianas, gasto total, tokens, duração, conclusão, cobertura e detalhe por estudo/versão. Cada geração soma todos os seus lotes/compilação. Reabrir histórico não cria consumo. Histórico de origem não registrada permanece null; não é inventada procedência. Dados de calls usam data de contabilização; generations usam data de criação, então os totais por período podem diferir em execuções que atravessam o corte.

`reasoning_tokens` nulo significa não informado; reasoning_reported_calls mostra cobertura do detalhamento. Uma soma parcial não é o raciocínio total de todas as chamadas. Custo é calculado de uso e preços registrados, não reconciliado automaticamente com a fatura OpenAI. Comparação entre estudos diferentes é observacional e não comprova qualidade ou efeito causal do modelo.

## Evidência estática desta rodada

- TypeScript da aplicação: aprovado (`tsc -p tsconfig.app.json --noEmit`).
- Deno2.9.6: tipos dos dois entrypoints Edge aprovados com configuração strict. Evidência local `.local-inputs/luna-deno-check.log`.
- ESLint dirigido dos cinco arquivos de código alterados: aprovado.
- Build de frontend: aprovado em41,14s; avisos preexistentes de chunks maiores que500kB e Browserslist antigo. `.local-inputs/luna-build.log`.
- pglast8.7:17 instruções da migration analisadas; corpo PL/pgSQL parseado; corpo SQL de métricas e quatro consultas técnicas parseados. `.local-inputs/luna-sql-static.json`. Nenhum SQL executado.
- Prompts desde CONSULTING_RULES até finalPrompt/batchPrompt/compilePrompt idênticos ao HEAD anterior: SHA256 `164a120bcf6b4dcabef24979b1dd0b7517b0a7a5ee7a11f914ef9c03787dffa0`.
- Sem suítes, dez passes, browser, geração comparativa, IA paga ou escrita remota. Não atribuir a esta rodada resultados de testes anteriores.

## Limitações e próximo acompanhamento

Sem ensaio de qualidade, nenhuma garantia de melhora. Tempo real de high, compatibilidade efetiva da conta/provedor, comportamento da migration e percurso remoto ainda não verificados. O memo mantém8.000 bytes: retorno maior fica guardado/contabilizado e exige conferência, sem corte silencioso ou compilação inválida.

Após os primeiros usos normais, consultar perfil Luna/high, modelo efetivo, custo/tokens, duração, estados parciais/falhos e reservas pendentes. Não disparar reprocessamento automático nem comparar textos gerados de entradas diferentes como equivalentes. Reversão somente técnica, alterando flag e publicando sem mexer em execuções existentes.
