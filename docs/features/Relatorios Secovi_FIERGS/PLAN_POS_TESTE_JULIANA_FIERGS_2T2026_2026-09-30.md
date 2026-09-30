# Plano de ação pós-teste Juliana — Panorama FIERGS 2T2026

**Data:** 30/09/2026  
**Estado:** Fases 0 a 3 concluídas tecnicamente; vendas em `1.091`, estoque em `5.251` e horizontal sem chácaras
**Escopo:** correções apontadas por Juliana no arquivo `panorama-alvorada-cachoeirinha-canoas-e-mais-7-2T2026.pptx`  
**Recorte de homologação:** Alvorada, Cachoeirinha, Canoas, Eldorado do Sul, Esteio, Gravataí, Guaíba, Novo Hamburgo, São Leopoldo e Viamão — fechamento 2T2026  
**Artefato de referência:** `assets/panorama-alvorada-cachoeirinha-canoas-e-mais-7-2T2026.pptx`

## 1. Objetivo

Corrigir o Panorama FIERGS para que vendas, oferta final, análises verticais e mercado horizontal sejam derivados de universos reproduzíveis e reconciliados, atendendo integralmente às observações da Juliana e produzindo um novo PowerPoint apto para homologação.

O trabalho só será considerado concluído quando:

1. os totais canônicos estiverem identificados a partir da fonte, sem ajuste manual para “forçar fechamento”;
2. todas as dimensões do mesmo indicador fecharem contra esses totais;
3. condomínios de chácaras estiverem excluídos transversalmente do produto FIERGS;
4. comparativos semestrais e variações solicitadas estiverem presentes;
5. os problemas de clareza, nomenclatura, rótulos e mapas estiverem corrigidos;
6. preview, PDF e PowerPoint apresentarem os mesmos números e estrutura;
7. a Juliana receber uma matriz comentário × correção × evidência para homologação.

## 2. Princípios de execução

- O PowerPoint analisado é evidência do problema e contrato editorial, não fonte automática da verdade numérica.
- Não escolher um total apenas porque ele aparece em mais slides.
- Não alterar dados manualmente para reproduzir um resultado histórico.
- Vendas são fluxo; estoque/oferta final são fotografias de fechamento.
- Uma métrica terá um total canônico e todas as suas dimensões deverão reconciliar com ele.
- Filtros de entidade, cidades, período, segmento e produto devem ser aplicados antes das agregações.
- Ausência de método homologado deve aparecer como indisponibilidade explícita, nunca como zero ou dado reaproveitado.
- Correções visuais só começam depois que os números estruturais estiverem reconciliados.

## 3. Evidências de partida

### 3.1 Vendas verticais divergentes no 2T2026

| Dimensão | Slides | Total observado |
|---|---:|---:|
| Padrão | 25 e 30 | 1.137 |
| Tipologia | 29 | 1.138 |
| Área útil / IVV | 40 | 1.091 |
| Cidade | 31 | 2.317 |

O gerador usa contratos distintos para esses slides: série temporal por padrão, série temporal por tipologia, fonte municipal e cubo granular. A primeira fase deverá explicar as diferenças por linha, cidade, empreendimento e período.

### 3.2 Oferta final vertical divergente

| Dimensão | Slides | Total observado |
|---|---:|---:|
| Série temporal | 35 | 5.459 |
| Tipologia e padrão | 36 e 37 | 4.562 |
| Área, tipologia e faixa de preço | 40, 57 e 58 | 5.251 |

Há três universos concorrentes. A correção exige uma fotografia canônica de fechamento e não apenas ajustes isolados nos componentes.

### 3.3 Mercado horizontal

O slide 63 inclui condomínios de chácaras:

- 2 empreendimentos;
- 110 unidades lançadas;
- 48 unidades finais.

Total atual do slide 63: 131 empreendimentos, 30.586 unidades lançadas e 3.413 unidades finais.  
Total esperado após retirar somente chácaras: 129 empreendimentos, 30.476 unidades lançadas e 3.365 unidades finais.

O slide 64, porém, apresenta 40 empreendimentos, 8.443 unidades lançadas e 2.482 unidades finais. Portanto, a exclusão de chácaras não explica sozinha a divergência; a coorte ou janela temporal também precisa ser reconciliada.

