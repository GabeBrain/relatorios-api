# Fase A — Achados determinísticos nos estudos reais (custo zero)

Gerado por [`rules_ir.py`](./rules_ir.py) sobre o IR dos 2 estudos reais (08/jul/2026).
Regras 100% determinísticas sobre o IR JSON — **nenhuma chamada de IA**.
Reproduzir: `python rules_ir.py`.

## Cobertura (o que dá para auditar deterministicamente)

| Estudo | Slides | Tabelas | Tabelas c/ número parseado | Gráficos | Imagens |
|---|---|---|---|---|---|
| Itajaí/SC (Élio Winter) | 143 | 47 | **0** | 0 | 264 |
| Marka Prime (Guarulhos) | 165 | 36 | **0** | 1 | 225 |

> ⚠ **Achado estrutural decisivo:** nos dois estudos os números reais (renda, absorção,
> mercado) estão **presos em imagem** — as tabelas nativas do PPTX são majoritariamente
> **legendas de mapa** ("LEGENDA", "Faixas de Renda", raios). Logo, as regras de
> soma/consistência (`PERCENTAGE_SUM`, `ABSOLUTE_SUM`, `TOTALS_EQUALITY`) ficam **sem
> material** aqui. Elas rodaram (ver GO, onde os gráficos eram dados) mas não têm o que
> auditar nesses dois. Isso reforça a **Fase C/D** (visão pontual) e o alinhamento de formato
> com o time.

## Resumo dos achados

| Regra | Itajaí | Marka | Motor | Observação |
|---|---|---|---|---|
| `LEFTOVER_NOTE` | 22 | 14 | DET | Notas internas de edição vazadas no deck — alto valor, baixo falso positivo |
| `SOURCE_MISSING` | 23 | 19 | DET | Fonte pode estar em imagem → esperar **falsos positivos**; calibrar |
| `PERCENTAGE_SUM` | 0 | 0 | DET | Sem material (números em imagem) |
| `TEMPORAL_WINDOW` | 3 | 0 | DET | Janela de projeção fora de 2027–2032 — **confirmar esperado com a analista** |
| **Total** | **48** | **33** | | |

## `LEFTOVER_NOTE` — exemplos reais (os mais valiosos)

Notas que a analista deixou no deck e escaparam para a versão final. Exatamente o tipo de
"bug embaraçoso" que o corretor deve pegar:

**Itajaí:**
- slide 27: "Beatriz por favor, verificar essas informações de População e Domicílios"
- slide 41: "Ajustar o erro da fórmula" / "Refazer a análise após os ajustes"
- slide 60: "Por favor, verificar essa taxa, me parece que está errada, bom confirmar"
- slide 74: "Reforço aqui, verificar novamente se não tem mais nada de aberto."

**Marka Prime:**
- slide 27–28: "Essas informações são do estudo do Brooklin, por favor corrigir" *(copy-paste de outro estudo!)*
- slide 76: "Verificar, unidade maior com 2 vagas e valor do m² menor, está estranho"
- slides 121–149: "Ajustar com as lacunas" / "Ajustar com os valores que pedi na tabela de lacunas geral"

## `TEMPORAL_WINDOW` — candidato a bug real

Itajaí, slides 30/33/36: projeção detectada **2026–2031** (esperado **2027–2032**). Precisa a
analista confirmar qual é a janela canônica antes de virar bug firme.

## Limitações conhecidas (entram no loop de calibração)

- `SOURCE_MISSING`: só enxerga fonte **em texto**; se a legenda estiver dentro da imagem, é
  falso positivo. Marcar no loop com a analista.
- Seção canônica v0: muitos slides `(sem seção)` (64/143 e 48/165) → **Fase B** resolve.
- Regras numéricas: bloqueadas pelo dado-em-imagem nestes dois estudos.

## Próximo

- **Fase B**: analista preenche `calibracao/*.secao.csv` (coluna `secao_correta`) → atualizar o
  dicionário `SECOES` do extrator.
- **Fase C**: extrair as tabelas numéricas presas em imagem (visão one-shot, com cache) para
  destravar `PERCENTAGE_SUM`/`ABSOLUTE_SUM` nestes estudos.
