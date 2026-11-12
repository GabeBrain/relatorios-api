# 01 — Histórico de trabalhos e padrões extraídos

Este documento dá ao Claude Code o **repertório**: que tipos de pedido aparecem, o que entrou, o que saiu e qual transformação foi aplicada. Os padrões da seção 3 são a base das regras do pipeline (doc 03). A seção 5 registra os testes comparativos — o que funcionou melhor e por quê.

---

## 1. Inventário de trabalhos

### 1.1 Palestras e keynotes em eventos (identidade Brain)

| Evento / data | Entrada | Saída | Transformação-chave |
|---|---|---|---|
| **INC Campinas (ABRAINC) — 15/abr** | Deck Brain de 48 slides | 21 slides + roteiro de moderação + 3 slides avulsos (mapa do estado, tabela funil de demanda, cards-resumo por cidade) | Condensação ~56% e reestruturação em **6 tendências** para o interior paulista; entregáveis extras além do deck |
| **GRI Immersion — 10/jun** | Dados de mercado | Keynote de 27 slides | Diagnóstico do residencial em **6 blocos narrativos** (demanda, oferta, perfis de cliente, riscos, inteligência de mercado) |
| **GRI — Multifamily / locação** | Dados de mercado | Deck do zero na identidade Brain | Construção do zero no template padrão |
| **GRI Residencial — moderação SP** | Perfis dos painelistas + dados | Ganchos de moderação e âncoras de dados por painelista | Material de **moderação**, não de apresentação |
| **ADEMI Day Curitiba — HIS** | Dados de habitação social | 15 slides | **Tese explícita** (legislação municipal é a principal barreira), big numbers, frases de impacto, comparativos entre cidades |
| **ADEMI Day PR 2ª ed. — 11/ago (funding)** | `funding.pptx` com gráficos já levantados + pesquisa Brain/ABRAINC sobre juros (nov/2025, 503 entrevistas) | Abertura "quebra-gelo" de ~10 min + roteiro do evento em 4 blocos | **Panorama curto** que prepara o painel; organização de gráficos existentes em narrativa |
| **IBRADIM Londrina — 15/out** | Deck do ADEMI Day funding | Versão de 15 min, visão de mercado (público jurídico) | **Reaproveitar + atualizar dados + reposicionar para outro público** |
| **Lotesphere 2026** | Conteúdo de desenvolvimento urbano | Keynote de 45 slides | Keynote longo |
| **COMPLAN 2026 (ADIT) — 28/out** | Censo 2022 + conteúdo Brain | Palestra de 20 min + material de lançamento do Mapa dos Bairros Planejados + bloco de workshop | Tese demográfica → **implicações para loteamentos/bairros planejados** |
| **ADIT Cidades 2026 — Florianópolis, nov/2026 (Fábio Tadeu Araújo)** ⭐ | E-book *Retrofit no mercado imobiliário brasileiro* (Brain × Santander × SHI, nov/2025, 100 p.) | 41 slides em 7 blocos, na **linguagem visual do e-book**, com dados atualizados para 2026 | **Material-fonte → palestra atualizada e localizada**. Referência de "como fica bom" (ver §5) |

### 1.2 Decks de mercado / cliente

| Trabalho | Entrada | Saída | Transformação-chave |
|---|---|---|---|
| **Piracicaba** | Deck de 81 slides | Layout misto Secovi/Brain | Inserção de **frases de impacto, dados comparativos regionais e callouts contextuais** |
| **São José do Rio Preto** | Deck de mercado | **Duas versões**: híbrida Secovi/Brain e resumo no padrão Brain | Mesma base, dois formatos |
| **Santander (Brain/Tree) — set** | Escopo das frentes | Deck resumo de 10 slides **sem valores comerciais** | Versão "para circular" sem preço |
| **EBEN — Jardins do Parque (Taubaté)** | 3 estudos + planilha de viabilidade | Visão consolidada com pontos positivos/negativos | **Consolidação de múltiplos estudos** em parecer |
| **Domicílios vagos 2010–2022 (teste, nov/2026)** | Planilha IBGE por município | 16 slides, 15 min, incorporadores | Planilha bruta → narrativa com tese; boa recepção |

