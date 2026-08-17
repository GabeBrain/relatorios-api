# Plano terminal — Terra — reprodução fiel do Panorama Secovi/FIERGS v2

**Data:** 2026-08-17  
**Execução:** direta na `main`, sem branch  
**Rota:** `/rebrain/panorama-secovi-fiergs`  
**Referências obrigatórias:** apresentação Panorama Piracicaba 1T2026, `PPT Institucional_2026 - Widescreen_NOVO (1)`, gabarito congelado e inventário dos 62 slides  
**Objetivo:** substituir o esqueleto atual por um relatório 16:9 visualmente fiel aos decks oficiais, com dados reais das APIs em todas as páginas quantitativas, mesmo quando a metodologia ainda estiver em validação.

## 1. Resultado terminal esperado

Entregar e publicar um livro completo de 62 páginas que:

1. reproduza capas, páginas corporativas, divisórias, assinaturas e encerramentos usando os layouts dos próprios decks;
2. substitua somente os campos variáveis: cidade, UF, trimestre, ano, equipe configurável e dados;
3. apresente tabelas e gráficos com a mesma intenção, hierarquia e leitura da referência;
4. consulte todas as fontes GeoBrain necessárias numa única execução compartilhada por recorte;
5. mostre os valores vindos da API mesmo quando `methodStatus = open_method` ou `assumed`;
6. diferencie visualmente “dado disponível, método em validação” de “fonte realmente indisponível”;
7. gere textos determinísticos a partir do mesmo modelo quantitativo;
8. navegue página por página e imprima as 62 páginas sem cortes em 16:9;
9. não use valores do deck, gabarito, fixture ou mock no runtime do relatório;
10. preserve o diagnóstico/calibração como instrumento separado, sem bloquear a demonstração do PDF.

## 2. Correção conceitual obrigatória

O estado metodológico não controla a visibilidade do dado.

```ts
interface ReportMetric<T> {
  value: T | null;
  dataStatus: 'ready' | 'partial' | 'unavailable' | 'not_applicable';
  methodStatus: 'approved' | 'reconciled' | 'assumed' | 'open_method';
  source: string[];
  formula: string;
  warnings: string[];
}
```

Regras:

- `value !== null` + método aberto: renderizar valor/gráfico/tabela e selo discreto **Em validação**;
- `value === 0`: renderizar zero quando a API ou derivação legítima retornou zero;
- `value === null`: usar `—` e explicar a ausência;
- `unavailable`: somente para falha, falta de cobertura ou campo ausente;
- nunca substituir valor ausente por referência, mock, zero sintético ou mensagem que esconda dados disponíveis;
- todo número exibido deve carregar fonte e fórmula rastreáveis.

## 3. Preparação e auditoria dos materiais

1. confirmar `main`, árvore de trabalho e autoria; preservar mudanças alheias;
2. ler integralmente `AGENTS.md`, guidelines, Design System, gabarito, inventário e decisões;
3. localizar os dois PPTX de referência no workspace/anexos;
4. registrar nome, hash e quantidade de slides de cada arquivo;
5. extrair para uma pasta versionada da feature somente os assets necessários e autorizados:
   - fundos das capas sem campos variáveis;
   - logos Secovi-SP, Brain e FIERGS quando presentes;
   - ícones e assinaturas institucionais;
   - imagens corporativas;
   - fundos das divisórias e encerramentos;
6. preferir SVG/PNG transparente para logos e PNG/WebP em resolução 16:9 para fundos;
7. não rasterizar tabelas e gráficos: reconstruí-los em HTML/SVG para receber dados da API;
8. se um texto variável estiver achatado na arte, mascarar apenas sua área ou recriar o fundo sem o texto;
9. se um PPTX não estiver acessível, registrar o bloqueio de asset, continuar com os screenshots/gabarito e não inventar uma nova identidade.

## 4. Design tokens editoriais

Derivar dos decks e congelar em CSS da feature:

- página: `13.333in × 7.5in`, fundo branco e safe area oficial;
- preto para títulos, verde institucional para ênfase, amarelo para sublinhado/destaque;
- filetes vermelho e cinza no rodapé;
- Montserrat ou fonte equivalente da apresentação para títulos;
- tipografia corporal fiel ao institucional;
- assinatura “Realização Secovi-SP | Brain” no local e proporção oficiais;
- fonte/elaboração no canto inferior esquerdo;
- numeração no canto inferior direito quando aplicável;
- PDF sempre em tema claro, independentemente do tema do aplicativo.

