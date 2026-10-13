# Reteste no site — Rolândia — 13/10/2026

Estado: **proteção da reconferência verificada em produção; caso integral ainda parcial**. Quatro alertas restaurados, 13 planilhas cruzadas e reteste gratuito posterior à publicação concluído.

## Verificação após publicação no Lovable — 13/10, 15:44 Brasília

Gabriel informou a publicação. Consulta confirmou `/assets/CorretorV3Page-D46qbc_d.js` e `/assets/db-RpgUw7Cm.js`, ambos com contrato `evaluatedRule`; regra tabela/conclusão e guarda de ano também presentes no frontend. Reconferência autorizada executada com o mesmo PPTX de 78 slides, criando versão 4 do estudo.

**Resultado observado:** 15 registros antes e depois, mesmos IDs/payloads/status/versões de resolução; nenhuma exclusão, alteração de achado ou falso corrigido. Os quatro controles (`nested-radii-fonte-Dom.p Cond. Ocup.-1`, `nested-radii-fonte-Dom.p Tipo-0`, `ata-coverage`, `review-notes-blind`) continuam `pendente`, com `resolvido_na_versao=null`. Interface: 13 itens para revisar, 10 bloqueadores; diff 0 resolvidos/6 persistentes/0 novos. FP Sociodemografia permanece removido, duas seções sem conteúdo continuam no checklist.

Mensagem do app: **32 imagens no cache, nenhum passe pago executado**. Nenhuma chamada a Edge Functions; nenhuma falha JavaScript capturada. Custo acumulado permanece US$ 0,2506. Escritas observadas: versão nova (POST 201) e atualizações de conteúdo determinístico (PATCH 204), sem mudança efetiva dos achados nessa rodada.

Evidência: `.local-inputs/rolandia-site-2026-10-13T18-44-43-722Z/result.json`, `inspection.json`, `before.png`, `after.png`. Proteção v0.68.1 comprovada neste caso real; não representa reteste de Daniele, melhoria do OCR UsHome ou reanálise textual integral. Próximo: adjudicar os achados de Rolândia/Boulevard e recuperar contexto dos casos pendentes; IA nova continua sujeita a lote/orçamento.

## Push autorizado e conferência posterior — 13/10

Gabriel autorizou envio e repetição da reconferência. `e230070` enviado a origin/main, novo fetch confirma 0/0. Documentos locais FIERGS preservados, sem inclusão no push. `check:live-docs` aprovado antes do envio.

Consultas independentes do site às 15:39, 15:40 e 15:41 (Brasília), cada uma em navegador novo e URL com parâmetro único, ainda carregaram `/assets/CorretorV3Page-C4xyNz2S.js`. Regra v0.68 presente; contrato `evaluatedRule` da proteção v0.68.1 ausente em todos os bundles carregados. **Deploy da proteção não confirmado; reconferência não executada**, evitando repetir a falha conhecida. Nenhuma chamada de IA ou mutação nessas consultas; quatro alertas continuam pendentes nos 15 registros lidos.

Evidências locais: `.local-inputs/rolandia-site-2026-10-13T18-39-37-543Z/`, `2026-10-13T18-40-40-421Z/` e `2026-10-13T18-41-42-906Z/`, cada uma com inspeção/resultado e captura do estudo. Próximo: confirmar atualização do site no Lovable e repetir o script já preparado; aprovação para reteste gratuito permanece válida. Não inferir deploy pelo push.

## Publicação comprovada

Fetch de todos os remotos: somente origin, main sincronizada 0/0 em `f3bf72c`. Commit do Corretor `47107b2` já incluído no histórico remoto pela publicação de outra frente. Alterações locais FIERGS e LIVE_rebrain preservadas. Nenhum push nesta sessão.

Site `https://geobrain-relatorios.lovable.app/corretor`, bundle `/assets/CorretorV3Page-C4xyNz2S.js`: contém literalmente a regra “Conclusão diverge do total de domicílios da tabela” e a guarda “ano de lancamento”. Confirma presença do código frontend v0.68; não comprova revisão das Edge Functions, que não foram alteradas pelo commit.

## Execução real

Estudo `50e36e0c-02f3-4224-ab4f-cfb522a26801`, Rolândia, 78 slides; PPTX original pareado ao hash da baseline, selecionado pelo input “Reconferir (DET R$ 0)”. Todas as rotas `/functions/v1/` bloqueadas preventivamente; nenhuma foi solicitada. Custo acumulado permanece **US$ 0,2506**; mensagem do app confirma **32 imagens no cache e nenhum passe pago executado**.