## 4. Escopo funcional das correções

### 4.1 Consistência numérica

- Reconciliar vendas dos slides 25, 27, 28, 29, 30, 31 e 40.
- Reconciliar oferta final dos slides 35, 36, 37, 40, 57 e 58.
- Reconciliar mercado horizontal dos slides 63, 64 e 65.
- Garantir que as dimensões sejam decomposições do mesmo universo quando o título e o período forem equivalentes.

### 4.2 Regras FIERGS

- Excluir `Condomínio de Chácaras` de todas as cidades e análises FIERGS.
- Manter separados vertical, loteamento aberto, loteamento fechado e casas/sobrados quando aplicável.
- No slide 65, substituir `Média Geral` por `Média dos loteamentos`.
- Calcular essa média somente com loteamentos abertos e fechados; excluir casas/sobrados e chácaras.
- Documentar ponderadores de preço, área e R$/m². Não usar média simples entre linhas sem regra aprovada.

### 4.3 Comparações temporais

- Slides 11, 14, 22, 26 e 33: incluir variações equivalentes ao padrão editorial do slide 9.
- Slides 15, 16, 27, 28, 35 e 39: incluir comparação semestral coerente com o fechamento no 2T.
- Preservar a regra contextual para outros fechamentos: semestre no 2T, nove meses no 3T e ano no 4T, caso essa regra permaneça válida após os testes.

### 4.4 Texto e apresentação

- Slide 29: explicitar `dormitórios`.
- Slides 25 e 30: tratar fechamento de 99,9% decorrente do arredondamento.
- Slide 31: retirar sobreposição da legenda.
- Slide 41: substituir o aviso técnico por uma explicação compreensível ou manter a página como indisponível com decisão editorial explícita.
- Slide 43: corrigir colisões de rótulos.
- Slides 67–69: ajustar enquadramento e zoom aos municípios selecionados, preservando legibilidade dos pontos e legendas.

## 5. Fora de escopo desta execução

- Alterar manualmente registros da API para obter os totais desejados.
- Homologar fórmulas ainda abertas de outros produtos ou do Secovi-SP.
- Redesenhar os 75 slides além do necessário para atender o teste.
- Incorporar novas fontes externas sem evidência de que sejam necessárias para o fechamento.
- Corrigir o módulo Corretor ou incluir mudanças não relacionadas no mesmo commit.

## 6. Estratégia de implementação

```text
Congelar cenário 2T2026
        ↓
Auditar contratos e explicar deltas
        ↓
Formalizar universo canônico FIERGS
        ↓
Unificar vendas e oferta final
        ↓
Corrigir horizontal e médias
        ↓
Adicionar guardas e testes
        ↓
Aplicar ajustes editoriais/visuais
        ↓
Validar preview, PDF e PPT
        ↓
Entregar pacote de homologação
```

## 7. Fases detalhadas

> Evidência das Fases 0 e 1: `EVIDENCIA_FASES_0_1_VENDAS_FIERGS_2T2026_2026-09-30.md`.

### Fase 0 — Baseline e proteção do escopo

**Objetivo:** tornar o erro reproduzível antes de alterar o modelo.

**Tarefas:**

- Registrar commit, branch, configuração de entidade e período usados no arquivo da Juliana.
- Confirmar as dez cidades e a exclusão de Porto Alegre do universo numérico.
- Preservar o PowerPoint recebido como artefato de entrada sem edição.
- Gerar uma nova captura do relatório atual e um CSV de auditoria do mesmo recorte.
- Registrar totais atuais por slide e por contrato.
- Identificar eventuais falhas de coleta ou cidades incompletas.
- Criar fixture ou snapshot sanitizado suficiente para reproduzir as divergências em teste.

**Entregáveis:**

- baseline 2T2026 versionado;
- matriz inicial de reconciliação;
- lista de fontes/rotas consultadas;
- relatório de cobertura por cidade.

**Critério de saída:** as divergências 1.137/1.138/1.091/2.317 e 5.459/4.562/5.251 são reproduzíveis fora do PowerPoint.

### Fase 1 — Auditoria de vendas

**Objetivo:** determinar o total canônico de vendas verticais do 2T2026.

