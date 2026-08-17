# PLAN TERRA — Correção do mercado imobiliário e encerramento fiel v3

**Data:** 2026-08-17  
**Execução:** tarefa terminal única, direto na `main`  
**Rota:** `/rebrain/panorama-secovi-fiergs`  
**Fontes visuais oficiais:**

- `Panorama_Secovi_SP_Piracicaba_1T26_vApres_28MAI_13h50.pptx`
- `PPT Institucional_2026 - Widescreen_NOVO (1).pptx`

## 1. Resultado esperado hoje

Entregar uma versão demonstrável e coerente do relatório inteiro, preservando o avanço já obtido até o slide 28 e corrigindo a partir de Mercado Imobiliário a causa estrutural das repetições: cada intenção editorial deve possuir contrato, transformação e visualização próprios. Não é aceitável trocar apenas o título e reutilizar a mesma tabela de estoque.

Ao final:

1. haverá uma única capa;
2. as páginas institucionais e divisórias continuarão fiéis aos decks oficiais;
3. as páginas 29–56 terão tabelas e gráficos semanticamente compatíveis com a referência;
4. todo número exibido virá das APIs do recorte selecionado, mesmo quando o método estiver marcado como “Em validação”;
5. os seis slides corporativos finais serão imagens integrais exportadas do deck oficial;
6. preview e PDF 16:9 terão a mesma paginação, sem cortes, repetições acidentais ou componentes de interface impressos.

Não é objetivo desta tarefa fazer os números de Piracicaba baterem por força com o gabarito. O objetivo é fechar arquitetura, dimensões, tratamentos explícitos e apresentação; diferenças metodológicas continuam rastreáveis para homologação com os analistas.

## 2. Diagnóstico confirmado

O paginador atual encaminha várias páginas diferentes — padrão, participação, coorte, tipologia, maturidade e horizontais — para a mesma coleção `stock.units` e para o mesmo `MetricTable`. Assim, os títulos mudam, mas grupos, valores, fonte e desenho se repetem.

O gabarito congelado demonstra que essas páginas não representam a mesma métrica:

- padrão exige classificação econômica e participação;
- coorte exige ano de lançamento;
- tipologia exige dormitórios/tipo de produto;
- maturidade exige estágio ou idade do estoque;
- horizontais exigem universo filtrado e cortes próprios;
- VGV exige composição monetária, não contagem de estoque;
- participações e evoluções exigem gráficos, não cópias da tabela absoluta.

Portanto, a correção deve acontecer no modelo de dados e no manifesto antes do acabamento visual.

## 3. Regras inegociáveis

- Trabalhar direto na `main`; não criar branch.
- Preservar mudanças alheias e os avanços paralelos do Corretor.
- Não usar valores do PPT, mocks ou hardcodes numéricos em runtime.
- Exibir o valor retornado/derivado da API mesmo com metodologia aberta; aplicar selo discreto de validação e registrar a fórmula.
- Não apresentar zero como ausência. Diferenciar `0`, `null`, não coberto e erro de coleta.
- Coletar cada endpoint uma única vez por recorte e reutilizar o snapshot normalizado no relatório inteiro.
- Templates podem ser compartilhados; contratos semânticos e seletores de dados não.
- Imagens oficiais estáticas podem ser incorporadas integralmente quando não contêm números variáveis do município.
- Títulos, fontes, notas e observações precisam ser dados do modelo de página, não condicionais espalhadas no componente.
- Toda transformação deve declarar fonte, universo, dimensões, fórmula, unidade, arredondamento e status metodológico.

## 4. Fase A — manifesto e paginação canônica

