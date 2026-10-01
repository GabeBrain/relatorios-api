# Plano de ação técnico — regressão multiperíodo do Panorama FIERGS 4T2025

**Data:** 30/09/2026  
**Estado:** pronto para execução  
**Origem:** revisão do PDF gerado após os ajustes da homologação 2T2026  
**Artefato analisado:** `assets/panorama-alvorada-cachoeirinha-canoas-e-mais-7-4T2025 (7).pdf`  
**Recorte:** Alvorada, Cachoeirinha, Canoas, Eldorado do Sul, Esteio, Gravataí, Guaíba, Novo Hamburgo, São Leopoldo e Viamão — fechamento 4T2025

## 1. Objetivo

Generalizar as reconciliações aprovadas no FIERGS 2T2026 para qualquer fechamento disponível, começando por 4T2025, sem fixar totais, períodos ou cidades no código.

O trabalho deve garantir que vendas, oferta final, mercado horizontal, comparativos temporais, consolidado e mapas sejam projeções do mesmo universo canônico quando os títulos declararem o mesmo recorte.

## 2. Diagnóstico do PDF 4T2025

### 2.1 Pontos que funcionaram

- O arquivo possui as 75 páginas esperadas.
- A apresentação visual está estável e legível.
- Os slides principais de vendas por padrão, tipologia, cidade e área exibem `1.524` unidades.
- Percentuais visíveis fecham em `100%` nas distribuições revisadas.
- A página de IVV anual informa corretamente a indisponibilidade metodológica.
- Chácaras não aparecem como tipo horizontal.
- Mapas possuem enquadramento, escala e legendas.
- O novo nome institucional do download foi implementado separadamente.

### 2.2 Divergências bloqueantes

| Família | Lâminas/evidências | Total A | Total B | Delta | Situação |
|---|---|---:|---:|---:|---|
| Vendas verticais | padrão, tipologia, cidade e área × consolidado geral | 1.524 | 1.517 | 7 | bloqueante |
| Oferta final vertical | série, área e metragem × tipologia, padrão e consolidado | 5.855 | 5.448 | 407 | bloqueante |
| Horizontal | consolidado geral × produto/coorte | 58 emp.; 11.563 lançadas; 2.364 finais | 121 emp.; 28.413 lançadas; 2.840 finais | universo incompatível | bloqueante |
| Comparativo contextual | relatório encerrado em 4T2025 | `1S2024 × 1S2025` | fechamento anual esperado | n/a | editorial/metodológico |
| Mapas | páginas 67–69 | 626 pontos | universo de projetos ainda não demonstrado | n/a | precisa auditoria |

### 2.3 Hipóteses técnicas a confirmar

As hipóteses abaixo orientam a investigação, mas não devem ser aceitas sem matriz de evidências:

1. o fechamento granular pode estar sendo substituído apenas em alguns contratos temporais;
2. componentes FIERGS podem consumir `granular`, `closingFacts`, `sales/stock` e `cityComparisons` por caminhos diferentes;
3. tipologias sem classificação ou com cobertura parcial podem explicar parte dos deltas `7` e `407`;
4. o universo horizontal de produto pode usar a fotografia completa, enquanto o consolidado usa projetos ativos ou outra coorte;
5. a regra `firstSemester: trimestre >= 2` mantém o primeiro semestre mesmo no 3T e 4T;
6. os mapas podem operar por linha/coordinate em vez de empreendimento único, produzindo duplicidades por tipologia ou snapshot.

## 3. Princípios obrigatórios

- Não alterar números manualmente para fazer o relatório fechar.
- Não codificar exceções para `2T2026` ou `4T2025`.
- Vendas são fluxo; oferta final é fotografia de fechamento.
- O período canônico deve ser derivado de `scope.endQuarter`.
- Todo total deve possuir origem, universo, chave de deduplicação e período observável.
- Ausência de classificação deve permanecer auditável como `Não classificado`.
- Uma divergência crítica deve bloquear PDF e PPT, não apenas aparecer no CSV.
- Ajustes visuais só podem ser feitos depois dos portões numéricos.
- Não alterar `src/features/corretor` nem incorporar arquivos locais não relacionados.

## 4. Resultado esperado

Ao final:

1. todas as dimensões verticais de vendas fecham no mesmo total do período selecionado;
2. todas as dimensões de oferta final vertical fecham na mesma fotografia;
3. produto horizontal, coorte e consolidado partem do mesmo conjunto de projetos, com diferenças apenas quando o título declarar outro universo;
4. os comparativos contextuais mudam conforme o trimestre de fechamento;
5. mapas informam quantidade de empreendimentos únicos e reconciliável;
6. 4T2025 e 2T2026 passam pela mesma suíte de invariantes;
7. preview, PDF, PPT e auditoria contêm os mesmos totais.

## 5. Estratégia

```text
Congelar fixtures 4T2025 e 2T2026
             ↓
Produzir matriz por chave e fonte
             ↓
Unificar fato canônico de fechamento
             ↓
Derivar todas as dimensões do mesmo fato
             ↓
Reconciliar horizontal e mapas
             ↓
Corrigir comparativo contextual
             ↓
Adicionar guardas multiperíodo
             ↓
Gerar PDF/PPT e homologar
```

