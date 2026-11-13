# Fortaleza/SINDUSCON — revisão trimestral, 13/11/2026

Autor/origem: Codex, a pedido de Lucas. Base `a3d2f4f3`, main limpa e em dia com origin após `git fetch --all`; nenhum outro remoto. Alterações desta entrega permanecem locais até autorização de envio.

## Falhas corrigidas

- **Média histórica incompleta:** a normalização de preços verificava se existia algum registro por empreendimento/mês, mas não se uma tipologia previamente observada desaparecia. A fotografia agora acusa ausência por tipologia e bloqueia a série afetada. Estoque zero explícito continua válido; uma tipologia nova não é exigida antes da primeira observação. O catálogo atual não preenche fotografias históricas.
- **Preço explícito inválido:** tabelas detalhadas podiam substituir preço/m² zero ou inválido por preço ÷ área. A regra agora coincide com a série: o quociente só pode substituir campo ausente; valor inválido permanece sem informação, com aviso.
- **Fontes pouco rastreáveis:** gráficos de lançamentos 11/13/15 e tabelas 16/19/31/32/40 agora identificam suas fontes; respostas comerciais paginadas com total zero geram aviso explícito. Mensagem de fonte ausente diferencia vendas de lançamentos.
- **Diagnóstico:** cobertura detalhada por competência inclui contagem de observações, falhas gerais/por produto e preços ausentes. Sem registros históricos individuais ou coordenadas. Corrigidos recortes capital/RM nas listas 3–7, território da seleção e indicação da equipe trimestral. Incluídos origem, data de coleta e limite temporal do índice monetário.
- **Composição:** cabeçalhos das tabelas detalhadas foram recompostos com Tahoma, títulos de 30 pt, quebra por palavras, recorte e competência separados da tabela. Removidas notas estáticas “Até junho” nas páginas 67/82; nenhuma competência fixa substitui a seleção. Logos/arte existentes preservados.
- **Interface:** painel passa a identificar trimestral/89 posições; avisos e fontes das tabelas aparecem na prévia. Downloads continuam identificados como arquivos de conferência.

## Fontes e limites que permanecem explícitos

- Séries municipais: API Geobrain, cidade/segmento/métrica; paginação, autorização e cobertura mensal preservadas.
- Preços/capacidade/área/dormitórios: histórico detalhado v2 por empreendimento/tipologia. A revisão corrige validações e não comprova que todas as fontes reais estão disponíveis.
- INCC-DI: [série publicada pelo Sinduscon-PR, fonte FGV](https://sindusconpr.com.br/economia/indices-economicos/incc-di-fgv/). Consulta pública nesta sessão confirma os pontos apresentados de novembro/2025 a outubro/2026 contra o JSON versionado; outubro = 1304,539. A escolha metodológica do INCC para Fortaleza permanece candidata, conforme contrato existente; não é homologada por essa conferência.
- Modelo: PPTX junho/2026, hash e origem preservados em `references.json`. Não foi substituído por uma edição nova.
- Continuam pendentes: amostra histórica da pesquisa (a contagem cadastral não a substitui), homologação de preços/ponderação/IVV/capacidade/universo e equipe editorial atual. Mapas continuam esquemáticos por coordenadas, sem cartografia histórica.
- Sem sessão autenticada Geobrain confirmada nesta revisão; não foi feita coleta real nem ensaio de produção. O equivalente headless usa fixtures identificadas e regressões de lacunas. Não se declara relatório real homologado ou todas as fontes preenchidas.

## Verificação

- Suíte Fortaleza: 270 testes / 24 arquivos aprovados, incluindo regressões mensais dos módulos compartilhados e geração offline de PPTX/PDF com 89 posições.
- TypeScript, ESLint e build de produção aprovados. Build mantém avisos de tamanho de chunks e importação dinâmica/estática já presentes, sem falha.
- Edge headless: 364 cenários aprovados, sem erros de página ou overflow horizontal. São 89 lâminas × 2 larguras (1440/390) × 2 temas, mais 8 cenários de fontes ausentes/incompletas. Capturas representativas inspecionadas, incluindo cabeçalhos 68/75. Nenhum arquivo fonte foi alterado durante a rodada final, para evitar recarregamento HMR; duas tentativas anteriores foram interrompidas por recarga durante a edição, sem serem contabilizadas como sucesso.
- Evidências visuais locais em `.local-inputs/relatorios-lucas/fortaleza/quarterly-visual/`; dados sintéticos. Não versionar screenshots, arquivos brutos ou credenciais.
- Padrões reutilizados: renderizador único de prévia/exportação, editor compartilhado, diagnóstico existente, primitives e carregamento Brain existentes. Fluxo de carregamento/autenticação não alterado.

**Monday:** [Estudo Fortaleza](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`. Nenhuma escrita no Monday ou push nesta revisão.
