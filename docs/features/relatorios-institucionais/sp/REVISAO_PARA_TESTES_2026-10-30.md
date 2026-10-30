# SP Institucional — revisão para testes práticos

30/10/2026 · Codex/Codex Test · base `ab149ef`, main limpa, único origin em0/0 após fetch. Escopo: revisar e refinar o relatório existente para conferência pelo usuário, sem ensaio de mercado autenticado pelo agente.

## O que está implementado

| Bloco original | Implementação | Conferência prática necessária |
|---|---|---|
| 1–8,12,31,45,49,52,60,65,81 | Capa, apresentação, sumário, divisórias e artes institucionais3–5/7 | Ordem e edição do perfil territorial |
| 9–11 | Destaques recalculados, sem repetir conclusões antigas | Texto contra os valores da mesma geração |
| 13–25 | Empreendimentos, unidades lançadas, segmentos, tipologias e bairros | Cobertura do cadastro e comparativos nos mesmos meses |
| 26–30,40–44 | VGL e VGV por período corrigidos pelo INCC-DI | Base única, sinais e somas mensais; índices versionados atéset/2026 |
| 32–39,46–48,50–51 | Vendas, oferta histórica, comparativos e IVV | Estoque como fotografia; vendas líquidas e denominadores |
| 53–64 | Preços ponderados, com recortes por padrão/dormitório/MCMV/MAP | Preço privativo, pesos e cobertura por fotografia |
| 66–80 | Estado atual, matriz, estágio, capacidade/VGV e8 mapas | Cobertura de coordenadas, estágios e capacidade=vendidas+estoque |
| 82–85 | Equipe, consultoria, imprensa e encerramento | Pessoas, contatos e números da edição2T2026 |

As85 posições têm renderizador. Isso não significa que todas as fontes estejam disponíveis em uma geração específica. As oito artes institucionais são3/4/5/7/82/83/84/85; não são dados novos observados. Os detalhes metodológicos continuam em [DECISOES](DECISOES.md).

## Achados e ajustes desta revisão

1. **Faltava uma visão real das pendências por slide.** Novo checklist calcula85 situações a partir da geração atual: Disponível, Com lacunas, Aguardando fonte, Fonte indisponível e Referência editorial. Consulta não executada difere de falha; preço histórico incompleto não é apresentado como série completa. Quantidade conhecida igual a zero não vira fonte ausente.
2. **Os detalhamentos exigiam descobrir qual slide abrir.** Botão **Conferir detalhamentos do relatório** inicia explicitamente a coleta compartilhada após as fontes leves. Abrir bairros/preços/mapas continua reutilizando a mesma coleta. Nenhuma varredura pesada nova é disparada ao gerar o resumo municipal.
3. **Mensagens de pendência ficavam desatualizadas.** O aviso municipal agora explica sua cobertura sem afirmar que a contagem segue pendente depois de concluída. Falha granular não recebe mensagem de processamento bem-sucedido. Corrigida indicação de dependência do slide48.
4. **A edição institucional desaparecia na ampliação.** A nota da edição agora aparece também dentro do diálogo. O checklist permanece fora do slide, preservando a estrutura original.
5. **Faltava um registro simples para reportar problemas.** **Baixar checklist da conferência** salva JSON com trimestre, mês, origem e situação dos85 slides. Não inclui token, históricos individuais, coordenadas ou nomes de empreendimentos. Não é exportação PDF/PPT do relatório, nem selo de aprovação.
6. **A verificação de tipos padrão era insuficiente.** O tsconfig raiz tem `files: []`; `tsc --noEmit` não verificava o projeto app referenciado. A checagem direta encontrou6 erros nos testes do lote anterior, corrigidos nesta revisão. `typecheck` e `build` agora usam explicitamente `-p tsconfig.app.json`, verificando o código real da aplicação.

## Como executar o primeiro teste

1. Abrir `/rebrain/relatorios-institucionais/sp`, autenticar e selecionar **SP → São Paulo → 3T2026**. Usar **Conferir dados reais**, separado da prévia fictícia.
2. Conferir o mês encontrado nas três séries. Um/dois meses geram parcial; três completam somente o trimestre municipal. O `period` antigo de uma amostra não limita os meses das séries. Não somar estoques dos meses.
3. Aguardar contagem, séries, tipologias e oferta; usar **Conferir detalhamentos do relatório** quando habilitado. Confirmar etapa/tempo Brain. Navegar39/51/63/67/78 deve reaproveitar a coleta, sem começar outra busca completa.
4. Abrir **Ver situação e pendências por slide**. Começar por Fonte indisponível/Com lacunas; abrir o slide pelo próprio checklist. Falha/ausência deve explicar impacto, não completar dados com zero. INCC ausente afeta os valores corrigidos, preservando unidades e preços nominais.
5. Conferir todos os slides disponíveis. Verificar particularmente25/39 (bairros),50/51 (IVV),53–64 (preços),73 (matriz),76/77 (estágio) e78 (capacidade/VGV). Nos mapas, conferir geocodificados/total e recorte aproximado; pontos cinza indicam medição ausente. Validar também ampliação, tema e teclado.
6. Cancelar uma consulta detalhada e repetir. Os totais municipais devem permanecer. Gerar novamente ou trocar trimestre/escopo deve descartar os detalhamentos antigos; após restaurar o escopo, uma nova geração consulta as fontes novamente.
7. Se encontrar problema, baixar o checklist e registrar número do slide, esperado/observado, captura e duração aproximada. Comparar números da mesma geração e competência. Mudança da API entre gerações não comprova erro de cálculo.

Referência de setembro enviada pelo usuário em29/10: **7.825 lançamentos,8.912 vendas líquidas,126.307 unidades em estoque**. São somas das sete linhas verticais fornecidas naquela data, não gabarito do trimestre nem garantia de que a API não as revisou.

## O que ainda falta

- **Teste autenticado e observação do deploy:** o agente não executou uma geração real GeoBrain nesta revisão. QA local usa respostas interceptadas e dados sintéticos; não comprova permissão/cobertura do token real. Publicação no Git não prova a versão já carregada no domínio.
- **Revisão metodológica:** MAP, cenário400–500mil, ponderação, INCC/base, capacidade e estágio seguem decisões documentadas sob delegação do usuário. Guardas não foram afrouxadas para preencher páginas.
- **Revisão editorial:** validar a atualidade das oito artes, especialmente pessoas/contatos e perfiljun/2026. A identificação da edição permanece explícita.
- **Exportação integral PDF/PPT/CSV pareados:** ainda não implementada para o SP. Os testes atuais avaliam consulta, cálculos e visualização na tela; não liberar entrega final de arquivo com base neste checklist.
- **Atualização de índices posteriores aset/2026:** necessária quando uma nova competência municipal exigir INCC que ainda não conste no snapshot. Ausência permanece explícita.

Conclusão operacional: a tela está preparada para conferência prática controlada após as validações em [EVIDENCIAS](EVIDENCIAS.md). Homologação de mercado e entrega integral dependem dos itens acima.