**Tarefas:**

- Comparar, por cidade e empreendimento, as linhas da série temporal por padrão, série por tipologia, fonte municipal e cubo granular.
- Verificar se o endpoint municipal contém horizontal, duplicidade mensal/trimestral, snapshots repetidos ou registros fora do período.
- Verificar se a normalização temporal está escolhendo o total trimestral uma única vez quando coexistem meses e trimestre.
- Verificar cobertura de tipologias: registros sem tipologia não podem desaparecer silenciosamente do total.
- Explicar o delta de uma unidade entre padrão e tipologia.
- Explicar as 46 unidades entre 1.137 e 1.091.
- Explicar as 1.180 unidades entre 1.137 e 2.317.
- Escolher a fonte canônica com base em granularidade, cobertura, semântica e rastreabilidade.
- Registrar a decisão metodológica e a fórmula.

**Implementação esperada:**

- criar ou consolidar um fato canônico de vendas;
- derivar dele os agrupamentos por padrão, tipologia, cidade e área;
- preservar uma categoria auditável `Não classificado` quando uma dimensão estiver ausente, em vez de perder unidades;
- impedir soma de linhas incompatíveis.

**Critério de saída:** todos os agrupamentos de vendas fecham contra o total canônico ou apresentam uma diferença explicitamente classificada e bloqueante.

### Fase 2 — Auditoria de oferta final e estoque

**Estado em 30/09/2026:** concluída e aprovada. `5.459`, `4.562` e `5.251` foram explicados; o runtime fecha em `5.251` por padrão, tipologia e área, e Gabriel aprovou explicitamente a PRE-029. Evidência em `EVIDENCIA_FASE_2_ESTOQUE_FIERGS_2T2026_2026-09-30.md`.

**Objetivo:** determinar a fotografia canônica de oferta final no fechamento do 2T2026.

**Tarefas:**

- Comparar série temporal de estoque com o último snapshot granular por empreendimento/tipologia.
- Verificar se o mesmo empreendimento aparece em múltiplas tipologias sem rateio correto.
- Verificar diferença entre `stock`, `typology_stock`, oferta final derivada e campos de fechamento.
- Confirmar se o último mês disponível do trimestre é a fotografia válida.
- Identificar filtros ou janelas aplicados apenas em parte dos slides.
- Separar claramente oferta lançada acumulada de oferta final no fechamento.
- Explicar, por empreendimento, os deltas entre 5.459, 5.251 e 4.562.
- Definir uma única função de totais de universo para o vertical.

**Implementação esperada:**

- fato canônico de fechamento;
- agregadores por padrão, tipologia, área e preço consumindo o mesmo fato;
- proibição de somar snapshots entre meses ou trimestres;
- metadados de período observado para auditoria.

**Critério de saída:** slides 35, 36, 37, 40, 57 e 58 fecham para o mesmo universo e período.

### Fase 3 — Política horizontal FIERGS

**Estado em 30/09/2026:** concluída tecnicamente. Chácaras são rejeitadas nos contratos temporal e granular; a bancada das dez cidades fecha em 129 empreendimentos e 3.365 unidades finais, e produto × coorte compartilham o mesmo universo. Evidência em `EVIDENCIA_FASE_3_HORIZONTAL_FIERGS_2T2026_2026-09-30.md`.

**Objetivo:** aplicar a orientação da Juliana em todo o pipeline, e não somente nos slides finais.

**Tarefas:**

- Alterar a política FIERGS para rejeitar `condominio_chacaras`.
- Aplicar a mesma política aos contratos temporais e ao cubo granular.
- Registrar motivo de rejeição e contagens na auditoria.
- Verificar as dez cidades para grafias e aliases de chácaras.
- Recalcular slides 63–65 e todos os demais totais que incluam horizontal.
- Reconciliar o slide 63, por produto, com o slide 64, por coorte.
- Determinar e documentar a janela de anos do slide 64.
- Implementar `Média dos loteamentos` somente para aberto + fechado.

**Critério de saída:** nenhuma chácara aparece em dados, totais, mapas, médias ou séries da FIERGS; slides 63 e 64 fecham quando representam o mesmo universo.

