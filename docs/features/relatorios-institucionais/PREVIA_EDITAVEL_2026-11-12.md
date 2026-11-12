# Prévia editável dos relatórios institucionais


**Fechamento local:** implementação `a6b537af` (12/11/2026).266testes/27arquivos aprovados, tipos, lint e build aprovados; regressão final do editor/exportação5testes aprovada. Edge:240casos mensais e324trimestrais, sem erros; edição de texto existente e anotação nos dois relatórios, navegação/restauração e extração nativa conferidas. Downloads reais Fortaleza60: PPTX editável e PDF60páginas;86nomes do cadastro sintético presentes uma vez, nove retratos em objetos separados, foto extraída do PPTX inspecionada. SP: extração nativa e integração do exportador testadas; não foi feito novo download real85slides nesta sessão. Sem chamada autenticada GeoBrain ou homologação do material real. Arquivos de QA em `.local-inputs/relatorios-lucas/` (fora do Git). Sem push ou escrita Monday.

## 12/11/2026 — Edição na prévia de Fortaleza e SP

**Autor/origem:** Codex, pedido de Lucas. Editor compartilhado usa os primitives existentes (Details, Select, Input, Textarea, Checkbox e Button): seleção no slide/lista, texto, cor, tamanho em pt, posição, negrito, ocultar, adicionar e restaurar. Estado por posição original durante a sessão; troca de geração/competência restaura a composição automática. Ajustes não são persistidos no servidor e não recalculam indicadores. PDF/PPTX recebem a mesma camada visual; auditoria de exportação inclui texto original e ajuste manual. Seleção não aparece no arquivo. Dados da API preservados. Não há chamada adicional à API.

Fortaleza: textos estáticos das artes agora são SVG nativo Tahoma, extraídos no PowerPoint original aberto somente em leitura; títulos principais de pelo menos30pt. Retratos substituídos pelos arquivos embutidos de maior resolução disponível, sem ampliação artificial, e separados em imagens individuais no PPTX editável. SP mantém retratos individuais editáveis e controles de upload existentes; a camada compartilhada usa Tahoma e promove os títulos principais da prévia a30pt. O quadro institucional composto continua substituível inteiro; a qualidade máxima dos retratos que só existem nesse composto depende do original ou de upload.

**Validação:** testes de estado/isolamento/restauração, integração dos dois relatórios e Edge com edição de texto existente, navegação, restauração e extração nativa para exportação. Não equivale a homologação de cálculo ou execução autenticada GeoBrain. Testes e capturas locais usam dados sintéticos onde não há histórico individual no JSON. Publicação ainda depende de autorização.

