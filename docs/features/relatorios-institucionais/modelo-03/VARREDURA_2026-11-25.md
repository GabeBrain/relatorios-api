# Modelo 03 — varredura de fontes e disponibilidade

25/11/2026 · Codex/Lucas · base `296d12dd`, main/origin único atualizado 0/0 e árvore limpa na abertura. Revisão do motor comum, sem alterar configuração ou outros relatórios.

## Achados reproduzidos e corrigidos

| Problema | Correção e regressão |
|---|---|
| Uma fonte municipal ausente apagava o quadro inteiro, inclusive outro território com dados. | Falta de fonte tratada como cobertura por território/célula. Caso sintético Curitiba/RM preserva `[null, 80]`; ausência dos dois preserva `[null, null]`. Nunca preenche com zero. |
| Fonte falha não constava em `sourceKeys`. | Registra a chave necessária antes de verificar a disponibilidade, mantendo rastreabilidade no diagnóstico. |
| Quadro inteiramente sem valores por falta de cobertura/preço/reconciliação podia continuar disponível. | Sem nenhum número e com impedimento de cobertura, passa a `waiting-source`. Tabelas nulas ficam no diagnóstico; arte mostra só a pendência. Ticket com preço ausente e quantidade válida preserva `[null, 80]`; denominador zero continua distinto de falta de fonte. |
| Detalhes combinados podiam considerar uma seleção antiga de RM mesmo com `includeRm=false`. | Só combina municípios efetivamente selecionados. Teresina sem RM não tenta calcular Timon retido na seleção antiga. |
| Histórico mensal posterior ao corte podia mudar a cadência inferida de uma edição trimestral antiga. | Inferência, fluxos e auditoria limitados ao corte do cálculo. Regressão: trimestral até 2025, mensal em 2026, conserva leitura trimestral de 2T2025. |
| `links.next` contraditório com `meta.last_page` podia continuar a coleta. | Metadados contraditórios/página após o término tornam a fonte incompleta com falha sanitizada, sem buscar a página excedente. |
| 45 posições externas eram omitidas da prévia, sem inventário legível das dependências. | Lista por referência/título/fonte/motivo nos Insights, JSON (`analystInsights.deferredSources`) e CSV (`fonte-não-integrada`). Endpoint não confirmado é `null`, `inPreview=false`. Não inventa slides, dados ou endpoints. |

## Dependências externas do molde ADEMI-PR

Separadas das 58 posições de indicadores e 39 editoriais existentes:

| Referências originais | Quantidade | Dependência |
|---|---:|---|
| 8 | 1 | População/potencial de consumo |
| 26–38 | 13 | Economia/funding: IBGE, BCB, ABECIP, Caixa, ANBIMA/B3 e Focus, conforme indicador |
| 40–44 | 5 | Alvarás municipais |
| 101–121 | 21 | Short stay / AirDNA |
| 123–126 | 4 | Locação: município, bairros, tipologias, oferta/preço/área |
| 128 | 1 | Comparativo novos x usados |
| **Total** | **45** | **Inventariadas, não integradas ou homologadas.** |

Divisórias 100/122/127 não comprovam integração dos indicadores seguintes. O inventário preserva a numeração/paginação/formulário e distingue ausência de integração de falha HTTP nas fontes coletadas.

## Comparativo novos x usados

Lucas confirmou este bloco. O [original ADEMI-PR](https://drive.google.com/file/d/1cLd59MFqyICd7A7j9B-ZcUhot0W3O-xl/view), lido no Drive, tem divisória127/quadro128 e declara **Imobiliárias / elaboração Brain**. Locação124–126 também atribui a fonte a imobiliárias. Isso identifica a referência, não prova acesso a dados contínuos.

- [Manual Geobrain1.02](https://drive.google.com/file/d/1h0OoXLQ-9R4jRQXrlzYuBnKCnpCR5X2K/view), consultado no Drive: empreendimentos/histórico/cidades e seis endpoints temporais; não documenta contrato de locação/usados.
- `src/assets/openapi/api-geobrain.json`: 12 caminhos; sem esses contratos. `/temporal-analysis-city/medium-prices` e `/medium-prices-meter` documentam preços de empreendimentos do mercado novo, não comprovam o lado de usados.
- [Documentação atual indicada pelo manual](https://app.geobrain.com.br/docs/api#/): **HTTP403 / Proibido** na consulta direta e no Edge headless, sem catálogo de endpoints. Pesquisa pública não revelou documentação primária adicional. Navegador nativo via conector indisponível nesta sessão.
- Busca Drive não encontrou manual técnico posterior; arquivos comerciais encontrados não foram usados como documentação técnica.

**Limite:** não foi possível confirmar o endpoint/contrato atual de usados; não afirmar que ele não existe. Falta caminho autorizado e esquema/exemplo que comprove competência, cidade/UF, universo novos/usados, preço, área e ponderador. Não substituir usados por estoque novo nem anúncios atuais por fotografia histórica. Sem tentativa em massa de URLs ou chamada imobiliária autenticada.

## Validação e limites

- Base anterior:79testes/4arquivos aprovados. Suíte final: **101testes/5arquivos**, incluindo16recortes×3periodicidades(48combinações), tabelas/valores/paginação e regressões negativas acima.
- TypeScript, ESLint da feature e build aprovados; advertências preexistentes de Browserslist/chunks/XLSX preservadas.
- Edge: sete cenários completos de `scripts/diagnostics/modelo03-visual.mjs`: três periodicidades, carregamento lento/contido, modal, erro/vazio/sem token,429/cancelamento e JSON/CSV/PPTX baixados/lidos. Cenário de exportação repetido para verificar o novo inventário nos Insights/JSON/CSV e o PPTX.
- Quatro cenários adicionais: fonte parcial/toda ausente×desktop1440claro/celular390escuro. Status, `null` versus zero, fonte falha, inventário expandido, ausência de overflow/exceções conferidos; capturas inspecionadas.
- `Modelo03Page.tsx` idêntico à base por `git diff --quiet`. Reutilizados carregamento e controles compartilhados, Alert/Table/Button e worker; nenhum primitive/rota/token/fluxo de carregamento novo.
- Evidências ignoradas: `.local-inputs/relatorios-lucas/modelo-03/visual-2026-11-24/` (bancada existente reexecutada nesta sessão) e `.local-inputs/modelo03-sweep-2026-11-25/`.

**Não verificado:** nova geração imobiliária autenticada, diagnóstico real novo, deploy e homologação da analista. As48combinações usam fontes sintéticas; não comprovam cobertura real nas16cidades. Não houve revisão visual integral dos16PPTX nesta sessão.

Após publicação autorizada, conferir nova geração com JSON/CSV/PPTX pareados. Priorizar contrato de usados e fontes externas inventariadas. Sem push ou escrita no Monday nesta entrega.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`.
