# Evidência da Fase 5 — comparativos temporais FIERGS 2T2026

## Resultado executivo

Os comparativos editoriais do FIERGS passam a usar uma única função de domínio. A função distingue três contratos: trimestre equivalente, primeiro semestre comparável e acumulado móvel de 12 meses. Períodos ausentes não são convertidos em zero e denominador zero não produz infinito.

## Contratos implementados

| Tipo | Rótulos no fechamento 2T2026 | Regra |
|---|---|---|
| trimestre equivalente | `2T2025` × `2T2026` | fotografia/fluxo do mesmo trimestre em anos consecutivos |
| primeiro semestre — fluxo | `1S2025` × `1S2026` | `1T + 2T`, somente quando ambos existem nos dois anos |
| primeiro semestre — fotografia | `1S2025` × `1S2026` | fotografia do `2T` em estoque e IVV |
| acumulado móvel | `12M até 2T2025` × `12M até 2T2026` | valor da janela móvel encerrada no trimestre equivalente |

A variação percentual é `(atual / anterior − 1) × 100`. Se o anterior for zero, ou se qualquer lado estiver ausente, a variação é exibida como indisponível. Um semestre incompleto recebe a indicação `Período incompleto`.

## Slides cobertos

- padrão comparativo do slide 9 aplicado aos slides **11, 14, 22, 26 e 33**, com rótulo explícito de acumulado de 12 meses;
- primeiro semestre contra primeiro semestre anterior aplicado aos slides **15, 16, 27, 28, 35 e 39**;
- slides móveis 16 e 28 mantêm o gráfico de 12 meses, mas o cartão de semestre usa a série trimestral bruta — o acumulado móvel nunca é renomeado como semestre;
- estoque e IVV usam a fotografia de fechamento do 2T, não soma de snapshots;
- comparações anuais omitem o ano corrente quando ele ainda está incompleto.

## Regressões automatizadas

- rótulos completos `2T2025`, `2T2026`, `1S2025` e `1S2026`;
- soma correta de `1T + 2T` para fluxos;
- fotografia do 2T para estoque/IVV;
- período incompleto permanece `null`, sem virar zero;
- denominador zero não produz percentual;
- acumulado móvel contém `12 MESES` e nunca `SEMESTRE`;
- renderização verifica os onze slides-alvo no deck FIERGS.

## Estado do portão

A Fase 5 está **concluída tecnicamente**. A suíte completa da feature passou com `229/229` testes, o `tsconfig.app.json` e o build de produção foram aprovados; permaneceram apenas os avisos conhecidos de Recharts/JSDOM, Browserslist e tamanho de chunks. Nenhum número foi digitado manualmente e a Fase 6 de ajustes visuais gerais não foi iniciada.
