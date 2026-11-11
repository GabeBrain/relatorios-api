# SP Institucional — correções após revisão do analista

11/11/2026 · Lucas / Codex · base `608009b7` · Rebrain.

## Escopo e referências

Lucas forneceu o MD de correções e o PPTX anotado, e depois pediu explicitamente seguir nas demais correções sem bloquear tudo pelo escoamento. O indicador de escoamento **permanece em meses, sem alteração de fórmula**. Preços e cobertura histórica têm diagnóstico próprio abaixo; não receberam números fixos nem preenchimento sem fonte.

Sessão iniciou em main limpa, 49 commits atrás de origin. `git pull --ff-only` incorporou até `608009b7`, preservando as entregas SP/Fortaleza/Lovable e a integração de Edgar. Não havia upstream neste checkout. Fetch da retomada confirmou 0/0 e as três edições locais do Top 10 foram preservadas. A autorização de push anterior foi consumida pela entrega de Fortaleza; este lote novo permanece local para decisão de publicação.

| Material | Evidência |
|---|---|
| MD enviado | SHA256 `c0f7b374aff6bf151ccfcb8ac4ebf97fe28ef84ee031003eae02e47a208ca18b` |
| PPTX anotado | 85 slides, 47 observações em vermelho em 32 slides; SHA256 `6e9eaa58d7a91dfa909f3faec4a5cfb4d3dc7b114cd19cbdba18bca843403832` |
| Auditoria embutida no PPTX anotado | geração `2026-11-05T19:22:37.971Z`, `2T2026`, fechamento `2026-06`, `analystApproval=false`; não é uma nova observação da API |
| Original manual do catálogo | recuperado de `SP Institucional.rar` local; SHA256 `1350f82cb1d9386487ca1a9aee110fb19cf3d6ea7cb40d4a0205025802d9939b`, coincidente com o catálogo do handoff |

Arquivos brutos, auditoria integral e renders ficam somente em `.local-inputs/relatorios-lucas/sp/`. Originais abertos em leitura, sem salvar. Instruções do anexo foram tratadas como especificação do produto; o protocolo Git continua sendo o AGENTS do checkout.

## Correções entregues e recebidas

| Item | Estado nesta rodada |
|---|---|
| Tahoma | Complementada nos textos antes incorporados às artes de grupo, apresentação Brain, chamada GeoBrain, imprensa e contato; títulos das nove divisórias e fonte do rodapé agora são texto nativo. Logos, QR e screenshots ilustrativos permanecem como arte. Exportador conserva Tahoma. |
| Sumário | Título de 40 px no canvas, equivalente a **30 pt no PPTX**, itens em sentence case e siglas VSO/IVV preservadas. Título simplificado recebido foi mantido. |
| Trimestre no subtítulo | Incluído diretamente em séries trimestrais, 12 meses e participação anual. Consolidado não repete outra linha de período; parcial real continua identificada. |
| Notas e divisórias | Mantidas remoções recebidas de casinha, frase redundante, observação demográfica e caixas escuras. Nota de mês parcial no histórico de preços agora só aparece quando há mês parcial. |
| Gráficos e fonte INCC | Suavização, valores monetários em milhões inteiros, fonte FGV, rótulos de oferta e cards MCMV/MAP próximos às colunas foram recebidos do Lovable e conferidos localmente, sem reescrever esses cálculos. |
| Top 10 vendas por bairro | Corrigida guarda que suprimia todas as participações se qualquer bairro tivesse saldo negativo. Total municipal positivo e reconciliado permite participação líquida assinada. Negativos continuam na base; nenhum valor é zerado ou percentual limitado a 100%. Base zero/negativa permanece sem percentual. |
| Fotos | Cinco retratos da equipe extraídos dos próprios arquivos originais: 1080, 1080, 432, 432 e 258×259 pixels. Enquadramento de Fábio preserva o crop original. Consultoria usa a referência 1920×1080, em vez do slide reduzido. Exportação respeita a densidade disponível até 4×; não cria detalhe por ampliação artificial. |
| Mapas | Preservados enquadramento urbano por percentis, contagem explícita e calor com contraste por concentração relativa. Geometria/cores e rasterização local conferidas; cartografia externa não foi consultada nesta rodada. |

O caso agregado do PPTX, **9.513 / 38.658 = 24,6081%**, é coberto por regressão com distribuição restante sintética, inclusive um bairro negativo. A prévia e o PPTX mostram **24,6%**, com percentuais nas barras. Casos 2T2026/4T2025, contribuição negativa, participação acima de 100%, base não positiva e diferenças mensais que se anulam continuam cobertos. A reconciliação de total/mês não foi relaxada; classificação por padrão mantém sua ressalva independente.

## Numeração correta para retomar

