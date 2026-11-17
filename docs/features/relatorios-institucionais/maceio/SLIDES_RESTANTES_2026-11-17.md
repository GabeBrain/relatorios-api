# Maceió — todos os slides restantes

17/11/2026 · Codex, frente Maceió · base `dcd81c89`, main limpa, origin único 0/0 após fetch. Os commits anteriores `017fe79e`/`dcd81c89` já estavam publicados por autorização do usuário. Esta continuação foi solicitada para **todos** os restantes: mensal61–82 e trimestral61–87.

**Commit de implementação:** `97b369cd` (17/11, 09h49 BRT). Documentação no commit de fechamento; este novo lote não foi enviado nesta entrega.

## Resultado

Prévia e ampliação percorrem as **82 posições mensais e 87 trimestrais**, na ordem original, sem acrescentar comercial ao mensal. Tabelas do estado atual, horizontal, comercial trimestral, consultores, equipe e fechamento integrados. Arte extraída dos originais no PowerPoint, abertos somente para leitura; hashes dos dois PPTX preservados. Gráficos/tabelas antigos, inclusive os achatados como imagem, retirados dos slides analíticos. Fotos de equipe, identidade e artes editoriais de fechamento preservadas por edição, sem gerar fotos novas ou repetir uma capa no lugar do conteúdo.

Os dados analíticos são objetos numéricos/tabelas SVG reconstruídos para o período escolhido, não fotografias das tabelas antigas. Datas dos rodapés de dados antigos foram retiradas. A seleção mensal/trimestral e mês/trimestre/ano permanece como antes. A troca de referência invalida fotografias incompatíveis e recalcula os agrupamentos anuais; há teste específico desse contrato.

**CAGED9–14 continua pendente**, sem tabela antiga como fallback. O usuário reforçou que esses slides devem acompanhar a referência escolhida e confirmou CAGED como próxima frente depois deste fechamento. A infraestrutura BigQuery existente é ponto de partida para investigar acesso; RAIS anual não substitui a série mensal CAGED. Nenhuma consulta BigQuery ou integração CAGED foi feita nesta etapa.

## Composições

| Capacidade | Mensal | Trimestral |
|---|---|---|
| Estado atual: divisória |61|60, já implementado no lote anterior|
| Oferta por ano |62|61|
| Oferta por padrão |63, capital/RM juntas|62 capital /63RM|
| Oferta por dormitórios |64, capital/RM juntas|64 capital /65RM|
| Oferta por dormitórios e metragem |65|66|
| Área e preço/m² mínimo, médio e máximo |66|67|
| Participação por estágio: dormitórios e famílias de padrão |67–68|68–69|
| Capacidade, vendidas/final e VGV por padrão |69|70|
| Horizontal capital: divisória, tipo, ano e preços |70–73|71–74|
| Horizontal RM: divisória, tipo, ano e preços |74–77|75–78|
| Comercial capital: divisória, padrão, ano e preços |não existe|79–82|
| Consultores, equipe e fechamento |78–82|83–87|

## Fontes e modelos

Reutiliza o coletor paginado existente, com opções explícitas de segmento e fechamento. O conjunto vertical continua separado (`sources`), horizontal em `horizontal`, comercial em `commercial`; não se misturam históricos ou totais. Horizontal consulta somente estoque municipal/Padrão e histórico granular de cada município, no fechamento:14fontes no mensal e12no trimestral. Comercial consulta as mesmas2fontes apenas de Maceió no trimestral. Catálogo e acesso seguem `GeoApiScopeEngine`, sem fallback IBGE. Novas etapas exibem segmento, fonte, município e página; `BrainLoadingState` existente conserva logo, etapa/tempo real e cancelamento. Falha de segmento preserva cálculos apoiados em outras fontes válidas e habilita nova tentativa.

`remaining-data.ts` transforma os dados em tabelas e participações; `MaceioRemainingChart.tsx` apresenta o modelo. Não altera Fortaleza/SP/Secovi/FIERGS, filtros geográficos compartilhados, políticas horizontais alheias ou autenticação.

### Regras e critérios candidatos