1. Evoluir cada entrada do manifesto para conter `outputOrder`, `referenceSlide`, `section`, `pageKind`, `modelKey`, `visualKind`, `sourceKeys`, `methodologyStatus`, `staticAsset` (quando aplicável) e `enabled`.
2. Manter somente a capa principal, correspondente ao slide 1 da referência, e desativar a segunda capa redundante.
3. Não renumerar silenciosamente a referência: a página impressa usa `outputOrder`, enquanto auditoria e QA continuam registrando `referenceSlide`.
4. As seis páginas corporativas finais substituem as páginas genéricas de encerramento; não são adicionadas como duplicatas.
5. Criar validação do manifesto que falhe quando páginas editoriais distintas apontarem, sem justificativa explícita, para o mesmo `modelKey + visualKind`.

**Aceite:** uma única capa; navegação, contador, preview e PDF concordam; referência original continua rastreável.

## 5. Fase B — captura fiel dos slides estáticos

Exportar dos decks oficiais em 16:9 e incorporar como imagens raster de alta resolução:

- capa principal escolhida;
- divisórias integralmente institucionais que não exigirem texto dinâmico;
- “Consultores do estudo”;
- “Equipe”;
- quadro de consultores;
- slide do aplicativo/QR code;
- slide “Terreno de mudanças”;
- encerramento Brain com endereço e contatos.

Preferir PNG/WebP sem perdas visíveis, largura mínima de 1920 px. Usar o próprio PowerPoint para exportar quando disponível; caso contrário, usar um renderizador PPTX confiável. Não reconstruir manualmente retratos, QR codes, logos ou peças promocionais já aprovadas.

Criar `StaticOfficialSlide` com `object-fit: contain`, fundo correto, sem footer, título ou margem adicional do app. O arquivo exportado já é o slide completo.

**Aceite:** comparação sobreposta apresenta enquadramento e proporção equivalentes ao original; QR code permanece legível; não existe assinatura duplicada.

## 6. Fase C — snapshot normalizado e cubo do mercado

Manter uma coleta por recorte e construir um nível granular reutilizável, preferencialmente por empreendimento/produto/período. O registro normalizado deve suportar, quando presente na API:

- identificação do empreendimento e grupo/incorporadora;
- município/UF e coordenadas;
- segmento vertical/horizontal;
- padrão de mercado;
- tipologia/dormitórios;
- data, trimestre e ano de lançamento;
- estágio da obra, data de entrega ou idade necessária para maturidade;
- unidades lançadas, oferta final/estoque e vendas;
- VGV lançado e VGV em oferta;
- área privativa, ticket e preço por m²;
- fonte/endpoint e instante da coleta.

Conservar o payload bruto ou referência diagnóstica suficiente para explicar cada agregação. Campos ausentes não devem ser inventados. Implementar adaptadores por endpoint e um relatório de cobertura de campos/dimensões.

Reconciliar invariantes antes da renderização:

- total = vertical + horizontal, quando os universos são complementares;
- participação soma aproximadamente 100%, respeitando arredondamento;
- oferta final não pode ficar negativa;
- VGV, ticket e preço/m² preservam unidade monetária;
- recorte temporal termina no trimestre selecionado;
- páginas horizontais excluem verticais no próprio seletor, não apenas na legenda.

**Aceite:** toda página quantitativa declara quais registros e campos sustentam seu resultado.

## 7. Fase D — contratos específicos das páginas 29–56

Substituir o fallback genérico pelos seguintes blocos independentes. A numeração é a da apresentação de referência.