Primeira execução criou versão 2; o capturador da automação falhou ao tentar decodificar uma resposta PATCH 204 vazia, depois que a aplicação já havia escrito. Segunda execução, com captura corrigida, criou versão 3 e terminou com mensagem “Reconferência gratuita concluída”. Ambas usaram o mesmo PPTX, sem correção do arquivo. Preservar essas versões como registro do reteste; não representam edições do analista.

Checklist estrutural mudou de três para duas seções sem conteúdo, removendo o falso positivo de Sociodemografia. Seções 04/05 e slide final a conferir permanecem. Os 15 registros não foram excluídos. Alertas de IA e custo anterior permanecem.

## Falha descoberta — não declarar sucesso pela redução de cartões

Interface caiu de 13 para 10 itens revisáveis, mas quatro registros DET foram marcados automaticamente como corrigidos na versão 2 sem executar suas regras:

- `nested-radii-fonte-Dom.p Cond. Ocup.-1`: raio 3 km 4.833 < raio 2 km 4.924.
- `nested-radii-fonte-Dom.p Tipo-0`: raio 3 km 1.428 < raio 2 km 1.524.
- `ata-coverage`: cobertura da ata.
- `review-notes-blind`: slides comentados sem achados.

Diagnóstico em `src/features/corretor/lib/v3/db.ts::recheck`: considera todos os achados DET ativos avaliados, enquanto `CorretorV3Page.tsx::recheckFromBytes` executa somente `irToFindings` e cruzamento direto com a fonte. As regras de raios da fonte, cobertura da ata e lacunas da revisão não são executadas nesse caminho. Sua ausência no resultado não prova resolução. A proteção atual restringe SOURCE_CROSSCHECK quando fonte ausente, mas não cobre essas famílias.

**Correção local implementada:** `recheck-scope.ts` declara os identificadores das regras nativas e de fonte direta executadas nesse caminho. `recheck` exige uma função explícita de escopo antes de considerar um DET resolvido; sem escopo informado, abstém-se. Regras de outras fases e desconhecidas ficam preservadas. 19 testes protegem os quatro exemplos acima, fontes não avaliadas, leituras de visão e regras futuras; total focado 47 testes aprovados. Não chama fase paga para contornar o problema. Validar fluxo completo após publicação desta proteção; testes atuais demonstram o escopo, não uma execução da proteção no site.

## Restauração e limite de aprovação

Revisão automática inicialmente bloqueou as mutações por exigir autorização específica. Gabriel respondeu **“Sim, restaurar e cruzar as planilhas”**. Em seguida, restauração exata de `status=pendente` e `resolvido_na_versao=null` concluída nos quatro registros (PATCH HTTP 204 e leitura posterior confirma os quatro), sem alterar vereditos/payload. As 13 planilhas originais foram vinculadas pela interface; mensagem confirma **4 divergências com a fonte e 32 leituras reaproveitadas, R$ 0**. Interface retornou a 13 itens para revisar/10 bloqueadores; não tratar os quatro resultados do cruzamento como quatro novos achados únicos.

Próximo: revisar/publicar proteção do diff e repetir a reconferência, conferindo que os quatro alertas continuam pendentes. Reanálise completa inclui passe textual pago mesmo com imagens em cache: somente após lote/orçamento. Reconferência gratuita não executa a regra tabela/conclusão nem constitui reanálise integral; Boulevard ainda não comprovado no fluxo do site. Custo acumulado permaneceu US$ 0,2506.

## Validação da proteção local

47 testes focados aprovados, dez passes sem mudança de gabaritos, tipos/build aprovados; lint sem erros (aviso de hook preexistente). Rodada sem permissões ampliadas foi bloqueada pelo esbuild ao ler diretórios; repetição autorizada completou normalmente. Relatório final `.local-inputs/corretor-regression/2026-10-13T18-34-14.049Z-27196/report.md`. Não confundir falha de ambiente com regressão do motor.

## Evidência local

Antes v1: `.local-inputs/rolandia-site-2026-10-13T18-28-16-279Z/inspection.json` e `before.png`.

Antes v2/depois v3, bundle, 15 registros completos, respostas e captura: `.local-inputs/rolandia-site-2026-10-13T18-28-49-962Z/result.json`, `before.png`, `after.png`. Arquivos brutos ignorados pelo Git; scripts temporários no mesmo diretório não são fluxo definitivo de produto.

Restauração e cruzamento: `.local-inputs/rolandia-source-1791916430239/result.json` e `after.png`. Tentativas intermediárias falharam no capturador/carregamento, não em chamadas de IA; estado final da restauração confirmado por leitura. Sem gasto novo.

Monday: [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102) — `12700802102`. Nenhuma escrita no Monday.
