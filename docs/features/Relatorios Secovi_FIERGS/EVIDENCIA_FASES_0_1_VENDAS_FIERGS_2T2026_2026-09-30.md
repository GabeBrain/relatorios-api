# Evidência das Fases 0 e 1 — vendas FIERGS 2T2026

**Data da coleta:** 30/09/2026  
**Plano:** `PLAN_POS_TESTE_JULIANA_FIERGS_2T2026_2026-09-30.md`  
**Estado do portão A:** `PASS TÉCNICO` — causas reproduzidas; recomendação canônica pronta para aprovação antes da mudança estrutural  
**Commit-base:** `efc26e2e418c9664d3c7b40d9aa3ba2a200e3d29`  
**Sincronização no início:** `main` = `origin/main` (`0` atrás, `0` à frente)  

## 1. Baseline congelado

### Recorte

- Entidade: `fiergs-rs`.
- Motor: `v4`.
- Fechamento: `2T2026`.
- Janela consultada: `2022-04-01` a `2026-06-30`.
- Cidades: Alvorada, Cachoeirinha, Canoas, Eldorado do Sul, Esteio, Gravataí, Guaíba, Novo Hamburgo, São Leopoldo e Viamão.
- Porto Alegre não integra o universo numérico.

### Artefato da Juliana

- Arquivo: `assets/panorama-alvorada-cachoeirinha-canoas-e-mais-7-2T2026.pptx`.
- Tamanho: `12.120.651` bytes.
- SHA-256: `C5AD2735E5663A711DA85A950E026B9799AE2E83A21C4621C5661FA7B243A1E3`.

### Reprodução automatizada

Comando:

```powershell
node_modules\.bin\vite-node.cmd scripts\fiergs-sales-reconciliation.mts
```

Saída sanitizada local:

```text
.tmp/fiergs-sales-reconciliation-2T2026.json
```

O artefato não contém token, e-mail ou senha. A credencial é usada apenas para consultar a GeoBrain.

## 2. Matriz de reconciliação

| Número visto no deck | Como o relatório chega nele | Causa | Resultado técnico |
|---:|---|---|---|
| **1.137** | endpoint `sales`, agrupado por Padrão, segmento Vertical | soma linhas observadas em abril/maio e junho como se todas fossem fluxos mensais | superestima o fechamento em 46 unidades |
| **1.138** | endpoint `sales`, agrupado por Tipologia, mas o componente mantém somente grupos `> 0` | 1 dorm. = 64, 2 dorm. = 919, 3 dorm. = 155; a linha de 4 dorm. = **−1** é retirada da visualização | quebra a identidade de venda líquida: 64 + 919 + 155 = 1.138, mas o líquido é 1.137 |
| **1.091** | cubo granular `building-with-history-internal`, última fotografia válida por empreendimento/tipologia | usa `sold_in_period` do último mês observado até o fechamento e preserva venda líquida negativa | único total que não duplica fotografias e fecha por cidade/tipologia/área na coleta atual |
| **2.317** | comparativo municipal usa a fonte por Padrão, mas não filtra o segmento Vertical | **1.137 Vertical + 1.180 Horizontal** | o título diz Vertical, mas o cálculo soma os dois segmentos |

### Equações reproduzidas

```text
1.138 = 64 (1 dorm.) + 919 (2 dorm.) + 155 (3 dorm.)
1.137 = 1.138 + (−1 de 4 dorm.)
2.317 = 1.137 Vertical + 1.180 Horizontal
1.137 = 1.091 fotografia final + 46 fotografias repetidas
46 = 41 Canoas + 5 Novo Hamburgo
```

## 3. Evidência por cidade

| Cidade | Temporal Vertical atual | Horizontal incluído indevidamente no slide 31 | Cubo granular Vertical | Excesso temporal |
|---|---:|---:|---:|---:|
| Alvorada | 13 | −2 | 13 | 0 |
| Cachoeirinha | 77 | 88 | 77 | 0 |
| Canoas | 274 | 110 | 233 | **41** |
| Eldorado do Sul | 0 | 2 | 0 | 0 |
| Esteio | 122 | 2 | 122 | 0 |
| Gravataí | 214 | 172 | 214 | 0 |
| Guaíba | 3 | 185 | 3 | 0 |
| Novo Hamburgo | 243 | 3 | 238 | **5** |
| São Leopoldo | 79 | 5 | 79 | 0 |
| Viamão | 112 | 615 | 112 | 0 |
| **Total** | **1.137** | **1.180** | **1.091** | **46** |

