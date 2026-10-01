# Revisão de interface do Corretor — diagnóstico e proposta (30/set/2026)

Para quem decide o próximo ciclo do Corretor. O ponto de partida é o caso da Ana (João Pessoa): o estudo
foi dado como “0 erros” sem que a análise tivesse rodado, porque a interface mostrava contadores e
entrega liberada antes da hora, e o aviso que explicava isso era um parágrafo que ninguém leu. As
correções de fluxo já feitas hoje (v0.62–v0.64) resolvem esse caso; este documento trata do resto.

## 1. Diagnóstico

Evidência: capturas do estudo de Campos do Jordão (abas Problemas e Por slide) e da lista de estudos.

| Problema | Onde aparece | Efeito no analista |
|---|---|---|
| Cartão de achado com 7 elementos antes do conteúdo | ícone ⚠, selo de nível, título, chip do slide, selo do tipo, selo “β”, selo “Pendente” | O olho não acha o que importa; o selo “Pendente” repete o estado que os botões já mostram; “β” não significa nada para quem corrige |
| Cartões altos (~170 px) | Todas as abas | 36 achados = ~6.000 px de rolagem; perde-se a visão de conjunto |
| Três abas com os mesmos itens | Completude, Problemas, Por slide | Não fica claro qual é “a lista”; o mesmo achado aparece em três lugares |
| Quatro botões por achado | Corrigido · Ignorado · Pendente · Não é erro (FP) | “Ignorado” e “Não é erro” se confundem; “Pendente” é o estado padrão, não uma ação |
| Achado sem o slide | Todos | Para decidir, o analista abre o PowerPoint e procura o slide; a imagem da evidência existe, mas fica atrás de “Ver evidência” |
| Cabeçalho com 6 faixas | Título, passos, contadores, barra, cobertura, abas (~220 px) | Pouco espaço útil; o que muda (o que falta revisar) disputa com o que é fixo |
| Texto explicativo em todo lugar | Subtítulos em itálico, “hints”, parágrafos no portão, descrições longas nos achados | Ninguém lê; o essencial some no meio (causa direta do caso da Ana) |
| Paleta de alerta em tudo | vermelho, laranja, âmbar, roxo, verde em selos e fundos | Tudo parece urgente, nada parece urgente; é o que dá a sensação de “AI slop” |
| Emoji e jargão | “🎉”, “β”, “DET R$ 0”, “causa raiz”, “varredura fina” | Linguagem de desenvolvedor, não de analista |
| Painel de autenticação GeoBrain na barra lateral | e-mail/senha “Gerar token” | Ocupa a barra lateral do Corretor sem ter relação com ele |
| Achados antigos não se reavaliam sozinhos | Ex.: o “Z.I. primária” de Campos do Jordão continua na lista | A regra já foi corrigida, mas o achado gravado antes só some com nova análise |

## 2. Princípios para a nova interface

1. **Uma lista, uma decisão por vez.** A tela é uma fila de revisão; o resto é detalhe sob demanda.
2. **Mostrar a evidência, não descrevê-la.** A imagem da tabela ou o trecho do texto ao lado do achado.
3. **Uma frase por achado.** Título que diz o erro (“Unidade trocada: hab. em vez de dom.”), número do slide, e só.
4. **Duas ações principais:** “Corrigido” e “Não é erro”. O resto num menu.
5. **Cor só para o nível.** Vermelho = erro, âmbar = verificar. Tipo, origem e modo viram texto discreto.
6. **Estado do estudo em uma linha.** “Análise completa · 8 para revisar · 2 bloqueiam a entrega”.
7. **Nenhum parágrafo de instrução.** Se a interface precisa explicar, o fluxo está errado.

## 3. Proposta de tela

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Campos do Jordão · Vocacional Vertical   v1 · 153 slides      [Entregar ▸] │
│ Análise completa · 8 para revisar · 2 bloqueiam                  ⋯ (mais)   │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ FILA                  filtro ▾│  s23 · Unidade trocada: hab. em vez de dom.  │
│ ● s23 Unidade trocada (Brasil)│                                              │
│ ● s45 Faixa sobreposta (4 sl.)│  ┌────────────── imagem do slide/tabela ────┐│
│ ○ s72 88 ≠ 100 (exclusão?)    │  │                                          ││
│ ○ s86 Faixas ≠ s88            │  │    (evidência já existe: sha1 da imagem)  ││
│ ○ s11 Sem fonte               │  │                                          ││
│ ─ cobertura: 12 tabelas sem   │  └──────────────────────────────────────────┘│
│   conferência segura          │  Slide: 75.298.796 hab. · Planilha: dom.     │
│                               │                                              │
│                               │  [✓ Corrigido]  [✗ Não é erro]   ⋯           │
└───────────────────────────────┴──────────────────────────────────────────────┘
   ↑/↓ navega · C corrige · N não é erro (atalhos já existem na “Triagem”)
