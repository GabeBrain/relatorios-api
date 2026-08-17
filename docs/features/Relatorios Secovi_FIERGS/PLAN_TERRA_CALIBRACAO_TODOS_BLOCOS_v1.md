# Plano de ação — Terra — Calibração profunda de todos os blocos do Panorama

**Data:** 2026-08-17  
**Produto:** Relatório Secovi/FIERGS  
**Rota:** `/rebrain/panorama-secovi-fiergs`  
**Base de referência:** Piracicaba/SP · 1T2026  
**Objetivo:** ancorar contratos suficientes para avançar o relatório e o PDF sem transformar divergências históricas/editoriais em bloqueio geral.

## 1. Decisão de produto

A calibração continua separada do relatório. Um método candidato só entra no motor depois de ter:

1. fonte e fórmula explícitas;
2. cobertura conhecida;
3. reconciliações internas aprovadas;
4. divergências catalogadas;
5. estado `approved`, `reconciled`, `assumed` ou `open_method`.

Não é necessário que todas as células batam para avançar. É necessário saber por que o método é
adequado, onde diverge e qual impacto a divergência produz.

## 2. Curadoria do universo pelo analista

### 2.1 Tipos de exclusão

| Escopo | Uso | Exemplo |
|---|---|---|
| `global` | retira o empreendimento de todos os blocos | registro fora do universo Secovi |
| `release_only` | retira somente de lançamentos, no trimestre de `release_date` | horizontal que não é condomínio de casas |
| `period` | retira das fotografias e fluxos de um período definido | erro de fechamento localizado |
| `metric` | retira apenas de métricas identificadas | preço inválido sem excluir estoque |

Para lançamentos, a exclusão `release_only` é naturalmente aplicada ao trimestre da
`release_date`. Nos demais blocos, período e métrica precisam ser explícitos: retirar um lançamento
não pode apagar silenciosamente vendas ou estoque posteriores.

### 2.2 Contrato sugerido

```ts
interface PanoramaExclusion {
  id: string;
  scope: 'global' | 'release_only' | 'period' | 'metric';
  buildingIds: string[];
  resolvedFrom?: { field: string; operator: string; value: string }[];
  periods?: string[];
  metricIds?: string[];
  reason: string;
  evidence?: string;
  author: string;
  createdAt: string;
  status: 'draft' | 'approved' | 'revoked';
}
```

Uma exclusão por grupo deve oferecer prévia e, ao ser aprovada, congelar a lista de
`buildingIds`. A regra original permanece como explicação, mas não é reexecutada automaticamente
contra novos dados.

### 2.3 UX mínima

- ação **Revisar universo** na bancada;
- tabela auditável por empreendimento, com busca, trimestre, segmento, padrão e métricas afetadas;
- seleção individual ou em lote;
- prévia **antes × depois** para cada contrato;
- motivo obrigatório e autor/data;
- botão para revogar, nunca apagar a decisão;
- relatório e exportações mostram quantidade de exclusões e versão/hash do conjunto aplicado;
- gabarito congelado nunca é reescrito por uma exclusão.

## 3. Resultado já ancorado em Lançamentos

- Empreendimentos verticais: `building_id` distinto por `release_date`, **17/17 trimestres**.
- Unidades verticais: `total_units` por `release_date`, **17/17 trimestres**.
- `typologies_history.qty` no mês de lançamento reproduz `total_units` nos 17 trimestres e fica como contraprova.
- Horizontal: divergências concentradas em empreendimentos adicionais da API; depende de curadoria/taxonomia.
- `temporal-analysis-city/releases`: candidato ainda inválido por HTTP 422; corrigir parâmetros/paginação antes de avaliar.

Estado recomendado: vertical `reconciled`; horizontal `assumed`; VGV e MCMV `open_method`.

## 4. Estratégia de teste comum a todos os blocos

Cada bancada de bloco deve mostrar:

- método, endpoint, parâmetros, status HTTP, latência, páginas e linhas;
- referência, calculado, diferença absoluta/relativa e status;
- cobertura e campos ausentes;
- resultado bruto antes da curadoria e resultado após exclusões;
- drill-down até `building_id`/tipologia/período;
- reconciliações internas e explicação das divergências;
- ação **Promover método**, disponível apenas com justificativa e estado do contrato.

As chamadas continuam sob ação explícita, com cache por token + UF + cidade + período + versão das
exclusões. Alternar abas não dispara nova coleta.

## 5. Matriz de teses por bloco

### B1 — Lançamentos — slides 12–19

Testar:

- `release_date` + empreendimento distinto;
- `total_units` e `qty` da fotografia inicial;
- endpoint `releases` corrigido, paginado e separado por tipo/padrão;
- VGV por `qty × release_price`, preço da primeira fotografia e `vgv_total` quando disponível;
- padrão no mês do lançamento;
- universo horizontal antes/depois da curadoria.

Portão suficiente: vertical reconciliado; horizontais divergentes identificados por ID; VGV pode
seguir como `open_method` no PDF.

### B2 — Vendas e VGV vendido — slides 21–26

Testar:

- `temporal-analysis-city/sales` contra soma de `sold_in_period` granular;
- fluxo trimestral como soma dos meses, nunca último snapshot;
- VGV vendido do endpoint contra `sold_in_period × price`;
- tipo e padrão no período da venda;
- efeito das exclusões globais/periódicas.

Reconciliações: vertical + horizontal = total; padrões = vertical; trimestre = soma mensal; anual =
soma trimestral.

Portão suficiente: série total/vertical coerente e método de fluxo fechado. Diferenças pontuais de
horizontal ficam catalogadas.

