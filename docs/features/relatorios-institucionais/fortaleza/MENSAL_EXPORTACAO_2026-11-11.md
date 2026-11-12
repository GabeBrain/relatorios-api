# Fortaleza — revisão do mensal e exportação de conferência

11/11/2026 · Lucas / Codex · base `e23c6692`. Main/origin em dia, árvore limpa e fetch atualizado na abertura; único remoto origin. Lucas pediu revisar o mensal e seguir ao trimestral se não houvesse trabalho restante. O mensal tinha as60posições da prévia, mas **não tinha exportação**. Esta entrega fecha essa pendência técnica antes de ampliar o trimestral.

## O que foi implementado

- **PDF:**60páginas16:9 da prévia, com o diagnóstico JSON anexado.
- **PPTX fiel à prévia:**60lâminas em imagem PNG2560×1440, mantendo fontes/cortes/gráficos da composição exibida, sem depender de fontes instaladas no Office.
- **PPTX com textos editáveis:** textos e células dinâmicas nativos, medidos no navegador; gráficos, fotos, artes e rótulos inclinados permanecem em imagem. Requer Montserrat instalada para preservar métricas. Não é conversão dos gráficos em gráficos nativos do Excel nem garantia pixel a pixel após editar textos no Office.
- Modo de PowerPoint e formato de arquivo se escolhem no cartão de exportação, disponível somente após geração mensal concluída na competência atual e com acesso válido. A extração usa a mesma composição da prévia, inclusive nomes/cargos/fotos alterados antes de baixar.
- Removida sobreposição de **Residencial Vertical** em11/13/15: a legenda já pertence à arte original. O texto dinâmico a repetia por cima; números e cálculos não foram alterados.

O modelo mensal original continua com60posições, sem criar61. Trimestral permanece com10das89posições; não recebeu os gráficos mensais por equivalência silenciosa. Originais preservados: mensal SHA256 `296fe59a14cb914e84c070700a177fe999950aab54468ea261ade2167fa245a8`; fonte/catálogo em `references.json` e [revisão anterior](REVISAO_REFERENCIAS_2026-11-09.md).

## Guardas e experiência

Reutilizados Button/Select/BrainLoadingState e o padrão de exportação local do SP: progresso real por página, tempo, cancelamento, mensagem de erro e nova tentativa. Layout do slide vem de `FortalezaReportSlide`, compartilhado entre prévia/ampliação/exportação. Não existe segunda versão do gráfico só para imprimir.

Mudança de competência, fonte ou edição aborta o trabalho anterior; desmontagem também. Nenhum resultado tardio baixa arquivo. Os nós de captura são removidos ao concluir/falhar/cancelar. Imagens são conferidas, com timeout/cancelamento e erro explícito; não produzir lâmina sem arte. A exportação não consulta a GeoBrain novamente.

Excesso de lançamentos nas tabelas iniciais impede o download, preservando a guarda de continuação. As tabelas de bairros já tinham limite explícito de56linhas/4páginas. Ausência de fonte continua identificada na composição e no diagnóstico; arquivo **de conferência** não equivale a resultado homologado. Não eliminar registros para fazer caber nem copiar números históricos para preencher lacunas.

O PDF usa JPEG de alta qualidade(.97) a2560×1440 para evitar manter os canais PNG brutos de60páginas em memória. O PPTX fiel conserva PNG. Os ensaios finais geraram aproximadamente23,6MB no PDF,52,1MB no fiel e48,4MB no editável; esses tamanhos pertencem à fixture sintética, não a uma previsão de estudos reais.

## Auditoria e domínios preservados

PPTX: `customXml/fortaleza-audit.xml`, namespace `urn:brain:fortaleza-institutional:audit:v1`. PDF: anexo `fortaleza-diagnostico.json`. Ambos incluem o diagnóstico da geração capturada, referência/hash, recorte, pendências e modo de exportação. O JSON usa a whitelist existente: sem token, cabeçalhos, chave da sessão, fotos ou históricos brutos. Nomes/fotos visíveis nas próprias lâminas continuam sendo conteúdo intencional do relatório.

Extraída apenas a rotina ZIP/XML de auditoria para `shared/pptx-audit.ts`. SP conserva o adaptador, nome do arquivo, namespace e relacionamento anteriores; sete testes de auditoria/exportação SP aprovados. Nenhuma regra ou fonte de preço/escoamento SP alterada. Secovi/FIERGS, Quanti, Corretor e demais frentes preservados.

## Evidências

- 224testes Fortaleza/20arquivos passaram na suíte completa; caso adicional de geometria de célula passou depois, total225casos distintos. Sete regressões SP de auditoria/exportação passaram. Tipos/build e lint dirigido conferidos no fechamento.
- Edge com rede externa bloqueada: controles1440/390 claro/escuro; exportações reais **da fixture local** nos três modos,60páginas em cada; equipe alterada na prévia presente no PPTX editável. Fonte de dados inventada, sem autenticação real.
- Cancelamento sem download, imagem inválida sem arquivo e nova tentativa foram observados no navegador; zero erros de página. Textos que ultrapassam `foreignObject` não aparecem fora da célula no modo editável; rótulos inclinados preservados no raster.
- PowerPoint abriu os dois arquivos em leitura:60slides cada,16renders amostrais e hashes preservados. Textos/células dos slides3/57 conferidos como objetos nativos;2762caixas de texto na fixture editável. PDF aberto/renderizado com PyMuPDF:60páginas, um JSON anexado, oito renders em1280×720 e três folhas de contato cobrindo o conjunto. Inspeção visual incluiu as60páginas e os lançamentos corrigidos.
- `fortaleza-export-audit.py` confere contagem/ordem, referência, resolução, textos nativos, namespace, anexo e ausência de campos privados. Resultados e arquivos grandes ignorados em `.local-inputs/relatorios-lucas/fortaleza/export-2026-11-11/`.

Reprodução: `node scripts/diagnostics/fortaleza-export-visual.mjs`; modos `--remaining`, `--faithful-only`, `--pdf-only`, `--ui-only` permitem repetir apenas o caso alterado. Office: `fortaleza-export-office.ps1`; estrutura/auditoria: `python scripts/diagnostics/fortaleza-export-audit.py`.

## O que ainda falta e próximo bloco

O mensal possui60páginas e exportação para conferência. **Não está homologado numericamente.** Continuam pendentes amostra/empresas do2, universo/capacidade, fontes reais, classificação, preços/área de lotes, IVV, INCC/base e revisão editorial da equipe. Dependem da geração real/JSON pareado e do analista; não se resolvem inventando valores.

Próxima fatia de implementação: **trimestral11–20**, seguindo o original de junho/2T2026: empreendimentos/unidades por trimestre e padrão, tabela por padrão, VGV por trimestre/padrão/município e divisória de loteamentos. Antes, conferir a janela e as planilhas desses slides; o histórico mensal de25meses não comprova automaticamente a cobertura trimestral necessária. Mensal e trimestral conservam períodos/fontes independentes.

Sem coleta longa, geração de mercado real, publicação ou escrita no Monday nesta rodada. Nova entrega em commit local até autorização própria de push.
