# 05 — Checklist de QA

Duas camadas: **checagens automáticas** (`lint_pptx.py`) e **rubrica de revisão** (subagente revisor que não participou da produção).

---

## 1. Checagens automáticas (`lint_pptx.py`)

Cada item gera `FALHA` (🔒 bloqueia entrega) ou `ALERTA`.

| ID | Checagem | Nível | Como |
|---|---|---|---|
| M1 | Fontes fora de Neo Sans Pro / Montserrat (exceto fonte manuscrita da publicação em `material-fonte`) | 🔒 | `<a:latin typeface>` |
| M2 | Cores fora da paleta do manual (doc 02 §3) e de `cores_extra_aprovadas` | 🔒 | `srgbClr` × lista de HEX do manual |
| M3 | Círculos/bolas decorativas soltas ou formas orgânicas fora do sistema de blocos do manual | 🔒 | `prstGeom ellipse/donut/blob` fora de gráficos e fora dos blocos oficiais |
| M4 | Logo em texto em vez de imagem oficial | 🔒 | Busca por "BRAIN" em caixa de texto no layout |
| M5 | **Logo com tagline em tamanho pequeno** (largura < 2″ no slide 16:9) | 🔒 | Nome/hash do arquivo de imagem × largura |
| M6 | Logo positiva sobre fundo escuro ou negativa sobre fundo claro; logo distorcida (proporção ≠ original) | 🔒 | Cor de fundo × arquivo; razão w/h |
| M7 | Mais de 2 tons de cor por slide (fora os cinzas de texto) | ALERTA | Contagem de `srgbClr` distintos por slide |
| M8 | Neo Sans fora do título principal e dos números de destaque (run que começa com dígito, sinal ou R$ e tem até 4 palavras, ex.: "11,4 mi", "+105%", "3,31 → 2,79", "2 de 27", "9 milhões"), ou título Neo Sans fora de caixa alta | ALERTA | Typeface × placeholder × conteúdo do run × caps |
| T1 | Texto transbordando a caixa | 🔒 | Render + detecção |
| T2 | Título > 14 palavras | ALERTA | Contagem |
| T3 | Corpo > 40 palavras em slide de palco | ALERTA | Contagem **[calibrar]** |
| T4 | Termos proibidos | 🔒 | Regex |
| T5 | Frases de auditoria | 🔒 | Regex |
| T10 | Expressões vetadas pelo manual no deck **e no roteiro** ("eu acho que", "vou falar um pouquinho", "apenas este número", gírias, abreviações tipo "vc/pq") | 🔒 | Regex |
| T11 | Sigla sem extenso na 1ª ocorrência (público não técnico) e estrangeirismo evitável | ALERTA | Lista de siglas e de anglicismos |
| T6 | **Nota de revisão ou rascunho no slide** ("temos que ver", "verificar", "TODO", "atualizar?", "Nessa seção") | 🔒 | Regex |
| T7 | **Placeholder** ("ESPAÇO PARA", "XXX", "inserir", "lorem", "[ ]") | 🔒 | Regex |
| T8 | **Ortografia** (pt-BR) | ALERTA | Corretor (ex.: `hunspell pt_BR`) + lista de termos do setor |
| T9 | Título terminando em ponto final | ALERTA | Regex |
| D1 | Slide com número/gráfico sem rodapé de fonte | 🔒 | Detecção |
| D2 | Número do deck ausente de `fontes.json` | ALERTA (🔒 após calibração) | Cruzamento, ignorando nº de slide, anos e números marcados como derivados no relatório |
| D3 | Fonte com período anterior a `data_corte_dados` | ALERTA | Datas no rodapé |
| D4 | **Mesmo indicador com valores diferentes** no deck ou vs. dados internos (ex.: "~588 mil" × "589,0 mil") | ALERTA | Cruzamento por indicador |
| D5 | **Fonte com mais de 12 meses** em relação à data do evento sem etiqueta "atualizado" nem `[PENDENTE]` | ALERTA | Datas |
| E1 | **Capa confere com o briefing**: nome oficial do evento, cidade, data, nome completo e cargo do palestrante | 🔒 | Comparação de strings |
| E2 | QR code previsto no briefing e ausente | 🔒 | Imagem no slide de metodologia |
| E3 | **Slide final ausente ou de consultor diferente do `responsavel`** (e coapresentadores) | 🔒 | Hash da imagem do último slide × `marca/slides-finais/` |
| V1 | "R$" em versão `sem-valores` | 🔒 | Regex |
| F1 | Contagem de slides fora de ±20% da meta | ALERTA | Contagem |
| F2 | Imagem de baixa resolução (< 150 dpi) | ALERTA | Dimensão vs. frame |
| F3 | Slide vazio ou placeholder não preenchido | 🔒 | Texto vazio / "Clique para…" |
| F4 | Slide sem notas do orador | ALERTA | Notes |
| F5 | Foto sem crédito | ALERTA | Imagem sem "Imagem:/Imagens:" no slide |

## 2. Rubrica do revisor (nota 1–5)

O revisor recebe: thumbnails, texto extraído, `briefing.yaml`, `narrativa.md` aprovada e `atualizacao.md`. **Não** recebe o histórico.

| Critério | 5 = | 1 = |
|---|---|---|
| **Tese** | Uma frase clara, sustentada do início ao fim | Não dá para dizer qual é a mensagem |
| **Fluxo** | Blocos em ordem lógica, transições evidentes | Slides soltos |
| **Títulos** | Afirmativos, com tensão, palavra-chave destacada | Descritivos |
| **Evidência** | Dado + comparativo + fonte em todo argumento | Opinião sem dado |
| **Atualidade** (novo) | Traz fatos posteriores à fonte; nada defasado sem sinalização | Recapitula um material antigo como se fosse atual |
| **Relevância local** (novo) | Fala com a cidade/estado do evento em 2+ pontos | Genérico, serviria para qualquer cidade |
| **Voz humana** (novo) | Citações de quem faz, especialistas, tensões e mitos | Só números |
| **Riqueza visual** (novo) | Imagens/ilustrações/fotos de cases bem usadas; variedade de layouts | Repetição de caixas e barras |
| **Impacto** | Big numbers e frases bem dosados | Nada se destaca ou tudo grita |
| **Público** | Vocabulário e profundidade certos | Desalinhado |
| **Tempo** | Cabe no tempo com folga de ~10% | Impossível no tempo |
| **Marca/visual** | Consistente com a identidade escolhida | Inconsistente |
| **Fidelidade** | Segue a narrativa aprovada | Desviou sem justificativa |
| **Acabamento** (novo) | Zero placeholder, nota interna, erro de digitação | Rascunho visível |

Aceite: **todas ≥ 4** e zero 🔒. Saída: tabela de notas + correções por slide.

## 3. Revisão visual

Alinhamento e margens; hierarquia (etiqueta > título > visual > callout > fonte); contraste (amarelo nunca como texto sobre branco); gráficos legíveis à distância; nada cortado; logo oficial na posição padrão; fotos com crédito e sem distorção.
