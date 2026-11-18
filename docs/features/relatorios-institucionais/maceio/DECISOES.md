# Decisões — Panorama Maceió / SINDUSCON-AL

Registro de fatos comprovados, hipóteses e decisões. Atualizado a cada entrega.

## 18/11/2026 — Continuidade das fontes e CAGED verificado

- **D19 — Contingência identificada CAGED:** escolha técnica do Codex dentro do pedido de Lucas para corrigir as fontes pendentes. BigQuery confirmou117meses/23.751agregados reais; consulta online permanece prioritária e, em falha de transporte/5xx/404, usa cópia agregada verificada, importada sob demanda. Origem/versão/data e falha online visíveis na interface/JSON, fora da arte. Não contorna401/403/429ou resposta200inválida; não substitui competência ausente. Não representa nova homologação metodológica pelo analista. [Proveniência, contrato e provas](CAGED_CONTINGENCIA_2026-11-18.md), implementação`e67ac127`.
- **D20 — Dependências de dados/analista:** Lucas confirmou que os10`Fechado`ainda aguardam o analista. Para lançamentos por tipologia ausentes, respondeu que consultará o analista sobre a fonte. Não derivar lançamentos de capacidade/estoque nem adotar de-para presumido. Marechal283×192precisa de conferência peloJSONv2. Pedido amplo de corrigir fontes não autoriza inventar esses valores.

## 18/11/2026 — Universo horizontal e INCC confirmados pelo analista

- **D16 — Chácaras excluídas:** Lucas confirmou com o analista que Condomínio de Chácara/Chácaras não participa das análises nem aparece no relatório. Aplicado ao mensal/trimestral, capital/RM, oferta/capacidade/contagem, distribuição anual e médias. A reconciliação entre fonte granular e municipal continua sobre o universo bruto antes da exclusão; divergências não são apagadas. A auditoria agregada pode conservar os rótulos recebidos como evidência da fonte.
- **D17 — Série monetária:** INCC-DI confirmado pelo analista, comunicado por Lucas em 18/11. Mantida a configuração existente para as duas edições e o mês-base de fechamento; isso não homologa automaticamente outros métodos ou campos nominais.
- **D18 — Fechado exige conferência:** o analista quer os empreendimentos classificados somente como `Fechado`. Não autoriza converter para Loteamento Fechado. A lista CSV separada, solicitada expressamente por Lucas, contém referência, completude, município, ID, nome, campos com o rótulo e lançamento. Usa a geração em memória, sem nova API/persistência; exclui chácaras e produtos explicitamente identificados. Inclui registros esgotados, pois o pedido é cadastral, sem presumir estoque ativo; lançamentos posteriores ao fechamento ficam fora. Ausência de nome/data é sinalizada; coleta incompleta identifica lista parcial. O diagnóstico JSON permanece agregado e não recebe nomes/IDs individuais.
- **Evidência:** implementação `38700781`; [validação desta sessão](VALIDACAO_DADOS_REAIS_2026-11-17.md). Lucas autorizou o push para gerar novo relatório e encaminhar o JSON. Geração real/publicação Lovable ainda não observadas pelo agente.

## 17/11/2026 — CAGED MTE autorizado

- **D12 — Fonte MTE:** Lucas autorizou a integração pelo MTE, em lugar de depender da cobertura recente BD Pro. D7 permanece como histórico do adiamento anterior. Importador estatístico/ajustes 2017–2019 e MOV/FOR/EXC desde 2020, com agregados e revisões; [contratos e evidências](CAGED_INTEGRACAO_2026-11-17.md).
- **D13 — Comparativos reutilizáveis por versão:** conservar snapshots imutáveis de cada fonte e atualizar os períodos afetados por revisões. Não assumir que um ano encerrado é irretificável. Comparação mensal e ano parcial também no trimestral, conforme o fechamento do original.
- **D14 — Original sem marca de quebra:** Lucas perguntou se a marca existia no original; render 9–14 não a apresenta. Manter a composição original sem nota nova de quebra no gráfico. Registrar a diferença metodológica/2020 na origem e documentação, sem afirmar equivalência metodológica homologada.
- **D15 — Infraestrutura existente:** reaproveitar identidade/transporte/HMAC da ponte Empresas/Empregados; frontend recebe só agregados. Sem chaves privadas ou microdados no Lovable. Publicação, bootstrap completo e agendamento são etapas remotas separadas, ainda não executadas.

## 16/11/2026 — Continuação com Codex

