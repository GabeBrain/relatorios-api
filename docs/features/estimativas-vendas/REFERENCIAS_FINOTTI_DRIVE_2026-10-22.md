# Finotti: referências completas, Goiânia e revisão da bancada

## Conclusão e estado

O material recebido resolve a reprodução da cauda horizontal, dos parâmetros de faixas e do método vertical por comparáveis. A ausência de gráficos em Goiânia era causada pelo fluxo: modelo horizontal selecionado para verticais e seleção inicial vazia. A API contém os dados.

Estado: validado localmente. Consulta real da interface local, sem interceptação de respostas: **641 cadastros, sete páginas HTTP 200, 640 projeções automáticas, 12 cartões iniciais, 24 linhas e 14 áreas desenhadas, sem erro de página**. Consulta e preparação até os cartões: **16,18 segundos** em uma medição. Leitura direta separada: 14,77 segundos. Isso não é garantia de prazo nem comparação medida com a versão sequencial. Produção não verificada nesta alteração.

## Inventário e procedência

Fonte fornecida por Gabriel: [Nova_Estimativa_Geobrain, Drive do Finotti](https://drive.google.com/drive/folders/1ENVF8iZmP2hqaeiPNLIkVAcn4dWwBpAR). Leitura pelo conector em 22/10/2026, sem alterar o Drive.

- `HorizontalMD`: contexto, dados, equação, aplicação, validação, arquitetura, README/CLAUDE e pasta de referência. Baixados e examinados `sim.js`, `parametros.json` e `casos_teste.json`.
- `VerticalMD`: documentação equivalente e `base_conhecimento_curva_absorcao_1.zip`. ZIP inspecionado e extraído em diretório local; contém preparação/análises Python, simulador Python, motor JavaScript, artefato de comparáveis e casos de referência. Scripts recebidos não foram executados para obter acesso ou alterar sistemas.
- `Bases_Qlik`: listagem vazia na consulta. A base bruta original de calibração não estava disponível nessa pasta; não alegar reprodução do ajuste a partir do bruto.

Originais e exportações continuam ignorados em `.local-inputs/estimativas-vendas/finotti-drive-20261022/`. [Manifesto com tamanhos e SHA-256](MANIFESTO_REFERENCIAS_FINOTTI_2026-10-22.json) permite conferir a cópia. Documentos CLAUDE recebidos são fontes metodológicas, não instruções aplicáveis ao repositório.

Decisão de versionamento: `expanded/reference/` contém somente os motores de inferência necessários, parâmetros, casos de regressão e artefato derivado de comparáveis. Motores JavaScript preservam a lógica recebida, com exportação ESM e declarações TypeScript; não representam uma nova calibração. O artefato vertical contém apenas `H`, `K` e trajetórias dos pools; IDs substituídos por posições anônimas mantendo a ordem de desempate. Não contém nomes, geografia, credenciais ou respostas brutas da API. É parte necessária do modelo, carregada sob demanda, separada do módulo inicial da página. A transformação preservou os dez casos verticais integralmente. Dados reais de consulta e capturas não entram no Git.

## O que mudou na metodologia

**Origem.** Quantidade menos estoque no corte, com idade desde o lançamento. A documentação informa divergência frequente do campo tempo em venda; ele não deve anular o lançamento. O adaptador conserva o alerta de divergência. Não inferir idade pelo início de uma série truncada. Sem estoque no corte, sem unidade válida ou com duplicata, mostrar histórico e razão; ausência não vira zero.

**Horizontal completo.** Coeficientes, epsilon `0,0001`, piso de k `0,05`, cauda linear após 95% (aberto cinco meses; fechado e Geral seis), suporte até idade 60 e projeção original até 120 meses adiante vêm da referência. Meses 49–60 são extrapolação sinalizada. Casas usam Geral somente nos aliases documentados. A interface mantém horizontes comparáveis de 6/12/24/36 meses. O motor dos slides continua separado, sem substituir silenciosamente os parâmetros antigos. O JSON distribuído arredonda coeficientes mais que a descrição textual: a inferência usa o JSON e valida contra os casos recebidos.

**Exemplo 300/150/6 fechado.** k≈0,632771; 75 unidades nos próximos 12 meses; esgotamento no mês 67. Faixa central de esgotamento 26–102; ampla 17 até além do horizonte. Os 12 casos horizontais conferiram k, vendas mensais, acumulado, bandas, tamanho de tabela e esgotamento.

**Vertical.** Método de 30 vizinhos por padrão e estágio, não a equação horizontal reaplicada. Idade 1–36; completa vizinhos censurados pelo ritmo recente, com piso de absorção do estoque remanescente de 0,2%/mês, quantis e suavização definidos pelo Finotti. Padrões sem grupo específico usam o grupo Médio+ previsto na referência, com alerta. API escolhe padrão de maior quantidade no corte; múltiplas tipologias devem continuar revisáveis. Dez casos reproduzidos, incluindo Standard 120/36/6: 84 acumuladas após 12 meses; esgotamento central no mês 33, conservador 189 e otimista 16.

**Sombras.** Horizontal: P25–P75 e P5–P95 dos resíduos da referência, com monotonicidade e cauda próprias. A fonte relata cobertura aproximada de 53% e 80%; isso não transforma P5–P95 em faixa nominal de 80% nem comprova cobertura em Goiânia. Vertical: cenários P10–P90 entre vizinhos, incluindo trechos extrapolados. Não são intervalos de confiança do parâmetro nem garantia de venda. Preservar eventual linha central fora da faixa em origens tardias; não corrigir quantis para melhorar a aparência. Carteira não soma limites individuais para fabricar faixa agregada.

**Alternativa explícita.** Fora do suporte Finotti, leitura automática tenta ritmo recente: diferença de estoques comparáveis separada por três meses, dividida por três; quantidade estável, sem inventar venda mensal. Limita aos extremos físicos e aceita saldo negativo por distratos. Não exige a confirmação manual de periodicidade nem recebe faixa sem calibração. Se nem isso for possível, o cartão mostra o histórico e o motivo. Estoque constante continua referência separada, não substituto silencioso.

**Goiânia em setembro/2026.** Snapshot SHA-256 `3d5e8c39fccacdb850122ce1dda970f5e8d321de88bfea8295aef087e8fb4f03`: 641 posições válidas; 185 no suporte Finotti completo, 629 no ritmo recente, união automática 640. Os números incluem esgotados e não significam 640 curvas de venda positiva nem 640 previsões Finotti. Um caso conserva somente histórico. Não ocultar essa distinção ao comunicar cobertura.

O caso sem projeção é o ID21812: idade acima do suporte de36 meses e estoque não comparável três meses antes do corte. O payload real tem `estimation` no cadastro atual; as linhas de `typologies_history` não fornecem essa flag por competência. Isso confirma a pendência de linhagem, sem transportar a flag atual para o passado.

## Interface e transporte

1. Consulta descobre o total na primeira página e usa até **oito chamadas simultâneas** para as restantes. Goiânia tem seis páginas restantes, portanto pico de seis após a primeira. Resultado ordenado por página, progresso por conclusão, cancelamento compartilhado e falha integral; nenhuma lista parcial é rotulada como completa.
2. Uma consulta prepara todos os modelos aplicáveis no cache por empreendimento/corte/horizonte. Processamento cede o navegador em lotes; troca de modelo ou seleção não chama API nem recalibra parâmetros. Artefato vertical tem importação dinâmica.
3. Todos os cadastros chegam selecionados, com contagem explícita e 12 cartões por página. Histórico aparece mesmo quando não há previsão. Carteira usa toda a seleção, com exclusões declaradas.
4. A carga leva aos primeiros gráficos, mantendo botões de modelos à mão. Recorte recolhe após sucesso; filtros reabrem sob comando. Modos e modelos ficam em botões visíveis, com detalhes em Dialog acessível e texto editorial. Removida confirmação técnica de periodicidade do fluxo normal e removido JSON de parâmetros da explicação.
5. BrainLoadingState em véu de carregamento com logo, etapa real e cancelamento; também durante preparação dos modelos. Variante de campo agora conserva a logo. Obrigação registrada igualmente em AGENTS e CLAUDE para toda ferramenta nova/fluxo alterado, inclusive POC. O seletor geográfico compartilhado também usa a variante de campo Brain. O seletor geográfico compartilhado também usa a variante de campo Brain. O seletor geográfico compartilhado também usa a variante de campo Brain. O seletor geográfico compartilhado também usa a variante de campo Brain. Isso não constitui auditoria ou migração de todas as telas legadas.

Referências de interação: [Apple HIG — Charts](https://developer.apple.com/design/human-interface-guidelines/charts) e [Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators), consultadas em 22/10. Aplicados hierarquia, escala percentual fixa, descrições claras, progresso real e cancelamento. Tokens, tipografia, componentes e identidade permanecem os do System Design Geobrain.

## Limites científicos e próximo passo

A referência foi treinada com dados até setembro/2026 e pode conter os próprios empreendimentos consultados; não é conjunto de teste independente. O novo método recusa cortes anteriores à base de treino; o avaliador bloqueia também os coeficientes legados nesses cortes. A leitura automática pode usar apenas o ritmo de estoque nesses testes e registra o método efetivo no resultado exportado. Não apresentar isso como retrospectiva independente do Finotti.

Ainda faltam linhagem observada/estimada por competência, denominadores e máscaras de revisão, confirmação de tipologias comerciais e contrato de retorno de estimativas. `bases.estimation` segue sendo a flag de estimativa por base/período; `ivv_batch_id` rastreia atualização em lote e não substitui a flag. O fato de o estudo original ignorar a flag não transforma séries estimadas em observações comprovadas.

Próximo passo científico: congelar versões e previsões em corte posterior ao treino; confrontar com novos períodos reportados e, separadamente, confirmar quais são observados. Para retrospectivas anteriores, treinar somente com dados disponíveis naquele corte, separar projetos de treino/calibração/teste e avaliar em amostra comum. A base Qlik original e sua máscara temporal continuam necessárias para reproduzir o estudo completo.

## Evidências e reprodução

- 62 testes focados (108 com relatório API Excel e menu): casos originais, contrato, vazamento temporal, estoque, faixas, carteira, falha/cancelamento, concorrência máxima e ordem determinística.
- `npx.cmd tsc -p tsconfig.app.json --noEmit`, lint dirigido e build de produção; resultados finais no registro de entrega.
- `scripts/diagnostics/estimativas-expanded-audit.mjs GO Goiânia Vertical`: leitura real autenticada; `--replay` recompõe o estudo do snapshot ignorado. Segredos lidos de arquivo ignorado, nunca registrados.
- `scripts/diagnostics/estimativas-goiania-live.mjs`: interface local contra API real, sem rotas simuladas. URL local padrão 8081. Relatório e capturas em `.local-inputs/estimativas-vendas/goiania-live/`.
- `scripts/diagnostics/estimativas-goiania-browser.mjs`: captura real preservada, transporte simulado para ensaios determinísticos de temas/tamanhos, logo durante atraso, ausência de consulta ao trocar modelo, carteiras e modais. **Não usar o tempo desse ensaio como latência da API real.**
- [Evidência agregada](EVIDENCIAS_GOIANIA_FINOTTI_2026-10-22.json); brutos e imagens ignorados. Alterações paralelas FIERGS/Corretor preservadas.

**Verificação responsiva adicional:** a inspeção das capturas detectou a lateral ocupando 256px no celular, embora o teste de overflow passasse. Reutilizado o comportamento móvel existente para a rota de Estimativas; em390px a área útil passou a334px. A grade responde à largura do conteúdo e usa uma coluna quando não cabem dois gráficos saudáveis. Novas evidências medem largura útil, além de overflow.
