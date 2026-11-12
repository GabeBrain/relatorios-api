# Plano de ação — homologação final editorial e metodologia FIERGS

**Data:** 02/10/2026
**Entrada:** `assets/panorama-fiergs-rs-2T2026 (5).pdf` (74 páginas), retorno de ajustes finos da Juliana e revisão visual de 02/10/2026.
**Objetivo:** entregar um estudo sem repetição ou espaços sem dados, com as regras consultáveis no app e com avisos dinâmicos de cobertura no momento da geração. Preservar a reconciliação numérica já aprovada; não tratar a arte institucional antiga como homologada.
**Regressões obrigatórias:** FIERGS 2T2026 e 4T2025; verificar Secovi-SP sempre que um componente ou contrato compartilhado mudar.

## Contrato desta rodada

- O PDF e o PPT espelho devem trazer títulos, rótulos, unidades, período e créditos necessários para leitura correta, mas **não** parágrafos de explicação metodológica, notas de cobertura ou avisos de omissão. As ressalvas para a Juliana ficam no e-mail; no app, ficam no painel de avisos da geração e na área Metodologia.
- Um valor observado igual a **zero** e uma venda líquida **negativa** continuam sendo dados, não ausência. Nunca convertê-los em branco, traço ou zero positivo para melhorar a aparência.
- Dado nulo, não observável ou dimensão incompleta não vira zero. Omitir linha, coluna, gráfico ou página apenas quando a remoção não distorcer subtotal, comparação ou narrativa; registrar motivo e alcance em aviso dinâmico e na auditoria. Divergência numérica crítica bloqueia exportação.
- As regras, o glossário e as fórmulas são conteúdo estável, distinto para FIERGS e Secovi quando necessário. **Somente o painel de avisos/cobertura e o cabeçalho do recorte gerado dependem do resultado atual.** Não inserir números fixos de 2T2026 ou 4T2025 no runtime.
- Preservar arquivos locais não relacionados. Não alterar `src/features/corretor` nem `src/features/corretor/referencia_ajustes/`.

## Evidências de partida e decisões ainda abertas

| Achado no PDF novo | Evidência | Decisão exigida antes de editar |
|---|---|---|
| Páginas físicas **13/18**, **25/30**, **36/55** e **37/54** são pares de imagens idênticas | Comparação dos pixels das 74 páginas; `ReportPaginator.tsx` roteia os IDs oficiais 13/18 e 25/30 para o mesmo componente | Conferir manifesto, sumário e função editorial de cada posição. Manter uma instância ou dar à segunda um indicador realmente distinto e reconciliado. Não preencher posição só para manter a contagem de 74 páginas. |
| Página 29 mostra **−1** venda líquida em 4+ dormitórios, que participa do total **1.091** | A série de tipologia preserva sinal da fonte e fecha aritmeticamente | Confirmar fonte granular e sinal na auditoria. Manter o valor se confirmado e levar a explicação ao painel de avisos/e-mail, sem nota no PDF. |
| Páginas 54–55 mostram **16.110** lançamentos da janela e **5.414** finais, com disponibilidade total omitida | O denominador válido por linha é lançamento **histórico** da mesma dimensão; há resíduo de 63 unidades históricas sem estoque atribuível | Conservar universos e guardas. Se uma coluna inteira ou página não tiver valores publicáveis em outro período, omitir a estrutura e emitir aviso específico. |
| Páginas 58–60 trazem maturidade e VGV; p. 60 informa cobertura parcial | A fonte só sustenta faixas de maturidade, não média contínua em meses; VGV sem base não é imputado | Conservar rótulo “maturidade”; transferir explicações de cobertura para os avisos. Manter subtotal apenas sobre valores observados e não sugerir cobertura completa. |
| Página 4 ainda informa **22 anos** | A apresentação acessível na pasta de marketing também contém 22 anos | A substituição depende do arquivo atualizado do Diego/marketing. Não corrigir idade ou arte por estimativa. |

## Portões de execução

### G0 — Baseline, inventário e matriz de omissões

1. Conferir remotos, divergência, árvore e commits; preservar os arquivos não relacionados. Capturar o PDF de entrada e o último PDF de regressão, com data, contagem, dimensões, pares idênticos e lista de páginas com notas, traços, colunas vazias ou mensagens de indisponibilidade. Mapear número **físico** no PDF para ID **oficial** do manifesto.
2. Para 2T2026 e 4T2025, registrar por página/indicador a fonte, a janela ou fotografia histórica, denominador, cobertura, zero observado, valor negativo, ausência e eventual impacto no total. Partir da auditoria CSV e do modelo; não inferir causa transacional de venda negativa.
3. Definir uma matriz de decisão por estado: `observado`, `zero observado`, `líquido negativo`, `parcial publicável`, `não publicável`, `não aplicável` e `crítico`. Para cada estado, decidir visibilidade no PDF, aviso no app e condição de bloqueio. Separar a omissão de uma coluna decorativa da supressão de um indicador essencial.