### 1.3 Propostas comerciais

Carvalho Hosken, Conecta, Grupo Sinop, Santander. Padrão: **objetivos → metodologia → entregáveis → escopo**.

### 1.4 Fora da identidade Brain

- **CONCIAM** — estudo acadêmico, identidade da instituição.
- **"O Piloto"** — 40 min para adolescentes; ilustrações infantis demais foram rejeitadas → visual "caprichado" mesmo em tom lúdico.

---

## 2. Tipologia de pedidos (campo `modo` do briefing)

| Modo | Descrição | Exemplos |
|---|---|---|
| `evento` | Palestra/keynote com tempo fixo, tese e fala | INC Campinas, ADEMI Day, COMPLAN |
| `evento-de-estudo` | Palestra derivada de uma **publicação Brain** (e-book, estudo, pesquisa) — atualiza, localiza e promove o estudo | ADIT Cidades 2026 (retrofit) |
| `abertura` | Panorama curto que prepara um painel | ADEMI Day funding |
| `moderacao` | Roteiro e ganchos por painelista | GRI Residencial |
| `resumo-brain` | Deck resumido no template Brain | Rio Preto (b), Santander |
| `cliente-preservado` | Mantém a identidade do cliente/parceiro | Piracicaba, Rio Preto (a) |
| `reaproveitamento` | Deck existente → novo evento/público, com atualização | IBRADIM |
| `consolidacao` | Vários estudos → parecer único | EBEN |
| `proposta` | Proposta comercial | Conecta, Sinop |
| `externo` | Identidade não-Brain | CONCIAM, O Piloto |

---

## 3. Transformações recorrentes (o "o que eu sempre peço")

1. **Validar a narrativa antes de produzir.** → Único gate humano do pipeline.
2. **Condensar com critério.** O corte é por mensagem, não por slide.
3. **Organizar em N blocos** (tipicamente **6–7**). Cada bloco = uma ideia-força.
4. **Título-afirmação** em vez de título descritivo, com a **palavra-chave destacada** (marca-texto).
5. **Big numbers** com fonte.
6. **Comparativos** (cidade × cidade, período × período, Brasil × mundo). Nunca número isolado.
7. **Callouts contextuais** e o rótulo **"Leitura BRAIN"** para o "e daí".
8. **Tese explícita** quando é evento.
9. **Entregáveis além do deck:** roteiro, slides avulsos, notas do orador.
10. **Duas versões quando há parceiro/cliente.**
11. **Versão "para circular"** sem valores comerciais.
12. **Reaproveitar e atualizar:** checar se os dados ainda são os mais recentes.
13. **Ajustar ao tempo de fala.**
14. **Atualizar o material-fonte para a data do evento** (novo — ADIT): se o estudo tem mais de ~6 meses, pesquisar o que mudou (leis, programas, resultados, dados de mercado) e marcar os slides com "atualizado <ano>".
15. **Localizar para a cidade do evento** (novo): pelo menos 2–3 pontos com dado ou fato da cidade/estado do evento (lei local, programa, número local).
16. **Contexto "por que agora"** (novo): abrir com 2–3 slides de contexto amplo (Brasil + mundo + sustentabilidade) antes do conteúdo do estudo.
17. **Benchmarks com imagem** (novo): cases internacionais e nacionais com foto e uma "Lição" por case-âncora.
18. **Desmontar mitos** (novo): slide no formato "O maior mito: '…'" com evidência.
19. **Promover o estudo** (novo): slide de metodologia (como o estudo foi feito) + capa do material + QR code para download.
20. **Síntese numerada** (novo): fechamento com N condições/recomendações, cada uma ancorada em um dado do deck.

## 4. Correções já feitas (não repetir)