```

- A **fila** substitui as três abas: ordenada por nível e depois por slide; filtro por nível e por
  seção num menu. Grupos (“mesmo problema em 4 slides”) aparecem como uma linha.
- O **painel da direita** mostra a evidência (imagem da tabela já guardada para os achados de visão;
  trecho do texto para os de texto) e a comparação em uma linha.
- A **triagem por teclado**, que hoje é um modo à parte, vira o comportamento padrão da tela.
- **Completude** (estrutura, ata, cobertura) vira um bloco curto no topo da fila, não uma aba.

## 4. Mudanças e custo técnico

Custo: **P** = até 1 dia, **M** = 2–4 dias, **G** = 1–2 semanas. “Base” = o que já existe e é reaproveitado.

| # | Mudança | Custo | Base existente | Observação |
|---|---|---|---|---|
| 1 | Cartão enxuto: título + slide + 2 botões; selos de tipo/β/pendente viram texto discreto | P | `V3FindingCard` | Maior ganho visual pelo menor custo |
| 2 | Títulos que dizem o erro (reescrever os títulos dos achados) | P | textos em `ia-vision`, `source-crosscheck`, `cross-table` | Já feito em parte (v0.59–0.61) |
| 3 | Paleta: cor só no nível; resto neutro; sem emoji e sem “β/DET” na tela | P | tokens Tailwind do projeto | Pode ser um tema do Corretor |
| 4 | Estado do estudo em uma linha no cabeçalho; passos e cobertura num “⋯” | P | `StudySteps`, `CoverageLine` (v0.62) | Reduz o cabeçalho de ~220 px para ~80 px |
| 5 | Fila única no lugar das três abas | M | `wl` (agrupamentos já calculados), `DeckRuler` | Os grupos por causa raiz viram linhas agrupadas |
| 6 | Painel de evidência ao lado (imagem da tabela) | M | `evidenceSha1` + `attachEvidenceImages` já guardam a imagem | Para achados de texto, mostrar o trecho |
| 7 | Miniatura do slide inteiro | G | não existe renderizador de PPTX no navegador | Alternativas: gerar PNGs no upload com um serviço (LibreOffice em Cloud Run) ou usar só a imagem da evidência (item 6) — recomendo começar pelo 6 |
| 8 | Triagem por teclado como padrão | P | modo “Triar” já existe | Só mudar a tela padrão |
| 9 | Reavaliar achados antigos ao abrir o estudo | M | `reconcile.ts` já faz isso para alguns tipos | Estender para as regras DET (ex.: Z.I.) rodando a regra de novo sobre o texto, que é barato |
| 10 | Tirar o painel GeoBrain da barra lateral do Corretor | P | layout da aplicação | Mover para as páginas que usam GeoBrain |
| 11 | Relatório de entrega com o mesmo visual | M | `CorretorReportPage` | Depois do 1–5 |

**Ordem sugerida:** 1, 2, 3, 4, 8, 10 num primeiro ciclo (baixo risco, muda a percepção), depois 5 e 6
juntos (a mudança estrutural), depois 9 e 11. O item 7 só se o 6 não bastar.

## 5. O que já mudou hoje (fluxo)

- Estado “análise pendente” persistido; contadores e entrega bloqueados até a análise completa (v0.62).
- Pré-análise antes de gastar: cidade sugerida, outras cidades citadas para confirmar, decisão
  obrigatória sobre planilhas, perfil de imagens com aviso sobre tabelas coladas como imagem (v0.64).
- Um único upload: PPTX guardado no navegador; retomar e vincular planilhas depois não exigem subir de
  novo; planilhas depois da análise cruzam sobre o cache, sem custo (v0.64).
- Análise resiliente a limite de requisições; pausa não marca o estudo como analisado (v0.63).