O valor horizontal de Alvorada é negativo porque vendas líquidas preservam distratos; não deve ser truncado para zero no fato contábil.

## 4. Causa do excesso temporal de 46

O normalizador atual classifica `sales` como fluxo. Quando a API retorna mais de uma observação mensal no mesmo trimestre, todas são mantidas e posteriormente somadas.

Para o recorte analisado, essas observações se comportam como fotografias acumuladas do trimestre, e não como parcelas mensais independentes:

### Canoas — 41 duplicadas

- Empreendimento `83110` — **Ora**.
- Abril: `41` vendas.
- Junho: `41` vendas na fotografia granular do empreendimento.
- Endpoint temporal consolidado:
  - abril, Econômico: `41`;
  - junho, Econômico: `195` — já contém a fotografia de fechamento do grupo.
- O normalizador soma abril novamente e publica `274` para Canoas.
- O cubo de fechamento publica `233`.
- Delta: `41`.

### Novo Hamburgo — 5 duplicadas

- Empreendimento `86885` — **Jardins de Provence**:
  - maio: `4`;
  - junho: `4`;
  - excesso ao somar fotografias: `4`.
- Empreendimento `86887` — **Unicco Senior Living**:
  - maio: `1`;
  - junho: `4`;
  - excesso ao somar fotografias: `1`.
- Endpoint temporal de maio: Compacto `1` + Standard `4`.
- A fotografia de junho já representa o fechamento municipal.
- Delta: `5`.

### Código relacionado

- `domain/temporal-normalization.ts`: mantém todas as linhas mensais de fluxo e as converte para a mesma chave trimestral.
- `domain/cube.ts`: escolhe o último mês observado até o fechamento e usa `sold_in_period` antes dos aliases.
- `domain/aggregations.ts`: a análise por área soma `soldUnits` dessas tipologias de fechamento.

## 5. Causa do 1.138 por tipologia

O endpoint por tipologia fecha matematicamente em `1.137`:

| Tipologia | Venda líquida |
|---|---:|
| 1 dormitório | 64 |
| 2 dormitórios | 919 |
| 3 dormitórios | 155 |
| 4 dormitórios | **−1** |
| **Total líquido** | **1.137** |

O componente `FiergsDistributionSlide` usa `rows.filter(row => row.value > 0)`. Assim, a linha negativa de 4 dormitórios desaparece antes do cálculo do total visível, elevando o total de `1.137` para `1.138`.

Uma venda líquida negativa é possível quando distratos superam vendas. Ela não pode ser descartada da identidade total. A apresentação posterior deverá decidir como representar visualmente o ajuste negativo sem ocultá-lo.

## 6. Causa do 2.317 por cidade

O método `buildCityComparisons` normaliza e filtra a política da entidade, mas não exige `building_type === Vertical` antes de somar `liquid_sales`.

Consequentemente:

```text
slide 31 = Vertical + Horizontal
slide 31 = 1.137 + 1.180
slide 31 = 2.317
```

Isso contradiz diretamente o título `UNIDADES VERTICAIS VENDIDAS POR CIDADE`.

## 7. Recomendação de fonte canônica

### Recomendação

Adotar como fato canônico de vendas do fechamento o cubo granular de `building-with-history-internal`, usando, para cada empreendimento/tipologia, a última observação válida até o fim do trimestre e o campo `sold_in_period` — com aliases apenas quando o campo principal não existir.

**Total canônico recomendado para esta fotografia 2T2026: `1.091` vendas líquidas verticais.**

### Justificativas

1. Evita somar fotografias acumuladas como fluxos independentes.
2. Possui identificação de cidade, empreendimento e tipologia.
3. Permite decompor o mesmo total por cidade, padrão, tipologia e área.
4. Preserva ajustes líquidos negativos.
5. O total `1.091` já aparece no slide 40 e foi reproduzido tanto pelo total granular vertical quanto pelas faixas de área; não há resíduo de área na coleta atual.
6. Os 46 de diferença foram integralmente explicados, sem ajuste manual.

