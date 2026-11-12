# lib/ — ferramentas do agente

Ferramentas que o agente usa dentro do workspace do trabalho (`/work/<jobId>`), na imagem em `/app/lib`
(INSTRUCOES_DESENVOLVIMENTO.md §6.1). Todas rodam sem rede.

| Ferramenta | Uso | Saída |
|---|---|---|
| `extract/extrair.py` | `python /app/lib/extract/extrair.py entrada/ trabalho/inventario` | um `.json`/`.md` por arquivo, `assets/` e `inventario.json` |
| `brain-deck/build.js` | `node /app/lib/brain-deck/build.js trabalho/deck_spec.json saida/Brain_<slug>_v<N>.pptx` | o `.pptx` no padrão Brain, com o tema já aplicado |
| `render.sh` | `/app/lib/render.sh saida/<deck>.pptx trabalho/thumbs` | PDF + `slide-NN.png` e as fontes usadas no PDF |
| `lint_pptx.py` | `python /app/lib/lint_pptx.py saida/<deck>.pptx --saida trabalho/qa.json --briefing briefing.yaml --fontes trabalho/fontes.json --relatorio saida/relatorio.md` | `qa.json`; código 1 se houver falha 🔒 |
| `apply_theme.js` | chamado pela brain-deck; avulso: `node /app/lib/apply_theme.js <deck>.pptx` | grava paleta e fontes da marca no tema |
| `preparar_marca.py` | só no build da imagem | `marca/derivados/` (logos recortadas e manifesto) |

## deck_spec.json

Validado com Zod (`brain-deck/spec.js`); um spec inválido é recusado com o caminho de cada campo errado.
Exemplo completo, equivalente ao build aprovado de referência: `brain-deck/exemplos/domicilios_v3.json`.

```jsonc
{
  "titulo": "O Brasil dos domicílios vazios",
  "cores_extra_aprovadas": [],            // HEX liberados no briefing (ex.: cor de parceiro)
  "slides": [
    { "tipo": "capa", "titulo": "…", "subtitulo": "…", "palestrante": "Fábio Tadeu Araújo",
      "detalhes": "CEO · Brain Inteligência Estratégica · ADIT Cidades 2026 · Florianópolis · novembro de 2026", "notas": "…" },
    { "tipo": "divisor", "secao": { "titulo": "1 · Nome do bloco", "etiqueta": "01 · NOME DO BLOCO" },
      "numero": "01", "titulo": "…", "subtitulo": "…", "notas": "…" },
    { "tipo": "conteudo", "titulo": "Título curto (vira caixa alta)", "apoio": "A afirmação completa",
      "sub": "O que o gráfico mostra", "fonte": "Fonte: IBGE, Censo 2022 · Elaboração Brain",
      "notas": "…", "elementos": [ … ] },
    { "tipo": "final", "responsavel": "fabio", "notas": "…" }   // ou { "tipo": "contato" } para responsável "outro"
  ]
}
```

- O primeiro slide é a capa e o último é o slide final do responsável (ou o de contato).
- `secao` abre uma seção do PowerPoint e define a etiqueta dos slides seguintes.
- `estilo_titulo: "afirmacao"` usa Montserrat sem caixa alta, para frases longas (doc 02 §4).
- Coordenadas em polegadas no slide 16:9 (13,333 × 7,5). Área útil do conteúdo: x 0,6–12,7; y 2,3–6,75.
  O rodapé de fonte fica em y 6,9.
- Cores são tokens da paleta (`brain-deck/tema.js`): `verde`, `verde_escuro`, `verde_claro`, `verde_mais_claro`,
  `amarelo`, `amarelo_escuro`, `amarelo_claro`, `amarelo_mais_claro`, `azul` (+ variações), `texto`, `cinza`,
  `cinza_claro`, `branco`, `preto`.

Elementos do slide de conteúdo (todos com `x`, `y`, `w` e, salvo indicação, `h`):

