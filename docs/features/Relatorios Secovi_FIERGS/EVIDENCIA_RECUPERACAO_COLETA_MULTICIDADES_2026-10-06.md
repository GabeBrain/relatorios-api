# Evidência — recuperação segura da coleta multicidades (06/10/2026)

## Resultado e baseline

- Baseline: `41c3396` local; a auditoria do site identificava três cidades sem coleta completa, mas não registrava a etapa nem a resposta HTTP. A consulta direta bem-sucedida anterior confirma que a falha não é permanente; não confirma a causa da execução que falhou.
- Implementada política compartilhada para qualquer lista deduplicada de cidades, sem lista fixa FIERGS e sem imputação de valores.
- `CityHarvest` é a unidade de substituição: cada retry refaz a cidade inteira, e só armazena seu cubo após concluir fontes obrigatórias. Sucessos preservados em memória não são coletados de novo.

## Portões e decisões

### G0 — contrato de completude

Para este motor, histórico de empreendimentos e fontes temporais de vendas/oferta por padrão e tipologia são requisitos de completude do cubo e das reconciliações. Indicadores restantes continuam opcionais e sujeitos aos avisos existentes; IVV por tipologia segue derivado do cubo granular. Uma fonte necessária sem dados (inclusive resposta vazia HTTP 200) falha a cidade e não vira zero. Mensagens expõem operação/endpoint lógico e status, sem URL/token.

### G1 — retry de cidade

`collectByCity` aceita limite de tentativas, classificador, espera cancelável e callback de progresso. A coleta de Panorama usa até três tentativas totais (duas adicionais) somente para rede/timeout, 408, 429 e 5xx. 401/403, demais 4xx e payload vazio/contratual não entram em retry cego. O backoff usa jitter; `Retry-After` é propagado por `httpRequest` e prevalece. Cada falha reexecuta o `harvestCity` inteiro; apenas um resultado concluído entra na sessão.

### G2 — sessão e interface

Falha final lança `PanoramaCollectionError`; nenhum modelo parcial/página de relatório é montado. A interface identifica cidades, operação, resposta, tentativas e oferece CSV diagnóstico. “Tentar cidades faltantes” é habilitado para falhas transitórias; falhas de acesso/contrato orientam “Recomeçar coleta”. O handle mantém cubos completos somente para o mesmo escopo e token, com validade de 15 minutos; novo relatório, recorte, login/logout ou expiração reinicia a sessão. Progresso indica cidade, etapa, rodada e cobertura concluída/N. Cada nova geração usa uma chave exclusiva no React Query; mudança de filtro, nova geração ou saída da tela aborta a tentativa anterior e impede reapresentar páginas antigas.

### G3 — auditoria

Uma cidade recuperada fica no modelo como `cityCollectionAttempts` e emite aviso `CITY_COLLECTION_RECOVERED`; a auditoria FIERGS inclui linha `coleta_cidade` e métricas temporais por operação (`requisições` e duração). Falhas sem relatório final têm CSV separado com cidade, operação, status, classe, tentativas, duração e mensagem sanitizada. Limite: estatísticas por operação cobrem endpoints temporais; chamadas granulares de empreendimentos ainda não têm contagem/duração por endpoint nesta entrega.

### G4 — testes focados

- `vitest` focado: 4 arquivos, 62 testes aprovados — coleta para N=1, 2, 4 e 10; recuperação sem refazer cidades prontas; autenticação sem retry; cancelamento durante backoff; `Retry-After`; sanitização do CSV; progresso; aviso de recuperação; exportação bloqueada por cobertura incompleta e invariantes FIERGS.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: falha em 10 erros preexistentes exclusivamente em `src/features/corretor/lib/audit/__tests__/structure-empty-sections.test.ts` (campos obrigatórios ausentes em fixtures). Nenhum arquivo de Corretor foi alterado e não houve outro diagnóstico TypeScript reportado.
- Nenhuma API real, PDF ou regressão longa foi executada, conforme solicitado.

## Arquivos e estado

