# Sinduscon Curitiba — separadores automáticos no PDF

26/11/2026 · Codex/Lucas · base `e186be95`.

Lucas relatou que o bloqueio por milhares com vírgula persistia mesmo após ajustar o Excel e autorizou correção automática no PDF. Esta decisão substitui a exigência de reexportar por separador descrita em `FEEDBACK_2026-11-25.md`.

## Comportamento

Antes de compilar capa, mapa e oito páginas, o motor converte agrupamentos numéricos americanos (`137,441.50` → `137.441,50`; `1,014,752` → `1.014.752`). Preserva dígitos, números brasileiros, decimais com uma/duas casas e percentuais. Um valor isolado como `1,244`, ambíguo sem contexto, segue a regra autorizada de milhar; não se infere precisão decimal de três casas.

A transformação edita strings de texto dos streams PDF, usando a codificação da fonte e o mapa ToUnicode quando presente, inclusive arrays TJ e Form XObjects. Não cria retângulo sobre o original, camada duplicada ou imagem da página. Preserva operadores de posição, ajustes de espaçamento, recursos, páginas e ordem. Não modifica XLSX nem configuração regional do Excel.

Após a conversão, permanece a validação PDF.js e a exigência de oito páginas. Fontes sem mapeamento seguro, textos não reconhecidos, números partidos em operadores independentes ou páginas que sejam imagens podem exigir reexportação; não existe promessa de corrigir qualquer PDF. O fallback explica que a correção automática foi insuficiente. A tela passa a informar a conversão automática, preservando componentes e carregamento existentes.

## Evidências

- 43 testes Curitiba aprovados inicialmente; teste adicional de Form XObject também aprovado (11 testes do normalizador, total equivalente 44).
- Lint dirigido e TypeScript aprovados; build de produção aprovado.
- Edge headless com PDF sintético de oito páginas: texto original americano, brasileiro e percentuais; normalização, validação PDF.js real e renderização antes/depois aprovadas. Inspeção visual confirma separadores corrigidos, sem alteração dos demais textos. Artefatos locais ignorados: `.local-inputs/sinduscon-number-qa-results.json` e `sinduscon-numbers-before-after.png`.
- O PDF real da analista não foi fornecido; não foi possível verificar a codificação e o conteúdo específicos daquele arquivo. A verificação automatizada usa documentos sintéticos e regressões dos modelos existentes.
- Publicação depende de autorização; nenhum deploy, escrita Monday ou consulta autenticada realizada.
