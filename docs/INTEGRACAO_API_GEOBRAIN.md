# Integração com a API GeoBrain

Este guia é a referência de implementação para novos sistemas que consultem a API GeoBrain. Ele foi consolidado a partir da especificação OpenAPI versionada no projeto (`src/assets/openapi/api-geobrain.json`) e das integrações já usadas pela aplicação.

## Escopo e fontes de verdade

- **Contrato oficial documentado:** API pública v1 em `https://geobrain.com.br/public-api`.
- **Autenticação:** Bearer JWT, obtido por `/auth/login`, com validade declarada de **180 minutos**.
- **Contrato v2 existente no projeto:** há consumidores de `https://api.geobrain.com.br/public-api/v2` e `https://app.geobrain.com.br/public-api/v2`, inclusive de `building-with-history-internal`. Eles não constam na especificação OpenAPI local. Portanto, não devem ser adotados em um novo produto sem validação prévia com a GeoBrain e um contrato atualizado.

Use a v1 como padrão para integrações novas. Quando um requisito só estiver disponível em v2, registre a versão, host, método, parâmetros e uma amostra sanitizada da resposta antes de acoplá-lo ao produto.

## Regras obrigatórias de segurança

1. Nunca incluir e-mail, senha ou Bearer token no código, em commits, logs, capturas de tela ou mensagens de erro.
2. Preferir a autenticação e as chamadas GeoBrain em backend/BFF ou Edge Function. Isso evita expor a credencial e permite aplicar limite de chamadas, cache e auditoria.
3. Guardar as credenciais em secret manager/variáveis de ambiente do ambiente de execução. No frontend, se o fluxo exigir login do usuário, manter o token somente enquanto necessário e expirá-lo após 180 minutos.
4. Enviar `Authorization: Bearer <token>` em todo endpoint protegido; não enviar esse header em `/auth/login`.
5. Em `401` ou `403`, encerrar a consulta, remover o token inválido e solicitar novo login. Não tentar contornar a permissão com outra lista de cidades ou com dados locais.
6. Sanitizar logs: registrar URL, status, duração e correlação da requisição, mas mascarar `Authorization` como `Bearer ***` e nunca registrar o corpo do login.

Exemplo de configuração de ambiente:

```dotenv
GEOBRAIN_BASE_URL=https://geobrain.com.br/public-api
GEOBRAIN_EMAIL=conta-de-servico@empresa.com.br
GEOBRAIN_PASSWORD=segredo-gerenciado
```

## Fluxo recomendado

```text
1. Autenticar em POST /auth/login
2. Guardar token e horário de expiração (agora + 180 min)
3. Consultar GET /monitored-cities, seguindo todas as páginas
4. Permitir que o usuário escolha somente UF/cidade retornadas para aquele token
5. Executar a consulta de empreendimentos ou séries temporais com esse recorte
6. Seguir paginação, validar resposta e apresentar erro explícito quando necessário
7. Ao expirar ou receber 401/403, limpar a sessão e autenticar novamente
```

## 1. Autenticação

### `POST /auth/login`

**URL:** `https://geobrain.com.br/public-api/auth/login`

```http
POST /public-api/auth/login HTTP/1.1
Host: geobrain.com.br
Accept: application/json
Content-Type: application/json

{
  "email": "usuario@empresa.com.br",
  "password": "senha"
}
```

Resposta de sucesso (`200`):

```json
{ "token": "jwt-ou-token-de-acesso" }
```

Erros documentados: `401` para credenciais inválidas e `422` para payload inválido. O token expira em 180 minutos; a API não documenta refresh token, portanto faça novo login quando necessário.

## 2. Descoberta do escopo autorizado

### `GET /monitored-cities`

Esse é o primeiro endpoint protegido a ser chamado em qualquer tela com filtro geográfico. Ele retorna as cidades a que o token tem acesso, com os campos `id`, `city`, `state`, `region` e `last_period`.

```bash
curl --request GET \
  --url 'https://geobrain.com.br/public-api/monitored-cities' \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <TOKEN>'
```

A resposta é paginada:

```json
{
  "data": [{ "id": "123", "city": "Curitiba", "state": "PR", "region": "Sul", "last_period": "2026-06-01" }],
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." },
  "meta": { "current_page": 1, "last_page": 3, "per_page": 30, "total": 61 }
}
```

### Política de filtros geográficos

