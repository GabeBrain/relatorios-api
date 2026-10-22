# Estimativas de vendas — Finotti / SID / Geobrain

Pacote inicial de contexto técnico e continuidade, preparado em **21/10/2026** por Gabriel/Codex.

**Estado em 21/10: motor horizontal e ensaio retrospectivo em memória preparados localmente.** O exemplo 300/150/6 foi reproduzido matematicamente. Não há rota, arquivo Geobrain importado, comparação em base real ou homologação.

**Atualização em 22/10:** o pacote e o motor já estão em `origin/main`; acesso autenticado somente leitura à API confirmado em Fortaleza e Blumenau. O [plano do dossiê e simulador](PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md) registra qualidade da fonte, cortes retrospectivos e gates da interface. Gabriel/Codex conduzem esta frente; Edgar apoia dúvidas de acesso/contrato em paralelo. Nenhum backtest real ou tela foi entregue nesta atualização.

## Ordem de leitura

1. [MANIFESTO.md](MANIFESTO.md): objetivo, escopo, responsáveis, metodologia, arquitetura, evidências e pendências.
2. [FONTES_E_DECISOES.md](FONTES_E_DECISOES.md): reunião19/10, email21/10 e regras anteriores registradas no Monday.
3. [fontes/EXTRACAO_PPTX_2026-10-21.md](fontes/EXTRACAO_PPTX_2026-10-21.md): texto e dados nativos dos gráficos do PPTX recebido.
4. [CONTRATO_E_VALIDACAO.md](CONTRATO_E_VALIDACAO.md): contrato candidato, lacunas e critérios do primeiro teste.
5. [CTA_NOVA_SESSAO.md](CTA_NOVA_SESSAO.md): texto para iniciar a conversa técnica.
6. [REPRODUCAO_E_HANDOFF.md](REPRODUCAO_E_HANDOFF.md): resultado numérico, limites do motor e recorte revisável para Edgar.
7. [PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md](PLANO_API_DOSSIE_SIMULADOR_2026-10-22.md): sondagem autenticada, plano estatístico e interface de testes.
8. [PLANO_PAGINA_EDITORIAL_API_2026-10-22.md](PLANO_PAGINA_EDITORIAL_API_2026-10-22.md): execução técnica da primeira página funcional só por API, com visual editorial, seleção individual/carteira e exportação de revisão.
9. [CTA_IMPLEMENTACAO_PAGINA_API.md](CTA_IMPLEMENTACAO_PAGINA_API.md): comando para iniciar essa implementação.

## Onde avançar

Repositório: `Relatorios API/relatorios-api`, dentro da raiz SE. Motor e ensaio em `src/features/estimativas-vendas/`; rota candidata `/rebrain/estimativas-vendas` **ainda não criada**. Direção autorizada por Gabriel: avançar a ferramenta na Rebrain. Integração e interface continuam propostas.

Fontes brutas locais: `.local-inputs/estimativas-vendas/2026-10-21/`, na raiz do repo. Contém PPTX, cópia do manifesto de integridade, extração JSON e transcrição do corpo do email. O diretório já é ignorado pelo `.gitignore`. Um clone remoto recebe os derivados/documentação, mas precisa receber o PPTX local separadamente.

Antes da implementação, ler `AGENTS.md` do repo e da raiz SE. Manter `docs/projetos/LIVE_rebrain.md`, diário pessoal e plano semanal de Gabriel atualizados. UI nova exige System Design Geobrain e diretrizes frontend do repo. Filtros/API geográficos devem seguir GeoApiScopeEngine. Não criar AGENTS/CLAUDE paralelos para substituir essas regras.

## Próxima entrega

Implementar a página editorial por API conforme o plano novo, mantendo o resultado exploratório quando a origem por competência for desconhecida. Gabriel buscará uma exportação real do Geobrain para conferir o contrato de entrada/retorno e `bases.estimation`; `bases.ivv_batch_id` só rastreia atualizações IVV em lote, conforme resposta de Evandro encaminhada por Diego. Parâmetros, motor, leitura API, futura importação/exportação operacional e interface são camadas separadas. Intervalos estatísticos e modelo vertical ainda pendem. O PPT não comprova qualidade na base corrente nem autoriza retorno automático ao Geobrain.

Monday: [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074). Esta documentação não alterou o card.
