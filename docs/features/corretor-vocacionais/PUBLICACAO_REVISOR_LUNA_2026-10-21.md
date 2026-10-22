# Publicação e retomada do revisor Luna high

## Estado

**Correção posterior de listas ATA e recuperação,21/10:** causa confirmada pelo JSON real: null em três listas aceito pelo prompt e recusado pelo validador. Código local normaliza só null explícito, preserva multi-cidade e recupera resposta completed em replay sem nova chamada/contabilização da ata. Retomada ignora só fonte.gerado_em; demais materiais e snapshot original preservados. Publicação mínima deste complemento: **analyze-ata-image com review-provider/reviewer compartilhados → corretor-execution com shared → Publish frontend** (carregamento Brain00e0bb5). Sem migration nova. Texto/tabela só precisam republicação para motivos diagnósticos adicionados no00e0bb5. Retomar estudo existente32a2234c no mesmo navegador, sem excluir/reenviar; etapas seguintes ainda podem processar normalmente. Detalhes/limites em CARREGAMENTO_BRAIN_E_FALHA_ATA_2026-10-21.md;33 testes locais e checagens estáticas, não homologação real completa.

**Complemento de início/retomada,21/10:** após o relato de três execuções prepared sem lotes/uso/reservas e com perfil incompleto, preparada correção em controlador/shared e frontend. Publicação adicional: somente **corretor-execution** com dependências compartilhadas + **Publish frontend**. Nenhuma migration adicional para este complemento. Reconciliação administrativa das três execuções antigas continua separada e condicionada à reconferência do consumo; não houve limpeza automática. Ver diagnóstico DIAGNOSTICO_INICIO_ROLANDIA_2026-10-21.md. Essa atualização supera a leitura de que a publicação anterior já homologava o start real.

Código e migration preparados e validados localmente. O backend correto é **mxinpvcqzbfbzjodhgtz**. Tanto conector quanto CLI administrativa acessam outros três projetos; este não aparece. Não aplicar em Brain Apps, Quanti ou Sistema Administrativo como alternativa.

Nenhum SQL remoto, deploy ou IA paga foi executado. A autorização vigente é **US$3,00 globais**, incluindo saldo reservado/desconhecido dos dois lotes e verificações em produção. Os estudos, materiais e decisões reais não foram alterados.

## Sequência única de publicação

1. Conferir que o commit desta entrega está no Git conectado ao Lovable e os checks do SHA estão aprovados. Push não equivale a deploy.
2. No banco correto, aplicar somente `supabase/migrations/20261021223119_corretor_review_model_profiles.sql`. Ela depende das migrations de execução/consumo/perfis já publicadas em 15–19/10; não reaplicar todas. Não alterar migrations antigas.
3. Executar a verificação administrativa abaixo.
4. Publicar `analyze-ata-image`, `analyze-text-batch` e `analyze-table-image`, compatíveis com perfis novos e antigos.
5. Publicar `corretor-execution`.
6. Fazer Publish do frontend. O cliente novo recusa começar se o controlador ainda não informar perfil; não contornar a guarda para chamar o provedor diretamente.
7. Confirmar a publicação para retomar lotes A/B e verificação real. Até essa etapa, o email de convite fica pendente.

Verificação no SQL Editor administrativo:

```sql
select public.corretor_review_profile_schema(); -- 1
select to_regprocedure('public.corretor_finish_batch(uuid,text,jsonb,numeric)'),
       to_regprocedure('public.corretor_finish_batch_pre_review(uuid,text,jsonb,numeric)'),
       to_regprocedure('public.corretor_claim_batch(uuid,text,text,text,numeric)');
select id,budget_usd from public.corretor_review_validation_budgets;
select column_name from information_schema.columns
 where table_schema='public' and table_name='ia_passes'
 and column_name in ('profile_id','reasoning_effort','reasoning_tokens','rules_version','extraction_version','prompt_hash');
```

### Prompt conciso para o Lovable

> No backend mxinpvcqzbfbzjodhgtz, confira se a migration 20261021223119_corretor_review_model_profiles.sql foi aplicada; não reaplique migrations antigas. Publique, com as dependências compartilhadas do repositório, analyze-ata-image, analyze-text-batch e analyze-table-image; depois corretor-execution. Não altere prompts, segredos, permissões ou outras funções. Não processe estudos nem chame IA nos testes. Verifique apenas recusas de pedidos inválidos antes do provedor e informe o resultado de cada deploy. O frontend será publicado depois.

## Retomada dos lotes, sem aumentar o orçamento

### Pacote manual separado, preparado em 21/10

