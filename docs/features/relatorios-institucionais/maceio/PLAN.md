# Plano — Panorama Maceió / SINDUSCON-AL

16/11/2026 · implantação conduzida por Lucas (Inovação) com Claude · homologação metodológica com o analista.
Plano de implantação original: [IMPLANTACAO_CLAUDE.md](IMPLANTACAO_CLAUDE.md).

## Etapa atual

**16/11 — continuação21–40 com Codex:** [entrega/contratos/limites](SLIDES_21_40_2026-11-16.md). Prévia1–40mensal/trimestral com arte original, fontes independentes por padrão/tipologia/histórico, recorte MCMV22/33, rankings reconciliados e oferta no fechamento.58testes e320casos visuais+8cenários de página com API interceptada; tipos/lint/build aprovados. **CAGED adiado por Lucas**, que informou BigQuery do setor já conectado ao Rebrain. VGL/VGVaguardam escolha do índice do analista por padrão, com INCC-DI disponível explicitamente para conferência. Próximo:41–60, sem reabrir CAGED nesta etapa. Geração autenticada, métodos e exportação pendentes. Estados anteriores abaixo são históricos.

**16/11 — lote visual1–20 com Codex:** [entrega e limites](SLIDES_01_20_2026-11-16.md). Prévia navegável mensal/trimestral na arte original, fontes independentes de cadastro/histórico e gráficos de lançamentos; grade recolhida para inventário. CAGED9–14segue pendente de fonte, sem números antigos.51testes,160verificações de slides e8cenários de página com API interceptada; tipos/lint/build aprovados. Próximo: integrar CAGED e conciliar metodologia/fontes, depois21–40. Exportação e geração autenticada real pendentes. Registros abaixo preservam as etapas anteriores.

**Etapa 1 concluída (inventário e contrato inicial)** — periodicidade, recorte e composição comprovados nos
originais ([MAPA_SLIDES.md](MAPA_SLIDES.md), [EVIDENCIAS.md](EVIDENCIAS.md)).
**Etapa 2 (estrutura e rota) concluída em 16/11** — domínio `src/features/relatorios-institucionais/maceio/`
com manifesto nas posições originais (82/87), rota oculta `/rebrain/relatorios-institucionais/maceio`
(somente rota, sem menu) e escopo validado integralmente pelo GeoApiScopeEngine.
**Bloco 3 (núcleo municipal vertical) concluído em 16/11** — coleta por município de lançamentos/vendas/oferta
com reconciliação de balanço, retry por cidade, painéis e prévia estrutural ligada à consulta. Falta geração
autenticada real. Próximo: fontes complementares (CAGED, VGL/VGV + INCC, preços, IVV) e composições por bloco.

## Decisões vigentes

Ver [DECISOES.md](DECISOES.md). Destaques: posições originais preservadas (82 mensal / 87 trimestral);
recorte por edição (mensal 7 municípios com Coqueiro Seco, trimestral 6); acesso **somente por rota**,
sem menu/busca/início; ordem e padrão visual idênticos ao original.

## Próximos blocos (em ordem)

1. ~~Inventário OOXML e documentos de contrato~~ — feito 16/11.
2. ~~Estrutura e rota~~ (`model.ts`, `references.json`, página com GeoApiScopeEngine, blueprint local,
   abas de estrutura/referências/metodologia; sem coleta de dados) — feito 16/11.
3. ~~Núcleo municipal vertical~~ (coleta releases/sales/stock por município, balanço, retry, painéis) —
   feito 16/11; geração autenticada real pendente. As demais fontes (CAGED, INCC, preços, IVV, cadastro,
   históricos longos) entram como consultas independentes: núcleo reprovado não bloqueia as demais —
   lição das 64 pendências de Fortaleza.
4. **Blocos de composição mensal**, na ordem original: capa/sumário/cidades (1–7) → emprego (8–14, fonte
   CAGED externa, com pendência clara quando ausente) → lançamentos (15–28) → vendas (29–38) → oferta (39–43)
   → IVV (44–48) → preços (49–60) → estado atual (61–69) → horizontal (70–77) → consultores/fechamento (78–82).
5. **Blocos trimestrais** reutilizando o que tiver contrato comum, mais os exclusivos (acumulados semestrais,
   participações 2T, tabelas Maceió/RM separadas, comercial 79–82).
6. **Exportação** PPTX/PDF pelo exportador nativo compartilhado, com auditoria e conferência visual.
7. **Validação**: testes de adaptadores/cálculos, varredura visual das páginas, regressões Fortaleza/SP
   quando compartilhados forem tocados, tipos/lint/build.

## Limites atuais

- Nenhuma fonte consultada; nenhum endpoint confirmado; matriz com todas as linhas "Não executado".
- Slides achatados como imagem no original exigem render para mapear composição (ver EVIDENCIAS.md).
- Geração autenticada, revisão do analista e homologação permanecem pendentes em todas as etapas.
- Push/publicação seguem o protocolo do repositório; nada é enviado sem autorização na sessão.
