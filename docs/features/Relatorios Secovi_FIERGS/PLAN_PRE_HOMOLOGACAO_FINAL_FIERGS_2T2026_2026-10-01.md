# Plano de ação técnico — acabamento pré-homologação final do Panorama FIERGS 2T2026

**Data:** 01/10/2026
**Estado:** pronto para execução
**Origem:** auditoria visual e numérica do primeiro PDF gerado após a republicação no Lovable
**Artefato-base:** `assets/panorama-fiergs-rs-2T2026.pdf`
**SHA-256:** `FD42A9453481849D74EBD57AA91BF42A2D5D1811539F8CF62694BE198997371D`
**Recorte:** FIERGS/RS, dez municípios, 1T2023–2T2026

## 1. Objetivo

Eliminar as últimas inconsistências de completude dimensional e reduzir as ressalvas editoriais antes de solicitar a homologação final da Juliana, preservando as reconciliações já aprovadas:

- vendas verticais: **1.091**;
- oferta final vertical: **5.251**;
- mercado horizontal: **129 empreendimentos / 30.476 unidades lançadas / 3.365 unidades finais**;
- mapas: **648 empreendimentos georreferenciados**;
- contrato editorial: **75 páginas**.

O plano não reabre decisões metodológicas já aprovadas e não autoriza ajustes manuais de números. Qualquer correção deve nascer da fonte granular, de uma regra de classificação rastreável ou de apresentação editorial sem alterar os fatos.

## 2. Diagnóstico atual

### 2.1 Pontos aprovados no novo PDF

- O nome do download usa entidade e período: `panorama-fiergs-rs-2T2026.pdf`.
- As 75 páginas foram geradas em 16:9, sem página vazia.
- Padrão, tipologia, cidade e área fecham as vendas em 1.091.
- Série, padrão, tipologia, área, metragem, preço, maturidade e consolidado fecham a oferta final vertical em 5.251.
- Produto, coorte e consolidado horizontal fecham no mesmo universo.
- Comparativos trimestrais, semestrais e de 12 meses estão presentes.
- Percentuais, nomenclaturas de dormitório, distrato negativo, slide 41 e exclusão de chácaras permanecem corretos.
- Os três mapas usam a mesma coleção de 648 empreendimentos e já exibem a semântica correta.

### 2.2 Delta remanescente de completude

| Dimensão | Oferta lançada | Oferta final | Situação |
|---|---:|---:|---|
| Tipologia — página 36 | 54.698 | 5.251 | faltam 63 lançadas na abertura dimensional |
| Padrão — página 37 | 54.761 | 5.251 | universo completo |
| Maturidade por tipologia — página 59 | 54.761 | 5.251 | inclui residual `Não classificado` de 63 |
| Maturidade por padrão — página 60 | 54.761 | 5.251 | universo completo |
| Consolidado — página 61 | 54.761 | 5.251 | universo completo |

**Fato confirmado:** as 63 unidades aparecem como residual `Não classificado` na maturidade e no consolidado, mas não são representadas na abertura de oferta por tipologia.

**Hipótese a provar antes da correção:** um ou mais empreendimentos possuem `project.launchedUnits` maior que a soma de `typology.launchedUnits`. `offerByTypology` soma somente linhas tipológicas, enquanto a maturidade já calcula o residual projeto menos tipologias. É proibido inserir uma linha fixa de 63.

### 2.3 Ressalvas editoriais não bloqueantes

1. O ranking por cidade omite Eldorado do Sul porque vendas zero são filtradas e o componente limita a visualização a nove linhas.
2. Os mapas estão numericamente corretos, mas há sobreposição de marcadores e o recorte parece amplo em leitura a 100%.
3. O nome do arquivo está correto, porém título e assunto internos do PDF ainda priorizam a lista das dez cidades em vez do preset FIERGS.
4. A interface informa que o usuário pode continuar navegando, embora o navegador possa pausar a rasterização quando a aba fica oculta.
5. O artefato não torna evidente qual versão do motor/deploy o gerou, o que dificultou distinguir o PDF antigo do novo.

