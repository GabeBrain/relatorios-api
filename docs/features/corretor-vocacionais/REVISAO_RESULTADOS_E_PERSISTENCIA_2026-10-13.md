# Revisão do Corretor V3 — resultados e contexto preservado — 13/10/2026

Documento de entrada para Gabriel: o que cada teste comprova, o que o banco preserva e quais casos novos ajudam a melhorar o motor. Auditoria somente leitura; nenhuma chamada nova de IA, mutação de estudo ou reanálise nesta sessão.

## Estrutura de revisão que existe hoje

1. **Regras/decisões:** `LIVE_regras_corretor_vocacionais.md`, histórico das versões e limites.
2. **Caso explicado:** `BASELINE_2026-10-13_ROLANDIA.md`, pareamento PPTX/13 Excel por hash, matriz de acertos/FP/omissões e handoff para Lucas.
3. **Regressão:** `AUTOMACAO_TESTES_CORRETOR.md` e manifesto/expectativas em `calibracao/automacao/`. Dez passes técnicos em cinco decks; compara cada achado e cobertura, não só total de cartões.
4. **Revisão humana no app:** `findings_v3.status` e `verdict` (`bug`/`fp`); botão “Corrigido” não exige veredito de erro verdadeiro e também é usado pela reconciliação automática. Não confundir status operacional com rótulo de qualidade.
5. **Resultado desta auditoria:** [estudos e índice de achados](./calibracao/audit-2026-10-13/studies.json), com 14 estudos V3/269 achados, passes históricos, fonte, referências de cache, títulos/detalhes e evidências. Arquivos brutos de GET/cache ficam locais em `.local-inputs/audit-20261013/`, ignorada pelo Git.

Ainda falta adjudicação humana completa dos erros esperados de cada estudo. Portanto não temos uma porcentagem confiável de precisão ou cobertura de erros para o produto inteiro. Dez replays aprovados provam estabilidade com aquelas entradas; não provam que os alertas estão certos nem que todas as omissões desapareceram.

## O sucesso concreto das correções v0.67

| Mudança | Evidência de sucesso | Limite atual |
|---|---|---|
| Mapas fora da visão | Rolândia 49→32 candidatas; SJC v2 86→74; tabelas mantidas nos replays | redução de custo baseada em candidatos; não é custo novo medido |
| Comentários internos | s1/s10/s38 de Rolândia reconhecidos como comunicação | comunicação não deve contar como erro do estudo |
| Distância × tempo | Rolândia s17: 950 km em 3 min identificado no replay e no site | não mede todos os tipos de plausibilidade |
| Raios acumulados | valores que diminuem do raio interno ao externo identificados, inclusive na fonte | depende de alinhamento correto das leituras |
| Boulevard na faixa de preço | detectado como Provável no replay | ausente no resultado real salvo de 02/10; sucesso em produção ainda não comprovado |
| Agrupamento de divergências | Rolândia s32/s33 e s46/s47, SJC v2 s31/s32 agrupados preservando referências | menos cartões não significa menos erros reais |
| Ano com ponto/formatos literais | `2.023` detectado no SJC VAP s73 | novo lote Salvador revelou 6 alertas FP: quantidades como `1.342` confundidas com ano. Regra não está homologada para Panorama |
| Texto mais preciso | resultado real Rolândia contém `Prsidente` e `são esperado` | falta revisão de falsos positivos textuais de outros estudos; registro de modelo tem rótulo incorreto, ver abaixo |
| `//` de Rolândia s67 | não reaparece nos conjuntos inspecionados | confirmação em duas leituras protege precisão; não prova cobertura de todo símbolo real |
| Checklist Sociodemografia | FP visível no site reproduzido e removido localmente, demais dez achados preservados | correção `04edc0d` enviada ao Git; resultado armazenado não foi reprocessado nesta auditoria |

**Cinco análises de regressão, com fonte antiga e Excel bruto iguais:**

