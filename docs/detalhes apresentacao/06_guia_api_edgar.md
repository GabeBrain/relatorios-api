# Guia de APIs para o Edgar — Narrativa de Apresentação

## Slide: O que é a API Geobrain

A API Geobrain é o ponto de acesso à base de dados do mercado imobiliário coletada pela equipe CID.
Ela expõe informações de empreendimentos, tipologias, histórico de preços e métricas de mercado
(IVV, vendas, estoque) para cidades monitoradas em todo o Brasil.

**Base URL:** `https://geobrain.com.br/public-api`  
**Autenticação:** JWT Bearer Token (validade: 180 minutos)  
**Formato:** JSON, paginação via `page` e `per_page`

---

## Slide: Como o Edgar acessa a API — Autenticação

O Edgar **não precisa de Postman ou terminal** para começar. O app interno já tem tudo integrado.

### Passo a passo:
1. Abrir o app no navegador
2. No painel lateral, localizar o bloco de autenticação (parte inferior do menu)
3. Inserir e-mail e senha da conta Geobrain
4. O badge **"AUTENTICADO"** aparece em verde com o e-mail e o tempo restante
   → _referenciar screenshot: auth_state.png_
5. Botões disponíveis: **"Reemitir"** (renovar token) e **"Remover"** (deslogar)
6. A partir desse momento, todas as páginas do app usam automaticamente o token

**Importante:** o token expira em 180 min. Se uma chamada falhar, clicar em "Reemitir".

---

## Slide: Dois lugares para aprender as APIs antes de criar código

### 1. Documentação (`/documentacao`)
- Especificação OpenAPI completa da API Geobrain
- Lista todos os endpoints, parâmetros aceitos e esquemas de resposta
- Usar como referência: "qual campo retorna o preço de lançamento?"
  → resposta: `typologies_history[].release_price`

### 2. Testes de Requisição (`/testes-requisicao`)
- Interface interativa: montar chamadas reais e ver a resposta
- Equivalente a um Postman integrado — sem configurar nada
- Explorar o retorno de `/building-with-history` com diferentes cidades
- Entender a estrutura aninhada: `data[] → typologies[] → typologies_history[]`

**Fluxo recomendado para o Edgar:**
```
Documentação → entender o schema
Testes de Requisição → ver o dado real
Validação de Base → ver o que é verificado
Criar nova página → contribuir com nova análise
```

---

## Slide: Os Endpoints Principais para Controle de Qualidade

### `POST /auth/login`
- Entrada: `{ email, password }`
- Saída: `{ access_token, expires_in }`
- Usado pelo: app automaticamente ao autenticar

### `GET /monitored-cities`
- Sem parâmetros
- Saída: lista de cidades monitoradas com UF
- Usado na: página de Validação de Base (dropdown de seleção)

### `GET /building-with-history`
- Parâmetros principais: `city`, `uf`, `type`, `status`, `per_page`, `page`
- Saída: lista paginada de empreendimentos com histórico completo
- Campos de nível building: `name`, `standard`, `latitude`, `longitude`, `release_date`, `delivery_date`
- Campos aninhados:
  - `typologies[]`: `private_area`, `price`, `stock`, `sold`, `number_bedroom`
  - `typologies_history[]`: `release_price`, `sold_in_period`, `vgv_total`, `period`

### `GET /building-with-history/{id}`
- Mesmo schema, mas para 1 empreendimento específico
- Usado quando se quer verificar um caso individual em profundidade

---

## Slide: A Estrutura de Dados que o Edgar vai manipular

```
building (1 empreendimento)
├── building_id, name, city, state, standard
├── latitude, longitude
├── release_date, delivery_date
├── typologies[] (N tipologias por empreendimento)
│   ├── id, number_bedroom, private_area
│   ├── price, stock, sold
│   └── ...
└── typologies_history[] (série histórica por tipologia)
    ├── typology_id → liga ao typologies[].id
    ├── period (mês de referência)
    ├── release_price (preço de lançamento original)
    ├── price (preço no período)
    ├── sold_in_period, vgv_total
    └── ...
```

**O trabalho de QA começa com o flatten:** transformar essa estrutura aninhada
em uma tabela plana (1 linha por tipologia) para poder aplicar validações.

---

## Slide: As 4 Validações da Página CID

| # | Validação | Campo(s) | Método | Severidade |
|---|-----------|----------|--------|-----------|
| 1 | Outlier M² | `private_area` por `standard` | IQR por Padrão | Média |
| 2 | Outlier Preço | `price` por `standard` | IQR por Padrão | Média |
| 3 | Data inconsistente | `delivery_date` < `release_date` | Comparação direta | Alta |
| 4 | Campo de data nulo | `release_date` ou `delivery_date` ausente | Verificação de nulidade | Alta |
| 5 | Lat/Lon fora do limite | `latitude`, `longitude` | Bounding box por cidade | Alta |
| 6 | Lat/Lon nulo | `latitude` ou `longitude` nulo | Verificação de nulidade | Alta |

---

## Slide: O que o Edgar constrói a partir daqui

### Ciclo de trabalho esperado:

1. **Rodar a validação** para diferentes cidades → comparar resultados
2. **Identificar padrões** — os erros são aleatórios ou concentrados em algum Padrão ou cidade?
3. **Propor nova validação** não coberta ainda. Exemplos:
   - `release_price` ausente em tipologias com lançamento recente
   - `price` atual abaixo do `release_price` (possível erro de cadastro)
   - `stock + sold ≠ qty` (inconsistência na equação de estoque)
   - Empreendimentos "Ativos" com `delivery_date` no passado
4. **Implementar a nova página** no projeto (branch → PR → merge)
5. **Classificar os erros** encontrados: sistemático vs. pontual, Alta/Média/Baixa

### Como criar uma nova página:
- Copiar `TQCidValidacaoBase.tsx` como base
- Adaptar os campos verificados e as regras de negócio
- Adicionar rota em `App.tsx` e entrada no menu em `AppLayout.tsx`
- Testar ao vivo pela interface com dados reais

---

## Slide: Próximos upgrades previstos para a página

| Feature | Descrição | Prioridade |
|---------|-----------|-----------|
| Box plot por Padrão | Visualização IQR (M² e Preço) | Alta |
| Mapa de pins lat/lon | Verde (ok) / Vermelho (erro) com deck.gl | Alta |
| Exportação PDF | Relatório com `@react-pdf/renderer` | Média |
| Seletor de tipo de imóvel | Vertical / Horizontal / Comercial / Hotel | Média |
| Bounding box automático | Consultar OpenStreetMap Nominatim por cidade | Baixa |
| Validação de equação de estoque | `stock + sold ≠ qty` por período | Baixa |