## 3. Princípios obrigatórios

- Não alterar valores manualmente nem criar exceção para 2T2026.
- Não transformar ausência de classificação em zero nem descartá-la.
- `Não classificado` deve ser uma categoria derivada e auditável.
- A soma das linhas de toda dimensão quantitativa deve fechar no total declarado.
- Zero observado é diferente de ausência de observação.
- Nenhuma melhoria visual pode excluir empreendimento ou coordenada silenciosamente.
- Preview, PDF, PPT e auditoria devem consumir o mesmo modelo.
- Preservar como regressão obrigatória FIERGS 2T2026 e FIERGS 4T2025.
- Preservar o comportamento do preset Secovi-SP e de recortes livres.
- Não modificar `src/features/corretor` nem `src/features/corretor/referencia_ajustes/`.
- Usar `git add` explícito e commits isolados; não incluir PDF/PPT de entrada sem decisão expressa.

## 4. Estratégia

```text
Congelar o novo PDF e a matriz atual
                 ↓
Provar as 63 unidades por chave granular
                 ↓
Generalizar o residual “Não classificado”
                 ↓
Ampliar guardas de completude dimensional
                 ↓
Exibir as dez cidades, inclusive zero observado
                 ↓
Auditar e refinar mapas sem alterar universo
                 ↓
Alinhar metadados, mensagens e rastreabilidade
                 ↓
Varredura integral de 75 páginas + regressões
                 ↓
Republicar, gerar PDF/PPT e só então chamar Juliana
```

## 5. Fases e portões

### Fase 0 — Baseline e prova do delta 63

**Objetivo:** transformar a ressalva em caso de teste reproduzível antes de alterar o modelo.

**Tarefas:**

- preservar o PDF-base e registrar nome, tamanho, data e hash;
- gerar matriz por cidade, empreendimento, tipologia e período contendo:
  - unidades lançadas do projeto;
  - soma das unidades lançadas das tipologias;
  - unidades finais do projeto;
  - soma das unidades finais das tipologias;
  - residual de lançadas, finais e vendidas;
- identificar as chaves que compõem exatamente as 63 unidades;
- distinguir tipologia ausente, linha tipológica nula, classificação desconhecida e divergência de fonte;
- reproduzir em teste a diferença `54.761 − 54.698 = 63`;
- verificar o mesmo diagnóstico em 4T2025 para impedir uma solução exclusiva de 2T2026;
- registrar fato confirmado e hipóteses rejeitadas em Markdown.

**Arquivos de evidência sugeridos:**

- `docs/features/Relatorios Secovi_FIERGS/EVIDENCIA_PRE_HOMOLOGACAO_FASE_0_2T2026_2026-10-01.md`;
- CSV sanitizado em `docs/features/Relatorios Secovi_FIERGS/evidencias/`.

**Portão G0:** as 63 unidades devem ser integralmente explicadas por chaves granulares. Nenhuma alteração de agregação começa com delta sem origem.

### Fase 1 — Completude da oferta por tipologia

**Objetivo:** fazer a página 36 representar todo o universo declarado sem mudar o total da fonte.

**Tarefas:**

- extrair uma função comum de residual dimensional por projeto;
- calcular `residual = total do projeto − soma das linhas tipológicas` separadamente para lançadas, finais e vendidas;
- agregar resíduos positivos ou negativos em `Não classificado` com contagem distinta de empreendimentos;
- preservar tipologias canônicas existentes e impedir dupla contagem;
- definir comportamento explícito para resíduos negativos: evidência e bloqueio, nunca compensação silenciosa;
- incluir a linha `Não classificado` na tabela quando qualquer métrica possuir valor observado, mesmo que a oferta final seja zero;
- manter médias de preço indisponíveis para o residual quando não houver área/ticket auditáveis;
- reutilizar a mesma política em oferta e maturidade para impedir implementações paralelas.