- **Rolândia:** 11 cartões; unidade de domicílios, dígitos do PR, verticalização, deslocamento, raios e Boulevard mantidos. 27/30 tabelas, 9/16 comparações de fonte e 22/22 cruzamentos batem. Checklist corrigido só localmente. No site histórico há revisão textual e leituras diferentes (29/30), por isso as contagens não são o mesmo passe.
- **Toledo:** 5 cartões; preservados unidade Brasil e provável faixa de renda omitida (8,4% abaixo do total). Avisos de tabela paginada/leitura insegura permanecem. 46/52 tabelas, 10/11 fonte, 11/11 cruzamentos batem.
- **Campos do Jordão:** 10 cartões; unidade Brasil detectada; alertas de faixa, renda/absorção e lacunas/total mantidos, com contextos de exclusão e diferença de universo ainda a julgar. 28/44 tabelas, 22/23 fonte e 9/20 cruzamentos batem. Não declarar todos os dez erros verdadeiros.
- **SJC VAP:** 7 cartões; unidade Brasil, `Arté`, ano com ponto e precisão percentual detectados; aviso de faixa e leitura insegura mantidos. 57/67 tabelas, 10/11 fonte, 65/69 cruzamentos batem.
- **SJC v2:** 8 cartões; verticalização divergente da fonte e unidade Brasil preservadas; agrupamento reduziu cartões repetidos sem perder valores. 41/45 tabelas, 4/10 fonte, 4/4 cruzamentos batem; fonte divergente não é automaticamente erro do slide.

Esses “batem” são verificações numéricas sobre dados lidos, não contagem de erros reais encontrados. As expectativas e as leituras congeladas estão no manifesto, para repetir o mesmo experimento.

## Resultado real de cada estudo V3 no banco

Consulta em 13/10, `generation=v3`. “FP” abaixo é o veredito registrado, não uma revisão independente feita nesta auditoria. Nenhum dos 14 estudos tem achado com `verdict=bug`; há 71 com `verdict=fp`. Isso limita a medição de acerto. Datas estão em BRT; contagens são registros persistidos, antes dos filtros de apresentação do app.

| Estudo/data | Slides | Achados / pendentes | FP registrados | Tabelas que fecham | Excel inventariado / blocos lidos | Leitura da qualidade |
|---|---:|---:|---:|---:|---:|---|
| Palmas Renoval multiuso, 09/10 | 158 | 15 / 15 | 0 | 56/70 | 0/0 | cinco alertas de texto, três de cruzamento, soma/raio e avisos; sem gabarito dos 15 |
| Curitiba Petit, 08/10 | 105 | 7 / 7 | 0 | 42/54 | 0/0 | quatro de texto, uma soma e dois avisos; sem veredito de acerto |
| Curitiba Petit, 07/10 | 156 | 47 / 47 | 0 | 51/84 | 0/0 | 20 cruzamentos, 13 texto, 5 contexto e outros; grande risco de ruído a triar |
| Panorama São Paulo, 06/10 | 80 | 14 / 14 | 0 | 0/1 | 16/0 | Excel ligado mas nenhum papel reconhecido; cruzamento com planilhas não comprovado |
| Panorama Salvador, 05/10 | 99 | 30 / 0 | 29 | 5/7 | 6/0 | seis formatos FP, 21 fonte FP, estrutura/cobertura FP; uma soma marcada Corrigido, sem `verdict=bug` |
| Rolândia, 02/10 | 78 | 15 / 15 | 0 | 29/30 | 13/15 | três divergências de fonte e texto esperado observados; checklist tem FP; Boulevard omitido |
| Francisco Beltrão, 30/09 | 87 | 1 / 1 | 0 | não medido | 0/0 | análise pendente, só estrutura; não mede o motor completo |
| Tijucas, 30/09 | 214 | 1 / 1 | 0 | não medido | 0/0 | análise pendente, só comunicação; não mede o motor completo |
| Campos do Jordão, 29/09 | 153 | 38 / 36 | 0 | 32/53 | 11/15 | dois alertas encerrados na mesma versão, sem rótulo de erro verdadeiro; não interpretar como edição verificada de PPTX |
| SJC VAP, 29/09 | 145 | 33 / 33 | 0 | 63/75 | 12/15 | formato/cross-check/somas em revisão; fonte tem avisos de escopo/papéis |
| SJC v2, 29/09 | 107 | 22 / 22 | 0 | 48/53 | 12/15 | divergências de fonte/contexto/soma ainda sem adjudicação |
| Blumenau, 29/09 | 84 | 3 / 1 | 0 | 9/10 | 0/0 | dois marcados Corrigido, mas sem evidência de nova versão editada nesta consulta |
| SJRP 4 Áreas, 28/09 | 94 | 1 / 1 | 0 | 2/2 | 0/0 | consta como V3 no banco, embora não apareça na imagem anexada |
| UsHome, 28/09 | 135 | 42 / 0 | 42 | 3/30 | 0/0 | todos os alertas marcados FP: 27 somas, 13 fontes, contexto e estrutura; “sem bloqueios” não é sucesso do detector |