**Portão:** matriz e mapa de páginas registrados em evidência Markdown. Nenhuma remoção visual antes de provar que totais, comparações e fontes permanecem íntegros.

### G1 — Sequência editorial sem repetição

1. Rever os quatro pares 13/18, 25/30, 36/55 e 37/54 contra o estudo de referência, o pedido da Juliana e o manifesto FIERGS. Decidir par a par se a segunda posição deve sair ou representar outra análise já sustentada pelo modelo. Não inventar métrica para ocupar espaço.
2. Centralizar a decisão no manifesto/roteamento (`report/fiergs-manifest.ts`, `report/manifest.ts`, `components/ReportPaginator.tsx`). Recalcular sumário, seções, contagem exibida, navegação, PDF e PPT espelho a partir da mesma lista ativa. Verificar divisores e páginas vizinhas para não criar abertura órfã.
3. Fazer uma varredura automática de páginas exatamente iguais e uma revisão visual de repetições semânticas. Repetir um indicador em contexto diferente somente com justificativa editorial explícita na evidência; não deixar cópia indistinguível.

**Portão:** nenhum par idêntico injustificado; análises pedidas pela Juliana continuam presentes uma vez cada; números e séries dos indicadores sobreviventes inalterados salvo mudança comprovada da fonte.

### G2 — Política de conteúdo publicável e avisos dinâmicos

1. Criar um registro único de avisos derivado do **modelo gerado**, com `indicador`, `entidade`, `período`, `página/coluna afetada`, `motivo`, `fonte/cobertura`, `decisão de exibição` e `gravidade`. Evitar textos genéricos que não expliquem o que foi ocultado. Reaproveitar proveniência, guardas dimensionais e auditoria existentes; não reconstruir diagnóstico a partir do DOM.
2. Antes dos botões de exportação, mostrar no app um resumo “Avisos deste relatório” com contagem, detalhes expansíveis e ligação para Metodologia. Exibir avisos também quando a geração terminar; atualizar ao trocar recorte. Erros críticos continuam bloqueando exportação, como hoje; avisos não críticos permitem baixar com conhecimento do alcance.
3. Nas tabelas/gráficos (`MarketSlides.tsx` e renderizadores específicos), remover colunas inteiramente sem resultado e linhas sem nenhum valor observável, recalculando `colSpan`, cabeçalhos, largura e totais. Se o indicador essencial da página não for publicável, retirar a página pelo manifesto e avisar; não exportar uma lâmina vazia ou `CoveragePage`. Onde houver lacuna parcial, manter somente partes comparáveis e rotular o indicador de modo que um subtotal parcial não pareça total do universo.
4. Preservar zeros reais e sinais negativos. Para o **−1** da p. 29, confirmar no cubo e emitir aviso contextual somente se o sinal persistir no recorte; nunca fixar o caso no código. Para as **63 unidades** e o VGV parcial, aviso dinâmico deve explicar exatamente quais totais/percentuais foram omitidos, sem números fixos.
5. Manter a auditoria CSV como trilha detalhada. O mesmo código de motivo deve aparecer no painel, nos testes e no CSV, para evitar explicações conflitantes.

**Portão:** cada estrutura omitida é rastreável no app e no CSV; nenhuma página/coluna vazia no PDF/PPT; nenhuma diferença crítica encoberta por supressão visual.

### G3 — Metodologia, Glossário e Fórmulas no app

1. Renomear **“Relatório V4”** para **“Relatório”**. Criar abas vizinhas **Metodologia**, **Glossário** e **Fórmulas**, reutilizando `Tabs`, cards e tokens do Design System. Layout legível em desktop/mobile e em tema claro/escuro; navegação por teclado.
2. Metodologia: regras estáveis de território (FIERGS: 10 municípios do entorno, Porto Alegre excluída), período, vertical/horizontal, elegibilidade, deduplicação, fotografia versus fluxo, fontes GeoBrain, coortes anteriores, completude dimensional, geocodificação e arredondamento. Separar regras FIERGS das Secovi; não apresentar uma política como universal.
3. Glossário: definições curtas e consistentes de empreendimento, lançamento, oferta lançada da janela/histórica, oferta final, venda líquida, disponibilidade, IVV, VGV, ticket, R$/m², tipologia, padrão e maturidade. Distinguir “maturidade por faixa” de “tempo médio em meses”.
4. Fórmulas: por indicador, mostrar **entrada, operação, denominador, universo temporal, unidade, fonte, condição de omissão e onde aparece**. Incluir disponibilidade por linha, IVV por dimensão (somente a fórmula efetivamente usada), VGV vendido quando calculado no mesmo cubo, médias ponderadas e média de unidades por empreendimento. Auditar cada texto contra funções e testes de `report/model.ts`, `domain/cube.ts` e componentes; não escrever uma fórmula única onde o contrato muda por entidade/dimensão.
5. Dentro de Metodologia, acrescentar somente o bloco **dinâmico** “Avisos deste relatório”, abastecido pelo registro de G2. As demais explicações permanecem estáveis; o recorte atual pode aparecer no cabeçalho, sem números hardcoded nas regras.

