# Resultado A0/A1 — carteira, resumo e navegação

15/10/2026 · Gabriel · **Validado localmente; publicação pendente.**

## Entrega

Implementada a primeira fatia do [plano de assimilação](./PLAN_ASSIMILACAO_INTERFACE_V3_2026-10-15.md): carteira compacta baseada na composição Claude e tokens SE, resumo com apontamentos disponíveis e navegação persistente Resumo/Revisão/Materiais/Histórico. Revisão existente mantida como transição dentro da nova área. Bancada slide/evidência é A4, não entregue por esta fatia.

## A0 — baseline real e limites

- Remoto único origin; main estava três commits atrás. Fast-forward para `1afa119`, preservando/restaurando todos os arquivos locais via stash, sem conflito. Diferença recebida apenas em arquivo gerado TypeScript. Sem merge/rebase ou descarte de FIERGS.
- Site consultado somente leitura: HTTP200, entrada `/assets/index-BajSB602.js`, carteira `CorretorProjectsPage-Cz3APDd9.js` HTTP200 com recuperação de original identificável. Isso comprova publicação da carteira anterior, não A1.
- Tabelas privadas de projetos/originais/membros existem e recusam papel público401/42501; biblioteca pública futura ainda requer A2. Não foi usada credencial de pessoa real nem validado login real, políticas administrativas ou qualquer função de IA nesta rodada. Registro Lovable `1afa119` anuncia deploy de `corretor-access`; não comprova autorização válida em runtime por si.
- Congelados cinco snapshots persistidos: Rolândia, CJ, SJC VAP/v2 e Salvador; hashes derivados e contagens no [manifesto](./EVIDENCIAS_A0_A1_2026-10-15.json). Não são backup integral dos estudos nem corpus atualizado ao vivo. Sem atribuição de autor legado.
- Tokens SE copiados anteriormente conferidos idênticos: SHA256 `0802b707b8c511e3367b1e4a235cea6a268edb9ac8f217a2beb965fc30874eac`. Nenhum token, motor, prompt, função ou migration modificado. Única extensão do adaptador DB é `loadFindings(..., strict=true)`, para que falha no resumo não vire contagem zero; chamadas existentes conservam o default.
- Fonte ZIP Claude continua preservada no caminho recebido, sem import no bundle e sem staging. Classificação: insumo bruto local, hash/origem no plano; não mover o original durante esta entrega para não invalidar a referência fornecida. Capturas/extrações ignoradas em `.local-inputs/`.

## Antes → depois

- **Voltar preso no projeto:** seleção era limpa sem retirar estudo da URL, reaberto pelo efeito → retorno explícito à carteira com URL sanitizada; sem depender de histórico do browser.
- **Contexto perdido:** revisão não carregava busca/filtro/página da carteira → contexto preservado nas áreas do estudo e no novo envio; trocar A→B ou usar back/forward não mantém estudo errado.
- **Carteira com cards/espaço e campos faltantes:** lista com placeholders → linhas compactas, nome amigável com nome original preservado na revisão/materiais, cidade quando disponível, situação/pendências/data, busca e paginação de20. Sem cadastro: estado neutro e ação completar. Nada de cliente/cidade/revisor inventados; novo cadastro não presume tipo vocacional.
- **Área inicial sem resumo útil:** somente próximo passo e cadastro → erros/prováveis/a verificar pela confiança atual do motor, categorias, slides referenciados, materiais e limites de cobertura. Gravidade não foi inventada. Contagem do resumo é dos registros pendentes, e revisão pode revalidar/agrupar com evidências disponíveis.
- **Erro de leitura indistinguível de ausência:** resumo solicita leitura estrita e permite retry; HTTP500 não apresenta “nenhum apontamento”. Zero pendência não afirma documento correto nem cobertura integral.
- **Links antigos:** `/corretor?study`, `/corretor/analise?study` continuam chegando à revisão; `/corretor/projetos/:id?tab=materials|history` adapta para materiais/histórico; `/corretor/projetos` preserva filtros. Carteira nova abre Resumo. Relatório antigo mantém rota válida e retorno à carteira.

## Componentes e regras de frontend