### Fase 4 — Contratos canônicos e guardas de reconciliação

**Objetivo:** tornar impossível publicar novamente um deck com totais concorrentes sem aviso.

**Tarefas:**

- Introduzir identificadores explícitos de universo, período e modo de agregação nos blocos do relatório.
- Criar uma rotina central de reconciliação antes da renderização/exportação.
- Definir tolerância zero para contagens e tolerância apenas de arredondamento para percentuais/moeda.
- Bloquear exportação ou marcar o relatório como não homologável quando uma invariante crítica falhar.
- Incluir no CSV de auditoria: fonte, fórmula, universo, período observado, total canônico, total dimensional e delta.
- Evitar fallback silencioso entre série temporal e cubo granular.

**Invariantes mínimas:**

```text
vendas_por_padrão = vendas_por_tipologia = vendas_por_cidade = vendas_por_área
estoque_temporal = estoque_por_padrão = estoque_por_tipologia = estoque_por_área
horizontal_por_produto = horizontal_por_coorte
chacaras_fiergs = 0
```

Quando uma dimensão não tiver cobertura completa, ela deverá ser declarada indisponível e não participar de uma igualdade falsa.

**Critério de saída:** uma alteração futura que recrie qualquer divergência falha nos testes ou impede a exportação homologável.

### Fase 5 — Comparativos e regras editoriais

**Objetivo:** atender às solicitações de leitura temporal da Juliana.

**Tarefas:**

- Extrair um componente/função única para variações equivalentes ao slide 9.
- Aplicar o padrão aos slides 11, 14, 22, 26 e 33.
- Criar comparativo de primeiro semestre contra primeiro semestre anterior.
- Aplicar aos slides 15, 16, 27, 28, 35 e 39.
- Verificar denominadores zero e períodos incompletos.
- Definir rótulos consistentes: `2T2025 × 2T2026`, `1S2025 × 1S2026` e variação percentual.
- Garantir que acumulado de 12 meses não seja rotulado como semestre.

**Critério de saída:** todos os slides indicados exibem a comparação solicitada com números cobertos por testes unitários.

### Fase 6 — Clareza e ajustes visuais

**Objetivo:** resolver as observações que não alteram o universo de dados.

**Tarefas:**

- Slide 29: padronizar nomenclatura de dormitórios.
- Slides 25 e 30: aplicar estratégia determinística de arredondamento para fechar 100,0%, ou adicionar nota de arredondamento aprovada.
- Slide 31: reposicionar/remover legenda redundante e revisar margens.
- Slide 41: decidir entre:
  - remover a página do fluxo dinâmico;
  - manter estado de indisponibilidade com texto executivo;
  - implementar a dimensão anual somente se a fonte suportar composição histórica auditável.
- Slide 43: ajustar posição, densidade e colisão dos rótulos.
- Slides 67–69: calcular bounds a partir dos municípios/pontos válidos, aplicar padding e limite de zoom, validar legendas e marcadores.
- Verificar legibilidade na proporção real 16:9 e no arquivo exportado.

**Critério de saída:** nenhuma anotação visual da Juliana permanece reproduzível no preview, PDF ou PowerPoint.

### Fase 7 — Testes automatizados

**Objetivo:** cobrir regra de negócio, agregação e renderização.

**Testes de domínio:**

- FIERGS rejeita chácaras em todas as grafias mapeadas.
- Média dos loteamentos ignora casas/sobrados e chácaras.
- Fluxo mensal e total trimestral coexistentes não duplicam vendas.
- Snapshot usa a última observação válida sem somar meses.
- Registros sem dimensão permanecem no total e aparecem como não classificados.
- Coortes horizontais e agrupamento por produto fecham contra o mesmo universo.

**Testes de reconciliação:**

- vendas fecham entre as quatro dimensões;
- estoque fecha entre as cinco visualizações relevantes;
- percentuais fecham em 100% após formatação;
- comparativos semestrais usam os dois primeiros trimestres de cada ano;
- inconsistência crítica produz falha controlada.

**Testes editoriais/exportação:**

- os 75 slots continuam presentes e ordenados;
- slides corrigidos usam os componentes esperados;
- não há overflow ou colisão detectável nos slides indicados;
- mapas recebem bounds coerentes;
- preview e exportação preservam textos, rótulos e valores.