**Portão:** um leitor consegue distinguir os universos da p. 55 e a cobertura do VGV sem precisar do e-mail; termos e fórmulas correspondem ao código; nenhum aviso do recorte anterior persiste após nova geração.

### G4 — PDF/PPT limpos, sem perda de interpretação

1. Retirar dos slides as notas explicativas de metodologia/cobertura atualmente espalhadas em rodapés e `CoveragePage`; preservar título, unidade, eixo, período, rótulo de denominador (por exemplo, “s/ O.L. histórica”), fonte/crédito obrigatório e indicadores observados. Transferir ressalvas aplicáveis ao painel dinâmico e ao rascunho de e-mail.
2. Inspecionar tabelas responsivas, gráficos de venda negativa, disponibilidade com zero lançado na janela e estoque de coorte antiga, maturidade, VGV parcial e mapas. Não deixar “—”, coluna morta ou grande espaço vazio que pareça falha de exportação; também não apagar dado real ou valor negativo para esconder a limitação.
3. Comparar preview, PDF e PPT espelho página a página. Verificar que um PDF compartilhado isoladamente ainda se identifica por recorte, período, unidade e rótulos metodológicos essenciais, mesmo sem notas longas.

**Portão:** estudo visualmente limpo, autoconsistente nos rótulos e sem conteúdo vazio; todos os avisos removidos do material aparecem no app/auditoria e podem ser resumidos no e-mail.

### G5 — Arte institucional (dependência Diego/marketing)

1. Receber o slide/arquivo aprovado do Diego/marketing, confirmar versão, titularidade e quais posições institucionais substitui. A pasta [Materiais institucionais da Brain](https://drive.google.com/drive/folders/1kafbNcY8xd1qelQG0I9bMWjkFMCECMjL?usp=sharing) foi consultada, mas a apresentação encontrada ainda diz “22 anos”.
2. Substituir a arte em preview, PDF e PPT sem reproduzir dados institucionais por conta própria; validar proporção, legibilidade e links. Se o arquivo não chegar até a validação analítica, registrar **arte institucional pendente** e não chamar o documento completo de homologado.

**Portão institucional:** somente material aprovado pelo marketing; sem “22 anos” na versão declarada final.

### G6 — Regressão, evidência e envio para Juliana

1. Rodar testes proporcionais: regras puras de omissão/avisos, manifesto e pares duplicados, acesso às abas, TypeScript, Vitest FIERGS e `npm run build`. Testar explicitamente zero versus nulo, venda negativa, subtotal parcial, cidade sem fonte, tipologia residual, falta de VGV, recorte sem gráfico publicável e mudança de recorte. Validar Secovi-SP onde houver código compartilhado.
2. Gerar PDF, PPT espelho e auditoria dos dois períodos FIERGS (2T2026 e 4T2025) a partir do app atualizado. Conferir invariantes críticas, séries, somas, página inicial/final, sumário, pares duplicados, omissões e avisos mostrados no app. Registrar data/hora do snapshot GeoBrain e explicar qualquer delta de fonte, sem ajustar números manualmente.
3. Escrever evidência Markdown com matriz antes/depois por página e por indicador, avisos emitidos, arquivos e decisões metodológicas afetados. Atualizar o resumo de homologação e `docs/projetos/LIVE_rebrain.md`. Fazer commits locais isolados com `git add` explícito, preservando arquivos alheios. Conferir remotos e divergência antes de qualquer push; solicitar autorização específica para publicação.
4. Preparar e-mail curto para Juliana: pedir validação dos ajustes editoriais e das fórmulas, mencionar o sinal líquido negativo e quaisquer omissões ainda relevantes em linguagem simples. A situação do slide institucional deve refletir o estado real de G5. Não dizer “homologado” antes da resposta dela.

**Aceite para envio de homologação final:** G0–G4 e G6 aprovados, sem divergência numérica crítica, sem duplicatas injustificadas, avisos íntegros e PDF/PPT limpos. G5 também precisa estar aprovado para chamar **todo o estudo** de versão institucional final; enquanto pendente, só é possível pedir validação analítica/editorial com essa ressalva explícita.
