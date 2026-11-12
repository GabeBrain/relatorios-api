# Baseline, conhecimento e mapa técnico

## Ordem das fontes de verdade

Código/fixtures da versão checkout + evidência datada da geração + aceite identificado têm precedência sobre hipóteses antigas. Documentos append-only preservam o histórico, inclusive pendências depois resolvidas; não tratar a última frase de um documento antigo como estado atual de todo o produto. Antes de alterar, anotar SHA/versão, janela e fonte.

### Leitura selecionada — relatórios existentes

- [Resumo das correções FIERGS](../../features/Relatorios%20Secovi_FIERGS/RESUMO_AJUSTES_POS_VALIDACAO_JULIANA_FIERGS_2T2026.md): pedidos de Juliana, comportamento esperado e rodadas; várias seções são históricas.
- [Guardas numéricas](../../features/Relatorios%20Secovi_FIERGS/EVIDENCIA_FASE_6_GUARDAS_EXPORTACAO_MULTIPERIODO_FIERGS_2026-10-01.md): bloqueio comum PDF/PPT; número de invariantes nessa data não é constante do sistema.
- [Recuperação multicidades](../../features/Relatorios%20Secovi_FIERGS/PLAN_RECUPERACAO_COLETA_MULTICIDADES_PANORAMA_2026-10-06.md): N cidades, erros, retries e cobertura; plano histórico não implica reexecução.
- [Recortes livres/evidências](../../features/Relatorios%20Secovi_FIERGS/EVIDENCIAS_FIERGS_RECORTES_LIVRES_2026-10-13.md) e [capas/reteste](../../features/Relatorios%20Secovi_FIERGS/PLAN_REFINAMENTO_CAPAS_CUSTOMIZADAS_FIERGS_2026-10-13.md): identidade territorial real e limites de ensaio.
- [Secovi — decisões/premissas](../../features/Relatorios%20Secovi_FIERGS/DECISOES_E_PREMISSAS_PANORAMA.md) e [40 comentários Jundiaí](../../features/Relatorios%20Secovi_FIERGS/MATRIZ_TERMINAL_40_COMENTARIOS_JULIANA_PANORAMA_V3_2026-09-01.md): separar hipótese, reconciliação e aprovação; regras horizontais não iguais ao FIERGS.
- [Análise original/Piracicaba](../../features/Relatorios%20Secovi_FIERGS/ANALISE_automatizacao_panorama.md): tabelas como imagens não são dados canônicos, apesar da aparência pronta.
- [LIVE Rebrain](../../projetos/LIVE_rebrain.md) e [guidelines](../../architecture/FRONTEND_GUIDELINES.md): registrar o novo trabalho no mesmo ambiente.

## Mapa do código — relativo à raiz do repo

- `src/components/layout/AppLayout.tsx`: menu. Hoje “Relatórios Automatizados” contém Excel, Sinduscon Curitiba, AELO e Panorama compartilhado. Novos itens previstos por Gabriel; sem refatorar outras features.
- `src/features/panorama-secovi-fiergs/pages/PanoramaSecoviFiergsPage.tsx`: seleção, geração, recuperação e referências do usuário.
- `src/features/shared/geo-api-scope-engine/`: catálogo autorizado, UF antes de cidade, bloqueio de escopo inválido.
- `src/features/panorama-secovi-fiergs/api.ts`: fontes temporal/cubo e limites de concorrência/retries; não aumentar carga para testar.
- `domain/collection.ts`, `domain/generation-progress.ts`, `lib/request-with-retry.ts`: coleção com estados por cidade, progresso e recuperação. Caminhos relativos neste item são dentro da feature Panorama.
- `domain/entity-policy.ts`, `domain/taxonomy.ts`, `domain/cube.ts`, `domain/temporal-normalization.ts`: universo/classificação, granularidade e fechamento. IDs atuais só `secovi-sp`/`fiergs-rs`; uma nova entidade exige contrato próprio.
- `domain/reconciliation.ts`, `report/model.ts`: canonicalização e deltas. Guardas críticas não podem ser relaxadas para exportar.
- `report/manifest.ts`, `report/fiergs-manifest.ts`, `report/generation-notices.ts`: páginas condicionais, omissões auditáveis e sumário derivado.
- `components/ReportPaginator.tsx`, `components/MarketSlides.tsx`, `components/CustomFiergsCovers.tsx`: apresentação do mesmo modelo, sem números calculados à mão no componente.
- `components/ReportReferencePanels.tsx`: Metodologia/Glossário/Fórmulas. Avisos ficam no app/CSV; não imprimir notas técnicas no PDF/PPT por conveniência.
- `export-store.ts`, `components/PanoramaExportHost.tsx`, `components/PanoramaExportGate.tsx`: job do shell, captura/exportação. PPT é espelho do estudo; não prometer gráficos editáveis.
- `src/store/auth-store.ts`, `src/lib/http-client.ts`, `src/components/layout/AuthBlock.tsx`: autenticação pessoal, não banco Quanti.
- `__tests__/`: fixtures e regressões; `reference/`: gabaritos/curadoria identificados. Um gabarito não é exceção de runtime.

## Regras que precisam sobreviver

1. Separar oferta lançada **na janela** de oferta histórica e oferta final **no fechamento**. Nunca dividir universos incompatíveis para obter percentual. VGV lançado histórico pode ter universo diferente das unidades lançadas na janela: rótulo e fórmula devem dizer isso.
2. Vendas líquidas negativas/distratos são observação, não erro a zerar. Ausência não é zero; só omitir estrutura inteiramente sem observação, com código de aviso/auditoria.
3. Secovi aceita vertical e condomínios de casas conforme sua política; FIERGS agrega casas e loteamentos elegíveis no horizontal. Não aplicar automaticamente a nenhum novo relatório, especialmente Fortaleza/comercial.
4. Preços/médias precisam de denominador/ponderação/cobertura documentados. INCC, Morar Bem e tetos MCMV por data exigem fonte/regra observável. Não aproximar mês por trimestre nem inventar correção monetária.
5. Cidade incompleta deve ter recuperação/diagnóstico antes do modelo definitivo. CSV disponível para investigar; relatório incompleto não deve parecer completo ou baixar contornando guardas.
6. Reusar motor com configuração/política/layout próprios; não duplicar milhares de linhas para cada rota nem usar `fiergs-rs` para rotular todo panorama.
7. Preset aprovado conserva arte/mapa regional; personalizados identificam municípios/UF/janela reais. Institucional aprovado de 23 anos já está em assets do produto; versões históricas do Drive não substituem automaticamente.

## Limites conhecidos — não reabrir o FIERGS por padrão

Última revisão local registrada do conjunto: 69 páginas, 265 projetos, três cidades concluídas e 42 guardas delta zero. CSVs de preset/isolado e novo PDF isolado tinham lacunas documentadas. Guardas demonstram coerência interna, não validação de toda a base de origem. Exportação rasterizada ainda pode desacelerar em aba de fundo; worker/serviço é outra tarefa, não requisito deste piloto. Typecheck global já encontrou fixture paralela do Corretor incompleta: diagnosticar checkout atual, não alterar o Corretor para limpar o build dos relatórios.
