# SP — competência dinâmica e textos institucionais editáveis

05/11/2026 · usuário / Codex · base `eb931d5`.

## Problema e correção

Os slides 5 (GeoBrain) e 7 (perfil municipal) eram imagens integrais da edição original. O slide 7 conservava JUNHO DE 2026 em qualquer trimestre, e os números de ambos não eram objetos de texto no PowerPoint.

`SpInstitutionalText` preserva as artes e substitui as regiões de texto solicitadas por rótulos SVG nativos. O exportador existente retira os rótulos da captura e escreve caixas de texto editáveis. As coordenadas usam o mesmo canvas 1280×720 do exportador, preservando o tamanho da fonte entre prévia e PPTX.

- **Slide 7:** título, competência, explicação e percentuais editáveis. Mês/ano vêm de `throughMonth` (competência efetivamente conferida), com `closingMonth` como alternativa. Uma parcial até agosto mostra AGOSTO, e não o fim teórico do trimestre. Ausência de competência não fabrica uma data.
- **Slide 5:** seis valores e suas legendas (18 rótulos) editáveis: empresas pesquisadas, empreendimentos ativos, unidades em comercialização, unidades/empreendimentos no histórico e estoque financeiro.
- Mapa, logotipos, QR, tela ilustrativa e demais artes permanecem imagens. Esta entrega não transforma todas as artes institucionais nem os gráficos em vetores editáveis.

## Origem dos números

25,6% e 39,6%, assim como os seis indicadores comerciais do GeoBrain, são **valores editoriais da referência 2T2026**, não indicadores produzidos pelas séries municipais da API. Alterar trimestre não autoriza inferir novos percentuais populacionais ou totais comerciais. O slide municipal identifica a referência dos percentuais; a interface/checklist também explicam a proveniência e a possibilidade de edição. Os dois slides continuam `reference`, sem aprovação automática ou falsa atualização de fonte.

No PPTX baixado, selecionar a caixa de texto e substituir o valor. Isso edita a cópia do PowerPoint; não altera a base nem recalcula os dados municipais do sistema. A anotação de referência também é uma caixa editável e pode ser atualizada pelo analista junto com a fonte.

## Validação

- 296 testes SP em 33 arquivos aprovados; novos casos cobrem março/junho/setembro/dezembro, virada para 2027, parcial até agosto, ausência de competência e integração real do componente com o exportador.
- Tipagem/build e lint dirigidos aprovados. Avisos anteriores de Browserslist/chunks preservados.
- Edge: dois slides em 1440/390 px e temas claro/escuro, sem erros de página. Rótulos SVG conferidos, PPTX de 85 slides baixado sem novas chamadas de negócio. Diagnóstico reproduzível: `node scripts/diagnostics/sp-institutional-editable.mjs`.
- PowerPoint desktop: cópia sintética aberta com 85 slides; data, percentual populacional e indicador comercial alterados como texto nativo, arquivo salvo e reaberto com as três edições preservadas. Capturas/PPTX de teste ficam em `.local-inputs/relatorios-lucas/sp/institutional-editable/`, ignorados pelo Git.

Sem consulta autenticada real nova, recálculo de indicadores editoriais ou alteração de fórmulas de mercado. Nova geração/exportação no site e aprovação do analista permanecem pendentes após publicação.

**Monday:** [Desafio relatórios automatizados](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`; referência, sem escrita.
