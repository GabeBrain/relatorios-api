# Plano técnico — revisão ampliada V3 — 14/10/2026

Baseline: `6073ba3`, main/origin 0/0 após fetch. v0.69 publicada no Git, sem novo comprovante de deploy nesta sessão. Responsável: Gabriel. Execução autorizada: revisão offline, testes e correção de defeitos comprovados. Custo novo permitido nesta execução: zero. Não modificar vereditos/status remotos.

## Ordem de execução e critérios

1. **Inventário reproduzível:** percorrer PPTX acessíveis na árvore SE, registrar hashes e comparar com versões dos snapshots; buscar no texto nativo/SVG o conjunto distintivo do exemplo Daniele (Goiânia, 17.566 e 56.808). Nome semelhante não basta. Catalogar os 134 registros CJ/VAP/v2, incluindo encerrados, com estado original, evidência e limites. Critério: nenhum registro omitido; não interpretar encerramento automático como correção verificada.
2. **Gabarito textual:** revisar os 31 registros congelados contra IR completo, registrar antes/depois por ID e decisão técnica (erro, editorial não comprovado, antigo sem âncora, duplicata). Separar verdade do defeito de sua descrição. Priorizar Avalição/short, classificação de concordância e nomes próprios; não inventar nome oficial. Critério: erros reais e decisões humanas mantidos; sem PPTX não presumir revalidação.
3. **Gabarito visual ampliado:** reinspecionar renda VAP, Curitiba BASE/OTIMISTA e UsHome; congelar transcrição por coluna com hash PNG, somas/deltas e conclusão limitada ao recorte. Retestar negativos CJ45/56/VAP31 e positivos faixa/ano/Arté/renda. Critério: divergência aritmética preservada; erro do OCR distinguido de total/faixa errada; recorte parcial não adjudica estudo inteiro.
4. **Limites do agrupamento:** testar dois erros distintos com evidências contidas na mesma frase, além dos dois pares conhecidos. Se houver união indevida, restringir agrupamento pela acusação e registrar alteração de regra. Critério: dois defeitos continuam dois cartões; pares reais continuam agrupados; nada alterado na entrada nem nas decisões humanas.
5. **Regressão:** suíte Corretor, dez passes materiais, tipos e lint aplicável. Não regravar gabaritos para acomodar resultado. Critério: identidade/conteúdo/cobertura preservados, novos testes positivos/negativos aprovados; logs em `.local-inputs/`.
6. **Fechamento:** relatório por caso e fila priorizada com dependência real. Atualizar LIVE/etapas, plano semanal e diário SE; commit somente destes arquivos, preservando FIERGS. Apresentar resultado antes de qualquer novo push.

## Resultado da execução

Itens 1–6 executados offline: inventário de 47 PPTX/134 registros; reteste dos 31 textos/sete caches; três transcrições e três erros de unidade; três testes comprovaram agrupamento indevido e a proteção v0.69.1 foi implementada; 258 testes e dez passes aprovados, tipos/lint/build locais. [Relatório final](./RELATORIO_REVISAO_AMPLIADA_2026-10-14.md) diferencia adjudicação, contraexemplos e pendências. Publicação/reteste remoto e novos insumos continuam dependências posteriores, não etapas locais presumidas concluídas.

## Oportunidades e dependências posteriores

- **P0:** comprovar frontend v0.69 no site e retestar cancelamento/custo, duplicatas, evidência antiga e controles verdadeiros. Git não prova deploy; execução local não substitui produção.
- **P1:** descrição que cita a forma correta como erro; concordância mal classificada; renda com magnitude OCR errada; origem/identidade de cidade no UsHome. Retificar apenas com âncora, nunca pelo nome do estudo.
- **P1:** revisar os encerramentos automáticos e tabelas inseguras restantes. Cada caso requer PPTX pareado ou imagem suficiente e transcrição por coluna. Inventário não é adjudicação integral.
- **P1:** Daniele original; se não encontrado por hash/conteúdo, registrar busca e pedir somente esse insumo. O teste transcrito existente continua válido como exemplo.
- **P2:** Goiânia regional: mapear planilha por abas/células para contrato de fonte antes de novos testes numéricos; não aplicar checklist vocacional a panorama como gabarito.
- **P2:** outros estudos persistidos e materiais de referência Marka/Parâmetros: separar insumo de calibração de casos pareados atuais. Aproveitar cache antes de IA.
- Qualquer lote pago futuro exige quantidade, finalidade, estimativa e autorização específica; orçamento antigo de US$ 2 não se renova automaticamente. Aceite humano integral segue separado.

Monday: [Corretor V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102). Sem escrita no Monday.
