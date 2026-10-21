# Manifesto técnico — Estimativas de vendas por empreendimento

**Data:**21/10/2026. **Ambiente:**Rebrain, processo SID/Geobrain. **Estado:**PLANEJADA; contexto preparado, sem implementação runtime. **Responsável por esta preparação:**Gabriel/Codex. Este documento reúne fatos, resultados relatados pelo autor e propostas de implementação, identificando cada categoria.

## 1. Problema e resultado esperado

Na reunião19/10, Diego definiu o objetivo de ampliar a cobertura de cidades estimadas com maior precisão até o fim do ano. A estimativa deve considerar a trajetória comercial de cada empreendimento. Ela apoia períodos sem coleta real e precisa retornar ao processo Geobrain com identificação de origem e competência.

Fluxo acordado na reunião: exportação Geobrain → cálculo externo na Rebrain → revisão → arquivo no contrato de retorno Geobrain → futura integração nativa com Nicolas. A operação deve alternar observação real e estimativa, evitando ciclos indefinidos de previsão alimentando previsão. Esta frente pertence à coleta/fechamento SID e não é uma ampliação do motor do Corretor de Vocacionais.

## 2. Pessoas e calendário

- **Finotti (Lucas Finoti no email):** fornecedor do estudo estatístico, equação e materiais explicativos. Não confundir com Lucas Gonçalves, desenvolvedor citado no handoff de relatórios.
- **Edgar:** conduz a frente e o entendimento dos dados/campos do Geobrain, conforme divisão explicitada por Diego.
- **Gabriel:** apoio técnico e desenvolvimento/validação do exercício na Rebrain; esta sessão preparou documentação.
- **Diego:** direção de negócio e ponte para dúvidas Belogic/Evandro, conforme reunião.
- **Nicolas:** integração nativa posterior no Geobrain, sem assumir compromisso de execução imediata ou prazo confirmado por ele.

Material era esperado em19–20/10. A expectativa de exercício na Rebrain atésexta23/10 foi condicionada a essa chegada. O email/PPT efetivamente fornecido nesta conversa é dequarta21/10,12h18. Recalibrar escopo do exercício com Edgar/Diego: piloto em novembro e ampliação em dezembro são direção, não aceites ou datas de produção comprovadas. A reserva pessoal anterior de2h de apoio não estima a ferramenta completa; respeitar capacidade informada de4h/dia e prioridades concorrentes. Plano19–23 permanece proposta aguardando confirmação global.

## 3. Inventário de evidências

### Recebido e lido

- PPTX `Equacao_vendas_horizontais_Brain  -  Reparado.pptx`,576.215bytes,10slides. SHA256:`70fd2c238abf36ecbf54d5101951b8a7f266f551b6f6e31030b3f419fdd5a923`.
- Captura do email “Re: Dados Curva de Vendas”, Lucas Finoti,21/10/2026,12h18; anuncia testes horizontais e futuro envio dos MD no Drive.
- Transcrição da reunião19/10 às10h e anotações do plano semanal.
- Leitura do card Monday13096757074: comentários Edgar21/09 e anexos06/10, detalhados em FONTES_E_DECISOES.md. Planilhas listadas, **não abertas** nesta preparação.
- Código local Rebrain: React/TypeScript/Vite, sessão Geobrain compartilhada, módulos por feature e consulta multi-cidade de Validação de Fechamento. Fetch confirmado na sessão em `5bd3d07`, main/origin0–0 antes deste pacote; apenas origin cadastrado. Modificações prévias FIERGS/LIVE/referência de interface preservadas.

### Ainda não obtido/confirmado

MD técnicos e fonte executável do simulador, pacote vertical, bases de treino/teste, bandas de incerteza, exportação Geobrain real e exemplo aceito de retorno. Busca21/10 no Drive conectado por curva/Equacao/Finoti não localizou os MD; isso não comprova inexistência em outra pasta/conta/acesso. A imagem da tela no PPT não comprova que seu código esteja no repo ou disponível.

## 4. Modelo horizontal apresentado

As informações desta seção são transcrição/síntese dos slides, não um modelo recalibrado ou validado por esta sessão.

### Base e amostra

O slide3 menciona base de674 empreendimentos,1.371tipologias e55.876registros mensais, seguida do recorte horizontal com366empreendimentos:160abertos (98esgotados/62ativos) e206fechados (83esgotados/123ativos). Recorte declarado: lançamentosjan/2020–jul/2026, observação atéset/2026,18cidades,129,8milunidades e15,2milmeses observados, distratos10,7% sobre vendas brutas. Confirmar no MD o funil674→366 e os filtros/nível empreendimento versus tipologia.

