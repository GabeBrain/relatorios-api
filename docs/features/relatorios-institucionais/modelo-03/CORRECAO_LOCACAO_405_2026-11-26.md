# Locação — correção do HTTP405

26/11/2026 · Codex/Lucas · base `e9018d74`, origin único atualizado0/0, main limpa na abertura.

## Diagnóstico real

O JSON fornecido `modelo-03-blumenau-quarterly-2026-3-diagnostico.json`, gerado26/11 às12:42UTC, tem80posições,54disponíveis,4pendentes e22editoriais. As únicas pendências são locação refs123–126, posições64–67. A fonte `/public-api/rent-resale-property` recebeuHTTP405 em uma requisição, sem registros.

A integração usava GET conforme o script enviado. A checagem real sem credenciais confirmou:

- GET com filtros de Blumenau:405 Method Not Allowed, cabeçalho `Allow: POST`.
- POST no mesmo endpoint/filtros:401 Unauthorized, coerente com ausência de credencial; comprova método aceito, não dados ou permissão do usuário.

Como a URL e o coletor são comuns, a falha405 pode afetar todas as cidades do Modelo03, independentemente da existência de anúncios. Não é evidência de ausência de oferta em Blumenau.

## Correção

`RENTAL_METHOD=POST` passa a reger todas as consultas de locação, preservando filtros, escopo autorizado, paginação, fila500ms, dois workers, pausa429 e cancelamento. Sem fallback silencioso para GET ou conversão de falha em zero. Mensagens de fonte falha passam a incluir o statusHTTP;405 é explicitamente identificado como método não permitido.

JSON registra `sources[].requestMethod`; os quadros de locação registram a chave necessária antes de verificar a conclusão da fonte. Assim, pendências continuam ligadas à fonte mesmo sem registros.

## Validação e limites

43 testes em três arquivos aprovados: coleta, locação e regressões de relatório/exportação. Casos Blumenau/Curitiba/Natal simulam servidor que recusa GET e aceita POST, verificam os filtros e os quatro quadros disponíveis e a rastreabilidade da fonte. Tipos/lint conferidos no fechamento.

Não houve consulta autenticada ALUGUEL ou nova geração real. O401 da prova sem token não demonstra validade do token dos analistas, disponibilidade de dados ou contrato completo de resposta. Necessário gerar novamente após publicação para confirmar o retorno autenticado; o JSON anterior não pode recuperar anúncios não recebidos. Sem alteração de layout, classificação, médias ou metodologia da amostra.
