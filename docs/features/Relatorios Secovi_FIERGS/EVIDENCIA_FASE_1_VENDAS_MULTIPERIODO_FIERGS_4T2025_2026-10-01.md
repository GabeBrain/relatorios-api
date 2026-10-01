# Evidência da Fase 1 — vendas verticais multiperíodo FIERGS

**Data:** 01/10/2026  
**Portão anterior:** G0 no commit `6d451a2`  
**Escopo:** corrigir o delta de vendas `1.524 × 1.517`, preservando 2T2026 e o comportamento Secovi-SP

## 1. Causa comprovada antes da alteração

O delta não era produzido por tipologias ausentes, arredondamento ou mudança posterior da API.

O relatório construía três dimensões do fechamento vertical com universos diferentes:

| Dimensão | Universo anterior | Vendas 4T2025 |
|---|---|---:|
| Área | cubo completo no fechamento | 1.524 |
| Padrão | projetos lançados desde 1T2021 | 1.517 |
| Tipologia | projetos lançados desde 1T2021 | 1.517 |
| Cidade | cubo completo no fechamento | 1.524 |

Os projetos anteriores a 1T2021 contribuíam com saldo líquido de sete vendas:

- Canoas: `-3`;
- Gravataí: `+4`;
- Guaíba: `+4`;
- Novo Hamburgo: `+2`;
- demais cidades: `0`.

Total: `-3 + 4 + 4 + 2 = 7`.

O valor negativo de Canoas é legítimo e permanece preservado como distrato.

## 2. Decisão metodológica

Para o FIERGS, padrão, tipologia, cidade e área descrevem a fotografia do mercado no fechamento. A data de lançamento não pode remover um empreendimento antigo que ainda possua venda ou oferta no trimestre selecionado.

A janela `startQuarter → endQuarter` continua válida para séries de lançamentos. Ela deixa de filtrar apenas as tabelas de oferta/vendas atuais por padrão e tipologia do FIERGS.

O Secovi-SP conserva a política anterior de janela; não houve ampliação transversal do universo.

## 3. Alteração implementada

Em `buildGranularBlocks` foi criado o universo explícito `verticalOfferCube`:

- FIERGS-RS: cubo completo no fechamento;
- demais entidades: cubo filtrado pela janela de lançamentos.

As agregações `offerByStandard` e `offerByTypology` passaram a consumir esse universo.

Nenhum número, cidade ou trimestre foi fixado no runtime.

## 4. Comportamento esperado

### FIERGS 4T2025

| Dimensão | Antes | Depois esperado |
|---|---:|---:|
| Padrão | 1.517 | 1.524 |
| Tipologia | 1.517 | 1.524 |
| Cidade | 1.524 | 1.524 |
| Área | 1.524 | 1.524 |

### FIERGS 2T2026

As dimensões continuam fechando em `1.091`, inclusive o distrato de `-1` em quatro ou mais dormitórios.

### Secovi-SP

As tabelas de oferta continuam respeitando o início selecionado, conforme o teste dedicado de janela V4.

## 5. Testes adicionados

Foi incluído cenário 4T2025 com:

- projeto lançado antes do início selecionado;
- projeto lançado dentro da janela;
- venda negativa no projeto antigo;
- comparação por padrão, tipologia, cidade e área;
- fotografia de estoque associada, evitando perda silenciosa de projeto antigo.

O teste verifica que as quatro dimensões fecham no mesmo total derivado da fixture, sem utilizar os números reais do estudo como constante de produção.

O cenário existente de 2T2026 permanece ativo e verifica a substituição de fotografias temporais repetidas pelo fato granular.

## 6. Resultados de validação

### Testes focados

```text
3 arquivos aprovados
20 testes aprovados
```

Arquivos:

- `report-model.test.ts`;
- `v4-launch-window.test.ts`;
- `reconciliation-guards.test.ts`.

### Suíte completa do Panorama

```text
30 arquivos aprovados
238 testes aprovados
```

Os avisos de dimensão zero do Recharts ocorrem no ambiente JSDOM e já existiam; não representam falha de teste.

### TypeScript

```text
npx tsc --noEmit -p tsconfig.app.json
resultado: aprovado
```

### Build

```text
npm run build
resultado: aprovado
```

Permanecem apenas os avisos conhecidos de tamanho de chunks e browserslist desatualizada.

## 7. Arquivos afetados

- `src/features/panorama-secovi-fiergs/report/model.ts`;
- `src/features/panorama-secovi-fiergs/__tests__/report-model.test.ts`;
- este documento de evidência.

Não foram alterados arquivos do Corretor, comparativos, mapas, estilos ou componentes visuais.

## 8. Limites desta fase

- A mesma correção compartilhada faz padrão e tipologia enxergarem a fotografia vertical completa também para oferta final. O portão G2, contudo, não é declarado concluído nesta fase; ele exige sua própria validação formal.
- O consolidado horizontal/VGV ainda usa a janela de lançamentos e permanece para a Fase 3.
- O comparativo de primeiro semestre em 4T2025 permanece para a Fase 5.
- Os 626 pontos dos mapas permanecem para a Fase 4.

## 9. Resultado do portão G1

**G1 aprovado tecnicamente.** A causa do delta de sete unidades está documentada por cidade, projeto e tipologia; padrão, tipologia, cidade e área passam a compartilhar o mesmo fato de fechamento no FIERGS, com regressões explícitas para 4T2025 e 2T2026.