### Escolha funcional

Sete formas ajustadas por mínimos quadrados ponderados à curva média de cada padrão: Weibull, Weibull com salto inicial, hiperbólica, logarítmica, Gompertz, logística e exponencial. Weibull foi escolhida por ajuste R²0,995 nos dois padrões com dois parâmetros. O salto inicial adicional foi rejeitado por valor negativo. Ajuste da curva média não deve ser apresentado como precisão individual fora da amostra.

Kaplan–Meier/log-rank considerando empreendimentos ativos: medianas50% vendido6/4meses,70%9/10,80%11/14,90%15/23 e esgotamento31/46 (aberto/fechado). Diferença em50% sem significância (p0,536); esgotamento p0,001. Aos24meses, aberto+5,4pp, intervalo bootstrap95% de+0,6 a+10,3pp, segundo o slide. Isso fundamenta parâmetros separados por padrão.

### Equação, domínio e coeficientes

Definições: `n` meses de mercado; `A_n` fração líquida acumulada vendida até `n`; `t` mês de mercado futuro; `A(t)` fração acumulada projetada. Interpretar percentual em fração0–1 na implementação; não passar50 onde se espera0,5.

```text
A_n = unidades_liquidas_vendidas_acumuladas / unidades_lancadas
k = (c0 + c1 * ln(n)) + (c2 + c3 * ln(n)) * ln(-ln(1 - A_n))
A(t) = 1 - (1 - A_n) ** ((t / n) ** k), t > n

Aberto:  c0=0.186; c1=0.291; c2=-0.382; c3=-0.019
Fechado: c0=0.061; c1=0.227; c2=-0.382; c3=-0.037
```

O motor deve reproduzir a fórmula e registrar versão/origem dos coeficientes. O slide informa ajuste não linear sobre origensn1–48 e36meses seguintes. Entradas fora desse domínio de calibração exigem política explícita; não extrapolar silenciosamente. Para a expressão logarítmica, `n>0` e `0<A_n<1` são necessários; `k<=0`, ausência de vendas, esgotamento, distratos, inconsistências e casos já acima95% exigem decisão/documentação, sem epsilon ou clamp arbitrário.

Ao atingir95% vendido, o slide define venda linear do saldo em5meses(aberto) ou6(fechado), baseada na mediana observada95%→100%. Discretização do cruzamento, tratamento de empreendimento já acima95%, arredondamento de unidades e horizonte máximo precisam do MD/código original. Não somar cauda duas vezes nem criar estoque negativo.

### Caso de referência publicado

Fechado,300lotes,150vendidos líquidos em6meses: `k≈0,63`, previsão≈66% no mês12,≈75% no18 e esgotamento no67. A tela mostra75unidades nos próximos12meses e ritmo8unidades/mês nos próximos6. São valores arredondados de apresentação, não gabarito com precisão ilimitada. A forma de contar o mês do lançamento também deve ser conferida: a imagem informa lançamento=mês1. Não declarar equivalência exata sem reproduzir a regra completa/cauda.

### Validação relatada pelo Finotti

366empreendimentos divididos aleatoriamente em183treino/183teste; origens3,6,12,18,24,36meses;734projeções no teste descrito e100sorteios para estabilidade. Métrica: média da diferença absoluta no percentual acumulado vendido ao longo dos24meses seguintes, em pontos percentuais (pp).

- Curva:9,1pp; melhor individualmente em47% dos casos.
- Média de vendas líquidas do último trimestre:11,1pp; melhor em37%.
- Média últimos12meses (ou desde lançamento quando menor):12,0pp; melhor em16%.
- Em3meses de histórico, curva12,7pp contra18,2pp das alternativas.

“Venceu100sorteios” refere-se ao agregado, não a100% dos empreendimentos. Métrica acumulada24meses não equivale a erro de vendas do próximo mês, acurácia percentual ou validação do fechamento trimestral. Precisamos medir o horizonte operacional e os casos de pior desempenho, mantendo separação de treino/teste por empreendimento e sem informação futura nas entradas. Não reproduzimos esses testes nesta sessão.

### Interface de referência

Slide10 e imagem: padrão,unidades lançadas,meses de mercado,vendas líquidas e mês de lançamento opcional; curva, indicadores, tabela mensal de vendas/estoque/acumulado/percentual e cópiaExcel. A tela menciona faixa central/metade dos casos e ampla8/10, mas não fornece algoritmo/regras de calibração. Também oferece condomínio de casas/curva geral; isso não comprova coeficientes específicos para casas. Não habilitar categoria nem inventar bandas sem contrato validado.