## 6. Fases e portões

### Fase 0 — Baseline reproduzível

**Objetivo:** transformar o PDF em caso de regressão reproduzível antes de mudar o modelo.

**Tarefas:**

- preservar o PDF recebido como entrada, sem edição;
- registrar commit, entidade, cidades, início, fechamento e versão do motor;
- capturar auditoria bruta das fontes temporal, granular, municipal e coorte;
- congelar fixtures mínimas de 4T2025 e reutilizar a bancada de 2T2026;
- registrar, por lâmina, o contrato consumido e o total exibido;
- comprovar cobertura das dez cidades e listar falhas de coleta;
- criar a matriz `fonte × projeto × tipologia × cidade × período`.

**Evidência:** documento de baseline e CSVs sanitizados com os deltas `7`, `407` e horizontal.

**Portão G0:** todos os deltas são reproduzíveis por teste ou script; nenhuma correção de código começa antes disso.

### Fase 1 — Reconciliação dinâmica de vendas verticais

**Objetivo:** eliminar o delta `1.524 × 1.517` e impedir sua recorrência.

**Tarefas:**

- identificar quais sete unidades aparecem em área/padrão/tipologia e não no consolidado;
- comparar `project.soldUnits` com a soma de `typology.soldUnits` por chave canônica;
- verificar distratos, valores nulos, tipologia ausente e projetos repetidos;
- verificar se componentes FIERGS usam fatos distintos para distribuição e consolidado;
- formalizar uma coleção `closingVerticalSalesFacts` independente do período;
- derivar padrão, tipologia, cidade, área e consolidado dessa coleção;
- preservar linhas sem dimensão em `Não classificado` em vez de descartá-las.

**Arquivos prováveis:**

- `src/features/panorama-secovi-fiergs/report/model.ts`;
- `src/features/panorama-secovi-fiergs/domain/cube.ts`;
- `src/features/panorama-secovi-fiergs/domain/aggregations.ts`;
- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`;
- testes de reconciliação FIERGS.

**Portão G1:** padrão = tipologia = cidade = área = consolidado, com delta zero em 4T2025 e 2T2026.

### Fase 2 — Reconciliação dinâmica de oferta final vertical

**Objetivo:** explicar e eliminar o delta `5.855 × 5.448`.

**Tarefas:**

- decompor as 407 unidades por cidade, empreendimento e tipologia;
- confirmar a última fotografia válida dentro do trimestre;
- identificar projetos com `finalUnits` no projeto e cobertura tipológica parcial;
- proibir soma de fotografias mensais ou trimestrais;
- definir `closingVerticalStockFacts` com chave e data de observação;
- derivar série de fechamento, padrão, tipologia, área, metragem, preço e consolidado do mesmo fato;
- declarar `Não classificado` quando a dimensão não estiver disponível;
- revisar pesos usados em IVV e preços para apontarem ao mesmo estoque de fechamento.

**Portão G2:** todas as dimensões verticais de estoque fecham com delta zero nos dois períodos de regressão.

### Fase 3 — Universo horizontal único

**Objetivo:** resolver a diferença entre `58/11.563/2.364` e `121/28.413/2.840`.

**Tarefas:**

- listar as chaves presentes em cada universo e classificar os excluídos;
- verificar filtros de atividade, coorte, janela de lançamento, subtipo e cobertura tipológica;
- manter chácaras excluídas transversalmente;
- definir um conjunto canônico horizontal por `scope.endQuarter`;
- decidir, com evidência, se casas/sobrados participam de produto, coorte e consolidado;
- quando dois slides precisarem de universos diferentes, alterar título e nota metodológica explicitamente;
- derivar produto e coorte do mesmo conjunto sempre que ambos disserem “mercado atual”.

**Portão G3:** produto, coorte e consolidado fecham ou exibem uma diferença intencional documentada e testada.

### Fase 4 — Mapas reconciliáveis

**Objetivo:** explicar os 626 pontos e impedir contagem de linhas como empreendimentos.

**Tarefas:**

- identificar a chave usada em cada marcador;
- deduplicar snapshots e tipologias do mesmo empreendimento;
- separar pontos válidos, sem coordenada, fora do recorte e rejeitados pela política;
- mostrar no mapa “empreendimentos georreferenciados”, não “pontos”, quando essa for a semântica real;
- criar auditoria `universo total → com coordenada válida → renderizado`;
- garantir que padrão, estoque e preço usem o mesmo conjunto de localizações.

**Portão G4:** o número mostrado no mapa é reproduzível a partir das chaves únicas e não excede o universo elegível sem explicação explícita.

### Fase 5 — Comparativos contextuais por trimestre

**Objetivo:** impedir que um fechamento 4T continue destacando apenas o primeiro semestre.

**Regra proposta:**

| Fechamento | Comparativo contextual |
|---|---|
| 1T | 1T ano anterior × 1T ano atual |
| 2T | 1S ano anterior × 1S ano atual |
| 3T | 9M ano anterior × 9M ano atual |
| 4T | ano anterior × ano atual |

Para métricas de fotografia, comparar o fechamento equivalente; para fluxos, acumular os trimestres completos da janela.

**Tarefas:**

- substituir a condição genérica `trimestre >= 2` por uma política explícita;
- incluir tipos `nine_months` e `year_to_date` ou equivalente sem ambiguidade;
- garantir completude antes de calcular variação;
- não tratar ausência como zero;
- atualizar títulos, rótulos e testes para os quatro trimestres.

**Arquivos prováveis:**

- `src/features/panorama-secovi-fiergs/domain/period-comparisons.ts`;
- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`;
- `src/features/panorama-secovi-fiergs/__tests__/period-comparisons.test.ts`.

