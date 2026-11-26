# Sinduscon Curitiba — separadores automáticos no PDF

## Reteste real — fonte parcial sem ponto

Após publicar `64ba470a`, Lucas forneceu `Feedback Liberado SETEMBRO 2026.pdf` (603.236 bytes, oito páginas) e o XLSX correspondente. O erro específico veio de fontes Arial/Arial Bold Type0 com ToUnicode parcial, sem o ponto necessário para substituir a vírgula de milhar. A primeira entrega não cobria esse caso.

Agora o motor usa Helvetica/Helvetica Bold auxiliar **somente para o sinal ausente**, restaura a fonte original imediatamente e compensa o avanço pelo `/W` e `/DW` da fonte CID original. Arrays TJ preservam seus ajustes. Não substitui dígitos, nomes, estilos do restante do texto ou páginas por imagem. Fontes com pontuação disponível continuam no caminho original. Encodings sem métricas seguras ainda não são presumidos.

Verificação do arquivo real no Edge headless: normalização e validação PDF.js das oito páginas aprovadas. Comparação independente PyMuPDF dos **18.685 caracteres**: apenas **753 separadores** alterados; contagem de caracteres e dimensões preservadas; deslocamento máximo de origem dos dígitos = **0 ponto** nas oito páginas. Páginas1/7/8 renderizadas; tabelas e gráfico das páginas7/8 inspecionados visualmente. Artefatos ignorados `.local-inputs/curitiba-real-{normalized,final}.pdf`, `curitiba-real-number-verification.json` e capturas `curitiba-real-page-*-after.png`.

47 testes Curitiba aprovados, incluindo fontes parciais, Tj/TJ, negrito, compensação de largura e idempotência. Lint, tipos e build de produção aprovados. Fluxo completo `createSindusconFinalPdf` no Edge compilou o PDF real com capa/mapa: dez páginas finais. O XLSX fornecido não foi alterado. Sem push autorizado para esta segunda correção e sem deploy observado.

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
