# 04 — Briefing único (`briefing.yaml`) e perguntas iniciais

Preencher **uma vez** por trabalho. Campos com `*` são críticos. Se o briefing não existir ou vier incompleto, o Claude faz **uma única rodada** de perguntas (seção 2), com defaults sugeridos.

---

## 1. Template

```yaml
# ===== Evento =====
nome: "ADIT Cidades 2026 — Retrofit"
modo: evento-de-estudo   # * evento | evento-de-estudo | abertura | moderacao | resumo-brain
                         #   cliente-preservado | reaproveitamento | consolidacao | proposta | externo
evento_nome_oficial: "ADIT Cidades 2026"   # * como aparece na capa (não confundir com o local)
cidade: "Florianópolis"                     # *
local: "ACATE"                              # sala/espaço, se relevante
data: 2026-11-XX                            # *
horario: "10:50"
sessao_anterior: ""                         # o que o público acabou de ver
sessao_seguinte: "CASE Porto Alegre | Cidades resilientes"  # para a ponte no fechamento

# ===== Palestrante / responsável =====
responsavel: fabio                          # * fabio | guilherme | finoti | outro → define o slide final (doc 02 §10)
palestrante: "Fábio Tadeu Araújo"           # * nome como usa em palco
cargo: "CEO · BRAIN Inteligência Estratégica"
coapresentadores: []                        # outros que falam (um slide final cada, na ordem de fala)
estilo_fala: "conversado, com histórias"    # conversado | expositivo | provocativo

# ===== Público e objetivo =====
publico: "Misto: incorporadores, investidores, poder público e ecossistema de inovação"  # *
tamanho_publico: null
nivel_conhecimento: "intermediario"          # iniciante | intermediario | especialista
objetivo: "Mostrar o estado do retrofit no Brasil e o que destrava a escala"  # *
acao_desejada: "Baixar o e-book e procurar a Brain para estudos de viabilidade de retrofit"
tese_sugerida: ""        # se vazio, o Claude propõe
mensagens_obrigatorias:
  - "Crédito à parceria Brain × Santander × SHI"
evitar:
  - "Falar de valores comerciais"

# ===== Formato =====
tempo_slot_min: 60       # duração da sessão na agenda
tempo_fala_min: 40       # * tempo efetivo de fala (sem perguntas)
tem_perguntas: true
meta_slides: null        # null = heurística (doc 03)
n_blocos: null
uso_do_deck: palco       # palco | palco-e-circular (será enviado depois → mais texto autoexplicativo)

# ===== Identidade =====
identidade: material-fonte   # * brain | material-fonte | cliente | externo
co_branding: ["Santander", "SHI"]
logos_parceiros: ["marca/logos/parceiros/santander.png", "marca/logos/parceiros/shi.png"]
cores_extra_aprovadas: []   # cores fora da paleta Brain liberadas para este job (ex.: cor de parceiro)
imagens_permitidas: true     # usar fotos/ilustrações do material-fonte (com crédito)

# ===== Conteúdo e dados =====
material_fonte: "entrada/BRAIN_SANTANDER_RETROFIT.pdf"
data_publicacao_fonte: 2025-11
fontes_adicionais:
  - "entrada/domicilios_vagos_2010_2022.xlsx"
pode_pesquisar: true          # * atualizar dados públicos (cita fonte e data)
escopo_pesquisa:
  atualizar_dados_fonte: true      # o que mudou desde a publicação
  dados_locais: true               # cidade/estado do evento
  benchmarks_internacionais: true
  contexto_sustentabilidade: true
data_corte_dados: null
recorte_local: "Florianópolis e SC"
cases_prioritarios: []       # cases que o palestrante quer contar
cases_evitar: []

# ===== Entregáveis =====
entregaveis:
  deck: true
  roteiro_fala: true
  notas_orador: true
  slide_metodologia_estudo: true
  qr_code_url: "https://..."      # link do material para download
  moderacao: false
  slides_avulsos: []
  versao_sem_valores: false
  versao_resumo_brain: false

# ===== Controle =====
auto_aprovar: false
observacoes: ""
```

## 2. Perguntas iniciais (uma única rodada)

O Claude pergunta **só o que não está no briefing nem dá para inferir dos anexos**, agrupado em no máximo 4 blocos, sempre com uma opção recomendada. Ordem de prioridade:

**Bloco A — Evento e responsável** (sempre confirmar; erro aqui é visível na capa e no slide final)
1. **Quem será o responsável pela apresentação?** Opções: Fábio Tadeu Araújo · Guilherme Werner · Lucas Finoti · outro. Define o slide final de contato. Se houver mais de um apresentador, quem e em que ordem?
2. Nome oficial do evento, cidade e data? *(o print da agenda costuma mostrar o local, não o evento)*
3. Quanto tempo de **fala** (sem perguntas) e qual a sessão seguinte?

**Bloco B — Público e objetivo**
4. Perfil predominante da plateia e nível de conhecimento do tema?
5. O que a plateia deve **fazer** depois (baixar o estudo, contratar, apoiar uma política)?
6. O deck será **só projetado** ou também **enviado** depois?

**Bloco C — Conteúdo e atualização**
7. Posso **pesquisar dados novos** desde a publicação (programas, leis, resultados, mercado)? Até que data?
8. Há **recorte local** a destacar (cidade/estado do evento)?
9. Incluir **contexto internacional e de sustentabilidade**?
10. Há **cases, números ou mensagens** que não podem faltar — ou que devem ser evitados?
11. Usar outros arquivos da pasta como apoio (ex.: Censo)?

**Bloco D — Forma**
12. Identidade: **Brain** ou **linguagem visual da publicação** (com parceiros)?
13. Posso usar **fotos/ilustrações** do material-fonte?
14. Haverá **QR code/link** para o material? Qual URL?

> A pergunta 1 é sempre feita, mesmo com briefing completo, se `responsavel` estiver vazio. Sem resposta, use o palestrante citado no print/agenda e registre no relatório.

Defaults quando não houver resposta (ou `auto_aprovar: true`): ver doc 03, etapa 0.

## 3. Exemplos mínimos

**Evento de estudo (caso ADIT Cidades — retrofit):**
```yaml
modo: evento-de-estudo
evento_nome_oficial: "ADIT Cidades 2026"
cidade: "Florianópolis"
responsavel: fabio
palestrante: "Fábio Tadeu Araújo"
publico: "Misto: mercado + poder público"
tempo_fala_min: 40
identidade: material-fonte
pode_pesquisar: true
recorte_local: "Florianópolis e SC"
entregaveis: { deck: true, roteiro_fala: true, slide_metodologia_estudo: true }
```

**Reaproveitamento (caso IBRADIM):**
```yaml
modo: reaproveitamento
publico: "Advogados e empreendedores; visão de mercado"
objetivo: "Caminhos de financiamento para empreendedores"
tempo_fala_min: 15
identidade: brain
pode_pesquisar: true
entregaveis: { deck: true, roteiro_fala: true }
```

**Resumo para circular (caso Santander):**
```yaml
modo: resumo-brain
publico: "Diretoria do banco"
objetivo: "Apresentar as 7 frentes de atuação conjunta"
meta_slides: 10
identidade: brain
uso_do_deck: palco-e-circular
entregaveis: { deck: true, versao_sem_valores: true }
auto_aprovar: true
```