As duas linhas Curitiba têm o mesmo nome e IDs/sha1 distintos; o deck mudou de 156 para 105 slides. Não calcular “40 erros resolvidos” pela queda de 47 para 7 alertas. Precisamos de pareamento e revisão das diferenças.

**Riscos concretos do lote novo:** em Palmas, um bairro (“Plano Diretor Sul”) foi usado como identidade de empreendimento no cruzamento s104/s114; é candidato a FP de entidade. `DESLIGAMENTOS` também consta entre os alertas de ortografia: suspeita de FP, a conferir no contexto. Salvador evidencia falha de contexto da regra de ano e aplicação de checklist vocacional a Panorama. Todos esses casos podem virar testes negativos com o material já persistido, respeitando os limites de contexto.

## O estudo inteiro foi preservado?

**Não pelo fluxo atual do Corretor.** A inspeção de criação/reconferência, tipos e migrações mostra:

- `studies_v3`: nome, cidade/UF, ata, geração, estado, custo e relatório agregado.
- `study_versions`: nome do arquivo, hash, número da versão e quantidade de slides. Não guarda bytes do PPTX nem IR completo.
- `findings_v3`: achado com referência ao slide, detalhe e visualização (às vezes tabela e trecho original), status/veredito. Não guarda os slides sem achado nem o texto integral do deck.
- `study_sources_v3`: derivado JSON de Excel com inventário/blocos/avisos. Não guarda os arquivos Excel originais. São Paulo e Salvador guardam somente inventário/avisos de papéis desconhecidos, zero blocos utilizáveis pelo extrator.
- `vision_cache`: transcrições por SHA-1 de imagem, modelo e schema. Compartilhado entre estudos; não há vínculo completo de todas as imagens/slides de cada versão que permita reconstruir o deck só por essa tabela.
- Storage `corretor-evidencias`: **imagens de tabelas que sustentam achados**, não fotografias de todos os slides. Upload é best-effort. Foram verificados três exemplos do lote novo (Palmas, Curitiba 105 e Curitiba 156): URLs PNG retornaram HTTP 200.
- `pptx-store.ts`: arquivo original **local no navegador** via IndexedDB; mantém até oito decks mais recentes, sujeito a quota/limpeza. Outro navegador não tem o arquivo. O banco não prova que o cofre do usuário ainda o contém.

Não foi feita varredura de todos os buckets/projetos externos. A conclusão acima é sobre o que este app salva e os dados V3 consultados, não sobre eventual backup mantido fora dele.

## Podemos usar os projetos enviados semana passada?

**Sim, para diagnosticar e testar os alertas já registrados. Parcialmente para reanálise.** Foram recuperados:

- Palmas: 15 achados, três hashes de imagens referenciados, as três leituras em cache e fotos acessíveis; falta texto integral/Excel bruto/PPTX para reexecutar os 158 slides.
- Curitiba 105: sete achados e uma leitura/imagem referenciada em cache.
- Curitiba 156: 47 achados, 11 hashes de imagem referenciados em cache e 23 registros com link de evidência (links podem repetir a mesma imagem).
- São Paulo/Salvador: achados e planilhas inventariadas, mas nenhum hash de imagem nos achados consultados. Não associar automaticamente uma leitura de cache global a um slide desses projetos.

