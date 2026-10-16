# Corretor V3 — recomendador e métricas

## Estado e escopo

**Implementado e validado localmente; publicação pendente.** Plano [R0–R5](PLAN_RECOMENDADOR_E_METRICAS_2026-10-16.md) autorizado por Gabriel. Base `e36c591`, main/origin inicialmente 0/0 após fetch. Documentação FIERGS e ZIP locais preservados. Nenhuma IA real, alteração de decisões no site, migration remota ou deploy nesta entrega.

Recomendador operacional localizado no histórico (`89012dc`, divisão em lotes `d58f64c`); a preparação contínua `178a96b` havia removido seu acionamento na interface. Recuperados os critérios Brain e as seções **Avaliação da Consultoria, Recomendação e Orientação ao analista**. Não se alterou a tese do prompt nem o modelo do motor anterior.

## O que mudou

### Materiais e entrada

- PowerPoint preparado e Excel adicionado têm superfície oliva preenchida, ícone, texto de sucesso e check. Cancelar seletor conserva materiais; remover todas as planilhas retira o verde; apresentação inválida não recebe sucesso. Verde significa preparação local, não cópia remota ou análise concluída.
- Novo estudo oferece **Revisar estudo** e **Gerar recomendação** sobre os mesmos arquivos. Alterar objetivo não dispara IA. Revisão conserva seus requisitos e orçamento; recomendação informa sua própria cobertura, lotes, previsão e limite.
- Antes de gerar, confirma vínculo atômico com estudo/versão/hash, conserva Excel por hash e consome o rascunho. Arquivo repetido reutiliza o estudo e suas decisões. Conta continua vendo preparações incompletas em Meus estudos.
- Aba **Recomendação** por versão: histórico, resultado, copiar/baixar texto, custo e execução. Consulta de texto salvo independe do original disponível. Para gerar, original deve corresponder ao hash da versão; se ausente, pode ser selecionado novamente.

### Custo e execução

- Navegador e servidor compartilham contrato, prompt, preço e divisão. Até 180 slides/180 mil caracteres e 90 mil bytes UTF-8 por lote; até dez lotes, mais compilação quando necessária. Memos limitados a 8 mil bytes; entradas acima dos limites são recusadas antes de chamar IA.
- Previsão usa tamanho do prompt e projeção de tokens, com teto de saída. Reserva usa limite conservador por bytes e saída máxima, incluindo a compilação. Câmbio indicativo do produto **R$ 5,16/US$**, sem consulta cambial ou promessa de fatura.
- Confirmação explícita antes do primeiro provedor. Cada chamada passa por `corretor-execution`, reserva orçamento no banco e só aceita payload escolhido pelo servidor a partir do contexto confirmado. A função consultiva recusa chamada direta do navegador.
- Resultado, tokens, custo, duração e progresso são contabilizados na mesma transação por lote. Repetição de lote concluído reutiliza resultado. Pausa entre chamadas conserva memos; retomada requer nova conferência de limite.
- Retorno desconhecido mantém reserva, aparece a conferir e bloqueia repetição automática. Texto ausente com uso confirmado registra custo e falha. Memos/saída truncados ou filtrados não são apresentados como resultado completo.
- Geração deliberadamente nova exige ação e confirmação novas. Reabrir histórico não chama provedor. O identificador local existente da execução fica interno; não cria nova autenticação para o usuário.

### Monitoramento integrado

- `ia_passes.tipo=recomendacao`, vinculado à execução e ao hash do lote, com modelo solicitado/retornado, versões de prompt/preço, tokens entrada/cache/saída, latência e ID do provedor.
- `studies_v3.custo_total` inclui o uso consultivo confirmado, sem alterar achados, relatório de auditoria, estado de revisão ou decisões humanas.
- `corretor_recommendations` guarda resultado por estudo/versão/execução: previsão, limite, gasto, reserva pendente, cobertura, chamadas, duração acumulada e estados. Escrita de resultados/passagens contabilizadas exclusiva do servidor. Contexto e memos intermediários continuam privados.
- **Métricas de IA e calibração**, acessível pela carteira: painel dos últimos 30 dias, totais e médias por tipo/modelo, tokens/cache, latência e estados/custos do recomendador. Valores antigos sem modelo são identificados; falha de consulta não vira custo zero. API retorna também agregados diários. Gasto financeiro fica separado de qualidade e falsos positivos.
- Custo é calculado pelo uso retornado, com desconto apenas para cache informado pelo provedor. Não é conciliação da fatura, impostos ou custo Lovable Cloud.

## Exemplo de previsão com material real

Campos do Jordão, apresentação da pasta SE `_UPLOADS_TESTE/Corretor_V3_Campos_do_Jordao/02_APRESENTACAO_SELECIONAR_DEPOIS`, SHA-1 `e6a5fa03d2a189c86a59d70d5eb515e0dd3cd36f`:

- 153 slides totais; 130 com texto útil, 23 sem texto suficiente; nenhum limitado a 6.000 caracteres.
- Uma chamada prevista: **US$ 0,0042, cerca de R$ 0,02**. Reserva máxima arredondada na tela **US$ 0,0082**; limite sugerido **US$ 0,01**.
- Previsão para texto e tabelas nativas. Excel, PDF e conteúdo exclusivamente em imagem não alimentam este motor. A seleção das onze planilhas foi preservada para a revisão numérica; não foi apresentada como interpretação consultiva de imagens.
- Não houve execução real deste lote. Valores de consumo exibidos nas capturas de teste são respostas simuladas, não custo observado deste estudo.

## Evidências de validação

