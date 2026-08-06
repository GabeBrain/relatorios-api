# Diagnóstico do acesso à API Socio

## Objetivo

Identificar por que a API de Sociodemografia devolve `403 — Acesso negado para a camada solicitada`, sem adicionar autenticação ou alterar as chamadas existentes da API GeoBrain.

## Estado confirmado

- As operações do documento `api-socio` chegam à função `socio-proxy`.
- O proxy encaminha o mesmo Bearer token, rota, query e corpo para `sociodemografia.geobrain.com.br/public-api`.
- O método `POST` e as 11 rotas permitidas coincidem com o contrato OpenAPI.
- O proxy devolve status e corpo do serviço externo sem alteração; portanto, o `403` é uma recusa da própria API Socio, não um erro de CORS ou de rota local.

## Plano

1. Testar separadamente as 11 operações Socio com o mesmo token GeoBrain e um payload válido, registrando apenas endpoint, status e mensagem — nunca o token.
2. Classificar o resultado:
   - **todas retornam 403:** confirmar que a conta/token não está habilitada para o produto Socio ou que o serviço exige outro escopo/token;
   - **somente algumas retornam 403:** identificar as camadas sem permissão comercial;
   - **alguma retorna 422:** corrigir apenas o payload dessa operação conforme o OpenAPI;
   - **alguma retorna 200:** confirmar que proxy, CORS e autenticação técnica estão funcionando.
3. Conferir, de forma sanitizada, os metadados públicos do JWT (`iss`, `aud`, `scope`/permissões e expiração) para detectar audiência ou escopo incompatível, sem expor credenciais.
4. Se a recusa for de permissão externa, preservar o código e preparar um diagnóstico objetivo para a equipe GeoBrain contendo conta, endpoints negados, horário e mensagens retornadas.
5. Somente se os testes revelarem divergência real no aplicativo, corrigir o encaminhamento correspondente, validar novamente as 11 operações e atualizar o documento vivo do Rebrain.

## Critério de conclusão

Entregar uma tabela por camada com o resultado do teste e separar explicitamente: funcionamento do proxy, validade técnica do token e autorização comercial da API Socio.