| Ref. | Intenção | Contrato/transformação | Visual obrigatório |
|---:|---|---|---|
| 29 | Resumo do mercado | segmento × empreendimentos, oferta lançada, oferta final e disponibilidade | tabela-matriz oficial |
| 31 | Oferta por padrão | padrão × vertical/horizontal/total, com empreendimentos, oferta lançada, final e disponibilidade | tabela hierárquica |
| 32 | Participação por padrão | participação da oferta lançada e final por padrão | barras agrupadas ou 100% empilhadas, com rótulos |
| 33 | Oferta por ano de lançamento | coorte anual × oferta inicial/final/disponibilidade | tabela de coortes, anos em ordem |
| 34 | Oferta por tipologia | tipologia × segmento × oferta inicial/final/disponibilidade | tabela hierárquica |
| 35 | Participação por tipologia | participação da oferta lançada e final por tipologia | barras agrupadas/100% com rótulos |
| 36 | Ticket por tipologia | ticket médio/mediano por tipologia e segmento | tabela comparativa |
| 37 | Preço por tipologia | preço/m² por tipologia | barras/colunas ordenadas |
| 38 | Ticket por padrão | ticket médio/mediano por padrão e segmento | tabela comparativa |
| 39 | Preço por padrão | preço/m² por padrão | barras/colunas ordenadas |
| 40 | Evolução de preço | série trimestral de preço/m², limitada à janela oficial | linha suave, pontos e destaque do trimestre comparável |
| 41 | Estoque por coorte e padrão | matriz ano de lançamento × padrão | matriz absoluta/heatmap discreto |
| 42 | Participação por coorte e padrão | composição percentual da mesma matriz | matriz percentual ou barras 100% |
| 43 | Maturidade por padrão | Planta/Construção/Pronto × padrão | tabela absoluta |
| 44 | Participação da maturidade por padrão | composição percentual | barras 100% empilhadas |
| 45 | Maturidade por tipologia | Planta/Construção/Pronto × tipologia | tabela absoluta |
| 46 | Participação da maturidade por tipologia | composição percentual | barras 100% empilhadas |
| 48 | Oferta horizontal por coorte | somente horizontais, ano × lançada/final/disponibilidade | tabela de coortes |
| 49 | Preço horizontal | ticket e/ou preço/m² dos horizontais conforme referência | tabela + gráfico comparativo |
| 51 | VGV | VGV lançado/final por segmento, padrão e total | matriz monetária fiel |
| 53–54 | Leitura executiva | fatos derivados dos modelos anteriores | texto determinístico com números citáveis |
| 56 | Localização | coordenadas válidas dos empreendimentos do universo | mapa com legenda e fonte |

Se um campo necessário não existir em nenhum endpoint, manter a página com estrutura fiel e estado “Dimensão não coberta pela API”, acompanhado do diagnóstico do campo ausente. Não substituir por outra dimensão apenas para preencher a tela.

## 8. Fase E — biblioteca visual fiel

Criar primitives reutilizáveis sem apagar o significado dos slides:

- `SecoviMatrixTable` para cabeçalhos multinível, subtotais cinza e totais em negrito;
- `ParticipationBars` para lançado × final;
- `StackedShareChart` para participações e maturidade;
- `PriceBars` para ticket/preço por m²;
- `SecoviTrendChart` para séries trimestrais arredondadas;
- `MarketMap` para pontos e legenda;
- `SourceLine`, `MethodologyBadge`, `ObservationLine` e `VariationBox`.

Aplicar a identidade da referência: fundo branco, títulos grandes, destaque verde, marcador amarelo, linhas inferiores Secovi/Brain, tipografia e espaçamento 16:9. As séries devem usar curvas suaves sem alterar valores. Incluir rótulos apenas nos pontos comparáveis ou destaques definidos pela referência.

Tabelas longas devem ajustar densidade dentro do slide; não podem rolar no PDF. Quando o conteúdo exceder o espaço, dividir em páginas declaradas no manifesto, nunca cortar linhas.

## 9. Fase F — textos automatizados e metodologia visível

Gerar os textos de análise com regras determinísticas. Cada frase deve apontar para uma métrica presente no `PanoramaReportModel`, incluindo maior/menor grupo, variação contra o mesmo trimestre anterior, concentração, mudança de participação, maturidade dominante e posição do trimestre atual na janela observada.

Não usar LLM nesta entrega. Quando uma frase depender de regra editorial ainda não homologada, exibir o número da API com selo “Em validação” e registrar a premissa no painel de metodologia. Remover placeholders como “LLM necessário aqui” do PDF demonstrável.

## 10. Fase G — gerador e visualizador real de PDF