`StudyLayout` e `StudySummary`, helpers puros de URL/resumo, composição lazy da revisão, primitives Button/Input/Dialog/Select/Progress existentes. CSS restrito ao Corretor; shell existente preservado. Validação pela skill React Best Practices: domínio local, efeito com descarte de resposta atrasada, troca de estudo reinicia resumo por key, imports pesados lazy, texto/links acessíveis e foco do modal restaurado. Nenhum primitive ou biblioteca visual novo.

## Verificações

1. **279 testes aprovados e2 condicionais pulados**, suíte Corretor e shell/login. Novos testes de navegação detectaram incompatibilidade de URLSearchParams.size no ambiente de teste; substituído por serialização não vazia, sem mudar expectativas. Repetição completa aprovada.
2. **Dez passes offline aprovados**: Rolândia/Toledo/CJ/SJC VAP/v2 com fonte congelada e Excel bruto, expectativas/hashes dos gabaritos preservados. `.local-inputs/corretor-regression/2026-10-15T14-50-37.557Z-25140/report.json`. Nenhuma chamada de IA nova.
3. **Chromium A1:** snapshots reais dos cinco estudos e22 linhas sintéticas apenas para paginação. Carteira1440/1024/390/320, resumo1440/390/320 sem overflow, claro/escuro, modal/Escape/foco, paginação/reload, resumo→revisão→carteira com busca, browser back/forward, A→B, materiais/histórico/reload, URL antiga, estudo inexistente, falha500/retry e vazio. Última rodada inclui Novo estudo→retorno com busca preservada.
4. Em toda a navegação testada, **zero tentativas de escrita e zero funções pagas**; hash dos achados de fixture antes/depois igual: `08a9677e568a02b198359bee5ae163772c9115afdbe14805ca79f12328d87b55`. Limite: revisão antiga ainda tem reconciliação histórica já existente, não alterada aqui; ausência de mutação nestes casos não garante ausência para qualquer estudo possível.
5. **Regressão materiais/browser:** cadastro em fixture, transferência TUS de PPTX sintético97.108bytes, recuperação com hash em contexto novo, histórico/reload e login único simulados aprovados. Não é upload/download de original real. Primeira execução tinha seletores antigos de tab/rotas; diagnóstico atualizado e repetido com sucesso.
6. Build/tipagem aprovados; lint sem erros, um warning preexistente sobre dependência `groupOf` no callback da revisão legada. Sete testes focados finais de cadastro/navegação passaram após retirar o tipo presumido. Check:live-docs associado ao commit local no fechamento. Build mantém avisos gerais de chunks grandes/Browserslist antigo, sem alteração de dependências.

Evidências locais: `.local-inputs/a1-suite-final.log`, `a1-materials.log`, `a1-build-final.log`, `a1-lint-final.log`; `a1-browser-1792076188209/result.json` e capturas; `projects-browser-1792076099787/result.json` e capturas. Scripts reproduzíveis `scripts/diagnostics/corretor-a1-browser.mjs` e `corretor-projects-browser.mjs`. Todos interceptam serviços externos; não usar resultado como teste de produção.

## Limites e próximo lote

- Paginação continua no cliente sobre a consulta existente; não declarar escalabilidade500+/paginação no servidor entregue. Biblioteca pública e filtros pessoais dependem de identidade/schema em A2.
- Cadastro opcional não desbloqueia automaticamente o contrato remoto privado antigo: materiais ainda exigem vínculo de projeto para upload. Separação persistência/cadastro é A2/A3, sem migration nesta fatia.
- Resumo usa fatos registrados e explicita cobertura; sem nova classificação de gravidade, mini mapa agregado ou renderização completa de slides. A4 contém a bancada real. A5 contém novos estados e conclusão atômica; botões de decisão legados permanecem compatíveis com o comportamento anterior.
- Sem ensaio autenticado de produção, zoom200% integral ou comparação pixel a pixel com Claude. Responsividade básica, temas e foco verificados localmente; não declarar acessibilidade integral.
- Próximo: revisar visualmente esta fatia, autorizar push, publicar pelo Lovable e repetir ida/volta no site. Depois executar A2/A3 e prova de renderização A4, com orçamento apresentado antes de custo novo. Sem ampliar seis horas reservadas por inferência; sem Monday e sem atribuição a Lucas.

Estado final: **A0 concluído no escopo de baseline disponível; A1 validado localmente; A2–A6 planejados.** Registro Git, bundle publicado e comportamento de produção continuam evidências distintas. Sem IA paga, alteração de achados reais ou mudança das expectativas dos dez passes.