Criar componentes:

```text
OfficialCoverPage
OfficialInstitutionalPage
OfficialSectionDivider
OfficialSourceFooter
OfficialClosingPage
QuarterComparisonTable
AnnualComparisonTable
OfficialTimeSeriesChart
CompositionTable
CompositionChart
HeatMatrix
ReportMap
MethodBadge
```

## 5. Slides 1–10 — reprodução institucional fiel

1. **Slide 1:** arte oficial integral; sobrepor `{CIDADE}` e `{ANO}` com ajuste automático de fonte.
2. **Slide 2:** segunda capa oficial, parametrizada por cidade/ano.
3. **Slide 3:** visão, missão e valores fixos, fotografia institucional e assinatura oficial.
4. **Slide 4:** “Panorama Imobiliário de {cidade}”, trimestre e ano do filtro.
5. **Slide 5:** sumário automático, mantendo hierarquia e estética da referência.
6. **Slide 6:** divisor “Sobre o Secovi-SP”, idêntico à apresentação.
7. **Slide 7:** texto institucional fixo fornecido no deck.
8. **Slide 8:** política da qualidade fixa fornecida no deck.
9. **Slide 9:** divisor “Objetivos”, idêntico à referência.
10. **Slide 10:** objetivos fixos, alterando apenas `{cidade} - {UF}`.

Textos corporativos são conteúdo estático versionado e não dependem de API. Não usar `[LLM necessário]` nessas páginas.

## 6. Coleta única e completa das APIs

Depois de validar o município com `GeoApiScopeEngine`, executar em paralelo e compartilhar:

- `building-with-history` por Vertical e Horizontal, paginado uma única vez por tipo;
- `temporal-analysis-city/releases`;
- `temporal-analysis-city/sales`;
- `temporal-analysis-city/stock`;
- `temporal-analysis-city/ivv` sem soma de taxas agrupadas;
- `temporal-analysis-city/medium-prices`;
- `temporal-analysis-city/medium-prices-meter`;
- `monitored-cities` apenas para escopo.

Chave de cache:

```text
token-session + uf + city + endQuarter + methodologyVersion + exclusionSetVersion
```

Requisitos:

- paginação até `meta.last_page`/`links.next`;
- cancelamento via `AbortSignal`;
- falha parcial por endpoint sem derrubar blocos independentes;
- sem refetch ao navegar, abrir metodologia ou imprimir;
- nenhum token/payload bruto no PDF;
- coleta granular reutilizada por lançamentos, padrões, tipologias, coortes, maturidade, preços e mapa.

## 7. `PanoramaReportModel` completo

Construir fora do React:

```text
meta
launches
sales
stock
ivv
prices
cohorts
maturity
vgv
map
narratives
quality
```

Cada bloco deve expor:

- séries trimestrais canônicas;
- dimensões Vertical, Horizontal e Total;
- padrão e tipologia quando existentes;
- totais anuais;
- comparação do mesmo trimestre entre anos;
- variações ano a ano;
- cobertura, fonte, fórmula, método e avisos;
- fotografia final correspondente ao trimestre filtrado, nunca à data atual.

## 8. Janela temporal e comparações

Para gráficos trimestrais, usar a janela inclusiva entre o mesmo trimestre quatro anos antes e o trimestre final.

Exemplo:

```text
endQuarter = 1T2026 → 1T2022 … 1T2026 = 17 pontos
endQuarter = 3T2027 → 3T2023 … 3T2027 = 17 pontos
```

Tabelas de comparação trimestral usam cinco observações do trimestre avaliado. Variações exibidas:

- penúltimo ano × antepenúltimo;
- último ano × penúltimo;
- fórmula `(atual / anterior) - 1`;
- ambos zero → `—`;
- denominador zero e numerador positivo → `n/a` até regra editorial homologada;
- positivo em verde, negativo em vermelho, neutro sem preenchimento agressivo.

Tabelas anuais mostram quatro anos completos anteriores; o ano corrente parcial só entra quando a página de referência o prevê e sempre com `*`.

