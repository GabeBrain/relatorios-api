# Estimativas de vendas — Finotti / SID / Geobrain

Pacote inicial de contexto técnico e continuidade, preparado em **21/10/2026** por Gabriel/Codex.

**Estado em 21/10: motor horizontal e ensaio retrospectivo em memória preparados localmente.** O exemplo 300/150/6 foi reproduzido matematicamente. Não há rota, arquivo Geobrain importado, comparação em base real ou homologação.

## Ordem de leitura

1. [MANIFESTO.md](MANIFESTO.md): objetivo, escopo, responsáveis, metodologia, arquitetura, evidências e pendências.
2. [FONTES_E_DECISOES.md](FONTES_E_DECISOES.md): reunião19/10, email21/10 e regras anteriores registradas no Monday.
3. [fontes/EXTRACAO_PPTX_2026-10-21.md](fontes/EXTRACAO_PPTX_2026-10-21.md): texto e dados nativos dos gráficos do PPTX recebido.
4. [CONTRATO_E_VALIDACAO.md](CONTRATO_E_VALIDACAO.md): contrato candidato, lacunas e critérios do primeiro teste.
5. [CTA_NOVA_SESSAO.md](CTA_NOVA_SESSAO.md): texto para iniciar a conversa técnica.
6. [REPRODUCAO_E_HANDOFF.md](REPRODUCAO_E_HANDOFF.md): resultado numérico, limites do motor e recorte revisável para Edgar.

## Onde avançar

Repositório: `Relatorios API/relatorios-api`, dentro da raiz SE. Motor e ensaio em `src/features/estimativas-vendas/`; rota candidata `/rebrain/estimativas-vendas` **ainda não criada**. Direção autorizada por Gabriel: avançar a ferramenta na Rebrain. Integração e interface continuam propostas.

Fontes brutas locais: `.local-inputs/estimativas-vendas/2026-10-21/`, na raiz do repo. Contém PPTX, cópia do manifesto de integridade, extração JSON e transcrição do corpo do email. O diretório já é ignorado pelo `.gitignore`. Um clone remoto recebe os derivados/documentação, mas precisa receber o PPTX local separadamente.

Antes da implementação, ler `AGENTS.md` do repo e da raiz SE. Manter `docs/projetos/LIVE_rebrain.md`, diário pessoal e plano semanal de Gabriel atualizados. UI nova exige System Design Geobrain e diretrizes frontend do repo. Filtros/API geográficos devem seguir GeoApiScopeEngine. Não criar AGENTS/CLAUDE paralelos para substituir essas regras.

## Próxima entrega

Revisar a reprodução local com Edgar; obter MD/código original e contratos de entrada/retorno; comparar retrospectivamente uma base real com o método atual. Parâmetros, motor e ensaio ficam independentes de adaptadores de importação/exportação e da futura interface; estes ainda não foram implementados porque o contrato externo não chegou. Intervalos estatísticos e modelo vertical também pendem. O PPT não comprova qualidade na base corrente nem autoriza retorno automático ao Geobrain.

Monday: [Cálculo das estimativas da cidade pelo IVV](https://brain381753.monday.com/boards/18398428946/pulses/13096757074). Esta documentação não alterou o card.
