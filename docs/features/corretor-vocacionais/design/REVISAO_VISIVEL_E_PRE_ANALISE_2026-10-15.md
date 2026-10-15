# Revisão visível e inventário de pré-análise — 15/10/2026

## Pedido e implementação
Mapa sempre visível antes da bancada, células com preenchimento integral por confiança e legenda. Mantém número e seleção por contorno; não depende somente da cor. Primeira entrada abre o primeiro slide com pendência, fixa-o na URL e mantém navegação manual. Sem acordeão para mapa ou apontamentos gerais, sem botão de esconder evidência. Evidências inclusive de itens encerrados continuam acessíveis. Catálogo de verificações fica aberto e explicita que lista de regras não comprova cobertura executada.

Quadro de prévia só existe quando há PDF/slide persistido ou recorte de evidência disponível; nenhum quadro vazio, nenhum aviso de prévia ausente, nenhuma mensagem de ausência de apontamentos. Sem imagem, apontamentos textuais continuam visíveis em coluna única. Abrir PDF é ação discreta na barra; sem prometer recuperação remota de arquivo local. Não escondemos achados verdadeiros por não terem imagem.

Cartões usam superfície/borda/raio/tipografia SE, título próprio, linha flexível de etiquetas e ações espaçadas. Textos de continuação deixam claro que análise completa está pendente. Removida frase enganosa “nada foi cobrado ainda”, pois a etapa da ata pode ter custo. Sem mudar condições de processamento, decisões, regras ou aprovação de custo.

## Banco publicado — leitura efetiva
Consulta em 2026-10-15T17:02:38.477Z, papel público, sem escrita/IA. Total52 estudos:17 V3 e35 V2. Na V3,13 têm relatório;4 não têm relatório completo. Não corresponde a “todos em pré-análise”. Nos35 V2,11 não possuem relatório, mas ausência em registro legado não prova que nunca rodaram, pois o contrato antigo é diferente.

Quatro V3 com análise incompleta:
- `e86f7d43-ad75-4bb7-a358-684f0ee631da` — Brain_Vocacional_Vertical_3S_Petit Carneiro_Curitiba_PR_v6; criado em 2026-10-15T16:39:47.789855+00:00; 144 slides; confirmação inicial não; custo histórico US$0.00567570.
- `41579c99-d57a-4dea-84e5-d8d5ec708344` — Brain_Quanti_Cavazani_Guarulhos_SP_v1_08Out; criado em 2026-10-15T14:57:57.558048+00:00; 100 slides; confirmação inicial não; custo histórico US$0.00142545.
- `553eafba-fcc3-4b23-87f0-b79daef324a9` — Brain_Vocacional_Vertical_LIV.Incorporadora_Centro_FranciscoBeltrão - PR_V6; criado em 2026-09-30T17:54:53.96116+00:00; 87 slides; confirmação inicial não; custo histórico US$0.00249030.
- `881a9629-dacb-465a-bdc9-5930306fecc4` — Brain_Vocacional Residencial_Natalia Paranhos Buzanello_Tijucas-SC_v1; criado em 2026-09-30T14:13:54.76291+00:00; 214 slides; confirmação inicial sim; custo histórico US$0.00592710.

Para cada um dos quatro, ia_passes contém somente um passe visao_ata, e findings_v3 contém apenas apontamentos DET (Guarulhos2, demais1). Nenhum ativo nas novas tabelas de materiais para esses quatro. Nenhum passe de texto/tabela nem relatório final. Ata confirmada em Tijucas mostra que a confirmação não garante conclusão. Sem log de falhas/cancelamentos disponível, não se atribui culpa/abandono nem causa específica a cada caso. Custos históricos não são despesas desta sessão.

## Por que ainda pode parar
Upload cria estudo e triagem; fase1 lê ata; confirmação abre a fase2. O portão guarda contexto em estado React, não como checkpoint completo no servidor: navegação/reload perde o contexto da confirmação. A retomada precisa recuperar o PPTX do navegador ou pedir o arquivo. Se só houver evidências parciais, elas não substituem o PPTX. Os ajustes anteriores melhoraram apresentação e proteções; não tornaram o processo persistente de ponta a ponta nem autorizaram execução paga automática. A ação agora se chama Retomar análise completa, mas persistência da execução ainda é pendência de produto. Não marcou nenhum estudo como completo artificialmente.

Próxima correção técnica: checkpoint durável de etapa/erro/cancelamento/custo aprovado associado à versão e aos materiais; retomada sem refazer etapas confirmadas, com idempotência e confirmação antes de novo gasto. Não disparar lote desses quatro sem orçamento específico. Reusar ata/cache quando compatível e vincular originais é parte do fechamento A2/A3.

## Validação e limites
Tipagem aprovada, ESLint zero erros/um aviso anterior groupOf; build27,21s. Inspeção Chromium com snapshot real Campos do Jordão e APIs externas interceptadas, larguras1440/390/320 sem overflow, mapa sempre aberto, células coloridas, seleção, quadro ausente no slide sem prévia e evidência persistida visível. Nenhuma escrita/função/IA real, hash dos achados antes/depois idêntico `08a9677e568a02b198359bee5ae163772c9115afdbe14805ca79f12328d87b55`. Não reexecutou análise paga nem repetiu os dez replays, que permanecem controles anteriores. Os quatro estudos reais continuam incompletos. Frontend ajustado localmente, publicação não comprovada.

Artefatos brutos ignorados: `.local-inputs/review-study-inventory.json`, `review-pending-evidence.json` e `.local-inputs/a1-browser-1792084003204/review-visible-result.json`/capturas. Cores correspondem à confiança já existente, não a nova gravidade ou gabarito.

## Complemento solicitado antes do push — aviso de pré-avaliação
Aviso persistente no resumo e na revisão pendente, incluindo o portão logo após a pré-análise: “Este estudo ainda não foi avaliado por completo.” Orienta confirmar cidade/UF e escolha das planilhas e clicar Rodar análise. Na reabertura sem portão, orienta retomar para confirmar. Só aparece quando analysisPending é verdadeiro e não há análise em execução; some com relatório completo. Componente PreAnalysisNotice reutilizado; sem modal dispensável ou mudança em validação/custo. Tipagem conferida; comportamento em produção não verificado.
