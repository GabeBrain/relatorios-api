# Evidência pré-homologação — Fase 2: guardas de completude dimensional

**Data:** 01/10/2026

**Escopo:** FIERGS 2T2026 e regressão FIERGS 4T2025

**Portão:** G2

## 1. Resultado

O portão G2 foi aprovado. A reconciliação passou de 23 para 32 invariantes críticas sem fixar a quantidade nos testes. Além da linha total, a publicação agora confere a soma das linhas efetivamente visíveis para lançadas, finais e vendidas.

## 2. Guardas adicionadas

- oferta lançada visível por padrão e tipologia;
- oferta lançada visível por maturidade/padrão e maturidade/tipologia;
- oferta final visível por padrão, tipologia e suas aberturas de maturidade;
- vendas visíveis por padrão e tipologia;
- sobrecobertura tipológica por empreendimento, separadamente para lançadas, finais e vendidas;
- bloqueio de PDF e PPT reaproveitando o contrato crítico já existente.

As somas dimensionais incluem `Não classificado`, ignoram apenas linhas de total/subtotal e preservam `null` como ausência. A linha total não pode mais ocultar uma abertura incompleta.

## 3. Casos de prova

| Cenário | Total canônico | Linhas visíveis | Resultado |
|---|---:|---:|---|
| tipologia omite cobertura | 200 | 137 | bloqueado, delta -63 |
| residual derivado incluído | 200 | 137 + 63 | aprovado |
| tipologia excede projeto e residual compensa | 200 | 207 - 7 | bloqueado por sobrecobertura 7 |
| venda tipológica com distrato legítimo | 19 | -1 + 20 | aprovado; não é residual negativo |

## 4. Decisão metodológica

Uma dimensão é publicável somente quando a soma de suas linhas visíveis fecha no total canônico do cubo. Sobrecobertura não é detectada procurando qualquer número negativo na tabela: vendas líquidas negativas podem representar distratos legítimos. A guarda calcula por empreendimento `total declarado − soma tipológica` e bloqueia somente quando esse residual derivado é negativo.

Para padrão, cada empreendimento já possui exatamente uma categoria canônica, inclusive `Não classificado`; por isso a cobertura é garantida pela soma das linhas visíveis contra o universo, sem criar uma segunda compensação residual.

## 5. Regressões autenticadas

| Período | Invariantes | Divergências | Vendas | Lançadas verticais | Oferta final | Horizontal projetos/lançadas/finais | Estado |
|---|---:|---:|---:|---:|---:|---:|---|
| 2T2026 | 32 | 0 | 1.091 | 54.761 | 5.251 | 129 / 30.476 / 3.365 | homologável |
| 4T2025 | 32 | 0 | 1.524 | 53.295 | 5.855 | 121 / 28.413 / 2.840 | homologável |

Artefatos autenticados locais, não versionados:

| Arquivo | SHA-256 |
|---|---|
| `.tmp/fiergs-prehomologacao-fase2-2T2026.json` | `855162EE625C9BD16DCA9002F5704D50017C724B2A10287C56D6B2C4465F9092` |
| `.tmp/fiergs-prehomologacao-fase2-4T2025.json` | `176F5E5E5746E98396D5A72A1B5E415CC8CEF614BFE3A2BA3C5A55B94B61FE03` |

## 6. Testes

| Verificação | Resultado |
|---|---|
| teste focal das guardas | 16/16 aprovados |
| suíte FIERGS | 31 arquivos, 256/256 testes aprovados |
| `npx tsc --noEmit -p tsconfig.app.json` | aprovado |
| `npm run build` | aprovado |
| reconciliação autenticada 2T2026 | 32/32 invariantes compatíveis |
| reconciliação autenticada 4T2025 | 32/32 invariantes compatíveis |

Avisos não bloqueantes preexistentes: dimensões zero do Recharts nos testes, Browserslist desatualizado, importação mista de `xlsx` e chunks superiores a 500 kB.

## 7. Arquivos afetados

- `src/features/panorama-secovi-fiergs/domain/reconciliation.ts`;
- `src/features/panorama-secovi-fiergs/__tests__/reconciliation-guards.test.ts`;
- este documento.

Nenhum arquivo do Corretor, mapa, componente visual ou artefato de entrada foi modificado.

## 8. Portão G2

**APROVADO.** Uma abertura incompleta bloqueia PDF e PPT; a mesma abertura com residual derivado fecha e exporta. Resíduos negativos por sobrecobertura bloqueiam, enquanto distratos tipológicos legítimos permanecem aceitos.

**Commit isolado:** registrado no handoff do portão, pois um commit não pode conter o próprio hash de forma estável.
