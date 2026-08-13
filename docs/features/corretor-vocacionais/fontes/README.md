# Material-fonte dos estudos — convenção

Aqui entra o material bruto que os analistas mandam: o **PPTX do estudo** e as **planilhas de
trabalho** que geraram os números. É área **transitória**: o material fica só até virar derivado
versionável, e então é descartado com registro.

A regra que governa tudo: **o pesado não mora no repo; o derivado sim.** Mesma lógica já aplicada aos
PPTX em [`ARQUIVOS_REMOVIDOS.md`](../ARQUIVOS_REMOVIDOS.md).

## Estrutura

```
fontes/
  README.md                        ← esta convenção (versionada)
  <cliente>-<cidade>-<aaaa-mm>/
    MANIFEST.md                    ← versionado: o que chegou, de quem, quando, e o destino
    estudo/                        ← gitignored
      <arquivo>_vERRO.pptx           versão anterior à revisão (com os erros)
      <arquivo>_vFINAL.pptx          versão entregue (corrigida)
    excel/                         ← gitignored
      <planilhas de trabalho, como o analista mandou — sem renomear>
```

Derivados nascem em `../calibracao/<slug>/` e **são versionados** (poucos KB, diffáveis):

| Derivado | De onde vem | Serve para |
|---|---|---|
| `<slug>-erro.ir.json` | PPTX com erro | rodar o motor sem o arquivo pesado |
| `<slug>-final.ir.json` | PPTX final | **diff contra o de erro = gabarito** |
| `<slug>.fonte.json` | pacote Excel | `SOURCE_CROSSCHECK` — os números verdadeiros |
| `<slug>.labels.json` | triagem humana | gabarito de FP, quando houver |

## Por que as duas versões do estudo

O **diff entre a versão com erro e a final é gabarito de graça**: cada número que mudou foi um erro
que a analista encontrou e corrigiu, rotulado por ela sem custo nenhum de anotação. Isso mede
**recall** (o motor achou o que ela achou?) e **precisão** (o que o motor apontou e ela não mexeu é
candidato a falso positivo) sem ninguém preencher planilha de gabarito.

## Contrato das planilhas (medido no pacote da Rolândia, 12/ago/2026)

Antes de calibrar o extrator, o que dá e o que não dá para assumir:

**Estável — pode ancorar:**
- As três Consolidadas (1 Km / 3 Km / Z.I. Total) são o **mesmo template**.
- As abas de saída — `Padrão`, `Ano`, `Tipologia`, `Comerc. Mensal`, `Preço Tipologia`,
  `Preço Padrão`, `M²TIPO`, `GARAGEM*` — têm **nome e cabeçalho idênticos nos três arquivos**, com o
  cabeçalho na **linha 5** e as mesmas colunas (`Oferta Lançada`, `(%)`, `Oferta Atual`, `(%)`,
  `Vendas`, `Disp. Sobre Lançados`).
- `02. SOCIODEMOGRAFIA.xlsm` tem abas nomeadas de forma consistente (`Dom.p Tipo`,
  `Dom.p Cond. Ocup.`, `População - Faixa Etária`, `Dom.p nº Moradores`), cada uma com bloco
  `Absoluto | %` por recorte (PR · cidade · Até 1 km · Até 2 km · Até 3 Km).

**Instável — nunca assumir:**
- A **lista de abas varia** entre arquivos do mesmo template (`Planilha1` × `Validação de Base`).
- Sobra **resíduo de template de outra praça**: a `Comerc. Mensal` da Consolidada de 1 Km da Rolândia
  traz 80 empreendimentos e 12.463 unidades num raio que tem **1** empreendimento.
- Há `#REF!` e `#DIV/0!` em abas de saída.
- Há **passos manuais anotados** — `"ALTERAR MANUALMENTE"`, `"MANTER E ALTERAR NO PPT"`,
  `"Alterar 0 por traço"`. São os pontos onde o erro humano entra.
- Posição de linha/coluna dos dados **abaixo** do cabeçalho varia com o número de categorias.

## Nomes de arquivo: instáveis em toda dimensão (medido em 3 pacotes, 13/ago/2026)

Comparando Rolândia (jul/26), Toledo (jul/26) e Marka (jan/26), **nenhum nome de arquivo se repete
exatamente** entre estudos que cumprem o mesmo papel:

