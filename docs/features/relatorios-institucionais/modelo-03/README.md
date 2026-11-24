# Modelo 03 — gerador comum

## Entrega inicial — 24/11/2026, Codex/Lucas

Rota provisória: `/rebrain/relatorios-institucionais/modelo-03`. Lazy, sem item de menu, Home ou Command Palette. Não substitui Maceió nem altera seus cálculos, referências ou exportações.

Lucas autorizou iniciar os slides com recursos disponíveis, configuração mensal/trimestral/semestral, entidade, competência e cidade, inclusão opcional de RM, progresso por etapa, JSON/CSV completos e PPTX editável. **INCC-DI confirmado por Lucas como base do Modelo 03**, revisável depois. Push não autorizado nesta entrega.

## Fontes e referências

- [Pasta de modelos](https://drive.google.com/drive/folders/139aKOxC4clvhHe0uXsRJ8lhdIK5cdaYA): 81 arquivos diretos observados nesta sessão. Os originais estão também em `.local-inputs/relatorios-lucas/modelo-03/`, fora do Git.
- [ADEMI-PR / Curitiba / 2T2026](https://drive.google.com/file/d/1cLd59MFqyICd7A7j9B-ZcUhot0W3O-xl/view): 158 slides reais, contados em `ppt/presentation.xml`; 70 gráficos. Texto dos 158 slides e mapas/capa/arte relevantes inspecionados. Não houve revisão visual integral de todos os 16 panoramas.
- [Manual API Geobrain 1.02](https://drive.google.com/file/d/1h0OoXLQ-9R4jRQXrlzYuBnKCnpCR5X2K/view): endpoints temporais e histórico, limites do cadastro atual e periodicidade por município.
- Planilha local de Lucas: `Panoramas Entidades e Institucionais - Revisado Fabio.xlsx`. Curitiba/RMC trimestral é Modelo 3; o Excel mensal ADEMI-PR é Personalizado. Não foi encontrada apresentação mensal ADEMI-PR nesta pasta. A edição mensal/semestral deste motor adapta as janelas do molde trimestral, sem afirmar que existam originais equivalentes.
- Catálogo dos 16 projetos, IDs, recortes e evidência: `src/features/relatorios-institucionais/modelo-03/model.ts`.

### Recortes dos 16 projetos, exceto Maceió

| Recorte observado | Projetos |
|---|---|
| Cidade única | Uberlândia, Rio de Janeiro, Niterói, Rio Verde, Ponta Grossa, Blumenau, Campo Grande, Boa Vista |
| Cidade e RM | Curitiba, Joinville, São Luís, Belém, Natal, Teresina |
| Duas cidades, sem assumir toda a RM oficial | Itajaí/Navegantes; Penha/Balneário Piçarras |

Belém: slides 7–9 confirmam Ananindeua e Marituba além da principal. Natal: slide 8 nomeia Extremoz, São Gonçalo do Amarante, Macaíba, Parnamirim e Nísia Floresta. São Luís: mapa renderizado do slide 9 delimita São José de Ribamar, Paço do Lumiar e Raposa além da principal. Joinville: quadros nomeiam Joinville e Araquari.

O catálogo é de **recortes de estudo**, não de regiões metropolitanas legais. Ao selecionar a referência ou uma cidade principal com estudo regional cadastrado, o recorte é preenchido automaticamente, cruzado com o catálogo autorizado. O analista pode retirar/reincluir cidades e restaurar o padrão; a lista oferece somente membros regionais cadastrados, nunca todas as cidades da UF ou do token. A mesma validação protege a coleta. A faixa RM exclui a principal. Trocar cidade limpa o recorte antigo e aplica o novo. Os pares usam a parceira na faixa RM do molde, sem presumir toda uma região legal. Relatórios de cidade única continuam sem RM automática.

### Complemento de fontes — 24/11/2026

[Lista de cidades monitoradas](https://docs.google.com/spreadsheets/d/1FGRGa_PB47CJwGBhww5owleHCp0b8pkE/edit), cruzada com entidade e originais:

- **Curitiba/ADEMI-PR:** Almirante Tamandaré, Araucária, Campina Grande do Sul, Campo Largo, Campo Magro, Colombo, Fazenda Rio Grande, Pinhais, Piraquara e São José dos Pinhais, todos PR.
- **Teresina:** Altos, Demerval Lobão, José de Freitas e União/PI; Timon/MA. O PPTX confirma RM sem enumerá-la no texto: este padrão é inferido da lista monitorada vinculada ao SINDUSCON Teresina, não uma enumeração extraída do deck. Timon é associado pela entidade, pois o campo regional da planilha o atribui erroneamente a São Luís. A pertença à RIDE é confirmada pelo [Decreto 10.129/2019](https://www2.camara.leg.br/legin/fed/decret/2019/decreto-10129-25-novembro-2019-789462-normaatualizada-pe.html).
- Joinville: Araquari; São Luís: São José de Ribamar, Paço do Lumiar e Raposa; Belém: Ananindeua e Marituba; Natal: Extremoz, São Gonçalo do Amarante, Macaíba, Parnamirim e Nísia Floresta. Pares: Navegantes para Itajaí e Balneário Piçarras para Penha.

Municípios da referência sem acesso são listados explicitamente e não entram no cálculo. Há opções adicionais cadastradas para Curitiba (demais integrantes da [RMC/AMEP](https://www.amep.pr.gov.br/Pagina/Sobre-RM-de-Curitiba)) e Belém (Castanhal, lista monitorada); não são selecionadas por padrão. Não se importam automaticamente vínculos errôneos da planilha (Imperatriz/Timon → São Luís, Araguari → Belo Horizonte). Novas opções regionais exigem vínculo verificado, além do acesso da API.

**Padrão visual revisto em 24/11/2026 a pedido de Lucas:** o carregamento da consulta usa painel dentro da página, com borda, fundo de card e altura mínima de48rem, seguindo Fortaleza/Maceió e a contenção do SP institucional. `BrainLoadingState` fica absoluto somente dentro desse painel, alinhado ao topo com py8. Removido o portal/overlay sobre toda a área principal. A prévia fica oculta enquanto a consulta está em andamento, e o painel entra em vista ao iniciar. Etapas numeradas, status textual/percentual, barras finas e destaque da etapa ativa seguem Maceió; preservados cronômetro, cancelamento e aviso429. Exportação usa o estado `operation` inline, como os demais relatórios. Não altera o coletor concorrente nem os motores paralelos.

**Validação deste ajuste:** 35 testes/4 arquivos (29 Modelo 03 + 1 catálogo + 5 layout), lint e build aprovados. Sete cenários do script `scripts/diagnostics/modelo03-visual.mjs` novamente aprovados, com pré-seleção, retirada/restauração, exclusão de Londrina/Timon no seletor Curitiba, limites do overlay dentro do main, três periodicidades, estados inválidos e 429 cancelado. Downloads JSON/CSV/PPTX lidos; capturas desktop claro/celular escuro inspecionadas. API interceptada sintética, sem nova coleta autenticada. Os 32 testes abaixo descrevem a entrega inicial, não esta rodada.

## Estrutura e cálculos

### Coleta concorrente limitada — 24/11/2026

Lucas relatou Curitiba/RM ainda carregando após 12 minutos e pediu aceleração para **todas as cidades do Modelo 03**, sem remover fontes. O coletor anterior aguardava cada resposta antes de iniciar a próxima: Curitiba + dez municípios exige 99 fontes, além das páginas. Agora há duas filas de fontes independentes, com um único portão de início a cada 500 ms. As páginas de cada fonte continuam sequenciais, todas as validações de paginação permanecem, e a saída conserva a ordem determinística original. Não há cache novo nem redução da cobertura histórica.

429 cria pausa compartilhada respeitando Retry-After (60s quando ausente). Nenhuma fila inicia nova chamada durante a pausa; chamadas já em voo podem terminar. O aviso permanece enquanto há pausa pendente. Cancelar aborta ambas as filas; 401/403 interrompe a coleta e cancela pares, sem continuar credencial inválida. Progresso agrega páginas em andamento e fontes concluídas, sem usar a posição da última fonte como total.

34 testes Modelo 03 aprovados, incluindo Curitiba/mensal, Natal/trimestral e Teresina/semestral com latência simulada de 1s: nove fontes em 5s versus 9s seriais, máximo duas requisições em voo e intervalo global mínimo de 500ms. Verificados Retry-After compartilhado, cancelamento de duas requisições e manutenção da ordem/fontes/páginas. Lint/build aprovados e cenário Edge trimestral sintético reexecutado, com 58 indicadores disponíveis e downloads JSON/CSV/PPTX lidos. Isto mede implementação controlada, não a duração real da API. Sem credencial pessoal para diagnosticar a latência da execução relatada pelo usuário. O novo comportamento exige frontend atualizado e nova geração; não acelera retroativamente uma consulta já iniciada no código anterior.

`blueprint.ts` define 58 posições de indicadores e 39 institucionais/editoriais (97 antes de suprimir RM não selecionada). Excluídos intenção de compra 9–24 e 45 posições de fontes externas. O número de páginas físicas é dinâmico: quadros de territórios distintos e tabelas longas podem exigir continuação; nenhuma linha é truncada. JSON relaciona posição, página original e páginas físicas. Fixture capital+RM gera 103 páginas, não 158.

As 58 posições abrangem lançamentos, vendas líquidas, estoque, IVV, preços, distribuição/áreas, idade de oferta, capacidade e VGV, nos segmentos vertical, horizontal e comercial. Fonte municipal: `temporal-analysis-city/{releases,sales,stock}`, por padrão/tipologia. Fonte detalhada: `POST /public-api/v2/building-with-history-internal` por segmento.

- Catálogo via `GeoApiScopeEngine` e seletor compartilhado. Sem IBGE como alternativa. Sem acesso válido ou período encerrado, nenhuma chamada pesada.
- Histórico solicitado desde o maior entre 2021 e ano selecionado menos cinco; competências efetivamente necessárias são exigidas pelo indicador. Paginação confere sequência, total, última página e host; falhas não viram fonte completa.
- Uma chamada por vez, intervalo mínimo de 500 ms entre inícios. 429 pausa até `Retry-After` ou 60 segundos e repete a mesma página; pode cancelar. 401/403 interrompem sem repetir credencial. Falhas transitórias têm tentativas limitadas.
- Quantidades somadas no mês/trimestre/semestre; estoque é fotografia final; comparações anuais e 12 meses têm janelas explícitas. IVV exige estoque anterior + lançamentos − vendas = estoque final; denominador vazio produz `null`, não zero por cento. Janelas anteriores à cobertura são omitidas do histórico do IVV.
- Preços individuais históricos ponderados pelo estoque positivo; não usar preço/estoque cadastral atual como substituto. Zero estoque não gera preço zero. Campos contribuintes ausentes bloqueiam o respectivo quadro.
- VGV de fluxo: valor nominal mensal × INCC-DI do fechamento ÷ índice do mês, antes da soma e conversão para milhões. Índice ausente bloqueia valores afetados; não reutilizar base anterior. Série existente de Fortaleza é somente fonte de índices, sem herdar política de Fortaleza.
- VGV do universo ativo: capacidades e estoques históricos valorizados aos preços do fechamento; vendido acumulado é capacidade menos estoque. Diferente do fluxo de vendas do período, explicitado nas notas/diagnóstico.
- Idade da oferta: meses desde lançamento ponderados por capacidade/estoque; não é prazo de escoamento. Critério inicial sujeito à conferência metodológica.
- Fluxos por bairro/tipologia usam histórico e reconciliação municipal. Quando lançamento não é explícito, capacidade da fotografia do mês de lançamento, zero nos outros meses, sempre reconciliado; sem derivação por diferença de estoque.
- MCMV exige identificação explícita no agrupamento temporal. Não transformar Econômico em MCMV silenciosamente neste novo motor. Se o token/base não fornecer o grupo, os quatro indicadores MCMV ficam pendentes com causa específica. Confirmar eventual de-para com o analista após o primeiro JSON real.
- Horizontal: produto declarado tem prioridade; padrão reconhecido ou quartos positivos identificam casas/sobrados na ausência de tipo. Chácaras são categoria própria neste original. Demais casos permanecem “Sem classificação”, com aviso. Não herdar os dez IDs particulares de Maceió.
- Diferenças de fechamento municipal/detalhado ficam nos avisos: séries municipais preservam o agregado, quadros granulares usam o detalhe completo. Não importar a exceção numérica de Marechal nem fixar números do original. Divergências reais exigem conferência antes de homologar o modelo comum.

## Identidade, processamento e exportação

Capa e contracapa parametrizam entidade, cidade e período. Curitiba/ADEMI-PR usa a imagem original da capa (foto, marcas) com título/competência/ano em texto; outras combinações usam capa neutra da mesma família verde, sem mostrar a marca ADEMI em entidade alheia ou foto de Curitiba como se fosse outra cidade. Logos/fotos oficiais específicos dos demais destinos ainda precisam de aplicação por entidade. Não há logo inventado.

Artes institucionais originais 2–6/156–158 preservadas como imagens substituíveis, com revisão editorial explícita para números institucionais/equipe. Tabelas e gráficos têm elementos SVG nativos; corpo claro, rodapé verde e marcação do original. Não afirmar equivalência visual pixel a pixel das 97 posições. Perspectivas 144–153 não copiam previsões antigas do 4T2025; exigem texto revisado.

Reutilizados Select, Checkbox, Popover/Command, Button, Tabs, Progress e `BrainLoadingState`. Etapas com porcentagem por fonte/página realmente processada, depois indicador calculado e organização; cronômetro real, cancelamento, pausa 429 identificada. Cálculos e JSON/CSV em worker. Troca de entidade/recorte/período/token cancela e descarta geração/exportação anterior.

JSON completo por geração: identidade, seleção, período, critérios, INCC-DI, resumo conciliado, fontes, HTTP sanitizado, cobertura, categorias, campos faltantes, agregados e situação/valores/avisos de todas as posições, mais mapa de páginas físicas. CSV inclui todas as células de todos os quadros e agregados municipais das fontes dentro da janela; BOM e proteção contra fórmulas em rótulos. Não é exportação de históricos cadastrais individuais. Sem token, senha, cabeçalhos, nomes/endereços/IDs de empreendimentos.

PPTX compartilha a mesma renderização da prévia e conversor DrawingML existente: texto/células/formas vetoriais editáveis, gráficos sem workbook vinculado, imagens substituíveis. Notas por página e JSON em `customXml/modelo03-audit.xml`. Deck oculto memoizado por trabalho; progresso não redesenha todas as páginas. Exportação exige geração corrente, pode cancelar e não consulta novamente a API.

## Evidências e limites

- 32 testes em quatro arquivos: Modelo 03 (26), catálogo (1), layout/navegação (5). Incluem três periodicidades, 58 indicadores no cenário completo, UF interestadual, não duplicar principal, fotografia ausente, números nulos/zero, INCC ausente, não inventar MCMV, privacidade, paginação, 429, cancelamento, 401 e total/host inválidos.
- Tipos, eslint e build de produção aprovados. Advertências já existentes de chunks grandes/Browserslist/XLSX permanecem.
- Edge headless: sete cenários com API sintética interceptada — trimestral desktop claro, mensal celular escuro, semestral desktop escuro, erro de catálogo celular claro, vazio, sem token e 429 cancelado. Sem chamadas pesadas nos três estados inválidos. Downloads JSON/CSV/PPTX lidos; novo recorte remove a geração anterior. Sem exceções ou overflow. Capturas em `.local-inputs/relatorios-lucas/modelo-03/visual-2026-11-24/`; `results-all.json` guarda a rodada completa.
- PowerPoint abriu 103 páginas do arquivo sintético; a capa final com arte original tem quatro objetos de texto editáveis. Mudança de um título persistiu após salvar e reabrir cópia. Capa/gráfico renderizados. Isto prova abertura e edição do texto observado, não revisão visual integral das 103 páginas.
- **Não verificado:** geração autenticada da API nas 16 cidades, cobertura/padrões/MCMV do token real, valores de Curitiba ou paridade numérica com original. Não há credencial pessoal de script confirmada. Ensaio headless comprova implementação, não homologação imobiliária ou publicação no Lovable.
- Ficam para evolução: 45 indicadores externos, conteúdo prospectivo/equipe, logos/fotos específicos das outras entidades, conferência metodológica e primeira geração real. Não vender as 39 posições editoriais como 39 indicadores homologados.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`. Referência documental; nenhuma escrita no Monday.