- **Sem círculos, bolas ou formas orgânicas decorativas** na identidade Brain (correção set/2026). Flat design.
- Versões de cliente **preservam a identidade do cliente**.
- Ilustrações para público jovem: **não infantilizar**.
- Texto consultivo: sem linguagem vaga, sem "quitinete", sem frases de auditoria.
- **Confirmar o nome oficial do evento, cidade e data** (correção nov/2026): o deck de retrofit saiu identificado pelo local ("ACATE") em vez do evento ("ADIT Cidades 2026 · Florianópolis"). O print da agenda mostra o local, não necessariamente o evento.
- **Nome completo do palestrante** como ele usa em palco (ex.: "Fábio Tadeu Araújo").
- **Slide final por consultor** (nov/2026): o deck termina com o slide final oficial do responsável (Fábio, Guilherme ou Lucas Finoti), não com um "Obrigado" genérico. Perguntar sempre quem apresenta.
- **Logo pequena sem tagline** (nov/2026): a tagline fica ilegível em tamanho pequeno. Rodapé sempre na versão sem tagline.
- **Manual de marca incorporado** (nov/2026): a regra "sem círculos/formas arredondadas" foi refinada. Os blocos modulares e os gradientes diagonais do manual são permitidos; continuam proibidos círculos ou bolas decorativas soltos e cores fora da paleta. Atenção: o deck ADIT usou rosa/vermelho do e-book, o que o manual não permite sem aprovação.
- **Nada de nota de revisão, placeholder ou rascunho no slide** (visto no deck ADIT: caixa vermelha "Nessa seção, temos que ver se atualizamos…", "ESPAÇO PARA QRCODE", erro "pesuqisa"). Pendências vão para as notas do orador marcadas `[PENDENTE]` e para o `relatorio.md`.

---

## 5. Teste comparativo — Retrofit (nov/2026)

Mesmo material-fonte (e-book de retrofit), mesmo palestrante. Dois resultados:

| Dimensão | Versão A — pipeline desta base (27 slides) | Versão B — colega, ADIT Cidades (41 slides) ⭐ |
|---|---|---|
| Atualidade | Só dados do e-book (nov/2025) | E-book + dados de 2026 pesquisados (programas por capital com resultados, adesão à subvenção em SP: ~17%) |
| Localização | 1 dado do Censo de Florianópolis | Lei do Retrofit de Florianópolis na linha do tempo e na tabela de capitais |
| "Por que agora" | Gancho só com domicílios vagos | Vagos + carbono (UNEP: 37% das emissões; 50–75% menos ao reabilitar) + conversões nos EUA (23 mil → 90 mil unidades) e Europa |
| Identidade visual | Brain flat genérico (verde/amarelo, retângulos) | Linguagem do e-book: ilustrações a traço, etiquetas manuscritas por slide, marca-texto nas palavras-chave, anotações à mão, fotos dos cases |
| Benchmarks | Cortados | 2 slides de cases internacionais + deep-dive (Battersea, com "Lição") + cases brasileiros com foto |
| Voz | Citações pontuais | Especialistas lado a lado ("três ângulos") + incorporadores com tensão ("o maior mito", "o regulador mudou", "otimismo cauteloso") |
| Promoção do estudo | Só rodapé | Slide de metodologia em 5 frentes + capa do book + QR code |
| Fechamento | 3 colunas por agente | 7 condições numeradas, cada uma com âncora de dado |
| Falhas | — | Nota de revisão e placeholder no slide; erro de digitação |

**Por que B foi melhor:** (1) trouxe **informação nova** em vez de recapitular o estudo; (2) **falou com a cidade** do evento; (3) **pareceu uma extensão do e-book**, reforçando a marca do estudo e da parceria; (4) teve **mais imagem e mais voz humana**; (5) a síntese virou **agenda** e não só conclusão.

**O que A fez melhor e deve ser mantido:** zero placeholder, rodapé de fonte padronizado, roteiro cronometrado, relatório ao analista.

> Regra derivada: quando a entrada é uma **publicação Brain**, o modo é `evento-de-estudo` (doc 03) e a pergunta "o que mudou desde a publicação?" é obrigatória.