Esses números medem o cache **referenciado por achados**. Não provam que não existam outras leituras globais desses arquivos. Sem o índice das imagens do PPTX, não sabemos quais pertencem à versão inteira.

Nas pastas pesquisadas e no catálogo, não encontrei os PPTX originais do lote 05–09/10 por nome/hash. O caminho mais curto é recuperá-los uma vez do navegador/analista e manter o hash correto. Os quatro estudos antigos Rolândia/CJ/SJC VAP/v2 têm original local pareado e fonte, então continuam como regressão completa de extração. Novo texto/visão permanece sujeito a orçamento quando necessário.

Para evitar repetir essa perda de contexto em uploads futuros, próxima melhoria de persistência deve guardar o IR (texto/tabelas nativos) e o índice slide→hash das imagens por versão, em um snapshot pequeno. É proposta, não implementação feita nesta sessão; o PPTX pode continuar sob custódia local.

## Caso da Daniele — prioridade de cobertura

Imagem recebida nesta conversa: Goiânia, variação anual de domicílios de 2027 a 2032. A tabela declara total municipal **56.808**; a conclusão repete **17.566**. A mensagem da analista confirma que esqueceu de atualizar o segundo número. Esse é um erro relacional **tabela × conclusão**, mesmo que as somas da tabela estejam corretas.

Gabarito pequeno registrado no snapshot: cidade, métrica, janela, número do total e número da conclusão. Não encontrei correspondência desse caso no conjunto de achados V3; projeto e slide ainda não estão identificados. Não assumir que é Palmas ou um dos Curitiba pelo relato de data.

Regra planejada deve ligar a conclusão ao **total da mesma cidade, métrica e janela**. Não confundir 56.808 com média anual 9.468, totais GO/Brasil ou estoque de domicílios 549.509. Os valores anuais visíveis somam 56.807; diferença de 1 frente ao total é compatível com arredondamento e não é a omissão relatada.

No código atual, as checagens de projeção inspecionam tabelas/anos/fórmula e os cruzamentos sociodemográficos comparam tabelas entre si. Não encontrei regra geral que confronte a frase “Até 2032 são esperados novos…” com o total da tabela do mesmo slide. Essa cobertura fica **PLANEJADA**, com exemplos positivos e negativos para proteger recorte e unidade. Nada foi alterado no motor nesta auditoria.

## Próximo passo recomendado

1. Usar Salvador para corrigir a confusão quantidade × ano, com seus seis FP como testes negativos; usar SJC VAP para preservar o ano real com ponto.
2. Usar o caso confirmado da Daniele para a nova igualdade tabela × conclusão; recuperar seu PPTX/slide uma vez para conferir a extração real, além da transcrição da imagem.
3. Recuperar primeiro o arquivo Curitiba de 105 slides ou Palmas de 158, e o Excel correspondente, para ampliar o conjunto real com menor ruído/uso diferente. IDs/hashes no snapshot evitam pegar o Curitiba errado.
4. Reprocessar de forma controlada, adjudicar verdadeiros/FP/omissões e relatar sucesso por problema, não por redução bruta de cartões. Preservar dez passes existentes; IA nova somente com lote e orçamento.

**Nota de rastreabilidade:** os passes textuais recentes dizem `gpt-4o-mini` em `escopo`, mas o frontend registra o `MODEL` da visão nesse campo, enquanto `pipeline.ts` usa `TEXT_REVIEW_MODEL = gpt-4o`. O custo de texto/tokens observado é compatível com gpt-4o. Isso explica um rótulo incorreto no registro; não fornece ID/revisão de deploy do backend e não autoriza concluir modelo real apenas pelo texto de `escopo`.

Monday: [V2 Corretor de projetos / objetivo atual V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102) — `12700802102`. Sem escrita no Monday.