## 9. Tabelas oficiais

### Slides 12 e 21 — comparação do trimestre

Reconstruir como matriz, não lista:

- título oficial em caixa alta/ênfase verde;
- blocos por métrica;
- linhas Vertical, Horizontal e Total Mercado;
- cinco anos do trimestre escolhido;
- duas colunas de variação;
- células totais em cinza;
- formatação condicional nas variações;
- unidades corretas: contagem, unidades e R$ milhões;
- fonte, elaboração e assinatura oficiais.

### Slides 13 e 22 — comparação anual

Mesma linguagem, usando totais anuais e duas variações anuais.

### Demais tabelas

- 27: oferta, lançamentos, vendas e IVV por faixa de área;
- 29: Vertical, Horizontal e Total Mercado;
- 31: oferta lançada/final por padrão;
- 33–34: coorte e tipologia;
- 36 e 38: ticket, área e R$/m²;
- 41, 43 e 45: matrizes absolutas;
- 48–49: mercado horizontal;
- 51: VGV ofertado, disponível e vendido.

Todas devem usar números da API, inclusive com selo `Em validação` quando necessário.

## 10. Gráficos oficiais

Aplicar aos slides 14–19, 23–26 e 40:

- curva `monotone`, visual suave, sem aparência serrilhada;
- Verde = Vertical/Econômico conforme a página; Amarelo = Horizontal/Demais;
- 17 pontos trimestrais;
- rótulos discretos em todos os pontos;
- destaque forte nos cinco trimestres comparáveis;
- caixa de variações no canto superior direito;
- resumo por ano acima do gráfico: total anual e média por trimestre;
- legenda central inferior;
- observação editorial configurável;
- fonte/elaboração e assinatura oficiais;
- escala, unidade e arredondamento apropriados;
- SVG integral no preview e PDF.

Para composições dos slides 32, 35, 37, 39, 42, 44 e 46, reproduzir a intenção visual oficial com barras, participações ou matriz, mantendo melhor legibilidade sem mudar a pergunta respondida.

## 11. Cobertura página a página

| Slides | Resultado obrigatório | Fonte |
|---|---|---|
| 1–10 | institucional fiel e parametrizado | decks oficiais |
| 11 | divisor Lançamentos | deck |
| 12–13 | tabelas comparativas | granular/releases |
| 14–19 | gráficos trimestrais oficiais | granular/releases |
| 20 | divisor Vendas | deck |
| 21–22 | tabelas comparativas | sales |
| 23–26 | gráficos trimestrais | sales + granular |
| 27 | tabela por área com valores candidatos | granular + ivv |
| 28 | divisor Geral | deck |
| 29 | resumo do mercado | launches + sales + stock |
| 30 | divisor Vertical | deck |
| 31–35 | oferta, padrões, coortes e tipologias | stock + granular |
| 36–40 | ticket, área e preço/m² | prices + granular |
| 41–46 | matrizes de coorte e maturidade | granular |
| 47 | divisor Horizontal | deck |
| 48–49 | coorte e preços horizontais | granular + prices |
| 50 | divisor VGV | deck |
| 51 | VGV ofertado/disponível/vendido | releases + sales + stock + granular |
| 52 | divisor Análises | deck |
| 53–54 | narrativas determinísticas | `PanoramaReportModel` |
| 55 | divisor Localização | deck |
| 56 | mapa de empreendimentos | coordenadas granulares |
| 57–58 | consultores/créditos | configuração + deck |
| 59–62 | encerramentos oficiais | decks oficiais |

## 12. Textos automatizados

Nesta entrega, gerar frases determinísticas sem LLM:

- maior padrão/tipologia por oferta;
- participação e valor absoluto;
- crescimento ou queda do trimestre comparável;
- concentração por coorte;
- faixa de preço e preço médio por m²;
- estoque e vendas por segmento;
- cobertura geográfica do mapa.

Regras:

- frases usam apenas métricas não nulas;
- toda afirmação deve ser reproduzível pelo modelo;
- método aberto não bloqueia a frase, mas acrescenta nota de validação;
- ausência real omite a frase, sem inventar conclusão;
- LLM futura poderá melhorar estilo, nunca criar fatos.

