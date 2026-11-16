# Fortaleza 2T2026 — 64 slides sem fonte por coleta pulada

16/11/2026 — Lucas/Codex. Correção baseada no diagnóstico real entregue por Lucas, não na disponibilidade das fixtures anteriores.

## Evidência recebida

Arquivo `fortaleza-trimestral-2T2026-diagnostico.json`, gerado em `2026-11-16T12:04:42.337Z` (09h04 de Brasília). SHA256 `d8f5ef6b7d7386f0f81bba9fcfeb673283e34b2ce013d751fd53127ba5d7d21d`.

- 89 posições: 8 disponíveis, 64 aguardando fonte, 17 editoriais.
- Núcleo vertical: cinco municípios consultados, quatro requisições por município.
- Cadastro inicial: concluído, 23 requisições.
- Históricos municipais: **zero fontes**; históricos detalhados: **zero fontes**.
- Os avisos do núcleo indicam diferença de padrões entre meses/fontes em Aquiraz, Caucaia e Maracanaú. O JSON não contém as linhas dessas consultas, então não permite conferir os totais ou resolver essa divergência por padrão.

O original permanece intacto fora do Git. Uma cópia de trabalho fica em `.local-inputs/relatorios-lucas/fortaleza/diagnostic-2T2026-2026-11-16.json`. A fixture versionada contém somente seleção, contagens, hash, lista de slides pendentes e avisos agregados; não copia cadastros ou históricos individuais.

## Causa e correção

`useFortalezaMarket` condicionava a coleta dos históricos a `report.metrics`. Uma reprovação do balanço inicial tornava esse campo nulo e **pulava todas as 45 fontes municipais e os 10 históricos detalhados** do trimestral. Os renderizadores identificavam essas fontes nunca consultadas como pendentes. O mesmo acoplamento afetava o mensal.

Cadastro, histórico municipal, histórico detalhado e organização das páginas agora executam após a validação do acesso/escopo, cada um com suas guardas. O relatório de balanço inicial é preservado integralmente, inclusive totais indisponíveis e avisos; não se altera a regra dos padrões, nem se introduzem zeros para registros ausentes. Uma fonte reprovada bloqueia suas próprias lâminas, sem impedir a coleta das demais.

O JSON acrescenta `collection`: estado do núcleo e, para municipal/detalhado, indicação de consulta, quantidade esperada, fontes retornadas e fontes com transporte concluído. Isso diferencia coleta pulada de fonte consultada com problema. Transporte completo não equivale a validade de todos os indicadores.

## Verificação

- A regressão reproduz exatamente o conjunto de 64 slides e o resumo 8/64/17 do diagnóstico recebido antes da correção.
- Mantendo o núcleo reprovado e os mesmos avisos, os históricos de fixture passam a ser consultados (45 municipais + 10 detalhados); a simulação chega a 72 disponíveis / 0 pendentes / 17 editoriais. O indicador de homologação continua falso.
- Outro caso mantém uma fonte vertical incompleta: sua lâmina permanece bloqueada, enquanto o preço com fonte válida fica disponível. Cancelamento, escopo/token, retry e estados anteriores continuam cobertos.
- Suíte Fortaleza: 289 testes / 24 arquivos aprovados; regressão focada de 14 testes repetida após ajuste apenas da tipagem da fixture. TypeScript, ESLint e build de produção aprovados.
- Edge headless, página real com rede interceptada: `fortaleza-recovery-visual.mjs --skipped-sources` reproduz diferenças de padrões nas três cidades, coleta 40+10 fontes no mensal e 45+10 no trimestral, conserva os três avisos e baixa diagnósticos com 0 fontes pendentes nas fixtures. Lâminas 12/42/54/68/83 trimestrais e 12/37/45/52 mensais conferidas; navegação sem novas consultas e sem overflow. Carregamento Brain lento, desktop/celular. Quatro cenários anteriores de recuperação também aprovados, incluindo tema escuro.
- Evidências da página em `.local-inputs/relatorios-lucas/fortaleza/skipped-sources-2026-11-16/`; o trimestral usa dados simulados, não recupera dados ausentes do arquivo do usuário. Padrões reutilizados: hook de coleta, renderizador/diagnóstico e `BrainLoadingState` existentes.

## Limite de validação real

A tentativa de localizar navegador conectado retornou `Computer Use native pipe is unavailable` e `The browser access host is unavailable`. Não foi possível observar uma geração autenticada nesta sessão. O equivalente headless reproduz a causa do bloqueio e valida que todas as fontes são consultadas, mas não comprova que as respostas reais dessas 55 fontes serão completas.

Após a disponibilização da correção, gerar novamente **2T2026**: o JSON deve registrar 45 fontes municipais e 10 detalhadas. Se alguma resposta vier incompleta, seu motivo deve aparecer no novo diagnóstico; não declarar antecipadamente zero pendências reais. A homologação dos indicadores, equipe e fonte da amostra histórica continua separada.

**Monday:** [Estudo Fortaleza](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`. Nenhuma escrita no Monday.
