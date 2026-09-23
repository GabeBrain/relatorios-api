# Plano vivo de execução — FIERGS RM Porto Alegre

Atualizado em: 2026-09-23

## Objetivo

Entregar o Panorama FIERGS com o mesmo contrato editorial do deck oficial de 75 slides, preservando sequência, conteúdo e lógica analítica, com acabamento visual aprimorado pela Rebrain. A paridade numérica do fechamento 4T25 permanece separada da implementação editorial até a confirmação do universo histórico pelo analista responsável.

## Estados

- `DONE`: implementado e verificado automaticamente.
- `HUMAN`: implementado, aguardando conferência visual do usuário.
- `DOING`: em implementação.
- `NEXT`: próximo item executável sem dependência externa.
- `BLOCKED`: depende de credencial, fonte ou decisão externa.
- `TODO`: ainda não iniciado.

## Plano e andamento

| Etapa | Entrega | Estado | Critério de conclusão / dependência |
|---:|---|---|---|
| 1 | Congelar contrato editorial FIERGS em 75 posições | DONE | Preview, PDF e PPT usam manifesto próprio, sem herdar sequência Secovi |
| 2 | Sistema visual FIERGS/Rebrain | HUMAN | Montserrat/Source Sans 3 e hierarquia aplicadas ao FIERGS; falta revisão visual do livro completo |
| 3 | Capa territorial RM Porto Alegre | HUMAN | Mapa, título e trimestre dinâmicos; sem percentuais socioeconômicos |
| 4 | Nove aberturas oficiais | HUMAN | Fundo oficial e terminologia FIERGS nas posições corretas |
| 5 | Lançamentos verticais — slides 8–22 | DOING | Teste 1 corrigido: eixo/rótulos adaptativos, acumulado completo e principais lâminas verticais; faltam distribuições específicas |
| 6 | Vendas e oferta — slides 23–37 | TODO | Mesmo universo entre consolidado e cidade; totais internos fechando |
| 7 | MCMV, bairros/cidades e dormitórios | TODO | Componentes e agregações específicas, sem reaproveitar indicador incompatível |
| 8 | IVV, preços e mercado vertical — slides 38–61 | TODO | Uma fonte granular coerente por indicador; unidades e fórmulas explícitas |
| 9 | Horizontal completo — slides 62–66 | TODO | Quatro produtos FIERGS separados do vertical |
| 10 | Três mapas — slides 67–69 | BLOCKED | Roteamento e estado controlado corrigidos; fundo cartográfico requer `VITE_MAPBOX_ACCESS_TOKEN` local/publicado e novo deploy |
| 11 | Bancada cidade/empreendimento | DOING | CSV por empreendimento/rejeição disponível; falta anexar referência oficial e calcular deltas |
| 12 | Paridade numérica 4T25 | BLOCKED | Requer regra/data de congelamento e eventuais exclusões do analista |
| 13 | Comparação visual dos 75 slides | TODO | Classificação slide a slide e correções de PDF/PPT |
| 14 | Performance da coleta multi-cidade | DOING | FIERGS: 2 cidades e teto global de 6 requisições; medir geração publicada |

## Pontos de teste humano

1. Estrutura: conferir ordem, títulos e presença das 75 posições.
2. Capa e aberturas: conferir equilíbrio, mapa, terminologia e quebras.
3. Lançamentos 8–22: comparação lado a lado com o deck oficial.
4. Vendas/oferta: verificar fechamento interno antes da paridade externa.
5. IVV/preços/horizontal: conferir categorias, unidades e legibilidade.
6. Mapas: depois da sincronização do token, conferir pontos, enquadramento e legendas.
7. Entrega: PDF e PPT completos, sem overflow ou páginas divergentes.

## Sincronização de chaves — ação do usuário

Variável necessária: `VITE_MAPBOX_ACCESS_TOKEN`.

1. Adicionar token público Mapbox (`pk...`) ao `.env` local.
2. Adicionar a variável nos ambientes Production e Preview da publicação.
3. Autorizar os domínios Rebrain/preview nas restrições do token, se existirem.
4. Fazer novo deploy: variáveis `VITE_` são incorporadas durante o build.

Sem o token, as páginas 67–69 permanecem no livro como diagnóstico controlado; não são removidas. Isso preserva a paginação e evidencia que a exportação ainda não está pronta para entrega.

## Preparação para validação metodológica

Perguntas a levar ao analista:

- data exata de congelamento da base do 4T25;
- exclusões manuais e respectivos IDs;
- reclassificações entre vertical e horizontal;
- tratamento de vendas líquidas, distratos e revisões posteriores;
- universo usado nos slides por cidade;
- disponibilidade de planilha ou relação dos empreendimentos do fechamento.

Deltas prioritários: 3T25 (`634` atual versus `138` oficial), 4T25 (`3.082` versus `2.554`), ausência de Canoas na fonte municipal, volume anômalo de Guaíba e diferença entre vendas consolidadas (`1.135`) e municipais (`2.334`).

## Registro de decisões

- O deck oficial é contrato editorial, não molde visual rígido.
- A Rebrain melhora alinhamento, legibilidade e hierarquia sem mudar o conteúdo esperado.
- API Socio fica fora desta entrega; a capa territorial não exibirá os dois percentuais socioeconômicos.
- Rota GeoBrain interna permanece principal, com pública + retries como fallback.
- Números atuais não serão artificialmente corrigidos antes da confirmação do universo histórico.
- O FIERGS mantém 75 posições mesmo sem mapa ou dado metodologicamente aprovado.

## Histórico de avanços

- 2026-09-22: preset corrigido para 10 cidades, sem Porto Alegre.
- 2026-09-22: capa institucional limpa, página branca de cidades e fundo oficial de aberturas incorporados.
- 2026-09-22: primeiro diagnóstico numérico do recorte de 10 cidades documentado.
- 2026-09-23: plano consolidado e iniciado; contrato editorial próprio em implementação.
- 2026-09-23: manifesto efetivo FIERGS passou a ter 75 posições estáveis, inclusive mapas sem token.
- 2026-09-23: capa territorial dinâmica criada com mapa oficial e sem dependência da API Socio.
- 2026-09-23: nove aberturas vinculadas ao fundo oficial e aos títulos do deck FIERGS.
- 2026-09-23: slides trimestrais de empreendimentos, unidades e VGV receberam série exclusivamente vertical, variações anuais e comparação semestral.
- 2026-09-23: acumulados de 12 meses e distribuição de lançamentos por bairro/cidade incorporados ao primeiro bloco.
- 2026-09-23: download `Auditoria CSV` adicionado ao FIERGS com IDs, cidade, segmento, padrão, trimestre, lançamentos, vendas, oferta, preços, cobertura e rejeições.
- 2026-09-23: coleta FIERGS otimizada para duas cidades simultâneas com teto global de seis requisições; Secovi preservado em uma cidade e teto quatro; granular vertical/horizontal paralelizado dentro do mesmo limitador.
- 2026-09-23: Teste 1 do PDF/CSV revisado. Abertura duplicada e roteamento das três lâminas de mapa foram corrigidos; sem token, mapas agora exibem indisponibilidade controlada em vez de página branca.
- 2026-09-23: FIERGS passou a usar Montserrat em hierarquia e Source Sans 3 em leitura. Eixos trimestrais usam forma curta, amostragem adaptativa e rótulos de valores priorizados em fechamentos anuais e quatro trimestres recentes; acumulados de 12 meses não exibem janelas parciais.