## 13. Preview e impressão

- uma página por vez com seletor e miniaturas;
- navegação anterior/próxima preservando o modelo em cache;
- modo visão geral opcional;
- impressão de todas as páginas na ordem do manifesto;
- `@page` 16:9, margem zero, `print-color-adjust: exact`;
- esconder shell, toolbar e controles operacionais;
- preservar fontes, selos metodológicos, rodapé e numeração;
- impedir overflow, quebras internas, tabelas cortadas e gráficos incompletos;
- validar em Chrome e Edge, escala 100%.

## 14. Testes obrigatórios

### Unidade/contrato

- manifesto contém exatamente 62 entradas únicas e ordenadas;
- janela temporal sempre contém 17 pontos quando há cobertura;
- comparação trimestral escolhe o mesmo trimestre em cinco anos;
- variações tratam zero/null corretamente;
- totais Vertical + Horizontal = Total quando métricas são aditivas;
- IVV nunca é somado;
- método aberto com valor continua renderizável;
- nenhuma fixture/reference é importada pelo bundle do relatório;
- textos determinísticos só citam valores existentes.

### Visual

Comparar lado a lado com a referência:

- slides 1, 3, 6, 7, 8 e 10;
- tabela 12;
- gráfico 14;
- tabela 21;
- páginas 31/32;
- matriz 41/42;
- mapa 56;
- um encerramento.

Checar desktop, PDF e ausência de cortes. Salvar checklist ou screenshots de QA fora do bundle quando apropriado.

### Comandos

```powershell
cmd /c npm test
cmd /c npm run build
cmd /c npm run check:live-docs -- HEAD~1 HEAD
git diff --check
```

## 15. Sequência de execução terminal

1. P0 — auditar/extrair assets e congelar mapa visual dos 62 slides;
2. P1 — corrigir contrato de estado e ampliar coleta compartilhada;
3. P2 — completar `PanoramaReportModel` e testes puros;
4. P3 — reproduzir slides 1–10 e todos os divisores/encerramentos;
5. P4 — criar tabelas comparativas oficiais 12/13/21/22;
6. P5 — criar gráfico trimestral oficial e aplicar a 14–19/23–26/40;
7. P6 — implementar oferta, preços, composições e matrizes 27–51;
8. P7 — gerar narrativas 53–54 e mapa 56;
9. P8 — miniaturas, preview e impressão integral;
10. P9 — QA lado a lado, testes, docs vivos, commit e push na `main`.

Não parar por divergência metodológica. Usar o melhor cálculo candidato derivado da API, exibir seus valores e marcar `Em validação`, preservando fonte/fórmula para a rodada com analistas.

## 16. Critérios de aceite terminal

- [ ] assets oficiais incorporados ou bloqueios explicitamente registrados;
- [ ] páginas 1–10 reconhecíveis como o deck oficial;
- [ ] divisores e encerramentos usam a identidade oficial;
- [ ] todas as 62 páginas possuem composição final, não placeholders genéricos;
- [ ] todos os endpoints previstos são consultados/reutilizados;
- [ ] dados disponíveis aparecem mesmo com metodologia aberta;
- [ ] tabelas 12/13/21/22 seguem a estrutura oficial;
- [ ] gráficos usam janela de 17 trimestres e destaques comparáveis;
- [ ] textos são automáticos e rastreáveis;
- [ ] mapa usa coordenadas da API;
- [ ] PDF 16:9 imprime sem cortes;
- [ ] nenhuma referência numérica entra no runtime;
- [ ] testes e build passam;
- [ ] documentos vivos e decisões são atualizados;
- [ ] commit e publicação ocorrem diretamente na `main`.

## 17. Handoff obrigatório

Ao concluir, informar:

1. commit publicado;
2. assets oficiais utilizados e eventuais ausências;
3. endpoints consultados e quantidade de chamadas;
4. cobertura `ready/partial/unavailable` e `approved/reconciled/assumed/open_method`;
5. páginas com tabelas, gráficos, textos e mapa reais;
6. comparativo visual executado;
7. resultado de testes/build/PDF;
8. divergências metodológicas que permanecem para analistas;
9. roteiro curto de apresentação;
10. próximo plano de calibração, sem refazer o layout.
