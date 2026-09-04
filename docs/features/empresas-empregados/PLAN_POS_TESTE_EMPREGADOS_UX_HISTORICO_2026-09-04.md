# Plano pós-teste — Empregados: experiência Brain e viabilidade de histórico

**Data:** 2026-09-04  
**Ambiente:** Rebrain / Lovable / Supabase / Cloud Run  
**Rota:** `/rebrain/empresas-empregados`  
**Monday:** [reBrain — Empresas e Empregados](https://brain381753.monday.com/boards/18398428946/pulses/12880655319) — `12880655319`

## 1. Objetivo

Consolidar a versão validada de **Empregados** como uma experiência Brain de dados:

1. carregamento contextual, calmo e honesto sobre o tempo;
2. filtros e listas suspensas coerentes, acessíveis e sem controles HTML nativos em telas de produto;
3. resultado, cache e exportação apresentados com hierarquia editorial;
4. guidelines que façam novas ferramentas nascerem já no mesmo padrão;
5. decisão sobre histórico anual RAIS baseada em medição gratuita, antes de criar consultas ou batch.

## 2. Escopo e proteções

Incluído:

- UX e aparência de Empregados;
- primitives compartilhados somente quando houver uso real para outras features;
- `FRONTEND_GUIDELINES.md`, `DESIGN_SYSTEM.md` e, se necessário, uma decisão em `FRONTEND_DECISIONS.md`;
- dry run do histórico municipal anual, sem cobrança BigQuery;
- documentação e testes proporcionais.

Fora do escopo:

- ativação de Empresas, Receita/CNPJ, batch mensal ou carga inicial;
- novos dados, tabelas ou Edge Functions de Empresas;
- batch nacional de histórico;
- alteração de secrets, migração remota, deploy ou escrita no Monday sem autorização explícita;
- promessa de tempo de geração sem evidência observada.

## 3. Contrato Brain a formalizar

### 3.1 Carregamento em três níveis

| Nível | Quando | Comportamento obrigatório |
|---|---|---|
| Página lazy | chunk da feature ainda não chegou | estrutura-reserva contextual, sem layout jump; logo Brain discreto somente se perceptível |
| Campo dependente | município/anos em preparação | manter o formulário estável, desabilitar somente o campo dependente e explicar a etapa |
| Operação longa | geração, polling ou exportação relevante | logo Brain, título da etapa, cronômetro decorrido real, prevenção de duplicidade e recuperação clara |

Mensagens iniciais previstas:

- `Confirmando município na RAIS`;
- `Preparando anos disponíveis`;
- `Consultando vínculos, setores e ocupações`;
- `Recuperando relatório já preparado`;
- `Organizando resultado`.

Não usar ETA fixo. Após observabilidade suficiente, uma expectativa pode ser incluída somente se derivada de percentis reais por tipo de operação.

### 3.2 Controles de escolha

- É proibido introduzir `<select>` nativo em páginas React de produto.
- Lista curta: `Select` shadcn/Radix.
- Lista pesquisável: combobox `Popover + Command`.
- Trigger padrão: altura `h-10`, `rounded-lg`, `border-input`, foco por `ring-primary/25` e estado ativo em verde suave.
- Conteúdo flutuante: `rounded-xl`, `border-primary/20`, `bg-popover`, `shadow-md shadow-primary/10`.
- Item selecionado e hover: superfície verde suave, com texto/ícone — cor nunca como único sinal.
- Filtros encadeados limpam opções incompatíveis e explicam brevemente por que estão desabilitados.

### 3.3 Resultado de consulta

- Exibir município, UF, ano, data de referência e fonte como contexto, sem competir com o título.
- Distinguir `consulta agregada concluída` de `resultado reutilizado do cache compartilhado`.
- Manter exportação como ação secundária e local.
- Tabelas preservam busca, ordenação, unidade e contexto de leitura; não reduzem o conteúdo exportado.

## 4. Gates de execução

### P0 — Baseline e inventário

1. Ler guidelines, design system, primitives atuais e feature de Empregados.
2. Mapear todos os controles nativos e os estados de loading atuais.
3. Rodar baseline de testes/build e registrar limitações de ambiente.

**Aceite:** escopo visual fechado; Empresas permanece inteiramente inerte.

### P1 — Primitives Brain compartilhados

1. Criar `BrainLoadingState` com variantes `page`, `field` e `operation`.
2. Definir composição de superfície para `Select` e combobox sem criar um novo design token se os tokens existentes bastarem.
3. Incluir acessibilidade: status vivo, rótulo de progresso, contraste, foco e redução de movimento respeitada.

**Aceite:** primitive não contém regra RAIS; carrega identidade Brain sem virar animação decorativa.

### P2 — Empregados: filtros, loading e resultado

1. Aplicar o contrato aos filtros UF, município e Ano RAIS.
2. Trocar o `<select>` nativo de ordenação de ocupações pelo `Select` shadcn.
3. Mostrar etapa e cronômetro somente durante geração/polling; usar skeleton estrutural no resultado.
4. Ajustar cabeçalho do resultado, card de origem/cache e CTA de exportação.
5. Garantir que erro, retry, estado vazio e cache hit não percam seleção do usuário.

**Aceite:** não há controles quadrados nativos; loading não desloca a página; teclado e mobile continuam funcionais.

### P3 — Guidelines como padrão de novos projetos

1. Ampliar `FRONTEND_GUIDELINES.md` com o contrato de três níveis, proibição de select nativo e checklist de páginas de dados.
2. Ampliar `DESIGN_SYSTEM.md` com composição de popover/select, exemplos de loading e tokens já existentes a usar.
3. Registrar em `FRONTEND_DECISIONS.md` somente a decisão duradoura de primitive compartilhado, se ele for criado.
4. Adicionar checklist de bootstrap para novas features: rota lazy, estados, controles, fonte/recorte e validação visual.

**Aceite:** instruções são acionáveis por Lovable, Codex e desenvolvimento humano, sem exigir conhecimento implícito da feature RAIS.

### P4 — Verificação visual e regressão

1. Verificar desktop e mobile, claro e escuro, foco por teclado e leitura por leitor de tela onde aplicável.
2. Cobrir: página lazy, UF sem cidade, busca municipal, carregamento de anos, geração nova, cache hit, erro recuperável, resultado e exportação.
3. Executar testes direcionados, typecheck, build, lint proporcional e `check:live-docs`.

**Aceite:** evidência visual e headless registrada; nenhuma mudança atinge Empresas ou o contrato de cache atual.

### P5 — Histórico: medição antes de produto

1. Especificar uma única consulta agregada, parametrizada por UF e município, com série anual de vínculos ativos de 1985 a 2025.
2. Executar somente `dryRun: true` no BigQuery, com os mesmos filtros e labels de produção.
3. Registrar bytes estimados para pelo menos três perfis municipais: pequeno, médio e grande; não salvar microdados nem resultado de produção.
4. Comparar o volume com um teto explícito de bytes/custo por primeira geração e propor o cache compartilhado por município + versão.

**Aceite:** decisão documentada como `APROVAR SOB DEMANDA`, `RESTRINGIR RECORTE` ou `NÃO IMPLEMENTAR AGORA`, com números observados — nunca por estimativa intuitiva.

### P5 — Resultado medido em 2026-09-04

Consulta avaliada (somente `dryRun: true`, sem retorno de linhas): série anual de vínculos ativos
em 31/12, filtrada por UF e código IBGE, de 1985 a 2025.

| Perfil | Município | Bytes estimados | Referência on-demand* |
|---|---|---:|---:|
| Pequeno | Acrelândia/AC | 212,5 MiB | ~US$ 0,0013 |
| Médio | Rio Verde/GO | 1.003,4 MiB | ~US$ 0,0060 |
| Grande | Blumenau/SC | 1.929,6 MiB | ~US$ 0,0115 |

\* Estimativa antes da franquia e condicionada ao modelo on-demand. A medição não executou a
consulta nem gerou resultado ou persistência de microdados.

**Decisão proposta:** `APROVAR SOB DEMANDA`, com `maximumBytesBilled` inicial de 3 GiB para a
série básica e cache compartilhado por município + versão da consulta. A série simples é viável;
salários, setores e ocupações históricos continuam fora do escopo até uma medição separada.

## 5. Proposta técnica de histórico, condicionada ao P5

Se os dry runs forem aprovados:

```text
Usuário pede histórico de um município
  -> Edge autenticada valida Bearer
  -> procura série agregada compartilhada por município + queryVersion
  -> hit: devolve pontos anuais
  -> miss: uma query BigQuery agregada e limitada por bytes
  -> grava somente pontos anuais e metadados de custo
  -> gráfico de evolução + variação anual
```

Primeira versão de produto:

- apenas série anual de vínculos ativos em 31/12;
- de 1985 ao último ano RAIS publicado;
- linha temporal, variação anual e maior/menor ponto;
- sem série mensal, pois RAIS é anual;
- sem pré-carga nacional: cache sob demanda e compartilhado entre usuários/sessões.

Indicadores salariais e recortes por setor/ocupação históricos ficam para decisão posterior, pois multiplicam consultas, custo e complexidade interpretativa.

## 6. Critérios de aceite finais

- [ ] Empregados usa somente controles Brain/shadcn, sem `<select>` nativo novo ou remanescente na feature.
- [ ] Estados de loading comunicam etapa e preservam layout; operação longa exibe tempo decorrido real.
- [ ] Não há estimativa de duração sem dado observado.
- [ ] Cache hit, consulta nova, erro e retry são distinguíveis e acessíveis.
- [ ] Guidelines e Design System permitem reproduzir o padrão em nova ferramenta sem depender deste plano.
- [ ] Empresas não recebe rede, banco, batch, dados ou UI além do placeholder atual.
- [ ] Histórico não avança para implementação sem dry run registrado e aprovação explícita de custo.

## 7. Handoff esperado

Antes de iniciar P1, apresentar ao responsável:

1. wireframe breve dos estados de carregamento e das superfícies de seleção;
2. lista dos arquivos/primitives que serão alterados;
3. proposta de redação das guidelines;
4. desenho da consulta de dry run, sem executá-la;
5. confirmação explícita para implementar UX e, separadamente, para executar o dry run.