- Código: `domain/collection.ts`, `domain/generation-progress.ts`, `api.ts`, `types.ts`, `report/model.ts`, `report/generation-notices.ts`, `export-store.ts`, `pages/PanoramaSecoviFiergsPage.tsx`, `components/PanoramaLoadingState.tsx`, `lib/request-with-retry.ts`, `lib/collection-failure-audit.ts`, `lib/fiergs-audit.ts`.
- Testes: `opus-period-cities.test.ts`, `generation-progress.test.ts`, `report-model.test.ts`, `reconciliation-guards.test.ts`.
- Pendente: fluxo sintético ponta a ponta da API/UI e ensaio do Gabriel no site FIERGS 2T2026; regressão multi-cidade Secovi; revisão do CSV/PDF gerado; aceite da Juliana. G5 não significa publicação nem homologação.
- Commits publicados em `origin/main`: `a3e859b feat(panorama): recover incomplete city collections` e `d9ab4fa docs(panorama): record collection recovery status`, reaplicados sobre o commit Sinduscon remoto já existente `b49b804`. Push confirmado e `git fetch origin` posterior confirmou `main...origin/main = 0/0`. O intervalo publicado contém somente Panorama/FIERGS e documentação correspondente; nenhum arquivo de código Sinduscon/Corretor foi alterado. Publicação não substitui o ensaio manual: PDF/CSV real e aceite da Juliana continuam pendentes.


## Diagnóstico delimitado de Bom Retiro do Sul — 06/11/2026

Origem: auditoria entregue por Gabriel em `.local-inputs/panorama-territorial-2026-11-05/auditoria-coleta-panorama.csv` (uma linha, `empty`, HTTP200, uma tentativa, 40.748ms); captura mostra janela1T2023–3T2026. A duração é municipal, não latência de uma chamada e não comprova timeout. Autorização explícita na conversa para consultar somente essa cidade e janela, vendas/oferta por padrão/tipologia e cadastro, sem estudo completo.

Seis requisições de primeira página (per_page100, concorrência2), além do login local sem armazenar segredo. Todas HTTP200 e paginação completa last_page1. Quatro consultas GET a `geobrain.com.br/public-api/temporal-analysis-city/{sales,stock}`, query city=Bom Retiro do Sul, uf=RS, start_period=2023-01-01, end_period=2026-09-30, group_by=Padrão/Tipologia, type[]=Vertical/Horizontal. Duas consultas POST a `app.geobrain.com.br/public-api/v2/building-with-history-internal`, por tipo Vertical/Horizontal, mesma cidade/UF, sem status, conforme motor.

Resultados: sales/Padrão e stock/Padrão têm seis linhas, exclusivamente Horizontal; Tipologia tem data=[]/meta.total0 em ambos. Cadastro Vertical0 e Horizontal1 (80098, Colina Dos Coqueiros). Respostas por padrão levaram18,1–18,6s; tipológicas0,4–0,5s; cadastro0,1–0,2s. Nenhum timeout nesta reprodução. Fato: o bloqueio decorre da exigência de uma fonte tipológica vazia numa cidade exclusivamente horizontal. A razão interna pela qual a API omite horizontais em Tipologia não foi investigada no servidor; não generalizar como regra universal da API.

Correção e contrato estão na seção de complemento do [plano de recuperação](PLAN_RECUPERACAO_COLETA_MULTICIDADES_PANORAMA_2026-10-06.md#complemento-comprovado--06112026-ausência-tipológica-horizontal), fonte metodológica. Casos negativos cobrem cadastro vertical/misto/desconhecido/vazio, fontes padrão verticais/desconhecidas/vazias, transporte401/422/500/null: permanecem impeditivos. 50 testes focados aprovados; tipos/lint aprovados.

Replay offline usa somente os seis corpos reais: um projeto Horizontal, 44 reconciliações críticas match, exportBlock=null. Preços eIVV não foram consultados: stubs explícitos indisponíveis, sem validar esses indicadores nem equivaler ao estudo completo ou conjunto de cinco cidades. Não foram criados PDF/PPT/CSV de estudo. Brutos, URLs, horários, latências, hashes e replay em `.local-inputs/panorama-territorial-2026-11-05/bom-retiro-2026-11-06/`. Código de coleta local não imprime nem grava credenciais. Próximo publicar candidata autorizada e repetir o recorte completo no site, conferindo avisos/saídas antes de declarar resolvido em produção.

Cronômetro: mesma identidade Brain, sóMM:SS no Panorama, pulso650ms de opacidade0,72→1 no tick real; movimento reduzido desativa animação. Browser local confirmou incremento, ausência do sufixo e `animation:none` na preferência reduzida. Sem tokens novos; outros consumidores mantêm apresentação padrão.
