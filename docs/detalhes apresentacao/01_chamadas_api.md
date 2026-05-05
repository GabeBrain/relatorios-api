# Chamadas de API — Mapeamento por Etapa de Validação

## Autenticação (pré-requisito de todas as etapas)

**Endpoint:** `POST /auth/login`  
**O que envia:** credenciais (email + password)  
**O que retorna:** token JWT (validade 180 min)  
**O que fazemos:** armazenamos o token no estado global (Zustand) e usamos em todas as chamadas seguintes

---

## Etapa 1 — Extração da Base (Análise Exploratória)

**Endpoint:** `GET /building-with-history`  
**Parâmetros:** `city=Porto Alegre`, `uf=RS`, paginação  
**O que retorna:**
- `building_id`, `name` (Empreendimento)
- `city`, `state`, `neighborhood`, `zipcode`
- `standard` (Padrão: Compacto, Standard, Médio, Alto, Alto+, Luxo)
- `latitude`, `longitude`
- `release_date` (Data de Lançamento)
- `delivery_date` (Data de Entrega)
- `stock`, `total_units`, `towers`, `elevators`
- `typologies[]` → array com: `number_bedroom`, `private_area`, `price`, `stock`, `sold`, `qty`
- `typologies_history[]` → histórico com `release_price`, `sold_in_period`, `vgv_total`

**O que fazemos:**
- Flatten do array `typologies[]` → 1 linha por tipologia
- Contagem de registros e colunas
- Identificação de campos nulos por coluna
- Estatísticas descritivas (min, max, média, mediana)

**Métrica de saída:** Total de empreendimentos, total de tipologias, % de campos nulos por coluna

---

## Etapa 2 — Detecção de Outliers

**Mesma chamada:** dados já extraídos na Etapa 1  
**Campos analisados:** `private_area` (M² Privativo), `price` (Preço)  
**Campos configuráveis (desativados por padrão):** `stock`, `sold`, `number_bedroom`, `vgv_total`

**O que fazemos:**
- Agrupamento por `standard` (Padrão)
- Para cada grupo: cálculo de Q1, Q3, IQR
- Limite inferior: Q1 − 1.5×IQR
- Limite superior: Q3 + 1.5×IQR
- Identificação de tipologias fora dos limites
- **Upgrade sugerido:** box plot por Padrão (M² e Preço separados)

**Métrica de saída:** Quantidade e % de outliers por Padrão e por campo

---

## Etapa 3 — Validação de Datas

**Mesma chamada:** dados já extraídos na Etapa 1  
**Campos:** `release_date` (Data de Lançamento), `delivery_date` (Data de Entrega)  
**Campo adicional via history:** `release_price` (de `typologies_history` com o ID correspondente)

**O que fazemos:**
- Conversão para datetime
- Verificação: `delivery_date` >= `release_date` (obrigatório)
- Identificação de datas nulas ou inválidas
- Identificação de `delivery_date` no passado (empreendimentos já entregues vs. ainda ativos no estoque)
- **Upgrade sugerido:** linha do tempo mostrando distribuição de lançamentos e entregas por ano/trimestre

**Métrica de saída:** Quantidade e % de inconsistências de data

---

## Etapa 4 — Validação de Localização (Lat/Lon)

**Mesma chamada:** dados já extraídos na Etapa 1  
**Campos:** `latitude`, `longitude`, `city`

**O que fazemos:**
- Verificação de valores nulos ou não-numéricos
- Verificação dentro do bounding box da cidade (ex: POA: lat [-30.2, -29.9], lon [-51.3, -51.0])
- **Upgrade sugerido:** mini-mapa com pins coloridos (verde = ok, vermelho = fora do limite)

**Dicionário de limites:** mantido no código para cidades monitoradas (atualmente ~100+ cidades)  
**Fonte de verdade para bounding box:** a ser definida (sugestão: API do OpenStreetMap Nominatim)

**Métrica de saída:** Quantidade e % de empreendimentos fora dos limites geográficos

---

## Etapa 5 — Relatório de Alertas Consolidado

**Inputs:** resultados das Etapas 1–4  
**Output:** tabela unificada com:

| Campo | Tipo de Erro | Severidade | Empreendimento | Cidade | Detalhe |
|-------|-------------|-----------|----------------|--------|---------|
| delivery_date | Data inconsistente | Alta | Nome | POA | Entrega antes do lançamento |
| latitude | Fora do bounding box | Alta | Nome | POA | Lat: -35.0 esperado: [-30.2, -29.9] |
| private_area | Outlier (acima) | Média | Nome | POA | 850m² (limite: 320m²) |

**Classificação de Severidade:**
- **Alta:** erro lógico direto (data invertida, localização errada, campo nulo em campo obrigatório)
- **Média:** outlier estatístico (pode ser legítimo, requer verificação manual)
- **Baixa:** campo opcional nulo, formatação inconsistente

**Upgrade sugerido:** exportação para Excel + download direto na página