**Portão G5:** 4T2025 exibe comparação anual; 2T2026 continua exibindo comparação semestral correta.

### Fase 6 — Guardas de exportação multiperíodo

**Objetivo:** impedir que um PDF com deltas críticos seja baixado.

**Tarefas:**

- generalizar invariantes hoje validados principalmente contra 2T2026;
- executar as guardas para qualquer `scope.endQuarter`;
- incluir vendas, estoque, horizontal e mapas;
- emitir deltas com fonte, dimensão, período e total canônico;
- bloquear PDF e PPT quando uma invariável crítica falhar;
- permitir indisponibilidade somente quando o contrato editorial a declarar.

**Portão G6:** uma fixture propositalmente divergente bloqueia exportação; fixtures reconciliadas de 4T2025 e 2T2026 liberam exportação.

### Fase 7 — Regressão, build e homologação

**Testes mínimos:**

- unitários de fato canônico e deduplicação;
- reconciliação por padrão, tipologia, cidade, área e consolidado;
- horizontal por produto e coorte;
- quatro fechamentos contextuais: 1T, 2T, 3T e 4T;
- renderização das 75 páginas;
- auditoria de mapas;
- `npx vitest run src/features/panorama-secovi-fiergs`;
- `npx tsc --noEmit -p tsconfig.app.json`;
- `npm run build`.

**Homologação visual:**

- gerar PDF e PPT de 4T2025 e 2T2026;
- comparar totais com CSV de auditoria;
- inspecionar as páginas 25, 29–31, 35–41, 57–61 e 63–69;
- confirmar nomes `panorama-fiergs-rs-{período}` e `panorama-secovi-sp-{período}`;
- produzir matriz antes/depois e pacote para Juliana.

**Portão G7:** zero divergências críticas, testes e build aprovados, PDF/PPT inspecionados e evidências anexadas.

## 7. Testes de aceitação

| ID | Cenário | Aceite |
|---|---|---|
| AC-01 | vendas FIERGS 4T2025 | todas as dimensões fecham no mesmo total |
| AC-02 | estoque FIERGS 4T2025 | todas as dimensões fecham na mesma fotografia |
| AC-03 | regressão FIERGS 2T2026 | permanece reconciliado sem números fixos |
| AC-04 | horizontal | produto, coorte e consolidado compartilham universo declarado |
| AC-05 | mapas | contagem baseada em empreendimento único e auditável |
| AC-06 | comparativo 2T | primeiro semestre equivalente |
| AC-07 | comparativo 4T | ano anterior × ano atual |
| AC-08 | dados incompletos | ausência não vira zero e exportação crítica é bloqueada |
| AC-09 | nomes de arquivo | entidade e período, sem lista das dez cidades |
| AC-10 | artefatos | preview, PDF, PPT e CSV apresentam os mesmos totais |

## 8. Evidências exigidas por fase

Cada fase deve gerar um Markdown com:

- hipótese avaliada;
- consulta ou script utilizado;
- matriz antes/depois;
- arquivos alterados;
- decisões metodológicas;
- testes executados e resultados;
- riscos ou pendências;
- hash do commit isolado.

## 9. Sequência de commits sugerida

1. `test(fiergs): reproduce 4T2025 cross-dimension deltas`
2. `fix(fiergs): generalize canonical vertical closing facts`
3. `fix(fiergs): reconcile horizontal scope across periods`
4. `fix(fiergs): deduplicate map project universe`
5. `fix(fiergs): adapt contextual comparisons by quarter`
6. `test(fiergs): gate multiperiod exports on reconciliation`
7. `docs(fiergs): record 4T2025 homologation evidence`

Cada commit deve usar `git add` explícito e excluir mudanças não relacionadas.

## 10. Fora de escopo

- editar manualmente o PDF recebido;
- fixar os números 1.524, 1.517, 5.855 ou 5.448 no runtime;
- alterar dados da API para obter fechamento;
- redesenhar lâminas sem relação com as divergências;
- modificar o Corretor ou sua pasta de referências;
- publicar uma nova versão como homologada antes do G7.

## 11. Definição de pronto

O plano estará concluído apenas quando o mesmo algoritmo reconciliar 4T2025 e 2T2026, os comparativos responderem ao trimestre selecionado, os mapas forem auditáveis, as guardas impedirem novas exportações divergentes e Juliana receber PDF, PPT, auditoria e matriz de correções consistentes entre si.
