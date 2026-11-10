# Fortaleza mensal — slides56–60 e diagnóstico JSON

10/11/2026 · usuário / Codex · base `fbe9742`. Sessão iniciou com árvore limpa na main; único origin, fetch mostrou dois commits remotos e nenhum local. Atualização por `git pull --ff-only` trouxe7039d9d/fbe9742, de Gabriel, sobre estudos somente consolidados e ressalvas Panorama. Entradas novas lidas, sem alterar essas regras. Esta entrega completa as **60 posições da prévia mensal**, não a homologação ou a exportação do relatório.

| Slide | Implementação |
|---|---|
| 56 | Divisória consultores do estudo, competência selecionada |
| 57 | Equipe técnica Brain, seis nomes/cargos/fotos editáveis |
| 58 | Equipe técnica Sinduscon-CE, três nomes/cargos/fotos editáveis |
| 59 | Quadro institucional Brain do original, com substituição da imagem completa |
| 60 | Agradecimento original e competência selecionada |

Não há slide mensal61. O trimestral possui89posições e continua com os dez primeiros slides implementados; o fechamento mensal não foi estendido automaticamente ao trimestral.

## Editorial e imagens

Mesma arte nativa/hash dos lotes anteriores, PowerPoint somente leitura, sem salvar o original.56/60preservam o fundo, logos e títulos, com mês/ano dinâmicos.57/58retiram pessoas fixas da arte e recebem cartões SVG; nove retratos extraídos dos renders1280×720. Reproduzir com `fortaleza-monthly-art.ps1 -FirstSlide 56 -LastSlide 60` e `fortaleza-monthly-people.py`. Todos os cinco originais e renders finais inspecionados. Não é equivalência pixel a pixel.

Nomes/cargos iniciais pertencem à referência de julho/2026, com aviso fora da lâmina; não são informações atuais inferidas da API. Campos limitados e com quebra de linha/fontes ajustadas ao cartão. Edição, ocultação e restauração de integrantes57/58; foto validada por tipo, tamanho até2MB, leitura e decodificação. Troca de integrante/slide ou desmontagem invalida conclusão tardia de leitura. Imagens e textos editados ficam somente na memória da prévia e são restaurados ao trocar período/iniciar nova geração/sair.59é uma imagem institucional completa no PPTX, sem nomes editáveis individualmente; pode ser substituída por uma nova imagem completa. Nenhum envio de foto à API ou armazenamento persistente foi criado.

## Diagnóstico automático após gerar

Pedido posterior do usuário: baixar JSON de conferência como no SP, para enviar ao Codex depois do slide60. Ao terminar a geração, o objeto é preparado automaticamente; aparece **Baixar diagnóstico JSON**, sem outra consulta de dados. Nome: `fortaleza-mensal-AAAA-MM-diagnostico.json`; trimestral usa a referência do trimestre.

Schema `fortaleza-diagnostic-v1`: competência, escopo e cinco cidades, referência/hash, horário de fechamento da geração, situação e valores agregados de cada slide, avisos, totais de estados, cobertura/contagem/horário/requests por fonte. Preserva valores calculados, inclusive sinais. Mensal cobre1–60; trimestral cobre1–89 e marca79posições como ainda não implementadas. Estados: disponível, fonte pendente, revisão editorial e não implementado. Conteúdo editorial não é apresentado como número homologado; amostra/empresas do2continua sem fonte própria.

Allowlist explícita: sem chave de sessão/token, headers, fotos, nomes dos integrantes editados, dados brutos de empreendimentos/tipologias ou históricos individuais. A chave de sessão também não é enviada ao worker. Contagens e números agregados são do mesmo modelo utilizado pelas lâminas; quatro tabelas por bairro compartilham o cálculo e mantêm o total integral. Não exporta uma lista truncada como universo completo.

Preparo em worker de módulo isolado, sem bloquear a interface. BrainLoadingState de campo, tempo real e cancelamento por `terminate`; nova geração, período ou desmontagem encerram o worker anterior. Conclusões e erros tardios são ignorados, erro oferece retry e cancelamento permite preparar novamente. Download Blob JSON com URL temporária revogada. Não há download forçado, custo de API novo ou confirmação manual de cada fonte.

O diagnóstico não comprova homologação. Critérios candidatos de INCC/preço/IVV/capacidade, acesso/performance/cobertura reais, divergências entre fontes e revisão editorial continuam visíveis. Não foi realizado novo ensaio GeoBrain autenticado nesta entrega.

## Verificação

- 214 testes Fortaleza/18arquivos aprovados;16casos novos cobrem ordem55–60, datas futuras, editor/ocultação/restauração, campos/fotos inválidos, JSON60/89posições, agregados, dependências de fonte, privacidade e ciclo/cancelamento/conclusão/erro tardios do worker.
- 31 regressões/contratos selecionados Panorama aprovados, incluindo2T2026/4T2025 e contrato GeoBrain após atualização do time; suíte integral Panorama não executada.
- Build/tipagem, lint dirigido e diff são conferidos no fechamento. Avisos preexistentes de Browserslist/chunks não alterados.
- Edge sintético1440/390claro/escuro: sequência11–60sem saltos, sem overflow, sem requests ao navegar; download JSON pelo navegador conferido,60slides/campos/ausência de token/imagens/históricos. Fontes externas interceptadas; sucesso/lento/vazio/incompleto/cancelado e cartão local/menu preservados. Renders/logs/JSONs sintéticos ignorados em `.local-inputs/relatorios-lucas/fortaleza/monthly-visual/`.
- Uma rodada de interface foi interrompida por navegação/recarregamento da prévia durante a iteração; o fechamento usa a rodada estável após as alterações. Teste identificou que BrainLoadingState de campo não renderiza children: botão de cancelamento passou a ser irmão do loading, sem modificar o componente compartilhado.

Sem escrita no Monday, novo exportador PPTX/PDF do relatório, deploy observado ou aceite numérico. SP/Secovi/FIERGS sem mudanças nesta fatia. Commit local isolado; push depende de autorização própria. Próximo: enviar para teste, receber o diagnóstico real e corrigir as pendências; depois, refinamentos estéticos/diagnóstico do SP Institucional pedidos pelo usuário.

Fechamento: build/tipos e lint aprovados; rodada visual estável completa nos quatro cenários,50renders11–60por cenário e quatro downloads JSON verificados. Rechecagem dirigida no Edge confirmou edição real de nome, upload/decodificação de PNG, ocultar/restaurar integrante e nenhuma chamada adicional de API. JSON sintético tem60entradas em ordem e mantém amostra pendente; não foi entregue como estudo real.

Fetch final encontrou9commits remotos novos atée7a00db(gpt-engineer-app), em mapa/segurança/auth/configuração, sem diff de Fortaleza. Não integrados com a árvore local suja; validações desta entrega referem-se à basefbe9742. Salvar fatia local e pedir autorização de integração antes de eventual publicação.
