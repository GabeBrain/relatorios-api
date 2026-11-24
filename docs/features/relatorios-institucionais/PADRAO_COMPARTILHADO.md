# Contrato comum dos relatórios institucionais

Decisão de Lucas,24/11/2026. Obrigatória para SP institucional, Fortaleza, Maceió, Modelo03 e futuras inclusões, especialmente Modelos01/02. Não pedir novamente a equivalência de padrões por cidade.

## Interface da ferramenta

O conteúdo de cada relatório mantém sua referência, marca, gráficos e recorte. Os controles da ferramenta são comuns, pois todos pertencem ao mesmo sistema/menu.

- **Referência de navegação: Maceió.** Botões numéricos compactos, Anterior/Próximo, número ativo destacado, linha “Slide N · título” e botão “Ampliar slides”. Modal com mesma largura/altura, navegação e posição preservada. Tooltip mantém título completo sem colocar85títulos longos em botões diferentes. Sequência disponível é respeitada mesmo com lacunas. No Modelo03 os botões representam páginas físicas, incluindo continuações; posição original permanece no diagnóstico/detalhes.
- **Referência de carregamento: SP institucional.** Usar `shared/ReportLoading.tsx`, que compõe o BrainLoadingState existente: logo/movimento, fase, descrição e tempo real. Contenção dentro da página, sem portal sobre menu nem overlay de viewport. Conteúdo cresce conforme as etapas próprias do motor, sem cortar o logo ou cancelar. Progresso existente permanece real; sem percentual inventado. Pausa429 mantém mensagem e cancelamento. Campos/carregamento local seguem variantes Brain existentes.
- **Controles compartilhados:** `ReportSlideNavigation`, `ReportSlideHeading`, `ReportSlideDialog` de `shared/ReportSlideControls.tsx`. Não copiar implementação para o novo modelo. Exportações/editores/metodologia/insights específicos permanecem, sem alterar os cálculos para padronizar o visual.
- **Configuração Modelo03 preservada:** entidade/referência, UF/cidade, seleção RM, competência, periodicidade e ano não foram objeto desta padronização. Lucas confirmou que essa área já está correta. Novos modelos devem adaptar seus próprios filtros, sem uniformizar à força os recortes de negócio.

## Equivalência única de padrões

Fonte executável: `shared/standard-families.ts`.

| Família do relatório | Padrões da API |
|---|---|
| Compactos | Compacto |
| MCMV | Econômico |
| Médio Padrão | Standard, Médio, Médio-Alto |
| Luxo | Alto, Luxo |

Famílias já agregadas são reconhecidas pelo helper. A API bruta permanece intacta. O quadro por padrão detalhado pode continuar apresentando os sete padrões quando a referência pede isso; o de-para é aplicado quando o quadro exige quatro famílias. Não fundir tipologia (Garden/Cobertura), produto horizontal, dormitórios ou estágio com padrão. Não descartar categoria desconhecida nem convertê-la emzero. Fonte não concluída, faltas de cobertura e inconsistências continuam identificadas. Esta equivalência é convenção editorial dos relatórios, não comprovação jurídica individual de enquadramento MCMV.

SP usa o objeto compartilhado nos segmentos; Fortaleza deriva dele os sete padrões reconhecidos; Maceió e Modelo03 delegam sua função de família ao helper comum, preservando tratamento anterior de categoria desconhecida. Mudanças futuras no de-para devem ser explícitas e registradas aqui, sem duplicar listas divergentes por modelo.

## Integração e validação para próximos modelos

1. Consumir componentes/política compartilhados; manter os filtros e a referência do conteúdo.
2. Conferir primeira/última página, navegação direta/Anterior/Próximo, ampliação/fechamento e continuidade de edição/exportação.
3. Conferir carregamento lento, pausa/cancelamento, sucesso/vazio/erro em desktop/celular, claro/escuro; manter menu acessível.
4. Conferir agrupamento das sete categorias, conservação de totais e comportamento explícito para categoria desconhecida.
5. Registrar no documento vivo os componentes usados, estados verificados e limites de dados reais. Fixture visual não é homologação numérica.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`. Referência documental; nenhuma escrita autorizada nesta rodada.

## Evidência da implantação em24/11/2026

120testes em10arquivos, tipos/lint/build aprovados. `report-shell.test.tsx` cobre sequência com lacunas, extremos, modal e posição, cancelamento/tempo e equivalência única nos consumidores. Seis cenários de `scripts/diagnostics/report-shell-visual.mjs` montam os componentes reais SP/Fortaleza/Maceió em desktop claro/celular escuro, com carregamento deliberadamente lento e cancelável, navegação e ampliação. Sete cenários de `modelo03-visual.mjs` incluem três periodicidades, estados de sucesso/vazio/erro/sem token/429, modal e downloads JSON/CSV/PPTX lidos. Capturas inspecionadas. Artefatos locais em `.local-inputs/relatorios-lucas/shared-shell-2026-11-24/` e `modelo-03/visual-2026-11-24/`.

O formulário Modelo03 permaneceu byte a byte igual no trecho de configuração, SHA256 `b5729bd71401e22133daca2e8e35dbf260b8590f5d233bf7738904faa570af02`. Dados das verificações são fixtures offline/interceptadas; não houve coleta imobiliária autenticada nem observação de deploy. A entrega comprova interface/política compartilhada, não nova homologação numérica dos relatórios.