- **D7 — CAGED adiado:** Lucas informou BigQuery do setor já conectado ao Rebrain e pediu continuar a implantação, deixando CAGED para depois. Código RAIS/ponte Empresas localizado; acesso real não exercitado. Não confundir conexão informada do produto com autenticação disponível ao agente.
- **D8 — INCC explícito:** série de Maceió ainda não comprovada; prévia começa sem índice escolhido. INCC-DI é opção explícita para conferência, com origem/mês-base visíveis e guarda por competência; não adotar automaticamente por ser usado em Fortaleza.
- **D9 — MCMV:** logo dos originais comprova recorte específico22/33. Não mostrar o total vertical nessas posições nem converter Econômico em MCMV por inferência.
- **D10 — Rankings:** exigir fluxo explícito por tipologia, identificação/bairro e soma reconciliada ao total municipal. Sem substituir fluxos por estoque/capacidade. Divergência ou campos ausentes mantêm a página em conferência.
- **D11 — Continuação:** navegação1–40mantém posições originais dos dois modelos; próximos41–60. Rota continua oculta e exportação segue posterior à implantação do conjunto.

## 16/11/2026 — inventário inicial

### Fatos comprovados (extração OOXML dos originais)

- **Maio/2026 é a edição mensal** (82 slides): séries de 25 meses, rankings "MAIO/2026", IVV mensal.
- **Junho/2026 é a edição trimestral 2T2026** (87 slides): séries de 17 trimestres (2T/22–2T/26),
  acumulado semestral 1S25 vs 1S26, rankings "2T 2026", participações 2T/2025 vs 2T/2026.
- Recorte: mensal lista 7 municípios (com Coqueiro Seco); trimestral lista 6 (sem Coqueiro Seco).
- A edição trimestral tem bloco exclusivo **mercado vertical comercial Maceió** (posições 79–82) e separa
  as tabelas de oferta final Maceió/RM (61–65); a mensal consolida (62–64) e tem slide exclusivo de
  **tempo de escoamento do estoque** (posição 41).
- VGL/VGV trazem a nota "Valores atualizados pelo INCC" no original.
- Vendas RM mensais têm valor negativo no cache (jun/24 = −8): distratos aparecem com sinal.
- Vários slides analíticos estão achatados como imagem no original (IVV líquidas, IVV por área útil,
  emprego/CAGED, blocos horizontal e comercial): a composição real exige render; os dados virão de fonte,
  não da imagem.

### Decisões desta sessão

| # | Decisão | Base | Status |
|---|---|---|---|
| D1 | Manifesto com posições originais preservadas: 82 (mensal) e 87 (trimestral), sem renumeração | Handoff + extração | Adotada |
| D2 | Recorte municipal por edição: mensal = 7 cidades, trimestral = 6; nenhuma união/exclusão automática | Slide 7 de cada original | Adotada |
| D3 | Acesso somente por rota `/rebrain/relatorios-institucionais/maceio`, sem item em menu/busca/início | Pedido de Lucas em 16/11 | Adotada |
| D4 | Reutilizar padrão de operação Fortaleza (page/model/blueprint/GeoApiScopeEngine) e exportador nativo compartilhado, sem copiar regras locais de Fortaleza/Secovi/FIERGS | Handoff | Adotada |
| D5 | Ordem dos slides gerados = ordem exata do original; padrão visual idêntico à arte Maceió | Pedido de Lucas em 16/11 | Adotada (fidelidade visual verificada por bloco na Etapa 3) |
| D6 | Núcleo de coleta vertical nasce no módulo Maceió (não extraído de Fortaleza nesta sessão): evita regressão nos 672 testes de Fortaleza; extração transversal fica para quando o contrato estiver comprovado em runtime pelos dois consumidores (ou com Recife) | AGENTS.md: extensão transversal exige testes dos consumidores existentes | Adotada |

### Hipóteses em aberto (não implementar sem comprovação)

- Fórmulas de IVV, escoamento, tempo médio de oferta e ponderação de preços.
- Fonte/endpoint de cada indicador (coluna `fonte_endpoint` da matriz está "a confirmar").
- Natureza das vendas (brutas vs líquidas) por slide.
- Critério de padrões locais (Compacto…Super Luxo) e eventual faixa econômica.

### Perguntas objetivas ao analista

1. **Coqueiro Seco**: a diferença de recorte entre maio (7 municípios) e junho (6) é mudança de escopo
   permanente, erro de uma edição, ou recorte distinto por periodicidade? Qual conjunto vale para novas edições?
2. **INCC**: qual fonte/versão/mês-base é usada na correção de VGL/VGV e do VGV ofertado?
3. **IVV líquidas** (mensal 46 / trimestral 45): qual a fórmula e por que separada do IVV principal?
4. **Horizontal**: o bloco cobre casas e loteamentos ou apenas um dos produtos?
5. **Preço m²**: média simples por unidade em oferta ou ponderada? Qual denominador de área?