- Carregue **todas** as páginas usando `links.next` (não presuma uma página única).
- Liste UF e município exclusivamente a partir dessa resposta, agrupando por `state`.
- Exija uma UF antes de habilitar município; ao trocar UF, limpe o município selecionado.
- Não use `municipios-br.json`, IBGE ou uma lista fixa como fallback silencioso. Se `/monitored-cities` falhar, informe o erro e bloqueie consultas dependentes do recorte.
- Não inicie consultas caras enquanto UF/cidade ainda não forem válidos para o token.

## 3. Consulta de empreendimentos

Todos os endpoints abaixo são protegidos e aceitam `Authorization: Bearer <TOKEN>`.

| Endpoint | Uso | Parâmetros principais |
| --- | --- | --- |
| `GET /building` | Empreendimentos ativos e dados correntes. | `type` obrigatório; `city`, `uf`, `page`, `per_page`, `last_update_gt`, `last_update_lt`. |
| `GET /building/{id}` | Um empreendimento sem histórico. | `id` no path. |
| `GET /building-with-history` | Empreendimentos com histórico de tipologias e áreas. | `type` obrigatório; `city`, `uf`, `status`, `page`, `per_page`, `last_update_gt`, `last_update_lt`. |
| `GET /building-with-history/{id}` | Um empreendimento com histórico e áreas. | `id` no path. |

Valores permitidos para `type`: `Vertical`, `Horizontal`, `Comercial` e `Hotel`.

Exemplo:

```bash
curl --get 'https://geobrain.com.br/public-api/building-with-history' \
  --data-urlencode 'uf=PR' \
  --data-urlencode 'city=Curitiba' \
  --data-urlencode 'type=Vertical' \
  --data-urlencode 'status=Ativo' \
  --data-urlencode 'per_page=100' \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <TOKEN>'
```

`/building` retorna campos como identificação, localização, status, estoque, unidades, padrão, incorporadoras e tipologias atuais. `/building-with-history` inclui adicionalmente `delivery_date`, informações comerciais/financeiras, `areas` e `typologies_history`.

Em `typologies_history`, os campos mais usados são `typology_id`, `period`, `building_status`, `type_of_typology`, `number_bedroom`, `garage`, `qty`, `private_area`, `price`, `price_private_area`, `release_price`, `typology_stock`, `sold`, `sold_in_period`, `vgv_total` e `vgv_stock`. Muitos campos numéricos do contrato vêm como string: faça conversão explícita e preserve `null` quando o dado não existir.

O filtro `status` de `/building-with-history` aceita `Ativo` ou `Esgotado`. Não deduplique registros sem uma regra de domínio: se for necessário, use `building_id` como chave e documente se resultados de tipos/status distintos devem ser combinados.

## 4. Séries temporais por cidade

Todos os endpoints usam o prefixo `/temporal-analysis-city`:

| Endpoint | Métrica devolvida |
| --- | --- |
| `/releases` | `releases_in_period` — unidades lançadas no período. |
| `/stock` | `stock` e `vgv_stock`. |
| `/sales` | `liquid_sales` e `vgv_liquid_sales` — vendas líquidas. |
| `/medium-prices` | `average_price`. |
| `/medium-prices-meter` | `average_price_per_meter`. |
| `/ivv` | `ivv` — índice de velocidade de vendas. |

Parâmetros obrigatórios em todos: `start_period`, `end_period`, `city` e `uf`. Parâmetros opcionais: `type[]`, `group_by`, `page` e `per_page`.

- `type[]` aceita um ou mais tipos de empreendimento. Envie o parâmetro repetido (`type[]=Vertical&type[]=Horizontal`).
- `group_by` aceita `Padrão` ou `Tipologia`.
- Ao usar `group_by=Tipologia`, a própria especificação informa que somente dados de empreendimentos `Vertical` são retornados.

Exemplo de vendas líquidas por padrão:

```bash
curl --get 'https://geobrain.com.br/public-api/temporal-analysis-city/sales' \
  --data-urlencode 'uf=PR' \
  --data-urlencode 'city=Curitiba' \
  --data-urlencode 'start_period=2025-01-01' \
  --data-urlencode 'end_period=2025-12-31' \
  --data-urlencode 'type[]=Vertical' \
  --data-urlencode 'type[]=Horizontal' \
  --data-urlencode 'group_by=Padrão' \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <TOKEN>'
```

Cada item retornado tem `period`, `group` e `building_type`, além da métrica da tabela. Os endpoints também são paginados.

## 5. Paginação, timeout e resiliência

As listas retornam o formato `data`, `links` e `meta`. O único mecanismo confiável para avançar é `links.next`, que pode ser `null` no fim. `meta.last_page` pode servir para exibir progresso, mas não substitui a navegação por `links.next`.

