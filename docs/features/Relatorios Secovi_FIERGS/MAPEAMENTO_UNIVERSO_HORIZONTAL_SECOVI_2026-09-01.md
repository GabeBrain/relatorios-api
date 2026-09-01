# Mapeamento — universo horizontal do Panorama Secovi (condomínio de casas)

**Data:** 01/set/2026
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Origem:** retorno de Juliana Guimarães sobre `panorama-jundiai-2T2026 - corrigido.pdf` (31/ago),
orientação técnica de Edgar sobre `typologies_history[].pattern` (01/set, 10:15) e evidência
autenticada colhida com token de sessão em 01/set.
**Estado:** diagnóstico e decisões fechados; plano terminal da V3 pronto; implementação **não** iniciada.
**Monday:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`

Este documento existe porque o universo horizontal é, simultaneamente, o comentário mais repetido
da analista e o ponto onde o código classifica por heurística de nome comercial. As duas coisas se
resolvem com o mesmo campo, e a evidência abaixo mostra que ele só existe em um dos contratos.

---

## 1. Retorno da analista — 40 anotações em 57 páginas

Extração das anotações do PDF: `scripts/`-independente, via PyMuPDF; cópia legível em
`.tmp/comentarios-juliana-jundiai-2T2026.md` (não versionada).

### 1.1 Universo horizontal — 10 das 40 anotações

O tema domina o retorno. Nas páginas **10, 11, 12, 19, 20, 27, 45, 49, 51 e 52**:

- horizontal no Panorama Secovi é **apenas condomínio de casas**, sem exceção
  (“não pode entrar nada que não seja dado dos condomínios de casas”, p10; “APENAS CONDOMÍNIOS DE
  CASAS”, p45; “não podem entrar nenhum outro tipo nessas análises do Secovi”, p27);
- o texto narrativo também precisa perder toda menção a **loteamentos** (p51, p52);
- condomínio de casas, quando houver, entra **após o subtotal Vertical** (p49);
- a analista pergunta explicitamente se os horizontais dos gráficos já são só condomínios de
  casas (p12) — sinal de que o dado exibido não permitia afirmar isso.

### 1.2 Demais correções

| Tema | Páginas | O que foi pedido |
|---|---|---|
| Formatação condicional ausente | 27, 29, 34, 36, 40, 42, 44 | incluir, com destaque para o R$/m² (34, 36) |
| Linha de subtotal errada | 31, 39, 40 | a soma é dos lançados **após 2024**, e a linha deve vir **depois** da linha de 2026 |
| Percentuais errados | 42, 44 | “estão bem errados” |
| Preços | 52 | não batem com os dados; **proibido** média de horizontal + vertical (análises separadas) |
| Rótulo e período | 12 e os oito “idem” (13–17, 21–24) | rótulo `0` precisa aparecer; dado do 2T26 não aparece; fundo branco só nos 2ºs trimestres |
| IVV e metragens | 25 | IVV todo zerado; metragens devem seguir o 1T/26 |
| Fonte pequena | 4, 5, 6, 8 | aumentar nas institucionais |
| Gráfico | 38 | trocar para barra e mostrar a variação entre períodos |
| Tabela anual do horizontal | 46 | seguir o formato da vertical |
| Página vazia | 47 | **sem empreendimentos ativos, a página deve ser excluída** — não enviada zerada |
| Mapa | 53 | não carregou (é o `VITE_MAPBOX_ACCESS_TOKEN` ausente) |
| Consultor | 56 | “Foto do Consultor” sem foto |
| Texto | 51 | remover a menção a “API Geobrain” |

O p47 e o p12 se conectam ao universo: se o horizontal aceito for vazio, a lâmina não deve
existir. Ver §4.4.

---

## 2. Orientação do Edgar e o que a evidência confirma

> “pode utilizar o campo `data[].typologies_history[].pattern`, esse é o padrão histórico que se
> aplica no período, já o `data[].standard` é o padrão atual — a descrição vem como
> ‘Condomínio de Casas/Sobrados’. Desse jeito o agrupamento histórico deve ficar correto.”

Confirmado, com duas ressalvas que mudam a implementação.

### 2.1 `pattern` existe apenas no contrato v2

| Contrato | `typologies_history[]` traz `pattern`? | Evidência |
|---|---|---|
| `geobrain.com.br/public-api/building-with-history` (legado, **em produção hoje**) | **não** | 1928 linhas de horizontais + 4910 de verticais em Jundiaí, `pattern` ausente em 100% |
| `api.geobrain.com.br/public-api/v2/building-with-history` | **sim** | mesmo recorte; traz também `estagio_empreendimento`, `taxa_associativa`, `number_suite` |

Consequência direta: **a regra do Edgar exige migrar o universo para o v2.** Não é ajuste de
classificação sobre o payload atual.

### 2.2 O v2 responde 500 de forma intermitente e cura no retry

Primeira medição, matriz de 5 municípios × 2 tipos × 2 status com duas tentativas cada:
`status=Esgotado` deu **500 na primeira tentativa e 200 na segunda, 10 de 10 vezes**, enquanto
`status=Ativo` respondeu 200 nas duas tentativas, 10 de 10.

A varredura maior de §3 (24 municípios, centenas de chamadas) **corrige essa leitura**: houve
**15 retries que converteram 500 em 200 — 8 em `Esgotado` e 7 em `Ativo`**. Portanto o 500 é
**intermitente em ambos os status**, e não uma falha exclusiva da primeira chamada de `Esgotado`.
O que se sustenta é o essencial: é transitório e **um retry resolve** — nenhuma cidade ficou
inacessível no v2 em toda a varredura.

Nova bateria em 01/set, após a decisão de produto: **cinco matrizes completas** das 24 cidades
produziram respectivamente 15, 16, 16, 16 e 16 falhas HTTP 500 no contrato granular — **79 falhas
transitórias**, todas convertidas em 200 na tentativa imediatamente seguinte. Nenhuma chamada
precisou da terceira tentativa. O erro apareceu nos dois status em todas as rodadas.

Isto sustenta uma política limitada: no máximo três tentativas totais, retry apenas para erro de
rede, 429 e 5xx, backoff exponencial com jitter e respeito a cancelamento. Não sustenta retry
ilimitado nem fallback silencioso para o legado, que não contém `pattern`.

Isto também **derruba o diagnóstico de 401** registrado em
[`MAPEAMENTO_V2_MULTICIDADES_2026-08-31.md`](./MAPEAMENTO_V2_MULTICIDADES_2026-08-31.md) §portão 5:
a paridade de autenticação existe com token de sessão. A migração para o v2, porém, **exige
política de retry explícita**, não só troca de URL.

### 2.3 A taxonomia mistura dois eixos num campo só

`standard` e `pattern` compartilham um vocabulário plano que junta **produto horizontal** e
**padrão socioeconômico**:

| Eixo | Rótulos observados |
|---|---|
| Produto horizontal | `Condomínio de Casas/Sobrados`, `Loteamento Fechado`, `Loteamento Aberto`, `Condomínio de Chácaras` |
| Socioeconômico | `Econômico`, `Standard`, `Médio`, `Médio-Alto`, `Alto`, `Luxo` |
| Marcador de período | `Futuro` |

Por isso, para um horizontal cujo `pattern` do período é `Econômico`, **o produto é desconhecido
naquele período** — e vice-versa. Ver a pergunta aberta em §5.

Este vocabulário é o do recorte inicial (5 municípios). A varredura de 24 municípios encontrou
mais dois rótulos de produto — `Terreno` e `Loteamento Comercial` — e a lição associada: a
taxonomia cresce sem aviso. Ver §3.4.

### 2.4 O `pattern` alterna dentro do mesmo empreendimento

Em Praia Grande, os seis condomínios de casas trocam de rótulo entre períodos:

| Empreendimento | `standard` | `pattern` observados |
|---|---|---|
| Residencial Évora | Condomínio de Casas/Sobrados | Econômico, Condomínio de Casas/Sobrados |
| Metrópole | Condomínio de Casas/Sobrados | Condomínio de Casas/Sobrados, Econômico |
| Residencial Prado Padilha | Condomínio de Casas/Sobrados | Futuro, Condomínio de Casas/Sobrados, Econômico |
| Costa Rica | Condomínio de Casas/Sobrados | Condomínio de Casas/Sobrados, Standard |
| Residencial Bali | Condomínio de Casas/Sobrados | Condomínio de Casas/Sobrados, Standard |
| Residencial Millano | Condomínio de Casas/Sobrados | Condomínio de Casas/Sobrados, Econômico |

É o que obriga a separar **pertinência ao universo** de **agrupamento por padrão no período**
(§4.2). Filtrar a pertinência pelo `pattern` do período faria o mesmo empreendimento entrar e sair
ao longo dos 17 trimestres da própria série.

---

## 3. Consistência entre municípios

Evidência gerada por `scripts/panorama-horizontal-taxonomy.mjs`
(saída completa em `.tmp/horizontal-taxonomia.{json,md}`, não versionada).

Recorte: **24 municípios** — 16 praças SP (Secovi) e 8 praças RS (FIERGS) —, **924 horizontais** e
**42.917 linhas** de `typologies_history`.

### 3.1 A regra é consistente, e o universo é muito menor do que o exibido hoje

| | Empreendimentos |
|---|---:|
| Horizontais nos 24 municípios | 924 |
| **Aceitos pela regra de campo** (`Condomínio de Casas/Sobrados`) | **11** |
| Aceitos pela heurística de nome vigente | 47 |
| **Interseção entre as duas regras** | **0** |

As duas regras **discordam em 100% dos casos**: os 11 que o campo aceita são todos recusados pela
heurística de nome, e os 47 que a heurística aceita são todos recusados pelo campo. Não é uma
questão de calibragem — a classificação atual não tem relação com o dado. Isto responde
quantitativamente à pergunta do p12 (“os horizontais são só condomínios de casas, correto?”): não.

Motivos de recusa pela regra de campo: `produto_fora_da_politica` **561**,
`apenas_socioeconomico` **351**, `sem_padrao` **1**.

### 3.2 Onde existe condomínio de casas

| UF | Município | Horizontais | Aceitos | Empreendimentos |
|---|---|---:|---:|---|
| SP | Praia Grande | 65 | 6 | Residencial Évora, Metrópole, Residencial Prado Padilha, Costa Rica, Residencial Bali, Residencial Millano |
| SP | Campinas | 89 | 1 | Club House Taquaral |
| SP | Ribeirão Preto | 83 | 1 | Residencial Formosa |
| SP | Bauru | 25 | 1 | Residencial Cidade Alegre 3 |
| RS | Gravataí | 51 | 1 | Parque Do Mirante - Fase 1 |
| RS | Pelotas | 25 | 1 | Casas Arisa |

**Os outros 18 municípios têm zero:** Jundiaí, Piracicaba, Barretos, Sorocaba, São José dos Campos,
Indaiatuba, Itu, Guarujá, Santos, São Vicente, Bertioga, Caraguatatuba (SP), Porto Alegre, Canoas,
Caxias do Sul, Novo Hamburgo, Tramandaí, Capão da Canoa (RS).

Conclusão operacional: **a supressão condicional das lâminas horizontais (§4.4) não é exceção de
Jundiaí — é o caso majoritário.** Em 18 de 24 praças o bloco horizontal do Panorama Secovi não deve
existir; nas 6 restantes ele existe com 1 a 6 empreendimentos.

### 3.3 A regra de dois níveis é necessária, e o `standard` sozinho não basta

| Situação | Ocorrências |
|---|---:|
| Rótulo de condomínio de casas presente **só no histórico** (`standard` não tem) | **4** |
| Rótulo presente **só no `standard`** (histórico não tem) | 0 |

Em Campinas, Ribeirão Preto, Gravataí e Pelotas o empreendimento **só é identificável pelo
`typologies_history[].pattern`**. Usar apenas `data[].standard` perderia **4 dos 11** aceitos — 36%
do universo. A orientação do Edgar é, portanto, o que torna a regra completa; o inverso nunca
ocorreu, o que faz do histórico a fonte estritamente mais informativa.

### 3.4 Rótulos novos, não previstos pela política

A varredura ampliada revelou três rótulos de `pattern` ausentes do vocabulário levantado em §2.3:

| Rótulo | Linhas | Tratamento proposto |
|---|---:|---|
| `Terreno` | 50 | produto — **excluir** |
| `Loteamento Comercial` | 42 | produto — **excluir** |
| `(ausente)` | 37 | sem padrão — recusar com aviso rastreável |

Inventário completo, com os eixos:

| Rótulo | Eixo | Linhas |
|---|---|---:|
| Loteamento Fechado | produto (excluído) | 16.083 |
| Loteamento Aberto | produto (excluído) | 10.100 |
| Econômico | socioeconômico | 5.237 |
| Standard | socioeconômico | 3.728 |
| Médio | socioeconômico | 3.228 |
| Alto | socioeconômico | 1.352 |
| Médio-Alto | socioeconômico | 1.272 |
| Futuro | marcador de período | 714 |
| Luxo | socioeconômico | 670 |
| **Condomínio de Casas/Sobrados** | **produto (aceito)** | **216** |
| Condomínio de Chácaras | produto (excluído) | 188 |
| Terreno | produto (excluído) | 50 |
| Loteamento Comercial | produto (excluído) | 42 |
| (ausente) | — | 37 |

Como a taxonomia cresce sem aviso, a política precisa **falhar de forma ruidosa** em rótulo novo:
recusar o registro **e** emitir alerta, nunca classificar por semelhança textual.

### 3.5 A massa ambígua

Na primeira medição, **351 dos 924 horizontais (38%)** tinham apenas rótulo socioeconômico — `Econômico`, `Standard`,
`Médio` etc. — e nenhum rótulo de produto em nenhum período. Para esses, **o dado não diz se são
condomínio de casas, loteamento ou outra coisa.** A regra estrita de Juliana os exclui, o que é o
comportamento correto sob incerteza, mas é uma exclusão por ausência de informação, não por
evidência de que não pertencem.

A repetição autenticada encontrou **349** ambíguos e 563 produtos explicitamente fora da política,
mantendo o total de 924 e os mesmos 11 aceitos — dois registros mudaram de classificação na fonte
entre as medições. Nos 349 atuais:

- `building_type` está preenchido como `Horizontal` em 349/349, mas esse é apenas o segmento geral;
- `standard` está preenchido em 349/349 com rótulo socioeconômico;
- `building_subtype`, `subtype`, `sub_type`, `horizontal_type` e `product_type` estão ausentes em
  **349/349**;
- o histórico traz `type_of_typology=Padrão`, portanto não contém um segundo campo de produto;
- filtros experimentais `standard`, `pattern` e `product_type` no endpoint v2 devolveram exatamente
  os mesmos 11 IDs e o mesmo total da consulta-base em Praia Grande: são parâmetros ignorados. O
  contrato documentado aceita apenas cidade, UF, tipo, status, paginação e datas de atualização.

Conclusão: não há filtro de busca nem campo irmão capaz de inferir o produto. Como Juliana aprovou
reiteradamente o universo estrito, produto não informado fica fora, com motivo e contagem explícitos.

---

## 4. O bug atual e a solução

### 4.1 Onde está o defeito

[`domain/entity-policy.ts`](../../../src/features/panorama-secovi-fiergs/domain/entity-policy.ts)
`classifyHorizontalSubtype` **nunca lê `standard` nem `pattern`**. Procura `building_subtype`,
`subtype`, `sub_type`, `horizontal_type` e `product_type` — **ausentes em 0 de 56** horizontais de
Jundiaí — e cai no **nome comercial** do empreendimento, via
[`domain/cube.ts:158-160`](../../../src/features/panorama-secovi-fiergs/domain/cube.ts).

A classificação do universo Secovi é, hoje, casamento de palavra-chave em nome de produto:

- `Bosque Do Horto` e `Terras Da Alvorada` são `Loteamento Fechado` no dado; o nome não tem
  palavra-chave, então caem em `outro` e são recusados — **acerto por acidente**;
- um condomínio de casas com nome neutro seria recusado do mesmo jeito;
- um loteamento chamado “Condomínio …” seria **aceito** como casa.

A rejeição da **PRE-002** (“Horizontal da API representa Condomínio de Casas”) foi correta. A
substituta é que ficou frágil, por falta do campo que agora se sabe existir no v2.

### 4.2 Regra proposta — dois níveis

**Pertinência ao universo** (entra ou não no Panorama Secovi) — decidida **uma vez por
empreendimento**, estável ao longo da série:

> aceita se `standard` **ou qualquer** `pattern` do histórico for `Condomínio de Casas/Sobrados`.

**Agrupamento por padrão dentro do período** — é aqui, e só aqui, que a orientação do Edgar se
aplica: usar `typologies_history[].pattern` **daquele período**. Quando o `pattern` do período for
rótulo de produto (e não socioeconômico), herdar o último rótulo socioeconômico conhecido em período
anterior. Antes do primeiro padrão conhecido, usar `Não classificado`; nunca olhar para o futuro.
O dossiê registra se o valor foi observado, herdado ou permaneceu não classificado.

### 4.3 Exclusões explícitas e contadas

`Loteamento Fechado`, `Loteamento Aberto`, `Loteamento Comercial`, `Condomínio de Chácaras` e
`Terreno` saem do universo, **com a contagem registrada no dossiê** — atende p51/p52 e mantém
auditável o que foi retirado.

Rótulo `pattern` novo ou não mapeado **recusa o registro e emite alerta**. Nunca classificar por
semelhança textual: foi exatamente a heurística de nome que produziu o erro de 100% medido em §3.1.

### 4.4 Universo horizontal vazio suprime as lâminas

Quando nenhum empreendimento é aceito, as lâminas horizontais **deixam de existir** no manifesto,
em vez de imprimir zero. É literalmente o pedido do p47 e responde a dúvida do p12.

**Em Jundiaí o universo aceito é vazio:** zero condomínios de casas em 56 horizontais — os números
do horizontal vinham de 43 loteamentos e 1 condomínio de chácaras. E isto **não é uma exceção de
Jundiaí:** em **18 dos 24 municípios** varridos o universo é vazio (§3.2). A supressão condicional
é o caminho principal do código, não um caso de borda.

### 4.5 Ordem de implementação

1. migrar a coleta de empreendimentos para o v2 com retry (sem v2 não há `pattern`);
2. substituir `classifyHorizontalSubtype` pela leitura de campo em dois níveis (§4.2);
3. exclusões contadas no dossiê (§4.3);
4. supressão condicional das lâminas horizontais (§4.4);
5. só então as correções de layout/formatação da §1.2, que são independentes.

---

## 5. Decisões fechadas e falha externa restante

- **Fechado — universo:** Gabriel assume como suficiente o retorno reiterado de Juliana: entra apenas
  `Condomínio de Casas/Sobrados`, mesmo que 18 das 24 praças percam o bloco horizontal (PRE-026).
- **Fechado — padrão:** quando o período trouxer produto no `pattern`, herdar o último padrão
  socioeconômico anterior; sem anterior, `Não classificado` (PRE-027).
- **Fechado — ambíguos:** produto não informado não pode ser inferido por campos ou filtros e fica
  fora do universo, com contagem e motivo rastreáveis.
- **Falha externa restante:** `ivv` + `group_by=Tipologia` voltou a responder HTTP 500 em **4/4**
  cidades da Baixada numa nova execução; cada cidade terminou com 9/10 séries utilizáveis. É falha
  sistemática do endpoint, não zero. Aplicar circuit breaker/indisponibilidade explícita e reportar
  à manutenção da API; retry longo não resolve esse contrato.

---

## 6. Como reproduzir

```powershell
Copy-Item .secrets\geobrain.env.example .secrets\geobrain.env   # preencher GEOBRAIN_EMAIL/PASSWORD
node scripts/panorama-horizontal-taxonomy.mjs --preset secovi-fiergs
node scripts/panorama-evidence.mjs --uf SP --cities "Guarujá,Praia Grande,Santos,São Vicente" --quarter 2T2026
```

`.secrets/` é ignorado pelo Git (só o `README.md` e o `.example` sobem). As saídas ficam em
`.tmp/`, também ignorada.