Para o reteste solicitado por Gabriel, disponível em `.local-inputs/testes/TESTE_LUNA_ROLANDIA_2026-10-21/`: PPTX de 78 slides e 13 Excel, copiados de `_UPLOADS_TESTE/Corretor_V3_Rolandia`. Apenas `docProps/core.xml` (título interno) mudou; todas as demais entradas do PPTX e os Excel foram preservados. SHA-1 de teste `3c29b01ad65beea417aabf8fe394f01d2a95cd46`, distinto do original; registro por `corretor_prepare_study` compara o hash completo, logo o primeiro envio dessa cópia deve criar estudo separado. Usar novo envio, não adicionar versão. Não garante cache vazio de evidências do mesmo perfil nem ausência do arquivo no banco remoto, que não foi consultado. Reenviar essa cópia reconhece o mesmo teste. Manifesto/hash e instruções locais acompanham os brutos ignorados. Nenhuma IA executada; migration/publicação confirmadas pelo usuário, sem verificação técnica independente de produção nesta preparação.

Preparação local congelada em `.local-inputs/review-luna-20261021/`:

- A: `lote-a-manifest.json`, nove imagens, dois lotes de texto e ata nativa em texto do Guajajaras revisado. São 12 tarefas. Hash do PPTX e das imagens conferidos; a ata desta preparação não é teste de OCR de ata raster.
- B: `lote-b-manifest.json`, Rolândia original do manifesto de regressão, para um percurso completo com Excel. Não confundir preparação desse estudo com execução da revisão.

O script `scripts/diagnostics/corretor-review-validation.mjs` não chama IA por padrão. `--execute` exige acesso técnico ao backend correto e usa exclusivamente `corretor-execution`, com identidade administrativa e vínculo ao orçamento global do banco. Não imprime segredo. Seu estado privado e respostas ficam ignorados pelo Git; não compartilhar esses arquivos como evidência pública.

```text
node scripts/diagnostics/corretor-review-validation.mjs --manifest=.local-inputs/review-luna-20261021/lote-a-manifest.json
node scripts/diagnostics/corretor-review-validation.mjs --manifest=.local-inputs/review-luna-20261021/lote-b-manifest.json --prepare-ui
```

Os comandos acima são dry-run. Na retomada técnica autorizada, `SUPABASE_SERVICE_ROLE_KEY` deve estar disponível somente ao processo local, sem colar no chat. Acrescentar `--execute` apenas depois das verificações remotas. Falha desconhecida não recebe repetição automática.

Para B, `--prepare-ui --execute` registra um estudo técnico separado e vincula seu proprietário local ao mesmo orçamento. O segredo de backend não vai ao navegador. Um contexto isolado de teste usa o identificador local gerado para seguir o percurso no app; não usar perfil pessoal nem modificar estudo do banco de regressão. Cada chamada soma gasto/reserva de A e B sob a trava global de US$3.

Depois: medir achados/evidências, perfil efetivo, consumo e duração; confirmar relatório, retorno/reabertura e preservação das decisões. A só valida tarefas/controlador; somente B valida a execução completa real. Se o saldo não cobrir o próximo lote, parar e relatar, sem mudar o teto.

## Consulta técnica de consumo

```sql
select model,profile_id,reasoning_effort,tipo,usage_origin,
       count(*) chamadas,sum(input_tokens) entrada,sum(cached_tokens) cache,
       sum(output_tokens) saida,sum(reasoning_tokens) raciocinio,
       sum(custo_usd) custo_usd
from public.ia_passes
where created_at >= timestamptz '2026-10-21 00:00:00+00'
group by model,profile_id,reasoning_effort,tipo,usage_origin;

select validation_budget_id,sum(spent_usd) gasto,sum(reserved_usd) reservado
from public.corretor_executions
where validation_budget_id='amanda-review-2026-10-21'
group by validation_budget_id;
```

Dados de raciocínio são contagens, não conteúdo interno. Output já inclui reasoning tokens. Cache reutilizado do aplicativo não é chamada Luna e não é o cache faturado pela OpenAI.

## Resposta à Amanda — somente após verificação real

Olá, Amanda. Boa tarde!

Obrigado pelo retorno e pelo material. Desde a semana passada, revisamos regras e conferências do Assistente de Projetos e atualizamos o modelo de IA usado na revisão. A Sugestão de análise também está usando o modelo atualizado.

Você já pode testar novamente pelo [Assistente de Projetos](https://geobrain-relatorios.lovable.app/corretor). Para comparar melhor, use uma versão do estudo anterior à revisão, sem caixas ou comentários com apontamentos e respostas.

Para repetir a geração dos destaques, use **Sugestão de análise**. Para conferir erros e inconsistências do estudo, use **Revisar estudo**. As planilhas de cálculo podem ser incluídas na revisão para conferir os números com os dados de origem.

Se algum resultado não fizer sentido, pode nos enviar o nome do arquivo, a opção utilizada e o slide ou print do ponto encontrado.

Obrigado!

Atenciosamente,
Gabriel

Nenhum email foi enviado. Esse texto não afirma que reproduzimos a saída antiga ou corrigimos todos os apontamentos dela.