| `tipo` | Campos | Na referência |
|---|---|---|
| `card` | `valor`, `rotulo`, `sub?`, `destaque?` | 3 cards do slide 2 |
| `leitura` | `numero?`, `texto` | callout "LEITURA BRAIN" |
| `grafico` | `forma` (colunas, barras, linhas, pizza, rosca), `series[{nome, rotulos, valores}]`, `cores`, `formato?`, `empilhado?`, `legenda?`, `eixo_min?`, `eixo_max?`, `rotulo_*?`, `categoria_tamanho?`, `ordem_inversa?`, `espaco_barras?` | gráficos nativos e editáveis |
| `tabela` | `larguras`, `cabecalho`, `linhas`, `coluna_negrito?` (sem `h`) | capitais |
| `numero` | `valor`, `rotulo`, `sub?`, `tamanho?`, `cor_valor?`, `marcador?` (sem `h`) | composição do acréscimo |
| `fato` | `destaque`, `texto` | faixas do slide de SC |
| `painel` | `valor`, `rotulo`, `comparacoes[{valor, rotulo}]`, `nota?` | "Capitais dobraram" |
| `lista_numerada` | `itens[{titulo, texto}]` (2–5), `destaque?` | Síntese Brain |
| `texto` | `texto` (string ou runs `{texto, negrito, cor, tamanho, destaque, quebra}`), `tamanho?`, `cor?`, `negrito?`, `destaque?`, `alinhamento?`, `vertical?` | — |
| `bloco` | `cor`, `forma` (retangulo, canto), `rotacao?` | blocos modulares do manual |
| `imagem` | `caminho` (relativo ao trabalho), `credito?`, `texto_alternativo?` | — |

`destaque: true` em texto/run usa Neo Sans Pro: só em números de destaque (doc 02 §4).

## lint_pptx.py — o que cada regra faz

Implementa todas as checagens do doc 05 §1. Lista do que não foi possível checar vai em `nao_verificado`
(por exemplo, E1 sem briefing, D2 sem `fontes.json`, T8 sem hunspell); nada é dado como aprovado por omissão.

Decisões de interpretação (Fase 3, 12/11/2026), a confirmar nos trabalhos dourados:

| Regra | Decisão |
|---|---|
| D2 | ALERTA (🔒 só depois de calibrada, §5.1). Ignora anos, numeração de blocos e números da seção "derivados" do `relatorio.md`. |
| D4 | ALERTA para o mesmo número com grafias que não são arredondamento uma da outra, a até 0,5% (ex.: "~588 mil" × "589,0 mil"), e para o mesmo indicador com valores diferentes em `fontes.json`. |
| E3 | Confere os **pixels** da imagem do slide final com `marca/slides-finais/<responsavel>.png`, não os bytes: o deck aprovado de domicílios v3 traz a mesma imagem regravada com outra compressão PNG. Qualquer pixel alterado reprova. |
| T1 | Estimado sem render: quebra de linha por palavra com as métricas reais de Neo Sans e Montserrat (Pillow), altura de linha = máx(1,2 × corpo; ascendente + descendente). Caixa com "ajustar forma ao texto" pode crescer até a borda do slide. |
| M5/M6 | A logo é reconhecida pela imagem (recorte da área visível comparado às 4 logos oficiais), não pelo nome. O fundo é a forma preenchida atrás do centro da logo ou o fundo do slide/layout. |
| M7 | "Tons" contados por família de cor do manual (verde, amarelo, azul), sem os neutros. |
| M2 | Branco (#FFFFFF) aceito como neutro: é o fundo e o `lt1` do tema da referência aprovada. |
| T3 | Corpo = texto do slide fora título, etiqueta, apoio, subtítulo e fonte. A referência tem 5 slides acima de 40 palavras (ALERTA, [calibrar]). |
| T5 | A base não lista "frases de auditoria": lista inicial em `T5_AUDITORIA`, [calibrar]. |
| T6 | "TODO", "FIXME", "TBD" só em maiúsculas ("todo o país" é português). |
| F2/F5 | Logos, slides finais e QR code não entram na checagem de resolução e crédito. |
| M1 | Fonte extra só com `identidade: material-fonte` e `fontes_extra_aprovadas` no briefing. |

## Testes

```bash
cd gcp/slide-maker-agent/lib/testes
python -m unittest           # sem marca real: logos e slides finais sintéticos
SLIDE_MAKER_MARCA=../../.marca SLIDE_MAKER_FONTES=<pasta com Neo Sans e Montserrat> python -m unittest
```

`SLIDE_MAKER_EXIGIR=1` (usado no build da imagem) transforma em falha o que seria pulado por falta de fonte,
LibreOffice ou referência. Cobertura: a brain-deck reproduz o build original de `referencia/` (textos, gráficos,
tabelas, notas e posições); a referência passa com zero 🔒; cada regra 🔒 reprova a sua fixture; extração de
pptx, xlsx, pdf, docx e imagem, com arquivo falso e bomba de compressão recusados; render da referência em 18 PNGs.
