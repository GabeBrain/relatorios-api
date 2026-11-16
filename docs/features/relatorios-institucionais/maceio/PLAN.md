# Plano — Panorama Maceió / SINDUSCON-AL

16/11/2026 · implantação conduzida por Lucas (Inovação) com Claude · homologação metodológica com o analista.
Plano de implantação original: [IMPLANTACAO_CLAUDE.md](IMPLANTACAO_CLAUDE.md).

## Etapa atual

**Etapa 1 concluída (inventário e contrato inicial)** — periodicidade, recorte e composição comprovados nos
originais ([MAPA_SLIDES.md](MAPA_SLIDES.md), [EVIDENCIAS.md](EVIDENCIAS.md)).
**Etapa 2 (estrutura e rota) concluída em 16/11** — domínio `src/features/relatorios-institucionais/maceio/`
com manifesto nas posições originais (82/87), rota oculta `/rebrain/relatorios-institucionais/maceio`
(somente rota, sem menu) e escopo validado integralmente pelo GeoApiScopeEngine. Próximo: contrato de
fontes (bloco 3).

## Decisões vigentes

Ver [DECISOES.md](DECISOES.md). Destaques: posições originais preservadas (82 mensal / 87 trimestral);
recorte por edição (mensal 7 municípios com Coqueiro Seco, trimestral 6); acesso **somente por rota**,
sem menu/busca/início; ordem e padrão visual idênticos ao original.

## Próximos blocos (em ordem)

1. ~~Inventário OOXML e documentos de contrato~~ — feito 16/11.
2. ~~Estrutura e rota~~ (`model.ts`, `references.json`, página com GeoApiScopeEngine, blueprint local,
   abas de estrutura/referências/metodologia; sem coleta de dados) — feito 16/11.
3. **Contrato de fontes**: mapear endpoints reais por indicador na MATRIZ_INDICADORES (consultando
   adaptadores de Fortaleza como referência de paginação/guardas, sem copiar regras locais), com coleta
   independente por fonte (núcleo reprovado não bloqueia as demais — lição das 64 pendências de Fortaleza).
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