- Fotografia histórica completa por empreendimento/tipologia, com ID, município, UF, segmento e data de lançamento válidos. Duplicações ou tipologias estabelecidas sem a fotografia do fechamento bloqueiam o indicador afetado. Universo Padrão explícito no histórico ou catálogo da tipologia. Estoque granular deve coincidir com o municipal do mesmo segmento/município.
- Universo de conferência: empreendimentos com estoque positivo no fechamento; a capacidade histórica `qty` inclui suas tipologias, inclusive as esgotadas. **Oferta lançada nesses quadros é capacidade histórica desse universo ativo, não o fluxo do mês/trimestre.** `qty` precisa ser inteiro, seguro e≥estoque. Vendidas nesses quadros = capacidade−estoque; não substitui vendas líquidas na janela dos slides anteriores.
- Oferta anual inclui um grupo inicial Até ano−5 (mensal) ou Até ano−4 (trimestral), seguindo o número de linhas de cada referência; anos anteriores não são descartados. Dormitórios incluem4oumais. Área usa faixas contínuas (44,49], (49,59] etc. para preservar valores fracionários; a correspondência com os rótulos inteiros do original aguarda homologação.
- Padrões são os rótulos declarados, com correspondência exata. Preservadas as listas distintas de capital/RM no trimestral e a nomenclatura do VGV. Faixas de valor exibidas como referência editorial, sem classificar automaticamente Econômico comoMCMV. Inconsistências entre nomenclaturas das tabelas originais continuam pendentes de homologação.
- O original chama67/68mensais (68/69trimestrais) de **tempo médio**, mas os gráficos têm séries Planta/Construção/Pronto em porcentagens. Implementação reproduz essas participações por capacidade e estoque em dois painéis horizontais, com a paleta original. Estágio vem da fotografia (`estagio_empreendimento` ou `building_status` histórico), nunca do status atual da raiz. Agrupamento por família exige família explícita ou rótulo já correspondente às4famílias; não infere MCMV. Critério candidato, sem afirmar duração em meses.
- Preços/áreas: escolha explícita do critério já existente na prévia; média ponderada por estoque histórico positivo. Mínimos/máximos só das tipologias ofertadas com observação válida. Sem preço/área positivos, não preencher com cadastro atual ou zero. Grupo sem oferta usa—.
- VGV de conferência = ticket ponderado pela capacidade histórica do grupo × quantidades (capacidade/vendidas/final), em R$milhões. Valores nominais, sem aplicar INCC silenciosamente. Esta fórmula e o universo precisam de homologação do analista antes de uso final.
- Horizontal exige subtipo explícito: Condomínio de Casas, Loteamento Fechado ou Loteamento Aberto. Nenhuma classificação deduzida do padrão de preço. Comercial é universo próprio: classes por R$/m² histórico até10mil/12mil/14mil/16mil/acima16mil, conforme a referência. Limites contínuos e método a homologar. Contagens não duplicam empreendimento entre classes: múltiplas classes no mesmo projeto bloqueiam a contagem até decisão metodológica.
- Totais/ponderações fora da precisão segura, recorte vazio, fontes ausentes e classificações desconhecidas têm mensagem explícita. Ausência não vira zero e divergência não é ajustada para imitar o original.

## Validação

- **107 testes Maceió em8arquivos aprovados**, incluindo26do novo bloco: ordens82/87, isolamento capital/RM/segmento, fechamento, capacidade, datas dinâmicas, estágios históricos, preços, categorias ausentes, estoque divergente, duplicação, precisão e vazio.
- **676 verificações de slides** (82+87, duas larguras1440/390 e dois temas) sem erro de página. Revisão final de **196 verificações** dos restantes após ajustar a disposição horizontal por estágio e cabeçalhos das tabelas. Capturas amostradas de estado atual, estágios, horizontal, comercial, equipe e fechamento comparadas aos originais. Ajuste final de abreviação dos dormitórios evita proximidade com as tags da arte.
- **16 cenários na página real** com API sintética paginada e resposta lenta: dois modelos×duas larguras×dois temas×núcleo válido/reprovado. Confirmados logo Brain durante a consulta, fontes longas independentes (42mensais/36trimestrais), horizontal/comercial, critério de preços, navegação ao último slide e botão Próximo desabilitado no limite. Sem erro de página/overflow.
- Após a abreviação final dos dormitórios:24verificações adicionais dos slides67–69, nos dois modelos/larguras/temas, aprovadas; capturas finais de estágio/comercial inspecionadas. Typecheck final também aprovado.
- Lint e tipos/build de produção aprovados; evidências locais em `.local-inputs/relatorios-lucas/maceio/complete-visual-2026-11-17/`, `complete-page-2026-11-17/` e `build-complete-2026-11-17.log`. Originais preservados.
- Regressões de cálculo/referência do handoff:34testes em4arquivos aprovados (auditoria/reconciliação/normalização e comentários Juliana). A rodada ampla anterior registrou2falhas de seleção FIERGS, reproduzidas isoladamente; não houve alteração ou tentativa de correção desse domínio nesta continuação.

## Próxima frente e limites

**Próximo: CAGED9–14 dinâmico por referência**, conforme confirmação do usuário. Depois, exportação PPTX/PDF e geração pareada para homologação. A prévia com todas as posições não significa dados/fórmulas homologados.

Não houve geração autenticada Geobrain, consulta BigQuery/CAGED, deploy ou aceite do analista. Disponibilidade real de `qty`, áreas/preços/estágios históricos, subtipos horizontais, famílias e estoque municipal por segmento ainda precisa ser comprovada em um ensaio delimitado. Critérios de universo/VGV/ponderação/faixas/taxonomia/INCC continuam candidatos. Não declarar relatório completo para entrega externa antes dessa conferência. Publicação dos novos commits depende de autorização; sem escrita Monday.

**Monday:** [Panorama Maceió / SINDUSCON](https://brain381753.monday.com/boards/18398638577/pulses/13149406169) — `13149406169`.
