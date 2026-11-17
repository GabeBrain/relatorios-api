# Maceió trimestral — fontes pendentes do 2T2026 — 17/11/2026

## Pedido e diagnóstico recebido

Lucas pediu o mesmo tratamento do mensal para os slides com fonte pendente do trimestral e reforçou: **exceto o CAGED, cuja carga continua rodando**. JSON `maceio-trimestral-2T2026-diagnostico.json`: 87 slides, 0 disponíveis, 59 aguardando fonte (6 CAGED), 5 aguardando critério e 23 editoriais. Fontes verticais42 (30 incompletas/12 vazias completas), horizontais12 incompletas e comerciais2 incompletas. O diagnóstico é anterior aos campos categorizados de falha e não comprova status HTTP de cada consulta.

## Correções aplicáveis

As correções dos contratos públicos, paginação e histórico v2 são compartilhadas e já foram enviadas em `2cea2276`, com autorização do usuário: recurso municipal sem city/state por linha, cursor que não repete filtros e POST na rota detalhada v2, mantendo escopo/total/competências. Não duplicar essas correções em outro coletor ou criar fonte paralela. [Detalhamento do contrato](FONTES_MENSAL_2026-11-17.md).

Este lote estende o critério explícito INCC-DI aos slides monetários26–28/37–38 do trimestral, como no pedido de mesmo tratamento. Base **junho/2026** para 2T2026; cada valor mensal é corrigido até esse fechamento antes de agregar o trimestre/acumulado. Prévia, arte, metodologia e JSON identificam INCC-DI e base selecionada. Índice ou valor nominal ausente continua bloqueando o indicador. Não implica homologação de todos os dados.

Mantidos os recortes originais: seis municípios no trimestral, sem Coqueiro Seco; capital e RM separados; fluxo trimestral soma três meses; oferta usa fechamento; horizontal separado; comercial80–82 somente na capital. Não alterados importador CAGED, job GCP, ponte ou Scheduler.

## Evidência e limites

- 35 testes focados de diagnóstico, contrato e blocos finais aprovados. Novo caso percorre o diagnóstico trimestral completo, incluindo comercial e monetários, com CAGED deliberadamente indisponível e seis municípios.
- Typecheck e lint aprovados. Build final de produção aprovado (exit0).
- 6 cenários de navegador aprovados sem erros de página: desktop/mobile, claro/escuro, CAGED sucesso/vazio/erro. Demora apenas no QA, fontes públicas sem cidade/UF e histórico v2 POST, renderização do slide26 e indicação de INCC-DI verificadas; JSON realmente baixado.
- Os seis arquivos JSON foram parseados independentemente:87slides, INCC-DI/base2026-06, **nenhum slide fora9–14 com fonte/critério pendente**. Fonte completa:64disponíveis+23editoriais. CAGED ausente:58disponíveis+6fontes+23editoriais. Arte/nav preservadas. Arquivos/capturas em `.local-inputs/relatorios-lucas/maceio/diagnostic-2026-11-17/page`.

Esses ensaios usam respostas sintéticas; não houve coleta autenticada nova de junho/2026. Não há token Geobrain configurado neste ambiente e controle do Opera continua bloqueado pela ferramenta. Depois do push/publicação autorizados, gerar novamente o trimestral no ambiente do usuário e avaliar o novo JSON para verificar acesso v2, cobertura e campos reais. Não declarar que dados reais foram recuperados com base apenas no cenário headless.

**Monday:** [Panorama Maceió / SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406169) — `13149406169`. Sem escrita no Monday, push ou deploy neste lote.
