# Plano terminal — Panorama V3.1: correção horizontal validada por Juliana

**Data:** 02/set/2026  
**Executor:** Terra  
**Rota:** `/rebrain/panorama-secovi-fiergs`  
**Card:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`  
**Estado inicial:** a V3 está em produção/teste, a parte vertical foi aprovada por Juliana e a parte
horizontal de Jundiaí saiu zerada.  
**Estado terminal esperado:** uma V3.1 testada e pronta para publicação, após a qual Gabriel gera
Jundiaí e compara o novo PDF com o e-mail de Juliana.

> Este plano autoriza alteração de código, testes e documentação no repositório. Não autoriza
> `git push`, deploy, escrita no Monday nem contato com Juliana. Ao terminar, o Terra deve entregar
> um commit local isolado e pedir autorização para publicação.

---

## 1. Resultado obrigatório

Corrigir o universo horizontal do Panorama sem reintroduzir loteamentos e sem regredir a parte
vertical. O mesmo recorte aplicado por Juliana no Relatório de Acompanhamento deve produzir, em
Jundiaí/SP, de `1T2023` a `2T2026`:

| Trimestre | Unidades lançadas | Unidades vendidas líquido |
|---|---:|---:|
| 1T2023 | 0 | 28 |
| 2T2023 | 0 | 31 |
| 3T2023 | 0 | 10 |
| 4T2023 | 0 | 4 |
| 1T2024 | 0 | 1 |
| 2T2024 | 0 | 6 |
| 3T2024 | 0 | 1 |
| 4T2024 | 162 | 57 |
| 1T2025 | 0 | 0 |
| 2T2025 | 266 | 122 |
| 3T2025 | 0 | 18 |
| 4T2025 | 0 | 52 |
| 1T2026 | 0 | 23 |
| 2T2026 | 0 | 16 |
| **Total** | **428** | **369** |

Esses valores não são estimativa: foram reproduzidos em 02/set/2026 no contrato autenticado da
GeoBrain, usando `building_type=Horizontal`, `group_by=Padrão` e os grupos selecionados no print de
Juliana.

---

## 2. Diagnóstico fechado

### 2.1 O erro da V3

`SECOVI_SP_V3_POLICY` só aceita horizontal quando encontra um rótulo explícito de produto
`Condomínio de Casas/Sobrados`. Em Jundiaí, o contrato V2 devolve 56 horizontais, mas os imóveis que
compõem o recorte de Juliana aparecem por padrão socioeconômico (`Médio`, `Médio-Alto`, `Standard`,
`Alto`, `Luxo`) e não têm `building_subtype` preenchido. A V3 interpreta a ausência do subtipo como
universo vazio e imprime zero.

### 2.2 O contrato que reconcilia

Os contratos `temporal-analysis-city/{releases,sales,stock,ivv,medium-prices,medium-prices-meter}`
com `group_by=Padrão` devolvem `building_type` e `group`. Isso permite:

- manter os grupos socioeconômicos escolhidos por Juliana;
- excluir explicitamente `Loteamento Fechado`, `Loteamento Aberto` e `Condomínio de Chácaras`;
- preservar Vertical e Horizontal como segmentos distintos;
- reconciliar exatamente os 428 lançamentos e as 369 vendas.

O firewall atual trata o contrato municipal inteiro como Vertical. Essa decisão foi segura contra
loteamentos, mas agora é excessiva: o agrupamento por Padrão permite filtrar o horizontal antes do
consumo editorial.

### 2.3 IVV por Tipologia

`ivv?group_by=Tipologia` é um defeito externo da API, não timeout:

- retorna `500 {"message":"Server Error"}` em aproximadamente 87–196 ms;
- falha com Vertical, Horizontal ou ambos;
- falha em um trimestre ou na janela completa;
- o OpenAPI declara `Tipologia` como opção suportada.

`ivv?group_by=Padrão` responde `200`. A página de IVV por faixa de área já usa a identidade PRE-009
sobre o cubo granular e deve continuar assim. Nunca converter falha do IVV por Tipologia em zero.

---

## 3. Regras de produto que a implementação deve preservar

1. O escopo desta correção é **Secovi-SP**. Não habilitar nem inferir política para `fiergs-rs`, que
   continua sem regra de universo formalizada.
2. Grupos socioeconômicos aceitos no recorte horizontal:
   `Compacto`, `Econômico`, `Standard`, `Médio`, `Médio-Alto`, `Alto` e `Luxo`.
3. `Condomínio de Casas/Sobrados` continua sendo rótulo aceito quando realmente vier na fonte.
4. Grupos de produto excluídos continuam excluídos: loteamentos, chácaras, terrenos, glebas,
   desmembramentos e equivalentes já cobertos por `classifyHorizontalLabel`.
5. Rótulo novo/desconhecido não entra silenciosamente: registrar como não mapeado e tornar a
   indisponibilidade visível na evidência técnica.
6. Nome comercial do empreendimento não é evidência de classificação.
7. O filtro é aplicado **antes** de totais, percentuais, médias, narrativas e comparações.
8. Uma mesma definição de escopo deve alimentar lançamentos, vendas, estoque, IVV, preços, VGV,
   resumo geral, páginas horizontais e narrativa.
9. Zero significa valor observado ou universo realmente vazio; falha/ausência de fonte significa
   `Indisponível`/`—` com motivo rastreável.

---

## 4. Implementação em ordem terminal

### T0 — Congelar a evidência antes de mudar o runtime

1. Evoluir o diagnóstico autenticado para produzir uma seção específica de Jundiaí com:
   grupos retornados, grupos aceitos/excluídos, séries trimestrais e totais.
2. Não versionar Bearer, e-mail, senha nem payload cru com dado sensível. A credencial continua em
   `.secrets/geobrain.env`.
3. Criar fixture mínimo versionado com os valores necessários para reproduzir 428/369 e ao menos
   um grupo de loteamento com valores altos, provando que ele não contamina o resultado.

**Gate T0:** teste vermelho no código atual demonstrando que a V3 imprime zero onde o contrato
filtrado contém 428 lançamentos e 369 vendas.

### T1 — Centralizar a política de grupos horizontais

1. Em `domain/entity-policy.ts`, separar explicitamente:
   - segmento (`Vertical`/`Horizontal`);
   - grupo socioeconômico aceito;
   - produto horizontal excluído;
   - rótulo desconhecido.
2. Criar uma função pura única para classificar uma linha temporal pelo par
   `{ building_type, group }`. Não duplicar regex/listas em `api.ts`, `model.ts` ou JSX.
3. Reusar `canonicalStandard`, `classifyHorizontalLabel` e a ordem canônica existentes.
4. Não transformar padrão socioeconômico em subtipo fictício. Editorialmente o bloco pode continuar
   chamado `Condomínio de Casas`, mas a proveniência deve dizer que o recorte veio dos grupos de
   Padrão selecionados pela área.

**Gate T1:** testes unitários para todos os grupos aceitos, todos os excluídos conhecidos, acentos,
caixa, valores vazios e rótulo desconhecido.

### T2 — Aplicar o escopo no cubo e nos lançamentos

1. Ajustar a elegibilidade dos horizontais em `domain/cube.ts` para não depender de
   `building_subtype` ausente quando o padrão socioeconômico observado no período é aceito.
2. Preservar a precedência de exclusão: evidência explícita de loteamento/chácara não pode ser
   anulada por um padrão socioeconômico de outro momento sem uma regra temporal comprovada.
3. Para métricas por período, classificar pelo `pattern` daquele período; para snapshot de fechamento,
   usar o último padrão válido até `endQuarter`, mantendo PRE-027.
4. Deduplicar por cidade + `building_id` antes de contagens de empreendimento.
5. Reconciliar `launchRecordsFromCube` com `releases?group_by=Padrão` no recorte-âncora.

**Gate T2:** a série horizontal de Jundiaí fecha exatamente em 428, sem nenhuma unidade de
loteamento, e as séries verticais permanecem idênticas ao baseline da V3.

### T3 — Corrigir o firewall das séries temporais

1. Substituir a regra “todo contrato municipal é Vertical” por uma filtragem por linha:
   - Vertical continua Vertical;
   - Horizontal aceito permanece Horizontal;
   - Horizontal excluído é removido;
   - desconhecido não vira zero nem é incorporado ao total.
2. Aplicar a função pura de T1 a `byGroup`, `groupSeries`, totais e fontes por cidade antes de chamar
   `marketBlock`/normalizadores.
3. Recalcular `horizontalSeries.attributable`: será verdadeiro quando todas as linhas horizontais
   publicadas tiverem passado pela classificação e não houver grupo desconhecido contaminando a
   série.
4. Não somar percentuais nem médias. Fluxos (`releases`, `sales`, VGV) somam; snapshots (`stock`) usam
   fechamento; taxas (`ivv`) usam numerador/denominador ou valor do grupo, conforme o contrato já
   reconciliado; preços usam ponderação existente.

**Gate T3:** vendas fecham exatamente em 369 e estoque, IVV por Padrão, preço e preço/m² apresentam
linhas horizontais não zeradas sem publicar grupos excluídos.

### T4 — Consumidores editoriais e estados

Rever todos os consumidores, sem alterar o padrão visual institucional já homologado:

- tabelas/gráficos de lançamentos e vendas por tipo;
- resumo geral do mercado;
- oferta e participação por padrão;
- bloco horizontal, preços e VGV;
- comparativos multicidade;
- narrativas e fatos derivados;
- fontes, indisponibilidade e sumário condicional.

Estados obrigatórios conforme `FRONTEND_GUIDELINES.md`: carregando, erro, fonte indisponível, universo
realmente vazio, sucesso e sucesso parcial. Não criar novo token, primitive ou linguagem visual.

**Gate T4:** nenhuma página contém `Loteamento`, `Chácara` ou valor pertencente a esses grupos; o
bloco horizontal aparece em Jundiaí com dados; não há combinação impossível de zero empreendimentos
com unidades/oferta positivas.

### T5 — IVV resiliente

1. Manter o circuit breaker exclusivo de `ivv + Tipologia`; uma confirmação 5xx abre o circuito e
   evita chamadas repetidas no restante da geração.
2. Manter `offerByAreaBand`/PRE-009 como fonte da página de IVV por área útil.
3. Usar `ivv + Padrão` para as páginas por padrão após a filtragem de T3.
4. Se o cálculo granular não tiver base, imprimir `Indisponível`; nunca `0,0%` por falha.
5. Registrar no dossiê: endpoint, agrupamento, HTTP e se houve cálculo granular substituto.

**Gate T5:** teste com 500 por Tipologia prova que o relatório conclui, não repete chamadas, não
publica zero fabricado e mantém IVV por Padrão quando esse contrato responde 200.

### T6 — Regressão integral

Executar, no mínimo:

1. testes unitários de política, cubo, agregações, normalização temporal, firewall e narrativa;
2. regressão das 40 correções JG-01…JG-40;
3. cenário Playwright de Jundiaí com fixture 428/369 + loteamento contaminante;
4. cenários Praia Grande e Baixada existentes;
5. comparação manifesto = preview = PDF = PPT;
6. busca textual negativa por grupos excluídos no deck inteiro;
7. `npm test`, `npm run typecheck` e `npm run build`;
8. `npm run check:live-docs -- <base> <head>` antes de qualquer push.

**Gate T6:** tudo verde, sem atualização arbitrária de snapshot para esconder divergência.

### T7 — Evidência e handoff para Gabriel

Produzir em `.tmp/` ou na pasta de evidência já adotada:

- matriz trimestre a trimestre de lançamentos e vendas com esperado × obtido × diferença;
- inventário dos grupos horizontais aceitos, excluídos e desconhecidos;
- lista de páginas afetadas e respectivas fontes;
- contagem de páginas de manifesto, preview, PDF e PPT;
- resultado dos testes/build;
- limites não verificáveis localmente, se houver.

Atualizar `docs/projetos/LIVE_rebrain.md` com a implementação real e o hash do commit. Não escrever no
Monday. Fazer commit com `git add` explícito apenas dos arquivos desta entrega.

**Sinal terminal obrigatório:**

```text
TERRA_READY_FOR_GABRIEL
Jundiaí fixture: 428 lançadas / 369 vendidas — PASS
Grupos excluídos no deck: 0 — PASS
IVV Tipologia 500: degradado sem zero fabricado — PASS
Preview/PDF/PPT: paridade — PASS
Commit: <hash>
Push/deploy: não realizados; aguardando autorização
```

Depois desse sinal e da publicação autorizada, Gabriel gera Jundiaí no ambiente real e traz o PDF
para a comparação final com o e-mail de Juliana. O e-mail de resposta só é redigido depois dessa
comparação.

---

## 5. Critérios de não regressão

A entrega é rejeitada se qualquer item abaixo ocorrer:

- incluir loteamento/chácara para fazer os totais baterem;
- inferir produto pelo nome comercial;
- fazer hardcode de Jundiaí ou dos números 428/369 no runtime;
- substituir falha de API por zero;
- remover páginas ou métricas para evitar divergência;
- usar o endpoint quebrado de IVV por Tipologia como única fonte;
- mudar a parte vertical, os 40 comentários de Juliana ou o layout institucional sem necessidade;
- habilitar FIERGS-RS pela política Secovi-SP;
- publicar, fazer deploy ou escrever no Monday sem autorização humana.

---

## 6. CTA para o Terra

> Terra, execute integralmente o arquivo
> `docs/features/Relatorios Secovi_FIERGS/opus-v3-closure/PLAN_TERRA_CORRECAO_HORIZONTAL_JUNDIAI_V3_1_2026-09-02.md`.
> Comece pelo teste vermelho T0, implemente T1–T5 na ordem, rode a regressão T6 e só encerre após
> produzir a evidência T7 e o sinal `TERRA_READY_FOR_GABRIEL`. Preserve a vertical e as 40 correções
> da V3, não use nome comercial para classificar, não transforme falha em zero e não faça push,
> deploy ou escrita no Monday. Se algum valor-âncora não fechar em 428/369, pare antes de alterar
> snapshots e reporte a primeira fronteira divergente com o payload sanitizado.