O fluxo atual está comprovadamente incorreto: `ReportPaginator` chama `window.print()` e tenta alternar entre a página visível e todas as páginas por `hidden print:block`. A impressão inclui partes do shell da aplicação e, no ambiente publicado testado, materializa somente duas folhas — uma com formulário/interface/capa e outra praticamente vazia. O CSS `@page` não transforma essa árvore em um deck confiável.

Substituir integralmente esse caminho por geração explícita de um arquivo PDF no navegador. A primeira versão não precisa ser editável e não deve gerar PPTX.

### Contrato da exportação v1

1. Renderizar todas as entradas ativas do manifesto em um contêiner de exportação isolado, fora da tela, mas nunca com `display: none`.
2. Fixar cada slide em 1920 × 1080 px, proporção 16:9, sem shell, filtros, abas, botões, navegação ou margens do navegador.
3. Aguardar `document.fonts.ready`, decodificação de todas as imagens e estabilização dos gráficos antes da captura.
4. Desabilitar animações durante a exportação, especialmente nos componentes Recharts.
5. Rasterizar cada slide individualmente em alta resolução e inserir a imagem em uma página PDF 16:9 própria. Nunca capturar o relatório inteiro como uma única imagem longa.
6. Usar uma biblioteca de captura DOM compatível com SVG e uma biblioteca de composição de PDF, preferencialmente `html-to-image` + `pdf-lib` ou equivalentes tecnicamente justificados.
7. Processar sequencialmente ou em lotes pequenos para limitar memória, liberando canvases e URLs temporárias após cada página.
8. O total de páginas do PDF deve ser exatamente igual ao total de entradas `enabled` do manifesto — previsto em 61 após a remoção da capa redundante.
9. Adicionar metadados do arquivo: título, cidade/UF, trimestre, data de geração e versão do manifesto.
10. O arquivo pode ser rasterizado; preservar texto editável, acessibilidade interna ou PPTX fica explicitamente para uma fase posterior.

### Fluxo de interface

- Renomear a ação principal para **“Visualizar PDF”** enquanto estivermos nesta etapa.
- No clique, abrir imediatamente uma aba vazia autorizada pelo gesto do usuário, gerar o PDF com progresso `n/total` e então navegar essa aba para uma `Blob URL` com MIME `application/pdf`.
- O resultado deve abrir no visualizador nativo de PDF do Chrome/Edge, onde o usuário poderá revisar, paginar e baixar. Não abrir a caixa de impressão.
- Exibir no app estados `preparando`, `renderizando página n de total`, `montando PDF`, `pronto` e `erro`, impedindo cliques duplicados.
- Se o navegador bloquear a nova aba, manter o Blob e apresentar ações **“Abrir PDF”** e **“Baixar PDF”**, sem refazer a coleta ou a renderização.
- Revogar a `Blob URL` anterior somente quando ela não estiver mais em uso; limpar recursos ao trocar recorte ou desmontar a página.

### Aceite obrigatório do PDF

- abre no visualizador de PDF do navegador, não em `window.print()`;
- contém exatamente uma página por slide ativo e nenhuma página branca;
- todas as páginas são 16:9 e têm o mesmo enquadramento do preview;
- não contém cabeçalho, URL, data, filtros, tabs ou qualquer interface da aplicação;
- capa, gráficos, tabelas, mapa, footers e slides corporativos são visíveis e não estão cortados;
- a ordem segue `outputOrder` e a numeração editorial permanece rastreável por `referenceSlide`;
- funciona no build de desenvolvimento e no publicado, ao menos em Chrome e Edge;
- gerar novamente o mesmo recorte não dispara nova coleta das APIs se o modelo ainda estiver válido no cache.

Remover `window.print()` do botão do Panorama e deixar `panorama-print.css` apenas como legado temporário não utilizado, ou eliminá-lo se não houver outro consumidor. A funcionalidade não pode depender de diálogo de impressão ou de `@media print` para existir.