### B3 — Oferta final, disponibilidade e resumo — slides 27, 29, 31–35

Testar:

- endpoint `stock` contra último snapshot de cada tipologia no fechamento;
- oferta lançada por coorte via `release_date` + `qty`;
- oferta final via `typology_stock` no fechamento;
- disponibilidade = oferta final / oferta lançada;
- agrupamentos por padrão, tipologia, ano e segmento.

Reconciliações: soma das dimensões = mercado; oferta final não negativa; disponibilidade entre 0%
e 100%; oferta lançada − oferta final = vendidas acumuladas quando o universo é idêntico.

Portão suficiente: snapshot final e denominadores reconciliados. Este bloco é pré-requisito do IVV.

### B4 — IVV e faixas de área — slide 27

Testar:

- endpoint `ivv`;
- `vendas / (estoque anterior + lançamentos)`;
- `vendas / (estoque final + vendas)` como contraprova equivalente quando a continuidade fecha;
- granular por faixas de `private_area`, com limites do deck congelados;
- efeito de retroativos e exclusões periódicas.

Portão suficiente: fórmula total reconciliada e faixas fechando no total. Se o endpoint não agrupar
por área, o granular vira fonte oficial.

### B5 — Preços, ticket e preço/m² — slides 36–40 e 49

Testar:

- `medium-prices` e `medium-prices-meter`;
- média simples × ponderada por unidades disponíveis;
- preço público × preço de lançamento;
- estoque positivo × universo completo;
- denominador de área: `private_area × unidades`;
- recortes por padrão, tipologia e segmento.

Portão suficiente: definir população, peso e data da fotografia. Tolerância monetária explícita para arredondamentos.

### B6 — Coortes e maturidade — slides 33, 41–46 e 48

Testar:

- coorte pelo ano de `release_date`;
- idade no fechamento, não na data atual;
- Planta/Construção/Pronto por 0–6, 7–36 e 37+ meses;
- estágio explícito da API como candidato alternativo;
- tabelas ano × padrão e maturidade × tipologia.

Portão suficiente: faixas mutuamente exclusivas, soma igual ao universo e regra temporal registrada.

### B7 — VGV geral — slide 51

Testar:

- VGV lançado, estoque e vendido por fontes independentes;
- `qty × preço` contra campos `vgv_*` da API;
- VGV vendido acumulado = lançado − estoque, quando preços/base forem comparáveis;
- preço da origem versus preço corrente, documentando a escolha.

Portão suficiente: VGV de estoque pode avançar com endpoint direto; VGV lançado permanece
`open_method` se a identidade contábil não fechar.

### B8 — Mapa — slide 56

Testar:

- mesmo universo vertical aprovado nos blocos quantitativos;
- coordenadas válidas, duplicidades e pontos fora do município;
- contagem do mapa = contagem da lista de empreendimentos exibida;
- exclusões globais refletidas no mapa.

Portão suficiente: universo e contagem reconciliados; fidelidade cartográfica não bloqueia os números.

### B9 — Narrativas — slides 53/54

Não testar LLM nesta etapa. Gerar somente fatos determinísticos a partir dos contratos promovidos.
Qualitativo continua `[LLM NECESSÁRIO AQUI]`.

## 6. Ordem de execução do Terra

1. **T0 — Infra de calibração:** tipos compartilhados, diagnósticos HTTP, paginação e chave de cache.
2. **T1 — Curadoria:** registry de exclusões, preview antes/depois, auditoria e persistência local/versionável inicialmente.
3. **T2 — Fechar Lançamentos:** corrigir `releases`, listar horizontais divergentes e promover contratos verticais.
4. **T3 — Vendas + Estoque:** implementar bancadas B2/B3 usando uma coleta granular comum.
5. **T4 — IVV:** executar depois de vendas e estoque, reaproveitando seus modelos aprovados.
6. **T5 — Preços + Coortes/Maturidade:** bancadas B5/B6 e contratos dimensionais.
7. **T6 — VGV + Mapa:** fechar B7/B8 com o universo já governado.
8. **T7 — Modelo completo:** um `PanoramaReportModel` único para validação, relatório, XLSX e PDF.
9. **T8 — QA:** testes unitários, integração, A/B visual e PDF paginado.

## 7. Critério para não bloquear o produto

Um bloco pode avançar quando:

- a regra principal tem semântica correta e reconciliação interna;
- cobertura e divergências são visíveis;
- nenhuma ausência vira zero silenciosamente;
- exclusões são auditáveis;
- o contrato informa seu estado.

`reconciled` permite uso no relatório com nota de homologação. `assumed` permite construir e testar
o PDF, mas exige sinalização. `open_method` preserva a página/estrutura com nota editorial, sem
inventar um resultado.

## 8. Entregáveis

- registry versionado de exclusões e UI de curadoria;
- oito bancadas quantitativas reaproveitando o mesmo framework;
- catálogo de contratos por bloco;
- matriz de aderência Piracicaba 1T26 antes/depois da curadoria;
- log de divergências por empreendimento;
- `PanoramaReportModel` completo;
- XLSX técnico de auditoria;
- PDF paginado com estados metodológicos;
- testes de invariantes e regressão;
- atualização do log de decisões a cada retorno do analista.

## 9. Primeiro CTA operacional

Terra deve começar por T0–T2, sem refazer o layout do relatório: corrigir e instrumentar o endpoint
`releases`, criar o drill-down dos horizontais divergentes, implementar o registry de exclusões e
promover os contratos verticais já reconciliados. Ao final, resumir métodos testados, exclusões
simuladas, contratos promovidos e bloqueios reais; então propor o plano detalhado T3–T4 para Vendas,
Estoque e IVV.
