# Plano terminal — fechamento total do Panorama V3 para Opus

## Objetivo

Entregar a V3 completa do Panorama Secovi/FIERGS: todos os comentários de Juliana, somados às correções já implementadas de horizontais e às descobertas técnicas de Edgar. Não promover versão, não fazer push e não marcar item como concluído sem evidência da página final.

## Leitura obrigatória antes de alterar código

1. Ler integralmente:
   - `MAPEAMENTO_UNIVERSO_HORIZONTAL_SECOVI_2026-09-01.md`;
   - `DECISOES_E_PREMISSAS_PANORAMA.md` (PRE-026/PRE-027);
   - `MATRIZ_TERMINAL_40_COMENTARIOS_JULIANA_PANORAMA_V3_2026-09-01.md`;
   - este plano e `AGENTS.md`.
2. Consultar o banco **somente em leitura** para localizar o último estudo carregado referente à correção V2 do Panorama:
   - descobrir tabelas/buckets pelo schema e pelo código do Corretor/estudos; não presumir nomes;
   - ordenar pelo horário de upload/criação decrescente;
   - confirmar nome, data, usuário, arquivo-fonte e relação com Secovi/Panorama V2;
   - baixar/capturar o arquivo em uma nova pasta ignorada: `.tmp/opus-panorama-v3/<timestamp>/source/`;
   - extrair comentários por página para `.tmp/opus-panorama-v3/<timestamp>/comentarios-extraidos.md`;
   - se o banco não tiver o estudo, parar este gate e registrar a consulta realizada; não substituir por memória ou por outro PDF.
3. Comparar os comentários extraídos com JG-01…JG-40. Se houver divergência, adicionar o comentário novo à matriz; não apagar nem fundir comentários repetidos.

## Base já entregue — preservar

- V3 é o único motor exposto na tela.
- `building-with-history` V2 tem retry limitado; V3 não usa fallback legado.
- PRE-026: horizontal só entra como Condomínio de Casas por campo oficial, nunca por nome.
- PRE-027: padrão histórico é cronológico, sem look-ahead; origem `observed`/`inherited`/`unclassified`.
- IVV por Tipologia abre circuito após 5xx confirmado e vira indisponível, nunca zero.
- Manifesto suprime horizontal vazio e mapa sem coordenada.

Não reintroduzir V2, fallback legado, loteamentos ou zeros fabricados.

## Execução

### Fase A — dados e cenários autenticados

1. Rodar `scripts/panorama-evidence.mjs` para Jundiaí, Praia Grande e Baixada, preservando checkpoints.
2. Construir dossiê por cenário com: contrato respondido, retries, circuito, projetos aceitos/rejeitados, padrões herdados e métricas indisponíveis.
3. Assertiva obrigatória: todo consumidor horizontal V3 nasce do cubo filtrado; métrica sem insumo granular é `unavailable`, não zero nem endpoint agregado.

### Fase B — corrigir JG-01 a JG-40, individualmente

| Grupo | Itens | Entrega objetiva |
|---|---|---|
| Tipografia institucional | JG-01–04 | Fonte legível/cabível em cada página; screenshot de cada uma. |
| Horizontais, 2T26 e fundos | JG-05–18 | Universo PRE-026, zero real visível, 2T26, fundos por trimestre e evidência por página. |
| IVV e condicionais | JG-19–24 | IVV indisponível sem zero; regra semântica reutilizável para positivo/negativo/neutro/nulo/indisponível. |
| Coortes, barras e subtotais | JG-25–31 | Barras com variação; subtotal pós-2024 correto; percentuais fecham 100%. |
| Horizontal e VGV | JG-32–38 | Tabelas horizontais no formato vertical; páginas vazias removidas; preços separados por segmento. |
| Narrativa, mapa e consultor | JG-36–40 | Sem loteamento/API GeoBrain na narrativa; mapa só com tiles/markers; sem placeholder de foto. |

Para cada JG: mudar modelo/componente, criar teste proporcional, gerar screenshot/preview/PDF e registrar caminho da evidência. Comentário repetido requer evidência da sua própria página.

### Fase C — paridade de saídas

1. Gerar preview, PDF e PPT espelho para Jundiaí, Praia Grande e Baixada.
2. Manifesto, sumário, preview, PDF e PPT precisam ter mesma ordem e contagem.
3. Produzir `DOSSIER_V3_<data>.md` e uma cópia atualizada da matriz com 40/40: `done`, `not_applicable` ou `blocked`, sempre com evidência.
4. `not_applicable` só é permitido para página corretamente suprimida pelo manifesto; `blocked` precisa trazer causa, status HTTP e próxima ação.

## Gates de aceite

- Testes afetados + `npm run build` aprovados.
- Conferência visual desktop e mobile, claro e escuro.
- Jundiaí: horizontal vazio suprimido.
- Praia Grande: Condomínios de Casas aceitos, sem loteamentos, herança visível.
- Baixada: IVV/Tipologia indisponível sem zeros; demais séries continuam.
- Nenhum JG concluído sem página final correspondente.
- Atualizar `LIVE_rebrain.md`, commit isolado na `main`; não fazer push sem autorização humana.

## CTA para Opus

> Execute este plano como uma única tarefa terminal. Comece pelo último estudo V2 carregado no banco, em leitura, e guarde o material em `.tmp/opus-panorama-v3/<timestamp>/`. Em seguida, implemente e evidencie cada JG-01 a JG-40 sem tratar comentário repetido como duplicado. Preserve PRE-026, PRE-027, retry e circuit breaker já entregues. Entregue V3 para homologação com preview, PDF, PPT espelho, dossiê e matriz 40/40; não promova padrão nem faça push.
