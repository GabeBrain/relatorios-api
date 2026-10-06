# FIERGS — retorno horizontal de Juliana (06/10/2026)

## Material e observações

Fonte: `assets/panorama-fiergs-rs-2T2026 versao juliana 6de outubro.pptx` (69 slides) e e-mail de 06/10: “Precisa considerar os condomínios de casas nas análises horizontais, está considerando apenas os loteamentos agora.” O arquivo foi lido como PPTX; as observações são caixas de texto sobre imagens de páginas exportadas, não comentários nativos.

| Slide anotado | Pedido | Tratamento |
|---|---|---|
| 55 | “Desconsiderar. Aqui abrir da seguinte forma: Condomínio de Casas, Loteamento Aberto, Loteamento Fechado” | O quadro de VGV deixa de rotular todo o horizontal como condomínio e abre suas linhas pelos três produtos. Preservados subtotal vertical, subtotal horizontal e total geral até confirmação editorial explícita de que “desconsiderar” se refere à página inteira. |
| 57 | Incluir condomínios de casas em uma linha única, sem padrão | O consolidado por produto já agregava o subtipo, mas agora compartilha rótulo canônico e tem regressão de cobertura com os três produtos. |
| 59 | Mesmo pedido na tabela de ticket/área/R$/m² | A agregação por subtipo passa a usar o mesmo rótulo canônico; “Média Loteamentos” continua exclusiva dos dois loteamentos, conforme decisão anterior da Juliana. |
| 60 | Mesmo pedido no mínimo/média/máximo de R$/m² | Teste específico exige a linha de casas com preço observado; média dos loteamentos permanece exclusiva. |

## Fatos confirmados e limite da fonte

- A política FIERGS já aceitava `Condomínio de Casas/Sobrados` e excluía chácaras. A classificação foi estendida somente às grafias explícitas “Condomínio de Casas” e “Condomínio de Casas e Sobrados”; não há inferência pelo nome do empreendimento nem inclusão de chácaras.
- A auditoria autenticada anterior, gerada em 02/10 e guardada em `.tmp/fiergs-final-adjustments-regression-20261002/`, registrava **2T2026: 7 casas / 1.196 lançadas / 19 finais; 52 loteamentos abertos / 17.918 / 1.349; 70 fechados / 11.362 / 1.997**. Em **4T2025: 7 casas / 1.196 / 35; 49 abertos / 16.925 / 1.274; 65 fechados / 10.292 / 1.531**. São fotografias anteriores, não números fixados no runtime.
- No PPT de 06/10, o slide 57 mostra somente 51 abertos e 70 fechados. A coleta autenticada local de 06/10, em `.tmp/fiergs-juliana-oct06-regression/2T2026-auditoria.csv`, voltou a produzir **0 condomínios, 51 loteamentos abertos / 17.894 lançadas / 1.334 finais e 70 fechados / 11.362 / 1.997**. Assim, a diferença de um loteamento aberto também está na fonte atual, não apenas na apresentação.
- Os **sete IDs** classificados como condomínios na auditoria de 02/10 (`66842`, `76393`, `16532`, `55102`, `76401`, `63348`, `75719`) estão presentes na auditoria de 06/10, mas rejeitados com `subtipo_horizontal_indefinido`. Logo, o problema não é simplesmente ausência dos empreendimentos na resposta. Ainda é preciso verificar o payload bruto para distinguir perda do rótulo de produto na API, mudança de campo ou variante ainda não mapeada. A tentativa de consulta direta autenticada à API excedeu 30 s no login; não há evidência suficiente para atribuir a causa a uma variante específica.
- A tentativa pontual de inspeção desses sete registros diretamente na API também falhou por timeout de conexão no login em 06/10. Não foi possível confirmar qual campo mudou. A correção usa, portanto, um catálogo **de produto observado**, extraído das sete linhas nominais da auditoria autenticada de 02/10, somente quando a classificação do payload atual é indefinida. O produto explícito atual da API sempre prevalece, inclusive exclusões; o catálogo não contém unidades, preços nem regras por período. Implementação: `reference/fiergs-reviewed-horizontal-products.ts` e `domain/cube.ts`. Trata-se de contingência para a perda de rótulo na fonte, não de comprovação de correção da API.
- O slide 55 antigo chama linhas horizontais socioeconômicas de “Condomínio de Casas”, embora seus 120/121 projetos incluam loteamentos. Esse rótulo é incorreto independentemente da atualização da fonte e foi corrigido por agrupamento de produto.

## Verificação e estado

- Testes focados de política, cubo e reconciliação: 92 aprovados. Suíte da feature: 276 aprovados. `vite build`: aprovado.
- `tsc --noEmit -p tsconfig.app.json` continua falhando somente em fixtures preexistentes de `src/features/corretor/lib/audit/__tests__/structure-empty-sections.test.ts`; nenhum arquivo do Corretor foi alterado.
- PDF e CSV novos de 2T2026 foram gerados em `.tmp/fiergs-juliana-oct06-regression/`. O PDF ainda **não contém condomínio de casas** nas páginas 55, 57, 59 e 60; o CSV confirma os sete registros rejeitados. Portanto, a correção visual e a regressão com dados sintéticos **não encerram o pedido da Juliana**. A coleta 4T2025 foi interrompida após longa espera sem avançar na API; não existe nova saída 4T2025 desta rodada. Não enviar esta versão para homologação; a homologação permanece **aberta**, sem aceite da Juliana.
- PDF e CSV novos de 2T2026 foram gerados **antes do catálogo de contingência** em `.tmp/fiergs-juliana-oct06-regression/`. O PDF anterior ainda **não contém condomínio de casas** nas páginas 55, 57, 59 e 60; o CSV confirma os sete registros rejeitados. Por solicitação de Gabriel, não foi feita outra geração ou execução de testes nesta rodada; ele gerará o novo documento no site após o push para conferirmos o resultado real. A coleta 4T2025 foi interrompida após longa espera sem avançar na API; não existe nova saída 4T2025 desta rodada. Homologação **aberta**, sem aceite da Juliana.
