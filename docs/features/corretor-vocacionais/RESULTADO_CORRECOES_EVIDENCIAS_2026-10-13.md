# Correções sobre evidências persistidas — 13/10/2026

Estado: **validado localmente; publicação e reteste em produção pendentes**. Execução do [plano](./PLAN_CORRECOES_EVIDENCIAS_PERSISTIDAS_2026-10-13.md). Nenhuma chamada paga, escrita no banco ou alteração de Edge Function.

## Antes e depois por caso

- **Salvador — seis falsos positivos de ano:** `1.342`, `1.547`, `1.181`, `1.921`, `1.318`, `1.599` repetidos eram tratados como ano. Agora não geram esse alerta nos seis controles. Exige cabeçalho temporal explícito ou pelo menos três anos consecutivos distintos entre 1800 e 2200. Cabeçalhos são transmitidos pelas tabelas nativas e leituras de imagem; anos indevidamente pontuados continuam detectados. Limite: controles derivados dos registros humanos; print e tabela completa de Salvador não recuperados.
- **Daniele — omissão tabela × conclusão:** nova regra determinística detecta conclusão **17.566** versus total municipal **56.808**, no mesmo slide/cidade e janela terminada em 2032. Guarda contra população, outra cidade/janela, média anual, tabela sem total, leitura não confiável e totais conflitantes. Diferença de uma unidade é tolerada. Limite: teste sobre transcrição da imagem anexada pelo usuário, não extração do PPTX original. Cobertura inicial exige a formulação “Até ... são esperados novos ... domicílios em ...”, texto nativo e tabela identificável; outras redações/imagens de conclusão ainda não cobertas.
- **Palmas — bairro tratado como empreendimento:** ficha iniciada por Bairro/Região/Zona/Total/Município/Cidade é excluída da comparação de empreendimentos. Controle Plano Diretor Sul, oferta final 6 × 138, não acusa divergência de entidade. Limite: evidência textual persistida, sem print recuperado. Boulevard continua preservado pelos replays, sem comprovação adicional no estudo publicado.
- **UsHome s35 — cidade inventada:** print persistido mostra Curitiba e não São Paulo. Cache original inventou também pequenas tabelas Cidade/UF e Bairro/UF: o motor ainda gera WRONG_CONTEXT nesse cache. Transcrição verificada contendo somente a tabela efetivamente visível deixa de gerar o alerta. **Não solucionado no cache original**; requer releitura dirigida ou original para substituir a leitura com evidência. Não foi adicionada exceção ao nome do projeto.
- **UsHome s23 — soma de fatia:** print mostra soma visível 2.781 e total 13.408; cache soma 2.787 e contém erros de leitura. Replay ainda gera ABSOLUTE_SUM. **Indeterminado/não solucionado**: faltam demais fatias/escopo para confirmar total global. Soma não foi desligada para esconder o problema.
- **Curitiba s37 — controle positivo:** alerta de soma **1.197 × 1.399** preservado no replay da leitura original e conferido no PNG. Nota/escopo fora da imagem continuam sem confirmação; resultado preserva a divergência observável, não encerra adjudicação do deck.

## Evidência reproduzível

Fixture versionada: `src/features/corretor/lib/v3/__tests__/fixtures/persisted-image-cases.json`. Inclui identificação do estudo, achado anterior, leitura original, URL pública da mesma imagem, hash SHA-256 e anotação visual. Três imagens examinadas; o teste separa cache original e transcrição verificada, sem editar o cache do banco.

Comandos:

```sh
npx vitest run src/features/corretor/lib/v3/__tests__/persisted-corrections.test.ts src/features/corretor/lib/v3/__tests__/persisted-images.test.ts src/features/corretor/lib/v3/__tests__/rolandia-v067.test.ts
npm run test:corretor:materials
npm run build
```

Resultado: **28 testes focados aprovados; dez passes aprovados** (Rolândia, Toledo, Campos do Jordão, SJC VAP e SJC v2, cada um com fonte congelada e Excel bruto). Expectativas anteriores não foram regravadas; achados/IDs/resumos permaneceram iguais. Tipos e build aprovados. Lint sem erros, com aviso preexistente de dependência de hook em CorretorV3Page.

Relatório local: `.local-inputs/corretor-regression/2026-10-13T15-41-25.580Z-11644/report.md`; resultado dos três replays visuais em `.local-inputs/audit-20261013/image-retest.json`. Materiais brutos e saídas temporárias permanecem ignorados.

## Rastreabilidade e próximo passo

Novos passes textuais registram `TEXT_REVIEW_MODEL` (gpt-4o), em vez do modelo de visão. Histórico não alterado; essa correção não representa ganho de precisão.

Primeira entrega mínima do plano implementada; fila completa não encerrada. Ortografia e completude de tabelas parciais permanecem pendentes. Revisar este resultado antes do push; depois conferir bundle publicado e comportamento no ambiente real. Achados históricos persistidos não desaparecem apenas por alteração do código. Caso completo verificável e handoff semanal ainda dependem do original/gabarito e adjudicação humana. Nova leitura paga somente após lote e orçamento aprovados.
