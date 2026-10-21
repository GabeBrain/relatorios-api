# Contrato candidato e plano de validação

**CONTRATO EXTERNO PENDENTE,21/10/2026.** Motor e ensaio em memória implementados localmente; contrato de arquivo ainda interno/proposto. Não são nomes de campos nem formato de retorno confirmados do Geobrain. Consultar MANIFESTO.md e [reprodução](REPRODUCAO_E_HANDOFF.md); reconciliar com Edgar/MD antes de automatizar.

## Entradas mínimas do cálculo horizontal

- Categoria explicitamente mapeada: loteamento aberto ou fechado. Não inferir por texto parcial nem habilitar casas/vertical com coeficientes horizontais sem validação.
- Unidades lançadas, unidade de análise (empreendimento/tipologia), revisões de oferta e data de corte.
- Meses de mercado na convenção do modelo, incluindo mês de lançamento e competência do dado.
- Vendas líquidas acumuladas e proveniência. Confirmar relação vendas brutas−distratos e significado de estoque atual/revisões.
- Para comparação, histórico mensal real suficiente e marcação inequívoca de observado/estimado; não usar valores futuros no cálculo nem estimativas anteriores como se fossem coleta.

## Identificação e rastreabilidade do lote

Definir identificadores estáveis de cidade,empreendimento,tipologia (se aplicável),competência e categoria. Campos internos candidatos: `buildingId`, `cityId`, `competence`, `pattern`, `launchedUnits`, `marketMonths`, `netSoldUnits`, `sourceType`, `modelVersion`, `parameterVersion`, `cutoffDate`. Não exportar esses nomes como contrato Geobrain antes de comparar com o arquivo oficial.

Registrar por execução: data de corte, versão/modelo, entradas, validações e avisos, previsões, campos preservados, hash do arquivo e parâmetros. As saídas devem permitir reproduzir a execução com a mesma entrada e versão. Sem exigir novo banco para o primeiro piloto; base/histórico real e resultados ficam locais ignorados.

## Saídas candidatas

Mensalmente: mês/calendário, unidades vendidas previstas, acumulado, estoque e fração vendida; indicadores próximos6/12meses e esgotamento. Deixar claro previsão versus observação. Faixas central/ampla só após receber método de cálculo/calibração. Relatório retrospectivo com curva e baselines. Arquivo de retorno separado, sujeito à revisão Edgar e compatibilidade Geobrain, com campos originais preservados.

## Decisões em aberto antes de aceitar o motor

1. Nomes/tipos/semântica de `estimation` e transcrição `IVV BET`, nível geográfico e temporal, arredondamentos, identidade e contrato oficial de exportação/importação.
2. Regrasn=0, vendas zero, esgotado, lançadas zero, percentuais inválidos, `k<=0`, distratos e vendas líquidas negativas; não fabricar resultados com clamp/epsilon silencioso.
3. Regra exata de cruzamento95%, cauda5/6meses e cenários já acima95%; conservação de unidades quando resultado é fracionário. Coeficientes arredondados do PPT podem diferir do código original.
4. Meses corridos versus observados, competência faltante, revisão de lançamentos, distinção de tipologias e janela de calibração.
5. Seleção/coleta histórica: estoques0–5/acima30, unidades desses limiares e critérios de alternância. Separar isso da equação.
6. Correção INCC: fonte,série,competência e necessidade no primeiro piloto; modelo de vendas não define política de preços.
7. Reconciliação ao chegar observação real: responsabilidade, rastreabilidade e tratamento de diferença em vendas/distratos. Não editar passado automaticamente.
8. Método oficial das bandas, modelo vertical, casas/curva geral e autorização para ampliar categorias.

## Sequência proposta

### M0 — Material e contrato

Conferir MD/código original e base de exemplo com Edgar. Separar políticas confirmadas de hipóteses. Se material não chegar, reproduzir apenas o que o PPT define, com limitações explícitas. Pronto: amostra de entrada/retorno documentada ou impedimento concreto registrado, domínio e parâmetros rastreáveis.

### M1 — Motor determinístico horizontal

Funções puras para validação,coeficientes,curva e cauda com versão. Validar contra exemplo fechado300/150/6 usando tolerâncias de valores arredondados; divergência deve ser investigada, sem ajustar fórmula para forçar gabarito. Verificar `A(n)=A_n`, valores finitos, estoque coerente e conservação de unidades para os casos aceitos. Casos inválidos/fora do domínio devem ter resultado explícito, sem fallback oculto. Testes aqui são relevantes por protegerem regra financeira/operacional reutilizável.

### M2 — Comparação retrospectiva

Congelar um recorte pequeno de dados reais, data de corte anterior ao período observado e população elegível. Comparar curva, regra atual confirmada e médias3/12meses. Avaliar mensal e trimestral, unidades,estoque e percentual acumulado; separar métricas do estudo24meses. Mostrar amostra, perdas, ausências, padrão e estágio, agregados e piores casos. Não ajustar parâmetros usando o futuro do conjunto de teste. Verificar quais dados atuais permitem replicar os resultados do PPT sem prometer erro9,1pp na base nova.

### M3 — Exercício revisável na Rebrain

Interface mínima com upload/validação,revisão do cálculo,gráfico,tabela e exportação; sem dependência de consulta SQL hospedada nem chamada IA para a matemática. Usar autenticação e System Design existentes se houver dado real/exposição. Antes da UI ler `docs/architecture/FRONTEND_GUIDELINES.md`, `DESIGN_SYSTEM.md` e `System Design/README.md` na raizSE. Filtros/API seguem GeoApiScopeEngine. Ausência,erro,incompatibilidade e dado estimado precisam ser visíveis.

### M4 — Retorno e piloto operacional

Validar contrato de arquivo,IDs,competência,origem,estoque e regras de alternância com Edgar. Preparar arquivo revisável; teste de importação somente em ambiente/autorização definidos. Critério: diferença explicável e nenhuma alteração não solicitada no arquivo/registro. Escrita na origem e expansão de cidades exigem processo separado; uma tela funcionando não homologa o lote nem a integração.

### M5 — Evolução e integração nativa

Após aceite, dimensionar lote/persistência/auditoria e recuperar modelo vertical; entregar motor,contratos,parâmetros e evidências para integração Geobrain/Nicolas. Ampliar categorias/faixas só com especificação. Sem novo projeto ou hospedagem por padrão.

## Agenda indicativa, não compromisso novo

Quarta21: insumos/contrato e reprodução de um caso. Quinta22: retrospectiva em base pequena. Sexta23: demonstrar cálculo,comparação e candidato de retorno, condicionado aos insumos. Replanejar com Edgar/Diego pelo recebimento em21 em vez de19–20. Reserva inicial2h de Gabriel é para exploração/apoio, não estimativa de todas as etapas. Não consumir silenciosamente o restante das4h/dia nem declarar etapa feita pela passagem do dia.