| Conteúdo | Slide real no PPTX anotado | Número citado no MD |
|---|---:|---:|
| Sobre este relatório | 2 | 3 |
| Sumário | 6 | 8 |
| Perfil demográfico | 7 | 9 |
| Destaques | 9–11 | 10–13 |
| Top 10 vendas | 39 | 41 |
| Oferta/escoamento | 46 | 48 |
| Histórico geral e 1 dormitório | 53/54 | 55/56 |
| Cards por tipologia | 63/64 | 66/67 |
| Mapas amplos estoque/preço/VGV | 67/74/79 | 70/77/82 |
| Contagem geocodificada / calor central | 70/80 | 73/83 |
| Equipe / consultoria | 82/83 | 84/85 |

## Preços e histórico — diagnóstico separado

O código pondera `price_private_area` (ou `price / private_area` quando o campo está ausente) por **typology_stock positivo**, na mesma competência. A soma ponderada dos padrões do artefato gerado reproduz **R$ 12.369,940178/m²**; não é média simples dos padrões. Não trocar a fórmula para alcançar R$ 15 mil por alvo.

O original manual recuperado apresenta **R$ 15.896/m²** de média geral e **R$ 15.114/m²** para 1 dormitório no fechamento. Os R$ 15.773 do MD são outra referência de conferência, não o valor deste arquivo. Nos próprios slides 62/69 do manual, ponderar seus preços por padrão pelas unidades em estoque reproduz aproximadamente **R$ 12.710,41/m²**, não R$ 15.896. Isso mostra que a hipótese de ponderação por unidades não reproduz o geral manual com os agregados exibidos; não prova erro do analista nem autoriza escolher outro método automaticamente. Confirmar universo, fotografia e critério, incluindo a distinção entre média ponderada de razões preço/área e razão entre somas de preços e áreas.

[Evidência agregada reproduzível](CONFERENCIA_PRECOS_ARTEFATOS_2026-11-11.json), gerada por `scripts/diagnostics/sp-reference-price-audit.py`. Não contém histórico bruto, credenciais ou fórmulas impostas ao runtime.

Na auditoria enviada, 2T2023 falta fotografia do empreendimento 64094. Nos fechamentos seguintes há diferenças entre estoque detalhado e municipal: +24 em 3T2023, +20 em 4T2023, +13 em 1T2024, +9 em 2T2024, +8 em 3T2024, +5 em 4T2024 e +4 em 1T2025. Essas são causas registradas para os traços, não prova de que a API nunca teve preço nesses períodos. Restaurar exige conferir a mesma geração/universo e os dados por identidade; não interpolar, zerar ou retirar a guarda para preencher a série.

## Escoamento — adiado pelo usuário

Ambos os slides enviados dizem **meses**. Sistema: 127.840 unidades de estoque e 42 meses no Alto; manual: 118.362 e 14 meses. Para o Alto, os agregados do sistema são 2.205 unidades e 158 vendas líquidas trimestrais: `2.205 / (158 / 3) = 41,867 meses`, arredondados para 42. `2.205 / 158` corresponde a trimestres; não justifica mudar a unidade do relatório manual. Estoques/vendas/janela por padrão e fotografia precisam ser conciliados antes de alterar esse indicador. A diferença total de estoque é 9.478 unidades. Nenhum bloqueio novo foi criado para os demais slides.

## Verificação e retomada

- **308 testes / 35 arquivos SP aprovados**, incluindo as regressões 2T2026/4T2025. Execução concorrente inicial teve timeout de carga em um teste; repetição isolada e suíte com menor concorrência passaram, sem aumentar timeout. Dois testes antigos foram atualizados: 18→22 textos nativos no GeoBrain e a antiga supressão de percentuais sobre saldo líquido positivo.
- TypeScript completo, lint dirigido e build de produção aprovados. Avisos existentes de Browserslist/chunks preservados.
- **86 casos Edge**: 39 slides relevantes, incluindo todas as divisórias, em 1440/390; sumário, Top 10 e equipes também no tema escuro. Fonte Tahoma nos textos SVG, sem overflow horizontal. Rede externa integralmente bloqueada.
- **PPTX sintético de 85 slides** inspecionado por OOXML: fontes nativas Tahoma, sumário30pt, percentuais corretos, sem frase redundante/SindusconPR. PowerPoint abriu em leitura e produziu13renders; sumário, gráficos, textos e retratos conferidos visualmente. Vinte retratos nativos, equipe entre256×259 e725×730, consultoria aproximadamente220×220; sem declarar todas as fontes como retratos HD.
- Reprodução visual/exportação: `node scripts/diagnostics/sp-corrections-visual.mjs`. Extração de arte/fotos: `scripts/diagnostics/sp-editorial-assets.ps1` com o original de hash conferido. Artefatos em `.local-inputs/relatorios-lucas/sp/corrections-2026-11-11/`; não são estudo homologado.

Entrega pronta localmente para revisão/publicação autorizada. Próximo: conferir o lote publicado com o usuário; manter escoamento separado e retomar o contrato de preço/cobertura com a base da mesma geração. Nenhuma nova consulta GeoBrain/Mapbox, estudo real, envio de email, escrita Monday ou alteração de Fortaleza/Secovi/FIERGS/Quanti/Corretor nesta rodada.