**Arquivos prováveis:**

- `src/features/panorama-secovi-fiergs/domain/aggregations.ts`;
- `src/features/panorama-secovi-fiergs/domain/taxonomy.ts`;
- `src/features/panorama-secovi-fiergs/components/MarketSlides.tsx`;
- testes de agregação e reconciliação.

**Portão G1:** página 36, página 59 e consolidado fecham em `54.761 lançadas / 5.251 finais` no 2T2026, derivados do mesmo algoritmo; 4T2025 continua reconciliado.

### Fase 2 — Guardas de completude para lançadas e dimensões residuais

**Objetivo:** impedir que uma exportação numericamente correta no estoque final ainda perca parte de outra métrica da mesma tabela.

**Tarefas:**

- ampliar as invariantes de tipologia e padrão para oferta lançada, final e, quando comparável, vendida;
- comparar o total do universo contra soma das linhas visíveis, incluindo `Não classificado`;
- criar invariantes para resíduos tipológicos e de padrão;
- classificar como crítico:
  - soma dimensional diferente do total;
  - residual negativo sem explicação;
  - linha total incompatível com o cubo canônico;
- incluir fonte, universo, período, total esperado, observado e delta no CSV de auditoria;
- bloquear PDF e PPT em qualquer divergência crítica;
- não fixar o número de invariantes em textos ou testes quando o conjunto puder crescer.

**Portão G2:** uma fixture que omite cobertura tipológica bloqueia a exportação; a mesma fixture com residual `Não classificado` fecha e exporta.

### Fase 3 — Ranking municipal completo

**Objetivo:** deixar explícito que as dez cidades foram analisadas, inclusive quando uma delas possui zero vendas.

**Tarefas:**

- preservar cidades com `liquidSales = 0` como observação válida;
- continuar distinguindo `null`/ausente de zero observado;
- permitir dez linhas somente na variante `is-city-ranking`, sem alterar distribuições de padrão e tipologia;
- ordenar por valor e depois por nome para estabilidade;
- exibir Eldorado do Sul com `0` e `0,0%`, sem medalha e sem barra artificial;
- ajustar espaçamento e tipografia para dez municípios sem colisões;
- confirmar que a soma permanece 1.091 e os percentuais visíveis fecham 100,0%.

**Arquivos prováveis:**

- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`;
- `src/features/panorama-secovi-fiergs/print/panorama-print.css`;
- testes editoriais e de renderização.

**Portão G3:** a página 31 lista exatamente as dez cidades do preset, diferencia zero de ausência e mantém total, ordem e legibilidade.

### Fase 4 — Mapas: enquadramento e legibilidade

**Objetivo:** melhorar a leitura dos mapas sem mudar as 648 chaves elegíveis.

**Tarefas de diagnóstico:**

- produzir auditoria por cidade com mínimo/máximo de latitude e longitude;
- listar coordenadas fora do município, repetidas ou concentradas no mesmo ponto;
- separar amplitude legítima do recorte de outliers reais;
- confirmar `648 = 519 verticais + 129 horizontais` antes e depois;
- comparar captura a 100% das páginas 67–69.

**Ajustes permitidos após a prova:**

- recalcular padding sem excluir pontos válidos;
- limitar visualmente raio máximo dos marcadores proporcionais;
- usar transparência, contorno e ordem de desenho para reduzir oclusão;
- aplicar deslocamento determinístico somente a coordenadas exatamente coincidentes, preservando a posição original na auditoria;
- aumentar a área útil do mapa ou compactar o painel lateral;
- manter legendas, escala, fonte cartográfica e nota sobre coordenadas inválidas.

**Ajustes proibidos:**

- cortar percentis ou outliers sem classificá-los;
- remover pontos para melhorar o zoom;
- substituir empreendimento por agregação municipal sem alterar título e legenda;
- alterar coordenadas de origem.

**Arquivos prováveis:**

- `src/features/panorama-secovi-fiergs/lib/map-tiles.ts`;
- `src/features/panorama-secovi-fiergs/components/MarketSlides.tsx`;
- `src/features/panorama-secovi-fiergs/print/panorama-print.css`;
- testes de mapas e deduplicação.

**Portão G4:** os três mapas continuam com as mesmas 648 chaves, exibem as dez cidades no recorte e ficam legíveis a 100% no PDF.

### Fase 5 — Nome institucional, metadados e comunicação da exportação

**Objetivo:** alinhar o arquivo, suas propriedades internas e a orientação dada ao usuário.

**Tarefas:**

- manter os nomes:
  - `panorama-fiergs-rs-{período}.pdf|pptx`;
  - `panorama-secovi-sp-{período}.pdf|pptx`;
- definir título interno pelo preset, por exemplo `Panorama FIERGS/RS — 2T2026`;
- manter as dez cidades no assunto ou em palavras-chave para rastreabilidade territorial;
- incluir versão do motor (`v4`), período e entidade nos metadados quando o formato permitir;
- avaliar inclusão de identificador de build fornecido pelo ambiente, sem criar valor falso quando indisponível;
- trocar “Pode continuar navegando” por orientação verdadeira: navegação interna é possível, mas a aba deve permanecer visível até o download;
- manter no documento técnico o worker servidor como melhoria futura, sem implementá-lo nesta rodada;
- testar PDF e PPT, presets institucionais e recorte livre.

**Arquivos prováveis:**

- `src/features/panorama-secovi-fiergs/components/PanoramaExportHost.tsx`;
- `src/features/panorama-secovi-fiergs/lib/pdf-export.ts`;
- `src/features/panorama-secovi-fiergs/types.ts`;
- testes de exportação e nomenclatura.

**Portão G5:** nome, título, assunto, entidade e período são coerentes; a mensagem da interface não promete processamento irrestrito em segundo plano.

### Fase 6 — Varredura transversal e homologação técnica

**Objetivo:** procurar inconsistências análogas antes de entregar a nova versão à Juliana.

**Varreduras numéricas:**

- vendas por padrão, tipologia, cidade e área;
- lançadas e finais por padrão, tipologia, maturidade, metragem e consolidado;
- empreendimentos por dimensão, evitando soma de contagens não aditivas;
- VGV lançado, final e vendido nas páginas que declaram o mesmo universo;
- percentuais de todas as tabelas de participação;
- horizontal por produto, coorte, preço e consolidado;
- mapas: universo total, coordenadas válidas e renderizadas;
- comparativos trimestrais, semestrais e 12 meses.

**Varreduras editoriais:**

- títulos, períodos, unidades, casas decimais, sinais e nomenclaturas;
- linhas truncadas, sobreposições, rótulos duplicados e textos pequenos;
- dez cidades presentes onde o slide declara o recorte completo;
- estados indisponíveis sem zeros artificiais;
- consistência entre preview, PDF e PPT;
- propriedades internas dos arquivos e nome do download.

**Testes mínimos:**

- testes unitários do residual dimensional;
- teste específico das 63 unidades sem hardcode no runtime;
- regressões autenticadas FIERGS 2T2026 e 4T2025;
- testes do ranking com zero, `null` e dez cidades;
- testes de mapas com colisão, outlier e coordenada inválida;
- testes de nome e metadados para FIERGS, Secovi-SP e recorte livre;
- `npx vitest run src/features/panorama-secovi-fiergs`;
- `npx tsc --noEmit -p tsconfig.app.json`;
- `npm run build`;
- geração e inspeção de PDF e PPT de 2T2026;
- smoke de 4T2025 para o mesmo conjunto de guardas.

**Artefatos de homologação:**

- PDF e PPT com 75 páginas;
- CSV de reconciliação atualizado;
- contato visual das páginas críticas;
- matriz antes/depois;
- hashes dos artefatos e commits.

**Portão G6:** nenhuma divergência crítica ou ressalva editorial conhecida permanece sem decisão explícita. O pacote só então recebe status “pronto para homologação final da Juliana”.

## 6. Critérios de aceitação

| ID | Cenário | Aceite |
|---|---|---|
| AC-01 | oferta lançada por tipologia | soma 54.761 no 2T2026 por dados derivados, incluindo residual auditável |
| AC-02 | oferta final vertical | todas as dimensões permanecem em 5.251 |
| AC-03 | vendas verticais | todas as dimensões permanecem em 1.091 |
| AC-04 | residual dimensional | `Não classificado` aparece somente quando calculado; nenhum número fixo |
| AC-05 | ranking municipal | dez cidades, incluindo Eldorado do Sul com zero observado |
| AC-06 | mapas | 648 chaves nos três mapas e melhor legibilidade a 100% |
| AC-07 | metadados FIERGS | nome e título identificam FIERGS/RS e 2T2026; assunto preserva o recorte |
| AC-08 | mensagem de exportação | instrui a manter a aba visível; não promete trabalho em segundo plano |
| AC-09 | regressão 4T2025 | 1.524 vendas, 5.855 finais e horizontal 121/28.413/2.840 permanecem reconciliados |
| AC-10 | contrato editorial | PDF e PPT íntegros, 75 páginas, mesmos totais e sem sobreposição crítica |
| AC-11 | bloqueio | qualquer dimensão crítica divergente impede PDF e PPT |
| AC-12 | isolamento | nenhum arquivo do Corretor ou artefato local não relacionado entra nos commits |

## 7. Evidências exigidas em cada portão

Cada fase deve registrar em Markdown:

- baseline e hipótese avaliada;
- fatos confirmados versus hipóteses;
- matriz antes/depois;
- chaves ou linhas que explicam o delta;
- decisão metodológica;
- arquivos alterados;
- testes executados e resultados;
- captura ou artefato visual quando aplicável;
- riscos e pendências restantes;
- hash do commit isolado.

## 8. Sequência de commits sugerida

1. `test(fiergs): reproduce typology launch coverage residual`
2. `fix(fiergs): preserve unclassified typology offer residuals`
3. `test(fiergs): gate dimensional launch completeness`
4. `fix(fiergs): show zero-sales cities in full preset ranking`
5. `fix(fiergs): improve map viewport and marker legibility`
6. `fix(fiergs): align preset metadata and export guidance`
7. `docs(fiergs): record final pre-homologation evidence`

Cada commit deve usar `git add` explícito, ser revisado por `git diff --cached` e excluir alterações locais não relacionadas.

## 9. Priorização para a janela desta tarde

**Obrigatório antes de pedir a homologação:**

1. Fases 0–2: delta 63 e guardas;
2. Fase 3: décima cidade no ranking;
3. Fase 5: metadados e mensagem honesta de exportação;
4. Fase 6: regressão, build e novo PDF/PPT.

**Executar se o portão numérico estiver fechado:**

5. Fase 4: refinamento dos mapas, com comparação visual e sem alterar o universo.

O refinamento cartográfico não deve atrasar a correção numérica, mas deve ser concluído nesta rodada se permanecer seguro e verificável.

## 10. Fora de escopo

- worker de geração no servidor ou fila assíncrona;
- editar manualmente o PDF;
- alterar dados da API;
- fixar 63, 54.761, 5.251 ou qualquer total no runtime;
- redesenhar todo o template;
- mudar o conjunto de dez municípios;
- modificar o Corretor;
- publicar como homologado antes da inspeção dos novos artefatos.

## 11. Definição de pronto

O plano estará concluído quando a oferta por tipologia possuir cobertura integral e auditável, o ranking explicitar as dez cidades, os mapas estiverem legíveis sem perda de chaves, os metadados identificarem corretamente o preset, a interface comunicar a limitação da aba e a varredura integral não encontrar outra divergência crítica. Somente depois disso os novos PDF e PPT serão enviados à Juliana para homologação final.
