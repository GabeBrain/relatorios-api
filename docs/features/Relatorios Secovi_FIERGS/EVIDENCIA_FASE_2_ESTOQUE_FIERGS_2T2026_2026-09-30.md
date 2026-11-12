# Evidência da Fase 2 — estoque FIERGS 2T2026

## Resultado executivo

O fechamento vertical tecnicamente reconciliado é **5.251 unidades de oferta final**. A bancada autenticada das dez cidades produziu o mesmo total no endpoint por tipologia, no cubo granular por empreendimento/tipologia e na decomposição por área. Não há resíduo por falta de área na coleta atual.

## Matriz dos três totais apontados pela Juliana

| Total | Origem | Causa |
|---:|---|---|
| **5.459** | endpoint temporal `stock`, agrupado por padrão | o contrato dimensional por padrão excede em 208 o mesmo fechamento por tipologia/granular |
| **4.562** | slides 36 e 37 do PPTX da Juliana | soma das linhas impressas pelo caminho temporal dimensional antigo; o histórico do componente confirma que ele consumia `report.stock.units`/`unitsByTypology`, enquanto o slide 40 já consumia granular |
| **5.251** | endpoint por tipologia + cubo granular + faixas de área | único total que fecha simultaneamente por empreendimento, tipologia e área |

### Identidades reproduzidas

```text
5.459 - 5.251 = 208  (excesso do contrato temporal por padrão)
5.251 - 4.562 = 689  (unidades ausentes nas tabelas antigas 36/37)
```

No slide 36, as linhas antigas somavam `541 + 3.705 + 316 = 4.562`. Na fotografia canônica, as mesmas categorias mais 4+ dormitórios somam `621 + 4.218 + 410 + 2 = 5.251`; os deltas são `+80`, `+513`, `+94` e `+2`.

No slide 37, as linhas antigas somavam `504 + 3.285 + 678 + 95 + 0 = 4.562`. Na fotografia canônica, os grupos somam `582 + 3.647 + 879 + 140 + 0 + 3 = 5.251`; os deltas são `+78`, `+362`, `+201`, `+45` e `+3`.

## Decomposição municipal autenticada

| Cidade | Temporal por padrão | Temporal por tipologia | Granular/área | Delta padrão − granular |
|---|---:|---:|---:|---:|
| Alvorada | 188 | 188 | 188 | 0 |
| Cachoeirinha | 26 | 17 | 17 | 9 |
| Canoas | 1.539 | 1.482 | 1.482 | 57 |
| Eldorado do Sul | 2 | 2 | 2 | 0 |
| Esteio | 158 | 121 | 121 | 37 |
| Gravataí | 321 | 321 | 321 | 0 |
| Guaíba | 102 | 33 | 33 | 69 |
| Novo Hamburgo | 1.362 | 1.327 | 1.327 | 35 |
| São Leopoldo | 693 | 692 | 692 | 1 |
| Viamão | 1.068 | 1.068 | 1.068 | 0 |
| **Total** | **5.459** | **5.251** | **5.251** | **208** |

## Implementação

- `report/model.ts` substitui somente o fechamento vertical FIERGS das dimensões padrão e tipologia pela última fotografia granular;
- o histórico temporal anterior e as linhas horizontais permanecem preservados;
- o IVV FIERGS usa a mesma oferta final reconciliada;
- sem cobertura granular, a fonte temporal é preservada em vez de fabricar zero;
- `scripts/fiergs-sales-reconciliation.mts` registra totais, grupos, cidades e empreendimentos para auditoria.

## Estado do portão

O recorte de estoque do portão B está **APPROVED**. Gabriel confirmou explicitamente em 30/09/2026 o total canônico de `5.251`.