```ts
type Page<T> = {
  data: T[];
  links?: { next?: string | null };
  meta?: { current_page?: number; last_page?: number; total?: number };
};

async function fetchAllPages<T>(initialUrl: string, token: string, signal?: AbortSignal): Promise<T[]> {
  const result: T[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal,
    });
    if (response.status === 401 || response.status === 403) throw new Error('GEOBRAIN_UNAUTHORIZED');
    if (!response.ok) throw new Error(`GEOBRAIN_HTTP_${response.status}`);

    const page = (await response.json()) as Page<T>;
    result.push(...(page.data ?? []));
    url = page.links?.next ?? null;
  }
  return result;
}
```

Defina timeout por requisição (30–60 segundos), suporte cancelamento com `AbortSignal` e evite rajadas excessivas. Para `408`, `429` e `5xx`, realize poucas tentativas com backoff exponencial e jitter; não repita automaticamente `401`, `403` ou `422`.

Se uma série temporal ou uma página necessária falhar, não substitua o valor por zero. Propague o erro para que a interface deixe explícito que a métrica não foi obtida.

## 6. Cliente TypeScript de referência

O exemplo abaixo é adequado para backend/BFF. Em um frontend, injete o token de uma sessão autenticada em vez de usar credenciais de serviço.

```ts
const BASE_URL = process.env.GEOBRAIN_BASE_URL ?? 'https://geobrain.com.br/public-api';

export async function loginGeoBrain(email: string, password: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Falha no login GeoBrain: HTTP ${response.status}`);

  const payload = (await response.json()) as { token?: string };
  if (!payload.token) throw new Error('Resposta de login GeoBrain sem token');
  return payload.token;
}

export async function geoBrainGet<T>(path: string, token: string, query: Record<string, string | number | string[] | undefined> = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else params.set(key, String(value));
  }

  const url = `${BASE_URL}${path}${params.size ? `?${params}` : ''}`;
  const response = await fetch(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`GeoBrain ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

// Exemplo: os colchetes fazem parte do nome do parâmetro exigido pelo contrato.
const sales = await geoBrainGet('/temporal-analysis-city/sales', token, {
  uf: 'PR', city: 'Curitiba', start_period: '2025-01-01', end_period: '2025-12-31',
  'type[]': ['Vertical', 'Horizontal'], group_by: 'Padrão', per_page: 100,
});
```

## 7. Tratamento esperado de erros

| Situação | Comportamento do sistema |
| --- | --- |
| Sem token | Não chamar endpoint protegido; pedir autenticação. |
| `401`/`403` | Limpar sessão, informar expiração/falta de permissão e pedir novo login. |
| `422` | Exibir erro de parâmetros; revisar datas, tipo, UF e cidade. Não repetir automaticamente. |
| `408`, `429`, `5xx` ou falha de rede | Informar indisponibilidade temporária e permitir nova tentativa com backoff. |
| JSON inválido ou schema inesperado | Interromper processamento e registrar diagnóstico sanitizado. |
| Dados vazios (`data: []`) | Exibir “sem dados para o recorte”, nunca um KPI zero sem contexto. |

## Checklist antes de entregar uma integração

- [ ] Credenciais e token estão fora do repositório e dos logs.
- [ ] Login é feito sem Bearer; consultas protegidas enviam Bearer.
- [ ] Expiração de 180 minutos é controlada e `401`/`403` limpam a sessão.
- [ ] `/monitored-cities` é paginado e define o universo de UF/cidades disponível na tela.
- [ ] Não existe fallback silencioso para lista IBGE/local quando a GeoBrain falha.
- [ ] Todos os endpoints paginados seguem `links.next` até `null`.
- [ ] Consultas custosas aguardam recorte válido e têm timeout/cancelamento.
- [ ] `null`, string numérica e resposta vazia são tratados sem inventar valores.
- [ ] Falhas transitórias são distinguíveis de erro de acesso/parâmetro.
- [ ] Qualquer uso de v2 foi validado, documentado e isolado do contrato v1.

## Referências no repositório

- Especificação: `src/assets/openapi/api-geobrain.json`.
- Cliente HTTP com mascaramento de Authorization: `src/lib/http-client.ts`.
- Gestão de expiração de token: `src/store/auth-store.ts`.
- Implementação reutilizável do escopo autorizado: `src/features/shared/geo-api-scope-engine/`.
- Consumidor de empreendimentos v1/v2 com paginação: `src/features/panorama-secovi-fiergs/api.ts`.

> Limite conhecido: a documentação local não informa limites de taxa, formatos estritos de data, SLA ou contrato oficial da v2. Confirme esses itens com a GeoBrain antes de transformá-los em premissas de produto.
