# Evidência G0 — baseline da homologação final FIERGS

**Plano:** `PLAN_HOMOLOGACAO_FINAL_EDITORIAL_METODOLOGIA_FIERGS_2T2026_2026-10-02.md`
**Data da inspeção:** 02/10/2026
**Entrada revisada:** `assets/panorama-fiergs-rs-2T2026 (5).pdf`
**Escopo:** inventário editorial e política inicial de publicação; nenhuma mudança no modelo/runtime neste portão.

## Estado do repositório

- Branch `main`; remote configurado: `origin` (`GabeBrain/relatorios-api`). Fetch concluído antes de começar. `origin/main...main` = `0 1`: somente o plano desta rodada estava local à abertura.
- Alterações preexistentes preservadas: `assets/panorama-fiergs-rs-2T2026 (1).pptx`, `assets/panorama-fiergs-rs-2T2026 (5).pdf` e `src/features/corretor/referencia_ajustes/`. Nenhum deles entrou neste trabalho.
- Arte institucional disponível na pasta de referência segue com “22 anos”; dependência do arquivo aprovado pelo Diego/marketing permanece aberta.

## Inventário do entregável

| Item | Fato confirmado |
|---|---|
| PDF enviado para revisão | 74 páginas; proporção 16:9, 960 × 540 pt; páginas rasterizadas, sem texto extraível. Inspeção visual em escala integral é necessária para o PDF final. |
| Regressões locais anteriores | 2T2026 e 4T2025 possuem PDF e PPT espelho de 74 páginas e auditoria CSV com 819 registros; artefatos estão em `.tmp/fiergs-final-adjustments-regression-20261002/`. São baselines locais, não conteúdo deste commit. |
| Pares pixel a pixel idênticos no PDF novo | 13/18, 25/30, 36/55 e 37/54. Hash de pixels foi comparado após rasterização das 74 páginas. |
| Pares que o roteador envia deliberadamente ao mesmo componente | IDs oficiais 13/18 (lançamentos verticais por padrão) e 25/30 (vendas verticais por padrão), ambos em `components/ReportPaginator.tsx`. |
| Repetições de oferta | IDs oficiais 36/55 (oferta final por tipologia) e 37/54 (oferta final por padrão) aparecem em capítulos diferentes e geram imagens idênticas; revisar se a dupla função editorial justifica conservar ambas. |
| Arte institucional | Página física 4 contém “22 anos de empresa”. A apresentação encontrada no Drive também mostra a mesma informação; não há arte nova aprovada nesta sessão. |

## Política de dados observada na base

1. `domain/cube.ts` define `null` como ausência/não cobertura; zero é medição observada. Agregações de `report/model.ts` respeitam essa diferença.
2. O relatório preserva o sinal das vendas líquidas. Na página física 29 de 2T2026, 4+ dormitórios mostra −1 e o total tipológico fecha em 1.091. A reconciliação já registrada atribui o fechamento vertical à última fotografia granular; não foi inferida a causa transacional do valor negativo.
3. Oferta lançada da janela e oferta final no fechamento são universos diferentes. A disponibilidade por linha usa lançamento histórico da mesma tipologia/padrão. No FIERGS 2T2026, existe residual histórico sem dimensão e estoque atribuível; por isso o total de disponibilidade fica suprimido.
4. Maturidade está disponível em faixas Planta (até 6 meses), Construção (7–36 meses) e Pronto (37+ meses); o dado não sustenta média aritmética contínua em meses.
5. A tabela de VGV deriva lançamentos, finais e vendas do cubo; campos monetários ausentes não devem ser imputados. A nota atual da lâmina descreve a cobertura incompleta e será migrada para aviso dinâmico.

## Mapa inicial das estruturas a tratar

| Área/renderizador | Situação constatada no código | Destino desta execução |
|---|---|---|
| `ReportPaginator.tsx` | `CoveragePage` deixa uma página explicativa quando a fonte/indicador não está disponível; há notas textuais em vendas, comparativos e fallback editorial. | Remover estrutura vazia do PDF via manifesto; gerar aviso com motivo e página afetada no app/auditoria. |
| `MarketSlides.tsx` | Rodapés explicam universos, fórmula de disponibilidade, faixas de maturidade, VGV e política horizontal; alguns renderizadores representam `null` como traço. | Manter rótulos/unidades necessários; mover explicações de cobertura para aviso. Redesenhar colunas/linhas sem dado sem esconder zero observado nem subtotal negativo. |
| Modelo de aviso atual | `launches.warnings`, `provenance.failedCities`, `cityComparisons.suppressionReason`, `horizontalSeries.reason` e `reconciliation` existem separadamente. | Unificar diagnósticos no registro do relatório, mantendo origem, período, impacto, código do motivo e gravidade. |
| Auditoria | CSV FIERGS já contém por empreendimento: cidade, dimensão, cobertura, fonte e campos de reconciliação crítica. | Acrescentar linhas estruturadas para avisos/omissões ou campos equivalentes, com os mesmos códigos usados no painel. |
| Abas do app | Página apresenta “Relatório V4” e uma aba “Metodologia” com um alerta genérico. | Renomear para “Relatório”; criar Metodologia, Glossário e Fórmulas. Somente avisos e resumo do recorte serão dinâmicos. |

## Matriz inicial de publicação

| Estado do dado | Material PDF/PPT | App e auditoria | Exportação |
|---|---|---|---|
| Número observado, inclusive zero | Mostrar valor e unidade | Sem aviso, salvo outra ressalva de cobertura | Liberada se as guardas fecharem |
| Venda líquida negativa confirmada | Preservar sinal e valor | Aviso contextual quando ocorrer, sem atribuir causa não comprovada; registrar linha/fonte | Liberada se reconciliada |
| Campo nulo em dimensão com outras células válidas | Omitir a coluna/linha somente se comparabilidade e totais não forem distorcidos; sem traço isolado | Informar estrutura e indicador afetados, fonte e alcance | Liberada com aviso se parcial comparável; bloquear se quebrar total crítico |
| Indicador inteiro não disponível | Não criar página vazia/placeholder | Avisar métrica, período, fonte consultada e posição omitida | Prosseguir sem a posição, salvo indicador crítico ao escopo |
| Delta crítico diferente | Não mascarar pelo layout | Exibir motivo e deltas na auditoria | Bloqueada até reconciliar |
| Ausência de material institucional aprovado | Manter pendência fora do escopo de dados | Registrar dependência com marketing | Não declarar o estudo completo institucionalmente final |

## Decisões metodológicas por fechar

- Para cada par duplicado, decidir remoção ou substituição por conteúdo distinto já suportado e reconciliado; a contagem final deve resultar do manifesto e não ficar presa a 74.
- Manter disponibilidade da oferta lançada histórica explicitada no título/coluna; remover apenas as frases longas do rodapé.
- Para valores monetários parciais, a coluna pode permanecer quando houver valores observados, mas totais devem identificar cobertura parcial pelo painel. Remover a coluna inteira apenas se não tiver valor publicável em todo o recorte.
- Avisos informam que um campo foi omitido e onde; não expõem inventário excessivo nem inventam motivo causal. Zero, `null`, negativa e delta crítico têm estados e tratamentos distintos.
- A ausência do slide atualizado do marketing não impede os portões analíticos, mas impede declarar o pacote institucional completo como final.

**Portão G0:** aprovado para iniciar G1–G2. Não foi alterado código de cálculo nem apagada informação. Próximo portão: resolver a sequência editorial e implementar a origem única de avisos antes dos ajustes visuais.