| Dimensão | Evidência |
|---|---|
| Acentuação | `ABSORÇAO` × `ABSORCAO` · `Locação` × `Locacao` · `Área` × `Area` |
| Prefixo numérico | `01. Consolidada - 1 Km_verificação - OK` × `1.CONSOLIDADA 1 KM` |
| Caixa | `SOCIODEMOGRAFIA` × `Sociodemografia` × `socio` |
| Sufixo livre | `_verificação - OK` · ` 2 raios` · ` - ZI` · ` ok` |
| Recorte | por raio (1/2/3 Km, Z.I.) × por segmento (HIS 1, HIS 2, HMP, Primária) |
| Quantidade | 2 consolidadas no Toledo, 3 na Rolândia, 4 "Analise Vertical" no Marka |
| Integridade | `1. OnMaps (5.xlsm` — nome truncado com parêntese aberto |
| Duplicatas | Toledo tem 2 `ABSORCAO LANCAMENTOS` e 2 arquivos de área de lazer |

## O nome mente; a aba não (medido com os 3 pacotes abertos, 13/ago/2026)

> ⚠️ **Correção.** A primeira leitura, feita só pelos nomes de arquivo, concluiu que jan/2026 (Marka)
> era "outra geração de template". **Abrir os arquivos desmentiu isso.** Os nomes divergem por
> completo, mas a camada de abas é a mesma família nos três estudos e nas duas épocas.

| Papel | Rolândia (jul/26) | Toledo (jul/26) | Marka (jan/26) |
|---|---|---|---|
| Oferta consolidada | `01. Consolidada - 1 Km_verificação - OK` | `1.CONSOLIDADA 1 KM` | `Analise Vertical Otimizada - HIS 1` |
| Sociodemografia | `02. SOCIODEMOGRAFIA` | `02. SOCIODEMOGRAFIA 2 raios` | `1. OnMaps (5` |
| Absorção | `03. ABSORÇAO LANÇAMENTOS` | `03. ABSORCAO LANCAMENTOS - ZI` | `Cenarios - 3 Anos ok` |
| População/domicílios | `01. POPULACAO E DOMICÍLIOS` | `1.Populacao de Domicilios` | `2. Populacao e Domicilios` |
| Revenda/locação | `02. Revenda - Apartamento` | idem | `Revenda casas cond` |

Nomes irreconhecíveis entre si — e **as abas são as mesmas** em todos: a consolidada sempre traz
`CONSOLIDADA`, `Padrão`, `Ano`, `Tipologia`, `Comerc. Mensal`, `Preço Tipologia`, `Preço Padrão`,
`M²TIPO`, `M² PADRÃO`, `R$M²TIPO`, `M² POR R$M²`, `INCC`; a absorção sempre traz exatamente `TAXAS`,
`DOMICÍLIOS POR RENDIMENTO`, `ABSORÇÃO`, `GRAFICOS`; a sociodemografia sempre traz `Dom.p Tipo`,
`Dom.p Cond. Ocup.`, `População - Faixa Etária`, `Dom.p nº Moradores`.

Variam só **abas opcionais**: Toledo não tem `GARAGEM*` nem `GRÁFICOS_R$`; Marka acrescenta `VSO` e
`R$TIPO`; `Esgotados` duplica blocos com sufixo ` - 2`.

**O que não é estável, mesmo dentro da aba certa:**

| | jul/2026 | jan/2026 |
|---|---|---|
| Cabeçalho de `Padrão` | linha 5 | linha 5 |
| Cabeçalho de `Ano` e `Tipologia` | **linha 5** | **linha 6** |
| Oferta remanescente | `Oferta Atual` | **`Oferta         Final`** (espaços múltiplos internos) |
| Vendas | `Vendas` | `Vendas s/ O.L.` |
| Disponibilidade | `Disp. Sobre Lançados` / `Disp. Sobre lançados` (caixa varia no mesmo estudo) | `Disp. s/ O.L.` |

**Consequência:** ancorar **na aba**, não no arquivo. Achar o cabeçalho **procurando os nomes das
colunas** — a linha varia. Normalizar acento, caixa e **runs de espaço** antes de comparar. Manter um
**dicionário de sinônimos por conceito** (`oferta atual` ≡ `oferta final`; `vendas` ≡ `vendas s/ o.l.`),
não um mapa por geração. O nome do arquivo serve só para **rotular o recorte** (1 Km, 2 Km, Z.I.,
HIS 1, HMP, Primária) — e mesmo nisso é falível.

