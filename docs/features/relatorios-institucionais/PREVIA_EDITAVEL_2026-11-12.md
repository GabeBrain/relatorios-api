# Prévia editável dos relatórios institucionais

## 12/11/2026 — PPTX com objetos editáveis: SP85, Fortaleza60/89

**Implementação:** `cd473deb`, local em12/11/2026. Publicação ainda não autorizada nesta entrega.


**Autor/origem:** Codex, correção solicitada por Lucas após comparar gerado/original. A exportação anterior ainda rasterizava os gráficos e desenhava células como textos sobre uma captura. O PPTX agora percorre a composição visível e cria textos, formas vetoriais, tabelas de lançamentos e imagens independentes em DrawingML. Não faz screenshot da lâmina. PDF continua sendo a saída visual. Fortaleza passa a oferecer somente PPTX editável; a opção de lâmina única em imagem foi retirada. BrainLoadingState, cancelamento, progresso real, ordem original e auditoria da mesma prévia preservados; sem nova consulta à API.

**Contrato de edição:** gráficos são conjuntos de formas vetoriais editáveis (barras, curvas, áreas, marcadores, rótulos e eixos), não objetos de gráfico com planilha Excel/“Editar Dados”. Demais tabelas SVG mantêm textos e células como objetos editáveis; listas de lançamentos3–7 são tabelas nativas reais, com linhas/colunas/células. Imagens e bases cartográficas permanecem imagens, selecionáveis e substituíveis; logotipos não são convertidos em fontes. Não confundir essa edição de apresentação com recálculo de indicadores. Ajustes manuais permanecem na auditoria.

**Visual e prévia:** corpo branco/cabeçalho azul das listas preservados explicitamente; tabela com mais registros conserva centro e densidade da referência, dentro do espaço disponível, em vez de esticar até o rodapé. Capital e RM preservam suas colunas e posições próprias do original. Seleção de células usa a caixa dos glifos e o alinhamento original, com suporte a teclado. SP2 tem cartões, rótulos e valores em texto nativo. Capas/divisórias/apresentações entram no mesmo exportador, inclusive Fortaleza trimestral.

**Equipe/consultoria:** Fortaleza59/88 deixou de ser um composto indivisível:16retratos e respectivos nomes/cargos, com editor individual na prévia (trocar foto, editar, ocultar, restaurar). Fonte mensal59 e trimestral88 têm a mesma arte por SHA256. SP82/83 mantém5/15retratos independentes e seus editores. Recortes usam a resolução original disponível, sem ampliação artificial; fotos que só existem no composto dependem de upload para resolução maior. Nenhuma face foi gerada por IA. Fonte Tahoma, títulos principais30pt; identidade e ordem preservadas.

**Validação observada:**276testes/29arquivos (274 na regressão completa e2casos novos de edição59/88, seguidos de15testes aprovados no arquivo alterado), tipos/lint e build aprovados;240casos mensais e324trimestrais no Edge. Download real e abertura no PowerPoint dos três arquivos:60/89/85slides. Listas3/5 confirmadas como objetos `HasTable`, célula alterada na prévia preservada no XML e sem texto duplicado. Fortaleza59/88 com16fotos; SP83 com15. Capas/apresentações e exemplos de gráficos renderizados pelo próprio PowerPoint, sem reparo. Os dados dos ensaios são sintéticos/fixtures, não geração autenticada nem homologação dos números. Evidências locais em `.local-inputs/relatorios-lucas/native-pptx-2026-11-12/`.

**Infra de QA:** servidor local ignora downloads em `.local-inputs` no watcher: o Windows bloqueava o arquivo durante gravação e derrubava o Vite com EBUSY. Não muda o servidor de produção. Documentos e commit locais; publicação exige autorização. Sem escrita Monday.


**Fechamento local:** implementação `a6b537af` (12/11/2026).266testes/27arquivos aprovados, tipos, lint e build aprovados; regressão final do editor/exportação5testes aprovada. Edge:240casos mensais e324trimestrais, sem erros; edição de texto existente e anotação nos dois relatórios, navegação/restauração e extração nativa conferidas. Downloads reais Fortaleza60: PPTX editável e PDF60páginas;86nomes do cadastro sintético presentes uma vez, nove retratos em objetos separados, foto extraída do PPTX inspecionada. SP: extração nativa e integração do exportador testadas; não foi feito novo download real85slides nesta sessão. Sem chamada autenticada GeoBrain ou homologação do material real. Arquivos de QA em `.local-inputs/relatorios-lucas/` (fora do Git). Sem push ou escrita Monday.

## 12/11/2026 — Edição na prévia de Fortaleza e SP

**Autor/origem:** Codex, pedido de Lucas. Editor compartilhado usa os primitives existentes (Details, Select, Input, Textarea, Checkbox e Button): seleção no slide/lista, texto, cor, tamanho em pt, posição, negrito, ocultar, adicionar e restaurar. Estado por posição original durante a sessão; troca de geração/competência restaura a composição automática. Ajustes não são persistidos no servidor e não recalculam indicadores. PDF/PPTX recebem a mesma camada visual; auditoria de exportação inclui texto original e ajuste manual. Seleção não aparece no arquivo. Dados da API preservados. Não há chamada adicional à API.

Fortaleza: textos estáticos das artes agora são SVG nativo Tahoma, extraídos no PowerPoint original aberto somente em leitura; títulos principais de pelo menos30pt. Retratos substituídos pelos arquivos embutidos de maior resolução disponível, sem ampliação artificial, e separados em imagens individuais no PPTX editável. SP mantém retratos individuais editáveis e controles de upload existentes; a camada compartilhada usa Tahoma e promove os títulos principais da prévia a30pt. O quadro institucional composto continua substituível inteiro; a qualidade máxima dos retratos que só existem nesse composto depende do original ou de upload.

**Validação:** testes de estado/isolamento/restauração, integração dos dois relatórios e Edge com edição de texto existente, navegação, restauração e extração nativa para exportação. Não equivale a homologação de cálculo ou execução autenticada GeoBrain. Testes e capturas locais usam dados sintéticos onde não há histórico individual no JSON. Publicação ainda depende de autorização.