### Alternativa aceitável

O endpoint temporal pode continuar como série histórica se sua normalização passar a reconhecer a semântica de fotografia acumulada e selecionar a última observação do trimestre por cidade/dimensão. Ele não deve continuar somando automaticamente todas as observações mensais deste contrato.

### Estado metodológico

A recomendação está tecnicamente reconciliada, mas ainda não é uma decisão `APPROVED` da analista. A mudança estrutural deve ocorrer somente após o checkpoint deste documento.

## 8. Impacto esperado nos slides de vendas

| Slides | Estado atual | Impacto esperado após aprovação |
|---:|---|---|
| 25 e 30 | padrão totaliza 1.137 | derivar padrão do fato canônico; total esperado 1.091 |
| 27 e 28 | MCMV/demais usam série temporal com duplicidade | recalcular pelo fato canônico e validar as duas categorias |
| 29 | total visível 1.138 por remoção do −1 | derivar tipologia do fato canônico e representar distratos sem quebrar o total |
| 31 | soma Vertical + Horizontal = 2.317 | filtrar Vertical e derivar cidades do fato canônico; soma esperada 1.091 |
| 40 | granular totaliza 1.091 | permanece como referência e deve fechar com os demais slides |

## 9. Testes que devem anteceder a promoção

1. **Semântica temporal:** duas fotografias acumuladas no mesmo trimestre não são somadas.
2. **Regressão mensal real:** quando o contrato provar linhas mensais incrementais, o comportamento aditivo continua disponível explicitamente.
3. **Cidade:** o slide de vendas verticais rejeita linhas horizontais.
4. **Venda líquida negativa:** grupos negativos participam do total, ainda que recebam tratamento visual próprio.
5. **Reconciliação dimensional:** padrão = tipologia = cidade = área.
6. **Fixture 2T2026:** Canoas fecha 233, Novo Hamburgo fecha 238 e o consolidado fecha 1.091.
7. **Cobertura:** unidades sem padrão, tipologia ou área entram em `Não classificado`, em vez de desaparecer.
8. **Entidades:** a correção FIERGS não altera a semântica já homologada do Secovi-SP sem evidência equivalente.

## 10. Resultado do portão A

| Critério | Estado | Evidência |
|---|---|---|
| Quatro totais reproduzidos | PASS | script e JSON de auditoria |
| Deltas explicados por cidade | PASS | Canoas +41; Novo Hamburgo +5; horizontal +1.180 |
| Delta de tipologia explicado | PASS | linha líquida de 4 dormitórios = −1 removida pelo componente |
| Fonte canônica recomendada | PASS TÉCNICO | cubo granular/última fotografia = 1.091 |
| Alteração estrutural aplicada | NÃO INICIADA | bloqueada pelo checkpoint solicitado |
| Ajustes visuais iniciados | NÃO | fora do escopo das Fases 0 e 1 |

## 11. Arquivos criados nesta etapa

- `scripts/fiergs-sales-reconciliation.mts` — bancada reproduzível e sanitizada.
- `docs/features/Relatorios Secovi_FIERGS/EVIDENCIA_FASES_0_1_VENDAS_FIERGS_2T2026_2026-09-30.md` — esta evidência.

Nenhum componente, agregador ou contrato de produção foi alterado nesta etapa.

## 12. Verificações executadas

- Consulta autenticada das dez cidades: `PASS`; os quatro totais foram reproduzidos.
- Repetição focal em Canoas e Novo Hamburgo: `PASS`; o delta de 46 foi atribuído integralmente a três empreendimentos e às observações repetidas de abril/maio.
- Testes focais: `64/64 PASS` em:
  - `temporal-normalization.test.ts`;
  - `temporal-report-integration.test.ts`;
  - `report-model.test.ts`;
  - `opus-cube-aggregations.test.ts`.
- Typecheck do repositório: `PASS` (`tsc --noEmit`).
- Build e exportação não foram executados porque não houve mudança de runtime nem visual nesta fase.
