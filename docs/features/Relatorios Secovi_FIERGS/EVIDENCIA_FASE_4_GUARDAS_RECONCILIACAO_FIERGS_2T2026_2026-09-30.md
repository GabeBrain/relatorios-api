# Evidência da Fase 4 — guardas de reconciliação FIERGS 2T2026

## Resultado executivo

O relatório FIERGS agora possui um contrato de homologação calculado antes da renderização. Cada verificação registra métrica, fonte, fórmula, universo, período observado, total canônico, total dimensional, delta, tolerância e status. Contagens usam tolerância zero.

Se uma invariante crítica divergir ou estiver indisponível, o modelo recebe `homologable: false`, os botões PDF/PPT ficam desabilitados e a própria store de exportação recusa uma chamada direta. A Auditoria CSV continua disponível para diagnóstico.

## Resultado da bancada autenticada

A execução das dez cidades no fechamento `2T2026` produziu **11/11 invariantes em `match`**, todas com delta zero:

| Invariante | Canônico | Dimensional | Delta |
|---|---:|---:|---:|
| vendas verticais por padrão | 1.091 | 1.091 | 0 |
| vendas verticais por tipologia | 1.091 | 1.091 | 0 |
| vendas verticais por cidade | 1.091 | 1.091 | 0 |
| vendas verticais por área | 1.091 | 1.091 | 0 |
| estoque vertical por padrão | 5.251 | 5.251 | 0 |
| estoque vertical por tipologia | 5.251 | 5.251 | 0 |
| estoque vertical por área | 5.251 | 5.251 | 0 |
| projetos horizontais por coorte | 129 | 129 | 0 |
| lançamentos horizontais por coorte | 30.476 | 30.476 | 0 |
| oferta final horizontal por coorte | 3.365 | 3.365 | 0 |
| chácaras presentes no runtime | 0 | 0 | 0 |

O relatório real foi classificado como **homologável**. A evidência bruta local está em `.tmp/fiergs-phase4-reconciliation-2T2026.json` e não contém números alterados manualmente.

## Comportamento de falha comprovado

Uma regressão injeta deliberadamente `49` na tipologia contra canônico `50`. A guarda registra delta `−1`, status `different`, marca o relatório como não homologável e bloqueia o início da exportação.

## Auditoria CSV

Além de empreendimentos e rejeições, o CSV passa a emitir linhas `reconciliacao` com:

- identificador da métrica;
- fonte e fórmula;
- entidade, UF, municípios e segmento do universo;
- trimestre observado;
- total canônico e dimensional;
- delta e tolerância;
- status e criticidade.

## Verificações

- `npx tsc --noEmit -p tsconfig.app.json` aprovado;
- suíte completa da feature: `224/224` testes aprovados;
- bancada autenticada das dez cidades: 11/11 invariantes em `match`;
- build de produção aprovado; permaneceram apenas os avisos conhecidos de Recharts/JSDOM, Browserslist e tamanho de chunks.

## Estado do portão

A Fase 4 está **concluída tecnicamente**. Uma divergência futura crítica passa a falhar em teste ou bloquear a exportação, sem substituir números e sem fallback silencioso.