**Ambiguidade real, não hipotética:** o Toledo tem `03. ABSORCAO LANCAMENTOS - ZI.xlsm` e
`03. ABSORCAO LANCAMENTOS -.xlsm`. Parecem duplicatas e **não são**: a primeira é a Z.I.
(23.499 domicílios), a segunda é a cidade (56.405). Escolher pelo nome pegaria o escopo errado em
silêncio. **Registrar a ambiguidade e exigir desempate.**

**Consequência para o extrator:**
1. Ler apenas uma **lista branca de abas de saída** — nunca varrer o workbook inteiro.
2. Localizar o cabeçalho **procurando os nomes das colunas**, nunca por coordenada fixa.
3. **Falhar alto** quando uma aba esperada some ou o cabeçalho não bate — silêncio aqui vira número
   errado tratado como verdade, que é pior que não checar.
4. Propagar `#REF!`/`#DIV/0!` como **célula inválida**, não como zero.
5. Registrar no `fonte.json` a **procedência de cada número** (arquivo, aba, célula), para o achado
   poder citar a evidência como já faz com a imagem.

## O extrator

[`../fonte_extractor.py`](../fonte_extractor.py) — irmão do `ir_extractor.py`. Implementa o contrato
acima e produz `<slug>.fonte.json`:

```bash
python fonte_extractor.py fontes/<slug>/excel --slug <slug> -o calibracao/<slug>/<nome>.fonte.json
```

Aceite em `src/features/corretor/lib/v3/__tests__/fonte-real.test.ts`, sobre os três pacotes reais.

**Blocos extraídos hoje:** `oferta` (Padrão · Ano · Tipologia de cada consolidada), `socio`
(Dom.p Tipo · Cond. Ocup. · Faixa Etária · nº Moradores), `populacao` (série 2000/2010/2026) e
`absorcao` (TAXAS). Cobrem as três famílias de erro achadas no FN-04. Revenda, locação, lazer e
anúncios entram no inventário mas ainda não são extraídos.

**Saída, por bloco:** papel, tabela, recorte, arquivo, aba, linha do cabeçalho, conceitos
reconhecidos, itens e linha de total — com `linha` em cada registro, para o achado citar procedência
como já faz com a imagem-evidência.

**Rendimento medido (13/ago):** 1,1 GB de planilhas → **194 KB de JSON**; 55 blocos nos três pacotes.

### Armadilhas que ele já evita (todas encontradas em dado real)

| Armadilha | Onde apareceu | Defesa |
|---|---|---|
| Coluna órfã herdando o recorte anterior e **sobrescrevendo com zero** | `População - Faixa Etária` da Rolândia: restos de `#VALUE!`/`#DIV/0!` depois de "Até 3 Km" | cada recorte é dono de **exatamente um** `Absoluto` e um `%` — os primeiros a partir da sua coluna |
| `\b` não fecha antes de `_` | `1 Km_verificação` não casava com `\b1 km\b` | `_` e `-` viram espaço antes de classificar |
| Cabeçalho da coluna de rótulos lido como recorte | `TIPO DE DOMICÍLIO`, `MORADORES` | só entram rótulos a partir da primeira coluna `Absoluto` |
| Base bruta disputando papel com a análise | `00. Base - Revenda e Locação` × `02. Revenda - Apartamento` | papel `base` reconhecido antes, e papéis coletivos não geram aviso de ambiguidade |
| Nome de arquivo em NFD | acento do Windows quebra comparação com literal NFC | normalizar antes de comparar |

## Ciclo de vida

1. Material chega → cria a pasta do estudo e o `MANIFEST.md`.
2. Extrai os derivados para `../calibracao/<slug>/`.
3. Roda as validações; os testes passam a apontar para os derivados, nunca para o bruto.
4. Com os derivados versionados e os testes verdes, **descarta o bruto**: move para
   `C:\Users\GaloD\Desktop\SE\_backup_estudos\` e registra a linha em
   [`ARQUIVOS_REMOVIDOS.md`](../ARQUIVOS_REMOVIDOS.md) — tamanho, data e papel que cumpriu.
5. O `MANIFEST.md` fica no repo apontando para onde o original foi parar.