## 5. Regras operacionais além da fórmula

O card anterior pede cálculo pelos últimos3meses e inclui seleção de coleta, alternância de períodos, INCC e reconciliação de vendas/distratos. A reunião e o novo material apontam evolução do estimador. Não aplicar automaticamente todas as regras antigas nem assumir que foram revogadas. Separar método de projeção, seleção de empreendimentos/cidades, tratamento de preços e reconciliação posterior. Campos falados `estimation`/`IVV BET` precisam de nomes/tipos/semântica reais, inclusive diferença de flag da cidade, período e empreendimento.

## 6. Arquitetura recomendada

Adicionar feature isolada ao `relatorios-api`; rota candidata `/rebrain/estimativas-vendas`. A pasta documental atual é a entrada do trabalho; código futuro em `src/features/estimativas-vendas/`. Reusar autenticação Geobrain, shell, primitives e System Design; módulo lazy conforme diretrizes do repo. Para API/filtros territoriais, seguir GeoApiScopeEngine e cidades autorizadas do token.

Camadas propostas: (1) motor matemático puro e determinístico, sem UI/API/LLM; (2) catálogo versionado de parâmetros e validações; (3) adaptação de entrada e saída; (4) comparação retrospectiva; (5) interface de revisão. A transformação de um arquivo não deve depender da disponibilidade de uma sessão IA. Históricos reais e estimados precisam de linhagem distinta; parâmetros, data de corte e entradas da execução devem ser reproduzíveis.

Primeiro teste pode funcionar localmente com arquivos. Reuso da API existente depende de verificar histórico, competência e net/gross/distratos; código de outra feature não garante contrato compatível. Não foi identificada necessidade de novo projeto de banco, app ou serviço para o cálculo inicial. Persistência, lotes e execução no servidor são decisões posteriores ao volume/acesso/auditoria observados. O motor independente facilita integração nativa posterior no Geobrain.

Lovable pode continuar no fluxo já existente; Vercel é opção de hospedagem compatível com Vite, sem migração necessária para a prova. Sandbox Brain pode servir a experimentação independente, mas não é dependência do produto. Sociodemografia não aparece como entrada desta equação; não vincular o primeiro teste à conclusão da investigação Socio ou ao projetor de demanda Quanti. Compartilhar infraestrutura só quando houver necessidade demonstrada.

Fontes oficiais consultadas21/10: [Lovable/GitHub](https://docs.lovable.dev/integrations/github) e [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite). A escolha da Rebrain é recomendação baseada na reunião e no código local, não exigência dessas plataformas.

## 7. Escopo do primeiro incremento

Obter os materiais faltantes, congelar versão inicial documentada dos parâmetros, reproduzir casos conhecidos e importar um recorte real pequeno com Edgar. Fazer teste retrospectivo ocultando o futuro, comparando regra atual e curva no horizonte mensal/trimestral. Gerar relatório e candidato a arquivo de retorno sem escrita automática na origem. Conferir integridade, origem, competência, estoque e compatibilidade do arquivo. Só ampliar cobertura após esse aceite.

Etapas detalhadas e contrato candidato em [CONTRATO_E_VALIDACAO.md](CONTRATO_E_VALIDACAO.md). Nada neste pacote concede permissão de push/deploy, escrita em banco, envio de mensagens ou alteração Monday; seguir as autorizações efetivas da próxima sessão e AGENTS.

## 8. Fonte de verdade e continuidade

Documentação e derivados pequenos de negócio nesta pasta são duráveis/versionáveis. PPTX, email bruto, exportações, bases reais e resultados temporários ficam em `.local-inputs/estimativas-vendas/`, ignorada pelo Git. Segredos não entram nos arquivos versionados. Consultar o índice e o manifesto de integridade local; o hash permite verificar outro exemplar do material sem incorporar o binário ao Git.

Contexto estratégico original: raizSE `_Planejamento/2026-10-19_a_2026-10-23_PROPOSTA.md`, seção21/10 Finotti; `_Acompanhamento/2026-10-19_a_2026-10-23.md`. Este pacote passa a ser a referência técnica de continuidade dentro do repo; plano/diário devem apontar para ele. Preservar regras específicas do repo, trabalhos de outros agentes e divisão de responsabilidades. Registrar evidência sem confundir preparado, testado localmente, enviado ao Git e verificado em produção.
