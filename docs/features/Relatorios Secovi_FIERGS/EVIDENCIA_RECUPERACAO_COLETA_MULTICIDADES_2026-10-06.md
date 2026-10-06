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
- Commit local isolado: `60ff24a feat(panorama): recover incomplete city collections`. Na conferência posterior, a referência cacheada mostrava divergência 1/1: local `60ff24a` e remoto `b49b804` (Sinduscon). `git fetch origin` falhou por indisponibilidade de conexão ao GitHub; o estado remoto mais recente não pôde ser confirmado. Nenhuma integração ou push foi feito; ambos aguardam autorização de Gabriel e nova conferência de rede.
