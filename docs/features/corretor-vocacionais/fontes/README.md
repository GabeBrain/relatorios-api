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

**Consequência para o extrator:**
1. Ler apenas uma **lista branca de abas de saída** — nunca varrer o workbook inteiro.
2. Localizar o cabeçalho **procurando os nomes das colunas**, nunca por coordenada fixa.
3. **Falhar alto** quando uma aba esperada some ou o cabeçalho não bate — silêncio aqui vira número
   errado tratado como verdade, que é pior que não checar.
4. Propagar `#REF!`/`#DIV/0!` como **célula inválida**, não como zero.
5. Registrar no `fonte.json` a **procedência de cada número** (arquivo, aba, célula), para o achado
   poder citar a evidência como já faz com a imagem.

## Ciclo de vida

1. Material chega → cria a pasta do estudo e o `MANIFEST.md`.
2. Extrai os derivados para `../calibracao/<slug>/`.
3. Roda as validações; os testes passam a apontar para os derivados, nunca para o bruto.
4. Com os derivados versionados e os testes verdes, **descarta o bruto**: move para
   `C:\Users\GaloD\Desktop\SE\_backup_estudos\` e registra a linha em
   [`ARQUIVOS_REMOVIDOS.md`](../ARQUIVOS_REMOVIDOS.md) — tamanho, data e papel que cumpriu.
5. O `MANIFEST.md` fica no repo apontando para onde o original foi parar.
