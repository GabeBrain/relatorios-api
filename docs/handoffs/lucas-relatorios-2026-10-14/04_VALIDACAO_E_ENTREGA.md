# Avaliação, testes e entrega

## Antes de implementar indicador

Usar [modelo inicial da matriz](templates/MATRIZ_INDICADORES.csv), com células vazias deliberadas: não é saída do produto ou gabarito. Acrescentar linhas/páginas/indicadores do deck escolhido; nenhuma linha está dada como reconciliada.

Congelar um caso com entidade, municípios, periodicidade, janela, data/hora de geração, SHA do código, origem/versão do material e hash dos brutos locais. Registrar matriz: página/indicador→fonte→granularidade→universo→filtro→numerador→denominador→unidade→ponderação→período→cobertura→delta→estado. Estados: fato confirmado, hipótese, decisão editorial ou pendência metodológica.

Reconciliar lançamentos, vendas, oferta e preços por município/empreendimento/tipologia/fonte/período. Comparação de duas fotografias diferentes não prova bug; distinguir atualização da origem, filtro, cobertura, reclassificação e arredondamento. Resultado igual ao PPT também não prova método aprovado. Proibidos números fixos, listas de exceções por período ou redução de guardas para conseguir exportar.

## Camadas proporcionais

1. **Offline rápido durante alteração:** testes das regras tocadas (cubo/política/periodicidade/manifesto/reconciliação) com fixtures negativas e positivas. Incluir ausente vs zero, negativo, cidade incompleta e universo vazio confirmado.
2. **Regressão antes da entrega:** preservar fixtures FIERGS 2T2026/4T2025 e Secovi/Jundiaí/Piracicaba; os testes locais não recolhem fonte real. Comando completo quando o custo for proporcional: `npx.cmd vitest run src/features/panorama-secovi-fiergs`. Não repetí-lo a cada edição de doc.
3. **Tipos/lint/build:** `npx.cmd eslint <arquivos alterados>`, `npx.cmd tsc --noEmit -p tsconfig.app.json`, `npm.cmd run build`. `vite build` sozinho não prova tipos; registrar falha paralela sem editar domínio alheio. Se tipos isolados forem usados, versionar configuração/provar o escopo, não usar arquivo ignorado da máquina de Gabriel como dependência do handoff.
4. **Visual local:** componentes reais/tokens, screenshot em largura desktop/estreita e claro/escuro da interface; nomes longos/1/N cidades, quebra/paginação, legendas/rótulos/colunas/denominador total. O script `scripts/diagnostics/fiergs-custom-cover-visual.mjs` é ensaio de capas com fixtures, não coleta real.
5. **Site/estudo real somente autorizado:** uma geração piloto delimitada, PDF/PPT/CSV da **mesma geração**. Gabriel ou Lucas, com sua conta, após autorização específica. Não fazer varredura longa/API, PDF ou reanálise em lote por iniciativa do agente. Auditar completude/guardas antes da exportação.
6. **Aceite:** leitura de todos os slides, ampliação de tabelas/mapas e CSV pareado. Preview/PDF/PPT compartilham manifesto/modelo e mostram recorte real; abas auxiliares/avisos não vazam como nota técnica no estudo. Registrar o responsável e a evidência de aprovação. Juliana aprovou FIERGS, não automaticamente os novos quatro modelos.

**Se interromper por tempo/acesso:** documentar o limite e manter avanço offline. Não usar teste mock para declarar API/deploy aprovado nem usar PDF gerado para declarar aceite humano.

## Resultados históricos para comparação, não meta fixa

Refinamento FIERGS em 13/10 registrou 327 testes/39 arquivos e 81 cenários visuais, tipos da feature/build aprovados. Saída do conjunto recebido: 42 guardas match. Essas contagens podem evoluir; o objetivo é preservar contratos, não atingir exatamente esses números. Os 39/39 e 23 guardas em documentos anteriores se referem a outras versões.

## Fechamento Git e operação compartilhada

Main direta conforme AGENTS; fetch de todos remotes na abertura e antes de integração. Ao encontrar trabalho paralelo, não descartar, não fazer commit de arquivo inteiro se ele incluir hunk alheio. `git add` explícito, commit isolado por fatia, atualizar LIVE Rebrain; `npm.cmd run check:live-docs -- <base> HEAD`. Reportar commits à frente/atrás e pedir autorização de push, inclusive se main contém commits paralelos. Push pode disparar build/Lovable, não prova site atualizado.

Material bruto/cache/exportação em `.local-inputs/`; matriz/decisões/fixtures pequenas necessárias para reproduzir devem ser versionadas. Não criar ignore global de PDF/PPT, não mover insumo usado por código antes de checar referências. Não copiar credenciais da sessão. Não alterar Monday sem pedido explícito.

Atualizar [STATUS](STATUS.md) e o diário/planejamento pessoal correspondente ao responsável; Lucas não escreve avanços no diário pessoal de Gabriel. Antes das férias: comandos executados, última versão publicada/observada, testes, deltas abertos, custo real, pendências e CTA de retomada. Estado preparado, validado localmente, publicado no Git, verificado no site e aceito são diferentes.
