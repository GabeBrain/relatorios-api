# Arte e identidade visual — Panorama Maceió / SINDUSCON-AL

16/11/2026 · comprovado por render dos originais no PowerPoint 16.0 (abertura somente leitura; hashes dos
PPTX conferidos inalterados após o render) e amostragem de pixels. Material local em
`.local-inputs/relatorios-lucas/maceio/artes/{maio,junho}/` — `media/` (45/48 arquivos extraídos do OOXML),
`render/` (82/87 PNG 1920×1080, um por posição) e `mapa_arte.json` (slide → imagens, temas, fontes).
Binários não são versionados; este documento registra os tokens para a implementação reproduzir.

## Tokens de cor (amostrados dos renders)

| Token | Valor | Uso comprovado |
|---|---|---|
| Verde arte | `#5B7537` | 2ª linha dos títulos, faixa do rodapé, tag de recorte "MACEIÓ + RM", rótulos de destaque da série Maceió, cabeçalho de tabelas |
| Verde escuro tabela | `#425428` | Linha de variação (%) Maceió nas tabelas de variações |
| Verde claro linhas | `#829667` (tom da série) / zebra `#EDF2E6` aprox. | Série Maceió nos gráficos; linhas alternadas de tabela |
| Amarelo sublinhado | `#FFD501` | Barra curta sob o título; detalhes decorativos das divisórias; ícone "home" |
| Amarelo RM | `#FFC000` | Série/rótulos da Região Metropolitana, linha RM das tabelas de variação |
| Texto título | `#262626` | 1ª linha dos títulos (caixa alta) |
| Fundo | `#F9F9F9`/branco | Fundo dos slides de conteúdo |

Temas da arte no OOXML (theme3/6/7): accent1 `#5B7537`, accent2 `#7CA83E`, accent3 `#1F5F8A`.

## Tipografia

Temas da arte usam **Tahoma / Tahoma bold** (mesma família do SP institucional; o exportador nativo já tem
Tahoma). Há 16 fontes embutidas no PPTX (`ppt/fonts/*.fntdata`); títulos renderizados conferem com Tahoma
bold em caixa alta. Confirmar pesos por slide durante cada bloco de composição.

## Anatomia dos slides (comprovada nos renders)

**Conteúdo (ex.: posições 19 e 62 do mensal):**
- Título no canto superior esquerdo em duas linhas: 1ª preta `#262626`, 2ª verde `#5B7537`, caixa alta,
  com barra amarela curta `#FFD501` abaixo.
- Tag de recorte no canto superior direito: retângulo `#5B7537`, texto branco ("MACEIÓ + RM", "MACEIÓ", "RM").
- Tabela "VARIAÇÕES" no topo direito dos slides de série: título branco, cabeçalho cinza com os pares de
  período, linha verde `#425428` (Maceió, texto branco) e linha amarela `#FFC000` (RM).
- Gráficos: série Maceió em verde com rótulos cinza e destaques em caixas verdes; série RM em amarelo com
  destaques em caixas amarelas; rótulo do primeiro e do último ponto em caixa.
- Rodapé: faixa verde `#5B7537` em toda a largura com logo Brain branco à esquerda e selos SINDUSCON-AL,
  ADEMI-AL, COOPERCON Alagoas, SEBRAE e FIEA à direita (área protegida — nada pode invadir).
- Tabelas grandes (estado atual): cabeçalho e linha de total em `#5B7537` com texto branco, zebra verde-claro.

**Divisórias de seção (10 no mensal, 11 no trimestral):**
- Foto urbana com overlay degradê verde→amarelo (asset `30e8db523376.png` no mensal, reutilizado em todas),
  caixa branca arredondada central com o título preto em caixa alta, logo Brain branco no canto inferior
  direito, ícone "home" amarelo no canto superior direito e detalhes amarelos decorativos.

**Capa/abertura (posições 1–5) e fechamento (3 finais):** artes fotográficas próprias por posição; o slide 2
("Sobre este relatório") tem fundo verde com cartões brancos arredondados (tipo/local/período) e tablet com
logos de realização/apoio. Equipe técnica com fotos individuais (7 imagens no mensal, 6 no trimestral).

## Assets-chave (nomes no `media/` local, deck mensal)

- `24cd89c53c3d.png` — usado em 55 slides de conteúdo (elemento recorrente do layout).
- `30e8db523376.png` — fundo das 10 divisórias.
- `4d22844b5dc7.png` — capa (posição 1); `6083e47b6b9f.png` + logos — posição 2.
- Logos de apoio individuais nas posições 2/9 (SINDUSCON, ADEMI-AL, COOPERCON, SEBRAE, FIEA).

## Regras para a composição

1. Ordem e numeração = original, sem renumeração (D1/D5).
2. Reproduzir hierarquia do título (preto/verde + barra amarela), tag de recorte e rodapé com selos em
   **todas** as páginas de conteúdo; proteger a área dos selos e os limites do título.
3. Gráficos nativos editáveis nas cores da arte (verde Maceió, amarelo RM); não achatar slide em imagem.
4. Divisórias reproduzem a arte de fundo com a caixa central; os títulos vêm do MAPA_SLIDES.
5. Fotos/artes de capa, equipe e fechamento são assets da edição: tratar como conteúdo editorial embutido,
   sem recriação sintética.
