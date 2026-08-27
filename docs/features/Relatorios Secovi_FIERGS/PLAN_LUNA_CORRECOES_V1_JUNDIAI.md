# Plano terminal — Luna — correções da V1 do Panorama Jundiaí

**Status:** `READY_FOR_EXECUTION`
**Data:** 2026-08-27
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Card:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`
**Fonte principal:** [`MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md`](./MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md)

## 1. Missão terminal

Corrigir integralmente a V1 do Panorama com base nos 28 comentários da Juliana e nos requisitos
transversais já recebidos, gerar um novo PDF de Jundiaí, verificar as 62 páginas e entregar um
handoff pronto para responder ao e-mail da analista.

Não encerrar apenas porque testes unitários passam. O resultado terminal é um PDF real revisado,
com cada correção rastreada e evidência de aceite.

## 2. Escopo fechado

### Obrigatório na V1

1. multi-cidade;
2. períodos posteriores a 1T/26;
3. política Secovi: vertical + somente Condomínio de Casas no horizontal;
4. correções dos slides 2, 3, 14–19, 23–26, 31, 33–46, 48, 49 e 51;
5. regressão das 62 páginas;
6. PDF final e resposta de fechamento à Juliana.

### Proibido absorver na V1

- novo padrão de tabelas Rebrain sem referência;
- exportação PPT/PPTX;
- editor livre de narrativas ou novos slides.

Esses três itens ficam documentados como V2. Não parar a execução para pedir definição sobre eles.

## 3. Leitura obrigatória antes de editar

1. `AGENTS.md` e protocolo de sessão;
2. `docs/architecture/FRONTEND_GUIDELINES.md`;
3. `docs/architecture/DESIGN_SYSTEM.md`;
4. `MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md`;
5. `MAPEAMENTO_FASE0_PIRACICABA_1T26.md`;
6. `GABARITO_CONGELADO_PANORAMA_PIRACICABA_1T26_v1.md`;
7. `DECISOES_E_PREMISSAS_PANORAMA.md`;
8. o PDF corrigido de Jundiaí e seus comentários internos.

## 4. Regras de implementação

- Continuar na `main`; preservar alterações e arquivos alheios.
- Reutilizar `GeoApiScopeEngine`; a extensão multi-cidade continua limitada às cidades monitoradas.
- Não codificar listas ou valores de Jundiaí no runtime.
- Centralizar política de entidade, taxonomias e ordenações em domínio puro; não espalhar regex e
  arrays diferentes pelos componentes.
- Não rotular todo `Horizontal` como Condomínio de Casas.
- Não preencher ausências com `0`; distinguir zero real, `null`, não coberto e erro.
- Tabela, gráfico e narrativa derivados devem consumir o mesmo agregado.
- Preview e PDF devem renderizar o mesmo registry e os mesmos componentes.
- Manter estados carregando, vazio, erro, escopo inválido e sucesso.
- A alteração é da feature Panorama; não criar primitive global sem necessidade.

## 5. Sequência de execução

### L0 — base, baseline e matriz de rastreio

1. Executar o protocolo Git do repositório.
2. Preservar o PDF-fonte e registrar seu hash SHA-256.
3. Criar checklist executável com os IDs `G-01…G-05` e cada slide comentado.
4. Gerar baseline visual das 62 páginas do PDF atual e registrar tamanho/paginação.
5. Rodar testes específicos do Panorama, typecheck e build para separar falhas preexistentes.

**Saída:** baseline reproduzível e checklist sem item órfão.

### L1 — contratos centrais de entidade, categorias e período

1. Criar política tipada de entidade, começando por `secovi-sp`:
   - aceita todos os verticais;
   - aceita no horizontal somente o subtipo canônico Condomínio de Casas;
   - expõe rótulos de apresentação e predicado auditável;
   - mantém ponto de extensão para FIERGS sem inventar sua regra.
2. Aplicar a política em todas as coletas e agregações: lançamentos, vendas, estoque, IVV, preços,
   coortes, maturidade, VGV e localizações.
3. Criar funções puras únicas para:
   - tipologias `1 Dormitório`, `2 Dormitórios`, `3 Dormitórios`, `4 ou + Dormitórios`;
   - padrões `Compacto`, `Econômico`, `Standard`, `Médio`, `Médio-Alto`, `Alto`, `Luxo`;
   - coortes `Até 2022`, `2023`, `2024`, `Subtotal até 2024`, anos posteriores, `Total geral`.
4. Substituir o array fixo de trimestres por geração dinâmica. O trimestre selecionado dirige
   `end_period`, capa, nomes e séries; não assumir que 1T/26 é o último dado.

**Testes:** aliases, ordem, exclusão horizontal, zero/null, trimestre corrente e trimestre sem dados.

### L2 — multi-cidade no escopo e na coleta

1. Evoluir o escopo para `cities: string[]`, mantendo adaptador de compatibilidade onde necessário.
2. Estender o seletor compartilhado ou compor uma camada específica do Panorama que reutilize a
   lista autorizada do `GeoApiScopeEngine`; UF continua obrigatória e trocar UF limpa as cidades.
3. Consultar cada cidade com limite de concorrência e `AbortSignal`; falha parcial deve identificar
   a cidade e não produzir consolidado silenciosamente incompleto.
4. Agregar somas por cidade; médias/percentuais devem ser recomputados a partir dos numeradores e
   denominadores consolidados, nunca pela média das médias municipais.
5. Mostrar recorte e proveniência: cidades selecionadas, UF, trimestre e eventuais falhas.
6. Definir título/capa/nome do arquivo de forma determinística para uma e várias cidades.

**Aceite:** teste real com duas cidades monitoradas, sem chamadas antes do escopo válido e sem
duplicidade de empreendimento dentro de cada cidade.

### L3 — ordem institucional e capa

1. Recalibrar o slide 2 contra a arte oficial neutra.
2. Evoluir o manifesto para separar identidade da lâmina (`referenceSlide`) de posição
   (`outputOrder`).
3. Mover a lâmina atual 3 para a posição 7 e deslocar 4–7, preservando 62 páginas.
4. Fazer contador, navegação, sumário, leitura contínua, deck offscreen e PDF consumirem
   `outputOrder`.

**Testes:** 62 posições contínuas, referências únicas, slide de visão/missão na posição 7 e links do
sumário corretos.

### L4 — família de gráficos 14–26 e slide 40

1. Garantir ticks explícitos do primeiro e último trimestre em todos os gráficos temporais.
2. Criar renderização de rótulos com prevenção determinística de colisão; manter tooltip acessível.
3. Reduzir a faixa “Residencial Vertical” e reservar altura suficiente ao gráfico.
4. Aplicar a mesma família aos slides 14–19 e 23–26.
5. Trocar o slide 40 para barras trimestrais, mantendo 17 períodos, destaques e comparações.
6. Não encobrir erro de dado com CSS; valores da série continuam vindos do modelo.

**QA:** 14–19, 23–26 e 40 em 1920×1080, preview e captura do PDF.

### L5 — cubo granular de mercado

Criar/estender uma estrutura granular por empreendimento que sustente, no mesmo fechamento:

- cidade, ID do empreendimento, segmento aprovado e padrão;
- tipologia canônica;
- ano de lançamento;
- unidades lançadas, finais e vendidas;
- ticket, área, R$/m² e VGV de fonte;
- faixa de maturidade e coordenadas.

Não calcular “nº de empreendimentos” a partir de quantidade de linhas de endpoint agregado. Usar
IDs distintos. Não calcular médias de preço por média simples das categorias.

Se “Faixa de Valor” do slide 31 não tiver campo ou regra autoritativa após inspecionar o contrato da
API, remover a coluna da V1 e registrar a ausência; não deixar coluna de travessões nem inventar
limites.

**Reconciliações obrigatórias:** cada dimensão soma os mesmos totais vertical/horizontal; vendidas =
lançadas − finais quando este contrato for aplicável; VGV usa fonte bruta preferencial.

### L6 — tabelas e gráficos 31–51

Executar na ordem abaixo porque cada passo alimenta o seguinte:

1. **31/32 — padrão vertical:** preencher empreendimentos, remover coluna vazia sem fonte e derivar
   a participação da mesma tabela.
2. **33 — coorte vertical:** agrupar até 2022, subtotal até 2024 e total geral.
3. **34–37 — tipologia vertical:** aplicar nomes/ordem canônica e média ponderada única.
4. **38–40 — padrão vertical/preço:** aplicar sete padrões e substituir a linha temporal por barras.
5. **41/42 — ano × padrão:** usar coortes/ordem canônicas e preencher lançada/final; participação
   deriva da matriz absoluta.
6. **43/44 — maturidade × padrão:** somente vertical, com Planta/Construção/Pronto preenchidos.
7. **45/46 — maturidade × tipologia:** mesma base, nomes 1→4+.
8. **48 — coorte horizontal:** agrupamento canônico e política Condomínio de Casas.
9. **49 — preço horizontal:** abrir por padrão e manter somente horizontal aprovado.
10. **51 — VGV geral:** padrões verticais, subtotal vertical, padrões horizontais, total geral e
    empreendimentos distintos.

Em cada par tabela/gráfico, adicionar teste que prove igualdade de categorias, ordem e totais.

### L7 — resumo, narrativa, mapa e regressão

1. Recalcular os slides 29, 53 e 54 a partir dos agregados corrigidos.
2. Não escrever que foram aprovados pela Juliana; ela declarou não ter revisado o resumo.
3. Aplicar a política Secovi ao mapa e validar que apenas o universo vertical previsto aparece.
4. Revisar assets/encerramento 57–62 e garantir ausência de regressão.
5. Remover o arquivo morto `lib/pdf-print-interceptor.ts` somente se continuar sem imports e se a
   remoção estiver coberta pelo build.

### L8 — verificação terminal

1. Testes unitários de domínio e modelo.
2. Testes de registry/ordem e antirrepetição.
3. Testes de componentes críticos e acessibilidade básica.
4. Typecheck, lint aplicável, suíte completa e build.
5. Subir o app e executar verificação no navegador:
   - uma cidade;
   - duas cidades;
   - período posterior a 1T/26 disponível;
   - vazio, falha de uma cidade e erro total;
   - navegação das 62 páginas;
   - exportação cancelada, retomada e concluída.
6. Gerar PDF de Jundiaí e verificar página a página em 1920×1080.
7. Gerar matriz final `requisito/slide → evidência → status`.

Não encerrar com falha conhecida de V1. Se a API não fornecer um campo necessário, aplicar o
comportamento determinístico definido neste plano (remover coluna sem fonte ou estado explícito),
documentar e seguir; não fabricar valor.

### L9 — documentação, commit e handoff

1. Atualizar `DECISOES_E_PREMISSAS_PANORAMA.md` com decisões da Juliana e evidências.
2. Atualizar este plano com status/checks finais, sem apagar a especificação original.
3. Atualizar `LIVE_rebrain.md`, sempre com o link do card Monday.
4. Executar `npm run check:live-docs -- <base> <head>`.
5. Commit isolado com caminhos explícitos. Não usar `git add .`/`-A`; não adicionar o PDF-fonte sem
   autorização explícita.
6. Reportar commits locais à frente e perguntar antes de push.

## 6. Critério terminal de pronto

- [ ] G-01, G-02 e G-03 implementados e verificados;
- [ ] G-04 e G-05 registrados como V2;
- [ ] 28 comentários do PDF rastreados e resolvidos;
- [ ] slides 23–26 cobertos pela regra transversal de vendas;
- [ ] slides 29/53/54 identificados como não revisados pela Juliana;
- [ ] 62 páginas corretas em preview e PDF;
- [ ] nenhuma coluna totalmente vazia, zero silencioso ou categoria indevida;
- [ ] totais e subtotais reconciliados entre dimensões;
- [ ] testes, typecheck, lint e build aprovados;
- [ ] PDF final gerado e inspecionado;
- [ ] documentação viva atualizada;
- [ ] resposta de e-mail preenchida com evidências reais.

## 7. Formato obrigatório do handoff técnico

Informar:

- commit(s) e arquivos alterados;
- URL/ambiente verificado;
- cidades e trimestre usados no aceite;
- tabela `ID/slide → correção → teste/evidência → status`;
- total de páginas, nome e tamanho do PDF final;
- resultados de testes/typecheck/lint/build;
- pendências V2;
- qualquer limitação de API ainda visível e o comportamento aplicado.

## 8. Resposta final em formato de e-mail para a Juliana

Ao terminar, preencher os colchetes com resultados reais e devolver exatamente uma resposta pronta
para envio, neste formato:

> **Assunto: Panorama Secovi-SP — retorno das correções da V1**
>
> Boa tarde, Juliana!
>
> Obrigado pelos comentários no Panorama de Jundiaí. Concluímos a revisão da V1 e tratamos os
> apontamentos do PDF.
>
> Principais ajustes realizados:
>
> - corrigimos a ordem das páginas institucionais e o layout da capa municipal;
> - ajustamos os gráficos de lançamentos e vendas para exibir o primeiro período, evitar
>   sobreposição de rótulos e melhorar a área útil;
> - padronizamos nomes e ordem de tipologias e padrões;
> - agrupamos os anos conforme solicitado e incluímos subtotal até 2024 e total geral;
> - corrigimos as matrizes de oferta lançada/final, maturidade e VGV, incluindo contagens de
>   empreendimentos, subtotais verticais, horizontais e total do mercado;
> - aplicamos ao Secovi-SP o universo de empreendimentos verticais e, no horizontal, apenas
>   Condomínio de Casas;
> - incluímos seleção de múltiplas cidades e períodos posteriores a 1T/26.
>
> Validamos as 62 páginas no preview e no PDF usando **[cidade(s)]**, **[trimestre]**. O arquivo final
> possui **[tamanho]** e foi conferido página a página. Também executamos **[testes e resultado]**.
>
> Como combinado, ficaram para uma V2:
>
> - a adoção do novo padrão visual das tabelas da Rebrain, assim que recebermos uma referência;
> - a exportação em PowerPoint editável.
>
> A parte de resumo/análises textuais foi mantida como não homologada, pois entendemos que ela não
> fez parte desta primeira rodada de comentários. Podemos incluí-la na próxima rodada de validação.
>
> Segue o novo PDF para conferência: **[nome/link do arquivo]**.
>
> Obrigado!

## 9. Prompt terminal para o Luna

> Execute integralmente `PLAN_LUNA_CORRECOES_V1_JUNDIAI.md` na `main`. Use
> `MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md` como matriz de aceite. Não implemente o novo padrão
> de tabelas nem PPTX: ambos são V2. Não pare após alterar o código; conclua testes, browser QA,
> geração e inspeção do PDF de 62 páginas, documentação, commit isolado e handoff. Preserve o
> PDF-fonte não versionado. Só encerre quando os 28 comentários e G-01/G-02/G-03 tiverem evidência,
> e devolva ao final a resposta de e-mail à Juliana preenchida com resultados reais.
