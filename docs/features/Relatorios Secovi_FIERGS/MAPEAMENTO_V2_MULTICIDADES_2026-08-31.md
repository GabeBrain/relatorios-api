# Panorama V2 — portão de consistência temporal multicidades

**Data:** 31/ago/2026
**Escopo:** cidades selecionadas no mesmo relatório, com atualizações mensais e trimestrais misturadas.
**Estado:** motor implementado e coberto por testes; evidência autenticada confirma frequência mista em Guarujá. Falta a homologação visual autenticada de preview/PDF e a paridade de autenticação no endpoint v2.

## Evidência no fluxo atual

O comportamento anterior concatenava as linhas de `temporal-analysis-city/*` antes de agregá-las por
trimestre. A implementação V2 agora normaliza cada cidade em `domain/temporal-normalization.ts` antes
de chegar ao `marketBlock`; a origem, o período observado e o tipo de período continuam rastreáveis na
linha normalizada.

Há dois riscos independentes:

1. `periodToQuarter` agora reconhece ISO, `MM/YYYY` e trimestre explícito como `2T2026` e `2ºT/2026`.
2. Fluxos mensais e trimestrais deixam de receber o mesmo tratamento: total trimestral explícito tem
   precedência; sem ele, os meses são somados. Snapshots/taxas usam a última observação até o fechamento.
3. IVV e preços consolidados usam média ponderada pelo estoque final compatível. Sem estoque, a média
   simples é fallback explícito, registrado como metodologia aberta, nunca peso zero.

O fato de páginas anuais aparecerem enquanto históricos trimestrais zeram não prova uma causa única:
parte das páginas anuais também pode usar `building-with-history`, e não o mesmo endpoint temporal.
Logo, o diagnóstico deve separar a origem de cada página antes de concluir.

## Contrato V2 proposto

Normalizar cada resposta **por cidade, métrica, grupo e segmento** antes do consolidado. A normalização
deve preservar `observedPeriod`, `periodKind` (`month` | `quarter`) e `coverageQuarter`.

| Classe de métrica | Regra por cidade dentro do trimestre | Consolidação entre cidades |
|---|---|---|
| Fluxo: vendas/unidades/VGV | mensal: soma dos meses do trimestre; trimestral: usar a observação trimestral uma única vez | somar cidades depois de normalizar cada uma |
| Snapshot: estoque/VGV de estoque | usar a observação mais recente até o fechamento do trimestre | somar snapshots municipais; expor data/cobertura mais antiga |
| Taxa: IVV | usar observação do fechamento; não somar nem fazer média de meses | média ponderada pelo estoque final da mesma cidade/segmento/recorte; sem peso, fallback simples explícito |
| Preço/ticket/R$/m² | usar observação do fechamento | média ponderada pelo estoque final da mesma cidade/segmento/recorte; sem peso, fallback simples explícito |

Formato de período aceito pelo normalizador: data ISO, `MM/YYYY` e trimestre explícito (`1T2026`,
`1ºT/2026` se a API o emitir). Um período desconhecido deve gerar aviso rastreável, nunca virar zero.

## Portão de aceite antes das páginas comparativas

1. ✅ Evidência autenticada: Guarujá retornou 22 períodos em janela de 17 trimestres, incluindo meses
   intermediários e fechamentos trimestrais.
2. ✅ Fixture controlada cobre mês + trimestre, precedência de fluxo, snapshot e média ponderada.
3. ✅ Para métricas aditivas, o consolidado é formado após normalização municipal.
4. ⏳ Gerar preview/PDF das quatro cidades e inspecionar visualmente cobertura e rodapé.
5. ⏳ Registrar no QA se a coleta usou fallback legado: `v2/building-with-history` respondeu 401 com o
   token autenticado nesta sessão, enquanto o endpoint legado respondeu normalmente.
6. ⏳ Só então inserir as três páginas condicionais de comparação municipal no manifesto V2.

## Impacto no roadmap V2

Este portão antecede o encaixe das três páginas condicionais de multicidades. A implementação visual,
o motor temporal e a política horizontal estão prontos; a homologação de vendas/mercado/disponibilidade
por cidade permanece condicionada ao preview/PDF autenticado e à evidência de qual contrato de prédios
foi usado no recorte.
