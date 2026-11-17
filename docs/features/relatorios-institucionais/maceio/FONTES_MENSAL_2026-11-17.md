# Maceió mensal — fontes pendentes e INCC-DI — 17/11/2026

## Evidência e escopo

Lucas forneceu o diagnóstico real `maceio-mensal-2026-05-diagnostico.json`, gerado em 17/11 às 17:41 UTC: 0 disponíveis, 55 aguardando fonte, 5 aguardando critério e 22 editoriais. CAGED (9–14) excluído do pedido. Restam 49 slides bloqueados por coleta/cobertura e 5 por critério monetário. A maioria das fontes tem zero linhas e `complete:false`; alguns municípios retornam vazio completo. O arquivo não contém status HTTP ou corpos de resposta, então não permite concluir a causa de cada falha remota.

## Defeitos comprovados no código/contrato

1. Os recursos públicos `ReleasesResource`, `SalesResource` e `StockResource` do OpenAPI local (`src/assets/openapi/api-geobrain.json`) têm período, grupo, segmento e métricas; não exigem cidade/UF por linha. Os coletores de Maceió exigiam esses campos, reprovando respostas válidas não vazias. O novo adaptador associa a identidade do filtro municipal previamente autorizado; identidades explícitas contraditórias continuam bloqueadas. Nenhum valor numérico, grupo ou mês ausente é preenchido.
2. A paginação do catálogo/histórico exigia que `links.next` repetisse `city`. O contrato permite cursores que trazem somente `page`. O novo verificador aceita omissão, valida host/path/página e qualquer filtro de escopo explícito, e **reconstrói** cada requisição com os filtros originais. Não segue URLs não confiáveis nem usa paginação para ampliar escopo. Total/última página estáveis e contagem final continuam obrigatórios. `per_page` é uma indicação de tamanho, não identidade de escopo.
3. Detalhes usavam GET na rota v1 `building-with-history-internal`, não documentada no OpenAPI. Agora usam o contrato já adotado por SP e outras features: **POST `https://app.geobrain.com.br/public-api/v2/building-with-history-internal`**, parâmetros city/uf/type/page/per_page na query, Bearer explícito em memória e Content-Type application/json. Nenhum fallback silencioso para outro endpoint ou perfil. O parser `readBuildingPage` existente valida identidade e metadados v2; total é obrigatório para consolidar. Não aplica filtro de período à coleta detalhada: cálculos históricos precisam de todas as fotografias. Liberação desse endpoint para a conta do usuário ainda requer ensaio autenticado.
4. Timeout do histórico/catálogo passou de 20s para 60s; intro ganhou o retry limitado já usado pelo módulo. Cancelamento e guardas de escopo permanecem ativos. Uma competência mensal explícita `YYYY-MM` vira `YYYY-MM-01` após validação, sem criação de meses ausentes.

## Decisão autorizada: INCC-DI

Lucas respondeu **“Usar INCC-DI”** e pediu **“Deixa explícito que usa o incc di”**. Somente no mensal, slides 26–28 e 37–38 usam INCC-DI da série versionada já disponível no sistema, com base no fechamento selecionado. A prévia, legenda dentro da arte, metodologia e JSON identificam **INCC-DI**; JSON registra `monetaryBase: "2026-05"` para esta seleção. O trimestral continua sem série presumida. Índice ou valor nominal ausente continua bloqueando o indicador; não se usa mês-base anterior nem número do PPTX. Essa autorização escolhe a série, não homologa todos os valores do relatório.

## Diagnóstico e validação

JSON agora inclui endpoint e `failure: {code,httpStatus}` nas fontes de slides, e falhas categorizadas no cadastro/lançamentos. Nunca inclui corpo privado, Authorization, token ou chave de sessão. Permite distinguir HTTP/rede/contrato/paginação/recorte/período em uma nova geração, sem expor detalhes técnicos no fluxo normal do usuário.

134 testes do módulo aprovados; testes adicionais específicos verificam recurso público sem cidade/UF, mês explícito, identidades contraditórias, cursor sem filtro, POST v2, histórico sem corte por período, metadados v2 sem current_page e falha403 sanitizada. Typecheck/lint aprovados. Os 12 cenários finais de navegador passaram sem erros de página: mensal/trimestral, desktop/mobile nos temas claro/escuro, fonte sucesso/vazia/erro, espera deliberada somente no QA e download JSON validado. A indicação de INCC-DI e a renderização do slide26 mensal foram verificadas. O trimestral preserva `unconfirmed`. Capturas/JSON em `.local-inputs/relatorios-lucas/maceio/diagnostic-2026-11-17/page`; captura desktop de CAGED indisponível revisada visualmente. Os scripts usam agora recursos temporais sem cidade/UF e cursorem `?page=`, rejeitando GET no histórico v2. Ajustada a espera pela renderização no teste visual; as duas tentativas intermediárias não concluíram todos os cenários, e somente a rodada final completa sustenta esta evidência.

Nas respostas sintéticas com o formato público e histórico v2, mensal com fonte completa chega a **60 disponíveis + 22 editoriais**, com zero aguardando fonte/critério; quando CAGED falha, fica **54 disponíveis + 6 aguardando fonte + 22 editoriais**, sendo pendentes somente9–14. Isso é evidência headless do contrato, **não** nova coleta autenticada dos dados de maio/2026. A sessão do Opera não é acessível pela ferramenta e não há token Geobrain configurado neste ambiente. Depois da publicação autorizada, gerar novamente o mensal na sessão do usuário e conferir o novo JSON; permissões v2, dados nominais, cobertura histórica e classificações reais podem manter pendências legítimas.

Não alterar CAGED, job GCP, ponte de Empresas/Empregados, outras features ou regras Secovi/FIERGS neste lote. Sem push/deploy automático ou escrita Monday.

Fechamento: build final de produção concluído com exit0, depois do último ajuste de parser v2. Tipos/lint e134testes aprovados;12cenários finais de navegador aprovados sem erros. O build apresenta os avisos já conhecidos de tamanho de chunks e import misto de xlsx, sem erro de compilação.

**Monday:** [Panorama Maceió / SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406169) — `13149406169`.