**Critério de saída:** suíte focal e build passam sem regressões em Secovi-SP e FIERGS.

### Fase 8 — Validação integrada e pacote de homologação

**Objetivo:** entregar uma versão verificável pela Juliana.

**Tarefas:**

- Gerar novamente o recorte das dez cidades no 2T2026.
- Comparar o antes e depois slide a slide.
- Executar a matriz de reconciliação e anexar o resultado.
- Conferir manualmente os slides 9, 11, 14–16, 22, 25–31, 33, 35–43, 57–58 e 63–69.
- Exportar PDF e PowerPoint finais.
- Preparar matriz de resposta às observações.
- Registrar decisões novas em `DECISOES_E_PREMISSAS_PANORAMA.md` apenas após confirmação.

**Pacote de homologação:**

1. PowerPoint corrigido;
2. PDF equivalente;
3. CSV/XLSX de reconciliação;
4. matriz comentário × correção × evidência;
5. lista curta de decisões que ainda dependam da Juliana;
6. identificação do commit/deploy testado.

**Critério de saída:** Juliana consegue validar cada observação sem precisar comparar manualmente fontes ou procurar o que mudou.

## 8. Mapeamento comentário → entrega

| Comentário da Juliana | Slides | Fase responsável | Aceite |
|---|---:|---:|---|
| Incluir variações como no slide 9 | 11, 14, 22, 26, 33 | 5 | Mesmo padrão e períodos comparáveis |
| Incluir comparativo por semestre | 15, 16, 27, 28, 35, 39 | 5 | 1S atual × 1S anterior |
| Soma fecha 99,9% | 25, 30 | 6/7 | 100,0% ou nota metodológica aprovada |
| Incluir “dormitórios” | 29 | 6 | Nomenclatura padronizada |
| Vendas não batem | 29–31, 40 | 1/4 | Todas as dimensões reconciliadas |
| Legenda em cima do gráfico | 31 | 6 | Sem sobreposição em exportação |
| Oferta final diferente | 35–37, 40 | 2/4 | Total único de fechamento |
| Não entendi esse slide | 41 | 6 | Página compreensível ou decisão explícita de indisponibilidade |
| Ajustar rótulos | 43 | 6 | Sem colisões e com leitura em 16:9 |
| Total não bate | 57, 58 | 2/4 | Fecha com o total canônico vertical |
| Desconsiderar chácaras | 63–65 e demais | 3 | Zero chácaras no universo FIERGS |
| Oferta lançada/final não bate | 64 | 3/4 | Produto e coorte reconciliados |
| Média dos loteamentos | 65 | 3 | Somente loteamentos aberto e fechado |
| Dar zoom nos mapas | 67–69 | 6 | Dez cidades enquadradas e pontos legíveis |

## 9. Arquivos e áreas provavelmente afetados

Esta relação é inicial e deverá ser confirmada durante a Fase 0:

- `src/features/panorama-secovi-fiergs/domain/entity-policy.ts`
- `src/features/panorama-secovi-fiergs/domain/cube.ts`
- `src/features/panorama-secovi-fiergs/domain/aggregations.ts`
- `src/features/panorama-secovi-fiergs/report/model.ts`
- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`
- `src/features/panorama-secovi-fiergs/components/MarketSlides.tsx`
- componentes/estilos dos mapas e do layout de impressão;
- testes em `src/features/panorama-secovi-fiergs/__tests__/`;
- documentação de decisões e matriz de homologação.

## 10. Estratégia de commits

Evitar um único commit grande. Sequência sugerida:

1. `test(fiergs): freeze Juliana 2T2026 reconciliation baseline`
2. `fix(fiergs): reconcile canonical vertical sales universe`
3. `fix(fiergs): reconcile closing stock across dimensions`
4. `fix(fiergs): exclude chacara products and align horizontal cohorts`
5. `feat(fiergs): add reconciliation guards and audit evidence`
6. `feat(fiergs): add semester and variation comparisons`
7. `fix(fiergs): address Juliana labels layouts and map bounds`
8. `docs(fiergs): record 2T2026 homologation evidence`

Cada commit deve conter seus testes e não incluir alterações do módulo Corretor ou outros trabalhos locais.

## 11. Portões de qualidade

### Portão A — Fonte compreendida

- deltas de vendas e estoque explicados por linha;
- fonte canônica escolhida com evidência;
- nenhuma correção manual arbitrária.

### Portão B — Modelo reconciliado

**Estado em 30/09/2026:** concluído. Gabriel aprovou os fechamentos canônicos de vendas (`1.091`) e estoque (`5.251`); o horizontal exclui chácaras e reconcilia produto × coorte. Evidências registradas nos documentos das Fases 0–1, 2 e 3.

- invariantes numéricas passando;
- chácaras excluídas;
- horizontal por produto e por coorte coerentes.

### Portão C — Produto corrigido

- comparativos adicionados;
- textos, rótulos, slide 41 e mapas resolvidos;
- 75 posições preservadas.

### Portão D — Exportação validada

- preview, PDF e PowerPoint equivalentes;
- build e testes aprovados;
- matriz comentário × correção completa.

### Portão E — Homologação

- versão disponibilizada para Juliana;
- retorno registrado como decisão ou nova pendência;
- somente após aceite, promover a versão para produção.

## 12. Riscos e respostas

| Risco | Resposta |
|---|---|
| Endpoints representam universos realmente diferentes | eleger fonte canônica e declarar dimensões sem cobertura como indisponíveis |
| Falta de IDs para reconciliar temporal e granular | gerar chaves auditáveis e escalar a necessidade de contrato da API |
| Deck histórico possui intervenções manuais | documentar diferença; não reproduzir manualmente sem regra aprovada |
| Exclusão de chácaras altera outros totais inesperadamente | aplicar filtro na entrada e executar regressão de todos os blocos horizontais |
| Ajuste FIERGS quebra Secovi-SP | preservar políticas por entidade e rodar suítes das duas entidades |
| Layout correto no browser quebra no PPT/PDF | validar os três meios no mesmo commit |
| Mudanças locais não relacionadas entram no trabalho | commits por caminho e revisão de diff antes de cada commit |

## 13. Definition of Done

A execução estará concluída quando todos os itens abaixo forem verdadeiros:

- [x] total canônico de vendas aprovado tecnicamente;
- [x] vendas reconciliadas por padrão, tipologia, cidade e área;
- [x] total canônico de oferta final aprovado tecnicamente;
- [x] oferta reconciliada entre série, padrão, tipologia, área e preço;
- [x] chácaras excluídas de todo o universo FIERGS;
- [x] horizontal por produto e por coorte reconciliado;
- [x] média dos loteamentos implementada com universo correto;
- [ ] variações solicitadas adicionadas;
- [ ] comparativos semestrais adicionados;
- [ ] arredondamento, nomenclaturas, legendas e rótulos corrigidos;
- [ ] slide 41 resolvido editorial e metodologicamente;
- [ ] mapas enquadrados nas dez cidades;
- [ ] testes de domínio, reconciliação, interface e exportação aprovados;
- [ ] build de produção aprovado;
- [ ] PowerPoint e PDF finais inspecionados;
- [ ] matriz de resposta à Juliana preenchida;
- [ ] versão homologada pela Juliana antes da promoção para produção.

## 14. CTA de execução

Para iniciar este plano, usar a seguinte instrução:

> Execute o plano `PLAN_POS_TESTE_JULIANA_FIERGS_2T2026_2026-09-30.md`, começando pelas Fases 0 e 1. Preserve todas as alterações locais não relacionadas, não altere números manualmente e não avance para os ajustes visuais antes de apresentar a matriz de reconciliação das vendas com a causa dos deltas 1.137, 1.138, 1.091 e 2.317. Ao concluir cada portão, registre evidências, execute os testes proporcionais e informe os arquivos e decisões afetados.

### Primeiro checkpoint esperado

Antes de qualquer mudança estrutural no relatório, apresentar:

1. reprodução automatizada dos quatro totais de vendas;
2. decomposição do delta por cidade, empreendimento, período e fonte;
3. recomendação fundamentada do total/fonte canônica;
4. impacto esperado nos slides 25, 27–31 e 40;
5. testes que serão adicionados para impedir regressão.