- **320 testes aprovados, dois condicionais pulados** no escopo Corretor. 25 controles novos de contrato, orçamento, Unicode, cache, cobertura, navegação, cliente e reabertura/erro da interface. `.local-inputs/recommendation-vitest.json`.
- **Dez passes gratuitos preservados**, sem atualizar gabaritos: baseline e Excel de Rolândia, Toledo, Campos do Jordão, São José dos Campos VAP e v2. Relatório `.local-inputs/corretor-regression/2026-10-16T15-52-02.828Z-13128/report.md`.
- **13 controles novos de Edge + PostgreSQL**: handlers reais compilados, provedor simulado e migration aplicada somente em PGlite local. Orçamento/slide inválido, acesso direto, resultado atômico, replay, proprietário, metadados, dois memos/compilação, pausa/retomada, truncamento, retorno desconhecido, texto vazio, leitura pública sem escrita/contexto e reconciliação de custo. Script `scripts/diagnostics/corretor-recommendation-edge.mjs`; saída `.local-inputs/recommendation-edge-result.json`. Seis chamadas simuladas, cinco com uso confirmado; custo simulado US$ 0,000975 reconciliado nas três fontes, uma reserva desconhecida separada.
- **13 controles SQL e nove Edge anteriores repetidos com a migration nova**, preservando reservas, replay e revisão. Scripts `corretor-execution-migration.mjs`/`corretor-execution-edge.mjs`.
- **Nove verificações do novo percurso em Chromium**, PPTX/11 Excel reais, todos os serviços externos interceptados. Verde/vazio/cancelamento/remoção, cobertura e custo, teclado, geração e reabertura, original/planilhas por hash, revisão e Novo estudo, painel de métricas. Desktop 1440/1024 e mobile 390/320, claro/escuro; sem erros JavaScript ou estouro interno do novo painel. Script `scripts/diagnostics/corretor-recommendation-browser.mjs`, resultado/capturas `.local-inputs/recommendation-flow-1792166667559/`.
- **Quinze verificações do percurso anterior** e **oito de carteira pessoal** repetidas: `.local-inputs/continuous-browser-1792166226946/` e `.local-inputs/portfolio-flow-1792166461613/`. Serviços/identidade simulados; nenhum site foi modificado.
- Tipagem TypeScript do app e Deno das duas funções, lint dos arquivos alterados e build de produção aprovados. Logs `.local-inputs/recommendation-deno.log`, `recommendation-build.log`. Avisos existentes: Browserslist antigo e chunks grandes; não alteradas outras frentes.
- Inspeção visual revelou check com baixo contraste e carregamento de versões não encerrado na nova aba; ambos corrigidos e percurso repetido com sucesso. Tokens SE permanecem idênticos; nenhuma biblioteca visual nova.

## Limites e pendências reais

1. **Ainda não publicado.** Novo schema e funções não foram aplicados ao backend Lovable. A validação local não comprova disponibilidade do provedor nem uma geração consultiva real em produção.
2. **Modelo atual:** [documentação oficial GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini) consultada em 16/10 mostra o modelo/snapshot como `Deprecated`, além dos preços US$ 0,15/0,075/0,60 por milhão de tokens de entrada/cache/saída. Mantido o motor existente; disponibilidade no projeto não testada e nenhuma substituição silenciosa. Conferir disponibilidade antes do primeiro lote real; se indisponível, escolher modelo, reprecificar e repetir os controles sem trocar a tese consultiva por inferência.
3. Cobertura textual não é leitura integral de material visual. Avaliação humana da qualidade da recomendação continua pendente e não se prova por contagem de alertas, testes ou custo menor.
4. Histórico consultivo antigo não foi retroativamente inventado: respostas anteriores não persistidas não podem ser recuperadas desta tabela. Registros de revisão legados podem não ter modelo/cache/latência.
5. Memos sem retorno confiável não têm reconciliação automática com fatura. Reserva fica retida e requer conferência administrativa; não foi criado botão que a libere às cegas.
6. Recuperação em outro computador continua dependendo da cópia remota explícita dos materiais. Autorizações REST legadas, conversão hospedada e demais partes abertas de A2/A3 não são encerradas por esta entrega.

## Ativação após revisão e push autorizado

1. Aplicar **somente** `supabase/migrations/20261016153609_corretor_recommendation_metrics.sql`, sobre o registro de execução já existente; não repetir migrations antigas. Conferir tabela de recomendações e RPC `corretor_ai_usage`.
2. Publicar `analyze-consulting-suggestion` e `corretor-execution`, incluindo os imports locais `_shared/recommendation.ts` e `corretor-execution/recommendation.ts`. Nenhum novo secret; usam as configurações existentes. Não republicar motores de revisão sem necessidade.
3. Publicar frontend no Lovable. Sem as dependências, mostrar indisponibilidade e não iniciar provedor. Gerar tipos Supabase atualizados quando o schema remoto estiver disponível; fronteira aditiva atual é explícita e conferida por teste.
4. Confirmar sem IA: biblioteca, resultado/sem resultado, arquivo, previsão, painel e recusa direta. Depois apresentar um lote real com orçamento para autorização específica e comparar uma recomendação com evidências/humano; conferir custo/passe/histórico após reload.
5. Em falha, desabilitar o novo acionamento e conservar tabelas, execuções e reservas; não apagar histórico, decisões ou baixar limite sobre gasto já confirmado. Não reaplicar a implementação antiga que chama a função diretamente.

Documentos de avanço, plano semanal, acompanhamento pessoal e mapa SE atualizados. Push separado da autorização de implementação, conforme AGENTS.md.