## 11. Fase H — testes de contrato, regressão e QA visual

Adicionar testes para:

1. adaptadores e normalização dos campos;
2. agregações de padrão, tipologia, coorte, maturidade, segmento e VGV;
3. percentuais, denominadores zero, moeda e arredondamento;
4. separação real entre os `modelKey` das páginas 29–56;
5. cobertura do manifesto e ausência de páginas duplicadas;
6. inexistência de valores provenientes do gabarito em runtime;
7. estados `zero`, `sem cobertura`, `erro` e `em validação`;
8. um único fetch por endpoint/recorte durante a geração.

Executar QA visual lado a lado, no mínimo, para as referências 1, 12, 14, 29, 31–46, 48, 49, 51, 53, 54, 56 e todas as páginas corporativas finais. Verificar visual correto, ausência de repetição indevida, títulos/fontes/notas/selos, alinhamento, legibilidade, cortes, correspondência preview/PDF e carregamento das imagens no build publicado.

Rodar typecheck, testes, build e, se disponível, o smoke visual automatizado. Falha em teste, build ou página vazia bloqueia publicação.

Adicionar testes específicos do exportador para:

- contagem `PDF pages === manifest.filter(enabled).length`;
- dimensões 16:9 de todas as páginas;
- ordem do manifesto;
- ausência de página em branco;
- ausência dos seletores do shell no contêiner capturado;
- geração de Blob `application/pdf` com tamanho não vazio;
- recuperação quando uma imagem ou página falhar;
- reuso do `PanoramaReportModel` já carregado, sem chamadas duplicadas à API.

Em smoke E2E, interceptar a Blob URL ou salvar o PDF de teste, abrir com `pdfjs-dist` e validar contagem, dimensões e renderização de miniaturas representativas das páginas 1, 29, 40, 51, 56 e encerramento.

## 12. Fase I — documentação, commit e publicação

Atualizar antes do commit:

- este plano com resultados da execução;
- o gabarito congelado somente para registrar mapeamentos confirmados, sem alterar valores;
- `DECISOES_E_PREMISSAS_PANORAMA.md` com fórmulas adotadas e dimensões sem cobertura;
- `docs/projetos/LIVE_rebrain.md` com o estado real;
- documentação técnica do `PanoramaReportModel` e do manifesto.

Revisar `git diff`, preservar alterações não relacionadas, fazer commit direto na `main`, publicar pelo fluxo já adotado e conferir a URL publicada.

## 13. Ordem de execução para maximizar o resultado de hoje

1. Corrigir manifesto, remover segunda capa e importar os seis slides finais.
2. Criar contratos específicos e bloquear o fallback repetido.
3. Implementar primeiro os visuais 29, 31–46, 48, 49 e 51.
4. Conectar narrativas e mapa aos modelos reais.
5. Implementar o gerador rasterizado, abrir o Blob no visualizador nativo e validar uma página por slide.
6. Fazer acabamento visual até o slide 28 sem regressão.
7. Rodar QA completo, testes/build, documentar, commitar e publicar.

Se o tempo exigir corte, não sacrificar a correção semântica: é preferível um gráfico fiel com selo metodológico a uma tabela bonita reutilizada no slide errado.

## 14. Relatório obrigatório ao final

Terra deve informar:

- commit e URL publicada;
- quantidade final de páginas e qual capa foi removida;
- páginas estáticas oficiais incorporadas;
- matriz `referenceSlide → modelKey → visualKind → fonte API`;
- páginas com dados completos, parciais ou dimensão não coberta;
- testes/typecheck/build e resultados;
- screenshots de QA ou localização dos artefatos;
- quantidade, dimensões e tamanho em bytes do PDF de teste;
- confirmação de abertura no visualizador nativo e ausência de `window.print()`;
- diferenças visuais remanescentes;
- métodos ainda dependentes dos analistas, sem tratá-los como bloqueio para a demonstração.
